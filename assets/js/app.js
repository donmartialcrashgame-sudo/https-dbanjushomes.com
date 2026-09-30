const DBH={theme:{blue:'#0b5ed7',sidebar:'#062e67'},settingsKey:'dbh_ui_settings',sessionKey:'dbh_session'};
function safe(fn){try{return fn()}catch(e){console.error('DBH:',e);}}
function hideLoader(){const l=document.getElementById('app-loader');if(l){l.classList.add('fade');setTimeout(()=>{l.style.display='none'},650)}}
window.addEventListener('error',hideLoader);
window.addEventListener('unhandledrejection',hideLoader);
document.addEventListener('DOMContentLoaded',()=>{hideLoader();safe(bootShell);safe(loadData);safe(setupSearch);safe(setupNotifications);safe(initHeroSlider);safe(dbhGlobalInteractionFix);});
function dbhGlobalInteractionFix(){
  document.addEventListener('click',async(e)=>{
    const menu=e.target.closest('#mobile-menu-button');
    if(menu){
      e.preventDefault();e.stopPropagation();
      document.documentElement.classList.add('sidebar-open');
      document.getElementById('mobile-menu-button')?.setAttribute('aria-expanded','true');
            return;
    }
    const close=e.target.closest('#sidebar-close,#sidebar-backdrop');
    if(close){
      e.preventDefault();e.stopPropagation();
      document.documentElement.classList.remove('sidebar-open');
      document.getElementById('mobile-menu-button')?.setAttribute('aria-expanded','false');
            return;
    }
    const bell=e.target.closest('#notification-button');
    if(bell){
      e.preventDefault();e.stopPropagation();
      if(typeof setupNotifications==='function'){
        const drawer=document.getElementById('notification-drawer');
        if(!drawer){setupNotifications()}
        document.documentElement.classList.add('notification-open');
        const body=document.getElementById('notification-drawer-body');
        const token=getAccessToken();
        if(body&&!token) body.innerHTML='<div class="notification-empty"><h3>Sign in to view notifications</h3><p>Your DBH notifications are private to your account.</p><div class="notification-auth-actions"><a class="btn btn-primary" href="/login.html?redirect='+encodeURIComponent(location.href)+'">Login</a><a class="btn btn-outline" href="/register.html?redirect='+encodeURIComponent(location.href)+'">Sign Up</a></div></div>';
      }
    }
  },true);
}
function bootShell(){applyTheme();initUniversalShell();initAuthState();setupCurrency();document.querySelectorAll('[data-theme-toggle]').forEach(b=>b.addEventListener('click',toggleTheme));}
function getSettings(){try{return JSON.parse(localStorage.getItem(DBH.settingsKey))||{}}catch{return{}}}
function saveSettings(s){localStorage.setItem(DBH.settingsKey,JSON.stringify(s));applyTheme()}
function applyTheme(){const s=getSettings(),r=document.documentElement;r.style.setProperty('--blue',s.primary||DBH.theme.blue);r.style.setProperty('--navy',s.sidebar||DBH.theme.sidebar);r.style.setProperty('--bg',s.background||'#f6f9fd');r.classList.toggle('dbh-dark',s.mode==='dark')}
function toggleTheme(){const s=getSettings();saveSettings({...s,mode:s.mode==='dark'?'light':'dark'})}
async function initAuthState(){
  const a=document.getElementById('auth-actions');
  const p=document.getElementById('profile-button');
  let user=null;

  try{
    const local=getLocalSession();
    const authBase=(window.DBH_CONFIG?.apiBaseUrl||'').replace(/\/$/,'');
    const sessionHeaders={Accept:'application/json'};
    if(local?.sessionToken)sessionHeaders.Authorization='Bearer '+local.sessionToken;
    const r=await fetch(authBase+'/api/auth/session',{credentials:'include',headers:sessionHeaders});
    if(r.ok){
      const d=await r.json().catch(()=>null);
      if(d?.authenticated&&d?.user){
        user=d.user;
        localStorage.setItem(DBH.sessionKey,JSON.stringify({
          authenticated:true,
          provider:user.provider||local?.provider||'google',
          user,
          sessionToken:local?.sessionToken||d?.sessionToken||null
        }));
      }
    }
  }catch{}

  if(!user){
    const session=getLocalSession();
    user=session?.user||null;
  }

  if(!user)user=await getSupabaseUser();

  const found=user||null;
  document.documentElement.classList.toggle('dbh-authenticated',!!found);

  if(a&&p){
    const dash=document.querySelector('[data-header-nav="dashboard"]');
    if(found){
      a.classList.add('hidden');
      p.classList.remove('hidden');
      if(dash){
        dash.href='/dashboard.html';
        dash.dataset.tooltip='Dashboard';
        dash.setAttribute('aria-label','Dashboard');
      }
      const name=firstValue(found.user_metadata||found,['full_name','fullName','name','email'],'Account');
      const avatar=document.querySelector('.profile-avatar');
      const label=document.querySelector('.profile-name');
      if(avatar){
        const initials=String(name).trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'DB';
        const picture=found?.picture||found?.avatar_url||found?.user_metadata?.avatar_url||found?.user_metadata?.picture||'';
        avatar.textContent='';
        if(picture){
          const img=document.createElement('img');
          img.src=picture;
          img.alt=name+' profile photo';
          img.referrerPolicy='no-referrer';
          img.style.width='100%';
          img.style.height='100%';
          img.style.objectFit='cover';
          img.style.borderRadius='inherit';
          img.onload=()=>{avatar.textContent='';avatar.appendChild(img)};
          img.onerror=()=>{avatar.textContent=initials};
          avatar.appendChild(img);
        }else{
          avatar.textContent=initials;
        }
      }
      if(label)label.textContent=String(name).split('@')[0].slice(0,22)||'Account';
      p.onclick=()=>location.href='/dashboard.html';
    }else{
      a.classList.remove('hidden');
      p.classList.add('hidden');
      if(dash){
        dash.href='/login.html?redirect=/dashboard.html';
        dash.dataset.tooltip='Dashboard';
      }
    }
  }

  if(document.getElementById('dbh-sidebar'))await renderSidebar(found);
}

function initMenu(){const b=document.getElementById('menu-button');if(!b)return;b.onclick=()=>{let n=document.getElementById('dbh-mobile-nav');if(!n){n=document.createElement('nav');n.id='dbh-mobile-nav';n.className='mobile-nav';n.innerHTML='<a href="/">Home</a><a href="/properties.html">Properties</a><a href="/land.html">Land</a><a href="/commercial.html">Commercial</a><a href="/agents.html">Agents</a><a href="/about.html">About</a>';document.body.appendChild(n)}n.classList.toggle('open')}}
function getLocalSession(){try{return JSON.parse(localStorage.getItem(DBH.sessionKey)||'null')}catch{return null}}
function getAccessToken(){const s=getLocalSession();return s?.sessionToken||s?.access_token||s?.accessToken||s?.session?.access_token||null}
async function getSupabaseUser(){const c=window.DBH_CONFIG||{},token=getAccessToken();if(!c.supabaseUrl||!c.supabaseAnonKey||!token)return null;try{const r=await fetch(c.supabaseUrl+'/auth/v1/user',{headers:{apikey:c.supabaseAnonKey,Authorization:'Bearer '+token}});if(!r.ok)return null;return await r.json()}catch{return null}}
async function supabaseFetchUser(path){const c=window.DBH_CONFIG||{},token=getAccessToken();if(!c.supabaseUrl||!c.supabaseAnonKey||!token)return null;try{const r=await fetch(c.supabaseUrl+'/rest/v1/'+path,{headers:{Accept:'application/json',apikey:c.supabaseAnonKey,Authorization:'Bearer '+token}});if(!r.ok)throw Error('Supabase HTTP '+r.status);return await r.json()}catch(e){console.error('DBH notifications:',e);return null}}
function notificationIcon(type){const icons={general:'<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9M12 7v5l3 2"/></svg>',property:'<svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',security:'<svg viewBox="0 0 24 24"><path d="M12 3 20 6v5.5c0 4.8-3.3 7.8-8 9.5-4.7-1.7-8-4.7-8-9.5V6l8-3Z"/><path d="m8.5 11.8 2.2 2.2 4.8-5"/></svg>'};return icons[type]||icons.general}
function setupNotifications(){const b=document.getElementById('notification-button');if(!b)return;let drawer=document.getElementById('notification-drawer');if(!drawer){drawer=document.createElement('aside');drawer.id='notification-drawer';drawer.className='notification-drawer';drawer.innerHTML='<div class="notification-drawer-head"><div><span class="eyebrow">DBH ACCOUNT</span><h2>Notifications</h2></div><button type="button" id="notification-drawer-close" aria-label="Close notifications"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div id="notification-drawer-body" class="notification-drawer-body"><div class="notification-loading">Loading notifications…</div></div>';document.body.appendChild(drawer);const overlay=document.createElement('div');overlay.id='notification-backdrop';overlay.className='notification-backdrop';document.body.appendChild(overlay);const close=()=>{document.documentElement.classList.remove('notification-open')};document.getElementById('notification-drawer-close').addEventListener('click',close);overlay.addEventListener('click',close)}
const open=async()=>{document.documentElement.classList.add('notification-open');const body=document.getElementById('notification-drawer-body');const session=getLocalSession();const token=getAccessToken();const dbhSignedIn=!!(session?.authenticated&&session?.user&&session?.sessionToken);if(!token&&!dbhSignedIn){body.innerHTML='<div class="notification-empty"><div class="notification-empty-icon">'+notificationIcon('security')+'</div><h3>Sign in to view notifications</h3><p>Your DBH notifications are private to your account.</p><div class="notification-auth-actions"><a class="btn btn-primary" href="/login.html?redirect='+encodeURIComponent(location.href)+'">Login</a><a class="btn btn-outline" href="/register.html?redirect='+encodeURIComponent(location.href)+'">Sign Up</a></div></div>';return}
if(dbhSignedIn){body.innerHTML='<div class="notification-empty"><div class="notification-empty-icon">'+notificationIcon('general')+'</div><h3>Nothing for now</h3><p>Please check back later. You do not need to sign in again.</p></div>';return}body.innerHTML='<div class="notification-loading">Loading notifications…</div>';const rows=await supabaseFetchUser('notifications?select=id,title,message,type,link,is_read,created_at&order=created_at.desc&limit=30');if(!Array.isArray(rows)||!rows.length){body.innerHTML='<div class="notification-empty"><div class="notification-empty-icon">'+notificationIcon('general')+'</div><h3>You’re all caught up</h3><p>New DBH account, property and marketplace updates will appear here.</p></div>';return}body.innerHTML=rows.map(n=>'<a class="notification-item '+(n.is_read?'read':'unread')+'" href="'+(n.link?escapeHtml(n.link):'#')+'"><span class="notification-item-icon">'+notificationIcon(n.type)+'</span><span><strong>'+escapeHtml(n.title)+'</strong><small>'+escapeHtml(n.message)+'</small><time>'+new Date(n.created_at).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'})+'</time></span></a>').join('');const unread=rows.filter(n=>!n.is_read).length;const count=document.getElementById('notification-count');if(count){count.textContent=unread>99?'99+':String(unread);count.style.display=unread?'grid':'none';}};
b.addEventListener('click',open);document.addEventListener('keydown',e=>{if(e.key==='Escape')document.documentElement.classList.remove('notification-open')});}
function dbhCookieValue(name){return document.cookie.split(';').map(x=>x.trim()).find(x=>x.indexOf(name+'=')===0)?.slice(name.length+1)||null}
function setDbhCookie(name,value,days){try{document.cookie=name+'='+encodeURIComponent(value)+'; Max-Age='+(days*86400)+'; Path=/; SameSite=Lax; Secure'}catch{}}
function consentIcon(type){const m={cookie:'<svg viewBox="0 0 24 24"><path d="M20 13a8 8 0 1 1-9-9 6 6 0 0 0 9 9Z"/><circle cx="8" cy="14" r="1"/><circle cx="11" cy="17" r="1"/><circle cx="14" cy="13" r="1"/><circle cx="9" cy="9" r="1"/></svg>',bell:'<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',pin:'<svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>'};return m[type]||m.cookie}
function permissionState(name){try{return navigator.permissions?.query({name}).then(x=>x.state).catch(()=>null)}catch{return Promise.resolve(null)}}
function setupConsent(){if(document.documentElement.dataset.dbhConsentReady)return;document.documentElement.dataset.dbhConsentReady='1';const run=async()=>{if(!dbhCookieValue('dbh_cookie_consent')&&!localStorage.getItem('dbh_cookie_consent')){const accepted=await showDbhConsent('cookie');if(accepted){setDbhCookie('dbh_cookie_consent','accepted',365);localStorage.setItem('dbh_cookie_consent','accepted');localStorage.setItem('dbh_cache_consent','accepted');try{if(window.caches)window.caches.open('dbh-site-v1').catch(()=>{})}catch{}}else{setDbhCookie('dbh_cookie_consent','essential',365);localStorage.setItem('dbh_cookie_consent','essential');localStorage.setItem('dbh_cache_consent','essential')}}if('Notification' in window&&Notification.permission==='default'&&!sessionStorage.getItem('dbh_notification_prompted')){sessionStorage.setItem('dbh_notification_prompted','1');await showDbhConsent('bell')}const geoState=await permissionState('geolocation');if(navigator.geolocation&&geoState!=='granted'&&geoState!=='denied'&&!sessionStorage.getItem('dbh_location_prompted')){sessionStorage.setItem('dbh_location_prompted','1');await showDbhConsent('pin')}};setTimeout(run,450)}
function showDbhConsent(type){return new Promise(resolve=>{const old=document.getElementById('dbh-consent-modal');old?.remove();const data={cookie:{eyebrow:'WELCOME TO DBH',title:'Cookies & cache',text:'We use essential cookies and local site storage/cache to remember your preferences, keep DBH smooth and improve loading. You stay in control of optional permissions.',primary:'Accept & continue',secondary:'Essential only'},bell:{eyebrow:'STAY UPDATED',title:'Allow notifications',text:'Allow DBH to send you important property, enquiry and account updates on this device. You can change this permission in your browser settings.',primary:'Allow notifications',secondary:'Not now'},pin:{eyebrow:'FIND PROPERTIES NEAR YOU',title:'Allow location',text:'Allow DBH to use your device location to improve nearby property discovery and map experiences. Your browser controls the final permission.',primary:'Allow location',secondary:'Not now'}}[type];const modal=document.createElement('div');modal.id='dbh-consent-modal';modal.className='dbh-consent-modal';modal.innerHTML='<div class="dbh-consent-card" role="dialog" aria-modal="true" aria-labelledby="dbh-consent-title"><button class="dbh-consent-close" type="button" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button><div class="dbh-consent-icon">'+consentIcon(type)+'</div><span class="eyebrow">'+data.eyebrow+'</span><h2 id="dbh-consent-title">'+data.title+'</h2><p>'+data.text+'</p><div class="dbh-consent-actions"><button type="button" class="btn btn-primary" id="dbh-consent-primary">'+data.primary+'</button><button type="button" class="btn btn-outline" id="dbh-consent-secondary">'+data.secondary+'</button></div><small>DBH — D Banjus Homes Nig Ltd</small></div>';document.body.appendChild(modal);const finish=v=>{modal.classList.remove('open');setTimeout(()=>modal.remove(),220);resolve(v)};requestAnimationFrame(()=>modal.classList.add('open'));modal.querySelector('.dbh-consent-primary').onclick=async()=>{if(type==='bell'&&'Notification' in window){try{await Notification.requestPermission()}catch{}}if(type==='pin'&&navigator.geolocation){navigator.geolocation.getCurrentPosition(pos=>{localStorage.setItem('dbh_user_location',JSON.stringify({latitude:pos.coords.latitude,longitude:pos.coords.longitude,accuracy:pos.coords.accuracy,updated_at:new Date().toISOString()}))},()=>{})}finish(true)};modal.querySelector('.dbh-consent-secondary').onclick=()=>finish(false);modal.querySelector('.dbh-consent-close').onclick=()=>finish(false);modal.addEventListener('click',e=>{if(e.target===modal)finish(false)})})}
async function api(path){try{const r=await fetch(path,{headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}catch{return null}}
async function supabaseFetch(path){
  const c=window.DBH_CONFIG||{};
  if(!c.supabaseUrl||!c.supabaseAnonKey){
    console.error('DBH: Supabase configuration is missing');
    return null;
  }
  try{
    const r=await fetch(c.supabaseUrl+'/rest/v1/'+path,{
      method:'GET',
      headers:{
        'Accept':'application/json',
        'apikey':c.supabaseAnonKey
      }
    });
    if(!r.ok){
      const errorText=await r.text();
      console.error('DBH Supabase HTTP '+r.status,errorText);
      return null;
    }
    return await r.json();
  }catch(e){
    console.error('DBH Supabase request failed:',e);
    return null;
  }
}
function normaliseProperty(p){const images=Array.isArray(p.property_images)?p.property_images.slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(x=>x.image_url).filter(Boolean):[];return {...p,images,cover_image:images[0]||p.og_image_url||'/dbh-logo.jpg'}}
function setupSearch(){document.getElementById('property-search')?.addEventListener('submit',e=>{e.preventDefault();location.href='/properties.html?'+new URLSearchParams(new FormData(e.currentTarget)).toString()})}
async function loadData(){
  const results=document.getElementById('property-results');
  const featured=document.getElementById('featured-properties');
  const count=document.getElementById('result-count');
  if(count)count.textContent='Loading properties…';

  // Load the property rows first. Do not make the whole marketplace depend on
  // PostgREST's nested property_images relationship.
  const data=await supabaseFetch('properties?select=*&is_published=eq.true&order=created_at.desc');
  if(!Array.isArray(data)){
    if(count)count.textContent='Unable to load properties';
    const message='<div class="panel"><strong>Properties could not be loaded.</strong><br><small>Please refresh the page. If this continues, the DBH database connection needs attention.</small></div>';
    if(results)results.innerHTML=message;
    if(featured)featured.innerHTML=message;
    return;
  }

  const rows=data.map(normaliseProperty);

  // Images are optional. If this request fails, the property cards still render.
  if(rows.length){
    const images=await supabaseFetch('property_images?select=property_id,image_url,sort_order,is_cover&order=sort_order.asc');
    if(Array.isArray(images)){
      const byProperty={};
      images.forEach(image=>{
        if(!image?.property_id||!image?.image_url)return;
        (byProperty[image.property_id] ||= []).push(image.image_url);
      });
      rows.forEach(p=>{
        const imgs=byProperty[p.id]||[];
        p.images=imgs;
        p.cover_image=imgs[0]||p.og_image_url||'/dbh-logo.jpg';
      });
    }
  }

  if(featured)renderProperties(featured,rows.filter(p=>p.is_featured).slice(0,6));
  if(results){
    if(count)count.textContent=rows.length+' '+(rows.length===1?'property':'properties');
    renderProperties(results,rows);
  }

  const loc=document.getElementById('popular-locations');
  if(loc){
    const names=[...new Set(rows.flatMap(p=>[p.area,p.city,p.lga,p.state].filter(Boolean)))].slice(0,8);
    loc.innerHTML=names.map(x=>'<a class="location-card reveal" href="/properties.html?location='+encodeURIComponent(x)+'">'+escapeHtml(x)+'</a>').join('')||'<div class="panel">Popular locations will appear here from the backend.</div>';
    document.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible'));
  }

  const total=rows.length;
  const locations=new Set(rows.flatMap(p=>[p.state,p.lga,p.city,p.area].filter(Boolean))).size;
  const commercial=rows.filter(p=>String(p.property_type||p.category||'').toLowerCase().includes('commercial')).length;
  const land=rows.filter(p=>String(p.property_type||'').toLowerCase()==='land'||String(p.category||'').toLowerCase().includes('land')).length;
  const stat=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=String(value)};
  stat('stat-properties',total);
  stat('stat-locations',locations);
  stat('stat-commercial',commercial);
  stat('stat-land',land);
}

function icon(name){const icons={shield:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5.5c0 4.8-3.3 7.8-8 9.5-4.7-1.7-8-4.7-8-9.5V6l8-3Z"/><path d="m8.5 11.8 2.2 2.2 4.8-5"/></svg>`,pin:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>`,building:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V4.5A1.5 1.5 0 0 1 5.5 3H14v18M14 8h4.5A1.5 1.5 0 0 1 20 9.5V21M7 7h3M7 11h3M7 15h3M16 12h2M16 16h2M2 21h20"/></svg>`,users:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20c.6-3.4 2.6-5 6-5s5.4 1.6 6 5M16 5.5a3 3 0 0 1 0 5.8M17 15c2.4.3 3.7 1.8 4 5"/></svg>`};return icons[name]||''}
function firstValue(obj,keys,fallback=''){for(const k of keys){const v=obj?.[k];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v}return fallback}
function isVerified(p){return p?.is_verified===true}
function renderProperties(el,rows){if(!rows.length){el.innerHTML='<div class="panel">No published properties are available yet.</div>';return}el.innerHTML=rows.map(p=>{const img=firstValue(p,['cover_image','image_url'],Array.isArray(p.images)?p.images[0]:'/dbh-logo.jpg')||'/dbh-logo.jpg';const u='/property.html?id='+encodeURIComponent(p.property_code||p.id);const category=firstValue(p,['category','property_category','property_type','type'],'Property');const provider=firstValue(p,['provider_name','provider','agent_name','agent','company_name','agency_name'],'DBH Homes');const providerVerified=p?.provider_verified===true||p?.provider_is_verified===true||isVerified(p);const verified=isVerified(p);const location=firstValue(p,['location','address','area','city'],'Location available');return '<article class="property-card reveal"><a class="property-media" href="'+u+'"><img loading="lazy" src="'+escapeHtml(img)+'" alt="'+escapeHtml(p.title||'DBH property')+'"><span class="property-badges"><span class="property-category-badge">'+escapeHtml(category)+'</span>'+(verified?'<span class="property-verified-badge">'+icon('shield')+'<span>Verified Property</span></span>':'')+'</span></a><div class="property-body"><h3 class="property-title"><a href="'+u+'">'+escapeHtml(p.title||'Property')+'</a></h3><div class="property-price" data-price="'+escapeHtml(p.price)+'" data-price-currency="'+escapeHtml(p.currency||'NGN')+'">'+formatPrice(p.price,p.currency||'NGN')+'</div><div class="property-meta property-location">'+icon('pin')+'<span>'+escapeHtml(location)+'</span></div><div class="property-provider"><span class="provider-avatar">'+icon('users')+'</span><span class="provider-copy"><small>Provider</small><strong>'+escapeHtml(provider)+'</strong></span>'+(providerVerified?'<span class="provider-verified">'+icon('shield')+'</span>':'')+'</div></div></article>'}).join('');document.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible'))}
const DBH_CURRENCIES={NGN:{locale:'en-NG'},USD:{locale:'en-US'},EUR:{locale:'de-DE'},CAD:{locale:'en-CA'},GBP:{locale:'en-GB'}};
DBH.currency=localStorage.getItem('dbh_currency')||'NGN';DBH.rates={NGN:1};
function formatNaira(v){return v===null||v===undefined||v===''?'Price on request':'₦'+Number(v).toLocaleString('en-NG')}
function formatPrice(v,source='NGN'){if(v===null||v===undefined||v==='')return 'Price on request';const n=Number(v),from=String(source||'NGN').toUpperCase(),to=DBH.currency;if(!Number.isFinite(n))return 'Price on request';const ngn=n/(DBH.rates[from]||1),out=ngn*(to==='NGN'?1:(DBH.rates[to]||1));return new Intl.NumberFormat(DBH_CURRENCIES[to].locale,{style:'currency',currency:to,maximumFractionDigits:to==='NGN'?0:2}).format(out)}
async function refreshCurrencyRates(){try{const r=await fetch('https://api.frankfurter.dev/v2/rates?base=NGN&quotes=USD,EUR,CAD,GBP');if(!r.ok)return;const data=await r.json();const rates={NGN:1};(Array.isArray(data)?data:[]).forEach(x=>{if(x.quote&&x.rate)rates[x.quote]=Number(x.rate)});if(Object.keys(rates).length>1){DBH.rates=rates;localStorage.setItem('dbh_fx_rates',JSON.stringify(rates));renderCurrencyPrices()}}catch(e){console.warn('DBH FX unavailable',e)}}
function renderCurrencyPrices(){document.querySelectorAll('[data-price]').forEach(el=>el.textContent=formatPrice(el.dataset.price,el.dataset.priceCurrency||'NGN'));document.querySelectorAll('[data-detail-price]').forEach(el=>el.textContent=formatPrice(el.dataset.detailPrice,el.dataset.detailCurrency||'NGN'))}
function setupCurrency(){const host=document.getElementById('dbh-header-actions');if(!host||document.getElementById('dbh-currency-select'))return;const wrap=document.createElement('label');wrap.className='dbh-currency-control';wrap.setAttribute('data-tooltip','Currency');wrap.innerHTML='<span class="dbh-currency-symbol">₦</span><select id="dbh-currency-select" aria-label="Currency"><option value="NGN">NGN</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option><option value="CAD">C$ CAD</option><option value="GBP">£ GBP</option></select>';host.insertBefore(wrap,host.firstChild);const select=wrap.querySelector('select');select.value=DBH_CURRENCIES[DBH.currency]?DBH.currency:'NGN';const sync=()=>{const map={NGN:'₦',USD:'$',EUR:'€',CAD:'C$',GBP:'£'};wrap.querySelector('.dbh-currency-symbol').textContent=map[select.value]||'₦';wrap.dataset.tooltip=select.value};sync();select.addEventListener('change',()=>{DBH.currency=select.value;localStorage.setItem('dbh_currency',DBH.currency);sync();renderCurrencyPrices()});refreshCurrencyRates()}
window.DBH=DBH;DBH.formatPrice=formatPrice
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function sidebarIcon(name){const m={home:'<svg viewBox="0 0 24 24"><path d="M3 10.8 12 3l9 7.8v9.2a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"/></svg>',properties:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',land:'<svg viewBox="0 0 24 24"><path d="m3 19 6-7 4 4 3-5 5 8M3 19h18"/></svg>',commercial:'<svg viewBox="0 0 24 24"><path d="M4 21V4.5A1.5 1.5 0 0 1 5.5 3H14v18M14 8h4.5A1.5 1.5 0 0 1 20 9.5V21M7 7h3M7 11h3M7 15h3M16 12h2M16 16h2M2 21h20"/></svg>',dashboard:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',saved:'<svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 5.2-8.8 10.2-8.8 10.2S3.2 14 3.2 8.8A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.5z"/></svg>',bell:'<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',request:'<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h6M8 16h5"/></svg>',profile:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.7-4 2.8-6 7-6s6.3 2 7 6"/></svg>',security:'<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',help:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4.3 2c-1.2.9-1.8 1.4-1.8 3M12 17h.01"/></svg>',contact:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',theme:'<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18h1.7a2 2 0 0 0 1.5-3.3l-.7-.8a1.5 1.5 0 0 1 1.1-2.5H18a3 3 0 0 0 3-3C21 6.8 17 3 12 3Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="11" cy="7" r=".8"/><circle cx="15.5" cy="8" r=".8"/></svg>',text:'<svg viewBox="0 0 24 24"><path d="M5 5h14M12 5v14M8 19h8"/></svg>',currency:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.7-.6-1.7-1-3-1-2 0-3 1-3 2.3 0 1.4 1.1 2 3 2.4 1.9.4 3 1 3 2.4 0 1.3-1.1 2.4-3 2.4-1.3 0-2.4-.4-3.2-1.1M12 6v12"/></svg>',logout:'<svg viewBox="0 0 24 24"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/></svg>'};return m[name]||m.request}
function sidebarLink(icon,label,href){return '<a href="'+href+'"><span class="nav-icon">'+sidebarIcon(icon)+'</span><span class="nav-label">'+label+'</span><b aria-hidden="true">›</b></a>'}
function renderSidebar(user){const s=document.getElementById('dbh-sidebar');if(!s)return;const logged=!!user;const name=firstValue(user?.user_metadata||user,['full_name','fullName','name','email'],'Account');const initials=String(name).trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'DB';s.innerHTML='<div class="drawer-head"><a href="/" class="sidebar-logo"><img src="/dbh-logo.jpg" alt="DBH"></a><button id="sidebar-close" class="drawer-close" type="button" aria-label="Close navigation"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>'+(logged?'<div class="sidebar-user"><span class="sidebar-user-avatar">'+escapeHtml(initials)+'</span><div><strong>'+escapeHtml(String(name).split('@')[0])+'</strong><small>Property Seeker</small></div></div>':'<div class="sidebar-auth"><a class="sidebar-register" href="/register.html">Register</a><a class="sidebar-signin" href="/login.html">Sign In</a></div>')+'<nav class="sidebar-nav">'+sidebarLink('home','Home','/')+sidebarLink('properties','Properties for Sale','/properties.html')+sidebarLink('land','Land for Sale','/properties.html?type=land')+sidebarLink('commercial','Commercial Property','/properties.html?type=commercial')+'</nav><div class="sidebar-section-title">'+(logged?'ACCOUNT':'DISCOVER')+'</div><nav class="sidebar-nav">'+(logged?sidebarLink('dashboard','Dashboard','/dashboard.html')+sidebarLink('saved','Saved properties','/dashboard.html#saved')+sidebarLink('bell','Property alerts','/dashboard.html#notifications')+sidebarLink('request','My property requests','/dashboard.html#requests')+sidebarLink('profile','My profile','/dashboard.html#profile')+sidebarLink('security','Security','/dashboard.html#security'):sidebarLink('saved','Saved properties','/login.html?redirect=/dashboard.html%23saved')+sidebarLink('bell','Notifications','/login.html?redirect=/dashboard.html%23notifications'))+'</nav><div class="sidebar-section-title">SUPPORT</div><nav class="sidebar-nav">'+sidebarLink('help','Help and FAQs','/dashboard.html#help')+sidebarLink('contact','Contact us','mailto:info@dbanjushomes.com')+'</nav><div class="sidebar-section-title">PREFERENCES</div><div class="sidebar-preferences"><button type="button" data-theme-toggle><span class="nav-icon">'+sidebarIcon('theme')+'</span><span>Theme</span><span class="theme-options"><b>System</b><b>Light</b><b>Dark</b></span></button><button type="button" class="sidebar-setting" data-text-size="normal"><span class="nav-icon">'+sidebarIcon('text')+'</span><span>Text size</span><span class="text-options"><b>A</b><b>A+</b><b>A++</b></span></button><label class="sidebar-setting currency-setting"><span class="nav-icon">'+sidebarIcon('currency')+'</span><span>Currency</span><select id="dbh-sidebar-currency"><option value="NGN">NGN</option><option value="USD">USD</option><option value="GBP">GBP</option><option value="EUR">EUR</option><option value="CAD">CAD</option></select></label>'+(logged?'<button type="button" class="sidebar-setting" id="dbh-signout"><span class="nav-icon">'+sidebarIcon('logout')+'</span><span>Sign out</span><b>›</b></button>':'')+'</div><div class="sidebar-bottom"><a class="sidebar-listing" href="/list-property.html"><span>List a property</span><b>↗</b></a></div>';const current=location.pathname.replace(/\/$/,'')||'/';s.querySelectorAll('.sidebar-nav a').forEach(a=>{const u=new URL(a.href,location.origin);const path=u.pathname.replace(/\/$/,'')||'/';if(path===current)a.classList.add('active')});initSidebarController();bindSidebarPreferences(logged)}
function ensureNotificationAssets(){if(!document.querySelector('link[data-dbh-notifications-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/css/notifications.css';l.setAttribute('data-dbh-notifications-css','true');document.head.appendChild(l)}}
function ensureNotificationButton(actions){if(!actions||document.getElementById('notification-button'))return;const b=document.createElement('button');b.className='notification-button';b.id='notification-button';b.type='button';b.setAttribute('aria-label','Notifications');b.title='Notifications';b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><i id="notification-count" style="display:none">0</i>';actions.prepend(b)}
function headerIcon(name){const m={home:'<svg viewBox="0 0 24 24"><path d="M3 10.8 12 3l9 7.8v9.2a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"/></svg>',properties:'<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5v9.5a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',land:'<svg viewBox="0 0 24 24"><path d="m3 19 6-7 4 4 3-5 5 8M3 19h18"/></svg>',commercial:'<svg viewBox="0 0 24 24"><path d="M4 21V5a2 2 0 0 1 2-2h8v18M14 9h4a2 2 0 0 1 2 2v10M7 7h3M7 11h3M7 15h3M16 13h2M16 17h2"/></svg>',list:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/><rect x="4" y="4" width="16" height="16" rx="3"/></svg>',dashboard:'<svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>',search:'<svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>',profile:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.7-4 2.8-6 7-6s6.3 2 7 6"/></svg>'};return m[name]||''}
function headerNavLink(icon,label,href,key){return '<a class="dbh-header-nav-link" data-header-nav="'+key+'" data-tooltip="'+label+'" aria-label="'+label+'" href="'+href+'">'+headerIcon(icon)+'</a>'}
function markHeaderNavActive(){const path=location.pathname.replace(/\/$/,'')||'/';const params=new URLSearchParams(location.search);document.querySelectorAll('[data-header-nav]').forEach(a=>{const key=a.dataset.headerNav;let active=key==='home'&&path==='/'||key==='properties'&&path==='/properties.html'&&!params.get('type')||key==='land'&&path==='/properties.html'&&params.get('type')==='land'||key==='commercial'&&path==='/properties.html'&&params.get('type')==='commercial'||key==='list'&&path==='/list-property.html'||key==='dashboard'&&path==='/dashboard.html';a.classList.toggle('active',!!active)})}
function initUniversalHeader(){const header=document.querySelector('.site-header');if(!header)return;header.innerHTML='<div class="dbh-header-inner"><a class="dbh-header-brand" href="/" aria-label="DBH — D Banjus Homes Nig Ltd"><img src="/dbh-logo.jpg" alt="DBH"><span><strong>DBH</strong><small>D Banjus Homes Nig Ltd</small></span></a><nav class="dbh-top-nav" aria-label="Main navigation">'+headerNavLink('home','Home','/','home')+headerNavLink('properties','Properties','/properties.html','properties')+'<div class="dbh-nav-dropdown"><a href="/properties.html">All Properties</a><a href="/properties.html?type=land">Land for Sale</a><a href="/properties.html?type=commercial">Commercial Property</a></div>'+headerNavLink('land','Land for Sale','/properties.html?type=land','land')+headerNavLink('commercial','Commercial Property','/properties.html?type=commercial','commercial')+headerNavLink('list','List Property','/list-property.html','list')+headerNavLink('dashboard','Dashboard','/login.html?redirect=/dashboard.html','dashboard')+'</nav><div class="dbh-header-tools"><button id="header-search-button" class="header-icon-button" type="button" aria-label="Search" data-tooltip="Search" aria-expanded="false">'+headerIcon('search')+'</button><div id="dbh-header-actions" class="dbh-header-actions"><div id="auth-actions" class="auth-actions"><a class="btn btn-outline" href="/login.html">Login</a><a class="btn btn-primary" href="/register.html">Sign Up</a></div><button id="profile-button" class="profile-chip hidden" type="button" aria-label="Profile" data-tooltip="Profile"><span class="profile-avatar">DB</span><span class="profile-name">Account</span></button></div><button id="mobile-menu-button" class="mobile-menu-button" type="button" aria-label="Open navigation" aria-expanded="false" data-tooltip="Menu"><span class="hamburger-lines"><i></i><i></i><i></i></span></button></div></div><div id="dbh-search-panel" class="dbh-search-panel" hidden><div class="dbh-search-panel-inner">'+headerIcon('search')+'<input id="quick-search" placeholder="Search property, land, house or location" autocomplete="off"><button id="dbh-search-close" type="button" aria-label="Close search">×</button></div></div>';const actions=document.getElementById('dbh-header-actions');ensureNotificationAssets();ensureNotificationButton(actions);const nb=document.getElementById('notification-button');if(nb){nb.dataset.tooltip='Notifications';nb.setAttribute('aria-label','Notifications')}markHeaderNavActive();setupCurrency();const q=document.getElementById('quick-search'),sb=document.getElementById('header-search-button'),panel=document.getElementById('dbh-search-panel'),close=document.getElementById('dbh-search-close');const toggle=()=>{const open=panel.hasAttribute('hidden');if(open){panel.removeAttribute('hidden');sb?.setAttribute('aria-expanded','true');setTimeout(()=>q?.focus(),30)}else{panel.setAttribute('hidden','');sb?.setAttribute('aria-expanded','false')}};sb?.addEventListener('click',toggle);close?.addEventListener('click',toggle);q?.addEventListener('keydown',e=>{if(e.key==='Enter'){const value=q.value.trim();if(value)location.href='/properties.html?location='+encodeURIComponent(value)}if(e.key==='Escape')toggle()})}
function initUniversalShell(){if(document.body.classList.contains('auth-page')||document.body.classList.contains('admin-page')||document.querySelector('.admin-sidebar'))return;ensureNotificationAssets();initUniversalHeader();let sidebar=document.getElementById('dbh-sidebar');if(!sidebar){sidebar=document.createElement('aside');sidebar.id='dbh-sidebar';sidebar.className='dbh-sidebar';document.body.prepend(sidebar)}let backdrop=document.getElementById('sidebar-backdrop');if(!backdrop){backdrop=document.createElement('div');backdrop.id='sidebar-backdrop';backdrop.className='sidebar-backdrop';document.body.appendChild(backdrop)}const initial=getLocalSession();renderSidebar(initial?.user||initial)}
function bindSidebarPreferences(logged){document.querySelectorAll('#dbh-sidebar [data-theme-toggle]').forEach(b=>b.addEventListener('click',toggleTheme));const sizeBtns=document.querySelectorAll('#dbh-sidebar [data-text-size]');sizeBtns.forEach(b=>b.addEventListener('click',()=>{const cur=document.documentElement.dataset.dbhTextSize||'normal';document.documentElement.dataset.dbhTextSize=cur==='normal'?'large':cur==='large'?'xlarge':'normal'}));const cs=document.getElementById('dbh-sidebar-currency');if(cs){cs.value=DBH.currency||'NGN';cs.onchange=()=>{DBH.currency=cs.value;localStorage.setItem('dbh_currency',DBH.currency);renderCurrencyPrices()}}document.getElementById('dbh-signout')?.addEventListener('click',async()=>{try{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'})}catch{}localStorage.removeItem(DBH.sessionKey);location.href='/'});}
function initSidebarController(){const s=document.getElementById('dbh-sidebar'),mobileBtn=document.getElementById('mobile-menu-button'),closeBtn=document.getElementById('sidebar-close'),back=document.getElementById('sidebar-backdrop');if(!s)return;const open=()=>{document.documentElement.classList.add('sidebar-open');mobileBtn?.setAttribute('aria-expanded','true')};const close=()=>{document.documentElement.classList.remove('sidebar-open');mobileBtn?.setAttribute('aria-expanded','false')};mobileBtn?.addEventListener('click',open);closeBtn?.addEventListener('click',close);back?.addEventListener('click',close);s.querySelectorAll('a').forEach(x=>x.addEventListener('click',close));document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});}

function initHeroSlider(){
  const hero=document.getElementById('dbh-hero'), slides=[...document.querySelectorAll('.hero-slide')], dots=[...document.querySelectorAll('[data-hero-slide]')];
  if(!hero||slides.length<2)return;
  let index=0,timer=null;
  const show=(next)=>{
    index=(next+slides.length)%slides.length;
    slides.forEach((s,i)=>s.classList.toggle('active',i===index));
    dots.forEach((d,i)=>{d.classList.toggle('active',i===index);d.setAttribute('aria-current',i===index?'true':'false')});
  };
  const start=()=>{clearInterval(timer);timer=setInterval(()=>show(index+1),5200)};
  dots.forEach(d=>d.addEventListener('click',()=>{show(Number(d.dataset.heroSlide||0));start()}));
  slides.forEach(s=>{const url=s.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/)?.[1];if(url){const img=new Image();img.src=url;}});
  hero.addEventListener('mouseenter',()=>clearInterval(timer));
  hero.addEventListener('mouseleave',start);
  show(0);start();
}
