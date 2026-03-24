---
marp: true
theme: default
paginate: true
style: |
  section {
    background: #B71C1C;
    color: #ffffff;
    font-family: 'Segoe UI', Arial, sans-serif;
  }
  h1, h2 { color: #FFA726; }
  code { background: rgba(0,0,0,0.35); color: #fff; border-radius: 4px; padding: 0 4px; }
  pre { background: rgba(0,0,0,0.35); border-radius: 8px; }
  table { border-collapse: collapse; width: 100%; }
  th { background: rgba(0,0,0,0.35); color: #FFA726; }
  td, th { border: 1px solid rgba(255,255,255,0.2); padding: 6px 10px; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
---

# De Slimste Mens Timer

### From solo Android app to multiplayer scoreboard
#### Built entirely with Claude Code

---

## What is it?

A digital replacement for the physical timer devices in the Dutch board game **De Slimste Mens** (The Smartest Person).

**Phase 1** — standalone Android app
Each player runs the app on their own device: 60-second countdown, score tracking, simple controls.

**Phase 2** — multiplayer extension
An ASP.NET Core server manages game sessions. A browser scoreboard shows all connected players' scores in real time, updated instantly as players change their score.

The app works **fully offline**. Server connectivity is optional.

---

## Original prompt

> *"I want to build an android app built with Delphi / Firemonkey to be used in conjunction with the 'De Slimste Mens' board game. The app will be a replacement for the board games own timer devices.*
>
> *The timer / scoring app is a simple app with a countdown timer that is initially set to 60 seconds. When pressing the start/stop button, the score starts counting down at 1 point per second. When pressed again, the timer stops counting down. There are 2 more buttons, marked +20 and -20, which add or subtract 20 seconds / points from the current score.*
>
> *The app will only have to have a portrait oriented layout. The layout of the screen is so that the score is displayed more prominently at the top, centered in the screen. The 3 buttons are below that. From left to right they are +20, start/stop, -20. The background is a slightly darker red. The score and text on the buttons is white. The buttons themselves are round, and slightly orange/yellow in color."*

---

## Phase 1 — Android App

### Step 1 · Project scaffolding

- Created `SlimsteMensTimer.dpr` + `SlimsteMensTimer.dproj`
- Android target platform, Debug + Release configurations
- Portrait lock: `FormFactor.Orientations = [Portrait]`
- Empty `MainFrm.pas` / `MainFrm.fmx` ready for UI

---

## Phase 1 — Android App

### Step 2 · UI Layout

- `rectBackground` — full-screen dark red `#B71C1C`
- `lblScore` — large white label, centered, upper half of screen
- Three round orange `#FFA726` buttons: **−20**, **Start**, **+20**
- White text on all controls
- Component declarations and empty `OnClick` stubs in `MainFrm.pas`

---

## Phase 1 — Android App

### Step 3 · Timer Logic

- `tmrCountdown: TTimer` — 1000 ms interval
- Each tick: `FScore := FScore - 1`, clamp to 0, stop timer at 0
- `txtStartStopClick`: toggles `tmrCountdown.Enabled`, updates button label
- `txtMinus20Click` / `txtPlus20Click`: direct field arithmetic

---

## Phase 1 — Android App

### Step 4 · Style Refinement

- Font size tuning: score label 120 pt → **150 pt**
- Button circle sizing and spacing adjusted for responsiveness
- `Anchors` set on buttons so layout scales across Android screen sizes
- Visual polish: stroke color, corner radius on menu button

---

## Phase 1 — Android App

### Step 5 · Hamburger Menu

- `btnMenu` — orange rounded rectangle, top-left, `☰` glyph
- `pnlMenu` — semi-transparent dark overlay panel, toggles on tap
- Three menu items (TText):
  - **Reset score** — resets to 60, stops timer
  - **Score instellen** — `TDialogService.InputQuery`, validates 0–1000
  - **Afsluiten** — `Application.Terminate`
- Deployed and tested on device ✓

---

## Phase 1 — Android App

### Step 6 · ScoreManager Class

Replaced raw `FScore: Integer` field with a proper abstraction:

```pascal
IScoreManager = interface
  procedure Increase(AAmount: Integer);
  procedure Decrease(AAmount: Integer);   // clamps to 0
  procedure SetScore(AValue: Integer);    // raises on out-of-range
  procedure Reset;                        // → 60
  function  Score: Integer;
end;
```

`TScoreManager` implements `IScoreManager`. All `MainFrm` handlers updated to go through the interface. **Decorator-ready** — the interface can be wrapped without touching handlers.

---

## Phase 1 — Android App

### Step 7 · DUnitX Unit Tests

20 tests in `tests/TestScoreManager.pas`:

| Group | Tests |
|---|---|
| Create | Initial score = 60 |
| Reset | Returns to 60 from any value |
| Increase | Adds correctly, no upper cap |
| Decrease | Subtracts, clamps to 0 |
| SetScore | Valid values, boundary values |
| SetScore exceptions | Below 0, above 1000 raise `EArgumentOutOfRangeException` |

All 20 tests passing on Win32/Win64 ✓

---

## Phase 1 — Android App

### Steps 8 + 9 · Device Testing & Review

- Built and deployed to Android device
- Full flow verified: timer, ±20, menu items, score dialog, exit
- `README.md` written
- Code review: `FMX.Dialogs` import identified as unused (superseded by `FMX.DialogService`) — documented, no functional impact

**Phase 1 complete ✓**

---

## Multiplayer extension — the prompt

> *"Now we want to add a shared scoreboard. A web page that shows all connected players' scores, updated in real time. A server manages game sessions. Players join a session by scanning a QR code from the app.*
>
> *The existing app should continue to work offline. Server connectivity is optional. When connected, score changes should appear on the scoreboard within about one second.*
>
> *The server should be an ASP.NET Core application. Use SignalR for real-time browser updates. The Delphi app pushes scores via plain HTTP — no SignalR on the app side."*

*(Reconstructed from `claude/archive/PROJECT.md` and the design plan — no session transcript was preserved for this conversation.)*

---

## Phase 2 — Server · S1 + S2

### S1 · Project Scaffolding

- `SlimsteMensTimerServer.sln` targeting .NET 8
- NuGet: `QRCoder`, `Swashbuckle.AspNetCore`
- `Program.cs`: SignalR, CORS (all origins + credentials), static files, Swagger
- `appsettings.json`: `0.0.0.0:5000`, `StaleSeconds=30`, `SessionTimeoutHours=2`
- Startup log prints LAN IP address

### S2 · Models + SessionStore

- `SessionState` enum: `Lobby → Active → Ended`
- `Session`, `Player` models; `ConcurrentDictionary` for thread safety
- `SessionStore` singleton: create, read, start, end, delete sessions; add/update players
- 6-character session codes from unambiguous charset (no `0`/`O`, `1`/`I`)

---

## Phase 2 — Server · S3 + S4

### S3 · REST API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/sessions` | Create session |
| POST | `/api/sessions/{id}/players` | Register player |
| PUT | `/api/sessions/{id}/players/{pid}/score` | Push score |
| POST | `/api/sessions/{id}/players/{pid}/heartbeat` | Keep-alive |
| GET | `/api/sessions/{id}/qr` | QR code PNG |
| GET | `/api/appqr` | App download QR |

SignalR events broadcast on every state change via `IHubContext<GameHub>`.

### S4 · SignalR Hub

- `GameHub.JoinSessionGroup(sessionId)` — adds browser connection to session group
- Events: `PlayerJoined`, `ScoreUpdated`, `PlayerWentStale`, `PlayerReturned`, `GameStarted`, `GameEnded`

---

## Phase 2 — Server · S5 + S6

### S5 · Postman Collection

- 3 folders: **Sessions**, **Players**, **QR Code** — 10 requests total
- Auto-capture test scripts extract `sessionId` and `playerId` into collection variables
- All requests include status-code assertions
- Enables complete manual integration test without a browser

### S6 · HeartbeatMonitor

- `BackgroundService` running every 5 seconds
- Marks players **stale** after 30 s without heartbeat → broadcasts `PlayerWentStale`
- Ends sessions idle for 2+ hours → broadcasts `GameEnded`
- Recovery (`PlayerReturned`) handled in controllers on next push or heartbeat

---

## Phase 2 — Server · S7 + S8

### S7 · Web UI

- `lobby.html` / `lobby.js` — create session, QR code display, player list, Start Spel button
- `scoreboard.html` / `scoreboard.js` — live player tiles, End Spel button, Nieuw Spel flow
- `style.css` — dark red `#B71C1C` background, orange `#FFA726` accents, matching app palette
- `signalr.min.js` — local copy, no CDN dependency
- App download QR on landing page (Google Play internal test link)

### S8 · Integration Test (manual)

- Session creation → QR display → Postman registers two players → score updates → tiles update live
- Stale detection confirmed at 30 s; tile recovers on next heartbeat
- `/join/{id}` redirect: → lobby (Lobby state), → scoreboard (Active state)

---

## Phase 2 — Delphi Client · D1–D3

### D1 · ServerClient.pas

- `IServerClient` interface: `JoinSession`, `LeaveSession`, `PushScore`, `IsConnected`
- `TServerClient`: `THTTPClient` per request; heartbeat `TTimer` (15 s); offline after 3 failures
- `TServerAwareScoreManager` **decorator**: wraps `IScoreManager`, pushes score after every mutation — zero changes to existing handlers

### D2 · Menu Layout

- `pnlMenu` height extended (150 → 250)
- Added `mnuJoinGame` ("Aanmelden bij spel") and `mnuLeaveGame` ("Afmelden", hidden by default)
- Added `lblStatus` — top-right, 13 pt, shows "Online" / "Offline" / empty

### D3 · Join/Leave Logic

- `DoJoin`: background thread via `TThread.CreateAnonymousThread`; swaps `FScoreManager` to `TServerAwareScoreManager` on success
- `tmrStatusPoll` (5 s): updates `lblStatus` from `IsConnected`

---

## Phase 2 — Delphi Client · D4 + D5

### D4 · ZXing QR Scanning

- `TScannerForm`: full-screen camera preview, scans every 15th frame via `TScanManager`
- `TOnResultProc` named type (not `TProc<string>`) — avoids compiler overload issues
- `{$R *.fmx}` requires `ScannerFrm.fmx` stub — omitting it raises `EResNotFound` at runtime
- Camera NOT deactivated in `OnClose` — deactivating inside `DoFormClose` hangs ZXing
- `res/network_security_config.xml` added — Android 9+ blocks HTTP without it

### D5 · End-to-End Test

- Full flow confirmed: browser creates session → player scans QR → joins → "Online" shown → scores update on scoreboard
- **VPN discovery**: server bound to VPN interface (10.x.x.x) instead of LAN (192.168.x.x); `IpAddressHelper` now prefers `192.168.x.x` over `10.x.x.x`
- **Threading fix**: `TTask.Run` + `TThread.Synchronize(nil, ...)` silently fails on Android; replaced with `TThread.CreateAnonymousThread` + `TThread.Synchronize(TThread.CurrentThread, ...)`

---

## Architecture Overview

```
┌──────────────────────────────────┐
│  Browser (host / spectators)     │
│  lobby.html  /  scoreboard.html  │◄──── SignalR ────┐
└──────────────────────────────────┘                  │
                                                      │
┌──────────────────────────────────┐     ┌────────────┴──────────────────┐
│  Delphi Android App              │     │  ASP.NET Core 8 Server        │
│  (one per player)                │     │                               │
│                                  │     │  SessionStore                 │
│  IScoreManager                   │     │  (ConcurrentDictionary)       │
│   └─ TServerAwareScoreManager    │─REST─►                              │
│       └─ TScoreManager           │     │  HeartbeatMonitor             │
│                                  │     │  (BackgroundService)          │
│  IServerClient                   │     │                               │
│   └─ TServerClient               │     │  GameHub (SignalR)            │
│       TTimer (heartbeat 15 s)    │     │                               │
└──────────────────────────────────┘     └───────────────────────────────┘
```

Delphi app → REST only. Browser → SignalR only. Server bridges both worlds.

---

## Key Design Decisions

### Interface + Decorator pattern
`IScoreManager` / `TScoreManager` introduced in Phase 1 made the multiplayer extension zero-impact on existing handlers. `TServerAwareScoreManager` wraps the inner manager and pushes scores transparently.

### Offline-first
`TServerClient` tracks a failure counter; after 3 consecutive failures `IsConnected` returns false and `TServerAwareScoreManager.SyncScore` skips the push. The app degrades gracefully without user intervention.

### In-memory session store
No database. `ConcurrentDictionary` is sufficient for a LAN game with a handful of players and a 2-hour session lifetime. Simplicity over persistence.

### SignalR for browser, REST for app
Browser needs real-time push → SignalR. App only sends, never receives → plain HTTP POST on score change is simpler and avoids a WebSocket dependency in Delphi.

### Unambiguous session codes
`ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — no `0`/`O` or `1`/`I`. A 6-character code gives ~1.07 billion combinations; collision probability at 100 concurrent sessions is negligible.

---

## Notable Bugs Found and Fixed

| Bug | Symptom | Fix |
|---|---|---|
| `ParseJoinUrl` outside `try/except` | Silent failure on bad URL — TTask swallows exception | Moved inside try block |
| `TTask.Run` + `Synchronize(nil,...)` | UI callback never fires on Android | Replaced with `TThread.CreateAnonymousThread` + `Synchronize(CurrentThread,...)` |
| Camera deactivation in `OnClose` | ZXing camera hangs, app freezes | Removed `Active := False` from `DoFormClose` |
| Missing `ScannerFrm.fmx` stub | `EResNotFound` at runtime | Created minimal FMX stub |
| VPN interface selected as LAN IP | QR encodes unreachable 10.x.x.x address | `IpAddressHelper` now prefers `192.168.x.x` |
| `End Spel` button did nothing | Relied on SignalR `GameEnded` event which could be dropped | Call `showGameEnded()` directly on successful DELETE response |

---

## Project Stats

<div class="columns">
<div>

**New files created**
- 2 Delphi units (`ServerClient.pas`, `ScannerFrm.pas`)
- 1 FMX stub (`ScannerFrm.fmx`)
- 1 Android config (`network_security_config.xml`)
- 9 C# source files
- 5 web files (HTML, JS, CSS)
- 1 Postman collection

</div>
<div>

**Modified files**
- `MainFrm.pas` / `MainFrm.fmx`
- `AndroidManifest.template.xml`
- `README.md`
- `CLAUDE.md`

**Tests**
- 20 DUnitX unit tests — all passing

</div>
</div>

---

# Project Complete

**De Slimste Mens Timer** — a two-component system built with Claude Code:

- Delphi / FireMonkey Android app (Phases 1 + 2)
- ASP.NET Core 8 web server with real-time SignalR scoreboard

> *Each step proposed, reviewed, and approved by the developer before execution.*

---
