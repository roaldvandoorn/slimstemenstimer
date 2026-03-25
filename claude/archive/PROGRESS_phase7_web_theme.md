# De Slimste Mens Timer — Progress Log (Phase 7 Archive)

## Phase 7 — Web App Theme & Artwork (COMPLETE)

## Log

### 2026-03-25
- Created `wwwroot/js/theme.js` — theme switcher, persists in localStorage, applies `data-theme` to `<html>`
- Created `wwwroot/css/theme-toggle.css` — floating 🎨 button fixed bottom-right
- Updated `wwwroot/css/style.css` — added quiz-show theme variables (gold/navy), Playfair Display + Lato fonts, hero background rule
- Updated `lobby.html`, `scoreboard.html`, `player.html`, `status.html` — added theme script/css + toggle button
- Created `wwwroot/images/` folder for Canva asset exports
- Exported assets placed in `wwwroot/images/`: `hero-bg.png`, `logo.png`, `favicon.png`, `logo-horiz.png` (user's own creation)
- Added `logo-horiz.png` as header image on lobby, scoreboard, player (join + wait views) — swaps with text title in quiz-show theme
- Added `favicon.png` to all 4 pages via `<link rel="icon">`
- Fixed hero background reference to `.png` (was `.jpg`)
- Changed default theme from `classic` to `quiz-show` in `theme.js`
- Increased quiz-show card opacity: `--card-bg` 0.10→0.45, `--stale-bg` 0.04→0.20
- Fixed landscape player layout: added `padding-right: 130px` to `.player-main` to counterbalance sidebar and keep score/controls centred over the hero image
