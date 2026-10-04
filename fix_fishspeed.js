const fs = require('fs');

let content = fs.readFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', 'utf8');

// Find FishSpeedControl function
const idx = content.indexOf('function FishSpeedControl(');
if (idx < 0) {
    console.log('FishSpeedControl not found');
    process.exit(1);
}

// Find the end of this function (next function declaration)
let searchPos = idx + 20;
let endIdx = -1;
while (true) {
    const nextFunc = content.indexOf('function ', searchPos);
    if (nextFunc < 0) break;
    // Check if it's a real function declaration (preceded by newline or semicolon)
    const before = content[nextFunc - 1];
    if (before === '\n' || before === ';' || before === '}') {
        endIdx = nextFunc;
        break;
    }
    searchPos = nextFunc + 1;
}

if (endIdx < 0) {
    console.log('Could not find end of FishSpeedControl');
    process.exit(1);
}

console.log('FishSpeedControl from', idx, 'to', endIdx);

// Replace with fixed version (using ASCII chars only)
const fixedFishSpeedControl = `function FishSpeedControl({back}:{back:()=>void}){const[level,setLevel]=useState(()=>Number(localStorage.getItem('pixel-fish-swim-speed')??0)),apply=(value:number)=>{const safe=Math.max(-3,Math.min(3,value));setLevel(safe);localStorage.setItem('pixel-fish-swim-speed',String(safe));window.dispatchEvent(new Event('pixel-fish:swim-speed'))},factor=10**level,baseSec=18,label=level===0?'NORMAL (18-26s por volta)':level<0?\`\${(1/factor).toLocaleString('pt-BR',{maximumFractionDigits:0})}x MAIS DEVAGAR (\${Math.round(baseSec/factor)}-\${Math.round(26/factor)}s)\`:\`\${factor.toLocaleString('pt-BR',{maximumFractionDigits:0})}x MAIS RAPIDO (\${Math.round(baseSec*factor)}-\${Math.round(26*factor)}s)\`;return <section className="speed-panel"><small className="eyebrow">AQUARIO</small><h2>Velocidade dos Peixes</h2><p>Preferencia visual so deste aparelho. Nao afeta pesca, sorte, saldo ou rendimento.</p><strong>{label}</strong><input aria-label="Velocidade dos peixes" type="range" min="-3" max="3" step="0.1" value={level} onChange={event=>apply(Number(event.target.value))}/><div><button onClick={()=>apply(-3)}>1000x LENTO (5h+)</button><button onClick={()=>apply(0)}>NORMAL</button><button onClick={()=>apply(3)}>1000x RAPIDO (<1s)</button></div><small>Base: 18-26 segundos por volta completa. A alteracao e salva neste dispositivo.</small><button className="pool-return" onClick={back}>← VOLTAR</button></section>}`;

const oldFunc = content.substring(idx, endIdx);
content = content.substring(0, idx) + fixedFishSpeedControl + content.substring(endIdx);

fs.writeFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', content, 'utf8');
console.log('Fixed FishSpeedControl');