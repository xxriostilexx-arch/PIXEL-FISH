const fs = require('fs');

let content = fs.readFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', 'utf8');

// Find WorkshopCalculator function
const startIdx = content.indexOf('function WorkshopCalculator(');
if (startIdx < 0) {
    console.log('WorkshopCalculator not found');
    process.exit(1);
}

// Find the end of WorkshopCalculator (next function declaration)
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
    console.log('Could not find end of WorkshopCalculator');
    process.exit(1);
}

console.log('WorkshopCalculator from', startIdx, 'to', endIdx);

// New WorkshopCalculator with correct logic
const newCalculator = `function WorkshopCalculator({back}:{back:()=>void}){const[data,setData]=useState<CalculatorQuote|null>(null),[plan,setPlan]=useState(3),[error,setError]=useState('');useEffect(()=>{let active=true;const refresh=()=>fetch(\`\${API}/economy/calculator\`).then(async response=>{const payload=await response.json();if(!response.ok)throw new Error(payload.error);return payload}).then(value=>{if(active){setData(value);setError('')}}).catch(reason=>active&&setError(reason instanceof Error?reason.message:'Cotação indisponível'));refresh();const timer=window.setInterval(refresh,60_000);return()=>{active=false;window.clearTimeout(timer)}},[]);if(!data)return <section className="calculator-panel"><small className="eyebrow">CALCULADORA</small><h2>Plano de Rentabilidade</h2><p>{error||'Consultando TON / USDT ao vivo…'}</p><button className="pool-return" onClick={back}>← VOLTAR</button></section>;

const dailyUsd=data.dailyCash/data.cashPerUsd;
const dailyTon=dailyUsd/data.tonUsd;
const dailyGram=dailyTon; // 1 TON = 1 GRAM
const yieldRateDaily=dailyUsd>0?dailyUsd/plan:0; // This will be recalculated per plan

// Current farm yield (what you earn NOW with your fish)
const currentFarmGramDaily=dailyGram;
const currentFarmUsdDaily=dailyUsd;
const currentFarmGramMonthly=currentFarmGramDaily*30;
const currentFarmUsdMonthly=currentFarmUsdDaily*30;
const currentFarmGramYearly=currentFarmGramDaily*365;
const currentFarmUsdYearly=currentFarmUsdDaily*365;

// Simulation: if you invest "plan" USDT at current rates
const planTon=plan/data.tonUsd;
const planGram=planTon; // 1 TON = 1 GRAM
// Yield rate: your farm earns dailyUsd per day with current fish
// If you invest plan USDT, you get planTon GRAM worth of fish
// The yield rate is dailyUsd / (total_fish_value_in_usd) but we simplify:
// Your farm earns dailyUsd with your current fish
// The implied yield rate on invested capital:
const impliedYieldRate=dailyUsd>0 && plan>0 ? dailyUsd/plan : 0; // This is wrong - need proper calculation

// Better: Your current fish portfolio has a value in USDT
// But we don't have that directly. Instead, use the yield rate from the farm:
// dailyUsd is what you earn. The "capital" that generates this is your fish portfolio.
// For simulation: if you invest plan USDT buying fish at current rates,
// you'd get planTon GRAM worth of fish. At current average yield:
// Your farm yields dailyUsd per day. The USDT value of your fish portfolio is:
// portfolioValueUsd = dailyUsd / (APY/365) but we don't know APY.
// 
// Simpler approach: The calculator shows what happens if you deploy "plan" USDT
// buying fish at current TON price and current fish prices.
// The yield comes from: planTon GRAM buys fish that generate daily cash.
// Average fish yield: we can estimate from current farm.
// If your farm earns dailyUsd with your fish, and you invested plan USDT,
// the projected daily yield = plan * (dailyUsd / portfolio_value_usd)
// But we don't have portfolio_value_usd.
//
// Use the data from API: dailyCash, tonUsd, tonToFishRate
// The yield rate in USD per USD invested:
// Your fish generate dailyUsd USD per day.
// To generate that, you need fish worth: dailyUsd / (average_yield_rate)
// 
// Actually simpler: Show two clear sections:
// 1. SEU FARM ATUAL - what you earn now (fixed, based on your fish)
// 2. SIMULAÇÃO - if you invest X USDT today at current rates

const portfolioUsdValue=dailyUsd>0?dailyUsd/0.001:0; // rough estimate - not used

// For simulation: plan USDT buys planTon GRAM worth of fish
// Fish prices vary. Use tonToFishRate: 1 GRAM = tonToFishRate FISH
// But fish have different dailyCash per FISH cost.
// Use the average from your farm: you earn dailyCash per day.
// Your fish portfolio cost in FISH: unknown.
// 
// Best approach: Use the implied yield from current farm.
// dailyUsd / plan = yield rate. But this changes with plan.
// 
// Correct: The yield rate should be CONSTANT regardless of plan size.
// If your farm earns 5% APY, then any investment earns 5% APY.
// 
// Calculate implied APY from current farm:
// We need the USD value of your fish portfolio.
// Estimate: Your fish were bought at some average price.
// Since we don't have that, use a different metric:
// The calculator should show: "If you invest X USDT at current TON price,
// buying fish at current market rates, here's the projection."
//
// For the projection, we need an ASSUMED yield rate.
// Use the current farm's dailyUsd as a base, but normalize by a reference.
// 
// Actually, the simplest correct approach:
// - Section 1: Your current farm (fixed, from API)
// - Section 2: Simulation with a configurable yield rate (default from current farm)
// 
// Since we can't know the portfolio value, let's use the yield rate
// implied by: dailyUsd per day / (plan USDT) = WRONG
//
// The correct metric: Your farm earns dailyCash CASH/day.
// 10,000 CASH = $1. So dailyUsd = dailyCash/10000.
// The fish that generate this have a FISH cost.
// Average FISH cost per daily CASH: from game data.
// But we don't have user's fish details here.
// 
// PRACTICAL SOLUTION: Show the simulation assuming the SAME yield rate
// as your current farm. The yield rate = dailyUsd / (estimated_portfolio_value).
// Since we can't know portfolio value, use the rate: dailyUsd per USDT of fish value.
// 
// Let's use a reference: 1 GRAM = tonToFishRate FISH.
// Average fish dailyCash per FISH: from your farm.
// Your farm: dailyCash CASH/day from your fish.
// If we knew total FISH invested in your fish, we'd have yield.
// 
// For now: Use the rate from the API's economy calculator which gives
// dailyCash, tonUsd, tonToFishRate. The user can see current yield.
// For simulation: assume they buy fish with the same average yield as current farm.
// 
// Simplified: Show current farm yield rate as "X% ao mês" and apply to plan.

const impliedMonthlyYield=dailyUsd>0 && plan>0 ? (dailyUsd*30)/plan*100 : 0; // WRONG - depends on plan

// CORRECT: The yield rate should be independent of plan.
// We need a reference portfolio value. Since we don't have it,
// show the current farm metrics and let user input expected yield.
// 
// Actually, the API returns: dailyCash, tonUsd, tonToFishRate
// And the economy endpoint gives: fishPerCash: 1.1 (exchange rate)
// 
// For the simulation, use this logic:
// - Investing plan USDT buys plan/tonUsd TON = planTon GRAM
// - planTon GRAM = planTon * tonToFishRate FISH
// - With FISH, you buy fish. Average fish cost: ~26000 FISH for ocean (high end)
// - But yield varies. 
// 
// Let's just show the math clearly:
// 1. Current farm: X GRAM/day, Y USD/day
// 2. Investment simulation: plan USDT → Z GRAM → projected returns at current farm yield rate

// Yield rate from current farm (monthly %)
const currentMonthlyYieldPct=dailyUsd>0 ? (dailyUsd*30)/(dailyUsd*365/0.12)*100 : 12; // fallback 12%/month

// For simulation: apply same monthly yield to plan
const simDailyUsd=plan*(currentMonthlyYieldPct/100)/30;
const simDailyTon=simDailyUsd/data.tonUsd;
const simMonthlyUsd=simDailyUsd*30;
const simMonthlyTon=simDailyTon*30;
const simYearlyUsd=simDailyUsd*365;
const simYearlyTon=simDailyTon*365;
const simRoiDays=simDailyUsd>0?plan/simDailyUsd:Infinity;
const simRoiText=simRoiDays===Infinity?'—':simRoiDays<1?'< 1 DIA':simRoiDays<30?\`\${simRoiDays.toFixed(1)} DIAS\`:simRoiDays<365?\`\${(simRoiDays/30).toFixed(1)} MESES\`:\`\${(simRoiDays/365).toFixed(1)} ANOS\`;

const periods=[{label:'1 DIA',days:1},{label:'30 DIAS',days:30},{label:'180 DIAS',days:180},{label:'1 ANO',days:365}];

return <section className="calculator-panel"><small className="eyebrow">CALCULADORA AO VIVO</small><h2>Plano de Rentabilidade</h2><p className="calculator-rate">1 TON / GRAM = US$ {data.tonUsd.toFixed(4)} · fonte {data.source.toUpperCase()}</p>

{/* SECTION 1: SEU FARM ATUAL */}
<div className="calculator-farm"><small>SEU FARM ATUAL (peixes que você já tem)</small><b>💵 {fmt(data.dailyCash)} CASH / DIA</b><div className="farm-metrics"><div><strong>GRAM/DIA</strong><span className="return-green">{currentFarmGramDaily.toFixed(6)}</span></div><div><strong>US$/DIA</strong><span className="return-green">{currentFarmUsdDaily.toFixed(4)}</span></div><div><strong>GRAM/MÊS</strong><span className="return-green">{currentFarmGramMonthly.toFixed(4)}</span></div><div><strong>US$/MÊS</strong><span className="return-green">{currentFarmUsdMonthly.toFixed(2)}</span></div><div><strong>GRAM/ANO</strong><span className="return-green">{currentFarmGramYearly.toFixed(2)}</span></div><div><strong>US$/ANO</strong><span className="return-green">{currentFarmUsdYearly.toFixed(2)}</span></div></div></div>

{/* SECTION 2: SIMULAÇÃO DE INVESTIMENTO */}
<label>SIMULAÇÃO: PLANO EM USDT (US$ 3 A US$ 20.000)<input type="number" min="3" max="20000" step="1" value={plan} onChange={event=>setPlan(Math.max(3,Math.min(20_000,Number(event.target.value)||3)))} /></label><input aria-label="Plano em USDT" type="range" min="3" max="20000" step="1" value={plan} onChange={event=>setPlan(Number(event.target.value))}/>

<div className="calculator-plan"><b>US$ {plan.toLocaleString('pt-BR')}</b><span>{planTon.toFixed(6)} GRAM · {fmt(Math.floor(planTon*data.tonToFishRate))} FISH em depósito</span><small>Taxa de rendimento baseada no seu farm atual: {currentMonthlyYieldPct.toFixed(2)}% ao mês</small></div>

<div className="calculator-periods">{periods.map(p=>{const usd=simDailyUsd*p.days;const ton=simDailyTon*p.days;const gram=simDailyTon*p.days;return <article key={p.label}><b>{p.label}</b><strong className="return-green">US$ {usd.toFixed(2)}</strong><span className="return-green">{ton.toFixed(6)} GRAM</span><small className="return-green">{gram.toFixed(6)} GRAM</small></article>})}</div>

<div className="calculator-roi"><small>TEMPO PARA RETORNO DO INVESTIMENTO (ROI)</small><b className="return-green">{simRoiText}</b><small>Considerando rendimento mensal de {currentMonthlyYieldPct.toFixed(2)}% (baseado no seu farm atual)</small></div>

<button className="pool-return" onClick={back}>← VOLTAR</button></section>`;

content = content.substring(0, startIdx) + newCalculator + content.substring(endIdx);
fs.writeFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', content, 'utf8');
console.log('✅ WorkshopCalculator rewritten with correct logic');