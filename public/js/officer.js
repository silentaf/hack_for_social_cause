const TIER_HEX = { normal: '#0ca30c', watch: '#fab219', alert: '#ec835a', severe: '#d03b3b', excess: '#2a78d6', unknown: '#898781' };
const TIER_ICON = { normal: '✅', watch: '📈', alert: '⚠️', severe: '⛔', excess: '🌊', unknown: '❔' };
const TIER_RANK = { severe: 4, excess: 3.5, alert: 3, watch: 2, normal: 1, unknown: 0 };
const TIER_ORDER = ['severe', 'alert', 'watch', 'excess', 'normal'];

const map = L.map('map').setView([23.5, 80.5], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

let plotMarkers = [];
let plotsData = [];

function statusLabel(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderStatTiles() {
  const counts = { severe: 0, alert: 0, watch: 0, normal: 0, excess: 0 };
  plotsData.forEach((p) => {
    const t = p.assessment?.tier;
    if (t && counts[t] !== undefined) counts[t]++;
  });
  const row = document.getElementById('statRow');
  row.innerHTML = TIER_ORDER.map((key) => `
    <div class="stat-tile ${key}">
      <span class="icon-badge" style="background:${TIER_HEX[key]}22">${TIER_ICON[key]}</span>
      <div>
        <div class="value">${counts[key]}</div>
        <div class="label">${statusLabel(key)} plots</div>
      </div>
    </div>`).join('');
}

function renderMap() {
  plotMarkers.forEach((m) => map.removeLayer(m));
  plotMarkers = [];
  plotsData.forEach((p) => {
    const tier = p.assessment?.tier || 'unknown';
    const marker = L.circleMarker([p.lat, p.lng], {
      radius: 9,
      color: TIER_HEX[tier],
      fillColor: TIER_HEX[tier],
      fillOpacity: 0.6,
      weight: 2,
    }).addTo(map);
    marker.bindPopup(`<strong>${p.name}</strong><br/>${p.assessment?.cropLabel || ''}<br/>Status: ${p.assessment?.tierLabel || 'Unknown'}`);
    marker.on('click', () => loadDetail(p.id));
    plotMarkers.push(marker);
  });
  if (plotsData.length) {
    const bounds = L.latLngBounds(plotsData.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }
}

function renderPlotList() {
  const el = document.getElementById('plotList');
  if (!plotsData.length) {
    el.innerHTML = `<div class="empty-state"><span class="emoji">🌾</span>No plots registered yet.</div>`;
    return;
  }
  const sorted = [...plotsData].sort((a, b) => {
    const ra = TIER_RANK[a.assessment?.tier] ?? -1;
    const rb = TIER_RANK[b.assessment?.tier] ?? -1;
    return rb - ra;
  });
  el.innerHTML = sorted.map((p) => {
    const tier = p.assessment?.tier || 'unknown';
    return `
      <div class="alert-item ${tier}" style="cursor:pointer;" onclick="loadDetail('${p.id}')">
        <span class="badge ${tier}"><span class="dot" style="background:${TIER_HEX[tier]}"></span>${TIER_ICON[tier]} ${p.assessment?.tierLabel || 'Unknown'}</span>
        <strong>${p.name}</strong>
        <span class="meta">${p.farmerName || 'Unknown farmer'} · ${p.assessment?.cropLabel || ''} · ${p.assessment?.stage || ''}</span>
        <span class="meta">${p.assessment?.deficitPct !== null && p.assessment?.deficitPct !== undefined ? p.assessment.deficitPct + '% deviation' : 'no data'}</span>
      </div>`;
  }).join('');
}

function drawRainfallChart(series) {
  const W = 640, H = 200, PAD = 28;
  const n = series.offsetDays.length;
  if (n < 2) return '<div class="meta">Not enough data yet to chart.</div>';
  const maxVal = Math.max(...series.currentCum, ...series.baselineCum, 1) * 1.1;
  const xStep = (W - PAD * 2) / (n - 1);
  const yScale = (v) => H - PAD - (v / maxVal) * (H - PAD * 2);
  const pathFor = (arr) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${PAD + i * xStep},${yScale(v)}`).join(' ');

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

async function loadDetail(id) {
  const wrap = document.getElementById('detailWrap');
  wrap.style.display = 'block';
  wrap.innerHTML = `<div class="card"><div class="card-body empty-state">Loading…</div></div>`;
  wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const plot = plotsData.find((p) => p.id === id);
  if (!plot || !plot.assessment) {
    wrap.innerHTML = `<div class="card"><div class="card-body empty-state">No data available for this plot.</div></div>`;
    return;
  }
  const a = plot.assessment;
  const tier = a.tier;
  wrap.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>📍 ${plot.name} <span style="font-weight:400;color:var(--text-secondary);">— ${plot.farmerName || 'Unknown farmer'} ${plot.phone ? '· ' + plot.phone : ''}</span></h2>
        <span class="badge ${tier}">${TIER_ICON[tier]} ${a.tierLabel}</span>
      </div>
      <div class="card-body">
        <p style="font-size:14px;line-height:1.5;background:var(--surface-2);padding:12px 14px;border-radius:10px;">${a.advisory}</p>
        <div style="display:flex;gap:24px;flex-wrap:wrap;margin:14px 0;">
          <div><div class="meta">Crop / Stage</div><div style="font-weight:600;">${a.cropLabel} — ${a.stage}</div></div>
          <div><div class="meta">Rainfall this season</div><div style="font-weight:600;">${a.currentTotalMm} mm</div></div>
          <div><div class="meta">5-yr baseline</div><div style="font-weight:600;">${a.baselineAvgMm ?? '—'} mm</div></div>
          <div><div class="meta">Deviation</div><div style="font-weight:600;">${a.deficitPct ?? '—'}%</div></div>
        </div>
        ${drawRainfallChart(a.series)}
        <div style="margin-top:14px;">
          <a class="btn gold small" href="/api/plots/${id}/evidence">⬇ Download evidence record</a>
        </div>
      </div>
    </div>`;
}

async function loadAll() {
  const res = await fetch('/api/plots');
  plotsData = await res.json();
  renderStatTiles();
  renderMap();
  renderPlotList();
}

loadAll();
