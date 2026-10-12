const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

const cache = new Map(); // key -> { t: number, data }
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

function fmt(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// Archive data typically lags a few days behind "today".
const ARCHIVE_LAG_DAYS = 4;

function latestSafeArchiveDate() {
  return addDays(new Date(), -ARCHIVE_LAG_DAYS);
}

async function fetchDailyPrecip(lat, lon, startDate, endDate) {
  const start = fmt(startDate);
  const end = fmt(endDate);
  if (new Date(end) < new Date(start)) return { dates: [], values: [] };

  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${start},${end}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < CACHE_TTL_MS) return hit.data;

  const url = `${ARCHIVE_URL}?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}&daily=precipitation_sum&timezone=UTC`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`climate API error ${res.status}`);
  const json = await res.json();
  const data = {
    dates: json.daily?.time || [],
    values: (json.daily?.precipitation_sum || []).map((v) => (v === null ? 0 : v)),
  };
  cache.set(key, { t: Date.now(), data });
  return data;
}

function sum(values) {
  return values.reduce((a, b) => a + b, 0);
}

// Fetches the current-season rainfall for [windowStart, windowEndToDate],
// plus the historical average for the SAME calendar window (same month/day
// span, same length) across the previous `years` years.
async function getRainfallComparison(lat, lon, windowStart, windowEndToDate, years = 5) {
  const safeEnd = new Date(Math.min(windowEndToDate.getTime(), latestSafeArchiveDate().getTime()));
  const current = await fetchDailyPrecip(lat, lon, windowStart, safeEnd);
  const currentTotal = sum(current.values);
  const dataThroughDate = safeEnd < windowEndToDate ? fmt(safeEnd) : fmt(windowEndToDate);

  const lengthDays = Math.max(1, Math.round((safeEnd - windowStart) / 86400000) + 1);

  const historicalTotals = [];
  const historicalSeries = [];
  for (let y = 1; y <= years; y++) {
    const histStart = new Date(windowStart);
    histStart.setUTCFullYear(histStart.getUTCFullYear() - y);
    const histEnd = addDays(histStart, lengthDays - 1);
    try {
      const hist = await fetchDailyPrecip(lat, lon, histStart, histEnd);
      if (hist.values.length) {
        historicalTotals.push(sum(hist.values));
        historicalSeries.push({ year: histStart.getUTCFullYear(), dates: hist.dates, values: hist.values });
      }
    } catch (e) {
      // skip a year that fails rather than fail the whole comparison
    }
  }

  const baselineAvg = historicalTotals.length
    ? historicalTotals.reduce((a, b) => a + b, 0) / historicalTotals.length
    : null;

  return {
    currentTotalMm: Math.round(currentTotal * 10) / 10,
    currentSeries: current,
    dataThroughDate,
    baselineAvgMm: baselineAvg === null ? null : Math.round(baselineAvg * 10) / 10,
    baselineYearsUsed: historicalTotals.length,
    historicalSeries,
    windowLengthDays: lengthDays,
  };
}

module.exports = { fetchDailyPrecip, getRainfallComparison, addDays, fmt, latestSafeArchiveDate };
