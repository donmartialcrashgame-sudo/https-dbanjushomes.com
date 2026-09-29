(async function(){
  const sessionResponse=await fetch('/api/auth/session',{
    credentials:'same-origin',
    headers:{Accept:'application/json'}
  }).catch(()=>null);

  if(!sessionResponse?.ok){
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

  const heading=document.getElementById('dashboard-user');
  const email=document.getElementById('dashboard-email');
  if(heading)heading.textContent=user.name||user.email||'DBH User';
  if(email)email.textContent=user.email||'';

  const dataResponse=await fetch('/api/dashboard',{
    credentials:'same-origin',
    headers:{Accept:'application/json'}
  }).catch(()=>null);

  if(!dataResponse?.ok){
    document.getElementById('recent-activity')?.replaceChildren(document.createTextNode('Dashboard data is temporarily unavailable.'));
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
    try{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'})}catch{}
    localStorage.removeItem('dbh_session');
    location.replace('/');
  });
})();
