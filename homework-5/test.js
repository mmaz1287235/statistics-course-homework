'use strict';
const assert=require('node:assert/strict');
const h=require('./script.js');
const close=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b} within ${tol}`);
for(const key of ['square','sine','step','absolute']){
  const f=h.getFunction(key),v=h.levelSums(f,1024),r=h.midpoint(f,4096);
  assert.ok(v.lower<=f.exact+1e-12,`${key}: lower bound`);
  assert.ok(v.upper>=f.exact-1e-12,`${key}: upper bound`);
  assert.ok(v.upper-v.lower<=(f.M*(f.b-f.a)/1024)+1e-10,`${key}: width`);
  assert.ok(Math.abs(r-f.exact)<1e-5,`${key}: Riemann convergence`);
}
const sing=h.getFunction('singular',8),v=h.levelSums(sing,2048);
close(h.clippedExact('singular',8),1.875);assert.ok(v.lower<=1.875&&v.upper>=1.875);
close(h.midpoint(sing,1000000),2,0.001);
close(h.thomaeRationalMid(1),0.5);
assert.ok(h.thomaeRationalMid(1024)<0.02);
for (const [z,ref] of h.refs){
  close(h.simpsonCDF(z,1000).value,ref,1e-11);
  close(h.seriesCDF(z).value,ref,2e-13);
  close(h.erfApproxCDF(z).value,ref,8e-8);
  close(h.simpsonCDF(z,100).value+h.simpsonCDF(-z,100).value,1,2e-15);
}
assert.throws(()=>h.simpsonCDF(1,3));
console.log('PASS: analytic level bounds, integrals, improper case, Thomae grids, normal CDF, symmetry and input guard.');
