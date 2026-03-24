using System.Collections.Concurrent;
using Microsoft.Extensions.Configuration;
using SlimsteMensTimerServer.Models;

namespace SlimsteMensTimerServer.Services;

public enum AddPlayerResult
{
    Success,
    SessionNotFound,
    SessionEnded,
    NameTaken,
    SessionFull
}

/// <summary>
/// Thread-safe in-memory store for game sessions.
/// The ConcurrentDictionary handles concurrent add/remove safely.
/// Individual player property updates are safe for this use case
/// (small local-network game, minor races have no meaningful impact).
/// </summary>
public class SessionStore
{
    private readonly ConcurrentDictionary<string, Session> _sessions = new();
    private readonly int _maxPlayersPerSession;

    // Session codes use unambiguous characters only (no 0/O, 1/I)
    private const string CodeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int CodeLength = 6;

    public SessionStore(IConfiguration config)
    {
        _maxPlayersPerSession = config.GetValue<int>("GameSettings:MaxPlayersPerSession", 8);
    }

    // ── Sessions ─────────────────────────────────────────────────────────────

    public Session CreateSession()
    {
        var session = new Session
        {
            Id = GenerateUniqueCode(),
            State = SessionState.Lobby,
            CreatedAt = DateTime.UtcNow,
            LastActivity = DateTime.UtcNow
        };
        _sessions[session.Id] = session;
        return session;
    }

    public Session? GetSession(string sessionId)
        => _sessions.TryGetValue(sessionId.ToUpperInvariant(), out var session) ? session : null;

    public IEnumerable<Session> GetAllSessions()
        => _sessions.Values;

    public bool DeleteSession(string sessionId)
        => _sessions.TryRemove(sessionId.ToUpperInvariant(), out _);

    public bool StartSession(string sessionId)
    {
        var session = GetSession(sessionId);
        if (session is null || session.State != SessionState.Lobby) return false;
        session.State = SessionState.Active;
        session.LastActivity = DateTime.UtcNow;
        return true;
    }

    public bool EndSession(string sessionId)
    {
        var session = GetSession(sessionId);
        if (session is null || session.State == SessionState.Ended) return false;
        session.State = SessionState.Ended;
        return true;
    }

    // ── Players ──────────────────────────────────────────────────────────────

    public (Player? Player, AddPlayerResult Result) AddPlayer(string sessionId, string playerName)
    {
        var session = GetSession(sessionId);
        if (session is null)
            return (null, AddPlayerResult.SessionNotFound);
        if (session.State == SessionState.Ended)
            return (null, AddPlayerResult.SessionEnded);
        if (session.Players.Count >= _maxPlayersPerSession)
            return (null, AddPlayerResult.SessionFull);
        if (session.Players.Values.Any(p =>
                string.Equals(p.Name, playerName, StringComparison.OrdinalIgnoreCase)))
            return (null, AddPlayerResult.NameTaken);

        var player = new Player
        {
            Id = Guid.NewGuid().ToString("N")[..8],
            Name = playerName,
            Score = 60,
            LastSeen = DateTime.UtcNow
        };
        session.Players[player.Id] = player;
        session.LastActivity = DateTime.UtcNow;
        return (player, AddPlayerResult.Success);
    }

    public Player? UpdateScore(string sessionId, string playerId, int score)
    {
        var player = GetPlayer(sessionId, playerId);
        if (player is null) return null;

        player.Score = score;
        player.LastSeen = DateTime.UtcNow;
        player.IsStale = false;
        GetSession(sessionId)!.LastActivity = DateTime.UtcNow;
        return player;
    }

    public Player? UpdateHeartbeat(string sessionId, string playerId)
    {
        var player = GetPlayer(sessionId, playerId);
        if (player is null) return null;

        player.LastSeen = DateTime.UtcNow;
        player.IsStale = false;
        GetSession(sessionId)!.LastActivity = DateTime.UtcNow;
        return player;
    }

    public Player? GetPlayer(string sessionId, string playerId)
    {
        var session = GetSession(sessionId);
        return session?.Players.TryGetValue(playerId, out var player) == true ? player : null;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private string GenerateUniqueCode()
    {
        string code;
        do { code = GenerateCode(); }
        while (_sessions.ContainsKey(code));
        return code;
    }

    private static string GenerateCode()
    {
        var chars = new char[CodeLength];
        for (int i = 0; i < CodeLength; i++)
            chars[i] = CodeChars[Random.Shared.Next(CodeChars.Length)];
        return new string(chars);
    }
}
