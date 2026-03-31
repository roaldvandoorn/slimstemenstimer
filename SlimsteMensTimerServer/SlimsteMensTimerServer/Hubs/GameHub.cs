using Microsoft.AspNetCore.SignalR;
using SlimsteMensTimerServer.Services;

namespace SlimsteMensTimerServer.Hubs;

/// <summary>
/// SignalR hub for real-time score broadcasting to browser clients.
///
/// Browser clients call JoinSessionGroup(sessionId) on connect to subscribe
/// to events for a specific game session. The server then broadcasts events
/// (PlayerJoined, ScoreUpdated, etc.) to the group from the REST controllers.
///
/// The Delphi app does NOT connect to this hub — it communicates via REST only.
/// </summary>
public class GameHub : Hub
{
    private readonly SessionStore _store;

    public GameHub(SessionStore store)
    {
        _store = store;
    }

    /// <summary>
    /// Called by browser clients when they load the lobby or scoreboard page.
    /// Adds the connection to the SignalR group for the given session so it
    /// receives all subsequent broadcasts for that session.
    /// </summary>
    public async Task JoinSessionGroup(string sessionId)
    {
        var session = _store.GetSession(sessionId);
        if (session is null)
        {
            throw new HubException($"Session '{sessionId}' not found.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
    }

    /// <summary>
    /// Called by the web player when its countdown timer starts.
    /// Broadcasts TimerStarted to all session group members so the scoreboard
    /// can start the clock sound loop.
    /// </summary>
    public async Task BroadcastTimerStarted(string sessionId, string playerId)
    {
        await Clients.Group(sessionId).SendAsync("TimerStarted", playerId);
    }

    /// <summary>
    /// Called by the web player when its countdown timer stops (manually or at zero).
    /// Broadcasts TimerStopped to all session group members so the scoreboard
    /// can stop the clock sound loop when no timers are active.
    /// </summary>
    public async Task BroadcastTimerStopped(string sessionId, string playerId)
    {
        await Clients.Group(sessionId).SendAsync("TimerStopped", playerId);
    }

    /// <summary>
    /// Called by a web player when they trigger a correct or wrong answer sound.
    /// Broadcasts AnswerSound to all session group members so the scoreboard
    /// plays the appropriate sound effect.
    /// </summary>
    public async Task BroadcastAnswerSound(string sessionId, string soundType)
    {
        await Clients.Group(sessionId).SendAsync("AnswerSound", soundType);
    }

    /// <summary>
    /// Called automatically when a browser client disconnects.
    /// ASP.NET Core SignalR removes the connection from all groups automatically,
    /// so no explicit cleanup is needed here.
    /// </summary>
    public override Task OnDisconnectedAsync(Exception? exception)
        => base.OnDisconnectedAsync(exception);
}
