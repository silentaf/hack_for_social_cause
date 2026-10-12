// Generic crop-duration and growth-stage models.
// Durations and stage boundaries are standard agronomic approximations
// (not official per-variety or per-region figures) used to decide which
// calendar window of rainfall to evaluate for a given plot.
const CROPS = {
  rice: {
    label: 'Rice (Paddy)',
    durationDays: 120,
    stages: [
      { name: 'Establishment', endFraction: 0.2 },
      { name: 'Vegetative', endFraction: 0.5 },
      { name: 'Reproductive', endFraction: 0.8 },
      { name: 'Ripening', endFraction: 1.0 },
    ],
  },
  wheat: {
    label: 'Wheat',
    durationDays: 120,
    stages: [
      { name: 'Germination', endFraction: 0.17 },
      { name: 'Vegetative', endFraction: 0.5 },
      { name: 'Reproductive', endFraction: 0.75 },
      { name: 'Maturity', endFraction: 1.0 },
    ],
  },
  maize: {
    label: 'Maize',
    durationDays: 100,
    stages: [
      { name: 'Establishment', endFraction: 0.2 },
      { name: 'Vegetative', endFraction: 0.5 },
      { name: 'Reproductive', endFraction: 0.8 },
      { name: 'Maturity', endFraction: 1.0 },
    ],
  },
  cotton: {
    label: 'Cotton',
    durationDays: 160,
    stages: [
      { name: 'Establishment', endFraction: 0.15 },
      { name: 'Vegetative', endFraction: 0.45 },
      { name: 'Flowering & Boll', endFraction: 0.8 },
      { name: 'Maturity', endFraction: 1.0 },
    ],
  },
  soybean: {
    label: 'Soybean',
    durationDays: 100,
    stages: [
      { name: 'Establishment', endFraction: 0.2 },
      { name: 'Vegetative', endFraction: 0.5 },
      { name: 'Reproductive', endFraction: 0.8 },
      { name: 'Maturity', endFraction: 1.0 },
    ],
  },
  sugarcane: {
    label: 'Sugarcane',
    durationDays: 300,
    stages: [
      { name: 'Establishment', endFraction: 0.15 },
      { name: 'Tillering', endFraction: 0.4 },
      { name: 'Grand Growth', endFraction: 0.8 },
      { name: 'Maturity', endFraction: 1.0 },
    ],
  },
};

const STAGE_NAME_HI = {
  Establishment: 'स्थापना',
  Vegetative: 'वनस्पति वृद्धि',
  Reproductive: 'प्रजनन',
  Ripening: 'पकने',
  Germination: 'अंकुरण',
  Maturity: 'परिपक्वता',
  'Flowering & Boll': 'फूल व कपास बॉल',
  Tillering: 'कल्ले निकलना',
  'Grand Growth': 'मुख्य वृद्धि',
};

function stageNameFor(name, lang) {
  if (lang === 'hi') return STAGE_NAME_HI[name] || name;
  return name;
}

function listCrops() {
  return Object.entries(CROPS).map(([id, c]) => ({ id, label: c.label, durationDays: c.durationDays }));
}

function getCrop(id) {
  return CROPS[id];
}

// Returns the stage covering `daysElapsed`, plus the day-offset window
// [stageStartDay, stageEndDay] (inclusive, clamped to daysElapsed for "to date").
function currentStage(cropId, daysElapsed) {
  const crop = CROPS[cropId];
  if (!crop) return null;
  const duration = crop.durationDays;
  const clampedDays = Math.max(0, Math.min(daysElapsed, duration));
  let prevEnd = 0;
  for (const stage of crop.stages) {
    const stageEndDay = Math.round(stage.endFraction * duration);
    if (clampedDays <= stageEndDay || stage === crop.stages[crop.stages.length - 1]) {
      return {
        name: stage.name,
        stageStartDay: prevEnd,
        stageEndDay,
        toDateDay: Math.min(clampedDays, stageEndDay),
        cropDuration: duration,
        harvestComplete: daysElapsed > duration,
      };
    }
    prevEnd = stageEndDay;
  }
  return null;
}

module.exports = { CROPS, listCrops, getCrop, currentStage, stageNameFor };
