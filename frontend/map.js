let map,routeBounds,trainMarkers=new Map(),stationMarkers=[],lastData,follow=false,journeyLayer,userMarker,accuracyCircle;
const L=window.L;
export function initGeoMap(data,onTrain,onStation){
 if(!L){document.querySelector('#map-status').textContent='Не удалось загрузить библиотеку карты. Обнови страницу.';return;}
 map=L.map('map',{zoomControl:false,scrollWheelZoom:false,zoomSnap:.25,minZoom:3,maxZoom:19});
 const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',keepBuffer:2}).addTo(map);
 let failed=0;tiles.on('tileerror',()=>{failed++;if(failed>=3){document.querySelector('#map-status').textContent='Подложка карты недоступна. Проверь интернет; линия и поезда продолжают работать.';document.querySelector('#map-status').hidden=false;}});
 tiles.on('tileload',()=>{failed=0;document.querySelector('#map-status').hidden=true;});
 L.control.scale({imperial:false,position:'bottomleft'}).addTo(map);
 const points=data.routeGeometry;
 L.polyline(points,{color:'#fff',weight:10,opacity:.9,interactive:false}).addTo(map);
 L.polyline(points,{color:'#087c65',weight:5,opacity:.95,interactive:false}).addTo(map);
 routeBounds=L.latLngBounds(points);
 for(const s of data.stations){
  const icon=L.divIcon({className:'geo-station',html:`<span>${s.id}</span>`,iconSize:[28,28],iconAnchor:[14,14]});
  const marker=L.marker([s.lat,s.lng],{icon,title:s.name,alt:'Станция '+s.name,keyboard:true,zIndexOffset:100}).addTo(map).bindTooltip(s.name+(s.estimated?' · приблизительно':''),{direction:'right',offset:[13,0],className:'station-tooltip'}).on('click',()=>onStation(s.id));stationMarkers.push(marker);
 }
 for(const t of data.trains){
  const icon=L.divIcon({className:'geo-train',html:`<span class="train-body"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="16" rx="4"/><path d="M8 19l-2 3m10-3 2 3M8 7h8v5H8z"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/></svg><b>${t.id.slice(4)}</b></span>`,iconSize:[45,34],iconAnchor:[22,17]});
  const marker=L.marker([t.lat,t.lng],{icon,title:t.id,alt:'Выбрать поезд '+t.id,keyboard:true,zIndexOffset:600}).addTo(map).on('click',()=>onTrain(t.id));trainMarkers.set(t.id,marker);
 }
 map.on('dragstart',()=>setFollow(false));
 map.on('zoomstart',()=>document.querySelector('#map').classList.add('map-zooming'));
 map.on('zoomend',()=>{document.querySelector('#map').classList.remove('map-zooming');document.querySelector('#map').classList.toggle('map-overview',map.getZoom()<14);});
 new ResizeObserver(()=>{map.invalidateSize({pan:false});}).observe(document.querySelector('#map'));
 document.querySelector('#zoom-in').onclick=()=>map.zoomIn();document.querySelector('#zoom-out').onclick=()=>map.zoomOut();document.querySelector('#reset-map').onclick=()=>{setFollow(false);fitRoute();};
 document.querySelector('#follow-train').onclick=()=>setFollow(!follow);
 fitRoute();
}
function fit(bounds){const mobile=window.innerWidth<=720;map.fitBounds(bounds,{paddingTopLeft:mobile?[24,80]:[window.innerWidth<=1000?370:420,85],paddingBottomRight:mobile?[64,195]:[85,55],maxZoom:13,animate:false});}
export function fitRoute(){if(map&&document.querySelector('#map').clientWidth)fit(routeBounds);}
export function refreshMap(){requestAnimationFrame(()=>{if(map){map.invalidateSize({pan:false});if(!map._loaded)fitRoute();}});}
export function highlightJourney(stations){if(!map)return;if(journeyLayer){map.removeLayer(journeyLayer);journeyLayer=null;}if(stations){setFollow(false);journeyLayer=L.polyline(stations.map(s=>[s.lat,s.lng]),{color:'#80b848',weight:8,opacity:.95,interactive:false}).addTo(map);fit(journeyLayer.getBounds());}}
export function showUserLocation(point,accuracy){if(!map)return;if(userMarker)map.removeLayer(userMarker);if(accuracyCircle)map.removeLayer(accuracyCircle);accuracyCircle=L.circle([point.lat,point.lng],{radius:accuracy,color:'#3479cc',weight:1,fillOpacity:.08,interactive:false}).addTo(map);userMarker=L.circleMarker([point.lat,point.lng],{radius:8,color:'#fff',weight:3,fillColor:'#3479cc',fillOpacity:1}).addTo(map).bindTooltip('Ты здесь');setFollow(false);map.setView([point.lat,point.lng],14,{animate:false});}
function setFollow(value){follow=value;const b=document.querySelector('#follow-train');b.setAttribute('aria-pressed',String(follow));b.textContent=follow?'● Слежение включено':'◎ Следить за поездом';if(follow&&lastData)focusTrain(lastData.selected);}
export function focusTrain(id){const marker=trainMarkers.get(id);if(marker){map.setView(marker.getLatLng(),Math.max(map.getZoom(),14),{animate:false});const mobile=window.innerWidth<=720,card=document.querySelector('#train-card');map.panBy(mobile?[0,Math.min(180,card.offsetHeight/2)]:[-120,0],{animate:false});}}
export function updateGeoMap(data,selected){lastData={data,selected};if(!map)return;for(const t of data.trains){const marker=trainMarkers.get(t.id);marker.setLatLng([t.lat,t.lng]);const el=marker.getElement();el?.classList.toggle('chosen',t.id===selected);el?.classList.toggle('reverse',t.to<t.from);marker.setZIndexOffset(t.id===selected?1100:600);}
 if(follow)focusTrain(selected);
}
