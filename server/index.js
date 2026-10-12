const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sim = require('./simulator');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/zones', (req, res) => {
  res.json(sim.getZoneStates());
});

app.get('/api/zones/:id/history', (req, res) => {
  const data = sim.getHistory(req.params.id);
  if (!data) return res.status(404).json({ error: 'zone not found' });
  res.json(data);
});

app.get('/api/camps', (req, res) => {
  res.json(sim.getCamps());
});

app.get('/api/alerts', (req, res) => {
  res.json(sim.getAlerts());
});

app.get('/api/sos', (req, res) => {
  res.json(sim.getSosReports());
});

app.post('/api/sos', (req, res) => {
  const { type, name, phone, zoneId, description } = req.body || {};
  if (!type || !zoneId) return res.status(400).json({ error: 'type and zoneId are required' });
  const report = sim.addSos({ type, name, phone, zoneId, description });
  io.emit('sosNew', report);
  res.json(report);
});

app.post('/api/sos/:id/resolve', (req, res) => {
  const report = sim.resolveSos(req.params.id);
  if (!report) return res.status(404).json({ error: 'not found' });
  io.emit('sosResolved', report);
  res.json(report);
});

app.post('/api/zones/:id/surge', (req, res) => {
  const ok = sim.triggerSurge(req.params.id);
  if (!ok) return res.status(404).json({ error: 'zone not found' });
  res.json({ ok: true });
});

app.post('/api/zones/:id/reset', (req, res) => {
  const ok = sim.resetZone(req.params.id);
  if (!ok) return res.status(404).json({ error: 'zone not found' });
  res.json({ ok: true });
});

io.on('connection', (socket) => {
  socket.emit('zoneSnapshot', sim.getZoneStates());
  socket.emit('alertSnapshot', sim.getAlerts());
  socket.emit('sosSnapshot', sim.getSosReports());
});

setInterval(() => {
  const { zones, alerts } = sim.tick();
  io.emit('zoneUpdate', zones);
  alerts.forEach((a) => io.emit('alert', a));
}, sim.TICK_MS);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`RakshaGrid server running at http://localhost:${PORT}`);
});
