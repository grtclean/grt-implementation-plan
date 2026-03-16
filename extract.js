const XLSX = require('xlsx');
const wb = XLSX.readFile('data/副本部件&工序工时最新(3).xlsx');
const ws5 = wb.Sheets['工种工时消耗'];
const d5 = XLSX.utils.sheet_to_json(ws5, {header:1, defval:''});

const stats = {};
d5.slice(3).forEach(r => {
  const proc = String(r[4]).trim();
  const planned = Number(r[5]) || 0;
  const actual = Number(r[8]) || 0;
  const rate = Number(r[9]) || 0;
  if (proc && planned > 0) {
    if (!stats[proc]) stats[proc] = {count:0, totalPlanned:0, totalActual:0, rates:[]};
    stats[proc].count++;
    stats[proc].totalPlanned += planned;
    stats[proc].totalActual += actual;
    if (rate > 0) stats[proc].rates.push(rate);
  }
});

console.log('=== Process Benchmark from Real Data ===');
Object.entries(stats).forEach(([proc, s]) => {
  const avgRate = s.rates.length > 0 ? s.rates.reduce((a,b)=>a+b,0)/s.rates.length : 0;
  const sortedRates = [...s.rates].sort((a,b)=>a-b);
  const p50 = sortedRates.length > 0 ? sortedRates[Math.floor(sortedRates.length*0.5)] : 0;
  const p80 = sortedRates.length > 0 ? sortedRates[Math.floor(sortedRates.length*0.8)] : 0;
  const min = sortedRates.length > 0 ? sortedRates[0] : 0;
  const max = sortedRates.length > 0 ? sortedRates[sortedRates.length-1] : 0;
  console.log(`${proc}: n=${s.count} | planned=${s.totalPlanned.toFixed(0)}h | actual=${s.totalActual.toFixed(0)}h | avgRate=${avgRate.toFixed(3)} | min=${min.toFixed(3)} | p50=${p50.toFixed(3)} | p80=${p80.toFixed(3)} | max=${max.toFixed(3)}`);
});

// GRT-414 components
const ws1 = wb.Sheets['理论工时汇总'];
const d1 = XLSX.utils.sheet_to_json(ws1, {header:1, defval:''});
console.log('\n=== GRT-414 Components ===');
let inProject = '';
d1.slice(2).forEach(r => {
  const proj = String(r[0]).trim();
  if (proj.startsWith('GRT-')) inProject = proj;
  if (inProject === 'GRT-414' && String(r[1]).trim() && Number(r[5]) > 0) {
    console.log(`${r[1]} | ${r[3]} | total:${r[5]} | L:${r[6]||0} M:${r[7]||0} B:${r[8]||0} F:${r[9]||0} MA:${r[10]||0} EA:${r[11]||0} D:${r[12]||0}`);
  }
});

// All unique process names
const allProcs = new Set();
d5.slice(3).forEach(r => { const p = String(r[4]).trim(); if(p) allProcs.add(p); });
console.log('\n=== All Unique Process Types ===');
[...allProcs].forEach(p => console.log(`  - ${p}`));

// Per-project consumption analysis from sheet 6
const ws6 = wb.Sheets['工种工时输出'];
const d6 = XLSX.utils.sheet_to_json(ws6, {header:1, defval:''});
console.log('\n=== Per-Project Process Data (Sheet 6 sample) ===');
let count = 0;
d6.slice(1).forEach(r => {
  const key = String(r[0]).trim();
  if (key && key.includes('GRT-') && count < 30) {
    const proj = String(r[1]).trim();
    const proc = String(r[2]).trim();
    const planned = Number(r[3]) || 0;
    const actual = Number(r[6]) || 0;
    const consumRate = Number(r[7]) || 0;
    if (planned > 0) {
      console.log(`${proj} | ${proc} | planned:${planned}h | actual:${actual}h | rate:${consumRate.toFixed(3)}`);
      count++;
    }
  }
});
