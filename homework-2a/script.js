'use strict';
/* Homework 2A. Educational ECIES-like encryption; NOT production cryptography. */
const P=0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
const N=0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
const G={x:0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,y:0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n};
const $=id=>document.getElementById(id);
const mod=(a,m=P)=>(a%m+m)%m;
function powmod(a,e,m=P){let r=1n;a=mod(a,m);while(e){if(e&1n)r=r*a%m;a=a*a%m;e>>=1n;}return r;}
function inv(a){if(mod(a)===0n)throw Error('Division by zero');return powmod(a,P-2n);}
function valid(A){return A===null||(A.x>=0n&&A.x<P&&A.y>=0n&&A.y<P&&mod(A.y*A.y)===mod(A.x*A.x*A.x+7n));}
function equal(A,B){return A===null||B===null?A===B:A.x===B.x&&A.y===B.y;}
function add(A,B){if(A===null)return B;if(B===null)return A;if(!valid(A)||!valid(B))throw Error('Invalid curve point');if(A.x===B.x&&mod(A.y+B.y)===0n)return null;let s=equal(A,B)?mod(3n*A.x*A.x*inv(2n*A.y)):mod((B.y-A.y)*inv(B.x-A.x));const x=mod(s*s-A.x-B.x);return {x,y:mod(s*(A.x-x)-A.y)};}
function mul(k,A=G){if(typeof k!=='bigint'||k<0n||k>=N||!valid(A))throw Error('Invalid scalar or point');let r=null,b=A;while(k){if(k&1n)r=add(r,b);k>>=1n;if(k)b=add(b,b);}return r;}
const hex=n=>n.toString(16).padStart(64,'0');
const short=A=>A===null?'INFINITY':`(${hex(A.x).slice(0,14)}…, ${hex(A.y).slice(0,14)}…)`;
const toHex=a=>Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
const u32=n=>new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]);
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
const join=(...arrays)=>{const out=new Uint8Array(arrays.reduce((a,b)=>a+b.length,0));let i=0;for(const a of arrays){out.set(a,i);i+=a.length;}return out;};
function fromHex(s){if(!/^(?:[0-9a-f]{2})*$/i.test(s))throw Error('Invalid hexadecimal data');return Uint8Array.from(s.match(/../g)||[],v=>parseInt(v,16));}
const pointBytes=A=>join(fromHex(hex(A.x)),fromHex(hex(A.y)));
async function digest(data){return new Uint8Array(await crypto.subtle.digest('SHA-256',data));}
async function derive(shared,ephemeral){const info=join(enc.encode('HW2A:shared-v1:'),pointBytes(shared),pointBytes(ephemeral));const aes=await digest(join(enc.encode('stream:'),info));const mac=await digest(join(enc.encode('auth:'),info));return {aes,mac};}
async function streamXor(data,key){const out=new Uint8Array(data.length);for(let offset=0,counter=0;offset<data.length;offset+=32,counter++){const block=await digest(join(enc.encode('HW2A:counter:'),key,u32(counter)));for(let j=0;j<Math.min(32,data.length-offset);j++)out[offset+j]=data[offset+j]^block[j];}return out;}
async function tag(macKey,R,cipher){const key=await crypto.subtle.importKey('raw',macKey,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',key,join(enc.encode('HW2A:tag-v1:'),pointBytes(R),cipher)));}
function ctEqual(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;}
function freshScalar(){const a=new Uint32Array(1);crypto.getRandomValues(a);return BigInt(a[0]%4096+1);}// toy ephemeral range, explicitly educational
async function eccEncrypt(message,Q,r=freshScalar()){if(!valid(Q)||Q===null)throw Error('Invalid recipient key');const R=mul(r),shared=mul(r,Q);const keys=await derive(shared,R);const cipher=await streamXor(enc.encode(message),keys.aes);return {R,cipher,mac:await tag(keys.mac,R,cipher),r};}
async function eccDecrypt(bundle,k){if(!valid(bundle.R)||bundle.R===null)throw Error('Invalid ephemeral point');const shared=mul(k,bundle.R),keys=await derive(shared,bundle.R);const expected=await tag(keys.mac,bundle.R,bundle.cipher);if(!ctEqual(bundle.mac,expected))throw Error('Authentication failed: wrong key or altered ciphertext');return dec.decode(await streamXor(bundle.cipher,keys.aes));}
function caesar(s,k){return s.replace(/[A-Za-z]/g,c=>{const base=c>='a'?97:65;return String.fromCharCode(base+(c.charCodeAt(0)-base+((k%26)+26)%26)%26);});}
const lettersOnly=s=>s.toUpperCase().replace(/[^A-Z]/g,'');
function counts(s){const a=new Array(26).fill(0);for(const c of s){const n=c.charCodeAt(0)-65;if(n>=0&&n<26)a[n]++;}return a;}
const reference=CORPUS_DATA.trainingCounts.map(v=>v/CORPUS_DATA.trainingLetters);
function rankCounts(c){const n=c.reduce((a,b)=>a+b,0);if(!n)throw Error('At least one A-Z letter is needed');const out=[];for(let k=0;k<26;k++){let score=0;for(let i=0;i<26;i++){const observed=c[(i+k)%26],expected=n*reference[i];score+=(observed-expected)**2/Math.max(expected,1e-10);}out.push({key:k,score});}return out.sort((a,b)=>a.score-b.score);}
function rankKeys(cipher){return rankCounts(counts(lettersOnly(cipher)));}
function rng(seed){let s=seed>>>0;return ()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
function experiment(trials=500,seed=20261020){
 if(!Number.isInteger(trials)||trials<1||trials>500)throw Error('Trials must be between 1 and 500');
 const random=rng(seed);
 return CORPUS_DATA.lengths.map(length=>{
   let successes=0;const samples=CORPUS_DATA.windows[String(length)];
   for(let j=0;j<trials;j++){
     const plainCounts=samples[j],k=Math.floor(random()*26);
     const shifted=Array.from({length:26},(_,i)=>plainCounts[(i-k+26)%26]);
     if(rankCounts(shifted)[0].key===k)successes++;
   }
   const rate=successes/trials,z=1.96,den=1+z*z/trials;
   const mid=(rate+z*z/(2*trials))/den;
   const half=z*Math.sqrt(rate*(1-rate)/trials+z*z/(4*trials*trials))/den;
   return {length,trials,successes,rate,low:Math.max(0,mid-half),high:Math.min(1,mid+half)};
 });
}
async function attack(Q,limit=4096){let current=null;for(let k=1;k<=limit;k++){current=add(current,G);if(equal(current,Q))return k;}return null;}
function chart(svgId,data){const svg=$(svgId);svg.replaceChildren();svg.setAttribute('viewBox','0 0 680 290');const ns='http://www.w3.org/2000/svg';const elem=(name,attrs,text)=>{const e=document.createElementNS(ns,name);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=String(text);return e;};const left=58,right=650,top=20,bottom=242;for(let t=0;t<=4;t++){const y=bottom-(bottom-top)*t/4;svg.append(elem('line',{x1:left,x2:right,y1:y,y2:y,stroke:'#dfe5ef'}),elem('text',{x:45,y:y+4,'text-anchor':'end',fill:'#52627b','font-size':12},`${t*25}%`));}data.forEach((row,i)=>{const x=left+(right-left)*(i+.5)/data.length,w=37,y=bottom-row.rate*(bottom-top);svg.append(elem('rect',{x:x-w/2,y,width:w,height:bottom-y,rx:5,fill:'#3464bd'}));svg.append(elem('text',{x,y:bottom+19,'text-anchor':'middle',fill:'#52627b','font-size':12},row.length));svg.append(elem('text',{x,y:Math.max(13,y-7),'text-anchor':'middle',fill:'#264e98','font-size':11},`${Math.round(row.rate*100)}%`));});}
function status(id,msg,error=false){$(id).textContent=msg;$(id).classList.toggle('error',error);}
let lastBundle=null;
async function handleEcc(){const button=$('eccRun');button.disabled=true;try{const text=$('message').value,k=BigInt($('eccKey').value);if(k<1n||k>4096n)throw Error('Private key must be in 1–4096');const Q=mul(k),bundle=await eccEncrypt(text,Q),recovered=await eccDecrypt(bundle,k);lastBundle={...bundle,Q,k,text};$('eccPublic').textContent=short(Q);$('eccEphemeral').textContent=short(bundle.R);$('eccCipher').textContent=toHex(bundle.cipher)||'(empty)';$('eccTag').textContent=toHex(bundle.mac);$('eccPlain').textContent=recovered;status('eccStatus',recovered===text?'PASS — the original UTF-8 message was recovered':'FAIL — mismatch',recovered!==text);$('attackResult').textContent='Not run yet';}catch(e){status('eccStatus',e.message,true);}finally{button.disabled=false;}}
function handleCaesar(){const message=$('message').value,k=Number($('caesarKey').value);if(!Number.isInteger(k)||k<0||k>25){status('caesarStatus','Use a key between 0 and 25',true);return;}const cipher=caesar(message,k);$('caesarCipher').textContent=cipher;$('caesarPlain').textContent=caesar(cipher,-k);status('caesarStatus','Round-trip complete. ASCII letters shift; punctuation and non-ASCII characters remain unchanged.');try{const candidates=rankKeys(cipher);$('recoveredKey').textContent=String(candidates[0].key);$('keyRanking').replaceChildren(...candidates.slice(0,5).map(a=>{const li=document.createElement('li');li.textContent=`key ${a.key}: χ² = ${a.score.toFixed(2)}`;return li;}));$('crackText').textContent=caesar(cipher,-candidates[0].key);}catch(e){$('recoveredKey').textContent='—';$('crackText').textContent='Insufficient alphabetic text';$('keyRanking').replaceChildren();}}
function handleExperiment(){const btn=$('runExperiment');btn.disabled=true;try{const rows=experiment();chart('successChart',rows);const tbody=$('experimentBody');tbody.replaceChildren(...rows.map(r=>{const tr=document.createElement('tr');for(const v of [r.length,`${r.successes}/${r.trials}`,`${(r.rate*100).toFixed(1)}%`,`${(100*r.low).toFixed(1)}%–${(100*r.high).toFixed(1)}%`]){const td=document.createElement('td');td.textContent=v;tr.append(td);}return tr;}));status('experimentStatus',`3,500 trials completed. Seed 20261020. Training: ${CORPUS_DATA.trainingLetters.toLocaleString()} letters; evaluation: ${CORPUS_DATA.evaluationLetters.toLocaleString()} letters.`);}catch(e){status('experimentStatus',e.message,true);}finally{btn.disabled=false;}}
async function handleAttack(){const b=$('runAttack');b.disabled=true;try{if(!lastBundle)throw Error('First run ECC encryption above');const start=performance.now(),found=await attack(lastBundle.Q);if(found===null)throw Error('Key not found in searched interval');const message=await eccDecrypt(lastBundle,BigInt(found));const elapsed=performance.now()-start;$('attackResult').textContent=`Recovered k = ${found}; decrypted message: ${message}; search time: ${elapsed.toFixed(1)} ms`;status('attackStatus',found===Number(lastBundle.k)&&message===lastBundle.text?'PASS — public-key match and authenticated decryption':'FAIL — validation mismatch',found!==Number(lastBundle.k));}catch(e){status('attackStatus',e.message,true);}finally{b.disabled=false;}}
function init(){$('eccRun').addEventListener('click',handleEcc);$('caesarRun').addEventListener('click',handleCaesar);$('runExperiment').addEventListener('click',handleExperiment);$('runAttack').addEventListener('click',handleAttack);handleCaesar();handleExperiment();handleEcc();}
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',init);
if(typeof module!=='undefined')module.exports={P,N,G,valid,add,mul,equal,caesar,rankKeys,experiment,attack,eccEncrypt,eccDecrypt,reference,CORPUS_DATA};
