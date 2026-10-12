// Classifies a rainfall deficit/surplus percentage into a risk tier.
// Thresholds are reasonable working assumptions for a prototype, not an
// official agronomic or insurance standard.
function classify(deficitPct) {
  if (deficitPct === null) return { tier: 'unknown', label: 'Insufficient data' };
  if (deficitPct <= -50) return { tier: 'excess', label: 'Excess Rainfall Risk' };
  if (deficitPct >= 50) return { tier: 'severe', label: 'Severe Deficit' };
  if (deficitPct >= 30) return { tier: 'alert', label: 'Alert' };
  if (deficitPct >= 15) return { tier: 'watch', label: 'Watch' };
  return { tier: 'normal', label: 'Normal' };
}

const ADVISORY_TEMPLATES = {
  en: {
    severe: (ctx) => `Severe rainfall deficit: only ${ctx.current}mm fell during the ${ctx.stage} stage so far, against a ${ctx.baseline}mm average for this period at your plot. Consider emergency irrigation if available, and keep this record for your crop insurance claim.`,
    alert: (ctx) => `Rainfall is running well below normal (${ctx.deficitPct}% below the ${ctx.baseline}mm average) during the ${ctx.stage} stage. Monitor soil moisture closely and plan supplemental irrigation.`,
    watch: (ctx) => `Rainfall is somewhat below normal (${ctx.deficitPct}% below average) for the ${ctx.stage} stage. No urgent action needed yet — keep watching.`,
    normal: (ctx) => `Rainfall for the ${ctx.stage} stage is close to the normal range (${ctx.current}mm vs ${ctx.baseline}mm average) for your plot.`,
    excess: (ctx) => `Rainfall is well above normal (${ctx.current}mm vs ${ctx.baseline}mm average) during the ${ctx.stage} stage — watch for waterlogging or flood risk.`,
    unknown: () => `Not enough climate data is available yet to assess this plot.`,
  },
  hi: {
    severe: (ctx) => `गंभीर वर्षा की कमी: ${ctx.stage} चरण में अब तक केवल ${ctx.current}मिमी वर्षा हुई, जबकि इस अवधि का औसत ${ctx.baseline}मिमी है। यदि संभव हो तो आपातकालीन सिंचाई करें और यह रिकॉर्ड अपने फसल बीमा दावे के लिए रखें।`,
    alert: (ctx) => `वर्षा सामान्य से काफी कम (${ctx.baseline}मिमी औसत से ${ctx.deficitPct}% कम) है, ${ctx.stage} चरण के दौरान। मिट्टी की नमी पर नज़र रखें और पूरक सिंचाई की योजना बनाएं।`,
    watch: (ctx) => `${ctx.stage} चरण में वर्षा औसत से थोड़ी कम (${ctx.deficitPct}%) है। अभी तत्काल कार्रवाई की आवश्यकता नहीं, निगरानी जारी रखें।`,
    normal: (ctx) => `आपके खेत में ${ctx.stage} चरण की वर्षा सामान्य सीमा (${ctx.current}मिमी बनाम ${ctx.baseline}मिमी औसत) के करीब है।`,
    excess: (ctx) => `${ctx.stage} चरण में वर्षा सामान्य से बहुत अधिक (${ctx.current}मिमी बनाम ${ctx.baseline}मिमी औसत) है — जलभराव या बाढ़ के जोखिम पर ध्यान दें।`,
    unknown: () => `इस खेत का आकलन करने के लिए पर्याप्त जलवायु डेटा अभी उपलब्ध नहीं है।`,
  },
};

function buildAdvisory(lang, tier, ctx) {
  const templates = ADVISORY_TEMPLATES[lang] || ADVISORY_TEMPLATES.en;
  const fn = templates[tier] || templates.unknown;
  return fn(ctx);
}

function buildEvidenceRecord(plot, stage, comparison, deficitPct, tier) {
  const generatedAt = new Date().toISOString();
  const text = [
    'RAINFALL ANOMALY EVIDENCE RECORD',
    '(Independently sourced from public climate data — supporting evidence to accompany, not replace, an official crop-loss assessment)',
    '',
    `Plot: ${plot.name || 'Unnamed'} (ID ${plot.id})`,
    `Farmer: ${plot.farmerName || 'N/A'} ${plot.phone ? '· ' + plot.phone : ''}`,
    `Location: ${plot.lat.toFixed(4)}, ${plot.lng.toFixed(4)}`,
    `Crop: ${plot.cropLabel} · Sown: ${plot.sowingDate}`,
    `Growth stage evaluated: ${stage.name}`,
    `Window evaluated: ${comparison.windowStartStr} to ${comparison.dataThroughDate} (${comparison.windowLengthDays} days)`,
    '',
    `Rainfall this season: ${comparison.currentTotalMm} mm`,
    `Historical average for same window (${comparison.baselineYearsUsed}-year baseline): ${comparison.baselineAvgMm} mm`,
    `Deviation: ${deficitPct === null ? 'N/A' : deficitPct + '%'} (${tier.label})`,
    '',
    `Data source: Open-Meteo ERA5 historical reanalysis (archive-api.open-meteo.com)`,
    `Generated: ${generatedAt}`,
  ].join('\n');
  return { generatedAt, text };
}

module.exports = { classify, buildAdvisory, buildEvidenceRecord };
