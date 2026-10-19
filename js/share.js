/* EventEase invitations: card image + link, shared via the phone's share sheet, WhatsApp, email, etc. */
(function(){
  const S=window.EventEaseStore;if(!S)return;
  const PAL={peach:['#FFF3EC','#FFC9A3','#F08A8C','#B65E8C','#2a0f22'],rose:['#F08A8C','#D0708F','#B65E8C','#6d2f5c','#ffffff'],sunset:['#FFC9A3','#F08A8C','#B65E8C','#4a1636','#ffffff']};
  const W=1080,H=1350;let ev=null,pal='peach',custom='';
  const $=id=>document.getElementById(id);
  const longDate=d=>{try{return new Date(d+'T00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}catch(e){return d}};
  const host=()=>{const u=S.currentUser();return u?u.name:''};
  const base=()=>location.origin+location.pathname.replace(/[^/]*$/,'');
  function link(){const d={id:ev.id||'',n:ev.name,t:ev.type||'',d:ev.date||'',tm:ev.time||'',l:ev.location||'',h:host(),m:custom,p:pal,he:(S.currentUser()&&S.currentUser().email)||''};
    return base()+'invite.html#'+btoa(unescape(encodeURIComponent(JSON.stringify(d)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
  function msg(){return "You're invited to "+ev.name+'! '+(ev.date?'📅 '+longDate(ev.date)+' ':'')+(ev.time?'⏰ '+ev.time+' ':'')+(ev.location?'📍 '+ev.location+' ':'')+(host()?'— hosted by '+host()+'. ':'')+custom}
  function wrap(c,text,x,y,max,lh){const words=String(text).split(/\s+/);let line='';words.forEach(w=>{const t=line?line+' '+w:w;if(c.measureText(t).width>max&&line){c.fillText(line,x,y);line=w;y+=lh}else line=t});if(line){c.fillText(line,x,y);y+=lh}return y}
  function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
  function draw(cv){
    const c=cv.getContext('2d'),P=PAL[pal],ink=P[4],F='system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';cv.width=W;cv.height=H;
    const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,P[0]);g.addColorStop(.4,P[1]);g.addColorStop(.75,P[2]);g.addColorStop(1,P[3]);c.fillStyle=g;c.fillRect(0,0,W,H);
    c.save();c.shadowColor='rgba(60,20,40,.25)';c.shadowBlur=60;c.shadowOffsetY=20;rr(c,80,130,W-160,H-260,60);c.fillStyle='rgba(255,255,255,.26)';c.fill();c.restore();
    rr(c,80,130,W-160,H-260,60);c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=3;c.stroke();
    c.textAlign='center';c.fillStyle=ink;
    c.font='600 34px '+F;try{c.letterSpacing='10px'}catch(e){}c.fillText("YOU'RE INVITED",W/2,260);try{c.letterSpacing='0px'}catch(e){}
    c.font='800 88px '+F;let y=wrap(c,ev.name,W/2,420,W-280,104);
    c.fillStyle='rgba(255,255,255,.7)';c.fillRect(W/2-60,y+10,120,5);y+=90;c.fillStyle=ink;
    c.font='500 42px '+F;if(ev.type){c.globalAlpha=.8;c.fillText(ev.type,W/2,y);c.globalAlpha=1;y+=80}
    c.font='700 50px '+F;if(ev.date){y=wrap(c,'📅 '+longDate(ev.date),W/2,y,W-260,64)+6}
    if(ev.time){c.fillText('⏰ '+ev.time,W/2,y);y+=76}
    c.font='600 44px '+F;if(ev.location){y=wrap(c,'📍 '+ev.location,W/2,y,W-260,58)+10}
    if(custom){c.font='italic 400 38px '+F;c.globalAlpha=.9;y=wrap(c,custom,W/2,y+20,W-300,50);c.globalAlpha=1}
    c.font='500 38px '+F;if(host())c.fillText('Hosted by '+host(),W/2,H-230);
    c.font='700 30px '+F;c.globalAlpha=.75;c.fillText('EventEase',W/2,H-165);c.globalAlpha=1}
  const toBlob=()=>new Promise(r=>$('shareCanvas').toBlob(r,'image/png'));
  function toast(m){const d=document.createElement('div');d.className='toast';d.setAttribute('role','status');d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),4000)}
  const slug=()=>(ev.name||'invitation').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'invitation';
  async function nativeShare(){
    const blob=await toBlob(),file=new File([blob],slug()+'.png',{type:'image/png'}),data={title:ev.name,text:msg()+'\n'+link()};
    if(navigator.canShare&&navigator.canShare({files:[file]}))data.files=[file];
    if(navigator.share){try{await navigator.share(data)}catch(e){}}else toast('Share sheet not supported here — use the buttons below.')}
  async function download(){const b=await toBlob(),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=slug()+'.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
  function emails(){return S.scoped('guests').filter(g=>g.eventId===ev.id&&g.email).map(g=>g.email).join(',')}
  function open(id){
    ev=S.scoped('events').find(e=>e.id===id);if(!ev){toast('Select an event first');return}
    custom=ev.invitation||'';const w=document.createElement('div');w.className='set-modal';
    w.innerHTML='<div class="set-dialog share-dialog" role="dialog" aria-modal="true" aria-labelledby="shT"><h3 id="shT">Share invitation</h3><canvas id="shareCanvas" class="share-preview"></canvas><label class="share-lab" for="shMsg">Message</label><textarea id="shMsg" rows="3" maxlength="240" placeholder="Add a personal note…"></textarea><label class="share-lab" for="shPal">Card style</label><select id="shPal" class="set-sel"><option value="peach">Peach Glow</option><option value="rose">Rose</option><option value="sunset">Sunset</option></select><div class="share-grid"><button type="button" class="btn btn-primary" id="shNative">Share…</button><button type="button" class="btn" id="shWa">WhatsApp</button><button type="button" class="btn" id="shIg">Instagram</button><button type="button" class="btn" id="shMail">Email</button><button type="button" class="btn" id="shCopy">Copy link</button><button type="button" class="btn" id="shDl">Save image</button></div><small class="share-note">Share… opens your phone’s share sheet (WhatsApp, Instagram, Messages, Mail…). The link opens the invitation on your live website.</small><div class="set-links"><button type="button" class="btn" id="shClose">Close</button></div></div>';
    document.body.appendChild(w);$('shMsg').value=custom;const cv=$('shareCanvas'),redraw=()=>draw(cv);redraw();
    $('shMsg').oninput=e=>{custom=e.target.value;redraw()};$('shPal').onchange=e=>{pal=e.target.value;redraw()};
    const close=()=>{w.remove();document.removeEventListener('keydown',esc)},esc=e=>{if(e.key==='Escape')close()};document.addEventListener('keydown',esc);
    $('shClose').onclick=close;w.onclick=e=>{if(e.target===w)close()};
    $('shNative').onclick=nativeShare;
    $('shWa').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent(msg()+'\n'+link()),'_blank','noopener');
    $('shIg').onclick=async()=>{if(navigator.share)nativeShare();else{await download();toast('Image saved — open Instagram and share it from your gallery.')}};
    $('shMail').onclick=()=>{location.href='mailto:?'+(emails()?'bcc='+encodeURIComponent(emails())+'&':'')+'subject='+encodeURIComponent('Invitation: '+ev.name)+'&body='+encodeURIComponent(msg()+'\n\n'+link())};
    $('shCopy').onclick=async()=>{try{await navigator.clipboard.writeText(link());toast('Invitation link copied')}catch(e){prompt('Copy this link',link())}};
    $('shDl').onclick=download;$('shNative').focus()}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-share]');if(b){e.preventDefault();open(b.dataset.share)}});
  window.EEShare={open};
})();
