/* ============================================================
   درة فارس الشمال — التقارير والرسوم البيانية (admin-reports.js)
   ============================================================ */
(function(){
'use strict';

const supabaseClient = window.supabaseClient;
if (typeof supabaseClient === 'undefined' || !supabaseClient) {
  console.warn('Admin admin-reports.js: Supabase client is unavailable.');
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
if(!adminState.afakyImport) adminState.afakyImport = [];
if(!adminState.zatcaInvoices) adminState.zatcaInvoices = [];
window.adminState = adminState;

const orderStatuses = { new:'جديد', review:'قيد المراجعة', processing:'قيد التجهيز', shipped:'تم الشحن', delivered:'تم التسليم', completed:'مكتمل', cancelled:'ملغي' };

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
    var{data,error}=await supabaseClient.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(100);
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
    c.innerHTML='<div class="admin-empty">📋 لا توجد بيانات — تأكد من تنفيذ جدول audit_logs في Supabase (ملف جداول-اللوحة-المتقدمة.sql)</div>';
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
      return '<tr><td>'+(i+1)+'</td><td><strong>'+esc(inv.invoice_number||'—')+'</strong></td><td>'+esc(inv.customer_name||'—')+'</td><td>'+money(inv.total)+'</td><td>'+money(inv.tax)+'</td><td>'+dateAr(inv.created_at)+'</td><td><button class="btn-edit" data-dora-call="generateZatcaQR:+i+">🔳 توليد QR</button></td></tr>';
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
    supabaseClient.from('zatca_logs').insert([{invoice_number:String(inv.invoice_number||''),total:Number(total),tax:Number(tax),qr_code:tlv}]).then(function(){},function(){});
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
    supabaseClient.from('afaky_sync_logs').insert([entry]).then(function(){loadAfakySyncLog();},function(){});
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
    var{data,error}=await supabaseClient.from('afaky_sync_logs').select('*').order('created_at',{ascending:false}).limit(20);
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
    c.innerHTML='<div class="admin-empty">🔄 لا توجد بيانات — تأكد من تنفيذ جدول afaky_sync_logs في Supabase</div>';
  }
};

})();
