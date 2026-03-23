using Microsoft.AspNetCore.SignalR;
using SlimsteMensTimerServer.Hubs;
using SlimsteMensTimerServer.Models;

namespace SlimsteMensTimerServer.Services;

/// <summary>
/// Background service that runs every 5 seconds and:
/// - Marks players stale when no heartbeat or score push has been received
///   within the configured StaleSeconds threshold, broadcasting PlayerWentStale.
/// - Ends sessions that have been idle longer than SessionTimeoutHours,
///   broadcasting GameEnded.
///
/// Recovery (PlayerReturned) is handled in PlayersController when a stale
/// player pushes a score or heartbeat — no recovery logic is needed here.
/// </summary>
public class HeartbeatMonitor : BackgroundService
{
    private readonly SessionStore _store;
    private readonly IHubContext<GameHub> _hub;
    private readonly TimeSpan _staleThreshold;
    private readonly TimeSpan _sessionTimeout;
    private readonly ILogger<HeartbeatMonitor> _logger;

    private static readonly TimeSpan CheckInterval = TimeSpan.FromSeconds(5);

    public HeartbeatMonitor(
        SessionStore store,
        IHubContext<GameHub> hub,
        IConfiguration config,
        ILogger<HeartbeatMonitor> logger)
    {
        _store = store;
        _hub = hub;
        _staleThreshold = TimeSpan.FromSeconds(
            config.GetValue<int>("GameSettings:StaleSeconds", 30));
        _sessionTimeout = TimeSpan.FromHours(
            config.GetValue<int>("GameSettings:SessionTimeoutHours", 2));
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "HeartbeatMonitor started. StaleThreshold={Stale}s, SessionTimeout={Timeout}h",
            _staleThreshold.TotalSeconds, _sessionTimeout.TotalHours);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(CheckInterval, stoppingToken);
                await CheckHeartbeatsAsync();
            }
            catch (OperationCanceledException)
            {
                // Normal shutdown — not an error
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in HeartbeatMonitor");
            }
        }
    }

    private async Task CheckHeartbeatsAsync()
    {
        var now = DateTime.UtcNow;

        foreach (var session in _store.GetAllSessions())
        {
            // Check session idle timeout (all states)
            if (session.State != SessionState.Ended &&
                now - session.LastActivity > _sessionTimeout)
            {
                _logger.LogInformation(
                    "Session {SessionId} timed out after {Hours}h idle — ending",
                    session.Id, _sessionTimeout.TotalHours);
                _store.EndSession(session.Id);
                await _hub.Clients.Group(session.Id).SendAsync("GameEnded");
                continue;
            }

            // Check player staleness — only in Active sessions
            if (session.State != SessionState.Active) continue;

            foreach (var player in session.Players.Values)
            {
                if (!player.IsStale && now - player.LastSeen > _staleThreshold)
                {
                    player.IsStale = true;
                    _logger.LogInformation(
                        "Player {Name} in session {SessionId} went stale",
                        player.Name, session.Id);
                    await _hub.Clients.Group(session.Id)
                        .SendAsync("PlayerWentStale", player.Id);
                }
            }
        }
    }
}
