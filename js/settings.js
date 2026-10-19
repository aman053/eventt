
/* EventEase settings: one object in localStorage (eventease_settings), applied on every page; UI renders on settings.html. */
(function(){
  const KEY='eventease_settings',AIK='eventease_ai_history',VERSION='1.0.0';
  const DEF={language:'en',theme:'dark',notifications:{event:true,task:true,sound:false},eventPreferences:{duration:'2',reminder:'30',type:'Conference'},timeFormat:'12',dateFormat:'DD/MM/YYYY',aiAssistant:true,aiModel:'gpt-4o-mini',accessibility:{largeText:false,reducedMotion:false}};
  const merge=(d,s)=>{const o={};for(const k in d)o[k]=d[k]&&typeof d[k]==='object'?merge(d[k],(s&&s[k])||{}):(s&&s[k]!==undefined?s[k]:d[k]);return o};
  function load(){let s={};try{s=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){}
    if(!s.language){try{const l=localStorage.getItem('eventease_language')||localStorage.getItem('ee_lang');if(l)s.language=l}catch(e){}}
    return merge(DEF,s)}
  let cfg=load();
  const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(cfg));localStorage.setItem('eventease_language',cfg.language)}catch(e){}};
  function apply(){const r=document.documentElement;r.dataset.theme=cfg.theme;r.style.colorScheme=cfg.theme==='light'?'light':'dark';const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=cfg.theme==='light'?'#F5F4F1':'#090A0C';r.classList.toggle('large-text',!!cfg.accessibility.largeText);r.classList.toggle('reduce-motion',!!cfg.accessibility.reducedMotion);r.classList.toggle('ai-off',!cfg.aiAssistant);r.lang=cfg.language}
  function set(path,val){const p=path.split('.');let o=cfg;while(p.length>1)o=o[p.shift()];o[p[0]]=val;persist();apply();document.dispatchEvent(new Event('ee:settings'))}
  const loc=()=>({en:'en-IN',hi:'hi-IN',ml:'ml-IN'}[cfg.language]||'en-IN');
  const p2=n=>String(n).padStart(2,'0');
  function fmtDate(d){d=new Date(d);const D=p2(d.getDate()),M=p2(d.getMonth()+1),Y=d.getFullYear();return cfg.dateFormat==='MM/DD/YYYY'?M+'/'+D+'/'+Y:cfg.dateFormat==='YYYY-MM-DD'?Y+'-'+M+'-'+D:D+'/'+M+'/'+Y}
  function fmtTime(d){d=new Date(d);return d.toLocaleTimeString(loc(),{hour:'2-digit',minute:'2-digit',hour12:cfg.timeFormat==='12'})}
  window.EESettings={get:()=>cfg,set,fmtDate,fmtTime,apply};
  apply();
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.__eeInstall=e;document.dispatchEvent(new Event('ee:install'))});
  window.addEventListener('appinstalled',()=>{window.__eeInstall=null;document.dispatchEvent(new Event('ee:install'))});

  const root=document.getElementById('settingsRoot');if(!root)return;
  const S=window.EventEaseStore,COLL=['events','guests','tasks','expenses','venues','schedule'];
  const OPT={language:[['en','English'],['hi','Hindi — हिन्दी'],['ml','Malayalam — മലയാളം']],theme:[['dark','Obsidian Gold (Dark)'],['light','Light'],['glass','Liquid Glass']],
    duration:[['1','1 hour'],['2','2 hours'],['3','3 hours'],['4','4 hours'],['8','Full day (8 hours)']],reminder:[['15','15 minutes before'],['30','30 minutes before'],['60','1 hour before'],['1440','1 day before']],
    type:['Conference','Wedding','Birthday','Party','Workshop','Meeting','College fest'],timeFormat:[['12','12-hour'],['24','24-hour']],dateFormat:['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD'],
    aiModel:[['gpt-4o-mini','GPT-4o mini (default)'],['gpt-4.1-nano','GPT-4.1 nano'],['gpt-4.1-mini','GPT-4.1 mini'],['claude-haiku-4.5','Claude Haiku 4.5']]};
  const plain=t=>t.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').toLowerCase();
  const item=(icon,title,desc,ctl,inline)=>'<div class="setting-item'+(inline?' has-inline':'')+'" data-s="'+plain(title+' '+desc)+'"><span class="setting-icon" aria-hidden="true">'+icon+'</span><div class="setting-content"><span class="setting-title">'+title+'</span><span class="setting-description">'+desc+'</span>'+(inline?'':'<div class="setting-control">'+ctl+'</div>')+'</div>'+(inline?'<div class="setting-control inline">'+ctl+'</div>':'')+'</div>';
  const sel=(p,o,aria)=>'<select class="set-sel" data-path="'+p+'" aria-label="'+aria+'">'+o.map(x=>{const a=Array.isArray(x)?x:[x,x];return '<option value="'+a[0]+'">'+a[1]+'</option>'}).join('')+'</select>';
  const tog=(p,a)=>'<button type="button" class="switch" role="switch" aria-checked="false" data-path="'+p+'" aria-label="'+a+'"></button>';
  const btn=(id,l)=>'<button type="button" class="btn set-btn" id="'+id+'">'+l+'</button>';
  const card=(t,body)=>'<section class="set-card" aria-label="'+plain(t)+'"><h2 class="set-group">'+t+'</h2>'+body+'</section>';
  const esc=v=>String(v==null?'':v).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  function accountCard(){const u=S&&S.currentUser();if(!u)return '';
    return '<section class="set-card" aria-label="account"><h2 class="set-group">Account</h2><form class="acct-form" id="profileForm"><div class="field"><label for="acName">Name</label><input id="acName" value="'+esc(u.name)+'" required autocomplete="name"></div><div class="field"><label for="acEmail">Email</label><input id="acEmail" type="email" value="'+esc(u.email)+'" required autocomplete="email"></div><button class="btn btn-primary set-btn" type="submit">Save profile</button><p class="acct-msg" id="profileMsg" role="status"></p></form><form class="acct-form" id="pwForm"><h3>Change password</h3><div class="field"><label for="pwCur">Current password</label><input id="pwCur" type="password" required autocomplete="current-password"></div><div class="field"><label for="pwNew">New password</label><input id="pwNew" type="password" minlength="6" required autocomplete="new-password"></div><div class="field"><label for="pwCf">Confirm new password</label><input id="pwCf" type="password" minlength="6" required autocomplete="new-password"></div><button class="btn set-btn" type="submit">Change password</button><p class="acct-msg" id="pwMsg" role="status"></p></form></section>'}
  function wireAccount(){const pf=document.getElementById('profileForm');if(!pf)return;
    const say=(id,t,bad)=>{const m=document.getElementById(id);m.textContent=t;m.style.color=bad?'#a44a3c':'#2f6b3f'};
    pf.onsubmit=e=>{e.preventDefault();const u=S.currentUser(),name=document.getElementById('acName').value.trim(),email=document.getElementById('acEmail').value.trim().toLowerCase();
      if(!name)return say('profileMsg','Please enter your name.',1);if(!/^\S+@\S+\.\S+$/.test(email))return say('profileMsg','Enter a valid email address.',1);
      const d=S.db(),me=d.users.find(x=>x.email===u.email);if(email!==u.email&&d.users.some(x=>x.email===email))return say('profileMsg','That email is already used by another account.',1);
      if(email!==u.email){['events','guests','tasks','expenses','venues'].forEach(k=>d[k].forEach(i=>{if(i.userEmail===u.email)i.userEmail=email}));me.email=email}
      me.name=name;S.save(d);if(email!==u.email)S.setSession(email);say('profileMsg','Profile updated ✓')};
    document.getElementById('pwForm').onsubmit=e=>{e.preventDefault();const u=S.currentUser(),cur=document.getElementById('pwCur').value,nw=document.getElementById('pwNew').value,cf=document.getElementById('pwCf').value,d=S.db(),me=d.users.find(x=>x.email===u.email);
      if(me.password!==cur)return say('pwMsg','Current password is incorrect.',1);if(nw.length<6)return say('pwMsg','New password must be at least 6 characters.',1);if(nw!==cf)return say('pwMsg','New passwords do not match.',1);
      me.password=nw;S.save(d);e.target.reset();say('pwMsg','Password changed ✓')}}
  root.innerHTML='<label class="set-search"><span aria-hidden="true">🔍</span><input id="setSearch" type="search" placeholder="Search settings" aria-label="Search settings" autocomplete="off"></label>'+accountCard()+
   card('General',item('🌐','Language','Choose your preferred language for EventEase.',sel('language',OPT.language,'Language'))+item('🎨','Appearance','Obsidian Gold (recommended), Light, or classic Liquid Glass.',sel('theme',OPT.theme,'Appearance')))+
   card('Notifications',item('🔔','Event reminders','Browser notifications before your events.',tog('notifications.event','Event reminders'),1)+item('✅','Task reminders','Notify me once a task\u2019s due date arrives, while EventEase is open.',tog('notifications.task','Task reminders'),1)+item('🔊','Notification sounds','Play a sound with notifications.',tog('notifications.sound','Notification sounds'),1))+
   card('Event Preferences',item('⏱️','Default duration','How long new events last by default.',sel('eventPreferences.duration',OPT.duration,'Default duration'))+item('⏰','Reminder time','When to remind you by default.',sel('eventPreferences.reminder',OPT.reminder,'Reminder time'))+item('🏷️','Default event type','Pre-selected when creating an event.',sel('eventPreferences.type',OPT.type,'Default event type')))+
   card('Date &amp; Time',item('🕐','Time format','Show times in 12-hour or 24-hour style.',sel('timeFormat',OPT.timeFormat,'Time format'))+item('📆','Date format','Choose how dates are written.',sel('dateFormat',OPT.dateFormat,'Date format')))+
   card('AI Assistant',item('🤖','AI Assistant','Show the floating AI button and chat.',tog('aiAssistant','AI Assistant'),1)+item('🧠','AI model','Cloud model used for the assistant (free options on your account).',sel('aiModel',OPT.aiModel,'AI model'))+item('🧹','Clear conversation','Removes AI chat history saved on this device.',btn('clearAi','Clear conversation')))+
   card('Data &amp; Privacy',item('📤','Export data','Download your events, guests, tasks and settings as JSON.',btn('exportData','Export data'))+item('🗑️','Clear local data','Removes EventEase data and preferences stored in this browser.',btn('clearData','Clear local data')))+
   card('App',item('📱','Install EventEase','<span id="installStatus"></span>',btn('installBtn','Install')))+
   card('Accessibility',item('🔠','Larger text','Increase text size across the app.',tog('accessibility.largeText','Larger text'),1)+item('🎞️','Reduced animations','Minimise motion and transitions.',tog('accessibility.reducedMotion','Reduced animations'),1))+
   card('About EventEase',item('ℹ️','EventEase','Event Planning &amp; Management System · Version '+VERSION+'. Plan events, guests, tasks, budgets and venues in one clean workspace.','<a class="btn set-btn" href="about.html">About</a> <a class="btn set-btn" href="contact.html">Contact</a> <a class="btn set-btn" href="contact.html">Help</a>'))+
   '<p class="set-empty" id="setEmpty" hidden>No matching settings.</p>';
  document.getElementById('setSearch').oninput=e=>{const q=e.target.value.trim().toLowerCase();let any=false;
    root.querySelectorAll('.set-card').forEach(c=>{let v=0;c.querySelectorAll('.setting-item').forEach(i=>{const m=!q||i.dataset.s.includes(q)||plain(c.getAttribute('aria-label')).includes(q);i.hidden=!m;if(m)v++});c.hidden=!v;if(v)any=true});
    document.getElementById('setEmpty').hidden=any};
  wireAccount();
  const getp=p=>p.split('.').reduce((o,k)=>o[k],cfg);
  function sync(){root.querySelectorAll('[data-path]').forEach(el=>{const v=getp(el.dataset.path);if(el.tagName==='SELECT')el.value=String(v);else el.setAttribute('aria-checked',String(!!v))})}
  root.querySelectorAll('select[data-path]').forEach(el=>el.onchange=()=>set(el.dataset.path,el.value));
  root.querySelectorAll('button[data-path]').forEach(el=>el.onclick=()=>{const on=el.getAttribute('aria-checked')!=='true';set(el.dataset.path,on);sync();
    if((el.dataset.path==='notifications.event'||el.dataset.path==='notifications.task')&&on&&'Notification' in window&&Notification.permission==='default')Notification.requestPermission()});
  sync();
  function toast(m){const d=document.createElement('div');d.className='toast';d.setAttribute('role','status');d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),4000)}
  function confirmBox(title,msg,ok,fn){
    const w=document.createElement('div');w.className='set-modal';w.innerHTML='<div class="set-dialog" role="alertdialog" aria-modal="true" aria-labelledby="sdT"><h3 id="sdT"></h3><p></p><div class="set-links"><button type="button" class="btn" data-x>Cancel</button><button type="button" class="btn btn-primary" data-ok></button></div></div>';
    w.querySelector('h3').textContent=title;w.querySelector('p').textContent=msg;w.querySelector('[data-ok]').textContent=ok;
    const close=()=>{w.remove();document.removeEventListener('keydown',esc)};const esc=e=>{if(e.key==='Escape')close()};document.addEventListener('keydown',esc);
    w.querySelector('[data-x]').onclick=close;w.onclick=e=>{if(e.target===w)close()};w.querySelector('[data-ok]').onclick=()=>{close();fn()};
    document.body.appendChild(w);w.querySelector('[data-x]').focus();
  }
  document.getElementById('clearAi').onclick=()=>confirmBox('Clear AI conversation?','This removes the AI chat history saved on this device. Your events and other data are not affected.','Clear',()=>{try{localStorage.removeItem(AIK)}catch(e){}document.dispatchEvent(new Event('ee:ai-clear'));toast('AI conversation cleared')});
  document.getElementById('exportData').onclick=()=>{
    const u=S&&S.currentUser(),data={};if(u)COLL.forEach(c=>data[c]=S.scoped(c));
    let ai=[];try{ai=JSON.parse(localStorage.getItem(AIK))||[]}catch(e){}
    const blob=new Blob([JSON.stringify({app:'EventEase',version:VERSION,exportedAt:new Date().toISOString(),account:u?u.email:null,settings:cfg,data,aiHistory:ai},null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='eventease-export-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Export downloaded');
  };
  document.getElementById('clearData').onclick=()=>confirmBox('Clear local data?','This deletes the events, guests, tasks, expenses and venues saved in this browser for your account, plus your preferences and AI chat history. Your account and sign-in are kept.','Clear data',()=>{
    if(S&&S.currentUser())COLL.forEach(c=>S.scoped(c).slice().forEach(i=>S.remove(c,i.id)));
    ['eventease_settings','eventease_language','ee_lang',AIK].forEach(k=>{try{localStorage.removeItem(k)}catch(e){}});
    cfg=merge(DEF,{});persist();apply();sync();document.dispatchEvent(new Event('ee:ai-clear'));document.dispatchEvent(new Event('ee:settings'));toast('Local data cleared');
  });
  const installed=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  function inst(){const s=document.getElementById('installStatus'),b=document.getElementById('installBtn');
    if(installed()){s.textContent='✓ EventEase is installed';b.hidden=true}
    else{b.hidden=false;s.textContent=window.__eeInstall?'Ready to install':/iphone|ipad|ipod/i.test(navigator.userAgent)?'On iPhone/iPad: tap Share → Add to Home Screen.':'Not installed. Use your browser menu → Install app if the button does nothing.'}}
  document.getElementById('installBtn').onclick=async()=>{const e=window.__eeInstall;if(!e){toast('Use your browser menu → Install app / Add to Home screen');return}e.prompt();try{await e.userChoice}catch(x){}window.__eeInstall=null;inst()};
  document.addEventListener('ee:install',inst);inst();
})();
