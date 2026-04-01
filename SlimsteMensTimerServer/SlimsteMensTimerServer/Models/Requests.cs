namespace SlimsteMensTimerServer.Models;

public record RegisterPlayerRequest(string PlayerName);

public record UpdateScoreRequest(int Score);

public record SetPlayerOrderRequest(List<string> Order);
