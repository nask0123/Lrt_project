import {esc} from './ui.js';
let latestTicket=null,avatar=null,revision=0,tickets=[];
const ticketsKey='astana-lrt-tickets-v1';
const validTicket=t=>t&&typeof t.id==='string'&&/^[a-f0-9-]{36}$/.test(t.id)&&Number.isFinite(Date.parse(t.issuedAt))&&t.amount===200;
const key='astana-lrt-avatar-v1';
const $=s=>document.querySelector(s);
function avatarStatus(text){$('#avatar-status').textContent=text;}
function paintAvatar(){for(const target of [$('#header-avatar'),$('#profile-avatar')]){target.replaceChildren();if(avatar){const img=document.createElement('img');img.src=avatar;img.alt='Аватар профиля';target.append(img);}else target.textContent=($('#header-name').textContent||'П').trim().charAt(0).toUpperCase();}$('#remove-avatar').hidden=!avatar;}
export function updateProfileExtras(profile){
 latestTicket=profile.latestTicket&&/^[a-f0-9-]{36}$/.test(profile.latestTicket.id)&&Number.isFinite(Date.parse(profile.latestTicket.issuedAt))?profile.latestTicket:null;
 $('#show-ticket').hidden=!latestTicket;
 if(validTicket(latestTicket)&&!tickets.some(t=>t.id===latestTicket.id)){tickets.unshift(latestTicket);tickets=tickets.slice(0,50);try{localStorage.setItem(ticketsKey,JSON.stringify(tickets));}catch{$('#tickets-storage-status').textContent='Хранилище недоступно. Новые билеты останутся только до закрытия страницы.';}}
 renderTicketHistory();
 paintAvatar();
}
export function renderTicketHistory(){
 $('#tickets-list').innerHTML=tickets.length?tickets.map(t=>`<article class="saved-ticket"><div><span class="ticket-label">ДЕМО-БИЛЕТ</span><h3>Поездка на LRT</h3><small>${esc(new Date(t.issuedAt).toLocaleString('ru-RU',{timeZone:'Asia/Qyzylorda'}))}<br>200 ₸ · ${t.id.slice(0,8)}</small></div><button class="secondary" data-ticket="${t.id}">Открыть QR</button></article>`).join(''):'<p class="empty">Билетов пока нет.<br>Купи первый демо-билет — он появится здесь.</p>';
}
export function showTicket(ticket=latestTicket){
 if(!validTicket(ticket))return;
 $('#ticket-number').textContent=ticket.id;
 $('#ticket-date').textContent=new Date(ticket.issuedAt).toLocaleString('ru-RU',{timeZone:'Asia/Qyzylorda'});
 const container=$('#ticket-qr');container.replaceChildren();
 try{const qr=window.qrcode(0,'M');qr.addData('DEMO:ASTANA-LRT:'+ticket.id);qr.make();const image=document.createElement('img');image.src=qr.createDataURL(6,24);image.alt='QR-код демонстрационного билета '+ticket.id;container.append(image);}catch{container.textContent='QR-код не загрузился. Номер билета сохранён; обнови страницу и открой «Мой QR-билет».';}
 if(!$('#ticket-dialog').open)$('#ticket-dialog').showModal();
}
export function initProfileExtras(){
 try{const saved=JSON.parse(localStorage.getItem(ticketsKey)||'[]');if(Array.isArray(saved))tickets=saved.filter(validTicket).slice(0,50);}catch{$('#tickets-storage-status').textContent='История билетов недоступна в хранилище браузера.';}
 renderTicketHistory();$('#tickets-list').onclick=e=>{const b=e.target.closest('[data-ticket]');if(b)showTicket(tickets.find(t=>t.id===b.dataset.ticket));};
 try{const saved=localStorage.getItem(key);if(saved&&saved.length<=300000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(saved))avatar=saved;}catch{avatarStatus('Хранилище браузера недоступно. Сохранение фото может не работать.');}
 paintAvatar();
 $('#show-ticket').onclick=()=>showTicket();
 $('#choose-avatar').onclick=()=>$('#avatar-file').click();
 $('#remove-avatar').onclick=()=>{revision++;try{localStorage.removeItem(key);avatar=null;paintAvatar();avatarStatus('Фото удалено.');}catch{avatarStatus('Не удалось удалить фото из хранилища браузера.');}};
 $('#avatar-file').onchange=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){avatarStatus('Выбери JPG, PNG или WebP.');return;}
  if(file.size>5*1024*1024){avatarStatus('Фото слишком большое. Максимум — 5 МБ.');return;}
  const current=++revision;$('#choose-avatar').disabled=true;avatarStatus('Подготавливаем фото…');let bitmap;
  try{bitmap=await createImageBitmap(file);if(!bitmap.width||!bitmap.height)throw Error('image');
   const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#f0f4eb';ctx.fillRect(0,0,256,256);const side=Math.min(bitmap.width,bitmap.height);ctx.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,256,256);
   const result=canvas.toDataURL('image/jpeg',.85);if(current!==revision)return;
   try{localStorage.setItem(key,result);}catch{avatarStatus('Не удалось сохранить фото: хранилище браузера недоступно или заполнено.');return;}
   avatar=result;paintAvatar();avatarStatus('Аватарка сохранена в этом браузере.');
  }catch{if(current===revision)avatarStatus('Не удалось прочитать изображение. Попробуй другой JPG, PNG или WebP.');}
  finally{bitmap?.close();$('#choose-avatar').disabled=false;}
 };
}
