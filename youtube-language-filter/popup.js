'use strict';

const KEY                = 'ytlf_api_key';
const HIDE_HOME_KEY      = 'ytlf_hide_home';
const HIDE_SIDEBAR_KEY   = 'ytlf_hide_sidebar';
const HIDE_SHORTS_KEY    = 'ytlf_hide_shorts';
const HIDE_PLAYABLES_KEY = 'ytlf_hide_playables';
const HIDE_ENGAGEMENTS_KEY = 'ytlf_hide_engagements';
const ENABLED_KEY        = 'ytlf_enabled';
const POPUP_THEME_KEY    = 'ytlf_popup_theme'; // 'light' | 'dark' | absent = system

const toggleBtn          = document.getElementById('toggle-btn');
const section            = document.getElementById('key-section');
const input              = document.getElementById('key');
const keyStatus          = document.getElementById('key-status');
const status             = document.getElementById('status');
const extEnabledCheck    = document.getElementById('ext-enabled');
const hideHomeCheck      = document.getElementById('hide-home');
const hideSidebarCheck   = document.getElementById('hide-sidebar');
const hideShortsCheck    = document.getElementById('hide-shorts');
const hidePlayablesCheck = document.getElementById('hide-playables');
const hideEngagementsCheck = document.getElementById('hide-engagements');
const themeBtn           = document.getElementById('theme-btn');

// ── Theme ────────────────────────────────────────────────

const SVG_SUN  = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
const SVG_MOON = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

function applyTheme(theme) {
  document.documentElement.classList.remove('ytlf-light', 'ytlf-dark');
  if (theme) document.documentElement.classList.add('ytlf-' + theme);
  const isDark = theme === 'dark' ||
    (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  themeBtn.innerHTML = isDark ? SVG_SUN : SVG_MOON;
}

themeBtn.addEventListener('click', () => {
  const isDark = document.documentElement.classList.contains('ytlf-dark') ||
    (!document.documentElement.classList.contains('ytlf-light') &&
     window.matchMedia('(prefers-color-scheme: dark)').matches);
  const next = isDark ? 'light' : 'dark';
  chrome.storage.sync.set({ [POPUP_THEME_KEY]: next });
  applyTheme(next);
});

// ── Load all settings ────────────────────────────────────

chrome.storage.sync.get(
  [KEY, ENABLED_KEY, HIDE_HOME_KEY, HIDE_SIDEBAR_KEY, HIDE_SHORTS_KEY,
   HIDE_PLAYABLES_KEY, HIDE_ENGAGEMENTS_KEY, POPUP_THEME_KEY],
  (res) => {
    applyTheme(res[POPUP_THEME_KEY] || null);

    if (res[KEY]) {
      input.value = res[KEY];
      keyStatus.textContent = '✓ Key saved';
    }
    extEnabledCheck.checked    = res[ENABLED_KEY] !== false; // default on
    hideHomeCheck.checked      = !!res[HIDE_HOME_KEY];
    hideSidebarCheck.checked   = !!res[HIDE_SIDEBAR_KEY];
    hideShortsCheck.checked    = !!res[HIDE_SHORTS_KEY];
    hidePlayablesCheck.checked   = !!res[HIDE_PLAYABLES_KEY];
    hideEngagementsCheck.checked = !!res[HIDE_ENGAGEMENTS_KEY];
  }
);

// ── Toggle listeners ─────────────────────────────────────

extEnabledCheck.addEventListener('change', () => {
  chrome.storage.sync.set({ [ENABLED_KEY]: extEnabledCheck.checked });
});

hideHomeCheck.addEventListener('change', () => {
  chrome.storage.sync.set({ [HIDE_HOME_KEY]: hideHomeCheck.checked });
});

hideSidebarCheck.addEventListener('change', () => {
  chrome.storage.sync.set({ [HIDE_SIDEBAR_KEY]: hideSidebarCheck.checked });
});

hideShortsCheck.addEventListener('change', () => {
  chrome.storage.sync.set({ [HIDE_SHORTS_KEY]: hideShortsCheck.checked });
});

hidePlayablesCheck.addEventListener('change', () => {
  chrome.storage.sync.set({ [HIDE_PLAYABLES_KEY]: hidePlayablesCheck.checked });
});

hideEngagementsCheck.addEventListener('change', () => {
  chrome.storage.sync.set({ [HIDE_ENGAGEMENTS_KEY]: hideEngagementsCheck.checked });
});

// ── API key section ──────────────────────────────────────

function showStatus(msg) {
  status.textContent = msg;
  setTimeout(() => { status.textContent = ''; }, 2000);
}

toggleBtn.addEventListener('click', () => {
  const opening = section.hidden;
  section.hidden = !opening;
  toggleBtn.classList.toggle('open', opening);
  if (opening) input.focus();
});

document.getElementById('save').addEventListener('click', () => {
  const key = input.value.trim();
  if (!key) { showStatus('Enter a key first.'); return; }
  chrome.storage.sync.set({ [KEY]: key }, () => {
    keyStatus.textContent = '✓ Key saved';
    section.hidden = true;
    toggleBtn.classList.remove('open');
    showStatus('Saved.');
  });
});

document.getElementById('clear').addEventListener('click', () => {
  input.value = '';
  chrome.storage.sync.remove(KEY, () => {
    keyStatus.textContent = '';
    showStatus('Cleared.');
  });
});
