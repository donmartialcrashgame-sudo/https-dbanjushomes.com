(function(){
'use strict';

function esc(v){
  return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

function money(v,c){
  if(v==null||v==='')return 'Price on request';
  try{
    return new Intl.NumberFormat(c==='NGN'?'en-NG':'en-US',{
      style:'currency',
      currency:c||'NGN',
      maximumFractionDigits:c==='NGN'?0:2
    }).format(Number(v));
  }catch{
    return String(v);
  }
}

async function getRows(){
  const c=window.DBH_CONFIG||{};
  if(!c.supabaseUrl||!c.supabaseAnonKey)throw Error('Supabase configuration missing');
  const url=c.supabaseUrl+'/rest/v1/properties?select=*&is_published=eq.true&order=created_at.desc';
  const r=await fetch(url,{headers:{Accept:'application/json',apikey:c.supabaseAnonKey}});
  if(!r.ok)throw Error('Supabase HTTP '+r.status+': '+await r.text());
  return await r.json();
}

function propertyType(p){
  return String(p.property_type||p.category||'').toLowerCase().trim();
}

function isLand(p){
  const v=propertyType(p);
  return v.includes('land')||v.includes('plot')||v.includes('estate land');
}

function isCommercial(p){
  const v=propertyType(p);
  return v.includes('commercial')||v.includes('office')||v.includes('shop')||v.includes('warehouse')||v.includes('industrial');
}

function locationName(p){
  return p.location||[p.area,p.city,p.state].filter(Boolean).join(', ')||'Location available';
}

function card(p){
  const id=p.property_code||p.id;
  const img=p.og_image_url||p.image_url||'/dbh-logo.jpg';
  const verified=p.is_verified===true;

  return '<article class="property-card reveal">'+
    '<a class="property-media" href="/property.html?id='+encodeURIComponent(id)+'">'+
      '<img loading="lazy" src="'+esc(img)+'" alt="'+esc(p.title||'DBH property')+'" onerror="this.onerror=null;this.src=&quot;/dbh-logo.jpg&quot;">'+
      '<span class="property-badges">'+
        '<span class="property-category-badge">'+esc(p.category||p.property_type||'Property')+'</span>'+
        (verified?'<span class="property-verified-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5.5c0 4.8-3.3 7.8-8 9.5-4.7-1.7-8-4.7-8-9.5V6l8-3Z"></path><path d="m8.5 11.8 2.2 2.2 4.8-5"></path></svg><span>Verified Property</span></span>':'')+
      '</span>'+
    '</a>'+
    '<div class="property-body">'+
      '<h3 class="property-title"><a href="/property.html?id='+encodeURIComponent(id)+'">'+esc(p.title||'Property')+'</a></h3>'+
      '<div class="property-price">'+money(p.price,p.currency||'NGN')+'</div>'+
      '<div class="property-meta property-location"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg><span>'+esc(locationName(p))+'</span></div>'+
      '<div class="property-provider"><span class="provider-avatar">DBH</span><span class="provider-copy"><small>Provider</small><strong>'+esc(p.provider_name||p.agency_name||'D Banjus Homes Nig Ltd')+'</strong></span></div>'+
    '</div>'+
  '</article>';
}

function setStat(id,value){
  const el=document.getElementById(id);
  if(el)el.textContent=String(value);
}

function populateLocations(rows){
  const box=document.getElementById('popular-locations');
  if(!box)return;

  const counts=new Map();
  rows.forEach(p=>{
    const name=locationName(p);
    if(!name||name==='Location available')return;
    counts.set(name,(counts.get(name)||0)+1);
  });

  const places=[...counts.entries()]
    .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
    .slice(0,8);

  if(!places.length){
    box.innerHTML='<div class="panel">Popular locations will appear here as DBH listings are published.</div>';
    return;
  }

  box.innerHTML=places.map(([name,count])=>
    '<a class="location-card" href="/properties.html?location='+encodeURIComponent(name)+'">'+
      '<span>'+esc(name)+'</span>'+
      '<small>'+count+' '+(count===1?'listing':'listings')+'</small>'+
    '</a>'
  ).join('');
}

function populateTypeOptions(rows){
  const select=document.querySelector('#property-search select[name="type"]');
  if(!select)return;
  const existing=new Set([...select.options].map(o=>o.value.toLowerCase()));
  const types=[...new Set(rows.map(p=>String(p.property_type||'').trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b));
  types.forEach(v=>{
    if(existing.has(v.toLowerCase()))return;
    const option=document.createElement('option');
    option.value=v;
    option.textContent=v.charAt(0).toUpperCase()+v.slice(1);
    select.appendChild(option);
  });
}

function setupSearch(rows){
  const form=document.getElementById('property-search');
  if(!form)return;

  const tabs=[...form.parentElement.querySelectorAll('[data-search-type]')];
  const select=form.elements.type;

  tabs.forEach(tab=>{
    tab.addEventListener('click',()=>{
      tabs.forEach(t=>{
        const active=t===tab;
        t.classList.toggle('active',active);
        t.setAttribute('aria-pressed',active?'true':'false');
      });
      if(select){
        const wanted=tab.dataset.searchType||'';
        const option=[...select.options].find(o=>o.value.toLowerCase()===wanted.toLowerCase());
        select.value=option?wanted:'';
      }
    });
  });

  form.addEventListener('submit',e=>{
    e.preventDefault();
    const f=new FormData(form);
    const params=new URLSearchParams();
    const location=String(f.get('location')||'').trim();
    const type=String(f.get('type')||'').trim();
    const min=String(f.get('minPrice')||'').trim();
    const max=String(f.get('maxPrice')||'').trim();
    if(location)params.set('location',location);
    if(type)params.set('type',type);
    if(min)params.set('minPrice',min);
    if(max)params.set('maxPrice',max);
    const query=params.toString();
    location.href='/properties.html'+(query?'?'+query:'');
  });
}

function syncTabsFromUrl(){
  const type=new URLSearchParams(location.search).get('type')||'';
  document.querySelectorAll('[data-search-type]').forEach(tab=>{
    const active=(tab.dataset.searchType||'')===type;
    tab.classList.toggle('active',active);
    tab.setAttribute('aria-pressed',active?'true':'false');
  });
}

function hideLoader(){
  const l=document.getElementById('app-loader');
  if(l){
    l.classList.add('fade');
    l.style.pointerEvents='none';
    setTimeout(()=>l.remove(),700);
  }
}

async function boot(){
  hideLoader();

  const box=document.getElementById('featured-properties');
  if(!box)return;

  try{
    const rows=await getRows();
    if(!Array.isArray(rows))throw Error('Invalid property response');

    populateTypeOptions(rows);
    setupSearch(rows);
    syncTabsFromUrl();

    const featured=rows.filter(p=>p.is_featured===true).slice(0,6);
    const show=featured.length?featured:rows.slice(0,6);

    box.innerHTML=show.length
      ?show.map(card).join('')
      :'<div class="panel"><strong>No published properties yet.</strong><br><small>New DBH listings will appear here when they are approved.</small></div>';

    box.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible'));

    const locations=new Set(rows.map(locationName).filter(x=>x&&x!=='Location available'));
    setStat('stat-properties',rows.length);
    setStat('stat-locations',locations.size);
    setStat('stat-commercial',rows.filter(isCommercial).length);
    setStat('stat-land',rows.filter(isLand).length);

    populateLocations(rows);
  }catch(e){
    console.error('DBH homepage properties:',e);
    box.innerHTML='<div class="panel"><strong>We could not load the DBH properties.</strong><br><small>Please refresh the page. If this message remains, check the browser console for the database response.</small></div>';
    setStat('stat-properties',0);
    setStat('stat-locations',0);
    setStat('stat-commercial',0);
    setStat('stat-land',0);
  }
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot,{once:true});
}else{
  boot();
}
})();