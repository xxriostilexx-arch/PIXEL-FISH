const fs = require('fs');

let content = fs.readFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', 'utf8');

// Find the SIMULAÇÃO tab content (tab==='sim')
const simStart = content.indexOf("{tab==='sim'&&<div className=\"calc-tab-content\"");
if (simStart < 0) {
    console.log('SIM tab not found');
    process.exit(1);
}

// Find the end of this tab (next tab or closing)
let braceCount = 0;
let inString = false;
let stringChar = '';
let endIdx = -1;

for (let i = simStart; i < content.length; i++) {
    const ch = content[i];
    const prev = content[i-1];
    
    if (!inString) {
        if (ch === '"' || ch === "'" || ch === '`') {
            inString = true;
            stringChar = ch;
        } else if (ch === '{') {
            braceCount++;
        } else if (ch === '}') {
            braceCount--;
            if (braceCount === 0) {
                // Check if this closes the tab div
                const nextChars = content.substring(i+1, i+20);
                if (nextChars.includes('{tab===') || nextChars.includes('<button className="pool-return"')) {
                    endIdx = i + 1;
                    break;
                }
            }
        }
    } else {
        if (ch === stringChar && prev !== '\\') {
            inString = false;
        }
    }
}

if (endIdx < 0) {
    console.log('Could not find end of SIM tab');
    process.exit(1);
}

console.log('Found SIM tab from', simStart, 'to', endIdx);

// New SIM tab with Renda Estimada format
const newSimTab = `{tab==='sim'&&<div className="calc-tab-content" style={{minWidth:560}}><div className="calc-section"><h3>📈 SIMULAÇÃO DE INVESTIMENTO</h3>

<div className="sim-mode-tabs" style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
<button className={\`sim-tab \${simMode==='usdt'?'active':''}\`} onClick={()=>setSimMode('usdt')}>💵 SIMULAR EM USDT</button>
<button className={\`sim-tab \${simMode==='gram'?'active':''}\`} onClick={()=>setSimMode('gram')}>💎 SIMULAR EM GRAM</button>
</div>

{!isGramMode?(
<label className="sim-input-group"><span className="sim-label">PLANO EM USDT (US$ 3 A US$ 20.000)</span><div className="sim-input-row"><input type="number" min="3" max="20000" step="1" value={plan} onChange={event=>setPlan(Math.max(3,Math.min(20_000,Number(event.target.value)||3)))} /><input type="range" min="3" max="20000" step="1" value={plan} onChange={event=>setPlan(Number(event.target.value))}/></div></label>
):(
<label className="sim-input-group"><span className="sim-label">PLANO EM GRAM (0.01 A 20.000 GRAM)</span><div className="sim-input-row"><input type="number" min="0.01" max="20000" step="0.01" value={planGramInput} onChange={event=>setPlanGramInput(event.target.value)} /><input type="range" min="0.01" max="20000" step="0.01" value={planGramFromInput} onChange={event=>setPlanGramInput(event.target.value)}/></div></label>
)}

<div className="sim-plan-summary"><b>{isGramMode?\`GRAM \${planGramFromInput.toLocaleString('pt-BR')}\`:\`US$ \${plan.toLocaleString('pt-BR')}\`}</b><span>{isGramMode?\`US$ \${planFromGram.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}\`:\`GRAM \${planGram.toFixed(6)}\`} · {isGramMode?fmt(planFishFromGram):fmt(planFish)} FISH em depósito</span><small>Taxa do portfólio: {monthlyYieldPct.toFixed(2)}%/mês (APY {(realYieldApy*100).toFixed(1)}%)</small></div>

{/* RENDA ESTIMADA - FORMATO LIMPO POR $100 */}
<div className="renda-estimada" style={{marginTop:16}}>
<h4 style={{margin:'0 0 12px',color:'#f6d78f',fontSize:11,fontWeight:800}}>💰 RENDA ESTIMADA POR $100 INVESTIDOS</h4>
<div className="renda-cards" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginTop:8}}>
<div className="renda-card" style={{padding:'12px 8px',border:'2px solid #326d76',borderRadius:8,background:'#092c38',color:'#c8f2e8,textAlign:'center',minWidth:140}}>
<div className="renda-label" style={{fontSize:7,color:'#a8e5dc,marginBottom:4,fontWeight:800,whiteSpace:'nowrap'}}>DIÁRIO (POR $100)</div>
<div className="renda-value" style={{fontSize:14,fontWeight:800,color:'#6df5a3,whiteSpace:'nowrap'}}>US$ {(monthlyYieldPct/30).toFixed(4)}</div>
<div className="renda-sub" style={{fontSize:6,color:'#9fd4cf,marginTop:2,whiteSpace:'nowrap'}}>~{(monthlyYieldPct/30*100).toFixed(2)}% ao dia</div>
</div>
<div className="renda-card" style={{padding:'12px 8px',border:'2px solid #326d76',borderRadius:8,background:'#092c38',color:'#c8f2e8,textAlign:'center',minWidth:140}}>
<div className="renda-label" style={{fontSize:7,color:'#a8e5dc,marginBottom:4,fontWeight:800,whiteSpace:'nowrap'}}>30 DIAS (POR $100)</div>
<div className="renda-value" style={{fontSize:14,fontWeight:800,color:'#6df5a3,whiteSpace:'nowrap'}}>US$ {monthlyYieldPct.toFixed(2)}</div>
<div className="renda-sub" style={{fontSize:6,color:'#9fd4cf,marginTop:2,whiteSpace:'nowrap'}}>{monthlyYieldPct.toFixed(2)}% ao mês</div>
</div>
<div className="renda-card" style={{padding:'12px 8px',border:'2px solid #326d76',borderRadius:8,background:'#092c38',color:'#c8f2e8,textAlign:'center',minWidth:140}}>
<div className="renda-label" style={{fontSize:7,color:'#a8e5dc,marginBottom:4,fontWeight:800,whiteSpace:'nowrap'}}>180 DIAS (POR $100)</div>
<div className="renda-value" style={{fontSize:14,fontWeight:800,color:'#6df5a3,whiteSpace:'nowrap'}}>US$ {(monthlyYieldPct*6).toFixed(2)}</div>
<div className="renda-sub" style={{fontSize:6,color:'#9fd4cf,marginTop:2,whiteSpace:'nowrap'}}>{(monthlyYieldPct*6).toFixed(2)}% em 6 meses</div>
</div>
<div className="renda-card" style={{padding:'12px 8px',border:'2px solid #326d76',borderRadius:8,background:'#092c38',color:'#c8f2e8,textAlign:'center',minWidth:140}}>
<div className="renda-label" style={{fontSize:7,color:'#a8e5dc,marginBottom:4,fontWeight:800,whiteSpace:'nowrap'}}>1 ANO (POR $100)</div>
<div className="renda-value" style={{fontSize:14,fontWeight:800,color:'#6df5a3,whiteSpace:'nowrap'}}>US$ {(monthlyYieldPct*12).toFixed(2)}</div>
<div className="renda-sub" style={{fontSize:6,color:'#9fd4cf,marginTop:2,whiteSpace:'nowrap'}}>{(monthlyYieldPct*12).toFixed(2)}% ao ano</div>
</div>
</div>
</div>

{/* SEU INVESTIMENTO REAL - PROJEÇÃO ABSOLUTA */}
<div className="sim-investimento-real" style={{marginTop:20,padding:12,border:'2px solid #c79d4b',borderRadius:8,background:'#342719',color:'#f9e4ae'}}>
<h4 style={{margin:'0 0 12px',color:'#ffcb8a,fontSize:10,fontWeight:800}}>📊 SEU INVESTIMENTO: {isGramMode?\`\${planGramFromInput.toLocaleString('pt-BR')} GRAM\`:\`US$ \${plan.toLocaleString('pt-BR')}\`}</h4>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,fontSize:9}}>
<div style={{padding:8,background:'#2a1f0a,borderRadius:6,textAlign:'center'}}><div style={{color:'#ffcb8a,fontSize:7,marginBottom:2'}}>INVESTIDO</div><div style={{fontWeight:800,fontSize:12,color:'#f9e4ae'}}>{isGramMode?\`\${planGramFromInput.toLocaleString('pt-BR')} GRAM\`:\`US$ \${plan.toLocaleString('pt-BR')}\`}</div></div>
<div style={{padding:8,background:'#2a1f0a,borderRadius:6,textAlign:'center'}}><div style={{color:'#ffcb8a,fontSize:7,marginBottom:2'}}>DIA</div><div style={{fontWeight:800,color:'#6df5a3'}}>US$ {simDailyUsd.toFixed(2)} · {fmt(simDailyCash)} CASH</div></div>
<div style={{padding:8,background:'#2a1f0a,borderRadius:6,textAlign:'center'}}><div style={{color:'#ffcb8a,fontSize:7,marginBottom:2'}}>30 DIAS</div><div style={{fontWeight:800,color:'#6df5a3'}}>US$ {(simDailyUsd*30).toFixed(2)} · {fmt(simDailyCash*30)} CASH</div></div>
<div style={{padding:8,background:'#2a1f0a,borderRadius:6,textAlign:'center'}}><div style={{color:'#ffcb8a,fontSize:7,marginBottom:2'}}>180 DIAS</div><div style={{fontWeight:800,color:'#6df5a3'}}>US$ {(simDailyUsd*180).toFixed(2)} · {fmt(simDailyCash*180)} CASH</div></div>
<div style={{padding:8,background:'#2a1f0a,borderRadius:6,textAlign:'center'}}><div style={{color:'#ffcb8a,fontSize:7,marginBottom:2'}}>1 ANO</div><div style={{fontWeight:800,color:'#6df5a3'}}>US$ {(simDailyUsd*365).toFixed(2)} · {fmt(simDailyCash*365)} CASH</div></div>
</div>
</div>

{/* ROI */}
<div className="sim-roi-card" style={{marginTop:16,padding:12,border:'2px solid #4baf7e',borderRadius:8,background:'#0a3b3b',color:'#baf5ce',textAlign:'center'}}><span className="roi-label" style={{fontSize:7,color:'#aee8dc,display:'block',marginBottom:4}}>TEMPO PARA RETORNO (ROI)</span><span className="roi-value return-green" style={{fontSize:14,fontWeight:800,display:'block'}}>{simRoiText}</span><span className="roi-desc" style={{fontSize:7,color:'#9fd4cf,display:'block',marginTop:4}}>Considerando {monthlyYieldPct.toFixed(2)}%/mês do seu portfólio real</span></div>

</div></div>`;

const oldSimTab = content.substring(simStart, endIdx);
content = content.substring(0, simStart) + newSimTab + content.substring(endIdx);

fs.writeFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', content, 'utf8');
console.log('✅ SIM tab updated with Renda Estimada format');