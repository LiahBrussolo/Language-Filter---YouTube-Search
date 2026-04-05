'use strict';

const KEY                = 'ytlf_api_key';
const HIDE_HOME_KEY      = 'ytlf_hide_home';
const HIDE_SIDEBAR_KEY   = 'ytlf_hide_sidebar';
const HIDE_SHORTS_KEY    = 'ytlf_hide_shorts';
const HIDE_PLAYABLES_KEY = 'ytlf_hide_playables';

const toggleBtn          = document.getElementById('toggle-btn');
const section            = document.getElementById('key-section');
const input              = document.getElementById('key');
const keyStatus          = document.getElementById('key-status');
const status             = document.getElementById('status');
const hideHomeCheck      = document.getElementById('hide-home');
const hideSidebarCheck   = document.getElementById('hide-sidebar');
const hideShortsCheck    = document.getElementById('hide-shorts');
const hidePlayablesCheck = document.getElementById('hide-playables');

// Load all settings
chrome.storage.sync.get([KEY, HIDE_HOME_KEY, HIDE_SIDEBAR_KEY, HIDE_SHORTS_KEY, HIDE_PLAYABLES_KEY], (res) => {
  if (res[KEY]) {
    input.value = res[KEY];
    keyStatus.textContent = '✓ Key saved';
  }
  hideHomeCheck.checked      = !!res[HIDE_HOME_KEY];
  hideSidebarCheck.checked   = !!res[HIDE_SIDEBAR_KEY];
  hideShortsCheck.checked    = !!res[HIDE_SHORTS_KEY];
  hidePlayablesCheck.checked = !!res[HIDE_PLAYABLES_KEY];
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

function showStatus(msg) {
  status.textContent = msg;
  setTimeout(() => { status.textContent = ''; }, 2000);
}

// Toggle field open / closed
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
