
const DBH={theme:{blue:'#0b5ed7',sidebar:'#062e67'},settingsKey:'dbh_ui_settings',sessionKey:'dbh_session'};
function safe(fn){try{return fn()}catch(e){console.error('DBH:',e);}}
const DBH_SAVED_KEY_PREFIX='dbh_saved_properties_v1:';
function dbhSavedStorageKey(){
  const s=getLocalSession();
  const user=s?.user||s;
  const email=user?.email||user?.user_metadata?.email||'guest';
  return DBH_SAVED_KEY_PREFIX+String(email).trim().toLowerCase();
}
function dbhGetSavedProperties(){
  try{
    const rows=JSON.parse(localStorage.getItem(dbhSavedStorageKey())||'[]');
    return Array.isArray(rows)?rows.filter(x=>x&&x.id):[];
  }catch{return[]}
}
function dbhIsSavedProperty(id){return dbhGetSavedProperties().some(x=>String(x.id)===String(id))}
function dbhSaveProperty(property){
  if(!property?.id)return false;
  const rows=dbhGetSavedProperties().filter(x=>String(x.id)!==String(property.id));
  rows.unshift({
    id:property.id,
    slug:property.slug||'',
    property_code:property.property_code||'',
    title:property.title||'Property',
    price:property.price??null,
    currency:property.currency||'NGN',
    property_type:property.property_type||property.category||'Property',
    category:property.category||'',
    cover_image:property.cover_image||property.images?.[0]||property.og_image_url||'/dbh-logo.jpg',
    location:[property.area,property.city,property.lga,property.state].filter(Boolean).join(', '),
    saved_at:new Date().toISOString()
  });
  localStorage.setItem(dbhSavedStorageKey(),JSON.stringify(rows.slice(0,100)));
  window.dispatchEvent(new CustomEvent('dbh-saved-changed',{detail:{id:property.id,saved:true}}));
  return true;
}
function dbhRemoveSavedProperty(id){
  const rows=dbhGetSavedProperties().filter(x=>String(x.id)!==String(id));
  localStorage.setItem(dbhSavedStorageKey(),JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent('dbh-saved-changed',{detail:{id,saved:false}}));
  return true;
}
function dbhToggleSavedProperty(property){
  return dbhIsSavedProperty(property?.id)?dbhRemoveSavedProperty(property.id):dbhSaveProperty(property);
}
window.DBHSaved={list:dbhGetSavedProperties,isSaved:dbhIsSavedProperty,save:dbhSaveProperty,remove:dbhRemoveSavedProperty,toggle:dbhToggleSavedProperty,key:dbhSavedStorageKey};

function setupDBHPWA(){
  try{
    if(!document.querySelector('link[data-dbh-pwa-css]')){
      const css=document.createElement('link');
      css.rel='stylesheet';
      css.href='/assets/css/pwa.css';
      css.setAttribute('data-dbh-pwa-css','true');
      document.head.appendChild(css);
    }
  }catch(e){console.warn('DBH PWA stylesheet:',e)}

  try{
    if(!document.querySelector('link[rel="manifest"]')){
      const manifest=document.createElement('link');manifest.rel='manifest';manifest.href='/manifest.webmanifest';document.head.appendChild(manifest);
    }
    const metas=[
      ['meta[name="theme-color"]', 'content', '#0b5ed7'],
      ['meta[name="mobile-web-app-capable"]', 'content', 'yes'],
      ['meta[name="apple-mobile-web-app-capable"]', 'content', 'yes'],
      ['meta[name="apple-mobile-web-app-status-bar-style"]', 'content', 'default'],
      ['meta[name="apple-mobile-web-app-title"]', 'content', 'DBH Homes']
    ];
    metas.forEach(([sel,attr,val])=>{let m=document.querySelector(sel);if(!m){m=document.createElement('meta');if(sel.includes('theme-color'))m.name='theme-color';else if(sel.includes('mobile-web-app-capable'))m.name='mobile-web-app-capable';else if(sel.includes('apple-mobile-web-app-capable'))m.name='apple-mobile-web-app-capable';else if(sel.includes('status-bar-style'))m.name='apple-mobile-web-app-status-bar-style';else m.name='apple-mobile-web-app-title';document.head.appendChild(m)}m.setAttribute(attr,val)});
    if('serviceWorker' in navigator){
      window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(err=>console.warn('DBH service worker:',err)),{once:true});
    }
  }catch(e){console.warn('DBH PWA setup:',e)}
  let deferredPrompt=null;
  const setPrompt=e=>{e.preventDefault();deferredPrompt=e;window.DBHPWADeferredPrompt=e;};
  window.addEventListener('beforeinstallprompt',setPrompt);
  window.addEventListener('appinstalled',()=>{localStorage.setItem('dbh_pwa_installed','1');deferredPrompt=null;window.DBHPWADeferredPrompt=null;document.getElementById('dbh-pwa-modal')?.remove()});
  if(window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true||localStorage.getItem('dbh_pwa_installed')==='1')return;
  const seen=localStorage.getItem('dbh_pwa_prompt_seen')==='1';
  if(seen)return;
  const show=()=>{
    if(localStorage.getItem('dbh_pwa_prompt_seen')==='1')return;
    if(!document.body)return;
    const old=document.getElementById('dbh-pwa-modal');old?.remove();
    const modal=document.createElement('div');modal.id='dbh-pwa-modal';modal.className='dbh-pwa-modal';
    modal.innerHTML='<section class="dbh-pwa-card" role="dialog" aria-modal="true" aria-labelledby="dbh-pwa-title"><div class="dbh-pwa-top"><img class="dbh-pwa-logo" src="/dbh-logo.jpg" alt="DBH — D Banjus Homes Nig Ltd"><span class="dbh-pwa-eyebrow">DBH APP</span><h2 class="dbh-pwa-title" id="dbh-pwa-title">Install DBH — D Banjus Homes Nig Ltd</h2><p class="dbh-pwa-subtitle">Add DBH to your home screen for a faster app-like property experience.</p></div><div class="dbh-pwa-body"><div class="dbh-pwa-features"><div class="dbh-pwa-feature"><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg>Browse DBH properties faster</div><div class="dbh-pwa-feature"><svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18"/></svg>Keep DBH close to your home screen</div><div class="dbh-pwa-feature"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="m20 4-4 1 1 4"/></svg>Open an app-style DBH experience</div></div><div class="dbh-pwa-actions"><button type="button" class="dbh-pwa-install" id="dbh-pwa-install">Install app</button><button type="button" class="dbh-pwa-later" id="dbh-pwa-later">Not now</button></div><p class="dbh-pwa-hint" id="dbh-pwa-hint">Your browser may not expose the one-tap install prompt yet. Use the browser menu and choose <strong>Add to Home screen</strong> or <strong>Install DBH Homes</strong>.</p><span class="dbh-pwa-brand">DBH — D Banjus Homes Nig Ltd</span></div></section>';
    document.body.appendChild(modal);
    const close=()=>{localStorage.setItem('dbh_pwa_prompt_seen','1');modal.classList.remove('open');setTimeout(()=>modal.remove(),180)};
    modal.querySelector('#dbh-pwa-later').onclick=close;
    modal.addEventListener('click',e=>{if(e.target===modal)close()});
    modal.querySelector('#dbh-pwa-install').onclick=async()=>{
      if(deferredPrompt){
        try{
          deferredPrompt.prompt();
          const result=await deferredPrompt.userChoice;
          deferredPrompt=null;window.DBHPWADeferredPrompt=null;
          if(result?.outcome==='accepted')localStorage.setItem('dbh_pwa_installed','1');
        }catch{}
        close();
        return;
      }
      modal.querySelector('#dbh-pwa-hint')?.classList.add('show');
    };
    requestAnimationFrame(()=>modal.classList.add('open'));
  };
  setTimeout(show,700);
}

function setupCustomerCareWidget(){
  if(document.getElementById('dbh-care-widget'))return;
  const css='/assets/css/customer-care.css?v=20261001-5';
  if(!document.querySelector('link[data-dbh-customer-care-css]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href=css;link.dataset.dbhCustomerCareCss='1';document.head.appendChild(link);
  }

  const widget=document.createElement('div');
  widget.id='dbh-care-widget';
  widget.className='dbh-care-widget';
  widget.innerHTML='<span class="dbh-care-label">Message us — we’re online</span>'+
    '<button type="button" class="dbh-care-launcher" id="dbh-care-launcher" aria-label="Message customer care" aria-expanded="false">'+
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13v-1a8 8 0 0 1 16 0v1"></path><path d="M4 13h2.5A1.5 1.5 0 0 1 8 14.5V17a1.5 1.5 0 0 1-1.5 1.5H5A1 1 0 0 1 4 17.5z"></path><path d="M20 13h-2.5a1.5 1.5 0 0 0-1.5 1.5V17a1.5 1.5 0 0 0 1.5 1.5H19a1 1 0 0 0 1-1z"></path><path d="M16 20h-2"></path></svg><i class="dbh-care-online-dot" aria-hidden="true"></i>'+
    '</button>'+
    '<section class="dbh-care-panel" id="dbh-care-panel" aria-label="DBH customer care chat" aria-hidden="true">'+
      '<div class="dbh-care-head"><div class="dbh-care-avatar"><img src="/dbh-logo.jpg" alt="DBH Customer Care"></div><div class="dbh-care-head-copy"><strong>DBH Customer Care</strong><span class="dbh-care-status"><i></i> <b id="dbh-care-status-text">AI assistant</b></span></div><button type="button" class="dbh-care-close" id="dbh-care-close" aria-label="Close customer care"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button></div>'+
      '<div class="dbh-care-body" id="dbh-care-body">'+
        '<div class="dbh-care-intro"><div class="dbh-care-mini-avatar"><img src="/dbh-logo.jpg" alt=""></div><div class="dbh-care-bubble"><strong>Hello 👋</strong>Welcome to DBH. I can help with properties, enquiries, verification, listings and using the website.</div></div>'+
        '<div class="dbh-care-quick"><button type="button" data-care-message="I need help finding a property.">Find a property</button><button type="button" data-care-message="I need help with a property enquiry.">Property enquiry</button><button type="button" data-care-message="I need help verifying a listing.">Verify a listing</button><button type="button" data-care-message="I want to list a property.">List a property</button></div>'+
        ''+
        '<p class="dbh-care-note" id="dbh-care-note"></p>'+
        '<form class="dbh-care-form" id="dbh-care-form"><textarea id="dbh-care-input" maxlength="2000" rows="2" placeholder="Type your message…" aria-label="Your message"></textarea><button class="dbh-care-send" type="submit" aria-label="Send message"><svg viewBox="0 0 24 24"><path d="m21 3-7.5 18-3.5-7L3 10.5z"></path><path d="M21 3 10 14"></path></svg></button></form>'+
      '</div>'+
      '<div class="dbh-care-foot"><span>Powered by DBH AI</span><span>Available 24/7</span></div>'+
    '</section>'+
  '</div>';
  document.body.appendChild(widget);

  const launcher=document.getElementById('dbh-care-launcher');
  const panel=document.getElementById('dbh-care-panel');
  const close=document.getElementById('dbh-care-close');
  const form=document.getElementById('dbh-care-form');
  const input=document.getElementById('dbh-care-input');
  const body=document.getElementById('dbh-care-body');
  const note=document.getElementById('dbh-care-note');
  const statusText=document.getElementById('dbh-care-status-text');
  const api=window.DBH_CONFIG?.customerCareUri||((window.DBH_CONFIG?.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/dbh-customer-care');
  let humanOnline=false;
  let conversationLoaded=false;

  const localSession=()=>{try{return JSON.parse(localStorage.getItem(DBH.sessionKey)||'null')}catch{return null}};
  const token=()=>{const s=localSession();return s?.sessionToken||s?.access_token||s?.accessToken||s?.session?.access_token||''};
  async function resolveToken(){
    const existing=token();
    if(existing)return existing;
    try{
      const authBase=(window.DBH_CONFIG?.apiBaseUrl||'').replace(/\/$/,'');
      if(!authBase)return '';
      const r=await fetch(authBase+'/api/auth/session',{credentials:'include',headers:{Accept:'application/json'},cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d?.authenticated||!d?.user)return '';
      const recovered=d?.sessionToken||'';
      localStorage.setItem(DBH.sessionKey,JSON.stringify({authenticated:true,provider:d.user.provider||'google',user:d.user,sessionToken:recovered||null}));
      return recovered;
    }catch{return ''}
  }
  const sessionUser=()=>{const s=localSession();return s?.user||s||null};
  const scrollBottom=()=>{body.scrollTop=body.scrollHeight};

  function aiIcon(text){
    const t=String(text||'').toLowerCase();
    if(/property|house|home|land|listing/.test(t))return '<span class="dbh-care-ai-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg></span>';
    if(/verify|verified|document|security|safe/.test(t))return '<span class="dbh-care-ai-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 20 6v5.4c0 4.7-3.3 7.8-8 9.6-4.7-1.8-8-4.9-8-9.6V6l8-3Z"/><path d="m8.5 11.8 2.2 2.2 4.8-5"/></svg></span>';
    if(/account|profile|sign in|login/.test(t))return '<span class="dbh-care-ai-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.7-4 2.8-6 7-6s6.3 2 7 6"/></svg></span>';
    if(/search|find|location/.test(t))return '<span class="dbh-care-ai-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 5 5"/></svg></span>';
    return '<span class="dbh-care-ai-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 14.1 9.9 21 12l-6.9 2.1L12 21l-2.1-6.9L3 12l6.9-2.1L12 3Z"/></svg></span>';
  }
  function bubble(text,mine=false,time=null,checks=false,media=null){
    const row=document.createElement('div');
    row.className='dbh-care-row '+(mine?'mine':'theirs');
    const b=document.createElement('div');
    b.className='dbh-care-message-bubble '+(mine?'mine':'theirs');
    if(!mine&&media?.image_data){
      const src=String(media.image_data);
      if(/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(src)){
        const imageWrap=document.createElement('div');imageWrap.className='dbh-care-generated-image-wrap';
        const img=document.createElement('img');img.className='dbh-care-generated-image';img.src=src;img.alt='AI-generated DBH image';img.loading='lazy';
        imageWrap.appendChild(img);b.appendChild(imageWrap);
      }
    }
    const textWrap=document.createElement('div');textWrap.className='dbh-care-ai-line';
    if(!mine)textWrap.insertAdjacentHTML('beforeend',aiIcon(text));
    const main=document.createElement('span');main.className='dbh-care-message-text';main.textContent=text||'';
    textWrap.appendChild(main);b.appendChild(textWrap);
    const meta=document.createElement('span');meta.className='dbh-care-message-meta';
    meta.textContent=(time?new Date(time).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'}):new Date().toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'}))+(checks?'  ✓✓':'');
    b.append(meta);row.appendChild(b);body.insertBefore(row,form);
    return row;
  }

  function typing(show){
    let el=document.getElementById('dbh-care-typing');
    if(show&&!el){
      el=document.createElement('div');el.id='dbh-care-typing';el.className='dbh-care-typing';
      el.innerHTML='<div class="dbh-care-typing-bubble"><i></i><i></i><i></i><span>AI is typing…</span></div>';
      body.insertBefore(el,form);scrollBottom();
    }
    if(!show)el?.remove();
  }

  const renderedMessages=new Set();
  async function loadConversation(){
    const t=await resolveToken();
    if(!t)return;
    try{
      const r=await fetch(api,{headers:{Accept:'application/json',Authorization:'Bearer '+t},cache:'no-store'});
      if(!r.ok)return;
      const data=await r.json().catch(()=>({}));
      const messages=Array.isArray(data.messages)?data.messages:[];
      messages.forEach(m=>{
        const key=String(m?.id||'');
        if(!key||renderedMessages.has(key))return;
        if(m?.message)bubble(m.message,true,m.created_at,true);
        if(m?.agent_reply)bubble(m.agent_reply,false,m.updated_at,false,m?.image_data?{image_data:m.image_data}:null);
        if(m?.human_reply)bubble(m.human_reply,false,m.updated_at,false);
        renderedMessages.add(key);
      });
      scrollBottom();
    }catch{}
  }

  const open=()=>{widget.classList.add('open');launcher.setAttribute('aria-expanded','true');panel.setAttribute('aria-hidden','false');loadConversation();setTimeout(()=>input?.focus(),120);};
  const shut=()=>{widget.classList.remove('open');launcher.setAttribute('aria-expanded','false');launcher.focus({preventScroll:true});panel.setAttribute('aria-hidden','true');};

  launcher.addEventListener('click',()=>widget.classList.contains('open')?shut():open());
  close.addEventListener('click',shut);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&widget.classList.contains('open'))shut()});
  widget.querySelectorAll('[data-care-message]').forEach(btn=>btn.addEventListener('click',()=>{input.value=btn.dataset.careMessage||'';input.focus()}));

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const message=String(input.value||'').trim();
    if(!message)return;
    const t=await resolveToken();
    if(!t){
      note.innerHTML='Please <a href="/login.html?redirect='+encodeURIComponent(location.pathname+location.search||'/')+'">sign in</a> to chat with DBH AI. Your message has not been sent.';
      note.style.display='block';
      input.focus();
      return;
    }

    const send=form.querySelector('.dbh-care-send');
    send.disabled=true;input.disabled=true;note.style.display='none';
    const sent=bubble(message,true,null,true);
    scrollBottom();
    typing(true);

    try{
      const r=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:'Bearer '+t},body:JSON.stringify({message})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data?.message||'Your message could not be sent.');
      typing(false);
      const aiReply=String(data?.message?.agent_reply||'').trim();
      const aiImage=data?.message?.image_data?{image_data:String(data.message.image_data)}:null;
      if(aiReply||aiImage)bubble(aiReply||(aiImage?'Here’s the image you requested.':''),false,new Date().toISOString(),false,aiImage);
      else{
        note.textContent='Your message was sent, but the AI did not return a reply. Please try again.';
        note.style.display='block';
      }
      scrollBottom();
    }catch(err){
      typing(false);
      sent.querySelector('.dbh-care-message-meta').textContent='Not sent';
      note.style.display='block';note.textContent=err.message||'Unable to send your message. Please try again.';
    }finally{send.disabled=false;input.disabled=false;input.focus()}
  });

  statusText.textContent='AI assistant • Online';
  loadConversation();
  setInterval(()=>{if(widget.classList.contains('open'))loadConversation()},7000);
  if(new URLSearchParams(location.search).get('care')==='1')setTimeout(open,650);
}
function hideLoader(){const l=document.getElementById('app-loader');if(l){l.classList.add('fade');setTimeout(()=>{l.style.display='none'},650)}}
window.addEventListener('error',hideLoader);
window.addEventListener('unhandledrejection',hideLoader);
document.addEventListener('DOMContentLoaded',()=>{safe(setupDBHPWA);hideLoader();safe(setupCustomerCareWidget);safe(bootShell);safe(loadData);safe(setupSearch);safe(setupNotifications);safe(setupNativeNotificationPopups);safe(initHeroSlider);safe(dbhGlobalInteractionFix);});
function dbhGlobalInteractionFix(){
  document.addEventListener('click',async(e)=>{
    const menu=e.target.closest('#mobile-menu-button');
    if(menu){
      e.preventDefault();e.stopPropagation();
      document.documentElement.classList.add('sidebar-open');
      document.getElementById('mobile-menu-button')?.setAttribute('aria-expanded','true');
            return;
    }
    const close=e.target.closest('#sidebar-close,#sidebar-backdrop');
    if(close){
      e.preventDefault();e.stopPropagation();
      document.documentElement.classList.remove('sidebar-open');
      document.getElementById('mobile-menu-button')?.setAttribute('aria-expanded','false');
            return;
    }
  },true);
}
function bootShell(){applyTheme();watchSystemTheme();initUniversalShell();initAuthState();setupCurrency();document.querySelectorAll('[data-theme-toggle]').forEach(b=>b.addEventListener('click',toggleTheme));}
function getSettings(){try{return JSON.parse(localStorage.getItem(DBH.settingsKey))||{}}catch{return{}}}
function saveSettings(s){localStorage.setItem(DBH.settingsKey,JSON.stringify(s));applyTheme()}
function resolveThemeMode(mode){if(mode==='light'||mode==='dark')return mode;return window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light'}
function applyTheme(){
  const s=getSettings(),r=document.documentElement,mode=s.mode||'system',resolved=resolveThemeMode(mode);
  r.style.setProperty('--blue',s.primary||DBH.theme.blue);
  r.style.setProperty('--navy',s.sidebar||DBH.theme.sidebar);
  r.style.setProperty('--bg',s.background||'#f6f9fd');
  r.classList.toggle('dbh-dark',resolved==='dark');
  r.dataset.dbhTheme=resolved;
  r.dataset.dbhThemeMode=mode;
  const textSize=s.textSize||'normal';
  r.dataset.dbhTextSize=textSize;
  document.querySelectorAll('#dbh-sidebar [data-theme-mode]').forEach(b=>b.classList.toggle('active',b.dataset.themeMode===mode));
  document.querySelectorAll('#dbh-sidebar [data-text-size-value]').forEach(b=>b.classList.toggle('active',b.dataset.textSizeValue===textSize));
}
function setTheme(mode){const s=getSettings();saveSettings({...s,mode})}
function toggleTheme(){
  const current=getSettings().mode||'system';
  setTheme(current==='system'?'light':current==='light'?'dark':'system');
}
function setTextSize(size){const s=getSettings();saveSettings({...s,textSize:size})}
function cycleTextSize(){
  const current=getSettings().textSize||'normal';
  setTextSize(current==='normal'?'large':current==='large'?'xlarge':'normal');
}
function watchSystemTheme(){
  const media=window.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener?.('change',()=>{if((getSettings().mode||'system')==='system')applyTheme()});
}
async function initAuthState(){
  const a=document.getElementById('auth-actions');
  const p=document.getElementById('profile-button');
  let user=null;

  try{
    const local=getLocalSession();
    const authBase=(window.DBH_CONFIG?.apiBaseUrl||'').replace(/\/$/,'');
    const sessionHeaders={Accept:'application/json'};
    if(local?.sessionToken)sessionHeaders.Authorization='Bearer '+local.sessionToken;
    const r=await fetch(authBase+'/api/auth/session',{credentials:'include',headers:sessionHeaders});
    if(r.ok){
      const d=await r.json().catch(()=>null);
      if(d?.authenticated&&d?.user){
        user=d.user;
        const preservedSupabaseId=local?.supabaseUserId||local?.user?.supabaseUserId||'';
        const mergedUser={...(local?.user||{}),...user};
        if(preservedSupabaseId){
          mergedUser.supabaseUserId=preservedSupabaseId;
        }
        localStorage.setItem(DBH.sessionKey,JSON.stringify({
          authenticated:true,
          provider:user.provider||local?.provider||'google',
          user:mergedUser,
          supabaseUserId:preservedSupabaseId||local?.supabaseUserId||'',
          sessionToken:local?.sessionToken||d?.sessionToken||null
        }));
      }
    }
  }catch{}

  if(!user){
    const session=getLocalSession();
    user=session?.user||null;
  }

  if(!user)user=await getSupabaseUser();

  const found=user||null;
  document.documentElement.classList.toggle('dbh-authenticated',!!found);

  if(a&&p){
    const dash=document.querySelector('[data-header-nav="dashboard"]');
    if(found){
      a.classList.add('hidden');
      p.classList.remove('hidden');
      if(dash){
        dash.href='/dashboard.html';
        dash.dataset.tooltip='Dashboard';
        dash.setAttribute('aria-label','Dashboard');
      }
      const name=firstValue(found.user_metadata||found,['full_name','fullName','name','email'],'Account');
      const avatar=document.querySelector('.profile-avatar');
      const label=document.querySelector('.profile-name');
      if(avatar){
        const initials=String(name).trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'DB';
        const picture=found?.picture||found?.avatar_url||found?.user_metadata?.avatar_url||found?.user_metadata?.picture||'';
        avatar.textContent='';
        if(picture){
          const img=document.createElement('img');
          img.src=picture;
          img.alt=name+' profile photo';
          img.referrerPolicy='no-referrer';
          img.style.width='100%';
          img.style.height='100%';
          img.style.objectFit='cover';
          img.style.borderRadius='inherit';
          img.onload=()=>{avatar.textContent='';avatar.appendChild(img)};
          img.onerror=()=>{avatar.textContent=initials};
          avatar.appendChild(img);
        }else{
          avatar.textContent=initials;
        }
      }
      if(label)label.textContent=String(name).split('@')[0].slice(0,22)||'Account';
      p.onclick=()=>location.href='/dashboard.html';
    }else{
      a.classList.remove('hidden');
      p.classList.add('hidden');
      if(dash){
        dash.href='/login.html?redirect=/dashboard.html';
        dash.dataset.tooltip='Dashboard';
      }
    }
  }

  if(document.getElementById('dbh-sidebar'))await renderSidebar(found);
}

function initMenu(){const b=document.getElementById('menu-button');if(!b)return;b.onclick=()=>{let n=document.getElementById('dbh-mobile-nav');if(!n){n=document.createElement('nav');n.id='dbh-mobile-nav';n.className='mobile-nav';n.innerHTML='<a href="/">Home</a><a href="/properties.html">Properties</a><a href="/land.html">Land</a><a href="/commercial.html">Commercial</a><a href="/agents.html">Agents</a><a href="/about.html">About</a>';document.body.appendChild(n)}n.classList.toggle('open')}}
function getLocalSession(){try{return JSON.parse(localStorage.getItem(DBH.sessionKey)||'null')}catch{return null}}
function getAccessToken(){const s=getLocalSession();return s?.sessionToken||s?.access_token||s?.accessToken||s?.session?.access_token||null}
async function getSupabaseUser(){const c=window.DBH_CONFIG||{},token=getAccessToken();if(!c.supabaseUrl||!c.supabaseAnonKey||!token)return null;try{const r=await fetch(c.supabaseUrl+'/auth/v1/user',{headers:{apikey:c.supabaseAnonKey,Authorization:'Bearer '+token}});if(!r.ok)return null;return await r.json()}catch{return null}}
async function supabaseFetchUser(path){const c=window.DBH_CONFIG||{},token=getAccessToken();if(!c.supabaseUrl||!c.supabaseAnonKey||!token)return null;try{const r=await fetch(c.supabaseUrl+'/rest/v1/'+path,{headers:{Accept:'application/json',apikey:c.supabaseAnonKey,Authorization:'Bearer '+token}});if(!r.ok)throw Error('Supabase HTTP '+r.status);return await r.json()}catch(e){console.error('DBH notifications:',e);return null}}
function notificationIcon(type){const icons={general:'<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9M12 7v5l3 2"/></svg>',property:'<svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',security:'<svg viewBox="0 0 24 24"><path d="M12 3 20 6v5.5c0 4.8-3.3 7.8-8 9.5-4.7-1.7-8-4.7-8-9.5V6l8-3Z"/><path d="m8.5 11.8 2.2 2.2 4.8-5"/></svg>'};return icons[type]||icons.general}
function setupNotifications(){
  const b=document.getElementById('notification-button');
  if(!b)return;

  let drawer=document.getElementById('notification-drawer');

  const api=(window.DBH_CONFIG?.notificationsUri||((window.DBH_CONFIG?.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/dbh-notifications'));

  function localSession(){
    try{return JSON.parse(localStorage.getItem(DBH.sessionKey)||'null')}
    catch{return null}
  }

  function tokenForNotifications(){
    const s=localSession();
    return s?.sessionToken||s?.access_token||s?.accessToken||s?.session?.access_token||'';
  }

  function setUnreadIndicator(unread){
    const button=document.getElementById('notification-button');
    if(!button)return;
    let count=document.getElementById('notification-count');
    if(!count){
      count=document.createElement('i');
      count.id='notification-count';
      button.appendChild(count);
    }
    const n=Math.max(0,Number(unread)||0);
    count.textContent=n>99?'99+':String(n);
    count.style.display=n?'grid':'none';
    button.classList.toggle('has-unread',n>0);
    button.setAttribute('aria-label',n?('Notifications, '+n+' unread'): 'Notifications');
    button.title=n?('Notifications ('+n+' unread)'):'Notifications';
  }

  async function refreshNotificationIndicator(){
    const token=tokenForNotifications();
    if(!token){setUnreadIndicator(0);return;}
    try{
      const r=await fetch(api,{method:'GET',headers:{Accept:'application/json',Authorization:'Bearer '+token},cache:'no-store'});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error('notification indicator request failed');
      const rows=Array.isArray(data.notifications)?data.notifications:[];
      setUnreadIndicator(rows.filter(n=>n&&!n.is_read).length);
    }catch{}
  }

  if(!drawer){
    drawer=document.createElement('aside');
    drawer.id='notification-drawer';
    drawer.className='notification-drawer';
    drawer.setAttribute('aria-label','DBH notifications');
    drawer.innerHTML='<div class="notification-drawer-head"><div><span class="eyebrow">DBH ACCOUNT</span><h2>Notifications</h2><p class="notification-subtitle">Your latest DBH updates</p></div><button type="button" id="notification-drawer-close" class="notification-cancel" aria-label="Close notifications">Cancel<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div id="notification-drawer-body" class="notification-drawer-body"><div class="notification-loading"><span class="notification-loader"></span><strong>Loading notifications…</strong></div></div><div class="notification-drawer-footer"><button type="button" id="notification-footer-close" class="btn btn-outline">Close notifications</button></div>';
    document.body.appendChild(drawer);

    const overlay=document.createElement('div');
    overlay.id='notification-backdrop';
    overlay.className='notification-backdrop';
    document.body.appendChild(overlay);

    const close=()=>{
      document.documentElement.classList.remove('notification-open');
      drawer.setAttribute('aria-hidden','true');
    };

    document.getElementById('notification-drawer-close')?.addEventListener('click',close);
    document.getElementById('notification-footer-close')?.addEventListener('click',close);
    overlay.addEventListener('click',close);
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape')close();
    });
  }

  const body=document.getElementById('notification-drawer-body');

  function closeDetail(){
    loadNotifications();
  }

  async function loadDetail(id){
    body.innerHTML='<div class="notification-loading"><span class="notification-loader"></span><strong>Opening notification…</strong></div>';
    const token=tokenForNotifications();
    if(!token){
      setUnreadIndicator(0);
      body.innerHTML='<div class="notification-empty"><div class="notification-empty-icon">'+notificationIcon('security')+'</div><h3>Please sign in</h3><p>Your DBH notifications are private to your account.</p></div>';
      return;
    }

    try{
      const r=await fetch(api+'?id='+encodeURIComponent(id),{
        method:'GET',
        headers:{Accept:'application/json',Authorization:'Bearer '+token},
        cache:'no-store'
      });
      const data=await r.json().catch(()=>({}));
      const n=Array.isArray(data.notifications)?data.notifications[0]:null;
      if(!r.ok||!n)throw new Error(data?.message||'Notification could not be loaded.');

      await fetch(api,{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
        body:JSON.stringify({id:n.id})
      }).catch(()=>{});

      body.innerHTML='<div class="notification-detail"><button type="button" class="notification-back" id="notification-back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg>Back to notifications</button><div class="notification-detail-icon">'+notificationIcon(n.type)+'</div><span class="notification-detail-type">'+escapeHtml(n.type||'general')+'</span><h3>'+escapeHtml(n.title||'Notification')+'</h3><time>'+new Date(n.created_at).toLocaleString('en-NG',{dateStyle:'full',timeStyle:'short'})+'</time><p>'+escapeHtml(n.message||'')+'</p>'+(n.link?'<a class="btn btn-primary notification-detail-link" href="'+escapeHtml(n.link)+'">Open related page <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"></path></svg></a>':'')+'</div>';
      setUnreadIndicator(Math.max(0,(Number(document.getElementById('notification-count')?.textContent)||0)-1));
      document.getElementById('notification-back')?.addEventListener('click',closeDetail);
      refreshNotificationIndicator();
    }catch(err){
      body.innerHTML='<div class="notification-empty"><div class="notification-empty-icon">'+notificationIcon('security')+'</div><h3>Could not open notification</h3><p>'+escapeHtml(err.message||'Please try again later.')+'</p><button type="button" class="btn btn-outline" id="notification-retry">Try again</button></div>';
      document.getElementById('notification-retry')?.addEventListener('click',()=>loadDetail(id));
    }
  }

  async function loadNotifications(){
    body.innerHTML='<div class="notification-loading"><span class="notification-loader"></span><strong>Loading notifications…</strong></div>';
    const token=tokenForNotifications();

    if(!token){
      setUnreadIndicator(0);
      body.innerHTML='<div class="notification-empty"><div class="notification-empty-icon">'+notificationIcon('security')+'</div><h3>Sign in to view notifications</h3><p>Your DBH notifications are private to your account.</p><div class="notification-auth-actions"><a class="btn btn-primary" href="/login.html?redirect='+encodeURIComponent(location.href)+'">Login</a><a class="btn btn-outline" href="/register.html?redirect='+encodeURIComponent(location.href)+'">Sign Up</a></div></div>';
      return;
    }

    try{
      const r=await fetch(api,{method:'GET',headers:{Accept:'application/json',Authorization:'Bearer '+token},cache:'no-store'});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data?.message||'Notification service could not be reached.');
      const rows=Array.isArray(data.notifications)?data.notifications:[];
      const unread=rows.filter(n=>!n.is_read).length;
      setUnreadIndicator(unread);

      if(!rows.length){
        body.innerHTML='<div class="notification-empty"><div class="notification-empty-icon">'+notificationIcon('general')+'</div><h3>Nothing for now — you are all caught up</h3><p>Please check back later. New DBH account, property and marketplace updates will appear here.</p></div>';
        return;
      }

      body.innerHTML=rows.map(n=>{
        const preview=String(n.message||'').length>125?String(n.message).slice(0,125).trim()+'…':String(n.message||'');
        return '<button type="button" class="notification-item '+(n.is_read?'read':'unread')+'" data-notification-id="'+escapeHtml(n.id)+'"><span class="notification-item-icon">'+notificationIcon(n.type)+'</span><span><strong>'+escapeHtml(n.title||'Notification')+'</strong><small>'+escapeHtml(preview)+'</small><time>'+new Date(n.created_at).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'})+'</time></span><svg class="notification-item-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg></button>';
      }).join('');

      body.querySelectorAll('[data-notification-id]').forEach(item=>{
        item.addEventListener('click',()=>loadDetail(item.dataset.notificationId));
      });
    }catch(err){
      body.innerHTML='<div class="notification-empty"><div class="notification-empty-icon">'+notificationIcon('security')+'</div><h3>Notifications are unavailable</h3><p>'+escapeHtml(err.message||'Please check your connection and try again later.')+'</p><button type="button" class="btn btn-outline" id="notification-retry-list">Try again</button></div>';
      document.getElementById('notification-retry-list')?.addEventListener('click',loadNotifications);
    }
  }

  const open=async()=>{
    document.documentElement.classList.add('notification-open');
    drawer.setAttribute('aria-hidden','false');
    try{await window.DBHPrepareNotifications?.()}catch{}
    loadNotifications();
  };

  b.replaceWith(b.cloneNode(true));
  const button=document.getElementById('notification-button');
  button?.addEventListener('click',open);
  refreshNotificationIndicator();
  setInterval(refreshNotificationIndicator,20000);
}
function setupNativeNotificationPopups(){
  if(window.__dbhNativeNotificationsReady)return;
  window.__dbhNativeNotificationsReady=true;
  if(!('Notification' in window)||!window.fetch)return;

  const api=(window.DBH_CONFIG?.notificationsUri||((window.DBH_CONFIG?.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/dbh-notifications'));
  const session=()=>{try{return JSON.parse(localStorage.getItem(DBH.sessionKey)||'null')}catch{return null}};
  const token=()=>{const s=session();return s?.sessionToken||s?.access_token||s?.accessToken||s?.session?.access_token||''};
  const userKey=()=>{const s=session();const u=s?.user||s;return String(u?.email||u?.id||'guest').trim().toLowerCase()};
  const stateKey=()=> 'dbh_native_notification_state:'+userKey();
  let firstLoad=true;
  let lastSeen='';

  function vapidKeyToUint8Array(base64String){
    const padding='='.repeat((4-(base64String.length%4))%4);
    const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(base64);
    const output=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)output[i]=raw.charCodeAt(i);
    return output;
  }

  async function savePushSubscription(subscription){
    const t=token();
    if(!t||!subscription)return false;
    const payload=typeof subscription.toJSON==='function'?subscription.toJSON():subscription;
    const r=await fetch(api,{
      method:'POST',
      headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:'Bearer '+t},
      body:JSON.stringify({action:'subscribe',subscription:payload,userAgent:navigator.userAgent})
    });
    if(!r.ok){
      const d=await r.json().catch(()=>({}));
      throw new Error(d?.message||'Unable to register this device for notifications.');
    }
    return true;
  }

  async function ensureWebPushSubscription(){
    if(!('serviceWorker' in navigator)||!('PushManager' in window)||!window.isSecureContext)return null;
    const registration=await navigator.serviceWorker.ready;
    if(!registration.pushManager)return null;
    let subscription=await registration.pushManager.getSubscription();
    if(subscription){
      await savePushSubscription(subscription);
      return subscription;
    }

    const t=token();
    if(!t)throw new Error('Please sign in before enabling notifications.');
    const keyResponse=await fetch(api+'?action=vapid-public-key',{
      headers:{Accept:'application/json',Authorization:'Bearer '+t},
      cache:'no-store'
    });
    const keyData=await keyResponse.json().catch(()=>({}));
    if(!keyResponse.ok||!keyData?.publicKey)throw new Error(keyData?.message||'DBH push notifications are not ready yet.');

    subscription=await registration.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:vapidKeyToUint8Array(String(keyData.publicKey))
    });
    await savePushSubscription(subscription);
    return subscription;
  }

  async function showLocalPopup(title,options){
    try{
      if('serviceWorker' in navigator){
        const registration=await navigator.serviceWorker.ready;
        if(registration?.showNotification){
          await registration.showNotification(title,options);
          return true;
        }
      }
    }catch(e){console.warn('DBH service-worker notification:',e)}
    try{
      if(Notification.permission==='granted'){
        const note=new Notification(title,options);
        note.onclick=()=>{window.focus();if(options?.data?.link)window.location.href=options.data.link;note.close()};
        return true;
      }
    }catch(e){console.warn('DBH browser notification:',e)}
    return false;
  }

  async function syncExistingPushSubscription(){
    if(Notification.permission!=='granted')return;
    try{await ensureWebPushSubscription()}catch(e){console.warn('DBH existing push subscription:',e)}
  }

  async function poll(){
    const t=token();
    if(!t)return;
    try{
      const r=await fetch(api,{headers:{Accept:'application/json',Authorization:'Bearer '+t},cache:'no-store'});
      if(!r.ok)return;
      const data=await r.json().catch(()=>({}));
      const rows=(Array.isArray(data.notifications)?data.notifications:[])
        .filter(n=>n&&!n.is_read)
        .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
      if(!rows.length)return;
      const newest=rows[0];
      const id=String(newest.id||newest.created_at||'');
      const saved=localStorage.getItem(stateKey())||'';

      if(firstLoad){
        lastSeen=saved||id;
        if(!saved)localStorage.setItem(stateKey(),id);
        firstLoad=false;
        return;
      }

      if(id===lastSeen)return;
      const newer=rows.find(n=>String(n.id||n.created_at||'')!==lastSeen)||newest;
      const newerId=String(newer.id||newer.created_at||'');
      if(!newerId||newerId===lastSeen)return;

      lastSeen=newerId;
      localStorage.setItem(stateKey(),newerId);

      if(Notification.permission==='granted'){
        await showLocalPopup(String(newer.title||'DBH Notification'),{
          body:String(newer.message||'You have a new notification from D Banjus Homes Nig Ltd.'),
          icon:'/dbh-logo.jpg',
          badge:'/dbh-logo.jpg',
          tag:'dbh-'+newerId,
          renotify:true,
          data:{link:newer.link||'/',notificationId:newerId}
        });
      }
    }catch(e){console.warn('DBH native notification poll:',e)}
  }

  window.DBHPrepareNotifications=async function(){
    if(Notification.permission==='denied')return false;
    if(Notification.permission!=='granted'){
      const permission=await Notification.requestPermission();
      if(permission!=='granted')return false;
    }
    try{
      await ensureWebPushSubscription();
      return true;
    }catch(e){
      console.warn('DBH Web Push subscribe:',e);
      return false;
    }
  };

  poll();
  syncExistingPushSubscription();
  setInterval(poll,20000);
}function dbhCookieValue(name){return document.cookie.split(';').map(x=>x.trim()).find(x=>x.indexOf(name+'=')===0)?.slice(name.length+1)||null}
function setDbhCookie(name,value,days){try{document.cookie=name+'='+encodeURIComponent(value)+'; Max-Age='+(days*86400)+'; Path=/; SameSite=Lax; Secure'}catch{}}
function consentIcon(type){const m={cookie:'<svg viewBox="0 0 24 24"><path d="M20 13a8 8 0 1 1-9-9 6 6 0 0 0 9 9Z"/><circle cx="8" cy="14" r="1"/><circle cx="11" cy="17" r="1"/><circle cx="14" cy="13" r="1"/><circle cx="9" cy="9" r="1"/></svg>',bell:'<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',pin:'<svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>'};return m[type]||m.cookie}
function permissionState(name){try{return navigator.permissions?.query({name}).then(x=>x.state).catch(()=>null)}catch{return Promise.resolve(null)}}
function setupConsent(){if(document.documentElement.dataset.dbhConsentReady)return;document.documentElement.dataset.dbhConsentReady='1';const run=async()=>{if(!dbhCookieValue('dbh_cookie_consent')&&!localStorage.getItem('dbh_cookie_consent')){const accepted=await showDbhConsent('cookie');if(accepted){setDbhCookie('dbh_cookie_consent','accepted',365);localStorage.setItem('dbh_cookie_consent','accepted');localStorage.setItem('dbh_cache_consent','accepted');try{if(window.caches)window.caches.open('dbh-site-v1').catch(()=>{})}catch{}}else{setDbhCookie('dbh_cookie_consent','essential',365);localStorage.setItem('dbh_cookie_consent','essential');localStorage.setItem('dbh_cache_consent','essential')}}if('Notification' in window&&Notification.permission==='default'&&!sessionStorage.getItem('dbh_notification_prompted')){sessionStorage.setItem('dbh_notification_prompted','1');await showDbhConsent('bell')}const geoState=await permissionState('geolocation');if(navigator.geolocation&&geoState!=='granted'&&geoState!=='denied'&&!sessionStorage.getItem('dbh_location_prompted')){sessionStorage.setItem('dbh_location_prompted','1');await showDbhConsent('pin')}};setTimeout(run,450)}
function showDbhConsent(type){return new Promise(resolve=>{const old=document.getElementById('dbh-consent-modal');old?.remove();const data={cookie:{eyebrow:'WELCOME TO DBH',title:'Cookies & cache',text:'We use essential cookies and local site storage/cache to remember your preferences, keep DBH smooth and improve loading. You stay in control of optional permissions.',primary:'Accept & continue',secondary:'Essential only'},bell:{eyebrow:'STAY UPDATED',title:'Allow notifications',text:'Allow DBH to send you important property, enquiry and account updates on this device. You can change this permission in your browser settings.',primary:'Allow notifications',secondary:'Not now'},pin:{eyebrow:'FIND PROPERTIES NEAR YOU',title:'Allow location',text:'Allow DBH to use your device location to improve nearby property discovery and map experiences. Your browser controls the final permission.',primary:'Allow location',secondary:'Not now'}}[type];const modal=document.createElement('div');modal.id='dbh-consent-modal';modal.className='dbh-consent-modal';modal.innerHTML='<div class="dbh-consent-card" role="dialog" aria-modal="true" aria-labelledby="dbh-consent-title"><button class="dbh-consent-close" type="button" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button><div class="dbh-consent-icon">'+consentIcon(type)+'</div><span class="eyebrow">'+data.eyebrow+'</span><h2 id="dbh-consent-title">'+data.title+'</h2><p>'+data.text+'</p><div class="dbh-consent-actions"><button type="button" class="btn btn-primary" id="dbh-consent-primary">'+data.primary+'</button><button type="button" class="btn btn-outline" id="dbh-consent-secondary">'+data.secondary+'</button></div><small>DBH — D Banjus Homes Nig Ltd</small></div>';document.body.appendChild(modal);const finish=v=>{modal.classList.remove('open');setTimeout(()=>modal.remove(),220);resolve(v)};requestAnimationFrame(()=>modal.classList.add('open'));modal.querySelector('.dbh-consent-primary').onclick=async()=>{if(type==='bell'&&'Notification' in window){try{await Notification.requestPermission()}catch{}}if(type==='pin'&&navigator.geolocation){navigator.geolocation.getCurrentPosition(pos=>{localStorage.setItem('dbh_user_location',JSON.stringify({latitude:pos.coords.latitude,longitude:pos.coords.longitude,accuracy:pos.coords.accuracy,updated_at:new Date().toISOString()}))},()=>{})}finish(true)};modal.querySelector('.dbh-consent-secondary').onclick=()=>finish(false);modal.querySelector('.dbh-consent-close').onclick=()=>finish(false);modal.addEventListener('click',e=>{if(e.target===modal)finish(false)})})}
async function api(path){try{const r=await fetch(path,{headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}catch{return null}}
async function supabaseFetch(path){
  const c=window.DBH_CONFIG||{};
  if(!c.supabaseUrl||!c.supabaseAnonKey){
    console.error('DBH: Supabase configuration is missing');
    return null;
  }
  try{
    const r=await fetch(c.supabaseUrl+'/rest/v1/'+path,{
      method:'GET',
      headers:{
        'Accept':'application/json',
        'apikey':c.supabaseAnonKey
      }
    });
    if(!r.ok){
      const errorText=await r.text();
      console.error('DBH Supabase HTTP '+r.status,errorText);
      return null;
    }
    return await r.json();
  }catch(e){
    console.error('DBH Supabase request failed:',e);
    return null;
  }
}
function normaliseProperty(p){const images=Array.isArray(p.property_images)?p.property_images.slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(x=>x.image_url).filter(Boolean):[];return {...p,images,cover_image:images[0]||p.og_image_url||'/dbh-logo.jpg'}}
function setupSearch(){document.getElementById('property-search')?.addEventListener('submit',e=>{e.preventDefault();location.href='/properties.html?'+new URLSearchParams(new FormData(e.currentTarget)).toString()})}
async function loadData(){
  const results=document.getElementById('property-results');
  const featured=document.getElementById('featured-properties');
  const count=document.getElementById('result-count');
  if(count)count.textContent='Loading properties…';

  // Load the property rows first. Do not make the whole marketplace depend on
  // PostgREST's nested property_images relationship.
  const data=await supabaseFetch('properties?select=*&is_published=eq.true&order=created_at.desc');
  if(!Array.isArray(data)){
    if(count)count.textContent='Unable to load properties';
    const message='<div class="panel"><strong>Properties could not be loaded.</strong><br><small>Please refresh the page. If this continues, the DBH database connection needs attention.</small></div>';
    if(results)results.innerHTML=message;
    if(featured)featured.innerHTML=message;
    return;
  }

  const rows=data.map(normaliseProperty);

  // Images are optional. If this request fails, the property cards still render.
  if(rows.length){
    const images=await supabaseFetch('property_images?select=property_id,image_url,sort_order,is_cover&order=sort_order.asc');
    if(Array.isArray(images)){
      const byProperty={};
      images.forEach(image=>{
        if(!image?.property_id||!image?.image_url)return;
        (byProperty[image.property_id] ||= []).push(image.image_url);
      });
      rows.forEach(p=>{
        const imgs=byProperty[p.id]||[];
        p.images=imgs;
        p.cover_image=imgs[0]||p.og_image_url||'/dbh-logo.jpg';
      });
    }
  }

  if(featured)renderProperties(featured,rows.filter(p=>p.is_featured).slice(0,6));
  if(results){
    if(count)count.textContent=rows.length+' '+(rows.length===1?'property':'properties');
    renderProperties(results,rows);
  }

  const loc=document.getElementById('popular-locations');
  if(loc){
    const names=[...new Set(rows.flatMap(p=>[p.area,p.city,p.lga,p.state].filter(Boolean)))].slice(0,8);
    loc.innerHTML=names.map(x=>'<a class="location-card reveal" href="/properties.html?location='+encodeURIComponent(x)+'">'+escapeHtml(x)+'</a>').join('')||'<div class="panel">Popular locations will appear here from the backend.</div>';
    document.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible'));
  }

  const total=rows.length;
  const locations=new Set(rows.flatMap(p=>[p.state,p.lga,p.city,p.area].filter(Boolean))).size;
  const commercial=rows.filter(p=>String(p.property_type||p.category||'').toLowerCase().includes('commercial')).length;
  const land=rows.filter(p=>String(p.property_type||'').toLowerCase()==='land'||String(p.category||'').toLowerCase().includes('land')).length;
  const stat=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=String(value)};
  stat('stat-properties',total);
  stat('stat-locations',locations);
  stat('stat-commercial',commercial);
  stat('stat-land',land);
}

function icon(name){const icons={shield:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5.5c0 4.8-3.3 7.8-8 9.5-4.7-1.7-8-4.7-8-9.5V6l8-3Z"/><path d="m8.5 11.8 2.2 2.2 4.8-5"/></svg>`,pin:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>`,building:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V4.5A1.5 1.5 0 0 1 5.5 3H14v18M14 8h4.5A1.5 1.5 0 0 1 20 9.5V21M7 7h3M7 11h3M7 15h3M16 12h2M16 16h2M2 21h20"/></svg>`,users:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20c.6-3.4 2.6-5 6-5s5.4 1.6 6 5M16 5.5a3 3 0 0 1 0 5.8M17 15c2.4.3 3.7 1.8 4 5"/></svg>`};return icons[name]||''}
function firstValue(obj,keys,fallback=''){for(const k of keys){const v=obj?.[k];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v}return fallback}
function isVerified(p){return p?.is_verified===true}
function renderProperties(el,rows){if(!rows.length){el.innerHTML='<div class="panel">No published properties are available yet.</div>';return}el.innerHTML=rows.map(p=>{const img=firstValue(p,['cover_image','image_url'],Array.isArray(p.images)?p.images[0]:'/dbh-logo.jpg')||'/dbh-logo.jpg';const u='/property.html?id='+encodeURIComponent(p.property_code||p.id);const category=firstValue(p,['category','property_category','property_type','type'],'Property');const provider=firstValue(p,['provider_name','provider','agent_name','agent','company_name','agency_name'],'DBH Homes');const providerVerified=p?.provider_verified===true||p?.provider_is_verified===true||isVerified(p);const verified=isVerified(p);const location=firstValue(p,['location','address','area','city'],'Location available');return '<article class="property-card reveal"><a class="property-media" href="'+u+'"><img loading="lazy" src="'+escapeHtml(img)+'" alt="'+escapeHtml(p.title||'DBH property')+'"><span class="property-badges"><span class="property-category-badge">'+escapeHtml(category)+'</span>'+(verified?'<span class="property-verified-badge">'+icon('shield')+'<span>Verified Property</span></span>':'')+'</span></a><div class="property-body"><h3 class="property-title"><a href="'+u+'">'+escapeHtml(p.title||'Property')+'</a></h3><div class="property-price" data-price="'+escapeHtml(p.price)+'" data-price-currency="'+escapeHtml(p.currency||'NGN')+'">'+formatPrice(p.price,p.currency||'NGN')+'</div><div class="property-meta property-location">'+icon('pin')+'<span>'+escapeHtml(location)+'</span></div><div class="property-provider"><span class="provider-avatar">'+icon('users')+'</span><span class="provider-copy"><small>Provider</small><strong>'+escapeHtml(provider)+'</strong></span>'+(providerVerified?'<span class="provider-verified">'+icon('shield')+'</span>':'')+'</div></div></article>'}).join('');document.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible'))}
const DBH_CURRENCIES={NGN:{locale:'en-NG'},USD:{locale:'en-US'},EUR:{locale:'de-DE'},CAD:{locale:'en-CA'},GBP:{locale:'en-GB'}};
DBH.currency=localStorage.getItem('dbh_currency')||'NGN';DBH.rates={NGN:1};
function formatNaira(v){return v===null||v===undefined||v===''?'Price on request':'₦'+Number(v).toLocaleString('en-NG')}
function formatPrice(v,source='NGN'){if(v===null||v===undefined||v==='')return 'Price on request';const n=Number(v),from=String(source||'NGN').toUpperCase(),to=DBH.currency;if(!Number.isFinite(n))return 'Price on request';const ngn=n/(DBH.rates[from]||1),out=ngn*(to==='NGN'?1:(DBH.rates[to]||1));return new Intl.NumberFormat(DBH_CURRENCIES[to].locale,{style:'currency',currency:to,maximumFractionDigits:to==='NGN'?0:2}).format(out)}
async function refreshCurrencyRates(){try{const r=await fetch('https://api.frankfurter.dev/v2/rates?base=NGN&quotes=USD,EUR,CAD,GBP');if(!r.ok)return;const data=await r.json();const rates={NGN:1};(Array.isArray(data)?data:[]).forEach(x=>{if(x.quote&&x.rate)rates[x.quote]=Number(x.rate)});if(Object.keys(rates).length>1){DBH.rates=rates;localStorage.setItem('dbh_fx_rates',JSON.stringify(rates));renderCurrencyPrices()}}catch(e){console.warn('DBH FX unavailable',e)}}
function renderCurrencyPrices(){document.querySelectorAll('[data-price]').forEach(el=>el.textContent=formatPrice(el.dataset.price,el.dataset.priceCurrency||'NGN'));document.querySelectorAll('[data-detail-price]').forEach(el=>el.textContent=formatPrice(el.dataset.detailPrice,el.dataset.detailCurrency||'NGN'))}
function setupCurrency(){const host=document.getElementById('dbh-header-actions');if(!host||document.getElementById('dbh-currency-select'))return;const wrap=document.createElement('label');wrap.className='dbh-currency-control';wrap.setAttribute('data-tooltip','Currency');wrap.innerHTML='<span class="dbh-currency-symbol">₦</span><select id="dbh-currency-select" aria-label="Currency"><option value="NGN">NGN</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option><option value="CAD">C$ CAD</option><option value="GBP">£ GBP</option></select>';host.insertBefore(wrap,host.firstChild);const select=wrap.querySelector('select');select.value=DBH_CURRENCIES[DBH.currency]?DBH.currency:'NGN';const sync=()=>{const map={NGN:'₦',USD:'$',EUR:'€',CAD:'C$',GBP:'£'};wrap.querySelector('.dbh-currency-symbol').textContent=map[select.value]||'₦';wrap.dataset.tooltip=select.value};sync();select.addEventListener('change',()=>{DBH.currency=select.value;localStorage.setItem('dbh_currency',DBH.currency);sync();renderCurrencyPrices()});refreshCurrencyRates()}
window.DBH=DBH;DBH.formatPrice=formatPrice
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function sidebarIcon(name){const m={home:'<svg viewBox="0 0 24 24"><path d="M3 10.8 12 3l9 7.8v9.2a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"/></svg>',properties:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',land:'<svg viewBox="0 0 24 24"><path d="m3 19 6-7 4 4 3-5 5 8M3 19h18"/></svg>',commercial:'<svg viewBox="0 0 24 24"><path d="M4 21V4.5A1.5 1.5 0 0 1 5.5 3H14v18M14 8h4.5A1.5 1.5 0 0 1 20 9.5V21M7 7h3M7 11h3M7 15h3M16 12h2M16 16h2M2 21h20"/></svg>',dashboard:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',saved:'<svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 5.2-8.8 10.2-8.8 10.2S3.2 14 3.2 8.8A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.5z"/></svg>',bell:'<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',request:'<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h6M8 16h5"/></svg>',profile:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.7-4 2.8-6 7-6s6.3 2 7 6"/></svg>',security:'<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',help:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4.3 2c-1.2.9-1.8 1.4-1.8 3M12 17h.01"/></svg>',contact:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',theme:'<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18h1.7a2 2 0 0 0 1.5-3.3l-.7-.8a1.5 1.5 0 0 1 1.1-2.5H18a3 3 0 0 0 3-3C21 6.8 17 3 12 3Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="11" cy="7" r=".8"/><circle cx="15.5" cy="8" r=".8"/></svg>',text:'<svg viewBox="0 0 24 24"><path d="M5 5h14M12 5v14M8 19h8"/></svg>',currency:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.7-.6-1.7-1-3-1-2 0-3 1-3 2.3 0 1.4 1.1 2 3 2.4 1.9.4 3 1 3 2.4 0 1.3-1.1 2.4-3 2.4-1.3 0-2.4-.4-3.2-1.1M12 6v12"/></svg>',logout:'<svg viewBox="0 0 24 24"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/></svg>'};return m[name]||m.request}
function sidebarLink(icon,label,href){return '<a href="'+href+'"><span class="nav-icon">'+sidebarIcon(icon)+'</span><span class="nav-label">'+label+'</span><b aria-hidden="true">›</b></a>'}
function renderSidebar(user){const s=document.getElementById('dbh-sidebar');if(!s)return;const logged=!!user;const name=firstValue(user?.user_metadata||user,['full_name','fullName','name','email'],'Account');const initials=String(name).trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'DB';s.innerHTML='<div class="drawer-head"><a href="/" class="sidebar-logo"><img src="/dbh-logo.jpg" alt="DBH"></a><button id="sidebar-close" class="drawer-close" type="button" aria-label="Close navigation"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>'+(logged?'<div class="sidebar-user"><span class="sidebar-user-avatar">'+escapeHtml(initials)+'</span><div><strong>'+escapeHtml(String(name).split('@')[0])+'</strong><small>Property Seeker</small></div></div>':'<div class="sidebar-auth"><a class="sidebar-register" href="/register.html">Register</a><a class="sidebar-signin" href="/login.html">Sign In</a></div>')+'<nav class="sidebar-nav">'+sidebarLink('home','Home','/')+sidebarLink('properties','Properties for Sale','/properties.html')+sidebarLink('land','Land for Sale','/properties.html?type=land')+sidebarLink('commercial','Commercial Property','/properties.html?type=commercial')+'</nav><div class="sidebar-section-title">'+(logged?'ACCOUNT':'DISCOVER')+'</div><nav class="sidebar-nav">'+(logged?sidebarLink('dashboard','Dashboard','/dashboard.html')+sidebarLink('saved','Saved properties','/save.html')+sidebarLink('bell','Property alerts','/dashboard.html#notifications')+sidebarLink('request','Property requests','/property-requests.html')+sidebarLink('profile','My profile','/profile.html')+sidebarLink('security','Security','/dashboard.html#security'):sidebarLink('saved','Saved properties','/login.html?redirect=/save.html')+sidebarLink('bell','Notifications','/login.html?redirect=/dashboard.html%23notifications'))+'</nav><div class="sidebar-section-title">SUPPORT</div><nav class="sidebar-nav">'+sidebarLink('help','Help and FAQs','/help.html')+sidebarLink('contact','Contact us','/contact.html')+'</nav><div class="sidebar-section-title">PREFERENCES</div><div class="sidebar-preferences"><button type="button" data-theme-toggle><span class="nav-icon">'+sidebarIcon('theme')+'</span><span>Theme</span><span class="theme-options"><b data-theme-mode="system">System</b><b data-theme-mode="light">Light</b><b data-theme-mode="dark">Dark</b></span></button><button type="button" class="sidebar-setting" data-text-size="normal"><span class="nav-icon">'+sidebarIcon('text')+'</span><span>Text size</span><span class="text-options"><b data-text-size-value="normal">A</b><b data-text-size-value="large">A+</b><b data-text-size-value="xlarge">A++</b></span></button><label class="sidebar-setting currency-setting"><span class="nav-icon">'+sidebarIcon('currency')+'</span><span>Currency</span><select id="dbh-sidebar-currency"><option value="NGN">NGN</option><option value="USD">USD</option><option value="GBP">GBP</option><option value="EUR">EUR</option><option value="CAD">CAD</option></select></label>'+(logged?'<button type="button" class="sidebar-setting" id="dbh-signout"><span class="nav-icon">'+sidebarIcon('logout')+'</span><span>Sign out</span><b>›</b></button>':'')+'</div><div class="sidebar-bottom"><a class="sidebar-listing" href="/list-property.html"><span>List a property</span><b>↗</b></a></div>';const current=location.pathname.replace(/\/$/,'')||'/';s.querySelectorAll('.sidebar-nav a').forEach(a=>{const u=new URL(a.href,location.origin);const path=u.pathname.replace(/\/$/,'')||'/';if(path===current)a.classList.add('active')});initSidebarController();bindSidebarPreferences(logged)}
function ensureNotificationAssets(){if(!document.querySelector('link[data-dbh-notifications-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/css/notifications.css';l.setAttribute('data-dbh-notifications-css','true');document.head.appendChild(l)}}
function ensureNotificationButton(actions){if(!actions||document.getElementById('notification-button'))return;const b=document.createElement('button');b.className='notification-button';b.id='notification-button';b.type='button';b.setAttribute('aria-label','Notifications');b.title='Notifications';b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><i id="notification-count" style="display:none">0</i>';actions.prepend(b)}
function headerIcon(name){const m={home:'<svg viewBox="0 0 24 24"><path d="M3 10.8 12 3l9 7.8v9.2a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"/></svg>',properties:'<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5v9.5a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',land:'<svg viewBox="0 0 24 24"><path d="m3 19 6-7 4 4 3-5 5 8M3 19h18"/></svg>',commercial:'<svg viewBox="0 0 24 24"><path d="M4 21V5a2 2 0 0 1 2-2h8v18M14 9h4a2 2 0 0 1 2 2v10M7 7h3M7 11h3M7 15h3M16 13h2M16 17h2"/></svg>',list:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/><rect x="4" y="4" width="16" height="16" rx="3"/></svg>',dashboard:'<svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>',help:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 0 1 4.8 1c0 1.8-2.5 2-2.5 3.5M12 17h.01"/></svg>',contact:'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="m4 7 8 6 8-6"/></svg>',search:'<svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>',profile:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.7-4 2.8-6 7-6s6.3 2 7 6"/></svg>'};return m[name]||''}
function headerNavLink(icon,label,href,key){return '<a class="dbh-header-nav-link" data-header-nav="'+key+'" data-tooltip="'+label+'" aria-label="'+label+'" href="'+href+'">'+headerIcon(icon)+'</a>'}
function markHeaderNavActive(){const path=location.pathname.replace(/\/$/,'')||'/';const params=new URLSearchParams(location.search);document.querySelectorAll('[data-header-nav]').forEach(a=>{const key=a.dataset.headerNav;let active=key==='home'&&path==='/'||key==='properties'&&path==='/properties.html'&&!params.get('type')||key==='land'&&path==='/properties.html'&&params.get('type')==='land'||key==='commercial'&&path==='/properties.html'&&params.get('type')==='commercial'||key==='list'&&path==='/list-property.html'||key==='help'&&path==='/help.html'||key==='contact'&&path==='/contact.html'||key==='dashboard'&&path==='/dashboard.html';a.classList.toggle('active',!!active)})}
function initUniversalHeader(){const header=document.querySelector('.site-header');if(!header)return;header.innerHTML='<div class="dbh-header-inner"><a class="dbh-header-brand" href="/" aria-label="DBH — D Banjus Homes Nig Ltd"><img src="/dbh-logo.jpg" alt="DBH"><span><strong>DBH</strong><small>D Banjus Homes Nig Ltd</small></span></a><nav class="dbh-top-nav" aria-label="Main navigation">'+headerNavLink('home','Home','/','home')+headerNavLink('properties','Properties','/properties.html','properties')+'<div class="dbh-nav-dropdown"><a href="/properties.html">All Properties</a><a href="/properties.html?type=land">Land for Sale</a><a href="/properties.html?type=commercial">Commercial Property</a></div>'+headerNavLink('land','Land for Sale','/properties.html?type=land','land')+headerNavLink('commercial','Commercial Property','/properties.html?type=commercial','commercial')+headerNavLink('list','List Property','/list-property.html','list')+headerNavLink('help','Help & FAQs','/help.html','help')+headerNavLink('contact','Contact','/contact.html','contact')+headerNavLink('dashboard','Dashboard','/login.html?redirect=/dashboard.html','dashboard')+'</nav><div class="dbh-header-tools"><button id="header-search-button" class="header-icon-button" type="button" aria-label="Search" data-tooltip="Search" aria-expanded="false">'+headerIcon('search')+'</button><div id="dbh-header-actions" class="dbh-header-actions"><div id="auth-actions" class="auth-actions"><a class="btn btn-outline" href="/login.html">Login</a><a class="btn btn-primary" href="/register.html">Sign Up</a></div><button id="profile-button" class="profile-chip hidden" type="button" aria-label="Profile" data-tooltip="Profile"><span class="profile-avatar">DB</span><span class="profile-name">Account</span></button></div><button id="mobile-menu-button" class="mobile-menu-button" type="button" aria-label="Open navigation" aria-expanded="false" data-tooltip="Menu"><span class="hamburger-lines"><i></i><i></i><i></i></span></button></div></div><div id="dbh-search-panel" class="dbh-search-panel" hidden><div class="dbh-search-panel-inner">'+headerIcon('search')+'<input id="quick-search" placeholder="Search property, land, house or location" autocomplete="off"><button id="dbh-search-close" type="button" aria-label="Close search">×</button></div></div>';const actions=document.getElementById('dbh-header-actions');ensureNotificationAssets();ensureNotificationButton(actions);const nb=document.getElementById('notification-button');if(nb){nb.dataset.tooltip='Notifications';nb.setAttribute('aria-label','Notifications')}markHeaderNavActive();setupCurrency();const q=document.getElementById('quick-search'),sb=document.getElementById('header-search-button'),panel=document.getElementById('dbh-search-panel'),close=document.getElementById('dbh-search-close');const toggle=()=>{const open=panel.hasAttribute('hidden');if(open){panel.removeAttribute('hidden');sb?.setAttribute('aria-expanded','true');setTimeout(()=>q?.focus(),30)}else{panel.setAttribute('hidden','');sb?.setAttribute('aria-expanded','false')}};sb?.addEventListener('click',toggle);close?.addEventListener('click',toggle);q?.addEventListener('keydown',e=>{if(e.key==='Enter'){const value=q.value.trim();if(value)location.href='/properties.html?location='+encodeURIComponent(value)}if(e.key==='Escape')toggle()})}
function initUniversalShell(){if(document.body.classList.contains('auth-page')||document.body.classList.contains('admin-page')||document.body.classList.contains('cc-page')||document.querySelector('.admin-sidebar')||document.querySelector('.cc-shell'))return;ensureNotificationAssets();initUniversalHeader();let sidebar=document.getElementById('dbh-sidebar');if(!sidebar){sidebar=document.createElement('aside');sidebar.id='dbh-sidebar';sidebar.className='dbh-sidebar';document.body.prepend(sidebar)}let backdrop=document.getElementById('sidebar-backdrop');if(!backdrop){backdrop=document.createElement('div');backdrop.id='sidebar-backdrop';backdrop.className='sidebar-backdrop';document.body.appendChild(backdrop)}const initial=getLocalSession();renderSidebar(initial?.user||initial)}
function bindSidebarPreferences(logged){
  document.querySelectorAll('#dbh-sidebar [data-theme-toggle]').forEach(b=>b.addEventListener('click',toggleTheme));
  document.querySelectorAll('#dbh-sidebar [data-theme-mode]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();setTheme(b.dataset.themeMode)}));
  document.querySelectorAll('#dbh-sidebar [data-text-size]').forEach(b=>b.addEventListener('click',cycleTextSize));
  document.querySelectorAll('#dbh-sidebar [data-text-size-value]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();setTextSize(b.dataset.textSizeValue)}));
  applyTheme();
  const cs=document.getElementById('dbh-sidebar-currency');if(cs){cs.value=DBH.currency||'NGN';cs.onchange=()=>{DBH.currency=cs.value;localStorage.setItem('dbh_currency',DBH.currency);renderCurrencyPrices()}}document.getElementById('dbh-signout')?.addEventListener('click',async()=>{try{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'})}catch{}localStorage.removeItem(DBH.sessionKey);location.href='/'});}
function initSidebarController(){const s=document.getElementById('dbh-sidebar'),mobileBtn=document.getElementById('mobile-menu-button'),closeBtn=document.getElementById('sidebar-close'),back=document.getElementById('sidebar-backdrop');if(!s)return;const open=()=>{document.documentElement.classList.add('sidebar-open');mobileBtn?.setAttribute('aria-expanded','true')};const close=()=>{document.documentElement.classList.remove('sidebar-open');mobileBtn?.setAttribute('aria-expanded','false')};mobileBtn?.addEventListener('click',open);closeBtn?.addEventListener('click',close);back?.addEventListener('click',close);s.querySelectorAll('a').forEach(x=>x.addEventListener('click',close));document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});}

function initHeroSlider(){
  const hero=document.getElementById('dbh-hero'), slides=[...document.querySelectorAll('.hero-slide')], dots=[...document.querySelectorAll('[data-hero-slide]')];
  if(!hero||slides.length<2)return;
  let index=0,timer=null;
  const show=(next)=>{
    index=(next+slides.length)%slides.length;
    slides.forEach((s,i)=>s.classList.toggle('active',i===index));
    dots.forEach((d,i)=>{d.classList.toggle('active',i===index);d.setAttribute('aria-current',i===index?'true':'false')});
  };
  const start=()=>{clearInterval(timer);timer=setInterval(()=>show(index+1),5200)};
  dots.forEach(d=>d.addEventListener('click',()=>{show(Number(d.dataset.heroSlide||0));start()}));
  slides.forEach(s=>{const url=s.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/)?.[1];if(url){const img=new Image();img.src=url;}});
  hero.addEventListener('mouseenter',()=>clearInterval(timer));
  hero.addEventListener('mouseleave',start);
  show(0);start();
}
