namespace SlimsteMensTimerServer.Models;

public class RoundContext
{
    public RoundState Round { get; set; } = RoundState.None;
    public string CandidateId { get; set; } = string.Empty;
    public string QuizmasterId { get; set; } = string.Empty;
    public int QuestionIndex { get; set; }           // 1-based; 0 = round not yet active
    public bool[] AnswerTiles { get; set; } = [];    // round-specific size (15 / 4 / 3 / 10)
    public List<string> FinalistIds { get; set; } = new();
    public int TurnCycleCount { get; set; }          // server-internal: tracks turn/cycle progress per round
}
