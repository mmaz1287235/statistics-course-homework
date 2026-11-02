'use strict';

// All computations are local. No external libraries or network requests.
function makeRandom(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function newAccumulator() { return { count: 0, mean: 0, SS: 0 }; }
function addScore(state, x) {
  state.count++;
  const delta = x - state.mean;
  state.mean += delta / state.count;
  state.SS += delta * (x - state.mean);
  return state;
}
function sampleVariance(state) {
  return state.count > 1 ? state.SS / (state.count - 1) : NaN;
}
function scoreFromRandom(random) { return Math.floor(random() * 11); }

function populationSD(values) {
  const a = newAccumulator();
  for (const value of values) addScore(a, value);
  return Math.sqrt(a.SS / a.count);
}
function average(values) {
  return values.reduce((sum, x) => sum + x, 0) / values.length;
}
function sdMeanTheory(n) { return Math.sqrt(10 / n); }
function sdVarianceTheory(n) {
  return Math.sqrt((178 - 100 * (n - 3) / (n - 1)) / n);
}

function simulate(m, requestedN, seed, checkpoints = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]) {
  const sizes = checkpoints.filter(n => n <= requestedN);
  if (!sizes.includes(requestedN)) sizes.push(requestedN);
  sizes.sort((a, b) => a - b);
  const buckets = sizes.map(() => ({ means: [], variances: [] }));
  const random = makeRandom(seed);
  for (let hacker = 0; hacker < m; hacker++) {
    const running = newAccumulator();
    let next = 0;
    for (let n = 1; n <= requestedN; n++) {
      addScore(running, scoreFromRandom(random));
      if (n === sizes[next]) {
        buckets[next].means.push(running.mean);
        buckets[next].variances.push(sampleVariance(running));
        next++;
      }
    }
  }
  return sizes.map((n, i) => ({
    n,
    meanOfMeans: average(buckets[i].means),
    meanOfVariances: average(buckets[i].variances),
    sdOfMeans: populationSD(buckets[i].means),
    sdOfVariances: populationSD(buckets[i].variances),
    theorySDMeans: sdMeanTheory(n),
    theorySDVariances: sdVarianceTheory(n)
  }));
}

function fmt(number, places = 4) { return Number(number).toFixed(places); }
function setText(id, value) { document.getElementById(id).textContent = value; }
function td(row, value) {
  const cell = document.createElement('td');
  cell.textContent = value;
  row.appendChild(cell);
}

function checkSequence() {
  const status = document.getElementById('checkStatus');
  const raw = document.getElementById('sequence').value.trim();
  const parts = raw.split(',').map(v => v.trim());
  const values = parts.map(Number);
  if (!raw || parts.length > 100 || parts.some(v => v === '') ||
      values.some(v => !Number.isInteger(v) || v < 0 || v > 10)) {
    status.textContent = 'Enter between 1 and 100 integer scores (0–10), separated by commas.';
    status.className = 'status error';
    return;
  }
  const body = document.getElementById('checkRows');
  body.replaceChildren();
  const running = newAccumulator();
  for (const value of values) {
    addScore(running, value);
    const tr = document.createElement('tr');
    for (const data of [running.count, value, fmt(running.mean), fmt(running.SS),
      running.count === 1 ? 'undefined' : fmt(sampleVariance(running))]) td(tr, data);
    body.appendChild(tr);
  }
  const directMean = average(values);
  const directSS = values.reduce((sum, x) => sum + (x - directMean) ** 2, 0);
  const ok = Math.abs(running.mean - directMean) < 1e-10 &&
    Math.abs(running.SS - directSS) < 1e-9;
  setText('checkComparison', `Independent two-pass check: mean = ${fmt(directMean)}, SS = ${fmt(directSS)}. ${ok ? 'Matches Welford.' : 'Mismatch: please review.'}`);
  status.textContent = `Processed ${values.length} score${values.length === 1 ? '' : 's'}.`;
  status.className = 'status';
}

function drawChart(canvasId, rows, empiricalKey, theoryKey) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const width = Math.max(320, Math.round(canvas.getBoundingClientRect().width || 450));
  const height = 290;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const left = 48, right = 16, top = 20, bottom = 55;
  const pw = width - left - right, ph = height - top - bottom;
  const maximum = Math.max(...rows.flatMap(r => [r[empiricalKey], r[theoryKey]])) * 1.12 || 1;
  ctx.clearRect(0, 0, width, height);
  ctx.font = '11px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = top + ph * (1 - i / 4);
    ctx.strokeStyle = '#e7edf4'; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke();
    ctx.fillStyle = '#687b90'; ctx.fillText((maximum * i / 4).toFixed(2), left - 7, y + 4);
  }
  const xCoord = i => left + pw * (rows.length === 1 ? .5 : i / (rows.length - 1));
  const yCoord = v => top + ph * (1 - v / maximum);
  ctx.textAlign = 'center';
  rows.forEach((row, i) => {
    ctx.fillStyle = '#687b90';
    if (rows.length <= 6 || i % 2 === 0 || i === rows.length - 1) ctx.fillText(String(row.n), xCoord(i), height - bottom + 19);
  });
  ctx.fillText('Systems per hacker (n)', left + pw / 2, height - 8);
  for (const [key, color, dashed] of [[theoryKey, '#168b83', true], [empiricalKey, '#285cc4', false]]) {
    ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.setLineDash(dashed ? [6, 4] : []);
    ctx.beginPath();
    rows.forEach((r, i) => { if (i === 0) ctx.moveTo(xCoord(i), yCoord(r[key])); else ctx.lineTo(xCoord(i), yCoord(r[key])); });
    ctx.stroke(); ctx.setLineDash([]);
    rows.forEach((r, i) => { ctx.beginPath(); ctx.fillStyle = color; ctx.arc(xCoord(i), yCoord(r[key]), 3, 0, Math.PI * 2); ctx.fill(); });
  }
  ctx.textAlign = 'left'; ctx.font = '11px -apple-system, Segoe UI, sans-serif';
  ctx.fillStyle = '#285cc4'; ctx.fillRect(left + 3, 4, 17, 3); ctx.fillStyle = '#40536b'; ctx.fillText('Empirical', left + 25, 10);
  ctx.fillStyle = '#168b83'; ctx.fillRect(left + 103, 4, 17, 3); ctx.fillStyle = '#40536b'; ctx.fillText('Theory', left + 125, 10);
}

let currentRows = null;
function renderSimulation(rows) {
  currentRows = rows;
  const latest = rows[rows.length - 1];
  setText('meanEstimate', fmt(latest.meanOfMeans));
  setText('varianceEstimate', fmt(latest.meanOfVariances));
  setText('sdMeans', fmt(latest.sdOfMeans));
  setText('sdVariances', fmt(latest.sdOfVariances));
  setText('sdMeansTheory', `theory: ${fmt(latest.theorySDMeans)}`);
  setText('sdVariancesTheory', `theory: ${fmt(latest.theorySDVariances)}`);
  const body = document.getElementById('sampleRows');
  body.replaceChildren();
  for (const r of rows) {
    const tr = document.createElement('tr');
    for (const val of [r.n, fmt(r.meanOfMeans), fmt(r.meanOfVariances),
      `${fmt(r.sdOfMeans)} / ${fmt(r.theorySDMeans)}`,
      `${fmt(r.sdOfVariances)} / ${fmt(r.theorySDVariances)}`]) td(tr, val);
    body.appendChild(tr);
  }
  drawChart('meansChart', rows, 'sdOfMeans', 'theorySDMeans');
  drawChart('variancesChart', rows, 'sdOfVariances', 'theorySDVariances');
}

function runSimulation() {
  const m = Number(document.getElementById('hackers').value);
  const n = Number(document.getElementById('systems').value);
  const seed = Number(document.getElementById('seed').value);
  const status = document.getElementById('runStatus');
  if (!Number.isInteger(m) || m < 20 || m > 5000 || !Number.isInteger(n) || n < 2 || n > 5000 ||
      !Number.isSafeInteger(seed) || seed < 0 || seed > 4294967295) {
    status.textContent = 'Use 20–5000 hackers, a listed sample size, and an integer seed from 0 to 4294967295.';
    status.className = 'status error';
    return;
  }
  const button = document.getElementById('runButton');
  button.disabled = true;
  status.textContent = 'Calculating…'; status.className = 'status';
  // A short browser frame lets the status appear before long computations.
  requestAnimationFrame(() => setTimeout(() => {
    try {
      const rows = simulate(m, n, seed);
      renderSimulation(rows);
      status.textContent = `Finished: ${m} hackers × ${n} scores. Seed ${seed}.`;
    } catch (error) {
      status.textContent = `Simulation failed: ${error.message}`;
      status.className = 'status error';
    } finally { button.disabled = false; }
  }, 0));
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('checkButton').addEventListener('click', checkSequence);
    document.getElementById('runButton').addEventListener('click', runSimulation);
    checkSequence();
    runSimulation();
    let resizeHandle;
    window.addEventListener('resize', () => {
      clearTimeout(resizeHandle);
      resizeHandle = setTimeout(() => { if (currentRows) renderSimulation(currentRows); }, 130);
    });
  });
}
if (typeof module !== 'undefined') module.exports = { makeRandom, newAccumulator, addScore, sampleVariance, scoreFromRandom, simulate, sdMeanTheory, sdVarianceTheory };
