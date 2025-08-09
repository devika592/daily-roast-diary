/**
 * Fixed & retyped JavaScript for:
 * - saveEntry() (roasts + leaderboard)
 * - eraseEntry() (clears textarea)
 * - History (store & delete per-item)
 * - Reminder (modal + scheduling + notifications)
 *
 * This script is defensive: it will create missing UI containers (history modal, leaderboard container, roast display)
 * so the features work even if HTML is slightly different.
 */

/* ---------- Helper DOM bootstrap (create missing containers) ---------- */
(function bootstrapUI() {
  // Ensure textarea exists
  if (!document.getElementById('entry')) {
    const ta = document.createElement('textarea');
    ta.id = 'entry';
    ta.placeholder = 'Write your one-paragraph roast (<= 30 words)...';
    document.body.prepend(ta);
  }

  // Roast display element
  if (!document.getElementById('roast')) {
    const roastDiv = document.createElement('div');
    roastDiv.id = 'roast';
    roastDiv.style.marginTop = '12px';
    document.body.appendChild(roastDiv);
  }

  // Leaderboard section
  if (!document.getElementById('leaderboardList')) {
    const wrapper = document.createElement('div');
    wrapper.style.marginTop = '12px';
    wrapper.innerHTML = `<h3>Roast Leaderboard</h3><ul id="leaderboardList" class="list"></ul>`;
    document.body.appendChild(wrapper);
  }

  // If History button not present, create a small control bar
  if (!document.getElementById('saveBtn') && !document.querySelector('[data-controls-added]')) {
    const controls = document.createElement('div');
    controls.dataset.controlsAdded = 'true';
    controls.style.display = 'flex';
    controls.style.gap = '8px';
    controls.style.marginTop = '12px';

    const saveBtn = document.createElement('button');
    saveBtn.id = 'saveBtn';
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save';

    const eraseBtn = document.createElement('button');
    eraseBtn.id = 'eraseBtn';
    eraseBtn.className = 'btn btn-ghost';
    eraseBtn.textContent = 'Erase';

    const historyBtn = document.createElement('button');
    historyBtn.id = 'historyBtn';
    historyBtn.className = 'btn btn-ghost';
    historyBtn.textContent = 'History';

    const reminderBtn = document.createElement('button');
    reminderBtn.id = 'reminderBtn';
    reminderBtn.className = 'btn btn-ghost';
    reminderBtn.textContent = 'Reminder';

    controls.append(saveBtn, eraseBtn, historyBtn, reminderBtn);
    document.getElementById('entry').after(controls);
  }
})();

/* ---------- Utility helpers ---------- */
function showToast(msg, ms = 1800) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

function safeSpeak(text, lang = 'en-US') {
  if (!text) return;
  try {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      // cancel queued speech to keep voice snappy
      if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  } catch (e) { /* ignore speech errors */ }
}

function showFloatingRoast(text) {
  const d = document.createElement('div');
  d.className = 'floating-roast';
  d.textContent = text;
  // starting position: random x near bottom
  const left = Math.max(8, Math.random() * (window.innerWidth - 200));
  d.style.left = `${left}px`;
  d.style.top = `${window.innerHeight - 120}px`;
  document.body.appendChild(d);

  // trigger float up effect: translateY(-70px) + fade
  requestAnimationFrame(() => {
    d.style.transform = 'translateY(-70px)';
    d.style.opacity = '0';
  });

  setTimeout(() => d.remove(), 1900);
}

/* ---------- LocalStorage keys ---------- */
const HISTORY_KEY = 'entryHistory_v1';
const ROASTS_KEY = 'roastHistory_v1';
const REMINDERS_KEY = 'reminders_v1';

/* ---------- Core roast + history logic ---------- */
window.saveEntry = function saveEntry() {
  const entryEl = document.getElementById('entry');
  if (!entryEl) return showToast('No entry box found.');

  const entry = entryEl.value.trim();
  if (!entry) {
    alert('Write something first!');
    return;
  }

  // count words robustly
  const words = entry.split(/\s+/).filter(w => w.length);
  if (words.length > 30) {
    safeSpeak("That's enough for today");
    showToast("Limit: 30 words. Trim a bit.");
    return;
  }

  // boring detection
  const lower = entry.toLowerCase();
  if (lower.includes("i'm bored") || lower.includes('i am bored') || lower.includes('bored')) {
    alert('Go touch grass 🌱 or roast a friend!');
  }

  const roasts = [
    "Wow, what an achievement. Truly inspirational.",
    "That was a brave paragraph... for a 3-year-old.",
    "You're writing like you're getting paid in yawns.",
    "Plot twist: your diary roasted itself.",
    "This made my eyes roll into next week.",
    "Spicy? No. Lukewarm tea at best.",
    "Congratulations. You wasted pixels.",
    "This diary entry should come with a snooze button.",
    "If I had a rupee for every bad sentence...",
    "That was deep… like a puddle.",
    "This belongs in the Museum of Mediocrity.",
    "Even autocorrect gave up halfway.",
    "Your words are like WiFi in a train — weak and unstable."
  ];

  // split sentences (keeps punctuation)
  const rawSentences = entry.match(/[^.!?]+[.!?]*/g) || [entry];

  let finalText = '';
  rawSentences.forEach(sentence => {
    const s = sentence.trim();
    if (!s) return;
    const roast = roasts[Math.floor(Math.random() * roasts.length)];
    finalText += s + ' ' + roast + ' ';
    safeSpeak(roast);
    showFloatingRoast(roast);
    addToRoastHistory(roast);
  });

  document.getElementById('roast').textContent = finalText.trim();

  // save original entry to history
  addToHistory(entry);

  // refresh displays
  displayHistory(); // in case modal open
  displayLeaderboard();

  showToast('Saved — roasted!');
};

/* ---------- Erase ---------- */
window.eraseEntry = function eraseEntry() {
  const entryEl = document.getElementById('entry');
  if (!entryEl) return showToast('No entry box found.');
  entryEl.value = '';
  entryEl.focus();
  showToast('Erased.');
};

/* ---------- HISTORY functions ---------- */
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function setHistory(arr) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
}

window.addToHistory = function addToHistory(text) {
  const history = getHistory();
  history.unshift({ text, at: new Date().toISOString() }); // newest first
  setHistory(history);
};

window.deleteHistoryItem = function deleteHistoryItem(index) {
  const history = getHistory();
  if (index < 0 || index >= history.length) return;
  history.splice(index, 1);
  setHistory(history);
  displayHistory();
};

window.clearAllHistory = function clearAllHistory() {
  if (!confirm('Delete all history?')) return;
  setHistory([]);
  displayHistory();
};

window.createHistoryModalIfMissing = function createHistoryModalIfMissing() {
  if (document.getElementById('historyBackdrop')) return;
  const backdrop = document.createElement('div');
  backdrop.id = 'historyBackdrop';
  backdrop.className = 'modal-backdrop';
  backdrop.style.display = 'none';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h2>Past Roasts / Entries</h2>
      <div>
        <button id="closeHistory" class="btn btn-ghost">Close</button>
      </div>
    </div>
    <div style="margin-top:12px;">
      <button id="deleteAllHistory" class="btn btn-danger">Delete All</button>
      <div style="margin-top:12px;">
        <ul id="historyList" class="list"></ul>
      </div>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  document.getElementById('closeHistory').addEventListener('click', toggleHistory);
  document.getElementById('deleteAllHistory').addEventListener('click', clearAllHistory);
}

window.toggleHistory = function toggleHistory() {
  createHistoryModalIfMissing();
  const backdrop = document.getElementById('historyBackdrop');
  if (!backdrop) return;
  const isHidden = backdrop.style.display === 'none' || getComputedStyle(backdrop).display === 'none';
  backdrop.style.display = isHidden ? 'flex' : 'none';
  if (isHidden) displayHistory();
};

window.displayHistory = function displayHistory() {
  createHistoryModalIfMissing();
  const list = document.getElementById('historyList');
  list.innerHTML = '';
  const history = getHistory();
  if (!history.length) {
    const li = document.createElement('li');
    li.className = 'small-muted';
    li.textContent = 'No saved entries yet.';
    list.appendChild(li);
    return;
  }
  history.forEach((h, idx) => {
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.style.flex = '1';

    const textP = document.createElement('div');
    textP.textContent = h.text;

    const meta = document.createElement('div');
    meta.className = 'small-muted';
    try {
      const d = new Date(h.at);
      meta.textContent = d.toLocaleString();
    } catch { meta.textContent = ''; }

    left.appendChild(textP);
    left.appendChild(meta);

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.gap = '8px';

    const del = document.createElement('button');
    del.className = 'btn btn-danger';
    del.textContent = 'Delete';
    del.addEventListener('click', () => {
      // compute index as stored: our history is newest-first; display index as is
      deleteHistoryItem(idx);
    });

    right.appendChild(del);
    li.appendChild(left);
    li.appendChild(right);
    list.appendChild(li);
  });
};

/* ---------- ROAST LEADERBOARD (competition) ---------- */
function getRoastHistory() {
  try {
    return JSON.parse(localStorage.getItem(ROASTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function setRoastHistory(arr) {
  localStorage.setItem(ROASTS_KEY, JSON.stringify(arr));
}

function addToRoastHistory(roast) {
  const arr = getRoastHistory();
  arr.push(roast);
  setRoastHistory(arr);
}

window.displayLeaderboard = function displayLeaderboard() {
  const container = document.getElementById('leaderboardList');
  if (!container) return;
  container.innerHTML = '';

  const arr = getRoastHistory();
  if (!arr.length) {
    const li = document.createElement('li');
    li.className = 'small-muted';
    li.textContent = 'No roasts yet — write one!';
    container.appendChild(li);
    return;
  }

  // compute frequencies
  const freq = arr.reduce((m, r) => { m[r] = (m[r] || 0) + 1; return m; }, {});
  const ranked = Object.keys(freq).map(r => ({ roast: r, count: freq[r] }))
    .sort((a,b) => b.count - a.count);

  ranked.forEach((item, i) => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';
    li.innerHTML = `<div><strong>#${i+1}</strong> ${item.roast}</div><div class="small-muted">${item.count} pts</div>`;
    container.appendChild(li);
  });
};

/* ---------- REMINDERS ---------- */
window.createReminderModalIfMissing = function createReminderModalIfMissing() {
  if (document.getElementById('reminderBackdrop')) return;
  const backdrop = document.createElement('div');
  backdrop.id = 'reminderBackdrop';
  backdrop.className = 'modal-backdrop';
  backdrop.style.display = 'none';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h2>Set a Reminder</h2>
      <div>
        <button id="closeReminder" class="btn btn-ghost">Close</button>
      </div>
    </div>
    <div style="margin-top:12px; display:flex; gap:8px; flex-direction:column;">
      <label>Reminder text</label>
      <input id="reminderText" placeholder="Roast reminder..." />
      <label>When (date & time)</label>
      <input id="reminderTime" type="datetime-local"/>
      <div class="modal-actions">
        <button id="setReminderBtn" class="btn btn-primary">Set Reminder</button>
        <button id="cancelReminderBtn" class="btn btn-ghost">Cancel</button>
      </div>
      <div style="margin-top:10px;">
        <h4>Upcoming reminders</h4>
        <ul id="reminderList" class="list"></ul>
      </div>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  document.getElementById('closeReminder').addEventListener('click', toggleReminderModal);
  document.getElementById('setReminderBtn').addEventListener('click', handleSetReminder);
  document.getElementById('cancelReminderBtn').addEventListener('click', toggleReminderModal);
};

window.toggleReminderModal = function toggleReminderModal() {
  createReminderModalIfMissing();
  const bd = document.getElementById('reminderBackdrop');
  const isHidden = bd.style.display === 'none' || getComputedStyle(bd).display === 'none';
  bd.style.display = isHidden ? 'flex' : 'none';
  if (isHidden) displayReminders();
};

function getReminders() {
  try { return JSON.parse(localStorage.getItem(REMINDERS_KEY) || '[]'); } catch { return []; }
}
function setReminders(arr) { localStorage.setItem(REMINDERS_KEY, JSON.stringify(arr)); }

function scheduleReminder(rem) {
  const delay = new Date(rem.at).getTime() - Date.now();
  if (delay <= 0) return; // past reminder
  // setTimeout limited, but acceptable for short times.
  rem._timeoutId = setTimeout(() => {
    notifyReminder(rem);
    // remove or mark fired
    const rs = getReminders().filter(r => r.id !== rem.id);
    setReminders(rs);
    displayReminders();
    displayLeaderboard();
  }, Math.min(delay, 2147483647));
}

function notifyReminder(rem) {
  // Notification API
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification('Diary Reminder', { body: rem.text || 'Time for your roast!' });
  } else if ("Notification" in window && Notification.permission !== "denied") {
    Notification.requestPermission().then(p => {
      if (p === 'granted') new Notification('Diary Reminder', { body: rem.text || 'Time for your roast!' });
      else alert(rem.text || 'Reminder!');
    });
  } else {
    // fallback
    alert(rem.text || 'Reminder!');
  }
  safeSpeak(rem.text || 'Reminder!');
}

function displayReminders() {
  createReminderModalIfMissing();
  const list = document.getElementById('reminderList');
  list.innerHTML = '';
  const arr = getReminders().sort((a,b) => new Date(a.at) - new Date(b.at));
  if (!arr.length) {
    const li = document.createElement('li');
    li.className = 'small-muted';
    li.textContent = 'No upcoming reminders.';
    list.appendChild(li);
    return;
  }
  arr.forEach((r, idx) => {
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.style.flex = '1';
    const txt = document.createElement('div');
    txt.textContent = r.text;
    const meta = document.createElement('div');
    meta.className = 'small-muted';
    meta.textContent = new Date(r.at).toLocaleString();
    left.appendChild(txt);
    left.appendChild(meta);

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.gap = '8px';
    const del = document.createElement('button');
    del.className = 'btn btn-danger';
    del.textContent = 'Delete';
    del.addEventListener('click', () => {
      const arr2 = getReminders().filter(x => x.id !== r.id);
      setReminders(arr2);
      displayReminders();
    });
    right.appendChild(del);
    li.appendChild(left);
    li.appendChild(right);
    list.appendChild(li);
  });
}

function handleSetReminder() {
  const text = (document.getElementById('reminderText')||{}).value || 'Diary Reminder';
  const atRaw = (document.getElementById('reminderTime')||{}).value;
  if (!atRaw) return alert('Pick a future date & time.');
  const at = new Date(atRaw);
  if (isNaN(at.getTime()) || at.getTime() <= Date.now()) return alert('Pick a valid future time.');

  const rem = { id: 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2,6), text, at: at.toISOString() };
  const arr = getReminders();
  arr.push(rem);
  setReminders(arr);
  scheduleReminder(rem);
  displayReminders();
  toggleReminderModal(); // close
  showToast('Reminder set!');
}

/* ---------- page load: attach listeners and schedule existing reminders ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // wire up buttons if they exist by id
  document.getElementById('saveBtn')?.addEventListener('click', saveEntry);
  document.getElementById('eraseBtn')?.addEventListener('click', eraseEntry);
  document.getElementById('historyBtn')?.addEventListener('click', toggleHistory);
  document.getElementById('reminderBtn')?.addEventListener('click', toggleReminderModal);

  // also attach to elements that use onclick attributes (keeps global functions for them)
  window.saveEntry = window.saveEntry;
  window.eraseEntry = window.eraseEntry;
  window.toggleHistory = window.toggleHistory;
  window.toggleReminderModal = window.toggleReminderModal;

  // display leaderboard and history if any
  displayLeaderboard();

  // schedule any pending reminders
  const reminders = getReminders();
  reminders.forEach(r => {
    try { scheduleReminder(r); } catch(e){ console.error('reminder schedule err', e); }
  });
});
