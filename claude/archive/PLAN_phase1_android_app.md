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

## Step 5 — Hamburger Menu with Reset, Score Input & Exit

**Goal:** Add a collapsible menu in the top-left corner with three actions.

### Design decisions

#### Menu button
- Component: `TRectangle` (~50×50, top-left, `Position.X=10, Position.Y=10`, `XRadius/YRadius=8` for slight rounding)
- Child `TText` with "☰" (Unicode hamburger, font ~28pt, white)
- Fill color: same orange as existing buttons (`#FFA726`) to stay consistent
- `OnClick` handler on the TRectangle: toggles menu panel visibility

#### Menu panel
- Component: `TRectangle` (width ~200, auto-height, positioned below the menu button, `Position.X=10, Position.Y=65`)
- Fill: dark semi-transparent (`#CC000000`) so the score remains legible behind it
- `Visible = False` by default; shown/hidden by the menu button tap
- Three `TText` children stacked vertically (each ~50pt tall, white, 18pt font, left-aligned with padding):
  1. "Reset score"
  2. "Score instellen"
  3. "Afsluiten"
- Each `TText` has its own `OnClick` handler
- Panel is always rendered on top (last child of `rectBackground`, so it paints over other elements)

#### "Reset score" action
- Sets score to 60, updates `lblScore.Text`
- Also stops the timer if running and resets `txtStartStop.Text` to `'Start'`
- Hides the menu panel

#### "Score instellen" action
- Uses `TDialogService.InputQuery` (from `FMX.DialogService`) — native Android input dialog
- Prompt: `'Score instellen'`, caption: `'Voer een getal in (0–1000):'`
- Validates result: must be a valid integer in range 0–1000; ignores/rejects invalid input
- On confirmation: sets score to the entered value, updates `lblScore.Text`, hides menu panel

#### "Afsluiten" action
- Calls `Application.Terminate`

### Deliverables
- Updated `MainFrm.fmx` with menu button and panel
- Updated `MainFrm.pas` with all handlers

✅ Check in with developer before proceeding to Step 6.

---

## Step 6 — Score Manager Class

**Goal:** Extract score state and logic into a separate, testable class.

### New file: `src/ScoreManager.pas`

#### Interface: `IScoreManager`
```pascal
IScoreManager = interface
  ['{GUID}']
  procedure Increase(AAmount: Integer);
  procedure Decrease(AAmount: Integer);
  procedure SetScore(AValue: Integer);
  procedure Reset;
  function GetScore: Integer;
  property Score: Integer read GetScore;
end;
```

#### Class: `TScoreManager`
- Inherits from `TInterfacedObject` (automatic reference counting; held as `IScoreManager` in the form — no manual `Free` needed)
- Private field `FScore: Integer`
- Rules:
  - `Increase(AAmount)`: adds `AAmount` to `FScore`, **no upper cap**
  - `Decrease(AAmount)`: subtracts `AAmount`, clamps to minimum 0 (`Max(0, FScore - AAmount)`)
  - `SetScore(AValue)`: raises `EArgumentOutOfRangeException` if `AValue < 0` or `AValue > 1000`; otherwise sets `FScore`
  - `Reset`: sets `FScore := 60`
  - `GetScore`: returns `FScore`

Note: the `mnuSetScoreClick` handler in `MainFrm.pas` validates the range (0–1000) before calling `SetScore`, so the exception in `SetScore` acts as a contract guard rather than a user-facing error.

### Changes to `MainFrm.pas`
- Remove `FScore: Integer`; add `FScoreManager: IScoreManager`
- In `FormCreate`: `FScoreManager := TScoreManager.Create`
- Add `ScoreManager` to the `uses` clause

### Deliverables
- New `src/ScoreManager.pas`
- Updated `src/MainFrm.pas`

✅ Check in with developer before proceeding to Step 7.

---

## Step 7 — DUnitX Unit Test Project

**Goal:** Add a separate Windows-only test project with full coverage of `TScoreManager`.

### File structure
```
tests/
  SlimsteMensTimerTests.dpr       ← console application entry point
  SlimsteMensTimerTests.dproj     ← Windows-only project config (created in IDE)
  TestScoreManager.pas            ← test fixture (20 tests)
```

### Test coverage (`TestScoreManager.pas`)

| Group | Test | What it verifies |
|---|---|---|
| Create | `Create_InitialScoreIs60` | Score after construction = 60 |
| Reset | `Reset_FromDefault_ScoreIs60` | Reset when already at 60 → still 60 |
| Reset | `Reset_AfterIncrease_ScoreIs60` | Increase then Reset → 60 |
| Reset | `Reset_AfterDecrease_ScoreIs60` | Decrease then Reset → 60 |
| Reset | `Reset_AfterSetScore_ScoreIs60` | SetScore(200) then Reset → 60 |
| Increase | `Increase_AddsAmount` | 60 + 20 = 80 |
| Increase | `Increase_ByZero_NoChange` | Increase(0) → unchanged |
| Increase | `Increase_BeyondScoreMax_Allowed` | 1000 + 20 = 1020 (no cap) |
| Increase | `Increase_FromZero` | 0 + 1 = 1 |
| Decrease | `Decrease_SubtractsAmount` | 60 − 20 = 40 |
| Decrease | `Decrease_ByZero_NoChange` | Decrease(0) → unchanged |
| Decrease | `Decrease_ClampsToZero` | 60 − 100 → 0 |
| Decrease | `Decrease_ExactlyToZero` | 60 − 60 → 0 |
| Decrease | `Decrease_AlreadyZero_StaysZero` | 0 − 1 → 0 |
| SetScore | `SetScore_SetsValue` | SetScore(500) → 500 |
| SetScore | `SetScore_LowerBound_Valid` | SetScore(0) → no exception |
| SetScore | `SetScore_UpperBound_Valid` | SetScore(1000) → no exception |
| SetScore | `SetScore_BelowMin_RaisesException` | SetScore(−1) → EArgumentOutOfRangeException |
| SetScore | `SetScore_AboveMax_RaisesException` | SetScore(1001) → EArgumentOutOfRangeException |
| SetScore | `SetScore_FarBelowMin_RaisesException` | SetScore(−9999) → EArgumentOutOfRangeException |
| SetScore | `SetScore_FarAboveMax_RaisesException` | SetScore(99999) → EArgumentOutOfRangeException |

### IDE setup required
1. File > New > Other > Console Application, save to `tests/` as `SlimsteMensTimerTests`
2. Replace the generated `.dpr` content with the written file
3. Project > Add to Project: add `TestScoreManager.pas`
4. Project > Options > Building > Delphi Compiler > Search Path: add `..\src`
5. Ensure DUnitX is on the global library path (Tools > Options > Language > Delphi > Library)
6. Set platform to Win32 or Win64, build and run

### Deliverables
- `tests/TestScoreManager.pas`
- `tests/SlimsteMensTimerTests.dpr`
- `tests/SlimsteMensTimerTests.dproj` (created in IDE)

✅ Check in with developer before proceeding to Step 8.

---

## Step 8 — Android Build & Device Testing
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
  - Hamburger menu opens/closes correctly
  - Reset score works
  - Score instellen dialog accepts valid input
  - Afsluiten closes the app

Deliverables:
- Successful Android APK build
- Verified functionality on device

✅ Check in with developer before proceeding to Step 9.

---

## Step 9 — Final Review & Documentation
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
