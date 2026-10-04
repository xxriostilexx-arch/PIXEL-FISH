const fs = require('fs');

let content = fs.readFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\styles.css', 'utf8');

const insertAfter = '.extreme-scenario small{font-size:6px;color:#9fd4cf}';

const newStyles = `

/* Calculator Tabs & Layout */
.calc-tabs{display:flex;gap:8;margin-bottom:16;flex-wrap:wrap;padding-bottom:8;border-bottom:1px solid #326d76}.calc-tab{min-height:36px;padding:8px 16px;border:2px solid #326d76;border-radius:6px;background:#072533;color:#c8f2e8;font-size:8px;cursor:pointer;white-space:nowrap}.calc-tab.active{border-color:#4baf7e;background:#0a3b3b;color:#baf5ce}.calc-tab-content{width:100%;min-width:560px}.calc-section{display:grid;gap:8;padding:12px;border:2px solid #326d76;border-radius:8px;background:#092c38;color:#c8f2e8}.calc-section h3{margin:0 0 8px;color:#f6d78f;font-size:11px;border-bottom:1px solid #326d76;padding-bottom:6px}.info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px 12px}.info-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:6px 8px;background:#072533;border-radius:6px}.info-label{font-size:7px;color:#a8e5dc;white-space:nowrap}.info-value{font-size:9px;text-align:right;font-weight:800;white-space:nowrap}.sim-mode-tabs{display:flex;gap:8;margin-bottom:16;flex-wrap:wrap}.sim-tab{min-height:36px;padding:8px 16px;border:2px solid #326d76;border-radius:6px;background:#072533;color:#c8f2e8;font-size:8px;cursor:pointer;white-space:nowrap}.sim-tab.active{border-color:#4baf7e;background:#0a3b3b;color:#baf5ce}.sim-input-group{display:grid;gap:6px}.sim-label{font-size:7px;color:#a8e5dc;white-space:nowrap}.sim-input-row{display:flex;gap:8;align-items:center;flex-wrap:wrap}.sim-input-row input[type=number]{min-height:40px;padding:8px;border:2px solid #9a713f;border-radius:6px;background:#092b38;color:#effbf4;font:inherit;font-size:11px;text-align:center;min-width:120px}.sim-input-row input[type=range]{flex:1;min-width:120px;accent-color:#63ddd3}.sim-plan-summary{display:grid;gap:4px;padding:10px;border:2px solid #c79d4b;border-radius:8px;background:#342719;color:#f9e4ae;text-align:center}.sim-plan-summary b{font-size:13px}.sim-plan-summary span{color:#baf1e2;font-size:8px}.sim-plan-summary small{color:#ffcb8a;font-size:7px}.sim-periods{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12;margin-top:16}.sim-period-card{display:grid;gap:4px;padding:10px;border:2px solid #326d76;border-radius:8px;background:#092c38;color:#c8f2e8;text-align:center;min-width:220px}.period-header{display:flex;justify-content:space-between;margin-bottom:8;font-size:7px}.period-label{color:#f6d78f;white-space:nowrap}.period-cash{font-size:9px;font-weight:800;white-space:nowrap}.period-values{display:flex;flex-direction:column;gap:4;font-size:7px;color:#9af2bd}.period-values span{white-space:nowrap}.sim-roi-card{display:grid;gap:4;padding:12px;border:2px solid #4baf7e;border-radius:8px;background:#0a3b3b;color:#baf5ce;text-align:center}.roi-label{font-size:7px;color:#aee8dc;white-space:nowrap}.roi-value{font-size:14px;font-weight:800;white-space:nowrap}.roi-desc{font-size:7px;color:#9fd4cf;white-space:nowrap}.

@media(max-width:540px){.info-grid{grid-template-columns:1fr}.sim-periods{grid-template-columns:1fr}.calc-tab{font-size:7px;padding:6px 10px}.sim-tab{font-size:7px;padding:6px 10px}}`;

const insertIdx = content.indexOf('.extreme-scenario small{font-size:6px;color:#9fd4cf}');
if (insertIdx >= 0) {
    const endIdx = insertIdx + '.extreme-scenario small{font-size:6px;color:#9fd4cf}'.length;
    content = content.substring(0, endIdx) + newStyles + content.substring(endIdx);
    fs.writeFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\styles.css', content, 'utf8');
    console.log('✅ Tab CSS added');
} else {
    console.log('❌ Insert point not found');
}