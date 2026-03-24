# De Slimste Mens Timer — Progress Log

## Status: Phase 4 complete — PR open

---

## Completed phases

| Phase | Description | Archive file |
|-------|-------------|--------------|
| Phase 1 | Android app (Delphi/FMX) | `archive/PROGRESS_phase1_android_app.md` |
| Phase 2 | Multiplayer extension (ASP.NET Core server + Delphi client) | `archive/PROGRESS_phase2_multiplayer.md` |
| Phase 3 | CI pipeline, GitHub Releases, Windows installer (Inno Setup) | `archive/PROGRESS_phase3_installer.md` |

## Log

- 2026-03-24 — Phase 4 plan written, developer approved.
- 2026-03-24 — Step 0: created feature branch `phase4-discoverability`.
- 2026-03-24 — Step 1 (#20): added `/health` endpoint, `StatusController` with `/api/status`, `status.html` dashboard, footer links in lobby/scoreboard. Commit `6c41881`.
- 2026-03-24 — Step 2 (#19): added `MaxPlayersPerSession` to config, enforced in `SessionStore`, `SessionFull` result, `appsettings.example.json` documentation. Commit `5c19339`.
- 2026-03-24 — Step 3 (#17): created `SETUP.md` non-technical Dutch setup guide. Commit `9a7fb21`.
- 2026-03-24 — Step 4 (#18): server version shown in lobby/scoreboard footers via `/api/status`; update banner on `status.html`. Commit `7d87eaa`.
- 2026-03-24 — Step 5: pull request opened → `main`.
