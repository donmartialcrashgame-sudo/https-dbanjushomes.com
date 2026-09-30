(async function(){
  const local=(()=>{try{return JSON.parse(localStorage.getItem('dbh_session')||'null')}catch{return null}})();
  const api=(window.DBH_CONFIG?.apiBaseUrl||'').replace(/\/$/,'');
  const headers={Accept:'application/json'};
  if(local?.sessionToken)headers.Authorization='Bearer '+local.sessionToken;
  const sessionResponse=await fetch(api+'/api/auth/session',{credentials:'include',headers}).catch(()=>null);

  if(!sessionResponse?.ok){
    if(local?.access_token&&local?.user){
      const user=local.user;
      renderUser(user);
      renderLocalFallback();
      return;
    }
    localStorage.removeItem('dbh_session');
    location.replace('/login.html?redirect=/dashboard.html');
    return;
  }

  const session=await sessionResponse.json().catch(()=>({}));
  if(!session?.authenticated||!session?.user){
    localStorage.removeItem('dbh_session');
    location.replace('/login.html?redirect=/dashboard.html');
    return;
  }

  const user=session.user;
  localStorage.setItem('dbh_session',JSON.stringify({authenticated:true,provider:user.provider||'google',user}));

  function renderUser(u){
    const heading=document.getElementById('dashboard-user');
    const label=document.getElementById('dashboard-user-label');
    const email=document.getElementById('dashboard-email');
    const avatar=document.getElementById('dashboard-avatar');
    const name=u?.name||u?.user_metadata?.full_name||u?.user_metadata?.name||u?.email||'DBH User';
    if(heading)heading.textContent=name.split(' ').slice(0,2).join(' ');
    if(label)label.textContent=name.split(' ').slice(0,2).join(' ');
    if(email)email.textContent=u?.email||'';
    if(avatar){
      const initials=String(name).trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'DB';
      avatar.textContent=initials;
    }
  }
  function renderLocalFallback(){
    const recent=document.getElementById('recent-activity');
    if(recent)recent.innerHTML='<div class="dbh-empty">Your account is signed in. Recent account activity will appear here when available.</div>';
    const stats=document.getElementById('dashboard-stats');
    if(stats)stats.innerHTML=[['Saved properties',0,'♡'],['Enquiries',0,'↗'],['Notifications',0,'•'],['Listings',0,'＋']].map(x=>'<article class="dbh-dash-stat"><div class="dbh-dash-stat-top"><small>'+x[0]+'</small><span class="dbh-dash-stat-icon">'+x[2]+'</span></div><strong>'+x[1]+'</strong></article>').join('');
    document.querySelector('[data-header-nav="dashboard"]')?.classList.add('active');
  }

  const dataResponse=await fetch(api+'/api/dashboard',{credentials:'include',headers}).catch(()=>null);

  if(!dataResponse?.ok){
    renderLocalFallback();
    return;
  }

  const d=await dataResponse.json().catch(()=>({}));
  const s=d.data?.stats||{};
  const stats=document.getElementById('dashboard-stats');
  if(stats){
    stats.innerHTML=[
      ['Saved',s.saved??0],
      ['Enquiries',s.enquiries??0],
      ['Notifications',s.notifications??0],
      ['Listings',s.listings??0]
    ].map(x=>'<div class="stat-card"><span>'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join('');
  }

  const recent=document.getElementById('recent-activity');
  if(recent){
    recent.textContent=(d.data?.recentActivity||[]).map(x=>x.title||'Activity').join(' • ')||'No recent activity.';
  }

  document.getElementById('logout-button')?.addEventListener('click',async()=>{
    try{await fetch(api+'/api/auth/logout',{method:'POST',credentials:'include',headers})}catch{}
    localStorage.removeItem('dbh_session');
    location.replace('/');
  });
})();
