(function(){
'use strict';
const cfg=()=>window.DBH_CONFIG||{};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=(v,c)=>{try{return new Intl.NumberFormat(c==='NGN'?'en-NG':'en-US',{style:'currency',currency:c||'NGN',maximumFractionDigits:c==='NGN'?0:2}).format(Number(v))}catch{return String(v||'')}};
function skeleton(n=6){return Array.from({length:n},()=>'<div class="property-skeleton"><div class="property-skeleton-image"></div><div class="property-skeleton-line wide"></div><div class="property-skeleton-line"></div><div class="property-skeleton-line short"></div></div>').join('')}
function card(p){
 const id=p.property_code||p.id, loc=[p.area,p.city,p.state].filter(Boolean).join(', ')||'Location available';
 const img=p.og_image_url||'/dbh-logo.jpg';
 const saved=window.DBHSaved?.isSaved?.(p.id)===true;
 const href='/property.html?id='+encodeURIComponent(id);
 const heart='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z"/></svg>';
 return '<article class="property-card dbh-market-card reveal" data-property-id="'+esc(p.id)+'"><a class="property-media dbh-market-media" href="'+href+'"><img loading="lazy" src="'+esc(img)+'" alt="'+esc(p.title||'DBH property')+'" onerror="this.onerror=null;this.src=&quot;/dbh-logo.jpg&quot;"><span class="property-badges"><span class="property-category-badge">'+esc(p.category||p.property_type||'Property')+'</span>'+(p.is_verified===true?'<span class="property-verified-badge"><svg viewBox="0 0 24 24"><path d="M12 3 20 6v5.5c0 4.8-3.3 7.8-8 9.5-4.7-1.7-8-4.7-8-9.5V6l8-3Z"/><path d="m8.5 11.8 2.2 2.2 4.8-5"/></svg></span>':'')+'</span><span class="dbh-market-watermark">D BANJUS HOMES NIG LTD</span></a><div class="property-body dbh-market-body"><div class="dbh-market-top"><span class="dbh-market-type">'+esc(p.property_type||p.category||'Property')+'</span><button type="button" class="dbh-market-save '+(saved?'saved':'')+'" data-save-id="'+esc(p.id)+'" aria-pressed="'+(saved?'true':'false')+'" aria-label="'+(saved?'Remove from saved properties':'Save property')+'" title="'+(saved?'Saved — click to remove':'Save property')+'">'+heart+'</button></div><h3 class="property-title dbh-market-title"><a href="'+href+'">'+esc(p.title||'Property')+'</a></h3><div class="property-price dbh-market-price">'+money(p.price,p.currency||'NGN')+'</div><div class="property-meta property-location dbh-market-location"><svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>'+esc(loc)+'</div><div class="property-provider dbh-market-provider"><span class="provider-avatar">DBH</span><span class="provider-copy"><small>Provider</small><strong>'+esc(p.provider_name||p.agency_name||'D Banjus Homes Nig Ltd')+'</strong></span></div><div class="dbh-market-actions"><a class="btn btn-primary" href="'+href+'">View property</a><a class="btn btn-outline" href="/contact.html?property='+encodeURIComponent(p.slug||p.property_code||p.id)+'">Enquire</a></div></div></article>';
}

async function fetchProperties(){
 const c=cfg();
 if(!c.supabaseUrl||!c.supabaseAnonKey)throw Error('Supabase configuration missing');
 const headers={Accept:'application/json',apikey:c.supabaseAnonKey};
 const propertyUrl=new URL(c.supabaseUrl+'/rest/v1/properties');
 propertyUrl.searchParams.set('select','*');
 propertyUrl.searchParams.set('is_published','eq.true');
 propertyUrl.searchParams.set('verification_status','eq.verified');
 propertyUrl.searchParams.set('order','created_at.desc');
 const propertyResponse=await fetch(propertyUrl.toString(),{headers});
 if(!propertyResponse.ok)throw Error('Supabase properties HTTP '+propertyResponse.status);
 const properties=await propertyResponse.json();
 if(!Array.isArray(properties)||!properties.length)return [];
 const ids=properties.map(p=>p.id).filter(Boolean);
 const imageUrl=new URL(c.supabaseUrl+'/rest/v1/property_images');
 imageUrl.searchParams.set('select','property_id,image_url,sort_order,is_cover');
 imageUrl.searchParams.set('property_id','in.('+ids.join(',')+')');
 imageUrl.searchParams.set('order','sort_order.asc');
 const imageResponse=await fetch(imageUrl.toString(),{headers});
 const images=imageResponse.ok?await imageResponse.json():[];
 const covers={};
 (Array.isArray(images)?images:[]).forEach(img=>{
   if(!img.property_id||!img.image_url)return;
   if(img.is_cover===true||covers[img.property_id]===undefined)covers[img.property_id]=img.image_url;
 });
 return properties.map(p=>({...p,og_image_url:p.og_image_url||covers[p.id]||'/dbh-logo.jpg'}));
}
let all=[];
function renderVisibleSaveStates(){
 const box=document.getElementById('property-results');if(!box)return;
 box.querySelectorAll('[data-save-id]').forEach(b=>{
   const saved=window.DBHSaved?.isSaved?.(b.dataset.saveId)===true;
   b.classList.toggle('saved',saved);b.setAttribute('aria-pressed',saved?'true':'false');b.setAttribute('aria-label',saved?'Remove from saved properties':'Save property');b.title=saved?'Saved — click to remove':'Save property';
 });
}
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
  document.getElementById('property-results')?.addEventListener('click',e=>{
    const b=e.target.closest('[data-save-id]');
    if(!b)return;
    e.preventDefault();e.stopPropagation();
    const session=window.DBHSaved?.list?JSON.parse(localStorage.getItem('dbh_session')||'null'):null;
    const user=session?.user||session;
    if(!user?.email){location.href='/login.html?redirect='+encodeURIComponent(location.href);return;}
    const property=all.find(x=>String(x.id)===String(b.dataset.saveId));
    if(!property)return;
    const saved=window.DBHSaved.isSaved(property.id);
    saved?window.DBHSaved.remove(property.id):window.DBHSaved.save({...property,cover_image:property.og_image_url||'/dbh-logo.jpg'});
    renderVisibleSaveStates();
  });
  window.addEventListener('dbh-saved-changed',renderVisibleSaveStates);
 }catch(e){
  console.error('DBH properties page:',e);
  box.innerHTML='<div class="panel"><strong>Properties could not be loaded.</strong><br><small>Please refresh the page. The DBH database response could not be completed.</small></div>';
  const count=document.getElementById('result-count');if(count)count.textContent='Unable to load properties';
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();