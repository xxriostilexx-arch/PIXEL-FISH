import 'dotenv/config';
import crypto from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { Pool as PostgreSqlPool, type PoolClient } from 'pg';
import { z } from 'zod';
import { BONUS_CODES,FORGE_RULES } from './game-config.js';

type Rarity='Comum'|'Raro'|'Épico'|'Lendário';
type MapId='river'|'lake'|'coast'|'ocean';
type Fish={id:string;name:string;rarity:Rarity;dailyCash:number;temporaryUntil?:string};
type FishingSession={id:string;map:MapId;expiresAt:string;source?:'paid'|'bonus'|'temporary'};
type DiveSession={id:string;expiresAt:string;temporary?:boolean;nextCylinderAt?:string};
type Player={id:string;name:string;photoUrl?:string;accountType?:'telegram'|'web_guest'|'local_dev';fish:number;cash:number;pendingCash:number;reservedCash:number;casts:number;inventory:Fish[];missions:string[];referrerId?:string;referralCash:number;referralCounts:number[];referralEarnings:number[];monthlyFarm:number;farmMonth:string;lastAccruedAt:string;bait?:number;baitByMap?:Partial<Record<MapId,number>>;bonusBait?:Partial<Record<MapId,number>>;bonusClaims?:string[];cylinders?:number;temporaryFish?:number;temporaryCash?:number;temporaryBait?:number;temporaryBaitByMap?:Partial<Record<MapId,number>>;temporaryCylinders?:number;temporaryUntil?:string;fishingSession?:FishingSession;diveSession?:DiveSession};
type TonDeposit={id:string;playerId:string;amountNanoTon:string;comment:string;status:'pending'|'submitted'|'completed'|'expired';createdAt:string;submittedAt?:string;walletProofHash?:string;relayStatus?:'accepted'|'failed'|'disabled';relayMessageHash?:string;relayError?:string;txHash?:string;network:'mainnet'|'testnet';fishAmount?:number};
type Withdrawal={id:string;playerId:string;cash:number;feeCash:number;netCash:number;destination:string;asset:'TON';tonAmount:number;usdAmount:number;tonUsd:number;quotedAt:string;status:'pending_manual'|'confirmed_manual'|'rejected';createdAt:string;reviewedAt?:string;txHash?:string};
type MarketListing={id:string;sellerId:string;fish:Fish;price:number;status:'open'|'sold'|'cancelled';createdAt:string;soldAt?:string;buyerId?:string};
type SeasonAward={season:string;winnerId:string;winnerName:string;rewardFish:number;monthlyFarm:number;awardedAt:string};
type Store={players:Record<string,Player>;withdrawals:Withdrawal[];tonDeposits:TonDeposit[];marketListings?:MarketListing[];seasonAwards?:SeasonAward[]};
const DATA_PATH=path.resolve(process.cwd(),'data','pixel-fish.json');
const DATABASE_URL=process.env.DATABASE_URL?.trim();
const now=()=>new Date().toISOString();
const monthKey=()=>new Date().toISOString().slice(0,7);
const brazilDayKey=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(date);
const starter=(id:string,name:string,fish=0,cash=0,casts=0,accountType:Player['accountType']='telegram'):Player=>({id,name,accountType,fish,cash,pendingCash:0,reservedCash:0,casts,inventory:[],missions:[],referralCash:0,referralCounts:[0,0,0],referralEarnings:[0,0,0],monthlyFarm:0,farmMonth:monthKey(),lastAccruedAt:now(),bait:0,bonusBait:{},bonusClaims:[],cylinders:0});
const seeded=():Store=>({players:{'demo-player':starter('demo-player','Você'),douglas:starter('douglas','Douglas PIXELPOND',0,0,230),marina:starter('marina','Marina Maré',0,0,203),capitao:starter('capitao','Capitão Nino',0,0,181),rafael:starter('rafael','Rafael Coral',0,0,159),cora:starter('cora','Cora',0,0,141)},withdrawals:[],tonDeposits:[],marketListings:[],seasonAwards:[]});
function normalize(data:Store):Store{if(!data.tonDeposits)data.tonDeposits=[];if(!data.withdrawals)data.withdrawals=[];if(!data.marketListings)data.marketListings=[];if(!data.seasonAwards)data.seasonAwards=[];data.withdrawals.forEach(row=>{row.asset??='TON';row.feeCash??=0;row.netCash??=row.cash;row.tonAmount??=0;row.usdAmount??=0;row.tonUsd??=0;row.quotedAt??=row.createdAt});Object.values(data.players).forEach(player=>{player.reservedCash??=0;player.bait??=0;player.baitByMap??={};if(player.bait){player.baitByMap.river=(player.baitByMap.river??0)+player.bait;player.bait=0}player.bonusBait??={};player.bonusClaims??=[];player.cylinders??=0;player.temporaryFish??=0;player.temporaryCash??=0;player.temporaryBaitByMap??={};if(player.temporaryBait){player.temporaryBaitByMap.river=(player.temporaryBaitByMap.river??0)+player.temporaryBait;player.temporaryBait=0}player.temporaryBait??=0;player.temporaryCylinders??=0;player.monthlyFarm??=0;player.farmMonth??=monthKey();player.referralCounts??=[0,0,0] as number[];player.referralEarnings??=[0,0,0] as number[]});return data}
function saveFile(data:Store){fs.mkdirSync(path.dirname(DATA_PATH),{recursive:true});fs.writeFileSync(DATA_PATH,JSON.stringify(data,null,2),'utf8');}
function loadFile():Store{try{return normalize(JSON.parse(fs.readFileSync(DATA_PATH,'utf8'))as Store)}catch{const data=seeded();saveFile(data);return data}}
let postgres:PostgreSqlPool|undefined;
let persistenceQueue:Promise<void>=Promise.resolve();
let persistTimer:NodeJS.Timeout|undefined;
let dirty=false;
let db:Store;
async function writePostgresState(state:Store,client:PostgreSqlPool|PoolClient=postgres!){if(!client)return;await client.query(`INSERT INTO pixel_fish_state (id, state, updated_at) VALUES (1, $1::jsonb, now()) ON CONFLICT (id) DO UPDATE SET state=EXCLUDED.state, updated_at=EXCLUDED.updated_at`,[JSON.stringify(state)]);}
type TonReceipt={txHash:string;depositId:string;playerId:string;amountNanoTon:string;fishAmount:number};
type FinancialEvent={playerId:string;kind:string;referenceId:string;cashDelta?:number;fishDelta?:number;tonAmount?:number;usdAmount?:number;tonUsd?:number;metadata?:Record<string,unknown>;receipt?:TonReceipt};
async function persistFinancialEvents(events:FinancialEvent[]){
  saveFile(db);
  if(!postgres)throw new Error('Banco de dados indisponível. Nenhum saldo foi reservado.');
  dirty=false;if(persistTimer){clearTimeout(persistTimer);persistTimer=undefined}
  const snapshot=structuredClone(db);
  persistenceQueue=persistenceQueue.catch(error=>console.error('[DB] Falha anterior de persistência:',error)).then(async()=>{
    const client=await postgres!.connect();
    try{
      await client.query('BEGIN');
      await writePostgresState(snapshot,client);
      for(const event of events){
        await client.query(`INSERT INTO financial_ledger (reference_id, player_id, kind, asset, cash_delta, fish_delta, ton_amount, usd_amount, ton_usd, metadata)
          VALUES ($1,$2,$3,'TON',$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT (reference_id) DO NOTHING`,[
          event.referenceId,event.playerId,event.kind,event.cashDelta??0,event.fishDelta??0,event.tonAmount??0,event.usdAmount??0,event.tonUsd??0,JSON.stringify(event.metadata??{})
        ]);
        if(event.receipt)await client.query(`INSERT INTO ton_chain_receipts (tx_hash, deposit_id, player_id, amount_nano_ton, fish_amount)
          VALUES ($1,$2,$3,$4,$5) ON CONFLICT (tx_hash) DO NOTHING`,[event.receipt.txHash,event.receipt.depositId,event.receipt.playerId,event.receipt.amountNanoTon,event.receipt.fishAmount]);
      }
      await client.query('COMMIT');
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}finally{client.release()}
  });
  await persistenceQueue;
}
async function persistFinancialEvent(event:FinancialEvent){return persistFinancialEvents([event])}
async function initializeStore(){const disk=loadFile();if(!DATABASE_URL){db=disk;console.warn('[DB] DATABASE_URL ausente; usando backup JSON local.');return}postgres=new PostgreSqlPool({connectionString:DATABASE_URL,max:4});await postgres.query(`CREATE TABLE IF NOT EXISTS pixel_fish_state (id SMALLINT PRIMARY KEY CHECK (id=1), state JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);await postgres.query(`CREATE TABLE IF NOT EXISTS financial_ledger (id BIGSERIAL PRIMARY KEY, reference_id TEXT NOT NULL UNIQUE, player_id TEXT NOT NULL, kind TEXT NOT NULL, asset TEXT NOT NULL, cash_delta NUMERIC NOT NULL DEFAULT 0, fish_delta NUMERIC NOT NULL DEFAULT 0, ton_amount NUMERIC NOT NULL DEFAULT 0, usd_amount NUMERIC NOT NULL DEFAULT 0, ton_usd NUMERIC NOT NULL DEFAULT 0, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);await postgres.query(`ALTER TABLE financial_ledger ADD COLUMN IF NOT EXISTS fish_delta NUMERIC NOT NULL DEFAULT 0`);await postgres.query(`CREATE TABLE IF NOT EXISTS ton_chain_receipts (tx_hash TEXT PRIMARY KEY, deposit_id TEXT NOT NULL, player_id TEXT NOT NULL, amount_nano_ton NUMERIC NOT NULL, fish_amount NUMERIC NOT NULL, credited_at TIMESTAMPTZ NOT NULL DEFAULT now())`);const result=await postgres.query<{state:Store;updated_at:Date}>('SELECT state, updated_at FROM pixel_fish_state WHERE id=1');const diskChangedAt=fs.existsSync(DATA_PATH)?fs.statSync(DATA_PATH).mtimeMs:0;if(!result.rowCount||diskChangedAt>Date.parse(result.rows[0].updated_at.toISOString())){db=disk;await writePostgresState(db);console.info('[DB] Dados existentes migrados para PostgreSQL.')}else{db=normalize(result.rows[0].state);saveFile(db);console.info('[DB] Estado carregado do PostgreSQL.')}}
function flushPersist(){if(!dirty)return;dirty=false;persistTimer=undefined;saveFile(db);if(!postgres)return;const snapshot=structuredClone(db);persistenceQueue=persistenceQueue.catch(error=>console.error('[DB] Falha anterior de persistência:',error)).then(()=>writePostgresState(snapshot)).catch(error=>console.error('[DB] Falha ao persistir no PostgreSQL:',error));}
function persist(){dirty=true;if(!persistTimer)persistTimer=setTimeout(flushPersist,Math.max(250,Number(process.env.STATE_PERSIST_DEBOUNCE_MS??3000)));}
async function shutdown(){flushPersist();await persistenceQueue.catch(()=>{});await postgres?.end().catch(()=>{});process.exit(0)}
process.once('SIGINT',()=>{void shutdown()});process.once('SIGTERM',()=>{void shutdown()});
await initializeStore();
const playerContext=new AsyncLocalStorage<{playerId:string}>();
function expireTemporaryBalance(player:Player){
  if(!player.temporaryUntil||Date.parse(player.temporaryUntil)>Date.now())return false;
  player.temporaryFish=0;player.temporaryCash=0;player.temporaryBait=0;player.temporaryBaitByMap={};player.temporaryCylinders=0;
  player.inventory=player.inventory.filter(fish=>!fish.temporaryUntil||Date.parse(fish.temporaryUntil)>Date.now());
  delete player.temporaryUntil;return true;
}
const temporaryIsActive=(player:Player)=>Boolean(player.temporaryUntil&&Date.parse(player.temporaryUntil)>Date.now());
const displayedFish=(player:Player)=>player.fish+(temporaryIsActive(player)?player.temporaryFish??0:0);
const displayedCash=(player:Player)=>player.cash+(temporaryIsActive(player)?player.temporaryCash??0:0);
const baitForMap=(player:Player,map:MapId)=>(player.baitByMap?.[map]??0)+(temporaryIsActive(player)?player.temporaryBaitByMap?.[map]??0:0);
const totalBait=(player:Player)=>(Object.values(player.baitByMap??{}).reduce((sum,count)=>sum+(count??0),0))+(temporaryIsActive(player)?Object.values(player.temporaryBaitByMap??{}).reduce((sum,count)=>sum+(count??0),0):0);
function spendFish(player:Player,amount:number){if(displayedFish(player)<amount)return null;const temporary=Math.min(temporaryIsActive(player)?player.temporaryFish??0:0,amount);player.temporaryFish=(player.temporaryFish??0)-temporary;player.fish-=amount-temporary;return {temporary,real:amount-temporary}}
function spendCash(player:Player,amount:number){if(displayedCash(player)<amount)return null;const temporary=Math.min(temporaryIsActive(player)?player.temporaryCash??0:0,amount);player.temporaryCash=(player.temporaryCash??0)-temporary;player.cash-=amount-temporary;return {temporary,real:amount-temporary}}
const active=()=>{const playerId=playerContext.getStore()?.playerId;const player=playerId?db.players[playerId]:undefined;if(!player)throw new Error('Sessão do jogador ausente ou expirada');if(expireTemporaryBalance(player))persist();return player};
const isWebGuest=(player:Player)=>player.accountType==='web_guest'||player.id.startsWith('web:');
function accrue(player:Player){const elapsed=Math.max(0,Date.now()-Date.parse(player.lastAccruedAt));const daily=player.inventory.reduce((sum,fish)=>sum+(!fish.temporaryUntil||Date.parse(fish.temporaryUntil)>Date.now()?fish.dailyCash:0),0);if(daily&&elapsed)player.pendingCash+=daily*elapsed/86_400_000;player.lastAccruedAt=now();}
const previousMonthKey=()=>{const date=new Date();date.setUTCDate(1);date.setUTCHours(0,0,0,0);date.setUTCMonth(date.getUTCMonth()-1);return date.toISOString().slice(0,7)};
const seasonEndsAt=()=>{const date=new Date();date.setUTCDate(1);date.setUTCHours(0,0,0,0);date.setUTCMonth(date.getUTCMonth()+1);return date.toISOString()};
function settleFinishedSeason(){const current=monthKey(),previous=previousMonthKey(),awards=db.seasonAwards??=[];let changed=false;if(!awards.some(award=>award.season===previous)){const candidates=Object.values(db.players).filter(player=>player.accountType==='telegram'&&player.inventory.length>0&&player.farmMonth===previous).sort((a,b)=>b.monthlyFarm-a.monthlyFarm||b.inventory.length-a.inventory.length);const winner=candidates[0];if(winner){const rewardFish=650_000;winner.fish+=rewardFish;awards.push({season:previous,winnerId:winner.id,winnerName:winner.name,rewardFish,monthlyFarm:winner.monthlyFarm,awardedAt:now()});changed=true}}for(const player of Object.values(db.players)){if(player.farmMonth!==current){player.farmMonth=current;player.monthlyFarm=0;changed=true}}if(changed)persist()}
function resetMonthlyFarm(player:Player){settleFinishedSeason();if(player.farmMonth!==monthKey()){player.farmMonth=monthKey();player.monthlyFarm=0}}
function publicPool(player:Player){const inventory=player.inventory.filter(fish=>!fish.temporaryUntil||Date.parse(fish.temporaryUntil)>Date.now());return{id:player.id,name:player.name,photoUrl:player.photoUrl??null,casts:player.casts,dailyCash:inventory.reduce((sum,fish)=>sum+fish.dailyCash,0),inventory};}
const app=express();app.use((req,res,next)=>{const started=Date.now();res.on('finish',()=>console.info(JSON.stringify({method:req.method,path:req.path,status:res.statusCode,ms:Date.now()-started})));next();});app.use(cors({origin:process.env.WEB_ORIGIN?.split(',')??true}));app.use(express.json({limit:'30kb'}));

type Session={playerId:string;expiresAt:number};
const sessions=new Map<string,Session>();
const sessionTtlMs=Math.max(1,Number(process.env.AUTH_SESSION_TTL_HOURS??24))*3_600_000;
const telegramUserSchema=z.object({id:z.number().int().positive(),first_name:z.string().min(1).max(96),last_name:z.string().max(96).optional(),username:z.string().max(64).optional(),photo_url:z.string().url().max(2048).optional()});
function verifyTelegramInitData(initData:string){
  const botToken=process.env.TELEGRAM_BOT_TOKEN;
  if(!botToken)return null;
  const values=new URLSearchParams(initData);const suppliedHash=values.get('hash');const authDate=Number(values.get('auth_date'));
  if(!suppliedHash||!Number.isFinite(authDate)||Math.abs(Date.now()/1000-authDate)>86_400)return null;
  values.delete('hash');
  const dataCheckString=[...values.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>`${key}=${value}`).join('\n');
  const secret=crypto.createHmac('sha256','WebAppData').update(botToken).digest();
  const expected=crypto.createHmac('sha256',secret).update(dataCheckString).digest('hex');
  if(suppliedHash.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(suppliedHash),Buffer.from(expected)))return null;
  const rawUser=values.get('user');if(!rawUser)return null;
  try{return telegramUserSchema.parse(JSON.parse(rawUser))}catch{return null}
}
function createSession(playerId:string){const token=crypto.randomBytes(32).toString('base64url');sessions.set(token,{playerId,expiresAt:Date.now()+sessionTtlMs});return token}
function authenticated(req:express.Request,res:express.Response,next:express.NextFunction){
  // Rotas administrativas nunca usam sessão de jogador: elas exigem a chave
  // ADMIN_REVIEW_KEY no próprio handler e, por isso, precisam passar daqui.
  const publicRoute=(req.method==='GET'&&['/health','/wallet/deposit-ton/config'].includes(req.path))||req.path==='/auth/telegram'||req.path.startsWith('/admin/withdrawals');
  if(publicRoute)return next();
  const token=req.header('authorization')?.match(/^Bearer (.+)$/i)?.[1];const session=token?sessions.get(token):undefined;
  if(!session||session.expiresAt<=Date.now()||!db.players[session.playerId]){if(token)sessions.delete(token);return res.status(401).json({error:'Sessão inválida ou expirada. Abra o jogo pelo Telegram novamente.'})}
  playerContext.run({playerId:session.playerId},next);
}
app.use(authenticated);
// Developer mission registry: add a new row here to publish it to the game.
const MISSION_DEFINITIONS=[
  {id:'daily-login',title:'Login diário',description:'Entre no Pixel Fish hoje.',reward:100,kind:'daily' as const},
  {id:'first-catch',title:'Primeira captura',description:'Capture um peixe em qualquer área.',reward:250,kind:'casts' as const,target:1},
  {id:'pool-three',title:'Aquário em crescimento',description:'Tenha 3 peixes em seu Pool.',reward:500,kind:'fish' as const,target:3},
  {id:'invite-one',title:'Convide um amigo',description:'Seu indicado precisa entrar pelo link do bot.',reward:500,kind:'referrals' as const,target:1},
] as const;
const costs:{[key:string]:number}={river:1300,lake:6500,coast:13000,ocean:26000};
const FISH_TABLE:{[key:string]:{name:string;rarity:Fish['rarity'];dailyCash:number;weight:number}[]}={
  river:[{name:'Siluro',rarity:'Comum',dailyCash:13,weight:42},{name:'Truta dourada',rarity:'Comum',dailyCash:13,weight:42},{name:'Barbo rubro',rarity:'Raro',dailyCash:16.25,weight:15},{name:'Piranha azul',rarity:'Épico',dailyCash:20,weight:1}],
  lake:[{name:'Lampreia',rarity:'Comum',dailyCash:65,weight:30},{name:'Bream prata',rarity:'Comum',dailyCash:65,weight:30},{name:'Perca listrada',rarity:'Raro',dailyCash:81.25,weight:36.9},{name:'Pacu lunar',rarity:'Épico',dailyCash:100,weight:3},{name:'Carpa dourada ancestral',rarity:'Lendário',dailyCash:195,weight:.1}],
  coast:[{name:'Linguado',rarity:'Comum',dailyCash:130,weight:30},{name:'Peixe-caixa',rarity:'Raro',dailyCash:162.5,weight:29.75},{name:'Escorpião',rarity:'Raro',dailyCash:162.5,weight:29.75},{name:'Dourada',rarity:'Épico',dailyCash:200,weight:10},{name:'Cavalo-marinho real',rarity:'Lendário',dailyCash:300,weight:.5}],
  ocean:[{name:'Atum azul',rarity:'Raro',dailyCash:325,weight:38.5},{name:'Peixe-vela',rarity:'Raro',dailyCash:325,weight:38.5},{name:'Marlim violeta',rarity:'Épico',dailyCash:400,weight:22},{name:'Rainha abissal',rarity:'Lendário',dailyCash:600,weight:1}],
};
function pickFish(map:keyof typeof FISH_TABLE){let roll=Math.random()*100;for(const entry of FISH_TABLE[map]){roll-=entry.weight;if(roll<=0)return entry}return FISH_TABLE[map][0]}

// ===================== TON PAYMENTS =====================
type TonNetwork='mainnet'|'testnet';
const TON_NETWORK:TonNetwork=(process.env.TON_NETWORK as TonNetwork)==='testnet'?'testnet':'mainnet';
const TON_WALLET_ADDRESS=TON_NETWORK==='testnet'?(process.env.TON_WALLET_ADDRESS_TESTNET??''):(process.env.TON_WALLET_ADDRESS_MAINNET??'');
const TONCENTER_API_KEY=TON_NETWORK==='testnet'?(process.env.TONCENTER_API_KEY_TESTNET??''):(process.env.TONCENTER_API_KEY_MAINNET??'');
const TONCENTER_BASE=TON_NETWORK==='testnet'?'https://testnet.toncenter.com/api/v3':'https://toncenter.com/api/v3';
// A carteira assina a transação. Na testnet, retransmitimos o BOC assinado ao nó
// para lidar com carteiras que retornam o BOC ao Mini App mas não o propagam.
// Mainnet exige habilitação explícita no ambiente de produção.
const TON_RELAY_SIGNED_BOC=TON_NETWORK==='testnet'||process.env.TON_RELAY_SIGNED_BOC==='true';
const TON_TO_FISH_RATE=Number(process.env.TON_TO_FISH_RATE??13000); // 1 TON = X FISH (padrão: 0.1 TON = 1300 FISH)
const TON_DEPOSIT_EXPIRY_MS=30*60*1000; // depósitos pendentes expiram em 30min
// Saques: CASH é uma moeda interna. 10.000 CASH equivalem a US$ 1 e o valor
// em TON é sempre calculado no servidor, a partir de uma cotação recente.
const CASH_PER_USD=Math.max(1,Number(process.env.CASH_PER_USD??10_000));
const MIN_WITHDRAWAL_USD=Math.max(.01,Number(process.env.MIN_WITHDRAWAL_USD??1.56));
const MIN_WITHDRAWAL_CASH=Math.max(1,Math.ceil(Number(process.env.MIN_WITHDRAWAL_CASH??15_600)));
const WITHDRAWAL_FEE_RATE=Math.min(.25,Math.max(0,Number(process.env.WITHDRAWAL_FEE_PERCENT??5)/100));
const DAILY_WITHDRAWAL_USD_LIMIT=Math.max(MIN_WITHDRAWAL_USD,Number(process.env.DAILY_WITHDRAWAL_USD_LIMIT??100));
const WITHDRAWAL_PRICE_CACHE_MS=Math.max(15,Number(process.env.WITHDRAWAL_PRICE_CACHE_SECONDS??60))*1000;
const MAX_WITHDRAWAL_CASH=Math.max(MIN_WITHDRAWAL_CASH,Number(process.env.MAX_WITHDRAWAL_CASH??10_000_000));
let tonPriceCache:{usd:number;fetchedAt:number;source:'coingecko'|'binance'}|undefined;
type TonWithdrawalQuote={cash:number;feeCash:number;netCash:number;usdAmount:number;tonAmount:number;tonUsd:number;quotedAt:string;expiresAt:string};
async function getTonUsdPrice(){
  if(tonPriceCache&&Date.now()-tonPriceCache.fetchedAt<WITHDRAWAL_PRICE_CACHE_MS)return tonPriceCache;
  // A chave da CoinGecko é opcional. Sem ela, usamos o endpoint público de
  // mercado da Binance; se a fonte preferida estiver indisponível, a segunda
  // é tentada. Não há cotação fixa como plano B: sem preço, não há saque.
  const sources:(()=>Promise<{usd:number;source:'coingecko'|'binance'}>)[]=[];
  if(process.env.COINGECKO_DEMO_API_KEY)sources.push(async()=>{
    const response=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd',{headers:{accept:'application/json','x-cg-demo-api-key':process.env.COINGECKO_DEMO_API_KEY!},signal:AbortSignal.timeout(8_000)});
    const payload=await response.json().catch(()=>null) as {'the-open-network'?:{usd?:number}}|null;
    return {usd:Number(payload?.['the-open-network']?.usd),source:'coingecko'};
  });
  sources.push(async()=>{
    const response=await fetch('https://data-api.binance.vision/api/v3/ticker/price?symbol=TONUSDT',{headers:{accept:'application/json'},signal:AbortSignal.timeout(8_000)});
    const payload=await response.json().catch(()=>null) as {price?:string}|null;
    return {usd:Number(payload?.price),source:'binance'};
  });
  if(!process.env.COINGECKO_DEMO_API_KEY)sources.push(async()=>{
    const response=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd',{headers:{accept:'application/json'},signal:AbortSignal.timeout(8_000)});
    const payload=await response.json().catch(()=>null) as {'the-open-network'?:{usd?:number}}|null;
    return {usd:Number(payload?.['the-open-network']?.usd),source:'coingecko'};
  });
  for(const fetchPrice of sources){try{const candidate=await fetchPrice();if(Number.isFinite(candidate.usd)&&candidate.usd>0){tonPriceCache={...candidate,fetchedAt:Date.now()};return tonPriceCache}}catch{/* tenta a próxima fonte */}}
  throw new Error('Não foi possível obter a cotação de TON agora. Tente novamente em instantes.');
}
async function buildTonWithdrawalQuote(cash:number):Promise<TonWithdrawalQuote>{
  const price=await getTonUsdPrice();
  const feeCash=Math.ceil(cash*WITHDRAWAL_FEE_RATE),netCash=cash-feeCash;
  const usdAmount=netCash/CASH_PER_USD;
  // Oito casas são suficientes para TON; arredondar para baixo impede pagar além da cotação registrada.
  const tonAmount=Math.floor((usdAmount/price.usd)*100_000_000)/100_000_000;
  if(tonAmount<=0)throw new Error('Valor de saque muito pequeno para gerar uma quantia válida em TON.');
  return {cash,feeCash,netCash,usdAmount,tonAmount,tonUsd:price.usd,quotedAt:now(),expiresAt:new Date(price.fetchedAt+WITHDRAWAL_PRICE_CACHE_MS).toISOString()};
}
function usedWithdrawalUsdToday(playerId:string){const today=brazilDayKey();return db.withdrawals.filter(row=>row.playerId===playerId&&row.status!=='rejected'&&brazilDayKey(new Date(row.createdAt))===today).reduce((sum,row)=>sum+row.usdAmount,0)}

if(!TON_WALLET_ADDRESS||!TONCENTER_API_KEY){
  console.warn(`[TON] Aviso: variáveis de ambiente para a rede "${TON_NETWORK}" não configuradas. Depósitos via TON ficarão indisponíveis até definir TON_WALLET_ADDRESS_${TON_NETWORK.toUpperCase()} e TONCENTER_API_KEY_${TON_NETWORK.toUpperCase()}.`);
}

async function relaySignedTonMessage(boc:string){
  if(!TON_RELAY_SIGNED_BOC)return {accepted:false as const,disabled:true as const};
  if(!TONCENTER_API_KEY)throw new Error('Chave TonCenter não configurada para retransmitir a mensagem.');
  const response=await fetch(`${TONCENTER_BASE}/message`,{
    method:'POST',
    headers:{'Content-Type':'application/json','X-API-Key':TONCENTER_API_KEY},
    body:JSON.stringify({boc}),
  });
  const payload=await response.json().catch(()=>null) as {message_hash?:string;message_hash_norm?:string;error?:string}|null;
  if(!response.ok)throw new Error(payload?.error??`TonCenter respondeu ${response.status}`);
  return {accepted:true as const,messageHash:payload?.message_hash_norm??payload?.message_hash??null};
}

async function ensureTonPayerCanSend(address:string,amountNanoTon:string){
  const response=await fetch(`${TONCENTER_BASE}/accountStates?address=${encodeURIComponent(address)}&include_boc=false`,{
    headers:{'X-API-Key':TONCENTER_API_KEY},
  });
  if(!response.ok)throw new Error('Não foi possível consultar o saldo da carteira na rede TON agora. Tente novamente em alguns segundos.');
  const data=await response.json() as {accounts?:{balance?:string;status?:string}[]};
  const account=data.accounts?.[0];
  // Leave a small reserve for wallet deployment and network fees. An uninitialized
  // account with funds can still be deployed by the wallet on its first transfer.
  const required=BigInt(amountNanoTon)+50_000_000n;
  const balance=BigInt(account?.balance??'0');
  if(balance<required){
    const network=TON_NETWORK==='testnet'?'testnet':'mainnet';
    throw new Error(`Sua carteira ${network} não possui TON suficiente para este pagamento e as taxas. ${TON_NETWORK==='testnet'?'Solicite TON de teste ao @testgiver_ton_bot, aguarde o recebimento e tente novamente.':'Adicione TON à carteira antes de tentar novamente.'}`);
  }
}

async function scanAndCreditTonDeposits(){
  if(!TON_WALLET_ADDRESS||!TONCENTER_API_KEY)return;
  // remove depósitos pendentes expirados
  const cutoff=Date.now()-TON_DEPOSIT_EXPIRY_MS;
  db.tonDeposits.forEach(d=>{if((d.status==='pending'||d.status==='submitted')&&Date.parse(d.createdAt)<cutoff)d.status='expired'});
  const pending=db.tonDeposits.filter(d=>(d.status==='pending'||d.status==='submitted')&&Date.parse(d.createdAt)>=cutoff);
  if(!pending.length){persist();return}
  // Busca todas as páginas desde o depósito pendente mais antigo. O endpoint
  // v3 suporta limit/offset; assim, um período de volume alto não deixa um
  // pagamento antigo para trás apenas por estar fora das últimas 100 linhas.
  const earliest=Math.floor(Math.min(...pending.map(deposit=>Date.parse(deposit.createdAt)))/1000)-120;
  const txs:any[]=[];const pageSize=1000;
  for(let offset=0;;offset+=pageSize){
    const res=await fetch(`${TONCENTER_BASE}/transactions?account=${encodeURIComponent(TON_WALLET_ADDRESS)}&start_utime=${earliest}&limit=${pageSize}&offset=${offset}&sort=asc`,{headers:{'X-Api-Key':TONCENTER_API_KEY}});
    if(!res.ok){console.error('[TON] Falha ao consultar TonCenter:',res.status,await res.text().catch(()=>''));return;}
    const page=(await res.json() as {transactions?:any[]}).transactions??[];
    txs.push(...page);if(page.length<pageSize)break;
  }
  const events:FinancialEvent[]=[];
  for(const tx of txs){
    const inMsg=tx.in_msg;
    if(!inMsg)continue;
    // TonCenter has used more than one decoded shape over time.  A payment
    // comment is our receipt key, so accept the documented text variants too.
    const decoded=inMsg?.message_content?.decoded;
    const comment:string|undefined=[decoded?.comment,decoded?.text,decoded?.text_comment,decoded?.value].find(value=>typeof value==='string');
    const valueNano:string|undefined=inMsg?.value;
    const hash:string|undefined=tx.hash;
    if(!comment||!valueNano||!hash)continue;
    if(db.tonDeposits.some(d=>d.txHash===hash))continue; // já processado no snapshot atual

    const match=pending.find(d=>d.comment===comment&&(d.status==='pending'||d.status==='submitted'));
    if(!match)continue;
    if(BigInt(valueNano)<BigInt(match.amountNanoTon))continue; // valor insuficiente, ignora (fica pendente)

    const player=db.players[match.playerId];
    if(!player)continue;

    // O recibo on-chain é a trava durável de idempotência. Se houver uma
    // reinicialização entre o pagamento e o snapshot, não creditamos FISH duas vezes.
    if(postgres){const existing=await postgres.query('SELECT 1 FROM ton_chain_receipts WHERE tx_hash=$1',[hash]);if(existing.rowCount){match.status='completed';match.txHash=hash;continue}}

    const tonAmount=Number(valueNano)/1e9;
    const fishEarned=match.fishAmount??Math.floor(tonAmount*TON_TO_FISH_RATE);
    player.fish+=fishEarned;
    match.status='completed';
    match.txHash=hash;
    events.push({playerId:player.id,kind:'ton_deposit_completed',referenceId:`ton-deposit:${hash}`,fishDelta:fishEarned,tonAmount,metadata:{depositId:match.id,comment:match.comment,network:TON_NETWORK,txHash:hash},receipt:{txHash:hash,depositId:match.id,playerId:player.id,amountNanoTon:valueNano,fishAmount:fishEarned}});
  }
  if(events.length)await persistFinancialEvents(events);else persist();
}

app.post('/wallet/deposit-ton/init',async(req,res)=>{
  if(!TON_WALLET_ADDRESS||!TONCENTER_API_KEY)return res.status(503).json({error:'Depósitos via TON ainda não configurados no servidor.'});
  const body=z.object({tonAmount:z.number().positive().max(1000),payerAddress:z.string().trim().min(20).max(128)}).parse(req.body);
  const player=active();
  if(isWebGuest(player))return res.status(403).json({error:'Depósitos exigem uma conta verificada pelo Telegram. Abra o jogo pelo bot para continuar.'});
  const id=crypto.randomUUID();
  const comment=`PixelFish:${id.slice(0,13)}`;
  const amountNanoTon=BigInt(Math.round(body.tonAmount*1e9)).toString();

  try{await ensureTonPayerCanSend(body.payerAddress,amountNanoTon)}catch(error){return res.status(422).json({error:error instanceof Error?error.message:'Não foi possível validar a carteira pagadora.'})}

  const fishAmount=Math.floor(body.tonAmount*TON_TO_FISH_RATE);
  const deposit:TonDeposit={id,playerId:player.id,amountNanoTon,comment,status:'pending',createdAt:now(),network:TON_NETWORK,fishAmount};
  db.tonDeposits.push(deposit);
  persist();

  res.json({depositId:id,address:TON_WALLET_ADDRESS,comment,amountNanoTon,tonAmount:body.tonAmount,network:TON_NETWORK,fishOnComplete:fishAmount});
});

app.post('/wallet/deposit-ton/verify',async(req,res)=>{
  const body=z.object({depositId:z.string().uuid()}).parse(req.body);
  try{await scanAndCreditTonDeposits();}catch(error){console.error('[TON] Erro ao escanear depósitos:',error);}
  const deposit=db.tonDeposits.find(d=>d.id===body.depositId);
  if(!deposit)return res.status(404).json({error:'Depósito não encontrado'});
  const player=active();
  if(deposit.playerId!==player.id)return res.status(404).json({error:'Depósito não encontrado'});
  res.json({status:deposit.status,wallet:{fish:player.fish,cash:player.cash}});
});
app.post('/wallet/deposit-ton/submitted',async(req,res)=>{
  const body=z.object({depositId:z.string().uuid(),boc:z.string().min(16).max(100_000)}).parse(req.body);
  const deposit=db.tonDeposits.find(row=>row.id===body.depositId);
  const player=active();
  if(!deposit||deposit.playerId!==player.id)return res.status(404).json({error:'Depósito não encontrado'});
  if(deposit.status==='completed'||deposit.status==='expired')return res.json({status:deposit.status,relay:deposit.relayStatus??'disabled'});

  deposit.status='submitted';
  deposit.submittedAt??=now();
  deposit.walletProofHash??=crypto.createHash('sha256').update(body.boc).digest('hex');
  try{
    const relay=await relaySignedTonMessage(body.boc);
    if(relay.accepted){
      deposit.relayStatus='accepted';
      deposit.relayMessageHash=relay.messageHash??undefined;
      deposit.relayError=undefined;
    }else deposit.relayStatus='disabled';
  }catch(error){
    // Never credit from this response: only a confirmed inbound blockchain transaction credits FISH.
    deposit.relayStatus='failed';
    deposit.relayError=error instanceof Error?error.message:'Falha desconhecida ao retransmitir.';
    console.error('[TON] Falha ao retransmitir BOC assinado:',deposit.relayError);
  }
  persist();
  res.json({status:deposit.status,relay:deposit.relayStatus,messageHash:deposit.relayMessageHash??null});
});

app.get('/wallet/deposit-ton/config',(_req,res)=>{
  res.json({network:TON_NETWORK,address:TON_WALLET_ADDRESS||null,tonToFishRate:TON_TO_FISH_RATE,configured:Boolean(TON_WALLET_ADDRESS&&TONCENTER_API_KEY)});
});
app.get('/economy/calculator',async(_req,res)=>{try{const player=active(),price=await getTonUsdPrice(),inventory=player.inventory.filter(fish=>!fish.temporaryUntil||Date.parse(fish.temporaryUntil)>Date.now()),dailyCash=inventory.reduce((sum,fish)=>sum+fish.dailyCash,0),dailyUsd=dailyCash/CASH_PER_USD;
  // Portfolio value: estimate based on TON price and fish acquisition cost
  // Simpler: use dailyUsd and estimate portfolio value from fish count * average cost
  // But simplest correct approach: yield rate = dailyUsd / estimated_portfolio_value
  // Estimate portfolio value: each fish cost ~map_cost / drop_rate
  const MAP_COST_PER_DAILYCASH={
    river:1300/13.5575,   // ~95.9 FISH per CASH/day
    lake:6500/72.175,     // ~90.1
    coast:13000/157.1875, // ~82.7
    ocean:26000/344.25,   // ~75.5
  };
  const FISH_TO_MAP:{
    [k:string]:'river'|'lake'|'coast'|'ocean'
  }={Siluro:'river','Truta dourada':'river','Barbo rubro':'river','Piranha azul':'river',
    Lampreia:'lake','Bream prata':'lake','Perca listrada':'lake','Pacu lunar':'lake','Carpa dourada ancestral':'lake',
    Linguado:'coast','Peixe-caixa':'coast',Escorpião:'coast',Dourada:'coast','Cavalo-marinho real':'coast',
    'Atum azul':'ocean','Peixe-vela':'ocean','Marlim violeta':'ocean','Rainha abissal':'ocean',
    Atum:'ocean',Vela:'ocean',Marlim:'ocean',Rainha:'ocean',
  };
  let totalPortfolioFish=0;
  for(const fish of inventory){
    const map=FISH_TO_MAP[fish.name]||'ocean';
    totalPortfolioFish+=fish.dailyCash*MAP_COST_PER_DAILYCASH[map];
  }
  const portfolioValueUsd=totalPortfolioFish/TON_TO_FISH_RATE*price.usd;
  const dailyYieldRate=portfolioValueUsd>0 ? dailyUsd/portfolioValueUsd : 0; // daily yield rate
  const realYieldApy=dailyYieldRate*365;
  const monthlyYieldPct=dailyYieldRate*30*100;
  // Yield per FISH per day (for simulation)
  const portfolioYieldDaily=totalPortfolioFish>0 ? dailyCash/totalPortfolioFish : 0; // CASH per FISH per day

  // Fallback: if no portfolio fish detected, use ocean average yield per FISH
  // Ocean: 344.25 expected dailyCash per 26000 FISH cast = 0.01324 CASH/FISH/day
  const OCEAN_YIELD_PER_FISH=344.25/26000; // ~0.01324 CASH/FISH/day
  const OCEAN_MONTHLY_PCT=(OCEAN_YIELD_PER_FISH*TON_TO_FISH_RATE/price.usd)*30*100; // % per month
  
  const effectiveYieldDaily=portfolioYieldDaily>0 ? portfolioYieldDaily : OCEAN_YIELD_PER_FISH;
  const effectiveMonthlyPct=monthlyYieldPct>0 ? monthlyYieldPct : OCEAN_MONTHLY_PCT;

  res.json({dailyCash,cashPerUsd:CASH_PER_USD,tonUsd:price.usd,tonToFishRate:TON_TO_FISH_RATE,fishPerCash:1.1,source:price.source,quotedAt:new Date(price.fetchedAt).toISOString(),portfolioFish:Math.round(totalPortfolioFish),portfolioYieldDaily:effectiveYieldDaily,realYieldApy,portfolioValueUsd:Math.round(portfolioValueUsd),monthlyYieldPct:effectiveMonthlyPct})}catch(error){res.status(503).json({error:error instanceof Error?error.message:'Cotação indisponível'})}});
app.get('/wallet/history',(_req,res)=>{const player=active();const deposits=db.tonDeposits.filter(row=>row.playerId===player.id).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).map(row=>({id:row.id,kind:'deposit',asset:'GRAM',network:row.network,status:row.status,relayStatus:row.relayStatus??null,amount:Number(row.amountNanoTon)/1e9,fishAmount:row.fishAmount??Math.floor(Number(row.amountNanoTon)/1e9*TON_TO_FISH_RATE),createdAt:row.createdAt,submittedAt:row.submittedAt??null,txHash:row.txHash??null}));const withdrawals=db.withdrawals.filter(row=>row.playerId===player.id).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).map(row=>({id:row.id,kind:'withdrawal',asset:'GRAM',network:'ton',status:row.status,cash:row.cash,feeCash:row.feeCash,netCash:row.netCash,tonAmount:row.tonAmount,createdAt:row.createdAt,txHash:row.txHash??null}));res.json({deposits,withdrawals});});
// =================== FIM TON PAYMENTS ====================

app.get('/health',(_req,res)=>res.json({ok:true,mode:process.env.ENABLE_REAL_WITHDRAWALS==='true'?'configured':'demo-safe',persistence:DATA_PATH,tonNetwork:TON_NETWORK}));
app.get('/game/state',(_req,res)=>{const player=active();accrue(player);resetMonthlyFarm(player);persist();res.json({wallet:{fish:displayedFish(player),cash:displayedCash(player),withdrawableCash:player.cash,temporaryCash:temporaryIsActive(player)?player.temporaryCash??0:0,temporaryFish:temporaryIsActive(player)?player.temporaryFish??0:0,temporaryUntil:temporaryIsActive(player)?player.temporaryUntil??null:null},player:{...publicPool(player),inventory:player.inventory,pendingCash:player.pendingCash,missions:player.missions,referralCash:player.referralCash,referralCounts:player.referralCounts,bait:totalBait(player),baitByMap:player.baitByMap??{},temporaryBaitByMap:temporaryIsActive(player)?player.temporaryBaitByMap??{}:{},bonusBait:player.bonusBait??{},cylinders:(player.cylinders??0)+(temporaryIsActive(player)?player.temporaryCylinders??0:0)},economy:{fishPerUsdt:10000,fishPerGramPointOne:1300,cashPerUsd:CASH_PER_USD,minimumWithdrawalCash:MIN_WITHDRAWAL_CASH,minimumWithdrawalUsd:MIN_WITHDRAWAL_USD}});});
app.get('/pool/:id',(req,res)=>{const player=db.players[req.params.id];if(!player)return res.status(404).json({error:'Pool não encontrado'});accrue(player);persist();res.json(publicPool(player));});
app.get('/ranking/season',(_req,res)=>{settleFinishedSeason();const all=Object.values(db.players);all.forEach(player=>{accrue(player);resetMonthlyFarm(player)});persist();const entries=all.filter(player=>player.accountType==='telegram'&&player.inventory.length>0).sort((a,b)=>b.monthlyFarm-a.monthlyFarm||b.inventory.length-a.inventory.length).map((player,index)=>({rank:index+1,...publicPool(player),monthlyFarm:player.monthlyFarm,score:player.monthlyFarm}));const awards=db.seasonAwards??[],previousAward=awards[awards.length-1]??null;res.json({season:monthKey(),endsAt:seasonEndsAt(),prizeFish:650000,previousAward,playerRank:entries.find(row=>row.id===active().id)?.rank??null,entries});});
function missionState(player:Player,mission:(typeof MISSION_DEFINITIONS)[number]){const key=mission.kind==='daily'?`${mission.id}:${new Date().toISOString().slice(0,10)}`:mission.id;const progress=mission.kind==='daily'?1:mission.kind==='casts'?player.casts:mission.kind==='fish'?player.inventory.length:player.referralCounts[0];const target=mission.kind==='daily'?1:mission.target??1;return{...mission,key,progress,target,completed:player.missions.includes(key),ready:progress>=target&&!player.missions.includes(key)}}
app.get('/missions',(_req,res)=>{const player=active();res.json({missions:MISSION_DEFINITIONS.map(mission=>missionState(player,mission))});});
app.post('/missions/:id/claim',async(req,res)=>{const id=z.string().min(1).max(64).parse(req.params.id);const mission=MISSION_DEFINITIONS.find(item=>item.id===id);if(!mission)return res.status(404).json({error:'Missão não encontrada'});const player=active();const state=missionState(player,mission);if(state.completed)return res.status(409).json({error:'Missão já concluída'});if(!state.ready)return res.status(409).json({error:`Progresso insuficiente: ${state.progress}/${state.target}`});player.missions.push(state.key);player.fish+=mission.reward;try{await persistFinancialEvent({playerId:player.id,kind:'mission_reward',referenceId:`mission:${player.id}:${state.key}`,fishDelta:mission.reward,metadata:{missionId:id}})}catch{player.missions=player.missions.filter(key=>key!==state.key);player.fish-=mission.reward;return res.status(503).json({error:'Não foi possível registrar a recompensa com segurança.'})}res.json({wallet:{fish:player.fish,cash:player.cash},reward:mission.reward,mission:missionState(player,mission)});});
app.get('/referrals',(_req,res)=>{const player=active();const telegramId=player.id.startsWith('tg:')?player.id.slice(3):player.id;const players=Object.values(db.players).flatMap(candidate=>{let ancestorId=candidate.referrerId;for(let level=1;level<=3&&ancestorId;level++){if(ancestorId===player.id)return[{id:candidate.id,name:candidate.name,photoUrl:candidate.photoUrl??null,level,dailyCash:candidate.inventory.reduce((sum,fish)=>sum+fish.dailyCash,0),fishCount:candidate.inventory.length}];ancestorId=db.players[ancestorId]?.referrerId}return[]});res.json({link:`https://t.me/pixelfishgram_bot?startapp=ref_${telegramId}`,levels:[5,2,1].map((percent,index)=>({level:index+1,percent,count:player.referralCounts[index],earned:player.referralEarnings[index]??0})),players,totalCash:player.referralCash});});
app.get('/forge/config',(_req,res)=>res.json({needed:9,rules:FORGE_RULES}));
app.post('/forge/attempt',(req,res)=>{const body=z.object({rarity:z.enum(['Comum','Raro','Épico'])}).parse(req.body);const player=active(),rule=FORGE_RULES[body.rarity],inputs=player.inventory.filter(fish=>fish.rarity===body.rarity).slice(0,9);if(inputs.length<9)return res.status(409).json({error:`Você precisa de 9 peixes ${body.rarity.toLowerCase()} para forjar.`});const consumed=new Set(inputs.map(fish=>fish.id));player.inventory=player.inventory.filter(fish=>!consumed.has(fish.id));const success=Math.random()<rule.chance;if(!success){persist();return res.json({success:false,rarity:body.rarity,consumed:9,chance:rule.chance,inventory:player.inventory})}const average=inputs.reduce((sum,fish)=>sum+fish.dailyCash,0)/inputs.length;const crafted:Fish={id:crypto.randomUUID(),name:`Relíquia forjada ${rule.next.toLowerCase()}`,rarity:rule.next,dailyCash:Math.max(1,Math.round(average*rule.dailyMultiplier*100)/100)};player.inventory.push(crafted);accrue(player);persist();res.status(201).json({success:true,crafted,consumed:9,chance:rule.chance,inventory:player.inventory});});
app.post('/bonus/redeem',async(req,res)=>{
  const body=z.object({code:z.string().trim().min(3).max(64)}).parse(req.body);
  const code=body.code.toUpperCase(),definition=BONUS_CODES[code as keyof typeof BONUS_CODES];
  if(!definition)return res.status(404).json({error:'Código bônus inválido.'});
  const player=active();
  if(player.bonusClaims?.includes(code))return res.status(409).json({error:'Você já recolheu este código.'});
  const totalClaims=Object.values(db.players).filter(candidate=>candidate.bonusClaims?.includes(code)).length;
  if(totalClaims>=definition.maxClaims)return res.status(409).json({error:'Este código já atingiu o limite de usos.'});
  player.bonusClaims??=[];player.bonusBait??={};player.bonusClaims.push(code);
  if(definition.reward.kind==='map_bait'){
    player.bonusBait[definition.reward.map]=(player.bonusBait[definition.reward.map]??0)+definition.reward.quantity;
    persist();
  }else if(definition.reward.kind==='temporary_wallet'){
    const expiresAt=new Date(Date.now()+definition.reward.durationDays*86_400_000).toISOString();
    player.temporaryFish=(player.temporaryFish??0)+definition.reward.fish;
    player.temporaryCash=(player.temporaryCash??0)+definition.reward.cash;
    player.temporaryUntil=expiresAt;
    persist();
  }else{
    player.fish+=definition.reward.fish;player.cash+=definition.reward.cash;
    try{await persistFinancialEvent({playerId:player.id,kind:'bonus_wallet_reward',referenceId:`bonus:${player.id}:${code}`,fishDelta:definition.reward.fish,cashDelta:definition.reward.cash,metadata:{code}})}
    catch{player.bonusClaims=player.bonusClaims.filter(item=>item!==code);player.fish-=definition.reward.fish;player.cash-=definition.reward.cash;return res.status(503).json({error:'Não foi possível registrar o prêmio com segurança.'})}
  }
  res.status(201).json({code,reward:definition.label,remaining:definition.maxClaims-totalClaims-1,temporary:definition.reward.kind==='temporary_wallet'?{expiresAt:player.temporaryUntil,notice:'Este é um saldo de teste sem valor monetário. Ele expira em 7 dias e não pode ser sacado.'}:null,bonusBait:player.bonusBait,wallet:{fish:displayedFish(player),cash:displayedCash(player)}});
});
const marketView=(listing:MarketListing)=>({id:listing.id,fish:listing.fish,price:listing.price,status:listing.status,createdAt:listing.createdAt,seller:{id:listing.sellerId,name:db.players[listing.sellerId]?.name??'Pescador',photoUrl:db.players[listing.sellerId]?.photoUrl??null}});
app.get('/market',(_req,res)=>res.json({feePercent:15,listings:(db.marketListings??[]).filter(listing=>listing.status==='open').sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).map(marketView)}));
app.post('/market/list',(req,res)=>{const body=z.object({fishId:z.string().uuid(),price:z.number().int().min(100).max(10_000_000)}).parse(req.body);const player=active(),index=player.inventory.findIndex(fish=>fish.id===body.fishId);if(index<0)return res.status(404).json({error:'Peixe não encontrado no seu aquário.'});const [fish]=player.inventory.splice(index,1),listing:MarketListing={id:crypto.randomUUID(),sellerId:player.id,fish,price:body.price,status:'open',createdAt:now()};(db.marketListings??=[]).push(listing);persist();res.status(201).json({listing:marketView(listing),inventory:player.inventory,feePercent:15});});
app.post('/market/:id/buy',(req,res)=>{const buyer=active(),listing=(db.marketListings??[]).find(item=>item.id===req.params.id&&item.status==='open');if(!listing)return res.status(404).json({error:'Anúncio não está mais disponível.'});if(listing.sellerId===buyer.id)return res.status(409).json({error:'Você não pode comprar seu próprio anúncio.'});if(buyer.fish<listing.price)return res.status(400).json({error:'FISH insuficiente para esta compra.'});const seller=db.players[listing.sellerId];if(!seller)return res.status(409).json({error:'Vendedor não está mais disponível.'});buyer.fish-=listing.price;buyer.inventory.push(listing.fish);seller.fish+=Math.floor(listing.price*.85);listing.status='sold';listing.buyerId=buyer.id;listing.soldAt=now();persist();res.json({listing:marketView(listing),wallet:{fish:buyer.fish,cash:buyer.cash},burned:listing.price-Math.floor(listing.price*.85)});});
app.post('/market/:id/cancel',(req,res)=>{const player=active(),listing=(db.marketListings??[]).find(item=>item.id===req.params.id&&item.status==='open');if(!listing||listing.sellerId!==player.id)return res.status(404).json({error:'Anúncio não encontrado.'});player.inventory.push(listing.fish);listing.status='cancelled';persist();res.json({inventory:player.inventory});});
app.post('/fishing/buy',async(req,res)=>{const body=z.object({map:z.enum(['river','lake','coast','ocean']),quantity:z.number().int().min(1).max(11)}).parse(req.body);const player=active(),total=costs[body.map]*body.quantity,spent=spendFish(player,total);if(!spent)return res.status(400).json({error:'FISH insuficiente'});const isTemporary=spent.temporary>0;if(isTemporary){player.temporaryBaitByMap??={};player.temporaryBaitByMap[body.map]=(player.temporaryBaitByMap[body.map]??0)+body.quantity}else{player.baitByMap??={};player.baitByMap[body.map]=(player.baitByMap[body.map]??0)+body.quantity}const id=crypto.randomUUID();try{if(spent.real)await persistFinancialEvent({playerId:player.id,kind:'bait_purchase',referenceId:`bait:${id}`,fishDelta:-spent.real,metadata:{map:body.map,quantity:body.quantity,temporaryFishUsed:spent.temporary}});else persist()}catch{player.fish+=spent.real;player.temporaryFish=(player.temporaryFish??0)+spent.temporary;if(isTemporary)player.temporaryBaitByMap![body.map]=(player.temporaryBaitByMap![body.map]??0)-body.quantity;else player.baitByMap![body.map]=(player.baitByMap![body.map]??0)-body.quantity;return res.status(503).json({error:'Não foi possível registrar a compra com segurança.'})}res.json({fish:displayedFish(player),bait:baitForMap(player,body.map),baitByMap:player.baitByMap,temporaryBaitByMap:player.temporaryBaitByMap});});
app.post('/fishing/start',(req,res)=>{const body=z.object({map:z.enum(['river','lake','coast','ocean'])}).parse(req.body);const player=active();if(player.fishingSession&&Date.parse(player.fishingSession.expiresAt)>Date.now())return res.json({sessionId:player.fishingSession.id,bait:baitForMap(player,body.map)});player.bonusBait??={};player.temporaryBaitByMap??={};player.baitByMap??={};const hasBonus=(player.bonusBait[body.map]??0)>0,hasTemporary=(player.temporaryBaitByMap[body.map]??0)>0,hasPaid=(player.baitByMap[body.map]??0)>0;if(!hasBonus&&!hasTemporary&&!hasPaid)return res.status(409).json({error:'Compre um lançamento neste local antes de pescar.'});if(hasBonus)player.bonusBait[body.map]!--;else if(hasTemporary)player.temporaryBaitByMap[body.map]!--;else player.baitByMap[body.map]!--;player.fishingSession={id:crypto.randomUUID(),map:body.map,source:hasBonus?'bonus':hasTemporary?'temporary':'paid',expiresAt:new Date(Date.now()+120_000).toISOString()};persist();res.json({sessionId:player.fishingSession.id,bait:baitForMap(player,body.map),bonusBait:player.bonusBait});});
app.post('/fishing/resolve',(req,res)=>{const body=z.object({sessionId:z.string().uuid(),success:z.boolean()}).parse(req.body);const player=active(),session=player.fishingSession;if(!session||session.id!==body.sessionId)return res.status(409).json({error:'Esta tentativa de pesca não é mais válida. O lançamento foi devolvido se não foi usado.'});delete player.fishingSession;if(!body.success){if(session.source==='bonus'){player.bonusBait??={};player.bonusBait[session.map]=(player.bonusBait[session.map]??0)+1}else if(session.source==='temporary'){player.temporaryBaitByMap??={};player.temporaryBaitByMap[session.map]=(player.temporaryBaitByMap[session.map]??0)+1}else{player.baitByMap??={};player.baitByMap[session.map]=(player.baitByMap[session.map]??0)+1}persist();return res.json({success:false,refunded:true,bait:baitForMap(player,session.map),bonusBait:player.bonusBait})}const chosen=pickFish(session.map);player.casts++;const caught:Fish={id:crypto.randomUUID(),name:chosen.name,rarity:chosen.rarity,dailyCash:chosen.dailyCash,...(session.source==='temporary'&&player.temporaryUntil?{temporaryUntil:player.temporaryUntil}:{})};player.inventory.push(caught);accrue(player);persist();res.status(201).json({success:true,caught,casts:player.casts,bait:baitForMap(player,session.map),bonusBait:player.bonusBait,pendingCash:player.pendingCash});});
app.post('/dive/buy',async(req,res)=>{const body=z.object({quantity:z.number().int().min(1).max(11)}).parse(req.body);const player=active(),total=13000*body.quantity,spent=spendFish(player,total);if(!spent)return res.status(400).json({error:'FISH insuficiente'});const isTemporary=spent.temporary>0;if(isTemporary)player.temporaryCylinders=(player.temporaryCylinders??0)+body.quantity;else player.cylinders=(player.cylinders??0)+body.quantity;const id=crypto.randomUUID();try{if(spent.real)await persistFinancialEvent({playerId:player.id,kind:'cylinder_purchase',referenceId:`cylinder:${id}`,fishDelta:-spent.real,metadata:{quantity:body.quantity,temporaryFishUsed:spent.temporary}});else persist()}catch{player.fish+=spent.real;player.temporaryFish=(player.temporaryFish??0)+spent.temporary;if(isTemporary)player.temporaryCylinders=(player.temporaryCylinders??0)-body.quantity;else player.cylinders=(player.cylinders??0)-body.quantity;return res.status(503).json({error:'Não foi possível registrar a compra com segurança.'})}res.json({fish:displayedFish(player),cylinders:(player.cylinders??0)+(player.temporaryCylinders??0)});});
app.post('/dive/start',(_req,res)=>{const player=active();if(player.diveSession&&Date.parse(player.diveSession.expiresAt)>Date.now())return res.json({sessionId:player.diveSession.id,cylinders:(player.cylinders??0)+(player.temporaryCylinders??0),durationSeconds:60});const temporary=(player.temporaryCylinders??0)>0;if(!temporary&&!(player.cylinders??0))return res.status(409).json({error:'Você precisa de um cilindro'});if(temporary)player.temporaryCylinders!--;else player.cylinders!--;player.diveSession={id:crypto.randomUUID(),temporary,nextCylinderAt:new Date(Date.now()+10_000).toISOString(),expiresAt:new Date(Date.now()+62_000).toISOString()};persist();res.json({sessionId:player.diveSession.id,cylinders:(player.cylinders??0)+(player.temporaryCylinders??0),durationSeconds:60});});
app.post('/dive/consume-cylinder',(req,res)=>{const body=z.object({sessionId:z.string().uuid()}).parse(req.body);const player=active(),session=player.diveSession;if(!session||session.id!==body.sessionId||Date.parse(session.expiresAt)<=Date.now())return res.status(409).json({error:'O mergulho terminou.',ended:true});if(session.nextCylinderAt&&Date.now()<Date.parse(session.nextCylinderAt))return res.json({cylinders:(player.cylinders??0)+(player.temporaryCylinders??0),ended:false});const available=session.temporary?(player.temporaryCylinders??0):(player.cylinders??0);if(!available){delete player.diveSession;persist();return res.json({cylinders:(player.cylinders??0)+(player.temporaryCylinders??0),ended:true})}if(session.temporary)player.temporaryCylinders!--;else player.cylinders!--;session.nextCylinderAt=new Date(Date.now()+10_000).toISOString();persist();res.json({cylinders:(player.cylinders??0)+(player.temporaryCylinders??0),ended:false});});
app.post('/dive/catch',(req,res)=>{const body=z.object({sessionId:z.string().uuid(),depth:z.number().min(1).max(250)}).parse(req.body);const player=active(),session=player.diveSession;if(!session||session.id!==body.sessionId||Date.parse(session.expiresAt)<Date.now())return res.status(409).json({error:'O cilindro terminou. Inicie outro mergulho para tentar fisgar um peixe.'});const table=body.depth>=200?[{name:'Dragão abissal',rarity:'Lendário' as const,dailyCash:21}]:body.depth>=140?[{name:'Peixe-lanterna',rarity:'Épico' as const,dailyCash:21}]:body.depth>=70?[{name:'Raia celeste',rarity:'Raro' as const,dailyCash:17.06}]:[{name:'Peixe coral',rarity:'Comum' as const,dailyCash:13.65}];const chosen=table[0];delete player.diveSession;player.casts++;const caught:Fish={id:crypto.randomUUID(),...chosen,...(session.temporary&&player.temporaryUntil?{temporaryUntil:player.temporaryUntil}:{})};player.inventory.push(caught);accrue(player);persist();res.status(201).json({caught,cylinders:(player.cylinders??0)+(player.temporaryCylinders??0),pendingCash:player.pendingCash});});
app.post('/pool/haul',async(_req,res)=>{const player=active();accrue(player);if(player.pendingCash<.01)return res.status(409).json({error:'Ainda não há CASH suficiente para recolher'});const earned=player.pendingCash;player.cash+=earned;player.pendingCash=0;resetMonthlyFarm(player);player.monthlyFarm+=earned;const eventId=crypto.randomUUID(),events:FinancialEvent[]=[{playerId:player.id,kind:'pool_cash_collected',referenceId:`haul:${eventId}`,cashDelta:earned,metadata:{monthlyFarm:player.monthlyFarm}}];const rewarded:Player[]=[];let ancestorId=player.referrerId;for(const [level,percent] of [5,2,1].entries()){if(!ancestorId)break;const ancestor:Player|undefined=db.players[ancestorId];if(!ancestor)break;const bonus=earned*percent/100;ancestor.cash+=bonus;ancestor.referralCash+=bonus;ancestor.referralEarnings[level]=(ancestor.referralEarnings[level]??0)+bonus;rewarded.push(ancestor);events.push({playerId:ancestor.id,kind:'referral_cash_reward',referenceId:`haul:${eventId}:ref:${level+1}`,cashDelta:bonus,metadata:{sourcePlayerId:player.id,level:level+1}});ancestorId=ancestor.referrerId}try{await persistFinancialEvents(events)}catch{player.cash-=earned;player.pendingCash=earned;player.monthlyFarm-=earned;for(const ancestor of rewarded){const level=events.findIndex(event=>event.playerId===ancestor.id&&event.kind==='referral_cash_reward');const bonus=events[level]?.cashDelta??0;ancestor.cash-=bonus;ancestor.referralCash-=bonus;const index=Number(events[level]?.metadata?.level??1)-1;ancestor.referralEarnings[index]-=bonus}return res.status(503).json({error:'Não foi possível recolher com segurança. Nenhum saldo foi creditado.'})}res.json({earned,wallet:{fish:player.fish,cash:player.cash}});});
app.post('/wallet/deposit-demo',(req,res)=>{const player=active();const allowed=player.accountType==='local_dev'&&process.env.NODE_ENV!=='production'&&['localhost','127.0.0.1','::1'].includes(req.hostname);if(!allowed)return res.status(403).json({error:'Depósito demo está disponível somente no ambiente local de desenvolvimento.'});player.fish+=10000;persist();res.json({wallet:{fish:player.fish,cash:player.cash}});});
app.post('/wallet/exchange',async(req,res)=>{const body=z.object({cash:z.number().int().min(1000)}).parse(req.body);const player=active(),spent=spendCash(player,body.cash);if(!spent)return res.status(400).json({error:'Saldo CASH insuficiente'});const fish=Math.floor(body.cash*1.1),isTemporary=spent.temporary>0;if(isTemporary)player.temporaryFish=(player.temporaryFish??0)+fish;else player.fish+=fish;const id=crypto.randomUUID();try{if(spent.real)await persistFinancialEvent({playerId:player.id,kind:'cash_to_fish_exchange',referenceId:`exchange:${id}`,cashDelta:-spent.real,fishDelta:isTemporary?0:fish,metadata:{bonusPercent:10,temporaryCashUsed:spent.temporary}});else persist()}catch{player.cash+=spent.real;player.temporaryCash=(player.temporaryCash??0)+spent.temporary;if(isTemporary)player.temporaryFish=(player.temporaryFish??0)-fish;else player.fish-=fish;return res.status(503).json({error:'Não foi possível registrar a troca com segurança.'})}res.json({wallet:{fish:displayedFish(player),cash:displayedCash(player)},fish,bonusPercent:10,temporary:isTemporary});});
app.post('/auth/telegram',(req,res)=>{
  const initData=z.string().max(8192).parse(req.body?.initData??'');
  const isLocalDevelopment=initData==='dev:local-player'&&process.env.NODE_ENV!=='production'&&['localhost','127.0.0.1','::1'].includes(req.hostname);
  const guestId=initData.match(/^web:([a-zA-Z0-9_-]{24,80})$/)?.[1];
  const isWebGuestLogin=process.env.WEB_GUEST_ACCESS==='true'&&Boolean(guestId);
  const telegramUser=isLocalDevelopment?{id:0,first_name:'Jogador local'}:isWebGuestLogin?null:verifyTelegramInitData(initData);
  if(!telegramUser&&!isWebGuestLogin)return res.status(401).json({error:'Abra o jogo pelo Telegram ou habilite WEB_GUEST_ACCESS para o modo visitante web.'});
  const playerId=isLocalDevelopment?'dev:local-player':isWebGuestLogin?`web:${guestId}`:`tg:${telegramUser!.id}`;
  const name=isLocalDevelopment?'Jogador local':isWebGuestLogin?'Visitante':[telegramUser!.first_name,telegramUser!.last_name].filter(Boolean).join(' ');
  const accountType:Player['accountType']=isLocalDevelopment?'local_dev':isWebGuestLogin?'web_guest':'telegram';
  if(!db.players[playerId]){
    const player=starter(playerId,name,0,0,0,accountType);
    if(telegramUser?.photo_url)player.photoUrl=telegramUser.photo_url;
    // Telegram signs start_param inside initData, so a player cannot forge a referral.
    const referrerNumber=new URLSearchParams(initData).get('start_param')?.match(/^ref_(\d+)$/)?.[1];
    const referrerId=referrerNumber?`tg:${referrerNumber}`:undefined;
    if(referrerId&&referrerId!==playerId&&db.players[referrerId]){
      player.referrerId=referrerId;
      let ancestorId:string|undefined=referrerId;
      for(let level=0;level<3&&ancestorId;level++){const ancestor:Player|undefined=db.players[ancestorId];if(!ancestor)break;ancestor.referralCounts[level]=(ancestor.referralCounts[level]??0)+1;ancestorId=ancestor.referrerId}
    }
    db.players[playerId]=player;persist()
  }else if(db.players[playerId].name!==name||db.players[playerId].photoUrl!==telegramUser?.photo_url){db.players[playerId].name=name;if(telegramUser?.photo_url)db.players[playerId].photoUrl=telegramUser.photo_url;persist()}
  const player=db.players[playerId];res.json({token:createSession(playerId),expiresInSeconds:Math.floor(sessionTtlMs/1000),player:publicPool(player)});
});
app.get('/wallet/withdraw/quote',async(req,res)=>{
  try{
    const cash=z.coerce.number().int().min(MIN_WITHDRAWAL_CASH).max(MAX_WITHDRAWAL_CASH).parse(req.query.cash);
    const player=active(),usedUsd=usedWithdrawalUsdToday(player.id),remainingUsd=Math.max(0,DAILY_WITHDRAWAL_USD_LIMIT-usedUsd),quote=await buildTonWithdrawalQuote(cash);
    if(quote.usdAmount>remainingUsd)return res.status(400).json({error:`Limite diário restante: US$ ${remainingUsd.toFixed(2)} (${brazilDayKey()} · Brasília).`});
    res.json({asset:'TON',symbol:'TON / GRAM',cashPerUsd:CASH_PER_USD,minimumCash:MIN_WITHDRAWAL_CASH,minimumUsd:MIN_WITHDRAWAL_USD,feePercent:WITHDRAWAL_FEE_RATE*100,dailyLimitUsd:DAILY_WITHDRAWAL_USD_LIMIT,dailyUsedUsd:usedUsd,dailyRemainingUsd:remainingUsd,quote});
  }catch(error){res.status(503).json({error:error instanceof Error?error.message:'Cotação indisponível'})}
});
app.post('/wallet/withdraw',async(req,res)=>{
  if(process.env.MANUAL_WITHDRAWALS_ENABLED!=='true')return res.status(409).json({error:'Saques manuais ainda não foram habilitados pelo operador. Nenhuma solicitação foi criada.'});
  if(TON_NETWORK!=='mainnet')return res.status(409).json({error:'Saques reais só podem ser liberados quando TON_NETWORK=mainnet. Nenhuma solicitação foi criada.'});
  if(!process.env.ADMIN_REVIEW_KEY)return res.status(503).json({error:'A chave de revisão administrativa não foi configurada. Nenhuma solicitação foi criada.'});
  if(!TON_WALLET_ADDRESS||!TONCENTER_API_KEY)return res.status(503).json({error:'A carteira principal ou a chave TonCenter não está configurada para mainnet. Nenhuma solicitação foi criada.'});
  const body=z.object({cash:z.number().int().positive().max(MAX_WITHDRAWAL_CASH),destination:z.string().trim().regex(/^(?:EQ|UQ|kQ|0Q)[A-Za-z0-9_-]{46}$/,'Endereço TON inválido')}).parse(req.body);const player=active();
  if(isWebGuest(player))return res.status(403).json({error:'Saques exigem uma conta verificada pelo Telegram.'});
  if(!postgres)return res.status(503).json({error:'Saques exigem o PostgreSQL ativo para proteger o saldo. Nenhuma solicitação foi criada.'});
  if(body.cash<MIN_WITHDRAWAL_CASH)return res.status(400).json({error:`Saque mínimo: ${MIN_WITHDRAWAL_CASH.toLocaleString('pt-BR')} CASH (US$ ${MIN_WITHDRAWAL_USD.toFixed(2)})`});
  if(body.cash>player.cash)return res.status(400).json({error:'Saldo CASH insuficiente'});
  let quote:TonWithdrawalQuote;
  try{quote=await buildTonWithdrawalQuote(body.cash)}catch(error){return res.status(503).json({error:error instanceof Error?error.message:'Cotação indisponível'})}
  const usedUsd=usedWithdrawalUsdToday(player.id);
  if(usedUsd+quote.usdAmount>DAILY_WITHDRAWAL_USD_LIMIT)return res.status(400).json({error:`Limite diário de US$ ${DAILY_WITHDRAWAL_USD_LIMIT.toFixed(2)} atingido. Restante hoje: US$ ${Math.max(0,DAILY_WITHDRAWAL_USD_LIMIT-usedUsd).toFixed(2)}.`});
  player.cash-=body.cash;player.reservedCash+=body.cash;
  const row:Withdrawal={id:crypto.randomUUID(),playerId:player.id,cash:body.cash,feeCash:quote.feeCash,netCash:quote.netCash,destination:body.destination,asset:'TON',tonAmount:quote.tonAmount,usdAmount:quote.usdAmount,tonUsd:quote.tonUsd,quotedAt:quote.quotedAt,status:'pending_manual',createdAt:now()};db.withdrawals.push(row);
  try{await persistFinancialEvent({playerId:player.id,kind:'withdrawal_reserved',referenceId:`${row.id}:reserved`,cashDelta:-body.cash,tonAmount:row.tonAmount,usdAmount:row.usdAmount,tonUsd:row.tonUsd,metadata:{withdrawalId:row.id,destination:row.destination,feeCash:row.feeCash,netCash:row.netCash}})}catch(error){player.cash+=body.cash;player.reservedCash=Math.max(0,player.reservedCash-body.cash);db.withdrawals=db.withdrawals.filter(item=>item.id!==row.id);persist();return res.status(503).json({error:'Não foi possível salvar a solicitação com segurança. Seu saldo não foi alterado.'})}
  res.status(202).json({withdrawal:row,message:`Solicitação registrada: ${row.tonAmount} TON será pago manualmente após revisão.`});
});
app.get('/wallet/withdrawals',(_req,res)=>{const player=active();res.json({reservedCash:player.reservedCash,withdrawals:db.withdrawals.filter(row=>row.playerId===player.id)});});
app.post('/wallet/withdrawals/:id/cancel',async(req,res)=>{const player=active();const row=db.withdrawals.find(item=>item.id===req.params.id&&item.playerId===player.id);if(!row||row.status!=='pending_manual')return res.status(404).json({error:'Solicitação pendente não encontrada ou ela já foi revisada.'});player.reservedCash=Math.max(0,player.reservedCash-row.cash);player.cash+=row.cash;row.status='rejected';row.reviewedAt=now();try{await persistFinancialEvent({playerId:player.id,kind:'withdrawal_cancelled_by_player',referenceId:`${row.id}:cancelled`,cashDelta:row.cash,tonAmount:row.tonAmount,usdAmount:row.usdAmount,tonUsd:row.tonUsd,metadata:{withdrawalId:row.id}})}catch{player.reservedCash+=row.cash;player.cash-=row.cash;row.status='pending_manual';delete row.reviewedAt;return res.status(503).json({error:'Não foi possível cancelar com segurança. Tente novamente.'})}res.json({withdrawal:row,wallet:{fish:player.fish,cash:player.cash}})});
function adminOnly(req:express.Request,res:express.Response,next:express.NextFunction){const key=process.env.ADMIN_REVIEW_KEY;if(!key||req.header('x-admin-key')!==key)return res.status(403).json({error:'Acesso administrativo negado'});next()}
app.get('/admin/withdrawals',adminOnly,(_req,res)=>res.json({withdrawals:db.withdrawals.filter(row=>row.status==='pending_manual')}));
const tonTransactionHashSchema=z.string().trim().regex(/^(?:[A-Fa-f0-9]{64}|[A-Za-z0-9+/_-]{43,88}={0,2})$/,'Informe a hash real da transação TON, não o ID do pedido.');
app.post('/admin/withdrawals/:id/confirm',adminOnly,async(req,res)=>{const parsed=tonTransactionHashSchema.safeParse(req.body?.txHash);if(!parsed.success)return res.status(400).json({error:'Informe a hash real da transação TON no segundo argumento do comando.'});const txHash=parsed.data;const row=db.withdrawals.find(item=>item.id===req.params.id);if(!row||row.status!=='pending_manual')return res.status(404).json({error:'Solicitação pendente não encontrada'});const player=db.players[row.playerId];if(!player)return res.status(404).json({error:'Jogador não encontrado'});player.reservedCash=Math.max(0,player.reservedCash-row.cash);row.status='confirmed_manual';row.reviewedAt=now();row.txHash=txHash;try{await persistFinancialEvent({playerId:player.id,kind:'withdrawal_paid',referenceId:`${row.id}:paid`,tonAmount:row.tonAmount,usdAmount:row.usdAmount,tonUsd:row.tonUsd,metadata:{withdrawalId:row.id,txHash}})}catch{player.reservedCash+=row.cash;row.status='pending_manual';delete row.reviewedAt;delete row.txHash;return res.status(503).json({error:'Falha ao registrar o pagamento. Tente novamente; nenhum estado foi confirmado.'})}res.json({withdrawal:row})});
app.post('/admin/withdrawals/:id/correct-hash',adminOnly,async(req,res)=>{const parsed=tonTransactionHashSchema.safeParse(req.body?.txHash);if(!parsed.success)return res.status(400).json({error:'Informe a hash real da transação TON.'});const txHash=parsed.data;const row=db.withdrawals.find(item=>item.id===req.params.id);if(!row||row.status!=='confirmed_manual')return res.status(404).json({error:'Saque confirmado não encontrado'});const player=db.players[row.playerId];if(!player)return res.status(404).json({error:'Jogador não encontrado'});const previousHash=row.txHash;row.txHash=txHash;row.reviewedAt=now();try{await persistFinancialEvent({playerId:player.id,kind:'withdrawal_hash_corrected',referenceId:`${row.id}:hash-corrected`,tonAmount:row.tonAmount,usdAmount:row.usdAmount,tonUsd:row.tonUsd,metadata:{withdrawalId:row.id,previousHash,txHash}})}catch{row.txHash=previousHash;return res.status(503).json({error:'Falha ao corrigir a hash com segurança.'})}res.json({withdrawal:row})});
app.post('/admin/withdrawals/:id/reopen',adminOnly,async(req,res)=>{const row=db.withdrawals.find(item=>item.id===req.params.id);if(!row||row.status!=='confirmed_manual')return res.status(404).json({error:'Saque confirmado não encontrado'});const player=db.players[row.playerId];if(!player)return res.status(404).json({error:'Jogador não encontrado'});player.reservedCash+=row.cash;row.status='pending_manual';const previousHash=row.txHash;delete row.reviewedAt;delete row.txHash;try{await persistFinancialEvent({playerId:player.id,kind:'withdrawal_reopened',referenceId:`${row.id}:reopened`,tonAmount:row.tonAmount,usdAmount:row.usdAmount,tonUsd:row.tonUsd,metadata:{withdrawalId:row.id,previousHash}})}catch{player.reservedCash=Math.max(0,player.reservedCash-row.cash);row.status='confirmed_manual';row.txHash=previousHash;row.reviewedAt=now();return res.status(503).json({error:'Falha ao reabrir o saque com segurança.'})}res.json({withdrawal:row})});
app.post('/admin/withdrawals/:id/reject',adminOnly,async(req,res)=>{const row=db.withdrawals.find(item=>item.id===req.params.id);if(!row||row.status!=='pending_manual')return res.status(404).json({error:'Solicitação pendente não encontrada'});const player=db.players[row.playerId];if(!player)return res.status(404).json({error:'Jogador não encontrado'});player.reservedCash=Math.max(0,player.reservedCash-row.cash);player.cash+=row.cash;row.status='rejected';row.reviewedAt=now();try{await persistFinancialEvent({playerId:player.id,kind:'withdrawal_rejected',referenceId:`${row.id}:rejected`,cashDelta:row.cash,tonAmount:row.tonAmount,usdAmount:row.usdAmount,tonUsd:row.tonUsd,metadata:{withdrawalId:row.id}})}catch{player.reservedCash+=row.cash;player.cash-=row.cash;row.status='pending_manual';delete row.reviewedAt;return res.status(503).json({error:'Falha ao estornar com segurança. Tente novamente.'})}res.json({withdrawal:row})});

function settleExpiredGameSessions(){let changed=false;for(const player of Object.values(db.players)){if(expireTemporaryBalance(player))changed=true;if(player.fishingSession&&Date.parse(player.fishingSession.expiresAt)<=Date.now()){if(player.fishingSession.source==='bonus'){player.bonusBait??={};player.bonusBait[player.fishingSession.map]=(player.bonusBait[player.fishingSession.map]??0)+1}else if(player.fishingSession.source==='temporary'){player.temporaryBaitByMap??={};player.temporaryBaitByMap[player.fishingSession.map]=(player.temporaryBaitByMap[player.fishingSession.map]??0)+1}else{player.baitByMap??={};player.baitByMap[player.fishingSession.map]=(player.baitByMap[player.fishingSession.map]??0)+1}delete player.fishingSession;changed=true}if(player.diveSession&&Date.parse(player.diveSession.expiresAt)<=Date.now()){delete player.diveSession;changed=true}}if(changed)persist()}
// Escaneia depósitos TON e devolve lançamentos abandonados periodicamente.
setInterval(()=>{scanAndCreditTonDeposits().catch(error=>console.error('[TON] Erro no scan periódico:',error));settleExpiredGameSessions();settleFinishedSeason()},15_000);

app.listen(Number(process.env.PORT??8787),()=>console.log(`Pixel Fish API on 8787 (TON: ${TON_NETWORK})`));
