/**
 * theme.js — Switchable theme support
 *
 * Themes:
 *   "classic"   — original red/orange style (default)
 *   "quiz-show" — warm gold/navy quiz-show style
 *
 * Theme is persisted in localStorage under key "dsm-theme".
 * Call window.toggleTheme() from the toggle button.
 */

(function () {
  const STORAGE_KEY = 'dsm-theme';
  const TITLES = {
    'classic':   'Schakel naar quiz-show thema',
    'quiz-show': 'Schakel naar klassiek thema'
  };

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'quiz-show';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.title = TITLES[theme];
      btn.classList.toggle('theme-quiz-show-active', theme === 'quiz-show');
    }
  }

  window.toggleTheme = function () {
    const next = getTheme() === 'classic' ? 'quiz-show' : 'classic';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  // Apply immediately (before paint) to avoid a flash of wrong theme
  applyTheme(getTheme());

  // Re-apply after DOM ready to update button state
  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(getTheme());
  });
})();
