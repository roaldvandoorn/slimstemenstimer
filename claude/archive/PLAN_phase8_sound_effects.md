# Phase 8 Plan — Sound Effects for Scoreboard

## Goal
Add sound effects to the scoreboard web UI only. Player devices remain silent.

## Sound effects implemented
| File | Trigger | Behaviour |
|------|---------|-----------|
| `game-start.mp3` | Scoreboard page load | Play once |
| `clock-tick.mp3` | TimerStarted / TimerStopped SignalR events | Loop while any timer active |
| `score-zero.mp3` | ScoreUpdated with score === 0 | Play once |
| `correct.mp3` | ✓ Goed button click | Play once |
| `wrong.mp3` | ✗ Fout button click | Play once |

## Source
YouTube: https://www.youtube.com/watch?v=jK3TbdsKAMs

## Steps completed
1. ✅ Extract audio — yt-dlp (pip) + ffmpeg (winget); 5 clips extracted and trimmed
2. ✅ GameHub.cs — BroadcastTimerStarted / BroadcastTimerStopped hub methods
3. ✅ player.js — invoke hub methods on timer start/stop; hubConnection reference added
4. ✅ scoreboard.js — sound engine, mute toggle, answer button handlers, SignalR wiring
5. ✅ scoreboard.html — answer buttons + floating mute FAB button
6. ✅ theme-toggle.css — shared .fab-btn base class; mute button left of theme button
7. ✅ style.css — .answer-controls, .btn-correct, .btn-wrong styles
8. ✅ Committed ae00075, pushed to main

## Key bugs fixed during implementation
- `btnMute` was placed after the script tag → moved buttons before scripts
- `GameStarted` SignalR event not received by scoreboard (page loads after event) → play sound in init() instead
- Audio files extracted to solution-level wwwroot instead of project-level wwwroot → moved to correct path
