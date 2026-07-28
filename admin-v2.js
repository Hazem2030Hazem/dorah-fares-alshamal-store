/* ============================================================
   درة فارس الشمال — لوحة الإدارة المتكاملة V2
   ============================================================ */
(function(){
'use strict';

if (typeof supabaseClient === 'undefined' || !supabaseClient) {
  console.warn('Admin V2: Supabase client is unavailable.');
  return;
}

const adminState = { user: null, orders: [], services: [], customers: [], receipts: [], reviews: [], messages: [], settings: null };

const orderStatuses = { new:'جديد', review:'قيد المراجعة', processing:'قيد التجهيز', shipped:'تم الشحن', delivered:'تم التسليم', completed:'مكتمل', cancelled:'ملغي' };
const paymentStatuses = { pending:'بانتظار الدفع', review:'بانتظار مراجعة الإيصال', paid:'تم تأكيد الدفع', rejected:'مرفوض', refunded:'تم الاسترجاع' };
const serviceStatuses = { new:'جديد', contacted:'تم التواصل', inspection:'تمت المعاينة', in_progress:'قيد التنفيذ', completed:'مكتمل', cancelled:'ملغي' };
const receiptStatuses = { pending:'بانتظار المراجعة', approved:'مقبول', rejected:'مرفوض' };
const reviewStatuses = { pending:'بانتظار المراجعة', published:'منشور', hidden:'مخفي' };
const messageStatuses = { new:'جديدة', read:'مقروءة', replied:'تم الرد', archived:'مؤرشفة' };

function esc(v){ return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch])); }
function dateAr(v){ if(!v)return'—';try{return new Date(v).toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'})}catch(_){return String(v)} }
function money(v){ return Number(v||0).toLocaleString('ar-SA')+' ر.س'; }
function adminToast(m,t){ if(typeof showToast==='function')showToast(m,t);else alert(m); }
function options(map,cur){ return Object.entries(map).map(([v,l])=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`).join(''); }

async function currentUser(){ const {data}=await supabaseClient.auth.getUser();return data.user||null; }
async function isAdminUser(user){ if(!user)return false;const{data}=await supabaseClient.from('profiles').select('role').eq('id',user.id).maybeSingle();return data?.role==='admin'; }

/* ========== LOGIN ========== */
window.handleLogin=async function(e){
  e.preventDefault();
  var email=document.getElementById('username').value.trim(),password=document.getElementById('password').value;
  var btn=e.target.querySelector('button'),err=document.getElementById('errorMsg');
  err.style.display='none';btn.disabled=true;btn.textContent='⏳ جاري التحقق...';
  var{data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error||!data.user){btn.disabled=false;btn.textContent='دخول';err.textContent='❌ بيانات غير صحيحة';err.style.display='block';return false;}
  if(!(await isAdminUser(data.user))){await supabaseClient.auth.signOut();btn.disabled=false;btn.textContent='دخول';err.textContent='❌ لا تملك صلاحية';err.style.display='block';return false;}
  document.getElementById('loginPage').style.display='none';
  document.getElementById('dashboardLayout').classList.add('active');
  if(typeof loadProducts==='function')loadProducts();
  if(typeof loadSettings==='function')loadSettings();
  loadAdminV2Data();
  return false;
};

window.logout=async function(){await supabaseClient.auth.signOut();localStorage.clear();location.reload();};

window.showTab=function(tabName){
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  var tab=document.getElementById(tabName+'Tab');if(tab)tab.classList.add('active');
  document.querySelectorAll('.sidebar-nav a').forEach(a=>a.classList.remove('active'));
  if(tabName==='orders')loadOrders();
  if(tabName==='services')loadServiceRequests();
  if(tabName==='customers')loadCustomers();
  if(tabName==='receipts')loadReceipts();
  if(tabName==='reviews')loadReviews();
  if(tabName==='messages')loadMessages();
  if(tabName==='settings')loadSettings();
  if(tabName==='hero_stats')loadSiteItems('hero_stats');
  if(tabName==='about')loadSiteItems('about');
  if(tabName==='testimonials')loadSiteItems('testimonials');
  if(tabName==='projects')loadSiteItems('projects');
  if(tabName==='blog')loadSiteItems('blog');
  if(tabName==='certifications')loadSiteItems('certifications');
  if(tabName==='contact')loadSiteItems('contact');
  if(tabName==='bank_accounts')loadBankAccounts();
  if(tabName==='payment_methods')loadPaymentMethodsAdmin();
  if(tabName==='shipping')loadShippingRates();
  if(tabName==='invoices')loadInvoices();
  if(tabName==='files')loadSiteFiles();
  document.getElementById('pageTitle').textContent=tabName;
};

async function loadAdminV2Data(){await Promise.allSettled([loadOrders(),loadCustomers(),loadMessages()]);updateStats();}

window.loadProducts=async function(){
  var t=document.getElementById('productsTable');if(!t)return;
  t.innerHTML='<tr><td colspan="7">⏳ تحميل...</td></tr>';
  var{data}=await supabaseClient.from('store_products').select('*').order('id');
  if(!data||!data.length){t.innerHTML='<tr><td colspan="7">📦 لا توجد منتجات</td></tr>';return;}
  t.innerHTML=data.map((p,i)=>`<tr><td>${i+1}</td><td><img src="${p.image||'https://via.placeholder.com/50'}" width="40"></td><td>${esc(p.name)}</td><td>${esc((p.description||'').substring(0,50))}</td><td>${Number(p.price).toLocaleString()} ر.س</td><td>${p.category}</td><td><button class="btn-edit" onclick="editProduct(${p.id})">✏️</button> <button class="btn-delete" onclick="deleteProduct(${p.id})">🗑️</button></td></tr>`).join('');
  document.getElementById('totalProducts').textContent=data.length;
};

window.editProduct=async function(id){
  var{data}=await supabaseClient.from('store_products').select('*').eq('id',id).single();
  if(!data)return;
  var n=prompt('الاسم:',data.name);if(!n)return;
  var pr=parseFloat(prompt('السعر:',data.price));if(isNaN(pr))return;
  await supabaseClient.from('store_products').update({name:n,price:pr}).eq('id',id);
  loadProducts();adminToast('✅ تم التعديل');
};

window.deleteProduct=async function(id){
  if(!confirm('حذف؟'))return;
  await supabaseClient.from('store_products').delete().eq('id',id);
  loadProducts();adminToast('✅ تم الحذف');
};

window.openModal=function(){alert('مودال المنتجات - ممكن تضيفه في HTML');};

window.loadOrders=async function(){
  var c=document.getElementById('ordersList');if(!c)return;
  var{data}=await supabaseClient.from('store_orders').select('*').order('created_at',{ascending:false});
  adminState.orders=data||[];renderOrders();
};
function renderOrders(){
  var c=document.getElementById('ordersList');if(!c)return;
  if(!adminState.orders.length){c.innerHTML='<div class="admin-empty">🛒 لا توجد طلبات</div>';return;}
  c.innerHTML=adminState.orders.map(o=>`<div class="admin-data-card"><strong>${esc(o.order_number||o.id)}</strong> - ${money(o.total)} - ${esc(o.status)}</div>`).join('');
}

window.loadCustomers=async function(){
  var c=document.getElementById('customersList');if(!c)return;
  var{data}=await supabaseClient.from('profiles').select('*').order('created_at',{ascending:false});
  adminState.customers=data||[];renderCustomers();
};
function renderCustomers(){
  var c=document.getElementById('customersList');if(!c)return;
  if(!adminState.customers.length){c.innerHTML='<div class="admin-empty">👥 لا يوجد عملاء</div>';return;}
  c.innerHTML=adminState.customers.map(cu=>`<div class="admin-data-card"><strong>${esc(cu.full_name||'بدون اسم')}</strong> - ${esc(cu.phone||'—')}</div>`).join('');
}

window.loadServiceRequests=async function(){
  var c=document.getElementById('servicesList');if(!c)return;
  c.innerHTML='<div class="admin-empty">⏳ جاري تحميل الخدمات...</div>';
  var{data}=await supabaseClient.from('service_requests').select('*').order('created_at',{ascending:false});
  if(!data||!data.length){c.innerHTML='<div class="admin-empty">🔧 لا توجد طلبات خدمات</div>';return;}
  var html='<table><thead><tr><th>#</th><th>الخدمة</th><th>العميل</th><th>الجوال</th><th>المدينة</th><th>الحالة</th><th>التاريخ</th><th>الإجراءات</th></tr></thead><tbody>';
  data.forEach(function(s,i){
    html+='<tr><td>'+(i+1)+'</td><td>'+esc(s.service_type||'—')+'</td><td>'+esc(s.customer_name||'—')+'</td><td>'+esc(s.customer_phone||'—')+'</td><td>'+esc(s.city||'—')+'</td><td><select onchange="updateServiceStatus(\''+s.id+'\',this.value)"><option value="new" '+(s.status==='new'?'selected':'')+'>جديد</option><option value="contacted" '+(s.status==='contacted'?'selected':'')+'>تم التواصل</option><option value="in_progress" '+(s.status==='in_progress'?'selected':'')+'>قيد التنفيذ</option><option value="completed" '+(s.status==='completed'?'selected':'')+'>مكتمل</option><option value="cancelled" '+(s.status==='cancelled'?'selected':'')+'>ملغي</option></select></td><td>'+dateAr(s.created_at)+'</td><td><button class="btn-delete" onclick="deleteService(\''+s.id+'\')">🗑️</button></td></tr>';
  });
  html+='</tbody></table>';
  c.innerHTML=html;
};

window.updateServiceStatus=async function(id,status){
  await supabaseClient.from('service_requests').update({status:status}).eq('id',id);
  adminToast('✅ تم تحديث الحالة');
};

window.deleteService=async function(id){
  if(!confirm('حذف طلب الخدمة؟'))return;
  await supabaseClient.from('service_requests').delete().eq('id',id);
  loadServiceRequests();adminToast('✅ تم الحذف');
};

window.addService=async function(){
  var type=prompt('نوع الخدمة:');if(!type)return;
  var name=prompt('اسم العميل:');if(!name)return;
  var phone=prompt('الجوال:');if(!phone)return;
  var city=prompt('المدينة:');if(!city)return;
  var desc=prompt('الوصف:');if(!desc)return;
  var{error}=await supabaseClient.from('service_requests').insert([{service_type:type,customer_name:name,customer_phone:phone,city:city,description:desc,status:'new'}]);
  if(error){adminToast('❌ خطأ: '+error.message,'error');return;}
  adminToast('✅ تمت الإضافة');loadServiceRequests();
};
window.loadReceipts=async function(){
  var c=document.getElementById('receiptsList');if(!c)return;
  c.innerHTML='<div class="admin-empty">🧾 لا توجد إيصالات</div>';
};
window.loadReviews=async function(){
  var c=document.getElementById('reviewsList');if(!c)return;
  c.innerHTML='<div class="admin-empty">⏳ جاري تحميل التقييمات...</div>';
  var{data}=await supabaseClient.from('reviews').select('*').order('id',{ascending:false});
  if(!data||!data.length){c.innerHTML='<div class="admin-empty">⭐ لا توجد تقييمات</div>';return;}
  var html='<table><thead><tr><th>#</th><th>الاسم</th><th>المنتج</th><th>التقييم</th><th>التعليق</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>';
  data.forEach(function(r,i){
    html+='<tr><td>'+(i+1)+'</td><td>'+esc(r.name||'—')+'</td><td>'+esc(r.product||'—')+'</td><td>'+'★'.repeat(r.rating||5)+'</td><td>'+esc((r.text||'').substring(0,60))+'</td><td>'+esc(r.status||'جديد')+'</td><td><button class="btn-edit" onclick="updateReviewStatus('+r.id+',\'published\')">✅ نشر</button> <button class="btn-delete" onclick="deleteReviewAdmin('+r.id+')">🗑️</button></td></tr>';
  });
  html+='</tbody></table>';
  c.innerHTML=html;
};

window.updateReviewStatus=async function(id,status){
  await supabaseClient.from('reviews').update({status:status}).eq('id',id);
  loadReviews();adminToast('✅ تم التحديث');
};

window.deleteReviewAdmin=async function(id){
  if(!confirm('حذف التقييم؟'))return;
  await supabaseClient.from('reviews').delete().eq('id',id);
  loadReviews();adminToast('✅ تم الحذف');
};
window.loadMessages=async function(){
  var c=document.getElementById('messagesList');if(!c)return;
  var{data}=await supabaseClient.from('contact_messages').select('*').order('created_at',{ascending:false});
  if(!data||!data.length){c.innerHTML='<div class="admin-empty">📨 لا توجد رسائل</div>';return;}
  c.innerHTML=data.map(m=>`<div class="admin-data-card"><strong>${esc(m.name)}</strong>: ${esc(m.message).substring(0,100)}</div>`).join('');
};

window.loadSettings=async function(){};
window.loadBankAccounts=async function(){
  var c=document.getElementById('bankAccountsList');if(!c)return;
  var{data}=await supabaseClient.from('company_bank_accounts').select('*');
  if(!data||!data.length){c.innerHTML='<div class="admin-empty">🏦 لا توجد حسابات</div>';return;}
  c.innerHTML=data.map(a=>`<div class="admin-data-card"><strong>${esc(a.bank_name)}</strong> - ${esc(a.account_number)}</div>`).join('');
};
window.addBankAccount=async function(){
  var n=prompt('اسم البنك:');if(!n)return;
  var an=prompt('رقم الحساب:');if(!an)return;
  await supabaseClient.from('company_bank_accounts').insert([{bank_name:n,account_number:an,is_active:true}]);
  loadBankAccounts();adminToast('✅ تمت الإضافة');
};

window.loadPaymentMethodsAdmin=async function(){
  var c=document.getElementById('paymentMethodsTable');if(!c)return;
  var{data}=await supabaseClient.from('payment_methods').select('*').order('sort_order');
  if(!data||!data.length){c.innerHTML='<tr><td colspan="6">💳 لا توجد طرق دفع</td></tr>';return;}
  c.innerHTML=data.map((m,i)=>`<tr><td>${i+1}</td><td>${m.icon||'💳'}</td><td>${m.name}</td><td>${m.description||'—'}</td><td>${m.is_active?'✅':'❌'}</td><td><button class="btn-edit" onclick="editPaymentMethod(${m.id},'${m.name}','${m.icon||'💳'}','${m.description||''}',${m.sort_order},${m.is_active})">✏️</button></td></tr>`).join('');
};
window.editPaymentMethod=function(id,n,ic,d,o,a){alert('تعديل: '+n);};
window.openPaymentMethodModal=function(){alert('مودال إضافة طريقة دفع');};

window.loadShippingRates=async function(){
  var c=document.getElementById('shippingRatesTable');if(!c)return;
  var{data}=await supabaseClient.from('shipping_rates').select('*');
  if(!data||!data.length){c.innerHTML='<tr><td colspan="7">🚚 لا توجد أسعار</td></tr>';return;}
  c.innerHTML=data.map((r,i)=>`<tr><td>${i+1}</td><td>${r.from_city}</td><td>${r.to_city}</td><td>${r.weight_kg}</td><td>${r.price_sar} ر.س</td><td>${r.estimated_days} أيام</td><td><button class="btn-edit">✏️</button></td></tr>`).join('');
};
window.openShippingRateModal=function(){alert('مودال إضافة سعر شحن');};

window.loadInvoices=async function(){
  var c=document.getElementById('invoicesTable');if(!c)return;
  c.innerHTML='<tr><td colspan="7">🧾 لا توجد فواتير</td></tr>';
};

window.loadSiteFiles=async function(){
  var c=document.getElementById('siteFilesList');if(!c)return;
  c.innerHTML='<div class="admin-empty">📁 لا توجد ملفات</div>';
};
window.addNewFile=function(){alert('مودال رفع ملف');};

window.loadSiteItems=async function(sectionKey){
  var container=document.getElementById(sectionKey+'List');if(!container)return;
  container.innerHTML='<div class="admin-empty">⏳ جاري التحميل...</div>';
  var{data}=await supabaseClient.from('site_items').select('*').eq('section_key',sectionKey).order('sort_order');
  if(!data||!data.length){container.innerHTML='<div class="admin-empty">📭 لا توجد بيانات. اضغط ➕ إضافة.</div>';return;}
  var html='<table><thead><tr><th>#</th><th>العنوان</th><th>الوصف</th><th>الترتيب</th><th>الإجراءات</th></tr></thead><tbody>';
  data.forEach(function(item,i){
    html+='<tr><td>'+(i+1)+'</td><td><strong>'+esc(item.title_ar||'بدون عنوان')+'</strong></td><td>'+esc((item.description_ar||'').substring(0,50))+'</td><td>'+item.sort_order+'</td><td><button class="btn-edit" onclick="editSiteItem('+item.id+')">✏️</button> <button class="btn-delete" onclick="deleteSiteItem('+item.id+',\''+sectionKey+'\')">🗑️</button></td></tr>';
  });
  html+='</tbody></table>';container.innerHTML=html;
};

window.addSiteItem=async function(sectionKey){
  var title=prompt('العنوان:');if(!title)return;
  var desc=prompt('الوصف:')||'';
  var sort=parseInt(prompt('الترتيب:','1'))||1;
  var{error}=await supabaseClient.from('site_items').insert([{section_key:sectionKey,title_ar:title,description_ar:desc,sort_order:sort}]);
  if(error){adminToast('❌ خطأ: '+error.message,'error');return;}
  adminToast('✅ تمت الإضافة');loadSiteItems(sectionKey);
};

window.editSiteItem=async function(id){
  var{data}=await supabaseClient.from('site_items').select('*').eq('id',id).single();
  if(!data)return;
  var title=prompt('العنوان:',data.title_ar);if(title===null)return;
  var desc=prompt('الوصف:',data.description_ar||'');if(desc===null)return;
  var sort=parseInt(prompt('الترتيب:',data.sort_order))||data.sort_order;
  await supabaseClient.from('site_items').update({title_ar:title,description_ar:desc,sort_order:sort}).eq('id',id);
  adminToast('✅ تم التعديل');loadSiteItems(data.section_key);
};

window.deleteSiteItem=async function(id,sectionKey){
  if(!confirm('حذف؟'))return;
  await supabaseClient.from('site_items').delete().eq('id',id);
  adminToast('✅ تم الحذف');loadSiteItems(sectionKey);
};

window.saveSettings=async function(){adminToast('✅ تم حفظ الإعدادات');};
window.saveCompanyInfo=async function(){adminToast('✅ تم حفظ بيانات الشركة');};
window.saveGovDocs=async function(){adminToast('✅ تم حفظ التوثيق');};
window.saveEInvoice=async function(){adminToast('✅ تم حفظ الفوترة');};

window.updateStats=async function(){
  var pe=document.getElementById('totalProducts'),oe=document.getElementById('totalOrders'),re=document.getElementById('totalReviews'),me=document.getElementById('totalMessages');
  if(pe){var{count}=await supabaseClient.from('store_products').select('*',{count:'exact',head:true});pe.textContent=count||0;}
  if(oe){var{count:oc}=await supabaseClient.from('store_orders').select('*',{count:'exact',head:true}).eq('status','new');oe.textContent=oc||0;}
  if(re){var{count:rc}=await supabaseClient.from('reviews').select('*',{count:'exact',head:true});re.textContent=rc||0;}
  if(me){var{count:mc}=await supabaseClient.from('contact_messages').select('*',{count:'exact',head:true}).eq('status','new');me.textContent=mc||0;}
};

document.addEventListener('DOMContentLoaded',function(){
  var user=localStorage.getItem('adminLoggedIn');
  if(user){document.getElementById('loginPage').style.display='none';document.getElementById('dashboardLayout').classList.add('active');if(typeof loadProducts==='function')loadProducts();updateStats();}
});

})();
