/* ═══════════════════════════════════════════════
   DERMASCAN PH — APP LOGIC
   ═══════════════════════════════════════════════ */

// ── STATE ─────────────────────────────────────────
let currentLang = localStorage.getItem('ds_lang') || 'EN';
let currentTheme = localStorage.getItem('ds_theme') || 'light';
let currentScreen = 'home';
let selectedFile = null;
let history = JSON.parse(localStorage.getItem('ds_history') || '[]');
let userData = JSON.parse(localStorage.getItem('ds_user') || '{}');
let sidebarOpen = false;

// ── INIT ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(currentTheme);
  applyLang(currentLang);

  const firstRun = localStorage.getItem('ds_first_run') !== 'false';
  if (firstRun) {
    document.getElementById('welcome-overlay').classList.add('active');
  } else {
    document.getElementById('welcome-overlay').classList.remove('active');
    document.getElementById('welcome-overlay').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('app').style.display = 'flex';
    showScreen('home');
  }

  document.getElementById('home-date').textContent = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  loadCredentials();
  updateHomeGreeting();
  renderHistory();
});

// ── WELCOME ───────────────────────────────────────
function startApp() {
  localStorage.setItem('ds_first_run', 'false');
  const overlay = document.getElementById('welcome-overlay');
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.4s ease';
  setTimeout(() => {
    overlay.style.display = 'none';
    const app = document.getElementById('app');
    app.classList.remove('hidden');
    app.style.display = 'flex';
    showScreen('home');
  }, 400);
}

// ── LANGUAGE ──────────────────────────────────────
function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('ds_lang', lang);
  applyLang(lang);
}

function applyLang(lang) {
  // Update all data-en / data-fil elements
  document.querySelectorAll('[data-en]').forEach(el => {
    const key = lang === 'EN' ? 'en' : 'fil';
    const val = el.getAttribute('data-' + key);
    if (val !== null) el.textContent = val;
  });

  // Update placeholder attributes
  document.querySelectorAll('[data-ph-en]').forEach(el => {
    el.placeholder = el.getAttribute(lang === 'EN' ? 'data-ph-en' : 'data-ph-fil');
  });

  // Sync all lang pill buttons
  document.querySelectorAll('.lang-pill').forEach(btn => {
    const targets = ['EN', 'FIL'];
    const btnLang = btn.textContent.trim() === 'English' ? 'EN' :
                    btn.textContent.trim() === 'Filipino' ? 'FIL' :
                    btn.textContent.trim(); // EN / FIL short form
    btn.classList.toggle('active', btnLang === lang);
  });

  // Re-render dynamic content
  updateHomeGreeting();
  renderHistory();
}

// ── THEME ─────────────────────────────────────────
function setTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('ds_theme', theme);
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('theme-light')?.classList.toggle('active', theme === 'light');
  document.getElementById('theme-dark')?.classList.toggle('active', theme === 'dark');
}

// ── SCREENS ───────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const screen = document.getElementById('screen-' + name);
  if (screen) screen.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick')?.includes(`'${name}'`)) n.classList.add('active');
  });

  currentScreen = name;

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    closeSidebar();
  }

  // Refresh screens
  if (name === 'history') renderHistory();
  if (name === 'home') updateHomeGreeting();
}

// ── SIDEBAR TOGGLE ────────────────────────────────
function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  document.getElementById('sidebar').classList.toggle('open', sidebarOpen);
}
function closeSidebar() {
  sidebarOpen = false;
  document.getElementById('sidebar').classList.remove('open');
}

// ── FILE UPLOAD ───────────────────────────────────
function handleFile(input) {
  const file = input.files[0];
  if (!file) return;
  loadImageFile(file);
}

function handleDrop(event) {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadImageFile(file);
}

function loadImageFile(file) {
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.getElementById('preview-img');
    const placeholder = document.getElementById('upload-placeholder');
    img.src = e.target.result;
    img.classList.remove('hidden');
    if (placeholder) placeholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

// ── ANALYSIS (heuristic, client-side) ────────────
function analyzeImage() {
  if (!selectedFile) {
    showToast(currentLang === 'EN' ? '⚠️ Please upload an image first.' : '⚠️ Mangyaring mag-upload muna ng larawan.');
    return;
  }

  const resultArea = document.getElementById('result-area');
  const spinText = currentLang === 'EN' ? 'Analyzing image…' : 'Sinusuri ang larawan…';
  resultArea.innerHTML = `<div class="analyzing"><div class="spinner"></div>${spinText}</div>`;

  // Simulate analysis delay (replace with real ML API call if needed)
  const img = document.getElementById('preview-img');
  setTimeout(() => {
    const result = heuristicAnalyze(img);
    displayResult(result);
    saveToHistory(result);
  }, 1800);
}

function heuristicAnalyze(imgEl) {
  // Client-side color analysis via canvas
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;

    let rSum=0, gSum=0, bSum=0, count=0;
    for (let i=0; i<data.length; i+=4) {
      rSum += data[i]; gSum += data[i+1]; bSum += data[i+2]; count++;
    }
    const rAvg = rSum/count, gAvg = gSum/count, bAvg = bSum/count;
    const redRatio = rAvg / (gAvg + bAvg + 1);
    const brightness = (rAvg + gAvg + bAvg) / 3;
    const saturation = (Math.max(rAvg,gAvg,bAvg) - Math.min(rAvg,gAvg,bAvg)) / (Math.max(rAvg,gAvg,bAvg) + 1);

    // Simple heuristic rules (demo — not clinically validated)
    let label, confidence;
    if (redRatio > 0.42 && saturation > 0.15) {
      label = 'mpox';
      confidence = Math.min(0.45 + (redRatio - 0.42) * 2, 0.82);
    } else if (saturation > 0.12 && brightness < 180) {
      label = 'chickenpox';
      confidence = Math.min(0.40 + saturation * 1.5, 0.78);
    } else if (brightness > 160 && saturation < 0.1) {
      label = 'normal';
      confidence = 0.65 + Math.random() * 0.1;
    } else {
      label = 'uncertain';
      confidence = 0.35 + Math.random() * 0.1;
    }
    return { label, confidence: Math.round(confidence * 100) };
  } catch (e) {
    return { label: 'uncertain', confidence: 38 };
  }
}

const RESULT_DATA = {
  mpox: {
    EN: {
      badge: '⚠️ Possible MPOX Detected',
      color: 'mpox',
      badgeColor: '#C53030',
      recs: [
        '🔴 ISOLATE immediately from others',
        '📞 Call DOH Hotline: 1555 before going anywhere',
        '😷 Wear a mask and cover all lesions',
        '🚫 Do NOT share towels, bedding, or clothing',
        '🧼 Wash hands frequently with soap and water',
        '🏥 Antiviral treatment (tecovirimat) is available',
      ]
    },
    FIL: {
      badge: '⚠️ Posibleng May MPOX',
      color: 'mpox',
      badgeColor: '#C53030',
      recs: [
        '🔴 Mag-ISOLATE agad mula sa iba',
        '📞 Tumawag sa DOH Hotline: 1555 bago pumunta kahit saan',
        '😷 Magsuot ng maskara at takpan ang lahat ng sugat',
        '🚫 HUWAG ibahagi ang tuwalya, kama, o damit',
        '🧼 Maghugas ng kamay nang madalas gamit ang sabon',
        '🏥 Available ang antiviral na lunas (tecovirimat)',
      ]
    }
  },
  chickenpox: {
    EN: {
      badge: '⚠️ Possible Chickenpox Detected',
      color: 'cpox',
      badgeColor: '#B7791F',
      recs: [
        '🏠 Stay home and rest — avoid school/work',
        '🙅 Do NOT scratch blisters (causes scarring)',
        '🧴 Use calamine lotion for itching',
        '💊 Take paracetamol for fever (NOT aspirin)',
        '🩺 See a doctor if you are adult, pregnant, or elderly',
        '💉 Ask your doctor about the varicella vaccine',
      ]
    },
    FIL: {
      badge: '⚠️ Posibleng May Bulutong-tubig',
      color: 'cpox',
      badgeColor: '#B7791F',
      recs: [
        '🏠 Manatili sa bahay at magpahinga — iwasan ang paaralan/trabaho',
        '🙅 HUWAG kuskusin ang mga paltos (nagdudulot ng peklat)',
        '🧴 Gumamit ng calamine lotion para sa kati',
        '💊 Uminom ng paracetamol para sa lagnat (HINDI aspirin)',
        '🩺 Pumunta sa doktor kung matanda, buntis, o elderly',
        '💉 Tanungin ang doktor tungkol sa varicella vaccine',
      ]
    }
  },
  normal: {
    EN: {
      badge: '✅ No Clear Signs Detected',
      color: 'ok',
      badgeColor: '#276749',
      recs: [
        '👁 Monitor your skin closely over the next 24–48 hours',
        '🌡 Note any new spots, fever, or swollen lymph nodes',
        '🩺 If symptoms appear or worsen, consult a doctor',
        '📞 If you had contact with an infected person, call DOH: 1555',
      ]
    },
    FIL: {
      badge: '✅ Walang Malinaw na Senyales',
      color: 'ok',
      badgeColor: '#276749',
      recs: [
        '👁 Bantayan nang mabuti ang balat sa susunod na 24–48 oras',
        '🌡 Pansinin ang bagong mantsa, lagnat, o namamagang lymph nodes',
        '🩺 Kung lumitaw o lumala ang sintomas, kumonsulta sa doktor',
        '📞 Kung nagkaroon ng kontak sa may sakit, tumawag sa DOH: 1555',
      ]
    }
  },
  uncertain: {
    EN: {
      badge: '❓ Result Inconclusive',
      color: 'uncertain',
      badgeColor: '#718096',
      recs: [
        '📸 Try uploading a clearer, better-lit photo',
        '🩺 Consult a doctor or dermatologist for proper evaluation',
        '📞 Call DOH Hotline: 1555 if you have concerns',
        '🚫 Do NOT self-diagnose based on this result',
      ]
    },
    FIL: {
      badge: '❓ Hindi Malinaw ang Resulta',
      color: 'uncertain',
      badgeColor: '#718096',
      recs: [
        '📸 Subukan ang mas malinaw at mas maliwanag na larawan',
        '🩺 Kumonsulta sa doktor o dermatologist para sa wastong pagsusuri',
        '📞 Tumawag sa DOH Hotline: 1555 kung may alalahanin',
        '🚫 HUWAG mag-self-diagnose batay sa resultang ito',
      ]
    }
  }
};

function displayResult(result) {
  const { label, confidence } = result;
  const data = RESULT_DATA[label][currentLang];
  const recTitle = currentLang === 'EN' ? 'What To Do Next' : 'Ano ang Gagawin';
  const confLabel = currentLang === 'EN' ? 'Confidence' : 'Katumpakan';
  const discText = currentLang === 'EN'
    ? '⚠️ This is NOT a medical diagnosis. Always consult a licensed physician.'
    : '⚠️ Hindi ito medikal na diagnosis. Laging kumonsulta sa lisensyadong manggagamot.';

  const recsHTML = data.recs.map(r => `<div class="rc-item">${r}</div>`).join('');

  document.getElementById('result-area').innerHTML = `
    <div class="result-card ${data.color}">
      <div class="rc-badge" style="color:${data.badgeColor}">${data.badge}</div>
      <div class="rc-conf">${confLabel}: ${confidence}%</div>
      <div class="rc-divider"></div>
      <div class="rc-rec-title">${recTitle}</div>
      ${recsHTML}
      <div style="font-size:0.7rem;color:#C53030;margin-top:6px;line-height:1.5">${discText}</div>
    </div>
  `;
}

function saveToHistory(result) {
  const { label, confidence } = result;
  const data = RESULT_DATA[label][currentLang];
  history.unshift({
    date: new Date().toLocaleString('en-PH'),
    file: selectedFile?.name || 'unknown',
    label: data.badge,
    confidence,
    color: data.badgeColor,
    lang: currentLang
  });
  localStorage.setItem('ds_history', JSON.stringify(history));
  updateLastScanCard();
}

// ── HISTORY ───────────────────────────────────────
function renderHistory() {
  const list = document.getElementById('history-list');
  if (!list) return;

  if (!history.length) {
    const emptyMsg = currentLang === 'EN' ? 'No scans recorded yet.' : 'Wala pang naitala na scan.';
    list.innerHTML = `<div class="history-empty"><div class="he-icon">📋</div>${emptyMsg}</div>`;
    return;
  }

  list.innerHTML = history.map((entry, i) => `
    <div class="history-item">
      <div class="hi-top">
        <div class="hi-num">#${history.length - i}</div>
        <div class="hi-date">${entry.date}</div>
      </div>
      <div class="hi-result" style="color:${entry.color}">${entry.label}</div>
      <div class="hi-meta">${currentLang === 'EN' ? 'File' : 'File'}: ${entry.file} &nbsp;·&nbsp; ${currentLang === 'EN' ? 'Confidence' : 'Katumpakan'}: ${entry.confidence}%</div>
    </div>
  `).join('');
}

function clearHistory() {
  const msg = currentLang === 'EN' ? 'Delete all scan history?' : 'Burahin ang lahat ng kasaysayan ng scan?';
  if (!confirm(msg)) return;
  history = [];
  localStorage.removeItem('ds_history');
  renderHistory();
  updateLastScanCard();
  showToast(currentLang === 'EN' ? '🗑 History cleared.' : '🗑 Nabura na ang kasaysayan.');
}

function updateLastScanCard() {
  const card = document.getElementById('last-scan-card');
  if (!card) return;
  if (!history.length) { card.classList.add('hidden'); return; }
  const last = history[0];
  const label = currentLang === 'EN' ? 'Last Scan' : 'Huling Scan';
  card.classList.remove('hidden');
  card.innerHTML = `
    <div class="ls-label">${label}</div>
    <div class="ls-result" style="color:${last.color}">${last.label}</div>
    <div class="ls-date">${last.date} · ${last.file}</div>
  `;
}

// ── HOME GREETING ─────────────────────────────────
function updateHomeGreeting() {
  const card = document.getElementById('home-greeting');
  if (!card) return;
  const name = userData.name;
  if (!name) { card.classList.remove('visible'); return; }
  const hi = currentLang === 'EN' ? `Hello, <strong>${name}!</strong> 👋` : `Kamusta, <strong>${name}!</strong> 👋`;
  const sub = currentLang === 'EN' ? 'Stay healthy and safe.' : 'Manatiling malusog at ligtas.';
  card.innerHTML = `${hi}<br><span style="font-size:0.8rem;color:var(--text2)">${sub}</span>`;
  card.classList.add('visible');
  updateLastScanCard();
}

// ── CREDENTIALS ───────────────────────────────────
function loadCredentials() {
  if (userData.name) document.getElementById('cred-name').value = userData.name;
  if (userData.age) document.getElementById('cred-age').value = userData.age;
  if (userData.gender) document.getElementById('cred-gender').value = userData.gender;
  if (userData.location) document.getElementById('cred-location').value = userData.location;
}

function saveCredentials() {
  userData = {
    name: document.getElementById('cred-name').value,
    age: document.getElementById('cred-age').value,
    gender: document.getElementById('cred-gender').value,
    location: document.getElementById('cred-location').value,
  };
  localStorage.setItem('ds_user', JSON.stringify(userData));
  updateHomeGreeting();
  showToast(currentLang === 'EN' ? '✅ Saved successfully!' : '✅ Matagumpay na na-save!');
}

// ── SETTINGS ──────────────────────────────────────
function resetWelcome() {
  localStorage.setItem('ds_first_run', 'true');
  showToast(currentLang === 'EN' ? '✅ Welcome screen will show on next visit.' : '✅ Ipapakita ang welcome screen sa susunod na pagbisita.');
}

function clearAllData() {
  const msg = currentLang === 'EN' ? 'Delete ALL data including history and credentials?' : 'Burahin ang LAHAT ng data kasama ang kasaysayan at mga kredensyal?';
  if (!confirm(msg)) return;
  localStorage.clear();
  history = [];
  userData = {};
  showToast(currentLang === 'EN' ? '🗑 All data cleared.' : '🗑 Nabura ang lahat ng data.');
  location.reload();
}

// ── LEARN TABS ────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab)?.classList.add('active');
  event.target.classList.add('active');
}

// ── TOAST ─────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── CLOSE SIDEBAR ON OUTSIDE CLICK (mobile) ────────
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburger');
  if (window.innerWidth <= 768 && sidebarOpen &&
      !sidebar.contains(e.target) && !hamburger.contains(e.target)) {
    closeSidebar();
  }
});
