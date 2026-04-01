---
name: Project status and history
description: Current completion state and key milestones of the De Slimste Mens Timer project
type: project
---

**Phases 1–10 complete as of 2026-04-01.** No active phase. Latest work: Phase 10 rounds system — full De Slimste Mens round structure (3-6-9, Open Deur, Puzzel, Ingelijst, Finale), play-test bug fixes, and UX improvements.

**Why:** Android app, multiplayer server, CI/CD pipeline, Windows installer, discoverability/polish (Phase 4), Google Play deploy (Phase 5), browser-based player client (Phase 6), web theme (Phase 7), sound effects (Phase 8/8b), rejoin/reconnect (Phase 9), and full rounds system (Phase 10) are all fully implemented.

**How to apply:** Any new work is enhancement territory. See `claude/improvements.md` for the remaining backlog. No pending steps in `claude/PLAN.md`.

## Current release
- Tag `v0.0.7` — latest *tagged* release (2026-03-25); Phases 6–10 merged to main but not yet tagged

## Completed since v0.0.7
- Phase 6: `player.html` + `player.js` — browser-based player client
- Phase 7: Quiz-show theme, Canva artwork, switchable themes
- Phase 8: Scoreboard sound effects (5 sounds), mute FAB, correct/wrong answer buttons
- Phase 8b: Player page correct/wrong buttons triggering scoreboard sounds via SignalR
- Phase 9: Rejoin/reconnect — `sessionStorage` resume flow + SignalR `onreconnected`
- Phase 10: Rounds system — RoundState enum, RoundContext, RoundService, RoundController (6 endpoints), role-aware player controls, scoreboard round tiles, Finale with 5-tile-per-turn rules, drag-and-drop lobby ordering

## Phase 10 key decisions and fixes
- `sessionStorage` (not `localStorage`) for player identity — prevents multi-tab collision when multiple players join from same computer
- +20/−20 always enabled for all players regardless of role — play-test fix so players can correct missed score presses
- Sequential tile marking via `answerTiles.findIndex(t => !t)` — quizmaster ✓ in OpenDeur/Puzzel/Finale marks next unmarked tile
- `TurnAdvanced` carries `questionIndex` as 3rd arg — prevents brief re-enable of quizmaster controls after Round369 Q15 ends
- Finale: 5 tiles per turn; stopping the timer OR marking 5th tile ends the turn; wrong answers play sound only; lowest-scoring finalist goes first each question

## Key deliverables
- `SlimsteMensTimer.dpr` — Delphi / FMX Android app
- `SlimsteMensTimerServer/` — ASP.NET Core 8 server
- `tests/` — 20 DUnitX unit tests (all passing)
- `postman/` — Postman collection for server integration testing
- `claude/presentation.md` — 15-slide Marp presentation
- `claude/presentation.pptx` — 15-slide PowerPoint (generated via python-pptx)
- `installer/SlimsteMensTimerServer.iss` — Inno Setup script (registers Windows Service, opens port 5000)
- `SETUP.md` — Dutch non-technical setup guide (server install → app install → join)
- `appsettings.example.json` — documented server configuration reference

## Phase summaries

### Phase 1 (Android app)
Steps 1–7 completed in a prior session. IScoreManager interface made Phase 2 zero-impact.

### Phase 2 (multiplayer — 2026-03-23)
S1–S8: ASP.NET Core 8 server with SignalR scoreboard, REST API, HeartbeatMonitor, QR login
D1–D5: Delphi client — ServerClient.pas, ZXing QR scanning, TServerAwareScoreManager decorator
F1–F5: App download QR, End/New game flow, README rewrite, final review, presentation

### Phase 3 (CI/CD + installer)
GitHub Actions CI, GitHub Releases on tag push, Inno Setup Windows installer

### Phase 6 (browser player client)
`player.html` / `player.js`: join → waiting → game view; 1 pt/s countdown; +20/−20/reset; live others sidebar via SignalR

### Phase 9 (rejoin/reconnect)
`onreconnected` handler re-invokes `JoinSessionGroup`; `sessionStorage` stores playerId + playerName on join; `tryResume()` on page load: heartbeat to verify → GET session for score/state → restore UI

### Phase 10 (rounds system — 2026-04-01)
Full De Slimste Mens round structure. Server: `RoundState` enum, `RoundContext` model, `RoundService` singleton, `RoundController` (6 REST endpoints). Client: role-aware UI (`deriveRole`/`setRole` pattern), round tiles on scoreboard, transition buttons, Finale with 2-finalist rules.
