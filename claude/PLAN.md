# De Slimste Mens Timer — Execution Plan

## Purpose
Step-by-step plan for building the De Slimste Mens Timer Android app in Delphi/FireMonkey.
Each step is small and individually executable. Claude stops after each step to check in with the developer.

---

## Step 1 — Create the Delphi Project
**Goal:** Set up a new FireMonkey Android project in Delphi.

Tasks:
- Create a new FireMonkey Mobile Application project in Delphi
- Name the project `SlimsteMensTimer`
- Set the target platform to Android
- Save the project to `D:\Projects\slimstemenstimer\`
- Lock orientation to Portrait only (in Project > Options > Application > Orientation)
- Save and confirm the project builds without errors

Deliverables:
- `SlimsteMensTimer.dpr`
- `SlimsteMensTimer.dproj`
- `Unit1.pas` / `Unit1.fmx`

✅ Check in with developer before proceeding to Step 2.

---

## Step 2 — Design the UI Layout
**Goal:** Set up the visual layout of the main form with correct colors and structure.

Tasks:
- Set form background color to a dark red (`#B71C1C` or similar)
- Add a `TLabel` for the score display:
  - Large font, white, centered, positioned in the upper half of the screen
  - Name: `lblScore`
  - Text: `60`
- Add three `TCircle` or styled `TButton` components for the buttons:
  - Name: `btnMinus20`, `btnStartStop`, `btnPlus20`
  - Labels: `-20`, `Start`, `+20`
  - Round shape, orange/yellow color (`#FFA726` or similar), white text
  - Laid out horizontally below the score label
- Ensure layout looks correct in portrait orientation on a typical Android screen

Deliverables:
- Updated `Unit1.fmx` with the visual layout

✅ Check in with developer before proceeding to Step 3.

---

## Step 3 — Implement Timer Logic
**Goal:** Add the countdown timer functionality.

Tasks:
- Add a `TTimer` component to the form (Name: `tmrCountdown`, Interval: 1000ms, Enabled: False)
- Declare a variable `FScore: Integer` in the form class
- On form create: set `FScore := 60` and update `lblScore`
- On `tmrCountdown.OnTimer`:
  - Decrement `FScore` by 1
  - Update `lblScore.Text`
  - If `FScore <= 0`: stop the timer, set score to 0
- Implement `btnStartStop.OnClick`:
  - Toggle `tmrCountdown.Enabled`
  - Update button label: "Start" when stopped, "Stop" when running
- Implement `btnPlus20.OnClick`: add 20 to `FScore`, update label
- Implement `btnMinus20.OnClick`: subtract 20 from `FScore` (minimum 0), update label

Deliverables:
- Updated `Unit1.pas` with full timer logic

✅ Check in with developer before proceeding to Step 4.

---

## Step 4 — Style Refinement
**Goal:** Polish the visual appearance to match the spec.

Tasks:
- Verify button roundness (use `TSpeedButton` with rounded style, or `TCircle` with overlay label)
- Ensure font sizes are appropriate for typical Android screen sizes
- Check colors match spec: dark red background, orange/yellow buttons, white text
- Add a title label or app name if desired
- Verify portrait lock is working correctly

Deliverables:
- Visually polished `Unit1.fmx`

✅ Check in with developer before proceeding to Step 5.

---

## Step 5 — Android Build & Device Testing
**Goal:** Build and deploy the app to an Android device or emulator.

Tasks:
- Configure Android SDK path in Delphi if not already done
- Set the build target to Android
- Build the project (check for compile errors)
- Deploy to emulator or physical device
- Test all button interactions:
  - Start/Stop toggles correctly
  - +20 and -20 adjust score correctly
  - Timer counts down correctly
  - Timer stops at 0

Deliverables:
- Successful Android APK build
- Verified functionality on device

✅ Check in with developer before proceeding to Step 6.

---

## Step 6 — Final Review & Documentation
**Goal:** Wrap up the project with documentation and final checks.

Tasks:
- Update `PROGRESS.md` with final status
- Write `README.md` for the project
- Review code for any cleanup needed
- Confirm app behaves as expected end-to-end

Deliverables:
- `README.md`
- Updated `PROGRESS.md`

✅ Project complete — final check in with developer.
