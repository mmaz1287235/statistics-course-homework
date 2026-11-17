'use strict';
const assert = require('node:assert/strict');
const lab = require('./script.js');
const close = (a, b, tol = 1e-10) => assert.ok(Math.abs(a-b) <= tol, `${a} != ${b}`);

for (const key of Object.keys(lab.examples)) {
  const pairs = lab.parsePairs(lab.exampleCSV(key));
  const r = lab.analyze(pairs);
  assert.equal(r.n, 180);
  assert.equal(r.xs.length, 3);
  assert.equal(r.fs.length, 3);
  assert.equal(r.df, 4);
  close(r.rows.reduce((a,b)=>a+b), r.n);
  close(r.cols.reduce((a,b)=>a+b), r.n);
  r.rows.forEach((sum,i) => {
    close(r.observed[i].reduce((a,b)=>a+b), sum);
    close(r.expected[i].reduce((a,b)=>a+b), sum);
    close(r.rowConditional[i].reduce((a,b)=>a+b), 1);
  });
  r.cols.forEach((sum,j) => {
    close(r.expected.reduce((a,row)=>a+row[j],0), sum);
    close(r.colConditional.reduce((a,row)=>a+row[j],0), 1);
  });
  close(r.chi2, r.contributions.flat().reduce((a,b)=>a+b), 1e-12);
  assert.ok(r.p >= 0 && r.p <= 1);
  assert.ok(r.v >= 0 && r.v <= 1);
  assert.equal(r.lowExpected, 0);
}
const strong = lab.analyze(lab.parsePairs(lab.exampleCSV('associated')));
const weak = lab.analyze(lab.parsePairs(lab.exampleCSV('near')));
assert.ok(strong.chi2 > 30 && strong.p < 0.001);
assert.ok(weak.chi2 < 1 && weak.p > 0.9);
// Well-known 2 x 2 table; Pearson chi-square = 2/3 and df = 1.
const four = lab.analyze([['a','x'],['a','x'],['a','y'],['b','x'],['b','y'],['b','y']]);
close(four.chi2, 2/3);
close(four.p, 0.4142161782425251, 1e-9);
// The df=2 upper tail has exact formula e^(-chi2/2).
close(lab.gammaQ(1, 3.5), Math.exp(-3.5), 1e-13);
close(lab.gammaQ(0.5, 0), 1);
close(lab.gammaQ(2, 0.5), Math.exp(-0.5)*1.5, 1e-13);
assert.throws(()=>lab.analyze([['a','x'],['a','y']]), /at least two/);
assert.throws(()=>lab.parsePairs('X,F\na,x\nb'), /Invalid record/);
assert.throws(()=>lab.parsePairs('X,F\na,x\nb,y,z'), /Invalid record/);
console.log('PASS: paired-data parser, contingency counts, marginal and conditional frequencies, expected counts, chi-square, p-values, and guards.');
console.log('Associated example: chi2=' + strong.chi2.toFixed(5) + ', p=' + strong.p.toExponential(5) + ', V=' + strong.v.toFixed(5));
console.log('Weak-difference example: chi2=' + weak.chi2.toFixed(5) + ', p=' + weak.p.toFixed(6) + ', V=' + weak.v.toFixed(5));
