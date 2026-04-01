# Phase 9 Progress Log — Rejoin / Reconnect

## 2026-04-01

### Problem A — Silent SignalR drop (1 line)
- Added `connection.onreconnected()` handler in `connectSignalR()` that re-invokes
  `JoinSessionGroup(sessionId)` after a transport reconnect.
- Pre-existing `withAutomaticReconnect()` handles the transport layer; this fixes the
  gap where the client rejoined the WebSocket but was no longer in the session group
  and therefore stopped receiving events.

### Problem B — Page refresh / closed browser / screen lock (sessionStorage → localStorage)
- Added `STORAGE_KEY`, `saveIdentity()`, `clearIdentity()`, `loadIdentity()` helpers
  using `localStorage` (not sessionStorage — localStorage survives tab/browser close).
- `saveIdentity(playerId, name)` called in `joinSession()` after server confirms the join.
- On init: `loadIdentity()` checked; if found, `tryResume()` is called instead of
  showing the join form.
- `tryResume(pid, name)`:
  1. POST heartbeat — if 404, player purged; clears storage, shows join form.
  2. GET `/api/sessions/{id}` — gets state + all players (including own current score)
     in one call.
  3. Restores `playerId`, `score`, name display; starts heartbeat + SignalR.
  4. Populates other-player tiles from session response.
  5. Selects view: Ended → game view + `onGameEnded()`; Active → game view; Lobby → wait view.
  6. Falls back to join form on any network error.
- `clearIdentity()` called in `onGameEnded()` so ended-game entries are cleaned up
  automatically and don't accumulate in localStorage.

### No server changes
Reused existing endpoints:
- `POST /api/sessions/{id}/players/{pid}/heartbeat` — liveness check
- `GET /api/sessions/{id}` — state + player list (already returns both)

### Files changed
- `wwwroot/js/player.js` only
