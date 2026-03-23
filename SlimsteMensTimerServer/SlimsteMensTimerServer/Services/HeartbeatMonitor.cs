namespace SlimsteMensTimerServer.Services;

/// <summary>
/// Background service that monitors player heartbeats and marks
/// players as stale when they stop sending updates.
/// Implemented in S5.
/// </summary>
public class HeartbeatMonitor : BackgroundService
{
    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // S5: stale detection and PlayerWentStale/PlayerReturned broadcasts will be added here
        return Task.CompletedTask;
    }
}
