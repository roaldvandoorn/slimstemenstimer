using System.Collections.Concurrent;

namespace SlimsteMensTimerServer.Models;

public class Session
{
    public string Id { get; set; } = string.Empty;
    public SessionState State { get; set; } = SessionState.Lobby;
    public ConcurrentDictionary<string, Player> Players { get; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastActivity { get; set; } = DateTime.UtcNow;
}
