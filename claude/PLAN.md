# De Slimste Mens Timer — Plan

## Phase 3 — Installer for the server

**Goal:** Make the server distributable to non-developers in three steps:
1. Prove the build is reproducible (CI)
2. Publish a ready-to-run zip on every versioned release
3. Wrap that zip in a one-click Windows installer

**Items covered:** #12 (GitHub Actions CI), #13 (GitHub Releases + artefact upload), #11 (Windows installer — Inno Setup)

**Note:** The phase numbering here (Phase 3) is independent of the phase numbering in `improvements.md`.

---

## Steps

### Step 1 — #12: GitHub Actions CI pipeline

**File to create:** `.github/workflows/ci.yml`

**Triggers:**
- Push to `main`
- Any pull request targeting `main`

**Jobs:**
1. `build-and-test`
   - Runner: `ubuntu-latest`
   - Setup: `actions/setup-dotnet@v4` with .NET 8
   - Restore: `dotnet restore SlimsteMensTimerServer/SlimsteMensTimerServer.sln`
   - Build: `dotnet build --no-restore -c Release`
   - Test: `dotnet test --no-build -c Release` (no-op today, but ready when tests are added)

**Why `ubuntu-latest`:** The server is cross-platform .NET 8; Linux runners are faster and free. The Windows installer step uses a separate job.

---

### Step 2 — #13: GitHub Releases with automated artefact upload

**Extends:** `.github/workflows/ci.yml` (adds a second job, `release`)

**Trigger:** Push of a tag matching `v*.*.*` (e.g. `v1.0.0`)

**Steps in `release` job:**
1. Restore & publish (self-contained, win-x64):
   ```
   dotnet publish SlimsteMensTimerServer/SlimsteMensTimerServer/SlimsteMensTimerServer.csproj
     -c Release -r win-x64 --self-contained true
     -p:PublishSingleFile=true
     -o publish/win-x64
   ```
2. Zip the output:
   ```
   Compress-Archive -Path publish/win-x64/* -DestinationPath SlimsteMensTimerServer-${{ github.ref_name }}-win-x64.zip
   ```
   (Uses `windows-latest` runner for PowerShell zip + Inno Setup in step 3)
3. Create GitHub Release via `softprops/action-gh-release@v2` and attach the zip.

**Runner for release job:** `windows-latest` (needed for Inno Setup in step 3; PowerShell zip is a bonus).

---

### Step 3 — #11: Windows installer (Inno Setup)

**New file:** `installer/SlimsteMensTimerServer.iss` — Inno Setup script.

**Installer behaviour:**
- Installs files to `{pf}\SlimsteMensTimerServer\`
- Registers `SlimsteMensTimerServer.exe` as a Windows Service (`SlimsteMensTimerSvc`) via `[Run]` entries using `sc.exe`
  - `sc create` / `sc start` on install
  - `sc stop` / `sc delete` on uninstall
- Opens firewall port 5000 inbound (TCP) via `netsh advfirewall` in `[Run]`
- Removes firewall rule on uninstall `[UninstallRun]`
- Creates Start Menu shortcut to `http://localhost:5000/lobby.html`
- Adds uninstaller entry in Programs & Features

**CI integration (added to `release` job in step 2):**
- After zipping, install Inno Setup on the runner:
  ```
  choco install innosetup --no-progress -y
  ```
- Compile the script:
  ```
  iscc installer\SlimsteMensTimerServer.iss /DMyAppVersion=${{ github.ref_name }}
  ```
- Attach `SlimsteMensTimerServer-${{ github.ref_name }}-Setup.exe` to the same GitHub Release.

**Resulting release artefacts per tag:**
| File | Contents |
|------|----------|
| `SlimsteMensTimerServer-v1.x.x-win-x64.zip` | Portable zip (no installer needed) |
| `SlimsteMensTimerServer-v1.x.x-Setup.exe` | One-click Windows installer with service registration |

---

## Files to create / modify

| File | Action |
|------|--------|
| `.github/workflows/ci.yml` | **Create** — CI + release pipeline |
| `installer/SlimsteMensTimerServer.iss` | **Create** — Inno Setup script |
| `SlimsteMensTimerServer/SlimsteMensTimerServer/SlimsteMensTimerServer.csproj` | **Possibly modify** — add `<Version>` property if needed |

---

## Prerequisites / assumptions

- Repository is on GitHub (confirmed — existing `.github/workflows/` present).
- `GITHUB_TOKEN` is available automatically; no extra secrets needed for the release job.
- Inno Setup 6 is available via Chocolatey on `windows-latest` runners.
- Self-contained win-x64 publish is acceptable (no .NET runtime required on the host PC).
- Windows Service runs under `LocalSystem`; port 5000 is not in use.

---

## Completed phases

| Phase | Description | Archive file |
|-------|-------------|--------------|
| Phase 1 | Android app (Delphi/FMX) | `archive/PLAN_phase1_android_app.md` |
| Phase 2 | Multiplayer extension (ASP.NET Core server + Delphi client) | `archive/PLAN_phase2_multiplayer.md` |
