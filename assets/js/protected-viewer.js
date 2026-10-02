(function(){
'use strict';

const C=window.DBH_CONFIG||{};
const getSession=()=>{try{return JSON.parse(localStorage.getItem('dbh_session')||'null')}catch{return null}};
const getToken=()=>{const s=getSession();return s?.sessionToken||s?.access_token||s?.accessToken||''};
const getUser=()=>{const s=getSession();return s?.user||s||{}};

function addStyles(){
 if(document.getElementById('dbh-protected-style'))return;
 const css=`
.dbh-protected-overlay{position:fixed;inset:0;z-index:999999;background:#eef5fc;display:none}
.dbh-protected-overlay.open{display:block}
.dbh-protected-card{height:100%;display:flex;flex-direction:column;background:#eef5fc;color:#102744}
.dbh-protected-head{min-height:62px;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#fff;border-bottom:1px solid #d9e5f2}
.dbh-protected-brand{display:flex;align-items:center;gap:10px}.dbh-protected-brand img{width:42px;height:42px;border-radius:12px;object-fit:cover}.dbh-protected-brand strong{display:block}.dbh-protected-brand small{display:block;color:#6d7f95;margin-top:3px}
.dbh-protected-meta{text-align:right;margin-left:auto;margin-right:12px}.dbh-protected-meta strong,.dbh-protected-meta span{display:block}.dbh-protected-meta span{font-size:12px;color:#6d7f95;margin-top:2px}
.dbh-protected-close{width:40px;height:40px;border:1px solid #d5e1ef;border-radius:12px;background:#fff;display:grid;place-items:center;cursor:pointer}.dbh-protected-close svg{width:20px;fill:none;stroke:#36526f;stroke-width:1.8}
.dbh-protected-stage{position:relative;flex:1;overflow:auto;padding:28px 20px}
.dbh-protected-pages{max-width:900px;margin:0 auto;position:relative}
.dbh-pdf-page,.dbh-doc-image{position:relative;overflow:hidden;background:#fff;margin:0 auto 22px;box-shadow:0 8px 28px rgba(25,55,90,.14);user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;width:min(900px,100%);height:auto}.dbh-pdf-page canvas{width:100%!important;height:auto!important;display:block}
.dbh-doc-image img{display:block;max-width:100%;width:100%}
.dbh-document-watermark{position:absolute;inset:-18%;z-index:8;pointer-events:none;display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));grid-auto-rows:145px;transform:rotate(-22deg) scale(1.15);transform-origin:center;opacity:.24;overflow:hidden;mix-blend-mode:multiply}
.dbh-document-watermark span{display:flex;align-items:center;justify-content:center;text-align:center;font:800 14px/1.25 Arial,sans-serif;color:#0d3c78;text-shadow:0 1px 0 rgba(255,255,255,.75);white-space:nowrap;user-select:none;-webkit-user-select:none}
.dbh-protected-gate{position:absolute;inset:0;z-index:20;background:rgba(238,245,252,.97);display:none;place-items:center;padding:22px}.dbh-protected-gate.open{display:grid}
.dbh-protected-gate-card{width:min(520px,100%);background:#fff;border:1px solid #d8e5f2;border-radius:24px;padding:28px;box-shadow:0 18px 60px rgba(28,65,105,.14);text-align:center}
.dbh-protected-gate-icon{width:58px;height:58px;margin:0 auto 14px;border-radius:18px;background:#eaf3ff;display:grid;place-items:center}.dbh-protected-gate-icon svg{width:28px;height:28px;fill:none;stroke:#1264d6;stroke-width:1.8}
.dbh-protected-gate-card h2{margin:0 0 8px}.dbh-protected-gate-card p{color:#60748b;line-height:1.55}.dbh-location-note{font-size:12px;line-height:1.5;color:#60748b;background:#f4f8fc;border-radius:12px;padding:11px;margin:14px 0}.dbh-protected-gate-action{min-height:42px}.dbh-protected-status{font-size:12px;color:#c33;margin-top:8px}
.dbh-protected-footer{min-height:58px;padding:10px 20px;background:#fff;border-top:1px solid #d9e5f2;display:flex;align-items:center;justify-content:space-between;gap:15px}.dbh-protected-warning{font-size:11px;color:#657990}.dbh-protected-warning strong{display:block;color:#1264d6;margin-bottom:3px}.dbh-protected-actions{display:flex;gap:8px}.dbh-protected-actions button,.dbh-protected-gate-action button{border:1px solid #cddceb;background:#fff;border-radius:10px;padding:9px 13px;cursor:pointer}.dbh-protected-gate-action .btn-primary{background:#1264d6;color:#fff;border-color:#1264d6}
@media(max-width:700px){.dbh-protected-meta{display:none}.dbh-protected-stage{padding:14px 8px}.dbh-protected-footer{padding:9px 12px}.dbh-protected-warning{max-width:65%}.dbh-protected-watermark span{font-size:11px}}
@media print{.dbh-protected-pages{visibility:hidden!important}}
`;
 const s=document.createElement('style');s.id='dbh-protected-style';s.textContent=css;document.head.appendChild(s);
}

function build(){
 addStyles();
 let o=document.getElementById('dbh-protected-overlay');
 if(o)return o;
 o=document.createElement('div');o.id='dbh-protected-overlay';o.className='dbh-protected-overlay';
 o.innerHTML=`<section class="dbh-protected-card" role="dialog" aria-modal="true" aria-labelledby="dbh-protected-title">
 <header class="dbh-protected-head"><div class="dbh-protected-brand"><img src="/dbh-logo.jpg" alt="DBH"><div><strong id="dbh-protected-title">DBH Protected Document</strong><small id="dbh-protected-property"></small></div></div>
 <div class="dbh-protected-meta"><strong id="dbh-protected-ref"></strong><span id="dbh-protected-doc"></span></div>
 <button class="dbh-protected-close" id="dbh-protected-close" type="button" aria-label="Close viewer"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
 <div class="dbh-protected-stage"><div class="dbh-protected-pages" id="dbh-protected-pages"></div>
 <div class="dbh-protected-gate open" id="dbh-protected-gate"><div class="dbh-protected-gate-card"><div class="dbh-protected-gate-icon" id="dbh-protected-gate-icon"></div><h2 id="dbh-protected-gate-title">Protected document</h2><p id="dbh-protected-gate-text">Checking access…</p><div class="dbh-location-note">DBH requires browser location permission before protected documents can be displayed. Your location is used only for the document-access audit.</div><div id="dbh-protected-gate-action"></div><div class="dbh-protected-status" id="dbh-protected-status"></div></div></div></div>
 <footer class="dbh-protected-footer"><div class="dbh-protected-warning"><strong>DBH PROTECTED DOCUMENT</strong>Printing, downloading, recording and unauthorized reproduction are prohibited. Watermark and viewing-session information are applied to this document.</div><div class="dbh-protected-actions"><button id="dbh-protected-prev" type="button">Previous</button><button id="dbh-protected-next" type="button">Next</button></div></footer></section>`;
 document.body.appendChild(o);
 const close=()=>{o.classList.remove('open');document.body.style.overflow='';document.getElementById('dbh-protected-pages').innerHTML='';};
 document.getElementById('dbh-protected-close').onclick=close;
 document.getElementById('dbh-protected-prev').onclick=()=>document.getElementById('dbh-protected-stage').scrollBy({top:-window.innerHeight*.75,behavior:'smooth'});
 document.getElementById('dbh-protected-next').onclick=()=>document.getElementById('dbh-protected-stage').scrollBy({top:window.innerHeight*.75,behavior:'smooth'});
 return o;
}

function icon(kind){
 if(kind==='location')return '<svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
 if(kind==='user')return '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.7-4 2.8-6 7-6s6.3 2 7 6"/></svg>';
 return '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
}

function gate(title,text,button,kind='lock'){
 build().classList.add('open');document.body.style.overflow='hidden';
 document.getElementById('dbh-protected-gate').classList.add('open');
 document.getElementById('dbh-protected-gate-icon').innerHTML=icon(kind);
 document.getElementById('dbh-protected-gate-title').textContent=title;
 document.getElementById('dbh-protected-gate-text').textContent=text;
 document.getElementById('dbh-protected-gate-action').innerHTML=button||'';
}

function getLocation(){
 if(!navigator.geolocation)return Promise.reject(new Error('Location is not available in this browser.'));
 return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:12000,maximumAge:60000}));
}

async function fetchDocument(docId,propertyId){
 const t=getToken();if(!t)return {ok:false,status:401,data:null};
 const url=(C.propertyDocumentsUri||C.supabaseUrl+'/functions/v1/dbh-property-documents')+'?property_id='+encodeURIComponent(propertyId);
 const r=await fetch(url,{headers:{Accept:'application/json',Authorization:'Bearer '+t,apikey:C.supabaseAnonKey},credentials:'include'});
 const data=await r.json().catch(()=>null);
 if(data?.documents&&docId)data.document=data.documents.find(x=>String(x.id)===String(docId))||null;
 return {ok:r.ok,status:r.status,data};
}

async function logView(propertyId,documentId,position){
 const t=getToken();if(!t)return false;
 const fd=new FormData();fd.append('action','log_view');fd.append('property_id',propertyId);fd.append('document_id',documentId);fd.append('latitude',String(position.coords.latitude));fd.append('longitude',String(position.coords.longitude));
 const r=await fetch(C.propertyDocumentsUri,{method:'POST',headers:{Authorization:'Bearer '+t},body:fd});
 return r.ok;
}

function addWatermark(box){
 const u=getUser(),name=String(u.name||u.full_name||u.user_metadata?.full_name||'DBH User'),email=String(u.email||'').toLowerCase();
 const wm=document.createElement('div');wm.className='dbh-document-watermark';
 const label=('DBH — D BANJUS HOMES NIG LTD • PROTECTED DOCUMENT • FOR VIEWING ONLY — NOT THE ORIGINAL COPY • '+name+' • '+email);
 for(let i=0;i<36;i++){const s=document.createElement('span');s.textContent=label;wm.appendChild(s)}
 box.appendChild(wm);
}

async function renderImage(url,title){
 const pages=document.getElementById('dbh-protected-pages');pages.innerHTML='';
 const box=document.createElement('div');box.className='dbh-doc-image';
 const img=document.createElement('img');img.alt=title;img.src=url;img.draggable=false;box.appendChild(img);pages.appendChild(box);addWatermark(box);
}

async function renderPdf(url,title){
 if(!window.pdfjsLib){
   await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
   window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 }
 const response=await fetch(url);if(!response.ok)throw new Error('The protected PDF could not be loaded.');
 const pdf=await window.pdfjsLib.getDocument({data:await response.arrayBuffer()}).promise;
 const pages=document.getElementById('dbh-protected-pages');pages.innerHTML='';
 for(let i=1;i<=pdf.numPages;i++){
   const page=await pdf.getPage(i); const base=page.getViewport({scale:1}); const maxWidth=Math.min(900,Math.max(280,document.getElementById('dbh-protected-pages').clientWidth||900)); const scale=maxWidth/base.width; const viewport=page.getViewport({scale});
   const box=document.createElement('div');box.className='dbh-pdf-page';
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.style.width='100%';canvas.style.height='auto';canvas.setAttribute('aria-label','Protected document page '+i);box.appendChild(canvas);pages.appendChild(box);
   await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport}).promise;addWatermark(box);
 }
}

async function openViewer(opts){
 const o=build();o.classList.add('open');document.body.style.overflow='hidden';
 document.getElementById('dbh-protected-property').textContent=opts.propertyTitle||'Property';
 document.getElementById('dbh-protected-ref').textContent=opts.propertyCode||'DBH';
 document.getElementById('dbh-protected-doc').textContent=opts.documentType||'Legal document';
 document.getElementById('dbh-protected-pages').innerHTML='';
 const t=getToken();
 if(!t){gate('Sign in required','Your DBH session could not be found.','<a class="btn btn-primary" href="/login.html?redirect='+encodeURIComponent(location.href)+'">Sign in</a>','user');return}
 gate('Location permission required','Allow browser location access to continue. The document will remain hidden if permission is denied.','<button class="btn btn-primary" id="dbh-enable-location" type="button">Allow location & continue</button>','location');
 document.getElementById('dbh-enable-location').onclick=async function(){
   this.disabled=true;this.textContent='Checking location…';
   try{
     const position=await getLocation();
     gate('Opening protected document','Checking your DBH account and document access…');
     const result=await fetchDocument(opts.documentId,opts.propertyId);
     if(!result.ok)throw new Error(result.status===401?'Your DBH session has expired. Please sign in again.':'DBH could not authorize this document.');
     const doc=result.data?.document;
     const signed=doc?.signed_url||doc?.public_preview_url;
     if(!doc||!signed)throw new Error('This document has not been uploaded to protected DBH storage yet.');
     if(!await logView(opts.propertyId,doc.id,position))throw new Error('DBH could not record this viewing session, so the document remains hidden.');
     document.getElementById('dbh-protected-gate').classList.remove('open');
     const isPdf=doc.is_pdf===true||/\.pdf(?:$|\?)/i.test(signed);
     if(isPdf)await renderPdf(signed,doc.document_type||'DBH Legal Document');else await renderImage(signed,doc.document_type||'DBH Legal Document');
   }catch(e){
     gate('Document access blocked',e.message||'DBH could not open this document.','<button class="btn btn-primary" id="dbh-retry-location" type="button">Try again</button>','lock');
     document.getElementById('dbh-retry-location').onclick=()=>openViewer(opts);
   }
 };
}

document.addEventListener('keydown',e=>{
 const open=document.getElementById('dbh-protected-overlay')?.classList.contains('open');if(!open)return;
 const k=String(e.key||'').toLowerCase();
 if(k==='printscreen'||((e.ctrlKey||e.metaKey)&&['p','s','u','c'].includes(k))){e.preventDefault();const p=document.getElementById('dbh-protected-pages');if(p){p.style.visibility='hidden';setTimeout(()=>{if(!document.hidden)p.style.visibility='visible'},900)}}
});
document.addEventListener('contextmenu',e=>{if((e.target instanceof Element && e.target.closest('.dbh-protected-card')))e.preventDefault()});
document.addEventListener('selectstart',e=>{if(e.target instanceof Element && e.target.closest('.dbh-protected-card'))e.preventDefault()});
document.addEventListener('dragstart',e=>{if(e.target instanceof Element && e.target.closest('.dbh-protected-card'))e.preventDefault()});
document.addEventListener('copy',e=>{if(e.target instanceof Element && e.target.closest('.dbh-protected-card'))e.preventDefault()});
document.addEventListener('visibilitychange',()=>{const p=document.getElementById('dbh-protected-pages');if(p?.closest('.dbh-protected-overlay.open'))p.style.visibility=document.hidden?'hidden':'visible'});
document.addEventListener('beforeprint',()=>{const p=document.getElementById('dbh-protected-pages');if(p)p.style.visibility='hidden'});
window.DBHProtectedViewer={open:openViewer};
})();