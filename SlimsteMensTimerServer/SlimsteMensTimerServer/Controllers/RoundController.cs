using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SlimsteMensTimerServer.Hubs;
using SlimsteMensTimerServer.Models;
using SlimsteMensTimerServer.Services;

namespace SlimsteMensTimerServer.Controllers;

[ApiController]
[Route("api/sessions/{sessionId}/rounds")]
public class RoundController : ControllerBase
{
    private readonly SessionStore _store;
    private readonly RoundService _rounds;
    private readonly IHubContext<GameHub> _hub;

    public RoundController(SessionStore store, RoundService rounds, IHubContext<GameHub> hub)
    {
        _store  = store;
        _rounds = rounds;
        _hub    = hub;
    }

    // POST /api/sessions/{sessionId}/rounds/start/{roundName}
    // Starts a named round: opendeur, puzzel, ingelijst, or finale.
    // Round369 is started automatically by POST /api/sessions/{id}/start (S7).
    [HttpPost("start/{roundName}")]
    public async Task<IActionResult> StartRound(string sessionId, string roundName)
    {
        var session = _store.GetSession(sessionId);
        if (session is null) return NotFound();
        if (session.State != SessionState.Active)
            return Conflict(new { error = "Session is not Active." });

        if (!_rounds.InitialiseNamedRound(session, roundName))
            return BadRequest(new { error = $"Unknown round '{roundName}'. Valid values: opendeur, puzzel, ingelijst, finale." });

        await BroadcastRoundChanged(sessionId, session);
        return Ok(RoundContextPayload(session));
    }

    // POST /api/sessions/{sessionId}/rounds/nextquestion
    // Advances the question index without changing candidate or quizmaster.
    // Used in Round369 when the quizmaster signals a correct answer (✓).
    [HttpPost("nextquestion")]
    public async Task<IActionResult> NextQuestion(string sessionId)
    {
        var session = _store.GetSession(sessionId);
        if (session is null) return NotFound();
        if (session.State != SessionState.Active)
            return Conflict(new { error = "Session is not Active." });

        RoundService.NextQuestion(session);
        await _hub.Clients.Group(sessionId).SendAsync("QuestionAdvanced", session.Round.QuestionIndex);
        return Ok(new { questionIndex = session.Round.QuestionIndex });
    }

    // POST /api/sessions/{sessionId}/rounds/marktile/{tileIndex}
    // Marks an answer tile as correct.
    [HttpPost("marktile/{tileIndex:int}")]
    public async Task<IActionResult> MarkTile(string sessionId, int tileIndex)
    {
        var session = _store.GetSession(sessionId);
        if (session is null) return NotFound();
        if (session.State != SessionState.Active)
            return Conflict(new { error = "Session is not Active." });

        if (!RoundService.MarkTile(session, tileIndex))
            return BadRequest(new { error = $"Tile index {tileIndex} is out of range for this round." });

        await _hub.Clients.Group(sessionId)
            .SendAsync("TileMarked", tileIndex, session.Round.Round.ToString());
        return Ok(new { tileIndex, marked = true });
    }

    // POST /api/sessions/{sessionId}/rounds/nextturn
    // Advances candidate/quizmaster roles per round rules.
    // Round369: both roles move in lockstep; auto-advances question when all players have attempted.
    // OpenDeur/Puzzel: candidate moves; quizmaster rotates when all candidates have had a turn.
    // Finale: candidate toggles between finalists; question advances after both have gone.
    // Called by: candidate's "Klaar" button (OpenDeur/Puzzel/Ingelijst), or by round logic (Round369 ✗).
    [HttpPost("nextturn")]
    public async Task<IActionResult> NextTurn(string sessionId)
    {
        var session = _store.GetSession(sessionId);
        if (session is null) return NotFound();
        if (session.State != SessionState.Active)
            return Conflict(new { error = "Session is not Active." });

        bool questionAdvanced = _rounds.NextTurn(session);

        await _hub.Clients.Group(sessionId)
            .SendAsync("TurnAdvanced", session.Round.CandidateId, session.Round.QuizmasterId);

        if (questionAdvanced)
            await _hub.Clients.Group(sessionId)
                .SendAsync("QuestionAdvanced", session.Round.QuestionIndex);

        return Ok(new
        {
            candidateId      = session.Round.CandidateId,
            quizmasterId     = session.Round.QuizmasterId,
            questionIndex    = session.Round.QuestionIndex,
            questionAdvanced
        });
    }

    // POST /api/sessions/{sessionId}/rounds/nextquizmaster
    // Ingelijst only: advances to the next quizmaster, resets tiles, increments question index.
    // Triggered by the "Volgende" button (player page and scoreboard).
    [HttpPost("nextquizmaster")]
    public async Task<IActionResult> NextQuizmaster(string sessionId)
    {
        var session = _store.GetSession(sessionId);
        if (session is null) return NotFound();
        if (session.State != SessionState.Active)
            return Conflict(new { error = "Session is not Active." });
        if (session.Round.Round != RoundState.Ingelijst)
            return Conflict(new { error = "nextquizmaster is only valid during Ingelijst." });

        RoundService.NextQuizmaster(session);
        await BroadcastRoundChanged(sessionId, session);
        return Ok(RoundContextPayload(session));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task BroadcastRoundChanged(string sessionId, Session session)
        => await _hub.Clients.Group(sessionId).SendAsync("RoundChanged", RoundContextPayload(session));

    private static object RoundContextPayload(Session session) => new
    {
        round         = session.Round.Round.ToString(),
        candidateId   = session.Round.CandidateId,
        quizmasterId  = session.Round.QuizmasterId,
        questionIndex = session.Round.QuestionIndex,
        answerTiles   = session.Round.AnswerTiles,
        finalistIds   = session.Round.FinalistIds
    };
}
