# De Slimste Mens Timer — Progress Log

## Status: Phase 5 complete — awaiting PR merge

_Phase started: 2026-03-25_

---

## Completed phases

| Phase | Description | Archive file |
|-------|-------------|--------------|
| Phase 1 | Android app (Delphi/FMX) | `archive/PROGRESS_phase1_android_app.md` |
| Phase 2 | Multiplayer extension (ASP.NET Core server + Delphi client) | `archive/PROGRESS_phase2_multiplayer.md` |
| Phase 3 | CI pipeline, GitHub Releases, Windows installer (Inno Setup) | `archive/PROGRESS_phase3_installer.md` |
| Phase 4 | Discoverability & polish (#17 #18 #19 #20) | `archive/PROGRESS_phase4_discoverability.md` |

## Log

### Step 1 — Feature branch ✅
Created branch `phase5-google-play`.

### Step 2 — deploy-android.yml ✅
Added `.github/workflows/deploy-android.yml`. `workflow_dispatch` trigger with `tag` input.
Downloads `.aab` from the GitHub Release, uploads to Play Store internal track via
`r0adkll/upload-google-play@v1`. Requires `PLAY_STORE_JSON_KEY` secret.

### Step 3 — RELEASING.md ✅
Added `RELEASING.md` at repo root. Covers:
- One-time Google Cloud + Play Console service account setup
- Server-only release (tag push)
- Android release (Delphi build → gh release upload → workflow_dispatch)
- Combined release
- Pointer to #21 (self-hosted runner) for future full automation

### Step 4 — Docs update ✅
Marked #15 as implemented in `improvements.md`. Added #21 (self-hosted runner) to backlog.
Updated `PROGRESS.md`.

### Step 5 — Pull request
Pending.
