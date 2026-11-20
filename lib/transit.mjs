import {geoStations,routeGeometry} from './geography.mjs';
// Project geographic coordinates; simplified geometry and simulated train positions.
export const stations = geoStations.map(s=>({...s,x:s.lng,y:s.lat}));
export const fleet={total:19,active:15,reserve:4,carsPerTrain:4,capacityPerTrain:650,activeCars:60,totalCars:76};
export const dwell=25;
export const durations=Array.from({length:17},(_,i)=>180+(i*17)%61);
const targetTravel=15*330/2-17*dwell;
const baseTotal=durations.reduce((a,b)=>a+b,0);
export function timetable(mode='interval'){
 const times=mode==='classic'?durations:durations.map(t=>t*targetTravel/baseTotal);
 const legs=Array.from({length:34},(_,i)=>{const from=i<17?i:34-i;const to=i<17?i+1:33-i;return {from,to,duration:times[Math.min(from,to)]};});
 const cycle=legs.reduce((n,l)=>n+l.duration+dwell,0);
 return {legs,cycle,durations:times,headway:cycle/fleet.active};
}
export const {legs,cycle}=timetable('classic');
const mod=(n,d)=>((n%d)+d)%d;
function trainPhase(index,now,model){return mod(now/1000+index*model.headway,model.cycle);}
export function trainAt(index,now=Date.now(),mode='interval'){
 const model=timetable(mode);let t=trainPhase(index,now,model);
 for(let k=0;k<model.legs.length;k++){
  const leg=model.legs[k],span=leg.duration+dwell;
  if(t<span){const stopped=t<dwell,progress=stopped?0:(t-dwell)/leg.duration,a=stations[leg.from],b=stations[leg.to];
   // Passenger counts change only at station boundaries and remain within car capacity.
   const carCapacities=[163,162,162,163];const trip=Math.floor((now/1000+index*model.headway)/model.cycle);
   const cars=carCapacities.map((capacity,i)=>{const load=20+mod(index*19+k*11+i*13+trip*7,70);return {number:i+1,capacity,passengers:Math.round(capacity*load/100)};});
   const passengers=cars.reduce((n,c)=>n+c.passengers,0);
   return {id:`LRT-${String(index+1).padStart(2,'0')}`,from:a.id,to:b.id,direction:leg.to>leg.from?'Нұрлы жол':'Аэропорт',x:a.x+(b.x-a.x)*progress,y:a.y+(b.y-a.y)*progress,lat:a.lat+(b.lat-a.lat)*progress,lng:a.lng+(b.lng-a.lng)*progress,progress,stopped,eta:Math.ceil(span-t),duration:Math.round(leg.duration),cars,capacity:650,passengers,occupancy:Math.round(passengers/650*100)};
  }t-=span;
 }
}
export function arrivalsAt(stationId,now=Date.now(),mode='interval'){
 const model=timetable(mode),events=[];let elapsed=0;
 for(const leg of model.legs){elapsed+=dwell+leg.duration;if(stations[leg.to].id===stationId)events.push({phase:elapsed,direction:leg.to>leg.from?'Нұрлы жол':'Аэропорт'});}
 return Array.from({length:fleet.active},(_,i)=>events.map(event=>({trainId:`LRT-${String(i+1).padStart(2,'0')}`,direction:event.direction,eta:Math.ceil(mod(event.phase-trainPhase(i,now,model),model.cycle))}))).flat().sort((a,b)=>a.eta-b.eta);
}
export function snapshot(now=Date.now(),mode='interval'){
 const model=timetable(mode);
 return {mode:'simulation',scenario:mode,serverTime:now,routeGeometry,stations:stations.map(s=>({...s,arrivals:arrivalsAt(s.id,now,mode).slice(0,6)})),fleet,reserves:Array.from({length:fleet.reserve},(_,i)=>({id:`LRT-${16+i}`,status:'reserve',cars:4,capacity:650})),trains:Array.from({length:fleet.active},(_,i)=>trainAt(i,now,mode)),segmentSeconds:{min:Math.round(Math.min(...model.durations)),max:Math.round(Math.max(...model.durations))},dwellSeconds:dwell,headwaySeconds:Math.round(model.headway),cycleSeconds:Math.round(model.cycle),oneWaySeconds:Math.round(model.cycle/2)};
}

// Choose the next departure in the requested direction, including a train dwelling now.
export function journeyPlan(from,to,now=Date.now(),mode='interval'){
 const start=stations.findIndex(s=>s.id===from),end=stations.findIndex(s=>s.id===to);
 if(start<0||end<0||start===end)throw new Error('Выбери две разные станции');
 const model=timetable(mode),direction=Math.sign(end-start);
 let elapsed=0,departurePhase=0;
 for(const leg of model.legs){if(leg.from===start&&leg.to-leg.from===direction){departurePhase=elapsed+dwell;break;}elapsed+=dwell+leg.duration;}
 const candidates=Array.from({length:fleet.active},(_,i)=>({index:i,wait:mod(departurePhase-trainPhase(i,now,model),model.cycle)})).sort((a,b)=>a.wait-b.wait);
 const best=candidates[0],count=Math.abs(end-start);let ride=0;
 for(let i=start;i!==end;i+=direction)ride+=model.durations[Math.min(i,i+direction)];
 ride+=Math.max(0,count-1)*dwell;
 return {mode:'simulation',scenario:mode,from,to,trainId:`LRT-${String(best.index+1).padStart(2,'0')}`,direction:direction>0?'Нұрлы жол':'Аэропорт',stopCount:count,stationIds:Array.from({length:count+1},(_,i)=>stations[start+i*direction].id),waitSeconds:Math.ceil(best.wait),rideSeconds:Math.ceil(ride),totalSeconds:Math.ceil(best.wait+ride),departureTime:now+best.wait*1000,arrivalTime:now+(best.wait+ride)*1000,serverTime:now};
}
