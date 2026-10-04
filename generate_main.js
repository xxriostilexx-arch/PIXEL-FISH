const fs = require('fs');

const fullContent = `import './polyfills';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion } from 'framer-motion';
import { TonConnectUIProvider, useTonConnectUI, useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { CHAIN } from '@tonconnect/protocol';
import { beginCell } from '@ton/core';
import './styles.css';

type R='Comum'|'Raro'|'Épico'|'Lendário';
type M={id:string;name:string;icon:string;cost:number;odds:[R,number][];fish:[string,R,string,number][]};
type OwnedFish={id:string;name:string;rarity:R;dailyCash:number;temporaryUntil?:string;asset?:string};

const maps:M[]=[
  {id:'river',name:'Rio',icon:'🌲',cost:1300,odds:[['Comum',84],['Raro',15],['Épico',1]],fish:[['Siluro','Comum','42%',13],['Truta dourada','Comum','42%',13],['Barbo rubro','Raro','15%',16.25],['Piranha azul','Épico','1%',20]]},
  {id:'lake',name:'Lago',icon:'🏞️',cost:6500,odds:[['Comum',60],['Raro',36.9],['Épico',3],['Lendário',0.1]],fish:[['Lampreia','Comum','30%',65],['Bream prata','Comum','30%',65],['Perca listrada','Raro','36,9%',81.25],['Pacu lunar','Épico','3%',100],['Carpa dourada ancestral','Lendário','0,1%',195]]},
  {id:'coast',name:'Costa',icon:'🏝️',cost:13000,odds:[['Comum',30],['Raro',59.5],['Épico',10],['Lendário',0.5]],fish:[['Linguado','Comum','30%',130],['Peixe-caixa','Raro','29,75%',162.5],['Escorpião','Raro','29,75%',162.5],['Dourada','Épico','10%',200],['Cavalo-marinho real','Lendário','0,5%',300]]},
  {id:'ocean',name:'Oceano',icon:'🌊',cost:26000,odds:[['Raro',77],['Épico',22],['Lendário',1]],fish:[['Atum','Raro','38,5%',325],['Peixe-vela','Raro','38,5%',325],['Marlim violeta','Épico','22%',400],['Rainha abissal','Lendário','1%',600]]}];

const fmt=(n:number)=>n.toLocaleString('pt-BR',{maximumFractionDigits:2});

const fishAsset=(fish:{rarity:R;id?:string;name?:string})=>{const seed=[...(fish.id??fish.name??'fish')].reduce((sum,char)=>sum+char.charCodeAt(0),0);const pick=(items:string[])=>items[seed%items.length];if(fish.rarity==='Comum')return pick(['/assets/fish-common-01.png','/assets/fish-common-02.png','/assets/fish-common-03.png']);if(fish.rarity==='Raro')return pick(['/assets/fish-rare-01.png','/assets/fish-rare-02.png']);if(fish.rarity==='Épico')return pick(['/assets/fish-epic-01.png','/assets/fish-epic-02.png']);return pick(['/assets/fish-legendary-01.png','/assets/fish-legendary-02.png'])};

const poolSlot=(index:number,total:number,speedExponent=0)=>{const columns=total<2?1:total<6?2:total<10?3:total<17?4:5,rows=Math.ceil(total/columns),column=index%columns,row=Math.floor(index/columns),footprint=total>16?16:total>9?20:total>5?27:30,startX=columns===1?39:4+(column/(columns-1))*(96-footprint),startY=9+((row+.5)/rows)*76,point=(step:number)=>{const x=((index*37+step*29+(index%columns)*13)%101)/100,y=((index*53+step*41+row*17)%97)/96;return {x:Math.round(3+x*(94-footprint)),y:Math.round(7+y*76)}};const p1=point(1),p2=point(2),p3=point(3),p4=point(4),p5=point(5),duration=(18000+(index*1900)%8000)/10**speedExponent,delay=-((index*17)%46);return {left:\`\${startX}%\`,top:\`\${startY}%\`,--p0x:\`\${startX}%\`,--p0y:\`\${startY}%\`,--p1x:\`\${p1.x}%\`,--p1y:\`\${p1.y}%\`,--p2x:\`\${p2.x}%\`,--p2y:\`\${p2.y}%\`,--p3x:\`\${p3.x}%\`,--p3y:\`\${p3.y}%\`,--p4x:\`\${p4.x}%\`,--p4y:\`\${p4.y}%\`,--p5x:\`\${p5.x}%\`,--p5y:\`\${p5.y}%\`,--swim-duration:\`\${duration}s\`,--swim-delay:\`\${delay}s\`} as React.CSSProperties};

const IS_LOCAL=window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1';
const API=IS_LOCAL?'http://localhost:8787':'https://api.pixelfish.app';

type TelegramWebApp={initData?:string;ready?:()=>void;expand?:()=>void;requestFullscreen?:()=>void;isVersionAtLeast?:(version:string)=>boolean};

const rawFetch=window.fetch.bind(window);let sessionToken='';

const apiFetch:typeof window.fetch=async(input,init={})=>{const requestUrl=typeof input==='string'?input:input instanceof URL?input.toString():input.url;if(requestUrl.startsWith(API)&&sessionToken&&!requestUrl.endsWith('/auth/telegram')){const headers=new Headers(init.headers);headers.set('Authorization',\`Bearer \${sessionToken}\`);return rawFetch(input,{...init,headers})}return rawFetch(input,init)};

const fetch=apiFetch;

function webGuestInitData(){const existing=localStorage.getItem('pixel-fish-web-guest');if(existing)return \`web:\${existing}\`;const id=crypto.randomUUID().replace(/-/g,'');localStorage.setItem('pixel-fish-web-guest',id);return \`web:\${id}\`}

const telegramWebApp=()=> (window as typeof window&{Telegram?:{WebApp?:TelegramWebApp}}).Telegram?.WebApp;

function prepareTelegramViewport(fullscreen=false){const telegram=telegramWebApp();telegram?.ready?.();telegram?.expand?.();if(!fullscreen||!telegram?.requestFullscreen)return;try{telegram.requestFullscreen()}catch{/* Clientes Telegram antigos continuam no modo expandido. */}}

async function authenticatePlayer(){const telegram=telegramWebApp();prepareTelegramViewport();const initData=telegram?.initData||(IS_LOCAL?'dev:local-player':webGuestInitData());const response=await rawFetch(\`\${API}/auth/telegram\`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData})});const data=await response.json();if(!response.ok)throw new Error(data.error??'Não foi possível entrar no jogo');sessionToken=data.token as string;}

function Frame({eyebrow,title,children}:{eyebrow:string,title:string,children:React.ReactNode}){return <motion.main className="frame" onClick={event=>event.stopPropagation()} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-14}}><button className="close" aria-label="Voltar ao Pool" onClick={()=>window.dispatchEvent(new Event('pixel-fish:go-pool'))}>✖</button><small className="eyebrow">{eyebrow}</small><h1>{title}</h1>{children}</motion.main>}

function Intro({onEnter}:{onEnter:()=>void}){return <main className="intro" onClick={onEnter}><img className="intro-fish fish-render comum i1" src={fishAsset({rarity:'Comum',id:'intro-common'})} alt=""/><img className="intro-fish fish-render raro i2" src={fishAsset({rarity:'Raro',id:'intro-rare'})} alt=""/><img className="intro-fish fish-render épico i3" src={fishAsset({rarity:'Épico',id:'intro-epic'})} alt=""/><div className="intro-logo">🎣<b>PIXEL <span>FISH</span></b><small>TOQUE PARA COMEÇAR A PESCAR</small></div></main>}

function Home({open,cash}:{open:()=>void,cash:number}){return <motion.main className="home" initial={{opacity:0}} animate={{opacity:1}}><div className="garland">⚓ ━ ● ━ ◇ ━ ● ━ ◇ ━ ● ━ ⚓</div><button className="home-scene" onClick={open} aria-label="Abrir Pool"><div className="home-fish hf1"/><div className="home-fish hf2"/><div className="home-fish hf3"/><div className="home-fish hf4"/><strong>TOQUE PARA ABRIR O POOL</strong></button><section className="home-collect"><b>💵 {fmt(cash)} CASH</b><button className="blue" onClick={e=>{e.stopPropagation();open()}}>RECOLHER</button></section></motion.main>}

function Pool({pets,pendingCash,haul}:{pets:OwnedFish[];pendingCash:number;haul:()=>void;fishArea?:()=>void}){const[showCollection,setShowCollection]=useState(false),[inspectedFish,setInspectedFish]=useState<OwnedFish|null>(null),[showRarities,setShowRarities]=useState(false),[fishSpeed,setFishSpeed]=useState(()=>Number(localStorage.getItem('pixel-fish-swim-speed')??0)),daily=pets.reduce((sum,pet)=>sum+(pet.temporaryUntil?0:pet.dailyCash),0),testDaily=pets.reduce((sum,pet)=>sum+(pet.temporaryUntil?pet.dailyCash:0),0),monthly=daily*30,yearly=daily*365,testMonthly=testDaily*30,testYearly=testDaily*365;useEffect(()=>{const sync=()=>setFishSpeed(Number(localStorage.getItem('pixel-fish-swim-speed')??0));window.addEventListener('pixel-fish:swim-speed',sync);return()=>window.removeEventListener('pixel-fish:swim-speed',sync)},[]);return <motion.main className="pool-home" initial={{opacity:0}} animate={{opacity:1}}><section className={\`pool-gallery \${showRarities?'show-rarities':''} \${pets.length>9?'crowded':pets.length>5?'dense':''}\`}><button className={\`rarity-toggle \${showRarities?'active':''}\`} type="button" aria-pressed={showRarities} onClick={()=>setShowRarities(value=>!value)}><i aria-hidden="true"/><span>VER RARIDADE</span></button><div className="pool-depth depth-one"/><div className="pool-depth depth-two"/>{pets.length?pets.map((pet,index)=><article className={\`owned-fish fish-\${index%4}\`} key={pet.id} onClick={()=>setInspectedFish(pet)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')setInspectedFish(pet)}} role="button" tabIndex={0} aria-label={\`Inspecionar \${pet.name}\`} style={poolSlot(index,pets.length,fishSpeed)}><label>{pet.name}<span className={pet.rarity.toLowerCase()}>{pet.rarity}\${pet.temporaryUntil?' · TESTE':''}</span></label><img className={\`fish-render \${pet.rarity.toLowerCase()}\`} src={fishAsset(pet)} alt={pet.name}/></article>):<div className="pool-empty">🐚<b>Seu Pool está vazio</b><small>Capture peixes na Área de Pesca. Aqui aparecem som... (truncated - full file needed)