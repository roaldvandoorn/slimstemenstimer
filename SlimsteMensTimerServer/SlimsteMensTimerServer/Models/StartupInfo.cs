namespace SlimsteMensTimerServer.Models;

/// <summary>
/// Captures the moment the server process started. Registered as a singleton
/// so any service can calculate uptime by comparing to DateTimeOffset.UtcNow.
/// </summary>
public record StartupInfo(DateTimeOffset StartedAt);
