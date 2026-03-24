# De Slimste Mens Timer — Progress Log

## Phase 3 — Installer for the server

**Status: Complete and verified**

| Step | Item | Status |
|------|------|--------|
| 1 | #12 GitHub Actions CI pipeline | Done |
| 2 | #13 GitHub Releases + artefact upload | Done |
| 3 | #11 Windows installer (Inno Setup) | Done |

---

## Completed phases

| Phase | Description | Archive file |
|-------|-------------|--------------|
| Phase 1 | Android app (Delphi/FMX) | `archive/PROGRESS_phase1_android_app.md` |
| Phase 2 | Multiplayer extension (ASP.NET Core server + Delphi client) | `archive/PROGRESS_phase2_multiplayer.md` |

## Log

- 2026-03-24 — Phase 3 plan written, pending developer review.
- 2026-03-24 — Step 1 done: created `.github/workflows/ci.yml` (build-and-test on ubuntu-latest, .NET 8, restore/build/test on push to main and PRs).
- 2026-03-24 — Step 2 done: added `release` job to `ci.yml`; triggers on `v*.*.*` tags, publishes self-contained win-x64 single-file exe, zips it, and uploads to a GitHub Release via softprops/action-gh-release@v2.
- 2026-03-24 — Step 3 done: created `installer/SlimsteMensTimerServer.iss` (Inno Setup script); installs to Program Files, registers Windows Service, opens firewall port 5000, creates Start Menu shortcut to lobby. CI extended to build the installer via Chocolatey + ISCC and attach Setup.exe to the GitHub Release alongside the zip.
- 2026-03-24 — Bugfixes: ISPP `#define` was overwriting `/D` command-line version; fixed with `#ifndef`. `OutputDir={#SourcePath}` replaced with `/O` flag in CI. Added `UseWindowsService()` + NuGet package to fix Error 1053 on service start. Replaced `[Code]`-generated `lobby.url` with a static file so `[Icons]` can find it. Added Start/Stop Server shortcuts to Start Menu with UAC elevation via lnk byte-21 trick. All verified working.
