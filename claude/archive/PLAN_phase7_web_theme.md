# De Slimste Mens Timer — Plan (Phase 7 Archive)

## Phase 7 — Web App Theme & Artwork

### Goal
Add a switchable quiz-show theme (warm gold/navy) to the web app, alongside the existing classic red/orange theme. Canva artwork (logo, favicon, hero background) integrated as optional visual layer.

### Steps
| # | Task | Status |
|---|------|---------|
| 1 | Create `wwwroot/js/theme.js` | ✅ Done |
| 2 | Create `wwwroot/css/theme-toggle.css` | ✅ Done |
| 3 | Update `wwwroot/css/style.css` with quiz-show theme variables | ✅ Done |
| 4 | Add toggle button + scripts to all 4 HTML pages | ✅ Done |
| 5 | Export hero background from Canva → `wwwroot/images/hero-bg.png` | ✅ Done |
| 6 | Export logo from Canva → `wwwroot/images/logo.png` | ✅ Done |
| 7 | Export favicon from Canva → `wwwroot/images/favicon.png` | ✅ Done |
| 8 | Wire logo into HTML header area (optional) | ✅ Done |

### Notes
- Theme persisted in `localStorage` key `dsm-theme`; values: `classic` / `quiz-show`
- Hero background path: `/images/hero-bg.jpg` (referenced in `style.css`)
- Canva design IDs: logo `DAHE_PHGSuY`, favicon `DAHE_KF0Ddo`, hero `DAHE_CJSMJ8`
- Default theme set to `quiz-show`
- Quiz-show card opacity: `--card-bg` 0.45, `--stale-bg` 0.20
- Logo variants: `logo.png` (square), `logo-horiz.png` (horizontal, shown in header on quiz-show theme)
- Landscape player layout fix: `padding-right: 130px` on `.player-main`
