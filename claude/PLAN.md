# De Slimste Mens Timer — Plan

## Phase 10 — Rounds System (De Slimste Mens)

Full round structure: 3-6-9, Open Deur, Puzzel, Ingelijst, Finale.
Role-aware player controls. Lobby drag-and-drop ordering. Round tile indicators on scoreboard.

See full plan: `archive/PLAN_phase10_rounds.md`

### Steps
| # | Description | Status |
|---|-------------|--------|
| S1 | Drag-and-drop player ordering in lobby | ✅ Done |
| S2 | Server model: RoundState + RoundContext | ✅ Done |
| S3 | New RoundController + round-control endpoints | ⬜ Pending |
| S4 | GameHub: new broadcast methods | ⬜ Pending |
| S5 | Scoreboard rework (round header + tile area) | ⬜ Pending |
| S6 | Player page rework: role-aware controls | ⬜ Pending |
| S7 | Round 3-6-9 auto-start + advancement logic | ⬜ Pending |
| S8 | Rounds OpenDeur, Puzzel, Ingelijst: start-flow + advancement | ⬜ Pending |
| S9 | Finale round | ⬜ Pending |
| S10 | Integration, polish, and state restore on rejoin | ⬜ Pending |
| S11 | Sound effect wiring for new rounds | ⬜ Pending |
| S12 | Final review + documentation | ⬜ Pending |

---

## Completed phases

| Phase | Description | Archive file |
|-------|-------------|--------------|
| Phase 1 | Android app (Delphi/FMX) | `archive/PLAN_phase1_android_app.md` |
| Phase 2 | Multiplayer extension (ASP.NET Core server + Delphi client) | `archive/PLAN_phase2_multiplayer.md` |
| Phase 3 | CI pipeline, GitHub Releases, Windows installer (Inno Setup) | `archive/PLAN_phase3_installer.md` |
| Phase 4 | Discoverability & polish (#17 #18 #19 #20) | `archive/PLAN_phase4_discoverability.md` |
| Phase 5 | Google Play deployment + installer improvements (#15 + icons/stop-service) | `archive/PLAN_phase5_google_play.md` |
| Phase 6 | Browser-based player client (#22) | `archive/PLAN_phase6_browser_player.md` |
| Phase 7 | Web app theme & artwork (quiz-show style, Canva assets, switchable themes) | `archive/PLAN_phase7_web_theme.md` |
| Phase 8 | Sound effects & answer buttons for scoreboard | `archive/PLAN_phase8_sound_effects.md` |
| Phase 8b | Player audio controls (✓/✗ buttons on player page) | `archive/PLAN_phase8b_player_audio.md` |
| Phase 9 | Rejoin / reconnect — localStorage resume + SignalR onreconnected | `archive/PLAN_phase9_rejoin.md` |
