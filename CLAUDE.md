# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A two-component system for the board game "De Slimste Mens" (The Smartest Person):

1. **Android client app** — Delphi / FireMonkey (FMX) countdown timer and score tracker. Each player runs the app on their own Android device. Scores can be pushed to the server when connected.
2. **Web server** — ASP.NET Core 8 (C#) application that manages game sessions and hosts a real-time scoreboard web UI. The browser scoreboard shows all connected players' scores, updated live via SignalR.

The app works fully standalone (offline). Server connectivity is optional.

## Working Method

1. After every step, save knowledge and progress in files in the `claude/` subfolder
2. Analyse relevant source before proposing changes
3. Propose code changes, then **present the plan and wait for developer approval** before executing
4. Execute approved plan; update `claude/PLAN.md` and `claude/PROGRESS.md` after each step
5. Documentation in Markdown (not Word)

The plan lives in `claude/PLAN.md` and progress tracking in `claude/PROGRESS.md`. Always check these before starting work.

## Available IDEs & Tools

- **Delphi 13.1** — Android app (FMX); also has DevExpress VCL Suite 25.2 (not applicable to FMX)
- **Visual Studio 2022** — ASP.NET Core server (preferred for .NET)
- **JetBrains Rider** — alternative .NET IDE
- **Visual Studio Code** — general purpose
- **Databases available**: SQL Server 2025, Interbase 2020 (server currently uses in-memory store)

## Repository Structure

```
SlimsteMensTimer.dpr            ← Android app entry point
SlimsteMensTimer.dproj          ← Android app project config
AndroidManifest.template.xml    ← Android manifest (permissions etc.)
src/
  MainFrm.pas                   ← form logic: timer, buttons, menu, server connection
  MainFrm.fmx                   ← visual layout (XML-based FMX form)
  ScoreManager.pas              ← IScoreManager interface + TScoreManager class
  ServerClient.pas              ← IServerClient, TServerClient, TServerAwareScoreManager
tests/
  SlimsteMensTimerTests.dpr     ← DUnitX test runner (Windows console)
  SlimsteMensTimerTests.dproj   ← test project config (Win32/Win64)
  TestScoreManager.pas          ← 20 unit tests for TScoreManager
SlimsteMensTimerServer/
  SlimsteMensTimerServer.sln
  SlimsteMensTimerServer/
    Program.cs                  ← DI, SignalR, CORS, static files
    Controllers/                ← REST API (sessions, players, QR code)
    Hubs/GameHub.cs             ← SignalR hub
    Models/                     ← Session, Player, SessionState
    Services/                   ← SessionStore, HeartbeatMonitor, IpAddressHelper
    wwwroot/                    ← lobby.html, scoreboard.html, JS, CSS
claude/
  PLAN.md                       ← step-by-step execution plan
  PROGRESS.md                   ← progress log
  archive/                      ← completed project documentation
```

## Build & Deploy

### Android app (Delphi IDE)
- Build: **Project > Build** (or F9 to run) inside Delphi IDE
- Target platform: Android (configured in Project Manager panel)
- Deploy: Connect Android device or start emulator, then Run in Delphi IDE
- Orientation lock: Portrait only (**Project > Options > Application > Orientation**)

### Unit tests (Delphi IDE)
- Open `tests/SlimsteMensTimerTests.dproj`
- Platform: Win32 or Win64
- F9 to run — results in console

### Server (Visual Studio 2022 or Rider)
- Open `SlimsteMensTimerServer/SlimsteMensTimerServer.sln`
- Run with F5 (IIS Express) or `dotnet run` in the project folder
- Listens on `http://0.0.0.0:5000` by default
- Server and Android devices must be on the same local network

## Android App Architecture

### Key components (`src/MainFrm.pas`)
- `FScoreManager: IScoreManager` — score state; normally `TScoreManager`, swapped to `TServerAwareScoreManager` when connected to a session
- `FServerClient: IServerClient` — server communication; nil-safe, only active when joined
- `tmrCountdown: TTimer` — 1000 ms countdown
- `tmrStatusPoll: TTimer` — 5 s, updates connection status label on main thread
- `lblScore: TLabel` — large score display
- `lblStatus: TLabel` — small top-right label: "Online" / "Offline" / empty
- `btnStartStop`, `btnPlus20`, `btnMinus20` — round orange buttons
- `pnlMenu` — hamburger menu panel (toggles visible)

### Score management (`src/ScoreManager.pas`)
- `IScoreManager`: `Increase(n)`, `Decrease(n)` (clamps to 0), `SetScore(n)` (0–1000, raises on out-of-range), `Reset` (→60), `Score` property
- `TScoreManager`: `TInterfacedObject` implementation
- Constants: `ScoreDefault=60`, `ScoreMin=0`, `ScoreMax=1000`

### Server client (`src/ServerClient.pas`)
- `IServerClient`: `JoinSession`, `LeaveSession`, `PushScore`, `IsConnected`, `PlayerName`, `SessionId`
- `TServerClient`: uses `TNetHTTPClient` (built-in FMX); all HTTP on background thread via `TTask.Run`; heartbeat timer (15 s); offline after 3 consecutive failures
- `TServerAwareScoreManager`: decorator over `IScoreManager`; transparently pushes score to server after each mutation; zero changes needed to existing handlers

## Server Architecture

### REST API (`/api/...`)
- `POST /api/sessions` → create session
- `POST /api/sessions/{id}/players` → register player
- `PUT /api/sessions/{id}/players/{pid}/score` → push score
- `POST /api/sessions/{id}/players/{pid}/heartbeat` → keep-alive
- `GET /api/sessions/{id}/qr` → QR code PNG
- Full API reference: `claude/PLAN.md`

### Real-time (SignalR hub at `/gamehub`)
- Browser clients join a session group via `JoinSessionGroup(sessionId)`
- Server broadcasts: `PlayerJoined`, `ScoreUpdated`, `PlayerWentStale`, `PlayerReturned`, `GameStarted`, `GameEnded`
- Delphi app does NOT use SignalR — REST only

### Session lifecycle
`Lobby → Active → Ended`
- Lobby: QR code shown, players join, "Start Spel" button
- Active: scoreboard live, score pushes accepted
- Ended: manual or 2-hour idle timeout, state purged

## Visual Design (app)

- Background: dark red (`#B71C1C`)
- Buttons: round, orange/yellow (`#FFA726`), white text — layout: `[-20] [Start/Stop] [+20]`
- Score label: large white text, centered, upper half of screen
- Portrait-only orientation
- Menu: semi-transparent dark panel, top-left hamburger button
