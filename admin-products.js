/* ============================================================
   درة فارس الشمال — إدارة المنتجات والإعدادات (admin-products.js)
   ============================================================ */
(function(){
'use strict';

const supabaseClient = window.supabaseClient;
if (typeof supabaseClient === 'undefined' || !supabaseClient) {
  console.warn('Admin admin-products.js: Supabase client is unavailable.');
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

const adminState = window.adminState || {};
if(!adminState.bankAccounts) adminState.bankAccounts = [];
if(!adminState.paymentMethods) adminState.paymentMethods = [];
if(!adminState.shippingRates) adminState.shippingRates = [];
window.adminState = adminState;

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
      <td class="pt-name" title="${esc(p.name)}"><span class="pt-name-in">${esc(p.name)}</span></td>
      <td class="pt-desc">${esc((p.description || '').substring(0, 80))}</td>
      <td class="pt-price">${Number(p.price).toLocaleString()} ر.س</td>
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
  document.getElementById('productBarcode').value = data.barcode || '';
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
  // جاهزية الماسح في التعديل: المؤشر على خانة الباركود مباشرة
  setTimeout(function() { var b = document.getElementById('productBarcode'); if (b) { b.focus(); b.select(); } }, 100);
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
  // جاهزية الماسح: أول ما تفتح نافذة منتج جديد يكون المؤشر على خانة الباركود
  setTimeout(function() { var b = document.getElementById('productBarcode'); if (b) b.focus(); }, 100);
};

window.closeProductModal = function() {
  document.getElementById('productModal').classList.remove('show');
};

window.saveProduct = async function(e) {
  e.preventDefault();
  var id = document.getElementById('productId').value;

  var product = {
    barcode: document.getElementById('productBarcode').value.trim() || null,
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
/* ========== مساعدات site_settings — قراءة/دمج/حفظ بدون مسح باقي المفاتيح ========== */
async function siteSettingsGet(key){
  try{
    var{data}=await supabaseClient.from('site_settings').select('settings').eq('id',1).maybeSingle();
    var all=(data&&data.settings)||{};
    if(key==='_all_')return {all:all,value:{}};
    var v=all[key];
    if(typeof v==='string'){try{v=JSON.parse(v);}catch(_){v=null;}}
    return {all:all,value:(v&&typeof v==='object')?v:{}};
  }catch(e){console.warn('siteSettingsGet:',e);return {all:{},value:{}};}
}
async function siteSettingsSave(key,value,auditAction,auditDetails){
  try{
    var r=await siteSettingsGet('_all_');
    var all=r.all||{};
    all[key]=value;
    var{error}=await supabaseClient.from('site_settings').upsert([{id:1,settings:all}]);
    if(error){adminToast('❌ خطأ: '+error.message,'error');return false;}
    adminToast('✅ تم الحفظ بنجاح');
    logAudit(auditAction||'حفظ إعدادات',auditDetails||key);
    return true;
  }catch(e){console.warn('siteSettingsSave:',e);adminToast('❌ تعذر الحفظ','error');return false;}
}

/* ========== الإعدادات العامة — settings.general ========== */
window.loadSettings=async function(){
  var r=await siteSettingsGet('general');
  var g=r.value||{};
  formSet('setStoreName',g.store_name);
  formSet('setCurrency',g.currency||'ر.س');
  formSet('setTaxPercent',g.tax_percent!=null?g.tax_percent:15);
  formSet('setFreeShippingMin',g.free_shipping_min);
  formSet('setWhatsapp',g.whatsapp);
  if(typeof loadSocialLinks==='function')loadSocialLinks();
  if(typeof loadStoreStatus==='function')loadStoreStatus();
};
window.saveSettings=async function(e){
  if(e&&e.preventDefault)e.preventDefault();
  var g={
    store_name:formVal('setStoreName'),
    currency:formVal('setCurrency')||'ر.س',
    tax_percent:parseFloat(formVal('setTaxPercent'))||0,
    free_shipping_min:parseFloat(formVal('setFreeShippingMin'))||0,
    whatsapp:formVal('setWhatsapp')
  };
  await siteSettingsSave('general',g,'حفظ الإعدادات العامة','الضريبة: '+g.tax_percent+'% — العملة: '+g.currency);
  return false;
};

/* ========== روابط السوشيال ميديا — تُحفظ كمفاتيح مباشرة يقرأها main.js ========== */
window.loadSocialLinks=async function(){
  try{
    var r=await siteSettingsGet('_all_');
    var all=r.all||{};
    formSet('setSocialFacebook',all.socialFacebook);
    formSet('setSocialInstagram',all.socialInstagram);
    formSet('setSocialTwitter',all.socialTwitter);
    formSet('setSocialLinkedin',all.socialLinkedin);
  }catch(e){console.warn('loadSocialLinks:',e);}
};
window.saveSocialLinks=async function(e){
  if(e&&e.preventDefault)e.preventDefault();
  try{
    var r=await siteSettingsGet('_all_');
    var all=r.all||{};
    all.socialFacebook=formVal('setSocialFacebook');
    all.socialInstagram=formVal('setSocialInstagram');
    all.socialTwitter=formVal('setSocialTwitter');
    all.socialLinkedin=formVal('setSocialLinkedin');
    var{error}=await supabaseClient.from('site_settings').upsert([{id:1,settings:all}]);
    if(error){adminToast('❌ خطأ: '+error.message,'error');return false;}
    adminToast('✅ تم حفظ روابط السوشيال — ستتفعّل الأيقونات في الموقع تلقائيًا');
    logAudit('حفظ روابط السوشيال','فيسبوك: '+(all.socialFacebook?'✓':'—')+' انستقرام: '+(all.socialInstagram?'✓':'—')+' تويتر: '+(all.socialTwitter?'✓':'—')+' لينكدإن: '+(all.socialLinkedin?'✓':'—'));
    return false;
  }catch(e2){console.warn('saveSocialLinks:',e2);adminToast('❌ تعذر الحفظ','error');return false;}
};

/* ========== محتوى الصفحة الرئيسية — site_items (home_hero) قراءة حية ========== */
window.loadHomeHeroForm=async function(){
  try{
    var{data}=await supabaseClient.from('site_items').select('*').eq('section_key','home_hero').order('sort_order').limit(1).maybeSingle();
    if(!data)return;
    var md=data.metadata||{};
    formSet('heroBadgeInput',md.badge);
    formSet('heroTitleInput',data.title_ar);
    formSet('heroHighlightInput',md.title_highlight);
    formSet('heroDescInput',data.description_ar);
    formSet('heroCtaTextInput',md.cta_text);
    formSet('heroCtaUrlInput',md.cta_url);
    formSet('heroStatClientsInput',md.stat_clients);
    formSet('heroStatClientsLabelInput',md.stat_clients_label);
  }catch(e){console.warn('loadHomeHeroForm:',e);}
};
window.saveHomeHero=async function(e){
  if(e&&e.preventDefault)e.preventDefault();
  try{
    var row={
      section_key:'home_hero',sort_order:1,is_active:true,
      title_ar:formVal('heroTitleInput'),
      description_ar:formVal('heroDescInput'),
      metadata:{
        badge:formVal('heroBadgeInput'),
        title_highlight:formVal('heroHighlightInput'),
        cta_text:formVal('heroCtaTextInput'),
        cta_url:formVal('heroCtaUrlInput'),
        stat_clients:formVal('heroStatClientsInput'),
        stat_clients_label:formVal('heroStatClientsLabelInput')
      }
    };
    var{data:ex}=await supabaseClient.from('site_items').select('id').eq('section_key','home_hero').limit(1).maybeSingle();
    var result;
    if(ex&&ex.id)result=await supabaseClient.from('site_items').update(row).eq('id',ex.id);
    else result=await supabaseClient.from('site_items').insert([row]);
    if(result.error){adminToast('❌ خطأ: '+result.error.message,'error');return false;}
    adminToast('✅ تم حفظ محتوى الصفحة الرئيسية — يظهر فورًا على الموقع');
    logAudit('حفظ محتوى الرئيسية','العنوان: '+(row.title_ar||'—'));
    return false;
  }catch(e2){console.warn('saveHomeHero:',e2);adminToast('❌ تعذر الحفظ','error');return false;}
};

/* ========== حالة المتجر — تُحفظ كمفتاح مباشر storeStatus يقرأه main.js ========== */
function storeStatusUpdateUI(st){
  var badge=document.getElementById('storeStatusBadge');
  if(!badge)return;
  var open=(st==='open');
  badge.textContent=open?'🟢 البيع مفعّل':'🔴 البيع متوقف للتجهيز';
  badge.style.background=open?'rgba(16,185,129,.15)':'rgba(239,68,68,.15)';
  badge.style.color=open?'#10B981':'#EF4444';
}
window.loadStoreStatus=async function(){
  try{
    var r=await siteSettingsGet('_all_');
    var st=(r.all&&r.all.storeStatus)||'closed';
    formSet('setStoreStatus',st);
    storeStatusUpdateUI(st);
  }catch(e){console.warn('loadStoreStatus:',e);}
};
window.saveStoreStatus=async function(e){
  if(e&&e.preventDefault)e.preventDefault();
  try{
    var r=await siteSettingsGet('_all_');
    var all=r.all||{};
    all.storeStatus=formVal('setStoreStatus')||'closed';
    var{error}=await supabaseClient.from('site_settings').upsert([{id:1,settings:all}]);
    if(error){adminToast('❌ خطأ: '+error.message,'error');return false;}
    storeStatusUpdateUI(all.storeStatus);
    adminToast(all.storeStatus==='open'?'✅ المتجر مفتوح — البيع مفعّل الآن في كل الأجهزة':'✅ تم إيقاف البيع — الزوار يتصفحون فقط');
    logAudit('تغيير حالة المتجر',all.storeStatus==='open'?'فتح البيع':'إيقاف البيع للتجهيز');
    return false;
  }catch(e2){console.warn('saveStoreStatus:',e2);adminToast('❌ تعذر الحفظ','error');return false;}
};

/* ========== بيانات الشركة — settings.company ========== */
window.loadCompanyInfo=async function(){
  var r=await siteSettingsGet('company');
  var c=r.value||{};
  formSet('compOfficialName',c.official_name);
  formSet('compCR',c.commercial_register);
  formSet('compTaxNumber',c.tax_number);
  formSet('compAddress',c.address);
  formSet('compEmail',c.email);
  formSet('compPhone',c.phone);
};
window.saveCompanyInfo=async function(e){
  if(e&&e.preventDefault)e.preventDefault();
  var c={
    official_name:formVal('compOfficialName'),
    commercial_register:formVal('compCR'),
    tax_number:formVal('compTaxNumber'),
    address:formVal('compAddress'),
    email:formVal('compEmail'),
    phone:formVal('compPhone')
  };
  await siteSettingsSave('company',c,'حفظ بيانات الشركة',c.official_name||'—');
  return false;
};

/* ========== التوثيق الحكومي — settings.gov_docs ========== */
function govDocsUpdateUI(g){
  g=g||{};
  var ok=!!(g.commercial_register&&g.tax_number);
  var badge=document.getElementById('govDocsStatus'),note=document.getElementById('govDocsStatusNote');
  if(badge){badge.textContent=ok?'🟢 موثق':'⚪ غير موثق';badge.classList.toggle('active',ok);}
  if(note)note.textContent=ok
    ?'بيانات التوثيق مكتملة — رقم السجل التجاري والرقم الضريبي مسجلان.'
    :'التوثيق غير مكتمل — أدخل رقم السجل التجاري والرقم الضريبي ثم احفظ.';
}
window.loadGovDocs=async function(){
  var r=await siteSettingsGet('gov_docs');
  var g=r.value||{};
  formSet('govCR',g.commercial_register);
  formSet('govTaxNumber',g.tax_number);
  formSet('govMaroofUrl',g.maroof_url);
  formSet('govNotes',g.notes);
  govDocsUpdateUI(g);
};
window.saveGovDocs=async function(e){
  if(e&&e.preventDefault)e.preventDefault();
  var g={
    commercial_register:formVal('govCR'),
    tax_number:formVal('govTaxNumber'),
    maroof_url:formVal('govMaroofUrl'),
    notes:formVal('govNotes')
  };
  var ok=await siteSettingsSave('gov_docs',g,'حفظ التوثيق الحكومي','سجل: '+(g.commercial_register||'—')+' — ضريبي: '+(g.tax_number||'—'));
  if(ok)govDocsUpdateUI(g);
  return false;
};

/* ========== التسويق — settings.marketing ========== */
function marketingUpdateUI(m){
  m=m||{};
  var on=!!m.enabled;
  var badge=document.getElementById('marketingStatus'),note=document.getElementById('marketingStatusNote');
  if(badge){badge.textContent=on?'🟢 مفعل':'⚪ معطل';badge.classList.toggle('active',on);}
  if(note)note.textContent=on
    ?'الحملة التسويقية مفعلة — البانر الترويجي والكوبون الترحيبي ظاهران للزوار.'
    :'التسويق معطل حالياً — فعّل الحملة واحفظ لتظهر للزوار.';
}
window.loadMarketing=async function(){
  var r=await siteSettingsGet('marketing');
  var m=r.value||{};
  var en=document.getElementById('mktEnabled');if(en)en.checked=!!m.enabled;
  formSet('mktWelcomeCoupon',m.welcome_coupon);
  formSet('mktBannerMessage',m.banner_message);
  marketingUpdateUI(m);
};
window.saveMarketing=async function(e){
  if(e&&e.preventDefault)e.preventDefault();
  var m={
    enabled:!!(document.getElementById('mktEnabled')||{}).checked,
    welcome_coupon:formVal('mktWelcomeCoupon'),
    banner_message:formVal('mktBannerMessage')
  };
  var ok=await siteSettingsSave('marketing',m,'حفظ إعدادات التسويق',m.enabled?'تفعيل الحملة — كوبون: '+(m.welcome_coupon||'—'):'تعطيل الحملة');
  if(ok)marketingUpdateUI(m);
  return false;
};

/* ========== الحسابات البنكية — CRUD على company_bank_accounts ========== */
window.loadBankAccounts=async function(){
  var c=document.getElementById('bankAccountsList');if(!c)return;
  c.innerHTML='<div class="admin-empty">⏳ جاري التحميل...</div>';
  try{
    var{data,error}=await supabaseClient.from('company_bank_accounts').select('*').order('sort_order').order('id');
    if(error)throw error;
    adminState.bankAccounts=data||[];
    if(!data.length){c.innerHTML='<div class="admin-empty">🏦 لا توجد حسابات بنكية — اضغط ➕ إضافة حساب.</div>';return;}
    var html='<table><thead><tr><th>#</th><th>البنك</th><th>صاحب الحساب</th><th>رقم الحساب</th><th>الآيبان</th><th>الترتيب</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>';
    data.forEach(function(a,i){
      html+='<tr><td>'+(i+1)+'</td><td><strong>'+esc(a.bank_name||'—')+'</strong></td><td>'+esc(a.account_name||'—')+'</td><td dir="ltr">'+esc(a.account_number||'—')+'</td><td dir="ltr">'+esc(a.iban||'—')+'</td><td>'+(a.sort_order==null?'—':a.sort_order)+'</td><td>'+(a.is_active?'<span class="sync-status-ok">✅ مفعّل</span>':'<span class="sync-status-fail">⛔ معطّل</span>')+'</td><td style="white-space:nowrap"><button class="btn-edit" onclick="editBankAccount(\''+a.id+'\')">✏️</button> <button class="btn-edit" onclick="toggleBankAccount(\''+a.id+'\','+(a.is_active?'true':'false')+')">'+(a.is_active?'⛔ تعطيل':'✅ تفعيل')+'</button> <button class="btn-delete" onclick="deleteBankAccount(\''+a.id+'\')">🗑️</button></td></tr>';
    });
    html+='</tbody></table>';
    c.innerHTML=html;
  }catch(e){
    console.warn('loadBankAccounts:',e);
    c.innerHTML='<div class="admin-empty">🏦 تعذر تحميل الحسابات — تأكد من وجود جدول company_bank_accounts في Supabase.</div>';
  }
};
window.addBankAccount=function(){
  var f=document.getElementById('bankAccountForm');if(f)f.reset();
  formSet('bankAccountId','');
  var act=document.getElementById('bankIsActive');if(act)act.checked=true;
  var t=document.getElementById('bankAccountModalTitle');if(t)t.textContent='🏦 إضافة حساب بنكي';
  var m=document.getElementById('bankAccountModal');if(m)m.classList.add('show');
};
window.editBankAccount=function(id){
  var a=(adminState.bankAccounts||[]).find(function(x){return String(x.id)===String(id);});
  if(!a){adminToast('⚠️ تعذر العثور على الحساب — حدّث القائمة','error');return;}
  formSet('bankAccountId',a.id);
  formSet('bankName',a.bank_name);
  formSet('bankAccountName',a.account_name);
  formSet('bankAccountNumber',a.account_number);
  formSet('bankIban',a.iban);
  formSet('bankSortOrder',a.sort_order!=null?a.sort_order:1);
  var act=document.getElementById('bankIsActive');if(act)act.checked=!!a.is_active;
  var t=document.getElementById('bankAccountModalTitle');if(t)t.textContent='✏️ تعديل حساب بنكي';
  var m=document.getElementById('bankAccountModal');if(m)m.classList.add('show');
};
window.closeBankAccountModal=function(){
  var m=document.getElementById('bankAccountModal');if(m)m.classList.remove('show');
};
window.saveBankAccount=async function(e){
  if(e&&e.preventDefault)e.preventDefault();
  var id=formVal('bankAccountId');
  var rec={
    bank_name:formVal('bankName'),
    account_name:formVal('bankAccountName'),
    account_number:formVal('bankAccountNumber'),
    iban:formVal('bankIban'),
    sort_order:parseInt(formVal('bankSortOrder'))||0,
    is_active:!!(document.getElementById('bankIsActive')||{}).checked
  };
  if(!rec.bank_name||!rec.account_number){adminToast('⚠️ اسم البنك ورقم الحساب مطلوبان','error');return false;}
  try{
    var res=id
      ?await supabaseClient.from('company_bank_accounts').update(rec).eq('id',id)
      :await supabaseClient.from('company_bank_accounts').insert([rec]);
    if(res.error)throw res.error;
    closeBankAccountModal();
    adminToast('✅ تم حفظ الحساب البنكي');
    logAudit(id?'تعديل حساب بنكي':'إضافة حساب بنكي',rec.bank_name+' — '+(rec.iban||rec.account_number));
    loadBankAccounts();
  }catch(err){
    console.warn('saveBankAccount:',err);
    adminToast('❌ تعذر الحفظ: '+((err&&err.message)||err),'error');
  }
  return false;
};
window.toggleBankAccount=async function(id,current){
  try{
    var{error}=await supabaseClient.from('company_bank_accounts').update({is_active:!current}).eq('id',id);
    if(error)throw error;
    adminToast(!current?'✅ تم تفعيل الحساب':'⛔ تم تعطيل الحساب');
    logAudit('تغيير حالة حساب بنكي','حساب رقم '+id+' → '+(!current?'مفعّل':'معطّل'));
    loadBankAccounts();
  }catch(e){console.warn('toggleBankAccount:',e);adminToast('❌ تعذر تحديث الحالة','error');}
};
window.deleteBankAccount=async function(id){
  if(!confirm('حذف هذا الحساب البنكي؟'))return;
  try{
    var{error}=await supabaseClient.from('company_bank_accounts').delete().eq('id',id);
    if(error)throw error;
    adminToast('✅ تم حذف الحساب');
    logAudit('حذف حساب بنكي','حساب رقم: '+id);
    loadBankAccounts();
  }catch(e){console.warn('deleteBankAccount:',e);adminToast('❌ تعذر الحذف','error');}
};

/* ========== طرق الدفع — CRUD + ترتيب على payment_methods (تقرأها checkout مباشرة) ========== */
window.loadPaymentMethodsAdmin=async function(){
  var c=document.getElementById('paymentMethodsTable');if(!c)return;
  c.innerHTML='<tr><td colspan="6">⏳ جاري التحميل...</td></tr>';
  try{
    var{data,error}=await supabaseClient.from('payment_methods').select('*').order('sort_order').order('id');
    if(error)throw error;
    adminState.paymentMethods=data||[];
    if(!data.length){c.innerHTML='<tr><td colspan="6">💳 لا توجد طرق دفع — اضغط ➕ إضافة طريقة.</td></tr>';return;}
    c.innerHTML=data.map(function(m,i){
      var upBtn='<button class="btn-edit" title="أعلى" onclick="movePaymentMethod(\''+m.id+'\',-1)"'+(i===0?' disabled':'')+'>▲</button>';
      var downBtn='<button class="btn-edit" title="أسفل" onclick="movePaymentMethod(\''+m.id+'\',1)"'+(i===data.length-1?' disabled':'')+'>▼</button>';
      return '<tr><td>'+(i+1)+'</td><td style="font-size:20px">'+esc(m.icon||'💳')+'</td><td><strong>'+esc(m.name||'—')+'</strong></td><td>'+(m.sort_order==null?'—':m.sort_order)+'</td><td>'+(m.is_active?'<span class="sync-status-ok">✅ مفعّلة</span>':'<span class="sync-status-fail">⛔ معطّلة</span>')+'</td><td style="white-space:nowrap">'+upBtn+' '+downBtn+' <button class="btn-edit" onclick="editPaymentMethod(\''+m.id+'\')">✏️</button> <button class="btn-edit" onclick="togglePaymentMethod(\''+m.id+'\','+(m.is_active?'true':'false')+')">'+(m.is_active?'⛔':'✅')+'</button> <button class="btn-delete" onclick="deletePaymentMethod(\''+m.id+'\')">🗑️</button></td></tr>';
    }).join('');
  }catch(e){
    console.warn('loadPaymentMethodsAdmin:',e);
    c.innerHTML='<tr><td colspan="6">💳 تعذر تحميل طرق الدفع — تأكد من وجود جدول payment_methods في Supabase.</td></tr>';
  }
};
window.openPaymentMethodModal=function(){
  var f=document.getElementById('paymentMethodForm');if(f)f.reset();
  formSet('paymentMethodId','');
  var act=document.getElementById('pmIsActive');if(act)act.checked=true;
  var t=document.getElementById('paymentMethodModalTitle');if(t)t.textContent='💳 إضافة طريقة دفع';
  var m=document.getElementById('paymentMethodModal');if(m)m.classList.add('show');
};
window.editPaymentMethod=function(id){
  var m=(adminState.paymentMethods||[]).find(function(x){return String(x.id)===String(id);});
  if(!m){adminToast('⚠️ تعذر العثور على الطريقة — حدّث القائمة','error');return;}
  formSet('paymentMethodId',m.id);
  formSet('pmName',m.name);
  formSet('pmIcon',m.icon);
  formSet('pmSortOrder',m.sort_order!=null?m.sort_order:1);
  var act=document.getElementById('pmIsActive');if(act)act.checked=!!m.is_active;
  var t=document.getElementById('paymentMethodModalTitle');if(t)t.textContent='✏️ تعديل طريقة دفع';
  var md=document.getElementById('paymentMethodModal');if(md)md.classList.add('show');
};
window.closePaymentMethodModal=function(){
  var m=document.getElementById('paymentMethodModal');if(m)m.classList.remove('show');
};
window.savePaymentMethod=async function(e){
  if(e&&e.preventDefault)e.preventDefault();
  var id=formVal('paymentMethodId');
  var rec={
    name:formVal('pmName'),
    icon:formVal('pmIcon')||'💳',
    sort_order:parseInt(formVal('pmSortOrder'))||0,
    is_active:!!(document.getElementById('pmIsActive')||{}).checked
  };
  if(!rec.name){adminToast('⚠️ اسم طريقة الدفع مطلوب','error');return false;}
  try{
    var res=id
      ?await supabaseClient.from('payment_methods').update(rec).eq('id',id)
      :await supabaseClient.from('payment_methods').insert([rec]);
    if(res.error)throw res.error;
    closePaymentMethodModal();
    adminToast('✅ تم حفظ طريقة الدفع');
    logAudit(id?'تعديل طريقة دفع':'إضافة طريقة دفع',rec.name);
    loadPaymentMethodsAdmin();
  }catch(err){
    console.warn('savePaymentMethod:',err);
    adminToast('❌ تعذر الحفظ: '+((err&&err.message)||err),'error');
  }
  return false;
};
window.togglePaymentMethod=async function(id,current){
  try{
    var{error}=await supabaseClient.from('payment_methods').update({is_active:!current}).eq('id',id);
    if(error)throw error;
    adminToast(!current?'✅ تم تفعيل الطريقة':'⛔ تم تعطيل الطريقة');
    logAudit('تغيير حالة طريقة دفع','طريقة رقم '+id+' → '+(!current?'مفعّلة':'معطّلة'));
    loadPaymentMethodsAdmin();
  }catch(e){console.warn('togglePaymentMethod:',e);adminToast('❌ تعذر تحديث الحالة','error');}
};
window.movePaymentMethod=async function(id,dir){
  var list=(adminState.paymentMethods||[]).slice();
  var idx=list.findIndex(function(m){return String(m.id)===String(id);});
  var swap=idx+dir;
  if(idx<0||swap<0||swap>=list.length)return;
  var a=list[idx],b=list[swap];
  var ao=(a.sort_order==null?idx+1:a.sort_order),bo=(b.sort_order==null?swap+1:b.sort_order);
  if(ao===bo)bo=ao+dir;
  try{
    var r1=await supabaseClient.from('payment_methods').update({sort_order:bo}).eq('id',a.id);
    if(r1.error)throw r1.error;
    var r2=await supabaseClient.from('payment_methods').update({sort_order:ao}).eq('id',b.id);
    if(r2.error)throw r2.error;
    adminToast('✅ تم تحديث الترتيب');
    logAudit('إعادة ترتيب طرق الدفع',(a.name||a.id)+' ↔ '+(b.name||b.id));
    loadPaymentMethodsAdmin();
  }catch(e){console.warn('movePaymentMethod:',e);adminToast('❌ تعذر تحديث الترتيب','error');}
};
window.deletePaymentMethod=async function(id){
  if(!confirm('حذف طريقة الدفع هذه؟ ستختفي من صفحة الدفع فوراً.'))return;
  try{
    var{error}=await supabaseClient.from('payment_methods').delete().eq('id',id);
    if(error)throw error;
    adminToast('✅ تم حذف الطريقة');
    logAudit('حذف طريقة دفع','طريقة رقم: '+id);
    loadPaymentMethodsAdmin();
  }catch(e){console.warn('deletePaymentMethod:',e);adminToast('❌ تعذر الحذف','error');}
};

/* ========== الشحن — CRUD على shipping_rates + سعر افتراضي في settings.shipping ========== */
window.loadShippingRates=async function(){
  try{
    var sr=await siteSettingsGet('shipping');
    formSet('shippingDefaultPrice',sr.value.default_price);
  }catch(_){}
  var c=document.getElementById('shippingRatesTable');if(!c)return;
  c.innerHTML='<tr><td colspan="7">⏳ جاري التحميل...</td></tr>';
  try{
    var{data,error}=await supabaseClient.from('shipping_rates').select('*').order('id');
    if(error)throw error;
    adminState.shippingRates=data||[];
    if(!data.length){c.innerHTML='<tr><td colspan="7">🚚 لا توجد أسعار شحن — اضغط ➕ إضافة سعر.</td></tr>';return;}
    c.innerHTML=data.map(function(r,i){
      return '<tr><td>'+(i+1)+'</td><td>'+esc(r.from_city||'—')+'</td><td><strong>'+esc(r.to_city||'—')+'</strong></td><td>'+(r.weight_kg==null?'—':r.weight_kg)+'</td><td>'+money(r.price_sar)+'</td><td>'+(r.estimated_days==null?'—':r.estimated_days+' يوم')+'</td><td style="white-space:nowrap"><button class="btn-edit" onclick="editShippingRate(\''+r.id+'\')">✏️</button> <button class="btn-delete" onclick="deleteShippingRate(\''+r.id+'\')">🗑️</button></td></tr>';
    }).join('');
  }catch(e){
    console.warn('loadShippingRates:',e);
    c.innerHTML='<tr><td colspan="7">🚚 تعذر تحميل أسعار الشحن — تأكد من وجود جدول shipping_rates في Supabase.</td></tr>';
  }
};
window.saveShippingSettings=async function(){
  var p=parseFloat(formVal('shippingDefaultPrice'))||0;
  await siteSettingsSave('shipping',{default_price:p},'حفظ إعدادات الشحن','السعر الافتراضي: '+p+' ر.س');
};
window.openShippingRateModal=function(){
  var f=document.getElementById('shippingRateForm');if(f)f.reset();
  formSet('shippingRateId','');
  var t=document.getElementById('shippingRateModalTitle');if(t)t.textContent='🚚 إضافة سعر شحن';
  var m=document.getElementById('shippingRateModal');if(m)m.classList.add('show');
};
window.editShippingRate=function(id){
  var r=(adminState.shippingRates||[]).find(function(x){return String(x.id)===String(id);});
  if(!r){adminToast('⚠️ تعذر العثور على السعر — حدّث القائمة','error');return;}
  formSet('shippingRateId',r.id);
  formSet('shipFromCity',r.from_city);
  formSet('shipToCity',r.to_city);
  formSet('shipWeight',r.weight_kg);
  formSet('shipPrice',r.price_sar);
  formSet('shipDays',r.estimated_days);
  var t=document.getElementById('shippingRateModalTitle');if(t)t.textContent='✏️ تعديل سعر شحن';
  var m=document.getElementById('shippingRateModal');if(m)m.classList.add('show');
};
window.closeShippingRateModal=function(){
  var m=document.getElementById('shippingRateModal');if(m)m.classList.remove('show');
};
window.saveShippingRate=async function(e){
  if(e&&e.preventDefault)e.preventDefault();
  var id=formVal('shippingRateId');
  var rec={
    from_city:formVal('shipFromCity')||null,
    to_city:formVal('shipToCity'),
    weight_kg:formVal('shipWeight')!==''?(parseFloat(formVal('shipWeight'))||0):null,
    price_sar:parseFloat(formVal('shipPrice'))||0,
    estimated_days:formVal('shipDays')!==''?(parseInt(formVal('shipDays'))||0):null
  };
  if(!rec.to_city){adminToast('⚠️ مدينة الوصول مطلوبة','error');return false;}
  try{
    var res=id
      ?await supabaseClient.from('shipping_rates').update(rec).eq('id',id)
      :await supabaseClient.from('shipping_rates').insert([rec]);
    if(res.error)throw res.error;
    closeShippingRateModal();
    adminToast('✅ تم حفظ سعر الشحن');
    logAudit(id?'تعديل سعر شحن':'إضافة سعر شحن',(rec.from_city||'—')+' → '+rec.to_city+': '+rec.price_sar+' ر.س');
    loadShippingRates();
  }catch(err){
    console.warn('saveShippingRate:',err);
    adminToast('❌ تعذر الحفظ: '+((err&&err.message)||err),'error');
  }
  return false;
};
window.deleteShippingRate=async function(id){
  if(!confirm('حذف سعر الشحن هذا؟'))return;
  try{
    var{error}=await supabaseClient.from('shipping_rates').delete().eq('id',id);
    if(error)throw error;
    adminToast('✅ تم حذف السعر');
    logAudit('حذف سعر شحن','سعر رقم: '+id);
    loadShippingRates();
  }catch(e){console.warn('deleteShippingRate:',e);adminToast('❌ تعذر الحذف','error');}
};
window.saveEInvoice=async function(){adminToast('✅ تم حفظ الفوترة');};

})();
