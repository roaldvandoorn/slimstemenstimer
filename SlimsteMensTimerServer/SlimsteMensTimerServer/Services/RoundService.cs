using SlimsteMensTimerServer.Models;

namespace SlimsteMensTimerServer.Services;

/// <summary>
/// Encapsulates all round-state mutation logic (initialisation, turn advancement,
/// tile marking). Controllers call these methods and then broadcast SignalR events.
/// </summary>
public class RoundService
{
    private static readonly Dictionary<RoundState, int> TileCounts = new()
    {
        [RoundState.OpenDeur]  = 4,
        [RoundState.Puzzel]    = 3,
        [RoundState.Ingelijst] = 10,
    };

    // ── Round initialisation ─────────────────────────────────────────────────

    public void InitialiseRound369(Session session)
    {
        var ctx = session.Round;
        ctx.Round          = RoundState.Round369;
        ctx.CandidateId    = session.PlayerOrder[0];
        ctx.QuizmasterId   = session.PlayerOrder[^1];
        ctx.QuestionIndex  = 1;
        ctx.AnswerTiles    = new bool[15];
        ctx.TurnCycleCount = 0;
        ctx.FinalistIds.Clear();
    }

    /// <returns>false if roundName is not a recognised round.</returns>
    public bool InitialiseNamedRound(Session session, string roundName)
    {
        RoundState? roundState = roundName.ToLowerInvariant() switch
        {
            "opendeur"  => RoundState.OpenDeur,
            "puzzel"    => RoundState.Puzzel,
            "ingelijst" => RoundState.Ingelijst,
            "finale"    => RoundState.Finale,
            _           => null
        };
        if (roundState is null) return false;

        var ctx = session.Round;
        ctx.Round          = roundState.Value;
        ctx.QuestionIndex  = 1;
        ctx.TurnCycleCount = 0;
        ctx.FinalistIds.Clear();

        if (roundState.Value == RoundState.Finale)
            InitialiseFinale(session);
        else
            InitialiseStandardRound(session);

        return true;
    }

    private void InitialiseStandardRound(Session session)
    {
        session.Round.AnswerTiles = new bool[TileCounts.GetValueOrDefault(session.Round.Round, 0)];
        SetLowestScoreCandidateAndQuizmaster(session);
    }

    // Candidate = lowest-score player (PlayerOrder is tie-breaker).
    // Quizmaster = the player immediately preceding the candidate in PlayerOrder.
    private static void SetLowestScoreCandidateAndQuizmaster(Session session)
    {
        var ctx   = session.Round;
        var order = session.PlayerOrder;

        var candidateId = order
            .OrderBy(id => session.Players[id].Score)
            .ThenBy(id => order.IndexOf(id))
            .First();

        ctx.CandidateId  = candidateId;
        var idx          = order.IndexOf(candidateId);
        ctx.QuizmasterId = order[(idx - 1 + order.Count) % order.Count];
    }

    private static void InitialiseFinale(Session session)
    {
        var ctx   = session.Round;
        var order = session.PlayerOrder;

        // Top-2 finalists by score descending (PlayerOrder tie-breaker)
        var finalists = order
            .OrderByDescending(id => session.Players[id].Score)
            .ThenBy(id => order.IndexOf(id))
            .Take(2)
            .ToList();

        ctx.FinalistIds = finalists;
        ctx.AnswerTiles = [];

        // Quizmaster = random non-finalist
        var nonFinalists = order.Where(id => !finalists.Contains(id)).ToList();
        ctx.QuizmasterId = nonFinalists[Random.Shared.Next(nonFinalists.Count)];

        // Candidate = finalist with lower score
        ctx.CandidateId = finalists
            .OrderBy(id => session.Players[id].Score)
            .First();
    }

    // ── NextTurn ─────────────────────────────────────────────────────────────

    /// <returns>true if the question also advanced as a side-effect.</returns>
    public bool NextTurn(Session session)
    {
        return session.Round.Round switch
        {
            RoundState.Round369            => NextTurnRound369(session),
            RoundState.OpenDeur or
            RoundState.Puzzel              => NextTurnOpenDeurPuzzel(session),
            RoundState.Finale              => NextTurnFinale(session),
            _                              => false
        };
    }

    private static bool NextTurnRound369(Session session)
    {
        var ctx   = session.Round;
        var order = session.PlayerOrder;
        int n     = order.Count;

        ctx.TurnCycleCount++;

        // Advance candidate and quizmaster in lockstep
        var cIdx = (order.IndexOf(ctx.CandidateId)  + 1) % n;
        var qIdx = (order.IndexOf(ctx.QuizmasterId) + 1) % n;
        ctx.CandidateId  = order[cIdx];
        ctx.QuizmasterId = order[qIdx];

        if (ctx.TurnCycleCount < n) return false;

        // All players attempted this question — advance to next question and
        // shift the starting player by one for fairness.
        ctx.QuestionIndex++;
        ctx.TurnCycleCount = 0;
        cIdx = (cIdx + 1) % n;
        qIdx = (qIdx + 1) % n;
        ctx.CandidateId  = order[cIdx];
        ctx.QuizmasterId = order[qIdx];
        return true;
    }

    private static bool NextTurnOpenDeurPuzzel(Session session)
    {
        var ctx           = session.Round;
        var order         = session.PlayerOrder;
        int n             = order.Count;
        int candidatesPerSet = n - 1; // everyone except the current quizmaster

        ctx.TurnCycleCount++;

        if (ctx.TurnCycleCount < candidatesPerSet)
        {
            // Advance to next candidate, skipping the quizmaster
            var cIdx = order.IndexOf(ctx.CandidateId);
            do { cIdx = (cIdx + 1) % n; }
            while (order[cIdx] == ctx.QuizmasterId);
            ctx.CandidateId = order[cIdx];
            return false;
        }

        // All candidates done for this quizmaster — rotate quizmaster
        ctx.TurnCycleCount = 0;
        ctx.AnswerTiles    = new bool[ctx.AnswerTiles.Length];
        ctx.QuestionIndex++;

        var qIdx = (order.IndexOf(ctx.QuizmasterId) + 1) % n;
        ctx.QuizmasterId = order[qIdx];
        ctx.CandidateId  = order[(qIdx + 1) % n];
        return true;
    }

    private static bool NextTurnFinale(Session session)
    {
        var ctx   = session.Round;
        var other = ctx.FinalistIds.FirstOrDefault(id => id != ctx.CandidateId);
        if (other is null) return false;

        ctx.CandidateId = other;
        ctx.TurnCycleCount++;

        if (ctx.TurnCycleCount < 2) return false;

        // Both finalists have had a turn — new question
        ctx.QuestionIndex++;
        ctx.TurnCycleCount = 0;
        return true;
    }

    // ── NextQuestion ─────────────────────────────────────────────────────────

    public static void NextQuestion(Session session)
    {
        session.Round.QuestionIndex++;
        session.Round.TurnCycleCount = 0;
    }

    // ── NextQuizmaster (Ingelijst only) ───────────────────────────────────────

    public static void NextQuizmaster(Session session)
    {
        var ctx   = session.Round;
        var order = session.PlayerOrder;
        int n     = order.Count;

        // Advance quizmaster through the order, skipping the candidate
        var qIdx = order.IndexOf(ctx.QuizmasterId);
        do { qIdx = (qIdx + 1) % n; }
        while (order[qIdx] == ctx.CandidateId);

        ctx.QuizmasterId   = order[qIdx];
        ctx.AnswerTiles    = new bool[10];
        ctx.QuestionIndex++;
        ctx.TurnCycleCount++;
    }

    // ── MarkTile ─────────────────────────────────────────────────────────────

    /// <returns>false if tileIndex is out of range.</returns>
    public static bool MarkTile(Session session, int tileIndex)
    {
        var tiles = session.Round.AnswerTiles;
        if (tileIndex < 0 || tileIndex >= tiles.Length) return false;
        tiles[tileIndex] = true;
        return true;
    }

    // ── SignalR payload ───────────────────────────────────────────────────────

    /// Builds the canonical RoundChanged payload used by all controllers.
    public static object BuildRoundPayload(Session session) => new
    {
        round         = session.Round.Round.ToString(),
        candidateId   = session.Round.CandidateId,
        quizmasterId  = session.Round.QuizmasterId,
        questionIndex = session.Round.QuestionIndex,
        answerTiles   = session.Round.AnswerTiles,
        finalistIds   = session.Round.FinalistIds
    };
}
