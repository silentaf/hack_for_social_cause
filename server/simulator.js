const zones = require('./data/zones.json');
const camps = require('./data/camps.json');
const { classify } = require('./riskEngine');

const MAX_HISTORY = 30;
const TICK_MS = 2000;

const state = new Map();
zones.forEach((z) => {
  const startCount = Math.round(z.capacity * (0.1 + Math.random() * 0.2));
  state.set(z.id, {
    count: startCount,
    history: [{ t: Date.now(), count: startCount }],
    surging: false,
    surgeTicksLeft: 0,
    surgeTarget: 0,
    status: 'good',
  });
});

const alerts = [];
const sosReports = [];
let sosSeq = 1;

function pushAlert(zone, fromStatus, toStatus) {
  const entry = {
    id: `a${alerts.length + 1}_${Date.now()}`,
    zoneId: zone.id,
    zoneName: zone.name,
    fromStatus,
    toStatus,
    t: Date.now(),
  };
  alerts.unshift(entry);
  if (alerts.length > 100) alerts.length = 100;
  return entry;
}

function tick() {
  const updates = [];
  const newAlerts = [];

  zones.forEach((z) => {
    const s = state.get(z.id);

    if (!s.surging && Math.random() < 0.015) {
      s.surging = true;
      s.surgeTicksLeft = 8 + Math.floor(Math.random() * 10);
      s.surgeTarget = z.capacity * (0.85 + Math.random() * 0.3);
    }

    let delta;
    if (s.surging) {
      delta = (s.surgeTarget - s.count) * 0.25 + (Math.random() - 0.5) * z.capacity * 0.01;
      s.surgeTicksLeft -= 1;
      if (s.surgeTicksLeft <= 0) s.surging = false;
    } else {
      const baseline = z.capacity * (0.15 + 0.1 * Math.sin(Date.now() / 1000000 + z.lat));
      delta = (baseline - s.count) * 0.08 + (Math.random() - 0.5) * z.capacity * 0.02;
    }

    s.count = Math.max(0, Math.min(z.capacity * 1.15, s.count + delta));
    s.history.push({ t: Date.now(), count: Math.round(s.count) });
    if (s.history.length > MAX_HISTORY) s.history.shift();

    const { ratio, trend, status } = classify(s.count, z.capacity, s.history);
    const prevStatus = s.status;
    s.status = status;

    if (status !== prevStatus) {
      const severityRank = { good: 0, warning: 1, serious: 2, critical: 3 };
      if (severityRank[status] >= 2 && severityRank[status] > severityRank[prevStatus]) {
        newAlerts.push(pushAlert(z, prevStatus, status));
      } else if (severityRank[status] < severityRank[prevStatus] && severityRank[prevStatus] >= 2) {
        newAlerts.push(pushAlert(z, prevStatus, status));
      }
    }

    updates.push({
      id: z.id,
      name: z.name,
      lat: z.lat,
      lng: z.lng,
      capacity: z.capacity,
      count: Math.round(s.count),
      ratio: Math.round(ratio * 1000) / 1000,
      trend: Math.round(trend),
      status,
    });
  });

  return { zones: updates, alerts: newAlerts };
}

function getZoneStates() {
  return zones.map((z) => {
    const s = state.get(z.id);
    const { ratio, trend, status } = classify(s.count, z.capacity, s.history);
    return {
      id: z.id,
      name: z.name,
      lat: z.lat,
      lng: z.lng,
      capacity: z.capacity,
      count: Math.round(s.count),
      ratio: Math.round(ratio * 1000) / 1000,
      trend: Math.round(trend),
      status,
      description: z.description,
    };
  });
}

function getHistory(zoneId) {
  const s = state.get(zoneId);
  if (!s) return null;
  const zone = zones.find((z) => z.id === zoneId);
  return { zone, history: s.history };
}

function getAlerts() {
  return alerts.slice(0, 50);
}

function getCamps() {
  return camps;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestCamp(lat, lng, preferType) {
  let candidates = camps;
  if (preferType === 'medical') candidates = camps.filter((c) => c.type === 'medical');
  if (preferType === 'lost_person') candidates = camps.filter((c) => c.type === 'lost_found' || c.type === 'police');
  let best = null;
  let bestDist = Infinity;
  candidates.forEach((c) => {
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  });
  return best ? { camp: best, distanceKm: Math.round(bestDist * 100) / 100 } : null;
}

function addSos({ type, name, phone, zoneId, description }) {
  const zone = zones.find((z) => z.id === zoneId) || zones[0];
  const nearest = nearestCamp(zone.lat, zone.lng, type);
  const report = {
    id: `s${sosSeq++}`,
    type,
    name,
    phone,
    zoneId: zone.id,
    zoneName: zone.name,
    description,
    status: 'open',
    t: Date.now(),
    nearestCamp: nearest,
  };
  sosReports.unshift(report);
  if (sosReports.length > 200) sosReports.length = 200;
  return report;
}

function getSosReports() {
  return sosReports;
}

function resolveSos(id) {
  const report = sosReports.find((r) => r.id === id);
  if (report) report.status = 'resolved';
  return report;
}

function triggerSurge(zoneId) {
  const s = state.get(zoneId);
  const z = zones.find((zz) => zz.id === zoneId);
  if (!s || !z) return false;
  s.surging = true;
  s.surgeTicksLeft = 14;
  s.surgeTarget = z.capacity * 1.02;
  return true;
}

function resetZone(zoneId) {
  const s = state.get(zoneId);
  const z = zones.find((zz) => zz.id === zoneId);
  if (!s || !z) return false;
  s.surging = false;
  s.surgeTicksLeft = 0;
  s.count = Math.round(z.capacity * (0.1 + Math.random() * 0.15));
  s.history = [{ t: Date.now(), count: s.count }];
  s.status = 'good';
  return true;
}

module.exports = {
  TICK_MS,
  tick,
  getZoneStates,
  getHistory,
  getAlerts,
  getCamps,
  addSos,
  getSosReports,
  resolveSos,
  triggerSurge,
  resetZone,
};
