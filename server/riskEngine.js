const STATUS = { GOOD: 'good', WARNING: 'warning', SERIOUS: 'serious', CRITICAL: 'critical' };

function trendPerMinute(history) {
  if (history.length < 2) return 0;
  const recent = history.slice(-6);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const minutes = (last.t - first.t) / 60000;
  if (minutes <= 0) return 0;
  return (last.count - first.count) / minutes;
}

function classify(count, capacity, history) {
  const ratio = count / capacity;
  const trend = trendPerMinute(history);
  const surgeFactor = trend > 0 ? trend / capacity : 0;

  let status = STATUS.GOOD;
  if (ratio >= 0.9 || (ratio >= 0.75 && surgeFactor > 0.05)) status = STATUS.CRITICAL;
  else if (ratio >= 0.75) status = STATUS.SERIOUS;
  else if (ratio >= 0.5 || (ratio >= 0.35 && surgeFactor > 0.05)) status = STATUS.WARNING;

  return { ratio, trend, status };
}

module.exports = { STATUS, classify };
