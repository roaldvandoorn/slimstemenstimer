# De Slimste Mens Timer — Suggested Improvements

_Updated: 2026-03-24_

## Background

The MVP is complete: Android app (Delphi/FMX) + ASP.NET Core 8 multiplayer server, QR-code join flow, barcode scanner for card lookup, SignalR real-time sync, DUnitX test suite, Marp/PPTX presentation, Google Play internal test track.

---

## Section A — Feature Improvements (original list)

### 1. 🎯 Puzzle-card database & lookup
Add a local SQLite database of "De Slimste Mens" puzzle cards (categories, questions, answers). The barcode scanner already identifies cards; this would display the card's content directly in the app so the host doesn't need the physical booklet.

**Effort:** Medium | **Value:** High

---

### 2. 📊 Game statistics & history
Record completed games locally (scores per round, fastest answers, winner). Show a stats screen with personal bests, win streaks, and per-player history. Useful for recurring game nights.

**Effort:** Medium | **Value:** High

---

### 3. 🔔 Sound effects & audio feedback
Play distinct sounds for: timer start, timer end (buzzer), correct answer, wrong answer, and game over. Delphi FMX supports `TMediaPlayer`; sounds can be bundled as assets. Makes the game feel much more like the TV show.

**Effort:** Low–Medium | **Value:** High

---

### 4. 🌐 LAN server discovery (mDNS / UDP broadcast)
Instead of typing or scanning a QR code for the server IP, clients auto-discover the server on the local network via UDP broadcast or mDNS. Removes the setup friction entirely for new players.

**Effort:** Medium | **Value:** Medium

---

### 5. 🎨 Theme / dark-mode support
Add a proper "De Slimste Mens" branded visual theme (dark background, golden accents matching the TV show aesthetic) plus a light mode toggle. FMX styles make this feasible without rewriting layout.

**Effort:** Low–Medium | **Value:** Medium

---

### 6. 👥 Spectator mode
Allow a browser or second device to join as a spectator — sees the timer and scores in real time but has no buzzer. Useful for showing the game state on a TV/tablet visible to all players without giving extra buzzer access.

**Effort:** Medium | **Value:** Medium

---

### 7. ⏱️ Configurable timer presets
Let the host configure standard time presets per puzzle type (e.g. 60 s for "Puzzel", 30 s for "Drie", 20 s for "Foto") and save them as named profiles. Currently the timer duration may be fixed or manually set each round.

**Effort:** Low | **Value:** Medium

---

### 8. 🔄 Rejoin / reconnect handling
If a player's phone drops off Wi-Fi mid-game, give them a "Rejoin" button that re-authenticates them to the existing game session (preserving their score and seat). Currently a disconnect likely means starting over.

**Effort:** Medium–High | **Value:** Medium

---

### 9. 📱 Tablet / large-screen layout
Optimise the UI for tablets or a dedicated "host view" with a larger timer display, all player scores visible simultaneously, and quick-access controls — ideal when the host runs the app on a tablet propped on the table.

**Effort:** Low–Medium | **Value:** Low–Medium

---

### 10. ☁️ Cloud game sharing (export/import)
After a game, export the result summary (scores, timeline, winner) as a shareable link or JSON file that can be imported to compare with friends or posted to a group chat. Could also support backing up game history to the cloud.

**Effort:** Medium–High | **Value:** Low–Medium

---

## Section B — Distribution, DevOps & Ease-of-Use Improvements

### 11. 📦 Windows installer for the server (Inno Setup)
Package the ASP.NET Core server as a Windows installer (`SlimsteMensTimerServer-Setup.exe`) using Inno Setup. The installer registers it as a Windows Service (auto-start on boot), opens firewall port 5000, and adds an uninstaller. A non-developer can set up the host PC in two clicks.

**Effort:** Low–Medium | **Value:** Very High

---

### 12. 🚀 GitHub Actions CI — build & test on every push
Add a `.github/workflows/ci.yml` pipeline that builds the ASP.NET Core server, runs the server-side tests, and reports pass/fail on every push and pull request. Keeps the `main` branch always green and gives confidence before releasing.

**Effort:** Low | **Value:** High

---

### 13. 🏷️ GitHub Releases with automated artefact upload
Extend the CI pipeline: when a Git tag like `v1.2.0` is pushed, automatically build the server in Release mode, zip the output, and attach it to a GitHub Release. Non-developers can download the latest server from the Releases page without needing Visual Studio.

**Effort:** Low–Medium | **Value:** Very High

---

### 14. 🤖 GitHub Actions CD — auto-deploy server to a VPS / home server
Add a deploy step that SSH's into a designated host (e.g. a Raspberry Pi or cheap VPS) and restarts the server service when a release tag is pushed. Eliminates manual copy/paste deployments entirely.

**Effort:** Medium | **Value:** High

---

### 15. 📲 GitHub Actions — automated Google Play deployment
Use the `r0adkll/upload-google-play` GitHub Action to push a signed `.aab` to the Google Play internal test track automatically when a release tag is created. Requires storing the signing keystore and Play API JSON key as GitHub Secrets.

**Effort:** Medium | **Value:** Very High

---

### 16. 🐳 Docker image for the server
Publish a `Dockerfile` and optionally push to GitHub Container Registry (`ghcr.io`). Anyone with Docker Desktop can run the server with a single command — zero .NET installation required. Ideal for Linux home servers or NAS devices (Synology, QNAP).

**Effort:** Low–Medium | **Value:** High

---

### 17. 📋 One-page setup guide (PDF / README)
Write a non-technical `SETUP.md` / `SETUP.pdf` explaining: (1) download & run the server installer, (2) install the Android app from Play Store, (3) scan the QR code to join. Include screenshots. This is the document you hand to a friend hosting a game night.

**Effort:** Low | **Value:** High

---

### 18. 🔢 In-app version display & update notification
Show the current app version in the About/Settings screen and query the GitHub Releases API to notify the user if a newer version is available. The server can also warn if the connected client app version is mismatched.

**Effort:** Low–Medium | **Value:** Medium

---

### 19. ⚙️ Server config via `appsettings.json` with documentation
Replace any hardcoded settings (port, max players, game timeout) with clearly documented entries in `appsettings.json`. Bonus: a small admin web page on the server lets a non-developer change the port or player limit without editing JSON manually.

**Effort:** Low–Medium | **Value:** Medium

---

### 20. 🩺 Server health-check endpoint & status page
Add a `/health` endpoint (ASP.NET Core `AddHealthChecks`) and a simple HTML status page at `/status` showing uptime, connected players, and current game state. Makes it easy for the host to verify the server is running before game night — no command line needed.

**Effort:** Low | **Value:** Medium

---

## Priority matrix (all items)

| # | Improvement | Category | Effort | Value |
|---|-------------|----------|--------|-------|
| 11 | Windows installer for server | Distribution | Low–Med | Very High |
| 13 | GitHub Releases + artefact upload | DevOps | Low–Med | Very High |
| 15 | Auto-deploy to Google Play | DevOps | Medium | Very High |
| 17 | One-page setup guide | Documentation | Low | High |
| 12 | GitHub Actions CI | DevOps | Low | High |
| 16 | Docker image for server | Distribution | Low–Med | High |
| 14 | CD — auto-deploy to VPS/home server | DevOps | Medium | High |
| 20 | Health-check endpoint & status page | Ease of use | Low | Medium |
| 18 | In-app version display & update check | Ease of use | Low–Med | Medium |
| 19 | Server config via appsettings UI | Ease of use | Low–Med | Medium |
| 3  | Sound effects & audio feedback | Feature | Low–Med | High |
| 7  | Configurable timer presets | Feature | Low | Medium |
| 1  | Puzzle-card database & lookup | Feature | Medium | High |
| 2  | Game statistics & history | Feature | Medium | High |
| 5  | Theme / dark-mode support | Feature | Low–Med | Medium |
| 4  | LAN server discovery | Feature | Medium | Medium |
| 6  | Spectator mode | Feature | Medium | Medium |
| 9  | Tablet / large-screen layout | Feature | Low–Med | Low–Med |
| 8  | Rejoin / reconnect handling | Feature | Med–High | Medium |
| 10 | Cloud game sharing | Feature | Med–High | Low–Med |

---

## Suggested implementation order

The recommended sequence builds each step on the previous one, avoids rework, and delivers value to non-developers as early as possible.

### Phase 1 — CI/CD foundation (do these first, in order)

| Step | Item | Rationale |
|------|------|-----------|
| 1 | **#12 GitHub Actions CI** | Foundation for everything else; validate the build is reproducible before automating releases. |
| 2 | **#13 GitHub Releases + artefact upload** | Depends on CI. Once the pipeline exists, adding a release job on tag push is a small delta. |
| 3 | **#15 Automated Google Play deployment** | Depends on #13 (shared tag-based trigger). Closes the Android distribution loop. |

### Phase 2 — Server distribution (non-developers can self-host)

| Step | Item | Rationale |
|------|------|-----------|
| 4 | **#11 Windows installer (Inno Setup)** | Makes the GitHub Release artefact from #13 truly one-click for Windows hosts. |
| 5 | **#16 Docker image** | Alternative self-hosting path for Linux/NAS users; reuses the Release build from #13. |
| 6 | **#14 CD — auto-deploy to VPS** | Optional if you run a permanent server; depends on #13 release artefact. |

### Phase 3 — Discoverability & polish

| Step | Item | Rationale |
|------|------|-----------|
| 7 | **#20 Health-check & status page** | Low effort; makes the running server self-explanatory before writing docs. |
| 8 | **#19 Server config / appsettings** | Clean up any hardcoded values before documenting them. |
| 9 | **#17 One-page setup guide** | Write this *after* the installer and Docker image exist so the guide reflects the real UX. |
| 10 | **#18 In-app version & update check** | Ties together the GitHub Releases API from #13 with a user-visible notification. |

### Phase 4 — Feature improvements (game-night quality)

| Step | Item | Rationale |
|------|------|-----------|
| 11 | **#7 Configurable timer presets** | Lowest effort feature; immediately useful for every game night. |
| 12 | **#3 Sound effects** | High perceived value, low effort once assets are sourced. |
| 13 | **#5 Theme / dark-mode** | Visual polish; good to do before wider distribution. |
| 14 | **#2 Game statistics & history** | Adds long-term engagement value. |
| 15 | **#1 Puzzle-card database** | Most ambitious feature; best tackled once distribution is solid. |
| 16 | **#4 LAN server discovery** | Complements the installer; reduces setup friction further. |
| 17 | **#6 Spectator mode** | Needs server changes; plan alongside a server release. |
| 18 | **#9 Tablet layout** | UI-only change; good filler item between larger efforts. |
| 19 | **#8 Rejoin / reconnect** | Complex; tackle after the codebase has stabilised. |
| 20 | **#10 Cloud game sharing** | Longest tail; revisit when there is an established user base. |
