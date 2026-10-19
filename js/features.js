/* EventEase: calendar, countdown, D-day reminders, auto checklists, event picker. */
(function(){
  const S=window.EventEaseStore,$=id=>document.getElementById(id),T=k=>window.EEI18n?EEI18n.t(k):k;
  const loc=()=>window.EEI18n?EEI18n.locale():'en-IN';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const TPL={
    wedding:['Book venue','Arrange catering','Decor & flowers','Photography & video','Send invitations','Music / DJ','Guest accommodation','Outfits & makeup'],
    birthday:['Choose venue','Order cake','Decor & balloons','Catering','Send invitations','Photography','Music & games'],
    conference:['Book venue','Catering','Speakers & schedule','Registration desk','Audio/visual setup','Photography','Publicity','Feedback form'],
    party:['Venue','Catering','Decor','Photography','Music','Send invitations']};
  function tplFor(t){t=(t||'').toLowerCase();return /wedding|marriage|engagement/.test(t)?TPL.wedding:/birthday/.test(t)?TPL.birthday:/conference|fest|college|workshop|meeting|corporate|seminar/.test(t)?TPL.conference:TPL.party}
  const evs=()=>S.scoped('events');
  const start=e=>new Date(e.date+'T'+(e.time||'09:00'));
  function toast(msg){const d=document.createElement('div');d.className='toast';d.setAttribute('role','status');d.textContent=msg;document.body.appendChild(d);setTimeout(()=>d.remove(),9000)}

  /* Auto checklist + reminder settings, called by app.js right after an event is created.
     Default duration: start time + duration hours = end time, only when a start time was
     actually given (nothing to add duration to otherwise) and capped at 23:59 same day,
     since events aren't modeled with a separate end date. */
  function endFromDuration(time,hours){
    if(!time||!hours)return'';
    const [h,m]=time.split(':').map(Number),total=h*60+m+Math.round(Number(hours)*60);
    const cap=Math.min(total,23*60+59),eh=Math.floor(cap/60),em=cap%60;
    return String(eh).padStart(2,'0')+':'+String(em).padStart(2,'0');
  }
  function afterCreate(ev){
    const sel=$('eventRemind')?$('eventRemind').value:'';
    const mins=sel==='custom'?Number($('eventRemindCustom').value)||0:Number(sel)||0;
    const time=$('eventTime')?$('eventTime').value:'';
    const duration=window.EESettings?EESettings.get().eventPreferences.duration:'';
    S.update('events',ev.id,{time,duration,endTime:endFromDuration(time,duration),remindMins:mins||null,reminded:false});
    if(!$('eventChecklist')||$('eventChecklist').checked)tplFor(ev.type).forEach(t=>S.add('tasks',{title:t,priority:'Medium',status:'Todo',eventId:ev.id,auto:true}));
    if(mins&&'Notification' in window&&Notification.permission==='default')Notification.requestPermission();
  }
  /* D-day reminders (browser notifications while EventEase is open or installed) */
  function beep(){const P=window.EESettings&&EESettings.get();if(!P||!P.notifications.sound)return;try{const c=new (window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);g.gain.value=.08;o.frequency.value=880;o.start();o.stop(c.currentTime+.25)}catch(x){}}
  function fire(e,st){
    const title='⏰ '+e.name,body=T('Starts')+' '+(window.EESettings?EESettings.fmtDate(st)+' '+EESettings.fmtTime(st):st.toLocaleString(loc()));toast(title+' — '+body);beep();
    if('Notification' in window&&Notification.permission==='granted'){
      const plain=()=>{try{new Notification(title,{body})}catch(x){}};
      if(navigator.serviceWorker&&navigator.serviceWorker.ready)navigator.serviceWorker.ready.then(r=>r.showNotification(title,{body,icon:'icons/icon-192.png',tag:e.id})).catch(plain);else plain();
    }
  }
  function check(){
    const P=window.EESettings&&EESettings.get();
    if(!P||P.notifications.event){
      const now=Date.now();
      evs().forEach(e=>{if(!e.date||!e.remindMins||e.reminded)return;const st=start(e);if(now>=st-e.remindMins*6e4&&now<st.getTime()+36e5){fire(e,st);S.update('events',e.id,{reminded:true})}});
    }
    /* Task reminders: a task with a due date gets one browser notification the first
       time the app is open on or after that date, same foreground-interval approach
       as event reminders (this app has no background push, so this only fires while
       EventEase is open). Nothing fires if the Task reminders setting is off. */
    if(P&&P.notifications.task){
      const today=new Date();today.setHours(0,0,0,0);
      S.scoped('tasks').forEach(t=>{
        if(!t.due||t.status==='Completed'||t.taskReminded)return;
        if(new Date(t.due+'T00:00')<=today){
          toast('✓ Task due: '+t.title);beep();
          if('Notification' in window&&Notification.permission==='granted'){
            try{new Notification('✓ Task due',{body:t.title})}catch(x){}
          }
          S.update('tasks',t.id,{taskReminded:true});
        }
      });
    }
  }
  /* Countdown */
  function tick(){
    const b=$('countdownBox');if(!b)return;const now=Date.now();
    const e=evs().filter(x=>x.date&&start(x)>now&&x.status!=='Cancelled').sort((a,c)=>start(a)-start(c))[0];
    if(!e){b.innerHTML='<div class="empty">—</div>';return}
    const d=start(e)-now,D=Math.floor(d/864e5),H=Math.floor(d%864e5/36e5),M=Math.floor(d%36e5/6e4),X=Math.floor(d%6e4/1e3);
    b.innerHTML='<strong class="cd-name">'+esc(e.name)+'</strong><div class="cd-row">'+[[D,'d'],[H,'h'],[M,'m'],[X,'s']].map(a=>'<span class="cd-unit"><b>'+a[0]+'</b>'+a[1]+'</span>').join('')+'</div><small>'+D+' '+T('days left')+'</small>';
  }
  /* Calendar */
  let cal=new Date();cal.setDate(1);let picked=null;
  const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  function dayList(items){return items.length?items.map(e=>'<div class="event-item"><div><h3>'+esc(e.name)+'</h3><p>'+esc(e.type||'')+' · '+(window.EESettings?EESettings.fmtDate(e.date+'T00:00'):e.date)+(e.time?' · '+esc(e.time):'')+'</p></div></div>').join(''):'<div class="empty">—</div>'}
  function drawCal(){
    const g=$('calGrid');if(!g)return;const all=evs().filter(e=>e.date),by={};all.forEach(e=>(by[e.date]=by[e.date]||[]).push(e));
    const remBy={};
    S.scoped('reminders').filter(r=>r.date&&!r.completed).forEach(r=>(remBy[r.date]=remBy[r.date]||[]).push(r));
    $('calTitle').textContent=cal.toLocaleDateString(loc(),{month:'long',year:'numeric'});
    let h='';for(let i=0;i<7;i++)h+='<div class="cal-h">'+new Date(2023,0,1+i).toLocaleDateString(loc(),{weekday:'short'})+'</div>';
    const first=cal.getDay(),n=new Date(cal.getFullYear(),cal.getMonth()+1,0).getDate(),today=ymd(new Date());
    for(let i=0;i<first;i++)h+='<div class="cal-c off"></div>';
    for(let d=1;d<=n;d++){const k=ymd(new Date(cal.getFullYear(),cal.getMonth(),d)),c=(by[k]||[]).length;
      const rc=(remBy[k]||[]).length;h+='<button type="button" class="cal-c'+(k===today?' today':'')+(k===picked?' sel':'')+(rc?' has-rem':'')+'" data-day="'+k+'" aria-label="'+k+(c?', '+c+' events':'')+(rc?', '+rc+' reminders':'')+'">'+d+(c?'<i>'+(c>1?c:'')+'</i>':'')+(rc?'<b class="rem-dot"></b>':'')+'</button>'}
    g.innerHTML=h;
    const up=all.filter(e=>start(e)>=new Date(new Date().setHours(0,0,0,0))).sort((a,b)=>start(a)-start(b));
    const remList=(picked?(remBy[picked]||[]):S.scoped('reminders').filter(r=>r.date&&!r.completed&&r.date>=ymd(new Date())).sort((a,b)=>(a.date||'').localeCompare(b.date||'')).slice(0,8));
    const remHtml=remList.length?'<h3 class="cal-rem-h">Reminders</h3>'+remList.map(r=>'<div class="event-item rem-item"><div><h3>'+esc(r.title)+'</h3><p>'+esc(r.date||'')+(r.time?' · '+esc(r.time):'')+'</p></div></div>').join(''):'';
    $('calDay').innerHTML='<h3>'+(picked?picked:T('Upcoming'))+'</h3>'+dayList(picked?(by[picked]||[]):up)+remHtml+
      '<p class="cal-legend"><span class="leg-ev">Event</span> <span class="leg-rem">Reminder</span></p>';
    g.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{picked=picked===b.dataset.day?null:b.dataset.day;drawCal()});
  }
  /* Event picker on Tasks / Guests / Budget / Venue */
  function pickers(){
    const list=evs(),cur=window.EEApp&&EEApp.selected();
    ['tasks','guests','budget','venue'].forEach(id=>{
      const p=$(id);if(!p||!p.classList.contains('panel'))return;let s=p.querySelector('.event-picker');
      if(!s){s=document.createElement('select');s.className='event-picker';s.setAttribute('aria-label','Event');const hd=p.querySelector('.panel-head');hd.after(s);s.onchange=()=>window.EEApp&&EEApp.select(s.value)}
      s.innerHTML=list.length?list.map(e=>'<option value="'+e.id+'"'+(e.id===cur?' selected':'')+'>'+esc(e.name)+'</option>').join(''):'<option>—</option>';
    });
  }
  /* Dashboard: Your Events cards — select any event for insights (All Events Overview is separate above) */
  function dash(){
    const box=$('dashFocus');if(!box)return;
    const all=evs().filter(e=>e.status!=='Archived');
    if(!all.length){
      box.innerHTML='<div class="empty empty-events"><div class="empty-visual" aria-hidden="true">✦</div><div class="empty-title">No events yet</div><p>Create your first event to get started.</p><button type="button" class="btn btn-primary btn-small" data-view-target="events">+ Create Event</button></div>';
      return;
    }
    const EV_ICON=(t)=>{t=(t||'').toLowerCase();if(/wedding|marriage|engagement/.test(t))return'💍';if(/birthday|bday/.test(t))return'🎂';if(/conference|seminar|workshop|summit|corporate|meetup|hackathon/.test(t))return'🎤';if(/college|fest|university/.test(t))return'🎓';if(/party|celebration|anniversary/.test(t))return'🎊';return'🎉'};
    const EV_COVER=(t)=>{t=(t||'').toLowerCase();if(/wedding|marriage|engagement/.test(t))return'cover-wedding';if(/birthday|bday/.test(t))return'cover-birthday';if(/conference|seminar|workshop|summit|corporate|meetup|hackathon/.test(t))return'cover-corporate';if(/college|fest|university/.test(t))return'cover-college';if(/party|celebration|anniversary/.test(t))return'cover-party';return'cover-default'};
    box.innerHTML='<div class="ev-grid dash-ev-grid">'+all.map(ev=>{
      const ta=S.scoped('tasks').filter(x=>x.eventId===ev.id),gu=S.scoped('guests').filter(x=>x.eventId===ev.id),ex=S.scoped('expenses').filter(x=>x.eventId===ev.id);
      const done=ta.filter(x=>x.status==='Completed').length,guestCount=ev.guestTarget||gu.length;
      const spent=ex.reduce((a,x)=>a+(+x.amount||0),0),plan=+ev.budget||0;
      const pct=ta.length?Math.round(done/ta.length*100):0;
      const status=ev.status||'Planning';
      const dateStr=ev.date?(window.EESettings?EESettings.fmtDate(ev.date+'T00:00'):ev.date):'No date';
      const loc=ev.location?esc(ev.location):'';
      return '<article class="ev-card dash-ev-card'+(window.EEApp&&EEApp.selected()===ev.id?' selected':'')+'" data-event-id="'+ev.id+'">'+
        '<div class="ev-card-cover '+EV_COVER(ev.type)+'" role="img" aria-label="'+esc(ev.type||'Event')+' cover">'+
          '<span class="ev-card-cover-icon" aria-hidden="true">'+EV_ICON(ev.type)+'</span>'+
          '<span class="ev-card-type">'+esc(ev.type||'Event')+'</span>'+
        '</div>'+
        '<div class="ev-card-body">'+
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">'+
            '<h3 class="ev-card-title">'+esc(ev.name)+'</h3>'+
            '<span class="status-pill '+status.toLowerCase()+'">'+esc(status)+'</span>'+
          '</div>'+
          '<div class="ev-card-meta"><span>'+esc(dateStr)+'</span>'+(loc?'<span>📍 '+loc+'</span>':'')+'</div>'+
          '<div class="ev-card-stats">'+
            '<div class="ev-stat"><strong>'+guestCount+'</strong><span>Guests</span></div>'+
            '<div class="ev-stat"><strong>'+done+'/'+(ta.length||0)+'</strong><span>Tasks</span></div>'+
            '<div class="ev-stat"><strong>₹'+plan.toLocaleString('en-IN')+'</strong><span>Budget</span></div>'+
          '</div>'+
          '<div class="ev-card-progress" aria-label="'+pct+'% tasks complete"><span style="width:'+pct+'%"></span></div>'+
          '<div class="ev-card-actions">'+
            '<button type="button" class="btn btn-small btn-primary" data-ws-open="'+ev.id+'">Open</button>'+
            '<button type="button" class="btn btn-small" data-ws-open="'+ev.id+'" data-ws-tab="settings">Edit</button>'+
            '<button type="button" class="btn btn-small" data-share="'+ev.id+'">Share</button>'+
            '<button type="button" class="btn btn-small" data-ws-open="'+ev.id+'" data-ws-tab="guests">Guests</button>'+
            '<button type="button" class="btn btn-small danger-btn" data-delete-event="'+ev.id+'">Delete</button>'+
          '</div>'+
        '</div></article>';
    }).join('')+'</div>';
    // Upcoming reminders strip
    const upRem = (window.EEReminders && EEReminders.upcoming)
      ? EEReminders.upcoming(6, window.EEApp && EEApp.selected())
      : [];
    const remHtml = upRem.length
      ? '<section class="dash-reminders"><h3>Upcoming reminders</h3><ul class="dash-todo">'+
        upRem.map(r=>{
          const en = all.find(e=>e.id===r.eventId);
          return '<li><span>'+esc(r.title)+'</span><small>'+esc((en&&en.name)||'')+' · '+esc(r.date||'')+(r.time?' · '+esc(r.time):'')+'</small></li>';
        }).join('')+'</ul><button type="button" class="btn btn-small" data-view-target="reminders">All reminders →</button></section>'
      : '<section class="dash-reminders"><h3>Upcoming reminders</h3><p>No upcoming reminders. <button type="button" class="btn btn-small" data-view-target="reminders">Add reminder</button></p></section>';
    box.innerHTML += remHtml;
  }
  function refresh(){drawCal();pickers();tick();dash()}
  document.addEventListener('ee:render',refresh);document.addEventListener('ee:lang',refresh);
  if($('calPrev')){$('calPrev').onclick=()=>{cal.setMonth(cal.getMonth()-1);drawCal()};$('calNext').onclick=()=>{cal.setMonth(cal.getMonth()+1);drawCal()}}
  const rs=$('eventRemind');if(rs)rs.onchange=()=>{$('eventRemindCustom').hidden=rs.value!=='custom'};
  (function(){const P=window.EESettings&&EESettings.get();if(!P)return;const has=(el,v)=>[...el.options].some(o=>o.value===v);if(rs&&has(rs,P.eventPreferences.reminder))rs.value=P.eventPreferences.reminder;const ty=$('eventType');if(ty&&!ty.value&&(ty.tagName!=='SELECT'||has(ty,P.eventPreferences.type)))ty.value=P.eventPreferences.type})();
  window.EEFeatures={afterCreate};
  refresh();check();setInterval(tick,1000);setInterval(check,30000);
})();
