let plots = [];
let seq = 1;

function addPlot(data) {
  const id = `p${seq++}`;
  const plot = { id, createdAt: new Date().toISOString(), ...data };
  plots.push(plot);
  return plot;
}

function listPlots() {
  return plots;
}

function getPlot(id) {
  return plots.find((p) => p.id === id);
}

module.exports = { addPlot, listPlots, getPlot };
