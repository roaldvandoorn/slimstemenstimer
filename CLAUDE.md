# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Android countdown timer app for the board game "De Slimste Mens" (The Smartest Person), built with Delphi / FireMonkey (FMX). The app replaces physical timer devices with a digital countdown from 60 seconds, scoring system, and Start/Stop/±20 controls.

## Working Method

1. After every step, save knowledge and progress in files in the `claude/` subfolder
2. Analyse relevant source before proposing changes
3. Propose code changes, then **present the plan and wait for developer approval** before executing
4. Execute approved plan; update `claude/PLAN.md` and `claude/PROGRESS.md` after each step
5. Documentation in Markdown (not Word)

The plan lives in `claude/PLAN.md` and progress tracking in `claude/PROGRESS.md`. Always check these before starting work.

## Build & Deploy

This is a Delphi/FireMonkey project — there is no CLI build command. All compilation and deployment is done via the **Delphi IDE**:

- Build: **Project > Build** (or F9 to run) inside Delphi IDE
- Target platform: Android (configured in Project Manager panel)
- Deploy: Connect Android device or start emulator, then Run in Delphi IDE
- Orientation lock: Set in **Project > Options > Application > Orientation** (Portrait only)

No automated test framework is configured. Testing is manual on device/emulator.

## Architecture

Single-form FireMonkey application:

```
SlimsteMensTimer.dpr       ← project entry point
SlimsteMensTimer.dproj     ← MSBuild project config
src/
  MainFrm.pas              ← all logic: timer countdown, button handlers, score state
  MainFrm.fmx              ← visual layout (XML-based FMX form)
bin/                       ← compiled output (gitignored)
```

Key members of `TMainForm` (`src/MainFrm.pas`):
- `FScore: Integer` — current score, initialized to 60
- `tmrCountdown: TTimer` — 1000ms interval, disabled by default
- `lblScore: TLabel` — displays current score
- `btnStartStop`, `btnPlus20`, `btnMinus20` — three control buttons

Timer logic: each tick decrements `FScore` by 1 and updates `lblScore`; stops and clamps to 0 when score hits 0. ±20 buttons adjust `FScore` directly (minimum 0).

## Visual Design

- Background: dark red (`#B71C1C`)
- Buttons: round, orange/yellow (`#FFA726`), white text — layout: `[-20] [Start/Stop] [+20]`
- Score label: large white text, centered, upper half of screen
- Portrait-only orientation
