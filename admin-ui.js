/* ============================================================
   درة فارس الشمال — واجهة لوحة الإدارة (admin-ui.js)
   ============================================================ */
(function(){
'use strict';

const supabaseClient = window.supabaseClient;
if (typeof supabaseClient === 'undefined' || !supabaseClient) {
  console.warn('Admin admin-ui.js: Supabase client is unavailable.');
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

function setStat(id,val){var el=document.getElementById(id);if(el)el.textContent=val;}

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
  if(tabName==='staff')loadStaff();
  if(tabName==='why_us')loadSiteItems('why_us');
  if(tabName==='vision_mission')loadSiteItems('vision_mission');
  if(tabName==='hero_stats')loadSiteItems('hero_stats');
  if(tabName==='home_hero')loadHomeHeroForm();
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
  if(tabName==='accounting'){loadErpJournal();loadErpTrialBalance();loadErpIncome();if(typeof loadErpMonthly==='function')loadErpMonthly();if(typeof afakyDailyDefaultDates==='function')afakyDailyDefaultDates();if(typeof loadReportsPlus==='function')loadReportsPlus();}
  if(tabName==='purchases'){loadPurchasesTab();}
  if(tabName==='treasury'){loadTreasuryTab();}
  if(tabName==='returns'){loadReturnsTab();}
  if(tabName==='expenses'){loadExpensesTab();if(typeof loadExpensesPlus==='function')loadExpensesPlus();}
  if(tabName==='einvoice'){loadZatcaSettings();loadZatcaInvoices();}
  if(tabName==='zatca'&&typeof loadZatcaTab==='function')loadZatcaTab();
  if(tabName==='hrplus'&&typeof loadHrPlusTab==='function')loadHrPlusTab();
  if(tabName==='assetsplus'&&typeof loadAssetsPlusTab==='function')loadAssetsPlusTab();
  if(tabName==='cashiers'&&typeof loadCashiersTab==='function')loadCashiersTab();
  if(tabName==='staffUsers'&&typeof loadStaffUsersTab==='function')loadStaffUsersTab();
  if(tabName==='crm'&&typeof loadCrmTab==='function')loadCrmTab();
  if(tabName==='manufacturing'&&typeof loadMfgTab==='function')loadMfgTab();
  if(tabName==='assistant'&&typeof loadAssistantTab==='function')loadAssistantTab();
  if(tabName==='bank_accounts')loadBankAccounts();
  if(tabName==='payment_methods')loadPaymentMethodsAdmin();
  if(tabName==='gateways')loadPaymentGateways();
  if(tabName==='shipping')loadShippingRates();
  if(tabName==='invoices')loadInvoices();
  if(tabName==='files')loadSiteFiles();
  if(tabName==='company_info')loadCompanyInfo();
  if(tabName==='gov_docs')loadGovDocs();
  if(tabName==='marketing')loadMarketing();
  var tabTitles={home_hero:'محتوى الصفحة الرئيسية',dashboard:'لوحة المؤشرات',accounting:'المحاسبة',purchases:'المشتريات والموردون',treasury:'السندات والخزينة',returns:'المرتجعات',expenses:'المصروفات',auditLog:'سجل التدقيق',staffUsers:'مستخدمو البوابات',crm:'🤝 CRM',manufacturing:'🏭 التصنيع',assistant:'🤖 المساعد الذكي',einvoice:'الفوترة الإلكترونية',zatca:'⚡ زاتكا — الربط والاعتماد',bank_accounts:'الحسابات البنكية',payment_methods:'طرق الدفع',gateways:'بوابات الدفع',shipping:'الشحن',settings:'الإعدادات العامة',company_info:'بيانات الشركة',gov_docs:'التوثيق الحكومي',marketing:'التسويق',files:'الملفات'};
  document.getElementById('pageTitle').textContent=tabTitles[tabName]||tabName;
};
async function loadAdminV2Data(){await Promise.allSettled([loadOrders(),loadCustomers(),loadMessages()]);updateStats();}
window.updateStats=async function(){
  var newOrders=0,newMessages=0;
  try{
    var pe=document.getElementById('totalProducts');
    if(pe){
      var{count}=await supabaseClient.from('store_products').select('*',{count:'exact',head:true});
      if(count==null){var{data:pd}=await supabaseClient.from('store_products').select('id');count=(pd||[]).length;}
      pe.textContent=count||0;
    }
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
  window.newOrders = newOrders;
  window.newMessages = newMessages;
};

window.setStat = setStat;
window.loadAdminV2Data = loadAdminV2Data;
window.setupTabs = function(){ /* hook: تفعيل التنقل بين التبويبات */ };
window.setupMobileSidebar = function(){ /* hook: إدارة القائمة الجانبية على الجوال */ };
window.closeAllMenus = function(){ /* hook: إغلاق القوائم المفتوحة */ };
})();
