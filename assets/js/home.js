(function(){
'use strict';
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function money(v,c){
 if(v==null||v==='')return 'Price on request';
 try{return new Intl.NumberFormat(c==='NGN'?'en-NG':'en-US',{style:'currency',currency:c||'NGN',maximumFractionDigits:c==='NGN'?0:2}).format(Number(v));}catch{return String(v);}
}
async function getRows(){
 const c=window.DBH_CONFIG||{};
 if(!c.supabaseUrl||!c.supabaseAnonKey)throw Error('Supabase configuration missing');
 const url=c.supabaseUrl+'/rest/v1/properties?select=*&is_published=eq.true&order=created_at.desc';
 const r=await fetch(url,{headers:{Accept:'application/json',apikey:c.supabaseAnonKey}});
 if(!r.ok)throw Error('Supabase HTTP '+r.status+': '+await r.text());
 return await r.json();
}
function card(p){
 const id=p.property_code||p.id;
 const img=p.og_image_url||p.image_url||'/dbh-logo.jpg';
 const verified=p.is_verified===true;
 return '<article class="property-card reveal">'+
 '<a class="property-media" href="/property.html?id='+encodeURIComponent(id)+'">'+
 '<img loading="lazy" src="'+esc(img)+'" alt="'+esc(p.title||'DBH property')+'">'+
 '<span class="property-badges"><span class="property-category-badge">'+esc(p.category||p.property_type||'Property')+'</span>'+
 (verified?'<span class="property-verified-badge"><svg viewBox="0 0 24 24"><path d="M12 3 20 6v5.5c0 4.8-3.3 7.8-8 9.5-4.7-1.7-8-4.7-8-9.5V6l8-3Z"/><path d="m8.5 11.8 2.2 2.2 4.8-5"/></svg><span>Verified Property</span></span>':'')+
 '</span></a><div class="property-body">'+
 '<h3 class="property-title"><a href="/property.html?id='+encodeURIComponent(id)+'">'+esc(p.title||'Property')+'</a></h3>'+
 '<div class="property-price">'+money(p.price,p.currency||'NGN')+'</div>'+
 '<div class="property-meta property-location"><svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg><span>'+esc(p.location||[p.area,p.city,p.state].filter(Boolean).join(', ')||'Location available')+'</span></div>'+
 '<div class="property-provider"><span class="provider-avatar">DBH</span><span class="provider-copy"><small>Provider</small><strong>'+esc(p.provider_name||p.agency_name||'D Banjus Homes Nig Ltd')+'</strong></span></div>'+
 '</div></article>';
}
function hideLoader(){const l=document.getElementById('app-loader');if(l){l.classList.add('fade');l.style.pointerEvents='none';setTimeout(()=>l.remove(),700)}}
async function boot(){
 hideLoader();
 const box=document.getElementById('featured-properties');
 if(!box)return;
 try{
  const rows=await getRows();
  if(!Array.isArray(rows))throw Error('Invalid property response');
  const featured=rows.filter(p=>p.is_featured===true).slice(0,6);
  const show=featured.length?featured:rows.slice(0,6);
  box.innerHTML=show.length?show.map(card).join(''):'<div class="panel">No published properties are available yet.</div>';
  box.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible'));
  const stat=document.getElementById('stat-properties');if(stat)stat.textContent=String(rows.length);
  const locations=new Set(rows.flatMap(p=>[p.state,p.lga,p.city,p.area].filter(Boolean)));
  const sl=document.getElementById('stat-locations');if(sl)sl.textContent=String(locations.size);
 }catch(e){
  console.error('DBH homepage properties:',e);
  box.innerHTML='<div class="panel"><strong>We could not load the DBH properties.</strong><br><small>Please refresh the page. If this message remains, check the browser console for the database response.</small></div>';
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();