import {DBH_CONFIG} from './config.js';

const msg=document.getElementById('auth-message');
const redirect=()=>new URLSearchParams(location.search).get('redirect')||'/dashboard.html';

async function supabaseAuth(path,body){
  const r=await fetch(DBH_CONFIG.supabaseUrl+'/auth/v1/'+path,{
    method:'POST',
    headers:{'Content-Type':'application/json',apikey:DBH_CONFIG.supabaseAnonKey},
    body:JSON.stringify(body)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error_description||data.msg||data.message||'Authentication failed');
  return data;
}

async function fallback(path,payload){
  const r=await fetch((DBH_CONFIG.apiBaseUrl||'')+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!r.ok)throw new Error('Request failed');
  return r.json();
}

document.getElementById('login-form')?.addEventListener('submit',async e=>{
  e.preventDefault();msg.textContent='Signing in…';
  const f=new FormData(e.currentTarget);
  try{
    const d=await supabaseAuth('token?grant_type=password',{email:f.get('email'),password:f.get('password')});
    localStorage.setItem('dbh_session',JSON.stringify(d));
    location.href=redirect();
  }catch(primary){
    try{
      const d=await fallback('/auth/login',{email:f.get('email'),password:f.get('password')});
      localStorage.setItem('dbh_session',JSON.stringify(d));
      location.href=redirect();
    }catch(error){msg.textContent=primary.message||'Unable to sign in.';}
  }
});

document.getElementById('register-form')?.addEventListener('submit',async e=>{
  e.preventDefault();msg.textContent='Creating account…';
  const f=new FormData(e.currentTarget);
  const email=f.get('email'),password=f.get('password'),fullName=f.get('fullName');
  try{
    const d=await supabaseAuth('signup',{email,password,data:{full_name:fullName,role:'customer'}});
    if(d.access_token){localStorage.setItem('dbh_session',JSON.stringify(d));try{await fetch(DBH_CONFIG.supabaseUrl+'/rest/v1/profiles',{method:'POST',headers:{'Content-Type':'application/json',apikey:DBH_CONFIG.supabaseAnonKey,Authorization:'Bearer '+d.access_token,Prefer:'resolution=merge-duplicates'},body:JSON.stringify({id:d.user.id,full_name:fullName,email,role:'customer'})});}catch{}}
    msg.textContent=d.access_token?'Account created. Redirecting…':'Account created. Check your email to confirm your account.';
    if(d.access_token) location.href=redirect();
  }catch(primary){
    try{
      const d=await fallback('/auth/register',{fullName,email,password,role:'customer'});
      localStorage.setItem('dbh_session',JSON.stringify(d));
      location.href=redirect();
    }catch(error){msg.textContent=primary.message||'Unable to create the account.';}
  }
});