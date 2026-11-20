import test from 'node:test';
import assert from 'node:assert/strict';
import {journeyPlan,stations,timetable,trainAt} from '../lib/transit.mjs';
import {api} from '../lib/api.mjs';
import {distanceMeters,nearestStation} from '../frontend/ui.js';
test('Every route selects a train departing in the correct direction and reaching destination on time',()=>{
 for(const mode of ['interval','classic'])for(const from of stations)for(const to of stations){
  if(from.id===to.id)continue;
  const now=1234567890123,p=journeyPlan(from.id,to.id,now,mode),index=Number(p.trainId.slice(4))-1;
  assert.ok(p.waitSeconds>=0&&p.waitSeconds<=Math.ceil(timetable(mode).headway));
  assert.equal(p.stationIds[0],from.id);assert.equal(p.stationIds.at(-1),to.id);
  const departure=trainAt(index,p.departureTime+1,mode),arrival=trainAt(index,p.arrivalTime+1,mode);
  assert.equal(departure.from,from.id);assert.equal(Math.sign(departure.to-departure.from),Math.sign(to.id-from.id));
  assert.equal(arrival.from,to.id);assert.equal(arrival.stopped,true);
  assert.ok(distanceMeters(arrival,to)<1);assert.ok(p.totalSeconds>=p.rideSeconds);
 }
});
test('Journey API rejects invalid stations and scenarios',async()=>{
 for(const query of ['from=101&to=101','from=0&to=118','from=x&to=102','from=101&to=118&scenario=x'])assert.equal((await api(new Request('http://localhost/api/journey?'+query))).status,400);
 const r=await api(new Request('http://localhost/api/journey?from=118&to=101'));assert.equal(r.status,200);assert.equal((await r.json()).direction,'Аэропорт');
});
test('Nearest station handles on-station positions and distant users',()=>{
 for(const s of stations){const n=nearestStation(s,stations);assert.equal(n.id,s.id);assert.equal(n.distance,0);}
 const n=nearestStation({lat:43.24,lng:76.92},stations);assert.ok(n.distance>900000);assert.ok(n.distance<1100000);
 assert.ok(Math.abs(distanceMeters({lat:0,lng:0},{lat:0,lng:1})-111195)<1);
});
