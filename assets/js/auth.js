import {DBH_CONFIG} from './config.js';
const msg=document.getElementById('auth-message');
async function submit(path,payload){
  const r=await fetch((DBH_CONFIG.apiBaseUrl||'')+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!r.ok)throw new Error('Request failed');
  return r.json();
}
document.getElementById('login-form')?.addEventListener('submit',async e=>{
  e.preventDefault(); msg.textContent='Signing in…'; const f=new FormData(e.currentTarget);
  try{const d=await submit('/auth/login',{email:f.get('email'),password:f.get('password')}); localStorage.setItem('dbh_session',JSON.stringify(d.user||d)); location.href='/dashboard.html';}
  catch{msg.textContent='Unable to sign in. Connect the backend authentication endpoint.';}
});
document.getElementById('register-form')?.addEventListener('submit',async e=>{
  e.preventDefault(); msg.textContent='Creating account…'; const f=new FormData(e.currentTarget);
  try{const d=await submit('/auth/register',{fullName:f.get('fullName'),email:f.get('email'),password:f.get('password'),role:f.get('role')}); localStorage.setItem('dbh_session',JSON.stringify(d.user||d)); location.href='/dashboard.html';}
  catch{msg.textContent='Unable to create the account. Connect the backend authentication endpoint.';}
});