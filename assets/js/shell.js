(function(){
'use strict';
const $=s=>document.querySelector(s);
const root=document.documentElement;
function hideLoader(){const l=$('#app-loader');if(l){l.classList.add('fade');setTimeout(()=>{l.style.display='none';l.style.pointerEvents='none'},500)}}
function closeSidebar(){root.classList.remove('sidebar-open');['desktop-menu-button','mobile-menu-button'].forEach(id=>$(('#'+id))?.setAttribute('aria-expanded','false'))}
function openSidebar(){root.classList.add('sidebar-open');['desktop-menu-button','mobile-menu-button'].forEach(id=>$(('#'+id))?.setAttribute('aria-expanded','true'))}
function initSidebar(){
 const sidebar=$('#dbh-sidebar'); if(!sidebar)return;
 const open=()=>openSidebar(),close=()=>closeSidebar();
 ['#desktop-menu-button','#mobile-menu-button'].forEach(sel=>$(sel)?.addEventListener('click',open,{capture:true}));
 $('#sidebar-close')?.addEventListener('click',close,{capture:true});
 $('#sidebar-backdrop')?.addEventListener('click',close,{capture:true});
 sidebar.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
 document.addEventListener('click',e=>{
   const b=e.target.closest?.('#desktop-menu-button,#mobile-menu-button');
   if(b){e.preventDefault();open();return}
   if(e.target.closest?.('#sidebar-close,#sidebar-backdrop')){e.preventDefault();close()}
 });
}
function setConsent(key){try{localStorage.setItem(key,'1')}catch{}}
function hasConsent(key){try{return localStorage.getItem(key)==='1'}catch{return false}}
function permission(name){return navigator.permissions?.query?navigator.permissions.query({name}).then(x=>x.state).catch(()=>null):Promise.resolve(null)}
function icon(type){
 return type==='cookie'?'<svg viewBox="0 0 24 24"><path d="M20 13a8 8 0 1 1-9-9 6 6 0 0 0 9 9Z"/><circle cx="8" cy="14" r="1"/><circle cx="11" cy="17" r="1"/><circle cx="14" cy="13" r="1"/></svg>':
 type==='bell'?'<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>':
 '<svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
}
function consentModal(type){
 return new Promise(resolve=>{
  document.getElementById('dbh-consent-modal')?.remove();
  const d={
   cookie:{eyebrow:'WELCOME TO DBH',title:'Cookies & cache',text:'Allow DBH to use essential cookies and local site storage/cache to remember your preferences and improve loading.',yes:'Accept cookies & continue',no:'Essential only'},
   bell:{eyebrow:'STAY UPDATED',title:'Allow notifications',text:'Allow DBH to send important property, enquiry and account updates to this device.',yes:'Allow notifications',no:'Not now'},
   pin:{eyebrow:'NEARBY PROPERTIES',title:'Allow location',text:'Allow DBH to use your device location for nearby property discovery and map experiences.',yes:'Allow location',no:'Not now'}
  }[type];
  const m=document.createElement('div');m.id='dbh-consent-modal';m.className='dbh-consent-modal';
  m.innerHTML='<div class="dbh-consent-card" role="dialog" aria-modal="true"><button type="button" class="dbh-consent-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button><div class="dbh-consent-icon">'+icon(type)+'</div><span class="eyebrow">'+d.eyebrow+'</span><h2>'+d.title+'</h2><p>'+d.text+'</p><div class="dbh-consent-actions"><button type="button" class="btn btn-primary" data-consent-yes>'+d.yes+'</button><button type="button" class="btn btn-outline" data-consent-no>'+d.no+'</button></div><small>DBH — D Banjus Homes Nig Ltd</small></div>';
  document.body.appendChild(m);
  const done=v=>{m.classList.remove('open');setTimeout(()=>m.remove(),180);resolve(v)};
  requestAnimationFrame(()=>m.classList.add('open'));
  m.querySelector('[data-consent-yes]').addEventListener('click',async()=>{
   if(type==='bell'&&'Notification' in window){try{await Notification.requestPermission()}catch{}}
   if(type==='pin'&&navigator.geolocation){navigator.geolocation.getCurrentPosition(p=>{try{localStorage.setItem('dbh_user_location',JSON.stringify({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,updated_at:new Date().toISOString()}))}catch{}},()=>{})}
   done(true)
  });
  m.querySelector('[data-consent-no]').addEventListener('click',()=>done(false));
  m.querySelector('.dbh-consent-close').addEventListener('click',()=>done(false));
 });
}
async function initConsent(){
 if(!hasConsent('dbh_cookie_consent')){
   const ok=await consentModal('cookie');
   setConsent('dbh_cookie_consent');
   try{document.cookie='dbh_cookie_consent=1; Max-Age=31536000; Path=/; SameSite=Lax; Secure'}catch{}
   if(ok){setConsent('dbh_cache_consent');try{await caches?.open?.('dbh-site-v1')}catch{}}
 }
 if('Notification' in window&&!hasConsent('dbh_notification_choice')){
   const state=Notification.permission;
   if(state==='default'){await consentModal('bell')}
   setConsent('dbh_notification_choice');
 }
 if(navigator.geolocation&&!hasConsent('dbh_location_choice')){
   const state=await permission('geolocation');
   if(state!=='granted'&&state!=='denied'){await consentModal('pin')}
   setConsent('dbh_location_choice');
 }
}
function initTheme(){document.querySelectorAll('[data-theme-toggle]').forEach(b=>{b.onclick=e=>{e.preventDefault();const dark=!root.classList.contains('dbh-dark');try{const s=JSON.parse(localStorage.getItem('dbh_ui_settings')||'{}');s.mode=dark?'dark':'light';localStorage.setItem('dbh_ui_settings',JSON.stringify(s))}catch{}root.classList.toggle('dbh-dark',dark)}})}
function initProfile(){const p=$('#profile-button');if(p)p.onclick=()=>location.href='/dashboard.html'}
function init(){
 hideLoader();initSidebar();initTheme();initProfile();
 setTimeout(()=>initConsent().catch(console.error),350);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
setTimeout(hideLoader,1800);
})();