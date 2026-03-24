---
name: Development environment and tooling
description: Installed tools, paths, and environment-specific facts relevant to continuing work
type: project
---

**As of 2026-03-24.**

## Machine
- OS: Windows 11 Pro 10.0.26220
- Working directory: `P:\slimstemenstimer`
- Shell: bash (via Claude Code on Windows — use Unix path syntax)

## Languages / runtimes available
- Python 3.13.0 — `python` on PATH; `python-pptx 1.0.2` installed via pip
- Node.js — NOT installed (npx unavailable)
- Delphi 13.1 — IDE only, not on PATH; build via IDE (F9 or Project > Build)
- .NET 8 — available; `dotnet run` works in server project directory

## Key file locations
- Android app entry: `SlimsteMensTimer.dpr`
- Server solution: `SlimsteMensTimerServer/SlimsteMensTimerServer.sln`
- Unit test project: `tests/SlimsteMensTimerTests.dproj`
- Postman collection: `postman/SlimsteMensTimerServer.postman_collection.json`
- Presentation (Marp): `claude/presentation.md`
- Presentation (PPTX): `claude/presentation.pptx`
- PPTX generator script: `claude/make_presentation.py`

## Network
- Server listens on `http://0.0.0.0:5000`
- Android devices and server must be on the same LAN (same Wi-Fi)
- Server machine may have an active VPN — see technical lessons memory for impact

## Google Play
- App internal test URL: `https://play.google.com/apps/internaltest/4701444685052336832`
- This URL is encoded in the app-download QR on the lobby landing page (`GET /api/appqr`)

## Canva integration
- Canva MCP tools were listed as available-deferred-tools in this session but were NOT available at runtime (tool schema fetch would fail). Do not assume Canva integration works. Use python-pptx for PowerPoint generation instead.
