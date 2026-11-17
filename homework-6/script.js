'use strict';

// Core calculations are DOM-independent and exported for Node.js tests.
const IndependenceLab = (() => {
  const categoriesX = ['Phishing', 'Credential abuse', 'Malware'];
  const categoriesF = ['Blocked', 'Contained', 'Compromised'];
  const examples = Object.freeze({
    associated: [[42, 15, 3], [20, 24, 16], [8, 21, 31]],
    near: [[21, 19, 20], [19, 21, 20], [20, 20, 20]]
  });

  function exampleCSV(key) {
    const matrix = examples[key];
    if (!matrix) throw new Error('Unknown example.');
    const lines = ['X,F'];
    matrix.forEach((row, i) => row.forEach((count, j) => {
      for (let k = 0; k < count; k++) lines.push(`${categoriesX[i]},${categoriesF[j]}`);
    }));
    return lines.join('\n');
  }

  function parsePairs(source) {
    if (typeof source !== 'string') throw new Error('Input must be text.');
    const lines = source.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
    if (lines.length && lines[0].replace(/\s/g, '').toLowerCase() === 'x,f') lines.shift();
    if (lines.length < 2 || lines.length > 5000) throw new Error('Enter between 2 and 5,000 paired records.');
    const pairs = lines.map((line, index) => {
      const parts = line.split(',');
      if (parts.length !== 2 || parts.some(p => !p.trim())) {
        throw new Error(`Invalid record on data line ${index + 1}. Each row needs exactly two non-empty comma-separated labels.`);
      }
      const x = parts[0].trim(); const f = parts[1].trim();
      if (x.length > 50 || f.length > 50) throw new Error('Category labels must be at most 50 characters.');
      return [x, f];
    });
    return pairs;
  }

  // Lanczos log Gamma, positive arguments only.
  function logGamma(z) {
    if (!(z > 0)) throw new Error('Gamma argument must be positive.');
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.6150291621406, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
    z -= 1;
    let x = c[0];
    for (let i = 1; i < c.length; i++) x += c[i] / (z + i);
    const t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  // Regularized upper incomplete Gamma Q(a,x); chi-square upper tail = Q(df/2, chi2/2).
  function gammaQ(a, x) {
    if (!(a > 0) || !(x >= 0) || !Number.isFinite(x)) throw new Error('Invalid gamma parameters.');
    if (x === 0) return 1;
    const eps = 2e-14, floor = 1e-300, limit = 10000;
    const multiplier = Math.exp(a * Math.log(x) - x - logGamma(a));
    if (x < a + 1) {
      let term = 1 / a, sum = term;
      for (let n = 1; n <= limit; n++) {
        term *= x / (a + n); sum += term;
        if (Math.abs(term) < Math.abs(sum) * eps) return Math.max(0, Math.min(1, 1 - sum * multiplier));
      }
    } else {
      let b = x + 1 - a;
      let c = 1 / floor;
      let d = 1 / (Math.abs(b) < floor ? floor : b);
      let h = d;
      for (let n = 1; n <= limit; n++) {
        const an = -n * (n - a);
        b += 2;
        d = an * d + b;
        if (Math.abs(d) < floor) d = floor;
        c = b + an / c;
        if (Math.abs(c) < floor) c = floor;
        d = 1 / d;
        const delta = d * c;
        h *= delta;
        if (Math.abs(delta - 1) < eps) return Math.max(0, Math.min(1, multiplier * h));
      }
    }
    throw new Error('Numerical gamma evaluation did not converge.');
  }

  function analyze(pairs) {
    if (!Array.isArray(pairs) || pairs.length < 2 || pairs.length > 5000) throw new Error('Invalid number of observations.');
    const xs = [], fs = [], xIndex = new Map(), fIndex = new Map();
    for (const pair of pairs) {
      if (!Array.isArray(pair) || pair.length !== 2 || pair.some(label => typeof label !== 'string' || !label.trim())) throw new Error('Every observation must contain two non-empty categories.');
      for (const [label, list, map] of [[pair[0], xs, xIndex], [pair[1], fs, fIndex]]) {
        if (!map.has(label)) { map.set(label, list.length); list.push(label); }
      }
    }
    if (xs.length < 2 || fs.length < 2) throw new Error('Each variable needs at least two observed categories for this test.');
    if (xs.length > 8 || fs.length > 8) throw new Error('Use at most eight distinct categories for each variable.');
    const observed = Array.from({length: xs.length}, () => Array(fs.length).fill(0));
    for (const [x, f] of pairs) observed[xIndex.get(x)][fIndex.get(f)]++;
    const rows = observed.map(row => row.reduce((a, b) => a + b, 0));
    const cols = fs.map((_, j) => observed.reduce((sum, row) => sum + row[j], 0));
    const n = pairs.length;
    const expected = observed.map((row, i) => row.map((_, j) => rows[i] * cols[j] / n));
    const contributions = observed.map((row, i) => row.map((o, j) => (o - expected[i][j]) ** 2 / expected[i][j]));
    const chi2 = contributions.flat().reduce((a, b) => a + b, 0);
    const df = (xs.length - 1) * (fs.length - 1);
    const p = gammaQ(df / 2, chi2 / 2);
    const v = Math.sqrt(chi2 / (n * Math.min(xs.length - 1, fs.length - 1)));
    const rowConditional = observed.map((row, i) => row.map(o => o / rows[i]));
    const colConditional = observed.map(row => row.map((o, j) => o / cols[j]));
    const lowExpected = expected.flat().filter(e => e < 5).length;
    return {xs, fs, n, observed, rows, cols, expected, contributions, chi2, df, p, v, rowConditional, colConditional, lowExpected};
  }
  return {examples, exampleCSV, parsePairs, analyze, gammaQ, logGamma};
})();

if (typeof module !== 'undefined' && module.exports) module.exports = IndependenceLab;

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const byId = id => document.getElementById(id);
    const fmt = (v, digits = 3) => Number(v).toFixed(digits);
    const percent = v => `${(100 * v).toFixed(1)}%`;
    let current = null;

    function node(tag, text, className = '') {
      const element = document.createElement(tag);
      if (text !== undefined && text !== null) element.textContent = String(text);
      if (className) element.className = className;
      return element;
    }
    function showTable(where, headers, data, totalColumn = false, totalRow = false) {
      const container = byId(where);
      container.replaceChildren();
      const table = node('table', undefined, 'table-grid');
      const thead = node('thead'); const tr = node('tr');
      headers.forEach(header => tr.appendChild(node('th', header)));
      thead.appendChild(tr); table.appendChild(thead);
      const tbody = node('tbody');
      data.forEach((cells, rowIndex) => {
        const row = node('tr', undefined, totalRow && rowIndex === data.length - 1 ? 'total' : '');
        cells.forEach((cell, index) => {
          const el = node(index === 0 ? 'th' : 'td', cell,
            (totalColumn && index === cells.length - 1 ? 'total' : ''));
          if (index === 0) el.setAttribute('scope', 'row');
          row.appendChild(el);
        });
        tbody.appendChild(row);
      });
      table.appendChild(tbody); container.appendChild(table);
    }
    function metric(title, value, subtitle = '') {
      const box = node('div', undefined, 'result');
      box.append(node('small', title), node('strong', value), node('span', subtitle));
      return box;
    }
    function drawBars(result) {
      const where = byId('conditionalBars'); const legend = byId('barLegend');
      where.replaceChildren(); legend.replaceChildren();
      const colors = ['#285cc4', '#de914c', '#168476', '#9564ad', '#c36688', '#69869b', '#bd9a36', '#586178'];
      result.fs.forEach((f, index) => {
        const item = node('span'); const dot = node('span', undefined, 'legend-dot');
        dot.style.background = colors[index]; item.append(dot, node('span', f)); legend.appendChild(item);
      });
      result.xs.forEach((x, i) => {
        const group = node('div', undefined, 'bar-group');
        group.appendChild(node('div', `${x} · ${result.rows[i]} records`, 'bar-label'));
        const stack = node('div', undefined, 'stack');
        stack.setAttribute('aria-label', result.fs.map((f, j) => `${f}: ${percent(result.rowConditional[i][j])}`).join(', '));
        result.fs.forEach((f, j) => {
          const piece = node('span');
          piece.style.width = `${result.rowConditional[i][j] * 100}%`;
          piece.style.background = colors[j];
          piece.title = `${x} / ${f}: ${percent(result.rowConditional[i][j])}`;
          stack.appendChild(piece);
        });
        group.appendChild(stack); where.appendChild(group);
      });
    }
    function pFormat(p) {
      if (p < 1e-6) return p === 0 ? '< 1 × 10⁻³⁰⁰' : p.toExponential(3);
      return fmt(p, 6);
    }
    function render(result) {
      current = result;
      byId('dataSummary').replaceChildren(
        metric('Paired observations', result.n, 'Records used in the analysis'),
        metric('Categories of X', result.xs.length, result.xs.join(' · ')),
        metric('Categories of F', result.fs.length, result.fs.join(' · '))
      );
      showTable('observedTable', ['X / F', ...result.fs, 'Total'], [
        ...result.observed.map((row, i) => [result.xs[i], ...row, result.rows[i]]),
        ['Total', ...result.cols, result.n]
      ], true, true);
      showTable('rowConditional', ['X / F', ...result.fs, 'Total'], result.rowConditional.map((row, i) => [
        result.xs[i], ...row.map(percent), '100.0%'
      ]), true);
      showTable('colConditional', ['X / F', ...result.fs], [
        ...result.colConditional.map((row, i) => [result.xs[i], ...row.map(percent)]),
        ['Total', ...result.fs.map(() => '100.0%')]
      ], false, true);
      showTable('expectedTable', ['X / F', ...result.fs, 'Total'], [
        ...result.expected.map((row, i) => [result.xs[i], ...row.map(x => fmt(x, 3)), fmt(result.rows[i], 3)]),
        ['Total', ...result.cols.map(x => fmt(x, 3)), fmt(result.n, 3)]
      ], true, true);
      showTable('contributionTable', ['X / F', ...result.fs, 'Row sum'], [
        ...result.contributions.map((row, i) => [result.xs[i], ...row.map(x => fmt(x, 4)), fmt(row.reduce((a, b) => a + b, 0), 4)]),
        ['Total', ...result.fs.map((_, j) => fmt(result.contributions.reduce((s, row) => s + row[j], 0), 4)), fmt(result.chi2, 4)]
      ], true, true);
      byId('testSummary').replaceChildren(
        metric('Chi-square statistic', fmt(result.chi2, 4), 'Pearson χ²'),
        metric('Degrees of freedom', result.df, '(r − 1)(c − 1)'),
        metric('Upper-tail p-value', pFormat(result.p), 'Chi-square approximation'),
        metric("Cramér's V", fmt(result.v, 4), 'Magnitude of association')
      );
      drawBars(result);
      updateDecision();
    }
    function updateDecision() {
      if (!current) return;
      const alpha = Number(byId('alpha').value), reject = current.p < alpha;
      const message = reject
        ? `At α = ${alpha.toFixed(2)}, reject the null hypothesis of independence (p = ${pFormat(current.p)}). The table shows statistical evidence of association under the test assumptions.`
        : `At α = ${alpha.toFixed(2)}, do not reject the null hypothesis (p = ${pFormat(current.p)}). The table does not show sufficient evidence of association; independence has not been proved.`;
      byId('decision').textContent = message;
      const assumptions = byId('assumptions'); assumptions.replaceChildren();
      const info = node('div', undefined, current.lowExpected ? 'pill warning' : 'pill good');
      info.textContent = current.lowExpected
        ? `Caution: ${current.lowExpected} of ${current.xs.length * current.fs.length} expected cells below 5`
        : 'Expected-count check: every expected cell ≥ 5';
      assumptions.appendChild(info);
      assumptions.appendChild(node('p', 'The chi-square approximation assumes independent observations, suitable categorical measurements, and adequate expected counts. The data themselves cannot verify independence of sampling.', 'note'));
      byId('conclusion').textContent = `${message} Cramér's V = ${fmt(current.v, 4)} quantifies the sample association. ${current.lowExpected ? 'Low expected counts make the chi-square reference distribution less reliable. ' : ''}Because these example records are synthetic (or user-provided), no population-level or causal conclusion can be drawn without a defensible sampling design and contextual evidence.`;
    }
    function evaluate() {
      const status = byId('inputStatus');
      try {
        const result = IndependenceLab.analyze(IndependenceLab.parsePairs(byId('dataInput').value));
        render(result);
        status.textContent = `Analyzed ${result.n} paired records.`;
        status.className = 'status';
      } catch (error) {
        status.textContent = error.message;
        status.className = 'status error';
      }
    }
    function load(key) { byId('dataInput').value = IndependenceLab.exampleCSV(key); evaluate(); }
    byId('analyze').addEventListener('click', evaluate);
    byId('loadExample').addEventListener('click', () => load(byId('scenario').value));
    byId('reset').addEventListener('click', () => {byId('scenario').value = 'associated'; load('associated');});
    byId('alpha').addEventListener('change', updateDecision);
    load('associated');
  });
}
