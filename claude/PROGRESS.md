# Progress Log

## Status: In Progress

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
| S7 | Server: web UI | ⬜ Not started |
| S8 | Server: integration test | ⬜ Not started |
| D1 | Delphi: ServerClient.pas | ⬜ Not started |
| D2 | Delphi: MainFrm.fmx changes | ⬜ Not started |
| D3 | Delphi: MainFrm.pas logic | ⬜ Not started |
| D4 | Delphi: ZXing QR scanning | ⬜ Not started |
| D5 | Delphi: end-to-end test | ⬜ Not started |
| F1 | Update README.md | ⬜ Not started |
| F2 | Final review + documentation | ⬜ Not started |

---

## Log

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
