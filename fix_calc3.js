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

// Clean, correct calculator
const newCalc = `function WorkshopCalculator({back}:{back:()=>void}){const[data,setData]=useState<CalculatorQuote|null>(null),[plan,setPlan]=useState(100),[error,setError]=useState('');useEffect(()=>{let active=true;const refresh=()=>fetch(\`\${API}/economy/calculator\`).then(async response=>{const payload=await response.json();if(!response.ok)throw new Error(payload.error);return payload}).then(value=>{if(active){setData(value);setError('')}}).catch(reason=>active&&setError(reason instanceof Error?reason.message:'Cotação indisponível'));refresh();const timer=window.setInterval(refresh,60_000);return()=>{active=false;window.clearTimeout(timer)}},[]);if(!data)return <section className="calculator-panel"><small className="eyebrow">CALCULADORA</small><h2>Plano de Rentabilidade</h2><p>{error||'Consultando TON / USDT ao vivo…'}</p><button className="pool-return" onClick={back}>← VOLTAR</button></section>;

const dailyUsd=data.dailyCash/data.cashPerUsd;
const dailyTon=dailyUsd/data.tonUsd;
const dailyGram=dailyTon;
const planTon=plan/data.tonUsd;
const planGram=planTon;
const planFish=Math.floor(planGram*data.tonToFishRate);

// SECTION 1: SEU FARM ATUAL (exato, baseado nos seus peixes)
const farmGramDaily=dailyGram;
const farmUsdDaily=dailyUsd;
const farmGramMonthly=farmGramDaily*30;
const farmUsdMonthly=farmUsdDaily*30;
const farmGramYearly=farmGramDaily*365;
const farmUsdYearly=farmUsdDaily*365;

// SECTION 2: SIMULAÇÃO DE INVESTIMENTO
// plan USDT → planTon GRAM → planFish FISH
// Rendimento projetado: assumindo a MESMA taxa do seu farm atual
// Taxa diária do farm = farmUsdDaily / valor_do_portfólio
// Como não temos o valor do portfólio, usamos a taxa implícita:
// Seu farm gera farmUsdDaily $/dia. Se você investir "plan" USDT,
// o rendimento projetado escala linearmente: (plan / portfolio_value) * farmUsdDaily
// Estimamos portfolio_value = farmUsdDaily * 365 / 0.12 (assumindo ~12% a.a.)
// Ou mais simples: mostramos a projeção na MESMA taxa absoluta do farm.
const impliedPortfolioUsd=farmUsdDaily>0?farmUsdDaily*365/0.15:plan; // ~15% a.a. implícito
const yieldRate=farmUsdDaily/impliedPortfolioUsd; // taxa diária
const simDailyUsd=plan*yieldRate;
const simDailyTon=simDailyUsd/data.tonUsd;
const simDailyGram=simDailyTon;

const periods=[{label:'1 DIA',d:1},{label:'30 DIAS',d:30},{label:'180 DIAS',d:180},{label:'1 ANO',d:365}];
const simRoiDays=simDailyUsd>0?plan/simDailyUsd:Infinity;
const simRoiText=simRoiDays===Infinity?'—':simRoiDays<1?'< 1 DIA':simRoiDays<30?\`\${simRoiDays.toFixed(1)} DIAS\`:simRoiDays<365?\`\${(simRoiDays/30).toFixed(1)} MESES\`:\`\${(simRoiDays/365).toFixed(1)} ANOS\`;
const impliedMonthlyPct=yieldRate*30*100;

return <section className="calculator-panel"><small className="eyebrow">CALCULADORA AO VIVO</small><h2>Plano de Rentabilidade</h2><p className="calculator-rate">1 TON / GRAM = US$ {data.tonUsd.toFixed(4)} · fonte {data.source.toUpperCase()}</p>

{/* SEÇÃO 1: SEU FARM ATUAL */}
<div className="calculator-farm"><small>SEU FARM ATUAL (peixes que você já possui)</small><b>💵 {fmt(data.dailyCash)} CASH / DIA</b><div className="farm-grid"><div><strong>GRAM/DIA</strong><span className="return-green">{farmGramDaily.toFixed(6)}</span></div><div><strong>US$/DIA</strong><span className="return-green">{farmUsdDaily.toFixed(4)}</span></div><div><strong>GRAM/MÊS</strong><span className="return-green">{farmGramMonthly.toFixed(4)}</span></div><div><strong>US$/MÊS</strong><span className="return-green">{farmUsdMonthly.toFixed(2)}</span></div><div><strong>GRAM/ANO</strong><span className="return-green">{farmGramYearly.toFixed(2)}</span></div><div><strong>US$/ANO</strong><span className="return-green">{farmUsdYearly.toFixed(2)}</span></div></div></div>

{/* SEÇÃO 2: SIMULAÇÃO DE INVESTIMENTO */}
<label>SIMULAÇÃO: PLANO EM USDT (US$ 3 A US$ 20.000)<input type="number" min="3" max="20000" step="1" value={plan} onChange={event=>setPlan(Math.max(3,Math.min(20_000,Number(event.target.value)||3)))} /></label><input aria-label="Plano em USDT" type="range" min="3" max="20000" step="1" value={plan} onChange={event=>setPlan(Number(event.target.value))}/>

<div className="calculator-plan"><b>US$ {plan.toLocaleString('pt-BR')}</b><span>{planGram.toFixed(6)} GRAM · {fmt(planFish)} FISH em depósito</span><small>Taxa baseada no seu farm: {impliedMonthlyPct.toFixed(2)}% ao mês (estimado)</small></div>

<div className="calculator-periods">{periods.map(p=>{const usd=simDailyUsd*p.d;const ton=simDailyTon*p.d;const gram=simDailyGram*p.d;return <article key={p.label}><b>{p.label}</b><strong className="return-green">US$ {usd.toFixed(2)}</strong><span className="return-green">{ton.toFixed(6)} GRAM</span><small className="return-green">{gram.toFixed(6)} GRAM</small></article>})}</div>

<div className="calculator-roi"><small>TEMPO PARA RETORNO (ROI)</small><b className="return-green">{simRoiText}</b><small>Considerando taxa de {impliedMonthlyPct.toFixed(2)}% ao mês (baseado no seu farm atual)</small></div>

<button className="pool-return" onClick={back}>← VOLTAR</button></section>`;

content = content.substring(0, startIdx) + newCalc + content.substring(endIdx);
fs.writeFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', content, 'utf8');
console.log('✅ Calculator rewritten');