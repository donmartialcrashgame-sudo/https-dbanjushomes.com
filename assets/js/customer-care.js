(()=>{
  if(window.__dbhCustomerCareStandalone)return;
  window.__dbhCustomerCareStandalone=true;
  const start=()=>{
    if(document.getElementById('dbh-care-widget'))return;
    if(!document.querySelector('link[data-dbh-customer-care-css]')){
      const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/css/customer-care.css?v=20261001-4';l.dataset.dbhCustomerCareCss='1';document.head.appendChild(l);
    }
    const widget=document.createElement('div');
    widget.id='dbh-care-widget';widget.className='dbh-care-widget';
    widget.innerHTML='<span class="dbh-care-label">Message us — we’re online</span>'+
      '<button type="button" class="dbh-care-launcher" id="dbh-care-launcher" aria-label="Message customer care" aria-expanded="false">'+
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13v-1a8 8 0 0 1 16 0v1"></path><path d="M4 13h2.5A1.5 1.5 0 0 1 8 14.5V17a1.5 1.5 0 0 1-1.5 1.5H5A1 1 0 0 1 4 17.5z"></path><path d="M20 13h-2.5a1.5 1.5 0 0 0-1.5 1.5V17a1.5 1.5 0 0 0 1.5 1.5H19a1 1 0 0 0 1-1z"></path><path d="M16 20h-2"></path></svg><i class="dbh-care-online-dot" aria-hidden="true"></i></button>'+
      '<section class="dbh-care-panel" id="dbh-care-panel" aria-label="DBH customer care chat" aria-hidden="true">'+
      '<div class="dbh-care-head"><div class="dbh-care-avatar"><img src="/dbh-logo.jpg" alt="DBH Customer Care"></div><div class="dbh-care-head-copy"><strong>DBH Customer Care</strong><span class="dbh-care-status"><i></i> <b id="dbh-care-status-text">AI assistant</b></span></div><button type="button" class="dbh-care-close" id="dbh-care-close" aria-label="Close customer care"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button></div>'+
      '<div class="dbh-care-body" id="dbh-care-body"><div class="dbh-care-intro"><div class="dbh-care-mini-avatar"><img src="/dbh-logo.jpg" alt=""></div><div class="dbh-care-bubble"><strong>Hello 👋</strong>Welcome to DBH. I can help with properties, enquiries, verification, listings and using the website.</div></div>'+
      '<div class="dbh-care-quick"><button type="button" data-care-message="I need help finding a property.">Find a property</button><button type="button" data-care-message="I need help with a property enquiry.">Property enquiry</button><button type="button" data-care-message="I need help verifying a listing.">Verify a listing</button><button type="button" data-care-message="I want to list a property.">List a property</button></div>'+
      '<div class="dbh-care-handoff"><button type="button" id="dbh-care-human">Talk to a person</button><span id="dbh-care-human-status">Checking customer care availability…</span></div>'+
      '<p class="dbh-care-note" id="dbh-care-note"></p><form class="dbh-care-form" id="dbh-care-form"><textarea id="dbh-care-input" maxlength="2000" rows="2" placeholder="Type your message…" aria-label="Your message"></textarea><button class="dbh-care-send" type="submit" aria-label="Send message"><svg viewBox="0 0 24 24"><path d="m21 3-7.5 18-3.5-7L3 10.5z"></path><path d="M21 3 10 14"></path></svg></button></form></div>'+
      '<div class="dbh-care-foot"><span>AI + Human Customer Care</span><a href="mailto:info@dbanjushomes.com">Email us</a></div></section></div>';
    document.body.appendChild(widget);

    const launcher=document.getElementById('dbh-care-launcher'),panel=document.getElementById('dbh-care-panel'),close=document.getElementById('dbh-care-close'),form=document.getElementById('dbh-care-form'),input=document.getElementById('dbh-care-input'),body=document.getElementById('dbh-care-body'),note=document.getElementById('dbh-care-note'),statusText=document.getElementById('dbh-care-status-text'),humanBtn=document.getElementById('dbh-care-human'),humanStatus=document.getElementById('dbh-care-human-status');
    const api=(window.DBH_CONFIG?.customerCareUri)||'https://cpgajlsyuieeengdnamy.supabase.co/functions/v1/dbh-customer-care';
    let conversationLoaded=false;
    const session=()=>{try{return JSON.parse(localStorage.getItem('dbh_session')||'null')}catch{return null}};
    const token=()=>{const s=session();return s?.sessionToken||s?.access_token||s?.accessToken||s?.session?.access_token||''};
    const user=()=>{const s=session();return s?.user||s||null};
    const scroll=()=>{body.scrollTop=body.scrollHeight};
    function addBubble(text,mine=false,time=null,checks=false){
      const row=document.createElement('div');row.className='dbh-care-row '+(mine?'mine':'theirs');
      const b=document.createElement('div');b.className='dbh-care-message-bubble '+(mine?'mine':'theirs');
      const t=document.createElement('span');t.className='dbh-care-message-text';t.textContent=text;
      const m=document.createElement('span');m.className='dbh-care-message-meta';m.textContent=(time?new Date(time):new Date()).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'})+(checks?'  ✓✓':'');
      b.append(t,m);row.appendChild(b);body.insertBefore(row,form);return row;
    }
    function typing(show){
      let el=document.getElementById('dbh-care-typing');
      if(show&&!el){el=document.createElement('div');el.id='dbh-care-typing';el.className='dbh-care-typing';el.innerHTML='<div class="dbh-care-typing-bubble"><i></i><i></i><i></i><span>AI is typing…</span></div>';body.insertBefore(el,form);scroll()}
      if(!show)el?.remove();
    }
    async function availability(){
      try{const r=await fetch(api+'?action=availability',{headers:{Accept:'application/json'},cache:'no-store'});const d=await r.json().catch(()=>({}));const online=Boolean(d?.online);statusText.textContent=online?'AI assistant • Human online':'AI assistant • Human offline';humanStatus.textContent=online?'A DBH customer-care representative is online.':'AI is available now. A human representative is currently offline.';humanBtn.textContent=online?'Talk to customer care':'Request customer care';humanBtn.classList.toggle('online',online)}catch{statusText.textContent='AI assistant';humanStatus.textContent='Human availability could not be checked.'}
    }
    async function heartbeat(){const t=token();if(!t)return;try{await fetch(api+'?action=heartbeat',{headers:{Accept:'application/json',Authorization:'Bearer '+t},cache:'no-store'})}catch{}}
    async function loadConversation(){
      if(conversationLoaded)return;const t=token();if(!t)return;
      try{const r=await fetch(api,{headers:{Accept:'application/json',Authorization:'Bearer '+t},cache:'no-store'});if(!r.ok)return;const d=await r.json().catch(()=>({}));(Array.isArray(d.messages)?d.messages:[]).forEach(m=>{if(m?.message)addBubble(m.message,true,m.created_at,true);if(m?.agent_reply)addBubble(m.agent_reply,false,m.updated_at,false)});conversationLoaded=true;scroll()}catch{}
    }
    async function handover(){
      const t=token();if(!t){note.style.display='block';note.textContent='Please sign in first so DBH can connect a human-support request to your account.';return}
      humanBtn.disabled=true;humanStatus.textContent='Connecting you to customer care…';
      try{const r=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:'Bearer '+t},body:JSON.stringify({action:'handover'})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d?.message||'Customer-care handover failed.');addBubble('I’ve requested a DBH customer-care representative to join this conversation.',true,null,true);note.style.display='block';note.textContent=d?.humanOnline?'A human representative has been requested. AI will stop replying after handover.':'Your request has been saved. A human representative can respond when available.';scroll()}catch(e){humanStatus.textContent=e.message||'Unable to request customer care.'}finally{humanBtn.disabled=false;availability()}
    }
    launcher.onclick=()=>{const open=widget.classList.contains('open');widget.classList.toggle('open',!open);launcher.setAttribute('aria-expanded',String(!open));panel.setAttribute('aria-hidden',String(open));if(!open){loadConversation();availability();setTimeout(()=>input?.focus(),100)}};
    close.onclick=()=>{widget.classList.remove('open');launcher.setAttribute('aria-expanded','false');panel.setAttribute('aria-hidden','true')};
    humanBtn.onclick=handover;
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&widget.classList.contains('open'))close.click()});
    widget.querySelectorAll('[data-care-message]').forEach(b=>b.onclick=()=>{input.value=b.dataset.careMessage||'';input.focus()});
    form.onsubmit=async e=>{
      e.preventDefault();const message=String(input.value||'').trim();if(!message)return;const t=token();
      if(!t){window.location.href='mailto:info@dbanjushomes.com?subject='+encodeURIComponent('DBH Customer Care Message')+'&body='+encodeURIComponent(message+'\n\nSent from dbanjushomes.com.');input.value='';note.style.display='block';note.textContent='Your email app is opening with your message ready to send.';return}
      const send=form.querySelector('.dbh-care-send');send.disabled=true;input.disabled=true;note.style.display='none';
      const sent=addBubble(message,true,null,true);typing(true);scroll();
      try{const r=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:'Bearer '+t},body:JSON.stringify({message})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d?.message||'Your message could not be sent.');typing(false);const reply=String(d?.message?.agent_reply||'').trim();if(reply)addBubble(reply,false,new Date().toISOString(),false);else{sent.querySelector('.dbh-care-message-meta').textContent='Sent';note.style.display='block';note.textContent='Your message was sent to DBH Customer Care.'}scroll();}catch(e){typing(false);sent.querySelector('.dbh-care-message-meta').textContent='Not sent';note.style.display='block';note.textContent=e.message||'Unable to send your message.'}finally{send.disabled=false;input.disabled=false;input.focus()}
    };
    heartbeat();availability();setInterval(heartbeat,45000);setInterval(availability,30000);
    if(new URLSearchParams(location.search).get('care')==='1')setTimeout(()=>launcher.click(),650);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();