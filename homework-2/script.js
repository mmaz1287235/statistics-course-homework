'use strict';

const $ = (id) => document.getElementById(id);
const encoder = new TextEncoder();
const HEX = (bytes) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const fromHex = (value) => Uint8Array.from(value.match(/../g) || [], h => parseInt(h, 16));
const concat = (...parts) => Uint8Array.from(parts.flatMap(part => Array.from(part)));
const bigintBytes = (n, length = 32) => fromHex(n.toString(16).padStart(length * 2, '0'));
const bytesBigint = (b) => BigInt('0x' + HEX(b));
const MASK = (1n << 64n) - 1n;
const ROT = [0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
const RC = ['0000000000000001','0000000000008082','800000000000808a','8000000080008000','000000000000808b','0000000080000001','8000000080008081','8000000000008009','000000000000008a','0000000000000088','0000000080008009','000000008000000a','000000008000808b','800000000000008b','8000000000008089','8000000000008003','8000000000008002','8000000000000080','000000000000800a','800000008000000a','8000000080008081','8000000000008080','0000000080000001','8000000080008008'].map(s => BigInt('0x' + s));
function rol(x, n) { return n === 0 ? x : ((x << BigInt(n)) | (x >> BigInt(64 - n))) & MASK; }
function sponge256(input, suffix) {
  const rate = 136;
  const paddedLength = Math.ceil((input.length + 1) / rate) * rate;
  const padded = new Uint8Array(paddedLength);
  padded.set(input);
  padded[input.length] ^= suffix;
  padded[padded.length - 1] ^= 0x80;
  const a = new Array(25).fill(0n);
  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let i = 0; i < rate; i++) a[i >> 3] ^= BigInt(padded[offset + i]) << (8n * BigInt(i & 7));
    for (const round of RC) {
      const c = new Array(5); const d = new Array(5);
      for (let x = 0; x < 5; x++) c[x] = a[x] ^ a[x + 5] ^ a[x + 10] ^ a[x + 15] ^ a[x + 20];
      for (let x = 0; x < 5; x++) d[x] = c[(x + 4) % 5] ^ rol(c[(x + 1) % 5], 1);
      const b = new Array(25);
      for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) {
        const i = x + 5 * y;
        b[y + 5 * ((2 * x + 3 * y) % 5)] = rol(a[i] ^ d[x], ROT[i]);
      }
      for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) {
        a[x + 5 * y] = b[x + 5 * y] ^ ((~b[(x + 1) % 5 + 5 * y]) & b[(x + 2) % 5 + 5 * y]);
      }
      a[0] ^= round;
    }
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = Number((a[i >> 3] >> (8n * BigInt(i & 7))) & 255n);
  return out;
}
const keccak256 = (bytes) => sponge256(bytes, 0x01);
const sha3_256 = (bytes) => sponge256(bytes, 0x06);
async function sha512(bytes) { return new Uint8Array(await crypto.subtle.digest('SHA-512', bytes)); }
async function hmac(key, value) {
  const k = await crypto.subtle.importKey('raw', key, {name: 'HMAC', hash: 'SHA-512'}, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, value));
}
async function bip39Seed(words, passphrase = '') {
  const key = await crypto.subtle.importKey('raw', encoder.encode(words.normalize('NFKD')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name: 'PBKDF2', salt: encoder.encode(('mnemonic' + passphrase).normalize('NFKD')), iterations: 2048, hash: 'SHA-512'}, key, 512);
  return new Uint8Array(bits);
}
const P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const GX = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n;
const GY = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n;
const mod = (x, p = P) => ((x % p) + p) % p;
function power(base, exponent, prime = P) {
  let x = mod(base, prime), result = 1n;
  while (exponent) { if (exponent & 1n) result = (result * x) % prime; x = (x * x) % prime; exponent >>= 1n; }
  return result;
}
function addPoints(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.x === b.x && mod(a.y + b.y) === 0n) return null;
  const doubling = a.x === b.x && a.y === b.y;
  const slope = doubling
    ? mod(3n * a.x * a.x * power(2n * a.y, P - 2n))
    : mod((b.y - a.y) * power(mod(b.x - a.x), P - 2n));
  const x = mod(slope * slope - a.x - b.x);
  return { x, y: mod(slope * (a.x - x) - a.y) };
}
function scalarMultiply(k) {
  if (k <= 0n || k >= N) throw new Error('Invalid test scalar');
  // Jacobian coordinates avoid a modular inverse for each addition.
  let x = GX, y = GY, z = 1n;
  let rx = 0n, ry = 1n, rz = 0n;
  function double(px, py, pz) {
    if (pz === 0n || py === 0n) return [0n, 1n, 0n];
    const yy = mod(py * py), s = mod(4n * px * yy);
    const m = mod(3n * px * px), nx = mod(m * m - 2n * s);
    return [nx, mod(m * (s - nx) - 8n * yy * yy), mod(2n * py * pz)];
  }
  function add(ax, ay, az, bx, by, bz) {
    if (az === 0n) return [bx,by,bz];
    if (bz === 0n) return [ax,ay,az];
    const zz1=mod(az*az), zz2=mod(bz*bz);
    const u1=mod(ax*zz2),u2=mod(bx*zz1);
    const s1=mod(ay*bz*zz2),s2=mod(by*az*zz1);
    if(u1===u2) return s1===s2?double(ax,ay,az):[0n,1n,0n];
    const h=mod(u2-u1),r=mod(s2-s1),hh=mod(h*h),hhh=mod(h*hh);
    const nx=mod(r*r-hhh-2n*u1*hh);
    return [nx,mod(r*(u1*hh-nx)-s1*hhh),mod(h*az*bz)];
  }
  while(k){
    if(k&1n) [rx,ry,rz]=add(rx,ry,rz,x,y,z);
    k>>=1n;
    if(k) [x,y,z]=double(x,y,z);
  }
  if(rz===0n) throw new Error('Point at infinity');
  const inv=power(rz,P-2n),inv2=mod(inv*inv);
  return {x:mod(rx*inv2),y:mod(ry*inv2*inv)};
}

const hardened = 0x80000000;
const number4 = (number) => new Uint8Array([(number >>> 24) & 255, (number >>> 16) & 255, (number >>> 8) & 255, number & 255]);
function compressedPoint(priv) {
  const p = scalarMultiply(priv);
  return concat(Uint8Array.of((p.y & 1n) ? 3 : 2), bigintBytes(p.x));
}
async function derivePath(seed, path) {
  const master = await hmac(encoder.encode('Bitcoin seed'), seed);
  let key = bytesBigint(master.slice(0, 32));
  let chain = master.slice(32);
  if (key === 0n || key >= N) throw new Error('Invalid master key');
  const masterPrivate = bigintBytes(key);
  for (const index of path) {
    const data = index >= hardened
      ? concat(Uint8Array.of(0), bigintBytes(key), number4(index))
      : concat(compressedPoint(key), number4(index));
    const result = await hmac(chain, data);
    const part = bytesBigint(result.slice(0, 32));
    if (part >= N) throw new Error('Invalid child key');
    key = (part + key) % N;
    if (key === 0n) throw new Error('Invalid child key');
    chain = result.slice(32);
  }
  return {masterPrivate, key};
}
function checksumAddress(hexAddress) {
  const lower = hexAddress.toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{40}$/.test(lower)) throw new Error('Expected a 20 byte address');
  const hash = HEX(keccak256(encoder.encode(lower)));
  let answer = '0x';
  for (let i = 0; i < 40; i++) answer += parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
  return answer;
}
function setResult(id, value) { $(id).textContent = value; }
async function runDerivation() {
  $('derive').disabled = true;
  $('demo-status').textContent = 'Calculating using public test data…';
  try {
    const seed = await bip39Seed($('phrase').textContent.trim());
    const derived = await derivePath(seed, [44 + hardened, 60 + hardened, hardened, 0, 0]);
    const point = scalarMultiply(derived.key);
    const publicBytes = concat(bigintBytes(point.x), bigintBytes(point.y));
    const hash = keccak256(publicBytes);
    const address = '0x' + HEX(hash.slice(12));
    const checksummed = checksumAddress(address);
    setResult('seed', HEX(seed)); setResult('master', HEX(derived.masterPrivate));
    setResult('private', HEX(bigintBytes(derived.key))); setResult('public', HEX(publicBytes));
    setResult('digest', HEX(hash)); setResult('address', address); setResult('checksum', checksummed);
    $('demo-status').textContent = checksummed.toLowerCase() === '0x9858effd232b4033e47d90003d41ec34ecaeda94'
      ? 'PASS: derived address matches the independently published example for this test mnemonic and path.'
      : 'Derivation finished. Compare the results with an independent wallet reference.';
  } catch (error) { $('demo-status').textContent = 'Calculation failed: ' + error.message; }
  finally { $('derive').disabled = false; }
}
function populateEntropy() {
  for (const words of [12, 15, 18, 21, 24]) {
    const ent = 32 * words / 3;
    const row = document.createElement('tr');
    for (const value of [words, ent, ent / 32, words * 11]) {
      const td = document.createElement('td'); td.textContent = value; row.appendChild(td);
    }
    $('entropy-table').appendChild(row);
  }
}
function hamming(a,b) { let count = 0; for (let i = 0; i < a.length; i++) { let x = a[i] ^ b[i]; while (x) { count += x & 1; x >>>= 1; } } return count; }
function metric(label,value) { const div = document.createElement('div'); div.className = 'metric'; const strong = document.createElement('strong'); strong.textContent = value; const caption = document.createElement('span'); caption.textContent = label; div.append(strong,caption); return div; }
function plotBars(target, labels, numbers, limit) {
  target.replaceChildren();
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns,'svg'); svg.setAttribute('viewBox','0 0 520 225'); svg.setAttribute('role','img'); svg.setAttribute('aria-label',labels.join(', ') + ': ' + numbers.map(n => n.toFixed(1)).join(', '));
  const width = 460 / numbers.length;
  for (let i=0;i<=4;i++) {
    const y=185-i*40; const line=document.createElementNS(ns,'line'); for(const [k,v] of Object.entries({x1:'42',x2:'510',y1:y,y2:y,stroke:'#e2e7f0'})) line.setAttribute(k,v); svg.appendChild(line);
    const t=document.createElementNS(ns,'text'); t.setAttribute('x','4');t.setAttribute('y',String(y+4));t.setAttribute('font-size','11');t.setAttribute('fill','#65758b');t.textContent=(limit*i/4).toFixed(0)+'%';svg.appendChild(t);
  }
  numbers.forEach((n,i)=>{const rect=document.createElementNS(ns,'rect'); const h=Math.min(n/limit,1)*160; for(const [k,v] of Object.entries({x:String(45+i*width),y:String(185-h),width:String(Math.max(1,width-2)),height:String(h),fill:'#285cc4',rx:'1'}))rect.setAttribute(k,v);svg.appendChild(rect);});
  const note=document.createElementNS(ns,'text');note.setAttribute('x','46');note.setAttribute('y','213');note.setAttribute('font-size','11');note.setAttribute('fill','#65758b');note.textContent=labels[0]+' to '+labels[labels.length-1]+' (one bar per trial)';svg.appendChild(note);
  target.appendChild(svg);
}
async function runHashExperiment() {
  $('run-hash').disabled=true; $('hash-status').textContent='Computing digests…';
  try {
    const input=Uint8Array.from({length:32},(_,i)=>i);
    const base=[keccak256(input),sha3_256(input),await sha512(input)];
    const hashes=[keccak256,sha3_256,sha512];
    const names=['Keccak-256','SHA3-256','SHA-512'];
    const count=Number($('trials').value);
    const results=[[],[],[]];
    for(let i=0;i<count;i++){
      const changed=input.slice(); changed[Math.floor(i/8)]^=1<<(i%8);
      for(let j=0;j<3;j++){const hashed=await hashes[j](changed);results[j].push(100*hamming(base[j],hashed)/(8*base[j].length));}
    }
    $('hash-metrics').replaceChildren(metric('Reference for idealized output', '50% changed bits'));
    results.forEach((r,j)=>{const mean=r.reduce((a,b)=>a+b,0)/r.length;const sd=Math.sqrt(r.reduce((a,b)=>a+(b-mean)**2,0)/r.length);$('hash-metrics').appendChild(metric(names[j]+' mean changed bits',mean.toFixed(2)+'%'));$('hash-metrics').appendChild(metric(names[j]+' standard deviation',sd.toFixed(2)+' pp'));});
    plotBars($('hash-chart'),Array.from({length:count},(_,i)=>String(i+1)),results[0],100);
    $('hash-status').textContent=count+' deterministic one bit input mutations. Chart: Keccak-256 output changes. Values show sample observations, not security guarantees.';
  }catch(error){$('hash-status').textContent='Failed: '+error.message;}
  finally{$('run-hash').disabled=false;}
}
function randomIndex(n) { const buffer=new Uint32Array(1); const max=Math.floor(0x100000000/n)*n; do{crypto.getRandomValues(buffer);}while(buffer[0]>=max);return buffer[0]%n; }
function runChecksumExperiment(){
  $('run-checksum').disabled=true;
  try{
    const source='0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
    const alphabet='0123456789abcdef'; const count=Number($('mutations').value);
    const bins=Array(40).fill(0); const tested=Array(40).fill(0);
    let detected=0;
    for(let i=0;i<count;i++){
      const pos=randomIndex(40); const current=source[pos+2].toLowerCase();
      let replacement;do{replacement=alphabet[randomIndex(16)];}while(replacement===current);
      const mutated=source.slice(0,pos+2)+replacement+source.slice(pos+3);
      const valid=checksumAddress(mutated).slice(2)===mutated.slice(2);
      tested[pos]++; if(!valid){detected++;bins[pos]++;}
    }
    const rate=100*detected/count;
    $('checksum-metrics').replaceChildren(metric('Detected substitutions',String(detected)+' / '+count),metric('Observed detection rate',rate.toFixed(2)+'%'));
    plotBars($('checksum-chart'),Array.from({length:40},(_,i)=>String(i+1)),bins.map((v,i)=>tested[i]?v*100/tested[i]:0),100);
    $('checksum-status').textContent=count+' random substitutions; chart shows detected percentage by character position (positions with no trials appear as zero).';
  }catch(error){$('checksum-status').textContent='Failed: '+error.message;}
  finally{$('run-checksum').disabled=false;}
}
function selfTest() {
  const checks = [
    HEX(keccak256(new Uint8Array()))==='c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
    HEX(sha3_256(new Uint8Array()))==='a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a',
    checksumAddress('0x52908400098527886e0f7030069857d2e4169ee7')==='0x52908400098527886E0F7030069857D2E4169EE7',
    scalarMultiply(1n).x===GX && scalarMultiply(1n).y===GY,
    scalarMultiply(2n).x===0xc6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5n
  ];
  if(!checks.every(Boolean)) console.error('A cryptographic self test failed',checks);
}
function showHashComparison() {
  const empty = new Uint8Array();
  const first = keccak256(empty);
  const second = sha3_256(empty);
  $('keccak-example').textContent = HEX(first);
  $('sha3-example').textContent = HEX(second);
  $('digest-difference').textContent = hamming(first, second) + ' / 256 bits';
}
populateEntropy(); selfTest(); showHashComparison();
$('derive').addEventListener('click',runDerivation);
$('run-hash').addEventListener('click',runHashExperiment);
$('run-checksum').addEventListener('click',runChecksumExperiment);
