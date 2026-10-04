const fs = require('fs');

let content = fs.readFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', 'utf8');

// ============================================================
// 1. ADD FishSpeedControl AND WorkshopCalculator COMPONENTS
// Insert them right before "function PoolTools("
// ============================================================

const poolToolsIdx = content.indexOf('function PoolTools(');
if (poolToolsIdx < 0) {
    console.log('ERROR: PoolTools not found');
    process.exit(1);
}

const newComponents = `
function FishSpeedControl({back}:{back:()=>void}){const[level,setLevel]=useState(()=>Number(localStorage.getItem('pixel-fish-swim-speed')??0)),apply=(value:number)=>{const safe=Math.max(-3,Math.min(3,value));setLevel(safe);localStorage.setItem('pixel-fish-swim-speed',String(safe));window.dispatchEvent(new Event('pixel-fish:swim-speed'))},factor=10**level,baseSec=18,label=level===0?'NORMAL (18–26s por volta)':level<0?\`\${(1/factor).toLocaleString('pt-BR',{maximumFractionDigits:0})}× MAIS DEVAGAR (\${Math.round(baseSec/factor)}–\${Math.round(26/factor)}s)\`:\`\${factor.toLocaleString('pt-BR',{maximumFractionDigits:0})}× MAIS RÁPIDO (\${Math.round(baseSec*factor)}–\${Math.round(26*factor)}s)\`;return <section className="speed-panel"><small className="eyebrow">AQUÁRIO</small><h2>Velocidade dos Peixes</h2><p>Preferência visual só deste aparelho. Não afeta pesca, sorte, saldo ou rendimento.</p><strong>{label}</strong><input aria-label="Velocidade dos peixes" type="range" min="-3" max="3" step="0.1" value={level} onChange={event=>apply(Number(event.target.value))}/><div><button onClick={()=>apply(-3)}>1000× LENTO (5h+)</button><button onClick={()=>apply(0)}>NORMAL</button><button onClick={()=>apply(3)}>1000× RÁPIDO (<1s)</button></div><small>Base: 18–26 segundos por volta completa. A alteração é salva neste dispositivo.</small><button className="pool-return" onClick={back}>← VOLTAR</button></section>}

type CalculatorQuote={dailyCash:number;cashPerUsd:number;tonUsd:number;tonToFishRate:number;fishPerCash:number;source:string;quotedAt:string};

function WorkshopCalculator({back}:{back:()=>void}){const[data,setData]=useState<CalculatorQuote|null>(null),[plan,setPlan]=useState(3),[error,setError]=useState('');useEffect(()=>{let active=true;const refresh=()=>fetch(\`\${API}/economy/calculator\`).then(async response=>{const payload=await response.json();if(!response.ok)throw new Error(payload.error);return payload}).then(value=>{if(active){setData(value);setError('')}}).catch(reason=>active&&setError(reason instanceof Error?reason.message:'Cotação indisponível'));refresh();const timer=window.setInterval(refresh,60_000);return()=>{active=false;window.clearTimeout(timer)}},[]);if(!data)return <section className="calculator-panel"><small className="eyebrow">CALCULADORA</small><h2>Plano de Rentabilidade</h2><p>{error||'Consultando TON / USDT ao vivo…'}</p><button className="pool-return" onClick={back}>← VOLTAR</button></section>;const dailyUsd=data.dailyCash/data.cashPerUsd,dailyTon=dailyUsd/data.tonUsd,planTon=plan/data.tonUsd,planFish=planTon*data.tonToFishRate,roiDays=dailyUsd?plan/dailyUsd:Infinity;const periodReturns=[{label:'1 DIA',days:1,usd:dailyUsd*1,ton:dailyTon*1,fish:Math.floor(planFish/365*1)},{label:'30 DIAS',days:30,usd:dailyUsd*30,ton:dailyTon*30,fish:Math.floor(planFish/365*30)},{label:'180 DIAS',days:180,usd:dailyUsd*180,ton:dailyTon*180,fish:Math.floor(planFish/365*180)},{label:'1 ANO',days:365,usd:dailyUsd*365,ton:dailyTon*365,fish:planFish}];const roiText=roiDays===Infinity?'—':roiDays<1?'< 1 DIA':roiDays<30?\`\${roiDays.toFixed(1)} DIAS\`:roiDays<365?\`\${(roiDays/30).toFixed(1)} MESES\`:\`\${(roiDays/365).toFixed(1)} ANOS\`;const tonUsd=data.tonUsd,fishPerGram=13000,oceanCost=26000,legendaryChance=0.01,epicChance=0.22,legendaryDaily=13200,epicDaily=8800,legendaryUsdDaily=legendaryDaily/10000,epicUsdDaily=epicDaily/10000,castsFor22Legendary=Math.ceil(22/legendaryChance),castsFor22Epic=Math.ceil(22/epicChance),fishInvestLegendary=castsFor22Legendary*oceanCost,fishInvestEpic=castsFor22Epic*oceanCost,gramInvestLegendary=fishInvestLegendary/fishPerGram,gramInvestEpic=fishInvestEpic/fishPerGram,usdInvestLegendary=gramInvestLegendary*tonUsd,usdInvestEpic=gramInvestEpic*tonUsd,roiDaysLegendary=usdInvestLegendary/legendaryUsdDaily,roiDaysEpic=usdInvestEpic/epicUsdDaily,roiYearsLegendary=roiDaysLegendary/365,roiYearsEpic=roiDaysEpic/365;return <section className="calculator-panel"><small className="eyebrow">CALCULADORA AO VIVO</small><h2>Plano de Rentabilidade</h2><p className="calculator-rate">1 TON / GRAM = US$ {data.tonUsd.toFixed(4)} · fonte {data.source.toUpperCase()}</p><div className="calculator-farm"><small>SEU FARM ATUAL</small><b>💵 {fmt(data.dailyCash)} CASH / DIA</b><strong>US$ {dailyUsd.toFixed(4)} · {dailyTon.toFixed(6)} GRAM / DIA</strong></div><label>PLANO EM USDT (US$ 3 A US$ 20.000)<input type="number" min="3" max="20000" step="1" value={plan} onChange={event=>setPlan(Math.max(3,Math.min(20_000,Number(event.target.value)||3)))} /></label><input aria-label="Plano em USDT" type="range" min="3" max="20000" step="1" value={plan} onChange={event=>setPlan(Number(event.target.value))}/><div className="calculator-plan"><b>US$ {plan.toLocaleString('pt-BR')}</b><span>{planTon.toFixed(6)} GRAM · {fmt(planFish)} FISH em depósito</span><small>Retorno do seu farm atual: {Number.isFinite(roiDays)?\`\${roiDays.toFixed(1)} dias\`:'sem farm ativo'}</small></div><div className="calculator-periods">{periodReturns.map(p=><article key={p.label}><b>{p.label}</b><strong className="return-green">US$ {p.usd.toFixed(2)}</strong><span className="return-green">{p.ton.toFixed(6)} GRAM</span><small className="return-green">💵 {fmt(p.fish)} FISH</small></article>)}</div><div className="calculator-roi"><small>TEMPO PARA RETORNO DO INVESTIMENTO (ROI)</small><b className="return-green">{roiText}</b><small>Baseado no seu farm atual de {fmt(data.dailyCash)} CASH/dia</small></div><aside className="extreme-scenario"><b>CENÁRIO EXTREMO · 22 LENDÁRIOS (Rainha Abissal)</b><span>Chance: 1% · Lançamentos esperados: <strong>{fmt(castsFor22Legendary)}</strong></span><span>Investimento: <strong className="return-green">{fmt(fishInvestLegendary)} FISH</strong> = <strong className="return-green">{fmt(gramInvestLegendary)} GRAM</strong> = <strong className="return-green">US$ {fmt(usdInvestLegendary)}</strong></span><span>Retorno: <strong className="return-green">13.200 CASH/DIA</strong> = <strong className="return-green">US$ {legendaryUsdDaily.toFixed(2)}/DIA</strong></span><span>ROI: <strong className="return-green">{fmt(roiDaysLegendary)} dias</strong> = <strong className="return-green">{roiYearsLegendary.toFixed(1)} ANOS</strong></span><small>Probabilidade real: (1%)^22 ≈ 1 em 10^44 — hipótese teórica, não expectativa.</small></aside><aside className="extreme-scenario"><b>CENÁRIO EXTREMO · 22 ÉPICOS (Marlim Violeta)</b><span>Chance: 22% · Lançamentos esperados: <strong>{fmt(castsFor22Epic)}</strong></span><span>Investimento: <strong className="return-green">{fmt(fishInvestEpic)} FISH</strong> = <strong className="return-green">{fmt(gramInvestEpic)} GRAM</strong> = <strong className="return-green">US$ {fmt(usdInvestEpic)}</strong></span><span>Retorno: <strong className="return-green">8.800 CASH/DIA</strong> = <strong className="return-green">US$ {epicUsdDaily.toFixed(2)}/DIA</strong></span><span>ROI: <strong className="return-green">{fmt(roiDaysEpic)} dias</strong> = <strong className="return-green">{roiYearsEpic.toFixed(1)} ANOS</strong></span><small>Probabilidade real: (22%)^22 ≈ 1 em 10^14 — ainda extremamente raro.</small></aside><button className="pool-return" onClick={back}>← VOLTAR</button></section>}

`;

// Insert before PoolTools
const beforePoolTools = content.substring(0, poolToolsIdx);
const afterPoolTools = content.substring(poolToolsIdx);
content = beforePoolTools + newComponents + afterPoolTools;

// ============================================================
// 2. UPDATE PoolTools - Add 'speed' and 'calculator' to view type
// ============================================================
const updatedPoolToolsIdx = content.indexOf('function PoolTools(');
if (updatedPoolToolsIdx < 0) {
    console.log('ERROR: PoolTools not found after insert');
    process.exit(1);
}

// Update the view type: 'home'|'forge'|'market'|'vault' -> 'home'|'forge'|'market'|'vault'|'speed'|'calculator'
const oldViewType = `'home'|'forge'|'market'|'vault'`;
const newViewType = `'home'|'forge'|'market'|'vault'|'speed'|'calculator'`;

const viewTypeIdx = content.indexOf(oldViewType, updatedPoolToolsIdx);
if (viewTypeIdx >= 0) {
    content = content.substring(0, viewTypeIdx) + newViewType + content.substring(viewTypeIdx + oldViewType.length);
    console.log('✅ Updated view type');
} else {
    console.log('❌ View type not found');
}

// ============================================================
// 3. UPDATE PoolTools HOME VIEW - Add buttons for speed and calculator
// ============================================================
const oldHomeView = `<section className="pool-tools"><small className="eyebrow">OFICINA DO AQUÁRIO</small><h2>Expedições e Itens</h2><button onClick={()=>setView('forge')}>⚒️ FORJA<small>9 PEIXES PARA EVOLUIR</small></button><button onClick={()=>setView('market')}>🏪 MERCADO P2P<small>COMPRE E ANUNCIE PEIXES</small></button><button onClick={()=>setView('vault')}>🔐 ABRIR COFRE<small>CÓDIGOS BÔNUS LIMITADOS</small></button></section>`;

const newHomeView = `<section className="pool-tools"><small className="eyebrow">OFICINA DO AQUÁRIO</small><h2>Expedições e Itens</h2><button onClick={()=>setView('forge')}>⚒️ FORJA<small>9 PEIXES PARA EVOLUIR</small></button><button onClick={()=>setView('market')}>🏪 MERCADO P2P<small>COMPRE E ANUNCIE PEIXES</small></button><button onClick={()=>setView('vault')}>🔐 ABRIR COFRE<small>CÓDIGOS BÔNUS LIMITADOS</small></button><button onClick={()=>setView('speed')}>⚡ VELOCIDADE<small>RITMO VISUAL DOS PEIXES</small></button><button onClick={()=>setView('calculator')}>📊 CALCULADORA<small>FARM E PROJEÇÃO EM GRAM / USDT</small></button></section>`;

if (content.includes(oldHomeView)) {
    content = content.replace(oldHomeView, newHomeView);
    console.log('✅ Updated home view buttons');
} else {
    console.log('❌ Old home view not found');
    // Try to find it
    const idx = content.indexOf('OFICINA DO AQUÁRIO');
    if (idx >= 0) {
        console.log('Found at:', idx);
        console.log(content.substring(idx, idx + 500));
    }
}

// ============================================================
// 4. UPDATE PoolTools RENDER - Add speed and calculator views
// ============================================================
// Find the ternary chain ending with vault panel and add speed/calculator before it
const oldVaultTernary = `:<section className="vault-panel"><small className="eyebrow">COFRE</small><h2>Resgatar Código</h2>`;
const newViewsTernary = `:view==='speed'?<FishSpeedControl back={()=>setView('home')}/>:view==='calculator'?<WorkshopCalculator back={()=>setView('home')}/>:<section className="vault-panel"><small className="eyebrow">COFRE</small><h2>Resgatar Código</h2>`;

if (content.includes(oldVaultTernary)) {
    content = content.replace(oldVaultTernary, newViewsTernary);
    console.log('✅ Added speed and calculator views');
} else {
    console.log('❌ Old vault ternary not found');
    const idx = content.indexOf('view===\'vault\'');
    if (idx >= 0) {
        console.log('Found vault view at:', idx);
        console.log(content.substring(idx, idx + 200));
    }
}

// ============================================================
// SAVE
// ============================================================
fs.writeFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', content, 'utf8');
console.log('\\n📝 File saved successfully!');