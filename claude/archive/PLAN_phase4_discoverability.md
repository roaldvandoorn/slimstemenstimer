# De Slimste Mens Timer — Plan

## Phase 4 — Discoverability & polish

**Items from improvements.md Phase 3:**

| Step | Item | Description |
|------|------|-------------|
| 0 | Branch | Create feature branch `phase4-discoverability` |
| 1 | **#20** Health-check endpoint & status page | `/health` + `/status.html` showing uptime & sessions |
| 2 | **#19** Server config via `appsettings.json` | Document settings, add `MaxPlayersPerSession` |
| 3 | **#17** One-page setup guide | `SETUP.md` for non-technical hosts |
| 4 | **#18** In-app version display & update check | Android app: show version, query GitHub Releases API |
| 5 | Pull request | Open PR from `phase4-discoverability` → `main` |

Each step with code changes ends with **commit + push**.

---

## Step 0 — Create feature branch

```bash
git checkout -b phase4-discoverability
git push -u origin phase4-discoverability
```

---

## Step 1 — #20 Health-check endpoint & status page

### 1a. ASP.NET Core health checks

In `Program.cs`:
- Call `builder.Services.AddHealthChecks()` before `builder.Build()`
- Call `app.MapHealthChecks("/health")` after `app.MapControllers()`

This gives a `/health` endpoint returning `200 Healthy` (plain text) — suitable for
uptime monitors, load balancers, and the Windows Service watchdog.

### 1b. Status API endpoint

Add a new controller `Controllers/StatusController.cs` with `GET /api/status` returning:

```json
{
  "version": "v1.2.3",
  "uptimeSeconds": 3600,
  "activeSessions": 2,
  "totalPlayers": 6
}
```

- **version**: read from `Assembly.GetExecutingAssembly().GetName().Version` (set by csproj `<Version>` tag injected via CI `/p:Version=$(tag)`)
- **uptimeSeconds**: record `_startedAt = DateTime.UtcNow` at startup; return `(DateTime.UtcNow - _startedAt).TotalSeconds`
- **activeSessions**: `SessionStore.GetAllSessions().Count(s => s.State == Active)`
- **totalPlayers**: sum of `session.Players.Count` across active sessions

`StatusController` takes `SessionStore` and `IHostApplicationLifetime` via DI; `_startedAt` is a static field set once on first request, or injected via a singleton `StartupTimeProvider` registered in `Program.cs`.

### 1c. Status HTML page

Create `wwwroot/status.html` — a minimal self-refreshing page (JS `setInterval` every 5 s) that:
- Fetches `/api/status`
- Renders: **Versie**, **Uptime** (formatted as `Xh Ym Zs`), **Actieve sessies**, **Spelers verbonden**
- Shows a green "Online" badge
- Styled consistently with `lobby.html` (same dark-red/orange palette)

Add a link to the status page in the footer of `lobby.html` and `scoreboard.html`.

**Commit message:** `Add /health endpoint and /status.html server status page (#20)`

---

## Step 2 — #19 Server config via `appsettings.json`

### 2a. Add `MaxPlayersPerSession`

Currently there is no cap on players joining a session. Add:

```json
"GameSettings": {
  "StaleSeconds": 30,
  "SessionTimeoutHours": 2,
  "MaxPlayersPerSession": 8
}
```

In `SessionStore.AddPlayer`, read `IConfiguration` (injected via constructor) and reject with a new `AddPlayerResult.SessionFull` value when the player count would exceed the limit. Return `409 Conflict` from `PlayersController`.

### 2b. Document all settings in `appsettings.json`

Add a companion `appsettings.example.json` at the project root (next to `appsettings.json`) containing all supported keys with their defaults and a comment block explaining each:

```json
{
  // The TCP port the server listens on. Change this if port 5000 is already in use.
  "Urls": "http://0.0.0.0:5000",

  "GameSettings": {
    // Seconds without a heartbeat before a player is shown as disconnected on the scoreboard.
    "StaleSeconds": 30,

    // Hours of inactivity before a session is automatically ended.
    "SessionTimeoutHours": 2,

    // Maximum number of players allowed to join a single session.
    "MaxPlayersPerSession": 8
  }
}
```

> Note: `appsettings.json` itself is not a valid JSON comments file — the example file
> serves as documentation only. The real `appsettings.json` keeps clean JSON.

Update `README.md` (server section) and `CLAUDE.md` to reference these settings.

**Commit message:** `Add MaxPlayersPerSession config; document appsettings settings (#19)`

---

## Step 3 — #17 One-page setup guide

Create `SETUP.md` at the repo root. Target audience: a non-technical friend hosting a game night. Language: Dutch (matching the app's UI language).

Sections:
1. **Wat heb je nodig?** — Server-PC (Windows), Android telefoons voor elke speler
2. **Stap 1 — Server installeren** — Download `SlimsteMensTimerServer-vX.X.X-Setup.exe` from the GitHub Releases page, run it, click Next/Install. Service starts automatically.
3. **Stap 2 — App installeren** — Install the app from Google Play (link + QR code placeholder)
4. **Stap 3 — Spel starten** — Open `http://localhost:5000` → Nieuwe Sessie → players scan QR code → Start Spel
5. **Problemen?** — Short troubleshooting: VPN/firewall hint, service stopped hint, status page link
6. **Server stoppen/starten** — Refer to Start Menu shortcuts

**Commit message:** `Add SETUP.md non-technical setup guide (#17)`

---

## Step 4 — #18 Server version display & update notification

The Android app is distributed through the Play Store and auto-updated there — no
in-app update check is needed. This step focuses on the **server side**: making the
running server version visible and notifying the host when a newer server release is
available on GitHub.

### 4a. Version in lobby footer

`lobby.html` (and `scoreboard.html`) already have a footer area. Fetch `/api/status`
on page load (already done for the status page) and display the server version in the
footer, e.g. `Server versie: v1.2.3`.

### 4b. Update notification on status page

In `status.html`, after fetching `/api/status` (which includes `version`), also call
the GitHub Releases API:

```
https://api.github.com/repos/roaldvandoorn/slimstemenstimer/releases/latest
```

- Parse `tag_name` from the response
- Compare with the running version from `/api/status`
- If a newer release exists: show a yellow banner — **"Nieuwe serverversie beschikbaar: v1.3.0 — download op GitHub"** (linking to the releases page)
- If up to date or if the API call fails: no banner shown (fail silently)

This check runs entirely in the browser (client-side JS) so no server code changes are needed beyond what step 1 already exposes.

**Commit message:** `Show server version in lobby footer and update notice on status page (#18)`

---

## Step 5 — Pull request

After the final commit and push:

```bash
gh pr create \
  --title "Phase 4: discoverability & polish (#17 #18 #19 #20)" \
  --base main \
  --head phase4-discoverability
```

PR body summarises the four improvements implemented.

---

## Completed phases

| Phase | Description | Archive file |
|-------|-------------|--------------|
| Phase 1 | Android app (Delphi/FMX) | `archive/PLAN_phase1_android_app.md` |
| Phase 2 | Multiplayer extension (ASP.NET Core server + Delphi client) | `archive/PLAN_phase2_multiplayer.md` |
| Phase 3 | CI pipeline, GitHub Releases, Windows installer (Inno Setup) | `archive/PLAN_phase3_installer.md` |
