# RakshaGrid

**AI-powered crowd safety & disaster mitigation platform for mass gatherings**
Built for *Hack for Social Cause — Youth Tech Challenge 2027* (VBYLD 2027)
Theme: **Disaster Mitigation, Kumbh Mela**

## Problem Statement

Mass religious and public gatherings in India — the Kumbh Mela above all — regularly
turn fatal because crowd density crossing a dangerous threshold is detected too late,
or not at all, for authorities to act before a stampede starts (Prayagraj 2025,
Allahabad 2013, Nashik 2003 are not isolated incidents, they are a recurring pattern).
At the same time, individual pilgrims — many elderly, many from rural areas with low
digital literacy, many unfamiliar with the ground layout — have no fast way to reach
medical help or report a lost family member once separated in a crowd of millions.

**Target beneficiaries**: pilgrims and attendees at mass gatherings (elderly, women,
children, persons with disabilities are disproportionately at risk in a crush), and
the control-room authorities (police, medical response, event administration)
responsible for preventing disasters in real time.

**Current gap**: crowd management today is largely manual (watchtowers, foot
patrols, radio reports) with no systematic, continuously-updated risk signal that
fuses density *and* the rate at which it's rising — the second is what actually
predicts a stampede before it happens, not just a static headcount.

## Solution

RakshaGrid is a two-sided real-time platform:

1. **Control Room Dashboard** — a live map of the gathering area divided into
   zones. Each zone streams a crowd-density reading (designed to ingest real
   CCTV/footfall-sensor feeds; simulated here for demo) and a **computed risk
   score** combining occupancy ratio *and* the surge trend, auto-escalating
   through Good → Warning → Serious → Critical and firing an alert the moment a
   zone crosses into danger — early enough for stewards to act, not just log the
   incident afterward.
2. **Citizen Help Page** — a one-tap interface for pilgrims: Medical Emergency,
   Report Lost Person, or General Help. Every request is automatically routed to
   the nearest real help camp (haversine distance) and pushed live to the control
   room queue, and the page shows a live crowding banner for the pilgrim's own
   zone so they know to be alert before anything goes wrong.

## UN SDG Alignment

- **SDG 3** — Good Health & Well-being (emergency medical routing, stampede
  prevention)
- **SDG 11** — Sustainable Cities & Communities (resilience and safety of public
  spaces during mass events)
- **SDG 16** — Peace, Justice & Strong Institutions (effective, accountable public
  safety response)
- **SDG 9** — Industry, Innovation & Infrastructure (real-time sensor-to-decision
  infrastructure for public safety)

## Architecture

```
server/
  index.js        Express + Socket.IO server, REST API, live broadcast loop
  simulator.js     In-memory zone/crowd simulation + SOS store + nearest-camp routing
  riskEngine.js    Occupancy-ratio + surge-trend → risk classification
  data/zones.json  10 representative zones around the Prayagraj Kumbh Mela area
  data/camps.json  Medical / police / lost-&-found help camps
public/
  index.html       Landing page
  dashboard.html   Control room (Leaflet map, live stat tiles, alerts, SOS queue, trend chart)
  citizen.html     Citizen-facing SOS / help page
```

Real-time updates flow over WebSocket (Socket.IO); REST endpoints serve snapshots
and accept SOS submissions. In production, `simulator.js`'s random-walk feed would
be replaced by real footfall-sensor/CCTV-analytics input — the risk engine and
alerting pipeline downstream are unchanged.

**Note on geodata**: zone and camp coordinates are illustrative placements around
the real Sangam/Prayagraj area for demo purposes, not verified official sector
boundaries — the system is built to ingest whatever real zone layout and sensor
feed the event administration provides.

## Running it

```bash
npm install
npm start
```

Then open:
- `http://localhost:3000/` — landing page
- `http://localhost:3000/dashboard.html` — control room (watch zones evolve live;
  the simulator randomly triggers crowd surges roughly every ~30–60s per zone so
  you'll see Warning → Serious → Critical escalations and alerts fire without
  waiting long)
- `http://localhost:3000/citizen.html` — citizen SOS page (submit a request, then
  switch to the dashboard tab to see it appear in the live SOS queue)

## Evaluation matrix fit

| Parameter | How RakshaGrid addresses it |
|---|---|
| Relevance | Directly matches the named "Disaster Mitigation, Kumbh Mela" theme |
| Technical Strength | Real-time WebSocket pipeline, trend-aware risk scoring (not a static threshold), geospatial nearest-facility routing |
| Functionality | Fully working prototype — live map, live alerts, working SOS flow with routing |
| Creativity | Surge-trend risk model + two-sided (authority + citizen) product, not just a single dashboard |
| Social Cause Impact | Directly targets a recurring, fatal, named national safety problem |
| Presentation | Clean control-room UI + simple citizen UI, demoable live in under 3 minutes |
| Teamwork | N/A (solo build) — architecture is modular for easy team hand-off (sensor ingestion / ML risk model / frontend can be split across members) |

## Next steps for a real deployment

- Replace simulated density with real CCTV-based crowd-counting (e.g. YOLO-based
  head counting) or telecom footfall data per zone
- Add a proper ML model (e.g. gradient boosting on historical surge → stampede
  outcomes) in place of the current rule-based trend classifier
- SMS/IVR fallback for citizens without smartphone data access
- Multilingual (Hindi + regional language) citizen UI
