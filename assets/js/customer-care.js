(()=>{
  if(window.__dbhCustomerCareStandalone)return;
  window.__dbhCustomerCareStandalone=true;

  const start=()=>{
    if(document.getElementById('dbh-care-widget'))return;

    if(!document.querySelector('link[data-dbh-customer-care-css]')){
      const l=document.createElement('link');
      l.rel='stylesheet';
      l.href='/assets/css/customer-care.css?v=20261001-5';
      l.dataset.dbhCustomerCareCss='1';
      document.head.appendChild(l);
    }

    const widget=document.createElement('div');
    widget.id='dbh-care-widget';
    widget.className='dbh-care-widget';
    widget.innerHTML=
      '<span class="dbh-care-label">DBH AI is online</span>'+
      '<button type="button" class="dbh-care-launcher" id="dbh-care-launcher" aria-label="Open DBH AI Customer Care" aria-expanded="false">'+
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13v-1a8 8 0 0 1 16 0v1"></path><path d="M4 13h2.5A1.5 1.5 0 0 1 8 14.5V17a1.5 1.5 0 0 1-1.5 1.5H5A1 1 0 0 1 4 17.5z"></path><path d="M20 13h-2.5a1.5 1.5 0 0 0-1.5 1.5V17a1.5 1.5 0 0 0 1.5 1.5H19a1 1 0 0 0 1-1z"></path><path d="M16 20h-2"></path></svg>'+
        '<i class="dbh-care-online-dot" aria-hidden="true"></i>'+
      '</button>'+
      '<section class="dbh-care-panel" id="dbh-care-panel" aria-label="DBH AI Customer Care" aria-hidden="true">'+
        '<div class="dbh-care-head">'+
          '<div class="dbh-care-avatar"><img src="/dbh-logo.jpg" alt="DBH AI"></div>'+
          '<div class="dbh-care-head-copy"><strong>DBH Customer Care AI</strong><span class="dbh-care-status"><i></i> <b id="dbh-care-status-text">AI assistant • Online</b></span></div>'+
          '<button type="button" class="dbh-care-close" id="dbh-care-close" aria-label="Close customer care"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>'+
        '</div>'+
        '<div class="dbh-care-body" id="dbh-care-body">'+
          '<div class="dbh-care-intro"><div class="dbh-care-mini-avatar"><img src="/dbh-logo.jpg" alt=""></div><div class="dbh-care-bubble"><strong>Hello 👋</strong>I’m DBH AI. Ask me about properties, enquiries, verification, listings, your account or how to use the website.</div></div>'+
          '<div class="dbh-care-quick">'+
            '<button type="button" data-care-message="I need help finding a property.">Find a property</button>'+
            '<button type="button" data-care-message="I need help with a property enquiry.">Property enquiry</button>'+
            '<button type="button" data-care-message="I need help verifying a listing.">Verify a listing</button>'+
            '<button type="button" data-care-message="I want to list a property.">List a property</button>'+
          '</div>'+
          '<p class="dbh-care-note" id="dbh-care-note"></p>'+
          '<form class="dbh-care-form" id="dbh-care-form">'+
            '<textarea id="dbh-care-input" maxlength="2000" rows="2" placeholder="Message DBH AI…" aria-label="Message DBH AI"></textarea>'+
            '<button class="dbh-care-send" type="submit" aria-label="Send message">'+
              '<svg viewBox="0 0 24 24"><path d="m21 3-7.5 18-3.5-7L3 10.5z"></path><path d="M21 3 10 14"></path></svg>'+
            '</button>'+
          '</form>'+
        '</div>'+
        '<div class="dbh-care-foot"><span>Powered by DBH AI</span><span>Available 24/7</span></div>'+
      '</section>';
    document.body.appendChild(widget);

    const launcher=document.getElementById('dbh-care-launcher');
    const panel=document.getElementById('dbh-care-panel');
    const close=document.getElementById('dbh-care-close');
    const form=document.getElementById('dbh-care-form');
    const input=document.getElementById('dbh-care-input');
    const body=document.getElementById('dbh-care-body');
    const note=document.getElementById('dbh-care-note');
    const statusText=document.getElementById('dbh-care-status-text');
    const api=(window.DBH_CONFIG?.customerCareUri)||'https://cpgajlsyuieeengdnamy.supabase.co/functions/v1/dbh-customer-care';

    let conversationLoaded=false;

    const session=()=>{try{return JSON.parse(localStorage.getItem('dbh_session')||'null')}catch{return null}};
    const token=()=>{const s=session();return s?.sessionToken||s?.access_token||s?.accessToken||s?.session?.access_token||''};
    const scroll=()=>{body.scrollTop=body.scrollHeight};

    function addBubble(text,mine=false,time=null,checks=false){
      const row=document.createElement('div');
      row.className='dbh-care-row '+(mine?'mine':'theirs');
      const b=document.createElement('div');
      b.className='dbh-care-message-bubble '+(mine?'mine':'theirs');
      const t=document.createElement('span');
      t.className='dbh-care-message-text';
      t.textContent=text;
      const m=document.createElement('span');
      m.className='dbh-care-message-meta';
      m.textContent=new Date(time||Date.now()).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'})+(checks?'  ✓✓':'');
      b.append(t,m);
      row.appendChild(b);
      body.insertBefore(row,form);
      return row;
    }

    function typing(show){
      let el=document.getElementById('dbh-care-typing');
      if(show&&!el){
        el=document.createElement('div');
        el.id='dbh-care-typing';
        el.className='dbh-care-typing';
        el.innerHTML='<div class="dbh-care-typing-bubble"><i></i><i></i><i></i><span>AI is typing…</span></div>';
        body.insertBefore(el,form);
        scroll();
      }
      if(!show)el?.remove();
    }

    async function loadConversation(){
      if(conversationLoaded)return;
      const t=token();
      if(!t)return;
      try{
        const r=await fetch(api,{headers:{Accept:'application/json',Authorization:'Bearer '+t},cache:'no-store'});
        if(!r.ok)return;
        const d=await r.json().catch(()=>({}));
        (Array.isArray(d.messages)?d.messages:[]).forEach(m=>{
          if(m?.message)addBubble(m.message,true,m.created_at,true);
          if(m?.agent_reply)addBubble(m.agent_reply,false,m.updated_at,false);
        });
        conversationLoaded=true;
        scroll();
      }catch{}
    }

    const open=()=>{
      widget.classList.add('open');
      launcher.setAttribute('aria-expanded','true');
      panel.setAttribute('aria-hidden','false');
      statusText.textContent='AI assistant • Online';
      loadConversation();
      setTimeout(()=>input?.focus(),100);
    };

    const shut=()=>{
      widget.classList.remove('open');
      launcher.setAttribute('aria-expanded','false');
      panel.setAttribute('aria-hidden','true');
    };

    launcher.onclick=()=>widget.classList.contains('open')?shut():open();
    close.onclick=shut;
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&widget.classList.contains('open'))shut()});

    widget.querySelectorAll('[data-care-message]').forEach(btn=>{
      btn.onclick=()=>{
        input.value=btn.dataset.careMessage||'';
        input.focus();
      };
    });

    form.onsubmit=async e=>{
      e.preventDefault();
      const message=String(input.value||'').trim();
      if(!message)return;

      const t=token();
      if(!t){
        note.innerHTML='Please <a href="/login.html?redirect='+encodeURIComponent(location.pathname+location.search||'/')+'">sign in</a> to chat with DBH AI. Your message has not been sent.';
        note.style.display='block';
        input.focus();
        return;
      }

      const send=form.querySelector('.dbh-care-send');
      send.disabled=true;
      input.disabled=true;
      note.style.display='none';

      const sent=addBubble(message,true,null,true);
      typing(true);
      scroll();

      try{
        const r=await fetch(api,{
          method:'POST',
          headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:'Bearer '+t},
          body:JSON.stringify({message})
        });
        const d=await r.json().catch(()=>({}));
        if(!r.ok)throw Error(d?.message||'Your message could not be sent.');
        typing(false);

        const reply=String(d?.message?.agent_reply||'').trim();
        if(reply){
          addBubble(reply,false,new Date().toISOString(),false);
        }else{
          sent.querySelector('.dbh-care-message-meta').textContent='Sent';
          note.style.display='block';
          note.textContent='Your message was sent, but DBH AI did not return a reply. Please try again.';
        }
        scroll();
      }catch(err){
        typing(false);
        sent.querySelector('.dbh-care-message-meta').textContent='Not sent';
        note.style.display='block';
        note.textContent=err.message||'Unable to send your message. Please try again.';
      }finally{
        send.disabled=false;
        input.disabled=false;
        input.focus();
      }
    };

    loadConversation();
    if(new URLSearchParams(location.search).get('care')==='1')setTimeout(open,650);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();