let zones = [];
let selectedType = null;
let currentLang = 'en';

const translations = {
  en: {
    nav_home: 'Home',
    nav_dashboard: 'Control Room',
    zone_label: 'Where are you right now?',
    btn_medical: 'Medical Emergency',
    btn_lost: 'Report Lost Person',
    btn_help: 'General Help',
    label_name: 'Your name',
    ph_name: 'Full name',
    label_phone: 'Phone number',
    ph_phone: '10-digit mobile number',
    label_desc: 'Details (optional)',
    ph_desc: 'Any helpful detail — description, symptoms, last seen location...',
    btn_submit: 'Submit Request',
    btn_back: 'Back',
    form_title_medical: 'Medical Emergency',
    form_title_lost: 'Report Lost Person',
    form_title_help: 'General Help',
    banner_critical: (name) => `⛔ ${name} is critically crowded right now. Follow steward instructions, move slowly toward an exit, avoid pushing.`,
    banner_serious: (name) => `▲ ${name} is approaching capacity. Be alert and avoid bottleneck points.`,
    banner_good: (name) => `● ${name} crowd levels are normal.`,
    confirm_title: 'Help is on the way',
    confirm_body: 'Your request has been logged and sent to the control room.',
    confirm_nearest: 'Nearest help point',
    confirm_type: 'Type',
    confirm_away: 'away',
    confirm_phone: 'Phone',
    confirm_another: 'Submit another request',
    confirm_logged_title: 'Request logged',
    confirm_logged_body: 'Your request has been sent to the control room.',
    lang_toggle: 'हिंदी',
  },
  hi: {
    nav_home: 'होम',
    nav_dashboard: 'कंट्रोल रूम',
    zone_label: 'अभी आप कहाँ हैं?',
    btn_medical: 'मेडिकल इमरजेंसी',
    btn_lost: 'खोया हुआ व्यक्ति दर्ज करें',
    btn_help: 'सामान्य सहायता',
    label_name: 'आपका नाम',
    ph_name: 'पूरा नाम',
    label_phone: 'फ़ोन नंबर',
    ph_phone: '10 अंकों का मोबाइल नंबर',
    label_desc: 'विवरण (वैकल्पिक)',
    ph_desc: 'कोई भी सहायक जानकारी — विवरण, लक्षण, आखिरी बार कहाँ देखा...',
    btn_submit: 'भेजें',
    btn_back: 'वापस',
    form_title_medical: 'मेडिकल इमरजेंसी',
    form_title_lost: 'खोया हुआ व्यक्ति दर्ज करें',
    form_title_help: 'सामान्य सहायता',
    banner_critical: (name) => `⛔ ${name} में अभी बहुत अधिक भीड़ है। स्वयंसेवकों के निर्देशों का पालन करें, धीरे-धीरे बाहर की ओर बढ़ें, धक्का-मुक्की न करें।`,
    banner_serious: (name) => `▲ ${name} में भीड़ क्षमता के करीब पहुँच रही है। सतर्क रहें।`,
    banner_good: (name) => `● ${name} में भीड़ का स्तर सामान्य है।`,
    confirm_title: 'सहायता आ रही है',
    confirm_body: 'आपका अनुरोध दर्ज कर कंट्रोल रूम को भेज दिया गया है।',
    confirm_nearest: 'निकटतम सहायता केंद्र',
    confirm_type: 'प्रकार',
    confirm_away: 'दूर',
    confirm_phone: 'फ़ोन',
    confirm_another: 'एक और अनुरोध भेजें',
    confirm_logged_title: 'अनुरोध दर्ज हुआ',
    confirm_logged_body: 'आपका अनुरोध कंट्रोल रूम को भेज दिया गया है।',
    lang_toggle: 'English',
  },
};

function t(key) {
  return translations[currentLang][key];
}

function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (translations[currentLang][key]) el.textContent = translations[currentLang][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[currentLang][key]) el.placeholder = translations[currentLang][key];
  });
  document.getElementById('langToggle').textContent = t('lang_toggle');
}

function toggleLang() {
  currentLang = currentLang === 'en' ? 'hi' : 'en';
  applyStaticTranslations();
  renderBanner();
  if (selectedType) chooseType(selectedType);
}

async function loadZones() {
  const res = await fetch('/api/zones');
  zones = await res.json();
  const select = document.getElementById('zoneSelect');
  select.innerHTML = zones.map((z) => `<option value="${z.id}">${z.name}</option>`).join('');
  select.addEventListener('change', renderBanner);
  renderBanner();
}

function renderBanner() {
  const zoneId = document.getElementById('zoneSelect').value;
  const zone = zones.find((z) => z.id === zoneId);
  const banner = document.getElementById('riskBanner');
  if (!zone) {
    banner.innerHTML = '';
    return;
  }
  if (zone.status === 'critical') {
    banner.innerHTML = `<div class="banner critical">${t('banner_critical')(zone.name)}</div>`;
  } else if (zone.status === 'serious') {
    banner.innerHTML = `<div class="banner serious">${t('banner_serious')(zone.name)}</div>`;
  } else {
    banner.innerHTML = `<div class="banner good">${t('banner_good')(zone.name)}</div>`;
  }
}

function chooseType(type) {
  selectedType = type;
  const titleKeys = { medical: 'form_title_medical', lost_person: 'form_title_lost', help: 'form_title_help' };
  document.getElementById('formTitle').textContent = t(titleKeys[type]);
  document.getElementById('typeChoice').style.display = 'none';
  document.getElementById('formWrap').style.display = 'block';
}

function resetForm() {
  selectedType = null;
  document.getElementById('typeChoice').style.display = 'block';
  document.getElementById('formWrap').style.display = 'none';
  document.getElementById('confirmWrap').style.display = 'none';
  document.getElementById('fName').value = '';
  document.getElementById('fPhone').value = '';
  document.getElementById('fDesc').value = '';
}

async function submitSos() {
  const zoneId = document.getElementById('zoneSelect').value;
  const name = document.getElementById('fName').value;
  const phone = document.getElementById('fPhone').value;
  const description = document.getElementById('fDesc').value;

  const res = await fetch('/api/sos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: selectedType, name, phone, zoneId, description }),
  });
  const report = await res.json();

  document.getElementById('formWrap').style.display = 'none';
  const confirmWrap = document.getElementById('confirmWrap');
  confirmWrap.style.display = 'block';

  if (report.nearestCamp) {
    const { camp, distanceKm } = report.nearestCamp;
    confirmWrap.innerHTML = `
      <div class="confirm-card">
        <h2 style="margin-top:0;font-size:16px;">${t('confirm_title')}</h2>
        <p>${t('confirm_body')}</p>
        <p><strong>${t('confirm_nearest')}:</strong> ${camp.name}<br/>
        ${t('confirm_type')}: ${camp.type} · ~${distanceKm} km ${t('confirm_away')}<br/>
        ${t('confirm_phone')}: ${camp.phone}</p>
        <button class="btn secondary" onclick="resetForm()">${t('confirm_another')}</button>
      </div>
    `;
  } else {
    confirmWrap.innerHTML = `
      <div class="confirm-card">
        <h2 style="margin-top:0;font-size:16px;">${t('confirm_logged_title')}</h2>
        <p>${t('confirm_logged_body')}</p>
        <button class="btn secondary" onclick="resetForm()">${t('confirm_another')}</button>
      </div>
    `;
  }
}

applyStaticTranslations();
loadZones();
