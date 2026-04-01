# De Slimste Mens Timer

An Android countdown timer and score tracker for the board game *De Slimste Mens* (The Smartest Person). Each player runs the app on their own device. An optional web server provides a shared real-time scoreboard visible in any browser on the same network.

## Features

### Android app
- Countdown timer starting at 60 seconds
- **Start/Stop** — toggle the countdown
- **+20 / −20** — adjust the score directly (−20 clamps to 0)
- **Hamburger menu** (top-left):
  - *Reset score* — resets to 60 and stops the timer
  - *Score instellen* — enter any score from 0 to 1000
  - *Aanmelden bij spel* — join a server session by QR code scan or manual URL
  - *Afmelden* — leave the current session
  - *Afsluiten* — close the app
- Portrait-only orientation
- Works fully offline — server connection is optional

### Web scoreboard (server)
- Host creates a session in the browser; players join via QR scan
- Real-time scoreboard updates as players' scores change
- Session lobby with drag-and-drop player ordering and "Start Spel" button
- "Beëindig spel" ends the game and shows a "Nieuw Spel" link for all viewers
- App download QR code on the landing page
- **Rounds system**: full De Slimste Mens round structure managed from the scoreboard:
  - **3-6-9** (auto-starts with the game): 15 questions, scoring questions highlighted (3, 6, 9, 12, 15), tile per correct answer, wrong answer advances the turn
  - **Open Deur**: 4 correct-answer tiles per candidate; candidate controls their timer, quizmaster marks correct/wrong answers
  - **Puzzel**: 3 correct-answer tiles per candidate; same flow as Open Deur
  - **Ingelijst**: 10 picture tiles; quizmaster marks tiles, "Volgende" button advances to next quizmaster
  - **Finale**: 2 finalists, 5 answer tiles per turn; lowest-scoring finalist goes first each question; stopping the timer or marking the 5th correct answer ends the turn
- Round header shows current round name and progress (e.g. "Open Deur — Vraag 2 van 5")
- Active candidate and quizmaster tiles are highlighted on the scoreboard

### Browser player client
- Players who cannot or prefer not to install the Android app can join by opening the QR code URL in any phone browser
- Enter your name, join the session, and get a scoring UI that mirrors the app: countdown timer (score counts down 1 pt/s), **+20 / −20** buttons, and a **↺ Herstel** button to reset the score to 60
- **Role-aware controls**: the player page automatically shows the right controls for your current role:
  - **Kandidaat** (candidate): Start/Stop timer, Klaar button to end your turn
  - **Quizmaster**: ✓ Goed / ✗ Fout answer buttons; Ingelijst tile grid (10 buttons) + Volgende
  - **Other players**: +20 / −20 always available for score corrections during hectic rounds
- **Role indicator**: "KANDIDAAT" or "QUIZMASTER" label shown in amber/teal when you have a role
- Live mini-overview of other players' scores, visible at all times:
  - **Portrait** (phones): compact tiles below the controls
  - **Landscape** (tablets, monitors): sidebar to the left of the controls
- Score synced to the server in real time; fully compatible with the Android app (both can be used in the same session)
- **Auto-resume**: if a player refreshes the page, locks their screen, or closes and reopens the browser tab, they are automatically returned to their game — no re-entering their name, no lost score

## Project structure

```
SlimsteMensTimer.dpr            ← Android app entry point
SlimsteMensTimer.dproj          ← Android app project config
AndroidManifest.template.xml    ← Android manifest (camera, network permissions)
res/
  network_security_config.xml   ← allows plain HTTP to LAN server (Android 9+)
src/
  MainFrm.pas                   ← form logic: timer, buttons, menu, server join/leave
  MainFrm.fmx                   ← visual layout (FMX XML)
  ScoreManager.pas              ← IScoreManager interface + TScoreManager
  ServerClient.pas              ← IServerClient, TServerClient, TServerAwareScoreManager
  ScannerFrm.pas                ← ZXing QR scanner form
  ScannerFrm.fmx                ← minimal FMX stub required by {$R *.fmx}
tests/
  SlimsteMensTimerTests.dpr     ← DUnitX console test runner
  SlimsteMensTimerTests.dproj   ← test project config (Windows)
  TestScoreManager.pas          ← 20 unit tests for TScoreManager
SlimsteMensTimerServer/
  SlimsteMensTimerServer.sln
  SlimsteMensTimerServer/
    Program.cs                  ← DI, SignalR, CORS, static files, startup log
    appsettings.json            ← port (5000), StaleSeconds, SessionTimeoutHours
    Controllers/                ← REST API: sessions, players, QR code, rounds
    Hubs/GameHub.cs             ← SignalR hub
    Models/                     ← Session, Player, SessionState, RoundContext, RoundState
    Services/                   ← SessionStore, HeartbeatMonitor, IpAddressHelper, RoundService
    wwwroot/                    ← lobby.html, scoreboard.html, player.html, JS, CSS, audio/
claude/
  PLAN.md                       ← step-by-step execution plan
  PROGRESS.md                   ← progress log
```

## Download (pre-built releases)

The latest server release is available on the [GitHub Releases page](../../releases/latest). Each release includes:

| File | Use |
|------|-----|
| `SlimsteMensTimerServer-vX.X.X-Setup.exe` | **Recommended.** One-click Windows installer — registers the server as a Windows Service (auto-start on boot), opens firewall port 5000, and adds Start Menu shortcuts to open the lobby and start/stop the service. |
| `SlimsteMensTimerServer-vX.X.X-win-x64.zip` | Portable zip — extract and run `SlimsteMensTimerServer.exe` directly. No installation required. |

No .NET runtime installation is needed — both artefacts are self-contained.

---

## Building and running

### Android app

**Requirements:** Delphi 13 with FireMonkey, Android SDK (configured via Tools > Options), ZXing.Delphi on the Delphi global library path.

1. Open `SlimsteMensTimer.dproj` in Delphi
2. Select the **Android** platform in the Project Manager
3. Connect an Android device (USB debugging enabled)
4. Press **F9** to build and deploy

### Unit tests (Windows)

1. Open `tests/SlimsteMensTimerTests.dproj` in Delphi
2. Select **Win32** or **Win64** platform
3. Press **F9** — results are printed to the console

### Server

**Requirements:** .NET 8 SDK or Visual Studio 2022.

```bash
cd SlimsteMensTimerServer/SlimsteMensTimerServer
dotnet run
```

Or open `SlimsteMensTimerServer.sln` in Visual Studio 2022 and press **F5**.

The server listens on `http://0.0.0.0:5000`. On startup it logs the LAN IP address, e.g.:

```
Server running — join URL base: http://192.168.1.5:5000
```

Open `http://<lan-ip>:5000` in a browser to reach the lobby.

## Network requirements

- The server machine and all Android devices must be on the **same local network** (Wi-Fi).
- The server uses plain HTTP (not HTTPS). Android 9+ blocks HTTP by default; `res/network_security_config.xml` overrides this for the app.
- If the server machine has a **VPN active**, it may advertise the wrong IP in the QR code. Disable the VPN before starting the server, or enter the correct LAN IP manually in the app.

## How to play

1. **Start the server** on the host machine.
2. **Open the browser** at `http://<server-ip>:5000` and click **Nieuwe Sessie**.
3. **Each player** joins using either option:
   - **Android app** — tap the hamburger menu → *Aanmelden bij spel* → scan the QR code (or enter the URL manually).
   - **Browser** — scan the QR code with any phone camera or browser, enter your name, and tap **Meedoen**. No app install required.
4. Once all players have joined, the host clicks **Start Spel** in the browser.
5. Players use **Start/Stop**, **+20**, **−20** during the game — scores update on the scoreboard in real time.
6. When the game ends, the host clicks **Beëindig spel** on the scoreboard.

### Android app vs browser client

| | Android app | Browser client |
|---|---|---|
| Installation | Required (Google Play) | None — any phone browser |
| Timer | Score counts down 1 pt/s | Score counts down 1 pt/s |
| Score controls | +20 / −20 / Reset | +20 / −20 / ↺ Herstel |
| Other players' scores | Not shown | Live tiles (sidebar / bottom) |
| Works offline | Yes | No — requires server connection |

## Architecture

### Score management

`TScoreManager` implements `IScoreManager` and manages local score state. When connected to a server session, `TServerAwareScoreManager` wraps it as a decorator — every score mutation is transparently forwarded to the server without any changes to the existing button handlers.

| Method | Behaviour |
|---|---|
| `Increase(n)` | Adds n to score (no upper cap) |
| `Decrease(n)` | Subtracts n, clamps to 0 |
| `SetScore(n)` | Sets score; raises `EArgumentOutOfRangeException` if outside 0–1000 |
| `Reset` | Restores score to 60 |

### Server REST API

| Endpoint | Method | Description |
|---|---|---|
| `/api/sessions` | POST | Create session → `{ sessionId, joinUrl }` |
| `/api/sessions/{id}` | GET | Get session state and player list |
| `/api/sessions/{id}/start` | POST | Start the game (auto-starts Round369) |
| `/api/sessions/{id}` | DELETE | End and delete the session |
| `/api/sessions/{id}/players` | POST | Register player → `{ playerId }` |
| `/api/sessions/{id}/players` | GET | List all players |
| `/api/sessions/{id}/players/{pid}/score` | PUT | Push score update |
| `/api/sessions/{id}/players/{pid}/heartbeat` | POST | Keep-alive (every 15 s) |
| `/api/sessions/{id}/qr` | GET | QR code PNG encoding the join URL |
| `/api/appqr` | GET | QR code PNG encoding the app download link |
| `/api/sessions/{id}/rounds/start/{roundName}` | POST | Start a named round (opendeur, puzzel, ingelijst, finale) |
| `/api/sessions/{id}/rounds/correct` | POST | Round369: mark current tile correct, advance question |
| `/api/sessions/{id}/rounds/nextturn` | POST | Advance candidate/quizmaster roles per round rules |
| `/api/sessions/{id}/rounds/nextquestion` | POST | Advance question index without changing roles |
| `/api/sessions/{id}/rounds/marktile/{i}` | POST | Mark answer tile i as correct |
| `/api/sessions/{id}/rounds/nextquizmaster` | POST | Ingelijst: advance to next quizmaster, reset tiles |

### SignalR events (server → browser)

| Event | Trigger |
|---|---|
| `PlayerJoined` | Player registered |
| `ScoreUpdated` | Score pushed |
| `PlayerWentStale` | No heartbeat for 30 s |
| `PlayerReturned` | Heartbeat or score received from stale player |
| `GameStarted` | Host clicked Start Spel |
| `GameEnded` | Host ended the session or 2-hour idle timeout |
| `TimerStarted` | A player started their countdown |
| `TimerStopped` | A player stopped their countdown |
| `AnswerSound` | A player or the scoreboard triggered a correct/wrong sound |
| `RoundChanged` | A new round started (carries full RoundContext) |
| `TileMarked` | An answer tile was marked correct (tileIndex, round) |
| `QuestionAdvanced` | Question index incremented (questionIndex) |
| `TurnAdvanced` | Candidate/quizmaster changed (candidateId, quizmasterId, questionIndex) |
