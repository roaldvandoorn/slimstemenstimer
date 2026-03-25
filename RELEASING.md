# Release Guide

This document explains how to publish a new server release, a new Android release, or both.
It is intended for the developer — not end users (see `SETUP.md` for the user-facing guide).

---

## One-time setup

Before the Android deploy workflow can be used, complete these steps once.

### 1. Enable the Google Play Android Developer API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create the project linked to your Play Store account
3. Navigate to **APIs & Services → Library**
4. Search for **Google Play Android Developer API** and click **Enable**

### 2. Create a service account and download the JSON key

1. In Google Cloud Console, go to **IAM & Admin → Service Accounts**
2. Click **Create Service Account**
   - Name: `github-play-deploy` (or similar)
   - Click **Create and Continue**, then **Done**
3. Click the new service account → **Keys** tab → **Add Key → Create new key → JSON**
4. Download the `.json` file — keep it safe, you will need it in step 4

### 3. Grant the service account access in Play Console

1. Go to [Google Play Console](https://play.google.com/console/)
2. Navigate to **Setup → API access**
3. Find your linked Google Cloud project and click **Manage Play Console permissions**
4. Click **Invite new users**, enter the service account email address
5. Under **App permissions**, select your app and grant the **Release Manager** role
6. Click **Send invitation** (no email is sent — the permission is applied immediately)

### 4. Add the GitHub Secret

1. Open the repository on GitHub → **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
   - Name: `PLAY_STORE_JSON_KEY`
   - Value: paste the **entire contents** of the JSON key file downloaded in step 2
3. Click **Add secret**

---

## Releasing a new server version

1. Ensure all changes are merged to `main`
2. Push a version tag:
   ```
   git tag v1.2.3
   git push origin v1.2.3
   ```
3. The **CI** workflow runs automatically and:
   - Builds the self-contained win-x64 server executable
   - Creates the portable zip and the Inno Setup installer
   - Attaches both to a new GitHub Release named `v1.2.3`

No further action needed. The Android app is not affected.

---

## Releasing a new Android version

### Step 1 — Build the signed AAB in Delphi

1. Open `SlimsteMensTimer.dproj` in Delphi 13.1
2. Set configuration to **Release** and platform to **Android64**
3. Go to **Project → Build**
4. The signed AAB is produced at:
   ```
   bin\Android64\Release\SlimsteMensTimer.aab
   ```

### Step 2 — Attach the AAB to a GitHub Release

The AAB must be attached to an existing GitHub Release (a tag must already exist).
Use the same tag as the server release, or an existing tag if only Android is changing.

```
gh release upload v1.2.3 bin\Android64\Release\SlimsteMensTimer.aab
```

### Step 3 — Trigger the Play Store upload

1. Go to the repository on GitHub → **Actions → Deploy Android to Google Play**
2. Click **Run workflow**
3. Enter the release tag (e.g. `v1.2.3`)
4. Click **Run workflow**

The workflow downloads the AAB from the GitHub Release and uploads it to the
**internal test track** on Google Play. Promote it to a wider track manually in
Play Console if desired.

---

## Releasing both server and Android together

1. Merge all changes to `main`
2. Push the tag (server release is built automatically — see above)
3. Build the AAB in Delphi and attach it to the release (steps 1–2 of Android release above)
4. Trigger the Play Store upload workflow (step 3 of Android release above)

---

## Future: full Android build automation

When item **#21** (self-hosted runner) is implemented, step 1 and 2 of the Android
release process above will be automated. Pushing the tag will be the only required action.
See `claude/improvements.md` for details.
