# Phase 8 Progress Log — Sound Effects for Scoreboard

## 2026-03-31

- Explored scoreboard/player/hub codebase to understand SignalR event flow
- Planned and approved: 5 sounds, TimerStarted/Stopped server events, answer buttons, floating mute FAB
- Installed yt-dlp via pip, ffmpeg via winget
- Extracted 5 audio clips from YouTube (jK3TbdsKAMs) into wwwroot/audio/
- Trimmed silence: clock-tick (-1.56s), correct (-0.76s), wrong (-1.03s), game-start (-1.05s)
- Added BroadcastTimerStarted/BroadcastTimerStopped to GameHub.cs
- Updated player.js: hubConnection reference + invoke on start/stop
- Rewrote scoreboard.js: sound engine, mute toggle, answer buttons, new SignalR handlers
- Updated scoreboard.html: answer-controls div, floating mute button (moved before scripts)
- Refactored theme-toggle.css: .fab-btn base class shared by theme + mute buttons
- Added answer button styles to style.css
- Applied fab-btn class to theme toggle button in all 4 HTML pages
- Fixed: btnMute was null (button after script tag) → moved buttons before script
- Fixed: GameStarted not received by scoreboard → play in init() instead
- Fixed: audio files in wrong wwwroot (solution level) → moved to project level
- Build verified (dotnet build succeeded), committed ae00075, pushed to main
