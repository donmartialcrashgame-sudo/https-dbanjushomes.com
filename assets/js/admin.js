const session=localStorage.getItem('dbh_session');
if(!session) location.href='/login.html';
document.getElementById('admin-logout').onclick=()=>{localStorage.removeItem('dbh_session');location.href='/'};
const c=window.DBH_CONFIG||{};
const token=(()=>{try{const s=JSON.parse(session);return s?.access_token||s?.accessToken||s?.session?.access_token||session}catch{return session}})();
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const money=v=>'₦'+Number(v||0).toLocaleString('en-NG',{minimumFractionDigits:2,maximumFractionDigits:2});
fetch('/admin/overview',{headers:{Authorization:'Bearer '+token}}).then(r=>r.json()).then(d=>{const s=d.data?.stats||{};document.getElementById('admin-stats').innerHTML=[['Properties',s.properties??0],['Pending',s.pending??0],['Users',s.users??0],['Agents',s.agents??0]].map(x=>'<div class="stat-card"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>').join('');document.getElementById('pending-properties').textContent=(s.pending??0)+' properties waiting for review.'}).catch(()=>{});
async function loadAdminWalletOverview(){
 const msg=document.getElementById('admin-wallet-message'), stats=document.getElementById('admin-wallet-stats'), list=document.getElementById('admin-wallet-transactions');
 msg.textContent='Loading customer wallet summary…';
 try{
  const r=await fetch(c.supabaseUrl+'/functions/v1/dbh-admin-wallet-overview',{method:'POST',headers:{'Content-Type':'application/json','apikey':c.supabaseAnonKey,'Authorization':'Bearer '+token},body:JSON.stringify({action:'overview'}),cache:'no-store'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.ok) throw new Error(d.error||'Could not load wallet summary.');
  const s=d.summary||{};
  stats.innerHTML=[['Total customer wallet balance',money(s.total_customer_balance_ngn)],['Successful deposits recorded',money(s.successful_deposits_ngn)],['Customer wallets',Number(s.customer_wallets||0).toLocaleString('en-NG')],['Active wallets',Number(s.active_wallets||0).toLocaleString('en-NG')]].map(([label,value])=>'<div class="stat-card"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>').join('');
  msg.textContent='Updated '+new Date().toLocaleString('en-NG')+'. Customer balances and deposits are calculated from DBH ledger records; Flutterwave payout balance is separate.';
  const walletList=document.getElementById('admin-customer-wallet-list');
  const wallets=Array.isArray(d.wallets)?d.wallets:[];
  if(walletList){
   if(!wallets.length){walletList.innerHTML='<p>No customer wallets were returned.</p>'}
   else walletList.innerHTML='<table style="width:100%;border-collapse:collapse;min-width:700px"><thead><tr><th style="text-align:left;padding:10px">Customer</th><th style="text-align:left;padding:10px">Email</th><th style="text-align:left;padding:10px">Wallet status</th><th style="text-align:left;padding:10px">Currency</th><th style="text-align:right;padding:10px">Available balance</th><th style="text-align:left;padding:10px">Last updated</th></tr></thead><tbody>'+wallets.map(w=>'<tr><td style="padding:10px;border-top:1px solid #e5edf5">'+esc(w.customer_name||'DBH Customer')+'</td><td style="padding:10px;border-top:1px solid #e5edf5">'+esc(w.customer_email||'—')+'</td><td style="padding:10px;border-top:1px solid #e5edf5">'+esc(w.status||'—')+'</td><td style="padding:10px;border-top:1px solid #e5edf5">'+esc(w.currency||'NGN')+'</td><td style="padding:10px;text-align:right;border-top:1px solid #e5edf5">'+esc(money(w.available_balance))+'</td><td style="padding:10px;border-top:1px solid #e5edf5">'+esc(w.updated_at?new Date(w.updated_at).toLocaleString('en-NG'):'—')+'</td></tr>').join('')+'</tbody></table>';
  }
  const rows=Array.isArray(d.transactions)?d.transactions:[];
  if(!rows.length){list.innerHTML='<p>No customer wallet transactions are recorded yet.</p>';return}
  list.innerHTML='<table style="width:100%;border-collapse:collapse;min-width:760px"><thead><tr><th style="text-align:left;padding:10px">Date</th><th style="text-align:left;padding:10px">Customer</th><th style="text-align:left;padding:10px">Type</th><th style="text-align:left;padding:10px">Reference</th><th style="text-align:left;padding:10px">Status</th><th style="text-align:right;padding:10px">Amount</th></tr></thead><tbody>'+rows.map(t=>'<tr><td style="padding:10px;border-top:1px solid #e5edf5">'+esc(t.created_at?new Date(t.created_at).toLocaleString('en-NG'):'—')+'</td><td style="padding:10px;border-top:1px solid #e5edf5">'+esc(t.customer_name)+'<br><small>'+esc(t.customer_email)+'</small></td><td style="padding:10px;border-top:1px solid #e5edf5">'+esc(t.transaction_type)+' / '+esc(t.direction)+'</td><td style="padding:10px;border-top:1px solid #e5edf5">'+esc(t.reference||'—')+'</td><td style="padding:10px;border-top:1px solid #e5edf5">'+esc(t.status)+'</td><td style="padding:10px;text-align:right;border-top:1px solid #e5edf5">'+(String(t.direction).toLowerCase()==='debit'?'-':'+')+esc(money(t.amount))+'</td></tr>').join('')+'</tbody></table>';
 }catch(e){msg.textContent=e.message||'Customer wallet summary is unavailable.';stats.innerHTML='';list.textContent='Transactions could not be loaded.'}
}
document.getElementById('admin-wallet-refresh')?.addEventListener('click',loadAdminWalletOverview);
loadAdminWalletOverview();
async function loadAdminReports(){const el=document.getElementById('admin-reports');if(!el||!c.supabaseUrl)return;try{const r=await fetch(c.supabaseUrl+'/rest/v1/property_reports?select=*&order=created_at.desc&limit=50',{headers:{apikey:c.supabaseAnonKey,Authorization:'Bearer '+token,Accept:'application/json'}});const rows=await r.json();if(!r.ok)throw Error();if(!Array.isArray(rows)||!rows.length){el.innerHTML='<p>No property reports have been submitted.</p>';return}el.innerHTML='<div class="admin-report-list">'+rows.map(x=>'<article class="admin-report"><div class="admin-report-top"><strong>'+esc(x.report_reference||'Report')+'</strong><span>'+esc(x.status||'new')+'</span></div><h3>'+esc(x.property_title||'Property report')+'</h3><p><b>'+esc(x.reason||'')+'</b></p><p>'+esc(x.details||'')+'</p><small>'+esc(x.first_name||'')+' '+esc(x.surname||'')+' · '+esc(x.email||'')+' · '+new Date(x.created_at).toLocaleString('en-NG')+'</small></article>').join('')+'</div>'}catch(e){el.innerHTML='<p>Reports could not be loaded.</p>'}}loadAdminReports();

const adminPropertyForm=document.getElementById('admin-add-property-form');
if(adminPropertyForm){
 const propertyMsg=document.getElementById('admin-property-message');
 const propertyImages=document.getElementById('admin-property-images');
 const imagePreview=document.getElementById('admin-property-image-preview');
 propertyImages?.addEventListener('change',()=>{
  const files=Array.from(propertyImages.files||[]);
  imagePreview.innerHTML='';
  if(files.length>15){propertyMsg.style.display='block';propertyMsg.style.background='#fff2f1';propertyMsg.style.color='#9d2318';propertyMsg.textContent='Choose no more than 15 photos.';propertyImages.value='';return}
  document.getElementById('admin-property-image-note').textContent=files.length+' photo(s) selected. The first photo will be the cover image.';
  files.forEach(file=>{const img=document.createElement('img');img.alt=file.name;img.title=file.name;img.src=URL.createObjectURL(file);img.style.cssText='width:105px;height:85px;object-fit:cover;border-radius:8px;border:1px solid #dbe4ef';imagePreview.appendChild(img)});
 });
 adminPropertyForm.addEventListener('submit',async ev=>{
  ev.preventDefault();
  const submit=document.getElementById('admin-property-submit');
  const show=(message,ok=false)=>{propertyMsg.style.display='block';propertyMsg.style.background=ok?'#effaf3':'#fff2f1';propertyMsg.style.color=ok?'#166534':'#9d2318';propertyMsg.textContent=message};
  if(!c.supabaseUrl||!c.supabaseAnonKey){show('Supabase configuration is missing on this page.');return}
  const fd=new FormData(adminPropertyForm);
  fd.set('is_featured',adminPropertyForm.elements.is_featured.checked?'true':'false');
  fd.set('amenities',JSON.stringify(String(fd.get('amenities_text')||'').split(',').map(x=>x.trim()).filter(Boolean)));
  fd.set('features',JSON.stringify(String(fd.get('features_text')||'').split(',').map(x=>x.trim()).filter(Boolean)));
  fd.delete('amenities_text');fd.delete('features_text');
  submit.disabled=true;submit.textContent='Saving and publishing…';
  show('Saving property details and uploading photos. Please keep this page open.');
  try{
   const res=await fetch(c.supabaseUrl+'/functions/v1/dbh-admin-create-property',{method:'POST',headers:{apikey:c.supabaseAnonKey,Authorization:'Bearer '+token},body:fd,cache:'no-store'});
   const data=await res.json().catch(()=>({}));
   if(!res.ok||!data.ok)throw new Error(data.error||'Property could not be saved.');
   show('Published successfully: '+(data.property?.title||'Property')+'. '+(data.images||0)+' photo(s) uploaded. Verification is still pending.',true);
   adminPropertyForm.reset();imagePreview.innerHTML='';document.getElementById('admin-property-image-note').textContent='Choose clear front and interior photos. Each photo must be under 10 MB.';
   loadAdminOverviewAfterProperty();
  }catch(err){show(err.message||'Property could not be saved.')}
  finally{submit.disabled=false;submit.textContent='Save and publish property'}
 });
}
function loadAdminOverviewAfterProperty(){fetch('/admin/overview',{headers:{Authorization:'Bearer '+token},cache:'no-store'}).then(r=>r.json()).then(d=>{const s=d.data?.stats||{};document.getElementById('admin-stats').innerHTML=[['Properties',s.properties??0],['Pending',s.pending??0],['Users',s.users??0],['Agents',s.agents??0]].map(x=>'<div class="stat-card"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>').join('');document.getElementById('pending-properties').textContent=(s.pending??0)+' properties waiting for review.'}).catch(()=>{})}
