// ============ State ============
const STORAGE_KEYS = {
  locations: 'loclog_locations',
  log: 'loclog_log',
  settings: 'loclog_settings'
};

let locations = [];
let locationLog = [];
let lastLog = '';

let settings = {
  SPLIT_LOG_BUTTONS: false,
  ASK_PAX_COUNT: false,
  SHOW_LAST_LOG: true
};
let pendingLog = null; // Stores pending log when waiting for pax count

// ============ Storage ============
function loadLocations() {
  console.log('loadLocations');
  try {
    const data = localStorage.getItem(STORAGE_KEYS.locations);
    locations = data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load locations:', e);
    locations = [];
  }
}

function saveLocations() {
  console.log('saveLocations');
  try {
    localStorage.setItem(STORAGE_KEYS.locations, JSON.stringify(locations));
  } catch (e) {
    console.error('Failed to save locations:', e);
  }
}

function loadLog() {
  console.log('loadLog');
  try {
    const data = localStorage.getItem(STORAGE_KEYS.log);
    locationLog = data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load log:', e);
    locationLog = [];
  }
}

function saveLog() {
  console.log('saveLog');
  try {
    localStorage.setItem(STORAGE_KEYS.log, JSON.stringify(locationLog));
  } catch (e) {
    console.error('Failed to save log:', e);
  }
}

// ============ Settings ============
function loadSettings() {
  console.log('loadSettings');
  try {
    const data = localStorage.getItem(STORAGE_KEYS.settings);
    if (data) {
      const saved = JSON.parse(data);
      settings = { ...settings, ...saved };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

function saveSettings() {
  console.log('saveSettings');
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

function renderSettingsScreen() {
  console.log('renderSettingsScreen');
  const splitToggle = document.getElementById('setting-split-buttons');
  splitToggle.checked = settings.SPLIT_LOG_BUTTONS;

  const paxToggle = document.getElementById('setting-pax-count');
  paxToggle.checked = settings.ASK_PAX_COUNT;

  const lastLogToggle = document.getElementById('setting-last-log');
  lastLogToggle.checked = settings.SHOW_LAST_LOG;
}

function toggleSetting(key, value) {
  console.log('toggleSetting', key, value);
  settings[key] = value;
  saveSettings();
  if (key === 'SPLIT_LOG_BUTTONS') {
    // renderMainScreen();
  }
}

// ============ Navigation ============
function showScreen(screenId) {
  console.log('showScreen', screenId);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));

  document.getElementById(screenId + '-screen').classList.add('active');
  document.querySelector(`nav button[data-screen="${screenId}"]`).classList.add('active');

  // Re-render on screen switch
  if (screenId === 'main') renderMainScreen();
  if (screenId === 'manage') renderManageScreen();
  if (screenId === 'log') renderLogScreen();
  if (screenId === 'settings') renderSettingsScreen();
}

// ============ Log Screen ============
function renderMainScreen() {
  console.log('renderMainScreen');

  const log = document.getElementById('last-log');
  log.textContent = '';
  log.style.display = 'none';

  if(settings.SHOW_LAST_LOG) {
    log.textContent = getLastLog();
    log.style.display = 'block';
  }

  const grid = document.getElementById('locations-grid');
  const empty = document.getElementById('main-empty');

  // Always show grid (manual button is always available)
  grid.style.display = '';
  empty.style.display = 'none';

  const manualButton = `
    <button class="location-btn manual-btn" id="manual-entry-btn" aria-label="Manual entry">
      Manual Entry
    </button>
  `;

  let locationButtons = '';

  if (settings.SPLIT_LOG_BUTTONS) {
    locationButtons = locations.map((loc, i) => `
      <div class="location-btn-split" data-index="${i}">
        <span class="split-label">${escapeHtml(loc)}</span>
        <button class="split-left" data-action="Arrive" aria-label="Arrive at ${loc}"></button>
        <button class="split-right" data-action="Depart" aria-label="Depart from ${loc}"></button>
      </div>
    `).join('');
  } else {
    locationButtons = locations.map((loc, i) => `
      <button class="location-btn" data-index="${i}" aria-label="Log at ${loc}">
        ${escapeHtml(loc)}
      </button>
    `).join('');
  }

  grid.innerHTML = manualButton + locationButtons;
}

function logLocation(locationIndex, action) {
  console.log('logLocation', locationIndex, action);
  const location = locations[locationIndex];
  if (!location) return;

  const now = new Date();

  const year = now.getFullYear();
  const monthCorrected = now.getMonth()+1;
  const month = monthCorrected.toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const yyyymmdd = `${year}-${month}-${day}`;

  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const displayTime = `${hours}:${minutes}`;
  const roundedTime = roundTime(now.getHours(),now.getMinutes());

  const fullName = action ? `${action} ${location}` : location;

  // If pax count setting is enabled, show popup instead of logging immediately
  if (settings.ASK_PAX_COUNT) {
    pendingLog = {
      date: yyyymmdd,
      displayTime,
      roundedTime,
      fullName,
      action
    };
    showPaxInput(action);
    return;
  }

  const entry = {
    locationDate: yyyymmdd,
    locationTime: {displayTime, roundedTime},
    locationName: fullName
  };

  console.log(entry);

  locationLog.push(entry); // add to end of locationLog array
  saveLog();

  showToast(`Logged: ${fullName}`);

  renderMainScreen();
}

function logManualEntry(name) {
  console.log('logManualEntry', name);
  const trimmed = name.trim();
  if (!trimmed) return;

  const now = new Date();

  const year = now.getFullYear();
  const monthCorrected = now.getMonth() + 1;
  const month = monthCorrected.toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const yyyymmdd = `${year}-${month}-${day}`;

  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const displayTime = `${hours}:${minutes}`;
  const roundedTime = roundTime(now.getHours(), now.getMinutes());

  const entry = {
    locationDate: yyyymmdd,
    locationTime: { displayTime, roundedTime },
    locationName: trimmed
  };

  locationLog.push(entry);
  saveLog();

  showToast(`Logged: ${trimmed}`);
}

function showManualInput() {
  console.log('showManualInput');
  const overlay = document.getElementById('manual-card-overlay');
  const input = document.getElementById('manual-input');
  overlay.classList.add('show');
  input.value = '';
  input.focus();
}

function hideManualInput() {
  console.log('hideManualInput');
  const overlay = document.getElementById('manual-card-overlay');
  overlay.classList.remove('show');
}

function getLastLog() {
  console.log('getLastLog');
  if (locationLog.length === 0) {
    return;
  }
  const lastLog = locationLog.at(-1);

  return `${lastLog.locationTime.displayTime} ${lastLog.locationName}`;
}

// ============ Passenger Count Popup ============
function showPaxInput(action) {
  console.log('showPaxInput', action);
  const overlay = document.getElementById('pax-card-overlay');
  const input = document.getElementById('pax-input');
  const heading = document.getElementById('pax-card-heading');

  // Set heading based on action
  if (action === 'Depart') {
    heading.textContent = 'Passengers On';
  } else if (action === 'Arrive') {
    heading.textContent = 'Passengers Off';
  } else {
    heading.textContent = 'Passenger Count';
  }

  overlay.classList.add('show');
  input.value = '';
  input.focus();
}

function hidePaxInput() {
  console.log('hidePaxInput');
  const overlay = document.getElementById('pax-card-overlay');
  overlay.classList.remove('show');
  pendingLog = null;
}

function completePaxLog(paxCount) {
  console.log('completePaxLog', paxCount);
  if (!pendingLog) return;

  const count = parseInt(paxCount, 10) || 0;
  const prefix = pendingLog.action === 'Depart' ? '+' : (pendingLog.action === 'Arrive' ? '-' : '');
  const paxSuffix = count > 0 ? ` ${prefix}${count}` : '';

  const entry = {
    locationDate: pendingLog.date,
    locationTime: { displayTime: pendingLog.displayTime, roundedTime: pendingLog.roundedTime },
    locationName: pendingLog.fullName + paxSuffix
  };

  locationLog.push(entry);
  saveLog();

  showToast(`Logged: ${entry.locationName}`);
  pendingLog = null;
}

// ============ Quick Logs Screen ============
function renderManageScreen() {
  console.log('renderManageScreen');
  const list = document.getElementById('manage-list');
  const empty = document.getElementById('manage-empty');

  if (locations.length === 0) {
    list.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  list.style.display = '';
  empty.style.display = 'none';

  list.innerHTML = locations.map((loc, i) => `
    <li class="manage-item" data-index="${i}">
      <div class="reorder-btns">
        <button class="move-up" ${i === 0 ? 'disabled' : ''} aria-label="Move up">&#9650;</button>
        <button class="move-down" ${i === locations.length - 1 ? 'disabled' : ''} aria-label="Move down">&#9660;</button>
      </div>
      <input type="text" class="location-name" value="${escapeHtml(loc)}" maxlength="50" aria-label="Location name">
      <button class="delete-btn" aria-label="Delete ${loc}">&times;</button>
    </li>
  `).join('');
}

function addLocation(name) {
  console.log('addLocation', name);
  const trimmed = name.trim();
  if (!trimmed) return;

  locations.push(trimmed);
  saveLocations();
  renderManageScreen();
}

function deleteLocation(index) {
  console.log('deleteLocation', index);
  if (index < 0 || index >= locations.length) return;

  const name = locations[index];
  if (confirm(`Delete "${name}"?`)) {
    locations.splice(index, 1);
    saveLocations();
    renderManageScreen();
  }
}

function renameLocation(index, newName) {
  console.log('renameLocation', index, newName);
  const trimmed = newName.trim();
  if (!trimmed || index < 0 || index >= locations.length) return;

  locations[index] = trimmed;
  saveLocations();
}

function moveLocation(index, direction) {
  console.log('moveLocation', index, direction);
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= locations.length) return;

  [locations[index], locations[newIndex]] = [locations[newIndex], locations[index]];
  saveLocations();
  renderManageScreen();
}

// ============ Logbook Screen ============
function renderLogScreen() {
  console.log('renderLogScreen');
  const list = document.getElementById('log-list');
  const empty = document.getElementById('log-empty');

  if (locationLog.length === 0) {
    list.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  list.style.display = '';
  empty.style.display = 'none';

  const reversed = locationLog.toReversed();
  list.innerHTML = reversed.map((entry, i) => {
    const isNewDay = i > 0 && entry.locationDate !== reversed[i - 1].locationDate;
    return `
    <div class='log-list-entry${isNewDay ? ' new-day' : ''}'>
        <span class='log-date'>${escapeHtml(entry.locationDate.slice(8,10))}</span>
        <span class='log-time'>${escapeHtml(entry.locationTime.displayTime)}</span>
        <span class='log-name'>${escapeHtml(entry.locationName)}</span>
    </div>`;
  }).join('');
}

function clearLogbook() {
  console.log('clearLogbook');
  if (locationLog.length === 0) return;

  if (confirm('Clear all logs?')) {
    locationLog = [];
    saveLog();
    renderLogScreen();
  }
}

function clearLastLog() {
  console.log('clearLastLog');
  if (locationLog.length === 0) return;

  if (confirm('Delete last entry?')) {
    locationLog.pop();
    saveLog();
    renderLogScreen();
  }
}

function exportLogbook() {
  console.log('exportLogbook');
  if (locationLog.length === 0) return;

  const logbookString = locationLog.map(entry => 
    `${entry.locationDate + ' ' + entry.locationTime.displayTime + ' ' + entry.locationName}\n`)
    .join('');
  
  navigator.clipboard.writeText(logbookString);
  showToast("Copied");
}

// ============ Toast ============
function showToast(message) {
  console.log('showToast', message);
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// ============ Utilities ============
function escapeHtml(str) {
  console.log('escapeHtml', str);
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function roundTime(hours, minutes) {
  console.log('roundTime', hours, minutes);
  // Takes two integers
  const totalMinutes = hours * 60 + minutes;
  const rounded = Math.round(totalMinutes / 5) * 5;
  const newHours = Math.floor(rounded / 60) % 24;
  const newMinutes = rounded % 60;
  return String(newHours).padStart(2, '0') + String(newMinutes).padStart(2, '0');
}

// ============ Event Listeners ============
function initEventListeners() {
  console.log('initEventListeners');
  // Navigation
  document.querySelector('nav').addEventListener('click', (e) => {
    if (e.target.matches('button[data-screen]')) {
      showScreen(e.target.dataset.screen);
    }
  });

  // Main screen - log arrivals (event delegation)
  document.getElementById('locations-grid').addEventListener('click', (e) => {
    // Handle manual entry button
    if (e.target.matches('#manual-entry-btn')) {
      showManualInput();
      return;
    }

    // Handle split location buttons (Arrive/Depart)
    const splitBtn = e.target.closest('.split-left, .split-right');
    if (splitBtn) {
      const container = splitBtn.closest('.location-btn-split');
      const index = parseInt(container.dataset.index, 10);
      const action = splitBtn.dataset.action;
      logLocation(index, action);
      return;
    }

    // Handle non-split location buttons
    const btn = e.target.closest('.location-btn');
    if (btn && btn.dataset.index !== undefined) {
      logLocation(parseInt(btn.dataset.index, 10), null);
    }
  });

  // Manual entry card
  document.getElementById('manual-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      logManualEntry(e.target.value);
      renderMainScreen(); // to update last log
      hideManualInput();
    } else if (e.key === 'Escape') {
      hideManualInput();
    }
  });

  document.getElementById('manual-submit-btn').addEventListener('click', () => {
    const manualEntryValue =  document.getElementById('manual-input').value;
    logManualEntry(manualEntryValue);
    // addLocation(manualEntryValue);
    renderMainScreen(); // to update last log
    hideManualInput();
  });

  document.getElementById('manual-cancel-btn').addEventListener('click', () => {
    hideManualInput();
  });

  document.getElementById('manual-card-overlay').addEventListener('click', (e) => {
    if (e.target.matches('.manual-card-overlay')) {
      hideManualInput();
    }
  });

  // Manage screen - add location
  document.getElementById('new-location-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const input = e.target;
      addLocation(input.value);
      input.value = '';
    }
  });

  // Manage screen - delete, rename, reorder (event delegation)
  document.getElementById('manage-list').addEventListener('click', (e) => {
    const item = e.target.closest('.manage-item');
    if (!item) return;

    const index = parseInt(item.dataset.index, 10);

    if (e.target.matches('.delete-btn')) {
      deleteLocation(index);
    } else if (e.target.matches('.move-up')) {
      moveLocation(index, -1);
    } else if (e.target.matches('.move-down')) {
      moveLocation(index, 1);
    }
  });

  document.getElementById('manage-list').addEventListener('change', (e) => {
    if (e.target.matches('.location-name')) {
      const item = e.target.closest('.manage-item');
      const index = parseInt(item.dataset.index, 10);
      renameLocation(index, e.target.value);
    }
  });

  // Log screen - clear
  document.getElementById('clear-log-btn').addEventListener('click', clearLogbook);
  document.getElementById('clear-last-log-btn').addEventListener('click', clearLastLog);
  document.getElementById('export-log-btn').addEventListener('click', exportLogbook);


  // Settings screen - toggles
  document.getElementById('setting-split-buttons').addEventListener('change', (e) => {
    toggleSetting('SPLIT_LOG_BUTTONS', e.target.checked);
  });

  document.getElementById('setting-pax-count').addEventListener('change', (e) => {
    toggleSetting('ASK_PAX_COUNT', e.target.checked);
  });

  document.getElementById('setting-last-log').addEventListener('change', (e) => {
    toggleSetting('SHOW_LAST_LOG', e.target.checked);
  });

  // Passenger count popup
  document.getElementById('pax-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      completePaxLog(e.target.value);
      hidePaxInput();
      renderMainScreen(); // to update last log
    } else if (e.key === 'Escape') {
      hidePaxInput();
    }
  });

  document.getElementById('pax-submit-btn').addEventListener('click', () => {
    const paxValue = document.getElementById('pax-input').value;
    completePaxLog(paxValue);
    renderMainScreen(); // to update last log
    hidePaxInput();
  });

  document.getElementById('pax-cancel-btn').addEventListener('click', () => {
    hidePaxInput();
  });

  document.getElementById('pax-card-overlay').addEventListener('click', (e) => {
    if (e.target.matches('.pax-card-overlay')) {
      hidePaxInput();
    }
  });
}

// ============ Init ============
function init() {
  console.log('init');
  loadLocations();
  loadLog();
  loadSettings();
  initEventListeners();
  renderMainScreen();
}

document.addEventListener('DOMContentLoaded', init);
