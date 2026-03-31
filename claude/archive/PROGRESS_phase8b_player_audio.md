# Phase 8b Progress Log — Player Audio Controls

## 2026-03-31

- Added `BroadcastAnswerSound(sessionId, soundType)` to GameHub.cs
- Added ✓ Goed / ✗ Fout buttons to player.html game view (below reset button), reusing .answer-controls/.btn-correct/.btn-wrong from Phase 8
- Updated player.js: DOM refs for new buttons, click handlers invoking BroadcastAnswerSound, buttons disabled in onGameEnded()
- Updated scoreboard.js: AnswerSound SignalR event handler triggers existing playSound(sounds.correct/wrong)
- Build verified (dotnet build succeeded)
- Tested: player buttons trigger scoreboard sounds correctly; buttons disabled on game end
- Committed and pushed to main
