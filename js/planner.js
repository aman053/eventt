/* EventEase AI planner: turns one prompt into a full event plan (AI when available, built-in generator otherwise). */
(function(){
  const S=window.EventEaseStore;
  const TPL={
    wedding:{label:'Wedding',guests:300,per:2500,
      tasks:[['Fix budget & guest list','High',16],['Book venue & date','High',14],['Hire caterer','High',12],['Book photographer & videographer','High',12],['Plan decor & stage','Medium',8],['Book music / DJ / band','Medium',8],['Design & send invitations','High',8],['Arrange outfits, makeup & jewellery','Medium',6],['Plan guest accommodation & transport','Medium',5],['Finalise menu tasting','Medium',4],['Confirm all vendors & timeline','High',0],['Prepare payments & emergency kit','Low',0]],
      budget:[['Venue',30],['Catering',30],['Decor & flowers',10],['Photography & video',8],['Attire & makeup',8],['Music & entertainment',5],['Invitations & gifts',3],['Contingency',6]],
      schedule:[['4:00 PM','Guest arrival & welcome drinks'],['5:00 PM','Ceremony begins'],['6:30 PM','Family photos'],['7:30 PM','Dinner served'],['9:00 PM','Music & dance'],['10:30 PM','Farewell']]},
    birthday:{label:'Birthday',guests:30,per:1500,
      tasks:[['Set budget & guest list','High',4],['Choose venue','High',4],['Order cake','High',2],['Plan theme & decor','Medium',3],['Book caterer / plan menu','High',3],['Arrange games & entertainment','Medium',2],['Send invitations','High',3],['Plan return gifts','Low',1],['Book photographer','Low',2],['Final confirmations','High',0]],
      budget:[['Venue',20],['Food & drinks',35],['Cake',8],['Decor & balloons',12],['Entertainment & games',15],['Photography',5],['Contingency',5]],
      schedule:[['5:00 PM','Guests arrive'],['5:30 PM','Decor reveal & welcome'],['6:00 PM','Games & entertainment'],['7:00 PM','Cake cutting'],['7:30 PM','Dinner'],['9:00 PM','Wrap up & return gifts']]},
    conference:{label:'Conference',guests:150,per:1800,
      tasks:[['Define theme, goals & budget','High',10],['Book venue & date','High',9],['Confirm speakers / chief guests','High',8],['Open registrations','High',7],['Plan sponsorship & marketing','Medium',7],['Arrange catering','Medium',4],['Set up audio-visual & Wi-Fi','High',3],['Print badges, banners & schedules','Medium',2],['Brief volunteers','Medium',1],['Rehearse & final walkthrough','High',0],['Prepare feedback form','Low',0]],
      budget:[['Venue',25],['Catering',22],['Audio-visual & tech',15],['Speakers & guests',12],['Marketing & printing',10],['Registration & volunteers',6],['Photography',4],['Contingency',6]],
      schedule:[['9:00 AM','Registration & welcome tea'],['10:00 AM','Inauguration'],['11:00 AM','Keynote session'],['1:00 PM','Lunch & networking'],['2:30 PM','Workshops / panels'],['4:30 PM','Felicitation & feedback'],['5:00 PM','Closing']]},
    party:{label:'Party',guests:50,per:1500,
      tasks:[['Set budget & guest list','High',3],['Choose venue','High',3],['Plan menu & catering','High',2],['Music / DJ','Medium',2],['Decor & theme','Medium',2],['Send invitations','High',2],['Photographer','Low',1],['Final confirmations','High',0]],
      budget:[['Venue',25],['Food & drinks',35],['Decor',12],['Music & entertainment',15],['Photography',5],['Contingency',8]],
      schedule:[['6:00 PM','Guests arrive'],['7:00 PM','Welcome & music'],['8:00 PM','Dinner'],['9:00 PM','Games / dance'],['10:30 PM','Wrap up']]}};
  const KEYS={wedding:/wedding|marriage|engagement|reception/,birthday:/birthday|bday|anniversary/,conference:/conference|seminar|workshop|summit|fest|college|corporate|meetup|launch|hackathon|symposium|convention/,party:/party|celebration|get-?together|farewell|reunion/};
  const WORDS=/(wedding|marriage|engagement|reception|birthday|anniversary|conference|seminar|workshop|summit|college fest|fest|corporate event|meetup|launch|hackathon|party|celebration|get-?together|farewell|reunion)/i;
  const MON=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'],p2=n=>String(n).padStart(2,'0');
  const iso=d=>d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
  function money(t){const m=t.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?|l|crore|cr)?/i)||t.match(/([\d,]+(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?|crore|cr)\b/i);if(!m)return 0;let n=parseFloat(m[1].replace(/,/g,''));const u=(m[2]||'').toLowerCase();if(/^(k|thou)/.test(u))n*=1e3;else if(/^l/.test(u))n*=1e5;else if(/^cr/.test(u))n*=1e7;return Math.round(n)}
  function dateOf(t){let m;const now=new Date();
    if((m=t.match(/\d{4}-\d{2}-\d{2}/)))return m[0];
    if((m=t.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/)))return m[3]+'-'+p2(m[2])+'-'+p2(m[1]);
    if((m=t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:,?\s+(\d{4}))?/i))){const y=+m[3]||now.getFullYear(),d=new Date(y,MON.indexOf(m[2].toLowerCase()),+m[1]);if(!m[3]&&d<now)d.setFullYear(y+1);return iso(d)}
    if((m=t.match(/in\s+(\d+)\s+(day|week|month)s?/i))){const d=new Date(),n=+m[1],u=m[2].toLowerCase();if(u==='day')d.setDate(d.getDate()+n);else if(u==='week')d.setDate(d.getDate()+7*n);else d.setMonth(d.getMonth()+n);return iso(d)}
    if(/next\s+week/i.test(t)){const d=new Date();d.setDate(d.getDate()+7);return iso(d)}
    if(/next\s+month/i.test(t)){const d=new Date();d.setMonth(d.getMonth()+1);return iso(d)}
    return ''}
  function timeOf(t){const m=t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);if(!m)return '';let h=+m[1]%12;if(m[3].toLowerCase()==='pm')h+=12;return p2(h)+':'+(m[2]||'00')}
  const title=s=>s.replace(/\b\w/g,c=>c.toUpperCase());
  function local(text){
    const low=text.toLowerCase(),kind=Object.keys(KEYS).find(k=>KEYS[k].test(low))||'party',T=TPL[kind];
    const gm=text.match(/(\d[\d,]*)\s*(?:guests?|people|persons?|pax|attendees|members|participants|students)/i);
    const guests=gm?parseInt(gm[1].replace(/,/g,'')):T.guests,budget=money(text)||guests*T.per;
    const w=(low.match(WORDS)||[])[1],type=w?title(w.replace(/-/g,' ')):T.label;
    const lm=text.match(/\b(?:in|at)\s+([A-Z][\w]+(?:\s+[A-Z][\w]+){0,2})/),loc=lm&&!MON.includes(lm[1].slice(0,3).toLowerCase())?lm[1]:'';
    const pm=text.match(/([A-Z][a-z]+)'s\s+(birthday|wedding|engagement|anniversary)/i);
    const name=pm?pm[1]+"'s "+title(pm[2]):type+(loc?' — '+loc:'');
    const u=S&&S.currentUser(),date=dateOf(text),time=timeOf(text);
    const plan={name,type,date,time,location:loc,guests,budget,host:u?u.name:'',
      summary:'A '+type.toLowerCase()+' for about '+guests+' guests with a budget of ₹'+budget.toLocaleString('en-IN')+(date?' on '+date:'')+(loc?' in '+loc:'')+'.',
      tasks:T.tasks.map(a=>({title:a[0],priority:a[1],when:a[2]>1?a[2]+' weeks before':a[2]===1?'1 week before':'1–2 days before'})),
      budget_breakdown:T.budget.map(a=>({item:a[0],amount:Math.round(budget*a[1]/10000)*100})),
      schedule:T.schedule.map(a=>({time:a[0],activity:a[1]}))};
    plan.invitation='You are warmly invited to '+name+'!'+(date?' 📅 '+date:'')+(time?' ⏰ '+time:'')+(loc?' 📍 '+loc:'')+(plan.host?' Hosted by '+plan.host+'.':'')+' Please RSVP — we would love to see you there.';
    return plan}
  function merge(base,ai){const o={...base};
    ['name','type','location','summary','invitation'].forEach(k=>{if(typeof ai[k]==='string'&&ai[k].trim())o[k]=ai[k].trim()});
    if(/^\d{4}-\d{2}-\d{2}$/.test(ai.date||''))o.date=ai.date;if(/^\d{2}:\d{2}$/.test(ai.time||''))o.time=ai.time;
    if(+ai.guests>0)o.guests=+ai.guests;if(+ai.budget>0)o.budget=Math.round(+ai.budget);
    if(Array.isArray(ai.tasks)&&ai.tasks.length>2)o.tasks=ai.tasks.filter(t=>t&&t.title).slice(0,25).map(t=>({title:String(t.title),priority:['High','Medium','Low'].includes(t.priority)?t.priority:'Medium',when:String(t.when||'')}));
    if(Array.isArray(ai.budget_breakdown)&&ai.budget_breakdown.length)o.budget_breakdown=ai.budget_breakdown.filter(b=>b&&b.item).map(b=>({item:String(b.item),amount:Math.round(+b.amount||0)}));
    if(Array.isArray(ai.schedule)&&ai.schedule.length)o.schedule=ai.schedule.filter(s=>s&&s.activity).map(s=>({time:String(s.time||''),activity:String(s.activity)}));
    return o}
  const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
  function apply(plan){
    if(!S||!S.currentUser())return null;
    const ev=S.add('events',{name:plan.name,type:plan.type,date:plan.date,time:plan.time,location:plan.location||'',budget:plan.budget,status:'Planning',guestTarget:plan.guests,invitation:plan.invitation,budgetPlan:plan.budget_breakdown,aiPlanned:true});
    plan.tasks.forEach(t=>S.add('tasks',{title:t.title+(t.when?' ('+t.when+')':''),priority:t.priority,status:'Todo',eventId:ev.id,auto:true}));
    (plan.schedule||[]).forEach(s=>{if(s&&s.activity)S.add('schedule',{eventId:ev.id,time:s.time||'',title:s.activity})});
    if(window.EEApp){if(EEApp.openWorkspace)EEApp.openWorkspace(ev.id,'overview');else EEApp.select(ev.id)}return ev}
  function list(head,rows){const w=el('div','plan-sec');w.appendChild(el('strong',null,head));const ul=el('ul');rows.forEach(r=>ul.appendChild(el('li',null,r)));w.appendChild(ul);return w}

  function variants(base){
    const b=JSON.parse(JSON.stringify(base));
    const guests=b.guests||50, budget=b.budget||guests*1500;
    const opts=[];
    const coreName=(b.name||'Event').replace(/\s*[·\-].*$/,'');
    // A Balanced
    const a=JSON.parse(JSON.stringify(b));
    a.optionLabel='Option A - Balanced';
    a.optionBlurb='Standard checklist and even budget split. Good all-round plan.';
    a.name=coreName+' - Balanced';
    opts.push(a);
    // B Budget
    const lean=JSON.parse(JSON.stringify(b));
    lean.budget=Math.round(budget*0.75);
    lean.budget_breakdown=(b.budget_breakdown||[]).map(x=>({item:x.item,amount:Math.round((x.amount||0)*0.75)}));
    lean.tasks=(b.tasks||[]).filter(function(_,i){return i%3!==2}).slice(0,10);
    if(lean.tasks.length<4)lean.tasks=b.tasks.slice();
    lean.summary='A lean '+String(b.type||'event').toLowerCase()+' for about '+guests+' guests with a tighter budget of \u20B9'+lean.budget.toLocaleString('en-IN')+'. Focus on essentials.';
    lean.optionLabel='Option B - Budget-conscious';
    lean.optionBlurb='About 25% lower budget. Prioritises essentials and a shorter checklist.';
    lean.name=coreName+' - Budget-conscious';
    lean.invitation='You are warmly invited to '+lean.name+'!'+(lean.date?' Date: '+lean.date:'')+(lean.time?' Time: '+lean.time:'')+(lean.location?' Venue: '+lean.location:'')+' Please RSVP.';
    opts.push(lean);
    // C Premium
    const prem=JSON.parse(JSON.stringify(b));
    prem.budget=Math.round(budget*1.25);
    prem.budget_breakdown=(b.budget_breakdown||[]).map(x=>({item:x.item,amount:Math.round((x.amount||0)*1.25)}));
    prem.tasks=(b.tasks||[]).concat([
      {title:'Premium decor and lighting review',priority:'Medium',when:'2 weeks before'},
      {title:'Guest experience extras (welcome kit / photo booth)',priority:'Low',when:'1 week before'}
    ]).slice(0,20);
    prem.schedule=(b.schedule||[]).concat([{time:'',activity:'Premium guest experience moments throughout the day'}]);
    prem.summary='An elevated '+String(b.type||'event').toLowerCase()+' for about '+guests+' guests with an enhanced budget of \u20B9'+prem.budget.toLocaleString('en-IN')+'. Extra polish on decor and guest experience.';
    prem.optionLabel='Option C - Premium';
    prem.optionBlurb='About 25% higher budget. Richer decor, extras, and fuller guest experience.';
    prem.name=coreName+' - Premium';
    prem.invitation='You are warmly invited to '+prem.name+'!'+(prem.date?' Date: '+prem.date:'')+(prem.time?' Time: '+prem.time:'')+(prem.location?' Venue: '+prem.location:'')+' We would be honoured by your presence. Please RSVP.';
    opts.push(prem);
    return opts;
  }
  function renderOne(plan, onUsed){
    const w=el('div','plan plan-option');
    const head=el('div','plan-option-head');
    head.appendChild(el('strong','plan-option-label',plan.optionLabel||'Plan'));
    if(plan.optionBlurb)head.appendChild(el('span','plan-option-blurb',plan.optionBlurb));
    w.appendChild(head);
    w.appendChild(el('strong','plan-title','* '+plan.name));
    w.appendChild(el('p',null,plan.summary));
    w.appendChild(list('Checklist ('+plan.tasks.length+')',plan.tasks.map(function(t){return t.title+' - '+t.when+' - '+t.priority})));
    w.appendChild(list('Budget split',plan.budget_breakdown.map(function(b){return b.item+' - \u20B9'+b.amount.toLocaleString('en-IN')})));
    w.appendChild(list('Day schedule',plan.schedule.map(function(s){return (s.time?s.time+' - ':'')+s.activity})));
    const inv=el('div','plan-sec');inv.appendChild(el('strong',null,'Invitation text'));inv.appendChild(el('p','plan-inv',plan.invitation));w.appendChild(inv);
    const row=el('div','sb-opts');
    const add=el('button','btn btn-primary plan-use-btn',S&&S.currentUser()?'Use this plan':'Log in to use this plan');
    add.type='button';
    add.onclick=function(){
      if(!S.currentUser()){location.href='login.html';return}
      const summary="Add \""+(plan.name||"event")+"\" with "+(plan.tasks||[]).length+" tasks and budget \u20B9"+Number(plan.budget||0).toLocaleString("en-IN")+"?";
      if(!confirm(summary))return;
      const ev=apply(plan);if(!ev)return;
      add.textContent='Added';add.disabled=true;
      if(typeof onUsed==='function')onUsed(w);
      if(window.EEApp&&EEApp.openWorkspace){
        const ob=el('button','btn','Open event workspace');ob.type='button';
        ob.onclick=function(){EEApp.openWorkspace(ev.id,'overview')};row.appendChild(ob);
      }
      const sh=el('button','btn','Share invitation');sh.type='button';
      sh.onclick=function(){if(window.EEShare)EEShare.open(ev.id)};row.appendChild(sh);
      w.appendChild(el('small',null,'Saved to your events. Guests, tasks, budget and schedule are ready.'));
    };
    
    if(S&&S.currentUser()){
      const existing=S.scoped('events');
      if(existing.length){
        const wrap=el('div','plan-apply-existing');
        const sel=document.createElement('select');
        sel.setAttribute('aria-label','Apply plan to existing event');
        sel.innerHTML='<option value=\"\">Or apply to existing event…</option>'+existing.map(function(e){return '<option value=\"'+e.id+'\">'+String(e.name||'Event').replace(/</g,'')+'</option>'}).join('');
        const applyBtn=el('button','btn','Update selected');
        applyBtn.type='button';
        applyBtn.onclick=function(){
          const id=sel.value;if(!id){alert('Choose an event first');return}
          if(!confirm("Update the selected event with this plan's tasks, schedule and budget breakdown?"))return;
          const d=S.db();
          const ev=d.events.find(function(e){return e.id===id});
          if(!ev)return;
          ev.budget=plan.budget||ev.budget;
          ev.budgetPlan=plan.budget_breakdown||ev.budgetPlan;
          if(plan.invitation)ev.invitation=plan.invitation;
          S.save(d);
          (plan.tasks||[]).forEach(function(t){
            S.add('tasks',{title:t.title+(t.when?' ('+t.when+')':''),priority:t.priority||'Medium',status:'Todo',eventId:id,auto:true});
          });
          (plan.schedule||[]).forEach(function(s){
            if(s&&s.activity)S.add('schedule',{eventId:id,time:s.time||'',title:s.activity});
          });
          applyBtn.textContent='Updated';applyBtn.disabled=true;
          document.dispatchEvent(new Event('ee:render'));
          if(window.EEApp&&EEApp.openWorkspace)EEApp.openWorkspace(id,'overview');
        };
        wrap.appendChild(sel);wrap.appendChild(applyBtn);w.appendChild(wrap);
      }
    }
    row.appendChild(add);w.appendChild(row);return w;
  }
  function render(box,plans){
    const listPlans=Array.isArray(plans)?plans:[plans];
    box.textContent='';
    box.classList.remove('is-loading');
    const wrap=el('div','plan-options');
    wrap.appendChild(el('p','plan-options-intro','Here are '+listPlans.length+' plan options. Pick one to add to your events.'));
    const grid=el('div','plan-options-grid');
    listPlans.forEach(function(plan){
      grid.appendChild(renderOne(plan, function(usedCard){
        grid.querySelectorAll('.plan-use-btn').forEach(function(btn){
          if(btn!==usedCard.querySelector('.plan-use-btn')){btn.disabled=true;btn.textContent='Not selected'}
        });
      }));
    });
    wrap.appendChild(grid);
    box.appendChild(wrap);
  }
  const wants=function(t){return /\b(plan|organi[sz]e|arrange|generate|create|make|set ?up|prepare)\b[^.?!]{0,90}\b(event|wedding|birthday|party|conference|fest|seminar|workshop|meetup|anniversary|engagement|launch|farewell|reunion|celebration)\b/i.test(t)||/everything (needed|i need|required)/i.test(t)};
  async function run(text,ui){
    const box=ui.bubble('Building 3 plan options...','ai');box.classList.add('is-loading');
    let base=local(text);
    try{
      const model=(window.EESettings&&EESettings.get&&EESettings.get().aiModel)||'gpt-4o-mini';
      const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'planner',model:model,messages:[{role:'user',content:text}]})});
      if(r.ok){const d=await r.json(),j=(d.reply||'').match(/\{[\s\S]*\}/);if(j)base=merge(base,JSON.parse(j[0]))}
    }catch(e){}
    const plans=variants(base);
    render(box,plans);
    ui.history.push({role:'assistant',content:'Offered '+plans.length+' plan options for '+base.name+'.'});
    ui.keep();
  }
  window.EEPlanner={wants:wants,run:run,local:local,variants:variants};
})();
