(function(){const root=document.getElementById('chat-root');if(!root)return;let history=[];try{const raw=localStorage.getItem('eventease_ai_history');history=raw?JSON.parse(raw):[];if(!Array.isArray(history))history=[]}catch(e){history=[]}

function buildContextMsg(){
  try{
    if(!window.EventEaseStore||!EventEaseStore.aiContext)return'';
    const ctx=EventEaseStore.aiContext(20);
    if(!ctx||!ctx.events)return'';
    return '\n\n[EventEase live data for '+ctx.userName+' — '+ctx.eventCount+' events]\n'+JSON.stringify(ctx.events.map(e=>({
      name:e.name,type:e.type,date:e.date,time:e.time,location:e.location,status:e.status,
      budget:e.budget,spent:e.spent,remaining:e.remaining,
      guests:e.guests,tasks:{total:e.tasks.total,done:e.tasks.done,open:e.tasks.open},
      expenses:e.expenses,venue:e.venue,reminders:e.reminders,schedule:e.schedule
    })));
  }catch(err){return''}
}
/** Offline keyword / intent analysis — works with no network */
function analyzeIntent(q){
  const low=(q||'').toLowerCase().trim();
  const intent={
    listEvents:/(\blist\b|\bshow\b|\bwhat\b).{0,20}\bevents?\b|\bhow many events?\b|\bmy events?\b|\bevent portfolio\b|\ball events?\b/.test(low),
    budget:/(\bbudget\b|\bspent\b|\bremaining\b|\bexpense[s]?\b|\bcost\b|\bmoney\b|\bspending\b|\brupees?\b|\brs\.?\b|₹)/.test(low),
    highestBudget:/\b(highest|largest|most|max).{0,12}budget\b|\bbudget.{0,12}(highest|largest|most)\b/.test(low),
    guests:/(\bguest[s]?\b|\brsvp\b|\binvite[sd]?\b|\battendee[s]?\b)/.test(low),
    tasks:/(\btask[s]?\b|\bchecklist\b|\bto-?do\b|\bincomplete\b|\bpending task\b)/.test(low),
    reminders:/(\bremind(er|ers|me)?\b|\balert[s]?\b)/.test(low),
    schedule:/(\bschedule\b|\btimeline\b|\bagenda\b)/.test(low),
    venue:/(\bvenue\b|\blocation\b|\bwhere\b|\bplace\b|\baddress\b)/.test(low),
    overview:/(\boverview\b|\bsummary\b|\bstatus\b|\bhow am i doing\b|\bportfolio\b)/.test(low),
    help:/(\bhelp\b|\bwhat can you\b|\bhow do i\b|\bcommands?\b)/.test(low),
    plan:/(\bplan\b|\bcreate\b|\borgani[sz]e\b|\bsuggest\b).{0,30}(wedding|birthday|fest|party|conference|event)/.test(low)||/\bplan a\b/.test(low),
    next:/(\bnext\b|\bupcoming\b|\bsoon\b)/.test(low)
  };
  return intent;
}
function findNamedEvent(events, low){
  if(!events||!events.length)return null;
  // longest name match first
  const ranked=events.slice().sort((a,b)=>(b.name||'').length-(a.name||'').length);
  for(const e of ranked){
    const n=(e.name||'').toLowerCase();
    if(n&&low.includes(n))return e;
  }
  // fuzzy: significant tokens
  for(const e of ranked){
    const tokens=(e.name||'').toLowerCase().split(/\s+/).filter(t=>t.length>3);
    if(tokens.length&&tokens.every(t=>low.includes(t)))return e;
  }
  return null;
}
function localAnswer(q){
  const S=window.EventEaseStore;if(!S)return null;
  let ctx;try{ctx=S.aiContext(20)}catch(e){return null}
  if(!ctx)return null;
  const low=q.toLowerCase();
  const intent=analyzeIntent(q);
  const events=ctx.events||[];
  const named=findNamedEvent(events,low);
  const fmt=n=>'₹'+Number(n||0).toLocaleString('en-IN');

  if(intent.help){
    return 'I work fully offline with your EventEase data. Try:\n• "What events do I have?"\n• "Wedding Day budget"\n• "Which event has the highest budget?"\n• "What reminders do I have?"\n• "Incomplete tasks"\n• "Overview of all my events"\n• "Plan a college fest for 300 people, budget 2 lakh"';
  }
  if(intent.listEvents||(intent.overview&&!named)){
    if(!events.length)return 'You have no events yet. Create one from Events, or ask me to plan one (works offline).';
    const tb=events.reduce((a,e)=>a+(e.budget||0),0),ts=events.reduce((a,e)=>a+(e.spent||0),0);
    return 'You have '+ctx.eventCount+' event(s) (showing up to 20):\n'+events.map(e=>'• '+e.name+(e.date?' — '+e.date:'')+(e.location?' · '+e.location:'')+' · budget '+fmt(e.budget)+', spent '+fmt(e.spent)).join('\n')+
      '\n\nPortfolio: planned '+fmt(tb)+', spent '+fmt(ts)+', remaining '+fmt(Math.max(0,tb-ts))+'.';
  }
  if(intent.highestBudget&&events.length){
    const top=events.slice().sort((a,b)=>(b.budget||0)-(a.budget||0))[0];
    return top.name+' has the highest budget at '+fmt(top.budget)+' (spent '+fmt(top.spent)+', remaining '+fmt(top.remaining)+').';
  }
  if(named&&intent.budget){
    const lines=[named.name+': budget '+fmt(named.budget)+', spent '+fmt(named.spent)+', remaining '+fmt(named.remaining)+'.'];
    if(named.expenses&&named.expenses.length){
      lines.push('Expenses:');
      named.expenses.forEach(x=>lines.push('• '+x.name+' '+fmt(x.amount)+(x.category?' ('+x.category+')':'')));
    }else lines.push('No expenses recorded yet.');
    return lines.join('\n');
  }
  if(intent.budget&&!named){
    const tb=events.reduce((a,e)=>a+(e.budget||0),0),ts=events.reduce((a,e)=>a+(e.spent||0),0);
    return 'All events: planned '+fmt(tb)+', spent '+fmt(ts)+', remaining '+fmt(Math.max(0,tb-ts))+'.\n'+
      events.map(e=>'• '+e.name+': '+fmt(e.budget)+' budget / '+fmt(e.spent)+' spent').join('\n');
  }
  if(named&&intent.guests){
    const g=named.guests||{};
    return named.name+' guests: '+(g.total||0)+' total — '+(g.accepted||0)+' accepted, '+(g.pending||0)+' pending, '+(g.declined||0)+' declined.';
  }
  if(intent.guests&&!named){
    return events.map(e=>{const g=e.guests||{};return '• '+e.name+': '+(g.total||0)+' guests ('+(g.accepted||0)+' accepted)'}).join('\n')||'No guest data yet.';
  }
  if(named&&intent.tasks){
    const t=named.tasks||{};
    const open=(t.open||[]).length?t.open.map(x=>'• '+x).join('\n'):'None open.';
    return named.name+' tasks: '+(t.done||0)+'/'+(t.total||0)+' done.\nOpen:\n'+open;
  }
  if(intent.tasks){
    const lines=events.filter(e=>e.tasks&&e.tasks.open&&e.tasks.open.length).map(e=>'• '+e.name+': '+e.tasks.open.join(', '));
    return lines.length?('Incomplete tasks:\n'+lines.join('\n')):'No incomplete tasks found.';
  }
  if(intent.reminders){
    const rems=events.flatMap(e=>(e.reminders||[]).map(r=>({...r,event:e.name})));
    if(named){
      const r=(named.reminders||[]);
      return r.length?named.name+' reminders:\n'+r.map(x=>'• '+x.title+(x.date?' — '+x.date:'')+(x.time?' '+x.time:'')).join('\n'):'No open reminders for '+named.name+'.';
    }
    return rems.length?('Reminders:\n'+rems.map(r=>'• '+r.title+(r.event?' ('+r.event+')':'')+(r.date?' — '+r.date:'')).join('\n')):'You have no open reminders.';
  }
  if(named&&intent.schedule){
    const s=named.schedule||[];
    return s.length?named.name+' schedule:\n'+s.map(x=>'• '+(x.time||'')+' '+x.title).join('\n'):'No schedule items for '+named.name+'.';
  }
  if(named&&intent.venue){
    const v=named.venue;
    return v?named.name+' venue: '+(v.name||'')+(v.city?' · '+v.city:'')+(v.capacity?' · capacity '+v.capacity:''):(named.location?named.name+' location: '+named.location:'No venue set for '+named.name+'.');
  }
  if(named&&intent.overview){
    const t=named.tasks||{},g=named.guests||{};
    return named.name+' overview:\nType: '+(named.type||'Event')+'\nDate: '+(named.date||'—')+'\nLocation: '+(named.location||'—')+'\nBudget '+fmt(named.budget)+' · spent '+fmt(named.spent)+' · remaining '+fmt(named.remaining)+'\nGuests '+(g.total||0)+' · Tasks '+(t.done||0)+'/'+(t.total||0);
  }
  if(intent.next&&events.length){
    const up=events.filter(e=>e.date).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    const next=up[0];
    return next?('Next dated event: '+next.name+(next.date?' on '+next.date:'')+(next.location?' · '+next.location:'')):('You have '+events.length+' event(s); none have dates set.');
  }
  // generic named event ping
  if(named){
    return named.name+' — '+(named.type||'Event')+(named.date?' · '+named.date:'')+'. Budget '+fmt(named.budget)+', spent '+fmt(named.spent)+'. Ask about budget, guests, tasks, reminders, or schedule.';
  }
  return null;
}

function keep(){try{localStorage.setItem('eventease_ai_history',JSON.stringify(history.slice(-40)))}catch(e){/* storage full or private mode — ignore */}}document.addEventListener('ee:ai-clear',()=>{history=[];root.innerHTML=''});function open(prefill){if(document.getElementById('chatPanel')){if(prefill)document.getElementById('chatInput').value=prefill;return}root.innerHTML=`<section class="chat-panel" id="chatPanel" aria-label="EventEase AI"><header class="chat-head"><div><strong>EventEase AI ✦</strong><small>Planning assistant</small></div><button class="chat-close" id="chatClose">×</button></header><div class="chat-messages" id="chatMessages"><div class="chat-msg ai">Hi! I can help with event ideas, schedules, checklists, guests and budgets. What are you planning?</div></div><div class="chat-suggestions"><button>Wedding checklist</button><button>Plan a college fest for 300 people, budget 2 lakh</button><button>Budget plan</button></div><form class="chat-form" id="chatForm"><input id="chatInput" autocomplete="off" placeholder="Ask EventEase AI…" required><button>→</button></form></section>`;document.getElementById('chatClose').onclick=()=>root.innerHTML='';history.forEach(m=>bubble(m.content,m.role==='user'?'user':'ai'));root.querySelectorAll('.chat-suggestions button').forEach(b=>b.onclick=()=>send(b.textContent));document.getElementById('chatForm').onsubmit=e=>{e.preventDefault();send(document.getElementById('chatInput').value)};if(prefill)document.getElementById('chatInput').value=prefill}function bubble(text,who){const box=document.getElementById('chatMessages');const el=document.createElement('div');el.className='chat-msg '+who;el.textContent=text;box.appendChild(el);box.scrollTop=box.scrollHeight;return el}async function send(text){text=(text||'').trim();if(!text)return;if(!document.getElementById('chatPanel'))open();const input=document.getElementById('chatInput');if(input)input.value='';bubble(text,'user');const sg=document.querySelector('.chat-suggestions');if(sg)sg.remove();history.push({role:'user',content:text});keep();if(window.EEPlanner&&EEPlanner.wants(text)){return EEPlanner.run(text,{bubble:bubble,history:history,keep:keep})}const _off=localAnswer(text);if(_off){bubble(_off,'ai');history.push({role:'assistant',content:_off});keep();return}const loading=bubble('Thinking…','ai');loading.classList.add('is-loading');try{const ctx=buildContextMsg();const msgs=history.slice(-20).map(m=>({role:m.role==='assistant'?'assistant':'user',content:String(m.content||'').slice(0,4000)}));if(ctx){msgs.unshift({role:'user',content:'Use this live EventEase portfolio data when relevant (do not invent events):'+ctx})}const model=(window.EESettings&&EESettings.get&&EESettings.get().aiModel)||'gpt-4o-mini';const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:msgs,model:model})});let data={};try{data=await res.json()}catch(x){data={}}loading.remove();if(!res.ok){const fb=localAnswer(text);if(fb){bubble(fb,'ai');history.push({role:'assistant',content:fb});keep();return}throw new Error(data.error||'AI service unavailable')}const reply=data.reply||'I could not generate a response.';bubble(reply,'ai');history.push({role:'assistant',content:reply});keep()}catch(err){try{loading.remove()}catch(x){}const fb=localAnswer(text);if(fb){bubble(fb,'ai');history.push({role:'assistant',content:fb});keep();return}bubble('The AI service is not connected yet (set EXPLABS_API_KEY on the host). You can still say things like "Plan a birthday party for 40 guests, budget \u20B950,000" and I will build a full plan offline.','ai')}}document.addEventListener('click',e=>{const t=e.target.closest('[data-open-chat]');if(t){e.preventDefault();open(t.tagName==='BUTTON'?t.textContent.trim():null)}});})();
