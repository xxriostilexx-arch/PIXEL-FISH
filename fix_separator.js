const fs = require('fs');

let content = fs.readFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', 'utf8');

// Fix: add newline between FishSpeedControl end and WorkshopCalculator start
const bad = `</section>}function WorkshopCalculator({back}:{back:()=>void})`;
const good = `</section>}\n\nfunction WorkshopCalculator({back}:{back:()=>void})`;

if (content.includes(bad)) {
    content = content.replace(bad, good);
    fs.writeFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', content, 'utf8');
    console.log('✅ Fixed missing separator between functions');
} else {
    console.log('❌ Pattern not found');
}