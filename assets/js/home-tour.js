(function(){
'use strict';
const KEY='dbh_home_tour_completed_v1';
const steps=[
 {target:'.dbh-header-brand',title:'Welcome to DBH Homes',text:'This is the DBH home page. Use the logo anytime to return here.'},
 {target:'#dbh-hero .hero-copy',title:'Discover DBH',text:'Start here to understand the marketplace and the property opportunities available.'},
 {target:'.search-card',title:'Search for a property',text:'Choose a category, enter a location or price range, then press Search to find matching listings.'},
 {target:'.stats-strip',title:'Marketplace overview',text:'These figures summarise published properties, locations, commercial opportunities and land listings.'},
 {target:'.dbh-home-category-grid',title:'Browse by category',text:'Use these shortcuts to browse homes, land, commercial properties or submit a property for review.'},
 {target:'#featured-properties',title:'Explore published listings',text:'Property cards appear here after DBH has approved, confirmed payment for and published a listing. Select a card to view its details.'},
 {target:'#popular-locations',title:'Explore by location',text:'Choose a location to find listings in that area.'},
 {target:'#dbh-sidebar',title:'Your DBH sidebar',text:'This is the final lesson. Open the menu to see your navigation, account links, saved properties, support and display preferences.',sidebar:true}
];
let index=0,overlay,spot,tip,finishing=false;
function $ (s){return document.querySelector(s)}
function ensureUI(){
 if($('#dbh-tour-overlay'))return;
 const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/home-tour.css?v=20261014-1';document.head.appendChild(css);
 overlay=document.createElement('div');overlay.id='dbh-tour-overlay';overlay.className='dbh-tour-overlay';
 overlay.innerHTML='<div class="dbh-tour-spotlight" id="dbh-tour-spotlight"></div><section class="dbh-tour-card" id="dbh-tour-card" role="dialog" aria-modal="true" aria-live="polite"><div class="dbh-tour-kicker">DBH HOMES • QUICK TOUR</div><div class="dbh-tour-progress"><span id="dbh-tour-step-label"></span><span class="dbh-tour-progress-track"><i id="dbh-tour-progress-fill"></i></span></div><h2 id="dbh-tour-title"></h2><p id="dbh-tour-text"></p><div class="dbh-tour-actions"><button type="button" id="dbh-tour-back">Back</button><button type="button" id="dbh-tour-end">End tour</button><button type="button" id="dbh-tour-next">Next</button></div></section>';
 document.body.appendChild(overlay);spot=$('#dbh-tour-spotlight');tip=$('#dbh-tour-card');
 $('#dbh-tour-back').addEventListener('click',()=>go(index-1));
 $('#dbh-tour-next').addEventListener('click',()=>index===steps.length-1?finish():go(index+1));
 $('#dbh-tour-end').addEventListener('click',cleanup);
 overlay.addEventListener('click',e=>{if(e.target===overlay)cleanup()});
 document.addEventListener('keydown',onKey);
}
function ensureReplay(){
 if($('#dbh-tour-replay'))return;
 const b=document.createElement('button');b.type='button';b.id='dbh-tour-replay';b.className='dbh-tour-replay';b.innerHTML='<span aria-hidden="true">✦</span> How to use this page';
 b.addEventListener('click',()=>start(true));document.body.appendChild(b);
}
function onKey(e){if(!overlay||!document.body.classList.contains('dbh-tour-active'))return;if(e.key==='Escape')cleanup();if(e.key==='ArrowRight')index===steps.length-1?finish():go(index+1);if(e.key==='ArrowLeft'&&index>0)go(index-1)}
function revealSidebar(){
 const sidebar=$('#dbh-sidebar');
 const mobile=$('#mobile-menu-button');
 if(sidebar&&!document.documentElement.classList.contains('sidebar-open'))mobile?.click();
}
function go(n){
 index=Math.max(0,Math.min(n,steps.length-1));
 const step=steps[index];
 if(step.sidebar)revealSidebar();
 const target=$(step.target);
 if(!target){if(index<steps.length-1){go(index+1);return}else{finish();return}}
 target.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
 document.body.classList.add('dbh-tour-active');
 document.querySelectorAll('.dbh-tour-target').forEach(el=>el.classList.remove('dbh-tour-target'));
 target.classList.add('dbh-tour-target');
 $('#dbh-tour-step-label').textContent='STEP '+(index+1)+' OF '+steps.length;
 $('#dbh-tour-progress-fill').style.width=((index+1)/steps.length*100)+'%';
 $('#dbh-tour-title').textContent=step.title;
 $('#dbh-tour-text').textContent=step.text;
 $('#dbh-tour-back').disabled=index===0;
 $('#dbh-tour-next').textContent=index===steps.length-1?'Finish tour':'Next';
 $('#dbh-tour-card').classList.toggle('dbh-tour-last-step',!!step.sidebar);
 position(target);
}
function position(target){
 const rect=target.getBoundingClientRect();
 spot.style.left=Math.max(8,rect.left-7)+'px';
 spot.style.top=Math.max(8,rect.top-7)+'px';
 spot.style.width=Math.min(window.innerWidth-16,rect.width+14)+'px';
 spot.style.height=Math.min(window.innerHeight-16,rect.height+14)+'px';
 const cardHeight=tip.offsetHeight||250,cardWidth=Math.min(390,window.innerWidth-28);
 tip.style.width=cardWidth+'px';
 let left=Math.min(Math.max(14,rect.left),window.innerWidth-cardWidth-14);
 let top=rect.bottom+18;
 if(top+cardHeight>window.innerHeight-12)top=rect.top-cardHeight-18;
 if(top<12)top=Math.max(12,(window.innerHeight-cardHeight)/2);
 tip.style.left=left+'px';tip.style.top=top+'px';
}
function start(force){
 ensureUI();ensureReplay();
 finishing=false;index=0;
 overlay.classList.add('is-visible');
 document.body.classList.add('dbh-tour-active');
 go(0);
}
function cleanup(){
 overlay?.classList.remove('is-visible');
 document.body.classList.remove('dbh-tour-active');
 document.querySelectorAll('.dbh-tour-target').forEach(el=>el.classList.remove('dbh-tour-target'));
 document.removeEventListener('keydown',onKey);
 if(document.documentElement.classList.contains('sidebar-open'))$('#mobile-menu-button')?.click();
}
function finish(){
 if(finishing)return;finishing=true;
 localStorage.setItem(KEY,'1');
 cleanup();
 const toast=document.createElement('div');toast.className='dbh-tour-success';toast.setAttribute('role','status');
 toast.innerHTML='<span class="dbh-tour-success-icon">✓</span><span><strong>Tour completed successfully!</strong><small>You now know how to explore DBH Homes and use the sidebar.</small></span><button type="button" aria-label="Dismiss notification">×</button>';
 document.body.appendChild(toast);toast.querySelector('button').addEventListener('click',()=>toast.remove());
 setTimeout(()=>toast.remove(),6500);
}
function init(){
 if(!document.querySelector('.with-right-sidebar'))return;
 ensureReplay();
 if(!localStorage.getItem(KEY))setTimeout(()=>start(false),1100);
 window.addEventListener('resize',()=>{if(document.body.classList.contains('dbh-tour-active')){const t=$(steps[index]?.target);if(t)position(t)}});
 window.addEventListener('scroll',()=>{if(document.body.classList.contains('dbh-tour-active')){const t=$(steps[index]?.target);if(t)position(t)}},{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();