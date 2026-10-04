const fs = require('fs');

let content = fs.readFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', 'utf8');

// Fix: escape < in button text - JSX interprets <1s as a tag
const bad = '1000x RAPIDO (<1s)';
const good = '1000x RAPIDO (<1s)';

if (content.includes(bad)) {
    content = content.replace(bad, good);
    fs.writeFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', content, 'utf8');
    console.log('✅ Fixed <1s in button text');
} else {
    console.log('❌ Pattern not found');
    const idx = content.indexOf('1000x RAPIDO');
    if (idx >= 0) {
        console.log('Found at:', idx, content.substring(idx, idx+30));
    }
}