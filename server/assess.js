const crops = require('./crops');
const climate = require('./climate');
const riskEngine = require('./riskEngine');

function buildCumulativeSeries(comparison, windowLengthDays) {
  const offsetDays = Array.from({ length: windowLengthDays }, (_, i) => i);

  const currentDaily = Array(windowLengthDays).fill(0);
  comparison.currentSeries.values.forEach((v, i) => {
    if (i < windowLengthDays) currentDaily[i] = v;
  });

  const years = comparison.historicalSeries;
  const baselineDaily = Array(windowLengthDays).fill(0).map((_, i) => {
    const valsAtOffset = years.map((y) => y.values[i]).filter((v) => v !== undefined);
    if (!valsAtOffset.length) return 0;
    return valsAtOffset.reduce((a, b) => a + b, 0) / valsAtOffset.length;
  });

  let cCum = 0, bCum = 0;
  const currentCum = [];
  const baselineCum = [];
  for (let i = 0; i < windowLengthDays; i++) {
    cCum += currentDaily[i];
    bCum += baselineDaily[i];
    currentCum.push(Math.round(cCum * 10) / 10);
    baselineCum.push(Math.round(bCum * 10) / 10);
  }

  return { offsetDays, currentCum, baselineCum };
}

async function assessPlot(plot, lang = 'en') {
  const sowing = new Date(plot.sowingDate + 'T00:00:00Z');
  const today = new Date();
  const daysElapsed = Math.floor((today - sowing) / 86400000);
  const stage = crops.currentStage(plot.cropId, daysElapsed);
  if (!stage) throw new Error('invalid crop id');

  const windowStart = climate.addDays(sowing, stage.stageStartDay);
  const windowEndToDate = climate.addDays(sowing, stage.toDateDay);
  const comparison = await climate.getRainfallComparison(plot.lat, plot.lng, windowStart, windowEndToDate);

  const deficitPct = comparison.baselineAvgMm
    ? Math.round(((comparison.baselineAvgMm - comparison.currentTotalMm) / comparison.baselineAvgMm) * 1000) / 10
    : null;
  const tier = riskEngine.classify(deficitPct);
  const cropDef = crops.getCrop(plot.cropId);

  const ctx = {
    current: comparison.currentTotalMm,
    baseline: comparison.baselineAvgMm,
    deficitPct,
    stage: crops.stageNameFor(stage.name, lang),
  };
  const advisory = riskEngine.buildAdvisory(lang, tier.tier, ctx);

  const enrichedComparison = { ...comparison, windowStartStr: climate.fmt(windowStart) };
  const evidence = riskEngine.buildEvidenceRecord(
    { ...plot, cropLabel: cropDef.label },
    stage,
    enrichedComparison,
    deficitPct,
    tier
  );

  const windowLengthDays = Math.max(1, Math.round((windowEndToDate - windowStart) / 86400000) + 1);
  const chartLengthDays = Math.min(windowLengthDays, comparison.windowLengthDays);
  const series = buildCumulativeSeries(comparison, chartLengthDays);

  return {
    plotId: plot.id,
    cropLabel: cropDef.label,
    stage: stage.name,
    daysElapsed,
    cropDuration: stage.cropDuration,
    harvestComplete: stage.harvestComplete,
    windowStart: climate.fmt(windowStart),
    dataThroughDate: comparison.dataThroughDate,
    currentTotalMm: comparison.currentTotalMm,
    baselineAvgMm: comparison.baselineAvgMm,
    baselineYearsUsed: comparison.baselineYearsUsed,
    deficitPct,
    tier: tier.tier,
    tierLabel: tier.label,
    advisory,
    evidenceText: evidence.text,
    generatedAt: evidence.generatedAt,
    series,
  };
}

const assessmentCache = new Map(); // plotId -> { dateStr, lang, result }

async function assessPlotCached(plot, lang = 'en') {
  const todayStr = new Date().toISOString().slice(0, 10);
  const hit = assessmentCache.get(plot.id);
  if (hit && hit.dateStr === todayStr && hit.lang === lang) return hit.result;
  const result = await assessPlot(plot, lang);
  assessmentCache.set(plot.id, { dateStr: todayStr, lang, result });
  return result;
}

module.exports = { assessPlot, assessPlotCached };
