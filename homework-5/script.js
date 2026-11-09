'use strict';

// Mathematics is isolated from the DOM so the Node.js tests can use the same code.
const MathHW5 = (() => {
  const PI = Math.PI;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const functions = {
    square: {a:0,b:1,M:1,exact:1/3, f:x=>x*x,
      greater:t=>t<=0?1:t>1?0:1-Math.sqrt(t),
      greaterEq:t=>t<=0?1:t>1?0:1-Math.sqrt(t)},
    sine: {a:0,b:PI,M:1,exact:2, f:x=>Math.sin(x),
      greater:t=>t<=0?PI:t>=1?0:PI-2*Math.asin(clamp(t,0,1)),
      greaterEq:t=>t<=0?PI:t>1?0:PI-2*Math.asin(clamp(t,0,1))},
    step: {a:0,b:1,M:3,exact:2, f:x=>x<0.5?1:3,
      greater:t=>t<1?1:t<3?0.5:0,
      greaterEq:t=>t<=1?1:t<=3?0.5:0},
    absolute: {a:0,b:1,M:0.5,exact:0.25, f:x=>Math.abs(x-0.5),
      greater:t=>t<0.5?Math.max(0,1-2*t):0,
      greaterEq:t=>t<=0.5?Math.max(0,1-2*t):0},
    singular: {a:0,b:1,M:8,exact:2, f:x=>1/Math.sqrt(x),
      greater:t=>t<=1?1:1/(t*t),
      greaterEq:t=>t<=1?1:1/(t*t)}
  };
  function getFunction(key, cap=8) {
    if (!Object.hasOwn(functions,key)) throw Error('Unknown function');
    return {...functions[key],M:key==='singular'?cap:functions[key].M};
  }
  function midpoint(fn,n) {
    let s=0; const dx=(fn.b-fn.a)/n;
    for(let i=0;i<n;i++) s+=fn.f(fn.a+(i+0.5)*dx);
    return s*dx;
  }
  function levelSums(fn,m) {
    const h=fn.M/m; let lower=0,upper=0;
    for(let k=1;k<=m;k++) lower+=fn.greaterEq(k*h);
    for(let k=0;k<m;k++) upper+=fn.greater(k*h);
    return {lower:lower*h,upper:upper*h,operations:2*m};
  }
  function clippedExact(key,cap) {return key==='singular'?2-1/cap:functions[key].exact;}
  function gcd(a,b){while(b){const t=a%b;a=b;b=t;}return a;}
  function thomaeRationalMid(n){let sum=0;for(let i=0;i<n;i++)sum+=gcd(2*i+1,2*n)/(2*n);return sum/n;}
  const normalDensity=x=>Math.exp(-x*x/2)/Math.sqrt(2*PI);
  function simpsonCDF(x,n=100){
    if(!Number.isInteger(n)||n<2||n%2)throw Error('Simpson n must be even');
    if(!Number.isFinite(x))throw Error('Nonfinite x');
    const z=Math.abs(x),h=z/n;
    let sum=normalDensity(0)+normalDensity(z);
    for(let i=1;i<n;i++) sum+=(i%2?4:2)*normalDensity(i*h);
    const area=sum*h/3;
    return {value:x>=0?0.5+area:0.5-area,operations:n+1};
  }
  function seriesCDF(x,tolerance=1e-16){
    const z=Math.abs(x); let term=z, sum=z, terms=z===0?0:1;
    for(let k=0;k<240 && z!==0;k++){
      term*=-(z*z/2)*(2*k+1)/((k+1)*(2*k+3));
      sum+=term; terms++;
      if(Math.abs(term)<tolerance*Math.max(1,Math.abs(sum)))break;
    }
    const area=sum/Math.sqrt(2*PI);
    return {value:x>=0?0.5+area:0.5-area,operations:terms};
  }
  // Abramowitz and Stegun, 7.1.26. Absolute erf error <= approximately 1.5e-7.
  function erfApproxCDF(x){
    if(x===0)return {value:0.5,operations:5};
    const z=Math.abs(x)/Math.SQRT2, t=1/(1+0.3275911*z);
    const poly=(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t;
    const erf=1-poly*Math.exp(-z*z);
    return {value:x>0?0.5*(1+erf):0.5*(1-erf),operations:5};
  }
  const refs=[
    [-3,0.0013498980316300957],[-2,0.02275013194817921],[-1,0.15865525393145707],
    [-0.5,0.3085375387259869],[0,0.5],[0.5,0.6914624612740131],
    [1,0.8413447460685429],[1.96,0.9750021048517795],[2,0.9772498680518208],
    [3,0.9986501019683699]
  ];
  return {getFunction,midpoint,levelSums,clippedExact,gcd,thomaeRationalMid,
    normalDensity,simpsonCDF,seriesCDF,erfApproxCDF,refs};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=MathHW5;

if(typeof document!=='undefined'){
  const $=id=>document.getElementById(id);
  const fmt=(x,d=8)=>Number.isFinite(x)?x.toFixed(d):'—';
  const sci=x=>x===0?'0':Number.isFinite(x)?x.toExponential(2):'—';
  const cell=(row,val)=>{const td=document.createElement('td');td.textContent=String(val);row.appendChild(td);};
  const tbody=(id,data)=>{const root=$(id);root.replaceChildren();for(const values of data){const tr=document.createElement('tr');values.forEach(v=>cell(tr,v));root.appendChild(tr);}};
  function plot(canvas,series,settings={}){
    const ctx=canvas.getContext('2d');const w=canvas.width,h=canvas.height;
    const left=58,right=15,top=22,bottom=39,pw=w-left-right,ph=h-top-bottom;
    const values=series.flatMap(s=>s.values).filter(Number.isFinite);
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
    if(!values.length)return;
    let low=settings.zeroMin?0:Math.min(...values),high=Math.max(...values);
    if(settings.log){const pos=values.filter(v=>v>0);low=Math.min(...pos);high=Math.max(...pos);}
    if(high===low){high+=1;low=Math.max(0,low-1);}
    const yv=v=>settings.log?(Math.log10(v)-Math.log10(low))/(Math.log10(high)-Math.log10(low)):(v-low)/(high-low);
    const Y=v=>top+ph*(1-yv(v));
    ctx.font='13px Arial';ctx.strokeStyle='#e5ebf3';ctx.fillStyle='#617187';ctx.lineWidth=1;
    for(let k=0;k<=4;k++){
      const y=top+ph*k/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();
      const num=settings.log?10**(Math.log10(high)-(Math.log10(high)-Math.log10(low))*k/4):high-(high-low)*k/4;
      ctx.textAlign='right';ctx.fillText(num===0?'0':Math.abs(num)<.0001?num.toExponential(0):num.toFixed(num<.01?4:2),left-8,y+4);
    }
    series.forEach(s=>{ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.lineWidth=2.5;ctx.beginPath();
      s.values.forEach((v,i)=>{if(!Number.isFinite(v)||settings.log&&v<=0)return;const x=left+(s.values.length===1?.5:i/(s.values.length-1))*pw,y=Y(v);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();
      s.values.forEach((v,i)=>{if(!Number.isFinite(v)||settings.log&&v<=0)return;const x=left+(s.values.length===1?.5:i/(s.values.length-1))*pw,y=Y(v);ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();});
    });
    const labels=settings.labels||series[0].values.map((_,i)=>String(i+1));
    ctx.fillStyle='#617187';ctx.textAlign='center';ctx.font='12px Arial';
    labels.forEach((v,i)=>{if(labels.length>8&&i%2&&i!==labels.length-1)return;ctx.fillText(v,left+(labels.length===1?.5:i/(labels.length-1))*pw,h-13);});
  }
  function drawFunction(fn,n){
    const c=$('functionChart'),ctx=c.getContext('2d'),w=c.width,h=c.height;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
    const a=fn.a,b=fn.b,maxY=fn.M*1.08,pad=35,dx=w-2*pad,dy=h-2*pad;
    const X=x=>pad+(x-a)/(b-a)*dx,Y=y=>h-pad-Math.min(maxY,y)/maxY*dy;
    ctx.strokeStyle='#d5e0ed';ctx.beginPath();ctx.moveTo(pad,pad);ctx.lineTo(pad,h-pad);ctx.lineTo(w-pad,h-pad);ctx.stroke();
    ctx.strokeStyle='#285cc4';ctx.lineWidth=2.5;ctx.beginPath();for(let i=0;i<=600;i++){
      const x=a+(b-a)*i/600,y=fn.f(Math.max(x,Number.EPSILON));
      if(i===0)ctx.moveTo(X(x),Y(y));else ctx.lineTo(X(x),Y(y));
    }ctx.stroke();
    ctx.fillStyle='#e08b3a';const shown=Math.min(n,60);
    for(let i=0;i<shown;i++){const index=Math.floor((i+.5)*n/shown);const x=a+(index+.5)*(b-a)/n;
      ctx.beginPath();ctx.arc(X(x),Y(fn.f(x)),3,0,2*Math.PI);ctx.fill();}
    ctx.fillStyle='#617187';ctx.font='13px Arial';ctx.fillText(a.toFixed(1),pad-8,h-12);ctx.fillText(b.toFixed(2),w-pad-27,h-12);ctx.fillText('f(x)',6,16);
  }
  function runIntegration(){
    const key=$('fn').value,n=Number($('domainN').value),m=Number($('levelM').value),cap=Number($('cap').value);
    const fn=MathHW5.getFunction(key,cap),r=MathHW5.midpoint(fn,n),l=MathHW5.levelSums(fn,m);
    const target=MathHW5.clippedExact(key,cap);
    $('cap').disabled=key!=='singular';
    $('rValue').textContent=fmt(r);$('rError').textContent=`|error vs original| = ${sci(Math.abs(r-fn.exact))}`;
    $('lValue').textContent=`${fmt(l.lower,6)} / ${fmt(l.upper,6)}`;
    $('lError').textContent=`bracket width = ${sci(l.upper-l.lower)}`;
    $('targetValue').textContent=fmt(fn.exact);
    $('targetNote').textContent=key==='singular'?`clipped exact ${fmt(target)}; cap bias ${fmt(fn.exact-target,6)}`:'target for both methods';
    $('integralStatus').textContent=key==='singular'?'Lebesgue bounds enclose the clipped integral, not the uncapped value 2.':'Lebesgue bounds enclose the exact integral.';
    drawFunction(fn,n);
    const ns=[8,16,32,64,128,256,512,1024];const rows=ns.map(v=>{
      const rr=MathHW5.midpoint(fn,v),ll=MathHW5.levelSums(fn,v);
      return [v,fmt(rr,7),sci(Math.abs(rr-fn.exact)),fmt(ll.lower,7),fmt(ll.upper,7),sci(ll.upper-ll.lower)];
    });tbody('integrationRows',rows);
    plot($('convergenceChart'),[
      {color:'#285cc4',values:ns.map(v=>Math.abs(MathHW5.midpoint(fn,v)-fn.exact))},
      {color:'#e08b3a',values:ns.map(v=>{const vls=MathHW5.levelSums(fn,v);return vls.upper-vls.lower;})}
    ],{labels:ns.map(String),zeroMin:true});
    $('costNote').textContent=`Current work: ${n} function evaluations for the midpoint sum, ${l.operations} analytic superlevel-measure evaluations for the two bounds (${m} each). These operations have different per-call costs.`;
  }
  function runPathological(){
    const ns=[4,8,16,32,64,128,256,512];
    tbody('pathRows',ns.map(n=>[n,'1.000000','0.000000',fmt(MathHW5.thomaeRationalMid(n),6),'0.000000']));
  }
  function runCDF(){
    const x=Number($('zValue').value),n=Number($('simpsonN').value);
    if(!Number.isFinite(x)||Math.abs(x)>5){$('cdfStatus').textContent='Enter x between −5 and 5.';$('cdfStatus').classList.add('error');return;}
    $('cdfStatus').classList.remove('error');$('cdfStatus').textContent='Computed locally, using symmetry about zero.';
    const s=MathHW5.simpsonCDF(x,n),p=MathHW5.seriesCDF(x),e=MathHW5.erfApproxCDF(x);
    $('simpsonValue').textContent=fmt(s.value,10);$('simpsonDetail').textContent=`${s.operations} density evaluations`;
    $('seriesValue').textContent=fmt(p.value,10);$('seriesDetail').textContent=`${p.operations} series terms`;
    $('erfValue').textContent=fmt(e.value,10);$('erfDetail').textContent='5-coefficient erf approximation';
    tbody('cdfRows',MathHW5.refs.map(([z,ref])=>[
      z.toFixed(z===1.96?2:1),fmt(ref,10),sci(Math.abs(MathHW5.simpsonCDF(z,n).value-ref)),
      sci(Math.abs(MathHW5.seriesCDF(z).value-ref)),sci(Math.abs(MathHW5.erfApproxCDF(z).value-ref))]));
    const ns=[4,8,16,32,64,128,256,512,1024],z=1.96,ref=MathHW5.refs.find(v=>v[0]===1.96)[1];
    plot($('cdfChart'),[{color:'#285cc4',values:ns.map(k=>Math.max(1e-17,Math.abs(MathHW5.simpsonCDF(z,k).value-ref)))}],{labels:ns.map(String),log:true});
  }
  function benchmark(){
    const x=1.96,n=Number($('simpsonN').value),repeat=2500;
    // Keep results observable to discourage unrealistically optimized-away work.
    const tests=[['Simpson',()=>MathHW5.simpsonCDF(x,n).value],['Series',()=>MathHW5.seriesCDF(x).value],['Erf approximation',()=>MathHW5.erfApproxCDF(x).value]];
    const runs=tests.map(([name,fn])=>{let sum=0;const start=performance.now();for(let i=0;i<repeat;i++)sum+=fn();return `${name}: ${(performance.now()-start).toFixed(2)} ms (checksum ${sum.toFixed(4)})`;});
    $('benchmarkResult').textContent=`${repeat} evaluations per method at x = 1.96; ${runs.join(' · ')}. Times depend on this browser and are not mathematical complexity bounds.`;
  }
  $('integrate').addEventListener('click',runIntegration);
  $('fn').addEventListener('change',runIntegration);
  $('cap').addEventListener('change',runIntegration);
  $('domainN').addEventListener('change',runIntegration);
  $('levelM').addEventListener('change',runIntegration);
  $('cdfButton').addEventListener('click',runCDF);
  $('benchButton').addEventListener('click',benchmark);
  runIntegration();runPathological();runCDF();
}
