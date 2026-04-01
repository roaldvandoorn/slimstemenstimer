# Phase 9 Plan — Rejoin / Reconnect (improvement #8)

## Goal
A browser player can refresh the page, or have their browser tab backgrounded/screen
locked/closed, and seamlessly return to their game without losing their seat or score.

## Two problems solved

| # | Problem | Trigger | Fix |
|---|---------|---------|-----|
| A | SignalR silent drop | Transport reconnects but hub group membership lost | `onreconnected` handler re-invokes `JoinSessionGroup` |
| B | Page refresh / tab close / screen lock (OS kills page) | `playerId` is in-memory JS only | `localStorage` persistence + `tryResume()` on init |

## Files changed
- `wwwroot/js/player.js` only — no server changes, no HTML changes

## Step 1 — `onreconnected` handler (Problem A)
Added inside `connectSignalR()` after `.build()`:
```js
connection.onreconnected(() =>
    connection.invoke('JoinSessionGroup', sessionId).catch(() => {}));
```

## Step 2 — Identity persistence helpers (Problem B)
`localStorage` chosen over `sessionStorage` so identity survives tab/browser close.
Key: `player-{sessionId}`.
```js
function saveIdentity(pid, name) { ... }
function clearIdentity()         { ... }
function loadIdentity()          { ... }
```

## Step 3 — Save on join
`saveIdentity(playerId, name)` called in `joinSession()` after server confirms.

## Step 4 — Clear on game end
`clearIdentity()` called in `onGameEnded()` so entries don't accumulate.

## Step 5 — Resume on init
```
loadIdentity()
  ├─ null → show join view (first-time flow, unchanged)
  └─ found → tryResume(pid, name)
       ├─ POST heartbeat → 404 → clearIdentity() → join view
       └─ 200 → GET /api/sessions/{id} (state + scores in one call)
            ├─ restore playerId, score, name, other tiles
            ├─ startHeartbeat() + connectSignalR()
            └─ state: Ended → game view + onGameEnded()
               state: Active → game view
               state: Lobby  → wait view
```

## Screen lock / backgrounding
Same two mechanisms cover it:
- Short absence (< ~30s): `withAutomaticReconnect` + `onreconnected` handles transport drop
- Long absence (OS kills page): full reload → `localStorage` resume flow
- Player going stale while away is expected; `PlayerReturned` fires on next heartbeat

## Non-goals
- Android app: no changes
- Score conflict if two tabs share same player: last-write wins — acceptable
