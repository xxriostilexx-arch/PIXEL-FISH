const fs = require('fs');

let content = fs.readFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\styles.css', 'utf8');

const insertAfter = '.extreme-scenario small{font-size:6px;color:#9fd4cf}';

const newStyles = `

/* New Calculator Layout */
.calculator-section{display:grid;gap:8px;padding:12px;border:2px solid #326d76;border-radius:8px;background:#092c38;color:#c8f2e8}.calculator-section h3{margin:0 0 8px;color:#f6d78f;font-size:11px;border-bottom:1px solid #326d76;padding-bottom:6px}.info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 12px}.info-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:6px 8px;background:#072533;border-radius:6px}.info-label{font-size:7px;color:#a8e5dc}.info-value{font-size:9px;text-align:right;font-weight:800}.sim-mode-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sim-tab{min-height:40px;padding:8px;border:2px solid #326d76;border-radius:6px;background:#072533;color:#c8f2e8;font-size:8px}.sim-tab.active{border-color:#4baf7e;background:#0a3b3b;color:#baf5ce}.sim-input-group{display:grid;gap:6px}.sim-label{font-size:7px;color:#a8e5dc}.sim-input-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}.sim-input-row input[type=number]{min-height:40px;padding:8px;border:2px solid #9a713f;border-radius:6px;background:#092b38;color:#effbf4;font:inherit;font-size:11px;text-align:center}.sim-input-row input[type=range]{width:100%;accent-color:#63ddd3}.sim-plan-summary{display:grid;gap:4px;padding:10px;border:2px solid #c79d4b;border-radius:8px;background:#342719;color:#f9e4ae;text-align:center}.sim-plan-summary b{font-size:13px}.sim-plan-summary span{color:#baf1e2;font-size:8px}.sim-plan-summary small{color:#ffcb8a;font-size:7px}.sim-periods{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.sim-period-card{display:grid;gap:4px;padding:10px;border:2px solid #326d76;border-radius:8px;background:#092c38;color:#c8f2e8;text-align:center}.period-header{display:grid;grid-template-columns:1fr auto;gap:8px;font-size:7px}.period-label{color:#f6d78f}.period-cash{font-size:9px;font-weight:800}.period-values{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;font-size:7px;color:#9af2bd}.sim-roi-card{display:grid;gap:4px;padding:12px;border:2px solid #4baf7e;border-radius:8px;background:#0a3b3b;color:#baf5ce;text-align:center}.roi-label{font-size:7px;color:#aee8dc}.roi-value{font-size:13px;font-weight:800}.roi-desc{font-size:7px;color:#9fd4cf}.

@media(max-width:540px){.info-grid{grid-template-columns:1fr}.sim-periods{grid-template-columns:1fr}.period-values{grid-template-columns:1fr}}`;

const insertIdx = content.indexOf(insertAfter);
if (insertIdx >= 0) {
    const endIdx = insertIdx + insertAfter.length;
    content = content.substring(0, endIdx) + newStyles + content.substring(endIdx);
    fs.writeFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\styles.css', content, 'utf8');
    console.log('✅ CSS added');
} else {
    console.log('❌ Insert point not found');
}