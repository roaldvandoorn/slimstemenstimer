# De Slimste Mens Timer

An Android countdown timer app for the board game *De Slimste Mens* (The Smartest Person). Replaces physical timer devices with a digital 60-second countdown, score tracking, and on-screen controls.

## Features

- Countdown timer starting at 60 seconds
- **Start/Stop** — toggle the countdown
- **+20 / −20** — adjust the score directly (−20 clamps to 0)
- **Hamburger menu** (top-left) with three options:
  - *Reset score* — resets to 60 and stops the timer
  - *Score instellen* — enter any score from 0 to 1000
  - *Afsluiten* — close the app
- Portrait-only orientation
- Dark red background, orange buttons, white text

## Project structure

```
SlimsteMensTimer.dpr       ← main app entry point
SlimsteMensTimer.dproj     ← main app project config (Android)
src/
  MainFrm.pas              ← form logic: timer, button handlers, menu
  MainFrm.fmx              ← visual layout (FMX XML)
  ScoreManager.pas         ← IScoreManager interface + TScoreManager class
tests/
  SlimsteMensTimerTests.dpr    ← DUnitX console test runner
  SlimsteMensTimerTests.dproj  ← test project config (Windows)
  TestScoreManager.pas         ← 20 unit tests for TScoreManager
claude/
  PLAN.md                  ← step-by-step execution plan
  PROGRESS.md              ← progress log
  PROJECT.md               ← original project description and requirements
```

## Building

This is a Delphi/FireMonkey project. There is no CLI build — all compilation is done via the Delphi IDE.

### Main app (Android)
1. Open `SlimsteMensTimer.dproj` in Delphi
2. Select the Android platform in the Project Manager
3. Connect an Android device or start an emulator
4. Press **F9** (Run) to build and deploy

### Unit tests (Windows)
1. Open `tests/SlimsteMensTimerTests.dproj` in Delphi
2. Select Win32 or Win64 platform
3. Press **F9** to run — results are printed to the console

## Architecture

The app is a single-form FireMonkey application. Score state is managed by `TScoreManager`, which implements the `IScoreManager` interface for testability.

### `IScoreManager`

| Method | Behaviour |
|---|---|
| `Increase(AAmount)` | Adds amount to score, no upper cap |
| `Decrease(AAmount)` | Subtracts amount, clamps to 0 |
| `SetScore(AValue)` | Sets score; raises `EArgumentOutOfRangeException` if outside 0–1000 |
| `Reset` | Restores score to 60 |
| `Score` | Returns current score |

Constants exported from `ScoreManager.pas`: `ScoreDefault = 60`, `ScoreMin = 0`, `ScoreMax = 1000`.

## Dependencies

- **Delphi** with FireMonkey (FMX) — tested on Delphi 12
- **Android SDK** — configured via Tools > Options in the Delphi IDE
- **DUnitX** — must be on the Delphi global library path to build the test project
