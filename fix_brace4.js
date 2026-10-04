const fs = require('fs');

let content = fs.readFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', 'utf8');

// Fix: add closing brace before PoolTools
const bad = `</button></section>function PoolTools(`;
const good = `</button></section>}\n\nfunction PoolTools(`;

if (content.includes(bad)) {
    content = content.replace(bad, good);
    fs.writeFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', content, 'utf8');
    console.log('✅ Fixed missing brace');
} else {
    console.log('❌ Pattern not found');
}