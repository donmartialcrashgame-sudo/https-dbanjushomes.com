(function(){
'use strict';
const KEY='dbh_home_tour_completed_v2';
const COOKIE_KEY='dbh_home_tour_completed_v2';
function hasSeenTour(){
 try{if(localStorage.getItem(KEY)==='1')return true}catch(_){}
 try{return document.cookie.split(';').some(v=>v.trim()===COOKIE_KEY+'=1')}catch(_){return false}
}
function rememberTour(){
 try{localStorage.setItem(KEY,'1')}catch(_){}
 try{document.cookie=COOKIE_KEY+'=1; Max-Age=31536000; Path=/; SameSite=Lax; Secure'}catch(_){}
}
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
 const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/home-tour.css?v=20261020-1';document.head.appendChild(css);
 overlay=document.createElement('div');overlay.id='dbh-tour-overlay';overlay.className='dbh-tour-overlay';
 overlay.innerHTML='<div class="dbh-tour-spotlight" id="dbh-tour-spotlight"></div><section class="dbh-tour-card" id="dbh-tour-card" role="dialog" aria-modal="true" aria-live="polite"><div class="dbh-tour-kicker">DBH HOMES • QUICK TOUR</div><div class="dbh-tour-progress"><span id="dbh-tour-step-label"></span><span class="dbh-tour-progress-track"><i id="dbh-tour-progress-fill"></i></span></div><h2 id="dbh-tour-title"></h2><p id="dbh-tour-text"></p><div class="dbh-tour-actions"><button type="button" id="dbh-tour-back">Back</button><button type="button" id="dbh-tour-end">End tour</button><button type="button" id="dbh-tour-next">Next</button></div></section>';
 document.body.appendChild(overlay);spot=$('#dbh-tour-spotlight');tip=$('#dbh-tour-card');
 $('#dbh-tour-back').addEventListener('click',()=>go(index-1));
 $('#dbh-tour-next').addEventListener('click',()=>index===steps.length-1?finish():go(index+1));
 $('#dbh-tour-end').addEventListener('click',()=>finish(true,false));
 overlay.addEventListener('click',e=>{if(e.target===overlay)finish(true,false)});
 document.addEventListener('keydown',onKey);
}
function ensureReplay(){
 if($('#dbh-tour-replay'))return;
 const b=document.createElement('button');b.type='button';b.id='dbh-tour-replay';b.className='dbh-tour-replay';b.innerHTML='<span aria-hidden="true">✦</span> How to use this page';
 b.addEventListener('click',()=>start(true));document.body.appendChild(b);
}
function onKey(e){if(!overlay||!document.body.classList.contains('dbh-tour-active'))return;if(e.key==='Escape')finish(true,false);if(e.key==='ArrowRight')index===steps.length-1?finish():go(index+1);if(e.key==='ArrowLeft'&&index>0)go(index-1)}
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
 if(!force&&hasSeenTour())return;
 finishing=false;index=0;
 // Persist immediately so reloading mid-tour cannot restart it, even if local storage is unavailable.
 rememberTour();
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
function finish(markComplete=true){
 if(finishing)return;finishing=true;
 if(markComplete){try{localStorage.setItem(KEY,'1')}catch(_){}}
 cleanup();
 const success=document.createElement('div');success.className='dbh-tour-success';success.setAttribute('role','dialog');success.setAttribute('aria-modal','true');success.setAttribute('aria-labelledby','dbh-tour-success-title');
 success.innerHTML='<section class="dbh-tour-success-card"><button type="button" class="dbh-tour-success-close" aria-label="Close success message">×</button><div class="dbh-tour-success-confetti" aria-hidden="true">🎉</div><span class="dbh-tour-success-kicker"> <span aria-hidden="true">✓</span> TOUR COMPLETED</span><h2 id="dbh-tour-success-title">Congratulations!</h2><p>You have successfully finished your DBH Homes homepage guide. You now know how to search for properties, browse categories and explore locations.</p><div class="dbh-tour-success-tip"><span aria-hidden="true">✦</span><span>You can replay the guide anytime using the <strong>How to use this page</strong> button.</span></div><button type="button" class="dbh-tour-success-done">Great, let’s explore <span aria-hidden="true">→</span></button></section>';
 document.body.appendChild(success);
 const dismiss=()=>success.remove();
 success.querySelector('.dbh-tour-success-close').addEventListener('click',dismiss);
 success.querySelector('.dbh-tour-success-done').addEventListener('click',dismiss);
 success.addEventListener('click',e=>{if(e.target===success)dismiss()});
 success.querySelector('.dbh-tour-success-done').focus();
}
function init(){
 if(!document.querySelector('.with-right-sidebar'))return;
 ensureReplay();
 if(!hasSeenTour())setTimeout(()=>start(false),1100);
 window.addEventListener('resize',()=>{if(document.body.classList.contains('dbh-tour-active')){const t=$(steps[index]?.target);if(t)position(t)}});
 window.addEventListener('scroll',()=>{if(document.body.classList.contains('dbh-tour-active')){const t=$(steps[index]?.target);if(t)position(t)}},{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();