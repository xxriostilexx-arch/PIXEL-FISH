const fs = require('fs');

let content = fs.readFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', 'utf8');

// Find the SIM tab start
const startMarker = '{tab===\'sim\'&&<div className="calc-tab-content" style={{minWidth:560}}><div className="calc-section"><h3>📈 SIMULAÇÃO DE INVESTIMENTO</h3>';
const startIdx = content.indexOf(startMarker);
console.log('Start:', startIdx);

if (startIdx >= 0) {
    // Find the end - look for the next tab or pool-return
    let searchPos = content.indexOf('{tab===', startIdx + 100);
    if (searchPos < 0) {
        searchPos = content.indexOf('<button className="pool-return"', startIdx + 100);
    }
    console.log('End search pos:', searchPos);
    if (searchPos >= 0) {
        console.log('Context at end:', content.substring(searchPos - 50, searchPos + 100));
    }
    
    // Also show context around start
    console.log('Context at start:', content.substring(startIdx, startIdx + 200));
}