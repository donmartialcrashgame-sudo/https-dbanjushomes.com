(()=>{
  if(window.__dbhCustomerCareStandalone)return;
  window.__dbhCustomerCareStandalone=true;

  const start=()=>{
    if(document.getElementById('dbh-care-widget'))return;

    const css='/assets/css/customer-care.css?v=20261001-1';
    if(!document.querySelector('link[data-dbh-customer-care-css]')){
      const l=document.createElement('link');
      l.rel='stylesheet';l.href=css;l.dataset.dbhCustomerCareCss='1';document.head.appendChild(l);
    }

    const widget=document.createElement('div');
    widget.id='dbh-care-widget';
    widget.className='dbh-care-widget';
    widget.innerHTML='<span class="dbh-care-label">Message us — we’re online</span>'+
      '<button type="button" class="dbh-care-launcher" id="dbh-care-launcher" aria-label="Message customer care" aria-expanded="false">'+
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13v-1a8 8 0 0 1 16 0v1"></path><path d="M4 13h2.5A1.5 1.5 0 0 1 8 14.5V17a1.5 1.5 0 0 1-1.5 1.5H5A1 1 0 0 1 4 17.5z"></path><path d="M20 13h-2.5a1.5 1.5 0 0 0-1.5 1.5V17a1.5 1.5 0 0 0 1.5 1.5H19a1 1 0 0 0 1-1z"></path><path d="M16 20h-2"></path></svg><i class="dbh-care-online-dot" aria-hidden="true"></i></button>'+
      '<section class="dbh-care-panel" id="dbh-care-panel" aria-label="DBH customer care chat" aria-hidden="true">'+
      '<div class="dbh-care-head"><div class="dbh-care-avatar"><img src="/dbh-logo.jpg" alt="DBH Customer Care"></div><div class="dbh-care-head-copy"><strong>DBH Customer Care</strong><span class="dbh-care-status"><i></i> We’re online</span></div><button type="button" class="dbh-care-close" id="dbh-care-close" aria-label="Close customer care"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button></div>'+
      '<div class="dbh-care-body" id="dbh-care-body"><div class="dbh-care-intro"><div class="dbh-care-mini-avatar"><img src="/dbh-logo.jpg" alt=""></div><div class="dbh-care-bubble"><strong>Hello 👋</strong>Welcome to DBH. We’re online and ready to help with properties, enquiries, verification and listings.</div></div>'+
      '<div class="dbh-care-quick"><button type="button" data-care-message="I need help finding a property.">Find a property</button><button type="button" data-care-message="I need help with a property enquiry.">Property enquiry</button><button type="button" data-care-message="I need help verifying a listing.">Verify a listing</button><button type="button" data-care-message="I want to list a property.">List a property</button></div>'+
      '<p class="dbh-care-note" id="dbh-care-note"></p><form class="dbh-care-form" id="dbh-care-form"><textarea id="dbh-care-input" maxlength="2000" rows="2" placeholder="Type your message…" aria-label="Your message"></textarea><button class="dbh-care-send" type="submit" aria-label="Send message"><svg viewBox="0 0 24 24"><path d="m21 3-7.5 18-3.5-7L3 10.5z"></path><path d="M21 3 10 14"></path></svg></button></form></div>'+
      '<div class="dbh-care-foot"><span>Customer care</span><a href="mailto:info@dbanjushomes.com">Email us</a></div></section></div>';
    document.body.appendChild(widget);

    const launcher=document.getElementById('dbh-care-launcher');
    const panel=document.getElementById('dbh-care-panel');
    const close=document.getElementById('dbh-care-close');
    const form=document.getElementById('dbh-care-form');
    const input=document.getElementById('dbh-care-input');
    const body=document.getElementById('dbh-care-body');
    const note=document.getElementById('dbh-care-note');
    const api=(window.DBH_CONFIG?.customerCareUri)||'https://cpgajlsyuieeengdnamy.supabase.co/functions/v1/dbh-customer-care';

    const getSession=()=>{try{return JSON.parse(localStorage.getItem('dbh_session')||'null')}catch{return null}};
    const getToken=()=>{const s=getSession();return s?.sessionToken||s?.access_token||s?.accessToken||s?.session?.access_token||''};
    const getUser=()=>{const s=getSession();return s?.user||s||null};

    const open=()=>{widget.classList.add('open');launcher.setAttribute('aria-expanded','true');panel.setAttribute('aria-hidden','false');setTimeout(()=>input?.focus(),100)};
    const shut=()=>{widget.classList.remove('open');launcher.setAttribute('aria-expanded','false');panel.setAttribute('aria-hidden','true')};
    const scroll=()=>{body.scrollTop=body.scrollHeight};

    launcher.addEventListener('click',()=>widget.classList.contains('open')?shut():open());
    close.addEventListener('click',shut);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&widget.classList.contains('open'))shut()});

    widget.querySelectorAll('[data-care-message]').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.careMessage||'';input.focus()}));

    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const message=String(input.value||'').trim();
      if(!message)return;
      const t=getToken();
      if(!t){
        const href='mailto:info@dbanjushomes.com?subject='+encodeURIComponent('DBH Customer Care Message')+'&body='+encodeURIComponent(message+'\n\nSent from dbanjushomes.com.');
        window.location.href=href;
        note.textContent='Your email app is opening with your message ready to send.';
        note.style.display='block';
        input.value='';
        return;
      }
      const send=form.querySelector('.dbh-care-send');
      send.disabled=true;input.disabled=true;note.style.display='block';note.textContent='Sending your message…';
      try{
        const r=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:'Bearer '+t},body:JSON.stringify({message})});
        const data=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(data?.message||'Your message could not be sent.');
        const row=document.createElement('div');
        row.style.cssText='display:flex;justify-content:flex-end;margin:8px 0;';
        const bubble=document.createElement('div');
        bubble.style.cssText='max-width:85%;padding:9px 11px;border-radius:14px 14px 5px 14px;background:#0b63ce;color:#fff;border:1px solid #0b63ce;font-size:11px;line-height:1.55;';
        bubble.textContent=message;row.appendChild(bubble);body.insertBefore(row,form.parentElement);input.value='';note.textContent='Message sent to DBH Customer Care.';scroll();setTimeout(()=>{note.style.display='none'},3500);
      }catch(err){note.style.display='block';note.textContent=err.message||'Unable to send your message. Please email info@dbanjushomes.com.'}
      finally{send.disabled=false;input.disabled=false;input.focus()}
    });
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();