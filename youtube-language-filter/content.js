'use strict';

// ISO 639-1 codes. YouTube API returns BCP-47; CLD returns its own subset.
const LANGUAGES = [
  { code: '',      label: 'All Languages' },
  { code: 'ar',    label: 'Arabic' },
  { code: 'bn',    label: 'Bengali' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
  { code: 'zh-TW', label: 'Chinese (Traditional)' },
  { code: 'cs',    label: 'Czech' },
  { code: 'da',    label: 'Danish' },
  { code: 'nl',    label: 'Dutch' },
  { code: 'en',    label: 'English' },
  { code: 'fi',    label: 'Finnish' },
  { code: 'fr',    label: 'French' },
  { code: 'de',    label: 'German' },
  { code: 'el',    label: 'Greek' },
  { code: 'gu',    label: 'Gujarati' },
  { code: 'he',    label: 'Hebrew' },
  { code: 'hi',    label: 'Hindi' },
  { code: 'hu',    label: 'Hungarian' },
  { code: 'id',    label: 'Indonesian' },
  { code: 'it',    label: 'Italian' },
  { code: 'ja',    label: 'Japanese' },
  { code: 'kn',    label: 'Kannada' },
  { code: 'ko',    label: 'Korean' },
  { code: 'ms',    label: 'Malay' },
  { code: 'ml',    label: 'Malayalam' },
  { code: 'mr',    label: 'Marathi' },
  { code: 'no',    label: 'Norwegian' },
  { code: 'fa',    label: 'Persian' },
  { code: 'pl',    label: 'Polish' },
  { code: 'pt',    label: 'Portuguese' },
  { code: 'pa',    label: 'Punjabi' },
  { code: 'ro',    label: 'Romanian' },
  { code: 'ru',    label: 'Russian' },
  { code: 'sk',    label: 'Slovak' },
  { code: 'es',    label: 'Spanish' },
  { code: 'sv',    label: 'Swedish' },
  { code: 'ta',    label: 'Tamil' },
  { code: 'te',    label: 'Telugu' },
  { code: 'th',    label: 'Thai' },
  { code: 'tr',    label: 'Turkish' },
  { code: 'uk',    label: 'Ukrainian' },
  { code: 'ur',    label: 'Urdu' },
  { code: 'vi',    label: 'Vietnamese' },
];

const LANG_KEY          = 'ytlf_lang';
const API_KEY           = 'ytlf_api_key';
const HIDE_HOME_KEY      = 'ytlf_hide_home';
const HIDE_SIDEBAR_KEY   = 'ytlf_hide_sidebar';
const HIDE_SHORTS_KEY    = 'ytlf_hide_shorts';
const HIDE_PLAYABLES_KEY = 'ytlf_hide_playables';
const MIN_TEXT_LEN = 12;   // CLD needs enough chars to be confident
const MIN_CONF     = 55;   // below this % we show the video rather than wrongly hide it
const BATCH_MS     = 50;   // debounce window to collect IDs before one API call
const THEME_KEY    = 'ytlf_theme'; // 'light' | 'dark' | absent = follow YouTube

// All YouTube renderer types we filter:
// ytd-video-renderer       → search results
// ytd-compact-video-renderer → watch page sidebar / Up Next
// ytd-rich-item-renderer   → homepage grid & subscription feed
const RENDERER_SEL = 'ytd-video-renderer, ytd-compact-video-renderer, ytd-rich-item-renderer';

// --- API key + display toggles: cached in memory, kept fresh via storage.onChanged ---

let cachedApiKey  = null;
let hideHome      = false;
let hideSidebar   = false;
let hideShorts    = false;
let hidePlayables = false;

chrome.storage.sync.get([API_KEY, HIDE_HOME_KEY, HIDE_SIDEBAR_KEY, HIDE_SHORTS_KEY, HIDE_PLAYABLES_KEY], (res) => {
  cachedApiKey  = res[API_KEY] || null;
  hideHome      = !!res[HIDE_HOME_KEY];
  hideSidebar   = !!res[HIDE_SIDEBAR_KEY];
  hideShorts    = !!res[HIDE_SHORTS_KEY];
  hidePlayables = !!res[HIDE_PLAYABLES_KEY];
  applyDisplayToggles();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes[API_KEY]) {
    cachedApiKey = changes[API_KEY].newValue || null;
    filterAll();
  }
  if (changes[HIDE_HOME_KEY]) {
    hideHome = !!changes[HIDE_HOME_KEY].newValue;
    applyDisplayToggles();
  }
  if (changes[HIDE_SIDEBAR_KEY]) {
    hideSidebar = !!changes[HIDE_SIDEBAR_KEY].newValue;
    applyDisplayToggles();
  }
  if (changes[HIDE_SHORTS_KEY]) {
    hideShorts = !!changes[HIDE_SHORTS_KEY].newValue;
    applyDisplayToggles();
  }
  if (changes[HIDE_PLAYABLES_KEY]) {
    hidePlayables = !!changes[HIDE_PLAYABLES_KEY].newValue;
    applyDisplayToggles();
  }
});

// Tag Shorts elements with data-ytlf-shorts so CSS can hide them.
// Uses title-text matching as the primary strategy — works regardless of what
// element name YouTube uses. Also covers known element types and /shorts/ links.
let shortsTagTimer = null;
function tagShorts() {
  // Known element types — walk up to the nearest section/item wrapper
  for (const sel of [
    'ytd-reel-shelf-renderer', 'ytd-rich-shelf-renderer[is-shorts]',
    'ytd-shelf-renderer[is-shorts]', 'ytd-reel-item-renderer',
    'ytd-shorts', 'yt-shorts-lockup-view-model',
  ]) {
    document.querySelectorAll(sel).forEach(el => {
      (el.closest(
        'ytd-item-section-renderer, ytd-rich-section-renderer, ytd-rich-item-renderer'
      ) ?? el).dataset.ytlfShorts = '1';
    });
  }
  // Tag item-section-renderer that directly contains a reel shelf (search results)
  document.querySelectorAll(
    'ytd-item-section-renderer:has(ytd-reel-shelf-renderer), ' +
    'ytd-item-section-renderer:has(ytd-reel-item-renderer)'
  ).forEach(el => { el.dataset.ytlfShorts = '1'; });
  // By /shorts/ URL in child links
  document.querySelectorAll('a[href^="/shorts/"]').forEach(a => {
    const c = a.closest(
      'ytd-item-section-renderer, ytd-rich-section-renderer, ' +
      'ytd-rich-item-renderer, ytd-compact-video-renderer'
    );
    if (c) c.dataset.ytlfShorts = '1';
  });
  // By heading text — catches any container YouTube names "Shorts", regardless of element type
  document.querySelectorAll(
    'ytd-item-section-renderer, ytd-rich-section-renderer, ' +
    'ytd-reel-shelf-renderer, ytd-rich-shelf-renderer, ytd-shelf-renderer'
  ).forEach(sec => {
    const text = sec.querySelector('#title, h2, yt-formatted-string, #header')?.textContent ?? '';
    if (/shorts/i.test(text)) sec.dataset.ytlfShorts = '1';
  });
}

// Tag Playables elements similarly
function tagPlayables() {
  for (const sel of ['ytd-game-card-renderer']) {
    document.querySelectorAll(sel).forEach(el => {
      (el.closest('ytd-rich-section-renderer, ytd-rich-item-renderer') ?? el)
        .dataset.ytlfPlayables = '1';
    });
  }
  document.querySelectorAll('ytd-rich-section-renderer').forEach(sec => {
    const text = sec.querySelector('#title, h2, yt-formatted-string')?.textContent ?? '';
    if (/playable/i.test(text)) sec.dataset.ytlfPlayables = '1';
  });
}

function applyDisplayToggles() {
  document.body?.classList.toggle('ytlf-hide-home',      hideHome);
  document.body?.classList.toggle('ytlf-hide-sidebar',   hideSidebar);
  document.body?.classList.toggle('ytlf-hide-shorts',    hideShorts);
  document.body?.classList.toggle('ytlf-hide-playables', hidePlayables);
  if (hideShorts)    tagShorts();
  if (hidePlayables) tagPlayables();
}

// --- Language helpers ---

function getLang() { return localStorage.getItem(LANG_KEY) ?? ''; }
function setLang(code) { localStorage.setItem(LANG_KEY, code); }

// --- Theme ---

function ytIsDark() { return document.documentElement.hasAttribute('dark'); }

function resolveTheme() {
  return localStorage.getItem(THEME_KEY) ?? (ytIsDark() ? 'dark' : 'light');
}

function applyTheme(widget, theme) {
  widget.dataset.theme = theme;
  const btn = widget.querySelector('#ytlf-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀' : '🌙';
}

// Follow YouTube's own theme switch when the user hasn't picked one manually
new MutationObserver(() => {
  if (localStorage.getItem(THEME_KEY)) return;
  const w = document.getElementById('ytlf');
  if (w) applyTheme(w, ytIsDark() ? 'dark' : 'light');
}).observe(document.documentElement, { attributes: true, attributeFilter: ['dark'] });

// YouTube API returns BCP-47 (e.g. "zh-Hans", "en-US"). Normalise to our codes.
function normaliseApiLang(lang) {
  if (!lang) return null;
  if (lang.startsWith('zh-Hans')) return 'zh-CN';
  if (lang.startsWith('zh-Hant')) return 'zh-TW';
  return lang.split('-')[0];
}

function isApiMatch(apiLang, selected) {
  const n = normaliseApiLang(apiLang);
  return n === selected || (n === 'zh' && (selected === 'zh-CN' || selected === 'zh-TW'));
}

// CLD returns 'zh' for both Simplified and Traditional.
function isCldMatch(detected, selected) {
  return detected === selected ||
    (detected === 'zh' && (selected === 'zh-CN' || selected === 'zh-TW'));
}

// Returns false when the extension has been reloaded and this content script
// is now an orphan — chrome APIs are gone but the script is still running.
function isContextValid() {
  try { return !!chrome.runtime?.id; }
  catch { return false; }
}

// Pages where we actively filter renderers.
function isFilteredPage() {
  const p = window.location.pathname;
  return p === '/results' || p === '/watch' || p === '/' || p.startsWith('/feed/');
}

// --- Badge language: read YouTube's own language indicator from the video card ---
// YouTube renders a language badge (e.g. "English", "Dutch") directly in the DOM
// for videos that have language metadata set. This is more accurate than CLD because
// it reflects the actual audio language, not just the title text.

// Build a lookup: lowercase label → code  (e.g. "dutch" → "nl")
const LABEL_TO_CODE = Object.fromEntries(
  LANGUAGES.filter(l => l.code).map(l => [l.label.toLowerCase(), l.code])
);

function getBadgeLangCode(renderer) {
  // Try the selectors YouTube has used across versions, newest first.
  // We use our LANGUAGES list as an allowlist so we never mistake "4K" / "CC" for a language.
  const els = renderer.querySelectorAll(
    '.badge-shape-wiz__text, ' +               // YouTube ≥ 2024
    'ytd-badge-supported-renderer span, ' +    // mid-era
    'ytd-badge-supported-renderer p'           // older
  );
  for (const el of els) {
    const code = LABEL_TO_CODE[el.textContent.trim().toLowerCase()];
    if (code) return code;
  }
  return null; // no language badge found on this card
}

// --- Text detection (used when no API key, or when creator hasn't set a language) ---

function filterByText(renderer) {
  if (!isContextValid()) { renderer.style.display = ''; return; }

  const lang = getLang(); // capture for async callback

  // 1. Try YouTube's own badge — handles "Dutch title, English video" correctly.
  const badgeCode = getBadgeLangCode(renderer);
  if (badgeCode !== null) {
    renderer.style.display = (badgeCode === lang) ? '' : 'none';
    return;
  }

  // 2. No badge present — fall back to CLD on title + snippet text.
  const title   = renderer.querySelector('#video-title')?.textContent?.trim() ?? '';
  const snippet = renderer.querySelector('#description-text')?.textContent?.trim() ?? '';
  const text    = title.length >= MIN_TEXT_LEN ? title : `${title} ${snippet}`.trim();
  if (!text) return;

  try {
    chrome.i18n.detectLanguage(text, ({ languages }) => {
      const top = languages?.[0];
      // Renderer was pre-hidden by queueRenderer. Uncertain = show (benefit of doubt).
      if (!top || top.percentage < MIN_CONF) { renderer.style.display = ''; return; }
      renderer.style.display = isCldMatch(top.language, lang) ? '' : 'none';
    });
  } catch {
    renderer.style.display = ''; // context gone mid-call — reveal rather than hide
  }
}

// --- YouTube API: videos.list, 1 unit per call, batched up to 50 IDs ---

async function fetchMetadata(ids) {
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part',   'snippet');
  url.searchParams.set('id',     ids.join(','));
  url.searchParams.set('fields', 'items(id,snippet(defaultLanguage,defaultAudioLanguage))');
  url.searchParams.set('key',    cachedApiKey);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  return res.json();
}

// --- Translation via Google Translate (no key required) ---

async function translateQuery(text, targetLang) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'auto');       // auto-detect source language
  url.searchParams.set('tl', targetLang);   // our codes match Google's (zh-CN, zh-TW, etc.)
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`translate ${res.status}`);
  const data = await res.json();
  // Response: [[[translatedChunk, original], ...], ...]
  return data[0].map(chunk => chunk[0]).join('');
}

function getVideoId(renderer) {
  const a = renderer.querySelector('a#video-title');
  if (!a?.href) return null;
  try { return new URL(a.href).searchParams.get('v'); }
  catch { return null; }
}

// --- Batch queue ---

const pending = new Map(); // videoId → Set<Element>
let flushTimer = null;

function scheduleFlush() {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, BATCH_MS);
}

async function flush() {
  const lang = getLang();
  if (!lang || pending.size === 0) { pending.clear(); return; }

  const batch = new Map(pending);
  pending.clear();

  // No API key: text detection for everything in this batch
  if (!cachedApiKey) {
    for (const renderers of batch.values()) renderers.forEach(filterByText);
    return;
  }

  // Split into chunks of 50 (API limit per request)
  const ids = [...batch.keys()];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    try {
      const data     = await fetchMetadata(chunk);
      const returned = new Set();

      for (const item of (data.items ?? [])) {
        returned.add(item.id);
        // defaultAudioLanguage = the original audio track language (excludes AI dubs)
        const apiLang   = item.snippet.defaultAudioLanguage || item.snippet.defaultLanguage;
        const renderers = batch.get(item.id) ?? new Set();

        if (!apiLang) {
          // Creator never set a language — text detection is the best we can do
          renderers.forEach(filterByText);
        } else {
          const match = isApiMatch(apiLang, lang);
          renderers.forEach(r => { r.style.display = match ? '' : 'none'; });
        }
      }

      // IDs the API didn't return (private, deleted, embargoed)
      for (const [id, renderers] of batch) {
        if (!returned.has(id)) renderers.forEach(filterByText);
      }
    } catch {
      // API error: fall back to text detection for this chunk only
      for (const id of chunk) (batch.get(id) ?? new Set()).forEach(filterByText);
    }
  }
}

// --- Main entry point per renderer ---

function queueRenderer(renderer) {
  const lang = getLang();
  if (!lang) { renderer.style.display = ''; return; }

  // Hide immediately — prevents the "flash then disappear" blink.
  // flush() / filterByText() will reveal videos that match.
  renderer.style.display = 'none';

  const id = getVideoId(renderer);
  if (!id) { filterByText(renderer); return; } // no ID (rare) → text detection

  if (!pending.has(id)) pending.set(id, new Set());
  pending.get(id).add(renderer);
  scheduleFlush();
}

function filterAll() {
  pending.clear();
  clearTimeout(flushTimer);
  document.querySelectorAll(RENDERER_SEL).forEach(queueRenderer);
  if (pending.size > 0) scheduleFlush();
}

// --- Widget ---

function buildWidget() {
  const wrapper = document.createElement('div');
  wrapper.id = 'ytlf';

  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Filter by language');

  for (const { code, label } of LANGUAGES) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = label;
    select.appendChild(opt);
  }

  select.value = getLang();
  select.addEventListener('change', async () => {
    const newLang = select.value;
    setLang(newLang);

    // Translate the search query into the new language, then re-search
    if (newLang && window.location.pathname === '/results') {
      const currentUrl = new URL(window.location.href);
      const query = currentUrl.searchParams.get('search_query') ?? '';

      if (query) {
        select.disabled = true; // prevent double-fire while awaiting
        try {
          const translated = await translateQuery(query, newLang);
          if (getLang() !== newLang) return; // language changed while translating
          if (translated && translated !== query) {
            currentUrl.searchParams.set('search_query', translated);
            window.location.assign(currentUrl.toString());
            return; // yt-navigate-finish will call filterAll() after navigation
          }
        } catch {
          // translation failed — fall through to filterAll with original query
        } finally {
          select.disabled = false;
        }
      }
    }

    filterAll();
  });

  const toggle = document.createElement('button');
  toggle.id = 'ytlf-toggle';
  toggle.title = 'Toggle light / dark';
  toggle.addEventListener('click', () => {
    const next = wrapper.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(wrapper, next);
  });

  wrapper.appendChild(select);
  wrapper.appendChild(toggle);

  applyTheme(wrapper, resolveTheme());
  return wrapper;
}

function injectWidget() {
  if (document.getElementById('ytlf')) return;
  const center = document.querySelector('#center');
  if (!center) return;
  center.appendChild(buildWidget());
}

// --- MutationObserver: catches renderers added by infinite scroll ---

const observer = new MutationObserver((mutations) => {
  if (!isContextValid()) { observer.disconnect(); return; }

  // Shorts/Playables scanner runs on any page — debounced to avoid thrashing
  if (hideShorts || hidePlayables) {
    clearTimeout(shortsTagTimer);
    shortsTagTimer = setTimeout(() => {
      if (hideShorts)    tagShorts();
      if (hidePlayables) tagPlayables();
    }, 150);
  }

  if (!getLang() || !isFilteredPage()) return;
  for (const { addedNodes } of mutations) {
    for (const node of addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (node.matches(RENDERER_SEL)) {
        queueRenderer(node);
      } else {
        node.querySelectorAll(RENDERER_SEL).forEach(queueRenderer);
      }
    }
  }
});

// --- Force original audio track when language filter is active ---

// Returns 'stop' when done (or nothing to do), 'retry' when tracks aren't ready yet.
// Strategy: ONLY select tracks that YouTube explicitly labels "original"
// (e.g. "Russian original", "Italian original"). Never infer from absence of "dubbed" —
// that incorrectly matches auto-dubbed tracks like "English (US)" whose displayName
// contains no "dubbed" text, causing the extension to actively select the wrong track.
function switchToOriginalAudio() {
  if (!isContextValid() || !getLang()) return 'stop';
  if (window.location.pathname !== '/watch') return 'stop';

  const player = document.querySelector('#movie_player');
  if (typeof player?.getAvailableAudioTracks !== 'function') return 'retry';

  const tracks = player.getAvailableAudioTracks();
  if (!tracks?.length) return 'retry';

  // Find a track explicitly labeled "original" by YouTube
  const original = tracks.find(t => (t.displayName ?? '').toLowerCase().includes('original'));

  if (!original) {
    // Single track with no "original" label → YouTube may still be loading tracks
    // Multiple tracks with no "original" label → single-language video, nothing to do
    return tracks.length === 1 ? 'retry' : 'stop';
  }

  if (typeof player.setAudioTrack === 'function') {
    player.setAudioTrack(original);
  }
  return 'stop';
}

// Single timer — prevents multiple concurrent retry chains from piling up
// when yt-page-data-updated fires several times during page load.
let audioTimer = null;

// Faster early retries to catch the track before YouTube auto-selects dubbed audio.
const AUDIO_RETRY_MS = [100, 200, 300, 500, 1000, 1000, 1500, 2000, 2000, 2000];

function scheduleAudioSwitch(attempt = 0) {
  if (!isContextValid() || !getLang()) return;
  if (window.location.pathname !== '/watch') return;
  if (attempt >= AUDIO_RETRY_MS.length) return;

  if (switchToOriginalAudio() === 'retry') {
    clearTimeout(audioTimer);
    audioTimer = setTimeout(() => scheduleAudioSwitch(attempt + 1), AUDIO_RETRY_MS[attempt]);
  }
}

// Re-run on every YouTube data update (covers autoplay-next and mid-session track changes)
document.addEventListener('yt-page-data-updated', () => scheduleAudioSwitch(0));

// --- Search query language enforcement ---

// When the user types a new query in the search bar without touching the language
// dropdown, the query arrives untranslated. This function detects that mismatch and
// translates before filterAll() runs, so the results are in the selected language.
// Returns true if navigation was triggered (caller must not call filterAll yet).

// Stores the translated query we just navigated to so the next init() call can
// recognise it and skip translation — preventing an infinite redirect loop.
let lastAutoTranslatedQuery = null;

async function ensureQueryInLang(lang) {
  const url   = new URL(window.location.href);
  const query = url.searchParams.get('search_query') ?? '';
  if (!query) return false;

  // Break the loop: we just landed on the page we translated to — stop here.
  if (query === lastAutoTranslatedQuery) {
    lastAutoTranslatedQuery = null;
    return false;
  }

  // If CLD is confident the query is already in the target language, skip translation.
  const alreadyInLang = await new Promise(resolve => {
    if (!isContextValid()) { resolve(true); return; }
    chrome.i18n.detectLanguage(query, ({ languages }) => {
      const top = languages?.[0];
      resolve(!!(top && top.percentage >= MIN_CONF && isCldMatch(top.language, lang)));
    });
  });
  if (alreadyInLang) return false;

  // Query is not confidently in the target language — translate and re-navigate.
  try {
    const translated = await translateQuery(query, lang);
    if (translated && translated !== query && getLang() === lang) {
      lastAutoTranslatedQuery = translated; // remember where we're going
      url.searchParams.set('search_query', translated);
      window.location.assign(url.toString());
      return true; // navigation started; init() will run again after landing
    }
  } catch { /* translation failed — fall through to filterAll */ }
  return false;
}

// --- init ---

async function init() {
  injectWidget();
  applyDisplayToggles();

  // On the results page, ensure the query matches the selected language before filtering.
  if (window.location.pathname === '/results') {
    const lang = getLang();
    if (lang && await ensureQueryInLang(lang)) return; // redirecting — don't filter yet
  }

  if (isFilteredPage()) filterAll();
  if (window.location.pathname === '/watch') scheduleAudioSwitch();
}

document.addEventListener('yt-navigate-finish', init);
observer.observe(document.body, { childList: true, subtree: true });
init();
