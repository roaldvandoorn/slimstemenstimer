# Phase 8b Plan — Player Audio Controls

## Goal
Add ✓ Goed / ✗ Fout buttons to `player.html` so any player can trigger correct/wrong sounds on the shared scoreboard screen. The quizmaster role rotates each turn, so all players need this capability.

## Approach
Player click → SignalR hub invocation → server broadcasts `AnswerSound` → scoreboard plays the sound.

## Files modified
| File | Change |
|------|--------|
| `Hubs/GameHub.cs` | Added `BroadcastAnswerSound(sessionId, soundType)` hub method |
| `wwwroot/player.html` | Added ✓ Goed / ✗ Fout buttons in game view, below reset button |
| `wwwroot/js/player.js` | Added DOM refs, click handlers, disabled on game end |
| `wwwroot/js/scoreboard.js` | Added `AnswerSound` SignalR event handler |

## Steps completed
1. ✅ GameHub.cs — BroadcastAnswerSound broadcasts "AnswerSound" + soundType to session group
2. ✅ player.html — .answer-controls div with btnPlayerCorrect / btnPlayerWrong (reused Phase 8 CSS)
3. ✅ player.js — click handlers invoke BroadcastAnswerSound; buttons disabled in onGameEnded()
4. ✅ scoreboard.js — AnswerSound handler plays correct/wrong sound via existing playSound()
5. ✅ Build verified, tested, committed
