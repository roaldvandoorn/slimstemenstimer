# Phase 10 Progress Log — Rounds System

## Status: Complete

All 12 steps delivered. See `PLAN_phase10_rounds.md` for the full design.

---

## Step log

| Step | Description | Commit |
|------|-------------|--------|
| S1 | Drag-and-drop player ordering in lobby | `lobby.js` rewrite; `PUT /playerorder`; quizmaster badge on last player |
| S2 | Server model: RoundState + RoundContext | `Models/RoundState.cs`, `Models/RoundContext.cs`, `Session` extended |
| S3 | RoundController + round-control endpoints | 6 endpoints: start, correct, nextquestion, marktile, nextturn, nextquizmaster |
| S4 | GameHub: new broadcast methods | BroadcastRoundChanged, BroadcastTileMarked, BroadcastQuestionAdvanced, BroadcastTurnAdvanced |
| S5 | Scoreboard rework | Round header, tile areas per round, Volgende button, role highlights |
| S6 | Player page: role-aware controls | setRole(), ingelijstPanel, klaarPanel; all 5 roles wired |
| S7 | Round369 auto-start + advancement | StartSession initialises Round369 + broadcasts RoundChanged; ✓/✗ REST routing |
| S8 | OpenDeur, Puzzel, Ingelijst start-flow | Start round buttons on scoreboard; Round369 done detection in player.js |
| S9 | Finale round | Finale game-over on finalist score=0; nextturn in Finale; Start Finale button |
| S10 | Integration + state restore polish | TileMarked keeps answerTiles in sync; QuestionAdvanced resets tiles for OpenDeur/Puzzel |
| S11 | Sound wiring audit | Klaar auto-stops timer; setRole auto-stops timer when startEn=false |
| S12 | Final review + documentation | Error handling verified; archive written |

### Clarifications resolved mid-phase

- **Finale rules** (late clarification): 5 correct-answer tiles per question/turn; stopping the timer ends the turn; wrong answers play sound only; lowest-scoring finalist goes first each question. Reworked NextTurnFinale, InitialiseFinale, and all Finale client paths.

---

## Files changed

| File | Change |
|------|--------|
| `Models/RoundState.cs` | NEW — enum: None, Round369, OpenDeur, Puzzel, Ingelijst, Finale, Ended |
| `Models/RoundContext.cs` | NEW — CandidateId, QuizmasterId, QuestionIndex, AnswerTiles, FinalistIds, TurnCycleCount |
| `Models/Session.cs` | Extended: PlayerOrder, Round |
| `Models/Player.cs` | Extended: JoinedAt (stable join-order fallback) |
| `Models/Requests.cs` | Added: SetPlayerOrderRequest |
| `Services/RoundService.cs` | NEW — all round logic: init, NextTurn variants, NextQuestion, NextQuizmaster, MarkTile |
| `Controllers/RoundController.cs` | NEW — 6 round-control endpoints |
| `Controllers/SessionsController.cs` | Extended: playerorder endpoint; StartSession initialises Round369 |
| `Controllers/PlayersController.cs` | Extended: Finale game-over check on score update |
| `Hubs/GameHub.cs` | Extended: 4 new broadcast methods |
| `Program.cs` | Added: RoundService singleton |
| `wwwroot/lobby.html` | Unchanged structurally |
| `wwwroot/js/lobby.js` | Rewrite: drag-and-drop, putPlayerOrder, quizmaster badge, min-3 guard |
| `wwwroot/scoreboard.html` | Added: roundHeader, roundTiles, roundControls; removed answer-controls |
| `wwwroot/js/scoreboard.js` | Rewrite: renderRound, per-round tile renderers, start-round buttons, SignalR round events |
| `wwwroot/player.html` | Added: klaarPanel, ingelijstPanel |
| `wwwroot/js/player.js` | Rewrite: setRole, deriveRole, all round-control handlers, state restore |
| `wwwroot/css/style.css` | Added: drag-over, quizmaster-badge, round tiles, highlights, btn-volgende, btn-start-round |
