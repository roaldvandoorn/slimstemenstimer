namespace SlimsteMensTimerServer.Models;

public class Player
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Score { get; set; } = 60;
    public DateTime LastSeen { get; set; } = DateTime.UtcNow;
    public bool IsStale { get; set; } = false;
}
