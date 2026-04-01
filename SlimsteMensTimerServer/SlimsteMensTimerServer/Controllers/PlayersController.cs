using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SlimsteMensTimerServer.Hubs;
using SlimsteMensTimerServer.Models;
using SlimsteMensTimerServer.Services;

namespace SlimsteMensTimerServer.Controllers;

[ApiController]
[Route("api/sessions/{sessionId}/players")]
public class PlayersController : ControllerBase
{
    private readonly SessionStore _store;
    private readonly IHubContext<GameHub> _hub;

    public PlayersController(SessionStore store, IHubContext<GameHub> hub)
    {
        _store = store;
        _hub = hub;
    }

    // POST /api/sessions/{sessionId}/players
    [HttpPost]
    public async Task<IActionResult> RegisterPlayer(string sessionId, [FromBody] RegisterPlayerRequest request)
    {
        var (player, result) = _store.AddPlayer(sessionId, request.PlayerName);
        switch (result)
        {
            case AddPlayerResult.SessionNotFound:
                return NotFound();
            case AddPlayerResult.SessionEnded:
                return UnprocessableEntity(new { error = "Session has ended." });
            case AddPlayerResult.NameTaken:
                return Conflict(new { error = $"Name '{request.PlayerName}' is already taken in this session." });
            case AddPlayerResult.SessionFull:
                return Conflict(new { error = "This session is full." });
        }

        await _hub.Clients.Group(sessionId).SendAsync("PlayerJoined", player!.Id, player.Name, player.Score);
        return CreatedAtAction(nameof(GetPlayers), new { sessionId }, new
        {
            playerId = player.Id,
            playerName = player.Name,
            player.Score
        });
    }

    // GET /api/sessions/{sessionId}/players
    [HttpGet]
    public IActionResult GetPlayers(string sessionId)
    {
        var session = _store.GetSession(sessionId);
        if (session is null) return NotFound();
        return Ok(session.Players.Values.Select(p => new
        {
            playerId = p.Id,
            playerName = p.Name,
            p.Score,
            lastSeen = p.LastSeen,
            p.IsStale
        }));
    }

    // PUT /api/sessions/{sessionId}/players/{playerId}/score
    [HttpPut("{playerId}/score")]
    public async Task<IActionResult> UpdateScore(string sessionId, string playerId,
        [FromBody] UpdateScoreRequest request)
    {
        var existing = _store.GetPlayer(sessionId, playerId);
        if (existing is null) return NotFound();

        bool wasStale = existing.IsStale;
        var player = _store.UpdateScore(sessionId, playerId, request.Score);
        if (player is null) return NotFound();

        if (wasStale)
            await _hub.Clients.Group(sessionId).SendAsync("PlayerReturned", playerId);

        await _hub.Clients.Group(sessionId).SendAsync("ScoreUpdated", playerId, player.Name, player.Score);

        // Finale: end the game when a finalist reaches zero
        var session = _store.GetSession(sessionId);
        if (session is not null &&
            session.Round.Round == RoundState.Finale &&
            session.Round.FinalistIds.Contains(playerId) &&
            player.Score <= 0)
        {
            _store.EndSession(sessionId);
            await _hub.Clients.Group(sessionId).SendAsync("GameEnded");
            _store.DeleteSession(sessionId);
        }

        return Ok(new { playerId, score = player.Score });
    }

    // POST /api/sessions/{sessionId}/players/{playerId}/heartbeat
    [HttpPost("{playerId}/heartbeat")]
    public async Task<IActionResult> Heartbeat(string sessionId, string playerId)
    {
        var existing = _store.GetPlayer(sessionId, playerId);
        if (existing is null) return NotFound();

        bool wasStale = existing.IsStale;
        _store.UpdateHeartbeat(sessionId, playerId);

        if (wasStale)
            await _hub.Clients.Group(sessionId).SendAsync("PlayerReturned", playerId);

        return Ok();
    }
}
