/* ============================================================
   درة فارس الشمال — مصادقة لوحة الإدارة (admin-auth.js)
   ============================================================ */
(function(){
'use strict';

const supabaseClient = window.supabaseClient;
if (typeof supabaseClient === 'undefined' || !supabaseClient) {
  console.warn('Admin admin-auth.js: Supabase client is unavailable.');
  return;
}

/* ========== أدوات مشتركة من admin-utils.js ========== */
const esc = window.adminUtils ? window.adminUtils.esc : function(v){ return String(v??'').replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];}); };
const dateAr = window.adminUtils ? window.adminUtils.dateAr : function(v){ if(!v)return'—';try{return new Date(v).toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'})}catch(_){return String(v)} };
const money = window.adminUtils ? window.adminUtils.money : function(v){ return Number(v||0).toLocaleString('ar-SA')+' ر.س'; };
const adminToast = window.adminUtils ? window.adminUtils.adminToast : function(m,t){ if(typeof showToast==='function')showToast(m,t);else alert(m); };
const options = window.adminUtils ? window.adminUtils.options : function(map,cur){ return Object.entries(map).map(([v,l])=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`).join(''); };
const formVal = window.adminUtils ? window.adminUtils.formVal : function(id){var el=document.getElementById(id);return el?el.value.trim():'';};
const formSet = window.adminUtils ? window.adminUtils.formSet : function(id,v){var el=document.getElementById(id);if(el)el.value=(v===null||v===undefined?'':v);};
const loadAdminScript = window.adminUtils ? window.adminUtils.loadAdminScript : function(src,globalName){
  if(globalName&&window[globalName])return Promise.resolve();
  if(!window.__adminScriptsLoaded)window.__adminScriptsLoaded={};
  if(window.__adminScriptsLoaded[src])return window.__adminScriptsLoaded[src];
  window.__adminScriptsLoaded[src]=new Promise(function(resolve,reject){
    var s=document.createElement('script');s.src=src;s.async=true;
    s.onload=function(){resolve();};
    s.onerror=function(){window.__adminScriptsLoaded[src]=null;reject(new Error('تعذر تحميل: '+src));};
    document.head.appendChild(s);
  });
  return window.__adminScriptsLoaded[src];
};

/* ========== سجل التدقيق — تسجيل صامت لا يكسر شيئاً لو الجدول غير موجود ========== */
window.logAudit=function(action,details){
  try{
    supabaseClient.from('audit_logs').insert([{action:String(action||''),details:String(details||'')}]).then(function(){},function(){});
  }catch(_){}
};

async function currentUser(){ const {data}=await supabaseClient.auth.getUser();return data.user||null; }
async function isAdminUser(user){ if(!user)return false;const{data}=await supabaseClient.from('profiles').select('role').eq('id',user.id).maybeSingle();return data?.role==='admin'; }
async function getPanelRole(user){ if(!user)return null;const{data}=await supabaseClient.from('profiles').select('role').eq('id',user.id).maybeSingle();return data?.role||null; }
window.adminPanelRole = null;

/* ========== LOGIN ========== */
function openAdminPanel(){
  document.getElementById('loginPage').style.display='none';
  document.getElementById('dashboardLayout').classList.add('active');
  applyPanelRoleRestrictions();
  if(typeof loadProducts==='function')loadProducts();
  if(typeof loadSettings==='function')loadSettings();
  loadAdminV2Data();
}

function applyPanelRoleRestrictions(){
  if(window.adminPanelRole!=='staff')return;
  var allowed=['dashboard','orders','services','receipts','messages','security'];
  document.querySelectorAll('.sidebar a[onclick]').forEach(function(a){
    var m=(a.getAttribute('onclick')||'').match(/showTab\('([^']+)'\)/);
    if(m && allowed.indexOf(m[1])<0) a.style.display='none';
  });
  document.querySelectorAll('.sidebar .nav-section').forEach(function(s){ s.style.display='none'; });
  showTab('orders');
}
async function hasAuthSession(){
  try{
    var r=await supabaseClient.auth.getSession();
    return !!(r&&r.data&&r.data.session);
  }catch(_){return false;}
}

window.handleLogin=async function(e){
  e.preventDefault();
  var email=document.getElementById('username').value.trim(),password=document.getElementById('password').value;
  var btn=e.target.querySelector('button'),err=document.getElementById('errorMsg');
  err.style.display='none';btn.disabled=true;btn.textContent='⏳ جاري التحقق...';
  function loginFail(msg){btn.disabled=false;btn.textContent='دخول إلى لوحة التحكم';err.textContent=msg;err.style.display='block';}
  /* دخول آمن عبر Supabase Auth + فحص صلاحية الأدمن (profiles.role==='admin') — لا يوجد أي مسار بديل، واستعادة الجلسة تعتمد على getSession() فقط */
  try{
    var{data,error}=await supabaseClient.auth.signInWithPassword({email:email,password:password});
    if(error||!data||!data.user){loginFail('❌ بيانات الدخول غير صحيحة أو لم يُنشأ مستخدم الأدمن بعد (Authentication → Users)');return false;}
    var _role = await getPanelRole(data.user);
    if(_role !== 'admin' && _role !== 'staff'){try{await supabaseClient.auth.signOut();}catch(_){}loginFail('❌ لا تملك صلاحية الدخول للوحة');return false;}
    window.adminPanelRole = _role;
    logAudit('تسجيل دخول','دخول المدير إلى لوحة الإدارة عبر Supabase Auth: '+email);
    openAdminPanel();
  }catch(ex){
    console.warn('handleLogin:',ex);
    loginFail('❌ بيانات الدخول غير صحيحة أو لم يُنشأ مستخدم الأدمن بعد (Authentication → Users)');
  }
  return false;
};

window.logout=async function(){
  try{await supabaseClient.auth.signOut();}catch(_){}
  try{localStorage.clear();}catch(_){}
  location.reload();
};
document.addEventListener('DOMContentLoaded',async function(){
  /* استعادة الجلسة: supabaseClient.auth.getSession() فقط — لا جلسة = صفحة الدخول بدون أي استثناء */
  if(await hasAuthSession()){openAdminPanel();return;}
  /* تنظيف صامت لمفاتيح localStorage القديمة (adminLoggedIn/adminLoginTime) — لا تفتح اللوحة أبداً */
  try{
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminLoginTime');
  }catch(_){}
});
/* ============================================================
   👥 إدارة الموظفين — الأدمن يضيف إيميلات، وكل موظف يعيّن كلمته بنفسه
   ============================================================ */
async function loadStaff(){
  var c=document.getElementById('staffList'); if(!c)return;
  c.innerHTML='<div class="admin-empty">⏳ جاري التحميل...</div>';
  var{data,error}=await supabaseClient.from('staff_members').select('*').order('created_at',{ascending:false});
  if(error){ c.innerHTML='<div class="admin-empty">👥 تعذر التحميل — تأكد من تشغيل ملف نظام-الموظفين-والأدمن.sql في Supabase أولاً.</div>'; return; }
  if(!data||!data.length){ c.innerHTML='<div class="admin-empty">👥 لا يوجد موظفون بعد — أضف أول إيميل من الأعلى.</div>'; return; }
  c.innerHTML='<table><thead><tr><th>الإيميل</th><th>الحالة</th><th>أُضيف في</th><th>فعّل حسابه في</th><th>إجراءات</th></tr></thead><tbody>'+data.map(function(s){
    var badge=s.status==='active'
      ?'<span style="background:rgba(16,185,129,.15);color:#10B981;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700">✅ نشط — عيّن كلمته</span>'
      :'<span style="background:rgba(245,158,11,.15);color:#F59E0B;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700">⏳ بانتظار أول دخول</span>';
    return '<tr><td style="direction:ltr;text-align:right;font-weight:700">'+s.email+'</td><td>'+badge+'</td><td>'+new Date(s.created_at).toLocaleDateString('ar-EG')+'</td><td>'+(s.activated_at?new Date(s.activated_at).toLocaleDateString('ar-EG'):'—')+'</td><td><button class="btn-delete" data-staff-id="'+s.id+'" data-staff-email="'+esc(s.email)+'" data-dora-call="deleteStaff:$element">🗑️ حذف</button></td></tr>';
  }).join('')+'</tbody></table>';
}

window.addStaff=async function(e){
  if(e&&e.preventDefault)e.preventDefault();
  var inp=document.getElementById('newStaffEmail');
  var email=(inp.value||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){adminToast('⚠️ أدخل إيميلاً صحيحاً','error');return false;}
  var{data:{user}}=await supabaseClient.auth.getUser();
  var{error}=await supabaseClient.from('staff_members').insert([{email:email,invited_by:user?user.id:null}]);
  if(error){adminToast('❌ '+(error.code==='23505'?'هذا الإيميل مضاف مسبقاً':error.message),'error');return false;}
  inp.value='';
  adminToast('✅ تمت إضافة الموظف — أخبره أن ينشئ حساباً من الموقع بنفس الإيميل ويختار كلمته الخاصة');
  loadStaff();
  return false;
};

window.deleteStaff=async function(el){
  if(!el || !el.getAttribute) return;
  var id = el.getAttribute('data-staff-id');
  var email = el.getAttribute('data-staff-email') || '';
  if(!confirm('حذف الموظف "'+email+'"؟ لن يستطيع الدخول للوحة بعد الآن (حسابه على الموقع يبقى عميلاً عادياً).'))return;
  var{error}=await supabaseClient.from('staff_members').delete().eq('id',id);
  if(error){adminToast('❌ '+error.message,'error');return;}
  adminToast('✅ تم حذف الموظف');
  loadStaff();
};

/* ============================================================
   🔑 تغيير كلمة المرور — كل مستخدم يغيّر كلمته بنفسه فقط
   ============================================================ */
window.changeMyPassword=async function(e){
  if(e&&e.preventDefault)e.preventDefault();
  var p1=document.getElementById('myNewPassword').value;
  var p2=document.getElementById('myNewPassword2').value;
  if(p1.length<6){adminToast('⚠️ كلمة المرور 6 أحرف على الأقل','error');return false;}
  if(p1!==p2){adminToast('⚠️ كلمتا المرور غير متطابقتين','error');return false;}
  var{error}=await supabaseClient.auth.updateUser({password:p1});
  if(error){adminToast('❌ '+error.message,'error');return false;}
  document.getElementById('myNewPassword').value='';
  document.getElementById('myNewPassword2').value='';
  adminToast('✅ تم تغيير كلمة المرور بنجاح — استخدمها من تسجيل الدخول القادم');
  logAudit('تغيير كلمة مرور','غيّر مستخدم اللوحة كلمة مروره الخاصة');
  return false;
};

window.currentUser = currentUser;
window.isAdminUser = isAdminUser;
window.getPanelRole = getPanelRole;
window.hasAuthSession = hasAuthSession;
})();
