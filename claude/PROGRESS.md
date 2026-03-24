# De Slimste Mens Timer — Progress Log

## Phase 3 — Installer for the server

**Status: In progress — Step 1 complete**

| Step | Item | Status |
|------|------|--------|
| 1 | #12 GitHub Actions CI pipeline | Done |
| 2 | #13 GitHub Releases + artefact upload | Not started |
| 3 | #11 Windows installer (Inno Setup) | Not started |

---

## Completed phases

| Phase | Description | Archive file |
|-------|-------------|--------------|
| Phase 1 | Android app (Delphi/FMX) | `archive/PROGRESS_phase1_android_app.md` |
| Phase 2 | Multiplayer extension (ASP.NET Core server + Delphi client) | `archive/PROGRESS_phase2_multiplayer.md` |

## Log

- 2026-03-24 — Phase 3 plan written, pending developer review.
- 2026-03-24 — Step 1 done: created `.github/workflows/ci.yml` (build-and-test on ubuntu-latest, .NET 8, restore/build/test on push to main and PRs).
