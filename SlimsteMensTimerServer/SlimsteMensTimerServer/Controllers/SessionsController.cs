using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SlimsteMensTimerServer.Hubs;
using SlimsteMensTimerServer.Models;
using SlimsteMensTimerServer.Services;

namespace SlimsteMensTimerServer.Controllers;

[ApiController]
[Route("api/sessions")]
public class SessionsController : ControllerBase
{
    private readonly SessionStore _store;
    private readonly IpAddressHelper _ipHelper;
    private readonly IHubContext<GameHub> _hub;

    public SessionsController(SessionStore store, IpAddressHelper ipHelper, IHubContext<GameHub> hub)
    {
        _store = store;
        _ipHelper = ipHelper;
        _hub = hub;
    }

    // POST /api/sessions
    [HttpPost]
    public IActionResult CreateSession()
    {
        var session = _store.CreateSession();
        var joinUrl = _ipHelper.BuildJoinUrl(session.Id);
        return CreatedAtAction(nameof(GetSession), new { sessionId = session.Id }, new
        {
            sessionId = session.Id,
            joinUrl
        });
    }

    // GET /api/sessions/{sessionId}
    [HttpGet("{sessionId}")]
    public IActionResult GetSession(string sessionId)
    {
        var session = _store.GetSession(sessionId);
        if (session is null) return NotFound();
        return Ok(new
        {
            sessionId = session.Id,
            state = session.State.ToString(),
            playerOrder = session.PlayerOrder,
            roundContext = new
            {
                round = session.Round.Round.ToString(),
                candidateId = session.Round.CandidateId,
                quizmasterId = session.Round.QuizmasterId,
                questionIndex = session.Round.QuestionIndex,
                answerTiles = session.Round.AnswerTiles,
                finalistIds = session.Round.FinalistIds
            },
            players = session.Players.Values.Select(p => new
            {
                playerId = p.Id,
                playerName = p.Name,
                p.Score,
                p.IsStale
            })
        });
    }

    // PUT /api/sessions/{sessionId}/playerorder
    [HttpPut("{sessionId}/playerorder")]
    public IActionResult SetPlayerOrder(string sessionId, [FromBody] SetPlayerOrderRequest request)
    {
        var session = _store.GetSession(sessionId);
        if (session is null) return NotFound();
        if (session.State != SessionState.Lobby)
            return Conflict(new { error = "Can only set player order in Lobby state." });

        var validIds = session.Players.Keys.ToHashSet();
        if (request.Order.Count != validIds.Count || !request.Order.All(validIds.Contains))
            return BadRequest(new { error = "Order must contain exactly all session player IDs." });

        session.PlayerOrder = new List<string>(request.Order);
        return Ok();
    }

    // POST /api/sessions/{sessionId}/start
    [HttpPost("{sessionId}/start")]
    public async Task<IActionResult> StartSession(string sessionId)
    {
        var session = _store.GetSession(sessionId);
        if (session is null) return NotFound();
        if (session.State != SessionState.Lobby)
            return Conflict(new { error = "Session is not in Lobby state." });
        if (session.Players.Count < 3)
            return Conflict(new { error = "At least 3 players are required to start." });

        // Default to join order when no drag-and-drop order was set
        if (session.PlayerOrder.Count == 0)
            session.PlayerOrder = session.Players.Values
                .OrderBy(p => p.JoinedAt)
                .Select(p => p.Id)
                .ToList();

        if (!_store.StartSession(sessionId))
            return Conflict(new { error = "Session is not in Lobby state." });

        await _hub.Clients.Group(sessionId).SendAsync("GameStarted");
        return Ok(new { state = "Active" });
    }

    // DELETE /api/sessions/{sessionId}
    [HttpDelete("{sessionId}")]
    public async Task<IActionResult> DeleteSession(string sessionId)
    {
        if (_store.GetSession(sessionId) is null) return NotFound();
        _store.EndSession(sessionId);
        await _hub.Clients.Group(sessionId).SendAsync("GameEnded");
        _store.DeleteSession(sessionId);
        return NoContent();
    }
}
