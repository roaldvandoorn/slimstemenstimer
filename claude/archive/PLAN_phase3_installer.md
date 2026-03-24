# De Slimste Mens Timer — Plan Phase 3 (Archived)

**Archived:** 2026-03-24

## Phase 3 — Installer for the server

**Goal:** Make the server distributable to non-developers in three steps:
1. Prove the build is reproducible (CI)
2. Publish a ready-to-run zip on every versioned release
3. Wrap that zip in a one-click Windows installer

**Items covered:** #12 (GitHub Actions CI), #13 (GitHub Releases + artefact upload), #11 (Windows installer — Inno Setup)

---

## Steps

### Step 1 — #12: GitHub Actions CI pipeline

**File created:** `.github/workflows/ci.yml`

**Triggers:**
- Push to `main`
- Any pull request targeting `main`

**Jobs:**
1. `build-and-test`
   - Runner: `ubuntu-latest`
   - Setup: `actions/setup-dotnet@v4` with .NET 8
   - Restore / Build / Test the server solution

---

### Step 2 — #13: GitHub Releases with automated artefact upload

**Extends:** `.github/workflows/ci.yml` (second job: `release`)

**Trigger:** Push of a tag matching `v*.*.*`

**Steps:**
1. `dotnet publish` — self-contained win-x64 single-file
2. `Compress-Archive` — portable zip
3. `softprops/action-gh-release@v2` — create GitHub Release + attach zip

**Runner:** `windows-latest`

---

### Step 3 — #11: Windows installer (Inno Setup)

**Files created:** `installer/SlimsteMensTimerServer.iss`, `installer/lobby.url`

**Installer behaviour:**
- Installs to `{autopf}\SlimsteMensTimerServer\`
- Registers `SlimsteMensTimerSvc` Windows Service (auto-start)
- Opens firewall port 5000 inbound (TCP)
- Start Menu: Open Lobby · Start Server · Stop Server · Uninstall
- Start/Stop shortcuts use lnk byte-21 RunAsAdmin flag for UAC elevation
- Uninstaller stops/deletes service, removes firewall rule

**Server change:** Added `builder.Host.UseWindowsService()` + `Microsoft.Extensions.Hosting.WindowsServices` package so the app signals the SCM correctly and sets content root to exe directory.

**CI integration:** Inno Setup installed via Chocolatey; ISCC called with `/DMyAppVersion` + `/O"installer"`; Setup.exe attached to GitHub Release.

---

## Bugs encountered and fixed

| Bug | Root cause | Fix |
|-----|-----------|-----|
| Installer not attached to release | Script's `#define MyAppVersion` overwrote `/D` command-line define | Changed to `#ifndef MyAppVersion` |
| No Start Menu entry | `lobby.url` created in `ssPostInstall` (after `[Icons]` ran) | Committed `lobby.url` as a static file; added to `[Files]` |
| Error 1053 on service start | Missing `UseWindowsService()` — app never signalled SCM | Added `UseWindowsService()` + NuGet package |

---

## Resulting release artefacts per tag

| File | Contents |
|------|----------|
| `SlimsteMensTimerServer-v*.*.* -win-x64.zip` | Portable zip (no installer needed) |
| `SlimsteMensTimerServer-v*.*.*-Setup.exe` | One-click Windows installer with service registration |
