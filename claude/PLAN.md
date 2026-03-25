# De Slimste Mens Timer — Plan

## Active phase: Phase 5 — Automated Google Play deployment (#15)

_Started: 2026-03-25_

---

## Approach

Manual build + automated upload. The developer builds and signs the AAB locally in
Delphi (unchanged from current process), attaches it to the GitHub Release, then
triggers a new `deploy-android.yml` workflow that uploads it to the Play Store.

Full build automation (self-hosted runner, item #21) is deferred for later.

---

## Pre-requisites (one-time manual setup — not code steps)

These must be completed by the developer before the workflow can be used.
Detailed instructions are provided in `RELEASING.md` (added in Step 3).

| # | Action | Where |
|---|--------|--------|
| A | Enable **Google Play Android Developer API** | Google Cloud Console |
| B | Create a **service account**, download **JSON key** | Google Cloud Console |
| C | Grant service account **Release Manager** role | Google Play Console → Setup → API access |
| D | Add GitHub Secret **`PLAY_STORE_JSON_KEY`** (full JSON content) | GitHub repo → Settings → Secrets and variables → Actions |

---

## Steps

### Step 1 — Create feature branch
Branch: `phase5-google-play`

### Step 2 — Add `.github/workflows/deploy-android.yml`
New workflow file. `workflow_dispatch` trigger with a `tag` input.

- Downloads the `.aab` from the specified GitHub Release using `gh release download`
- Uploads to Play Store internal track using `r0adkll/upload-google-play@v1`
- Package name: `com.embarcadero.SlimsteMensTimer`
- Track: `internal`

Commit and push.

### Step 3 — Add `RELEASING.md`
New file at repo root. Developer-facing release guide covering:

1. **One-time setup** — Google Cloud service account, Play Console permissions, GitHub Secret
2. **Server release** — push tag, CI builds and attaches server artefacts automatically
3. **Android release** — build AAB in Delphi, `gh release upload`, trigger `deploy-android` workflow
4. **Self-hosted runner (future)** — pointer to improvement #21 for full automation

Commit and push.

### Step 4 — Update docs
- Mark `#15` as ✅ implemented in `claude/improvements.md`
- Update `claude/PROGRESS.md`

Commit and push.

### Step 5 — Create pull request
Branch `phase5-google-play` → `main`.

---

## Completed phases

| Phase | Description | Archive file |
|-------|-------------|--------------|
| Phase 1 | Android app (Delphi/FMX) | `archive/PLAN_phase1_android_app.md` |
| Phase 2 | Multiplayer extension (ASP.NET Core server + Delphi client) | `archive/PLAN_phase2_multiplayer.md` |
| Phase 3 | CI pipeline, GitHub Releases, Windows installer (Inno Setup) | `archive/PLAN_phase3_installer.md` |
| Phase 4 | Discoverability & polish (#17 #18 #19 #20) | `archive/PLAN_phase4_discoverability.md` |
