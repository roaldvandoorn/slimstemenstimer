# De Slimste Mens Timer — Progress Phase 3 (Archived)

**Archived:** 2026-03-24

## Phase 3 — Installer for the server

**Status: Complete and verified**

| Step | Item | Status |
|------|------|--------|
| 1 | #12 GitHub Actions CI pipeline | Done |
| 2 | #13 GitHub Releases + artefact upload | Done |
| 3 | #11 Windows installer (Inno Setup) | Done |

## Log

- 2026-03-24 — Phase 3 plan written, developer approved.
- 2026-03-24 — Step 1: created `.github/workflows/ci.yml` (build-and-test on ubuntu-latest).
- 2026-03-24 — Step 2: added `release` job; triggers on `v*.*.*` tags, publishes self-contained win-x64 single-file exe, zips it, uploads to GitHub Release.
- 2026-03-24 — Step 3: created `installer/SlimsteMensTimerServer.iss`; installs to Program Files, registers Windows Service, opens firewall port 5000, Start Menu shortcuts to lobby/start/stop.
- 2026-03-24 — Fix: ISPP `#define` was overwriting `/D` command-line version; fixed with `#ifndef`.
- 2026-03-24 — Fix: `OutputDir={#SourcePath}` replaced with `/O"installer"` CLI flag.
- 2026-03-24 — Fix: Added `UseWindowsService()` + `Microsoft.Extensions.Hosting.WindowsServices` to resolve Error 1053 on service start.
- 2026-03-24 — Fix: Replaced `[Code]`-generated `lobby.url` with a static committed file so `[Icons]` can find it at shortcut-creation time.
- 2026-03-24 — Added Start/Stop Server shortcuts with UAC elevation via lnk byte-21 RunAsAdmin flag. All items verified working.
