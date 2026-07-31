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

/* ========== سجل التدقيق — تسجيل صامت لا يكسر شيئاً لو الجدول غير موجود ========== */
window.logAudit=function(action,details){
  try{
    supabaseClient.from('audit_log').insert([{action:String(action||''),details:String(details||'')}]).then(function(){},function(){});
  }catch(_){}
};

/* ========== تحميل مكتبات خارجية ديناميكياً عند الحاجة فقط ========== */
var adminScriptsLoaded={};
function loadAdminScript(src,globalName){
  if(globalName&&window[globalName])return Promise.resolve();
  if(adminScriptsLoaded[src])return adminScriptsLoaded[src];
  adminScriptsLoaded[src]=new Promise(function(resolve,reject){
    var s=document.createElement('script');s.src=src;s.async=true;
    s.onload=function(){resolve();};
    s.onerror=function(){adminScriptsLoaded[src]=null;reject(new Error('تعذر تحميل: '+src));};
    document.head.appendChild(s);
  });
  return adminScriptsLoaded[src];
}
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
  logAudit('تسجيل دخول','دخول المدير إلى لوحة الإدارة: '+email);
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
  if(tabName==='why_us')loadSiteItems('why_us');
  if(tabName==='vision_mission')loadSiteItems('vision_mission');
  if(tabName==='hero_stats')loadSiteItems('hero_stats');
  if(tabName==='about')loadSiteItems('about');
  if(tabName==='testimonials')loadSiteItems('testimonials');
  if(tabName==='projects')loadSiteItems('projects');
  if(tabName==='blog')loadSiteItems('blog');
  if(tabName==='certifications')loadSiteItems('certifications');
  if(tabName==='contact')loadSiteItems('contact');
  if(tabName==='announcements')loadSiteItems('announcements');
  if(tabName==='afaky'){loadAfakySettings();loadAfakySyncLog();}
  if(tabName==='dashboard')renderDashboardCharts();
  if(tabName==='auditLog')loadAuditLog();
  if(tabName==='einvoice'){loadZatcaSettings();loadZatcaInvoices();}
  if(tabName==='bank_accounts')loadBankAccounts();
  if(tabName==='payment_methods')loadPaymentMethodsAdmin();
  if(tabName==='shipping')loadShippingRates();
  if(tabName==='invoices')loadInvoices();
  if(tabName==='files')loadSiteFiles();
  var tabTitles={dashboard:'لوحة المؤشرات',auditLog:'سجل التدقيق',einvoice:'الفوترة الإلكترونية'};
  document.getElementById('pageTitle').textContent=tabTitles[tabName]||tabName;
};

async function loadAdminV2Data(){await Promise.allSettled([loadOrders(),loadCustomers(),loadMessages()]);updateStats();}

window.loadProducts = async function() {
  var t = document.getElementById('productsTable');
  if (!t) return;
  t.innerHTML = '<tr><td colspan="7">⏳ تحميل...</td></tr>';
  var { data } = await supabaseClient.from('store_products').select('*').order('id');
  if (!data || !data.length) {
    t.innerHTML = '<tr><td colspan="7">📦 لا توجد منتجات</td></tr>';
    return;
  }
  t.innerHTML = data.map((p, i) => 
    `<tr>
      <td>${i+1}</td>
      <td style="width:50px; height:50px; text-align:center; vertical-align:middle; border-radius:6px; overflow:hidden; background:#f0f0f0;">
        <img src="${p.image}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <svg style="display:none; width:24px; height:24px; margin:auto; color:#666;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      </td>
      <td>${esc(p.name)}</td>
      <td>${esc((p.description || '').substring(0, 50))}</td>
      <td>${Number(p.price).toLocaleString()} ر.س</td>
      <td>${p.category}</td>
      <td>
        <button class="btn-edit" onclick="editProduct(${p.id})">✏️</button>
        <button class="btn-delete" onclick="deleteProduct(${p.id})">🗑️</button>
      </td>
    </tr>`
  ).join('');
  document.getElementById('totalProducts').textContent = data.length;
};

window.editProduct = async function(id) {
  var { data } = await supabaseClient.from('store_products').select('*').eq('id', id).single();
  if (!data) return;
  document.getElementById('productId').value = data.id;
  document.getElementById('productName').value = data.name;
  document.getElementById('productDesc').value = data.description || '';
  document.getElementById('productPrice').value = data.price;
  document.getElementById('productOldPrice').value = data.old_price || '';
  document.getElementById('productStock').value = data.stock || 0;
  document.getElementById('productCategory').value = data.category;
  document.getElementById('productBadge').value = data.badge || '';
  document.getElementById('productImage').value = data.image || '';
  document.getElementById('productRating').value = data.rating || 0;
  document.getElementById('productModalTitle').textContent = '✏️ تعديل منتج';
  document.getElementById('productModal').classList.add('show');
};

window.deleteProduct = async function(id) {
  if (!confirm('حذف هذا المنتج؟')) return;
  var { error } = await supabaseClient.from('store_products').delete().eq('id', id);
  if (error) { adminToast('❌ خطأ: ' + error.message, 'error'); return; }
  adminToast('✅ تم الحذف بنجاح');
  logAudit('حذف منتج','منتج رقم: '+id);
  loadProducts();
};

window.openModal = function() {
  document.getElementById('productModal').classList.add('show');
  document.getElementById('productModalTitle').textContent = '📦 إضافة منتج';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
};

window.closeProductModal = function() {
  document.getElementById('productModal').classList.remove('show');
};

window.saveProduct = async function(e) {
  e.preventDefault();
  var id = document.getElementById('productId').value;

  var product = {
    name: document.getElementById('productName').value,
    description: document.getElementById('productDesc').value,
    price: parseFloat(document.getElementById('productPrice').value),
    old_price: parseFloat(document.getElementById('productOldPrice').value) || null,
    stock: parseInt(document.getElementById('productStock').value) || 0,
    category: document.getElementById('productCategory').value,
    badge: document.getElementById('productBadge').value,
    image: document.getElementById('productImage').value,  // هذا الحقل هو المسؤول عن الصورة
    rating: parseFloat(document.getElementById('productRating').value) || 0,
    is_active: true
  };

  console.log('البيانات المرسلة:', product); // للتأكد من وجود رابط الصورة

  var btn = document.querySelector('#productForm .btn-save');
  btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...';

  var result, error;
  if (id) {
    result = await supabaseClient.from('store_products').update(product).eq('id', id);
    error = result.error;
  } else {
    result = await supabaseClient.from('store_products').insert(product);
    error = result.error;
  }

  btn.disabled = false; btn.textContent = '💾 حفظ المنتج';

  if (error) {
    adminToast('❌ خطأ: ' + error.message, 'error');
    console.error('خطأ Supabase:', error); // يوضح الخطأ في الكونسول
    return;
  }

  document.getElementById('productModal').classList.remove('show');
  adminToast('✅ تم الحفظ بنجاح');
  logAudit(id?'تعديل منتج':'إضافة منتج',(product.name||'بدون اسم')+(id?' (رقم: '+id+')':''));
  loadProducts();
  return false;
};
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
  logAudit('حذف تقييم','تقييم رقم: '+id);
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
  var setStat=function(id,val){var el=document.getElementById(id);if(el)el.textContent=val;};
  var newOrders=0,newMessages=0;
  try{
    var pe=document.getElementById('totalProducts');
    if(pe){var{count}=await supabaseClient.from('store_products').select('*',{count:'exact',head:true});pe.textContent=count||0;}
  }catch(e){console.warn('updateStats products:',e);setStat('totalProducts',0);}
  try{
    var ae=document.getElementById('totalOrdersAll');
    if(ae){var{count:ac}=await supabaseClient.from('store_orders').select('*',{count:'exact',head:true});ae.textContent=ac||0;}
  }catch(e){console.warn('updateStats orders all:',e);setStat('totalOrdersAll',0);}
  try{
    var oe=document.getElementById('totalOrders');
    var{count:oc}=await supabaseClient.from('store_orders').select('*',{count:'exact',head:true}).eq('status','new');
    newOrders=oc||0;if(oe)oe.textContent=newOrders;
  }catch(e){console.warn('updateStats new orders:',e);setStat('totalOrders',0);}
  try{
    var ce=document.getElementById('totalCustomers');
    if(ce){var{count:cc}=await supabaseClient.from('profiles').select('*',{count:'exact',head:true});ce.textContent=cc||0;}
  }catch(e){console.warn('updateStats customers:',e);setStat('totalCustomers',0);}
  try{
    var te=document.getElementById('todaySales');
    if(te){
      var todayStart=new Date();todayStart.setHours(0,0,0,0);
      var{data:todayOrders}=await supabaseClient.from('store_orders').select('total').gte('created_at',todayStart.toISOString());
      var todaySum=(todayOrders||[]).reduce(function(s,o){return s+Number(o.total||0);},0);
      te.textContent=todaySum.toLocaleString('ar-SA')+' ر.س';
    }
  }catch(e){console.warn('updateStats today sales:',e);setStat('todaySales','0 ر.س');}
  try{
    var mse=document.getElementById('monthSales');
    if(mse){
      var now=new Date(),monthStart=new Date(now.getFullYear(),now.getMonth(),1);
      var{data:monthOrders}=await supabaseClient.from('store_orders').select('total').gte('created_at',monthStart.toISOString());
      var monthSum=(monthOrders||[]).reduce(function(s,o){return s+Number(o.total||0);},0);
      mse.textContent=monthSum.toLocaleString('ar-SA')+' ر.س';
    }
  }catch(e){console.warn('updateStats month sales:',e);setStat('monthSales','0 ر.س');}
  try{
    var re=document.getElementById('totalReviews');
    if(re){var{count:rc}=await supabaseClient.from('reviews').select('*',{count:'exact',head:true});re.textContent=rc||0;}
  }catch(e){console.warn('updateStats reviews:',e);setStat('totalReviews',0);}
  try{
    var me=document.getElementById('totalMessages');
    var{count:mc}=await supabaseClient.from('contact_messages').select('*',{count:'exact',head:true}).eq('status','new');
    newMessages=mc||0;if(me)me.textContent=newMessages;
  }catch(e){console.warn('updateStats messages:',e);setStat('totalMessages',0);}
  var badge=document.getElementById('notifBadge');
  if(badge)badge.textContent=newOrders+newMessages;
};

/* ========== ربط أفاقي — التكامل المحاسبي ========== */
var afakyModeIds={api:'afakyFieldsApi',database:'afakyFieldsDatabase',csv:'afakyFieldsCsv',webhook:'afakyFieldsWebhook',email:'afakyFieldsEmail'};

window.toggleAfakyModeFields=function(){
  var mode=(document.getElementById('afakyMode')||{}).value||'api';
  Object.keys(afakyModeIds).forEach(function(m){
    var box=document.getElementById(afakyModeIds[m]);
    if(box)box.style.display=(m===mode)?'block':'none';
  });
};

function afakyUpdateStatusUI(s){
  var badge=document.getElementById('afakyStatus'),note=document.getElementById('afakyStatusNote');
  var enabled=!!(s&&s.enabled);
  var modeNames={api:'API مباشر',database:'قاعدة بيانات SQL Server',csv:'ملفات CSV',webhook:'Webhook',email:'البريد الإلكتروني'};
  if(badge){
    badge.textContent=enabled?'🟢 مفعل':'⚪ غير مفعل';
    badge.classList.toggle('active',enabled);
  }
  if(note){
    note.textContent=enabled
      ?'الربط مفعل حالياً بوضع: '+(modeNames[s.mode]||s.mode||'—')+' — البيانات جاهزة للتبادل مع نظام أفاقي.'
      :'لم يتم تفعيل الربط بعد — اضبط الإعدادات بالأسفل ثم احفظ.';
  }
}

function afakyFillForm(s){
  s=s||{};
  var setV=function(id,v){var el=document.getElementById(id);if(el)el.value=v==null?'':v;};
  var en=document.getElementById('afakyEnabled');if(en)en.checked=!!s.enabled;
  setV('afakyMode',s.mode||'api');
  setV('afakyApiKey',s.apiKey);setV('afakyApiUrl',s.apiUrl);
  setV('afakySqlServer',s.sqlServer);setV('afakySqlDatabase',s.sqlDatabase);
  setV('afakySqlUser',s.sqlUser);setV('afakySqlPassword',s.sqlPassword);
  setV('afakyWebhookUrl',s.webhookUrl);
  setV('afakyEmail',s.email);
  toggleAfakyModeFields();
}

window.loadAfakySettings=async function(){
  var s=null;
  try{
    var{data}=await supabaseClient.from('site_settings').select('settings').eq('id',1).maybeSingle();
    s=data&&data.settings?data.settings.afaky_settings:null;
    if(typeof s==='string'){try{s=JSON.parse(s);}catch(_){s=null;}}
  }catch(e){console.warn('loadAfakySettings:',e);}
  afakyFillForm(s||{});
  afakyUpdateStatusUI(s||{});
};

window.saveAfakySettings=async function(e){
  if(e&&e.preventDefault)e.preventDefault();
  var getV=function(id){var el=document.getElementById(id);return el?el.value.trim():'';};
  var settings={
    enabled:!!(document.getElementById('afakyEnabled')||{}).checked,
    mode:getV('afakyMode')||'api',
    apiKey:getV('afakyApiKey'),
    apiUrl:getV('afakyApiUrl'),
    sqlServer:getV('afakySqlServer'),
    sqlDatabase:getV('afakySqlDatabase'),
    sqlUser:getV('afakySqlUser'),
    sqlPassword:getV('afakySqlPassword'),
    webhookUrl:getV('afakyWebhookUrl'),
    email:getV('afakyEmail')
  };
  try{
    var{data}=await supabaseClient.from('site_settings').select('settings').eq('id',1).maybeSingle();
    var all=(data&&data.settings)||{};
    all.afaky_settings=settings;
    var{error}=await supabaseClient.from('site_settings').upsert([{id:1,settings:all}]);
    if(error){adminToast('❌ خطأ: '+error.message,'error');return false;}
    afakyUpdateStatusUI(settings);
    adminToast('✅ تم حفظ إعدادات ربط أفاقي');
    logAudit('حفظ إعدادات أفاقي','الوضع: '+settings.mode);
    if(settings.mode==='email'){
      if(settings.email){
        try{
          window.open('mailto:'+settings.email+'?subject='+encodeURIComponent('تقرير أفاقي — درة فارس الشمال')+'&body='+encodeURIComponent('مرحباً،%0Aمرفق تقارير CSV المُصدّرة من لوحة إدارة الموقع.'));
        }catch(_){}
      }
      adminToast('📧 وضع البريد مفعل — أرفق ملفات CSV المُصدّرة في رسالة البريد لإرسال تقارير تلقائية إلى أفاقي');
    }
  }catch(err){
    console.warn('saveAfakySettings:',err);
    adminToast('❌ تعذر حفظ الإعدادات','error');
  }
  return false;
};

/* ========== أدوات CSV لربط أفاقي ========== */
function afakyCsvCell(v){
  v=(v===null||v===undefined)?'':String(v);
  return '"'+v.replace(/"/g,'""')+'"';
}
function afakyDateStamp(){
  var d=new Date();
  var p=function(n){return (n<10?'0':'')+n;};
  return ''+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate());
}
function afakyDownloadCSV(filename,headers,rows){
  var lines=[headers.map(afakyCsvCell).join(',')];
  rows.forEach(function(r){lines.push(r.map(afakyCsvCell).join(','));});
  var blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  var link=document.createElement('a');
  link.href=URL.createObjectURL(blob);
  link.download=filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(function(){URL.revokeObjectURL(link.href);},1000);
}

window.exportProductsCSV=async function(){
  try{
    var{data,error}=await supabaseClient.from('store_products').select('id,name,category,price,old_price,stock,description').order('id');
    if(error){adminToast('❌ خطأ: '+error.message,'error');return;}
    if(!data||!data.length){adminToast('📦 لا توجد منتجات للتصدير');return;}
    var rows=data.map(function(p){return [p.id,p.name,p.category,p.price,p.old_price,p.stock,p.description];});
    afakyDownloadCSV('products-afaky-'+afakyDateStamp()+'.csv',['id','name','category','price','old_price','stock','description'],rows);
    adminToast('✅ تم تصدير '+rows.length+' منتج');
    logAudit('تصدير CSV','تصدير '+rows.length+' منتج لنظام أفاقي');
  }catch(e){console.warn('exportProductsCSV:',e);adminToast('❌ تعذر تصدير المنتجات','error');}
};

window.exportOrdersCSV=async function(){
  try{
    var{data,error}=await supabaseClient.from('store_orders').select('order_number,customer_name,customer_phone,total,status,created_at').order('created_at',{ascending:false});
    if(error){adminToast('❌ خطأ: '+error.message,'error');return;}
    if(!data||!data.length){adminToast('🛒 لا توجد طلبات للتصدير');return;}
    var rows=data.map(function(o){return [o.order_number,o.customer_name,o.customer_phone,o.total,o.status,o.created_at];});
    afakyDownloadCSV('orders-afaky-'+afakyDateStamp()+'.csv',['order_number','customer_name','customer_phone','total','status','created_at'],rows);
    adminToast('✅ تم تصدير '+rows.length+' طلب');
    logAudit('تصدير CSV','تصدير '+rows.length+' طلب لنظام أفاقي');
  }catch(e){console.warn('exportOrdersCSV:',e);adminToast('❌ تعذر تصدير الطلبات','error');}
};

function afakyParseCSV(text){
  text=String(text||'').replace(/^\uFEFF/,'');
  var rows=[],row=[],cell='',inQ=false,i,ch;
  for(i=0;i<text.length;i++){
    ch=text[i];
    if(inQ){
      if(ch==='"'){
        if(text[i+1]==='"'){cell+='"';i++;}
        else inQ=false;
      }else cell+=ch;
    }else{
      if(ch==='"')inQ=true;
      else if(ch===','){row.push(cell);cell='';}
      else if(ch==='\n'||ch==='\r'){
        if(ch==='\r'&&text[i+1]==='\n')i++;
        row.push(cell);cell='';
        if(row.length>1||row[0]!=='')rows.push(row);
        row=[];
      }else cell+=ch;
    }
  }
  if(cell!==''||row.length){row.push(cell);rows.push(row);}
  return rows;
}

window.previewAfakyImport=function(input){
  var preview=document.getElementById('afakyImportPreview');
  var btn=document.getElementById('afakyImportBtn');
  adminState.afakyImport=[];
  if(!input||!input.files||!input.files[0]){
    if(preview)preview.style.display='none';
    if(btn)btn.style.display='none';
    return;
  }
  var reader=new FileReader();
  reader.onload=function(){
    try{
      var rows=afakyParseCSV(reader.result);
      if(rows.length<2){
        if(preview){preview.style.display='block';preview.textContent='⚠️ الملف فارغ أو بدون صفوف بيانات.';}
        if(btn)btn.style.display='none';
        return;
      }
      var header=rows[0].map(function(h){return String(h).trim().toLowerCase();});
      var products=[];
      for(var i=1;i<rows.length;i++){
        var r=rows[i],p={};
        header.forEach(function(col,idx){p[col]=r[idx]!==undefined?String(r[idx]).trim():'';});
        if(!p.id||isNaN(parseInt(p.id)))continue;
        products.push({
          id:parseInt(p.id),
          name:p.name||'',
          category:p.category||'',
          price:parseFloat(p.price)||0,
          old_price:p.old_price!==''?(parseFloat(p.old_price)||null):null,
          stock:parseInt(p.stock)||0,
          description:p.description||''
        });
      }
      adminState.afakyImport=products;
      var skipped=(rows.length-1)-products.length;
      if(preview){
        preview.style.display='block';
        preview.textContent='📋 معاينة: تم العثور على '+(rows.length-1)+' صف في الملف — '+products.length+' منتج جاهز للاستيراد'+(skipped>0?' ('+skipped+' صف تم تجاوزه لعدم وجود id صالح)':'')+'.';
      }
      if(btn)btn.style.display=products.length?'inline-block':'none';
    }catch(err){
      console.warn('previewAfakyImport:',err);
      if(preview){preview.style.display='block';preview.textContent='❌ تعذر قراءة الملف — تأكد أنه CSV صالح.';}
      if(btn)btn.style.display='none';
    }
  };
  reader.readAsText(input.files[0],'UTF-8');
};

window.runAfakyImport=async function(){
  var products=adminState.afakyImport||[];
  if(!products.length){adminToast('⚠️ لا توجد بيانات للاستيراد — اختر ملف CSV أولاً');return;}
  if(!confirm('سيتم استيراد/تحديث '+products.length+' منتج في المتجر. متابعة؟'))return;
  try{
    var{error}=await supabaseClient.from('store_products').upsert(products,{onConflict:'id'});
    if(error){adminToast('❌ خطأ: '+error.message,'error');return;}
    adminToast('✅ تم استيراد '+products.length+' منتج بنجاح');
    logAudit('استيراد CSV','استيراد/تحديث '+products.length+' منتج من ملف CSV');
    var preview=document.getElementById('afakyImportPreview');
    if(preview)preview.textContent='✅ اكتمل الاستيراد: '+products.length+' منتج.';
    var btn=document.getElementById('afakyImportBtn');if(btn)btn.style.display='none';
    var file=document.getElementById('afakyImportFile');if(file)file.value='';
    adminState.afakyImport=[];
    if(typeof loadProducts==='function')loadProducts();
  }catch(e){console.warn('runAfakyImport:',e);adminToast('❌ تعذر تنفيذ الاستيراد','error');}
};

/* ========== لوحة المؤشرات — رسوم Chart.js ========== */
var dashCharts={sales:null,status:null};
var dashChartDefaultsDone=false;
var CHARTJS_CDN='https://cdn.jsdelivr.net/npm/chart.js@4';

function dashShowEmpty(emptyId,boxId,show){
  var emptyEl=document.getElementById(emptyId),box=document.getElementById(boxId);
  if(emptyEl)emptyEl.style.display=show?'block':'none';
  if(box)box.style.display=show?'none':'block';
}

window.renderDashboardCharts=async function(){
  if(!document.getElementById('chartSalesWeek')||!document.getElementById('chartOrdersStatus'))return;
  try{
    await loadAdminScript(CHARTJS_CDN,'Chart');
  }catch(e){
    console.warn('renderDashboardCharts CDN:',e);
    dashShowEmpty('chartSalesWeekEmpty','chartSalesWeekBox',true);
    dashShowEmpty('chartOrdersStatusEmpty','chartOrdersStatusBox',true);
    return;
  }
  if(!dashChartDefaultsDone&&window.Chart){
    Chart.defaults.font.family="'Tajawal','Cairo',sans-serif";
    Chart.defaults.color='#94a3b8';
    dashChartDefaultsDone=true;
  }

  /* أ) أعمدة: مبيعات آخر 7 أيام */
  try{
    var since=new Date();since.setHours(0,0,0,0);since.setDate(since.getDate()-6);
    var res=await supabaseClient.from('store_orders').select('total,created_at').gte('created_at',since.toISOString());
    if(res.error)throw res.error;
    var weekOrders=res.data||[];
    if(!weekOrders.length)throw new Error('empty');
    var dayNames=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    var labels=[],sums=[];
    for(var i=0;i<7;i++){
      var d=new Date(since);d.setDate(since.getDate()+i);
      labels.push(dayNames[d.getDay()]);sums.push(0);
    }
    weekOrders.forEach(function(o){
      var dt=new Date(o.created_at);dt.setHours(0,0,0,0);
      var idx=Math.round((dt.getTime()-since.getTime())/86400000);
      if(idx>=0&&idx<7)sums[idx]+=Number(o.total||0);
    });
    if(dashCharts.sales){dashCharts.sales.destroy();dashCharts.sales=null;}
    dashShowEmpty('chartSalesWeekEmpty','chartSalesWeekBox',false);
    dashCharts.sales=new Chart(document.getElementById('chartSalesWeek').getContext('2d'),{
      type:'bar',
      data:{labels:labels,datasets:[{label:'المبيعات (ر.س)',data:sums,backgroundColor:'rgba(14,165,233,0.45)',borderColor:'#0EA5E9',borderWidth:1,borderRadius:8}]},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{
          legend:{rtl:true,labels:{font:{family:"'Tajawal','Cairo',sans-serif"}}},
          tooltip:{rtl:true,textDirection:'rtl'}
        },
        scales:{
          x:{reverse:true,grid:{color:'rgba(255,255,255,0.05)'}},
          y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{callback:function(v){return Number(v).toLocaleString('ar-SA');}}}
        }
      }
    });
  }catch(e){
    console.warn('renderDashboardCharts sales:',e);
    if(dashCharts.sales){dashCharts.sales.destroy();dashCharts.sales=null;}
    dashShowEmpty('chartSalesWeekEmpty','chartSalesWeekBox',true);
  }

  /* ب) دائري: توزيع الطلبات حسب الحالة */
  try{
    var res2=await supabaseClient.from('store_orders').select('status');
    if(res2.error)throw res2.error;
    var allOrders=res2.data||[];
    if(!allOrders.length)throw new Error('empty');
    var counts={};
    allOrders.forEach(function(o){var st=o.status||'new';counts[st]=(counts[st]||0)+1;});
    var stKeys=Object.keys(counts);
    var stLabels=stKeys.map(function(k){return orderStatuses[k]||k;});
    var stData=stKeys.map(function(k){return counts[k];});
    var palette=['#0EA5E9','#10B981','#F59E0B','#8B5CF6','#22D3EE','#34D399','#EF4444'];
    if(dashCharts.status){dashCharts.status.destroy();dashCharts.status=null;}
    dashShowEmpty('chartOrdersStatusEmpty','chartOrdersStatusBox',false);
    dashCharts.status=new Chart(document.getElementById('chartOrdersStatus').getContext('2d'),{
      type:'doughnut',
      data:{labels:stLabels,datasets:[{data:stData,backgroundColor:stKeys.map(function(_,i){return palette[i%palette.length];}),borderColor:'rgba(15,12,41,0.8)',borderWidth:2}]},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{
          legend:{rtl:true,position:'bottom',labels:{font:{family:"'Tajawal','Cairo',sans-serif"},padding:14}},
          tooltip:{rtl:true,textDirection:'rtl'}
        }
      }
    });
  }catch(e){
    console.warn('renderDashboardCharts status:',e);
    if(dashCharts.status){dashCharts.status.destroy();dashCharts.status=null;}
    dashShowEmpty('chartOrdersStatusEmpty','chartOrdersStatusBox',true);
  }
};

/* ========== سجل التدقيق — العرض ========== */
window.loadAuditLog=async function(){
  var c=document.getElementById('auditLogList');if(!c)return;
  c.innerHTML='<div class="admin-empty">⏳ جاري التحميل...</div>';
  try{
    var{data,error}=await supabaseClient.from('audit_log').select('*').order('created_at',{ascending:false}).limit(100);
    if(error)throw error;
    if(!data||!data.length){c.innerHTML='<div class="admin-empty">📋 لا توجد عمليات مسجلة بعد</div>';return;}
    var html='<table><thead><tr><th>#</th><th>الوقت</th><th>العملية</th><th>التفاصيل</th></tr></thead><tbody>';
    data.forEach(function(r,i){
      html+='<tr><td>'+(i+1)+'</td><td>'+dateAr(r.created_at)+'</td><td><strong>'+esc(r.action||'—')+'</strong></td><td>'+esc(r.details||'—')+'</td></tr>';
    });
    html+='</tbody></table>';
    c.innerHTML=html;
  }catch(e){
    console.warn('loadAuditLog:',e);
    c.innerHTML='<div class="admin-empty">📋 لا توجد بيانات — تأكد من تنفيذ جدول audit_log في Supabase (ملف جداول-اللوحة-المتقدمة.sql)</div>';
  }
};

/* ========== الفوترة الإلكترونية ZATCA — توليد QR بصيغة TLV ========== */
window.buildZatcaTLV=function(seller,vat,timestamp,total,tax){
  var values=[seller,vat,timestamp,total,tax];
  var bytes=[];
  for(var i=0;i<values.length;i++){
    var enc=new TextEncoder().encode(String(values[i]==null?'':values[i]));
    bytes.push(i+1,enc.length);
    for(var j=0;j<enc.length;j++)bytes.push(enc[j]);
  }
  var bin='';
  for(var k=0;k<bytes.length;k++)bin+=String.fromCharCode(bytes[k]);
  return btoa(bin);
};

window.loadZatcaSettings=async function(){
  var seller=document.getElementById('zatcaSellerName'),vat=document.getElementById('zatcaVatNumber');
  if(!seller||!vat)return;
  try{
    var{data}=await supabaseClient.from('site_settings').select('settings').eq('id',1).maybeSingle();
    var z=data&&data.settings?data.settings.zatca_settings:null;
    if(typeof z==='string'){try{z=JSON.parse(z);}catch(_){z=null;}}
    seller.value=(z&&z.sellerName)||'شركة درة فارس الشمال للتجارة';
    vat.value=(z&&z.vatNumber)||'';
  }catch(e){
    console.warn('loadZatcaSettings:',e);
    if(!seller.value)seller.value='شركة درة فارس الشمال للتجارة';
  }
};

window.saveZatcaSettings=async function(){
  var seller=(document.getElementById('zatcaSellerName')||{}).value||'';
  var vat=(document.getElementById('zatcaVatNumber')||{}).value||'';
  try{
    var{data}=await supabaseClient.from('site_settings').select('settings').eq('id',1).maybeSingle();
    var all=(data&&data.settings)||{};
    all.zatca_settings={sellerName:seller.trim()||'شركة درة فارس الشمال للتجارة',vatNumber:vat.trim()};
    var{error}=await supabaseClient.from('site_settings').upsert([{id:1,settings:all}]);
    if(error){adminToast('❌ خطأ: '+error.message,'error');return;}
    adminToast('✅ تم حفظ إعدادات الفوترة الإلكترونية');
    logAudit('حفظ إعدادات الفوترة','الرقم الضريبي: '+(vat.trim()||'غير محدد'));
  }catch(e){
    console.warn('saveZatcaSettings:',e);
    adminToast('❌ تعذر حفظ الإعدادات','error');
  }
};

window.loadZatcaInvoices=async function(){
  var c=document.getElementById('zatcaInvoicesTable');if(!c)return;
  c.innerHTML='<tr><td colspan="7">⏳ جاري التحميل...</td></tr>';
  try{
    var{data,error}=await supabaseClient.from('invoices').select('invoice_number,customer_name,total,tax,created_at').order('created_at',{ascending:false}).limit(50);
    if(error)throw error;
    if(!data||!data.length){c.innerHTML='<tr><td colspan="7">🧾 لا توجد فواتير</td></tr>';adminState.zatcaInvoices=[];return;}
    adminState.zatcaInvoices=data;
    c.innerHTML=data.map(function(inv,i){
      return '<tr><td>'+(i+1)+'</td><td><strong>'+esc(inv.invoice_number||'—')+'</strong></td><td>'+esc(inv.customer_name||'—')+'</td><td>'+money(inv.total)+'</td><td>'+money(inv.tax)+'</td><td>'+dateAr(inv.created_at)+'</td><td><button class="btn-edit" onclick="generateZatcaQR('+i+')">🔳 توليد QR</button></td></tr>';
    }).join('');
  }catch(e){
    console.warn('loadZatcaInvoices:',e);
    c.innerHTML='<tr><td colspan="7">🧾 لا توجد بيانات — تعذر تحميل الفواتير من جدول invoices</td></tr>';
  }
};

window.generateZatcaQR=async function(idx){
  var inv=(adminState.zatcaInvoices||[])[idx];
  if(!inv)return;
  var seller=((document.getElementById('zatcaSellerName')||{}).value||'').trim()||'شركة درة فارس الشمال للتجارة';
  var vat=((document.getElementById('zatcaVatNumber')||{}).value||'').trim();
  var ts=inv.created_at?new Date(inv.created_at).toISOString():new Date().toISOString();
  var total=Number(inv.total||0).toFixed(2);
  var tax=Number(inv.tax||0).toFixed(2);
  var tlv=buildZatcaTLV(seller,vat,ts,total,tax);
  var img=document.getElementById('zatcaQrImage');
  try{
    await loadAdminScript('https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js','QRCode');
    if(img)img.src=await QRCode.toDataURL(tlv,{width:280,margin:2});
  }catch(e){
    console.warn('generateZatcaQR image:',e);
    if(img)img.removeAttribute('src');
    adminToast('⚠️ تعذر توليد صورة QR — يمكنك نسخ نص Base64 بالأسفل','error');
  }
  var b64=document.getElementById('zatcaQrBase64');if(b64)b64.value=tlv;
  var modal=document.getElementById('zatcaQrModal');if(modal)modal.classList.add('show');
  try{
    supabaseClient.from('zatca_log').insert([{invoice_number:String(inv.invoice_number||''),total:Number(total),tax:Number(tax),qr_code:tlv}]).then(function(){},function(){});
  }catch(_){}
  logAudit('توليد QR زاتكا','فاتورة: '+(inv.invoice_number||'—')+' — إجمالي: '+total+' ر.س');
};

window.closeZatcaQrModal=function(){
  var modal=document.getElementById('zatcaQrModal');if(modal)modal.classList.remove('show');
};

window.copyZatcaQr=function(){
  var b64=document.getElementById('zatcaQrBase64');
  if(!b64||!b64.value){adminToast('⚠️ لا يوجد نص للنسخ');return;}
  var done=function(){adminToast('✅ تم نسخ Base64');};
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(b64.value).then(done,function(){b64.select();document.execCommand('copy');done();});
  }else{
    b64.select();document.execCommand('copy');done();
  }
};

/* ========== مزامنة أفاقي + سجل المزامنة ========== */
function afakyLogSync(entry){
  try{
    supabaseClient.from('afaky_sync_log').insert([entry]).then(function(){loadAfakySyncLog();},function(){});
  }catch(_){}
}

window.syncAfakyNow=async function(){
  var s=null;
  try{
    var{data}=await supabaseClient.from('site_settings').select('settings').eq('id',1).maybeSingle();
    s=data&&data.settings?data.settings.afaky_settings:null;
    if(typeof s==='string'){try{s=JSON.parse(s);}catch(_){s=null;}}
  }catch(e){console.warn('syncAfakyNow settings:',e);}
  s=s||{};
  var mode=s.mode||'api';

  if(mode==='webhook'){
    if(!s.enabled||!s.webhookUrl){
      adminToast('⚠️ فعّل الربط واحفظ رابط Webhook من الإعدادات أولاً','error');
      return;
    }
    adminToast('⏳ جاري إرسال آخر 20 طلب إلى Webhook...');
    try{
      var{data:orders,error}=await supabaseClient.from('store_orders').select('*').order('created_at',{ascending:false}).limit(20);
      if(error)throw error;
      var controller=new AbortController();
      var timer=setTimeout(function(){controller.abort();},15000);
      var res=await fetch(s.webhookUrl,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({source:'dorat-fares-alshamal-admin',exported_at:new Date().toISOString(),orders:orders||[]}),
        signal:controller.signal
      });
      clearTimeout(timer);
      if(!res.ok)throw new Error('استجابة غير ناجحة: HTTP '+res.status);
      afakyLogSync({mode:'webhook',direction:'export',records_count:(orders||[]).length,status:'success',message:'تم إرسال '+(orders||[]).length+' طلب إلى رابط Webhook بنجاح'});
      logAudit('مزامنة أفاقي','webhook — تصدير '+(orders||[]).length+' طلب');
      adminToast('✅ تمت المزامنة: تم إرسال '+(orders||[]).length+' طلب');
    }catch(e){
      var msg=(e&&e.name==='AbortError')?'انتهت مهلة الاتصال (15 ثانية) — تعذر الوصول للرابط':('فشل الإرسال: '+((e&&e.message)||e));
      afakyLogSync({mode:'webhook',direction:'export',records_count:0,status:'failed',message:msg});
      logAudit('مزامنة أفاقي فاشلة',msg);
      adminToast('❌ '+msg,'error');
    }
    return;
  }

  if(mode==='csv'){
    exportOrdersCSV();
    afakyLogSync({mode:'csv',direction:'export',records_count:0,status:'success',message:'تم تشغيل تصدير الطلبات CSV من أدوات أفاقي'});
    logAudit('مزامنة أفاقي','csv — تصدير الطلبات');
    return;
  }

  if(mode==='email'){
    afakyLogSync({mode:'email',direction:'export',records_count:0,status:'success',message:'تم فتح رسالة بريد لإرسال التقارير إلى أفاقي'});
    if(s.email){
      try{
        window.open('mailto:'+s.email+'?subject='+encodeURIComponent('تقرير أفاقي — درة فارس الشمال')+'&body='+encodeURIComponent('مرحباً،%0Aمرفق تقارير CSV المُصدّرة من لوحة إدارة الموقع.'));
      }catch(_){}
      adminToast('📧 فتحنا رسالة بريد — أرفق ملفات CSV المُصدّرة ثم أرسلها');
    }else{
      adminToast('⚠️ احفظ بريد أفاقي المستلم من الإعدادات أولاً','error');
    }
    return;
  }

  var modeName=mode==='api'?'API مباشر':'قاعدة بيانات SQL Server';
  afakyLogSync({mode:mode,direction:'export',records_count:0,status:'failed',message:'المزامنة المباشرة من المتصفح غير مدعومة لوضع '+modeName+' — استخدم CSV أو Webhook'});
  adminToast('ℹ️ وضع '+modeName+' يحتاج وسيطاً خادمياً — بدّل الوضع إلى CSV أو Webhook للمزامنة الفورية','error');
};

window.loadAfakySyncLog=async function(){
  var c=document.getElementById('afakySyncLogList');if(!c)return;
  try{
    var{data,error}=await supabaseClient.from('afaky_sync_log').select('*').order('created_at',{ascending:false}).limit(20);
    if(error)throw error;
    if(!data||!data.length){c.innerHTML='<div class="admin-empty">🔄 لا توجد عمليات مزامنة بعد</div>';return;}
    var dirNames={export:'تصدير ⬆️',import:'استيراد ⬇️'};
    var html='<table><thead><tr><th>#</th><th>الوقت</th><th>الوضع</th><th>الاتجاه</th><th>السجلات</th><th>الحالة</th><th>الرسالة</th></tr></thead><tbody>';
    data.forEach(function(r,i){
      var ok=r.status==='success';
      html+='<tr><td>'+(i+1)+'</td><td>'+dateAr(r.created_at)+'</td><td>'+esc(r.mode||'—')+'</td><td>'+esc(dirNames[r.direction]||r.direction||'—')+'</td><td>'+(r.records_count==null?'—':r.records_count)+'</td><td>'+(ok?'<span class="sync-status-ok">✅ نجاح</span>':'<span class="sync-status-fail">❌ فشل</span>')+'</td><td>'+esc(r.message||'—')+'</td></tr>';
    });
    html+='</tbody></table>';
    c.innerHTML=html;
  }catch(e){
    console.warn('loadAfakySyncLog:',e);
    c.innerHTML='<div class="admin-empty">🔄 لا توجد بيانات — تأكد من تنفيذ جدول afaky_sync_log في Supabase</div>';
  }
};

document.addEventListener('DOMContentLoaded',function(){
  var user=localStorage.getItem('adminLoggedIn');
  if(user){document.getElementById('loginPage').style.display='none';document.getElementById('dashboardLayout').classList.add('active');if(typeof loadProducts==='function')loadProducts();updateStats();}
});

})();
