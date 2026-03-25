# De Slimste Mens Timer — Phase 6 Plan (archived)

**Feature:** Browser-based player client (improvement #22)
**PR:** #5 (`feature/browser-player-client`)
**Merged:** 2026-03-25

---

## Goal

Allow players to join and play a game session from a mobile browser instead of the Android app. Useful for players who cannot or prefer not to install the Android app.

---

## Steps planned and executed

| Step | Description | Status |
|------|-------------|--------|
| S1 | Design `player.html` static mockup (join / waiting / game views) | ✅ |
| S2 | Implement `player.js`: join flow, REST API calls, countdown timer, score controls, SignalR live updates | ✅ |
| S3 | Redirect `/join/{id}` → `player.html?session={id}` in `Program.cs` | ✅ |
| S4 | Polish: clickable QR link in `lobby.html/js`, version normalisation in `status.html`, `style.css` layout classes | ✅ |
| S5 | Update `README.md` with browser client feature section and comparison table | ✅ |

---

## Design decisions

- **No server changes** — reused existing REST API (`POST /api/sessions/{id}/players`, `PUT .../score`, `POST .../heartbeat`) and SignalR hub (`JoinSessionGroup`, `ScoreUpdated`, `PlayerJoined` events).
- **Timer in browser** — 1 pt/s countdown matching the Android app; controlled by Start/Stop button.
- **Responsive layout** — other-players scores shown in sidebar (landscape) / bottom tiles (portrait).
- **Join via QR** — scanning the QR code or clicking the lobby link opens `player.html` with `?session=` pre-filled.
