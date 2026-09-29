(function(){
'use strict';
const cfg=()=>window.DBH_CONFIG||{};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=(v,c)=>{try{return new Intl.NumberFormat(c==='NGN'?'en-NG':'en-US',{style:'currency',currency:c||'NGN',maximumFractionDigits:c==='NGN'?0:2}).format(Number(v))}catch{return String(v||'')}};
function skeleton(n=6){return Array.from({length:n},()=>'<div class="property-skeleton"><div class="property-skeleton-image"></div><div class="property-skeleton-line wide"></div><div class="property-skeleton-line"></div><div class="property-skeleton-line short"></div></div>').join('')}
function card(p){
 const id=p.property_code||p.id, loc=[p.area,p.city,p.state].filter(Boolean).join(', ')||'Location available';
 const img=p.og_image_url||'/dbh-logo.jpg';
 return '<article class="property-card reveal"><a class="property-media" href="/property.html?id='+encodeURIComponent(id)+'"><img loading="lazy" src="'+esc(img)+'" alt="'+esc(p.title||'DBH property')+'"><span class="property-badges"><span class="property-category-badge">'+esc(p.category||p.property_type||'Property')+'</span>'+(p.is_verified===true?'<span class="property-verified-badge"><svg viewBox="0 0 24 24"><path d="M12 3 20 6v5.5c0 4.8-3.3 7.8-8 9.5-4.7-1.7-8-4.7-8-9.5V6l8-3Z"/><path d="m8.5 11.8 2.2 2.2 4.8-5"/></svg>Verified Property</span>':'')+'</span></a><div class="property-body"><h3 class="property-title"><a href="/property.html?id='+encodeURIComponent(id)+'">'+esc(p.title||'Property')+'</a></h3><div class="property-price">'+money(p.price,p.currency||'NGN')+'</div><div class="property-meta property-location">'+esc(loc)+'</div><div class="property-provider"><span class="provider-avatar">DBH</span><span class="provider-copy"><small>Provider</small><strong>'+esc(p.provider_name||p.agency_name||'D Banjus Homes Nig Ltd')+'</strong></span></div></div></article>';
}
async function fetchProperties(){
 const c=cfg(); if(!c.supabaseUrl||!c.supabaseAnonKey)throw Error('Supabase configuration missing');
 const r=await fetch(c.supabaseUrl+'/rest/v1/properties?select=*&is_published=eq.true&order=created_at.desc',{headers:{Accept:'application/json',apikey:c.supabaseAnonKey}});
 if(!r.ok)throw Error('Supabase HTTP '+r.status);
 return r.json();
}
let all=[];
function render(rows){
 const box=document.getElementById('property-results'), count=document.getElementById('result-count');
 if(count)count.textContent=rows.length+' '+(rows.length===1?'property':'properties');
 box.innerHTML=rows.length?rows.map(card).join(''):'<div class="panel">No published properties match your search.</div>';
 box.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible'));
}
function apply(){
 const f=new FormData(document.getElementById('property-filters')),q=String(f.get('q')||'').toLowerCase().trim(),loc=String(f.get('location')||'').toLowerCase().trim(),type=String(f.get('type')||'').toLowerCase(),min=Number(f.get('minPrice')||0),max=Number(f.get('maxPrice')||0);
 let rows=all.filter(p=>{const hay=[p.property_code,p.title,p.description,p.category,p.property_type,p.area,p.city,p.state,p.lga].filter(Boolean).join(' ').toLowerCase();const place=[p.area,p.city,p.state,p.lga,p.address].filter(Boolean).join(' ').toLowerCase();return(!q||hay.includes(q))&&(!loc||place.includes(loc))&&(!type||String(p.property_type||'').toLowerCase()===type)&&(!min||Number(p.price)>=min)&&(!max||Number(p.price)<=max)});
 const sort=document.getElementById('sort-select')?.value;
 if(sort==='price_low')rows.sort((a,b)=>Number(a.price||0)-Number(b.price||0));
 if(sort==='price_high')rows.sort((a,b)=>Number(b.price||0)-Number(a.price||0));
 render(rows);
}
async function boot(){
 const box=document.getElementById('property-results'); if(!box)return;
 box.innerHTML=skeleton(6);
 try{
  all=await fetchProperties();
  if(!Array.isArray(all))throw Error('Invalid response');
  const params=new URLSearchParams(location.search);
  const requestedType=params.get('type');
  const requestedLocation=params.get('location');
  const form=document.getElementById('property-filters');
  if(form){if(requestedType)form.elements.type.value=requestedType;if(requestedLocation)form.elements.location.value=requestedLocation;}
  const type=document.querySelector('select[name="type"]');
  [...new Set(all.map(p=>p.property_type).filter(Boolean))].forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v.charAt(0).toUpperCase()+v.slice(1);type?.appendChild(o)});
  render(all);
  document.getElementById('property-filters')?.addEventListener('submit',e=>{e.preventDefault();apply()});
  document.getElementById('sort-select')?.addEventListener('change',apply);
  if(requestedType||requestedLocation)apply();
 }catch(e){
  console.error('DBH properties page:',e);
  box.innerHTML='<div class="panel"><strong>Properties could not be loaded.</strong><br><small>Please refresh the page. The DBH database response could not be completed.</small></div>';
  const count=document.getElementById('result-count');if(count)count.textContent='Unable to load properties';
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();