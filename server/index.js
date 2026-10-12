const path = require('path');
const express = require('express');
const crops = require('./crops');
const store = require('./store');
const { assessPlotCached } = require('./assess');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/crops', (req, res) => {
  res.json(crops.listCrops());
});

app.post('/api/plots', (req, res) => {
  const { name, farmerName, phone, lat, lng, cropId, sowingDate, lang } = req.body || {};
  if (lat === undefined || lng === undefined || !cropId || !sowingDate) {
    return res.status(400).json({ error: 'lat, lng, cropId and sowingDate are required' });
  }
  if (!crops.getCrop(cropId)) return res.status(400).json({ error: 'unknown cropId' });
  const plot = store.addPlot({
    name: name || 'Unnamed plot',
    farmerName: farmerName || '',
    phone: phone || '',
    lat: Number(lat),
    lng: Number(lng),
    cropId,
    sowingDate,
    lang: lang || 'en',
  });
  res.json(plot);
});

app.get('/api/plots', async (req, res) => {
  const plots = store.listPlots();
  const results = [];
  for (const plot of plots) {
    try {
      const assessment = await assessPlotCached(plot, plot.lang || 'en');
      results.push({ ...plot, assessment });
    } catch (e) {
      results.push({ ...plot, assessment: null, error: e.message });
    }
  }
  res.json(results);
});

app.get('/api/plots/:id', async (req, res) => {
  const plot = store.getPlot(req.params.id);
  if (!plot) return res.status(404).json({ error: 'plot not found' });
  try {
    const lang = req.query.lang || plot.lang || 'en';
    const assessment = await assessPlotCached(plot, lang);
    res.json({ ...plot, assessment });
  } catch (e) {
    res.status(502).json({ error: 'climate data unavailable', detail: e.message });
  }
});

app.get('/api/plots/:id/evidence', async (req, res) => {
  const plot = store.getPlot(req.params.id);
  if (!plot) return res.status(404).json({ error: 'plot not found' });
  try {
    const lang = req.query.lang || plot.lang || 'en';
    const assessment = await assessPlotCached(plot, lang);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="evidence-${plot.id}.txt"`);
    res.send(assessment.evidenceText);
  } catch (e) {
    res.status(502).json({ error: 'climate data unavailable', detail: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FasalRaksha server running at http://localhost:${PORT}`);
});
