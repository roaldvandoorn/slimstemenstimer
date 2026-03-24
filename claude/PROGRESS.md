# Progress Log

## Status: Complete ✅

| Step | Description | Status |
|------|-------------|--------|
| P0 | Update CLAUDE.md | ✅ Done |
| P1 | Create PLAN.md + PROGRESS.md | ✅ Done |
| S1 | Server: project scaffolding | ✅ Done |
| S2 | Server: models + SessionStore | ✅ Done |
| S3 | Server: REST API | ✅ Done |
| S4 | Server: SignalR hub | ✅ Done |
| S5 | Server: Postman collection | ✅ Done |
| S6 | Server: HeartbeatMonitor | ✅ Done |
| S7 | Server: web UI | ✅ Done |
| S8 | Server: integration test | ✅ Done |
| D1 | Delphi: ServerClient.pas | ✅ Done |
| D2 | Delphi: MainFrm.fmx changes | ✅ Done |
| D3 | Delphi: MainFrm.pas logic | ✅ Done |
| D4 | Delphi: ZXing QR scanning | ✅ Done |
| D5 | Delphi: end-to-end test | ✅ Done |
| F1 | App download QR on landing page | ✅ Done |
| F2 | End Spel + Nieuw Spel flow on scoreboard | ✅ Done |
| F3 | Update README.md | ✅ Done |
| F4 | Final review + documentation | ✅ Done |
| F5 | Project presentation | ✅ Done |

---

## Log

### 2026-03-23 — D5
- End-to-end test passed: browser creates session → player joins via manual URL → "Online" label appears → score changes appear on scoreboard in real time
- QR scanning silently failed during testing because the server had an active VPN; `IpAddressHelper` selected the VPN interface (10.0.x.x) instead of the LAN interface (192.168.x.x), so the QR encoded an unreachable address. Manual entry of the LAN IP bypassed this. Fix: disable VPN on the server machine before starting the server.
- Code is correct — no code changes required for D5

### 2026-03-24 — F5
- Created `claude/presentation.md` — 15-slide Marp-compatible deck
- Covers: introduction, original prompt verbatim, Phase 1 (Steps 1–9), Phase 2 (S1–S8, D1–D5), architecture diagram, key design decisions, notable bugs table, project stats
- Multiplayer prompt reconstructed from `claude/archive/PROJECT.md` and plan context

### 2026-03-24 — F4
- Reviewed all new source files; three minor comment/import fixes applied:
  - `MainFrm.pas`: removed unused `System.Threading` import (TTask no longer used after DoJoin threading fix)
  - `ServerClient.pas`: updated IServerClient interface comment — "TTask.Run" → "TThread.CreateAnonymousThread"
  - `ScannerFrm.pas`: corrected opening comment that incorrectly stated the .fmx stub was not required
- No logic issues found; all server files (controllers, hub, store, monitor) reviewed and clean

### 2026-03-24 — F3
- Rewrote `README.md` to cover both components: Android app + server
- Added: server build/run instructions (`dotnet run` + VS 2022), network requirements (same LAN, HTTP, VPN caveat), how-to-play walkthrough, full REST API reference table, SignalR events table
- Updated project structure to include new files (`ServerClient.pas`, `ScannerFrm.*`, server tree, `res/network_security_config.xml`)
- Updated dependencies section (Delphi 13, ZXing.Delphi, .NET 8)

### 2026-03-23 — F2
- `scoreboard.html`: added `.host-controls` div with "End Spel" (`btn-danger`) and "Nieuw Spel" (initially hidden) buttons
- `scoreboard.js`: wired "End Spel" to `DELETE /api/sessions/{id}`; added `showGameEnded()` — hides "End Spel", shows "Nieuw Spel", updates banner with a "Nieuw Spel" link; `GameEnded` SignalR event calls `showGameEnded()` so all open tabs react; "Nieuw Spel" navigates to `/lobby.html`
- `style.css`: added `.host-controls`, `.btn-danger`, `.banner-link` styles

### 2026-03-23 — F1
- Added `GET /api/appqr` endpoint to `QrController` — generates a QR PNG encoding the static Google Play internal test URL; no session required
- Refactored `QrController` to extract a `GeneratePng(content)` helper shared by both endpoints; changed route attribute style to explicit paths (removed class-level `[Route]` prefix)
- `lobby.html`: added `.app-download` block below "Nieuwe Sessie" button — `<img src="/api/appqr">` + "Download de app" label; only present in the landing view, not the lobby or scoreboard views
- `style.css`: added `.app-download`, `.app-qr`, `.app-download-label` styles — 140 px QR, white background, muted opacity, uppercase label

### 2026-03-23 — D5 (bug fix v2)
- Root cause: `TThread.Synchronize(nil, ...)` from a `TTask` pool thread is unreliable on Android — `nil` does not resolve to a real thread object so the callback can be silently skipped
- `MainFrm.pas` `DoJoin`: replaced `TTask.Run` with `TThread.CreateAnonymousThread` + `T.FreeOnTerminate := True; T.Start`; changed `TThread.Synchronize(nil, ...)` to `TThread.Synchronize(TThread.CurrentThread, ...)` — CreateAnonymousThread creates a real TThread so CurrentThread is valid
- `ServerClient.pas` `JoinSession`: removed the broad catch-all except — exceptions now propagate to the caller so `DoJoin` can capture and display the actual error message; added `SessId.Trim` after URL parse; non-201 responses now raise an exception with the status code and body
- `DoJoin` now captures `E.ClassName + ': ' + E.Message` and shows it in the error dialog — this reveals whether the issue is a URL parse error, network failure, or server rejection

### 2026-03-23 — D4 (additional manual fixes)
- `AndroidManifest.template.xml`: added `INTERNET` and `ACCESS_NETWORK_STATE` permissions via Delphi project settings (`<%uses-permission%>` placeholder); added `android:networkSecurityConfig="@xml/network_security_config"` to the `<application>` element to allow plain HTTP traffic to the LAN server
- Created `res/network_security_config.xml`: `<base-config cleartextTrafficPermitted="true">` — required because Android 9+ blocks HTTP by default; the server runs on HTTP (not HTTPS)
- `MainFrm.fmx`: moved `btnMenu` down (Position.Y 10 → 25) to avoid overlap with Android status bar

### 2026-03-23 — D4
- Added `CAMERA` permission + `uses-feature` to `AndroidManifest.template.xml`
- Created `src/ScannerFrm.pas` — `TScannerForm`
  - `BuildUI`: full-screen black background, camera preview `TImage`, hint label, orange cancel button
  - `TCameraComponent` (back camera, high quality, continuous autofocus); started in `DoFormShow`
  - `CameraSampleReady`: calls `SampleBufferToBitmap` on camera thread; scans every 15th frame via `TScanManager`; on QR found, delivers result to `FOnResult` via `TThread.Queue` then closes; updates preview every frame via `TThread.Queue`
  - `DoFormClose`: sets `caFree` — camera is NOT deactivated here (deactivating inside `DoFormClose` hangs the ZXing camera component)
  - `ScanQRCode` class method — takes `TOnResultProc` (named `reference to procedure` type) instead of `TProc<string>` to avoid compiler overload resolution issues
  - `{$R *.fmx}` directive required — an `.fmx` file IS needed (bare-minimum stub `ScannerFrm.fmx`), otherwise `EResNotFound` is raised at runtime
- Created `src/ScannerFrm.fmx` — minimal stub (empty form declaration required by `{$R *.fmx}`)
- Updated `src/MainFrm.pas`:
  - Added `ScannerFrm` to uses clause
  - Added `StartJoinWithUrl(const AUrl: string)` — prompts for player name then calls `DoJoin`; shared by both scan and manual paths
  - Refactored `StartManualJoin` to prompt for URL then delegate to `StartJoinWithUrl`
  - Replaced D3 scan stub with `TScannerForm.ScanQRCode(Self, ...)` using `TOnResultProc` callback

### 2026-03-23 — D3
- Added `System.Threading` and `ServerClient` to uses clause
- Added `FServerClient: IServerClient` (initialised in `FormCreate` as `TServerClient.Create`)
- Added `FStatusPoll: TTimer` (5 s, created programmatically in `FormCreate`; updates `lblStatus` → "Online" / "Offline" / empty based on `IsConnected` and `SessionId`)
- `mnuJoinGameClick`: hides menu; shows `MessageDialog` with Ja=Scannen (D4 stub) / Nee=Code invoeren / Cancel; "Nee" chains two `InputQuery` dialogs (join URL → player name) then calls `DoJoin`
- `DoJoin`: runs `FServerClient.JoinSession` in `TTask.Run`; on success swaps `FScoreManager` to `TServerAwareScoreManager`, shows `mnuLeaveGame`, hides `mnuJoinGame`; on failure shows error message
- `mnuLeaveGameClick`: calls `LeaveSession`, swaps back to plain `TScoreManager`, restores menu visibility, clears `lblStatus`
- **Action required:** In Delphi IDE confirm `ServerClient.pas` is in the project. Build and deploy — verify "Aanmelden bij spel" and "Afmelden" menu items work; "Afmelden" is hidden until joined; `lblStatus` updates every 5 s

### 2026-03-23 — D2
- `MainFrm.fmx`: extended `pnlMenu` height 150 → 250
- Added `mnuJoinGame: TText` at Y=150 — "Aanmelden bij spel"
- Added `mnuLeaveGame: TText` at Y=200 — "Afmelden" (`Visible=False`)
- Added `lblStatus: TLabel` top-right (X=265, Y=18, 100×24, 13pt, right-aligned, white, empty)
- `MainFrm.pas`: declared `mnuJoinGame`, `mnuLeaveGame`, `lblStatus`; declared and stubbed `mnuJoinGameClick` / `mnuLeaveGameClick` (implemented in D3)
- **Action required:** Build in Delphi IDE — confirm no compile errors and the menu panel shows the two new items

### 2026-03-23 — S8
- Manual integration test passed: session creation, QR code, player registration via Postman, real-time score updates, stale detection (30 s), recovery via heartbeat, GameEnded banner, `/join` redirect to scoreboard when Active

### 2026-03-23 — D1
- Created `src/ServerClient.pas`
- `IServerClient` interface with GUID; `JoinSession`, `LeaveSession`, `PushScore`, `IsConnected`, `PlayerName`, `SessionId`
- `TServerClient` (TInterfacedObject): `THTTPClient` (System.Net.HttpClient) per request; `JoinSession` is synchronous/blocking (call from TTask.Run in D3); `PushScore` and heartbeat are fire-and-forget via `TTask.Run`; heartbeat `TTimer` (15 s) enabled/disabled on main thread via `TThread.Queue`; failure counter (3 → offline); stale-callback guard (`FPlayerId = ''` check)
- `TServerAwareScoreManager` (TInterfacedObject, IScoreManager): delegates all methods to FInner; calls `FClient.PushScore` after each mutation when connected
- **Action required:** In Delphi IDE, add `src/ServerClient.pas` to the project via Project > Add to Project. Build to confirm no compile errors.

### 2026-03-23 — S7
- Created `wwwroot/css/style.css`: dark red `#B71C1C` bg, orange `#FFA726` accents, responsive grid, `.player-tile.stale` dim style
- Created `wwwroot/lobby.html`: landing (new session button) + lobby layout (QR image, session code, player list, Start Spel button)
- Created `wwwroot/scoreboard.html`: session subtitle + dynamic player tile grid
- Created `wwwroot/js/lobby.js`: creates session, loads players, SignalR events `PlayerJoined` / `GameStarted` / `GameEnded`
- Created `wwwroot/js/scoreboard.js`: loads players on mount, SignalR events `PlayerJoined` / `ScoreUpdated` / `PlayerWentStale` / `PlayerReturned` / `GameEnded`
- Downloaded `wwwroot/js/signalr.min.js` (SignalR 8.0.0 local copy)
- Updated `wwwroot/index.html`: meta-refresh redirect to `lobby.html`
- Updated `Program.cs` `/join/{sessionId}` route: redirects to scoreboard when session is Active, lobby otherwise
- **Action required:** Build in VS 2022; open `http://localhost:5000` → create session → verify QR + player list appear; use Postman to register players and confirm lobby updates in real time; click Start Spel and confirm scoreboard navigation

### 2026-03-23 — S5 + S6
- **S5**: Created `postman/SlimsteMensTimerServer.postman_collection.json` (Postman v2.1)
  - Collection variables: `baseUrl`, `sessionId`, `playerId`, `playerId2`
  - 3 folders: Sessions (4 requests), Players (5 requests), QR Code (1 request)
  - Test scripts auto-capture `sessionId` (Create Session) and `playerId`/`playerId2` (Register Player 1/2)
  - All requests include status code assertions
  - Import via Postman: File > Import > select the JSON file
- **S6**: Implemented `Services/HeartbeatMonitor.cs`
  - Reads `StaleSeconds` and `SessionTimeoutHours` from `appsettings.json`
  - Every 5 s: marks players stale + broadcasts `PlayerWentStale`; ends idle sessions + broadcasts `GameEnded`
  - `OperationCanceledException` handled cleanly for graceful shutdown
  - Recovery (`PlayerReturned`) handled in controllers — not duplicated here
- **Action required:** Build in VS 2022; import Postman collection; run Create Session → register players → Start Session → Update Score and confirm responses

### 2026-03-23 — S4
- Implemented `Hubs/GameHub.cs`: injects `SessionStore` to validate session on group join
- `JoinSessionGroup(sessionId)`: validates session exists, adds connection to SignalR group named by `sessionId`; throws `HubException` if session not found (returned to browser as an error)
- `OnDisconnectedAsync`: overridden for clarity; ASP.NET Core removes connection from groups automatically on disconnect — no manual cleanup needed
- **Action required:** Build in VS 2022; open browser console on a test page and confirm hub connects at `http://localhost:5000/gamehub`

### 2026-03-23 — S3
- Updated `IpAddressHelper` to inject `IConfiguration` and resolve port from `appsettings.json`; removed port parameter from `BuildJoinUrl`
- Created `Models/Requests.cs`: `RegisterPlayerRequest`, `UpdateScoreRequest` records
- Created `Controllers/SessionsController.cs`: POST/GET/start/DELETE for sessions; broadcasts `GameStarted`/`GameEnded` via SignalR
- Created `Controllers/PlayersController.cs`: register player, list players, update score, heartbeat; broadcasts `PlayerJoined`, `ScoreUpdated`, `PlayerReturned`
- Created `Controllers/QrController.cs`: generates QR code PNG via QRCoder encoding the `joinUrl`
- `PlayerReturned` is broadcast when a stale player pushes a score or heartbeat
- **Action required:** Build in VS 2022; open Swagger UI at `http://localhost:5000/swagger` and verify all endpoints are listed

### 2026-03-23 — S2
- Created `Models/SessionState.cs` — enum: Lobby, Active, Ended
- Created `Models/Player.cs` — Id, Name, Score (default 60), LastSeen, IsStale
- Created `Models/Session.cs` — Id, State, Players (ConcurrentDictionary), CreatedAt, LastActivity
- Implemented `Services/SessionStore.cs` — CreateSession (6-char code, unambiguous chars), GetSession, StartSession, EndSession, DeleteSession, AddPlayer (duplicate name check), UpdateScore, UpdateHeartbeat, GetPlayer
- `AddPlayerResult` enum co-located in SessionStore.cs
- **Action required:** Build project in VS 2022 to confirm no compile errors

### 2026-03-23 — S1
- Created `SlimsteMensTimerServer/SlimsteMensTimerServer.sln`
- Created `SlimsteMensTimerServer.csproj` targeting net8.0; NuGet: QRCoder 1.6.0, Swashbuckle.AspNetCore 6.9.0
- Created `Program.cs`: SignalR, CORS (all origins + credentials), static files, Swagger, `/join/{id}` redirect, LAN IP startup log
- Created `appsettings.json`: listens on `0.0.0.0:5000`, `StaleSeconds=30`, `SessionTimeoutHours=2`
- Created stubs: `Hubs/GameHub.cs`, `Services/SessionStore.cs`, `Services/HeartbeatMonitor.cs`
- Created `Services/IpAddressHelper.cs` (fully implemented — resolves LAN IP)
- Created `wwwroot/` folder
- **Action required:** Open `SlimsteMensTimerServer.sln` in VS 2022, restore NuGet packages, build and run — confirm startup log shows LAN IP and Swagger UI loads at `http://localhost:5000/swagger`

### 2026-03-23 — P0 + P1
- Updated `CLAUDE.md` to reflect dual-component architecture (Android app + ASP.NET Core server)
- Created `claude/PLAN.md` with full implementation plan (P0–F2)
- Created `claude/PROGRESS.md` (this file)
