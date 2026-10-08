'use strict';

// A teaching example, not a cryptographic hash and not suitable for security use.
const FIELD = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
const ORDER = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
const GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n;
const GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n;
const BASE = { x: GX, y: GY, z: 1n };
const INFINITY = { x: 0n, y: 1n, z: 0n };
const mod = (a, p = FIELD) => ((a % p) + p) % p;

function inverse(a, p = FIELD) {
  if (mod(a, p) === 0n) throw new Error('Zero has no modular inverse');
  let [oldR, r] = [p, mod(a, p)];
  let [oldS, s] = [0n, 1n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  return mod(oldS, p);
}

function doublePoint(p) {
  if (p.z === 0n || p.y === 0n) return INFINITY;
  const yy = mod(p.y * p.y);
  const s = mod(4n * p.x * yy);
  const m = mod(3n * p.x * p.x); // secp256k1 has a = 0
  const x = mod(m * m - 2n * s);
  const y = mod(m * (s - x) - 8n * yy * yy);
  const z = mod(2n * p.y * p.z);
  return { x, y, z };
}

function addPoints(p, q) {
  if (p.z === 0n) return q;
  if (q.z === 0n) return p;
  const z1sq = mod(p.z * p.z);
  const z2sq = mod(q.z * q.z);
  const u1 = mod(p.x * z2sq);
  const u2 = mod(q.x * z1sq);
  const s1 = mod(p.y * z2sq * q.z);
  const s2 = mod(q.y * z1sq * p.z);
  if (u1 === u2) return s1 === s2 ? doublePoint(p) : INFINITY;
  const h = mod(u2 - u1);
  const r = mod(s2 - s1);
  const h2 = mod(h * h);
  const h3 = mod(h2 * h);
  const x = mod(r * r - h3 - 2n * u1 * h2);
  const y = mod(r * (u1 * h2 - x) - s1 * h3);
  const z = mod(h * p.z * q.z);
  return { x, y, z };
}

function multiplyBase(scalar) {
  let k = mod(scalar, ORDER);
  let result = INFINITY;
  let point = BASE;
  while (k > 0n) {
    if (k & 1n) result = addPoints(result, point);
    point = doublePoint(point);
    k >>= 1n;
  }
  return result;
}

function affine(point) {
  if (point.z === 0n) return null;
  const zi = inverse(point.z);
  const zi2 = mod(zi * zi);
  return { x: mod(point.x * zi2), y: mod(point.y * zi2 * zi) };
}

function toyHashBytes(bytes) {
  // Educational rolling scalar. It is easy to attack; ECC does not repair that.
  let k = 1n;
  for (const byte of bytes) k = mod(k * 257n + BigInt(byte + 1), ORDER);
  k = mod(k * 257n + BigInt(bytes.length + 1), ORDER);
  // The scalar is nonzero for the short messages used in this demonstration.
  if (k === 0n) return null;
  const point = affine(multiplyBase(k));
  return point.x.toString(16).padStart(64, '0');
}

function toyHash(text) { return toyHashBytes(new TextEncoder().encode(text)); }
function bitDistance(a, b) {
  let x = BigInt('0x' + a) ^ BigInt('0x' + b);
  let count = 0;
  while (x) { count += Number(x & 1n); x >>= 1n; }
  return count;
}
function ones(hex) { return bitDistance(hex, '0'.repeat(64)); }
function binaryEntropy(probability) {
  if (probability <= 0 || probability >= 1) return 0;
  return -probability * Math.log2(probability) - (1 - probability) * Math.log2(1 - probability);
}
function analysis(samples = 24) {
  const outputs = [];
  const distances = [];
  for (let i = 0; i < samples; i++) {
    const data = new TextEncoder().encode(`sample-${String(i).padStart(4, '0')}`);
    const altered = Uint8Array.from(data);
    altered[altered.length - 1] ^= 1; // change exactly one input bit
    const a = toyHashBytes(data);
    const b = toyHashBytes(altered);
    outputs.push(a);
    distances.push(bitDistance(a, b));
  }
  const totalOnes = outputs.reduce((sum, h) => sum + ones(h), 0);
  const probability = totalOnes / (outputs.length * 256);
  return {
    samples,
    ones: totalOnes,
    totalBits: samples * 256,
    proportion: probability,
    entropy: binaryEntropy(probability),
    avgDistance: distances.reduce((a, b) => a + b, 0) / distances.length,
    minDistance: Math.min(...distances),
    maxDistance: Math.max(...distances),
    collisions: samples - new Set(outputs).size,
    distances,
    standardDeviation: Math.sqrt(distances.reduce((sum, x) => sum + (x - distances.reduce((a,b)=>a+b,0)/samples)**2, 0)/samples)
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { mod, inverse, multiplyBase, affine, toyHash, toyHashBytes, bitDistance, analysis, ORDER, GX, GY };
}

if (typeof document !== 'undefined') {
  const input = document.getElementById('message');
  const hashOutput = document.getElementById('hash-output');
  const report = document.getElementById('report');
  const run = document.getElementById('run');
  const compare = document.getElementById('compare');
  const changed = document.getElementById('changed-message');
  const comparison = document.getElementById('comparison');
  compare.addEventListener('click', () => {
    try {
      const first = toyHash(input.value);
      const second = toyHash(changed.value);
      if (!first || !second) throw new Error('Point at infinity');
      const distance = bitDistance(first, second);
      comparison.textContent = `Output A: ${first}\nOutput B: ${second}\nDifferent bits: ${distance} / 256 (${(100*distance/256).toFixed(2)}%)`;
    } catch (error) { comparison.textContent = `Error: ${error.message}`; }
  });
  const calculate = document.getElementById('calculate');
  calculate.addEventListener('click', () => {
    try {
      hashOutput.textContent = toyHash(input.value) ?? 'Point at infinity: no x coordinate';
    } catch (error) { hashOutput.textContent = `Error: ${error.message}`; }
  });
  run.addEventListener('click', () => {
    run.disabled = true;
    const count = Number(document.getElementById('sample-count').value);
    report.textContent = `Running ${count} fixed test pairs. This may take a few seconds...`;
    // Let the progress message render before doing the CPU-intensive calculations.
    setTimeout(() => {
      try {
        const a = analysis(count);
        report.innerHTML = `
          <div class="stats-grid">
            <div><strong>${(a.proportion * 100).toFixed(2)}%</strong><span>Output bits equal to 1</span></div>
            <div><strong>${a.avgDistance.toFixed(1)} / 256</strong><span>Average bits changed</span></div>
            <div><strong>${a.entropy.toFixed(4)}</strong><span>Binary entropy of pooled bits</span></div>
            <div><strong>${a.collisions}</strong><span>Collisions among ${a.samples} outputs</span></div>
          </div>
          <p class="small">Range: ${a.minDistance}–${a.maxDistance} bits; standard deviation: ${a.standardDeviation.toFixed(2)} bits. The inputs are structured, and these results do not establish cryptographic security.</p>`;
        const bins = Array(16).fill(0);
        for (const d of a.distances) bins[Math.min(15, Math.floor(d / 16))]++;
        const max = Math.max(...bins,1);
        document.getElementById('histogram').innerHTML = `<p class="small">Distribution of Hamming distances (16-bit intervals)</p><div class="histogram" role="img" aria-label="Histogram of changed output bits">${bins.map((v,i) => `<div class="hist-bin" title="${i*16}–${i*16+15} changed bits: ${v} samples"><span style="height:${Math.max(2,Math.round(v/max*140))}px"></span><small>${i*16}</small></div>`).join('')}</div><p class="small">Each bar counts test pairs with a Hamming distance in that 16-bit interval. Hover for the count.</p>`;
        const chart = document.getElementById('distribution');
        const pct = a.proportion * 100;
        chart.innerHTML = `<div class="meter"><span class="zero" style="width:${100-pct}%"></span><span class="one" style="width:${pct}%"></span></div><p class="small">0 bits: ${(100-pct).toFixed(2)}% · 1 bits: ${pct.toFixed(2)}% (ideal benchmark: 50% / 50%)</p>`;
      } catch (error) { report.textContent = `Error: ${error.message}`; }
      finally { run.disabled = false; }
    }, 30);
  });
  calculate.click();
  compare.click();
}
