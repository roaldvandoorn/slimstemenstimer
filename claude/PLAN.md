# De Slimste Mens Timer — Multiplayer Extension Plan

## Purpose
Step-by-step plan for adding a server-side session manager and real-time scoreboard to the existing SlimsteMensTimer Android app. Each step is small and individually executable. Claude stops after each step to check in with the developer.

For full architecture details, technology decisions, and component design, see the approved design plan.

---

## Preliminary

### P0 — Update CLAUDE.md ✅
Update project guidance to reflect dual-component architecture (Android app + ASP.NET Core server).

### P1 — Project documentation ✅
Create `claude/PLAN.md` and `claude/PROGRESS.md`.

---

## Phase 1 — Server

### S1 — Project scaffolding
- Create ASP.NET Core 8 Web API project in VS 2022
- Solution: `SlimsteMensTimerServer/SlimsteMensTimerServer.sln`
- Add NuGet packages: `QRCoder`
- Configure `Program.cs`: SignalR, CORS (allow all origins), static files
- Configure `appsettings.json`: Port 5000, StaleSeconds 30
- Confirm project builds and runs

✅ Check in before S2.

---

### S2 — Models + SessionStore
- Implement `SessionState` enum: `Lobby`, `Active`, `Ended`
- Implement `Player` model: `Id`, `Name`, `Score`, `LastSeen`, `IsStale`
- Implement `Session` model: `Id`, `State`, `Players` (`ConcurrentDictionary`), `CreatedAt`, `LastActivity`
- Implement `SessionStore` (singleton): thread-safe create/read/update/delete via `ConcurrentDictionary<string, Session>`
- Implement `IpAddressHelper`: resolves LAN IP for building `joinUrl`
- Register services in DI

✅ Check in before S3.

---

### S3 — REST API
- Implement `SessionsController`: `POST /api/sessions`, `GET /api/sessions/{id}`, `POST /api/sessions/{id}/start`, `DELETE /api/sessions/{id}`
- Implement `PlayersController`: `POST /api/sessions/{id}/players`, `GET /api/sessions/{id}/players`, `PUT /api/sessions/{id}/players/{pid}/score`, `POST /api/sessions/{id}/players/{pid}/heartbeat`
- Wire `IHubContext<GameHub>` into controllers to broadcast SignalR events on state changes
- Return correct HTTP status codes (201, 200, 204, 404, 409, 422)

✅ Check in before S4.

---

### S4 — SignalR hub
- Implement `GameHub` with `JoinSessionGroup(sessionId)` method
- Register hub in `Program.cs` at `/gamehub`
- Confirm hub connects from browser console

✅ Check in before S5.

---

### S5 — Postman collection
- Create `postman/SlimsteMensTimerServer.postman_collection.json` (Postman Collection v2.1)
- Collection variable: `baseUrl` = `http://localhost:5000`
- Auto-capture variables via test scripts: `sessionId` (from Create Session response), `playerId` (from Register Player response)
- Folders and requests:
  - **Sessions**: Create Session, Get Session, Start Session, Delete Session
  - **Players**: Register Player, Get Players, Update Score, Heartbeat
  - **QR Code**: Get QR Code (saves response as PNG)
- Each request pre-populated with correct URL, method, headers (`Content-Type: application/json`), and example body where applicable

✅ Check in before S6.

---

### S6 — Heartbeat monitor
- Implement `HeartbeatMonitor` as `BackgroundService`
- Every 5 seconds: check all players in Active sessions against `StaleSeconds` threshold
- On stale detection: set `IsStale = true`, broadcast `PlayerWentStale` via SignalR
- On recovery (score push / heartbeat from stale player): set `IsStale = false`, broadcast `PlayerReturned`
- Register in DI as hosted service

✅ Check in before S7.

---

### S7 — Web UI
- Write `wwwroot/lobby.html` + `lobby.js`:
  - Landing: "Nieuwe Sessie" button → `POST /api/sessions` → navigate to `/lobby/{sessionId}`
  - Lobby view: QR code (`<img src="/api/sessions/{id}/qr">`), 6-char session code in large text, player list, "Start Spel" button
  - SignalR: `JoinSessionGroup`, listen for `PlayerJoined`, `GameStarted`
- Write `wwwroot/scoreboard.html` + `scoreboard.js`:
  - On load: `GET /api/sessions/{id}/players` to hydrate tiles
  - SignalR: listen for `ScoreUpdated`, `PlayerJoined`, `PlayerWentStale`, `PlayerReturned`, `GameEnded`
  - Player tiles: name + score, grey when stale
- Write `wwwroot/css/style.css`: dark red `#B71C1C` background, orange `#FFA726` accents, white text — matching app palette
- Add `/join/{sessionId}` route (controller or minimal API) that redirects to lobby or scoreboard depending on session state
- Include `signalr.min.js` (local copy from CDN or npm)

✅ Check in before S8.

---

### S8 — Server integration test (manual)
- Run server; confirm it resolves and displays LAN IP in startup log
- Browser: create session, verify QR code is displayed and encodes correct join URL
- Use Postman collection (from S5): run requests in order — create session, register two players, push score updates; confirm scoreboard tiles update in real time
- Let 30 s pass without heartbeat; confirm tile goes grey
- Resume heartbeat via Postman; confirm tile returns to normal

✅ Check in before D1.

---

## Phase 2 — Delphi client

### D1 — ServerClient.pas
- Implement `IServerClient` interface
- Implement `TServerClient`:
  - `TNetHTTPClient` (built-in FMX)
  - All HTTP via `TTask.Run` (non-blocking)
  - `JoinSession`: `POST /api/sessions/{id}/players`, store `FPlayerId`, `FBaseUrl`, `FSessionId`
  - `PushScore`: `PUT .../score` body `{ "score": n }`
  - `LeaveSession`: stops heartbeat, clears state
  - Heartbeat `TTimer` (15 s): `POST .../heartbeat`
  - Failure counter: 3 failures → `FConnected := False`; recovery on next success
- Implement `TServerAwareScoreManager` (decorator over `IScoreManager`):
  - Delegates all methods to `FInner`
  - After each mutation calls `FClient.PushScore(FInner.Score)` when `FClient.IsConnected`
- Add unit to Delphi project

✅ Check in before D2.

---

### D2 — MainFrm.fmx layout changes
- Extend `pnlMenu` height: 150 → 250
- Add `mnuJoinGame: TText` at Y=100 — "Aanmelden bij spel"
- Add `mnuLeaveGame: TText` at Y=150 — "Afmelden" (initially `Visible=False`)
- Add `lblStatus: TLabel` top-right (~Position.X=300, Y=15), small font, white

✅ Check in before D3.

---

### D3 — MainFrm.pas logic
- Add `FServerClient: IServerClient` field; initialise in `FormCreate`
- Add `tmrStatusPoll: TTimer` (5 s): updates `lblStatus` text from `FServerClient.IsConnected` on main thread
- Implement `mnuJoinGameClick`:
  1. Offer "Scannen" / "Code invoeren" choice
  2. Manual path: `TDialogService.InputQuery` for join URL
  3. `TDialogService.InputQuery` for player name
  4. Call `FServerClient.JoinSession` on background thread
  5. On success: swap `FScoreManager` → `TServerAwareScoreManager.Create(TScoreManager.Create, FServerClient)`; show `mnuLeaveGame`, hide `mnuJoinGame`
  6. On failure: show error message; `FScoreManager` stays as plain `TScoreManager`
- Implement `mnuLeaveGameClick`:
  - `FServerClient.LeaveSession`
  - Swap `FScoreManager` back to plain `TScoreManager`
  - Show `mnuJoinGame`, hide `mnuLeaveGame`
  - Clear `lblStatus`

✅ Check in before D4.

---

### D4 — ZXing.Delphi QR scanning
- Add ZXing.Delphi library to Delphi library search path
- Add `CAMERA` permission to `AndroidManifest.template.xml`
- Implement scan callback in `mnuJoinGameClick` "Scannen" path:
  - Launch ZXing scanner
  - On result: extract base URL + session ID from scanned string (parse path `/join/{sessionId}`)
  - Proceed to player name dialog
- Manual entry fallback: prompts for full join URL (e.g. `http://192.168.1.5:5000/join/XK7P3Q`)

**Implementation notes (from D4 execution):**
- Do NOT deactivate `TCameraComponent` inside `DoFormClose` — this hangs the ZXing camera component; `caFree` alone is sufficient
- A minimal `ScannerFrm.fmx` stub IS required alongside the `.pas` file — `{$R *.fmx}` causes `EResNotFound` at runtime without it
- Use a named `reference to procedure` type (`TOnResultProc`) for the scan callback instead of `TProc<string>` — avoids compiler overload resolution errors
- Android 9+ blocks plain HTTP by default — add `res/network_security_config.xml` with `cleartextTrafficPermitted="true"` and reference it via `android:networkSecurityConfig` in the `<application>` element of the manifest
- Add `INTERNET` and `ACCESS_NETWORK_STATE` permissions via Delphi project options (not hardcoded in manifest) so the app can reach the LAN server
- Move the hamburger button down slightly (Y=25) to clear the Android status bar

✅ Check in before D5.

---

### D5 — End-to-end integration test
- Android device and server machine on same Wi-Fi
- Full flow: browser creates session → player scans QR → enters name → "Online" shown → scores update on scoreboard
- Offline test: disable Wi-Fi on device → app continues working → `lblStatus` shows "Offline"
- Recovery: re-enable Wi-Fi → `lblStatus` returns to "Online" on next push

✅ Check in before F1.

---

## Phase 3 — Final

### F1 — App download QR on landing page
- On the landing page (before any session is created), show a QR code that encodes the static Google Play internal test link: `https://play.google.com/apps/internaltest/4701444685052336832`
- QR is generated server-side via a new endpoint `GET /api/appqr` (reuses `QrController` logic, no session required) or as a static pre-generated PNG in `wwwroot/`
- Displayed below the "Nieuwe Sessie" button with a small label ("Download de app")
- Not visible on the lobby page (session already in progress) or scoreboard

✅ Check in before F2.

---

### F2 — End Spel + Nieuw Spel flow on scoreboard
- Add an "End Spel" button to `scoreboard.html` (host-side, bottom of page)
  - Calls `DELETE /api/sessions/{id}` → broadcasts `GameEnded` to all clients
  - On success: button replaced with "Nieuw Spel" button
- "Nieuw Spel" navigates back to `/lobby.html` (fresh landing, no session)
- `GameEnded` event (received via SignalR by other browser tabs) already shows the banner; update the banner to also include a "Nieuw Spel" link
- No auth required — host is whoever has the scoreboard URL open

✅ Check in before F3.

---

### F3 — Update README.md
- Add server setup and run instructions
- Add network requirements (same LAN)
- Add build instructions for both components

### F4 — Final review and documentation
- Review all new code for cleanup
- Update `PROGRESS.md` with final status
- Confirm all tests still pass

✅ Check in before F5.

---

### F5 — Project presentation
Create a slide-deck style Markdown presentation (`claude/presentation.md`) covering the full project history across both phases.

**Structure:**

1. **Introduction** — what the project is; original user prompt (from `claude/archive/inital instructions.txt`)
2. **Phase 1 — Android app (Steps 1–9)**
   - Step 1: Delphi project scaffolding — new FMX Android project, portrait lock
   - Step 2: UI layout — dark red background, score label, three round orange buttons
   - Step 3: Timer logic — countdown, Start/Stop, ±20 buttons
   - Step 4: Style refinement — font sizes, color tuning, visual polish
   - Step 5: Hamburger menu — Reset score, Score instellen (0–1000 dialog), Afsluiten
   - Step 6: ScoreManager class — `IScoreManager` interface, `TScoreManager`, decorator-ready design, `EArgumentOutOfRangeException` contract
   - Step 7: DUnitX unit tests — 20 tests covering all `TScoreManager` methods, edge cases, exception assertions
   - Step 8: Android build & device testing — deployed and verified on device
   - Step 9: Final review & README
3. **Phase 2 — Multiplayer extension (S1–S8, D1–D5)**
   - S1: ASP.NET Core 8 server scaffolding — SignalR, CORS, Swagger, static files
   - S2: Models + SessionStore — `Session`, `Player`, `SessionState`, thread-safe in-memory store
   - S3: REST API — sessions, players, score push, heartbeat, QR code endpoint
   - S4: SignalR hub — `GameHub`, session groups, real-time events
   - S5: Postman collection — 10 requests across 3 folders, auto-capture test scripts
   - S6: HeartbeatMonitor — `BackgroundService`, stale detection, session idle timeout
   - S7: Web UI — `lobby.html`, `scoreboard.html`, `lobby.js`, `scoreboard.js`, `style.css`, local SignalR client
   - D1–D5: Delphi client — `IServerClient`, `TServerClient`, `TServerAwareScoreManager` decorator, join/leave flow, QR scanning (planned)
4. **Architecture overview** — component diagram (ASCII), key technology choices and rationale
5. **Key design decisions** — interface + decorator pattern; offline-first app; in-memory store; SignalR for browser only (REST for app); session code readability (unambiguous charset)
6. **Prompts used** — the original prompt from `claude/archive/inital instructions.txt` verbatim; the multiplayer extension request reconstructed from `claude/archive/PROJECT.md` and `PLAN.md` context (no Claude Code memory entries were saved for this project)

**Output:** `claude/presentation.md` — each slide as a `---`-delimited Markdown section, suitable for rendering in a Markdown slideshow tool (e.g. Marp, Slidev, or VS Code Markdown Preview)

✅ Project complete.
