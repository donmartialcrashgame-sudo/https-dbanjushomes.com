(function(){
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
async function getLocation(){
 if(!navigator.geolocation)throw Error('Location is not available in this browser.');
 return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(
   p=>resolve(p),e=>reject(new Error(e.code===1?'Location permission was denied.':e.code===2?'Your location could not be determined.':'Location permission timed out.')),
   {enableHighAccuracy:false,timeout:12000,maximumAge:60000}
 ));
}
async function fetchDocs(propertyId){
 const r=await api('/rest/v1/property_documents?select=id,document_type,document_reference,issuing_authority,issue_date,status,storage_path&property_id=eq.'+encodeURIComponent(propertyId)+'&status=eq.verified&order=created_at.asc');
 return r.ok&&Array.isArray(r.data)?r.data:[];
}
async function signPath(path){
 const r=await api('/storage/v1/object/sign/property-documents/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:120})});
 if(!r.ok)throw Error('The protected document could not be opened.');
 const u=r.data?.signedURL; if(!u)throw Error('No protected document URL was returned.');
 return u.startsWith('http')?u:C.supabaseUrl+'/storage/v1'+u;
}
async function renderImage(url,title){
 const pages=document.getElementById('dbh-protected-pages');pages.innerHTML='';
 const wrap=document.createElement('div');wrap.className='dbh-doc-image';
 const img=document.createElement('img');img.alt=title;img.src=url;wrap.appendChild(img);
 const wm=document.createElement('div');wm.className='dbh-document-watermark';wrap.appendChild(wm);pages.appendChild(wrap);
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
   const wm=document.createElement('div');wm.className='dbh-document-watermark';box.appendChild(wm);pages.appendChild(box);
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
 const t=token();
 if(!t){gate('Sign in required','You are not allowed to view this protected DBH document. Please sign in to your DBH account.', '<a class="btn btn-primary" href="/login.html?redirect='+encodeURIComponent(location.href)+'">Sign in</a>');return}
 const user=await api('/auth/v1/user');
 if(!user.ok||!user.data?.id){gate('Sign in required','Your DBH session is no longer valid. Please sign in again.','<a class="btn btn-primary" href="/login.html?redirect='+encodeURIComponent(location.href)+'">Sign in</a>');return}
 const verify=await api('/rest/v1/identity_verification_requests?select=status&user_id=eq.'+encodeURIComponent(user.data.id)+'&limit=1');
 if(!verify.ok||!verify.data?.[0]||verify.data[0].status!=='verified'){
   gate('Identity verification required','Your DBH account must be verified before you can view protected property documents.','<a class="btn btn-primary" href="/verify-account.html?redirect='+encodeURIComponent(location.href)+'">Verify my account</a>');return;
 }
 try{
   gate('Location permission required','Allow location access to continue to this protected document.');
   await getLocation();
   const docs=await fetchDocs(opts.propertyId);
   const doc=opts.documentId?docs.find(x=>x.id===opts.documentId):docs.find(x=>x.document_type===opts.documentType)||docs[0];
   if(!doc||!doc.storage_path){gate('Document unavailable','This document has not been made available for protected viewing yet.');return}
   const signed=await signPath(encodeURIComponent(doc.storage_path).replace(/%2F/g,'/'));
   document.getElementById('dbh-protected-gate').classList.remove('open');
   document.getElementById('dbh-protected-doc').textContent=doc.document_type||opts.documentType||'Legal document';
   const isPdf=/\.pdf($|\?)/i.test(doc.storage_path);
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
document.addEventListener('dragstart',e=>{if(e.target.closest('.dbh-protected-card'))e.preventDefault()});
document.addEventListener('copy',e=>{if(e.target.closest('.dbh-protected-card'))e.preventDefault()});
window.DBHProtectedViewer={open:openViewer};
})();