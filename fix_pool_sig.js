const fs = require('fs');

let content = fs.readFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', 'utf8');

// The broken Pool function signature
const broken = `function Pool({const[showCollection,setShowCollection]=useState(false),[inspectedFish,setInspectedFish]=useState<OwnedFish|null>(null),[showRarities,setShowRarities]=useState(false),[fishSpeed,setFishSpeed]=useState(()=>Number(localStorage.getItem('pixel-fish-swim-speed')??0)),daily=pets.reduce((sum,pet)=>sum+(pet.temporaryUntil?0:pet.dailyCash),0),testDaily=pets.reduce((sum,pet)=>sum+(pet.temporaryUntil?pet.dailyCash:0),0),monthly=daily*30,yearly=daily*365,testMonthly=testDaily*30,testYearly=testDaily*365;useEffect(()=>{const sync=()=>setFishSpeed(Number(localStorage.getItem('pixel-fish-swim-speed')??0));window.addEventListener('pixel-fish:swim-speed',sync);return()=>window.removeEventListener('pixel-fish:swim-speed',sync)},[]);return`;

const fixed = `function Pool({pets,pendingCash,haul}:{pets:OwnedFish[];pendingCash:number;haul:()=>void;fishArea?:()=>void}){const[showCollection,setShowCollection]=useState(false),[inspectedFish,setInspectedFish]=useState<OwnedFish|null>(null),[showRarities,setShowRarities]=useState(false),[fishSpeed,setFishSpeed]=useState(()=>Number(localStorage.getItem('pixel-fish-swim-speed')??0)),daily=pets.reduce((sum,pet)=>sum+(pet.temporaryUntil?0:pet.dailyCash),0),testDaily=pets.reduce((sum,pet)=>sum+(pet.temporaryUntil?pet.dailyCash:0),0),monthly=daily*30,yearly=daily*365,testMonthly=testDaily*30,testYearly=testDaily*365;useEffect(()=>{const sync=()=>setFishSpeed(Number(localStorage.getItem('pixel-fish-swim-speed')??0));window.addEventListener('pixel-fish:swim-speed',sync);return()=>window.removeEventListener('pixel-fish:swim-speed',sync)},[]);return`;

if (content.includes(broken)) {
    content = content.replace(broken, fixed);
    fs.writeFileSync('C:\\Users\\CATADM\\Desktop\\PIXEL FISH\\apps\\web\\src\\main.tsx', content, 'utf8');
    console.log('SUCCESS: Pool signature fixed');
} else {
    console.log('Broken signature not found');
    // Search for it
    const idx = content.indexOf('function Pool({const');
    if (idx >= 0) {
        console.log('Found at:', idx);
        console.log(content.substring(idx, idx + 200));
    }
}