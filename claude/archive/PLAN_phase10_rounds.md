# Phase 10 Plan — Rounds System (De Slimste Mens)

## Goal

Rework the web app (scoreboard + player pages) and the ASP.NET Core server to model the full game-show round structure of De Slimste Mens. The Android app is not changed in this phase. The Delphi app will continue to function as before (heartbeat, score push) but the role-aware UI lives entirely in the browser.

---

## Clarifications assumed / decisions made

| Topic | Decision |
|-------|----------|
| Player order | Draggable lobby list; last player = initial quizmaster in round 1 |
| Android app | No changes. Players using the Android app will not see role controls this phase. |
| Score countdown | Rounds 2-4 and Final only; round 1 is additive (+20 per 3rd question) |
| Scoreboard "correct answer" buttons | Removed from default scoreboard; each round's scoreboard area replaces them |
| Quizmaster for Final | Randomly chosen from non-finalists at the start of that round |
| 3-6-9 auto-advance | After question 15 only — no early exit button |
| "Volgende" in Ingelijst | Present on both the quizmaster's player page AND the scoreboard; not shown to candidates or other players |
| Player page controls | Only enabled controls are rendered as active; all others visually disabled (not hidden, to avoid layout shift) |
| State persistence | All round/role/question state lives on the server; clients derive UI from server state via SignalR |
| Lobby drag-and-drop | HTML5 drag-and-drop (no extra library); order saved to session before game starts |
| Round 3-6-9 scoring | Honour system — server does not enforce that +20 is pressed only on scoring questions |
| Finale -20 mechanic | Non-active finalist presses their own -20 button, deducting from their own score. Honour system. |
| Minimum player count | Hard block: "Start Spel" button disabled + warning shown when fewer than 3 players have joined |

---

## Architecture overview

### What changes

```
Server (ASP.NET Core 8)
  Models/
    Session.cs            ← add: RoundState, QuestionIndex, PlayerOrder list
    RoundState.cs         ← NEW enum: Lobby, Round369, OpenDeur, Puzzel, Ingelijst, Finale, Ended
    RoundContext.cs       ← NEW: CandidateId, QuizmasterId, AnswerTiles[], QuestionIndex
  Controllers/
    RoundController.cs    ← NEW: round-control endpoints (see below)
  Hubs/
    GameHub.cs            ← add: BroadcastRoundChanged, BroadcastRoleChanged, BroadcastTileMarked, BroadcastQuestionAdvanced
  wwwroot/
    lobby.html/js         ← add: drag-and-drop player ordering
    scoreboard.html/js    ← rework: round name header, remove answer buttons, add round-specific tile area
    player.html/js        ← rework: role-aware control enabling/disabling, round-specific UI panels
    css/style.css         ← add: round tile styles, drag-and-drop highlight, disabled-control opacity
```

### New server-side concepts

**`RoundState` enum** (added to existing `SessionState` or as a separate field on `Session`):
```
Lobby → Round369 → OpenDeur → Puzzel → Ingelijst → Finale → GameEnded
```

**`RoundContext`** (new class, held on `Session`):
- `CandidateId` — playerId of current candidate
- `QuizmasterId` — playerId of current quizmaster
- `QuestionIndex` — 1-based, resets per round
- `AnswerTiles` — `bool[]` of size n (round-specific: 15, 4, 3, 10)
- `PlayerOrder` — ordered list of playerIds (set in lobby before start)
- `FinalistIds` — top-2 playerIds for the final round

---

## Step-by-step plan

---

### S1 — Drag-and-drop player ordering in lobby

**Files:** `lobby.html`, `lobby.js`, server `SessionsController.cs` (new endpoint)

**Goal:** Before starting a game, the host can drag player names in the lobby list to set play order. The ordered list is saved to the server. The last player in the list is shown with a "(Quizmaster)" badge.

**Server changes:**
- Add `PlayerOrder` list to `Session` model (list of playerIds).
- New endpoint: `PUT /api/sessions/{id}/playerorder` — body: `{ "order": ["pid1","pid2","pid3"] }`. Stores the order. Only valid in `Lobby` state.
- When the game starts (`POST /api/sessions/{id}/start`), if `PlayerOrder` is empty, default to current player join order.

**Client changes (lobby.js):**
- Make each player `<li>` draggable (`draggable="true"`).
- Implement `dragstart`, `dragover`, `drop` handlers to reorder the in-memory list and re-render.
- After every drop, call `PUT /api/sessions/{id}/playerorder` with the new order.
- Last player in list shows `(Quizmaster)` suffix.
- No server round start until order is confirmed.

**Check-in before S2.**

---

### S2 — Server model: RoundState + RoundContext

**Files:** `Models/RoundState.cs` (new), `Models/RoundContext.cs` (new), `Models/Session.cs` (extend)

**Goal:** Server holds all round/role state so any client can reconnect and get full current state.

**`RoundState.cs`:**
```csharp
public enum RoundState
{
    None,        // Game not started
    Round369,
    OpenDeur,
    Puzzel,
    Ingelijst,
    Finale,
    Ended
}
```

**`RoundContext.cs`:**
```csharp
public class RoundContext
{
    public RoundState Round { get; set; }
    public string CandidateId { get; set; }
    public string QuizmasterId { get; set; }
    public int QuestionIndex { get; set; }         // 1-based
    public bool[] AnswerTiles { get; set; }        // round-specific size
    public List<string> PlayerOrder { get; set; }  // ordered playerIds
    public List<string> FinalistIds { get; set; }  // set at start of Finale
}
```

**`Session.cs` additions:**
- `public RoundContext Round { get; set; } = new();`

**Serialisation:** `RoundContext` must be included in `GET /api/sessions/{id}` response so a reconnecting client can restore its full UI.

**Check-in before S3.**

---

### S3 — New RoundController + round-control endpoints

**File:** `Controllers/RoundController.cs` (new)

All endpoints require the session to be in `Active` state. They mutate `RoundContext` and broadcast SignalR events.

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/sessions/{id}/rounds/start/{round}` | Start a specific named round (OpenDeur/Puzzel/Ingelijst/Finale). Sets initial candidate/quizmaster based on scores/order. |
| `POST` | `/api/sessions/{id}/rounds/nextquestion` | Advance to next question (Round369 only, or called by quizmaster logic). Increments `QuestionIndex`. |
| `POST` | `/api/sessions/{id}/rounds/marktile/{index}` | Mark answer tile `index` as correct. Broadcasts `TileMarked`. |
| `POST` | `/api/sessions/{id}/rounds/nextturn` | Move candidate/quizmaster to next player per round rules. |
| `POST` | `/api/sessions/{id}/rounds/nextquizmaster` | Advance quizmaster (Ingelijst "Volgende" button). Also advances candidate. |

**SignalR events broadcast from these endpoints:**
- `RoundChanged` — `{ round, questionIndex, candidateId, quizmasterId, answerTiles, finalistIds }`
- `TileMarked` — `{ tileIndex, round }`
- `QuestionAdvanced` — `{ questionIndex }`
- `TurnAdvanced` — `{ candidateId, quizmasterId }`

**Round-start logic (encapsulated in a `RoundService` helper class):**
- `Round369`: candidate = first in `PlayerOrder`; quizmaster = last in `PlayerOrder`; `QuestionIndex = 1`; `AnswerTiles = new bool[15]`.
- `OpenDeur`: candidate = lowest-score non-quizmaster; quizmaster = player preceding candidate in `PlayerOrder`; `AnswerTiles = new bool[4]`.
- `Puzzel`: same as OpenDeur; `AnswerTiles = new bool[3]`.
- `Ingelijst`: same as OpenDeur; `AnswerTiles = new bool[10]`.
- `Finale`: finalists = top-2 by score; quizmaster = random from others; candidate = lowest of the two finalists; `AnswerTiles` not used.

**`nextturn` logic (also in `RoundService`):**
- Round369: both candidate and quizmaster advance to the next player in order (wraps) — they always move together. Unlike rounds 2-4, there is no stable quizmaster; the roles rotate in lockstep. Question stays unless all players have attempted — then `nextquestion` is called implicitly.
- OpenDeur/Puzzel: candidate moves to next non-quizmaster player; quizmaster stays. When all non-quizmaster players have gone, quizmaster advances (becomes the next player in order), new candidate = player after new quizmaster. Resets tile array.
- Ingelijst: controlled by `nextquizmaster` (the "Volgende" button), not `nextturn`.
- Finale: candidate toggles between the two finalists; new question flag set after both have gone.

**Check-in before S4.**

---

### S4 — GameHub: new broadcast methods

**File:** `Hubs/GameHub.cs`

Add hub methods that the controllers call via `IHubContext<GameHub>`:

```csharp
BroadcastRoundChanged(sessionId, RoundContext ctx)
BroadcastTileMarked(sessionId, int tileIndex)
BroadcastQuestionAdvanced(sessionId, int questionIndex)
BroadcastTurnAdvanced(sessionId, string candidateId, string quizmasterId)
```

Also update `GET /api/sessions/{id}` to include `RoundContext` in its response DTO, so reconnecting clients can restore state.

**Check-in before S5.**

---

### S5 — Scoreboard rework

**Files:** `scoreboard.html`, `scoreboard.js`, `style.css`

**Goal:** The scoreboard shows the current round name at the top (replacing the logo in the round-header area). Below the player score tiles, a round-specific tile area is rendered. The correct/wrong answer buttons from Phase 8 are removed from the default area (they are now quizmaster-only on the player page).

**HTML changes (`scoreboard.html`):**
- Add `<div id="roundHeader">` above player tiles — shows round name.
- Add `<div id="roundTiles">` below player tiles — hosts round-specific tiles.
- Remove or hide the `.answer-controls` div (correct/wrong buttons now on player page).

**JS changes (`scoreboard.js`):**

New SignalR listeners:
- `RoundChanged` → call `renderRound(ctx)`.
- `TileMarked` → mark tile visually.
- `QuestionAdvanced` → update question indicator.
- `TurnAdvanced` → highlight candidate/quizmaster name in score tiles.

`renderRound(ctx)`:
- Sets `#roundHeader` text to round name (e.g. "3-6-9", "Open Deur", "Puzzel", "Ingelijst", "Finale").
- Calls round-specific tile renderer:
  - **Round369:** 15 small boxes numbered 1-15; every 3rd box has a gold ring or star indicator; current question highlighted; answered questions marked.
  - **OpenDeur:** 4 boxes numbered 1-4; correct answers get a ✓ mark.
  - **Puzzel:** 3 boxes numbered 1-3; same treatment.
  - **Ingelijst:** 5×2 grid of 10 boxes numbered 1-10; correct answers marked. A "Volgende" button is shown on the scoreboard (per confirmed decision #1 — visible to all, not just the quizmaster's player page); clicking it calls `POST /api/sessions/{id}/rounds/nextquizmaster` from the scoreboard.
  - **Finale:** Only show the two finalists' score tiles; hide all others.

**Score tile highlight:**
- Candidate: gold/amber left border or glow.
- Quizmaster: blue/teal left border or glow.
- Others: no highlight.

**CSS additions (`style.css`):**
- `.round-tile` — base style for all answer tiles (semi-transparent, grey, round corners).
- `.round-tile.correct` — highlighted green/gold when answered correctly.
- `.round-tile.scoring` — gold ring for 3-6-9 scoring questions (3, 6, 9, 12, 15).
- `.round-tile.current` — brighter opacity for active question.
- `.tile-grid-2x5` — CSS grid for Ingelijst's 10-tile layout.
- `.candidate-highlight`, `.quizmaster-highlight` — left border colours for score tiles.

**Check-in before S6.**

---

### S6 — Player page rework: role-aware controls

**Files:** `player.html`, `player.js`

**Goal:** The player page shows only the controls relevant to the player's current role. Disabled controls are visually greyed out and non-interactive, but not hidden.

**Roles and enabled controls per round:**

| Round | Candidate | Quizmaster | Other |
|-------|-----------|------------|-------|
| Round369 | +20, -20 | Correct ✓, Wrong ✗ | all disabled |
| OpenDeur | +20, -20, Start, Stop, Klaar | Correct ✓, Wrong ✗ | all disabled |
| Puzzel | +20, -20, Start, Stop, Klaar | Correct ✓, Wrong ✗ | all disabled |
| Ingelijst | +20, -20, Start, Stop, Klaar | 10-tile grid (1-10) + "Volgende" | all disabled |
| Finale | Start, Stop (no score buttons) | Correct ✓, Wrong ✗ | -20 (self-deduct; non-active finalist only) |

**HTML changes (`player.html`):**
- Add a `<div id="ingelijstPanel">` containing a 2×5 grid of buttons (1-10) and a "Volgende" button. Hidden by default.
- The existing +20, -20, Start, Stop, ✓, ✗ buttons remain but are managed via a `setRole(role, round)` function.

**JS changes (`player.js`):**
- Add `currentRole` variable: `'candidate'`, `'quizmaster'`, `'other'`, `'finalist-active'`, `'finalist-inactive'`.
- Add `currentRound` variable.
- `setRole(role, round)` function: enables/disables all controls based on the table above.
- New SignalR listeners:
  - `RoundChanged` → extract own role from `candidateId`/`quizmasterId`; call `setRole()`.
  - `TurnAdvanced` → same.
- Ingelijst quizmaster tile click: calls `POST /api/sessions/{id}/rounds/marktile/{index}`.
- Ingelijst "Volgende" button: calls `POST /api/sessions/{id}/rounds/nextquizmaster`.
- OpenDeur/Puzzel/Ingelijst candidate "Klaar" button: calls `POST /api/sessions/{id}/rounds/nextturn`.
- Finale: active finalist's Start/Stop controls the score countdown (existing logic). Non-active finalist's -20 button deducts from their **own** score (self-deduct, per confirmed decision #3). Quizmaster has ✓/✗ for sound effects only. Non-finalist/non-active players have no score controls.

**Note on Finale -20:** Per confirmed decision #3, pressing -20 is a self-deduct — it subtracts from the pressing player's own score. No cross-player score targeting is needed in the code.

**Check-in before S7.**

---

### S7 — Round 3-6-9: auto-start + advancement logic

**Files:** `RoundController.cs`, `RoundService.cs`, `player.js`, `scoreboard.js`

**Goal:** Round 3-6-9 starts automatically when the host clicks "Start Spel". It advances questions per game rules without needing a "next question" button — advancement is driven by the quizmaster pressing Correct ✓ or Wrong ✗.

**Server changes:**
- Modify `POST /api/sessions/{id}/start` to also initialise `RoundContext` for Round369 and broadcast `RoundChanged`.
- When quizmaster presses ✓ (correct): mark current question, update candidate score if it's a scoring question (+20 awarded by candidate themselves via +20 button — server just tracks question state), advance question index if it was correct (candidate gets another go). Broadcast `QuestionAdvanced`.
- When quizmaster presses ✗ (wrong): advance candidate to next player (wrap); if all players have had a turn on this question, also advance question index. Broadcast `TurnAdvanced` and optionally `QuestionAdvanced`.
- After question 15 is resolved (correct or all players wrong): call round-end logic → advance `RoundState` to `OpenDeur` standby (the round name changes on scoreboard but OpenDeur doesn't start until host triggers it).

**Note on +20 in Round369:** The candidate earns points by pressing their own +20 button (existing REST call). The server's quizmaster ✓ press in Round369 context simply records correctness for tile tracking and advances the question. No server-side score change — that's the candidate's responsibility via the +20 button.

**Check-in before S8.**

---

### S8 — Rounds OpenDeur, Puzzel, Ingelijst: start-flow + advancement

**Files:** `RoundController.cs`, `RoundService.cs`, `scoreboard.js`, `player.js`

**Goal:** These rounds do not start automatically. The scoreboard shows a "Start [Round Name]" button when the previous round has ended. The initial candidate (lowest score) can begin by pressing their Start button.

**Scoreboard changes:**
- After Round369 ends, show a "Start Open Deur" button (a host-side action).
- Clicking it calls `POST /api/sessions/{id}/rounds/start/opendeur`.
- Similarly for Puzzel and Ingelijst.

**Turn management:**
- OpenDeur/Puzzel: after each candidate stops their timer (Stop pressed), `nextturn` is called automatically (server-side when the timer stops? Or manually?).

**Design decision — who triggers nextturn:**
The candidate pressing Stop does NOT automatically advance the turn. Play is "suspended" as per the brief. The quizmaster must explicitly signal readiness, OR the next candidate presses Start, which triggers `nextturn` implicitly. Chosen approach: calling `POST .../rounds/nextturn` is triggered by the NEW candidate pressing Start (i.e., Start on the player page calls nextturn first if `CandidateId` is not already the current player). This avoids a separate "next turn" button.

Alternatively (simpler): The player page shows a "Klaar" (done) button for candidates that calls nextturn, then the next candidate can press Start. This is cleaner and more explicit. **Chosen: "Klaar" / Done button for candidates at end of their turn.**

**Ingelijst quizmaster flow:**
- Quizmaster sees the 10-tile grid instead of answer buttons.
- Tapping a tile marks it correct, broadcasts `TileMarked`.
- "Volgende" button calls `nextquizmaster`.
- After last quizmaster, round ends → scoreboard shows "Start Ingelijst" → "Start Finale".

**Check-in before S9.**

---

### S9 — Finale round

**Files:** `RoundController.cs`, `RoundService.cs`, `scoreboard.js`, `player.js`

**Goal:** The finale is between the top-2 players. A random non-finalist becomes quizmaster. The scoreboard shows only the two finalists. When either reaches 0, game ends.

**Server changes:**
- `POST /api/sessions/{id}/rounds/start/finale`: compute top-2 by score, pick random quizmaster from rest, set `FinalistIds`, broadcast `RoundChanged`.
- `nextturn` in Finale: toggle candidate between the two finalists. After both have gone, a "new question" flag is set (tracked by `QuestionIndex` incrementing) — broadcast `QuestionAdvanced`.
- Score-reaches-zero check: after any score update, if `RoundState == Finale` and a finalist's score ≤ 0: call `DELETE /api/sessions/{id}` logic (end game). Broadcast `GameEnded`.

**Client changes:**
- `scoreboard.js`: hide all non-finalist score tiles in Finale; show only the two finalists prominently.
- `player.js`:
  - Finalists: Start/Stop enabled; no +20/-20.
  - Quizmaster: ✓/✗ enabled (for sounds only, as per Phase 8b).
  - Non-active finalist: -20 enabled. Pressing it deducts from their **own** score (self-deduct, per confirmed decision #3). No cross-player score targeting in code.

**Check-in before S10.**

---

### S10 — Integration, polish, and state restore on rejoin

**Files:** `player.js`, `scoreboard.js`, `GET /api/sessions/{id}` response

**Goal:** A player who rejoins mid-game (page refresh, reconnect) gets the correct role-aware controls immediately, without needing to wait for a new SignalR event.

**Changes:**
- `GET /api/sessions/{id}` response already includes full `RoundContext` (added in S2/S4).
- In `player.js` `tryResume()` and the initial `GET` after joining: if `roundContext` is present, call `setRole()` immediately.
- In `scoreboard.js` `init()`: if `roundContext` is present, call `renderRound()` immediately.
- Test all five rounds for correct control state on refresh.
- Test Ingelijst quizmaster panel shows/hides correctly on refresh.
- Test Finale hides non-finalist tiles on refresh.

**Check-in before S11.**

---

### S11 — Sound effect wiring for new rounds

**Files:** `scoreboard.js`, `player.js`

**Goal:** The existing sound effects from Phase 8 should fire at the right moments in the new round structure.

| Moment | Sound |
|--------|-------|
| Candidate presses Start | `clock-tick.mp3` starts looping |
| Candidate presses Stop | `clock-tick.mp3` stops |
| Quizmaster presses ✓ | `correct.mp3` |
| Quizmaster presses ✗ | `wrong.mp3` |
| Finale finalist reaches 0 | `score-zero.mp3` |
| New round starts | (optional) re-play `game-start.mp3` or a new transition sound |

The existing `TimerStarted`/`TimerStopped` SignalR events already handle the clock tick. The ✓/✗ sounds are already handled by Phase 8b's `AnswerSound` event. No new sound infrastructure is required — just verify the existing wiring works in the new round contexts.

**Check-in before S12.**

---

### S12 — Final review + documentation

**Files:** `PLAN.md`, `PROGRESS.md`, `archive/PLAN_phase10_rounds.md`, `archive/PROGRESS_phase10_rounds.md`

**Goal:** Clean up, document, and check in.

- Review all new endpoints for consistent error handling (404 session not found, 409 wrong state).
- Verify that the Delphi Android app is unaffected (it does not use `RoundContext`; its score pushes and heartbeats still work independently).
- Update `claude/PLAN.md` and `claude/PROGRESS.md`.
- Create `claude/archive/PROGRESS_phase10_rounds.md`.
- Commit all changes.

---

## Confirmed decisions (all open questions resolved)

1. **"Volgende" button in Ingelijst** — shown on both the quizmaster's player page AND the scoreboard. Not shown to candidates or other players.

2. **Round369 scoring** — honour system. The server does not enforce that +20 is only pressed on scoring questions or only by the candidate.

3. **Finale -20 mechanic** — the non-active finalist presses their own -20 button on their own device, deducting from their own score. The battle is between losing points through countdown and forcing the opponent to zero by giving correct answers. Honour system — no cross-player score targeting needed in code.

4. **Round369 early exit** — no early exit button. All 15 questions are always played in full.

5. **Minimum player count** — hard block: the "Start Spel" button is disabled and a warning is displayed when fewer than 3 players have joined. Server also rejects the start request if the count is below 3.

6. **Round369 quizmaster rotation** — both candidate and quizmaster roles advance together after each turn. Unlike rounds 2-4 (where the quizmaster is stable until the round ends), in Round369 the roles always move in lockstep through the player order.

---

## Implementation sequence rationale

Steps are ordered to minimise broken states between check-ins:

- **S1** (lobby ordering) is safe to do before the round system — it only affects the lobby, game start is unchanged.
- **S2** (server model) is pure addition — no existing behaviour changes.
- **S3+S4** (endpoints + hub) add new routes/events; existing routes/events untouched.
- **S5** (scoreboard) is a visual rework that degrades gracefully if no `RoundContext` is present yet.
- **S6** (player page) similarly degrades gracefully.
- **S7–S9** add the per-round logic on top of the scaffolding built in S2–S6.
- **S10** (rejoin) is last because it depends on all previous pieces being correct.
- **S11** (sound) and **S12** (review) are cleanup steps.

---

## Files changed summary

| File | Change type |
|------|-------------|
| `Models/RoundState.cs` | NEW |
| `Models/RoundContext.cs` | NEW |
| `Models/Session.cs` | Extend (add RoundContext, PlayerOrder) |
| `Services/RoundService.cs` | NEW (round logic helper) |
| `Controllers/RoundController.cs` | NEW |
| `Controllers/SessionsController.cs` | Extend (playerorder endpoint, start initialises round) |
| `Hubs/GameHub.cs` | Extend (new broadcast methods) |
| `wwwroot/lobby.html` | Extend (draggable list) |
| `wwwroot/js/lobby.js` | Extend (drag-and-drop, PUT playerorder) |
| `wwwroot/scoreboard.html` | Rework (round header, round tiles, remove answer buttons) |
| `wwwroot/js/scoreboard.js` | Rework (renderRound, new SignalR listeners) |
| `wwwroot/player.html` | Extend (ingelijst panel) |
| `wwwroot/js/player.js` | Rework (setRole, new SignalR listeners, Ingelijst/Finale logic) |
| `wwwroot/css/style.css` | Extend (tile styles, highlight styles) |
