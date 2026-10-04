const fs = require('fs');

let content = fs.readFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', 'utf8');

// Find WorkshopCalculator function
const startIdx = content.indexOf('function WorkshopCalculator(');
if (startIdx < 0) {
    console.log('WorkshopCalculator not found');
    process.exit(1);
}

let searchPos = startIdx + 20;
let endIdx = -1;
while (true) {
    const nextFunc = content.indexOf('function ', searchPos);
    if (nextFunc < 0) break;
    const before = content[nextFunc - 1];
    if (before === '\n' || before === ';' || before === '}') {
        endIdx = nextFunc;
        break;
    }
    searchPos = nextFunc + 1;
}

if (endIdx < 0) {
    console.log('Could not find end');
    process.exit(1);
}

console.log('Replacing from', startIdx, 'to', endIdx);

const newCalc = `function WorkshopCalculator({back}:{back:()=>void}){const[data,setData]=useState<CalculatorQuote|null>(null),[plan,setPlan]=useState(100),[error,setError]=useState(''),[simMode,setSimMode]=useState<'usdt'|'gram'>('usdt'),[planGramInput,setPlanGramInput]=useState('');useEffect(()=>{let active=true;const refresh=()=>fetch(\`\${API}/economy/calculator\`).then(async response=>{const payload=await response.json();if(!response.ok)throw new Error(payload.error);return payload}).then(value=>{if(active){setData(value);setError('')}}).catch(reason=>active&&setError(reason instanceof Error?reason.message:'Cotação indisponível'));refresh();const timer=window.setInterval(refresh,60_000);return()=>{active=false;window.clearTimeout(timer)}},[]);if(!data)return <section className="calculator-panel"><small className="eyebrow">CALCULADORA</small><h2>Plano de Rentabilidade</h2><p>{error||'Consultando TON / USDT ao vivo…'}</p><button className="pool-return" onClick={back}>← VOLTAR</button></section>;

const dailyUsd=data.dailyCash/data.cashPerUsd;
const dailyTon=dailyUsd/data.tonUsd;
const dailyGram=dailyTon;
const planTon=plan/data.tonUsd;
const planGram=planTon;
const planFish=Math.floor(planGram*data.tonToFishRate);

// GRAM mode: planGramInput -> plan (USDT)
const planGramFromInput=Number(planGramInput.replace(',','.'))||0;
const planFromGram=planGramFromInput*data.tonUsd;
const planTonFromGram=planGramFromInput;
const planFishFromGram=Math.floor(planGramFromInput*data.tonToFishRate);

// SEÇÃO 1: SEU FARM ATUAL
const farmGramDaily=dailyGram;
const farmUsdDaily=dailyUsd;
const farmGramMonthly=farmGramDaily*30;
const farmUsdMonthly=farmUsdDaily*30;
const farmGramYearly=farmGramDaily*365;
const farmUsdYearly=farmUsdDaily*365;

// SEÇÃO 2: SIMULAÇÃO — USA TAXA REAL DO PORTFÓLIO (vinda da API)
const portfolioFish=data.portfolioFish??0;
const portfolioYieldDaily=data.portfolioYieldDaily??0;
const realYieldApy=data.realYieldApy??0;
const portfolioValueUsd=data.portfolioValueUsd??0;
const monthlyYieldPct=data.monthlyYieldPct??0;

const isGramMode=simMode==='gram';
const simPlan=isGramMode?planFromGram:plan;
const simPlanGram=isGramMode?planGramFromInput:planGram;
const simPlanFish=isGramMode?planFishFromGram:planFish;

// Rendimento diário projetado = simPlanGram * portfolioYieldDaily (em CASH)
const simDailyCash=simPlanGram*portfolioYieldDaily;
const simDailyUsd=simDailyCash/data.cashPerUsd;
const simDailyTon=simDailyUsd/data.tonUsd;
const simDailyGram=simDailyTon;

const realMonthlyPct=realYieldApy/12*100;
const simRoiDays=simDailyUsd>0?simPlan/simDailyUsd:Infinity;
const simRoiText=simRoiDays===Infinity?'—':simRoiDays<1?'< 1 DIA':simRoiDays<30?\`\${simRoiDays.toFixed(1)} DIAS\`:simRoiDays<365?\`\${(simRoiDays/30).toFixed(1)} MESES\`:\`\${(simRoiDays/365).toFixed(1)} ANOS\`;

const periods=[{label:'1 DIA',d:1},{label:'30 DIAS',d:30},{label:'180 DIAS',d:180},{label:'1 ANO',d:365}];

return <section className="calculator-panel" style={{minWidth:520}}><small className="eyebrow">CALCULADORA AO VIVO</small><h2>Plano de Rentabilidade</h2><p className="calculator-rate">1 TON / GRAM = US$ {data.tonUsd.toFixed(4)} · fonte {data.source.toUpperCase()}</p>

{/* SEÇÃO 1: SEU FARM ATUAL */}
<div className="calculator-section"><h3>🏡 SEU FARM ATUAL</h3><div className="info-grid"><div className="info-row"><span className="info-label">CASH/DIA</span><span className="info-value return-green">{fmt(data.dailyCash)}</span></div><div className="info-row"><span className="info-label">GRAM/DIA</span><span className="info-value return-green">{farmGramDaily.toFixed(6)}</span></div><div className="info-row"><span className="info-label">US$/DIA</span><span className="info-value return-green">{farmUsdDaily.toFixed(4)}</span></div><div className="info-row"><span className="info-label">GRAM/MÊS</span><span className="info-value return-green">{farmGramMonthly.toFixed(4)}</span></div><div className="info-row"><span className="info-label">US$/MÊS</span><span className="info-value return-green">{farmUsdMonthly.toFixed(2)}</span></div><div className="info-row"><span className="info-label">GRAM/ANO</span><span className="info-value return-green">{farmGramYearly.toFixed(2)}</span></div><div className="info-row"><span className="info-label">US$/ANO</span><span className="info-value return-green">{farmUsdYearly.toFixed(2)}</span></div></div></div>

{/* INFO DO PORTFÓLIO REAL */}
{portfolioFish>0&&<div className="calculator-section" style={{marginTop:12}}><h3>🎒 SEU PORTFÓLIO REAL</h3><div className="info-grid"><div className="info-row"><span className="info-label">FISH INVESTIDOS</span><span className="info-value return-green">{fmt(portfolioFish)}</span></div><div className="info-row"><span className="info-label">VALOR (US$)</span><span className="info-value return-green">{portfolioValueUsd.toFixed(2)}</span></div><div className="info-row"><span className="info-label">RENDIMENTO/FISH/DIA</span><span className="info-value return-green">{portfolioYieldDaily.toFixed(4)} CASH</span></div><div className="info-row"><span className="info-label">APY REAL</span><span className="info-value return-green">{(realYieldApy*100).toFixed(1)}%</span></div><div className="info-row"><span className="info-label">% MENSAL</span><span className="info-value return-green">{monthlyYieldPct.toFixed(2)}%</span></div></div></div>}

{/* SEÇÃO 2: SIMULAÇÃO DE INVESTIMENTO */}
<div className="calculator-section" style={{marginTop:12}}><h3>📈 SIMULAÇÃO DE INVESTIMENTO</h3>

<div className="sim-mode-tabs">
<button className={\`sim-tab \${simMode==='usdt'?'active':''}\`} onClick={()=>setSimMode('usdt')}>💵 SIMULAR EM USDT</button>
<button className={\`sim-tab \${simMode==='gram'?'active':''}\`} onClick={()=>setSimMode('gram')}>💎 SIMULAR EM GRAM</button>
</div>

{!isGramMode?(
<label className="sim-input-group"><span className="sim-label">PLANO EM USDT (US$ 3 A US$ 20.000)</span><div className="sim-input-row"><input type="number" min="3" max="20000" step="1" value={plan} onChange={event=>setPlan(Math.max(3,Math.min(20_000,Number(event.target.value)||3)))} /><input type="range" min="3" max="20000" step="1" value={plan} onChange={event=>setPlan(Number(event.target.value))}/></div></label>
):(
<label className="sim-input-group"><span className="sim-label">PLANO EM GRAM (0.01 A 20.000 GRAM)</span><div className="sim-input-row"><input type="number" min="0.01" max="20000" step="0.01" value={planGramInput} onChange={event=>setPlanGramInput(event.target.value)} /><input type="range" min="0.01" max="20000" step="0.01" value={planGramFromInput} onChange={event=>setPlanGramInput(event.target.value)}/></div></label>
)}

<div className="sim-plan-summary"><b>{isGramMode?\`GRAM \${planGramFromInput.toLocaleString('pt-BR')}\`:\`US$ \${plan.toLocaleString('pt-BR')}\`}</b><span>{isGramMode?\`US$ \${planFromGram.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}\`:\`GRAM \${planGram.toFixed(6)}\`} · {isGramMode?fmt(planFishFromGram):fmt(planFish)} FISH em depósito</span><small>Taxa do portfólio: {monthlyYieldPct.toFixed(2)}%/mês (APY {(realYieldApy*100).toFixed(1)}%)</small></div>

<div className="sim-periods">{periods.map(p=>{const usd=simDailyUsd*p.d;const ton=simDailyTon*p.d;const gram=simDailyGram*p.d;const cash=simDailyCash*p.d;return <article key={p.label} className="sim-period-card"><div className="period-header"><span className="period-label">{p.label}</span><span className="period-cash return-green">{fmt(cash)} CASH</span></div><div className="period-values"><span className="return-green">US$ {usd.toFixed(2)}</span><span className="return-green">{ton.toFixed(6)} GRAM</span><span className="return-green">{gram.toFixed(6)} GRAM</span></div></article>})}</div>

<div className="sim-roi-card"><span className="roi-label">TEMPO PARA RETORNO (ROI)</span><span className="roi-value return-green">{simRoiText}</span><span className="roi-desc">Considerando {monthlyYieldPct.toFixed(2)}%/mês do seu portfólio real</span></div>

</div>

<button className="pool-return" onClick={back}>← VOLTAR</button></section>`;

content = content.substring(0, startIdx) + newCalc + content.substring(endIdx);
fs.writeFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', content, 'utf8');
console.log('✅ Calculator rewritten with wider layout');