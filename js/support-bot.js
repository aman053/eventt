/* EventEase Support Assistant — guided help + troubleshooting. Works offline; free-text falls back to /api/chat (support mode). */
(function(){
  const root=document.getElementById('chat-root');if(!root)return;
  const KB=[
    {id:'login',t:'Login / account problems',k:['login','log in','sign in','password','account','register','email','incorrect'],a:'Accounts are stored in this browser only, so you must log in on the same browser and device you registered with.',s:['Check the email spelling and that the password has at least 6 characters.','If you cleared browser data, the account is gone — create a new account.','Do not use Private/Incognito windows; they erase accounts when closed.','Still stuck? Run diagnostics below.']},
    {id:'session',t:'Signed out unexpectedly',k:['logout','log out','signed out','session','logo','kicked','ended'],a:'Only the "Sign out" button ends your session. The EventEase logo just opens Home.',s:['Hard-refresh the page (Ctrl+Shift+R, or close and reopen the installed app) so the newest version loads.','Make sure the browser is not set to clear site data on exit.','Open Home → the menu should show "Dashboard" and "Sign out" when you are logged in.']},
    {id:'data',t:'Data missing or not saving',k:['data','save','saved','missing','lost','disappeared','not saving','event'],a:'Events, guests, tasks and expenses are saved in your browser (localStorage) under your account.',s:['Select an event first — guests, tasks, expenses and venue attach to the selected event (use Open on Events).','Use the same browser and account; data does not sync between devices.','Avoid Private mode and do not clear site data.','Use "Load demo" on the Events tab to check that saving works.']},
    {id:'ai',t:'AI assistant not replying',k:['ai','assistant','not replying','not responding','chatbot','api','key','thinking'],a:'The planning AI needs a server connection.',s:['Check your internet connection.','The site owner must set EXPLABS_API_KEY (and optionally EXPLABS_MODEL) in Vercel, then redeploy.','Run diagnostics below to test whether /api/chat is reachable.']},
    {id:'install',t:'Install on my phone',k:['install','pwa','app','home screen','offline'],a:'EventEase is a Progressive Web App.',s:['Android/Chrome: menu ⋮ → Install app / Add to Home screen.','iPhone/Safari: Share → Add to Home Screen.','Desktop Chrome/Edge: use the install icon in the address bar.']},
    {id:'display',t:'Page looks broken or old',k:['blank','broken','layout','old','stale','cache','style','slow','blur','glass'],a:'Usually an old cached copy or a browser without blur support.',s:['Hard-refresh (Ctrl+Shift+R) or reopen the installed app.','Browser settings → clear site data for this site (this also removes saved accounts — export nothing first, it cannot be undone).','Update your browser; very old browsers show a simpler, non-blurred look.']},
    {id:'guide',t:'How do I get started?',k:['start','begin','how','guide','help','first','tutorial'],a:'A quick path through EventEase:',s:['Create an account (Get Started) — you are signed in instantly.','Events tab → create an event and click Open on it.','Add guests, tasks, expenses and venue details for that event.','Overview shows totals, progress and budget at a glance.']},
    {id:'account',t:'Edit name, email or password',k:['name','email change','password','reset','forgot','profile','edit account'],a:'You can edit your details in Settings → Account.',s:['Open Settings from the account menu.','Under Account, change your name or email and tap Save profile.','To change your password, enter your current password and a new one (6+ characters).','Forgot it? On the Login page tap "Forgot password?" and confirm your registered name.']},
    {id:'share',t:'Share an invitation',k:['share','invitation','invite','whatsapp','instagram','link','card','send'],a:'You can share an invitation card image and link from any event.',s:['Go to Events (or the Dashboard focus card) and tap Share.','Edit the message and pick a card style.','Tap Share… to pick WhatsApp, Instagram, Messages or Mail, or use the direct WhatsApp / Email buttons.','You can also copy the invitation link or save the card image.','Invitation links open on your live website, so use the deployed address, not localhost.']},
    {id:'planai',t:'Plan an event with AI',k:['generate','plan','ai plan','checklist','template','create event with ai','everything'],a:'The AI assistant builds a full plan from one sentence.',s:['Tap the ✦ button.','Type e.g. "Plan a college fest for 300 people, budget 2 lakh, on 15 Dec in Kozhikode".','Review the checklist, budget split, schedule and invitation text.','Tap Add to my events to save it all.']},
    {id:'remind',t:'Reminders & notifications',k:['reminder','notification','notify','sound','remind'],a:'Reminders are browser notifications.',s:['When creating an event, choose a reminder (1 day, 1 hour, 30 minutes or custom).','Allow notifications when your browser asks.','Turn reminders and sounds on or off in Settings → Notifications.','Reminders fire while EventEase is open or installed.']},
    {id:'prefs',t:'Language, dark mode, text size',k:['language','dark','theme','light','text size','larger','hindi','malayalam','appearance'],a:'All of these live in Settings.',s:['Language: Settings → General → Language.','Appearance: Light, Dark or Liquid Glass.','Larger text and Reduced animations: Settings → Accessibility.']},
    {id:'contact',t:'Contact the team',k:['contact','email','phone','feedback','human','support','call'],a:'Email eventease.support@example.com or call +91 81118 12390. You can also use the feedback form on this page.',s:[]}
  ];
  const menu=KB.map(x=>x.id);
  let panel;
  function el(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
  function msgs(){return document.getElementById('chatMessages')}
  function push(node,who){const m=el('div','chat-msg '+who);m.appendChild(node);msgs().appendChild(m);msgs().scrollTop=msgs().scrollHeight;return m}
  function say(text,who){return push(document.createTextNode(text),who||'ai')}
  function opts(list){const w=el('div','sb-opts');list.forEach(([label,fn])=>{const b=el('button',null,label);b.type='button';b.onclick=fn;w.appendChild(b)});return w}
  function menuMsg(intro){const m=el('div');m.appendChild(document.createTextNode(intro||'What do you need help with?'));m.appendChild(opts(KB.map(x=>[x.t,()=>topic(x)]).concat([['Run diagnostics',diagnose]])));push(m,'ai')}
  function topic(x){say(x.t,'user');const m=el('div');m.appendChild(document.createTextNode(x.a));if(x.s.length){const ol=el('ol');x.s.forEach(s=>ol.appendChild(el('li',null,s)));m.appendChild(ol)}m.appendChild(opts([['That fixed it',()=>say('Great! Ask me anything else anytime.')],['Still stuck',()=>menuMsg('Try another topic or run diagnostics:')]]));push(m,'ai')}
  async function diagnose(){
    say('Run diagnostics','user');const r=[];const S=window.EventEaseStore;
    let ls='blocked';try{localStorage.setItem('_ee','1');localStorage.removeItem('_ee');ls='OK'}catch(e){}
    r.push('Browser storage: '+ls+(ls!=='OK'?' — accounts and events cannot be saved (Private mode?).':''));
    r.push('Signed in: '+(S&&S.currentUser()?'yes ('+S.currentUser().email+')':'no'));
    r.push('Internet: '+(navigator.onLine?'online':'offline'));
    r.push('Blur effects: '+((window.CSS&&CSS.supports('backdrop-filter','blur(1px)'))||(window.CSS&&CSS.supports('-webkit-backdrop-filter','blur(1px)'))?'supported':'not supported (simpler look is used)'));
    r.push('Installed offline support: '+('serviceWorker' in navigator?'available':'not available'));
    try{const res=await fetch('/api/chat',{method:'GET'});r.push('AI service: '+(res.status===405?'reachable (needs a valid API key to answer)':res.status===404?'not deployed on this host':'HTTP '+res.status))}catch(e){r.push('AI service: cannot connect')}
    const m=el('div');m.appendChild(document.createTextNode('Results:'));const ul=el('ol');r.forEach(t=>ul.appendChild(el('li',null,t)));m.appendChild(ul);push(m,'ai');
  }
  function match(q){q=q.toLowerCase();let best=null,score=0;KB.forEach(x=>{const n=x.k.filter(k=>q.includes(k)).length;if(n>score){score=n;best=x}});return best}
  const history=[];
  async function ask(text){
    text=(text||'').trim();if(!text)return;say(text,'user');
    if(/diagnos|check my|test/i.test(text))return diagnose();
    const hit=match(text);if(hit)return topic2(hit);
    history.push({role:'user',content:text});const wait=say('Thinking…');wait.classList.add('is-loading');
    try{const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'support',messages:history})});const d=await res.json();wait.remove();if(!res.ok)throw 0;history.push({role:'assistant',content:d.reply});say(d.reply)}
    catch(e){wait.remove();menuMsg('I could not find an exact answer. Pick a topic below, or call +91 81118 12390 / use the feedback form:')}
  }
  function topic2(x){const m=el('div');m.appendChild(document.createTextNode(x.a));if(x.s.length){const ol=el('ol');x.s.forEach(s=>ol.appendChild(el('li',null,s)));m.appendChild(ol)}m.appendChild(opts([['Run diagnostics',diagnose],['More topics',()=>menuMsg()]]));push(m,'ai')}
  function open(){
    if(document.getElementById('chatPanel'))return;
    root.innerHTML='<section class="chat-panel" id="chatPanel" aria-label="EventEase Support"><header class="chat-head"><div><strong>EventEase Support ✦</strong><small>Guides &amp; troubleshooting</small></div><button class="chat-close" id="chatClose" type="button" aria-label="Close chat">×</button></header><div class="chat-messages" id="chatMessages" aria-live="polite"></div><form class="chat-form" id="chatForm"><input id="chatInput" autocomplete="off" placeholder="Describe your problem…" required><button aria-label="Send">→</button></form></section>';
    document.getElementById('chatClose').onclick=()=>{root.innerHTML=''};
    document.getElementById('chatForm').onsubmit=e=>{e.preventDefault();const i=document.getElementById('chatInput');const v=i.value;i.value='';ask(v)};
    say('Hi! I am the EventEase Support Assistant. I can guide you through EventEase and troubleshoot problems.');menuMsg();
    document.getElementById('chatInput').focus();
  }
  document.addEventListener('click',e=>{if(e.target.closest('[data-open-chat]')){e.preventDefault();open()}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('chatPanel'))root.innerHTML=''});
})();
