using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SlimsteMensTimerServer.Hubs;
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
            players = session.Players.Values.Select(p => new
            {
                playerId = p.Id,
                playerName = p.Name,
                p.Score,
                p.IsStale
            })
        });
    }

    // POST /api/sessions/{sessionId}/start
    [HttpPost("{sessionId}/start")]
    public async Task<IActionResult> StartSession(string sessionId)
    {
        if (!_store.StartSession(sessionId))
        {
            if (_store.GetSession(sessionId) is null) return NotFound();
            return Conflict(new { error = "Session is not in Lobby state." });
        }
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
