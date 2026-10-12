let currentLang = 'en';
let cropsList = [];
let activePlotId = null;

const TIER_HEX = { normal: '#0ca30c', watch: '#fab219', alert: '#ec835a', severe: '#d03b3b', excess: '#2a78d6', unknown: '#898781' };
const TIER_ICON = { normal: '✅', watch: '📈', alert: '⚠️', severe: '⛔', excess: '🌊', unknown: '❔' };

const translations = {
  en: {
    nav_farmer: 'Farmer',
    my_plots: 'My Plots',
    register_title: 'Register a plot',
    label_plot_name: 'Plot name (optional)',
    ph_plot_name: 'e.g. North field',
    label_farmer_name: 'Your name',
    ph_name: 'Full name',
    label_phone: 'Phone number',
    ph_phone: '10-digit mobile number',
    label_lat: 'Latitude',
    label_lng: 'Longitude',
    btn_use_location: '📍 Use my current location',
    label_crop: 'Crop',
    label_sowing: 'Sowing date',
    btn_register: 'Register & Check Risk',
    btn_download: '⬇ Download evidence record',
    btn_refresh: '↻ Refresh',
    lang_toggle: 'हिंदी',
    err_fields: 'Please fill latitude, longitude, crop and sowing date.',
    err_failed: 'Could not register plot. Please try again.',
    stage_label: 'Growth stage',
    rainfall_label: 'Rainfall this season',
    baseline_label: '5-year average for this window',
    chart_title: 'Cumulative rainfall — this season vs. historical average',
    data_through: 'Data through',
  },
  hi: {
    nav_farmer: 'किसान',
    my_plots: 'मेरे खेत',
    register_title: 'खेत दर्ज करें',
    label_plot_name: 'खेत का नाम (वैकल्पिक)',
    ph_plot_name: 'जैसे उत्तरी खेत',
    label_farmer_name: 'आपका नाम',
    ph_name: 'पूरा नाम',
    label_phone: 'फ़ोन नंबर',
    ph_phone: '10 अंकों का मोबाइल नंबर',
    label_lat: 'अक्षांश (Latitude)',
    label_lng: 'देशांतर (Longitude)',
    btn_use_location: '📍 मेरा स्थान उपयोग करें',
    label_crop: 'फसल',
    label_sowing: 'बुवाई की तारीख',
    btn_register: 'दर्ज करें और जोखिम देखें',
    btn_download: '⬇ प्रमाण रिकॉर्ड डाउनलोड करें',
    btn_refresh: '↻ ताज़ा करें',
    lang_toggle: 'English',
    err_fields: 'कृपया अक्षांश, देशांतर, फसल और बुवाई तारीख भरें।',
    err_failed: 'खेत दर्ज नहीं हो सका। कृपया पुनः प्रयास करें।',
    stage_label: 'वृद्धि चरण',
    rainfall_label: 'इस मौसम की वर्षा',
    baseline_label: 'इस अवधि का 5-वर्षीय औसत',
    chart_title: 'संचयी वर्षा — इस मौसम बनाम ऐतिहासिक औसत',
    data_through: 'डेटा यहाँ तक',
  },
};

function t(key) {
  return translations[currentLang][key] || translations.en[key];
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
  if (activePlotId) loadAssessment(activePlotId);
}

function getMyPlotIds() {
  try {
    return JSON.parse(localStorage.getItem('fasalraksha_plots') || '[]');
  } catch (e) {
    return [];
  }
}

function saveMyPlotId(id) {
  try {
    const ids = getMyPlotIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem('fasalraksha_plots', JSON.stringify(ids));
    }
  } catch (e) {
    /* storage unavailable, ignore */
  }
}

async function loadCrops() {
  const res = await fetch('/api/crops');
  cropsList = await res.json();
  document.getElementById('fCrop').innerHTML = cropsList
    .map((c) => `<option value="${c.id}">${c.label}</option>`)
    .join('');
}

function useMyLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      document.getElementById('fLat').value = pos.coords.latitude.toFixed(4);
      document.getElementById('fLng').value = pos.coords.longitude.toFixed(4);
    },
    () => {},
    { timeout: 8000 }
  );
}

async function registerPlot() {
  const name = document.getElementById('fPlotName').value;
  const farmerName = document.getElementById('fFarmerName').value;
  const phone = document.getElementById('fPhone').value;
  const lat = document.getElementById('fLat').value;
  const lng = document.getElementById('fLng').value;
  const cropId = document.getElementById('fCrop').value;
  const sowingDate = document.getElementById('fSowing').value;
  const errEl = document.getElementById('registerError');
  errEl.textContent = '';

  if (!lat || !lng || !cropId || !sowingDate) {
    errEl.textContent = t('err_fields');
    return;
  }

  try {
    const res = await fetch('/api/plots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, farmerName, phone, lat, lng, cropId, sowingDate, lang: currentLang }),
    });
    if (!res.ok) throw new Error('bad response');
    const plot = await res.json();
    saveMyPlotId(plot.id);
    renderMyPlots();
    await loadAssessment(plot.id);
  } catch (e) {
    errEl.textContent = t('err_failed');
  }
}

async function renderMyPlots() {
  const ids = getMyPlotIds();
  const wrap = document.getElementById('myPlotsWrap');
  const list = document.getElementById('myPlotsList');
  if (!ids.length) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  const items = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(`/api/plots/${id}?lang=${currentLang}`);
        if (!res.ok) return null;
        return await res.json();
      } catch (e) {
        return null;
      }
    })
  );
  list.innerHTML = items
    .filter(Boolean)
    .map((p) => {
      const tier = p.assessment?.tier || 'unknown';
      return `
      <div class="card" style="padding:12px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="loadAssessment('${p.id}')">
        <span><strong>${p.name}</strong> — ${p.assessment?.cropLabel || ''}</span>
        <span class="badge ${tier}">${TIER_ICON[tier] || ''} ${p.assessment?.tierLabel || ''}</span>
      </div>`;
    })
    .join('');
}

function drawRainfallChart(series) {
  const W = 640, H = 200, PAD = 28;
  const n = series.offsetDays.length;
  if (n < 2) return '';
  const maxVal = Math.max(...series.currentCum, ...series.baselineCum, 1) * 1.1;
  const xStep = (W - PAD * 2) / (n - 1);
  const yScale = (v) => H - PAD - (v / maxVal) * (H - PAD * 2);

  const pathFor = (arr) =>
    arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${PAD + i * xStep},${yScale(v)}`).join(' ');

  return `
    <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}">
      <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="#c3c2b7" stroke-width="1"/>
      <path d="${pathFor(series.baselineCum)}" fill="none" stroke="#898781" stroke-width="2" stroke-dasharray="5 4"/>
      <path d="${pathFor(series.currentCum)}" fill="none" stroke="#2a78d6" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="${PAD + (n - 1) * xStep}" cy="${yScale(series.currentCum[n - 1])}" r="5" fill="#2a78d6" stroke="#fff" stroke-width="2"/>
      <text x="${W - PAD}" y="16" font-size="12" fill="#2a78d6" text-anchor="end">● This season</text>
      <text x="${W - PAD}" y="32" font-size="12" fill="#898781" text-anchor="end">- - 5-yr average</text>
    </svg>`;
}

async function loadAssessment(id) {
  activePlotId = id;
  const wrap = document.getElementById('assessmentWrap');
  wrap.style.display = 'block';
  wrap.innerHTML = `<div class="empty-state">Loading live rainfall data…</div>`;

  try {
    const res = await fetch(`/api/plots/${id}?lang=${currentLang}`);
    if (!res.ok) throw new Error('fetch failed');
    const plot = await res.json();
    const a = plot.assessment;
    const tier = a.tier;

    wrap.innerHTML = `
      <div class="card" style="padding:22px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
          <div>
            <h2 style="margin:0 0 4px;font-family:'EB Garamond',Georgia,serif;font-size:24px;">${plot.name}</h2>
            <div class="meta">${a.cropLabel} · ${t('stage_label')}: ${a.stage}</div>
          </div>
          <span class="badge ${tier}" style="font-size:13px;padding:6px 14px;">${TIER_ICON[tier] || ''} ${a.tierLabel}</span>
        </div>

        <p style="font-size:15px;line-height:1.5;background:var(--surface-2);padding:14px 16px;border-radius:10px;margin:16px 0;">${a.advisory}</p>

        <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:16px;">
          <div>
            <div class="meta">${t('rainfall_label')}</div>
            <div style="font-size:22px;font-weight:700;">${a.currentTotalMm} mm</div>
          </div>
          <div>
            <div class="meta">${t('baseline_label')}</div>
            <div style="font-size:22px;font-weight:700;color:var(--text-secondary);">${a.baselineAvgMm ?? '—'} mm</div>
          </div>
        </div>

        <div class="meta" style="margin-bottom:6px;">${t('chart_title')} (${t('data_through')} ${a.dataThroughDate})</div>
        ${drawRainfallChart(a.series)}

        <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
          <a class="btn gold small" href="/api/plots/${id}/evidence?lang=${currentLang}">${t('btn_download')}</a>
          <button class="btn secondary small" onclick="loadAssessment('${id}')">${t('btn_refresh')}</button>
        </div>
      </div>`;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Could not load live rainfall data for this plot. Please try again shortly.</div>`;
  }
}

applyStaticTranslations();
loadCrops();
renderMyPlots();
