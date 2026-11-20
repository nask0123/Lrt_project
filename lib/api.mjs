import {snapshot,journeyPlan} from './transit.mjs';
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const initial=()=>({name:'Пассажир',balance:2500,history:[]});
function profile(req){try{const value=(req.headers.get('cookie')||'').split('; ').find(x=>x.startsWith('lrt_demo='))?.slice(9);if(!value)return initial();const p=JSON.parse(decodeURIComponent(value));if(typeof p.name!=='string'||!Number.isSafeInteger(p.balance)||p.balance<0||!Array.isArray(p.history))return initial();return p;}catch{return initial();}}
export async function api(req){const path=new URL(req.url).pathname;
 if(path==='/api/journey'&&req.method==='GET'){
 const params=new URL(req.url).searchParams,mode=params.get('scenario')||'interval';
 if(!['interval','classic'].includes(mode))return json({error:'Неизвестный сценарий'},400);
 try{return json(journeyPlan(Number(params.get('from')),Number(params.get('to')),Date.now(),mode));}catch(error){return json({error:error.message},400);}
 }
 if(path==='/api/transit'&&req.method==='GET'){
 const mode=new URL(req.url).searchParams.get('scenario')||'interval';
 if(!['interval','classic'].includes(mode))return json({error:'Неизвестный сценарий'},400);
 return json(snapshot(Date.now(),mode));
 }
 if(path==='/api/profile'&&req.method==='GET')return json({...profile(req),demo:true});
 if(['/api/profile','/api/topup','/api/ticket'].includes(path)&&req.method==='POST'){
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return json({error:'Недопустимый источник'},403);
 let body;try{const raw=await req.text();if(raw.length>2048)return json({error:'Слишком большой запрос'},413);body=JSON.parse(raw);}catch{return json({error:'Некорректный JSON'},400);}
 if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Ожидается JSON-объект'},400);
 const p=profile(req);let amount=0,label='';
 if(path==='/api/profile'){if(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>40)return json({error:'Имя: от 1 до 40 символов'},400);p.name=body.name.trim();}
 if(path==='/api/topup'){if(![500,1000,2000].includes(body.amount))return json({error:'Выберите 500, 1 000 или 2 000 ₸'},400);amount=body.amount;label='Демо-пополнение';}
 if(path==='/api/ticket'){if(p.balance<200)return json({error:'Недостаточно демо-средств'},409);amount=-200;label='Тестовая поездка';p.latestTicket={id:crypto.randomUUID(),issuedAt:new Date().toISOString(),amount:200};}
 if(amount){p.balance+=amount;p.history=[{id:crypto.randomUUID(),label,amount,date:new Date().toISOString()},...p.history].slice(0,8);}
 return json({...p,demo:true},200,{'Set-Cookie':`lrt_demo=${encodeURIComponent(JSON.stringify(p))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${new URL(req.url).protocol==='https:'?'; Secure':''}`});
 }return json({error:'Не найдено'},404);
}
