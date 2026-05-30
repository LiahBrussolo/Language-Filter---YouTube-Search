* { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Colour tokens ───────────────────────────────────────── */
:root {
  --bg:        #f2f2f2;
  --text:      #111111;
  --muted:     #888888;
  --border:    #dedede;
  --accent:    #1a73e8;
  --track-off: #cccccc;
  --hover:     rgba(0,0,0,.05);
  --red:       #cc0000;
  --shadow:    0 1px 3px rgba(0,0,0,.08);
}

@media (prefers-color-scheme: dark) {
  html:not(.ytlf-light) {
    --bg:        #000000;
    --text:      #e8e8e8;
    --muted:     #666666;
    --border:    #1e1e1e;
    --accent:    #4fa8f8;
    --track-off: #3a3a3a;
    --hover:     rgba(255,255,255,.06);
    --red:       #ff5252;
    --shadow:    none;
  }
}

html.ytlf-dark {
  --bg:        #000000;
  --text:      #e8e8e8;
  --muted:     #666666;
  --border:    #1e1e1e;
  --accent:    #4fa8f8;
  --track-off: #3a3a3a;
  --hover:     rgba(255,255,255,.06);
  --red:       #ff5252;
  --shadow:    none;
}

html.ytlf-light {
  --bg:        #f2f2f2;
  --text:      #111111;
  --muted:     #888888;
  --border:    #dedede;
  --accent:    #1a73e8;
  --track-off: #cccccc;
  --hover:     rgba(0,0,0,.05);
  --red:       #cc0000;
  --shadow:    0 1px 3px rgba(0,0,0,.08);
}

/* ── Base ────────────────────────────────────────────────── */
body {
  width: 290px;
  background: var(--bg);
  color: var(--text);
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  padding-bottom: 12px;
}

/* ── Header ──────────────────────────────────────────────── */
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 14px 12px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}

h1 {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.yt-red { color: var(--red); }

#theme-btn {
  -webkit-appearance: none;
  appearance: none;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--muted);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  border-radius: 4px;
  transition: color 0.15s;
}
#theme-btn:hover { color: var(--text); }

/* ── Power row ───────────────────────────────────────────── */
.power-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  font-weight: 600;
  border-bottom: 1px solid var(--border);
}

/* ── Feature toggles ─────────────────────────────────────── */
.toggles {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  cursor: pointer;
  user-select: none;
  font-size: 12.5px;
  border-radius: 6px;
  margin: 0 4px;
  transition: background 0.15s;
}
.toggle-row:hover { background: var(--hover); }

/* ── Switch ──────────────────────────────────────────────── */
.switch {
  position: relative;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.slider {
  position: absolute;
  inset: 0;
  background: var(--track-off);
  border-radius: 20px;
  transition: background 0.2s;
}

.slider::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  left: 3px;
  top: 3px;
  background: #ffffff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,.3);
}

.switch input:checked + .slider { background: var(--accent); }
.switch input:checked + .slider::before { transform: translateX(16px); }

/* ── API section ─────────────────────────────────────────── */
.api-section {
  margin: 8px 10px 0;
}

#toggle-btn {
  width: 100%;
  padding: 9px 14px;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  transition: background 0.15s, color 0.15s;
}
#toggle-btn:hover { background: var(--hover); }

#toggle-btn::after {
  content: '▾';
  font-size: 11px;
  flex-shrink: 0;
  transition: transform 0.15s;
}
#toggle-btn.open::after { transform: rotate(180deg); }
#toggle-btn.open {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom-color: transparent;
}

#key-status {
  font-size: 11px;
  color: var(--accent);
  margin: 5px 2px 0;
  min-height: 14px;
}

#key-section {
  background: transparent;
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 12px 14px;
}
#key-section[hidden] { display: none; }

input[type="text"] {
  width: 100%;
  padding: 7px 10px;
  background: var(--hover);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  font-family: 'Consolas', 'Courier New', monospace;
  outline: none;
  transition: border-color 0.15s;
}
input[type="text"]:focus { border-color: var(--accent); }

#actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

#actions button {
  flex: 1;
  padding: 7px;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
#actions button:hover { background: var(--hover); }

#save { color: var(--accent); font-weight: 600; }

.hint {
  font-size: 11px;
  color: var(--muted);
  margin-top: 11px;
  line-height: 1.65;
}

#status {
  font-size: 11px;
  color: var(--accent);
  margin: 7px 12px 0;
  min-height: 16px;
}
