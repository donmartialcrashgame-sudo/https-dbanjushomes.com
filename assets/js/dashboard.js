(async function(){
  const local=(()=>{try{return JSON.parse(localStorage.getItem('dbh_session')||'null')}catch{return null}})();
  const api=(window.DBH_CONFIG?.apiBaseUrl||'').replace(/\/$/,'');
  const headers={Accept:'application/json'};
  if(local?.sessionToken)headers.Authorization='Bearer '+local.sessionToken;
  const sessionResponse=await fetch(api+'/api/auth/session',{credentials:'include',headers}).catch(()=>null);

  if(!sessionResponse?.ok){
    if((local?.sessionToken||local?.access_token)&&local?.user){
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
  localStorage.setItem('dbh_session',JSON.stringify({authenticated:true,provider:user.provider||local?.provider||'google',user,sessionToken:local?.sessionToken||session?.sessionToken||null}));

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
      const picture=u?.picture||u?.avatar_url||u?.user_metadata?.avatar_url||u?.user_metadata?.picture||'';
      avatar.textContent='';
      if(picture){
        const img=document.createElement('img');
        img.src=picture;
        img.alt=name+' profile photo';
        img.referrerPolicy='no-referrer';
        img.onload=()=>{avatar.textContent='';avatar.appendChild(img)};
        img.onerror=()=>{avatar.textContent=initials};
        avatar.appendChild(img);
      }else{
        avatar.textContent=initials;
      }
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
    const cards=[
      ['Saved properties',s.saved??0,'<svg viewBox="0 0 24 24"><path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-3-6 3V4.5Z"></path></svg>'],
      ['Enquiries',s.enquiries??0,'<svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 3v-5.2A7.5 7.5 0 1 1 20 11.5Z"></path><path d="M8.5 11.5h7M8.5 8.5h4"></path></svg>'],
      ['Notifications',s.notifications??0,'<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>'],
      ['Listings',s.listings??0,'<svg viewBox="0 0 24 24"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z"></path><path d="M12 8v8M8 12h8"></path></svg>']
    ];
    stats.innerHTML=cards.map(x=>'<article class="dbh-dash-stat"><div class="dbh-dash-stat-top"><small>'+x[0]+'</small><span class="dbh-dash-stat-icon">'+x[2]+'</span></div><strong>'+x[1]+'</strong></article>').join('');
  }

  const recent=document.getElementById('recent-activity');
  if(recent){
    recent.textContent=(d.data?.recentActivity||[]).map(x=>x.title||'Activity').join(' • ')||'No recent activity.';
  }

  async function loadLiveProperties(){
    const grid=document.getElementById('dashboard-properties');
    if(!grid)return;
    const c=window.DBH_CONFIG||{};
    if(!c.supabaseUrl||!c.supabaseAnonKey)return;
    const headers={Accept:'application/json',apikey:c.supabaseAnonKey};
    try{
      const u=new URL(c.supabaseUrl+'/rest/v1/properties');
      u.searchParams.set('select','id,property_code,slug,title,price,currency,address,area,city,lga,state,property_type,category,provider_name,og_image_url,is_verified,created_at');
      u.searchParams.set('is_published','eq.true');
      u.searchParams.set('verification_status','eq.verified');
      u.searchParams.set('order','created_at.desc');
      u.searchParams.set('limit','1000');
      const pr=await fetch(u,{headers});
      if(!pr.ok)throw Error('properties '+pr.status);
      const rows=await pr.json();
      if(!Array.isArray(rows)||!rows.length){
        grid.innerHTML='<div class="dbh-live-empty"><strong>No published properties yet.</strong><br>New approved DBH listings will appear here automatically.</div>';
        return;
      }
      const ids=rows.map(x=>x.id).filter(Boolean);
      let images=[];
      if(ids.length){
        const iu=new URL(c.supabaseUrl+'/rest/v1/property_images');
        iu.searchParams.set('select','property_id,image_url,is_cover,sort_order');
        iu.searchParams.set('property_id','in.('+ids.join(',')+')');
        iu.searchParams.set('order','sort_order.asc');
        const ir=await fetch(iu,{headers});
        if(ir.ok)images=await ir.json();
      }
      const covers={};
      (Array.isArray(images)?images:[]).forEach(x=>{if(x?.property_id&&x?.image_url&&(x.is_cover===true||!covers[x.property_id]))covers[x.property_id]=x.image_url});
      const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
      const money=(v,c='NGN')=>{try{return new Intl.NumberFormat(c==='NGN'?'en-NG':'en-US',{style:'currency',currency:c,maximumFractionDigits:c==='NGN'?0:2}).format(Number(v))}catch{return String(v||'Price on request')}};
      const location=p=>[p.address,p.area,p.city,p.lga,p.state].map(x=>String(x??'').trim()).filter(x=>x&&x.toLowerCase()!=='nigeria').filter((x,i,a)=>a.findIndex(y=>y.toLowerCase()===x.toLowerCase())===i).join(', ')||'Nigeria';
      grid.innerHTML=rows.map((p,i)=>{
        const href='/property.html?id='+encodeURIComponent(p.property_code||p.id);
        const img=covers[p.id]||p.og_image_url||'/dbh-logo.jpg';
        return '<article class="dbh-live-card" style="animation-delay:'+Math.min(i,8)*.06+'s"><a class="dbh-live-media" href="'+href+'"><img loading="lazy" src="'+esc(img)+'" alt="'+esc(p.title||'DBH property')+'" onerror="this.onerror=null;this.src=\'/dbh-logo.jpg\'"><span class="dbh-live-badge">'+esc(p.property_type||p.category||'Property')+'</span>'+(p.is_verified===true?'<span class="dbh-live-verified" aria-label="Verified property" title="Verified property"><svg viewBox="0 0 24 24"><path d="M12 3 20 6v5.5c0 4.8-3.3 7.8-8 9.5-4.7-1.7-8-4.7-8-9.5V6l8-3Z"/><path d="m8.5 11.8 2.2 2.2 4.8-5"/></svg></span>':'')+'</a><div class="dbh-live-body"><h3><a href="'+href+'">'+esc(p.title||'DBH Property')+'</a></h3><div class="dbh-live-price">'+money(p.price,p.currency||'NGN')+'</div><div class="dbh-live-location"><svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg><span>'+esc(location(p))+'</span></div><div class="dbh-live-foot"><span class="dbh-live-provider">'+esc(p.provider_name||'D Banjus Homes Nig Ltd')+'</span><a class="dbh-live-view" href="'+href+'">View property →</a></div></div></article>';
      }).join('');
      const stamp=document.getElementById('dashboard-properties-updated');
      if(stamp)stamp.textContent='Updated '+new Date().toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'});
      const live=document.getElementById('live-property-status');
      if(live)live.textContent=rows.length+' live '+(rows.length===1?'property':'properties');
    }catch(err){
      console.warn('DBH live properties:',err);
      grid.innerHTML='<div class="dbh-live-empty"><strong>Properties are temporarily unavailable.</strong><br>Please refresh shortly. The rest of your dashboard is still available.</div>';
    }
  }
  await loadLiveProperties();
  setInterval(loadLiveProperties,30000);

  document.getElementById('logout-button')?.addEventListener('click',async()=>{
    try{await fetch(api+'/api/auth/logout',{method:'POST',credentials:'include',headers})}catch{}
    localStorage.removeItem('dbh_session');
    location.replace('/');
  });
})();
