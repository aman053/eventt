(function(){
  const nav=document.querySelector('.menu-toggle');
  const links=document.querySelector('.nav-links');
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if(nav&&links){
    const closeNav=()=>{
      links.classList.remove('open');
      nav.setAttribute('aria-expanded','false');
      document.body.classList.remove('nav-open');
    };
    const openNav=()=>{
      links.classList.add('open');
      nav.setAttribute('aria-expanded','true');
      document.body.classList.add('nav-open');
    };
    nav.addEventListener('click',(e)=>{
      e.stopPropagation();
      if(links.classList.contains('open')) closeNav();
      else openNav();
    });
    links.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeNav));
    document.addEventListener('click',e=>{
      if(!links.contains(e.target)&&!nav.contains(e.target)) closeNav();
    });
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape') closeNav();
    });
  }

  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('service-worker.js').catch(()=>{}));

  const S=window.EventEaseStore;
  if(S){
    const u=S.currentUser();const d=S.db();
    const events=d.events.filter(x=>x.userEmail===u?.email),guests=d.guests.filter(x=>x.userEmail===u?.email),tasks=d.tasks.filter(x=>x.userEmail===u?.email),expenses=d.expenses.filter(x=>x.userEmail===u?.email);
    const e=document.getElementById('heroEvents'),g=document.getElementById('heroGuests'),b=document.getElementById('heroBudget'),t=document.getElementById('heroTasks');
    if(e)e.textContent=events.length;
    if(g)g.textContent=guests.reduce((a,x)=>a+(+x.count||1),0);
    if(b)b.textContent='₹'+expenses.reduce((a,x)=>a+(+x.amount||0),0).toLocaleString('en-IN');
    if(t){const done=tasks.length?Math.round(tasks.filter(x=>x.status==='Completed').length/tasks.length*100):0;t.textContent=done+'%'}
  }

  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
    const el=document.querySelector(a.getAttribute('href'));
    if(el){e.preventDefault();el.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'})}
  }));

  // Lightweight scroll reveals for elements that opt in.
  const candidates=document.querySelectorAll('[data-reveal]');
  if(candidates.length){
    if(reduceMotion||!('IntersectionObserver' in window)) candidates.forEach(el=>el.classList.add('is-visible'));
    else{
      const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}
      }),{threshold:.12,rootMargin:'0px 0px -30px'});
      candidates.forEach(el=>observer.observe(el));
    }
  }

  // Page-to-page transitions are handled by js/transitions.js.


  // Keep the authenticated state visible when moving between public pages.
  // Visiting Home/About/Services must NEVER clear the current session.
  if(S){
    const current = S.currentUser();
    if(current){
      document.documentElement.classList.add('user-authenticated');
      document.querySelectorAll('main a[href="register.html"]').forEach(a=>{a.href='app.html';a.textContent='Open dashboard →'});
      document.querySelectorAll('a.brand').forEach(b=>b.setAttribute('href','app.html'));

      const nav = document.querySelector('.site-header .nav-links');
      if(nav){
        const loginLink = nav.querySelector('a[href="login.html"]');
        const ctaLink = nav.querySelector('a[href="register.html"]');

        if(loginLink){
          loginLink.textContent = 'Dashboard';
          loginLink.href = 'app.html';
          loginLink.classList.remove('active');
        }

        if(ctaLink){
          ctaLink.textContent = 'Sign out';
          ctaLink.href = '#';
          ctaLink.classList.add('nav-signout');
          ctaLink.addEventListener('click', function(event){
            event.preventDefault();
            event.stopPropagation();
            S.clearSession();
            window.location.replace('index.html');
          });
        }
      }
    }
  }

})();
