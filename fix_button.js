const fs = require('fs');

let content = fs.readFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', 'utf8');

// Fix: button missing > and has false instead
const bad = 'onClick={()=>apply(3)}false</div>';
const good = 'onClick={()=>apply(3)}>1000x RAPIDO ({\'<\'}1s)</button></div>';

if (content.includes(bad)) {
    content = content.replace(bad, good);
    fs.writeFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', content, 'utf8');
    console.log('✅ Fixed button closing');
} else {
    console.log('❌ Pattern not found');
    const idx = content.indexOf('apply(3)}false');
    if (idx >= 0) {
        console.log('Found at:', idx, content.substring(idx, idx+50));
    }
}