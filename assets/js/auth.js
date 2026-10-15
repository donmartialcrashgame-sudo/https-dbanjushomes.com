const DBH_CONFIG=window.DBH_CONFIG||{};

const msg=document.getElementById('auth-message');

const isSupabaseOAuthCallback=location.pathname.endsWith('/auth-callback.html')&&(location.hash.includes('access_token=')||location.hash.includes('error=')||new URLSearchParams(location.search).has('code')||new URLSearchParams(location.search).has('error'));
if(location.pathname.endsWith('/reset-password.html')){
  const s=hashSession||(()=>{try{return JSON.parse(localStorage.getItem('dbh_session')||'null')}catch{return null}})();
  if((!s?.access_token&&!s?.sessionToken)||(!s?.sessionToken&&s.type!=='recovery')) location.replace('/forgot-password.html');
}
const redirect=()=>new URLSearchParams(location.search).get('redirect')||'/dashboard.html';
async function loadSupabaseClient(){
  if(window.__dbhSupabaseClient)return window.__dbhSupabaseClient;
  const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  window.__dbhSupabaseClient=mod.createClient(DBH_CONFIG.supabaseUrl,DBH_CONFIG.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}});
  return window.__dbhSupabaseClient;
}
async function getMfaRedirect(nextPath='/dashboard.html'){
  const s=(()=>{try{return JSON.parse(localStorage.getItem('dbh_session')||'null')}catch{return null}})();
  if(!s?.access_token||!s?.refresh_token)return nextPath;
  try{
    const sb=await loadSupabaseClient();
    const {error}=await sb.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});
    if(error)throw error;
    const {data,error:aalError}=await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aalError)throw aalError;
    if(data?.currentLevel==='aal1'&&data?.nextLevel==='aal2')return '/totp.html?redirect='+encodeURIComponent(nextPath);
  }catch(error){console.warn('DBH MFA status check unavailable:',error)}
  return nextPath;
}
async function recordLoginSecurityEvent(){
  try{
    const s=JSON.parse(localStorage.getItem('dbh_session')||'null');
    const token=s?.access_token||s?.sessionToken;
    if(!token||!DBH_CONFIG.accountSecurityUri)return;
    const send=(latitude=null,longitude=null,permission=false)=>fetch(DBH_CONFIG.accountSecurityUri,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'login_event',latitude,longitude,location_permission:permission,user_agent:navigator.userAgent,device_label:navigator.platform||'Browser'})});
    if(!navigator.geolocation){await send();return}
    await new Promise(resolve=>{
      let finished=false;
      const finish=async(lat=null,lng=null,allowed=false)=>{if(finished)return;finished=true;clearTimeout(timer);try{await send(lat,lng,allowed)}catch{}resolve()};
      const timer=setTimeout(()=>finish(),1800);
      navigator.geolocation.getCurrentPosition(p=>finish(p.coords.latitude,p.coords.longitude,true),()=>finish(),{enableHighAccuracy:false,timeout:1800,maximumAge:300000});
    });
  }catch(error){console.warn('DBH login security event could not be recorded:',error)}
}
async function postAuthRedirect(defaultPath){
  const next=redirect();
  if(next!=='/dashboard.html') return next;
  try{
    const s=JSON.parse(localStorage.getItem('dbh_session')||'null');
    const u=s?.user||null;
    const uid=u?.id;
    if(!uid)return next;
    const r=await fetch(DBH_CONFIG.supabaseUrl+'/rest/v1/profiles?select=role&id=eq.'+encodeURIComponent(uid),{headers:{apikey:DBH_CONFIG.supabaseAnonKey,Authorization:'Bearer '+s.access_token,Accept:'application/json'}});
    const p=await r.json().catch(()=>[]);
    if(p?.[0]?.role==='customer'){
      const vr=await fetch(DBH_CONFIG.supabaseUrl+'/rest/v1/identity_verification_requests?select=status&user_id=eq.'+encodeURIComponent(uid)+'&limit=1',{headers:{apikey:DBH_CONFIG.supabaseAnonKey,Authorization:'Bearer '+s.access_token,Accept:'application/json'}});
      const rows=await vr.json().catch(()=>[]);
      if(!rows?.[0]||rows[0].status!=='verified') return '/verify-account.html?redirect='+encodeURIComponent(next);
    }
  }catch{}
  return defaultPath||next;
}

async function supabaseAuth(path,body){
  const r=await fetch(DBH_CONFIG.supabaseUrl+'/auth/v1/'+path,{method:'POST',headers:{'Content-Type':'application/json',apikey:DBH_CONFIG.supabaseAnonKey},body:JSON.stringify(body)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error_description||data.msg||data.message||'Authentication failed');
  return data;
}
async function fallback(path,payload){
  const r=await fetch((DBH_CONFIG.apiBaseUrl||'')+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!r.ok)throw new Error('Request failed');
  return r.json();
}
async function requestCustomerWelcome(user){if(!user?.id||!user?.email||!DBH_CONFIG.accountSecurityUri)return;const r=await fetch(DBH_CONFIG.accountSecurityUri,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'customer_signup_welcome',user_id:user.id,email:user.email})});const d=await r.json().catch(()=>({}));if(!r.ok||d.success!==true)throw new Error(d.message||d.error||'Welcome email not sent');}
function setMessage(text,type=''){if(!msg)return;msg.textContent=text;msg.className='form-message'+(type?' '+type:'')}
function setLoading(form,loading){form?.classList.toggle('auth-loading',loading);const b=form?.querySelector('button[type="submit"]');if(b){b.disabled=loading;b.dataset.originalText??=b.textContent;b.textContent=loading?'Please wait…':b.dataset.originalText}}
document.querySelectorAll('[data-password-toggle]').forEach(btn=>btn.addEventListener('click',()=>{const input=document.getElementById(btn.dataset.passwordToggle);if(!input)return;input.type=input.type==='password'?'text':'password';btn.setAttribute('aria-label',input.type==='password'?'Show password':'Hide password')}));

const loginForm=document.getElementById('login-form');
loginForm?.addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget;setLoading(form,true);setMessage('Signing in…');
  const f=new FormData(form);
  try{
    const d=await supabaseAuth('token?grant_type=password',{email:String(f.get('email')).trim(),password:f.get('password')});
    localStorage.setItem('dbh_session',JSON.stringify(d));
    await recordLoginSecurityEvent();
    setMessage('Signed in. Checking account security…');
    location.href=await getMfaRedirect(await postAuthRedirect('/dashboard.html'));
  }catch(primary){
    try{
      const d=await fallback('/auth/login',{email:String(f.get('email')).trim(),password:f.get('password')});
      localStorage.setItem('dbh_session',JSON.stringify(d));await recordLoginSecurityEvent();location.href=await getMfaRedirect(await postAuthRedirect('/dashboard.html'));
    }catch(error){setMessage(primary.message||'Unable to sign in. Please check your email and password.');setLoading(form,false);}
  }
});

const registerForm=document.getElementById('register-form');
const passwordInput=document.getElementById('register-password');
const confirmInput=document.getElementById('register-confirm-password');
const meter=document.getElementById('password-meter');
const hint=document.getElementById('password-hint');
passwordInput?.addEventListener('input',()=>{
  const v=passwordInput.value;let score=0;
  if(v.length>=8)score++;if(/[A-Z]/.test(v))score++;if(/[0-9]/.test(v))score++;if(/[^A-Za-z0-9]/.test(v))score++;
  if(meter)meter.style.width=(score*25)+'%';
  if(hint)hint.textContent=score>=4?'Strong password.':score>=2?'Good start — add numbers or symbols.':'Use 8+ characters, with numbers and symbols if possible.';
});
registerForm?.addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget;const f=new FormData(form);const password=String(f.get('password'));const confirm=String(f.get('confirmPassword'));
  if(password!==confirm){setMessage('Passwords do not match.');confirmInput?.focus();return}
  if(password.length<8){setMessage('Password must be at least 8 characters.');return}
  setLoading(form,true);setMessage('Creating your account…');
  const email=String(f.get('email')).trim(),fullName=String(f.get('fullName')).trim();
  try{
    const d=await supabaseAuth('signup',{email,password,options:{data:{full_name:fullName,role:'customer'},emailRedirectTo:new URL('/auth-callback.html',location.origin).href}});
    if(d.user?.id){try{await requestCustomerWelcome(d.user)}catch(mailError){console.warn('DBH signup welcome email was not sent:',mailError)}}
    if(d.access_token){
      localStorage.setItem('dbh_session',JSON.stringify(d));
      setMessage('Account created. Let us verify your account…');location.href='/verify-account.html?redirect='+encodeURIComponent(redirect());
    }else{
      setMessage('Account created. Please check your email to confirm your account.','success');setLoading(form,false);
    }
  }catch(primary){
    try{
      const d=await fallback('/auth/register',{fullName,email,password,role:'customer'});
      localStorage.setItem('dbh_session',JSON.stringify(d));location.href='/verify-account.html?redirect='+encodeURIComponent(redirect());
    }catch(error){setMessage(primary.message||'Unable to create the account.');setLoading(form,false);}
  }
});

async function startGoogleOAuth(){
  const form=document.getElementById('login-form')||document.getElementById('register-form');
  try{
    setLoading(form,true);
    setMessage('Connecting securely to Google…');
    const sb=await loadSupabaseClient();
    const redirectTo=new URL('/auth-callback.html',location.origin).href;
    const {error}=await sb.auth.signInWithOAuth({
      provider:'google',
      options:{redirectTo,queryParams:{prompt:'select_account'},scopes:'openid email profile'}
    });
    if(error)throw error;
  }catch(error){
    console.error('DBH Supabase Google OAuth error:',error);
    setMessage(error.message||'Unable to connect to Google. Please try again.');
    setLoading(form,false);
  }
}

function setupGoogleSignIn(){
  document.querySelectorAll('[data-google-signin]').forEach(host=>{
    host.classList.add('auth-google-slot-ready');
    const button=document.createElement('button');
    button.type='button';
    button.className='dbh-supabase-google-button';
    button.innerHTML='<svg viewBox="0 0 48 48" aria-hidden="true" width="19" height="19"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 18l6.8-5.3Z"/><path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6.1 29.5 4 24 4A20 20 0 0 0 5.8 15l6.8 5.3C14.2 15.7 18.7 12.1 24 12.1Z"/></svg><span>Continue with Google</span>';
    button.style.cssText='width:min(360px,100%);min-height:46px;display:flex;align-items:center;justify-content:center;gap:12px;border:1px solid #d8e0ea;border-radius:10px;background:#fff;color:#253247;font:600 14px Arial,sans-serif;cursor:pointer;box-shadow:0 1px 2px rgba(16,33,59,.05)';
    button.addEventListener('click',startGoogleOAuth);
    host.replaceChildren(button);
  });
}
setupGoogleSignIn();

async function finishSupabaseOAuthCallback(){
  if(!isSupabaseOAuthCallback)return;
  const title=document.querySelector('.auth-card-head h1');
  const message=document.getElementById('auth-message');
  const say=(value)=>{if(message)message.textContent=value};
  try{
    const params=new URLSearchParams(location.hash.replace(/^#/,'')); 
    const access_token=params.get('access_token');
    const refresh_token=params.get('refresh_token');
    const errorDescription=params.get('error_description')||params.get('error')||new URLSearchParams(location.search).get('error_description')||new URLSearchParams(location.search).get('error');
    const sb=await loadSupabaseClient();
    let data,error;
    const code=new URLSearchParams(location.search).get('code');
    if(code){
      ({data,error}=await sb.auth.exchangeCodeForSession(code));
    }else if(access_token&&refresh_token){
      ({data,error}=await sb.auth.setSession({access_token,refresh_token}));
    }else{
      throw new Error(errorDescription||'Google sign-in did not return a valid Supabase session.');
    }
    if(error||!data?.session?.user)throw error||new Error('Supabase could not establish your account session.');
    const session=data.session;
    const user=session.user;
    localStorage.setItem('dbh_session',JSON.stringify({...session,user}));
    history.replaceState({},document.title,location.pathname+location.search);
    if(title)title.textContent='Checking your DBH account…';
    say('Google sign-in successful. Securing your account…');

    const createdAt=Date.parse(String(user.created_at||''));
    const isNewUser=Number.isFinite(createdAt)&&Date.now()-createdAt>=0&&Date.now()-createdAt<15*60*1000;
    if(isNewUser){
      try{await requestCustomerWelcome(user)}catch(mailError){console.warn('DBH Google welcome email was not sent:',mailError)}
    }else{
      await recordLoginSecurityEvent();
    }
    const next=await getMfaRedirect(await postAuthRedirect('/dashboard.html'));
    say('Opening your DBH account…');
    location.replace(next);
  }catch(error){
    console.error('DBH Supabase Google callback error:',error);
    if(title)title.textContent='Sign-in could not be completed';
    say(error.message||'Please return to sign in and try again.');
    const card=document.querySelector('.auth-card');
    if(card&&!document.getElementById('oauth-retry')){
      const link=document.createElement('a');
      link.id='oauth-retry';link.href='/login.html';link.className='btn btn-primary';link.textContent='Return to sign in';
      card.appendChild(link);
    }
  }
}
finishSupabaseOAuthCallback();

async function startOAuth(provider){
  const providers={facebook:'facebook',twitter:'twitter',github:'github',gitlab:'gitlab'};
  const selected=providers[provider];
  if(!selected)return setMessage('This sign-in provider is not available.');
  setMessage('Connecting securely…');
  const redirectTo=new URL('/auth-callback.html',location.origin).href;
  location.href=DBH_CONFIG.supabaseUrl+'/auth/v1/authorize?provider='+encodeURIComponent(selected)+'&redirect_to='+encodeURIComponent(redirectTo);
}
document.querySelectorAll('[data-oauth-provider]').forEach(btn=>btn.addEventListener('click',()=>startOAuth(btn.dataset.oauthProvider)));

const forgotForm=document.getElementById('forgot-password-form');
forgotForm?.addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget;setLoading(form,true);
  const email=String(new FormData(form).get('email')).trim();
  try{
    const r=await fetch(DBH_CONFIG.supabaseUrl+'/auth/v1/recover',{method:'POST',headers:{'Content-Type':'application/json',apikey:DBH_CONFIG.supabaseAnonKey},body:JSON.stringify({email,redirect_to:new URL('/account-recovery.html',location.origin).href})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error_description||d.msg||d.message||'Unable to send the reset email.');
    setMessage('If an account exists for that email, a password reset link has been sent. Check your inbox.','success');form.reset();
  }catch(error){setMessage(error.message||'Unable to send the reset email.');}
  setLoading(form,false);
});

const resetForm=document.getElementById('reset-password-form');
resetForm?.addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget,f=new FormData(form),password=String(f.get('password')),confirm=String(f.get('confirmPassword'));
  if(password.length<8)return setMessage('Password must be at least 8 characters.');
  if(password!==confirm)return setMessage('Passwords do not match.');
  const session=JSON.parse(localStorage.getItem('dbh_session')||'null');
  const token=session?.sessionToken||session?.access_token;
  if(!token)return setMessage('This reset link or DBH session is invalid or expired.');
  setLoading(form,true);setMessage('Updating your password…');
  try{
    let d;
    if(session?.sessionToken){
      const r=await fetch(DBH_CONFIG.accountSecurityUri,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'change_password',password})});
      d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw new Error(d.message||d.error||'Unable to update your password.');
    }else{
      const r=await fetch(DBH_CONFIG.supabaseUrl+'/auth/v1/user',{method:'PUT',headers:{'Content-Type':'application/json',apikey:DBH_CONFIG.supabaseAnonKey,Authorization:'Bearer '+token},body:JSON.stringify({password})});
      d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error_description||d.msg||d.message||'Unable to update your password.');
    }
    localStorage.removeItem('dbh_session');setMessage('Password updated successfully. Redirecting to sign in…','success');setTimeout(()=>location.href='/login.html',1200);
  }catch(error){setMessage(error.message||'Unable to update your password.');}
  setLoading(form,false);
});
