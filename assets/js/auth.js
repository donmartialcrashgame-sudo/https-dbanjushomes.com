import {DBH_CONFIG} from './config.js';

const msg=document.getElementById('auth-message');

function captureSupabaseSessionFromHash(){
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));
  const access_token=hash.get('access_token');
  const refresh_token=hash.get('refresh_token');
  if(!access_token)return null;
  const session={access_token,refresh_token,expires_in:Number(hash.get('expires_in')||0),token_type:hash.get('token_type')||'bearer',type:hash.get('type')||''};
  localStorage.setItem('dbh_session',JSON.stringify(session));
  history.replaceState({},document.title,location.pathname+location.search);
  return session;
}
const hashSession=captureSupabaseSessionFromHash();
if(hashSession && location.pathname.endsWith('/auth-callback.html')){
  location.replace('/dashboard.html');
}
if(location.pathname.endsWith('/reset-password.html')){
  const s=hashSession||(()=>{try{return JSON.parse(localStorage.getItem('dbh_session')||'null')}catch{return null}})();
  if(!s?.access_token||s.type!=='recovery') location.replace('/forgot-password.html');
}
const redirect=()=>new URLSearchParams(location.search).get('redirect')||'/dashboard.html';
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
    setMessage('Signed in. Opening your account…');
    location.href=await postAuthRedirect('/dashboard.html');
  }catch(primary){
    try{
      const d=await fallback('/auth/login',{email:String(f.get('email')).trim(),password:f.get('password')});
      localStorage.setItem('dbh_session',JSON.stringify(d));location.href=await postAuthRedirect('/dashboard.html');
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
    const d=await supabaseAuth('signup',{email,password,data:{full_name:fullName,role:'customer'}});
    if(d.access_token){
      localStorage.setItem('dbh_session',JSON.stringify(d));
      try{await fetch(DBH_CONFIG.supabaseUrl+'/rest/v1/profiles',{method:'POST',headers:{'Content-Type':'application/json',apikey:DBH_CONFIG.supabaseAnonKey,Authorization:'Bearer '+d.access_token,Prefer:'resolution=merge-duplicates'},body:JSON.stringify({id:d.user.id,full_name:fullName,email,role:'customer'})})}catch{}
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
    const r=await fetch(DBH_CONFIG.supabaseUrl+'/auth/v1/recover',{method:'POST',headers:{'Content-Type':'application/json',apikey:DBH_CONFIG.supabaseAnonKey},body:JSON.stringify({email,redirect_to:new URL('/reset-password.html',location.origin).href})});
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
  if(!session?.access_token)return setMessage('This reset link is invalid or expired. Request a new one.');
  setLoading(form,true);setMessage('Updating your password…');
  try{
    const r=await fetch(DBH_CONFIG.supabaseUrl+'/auth/v1/user',{method:'PUT',headers:{'Content-Type':'application/json',apikey:DBH_CONFIG.supabaseAnonKey,Authorization:'Bearer '+session.access_token},body:JSON.stringify({password})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error_description||d.msg||d.message||'Unable to update your password.');
    localStorage.removeItem('dbh_session');setMessage('Password updated. Redirecting to sign in…','success');setTimeout(()=>location.href='/login.html',1200);
  }catch(error){setMessage(error.message||'Unable to update your password.');}
  setLoading(form,false);
});
