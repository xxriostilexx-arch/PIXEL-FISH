const fs = require('fs');

let content = fs.readFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', 'utf8');

// Add CalculatorQuote type before WorkshopCalculator
const bad = `\n\nfunction WorkshopCalculator({back}:{back:()=>void})`;
const good = `\n\ntype CalculatorQuote={dailyCash:number;cashPerUsd:number;tonUsd:number;tonToFishRate:number;fishPerCash:number;source:string;quotedAt:string};\n\nfunction WorkshopCalculator({back}:{back:()=>void})`;

if (content.includes(bad)) {
    content = content.replace(bad, good);
    fs.writeFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', content, 'utf8');
    console.log('✅ Added CalculatorQuote type');
} else {
    console.log('❌ Pattern not found');
}