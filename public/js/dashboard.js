const STATUS_COLOR = {
  good: 'var(--status-good)',
  warning: 'var(--status-warning)',
  serious: 'var(--status-serious)',
  critical: 'var(--status-critical)',
};
const STATUS_HEX = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};
const STATUS_ICON = { good: '●', warning: '▲', serious: '▲', critical: '⛔' };

const map = L.map('map').setView([25.433, 81.875], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

const zoneMarkers = new Map();
let selectedZoneId = null;
let zonesData = [];

function statusLabel(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderZoneTable() {
  const body = document.getElementById('zoneTableBody');
  const sorted = [...zonesData].sort((a, b) => b.ratio - a.ratio);
  body.innerHTML = sorted
    .map(
      (z) => `
      <tr style="border-bottom:1px solid var(--gridline);">
        <td style="padding:6px 4px;">${z.name}</td>
        <td style="padding:6px 4px;font-variant-numeric:tabular-nums;">${z.count.toLocaleString()}</td>
        <td style="padding:6px 4px;font-variant-numeric:tabular-nums;">${z.capacity.toLocaleString()}</td>
        <td style="padding:6px 4px;font-variant-numeric:tabular-nums;">${Math.round(z.ratio * 100)}%</td>
        <td style="padding:6px 4px;">
          <span class="badge ${z.status}"><span class="dot" style="background:${STATUS_HEX[z.status]}"></span>${statusLabel(z.status)}</span>
        </td>
      </tr>`
    )
    .join('');
}

function populateDemoSelect() {
  const select = document.getElementById('demoZoneSelect');
  if (select.options.length) return;
  select.innerHTML = zonesData.map((z) => `<option value="${z.id}">${z.name}</option>`).join('');
}

async function triggerSurgeDemo() {
  const zoneId = document.getElementById('demoZoneSelect').value;
  await fetch(`/api/zones/${zoneId}/surge`, { method: 'POST' });
  document.getElementById('demoStatus').textContent = 'Surge triggered — watch the zone escalate over the next ~20-30s.';
}

async function resetZoneDemo() {
  const zoneId = document.getElementById('demoZoneSelect').value;
  await fetch(`/api/zones/${zoneId}/reset`, { method: 'POST' });
  document.getElementById('demoStatus').textContent = 'Zone reset to normal levels.';
}

function renderStatTiles() {
  const counts = { good: 0, warning: 0, serious: 0, critical: 0 };
  zonesData.forEach((z) => counts[z.status]++);
  const row = document.getElementById('statRow');
  row.innerHTML = Object.keys(counts)
    .map(
      (key) => `
      <div class="stat-tile">
        <span class="dot" style="background:${STATUS_HEX[key]}"></span>
        <div>
          <div class="value">${counts[key]}</div>
          <div class="label">${statusLabel(key)} zones</div>
        </div>
      </div>`
    )
    .join('');
}

function radiusForCapacity(capacity) {
  return 120 + Math.sqrt(capacity) * 0.6;
}

function upsertZoneMarker(z) {
  const existing = zoneMarkers.get(z.id);
  const color = STATUS_HEX[z.status];
  const radius = radiusForCapacity(z.capacity);
  const popupHtml = `
    <strong>${z.name}</strong><br/>
    ${z.count.toLocaleString()} / ${z.capacity.toLocaleString()} (${Math.round(z.ratio * 100)}%)<br/>
    Status: <span style="color:${color};font-weight:600;">${statusLabel(z.status)}</span><br/>
    Trend: ${z.trend >= 0 ? '+' : ''}${z.trend}/min
  `;

  if (existing) {
    existing.setStyle({ color, fillColor: color });
    existing.setRadius(radius);
    existing.setPopupContent(popupHtml);
  } else {
    const circle = L.circle([z.lat, z.lng], {
      radius,
      color,
      fillColor: color,
      fillOpacity: 0.35,
      weight: 2,
    }).addTo(map);
    circle.bindPopup(popupHtml);
    circle.on('click', () => selectZone(z.id));
    zoneMarkers.set(z.id, circle);
  }
}

function renderCamps(camps) {
  camps.forEach((c) => {
    const color = c.type === 'medical' ? '#2a78d6' : '#4a3aa7';
    const icon = c.type === 'medical' ? '🏥' : c.type === 'police' ? '🚓' : '🔎';
    L.marker([c.lat, c.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="font-size:18px;filter:drop-shadow(0 0 2px rgba(0,0,0,.4));">${icon}</div>`,
        iconSize: [22, 22],
      }),
    })
      .addTo(map)
      .bindPopup(`<strong>${c.name}</strong><br/>Type: ${c.type}<br/>Phone: ${c.phone}`);
  });
}

async function selectZone(zoneId) {
  selectedZoneId = zoneId;
  const zone = zonesData.find((z) => z.id === zoneId);
  document.getElementById('chartZoneName').textContent = zone ? `— ${zone.name}` : '';
  document.getElementById('chartHint').style.display = 'none';
  document.getElementById('trendChart').style.display = 'block';
  await refreshChart();
}

async function refreshChart() {
  if (!selectedZoneId) return;
  const res = await fetch(`/api/zones/${selectedZoneId}/history`);
  if (!res.ok) return;
  const data = await res.json();
  drawChart(data.zone, data.history);
}

function drawChart(zone, history) {
  const svg = document.getElementById('trendChart');
  const W = 640, H = 160, PAD = 20;
  if (history.length < 2) {
    svg.innerHTML = '';
    return;
  }
  const counts = history.map((h) => h.count);
  const maxVal = Math.max(zone.capacity, ...counts) * 1.05;
  const minVal = 0;
  const xStep = (W - PAD * 2) / (history.length - 1);
  const yScale = (v) => H - PAD - ((v - minVal) / (maxVal - minVal)) * (H - PAD * 2);

  const points = history.map((h, i) => [PAD + i * xStep, yScale(h.count)]);
  const pathD = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const capacityY = yScale(zone.capacity);
  const lastStatusColor = STATUS_HEX[zonesData.find((z) => z.id === zone.id)?.status] || '#2a78d6';

  svg.innerHTML = `
    <line x1="${PAD}" y1="${capacityY}" x2="${W - PAD}" y2="${capacityY}" stroke="#d03b3b" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
    <text x="${W - PAD}" y="${capacityY - 4}" font-size="10" fill="#898781" text-anchor="end">Safe capacity</text>
    <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="var(--baseline)" stroke-width="1"/>
    <path d="${pathD}" fill="none" stroke="var(--series-blue)" stroke-width="2" stroke-linecap="round"/>
    <circle cx="${points[points.length - 1][0]}" cy="${points[points.length - 1][1]}" r="4" fill="${lastStatusColor}"/>
  `;
}

function renderAlerts(list) {
  const el = document.getElementById('alertsList');
  if (!list.length) {
    el.innerHTML = '<div class="meta">No alerts yet — all zones nominal.</div>';
    return;
  }
  el.innerHTML = list
    .slice(0, 30)
    .map((a) => {
      const color = STATUS_HEX[a.toStatus];
      const direction = ['serious', 'critical'].includes(a.toStatus) ? 'escalated to' : 'eased to';
      return `
      <div class="alert-item">
        <span class="badge ${a.toStatus}"><span class="dot" style="background:${color}"></span>${statusLabel(a.toStatus)}</span>
        <strong>${a.zoneName}</strong>
        <span class="meta">${direction} ${a.toStatus} · ${new Date(a.t).toLocaleTimeString()}</span>
      </div>`;
    })
    .join('');
}

function renderSos(list) {
  const el = document.getElementById('sosList');
  if (!list.length) {
    el.innerHTML = '<div class="meta">No active help requests.</div>';
    return;
  }
  const typeLabel = { medical: 'Medical Emergency', lost_person: 'Lost Person', help: 'General Help' };
  el.innerHTML = list
    .slice(0, 40)
    .map(
      (r) => `
      <div class="sos-item">
        <strong>${typeLabel[r.type] || r.type}</strong> — ${r.name || 'Anonymous'} ${r.phone ? `(${r.phone})` : ''}
        <span class="meta">${r.zoneName} · ${new Date(r.t).toLocaleTimeString()} · ${r.status}</span>
        ${r.description ? `<span class="meta">"${r.description}"</span>` : ''}
        ${r.status === 'open' ? `<button class="btn secondary" style="margin-top:6px;width:fit-content;" onclick="resolveSos('${r.id}')">Mark resolved</button>` : ''}
      </div>`
    )
    .join('');
}

async function resolveSos(id) {
  await fetch(`/api/sos/${id}/resolve`, { method: 'POST' });
}

let alertsCache = [];
let sosCache = [];

const socket = io();

socket.on('zoneSnapshot', (zones) => {
  zonesData = zones;
  zones.forEach(upsertZoneMarker);
  renderStatTiles();
  renderZoneTable();
  populateDemoSelect();
  fetch('/api/camps').then((r) => r.json()).then(renderCamps);
});

socket.on('zoneUpdate', (zones) => {
  zonesData = zones;
  zones.forEach(upsertZoneMarker);
  renderStatTiles();
  renderZoneTable();
  if (selectedZoneId) refreshChart();
});

socket.on('alertSnapshot', (alerts) => {
  alertsCache = alerts;
  renderAlerts(alertsCache);
});

socket.on('alert', (a) => {
  alertsCache.unshift(a);
  renderAlerts(alertsCache);
});

socket.on('sosSnapshot', (list) => {
  sosCache = list;
  renderSos(sosCache);
});

socket.on('sosNew', (r) => {
  sosCache.unshift(r);
  renderSos(sosCache);
});

socket.on('sosResolved', (r) => {
  const idx = sosCache.findIndex((x) => x.id === r.id);
  if (idx !== -1) sosCache[idx] = r;
  renderSos(sosCache);
});
