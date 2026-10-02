(function(){
if(!document.getElementById("dbh-protected-style"))document.head.insertAdjacentHTML("beforeend","<style id=\"dbh-protected-style\">\n.dbh-protected-pages{position:relative;overflow:hidden}\n.dbh-pdf-page,.dbh-doc-image{position:relative;overflow:hidden}\n.dbh-document-watermark{position:absolute;inset:0;z-index:8;pointer-events:none;display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:150px;transform:rotate(-18deg) scale(1.18);transform-origin:center;opacity:.18;overflow:hidden}\n.dbh-document-watermark span{display:flex;align-items:center;justify-content:center;text-align:center;font:700 16px/1.25 Arial,sans-serif;color:#123b73;white-space:nowrap;user-select:none;-webkit-user-select:none}\n.dbh-protected-pages canvas,.dbh-protected-pages img{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}\n.dbh-location-required{margin-top:12px;padding:10px 12px;border-radius:12px;background:#f3f7fd;color:#27466f;font-size:12px}\n@media print{.dbh-protected-pages{visibility:hidden!important}.dbh-protected-card:after{content:\"DBH PROTECTED DOCUMENT — PRINTING NOT ALLOWED\";position:fixed;inset:40% 0;text-align:center;font:700 24px Arial;color:#123b73}}\n</style>");
const C=window.DBH_CONFIG||{};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const token=()=>{try{const s=JSON.parse(localStorage.getItem('dbh_session')||'null');return s?.access_token||s?.accessToken||null}catch{return null}};
const svg={lock:'<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',pin:'<svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.7-4 2.8-6 7-6s6.3 2 7 6"/></svg>'};
async function api(path,options={}){
 const t=token(); if(!t) return {ok:false,status:401,data:null};
 const r=await fetch(C.supabaseUrl+path,{...options,headers:{apikey:C.supabaseAnonKey,Authorization:'Bearer '+t,Accept:'application/json',...(options.headers||{})}});
 const data=await r.json().catch(()=>null); return {ok:r.ok,status:r.status,data};
}
function build(){
 if(document.getElementById('dbh-protected-overlay'))return document.getElementById('dbh-protected-overlay');
 const o=document.createElement('div');o.id='dbh-protected-overlay';o.className='dbh-protected-overlay';
 o.innerHTML='<section class="dbh-protected-card" role="dialog" aria-modal="true" aria-labelledby="dbh-protected-title"><header class="dbh-protected-head"><div class="dbh-protected-brand"><img src="/dbh-logo.jpg" alt="DBH"><div><strong id="dbh-protected-title">DBH Protected Document</strong><small id="dbh-protected-property"></small></div></div><div class="dbh-protected-meta"><strong id="dbh-protected-ref"></strong><span id="dbh-protected-doc"></span></div><button class="dbh-protected-close" id="dbh-protected-close" type="button" aria-label="Close viewer"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header><div class="dbh-protected-stage"><div class="dbh-protected-pages" id="dbh-protected-pages"></div><div class="dbh-protected-gate open" id="dbh-protected-gate"><div class="dbh-protected-gate-card"><div class="dbh-protected-gate-icon" id="dbh-protected-gate-icon">'+svg.lock+'</div><h2 id="dbh-protected-gate-title">Protected document</h2><p id="dbh-protected-gate-text">Checking your DBH access…</p><div class="dbh-location-note">DBH uses account access and browser location permission as additional controls for protected document viewing. Precise coordinates are not stored by this viewer.</div><div id="dbh-protected-gate-action"></div><div class="dbh-protected-status" id="dbh-protected-status"></div></div></div></div><footer class="dbh-protected-footer"><div class="dbh-protected-warning"><strong>DBH PROTECTED DOCUMENT</strong>Printing, downloading, recording and unauthorized reproduction are prohibited. Watermark and session information are part of the viewer.</div><div class="dbh-protected-actions"><button id="dbh-protected-prev" type="button">Previous</button><button id="dbh-protected-next" type="button">Next</button></div></footer></section></div>';
 document.body.appendChild(o);
 const close=()=>{o.classList.remove('open');document.body.style.overflow='';document.getElementById('dbh-protected-pages').innerHTML=''};
 document.getElementById('dbh-protected-close').onclick=close;
 document.addEventListener('keydown',e=>{if(!o.classList.contains('open'))return;if(e.key==='Escape')close();if((e.ctrlKey||e.metaKey)&&['p','s','u'].includes(e.key.toLowerCase()))e.preventDefault()});
 return o;
}
function gate(title,text,button){
 const el=build();el.classList.add('open');document.body.style.overflow='hidden';
 document.getElementById('dbh-protected-gate').classList.add('open');
 document.getElementById('dbh-protected-gate-title').textContent=title;
 document.getElementById('dbh-protected-gate-text').textContent=text;
 document.getElementById('dbh-protected-gate-icon').innerHTML=title.toLowerCase().includes('location')?svg.pin:title.toLowerCase().includes('sign')?svg.user:svg.lock;
 document.getElementById('dbh-protected-gate-action').innerHTML=button||'';
}
function sessionUser(){
 try{const s=JSON.parse(localStorage.getItem('dbh_session')||'null');return s?.user||s||{}}
 catch{return {}}
}
function addWatermark(box){
 const old=box.querySelector('.dbh-document-watermark');if(old)old.remove();
 const u=sessionUser(), name=String(u.name||u.full_name||u.user_metadata?.full_name||'DBH User'), email=String(u.email||'').toLowerCase();
 const wm=document.createElement('div');wm.className='dbh-document-watermark';
 const label=('D BANJUS HOMES NIG LTD • PROTECTED • '+name+' • '+email).slice(0,180);
 for(let i=0;i<24;i++){const s=document.createElement('span');s.textContent=label;wm.appendChild(s)}
 box.appendChild(wm);
}
async function logView(propertyId,documentId,position){
 const t=(()=>{try{const s=JSON.parse(localStorage.getItem('dbh_session')||'null');return s?.sessionToken||s?.access_token||s?.accessToken||''}catch{return ''}})();
 const fd=new FormData();fd.append('action','log_view');fd.append('property_id',propertyId);fd.append('document_id',documentId);fd.append('latitude',String(position.coords.latitude));fd.append('longitude',String(position.coords.longitude));
 const r=await fetch(C.propertyDocumentsUri,{method:'POST',headers:{Authorization:'Bearer '+t},body:fd});
 return r.ok;
}
 const el=build();el.classList.add('open');document.body.style.overflow='hidden';
 document.getElementById('dbh-protected-gate').classList.add('open');
 document.getElementById('dbh-protected-gate-title').textContent=title;
 document.getElementById('dbh-protected-gate-text').textContent=text;
 document.getElementById('dbh-protected-gate-icon').innerHTML=title.toLowerCase().includes('location')?svg.pin:title.toLowerCase().includes('sign')?svg.user:svg.lock;
 document.getElementById('dbh-protected-gate-action').innerHTML=button||'';
}
async function getLocation(){
 if(!navigator.geolocation)throw Error('Location is not available in this browser.');
 return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(
   p=>resolve(p),e=>reject(new Error(e.code===1?'Location permission was denied.':e.code===2?'Your location could not be determined.':'Location permission timed out.')),
   {enableHighAccuracy:false,timeout:12000,maximumAge:60000}
 ));
}
async function fetchDocument(docId,propertyId){
 const s=(()=>{try{return JSON.parse(localStorage.getItem('dbh_session')||'null')}catch{return null}})();
 const t=s?.sessionToken||s?.access_token||s?.accessToken||'';
 if(!t)return {ok:false,status:401,data:null};
 const qs='property_id='+encodeURIComponent(propertyId);
 const r=await fetch((C.propertyDocumentsUri||C.supabaseUrl+'/functions/v1/dbh-property-documents')+'?'+qs,{headers:{Accept:'application/json',Authorization:'Bearer '+t,apikey:C.supabaseAnonKey},credentials:'include'});
 const data=await r.json().catch(()=>null); if(data?.documents&&docId)data.document=data.documents.find(x=>String(x.id)===String(docId))||data.documents[0]||null; return {ok:r.ok,status:r.status,data};
}
async function renderImage(url,title){
 const pages=document.getElementById('dbh-protected-pages');pages.innerHTML='';
 const wrap=document.createElement('div');wrap.className='dbh-doc-image';
 const img=document.createElement('img');img.alt=title;img.src=url;wrap.appendChild(img);
 pages.appendChild(wrap);addWatermark(wrap);
}
async function renderPdf(url,title){
 if(!window.pdfjsLib){
   await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
   window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 }
 const data=await fetch(url).then(r=>{if(!r.ok)throw Error();return r.arrayBuffer()});
 const pdf=await window.pdfjsLib.getDocument({data}).promise;
 const pages=document.getElementById('dbh-protected-pages');pages.innerHTML='';
 for(let i=1;i<=pdf.numPages;i++){
   const page=await pdf.getPage(i), viewport=page.getViewport({scale:1.45});
   const box=document.createElement('div');box.className='dbh-pdf-page';const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;box.appendChild(canvas);
   pages.appendChild(box);addWatermark(box);
   await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
 }
}
async function openViewer(opts){
 const el=build();el.classList.add('open');document.body.style.overflow='hidden';
 document.getElementById('dbh-protected-property').textContent=opts.propertyTitle||'Property';
 document.getElementById('dbh-protected-ref').textContent=opts.propertyCode||'DBH';
 document.getElementById('dbh-protected-doc').textContent=opts.documentType||'Legal document';
 document.getElementById('dbh-protected-pages').innerHTML='';
 document.getElementById('dbh-protected-prev').onclick=()=>window.scrollBy({top:-window.innerHeight*.75,behavior:'smooth'});
 document.getElementById('dbh-protected-next').onclick=()=>window.scrollBy({top:window.innerHeight*.75,behavior:'smooth'});
 const s=(()=>{try{return JSON.parse(localStorage.getItem('dbh_session')||'null')}catch{return null}})();
 const t=s?.sessionToken||s?.access_token||s?.accessToken||'';
 if(!t){gate('Sign in required','Your existing DBH session could not be found. Please sign in to your DBH account.','<a class="btn btn-primary" href="/login.html?redirect='+encodeURIComponent(location.href)+'">Sign in</a>');return}
 try{
   gate('Location permission required','DBH requires browser location permission before this protected document can be displayed. If you deny or turn off location access, the document will remain hidden.','<button class="btn btn-primary" id="dbh-enable-location" type="button">Allow location & continue</button>');
   const locButton=document.getElementById('dbh-enable-location');
   if(locButton)locButton.onclick=async()=>{
     locButton.disabled=true;locButton.textContent='Checking location…';
     try{
       const position=await getLocation();
       gate('Opening protected document','Location verified. Checking your DBH account and document access…');
       const result=await fetchDocument(opts.documentId,opts.propertyId);
       if(!result.ok){gate(result.status===401?'Sign in required':'Document unavailable',result.data?.message||'DBH could not authorize this document with your current session.',result.status===401?'<a class="btn btn-primary" href="/login.html?redirect='+encodeURIComponent(location.href)+'">Sign in</a>':'');return}
       const doc=result.data?.document;
       const signed=doc?.signed_url||doc?.public_preview_url;
       if(!doc||!signed){gate('Document unavailable','This document has not been uploaded to protected DBH storage yet.');return}
       const logged=await logView(opts.propertyId,doc.id,position);
       if(!logged){gate('Access blocked','DBH could not record this document viewing session, so the document remains hidden.');return}
       document.getElementById('dbh-protected-gate').classList.remove('open');
       document.getElementById('dbh-protected-doc').textContent=doc.document_type||opts.documentType||'Legal document';
       const isPdf=doc.is_pdf===true || /\.pdf(?:$|\?)/i.test(signed) || /pdf/i.test(doc.document_type||'');
       if(isPdf)await renderPdf(signed,doc.document_type||'DBH document');else await renderImage(signed,doc.document_type||'DBH document');
     }catch(e){gate('Location required','DBH could not verify your browser location. Please enable location permission and try again.','<button class="btn btn-primary" id="dbh-retry-location" type="button">Try again</button>');const b=document.getElementById('dbh-retry-location');if(b)b.onclick=()=>openViewer(opts)}
   };
   return;
   if(!result.ok){gate(result.status===401?'Sign in required':'Document unavailable',result.data?.message||'DBH could not authorize this document with your current session.',result.status===401?'<a class="btn btn-primary" href="/login.html?redirect='+encodeURIComponent(location.href)+'">Sign in</a>':'');return}
   const doc=result.data?.document;
   const signed=doc?.signed_url||doc?.public_preview_url;
   if(!doc||!signed){gate('Document unavailable','This document has not been uploaded to protected DBH storage yet.');return}
   document.getElementById('dbh-protected-gate').classList.remove('open');
   document.getElementById('dbh-protected-doc').textContent=doc.document_type||opts.documentType||'Legal document';
   const isPdf=doc.is_pdf===true || /\.pdf(?:$|\?)/i.test(signed) || /pdf/i.test(doc.document_type||'');
   if(isPdf)await renderPdf(signed,doc.document_type||'DBH document');else await renderImage(signed,doc.document_type||'DBH document');
 }catch(e){gate('Document access blocked',e.message||'DBH could not open this protected document.')} 
}
const shieldPages=()=>{const o=document.getElementById('dbh-protected-overlay'),p=document.getElementById('dbh-protected-pages');if(!o||!o.classList.contains('open')||!p)return;if(document.hidden){p.style.visibility='hidden'}else{p.style.visibility='visible'}};
document.addEventListener('visibilitychange',shieldPages);
document.addEventListener('keydown',e=>{
 if(!document.getElementById('dbh-protected-overlay')?.classList.contains('open'))return;
 const k=String(e.key||'').toLowerCase();
 const shot=k==='printscreen'||((e.metaKey||e.ctrlKey)&&e.shiftKey&&['3','4','5'].includes(k));
 if(shot){e.preventDefault();const p=document.getElementById('dbh-protected-pages');if(p){p.style.visibility='hidden';setTimeout(()=>{if(!document.hidden)p.style.visibility='visible'},900)}}
});
document.addEventListener('contextmenu',e=>{if(e.target.closest('.dbh-protected-card'))e.preventDefault()});
document.addEventListener('selectstart',e=>{if(e.target.closest('.dbh-protected-card'))e.preventDefault()});
document.addEventListener('beforeprint',()=>{const p=document.getElementById('dbh-protected-pages');if(p)p.style.visibility='hidden'});
document.addEventListener('dragstart',e=>{if(e.target.closest('.dbh-protected-card'))e.preventDefault()});
document.addEventListener('copy',e=>{if(e.target.closest('.dbh-protected-card'))e.preventDefault()});
window.DBHProtectedViewer={open:openViewer};
})();