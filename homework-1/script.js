"use strict";

// All calculations are over F_17. null represents the point at infinity.
const PRIME = 17;
const GENERATOR = { x: 1, y: 5 };
const SVG_NS = "http://www.w3.org/2000/svg";
const $ = id => document.getElementById(id);
const mod = x => ((x % PRIME) + PRIME) % PRIME;

function inverse(value) {
  const a = mod(value);
  if (a === 0) throw new Error("Zero has no modular inverse.");
  for (let i = 1; i < PRIME; i++) if (mod(a * i) === 1) return i;
  throw new Error("No modular inverse found.");
}
function onCurve(point) {
  return point === null || mod(point.y * point.y) === mod(point.x ** 3 + 7);
}
function equalPoints(a, b) {
  return a === null || b === null ? a === b : a.x === b.x && a.y === b.y;
}
function addPoints(a, b) {
  if (a === null) return b;
  if (b === null) return a;
  if (!onCurve(a) || !onCurve(b)) throw new Error("The point is not on the curve.");
  if (a.x === b.x && mod(a.y + b.y) === 0) return null;
  const doubling = equalPoints(a, b);
  const slope = doubling
    ? mod(3 * a.x * a.x * inverse(2 * a.y))
    : mod((b.y - a.y) * inverse(b.x - a.x));
  const x = mod(slope * slope - a.x - b.x);
  const y = mod(slope * (a.x - x) - a.y);
  return { x, y };
}
function multiply(k, point = GENERATOR) {
  if (!Number.isSafeInteger(k) || k < 0) throw new Error("Invalid scalar.");
  let result = null, addend = point, n = k;
  while (n > 0) {
    if (n % 2 === 1) result = addPoints(result, addend);
    addend = addPoints(addend, addend);
    n = Math.floor(n / 2);
  }
  return result;
}
function pointLabel(p) { return p === null ? "∞ (point at infinity)" : `(${p.x}, ${p.y})`; }
function createSvg(tag, attributes = {}, text = "") {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, String(value));
  if (text) el.textContent = text;
  return el;
}
function gridPlot(svg, steps, visibleCount) {
  svg.replaceChildren();
  const padX = 38, padY = 28, cellX = 23.4, cellY = 20;
  for (let n = 0; n <= 16; n++) {
    const x = padX + n * cellX, y = padY + (16 - n) * cellY;
    svg.append(createSvg("line", { x1:x,y1:padY,x2:x,y2:padY + 16*cellY,stroke:"#e6ebf2" }));
    svg.append(createSvg("line", { x1:padX,y1:y,x2:padX+16*cellX,y2:y,stroke:"#e6ebf2" }));
    if (n % 2 === 0) {
      svg.append(createSvg("text", { x, y:padY+16*cellY+20,"font-size":10,"text-anchor":"middle",fill:"#718094" }, String(n)));
      svg.append(createSvg("text", { x:padX-13,y:y+4,"font-size":10,"text-anchor":"end",fill:"#718094" }, String(n)));
    }
  }
  svg.append(createSvg("text",{x:padX+16*cellX+16,y:padY+16*cellY+4,"font-size":12,fill:"#526179"},"x"));
  svg.append(createSvg("text",{x:padX,y:15,"font-size":12,fill:"#526179"},"y"));
  const px = x => padX + x * cellX, py = y => padY + (16-y) * cellY;
  for (let x = 0; x < PRIME; x++) for (let y = 0; y < PRIME; y++) {
    if (onCurve({x,y})) svg.append(createSvg("circle",{cx:px(x),cy:py(y),r:4,fill:"#bbc8d6"}));
  }
  const history = steps.slice(0,visibleCount).filter(item=>item.point!==null);
  for (let i=0;i<history.length;i++) {
    const {point,step}=history[i];
    svg.append(createSvg("circle",{cx:px(point.x),cy:py(point.y),r:i===history.length-1?9:6,fill:i===history.length-1?"#285cc4":"#168b83",stroke:"white","stroke-width":2}));
    if (i === history.length-1) svg.append(createSvg("text",{x:px(point.x)+11,y:py(point.y)-11,fill:"#244db4","font-size":12,"font-weight":700},`${step}G`));
  }
}
function describeStep(step, previous, result) {
  if (step === 1) return "Base point";
  if (previous === null) return "∞ + G = G";
  if (result === null) return "Opposite points: result is ∞";
  if (equalPoints(previous, GENERATOR)) return "Point doubling";
  return "Point addition";
}
let currentK = 6, displayedSteps = [], visibleSteps = 0, timer = null;
function stopAnimation() {
  if (timer !== null) clearInterval(timer);
  timer = null;
  $("play").textContent = "▶ Play steps";
}
function displaySteps(count) {
  visibleSteps = count;
  const tbody = $("stepsBody");
  tbody.replaceChildren();
  for (let i=0;i<count;i++) {
    const item=displayedSteps[i];
    const tr=document.createElement("tr");
    if (i===count-1) tr.className="current";
    [String(item.step),item.step===1?"G":`${item.step-1}G + G`,pointLabel(item.point),item.method].forEach(value=>{
      const td=document.createElement("td");td.textContent=value;tr.append(td);
    });
    tbody.append(tr);
  }
  gridPlot($("curvePlot"),displayedSteps,count);
  $("stepCount").textContent = `${count} of ${displayedSteps.length} steps`;
  $("animationStatus").textContent = timer !== null ? `Animating step ${count} of ${displayedSteps.length}.` : count===displayedSteps.length ? "All available steps are shown." : `Showing ${count} of ${displayedSteps.length} steps.`;
}
function calculate() {
  stopAnimation();
  const k=Number($("privateKey").value);
  if (!Number.isInteger(k)||k<1||k>1000) {
    $("resultPoint").textContent="Enter a whole number from 1 to 1000";
    $("resultNote").textContent="The previous calculation has not been changed.";
    return;
  }
  currentK=k;
  const q=multiply(k);
  const n=Math.min(k,18);
  let point=null;
  displayedSteps=[];
  for(let i=1;i<=n;i++) {
    const previous=point;
    point=addPoints(point,GENERATOR);
    displayedSteps.push({step:i,point,method:describeStep(i,previous,point)});
  }
  $("resultPoint").textContent=`Q = ${pointLabel(q)}`;
  $("resultNote").textContent=q===null
    ? `${k}G is the point at infinity; this would not be a usable affine public key.`
    : `${k}G = ${k%9}G (modulo the order 9 of G).`;
  if(k>18) $("resultNote").textContent += " The table shows the first 18 additions; the final result uses double-and-add.";
  displaySteps(displayedSteps.length);
}
function play() {
  if(timer!==null){stopAnimation();$("animationStatus").textContent="Animation paused.";return;}
  if(displayedSteps.length===0) return;
  displaySteps(0);
  $("play").textContent="❚❚ Pause";
  timer=setInterval(()=>{
    displaySteps(visibleSteps+1);
    if(visibleSteps>=displayedSteps.length){stopAnimation();$("animationStatus").textContent="Animation finished.";}
  },Number($("speed").value));
}
const bit5 = n => n.toString(2).padStart(5,"0");
const countOnes = n => n.toString(2).replace(/0/g, "").length;
const hamming10 = (a,b) => countOnes(a.x ^ b.x) + countOnes(a.y ^ b.y);
function drawBarChart(hostId, categories, series, maxValue, fraction=false) {
  const host=$(hostId), svg=createSvg("svg",{viewBox:"0 0 480 275",role:"img","aria-label":hostId==="frequencyChart"?"Frequency of x and y coordinates":"Bit frequency chart"});
  const left=45,top=20,bottom=216,width=412,height=180;
  for(let t=0;t<=4;t++) {
    const value=maxValue*t/4, y=bottom-height*t/4;
    svg.append(createSvg("line",{x1:left,y1:y,x2:left+width,y2:y,stroke:"#e3eaf2"}));
    svg.append(createSvg("text",{x:left-9,y:y+4,"text-anchor":"end",fill:"#65748b","font-size":11},fraction?`${Math.round(value*100)}%`:String(value)));
  }
  const slot=width/categories.length,barW=Math.min(17,slot*.28);
  for(let i=0;i<categories.length;i++) {
    series.forEach((s,j)=>{
      const val=s.values[i],h=height*val/maxValue;
      svg.append(createSvg("rect",{x:left+slot*i+slot/2+(j===0?-barW-2:2),y:bottom-h,width:barW,height:h,rx:3,fill:s.color}));
    });
    svg.append(createSvg("text",{x:left+slot*(i+.5),y:bottom+18,"text-anchor":"middle",fill:"#66778c","font-size":11},String(categories[i])));
  }
  series.forEach((s,j)=>{
    const x=left+110*j;
    svg.append(createSvg("rect",{x,y:253,width:10,height:10,rx:2,fill:s.color}));
    svg.append(createSvg("text",{x:x+15,y:262,fill:"#576982","font-size":12},s.name));
  });
  host.replaceChildren(svg);
}
function statistics() {
  const outputs=Array.from({length:9},(_,i)=>({k:i+1,point:multiply(i+1)}));
  const finite=outputs.filter(o=>o.point!==null);
  const xs=finite.map(o=>o.point.x),ys=finite.map(o=>o.point.y);
  const values=[...new Set([...xs,...ys])].sort((a,b)=>a-b);
  const count=(arr,v)=>arr.filter(x=>x===v).length;
  drawBarChart("frequencyChart",values,[{name:"x coordinate",color:"#285cc4",values:values.map(v=>count(xs,v))},{name:"y coordinate",color:"#168b83",values:values.map(v=>count(ys,v))}],4);
  const bitCount=(array,pos)=>array.filter(n=>bit5(n)[pos]==="1").length/array.length;
  drawBarChart("bitsChart",["bit 4","bit 3","bit 2","bit 1","bit 0"],[{name:"x bits",color:"#285cc4",values:[0,1,2,3,4].map(p=>bitCount(xs,p))},{name:"y bits",color:"#168b83",values:[0,1,2,3,4].map(p=>bitCount(ys,p))}],1,true);
  $("orderMetric").textContent=String(outputs.find(o=>o.point===null).k);
  $("finiteMetric").textContent=String(finite.length);
  $("uniqueXMetric").textContent=String(new Set(xs).size);
  const ones=[...xs,...ys].reduce((total,n)=>total+countOnes(n),0);
  $("bitMetric").textContent=`${(ones/(finite.length*10)*100).toFixed(1)}%`;
  const body=$("statsBody");body.replaceChildren();
  outputs.forEach(({k,point})=>{
    const tr=document.createElement("tr");
    [String(k),pointLabel(point),point===null?"not defined":bit5(point.x),point===null?"not defined":bit5(point.y)].forEach(value=>{const td=document.createElement("td");td.textContent=value;tr.append(td);});body.append(tr);
  });
  $("statsSummary").replaceChildren();
  const p1=document.createElement("p");
  p1.textContent=`The finite outputs use ${new Set(xs).size} different x coordinates and ${new Set(ys).size} different y coordinates. Each x value occurs twice, because P and −P have the same x coordinate. The point at infinity is excluded from the coordinate charts.`;
  const p2=document.createElement("p");
  p2.textContent=`Across the ${finite.length} finite outputs there are ${ones} one-bits in ${finite.length*10} encoded coordinate bits (${(100*ones/(finite.length*10)).toFixed(1)}%). This small sample is not evidence of randomness, avalanche behaviour, or cryptographic security.`;
  $("statsSummary").append(p1,p2);
  const transitions=finite.slice(1).map((item,i)=>({from:finite[i].k,to:item.k,distance:hamming10(finite[i].point,item.point)}));
  const tbody=$("hammingBody");tbody.replaceChildren();
  for(const {from,to,distance} of transitions){
    const row=document.createElement("tr");
    [String(from),String(to),`${distance} / 10`].forEach(text=>{const td=document.createElement("td");td.textContent=text;row.append(td);});
    tbody.append(row);
  }
  const mean=transitions.reduce((sum,t)=>sum+t.distance,0)/transitions.length;
  $("hammingAverage").textContent=`${mean.toFixed(2)} of 10 bits`;
  $("hammingRange").textContent=`${Math.min(...transitions.map(t=>t.distance))}–${Math.max(...transitions.map(t=>t.distance))} of 10 bits`;
  $("hammingExplanation").textContent=`The seven comparisons use k = 1 to 8, without crossing the point at infinity. Each output is encoded as two 5-bit coordinates. Changing k by one changes ${mean.toFixed(2)} of the 10 bits on average in this particular cycle. These numbers are descriptive, not evidence for an avalanche criterion or cryptographic security.`;
}
function init(){
  $("calculate").addEventListener("click",calculate);
  $("privateKey").addEventListener("keydown",e=>{if(e.key==="Enter")calculate();});
  $("play").addEventListener("click",play);
  $("reset").addEventListener("click",()=>{stopAnimation();displaySteps(displayedSteps.length);});
  $("speed").addEventListener("change",()=>{if(timer!==null)play();});
  $("runStats").addEventListener("click",statistics);
  calculate();statistics();
}
if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded",init);
if (typeof module !== "undefined") module.exports={mod,inverse,onCurve,addPoints,multiply,pointLabel,GENERATOR,PRIME};
