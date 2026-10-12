# FasalRaksha

**Climate-risk early warning and crop-insurance evidence platform for Indian farmers**
Built for *Hack for Social Cause — Youth Tech Challenge 2027* (VBYLD 2027)
Themes: **Rural Development & Livelihoods** · **AI, GIS & Emerging Technologies**

## Problem Statement

India's crop insurance scheme (Pradhan Mantri Fasal Bima Yojana, PMFBY) is widely
documented to suffer from slow, often-disputed claim settlement. A farmer who
loses a crop to a rainfall deficit typically has to wait for a manual "crop
cutting experiment" conducted well after harvest before the loss is even
assessed — and because there is no independent, timestamped record of the
weather anomaly as it actually happened, disputes over whether a real deficit
occurred are common. By the time a claim is settled, many farmers are already
in debt distress.

**Target beneficiaries**: smallholder and marginal farmers dependent on
rain-fed agriculture, and the agriculture/insurance field officers who have to
decide, with limited staff, which villages or plots need urgent verification
first.

**Current gap**: there is no system that continuously watches a *specific
plot's* rainfall against its own historical norm, for its *specific crop's
current growth stage*, and produces independent evidence the moment a real
deficit shows up — before the claims process even starts.

## Solution

FasalRaksha is a two-sided platform built on **real, live climate data** (not
a simulated feed):

1. A farmer registers a plot (location, crop, sowing date). The system
   determines the crop's current growth stage (establishment / vegetative /
   reproductive / maturity, with stage boundaries specific to that crop) and
   pulls that exact window's rainfall for the plot's coordinates from
   Open-Meteo's ERA5 historical reanalysis — a genuine public climate dataset,
   not mock data.
2. It compares the current season's rainfall in that window against the
   **same plot's own 5-year average for the same calendar window**, so the
   comparison is apples-to-apples regardless of season or region.
3. When a statistically real deficit (or excess, for flood risk) appears, the
   farmer gets a plain-language advisory in English or Hindi, **and** a
   timestamped, source-attributed "rainfall anomaly evidence record" they can
   attach to an insurance claim immediately — not proof of a payout, but
   proof the anomaly existed, independently and from day one.
4. An officer-facing dashboard aggregates every registered plot on a map and
   in a sorted triage list, so limited field-verification capacity goes to
   the most severe cases first.

**Honest scope**: this tool does not auto-approve insurance claims and does
not replace an official assessment. It produces early-warning advisories and
independently-sourced supporting evidence to speed up and de-risk the human
verification process that still has to happen.

## UN SDG Alignment

- **SDG 1** — No Poverty (reduces the debt-distress window caused by slow
  claim settlement)
- **SDG 2** — Zero Hunger (earlier warning supports timely irrigation
  decisions, protecting yield)
- **SDG 13** — Climate Action (builds farm-level resilience and a usable
  climate-risk record at the plot level)

## Architecture

```
server/
  index.js     Express server, REST API
  crops.js     Per-crop duration + growth-stage model (generic agronomic assumption)
  climate.js   Fetches + caches real rainfall data from Open-Meteo's ERA5 archive
  riskEngine.js  Classifies deficit/excess into a risk tier; builds advisories + evidence text
  assess.js    Ties crop stage + climate comparison + risk classification together
  store.js     In-memory plot registry (hackathon scope — would be a real DB in production)
public/
  index.html     Landing page
  farmer.html    Plot registration + live risk assessment + evidence download
  officer.html   Map + sorted triage dashboard across all registered plots
```

All rainfall figures are fetched live from `archive-api.open-meteo.com` at
request time (cached 6h per plot to avoid hammering the API) — there is no
synthetic or simulated data anywhere in this build.

## Running it

```bash
npm install
npm start
```

Then open:
- `http://localhost:3000/` — landing page
- `http://localhost:3000/farmer.html` — register a plot (try a real lat/lng —
  e.g. `25.45, 81.85` for Prayagraj, or use "Use my current location") and see
  a live, real rainfall-deficit assessment with downloadable evidence
- `http://localhost:3000/officer.html` — see every registered plot triaged on
  a map and a sorted list

## Evaluation matrix fit

| Parameter | How FasalRaksha addresses it |
|---|---|
| Relevance | Directly targets a documented operational gap in PMFBY claim settlement |
| Technical Strength | Real external climate-data integration, per-crop growth-stage modeling, historical baseline comparison — not a static rule on fake data |
| Functionality | Fully working prototype — register a plot, get a live assessment and a downloadable evidence file, backed by real API calls |
| Creativity | Reframes "AI for agriculture" away from crop-disease-photo clichés toward the claims-evidence gap, which is a genuinely under-addressed angle |
| Social Cause Impact | Targets farmer debt distress at its root cause — claim delay and evidentiary dispute |
| Presentation | Clear farmer-facing and officer-facing views, demoable live with real coordinates |
| Teamwork | N/A (solo build) — climate/risk logic, farmer UI, and officer dashboard are natural module boundaries for a team |

## Limitations (stated honestly)

- Stage-boundary percentages are generic agronomic approximations, not
  official per-variety or per-region figures.
- A newly-started growth stage has a short evaluation window and can show a
  noisy deficit percentage; the signal is most meaningful once a stage has
  run for at least a couple of weeks.
- ERA5 reanalysis is a modeled climate product, not a ground rain-gauge
  reading — appropriate for triage and early warning, not as a sole legal
  basis for a claim decision.

## Next steps for a real deployment

- Replace the in-memory store with a real database and farmer authentication
- Add ground rain-gauge or IMD district-level data as a cross-check against
  the satellite/reanalysis estimate
- SMS/IVR advisory delivery for farmers without smartphone data access
- Direct integration with the PMFBY claims workflow so the evidence record
  attaches automatically rather than being downloaded manually
