/* ── Config ──────────────────────────────────────────── */
const API = '/api/tasks';

/* ── State ───────────────────────────────────────────── */
let tasks  = [];
let filter = 'all';
const fired = new Set(); // notified task IDs
let notificationSettings = {
  enabled: true,
  minutesBefore: 5, // notify 5 minutes before task is due
  soundEnabled: false // optional sound notification
};

// Load settings from localStorage
function loadSettings() {
  const saved = localStorage.getItem('taskr_notif_settings');
  if (saved) {
    try {
      notificationSettings = { ...notificationSettings, ...JSON.parse(saved) };
    } catch (e) {}
  }
}

function saveSettings() {
  localStorage.setItem('taskr_notif_settings', JSON.stringify(notificationSettings));
}

/* ── DOM ─────────────────────────────────────────────── */
const taskInput   = document.getElementById('task-input');
const dueInput    = document.getElementById('due-input');
const addBtn      = document.getElementById('add-btn');
const taskList    = document.getElementById('task-list');
const emptyState  = document.getElementById('empty-state');
const tabs        = document.querySelectorAll('.tab');
const statTotal   = document.getElementById('stat-total');
const statDone    = document.getElementById('stat-done');
const statPending = document.getElementById('stat-pending');
const notifBanner = document.getElementById('notif-banner');
const notifAllow  = document.getElementById('notif-allow-btn');
const notifDismiss= document.getElementById('notif-dismiss-btn');

/* ── Notifications setup ─────────────────────────────── */
function initNotifications() {
  if (!('Notification' in window)) {
    notifBanner.classList.add('hidden');
    return;
  }
  if (Notification.permission === 'granted') {
    notifBanner.classList.add('hidden');
    return;
  }
  if (Notification.permission === 'denied') {
    notifBanner.classList.add('hidden');
    return;
  }
  // permission === 'default' → show banner
  notifBanner.classList.remove('hidden');

  notifAllow.addEventListener('click', async () => {
    const perm = await Notification.requestPermission();
    notifBanner.classList.add('hidden');
    toast(perm === 'granted' ? '🔔 Notifications enabled!' : '🔕 Notifications blocked');
  });

  notifDismiss.addEventListener('click', () => {
    notifBanner.classList.add('hidden');
  });
}

function sendNotification(title, body, tag) {
  if (Notification.permission !== 'granted') return;
  const n = new Notification(title, {
    body,
    tag,
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23800fff'/%3E%3Ctext x='50%25' y='55%25' font-size='18' text-anchor='middle' dominant-baseline='middle' fill='white'%3E%E2%9C%93%3C/text%3E%3C/svg%3E",
    requireInteraction: false,
  });
  
  // Play sound if enabled
  if (notificationSettings.soundEnabled) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    
    // Create a simple alert sound (two beeps)
    for (let i = 0; i < 2; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.frequency.value = 800 + (i * 200);
      gain.gain.setValueAtTime(0.3, now + (i * 0.15));
      gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.15) + 0.15);
      
      osc.start(now + (i * 0.15));
      osc.stop(now + (i * 0.15) + 0.15);
    }
  }
  
  setTimeout(() => n.close(), 7000);
}

/* ── Due time helpers ────────────────────────────────── */
function getDueStatus(dueAt, done) {
  if (!dueAt) return null;
  const diff = new Date(dueAt).getTime() - Date.now();

  if (done)        return { cls: 'completed', label: '✓ ' + fmtDate(dueAt), diff };
  if (diff < 0)    return { cls: 'overdue',   label: '⚠ Overdue!',          diff };
  if (diff < 3600000) return { cls: 'soon',   label: '⏱ ' + fmtCountdown(diff), diff };
  return               { cls: '',             label: '⏰ ' + fmtDate(dueAt), diff };
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'
  });
}

function fmtCountdown(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s left` : `${rem}s left`;
}

/* ── Tick every second ───────────────────────────────── */
function tick() {
  // Update all due badges in DOM
  document.querySelectorAll('.due-badge[data-id]').forEach(badge => {
    const id   = parseInt(badge.dataset.id);
    const task = tasks.find(t => t.id === id);
    if (!task || !task.due_at) return;

    const st = getDueStatus(task.due_at, task.done);
    if (!st) return;

    badge.textContent = st.label;
    badge.className   = 'due-badge' + (st.cls ? ' ' + st.cls : '');

    // Update parent item overdue class
    const li = badge.closest('.task-item');
    if (li) li.classList.toggle('overdue', st.cls === 'overdue');

    if (task.done) return; // Skip notifications for completed tasks

    // Fire notification at due time (when overdue)
    if (st.diff < 0 && !fired.has(`due-${id}`)) {
      fired.add(`due-${id}`);
      const msg = `⏰ "${task.title}" is due now!`;
      sendNotification(`Task Due Now`, msg, `taskr-due-${id}`);
      toast(`⏰ "${task.title}" is due now!`);
    }

    // Fire warning at configured time before due date
    const notifyMs = notificationSettings.minutesBefore * 60 * 1000;
    if (st.diff > 0 && st.diff <= notifyMs && !fired.has(`warn-${id}`)) {
      fired.add(`warn-${id}`);
      const minLeft = Math.round(st.diff / 60000);
      const timeStr = minLeft === 1 ? '1 minute' : `${minLeft} minutes`;
      const msg = `Due in ${timeStr}`;
      sendNotification(`⚡ Due Soon: ${task.title}`, msg, `taskr-warn-${id}`);
    }
  });
}

/* ── API ─────────────────────────────────────────────── */
async function apiFetch(path, opts = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(e.error || res.statusText);
  }
  return res.status === 204 ? null : res.json();
}

async function fetchTasks() {
  tasks = await apiFetch(API);
  render();
}

async function apiAdd(title, dueAt) {
  const body = { title };
  if (dueAt) body.due_at = new Date(dueAt).toISOString();
  const task = await apiFetch(API, { method: 'POST', body: JSON.stringify(body) });
  tasks.push(task);
  render();
  toast(`✅ Added: "${task.title}"`);
}

async function apiToggle(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  const updated = await apiFetch(`${API}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ done: !t.done }),
  });
  tasks[tasks.findIndex(t => t.id === id)] = updated;
  if (!updated.done) { fired.delete(`due-${id}`); fired.delete(`warn-${id}`); }
  render();
  toast(updated.done ? `✓ Done: "${updated.title}"` : `↩ Reopened: "${updated.title}"`);
}

async function apiSetDue(id, isoStr) {
  const updated = await apiFetch(`${API}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ due_at: isoStr || '' }),
  });
  tasks[tasks.findIndex(t => t.id === id)] = updated;
  fired.delete(`due-${id}`);
  fired.delete(`warn-${id}`);
  render();
  toast(isoStr ? `⏰ Due time set for #${id}` : `🗑 Due time cleared for #${id}`);
}

async function apiDelete(id, li) {
  toast(`🗑 Deleted task #${id}`);
  li.classList.add('removing');
  li.addEventListener('animationend', async () => {
    await apiFetch(`${API}/${id}`, { method: 'DELETE' });
    tasks = tasks.filter(t => t.id !== id);
    render();
  }, { once: true });
}

/* ── Render ──────────────────────────────────────────── */
function render() {
  const visible = tasks.filter(t =>
    filter === 'done'    ? t.done :
    filter === 'pending' ? !t.done : true
  );

  taskList.innerHTML = '';
  emptyState.style.display = visible.length === 0 ? 'block' : 'none';
  visible.forEach((task, i) => taskList.appendChild(buildItem(task, i)));
  updateStats();
}

function buildItem(task, idx) {
  const li = document.createElement('li');
  const st = getDueStatus(task.due_at, task.done);
  const isOverdue = st && st.cls === 'overdue';

  li.className = [
    'task-item',
    task.done   ? 'done'    : '',
    isOverdue   ? 'overdue' : '',
  ].filter(Boolean).join(' ');
  li.dataset.id = task.id;
  li.style.animationDelay = `${idx * 35}ms`;

  const createdAt = task.created_at || '';
  const dueBadge = st
    ? `<span class="due-badge ${st.cls}" data-id="${task.id}">${st.label}</span>`
    : '';
  const dueEditBtn = `<button class="due-edit-btn" data-id="${task.id}" title="Edit due time">
      ${task.due_at ? '✏ edit' : '+ due time'}
    </button>`;

  li.innerHTML = `
    <button class="check-btn" data-id="${task.id}" aria-label="Toggle done">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="task-body">
      <div class="task-title">${escHtml(task.title)}</div>
      <div class="task-meta">
        <span class="task-id-badge">#${task.id}</span>
        <span>${createdAt}</span>
        ${dueBadge}
        ${dueEditBtn}
      </div>
    </div>
    <button class="delete-btn" data-id="${task.id}" aria-label="Delete">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M1.5 1.5l10 10M11.5 1.5l-10 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </button>
  `;

  li.querySelector('.check-btn').addEventListener('click', () => apiToggle(task.id));
  li.querySelector('.delete-btn').addEventListener('click', () => apiDelete(task.id, li));
  li.querySelector('.due-edit-btn').addEventListener('click', e => {
    e.stopPropagation();
    showInlinePicker(task, li);
  });

  return li;
}

function showInlinePicker(task, li) {
  li.querySelector('.inline-picker')?.remove();

  const wrap = document.createElement('div');
  wrap.className = 'inline-picker';

  // DateTime input section
  const pickerSection = document.createElement('div');
  pickerSection.className = 'picker-section';

  const pickerLabel = document.createElement('label');
  pickerLabel.className = 'picker-label';
  pickerLabel.textContent = 'Set due date & time:';

  const picker = document.createElement('input');
  picker.type = 'datetime-local';
  picker.className = 'datetime-input';
  if (task.due_at) picker.value = new Date(task.due_at).toISOString().slice(0, 16);

  pickerSection.append(pickerLabel, picker);

  // Notification presets section
  const notifGroup = document.createElement('div');
  notifGroup.className = 'notif-presets';

  const notifLabelEl = document.createElement('div');
  notifLabelEl.className = 'notif-label';
  notifLabelEl.textContent = '⏰ Notify me before due time:';

  const presetButtonsContainer = document.createElement('div');
  presetButtonsContainer.className = 'preset-buttons';

  const presets = [
    { minutes: 5, label: '5 min' },
    { minutes: 15, label: '15 min' },
    { minutes: 30, label: '30 min' },
    { minutes: 60, label: '1 hour' }
  ];

  presets.forEach(preset => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn';
    btn.dataset.minutes = preset.minutes;
    btn.textContent = preset.label;
    btn.title = `Get notified ${preset.label} before task is due`;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const mins = parseInt(btn.dataset.minutes);
      notificationSettings.minutesBefore = mins;
      saveSettings();
      
      // Visual feedback
      presetButtonsContainer.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      toast(`📬 Will notify ${mins} min before due time`);
    });
    
    // Highlight current setting
    if (parseInt(preset.minutes) === notificationSettings.minutesBefore) {
      btn.classList.add('active');
    }

    presetButtonsContainer.appendChild(btn);
  });

  // Sound toggle
  const soundLabel = document.createElement('label');
  soundLabel.className = 'sound-toggle';
  soundLabel.title = 'Play sound when task is due';

  const soundCheckbox = document.createElement('input');
  soundCheckbox.type = 'checkbox';
  soundCheckbox.checked = notificationSettings.soundEnabled;

  const soundSpan = document.createElement('span');
  soundSpan.textContent = '🔊';

  soundLabel.append(soundCheckbox, soundSpan);

  soundCheckbox.addEventListener('change', (e) => {
    notificationSettings.soundEnabled = e.target.checked;
    saveSettings();
    toast(e.target.checked ? '🔊 Sound enabled' : '🔇 Sound disabled');
  });

  presetButtonsContainer.appendChild(soundLabel);
  notifGroup.append(notifLabelEl, presetButtonsContainer);

  // Action buttons section
  const actionButtons = document.createElement('div');
  actionButtons.className = 'picker-actions';

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn-save';
  save.textContent = '✓ Save';
  save.title = 'Save due time and notification settings';

  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'btn-clear';
  clear.textContent = '✕ Clear';
  clear.title = 'Remove due time';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn-cancel';
  cancel.textContent = 'Cancel';
  cancel.title = 'Close without saving';

  actionButtons.append(save, clear, cancel);

  wrap.append(pickerSection, notifGroup, actionButtons);
  li.querySelector('.task-body').appendChild(wrap);
  
  // Focus and select existing time
  picker.focus();
  if (picker.value) picker.select();

  save.addEventListener('click', (e) => {
    e.preventDefault();
    if (picker.value) {
      apiSetDue(task.id, new Date(picker.value).toISOString());
    } else {
      toast('⚠ Please select a date and time');
    }
  });

  clear.addEventListener('click', (e) => {
    e.preventDefault();
    apiSetDue(task.id, '');
  });

  cancel.addEventListener('click', (e) => {
    e.preventDefault();
    wrap.remove();
  });

  // Close on Escape key
  picker.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') wrap.remove();
  });
}

function updateStats() {
  const done = tasks.filter(t => t.done).length;
  statTotal.textContent   = tasks.length;
  statDone.textContent    = done;
  statPending.textContent = tasks.length - done;
}

/* ── Events ──────────────────────────────────────────── */
async function addTask() {
  const title = taskInput.value.trim();
  if (!title) { shake(taskInput); return; }
  const due = dueInput.value || null;
  taskInput.value = '';
  dueInput.value  = '';
  if (filter !== 'all') setFilter('all');
  try { await apiAdd(title, due); }
  catch (e) { toast(`❌ ${e.message}`); }
}

function setFilter(f) {
  filter = f;
  tabs.forEach(t => t.classList.toggle('active', t.dataset.filter === f));
  render();
}

addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
tabs.forEach(t => t.addEventListener('click', () => setFilter(t.dataset.filter)));

/* ── Toast ───────────────────────────────────────────── */
let toastTmr;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTmr);
  toastTmr = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ── Shake ───────────────────────────────────────────── */
function shake(el) {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shake 0.35s ease';
  el.addEventListener('animationend', () => el.style.animation = '', { once: true });
}

document.head.insertAdjacentHTML('beforeend', `<style>
@keyframes shake {
  0%,100%{transform:translateX(0)}
  20%{transform:translateX(-6px)}
  40%{transform:translateX(6px)}
  60%{transform:translateX(-4px)}
  80%{transform:translateX(4px)}
}
</style>`);

/* ── Helpers ─────────────────────────────────────────── */
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Boot ────────────────────────────────────────────── */
loadSettings();
initNotifications();
fetchTasks().then(() => setTimeout(() => taskInput.focus(), 300));
setInterval(tick, 1000);
