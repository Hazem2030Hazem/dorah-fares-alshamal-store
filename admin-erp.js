/* ============================================================
   درة فارس الشمال — نظام ERP (admin-erp.js)
   ============================================================ */
(function(){
'use strict';

const supabaseClient = window.supabaseClient;
if (typeof supabaseClient === 'undefined' || !supabaseClient) {
  console.warn('Admin admin-erp.js: Supabase client is unavailable.');
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

/* ============================================================
   📥 استيراد مخزون آفاق — قراءة Excel «أرصدة الأصناف»
   صيغة الملف: عمود واحد مفصول بفاصلة عربية «؛»
   من اليمين: الفرع؛الكود؛اسم الصنف؛(فارغ)؛الوحدة؛الكمية؛المخزن؛...
   الاستيراد بدون أسعار — الأصناف الجديدة تُزرع مخفية بسعر 0
   ============================================================ */
window._afaqXlsItems = null;

window.afaqGuessCategory = function(name){
  var s = (name||'').toUpperCase();
  if (/TONER|INK|حبر|أحبار/.test(s)) return 'ink';
  if (/CABLE|CABEL|كيبل|كابل|وصل|CONVERT|تحويلة|HDMI|VGA/.test(s)) return 'cables';
  if (/RAM/.test(s)) return 'ram';
  if (/HDD|SSD|HARD|هارد|تخزين/.test(s)) return 'storage';
  if (/PROJECTOR|بروجكتر|بروجيكتر/.test(s)) return 'projectors';
  if (/PRINTER|طابع/.test(s)) return 'printers';
  if (/MONITOR|LAPTOP|PC\b|كمبيوتر|شاشة|CASE HARD PC/.test(s)) return 'computers';
  return 'accessories';
};

window.afaqParseSheet = function(lines){
  var items = [], neg = 0, skipped = 0;
  lines.forEach(function(raw){
    var v = (raw == null ? '' : String(raw));
    if (!v.trim()) return;
    var p = v.split(/[؛;]/);
    if (p.length < 3) { skipped++; return; }
    var code = (p[p.length-2] || '').trim();
    var name = (p[p.length-3] || '').trim();
    var qtyRaw = p.length >= 6 ? (p[p.length-6] || '').trim() : '';
    var unit = p.length >= 5 ? (p[p.length-5] || '').trim() : '';
    var qty = parseFloat(qtyRaw);
    if (!code || !name || !isFinite(qty)) { skipped++; return; }
    var stock = Math.max(0, Math.round(qty));
    if (qty < 0) neg++;
    items.push({sku: code, name: name, stock: stock, unit: unit, negative: qty < 0});
  });
  // إزالة أي تكرار بالكود — آخر ظهور يغلب
  var seen = {}, out = [];
  items.forEach(function(it){ seen[it.sku] = it; });
  Object.keys(seen).forEach(function(k){ out.push(seen[k]); });
  return {items: out, negativeCount: neg, skippedRows: skipped};
};

// الوضع الثاني: ملف Excel بأعمدة حقيقية — نبحث عن صف الترويسة (الكود/اسم الصنف/الكمية)
window.afaqParseTable = function(rows){
  var hi = -1, map = {};
  for (var i = 0; i < Math.min(rows.length, 30); i++) {
    var cells = (rows[i] || []).map(function(c){ return String(c == null ? '' : c).trim(); });
    var ci = cells.findIndex(function(c){ return c === 'الكود' || c.indexOf('الكود') === 0; });
    var ni = cells.findIndex(function(c){ return c === 'اسم الصنف' || c.indexOf('اسم الصنف') === 0; });
    var qi = cells.findIndex(function(c){ return c === 'الكمية' || c.indexOf('الكمية') === 0; });
    var ui = cells.findIndex(function(c){ return c === 'الوحدة'; });
    if (ci > -1 && ni > -1 && qi > -1) { hi = i; map = {code: ci, name: ni, qty: qi, unit: ui}; break; }
  }
  if (hi < 0) return null;
  var items = [], neg = 0, skipped = 0;
  for (var r = hi + 1; r < rows.length; r++) {
    var row = rows[r] || [];
    var code = String(row[map.code] == null ? '' : row[map.code]).trim();
    var name = String(row[map.name] == null ? '' : row[map.name]).trim();
    var qty = parseFloat(String(row[map.qty] == null ? '' : row[map.qty]).replace(/,/g, ''));
    var unit = map.unit > -1 ? String(row[map.unit] == null ? '' : row[map.unit]).trim() : '';
    if (!code && !name) { skipped++; continue; }
    if (!code || !name || !isFinite(qty)) { skipped++; continue; }
    var stock = Math.max(0, Math.round(qty));
    if (qty < 0) neg++;
    items.push({sku: code, name: name, stock: stock, unit: unit, negative: qty < 0});
  }
  var seen = {}, out = [];
  items.forEach(function(it){ seen[it.sku] = it; });
  Object.keys(seen).forEach(function(k){ out.push(seen[k]); });
  return {items: out, negativeCount: neg, skippedRows: skipped};
};

window.afaqXlsPreview = function(input){
  var box = document.getElementById('afaqXlsPreviewBox');
  var btn = document.getElementById('afaqXlsImportBtn');
  window._afaqXlsItems = null;
  btn.style.display = 'none';
  var f = input.files && input.files[0];
  if (!f) return;
  if (typeof XLSX === 'undefined') { box.textContent = '❌ مكتبة قراءة Excel لم تُحمّل — تأكد من الاتصال بالإنترنت وأعد فتح اللوحة.'; return; }
  box.textContent = '⏳ جاري قراءة الملف: ' + f.name + ' ...';
  var reader = new FileReader();
  reader.onload = function(ev){
    try {
      var buf = new Uint8Array(ev.target.result);
      var rows = [];
      if (/\.csv$/i.test(f.name) || f.type === 'text/csv') {
        // ملف CSV من آفاق — فك الترميز: UTF-8 أولاً ثم Windows-1256 للعربي القديم
        var text = new TextDecoder('utf-8').decode(buf);
        if (text.indexOf('\uFFFD') > -1) text = new TextDecoder('windows-1256').decode(buf);
        rows = text.split(/\r?\n/).map(function(line){ return [line]; });
      } else {
        var wb = XLSX.read(buf, {type:'array'});
        var ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, {header:1, raw:true, defval:''});
      }
      // المحاولة 1: صيغة العمود الواحد المفصول بـ«؛» أو «;»
      var lines = rows.map(function(r){ return (r && r.length ? r[0] : ''); });
      var res = afaqParseSheet(lines);
      // المحاولة 2: جدول أعمدة حقيقية بترويسة الكود/اسم الصنف/الكمية
      if (!res.items.length) {
        var res2 = afaqParseTable(rows);
        if (res2 && res2.items.length) res = res2;
      }
      window._afaqXlsItems = res.items;
      if (!res.items.length) {
        var dbg = rows.slice(0, 6).map(function(r){ return (r || []).join(' | ').slice(0, 90); }).join('\n');
        box.innerHTML = '⚠️ لم يتم العثور على أصناف صالحة في الملف (عدد الصفوف المقروءة: ' + rows.length + ').<br>أول صفوف الملف كما قرأتها الأداة — ابعتها لي لو استمرت المشكلة:<pre style="direction:ltr;text-align:left;font-size:11px;background:rgba(0,0,0,.25);padding:10px;border-radius:8px;white-space:pre-wrap">' + dbg.replace(/</g,'&lt;') + '</pre>';
        return;
      }
      var html = '📋 تم قراءة <b>' + res.items.length + '</b> صنف بنجاح' +
        (res.negativeCount ? ' — ' + res.negativeCount + ' صنف بكمية سالبة ستُزرع بمخزون 0' : '') +
        (res.skippedRows ? ' — تم تجاوز ' + res.skippedRows + ' صف (ترويسة/تذييل/غير صالح)' : '') + '.';
      html += '<div style="max-height:220px;overflow:auto;margin-top:10px;border:1px solid rgba(255,255,255,.08);border-radius:10px"><table style="width:100%;font-size:12px"><thead><tr><th>الكود</th><th>اسم الصنف</th><th>الكمية</th><th>التصنيف المتوقع</th></tr></thead><tbody>';
      res.items.slice(0, 15).forEach(function(it){
        html += '<tr><td>' + it.sku + '</td><td>' + it.name.replace(/</g,'&lt;') + '</td><td>' + it.stock + (it.negative?' ⚠️':'') + '</td><td>' + afaqGuessCategory(it.name) + '</td></tr>';
      });
      if (res.items.length > 15) html += '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">… و' + (res.items.length - 15) + ' صنف آخر</td></tr>';
      html += '</tbody></table></div>';
      box.innerHTML = html;
      btn.style.display = '';
    } catch(e) {
      console.warn('afaqXlsPreview:', e);
      box.textContent = '❌ تعذّر قراءة الملف — تأكد أنه ملف Excel سليم (.xlsx).';
    }
  };
  reader.readAsArrayBuffer(f);
};

window.afaqXlsRun = async function(){
  var items = window._afaqXlsItems;
  if (!items || !items.length) { adminToast('⚠️ اختر ملف آفاق أولاً وانتظر المعاينة', 'error'); return; }
  var hideNew = document.getElementById('afaqHideNew').checked;
  var autoCat = document.getElementById('afaqAutoCat').checked;
  if (!confirm('سيتم استيراد ' + items.length + ' صنف من آفاق إلى قاعدة بيانات الموقع.\n• الأصناف الجديدة: بدون أسعار' + (hideNew ? ' ومخفية عن المتجر' : '') + '\n• الأصناف الموجودة: تحديث الكمية فقط (السعر والصورة لا يُمسّان)\nمتابعة؟')) return;
  var btn = document.getElementById('afaqXlsImportBtn');
  var box = document.getElementById('afaqXlsPreviewBox');
  btn.disabled = true; btn.textContent = '⏳ جاري الاستيراد...';
  try {
    // جلب المنتجات الموجودة لمطابقة الكود (sku)
    var existing = [];
    var from = 0;
    while (true) {
      var q = await supabaseClient.from('store_products').select('id,sku,stock').range(from, from + 999);
      if (q.error) throw q.error;
      existing = existing.concat(q.data || []);
      if (!q.data || q.data.length < 1000) break;
      from += 1000;
    }
    var bySku = {};
    existing.forEach(function(p){ if (p.sku != null && p.sku !== '') bySku[String(p.sku).trim()] = p; });

    var toInsert = [], toUpdate = [];
    items.forEach(function(it){
      if (bySku[it.sku]) {
        toUpdate.push({id: bySku[it.sku].id, sku: it.sku, stock: it.stock});
      } else {
        toInsert.push({
          name: it.name,
          sku: it.sku,
          price: 0,
          old_price: null,
          stock: it.stock,
          category: autoCat ? afaqGuessCategory(it.name) : 'accessories',
          badge: 'تحت التسعير',
          image: '',
          description: 'مستورد من نظام آفاق — وحدة: ' + (it.unit || 'PCS'),
          rating: 0,
          is_active: !hideNew
        });
      }
    });

    var inserted = 0, updated = 0, failed = 0;
    for (var i = 0; i < toInsert.length; i += 100) {
      var r1 = await supabaseClient.from('store_products').insert(toInsert.slice(i, i + 100));
      if (r1.error) { console.warn('insert chunk:', r1.error); failed += Math.min(100, toInsert.length - i); }
      else inserted += Math.min(100, toInsert.length - i);
    }
    for (var j = 0; j < toUpdate.length; j += 100) {
      var r2 = await supabaseClient.from('store_products').upsert(toUpdate.slice(j, j + 100), {onConflict: 'id'});
      if (r2.error) { console.warn('update chunk:', r2.error); failed += Math.min(100, toUpdate.length - j); }
      else updated += Math.min(100, toUpdate.length - j);
    }

    var msg = '✅ اكتمل استيراد آفاق: ' + inserted + ' صنف جديد + ' + updated + ' تحديث كمية' + (failed ? ' — ⚠️ فشل ' + failed : '');
    adminToast(msg, failed ? 'error' : 'success');
    logAudit('استيراد مخزون آفاق', 'Excel أرصدة الأصناف: ' + inserted + ' جديد / ' + updated + ' تحديث كمية / بدون أسعار');
    box.innerHTML = msg + '<br><span style="color:var(--text-muted);font-size:12px">الخطوة التالية: افتح صفحة «المنتجات» وسعّر الأصناف الجديدة ثم فعّلها لتظهر في المتجر.</span>';
    window._afaqXlsItems = null;
    btn.style.display = 'none';
    if (typeof loadProducts === 'function') loadProducts();
  } catch(e) {
    console.warn('afaqXlsRun:', e);
    adminToast('❌ تعذّر الاستيراد: ' + (e.message || e), 'error');
  }
  btn.disabled = false; btn.textContent = '⬆️ تنفيذ الاستيراد الآن';
};


/* ============================================================
   🏛️ المحاسبة — قيود اليومية + ميزان المراجعة + قائمة الدخل
   كل البيانات مشتقة من erp_journal_lines (لا تعديل يدوي)
   ============================================================ */
window.erpPostUnposted = async function(){
  if (!confirm('سيتم إنشاء قيد يومية لكل طلب بيع غير مرحّل (مدين: العملاء / دائن: المبيعات).\nالعملية آمنة ولن تكرر أي قيد موجود. متابعة؟')) return;
  adminToast('⏳ جاري الترحيل...');
  var r = await supabaseClient.rpc('erp_post_unposted_orders');
  if (r.error) {
    console.warn('erpPostUnposted:', r.error);
    adminToast('❌ تعذّر الترحيل: ' + r.error.message + ' — تأكد من تشغيل ملف erp-phase1.sql في SQL Editor أولاً', 'error');
    return;
  }
  adminToast('✅ تم ترحيل ' + r.data + ' قيد جديد');
  logAudit('ترحيل محاسبي', 'إنشاء ' + r.data + ' قيد يومية من طلبات البيع');
  loadErpJournal(); loadErpTrialBalance(); loadErpIncome();
};

window.loadErpJournal = async function(){
  var t = document.getElementById('erpJournalTable');
  if (!t) return;
  var r = await supabaseClient.from('erp_journal_entries')
    .select('entry_number, created_at, memo, erp_journal_lines(debit, credit, party, erp_accounts(code, name))')
    .order('entry_number', {ascending: false}).limit(100);
  if (r.error) { t.innerHTML = '<tr><td colspan="7">⚠️ ' + (r.error.message.includes('does not exist') ? 'شغّل ملف erp-phase1.sql في SQL Editor أولاً' : r.error.message) + '</td></tr>'; return; }
  if (!r.data || !r.data.length) { t.innerHTML = '<tr><td colspan="7">📒 لا توجد قيود بعد — اضغط «ترحيل الطلبات غير المرحّلة» لإنشائها من طلبات البيع</td></tr>'; return; }
  var rows = [];
  r.data.forEach(function(e){
    (e.erp_journal_lines || []).forEach(function(l){
      rows.push('<tr><td>' + e.entry_number + '</td><td>' + new Date(e.created_at).toLocaleDateString('ar-EG') + '</td><td>' + (e.memo || '') + '</td><td>' + (l.erp_accounts ? l.erp_accounts.code + ' — ' + l.erp_accounts.name : '') + '</td><td>' + (l.party || '—') + '</td><td>' + (Number(l.debit) ? Number(l.debit).toLocaleString() : '') + '</td><td>' + (Number(l.credit) ? Number(l.credit).toLocaleString() : '') + '</td></tr>');
    });
  });
  t.innerHTML = rows.join('');
};

window.loadErpTrialBalance = async function(){
  var t = document.getElementById('erpTrialTable');
  if (!t) return;
  var r = await supabaseClient.from('erp_v_trial_balance').select('*');
  if (r.error || !r.data || !r.data.length) { t.innerHTML = '<tr><td colspan="6">' + (r.error && !r.error.message.includes('does not exist') ? r.error.message : 'لا توجد حركات بعد') + '</td></tr>'; return; }
  t.innerHTML = r.data.map(function(a){
    var bal = Number(a.balance || 0);
    return '<tr><td>' + a.code + '</td><td>' + a.name + '</td><td>' + a.kind + '</td><td>' + Number(a.total_debit || 0).toLocaleString() + '</td><td>' + Number(a.total_credit || 0).toLocaleString() + '</td><td style="font-weight:700;color:' + (bal >= 0 ? '#22C55E' : '#EF4444') + '">' + bal.toLocaleString() + '</td></tr>';
  }).join('');
};

window.loadErpIncome = async function(){
  var t = document.getElementById('erpIncomeTable');
  if (!t) return;
  var r = await supabaseClient.from('erp_v_income_statement').select('*');
  if (r.error || !r.data || !r.data.length) { t.innerHTML = '<tr><td colspan="2">لا توجد بيانات بعد</td></tr>'; return; }
  t.innerHTML = r.data.map(function(x, i){
    var last = i === r.data.length - 1;
    return '<tr' + (last ? ' style="font-weight:800;background:rgba(34,197,94,.08)"' : '') + '><td>' + x.line + '</td><td>' + Number(x.amount || 0).toLocaleString() + ' ر.س</td></tr>';
  }).join('');
};


/* ============================================================
   🛒 المرحلة 2 — المشتريات والموردون
   ملاحظة تقنية: هذا القسم خارج غلاف IIFE الخاص باللوحة —
   لذلك يستخدم مساعداته الخاصة erpEsc/erpToast
   ============================================================ */
function erpEsc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];}); }
function erpToast(m,t){ if(typeof showToast==='function')showToast(m,t); else alert(m); }

var purchProductsCache = null;

window.loadPurchasesTab = async function(){
  loadSuppliers();
  loadPurchList();
  loadSupplierBalances();
  if (!purchProductsCache) {
    var r = await supabaseClient.from('store_products').select('id, name, stock').order('name');
    purchProductsCache = (r && r.data) ? r.data : [];
  }
  var box = document.getElementById('purchLines');
  if (box && !box.children.length) purchAddLine();
};

window.loadSuppliers = async function(){
  var r = await supabaseClient.from('erp_suppliers').select('id, name').order('name');
  var sel = document.getElementById('purchSupplier');
  if (!sel) return;
  if (r.error) {
    sel.innerHTML = '<option value="">⚠️ ' + (r.error.message.includes('does not exist') ? 'شغّل erp-phase2.sql أولاً' : r.error.message) + '</option>';
    return;
  }
  var cur = sel.value;
  sel.innerHTML = '<option value="">— اختر المورد —</option>' + (r.data || []).map(function(s){
    return '<option value="' + s.id + '">' + erpEsc(s.name) + '</option>';
  }).join('');
  sel.value = cur;
};

window.purchAddSupplier = async function(){
  var name = (document.getElementById('supName').value || '').trim();
  if (!name) { erpToast('⚠️ اكتب اسم المورد أولاً', 'warning'); return; }
  var r = await supabaseClient.rpc('erp_add_supplier', {
    p_name: name,
    p_phone: (document.getElementById('supPhone').value || '').trim() || null,
    p_email: (document.getElementById('supEmail').value || '').trim() || null,
    p_notes: (document.getElementById('supNotes').value || '').trim() || null
  });
  if (r.error) { erpToast('❌ ' + r.error.message, 'error'); return; }
  erpToast('✅ تم حفظ المورد «' + name + '»');
  logAudit('مورد جديد', 'إضافة المورد: ' + name);
  document.getElementById('supName').value = ''; document.getElementById('supPhone').value = '';
  document.getElementById('supEmail').value = ''; document.getElementById('supNotes').value = '';
  loadSuppliers(); loadSupplierBalances();
};

window.purchAddLine = function(){
  var box = document.getElementById('purchLines');
  if (!box) return;
  var row = document.createElement('div');
  row.className = 'purch-line';
  var opts = '<option value="">— صنف حر (اكتب الاسم) —</option>' + (purchProductsCache || []).map(function(p){
    return '<option value="' + p.id + '" data-name="' + erpEsc(p.name) + '">' + erpEsc(p.name) + ' (مخزون: ' + (p.stock || 0) + ')</option>';
  }).join('');
  row.innerHTML =
    '<div style="display:flex;gap:6px"><select class="erp-in pl-product" onchange="purchLineProduct(this)">' + opts + '</select>' +
    '<input type="text" class="erp-in pl-name" placeholder="اسم الصنف *"></div>' +
    '<input type="number" class="erp-in pl-qty" placeholder="الكمية" min="0" step="any" oninput="purchRecalc()">' +
    '<input type="number" class="erp-in pl-cost" placeholder="سعر التكلفة" min="0" step="any" oninput="purchRecalc()">' +
    '<span class="pl-total" style="font-weight:700;color:#22C55E">0</span>' +
    '<button class="btn-add" style="background:#EF4444;padding:6px 10px" onclick="this.parentElement.remove();purchRecalc()">🗑️</button>';
  box.appendChild(row);
};

window.purchLineProduct = function(sel){
  var row = sel.closest('.purch-line');
  var opt = sel.options[sel.selectedIndex];
  var nameInput = row.querySelector('.pl-name');
  if (sel.value && opt.dataset.name) { nameInput.value = opt.dataset.name; nameInput.disabled = true; }
  else { nameInput.disabled = false; if (!sel.value) nameInput.value = ''; }
};

window.purchRecalc = function(){
  var total = 0;
  document.querySelectorAll('#purchLines .purch-line').forEach(function(row){
    var q = parseFloat(row.querySelector('.pl-qty').value) || 0;
    var c = parseFloat(row.querySelector('.pl-cost').value) || 0;
    var lt = q * c;
    row.querySelector('.pl-total').textContent = lt.toLocaleString();
    total += lt;
  });
  document.getElementById('purchTotal').textContent = total.toLocaleString();
};

window.purchSave = async function(){
  var supplierId = document.getElementById('purchSupplier').value;
  if (!supplierId) { erpToast('⚠️ اختر المورد أولاً', 'warning'); return; }
  var lines = [];
  var bad = null;
  document.querySelectorAll('#purchLines .purch-line').forEach(function(row){
    var name = (row.querySelector('.pl-name').value || '').trim();
    var q = parseFloat(row.querySelector('.pl-qty').value) || 0;
    var c = parseFloat(row.querySelector('.pl-cost').value) || 0;
    var pid = row.querySelector('.pl-product').value || null;
    if (!name && q <= 0 && c <= 0) return;
    if (!name) { bad = 'في سطر ناقص اسم الصنف'; return; }
    if (q <= 0) { bad = 'الكمية في صنف «' + name + '» لازم تكون أكبر من صفر'; return; }
    lines.push({ product_id: pid, item_name: name, qty: q, unit_cost: c });
  });
  if (bad) { erpToast('⚠️ ' + bad, 'warning'); return; }
  if (!lines.length) { erpToast('⚠️ أضف صنف واحد على الأقل بكمية وسعر', 'warning'); return; }
  if (!confirm('سيتم حفظ فاتورة الشراء (' + lines.length + ' صنف) وترحيلها فوراً:\n• زيادة المخزون بالكميات\n• قيد: مدين مخزون ← دائن موردون\nمتابعة؟')) return;
  erpToast('⏳ جاري الحفظ والترحيل...');
  var r = await supabaseClient.rpc('erp_create_purchase', {
    p_supplier_id: supplierId,
    p_memo: (document.getElementById('purchMemo').value || '').trim() || null,
    p_lines: lines
  });
  if (r.error) {
    erpToast('❌ ' + r.error.message + (r.error.message.includes('does not exist') ? ' — شغّل ملف erp-phase2.sql في SQL Editor أولاً' : ''), 'error');
    return;
  }
  erpToast('✅ تم حفظ وترحيل فاتورة الشراء رقم ' + r.data);
  logAudit('فاتورة شراء', 'ترحيل فاتورة شراء رقم ' + r.data + ' بعدد ' + lines.length + ' صنف');
  purchProductsCache = null;
  document.getElementById('purchLines').innerHTML = '';
  document.getElementById('purchMemo').value = '';
  purchAddLine(); purchRecalc();
  loadPurchList(); loadSupplierBalances();
};

window.loadPurchList = async function(){
  var t = document.getElementById('purchListTable');
  if (!t) return;
  var r = await supabaseClient.from('erp_purchases').select('purchase_number, created_at, supplier_name, total, memo').order('purchase_number', {ascending: false}).limit(50);
  if (r.error) { t.innerHTML = '<tr><td colspan="5">⚠️ ' + (r.error.message.includes('does not exist') ? 'شغّل ملف erp-phase2.sql في SQL Editor أولاً' : r.error.message) + '</td></tr>'; return; }
  if (!r.data || !r.data.length) { t.innerHTML = '<tr><td colspan="5">لا توجد فواتير شراء بعد</td></tr>'; return; }
  t.innerHTML = r.data.map(function(p){
    return '<tr><td>' + p.purchase_number + '</td><td>' + new Date(p.created_at).toLocaleDateString('ar-EG') + '</td><td>' + erpEsc(p.supplier_name || '') + '</td><td style="font-weight:700">' + Number(p.total || 0).toLocaleString() + '</td><td>' + erpEsc(p.memo || '—') + '</td></tr>';
  }).join('');
};

window.loadSupplierBalances = async function(){
  var t = document.getElementById('suppliersTable');
  if (!t) return;
  var r = await supabaseClient.from('erp_v_supplier_balances').select('*');
  if (r.error) { t.innerHTML = '<tr><td colspan="4">⚠️ ' + (r.error.message.includes('does not exist') ? 'شغّل ملف erp-phase2.sql في SQL Editor أولاً' : r.error.message) + '</td></tr>'; return; }
  if (!r.data || !r.data.length) { t.innerHTML = '<tr><td colspan="4">لا يوجد موردون بعد — أضف أول مورد من الأعلى</td></tr>'; return; }
  t.innerHTML = r.data.map(function(s){
    return '<tr><td>' + erpEsc(s.name) + '</td><td dir="ltr">' + erpEsc(s.phone || '—') + '</td><td>' + s.invoices_count + '</td><td style="font-weight:700;color:#8B5CF6">' + Number(s.total_purchases || 0).toLocaleString() + ' ر.س</td></tr>';
  }).join('');
};


/* ============================================================
   💰 المرحلة 3 — سندات القبض والصرف والخزينة
   (خارج غلاف IIFE — يستخدم erpEsc/erpToast)
   ============================================================ */
window.loadTreasuryTab = async function(){
  loadCashBalance();
  loadVouchers();
  loadPartyBalances();
};

window.loadCashBalance = async function(){
  var el = document.getElementById('cashBalance');
  if (!el) return;
  var r = await supabaseClient.from('erp_v_cash_balance').select('cash_balance').maybeSingle();
  if (r.error) { el.textContent = '⚠️ ' + (r.error.message.includes('does not exist') ? 'شغّل erp-phase3.sql أولاً' : r.error.message); return; }
  var bal = Number((r.data && r.data.cash_balance) || 0);
  el.textContent = bal.toLocaleString() + ' ر.س';
  el.style.color = bal >= 0 ? '#F59E0B' : '#EF4444';
};

window.voucherSave = async function(type){
  var isReceipt = type === 'receipt';
  var party = (document.getElementById(isReceipt ? 'receiptParty' : 'paymentParty').value || '').trim();
  var amount = parseFloat(document.getElementById(isReceipt ? 'receiptAmount' : 'paymentAmount').value) || 0;
  var memo = (document.getElementById(isReceipt ? 'receiptMemo' : 'paymentMemo').value || '').trim();
  var label = isReceipt ? 'قبض' : 'صرف';
  if (!party) { erpToast('⚠️ اكتب اسم ' + (isReceipt ? 'العميل' : 'المورد') + ' أولاً', 'warning'); return; }
  if (amount <= 0) { erpToast('⚠️ المبلغ لازم يكون أكبر من صفر', 'warning'); return; }
  if (!confirm('سيتم حفظ سند ' + label + ' بمبلغ ' + amount.toLocaleString() + ' ر.س — ' + party + '\n' +
    (isReceipt ? 'القيد: مدين خزينة ← دائن عملاء (رصيد العميل ينقص)' : 'القيد: مدين موردون ← دائن خزينة (رصيد المورد ينقص)') + '\nمتابعة؟')) return;
  var r = await supabaseClient.rpc('erp_create_voucher', { p_type: type, p_party: party, p_amount: amount, p_memo: memo || null });
  if (r.error) {
    erpToast('❌ ' + r.error.message + (r.error.message.includes('does not exist') ? ' — شغّل ملف erp-phase3.sql في SQL Editor أولاً' : ''), 'error');
    return;
  }
  erpToast('✅ تم حفظ سند ' + label + ' رقم ' + r.data);
  logAudit('سند ' + label, 'سند ' + label + ' رقم ' + r.data + ' — ' + party + ' — ' + amount + ' ر.س');
  document.getElementById(isReceipt ? 'receiptParty' : 'paymentParty').value = '';
  document.getElementById(isReceipt ? 'receiptAmount' : 'paymentAmount').value = '';
  document.getElementById(isReceipt ? 'receiptMemo' : 'paymentMemo').value = '';
  loadCashBalance(); loadVouchers(); loadPartyBalances();
};

window.loadVouchers = async function(){
  var t = document.getElementById('vouchersTable');
  if (!t) return;
  var r = await supabaseClient.from('erp_vouchers').select('voucher_number, voucher_type, party, amount, memo, created_at').order('voucher_number', {ascending: false}).limit(50);
  if (r.error) { t.innerHTML = '<tr><td colspan="6">⚠️ ' + (r.error.message.includes('does not exist') ? 'شغّل ملف erp-phase3.sql في SQL Editor أولاً' : r.error.message) + '</td></tr>'; return; }
  if (!r.data || !r.data.length) { t.innerHTML = '<tr><td colspan="6">لا توجد سندات بعد</td></tr>'; return; }
  t.innerHTML = r.data.map(function(v){
    var isR = v.voucher_type === 'receipt';
    return '<tr><td>' + v.voucher_number + '</td><td style="color:' + (isR ? '#22C55E' : '#EF4444') + ';font-weight:700">' + (isR ? '📥 قبض' : '📤 صرف') + '</td><td>' + new Date(v.created_at).toLocaleDateString('ar-EG') + '</td><td>' + erpEsc(v.party) + '</td><td style="font-weight:700">' + Number(v.amount).toLocaleString() + '</td><td>' + erpEsc(v.memo || '—') + '</td></tr>';
  }).join('');
};

window.loadPartyBalances = async function(){
  var t = document.getElementById('partyBalancesTable');
  if (!t) return;
  var r = await supabaseClient.from('erp_v_party_balances').select('*');
  if (r.error) { t.innerHTML = '<tr><td colspan="5">⚠️ ' + (r.error.message.includes('does not exist') ? 'شغّل ملف erp-phase3.sql في SQL Editor أولاً' : r.error.message) + '</td></tr>'; return; }
  if (!r.data || !r.data.length) { t.innerHTML = '<tr><td colspan="5">لا توجد أرصدة أطراف بعد</td></tr>'; return; }
  t.innerHTML = r.data.map(function(p){
    var bal = Number(p.balance || 0);
    var isCust = p.account_code === '1200';
    var note = isCust
      ? (bal > 0 ? 'العميل مدين لنا' : bal < 0 ? 'للعميل رصيد دائن' : 'مسدّد')
      : (bal < 0 ? 'نحن مدينون للمورد' : bal > 0 ? 'دفعنا أكثر من المستحق' : 'مسدّد');
    return '<tr><td>' + erpEsc(p.party) + '</td><td>' + p.account_code + ' — ' + erpEsc(p.account_name) + '</td><td>' + Number(p.total_debit).toLocaleString() + '</td><td>' + Number(p.total_credit).toLocaleString() + '</td><td style="font-weight:700;color:' + (bal === 0 ? '#94A3B8' : (isCust ? (bal > 0 ? '#F59E0B' : '#22C55E') : (bal < 0 ? '#EF4444' : '#22C55E'))) + '">' + Math.abs(bal).toLocaleString() + ' (' + note + ')</td></tr>';
  }).join('');
};


/* ============================================================
   🔄 المرحلة 4 — المرتجعات بالقيود العكسية
   (خارج غلاف IIFE — يستخدم erpEsc/erpToast)
   ============================================================ */
window.loadReturnsTab = async function(){
  loadReturnsList();
  if (!purchProductsCache) {
    var r = await supabaseClient.from('store_products').select('id, name, stock').order('name');
    purchProductsCache = (r && r.data) ? r.data : [];
  }
  var box = document.getElementById('retLines');
  if (box && !box.children.length) retAddLine();
};

window.retAddLine = function(){
  var box = document.getElementById('retLines');
  if (!box) return;
  var row = document.createElement('div');
  row.className = 'purch-line';
  var opts = '<option value="">— صنف حر (اكتب الاسم) —</option>' + (purchProductsCache || []).map(function(p){
    return '<option value="' + p.id + '" data-name="' + erpEsc(p.name) + '">' + erpEsc(p.name) + ' (مخزون: ' + (p.stock || 0) + ')</option>';
  }).join('');
  row.innerHTML =
    '<div style="display:flex;gap:6px"><select class="erp-in rl-product" onchange="retLineProduct(this)">' + opts + '</select>' +
    '<input type="text" class="erp-in rl-name" placeholder="اسم الصنف *"></div>' +
    '<input type="number" class="erp-in rl-qty" placeholder="الكمية" min="0" step="any" oninput="retRecalc()">' +
    '<input type="number" class="erp-in rl-price" placeholder="السعر" min="0" step="any" oninput="retRecalc()">' +
    '<span class="rl-total" style="font-weight:700;color:#F97316">0</span>' +
    '<button class="btn-add" style="background:#EF4444;padding:6px 10px" onclick="this.parentElement.remove();retRecalc()">🗑️</button>';
  box.appendChild(row);
};

window.retLineProduct = function(sel){
  var row = sel.closest('.purch-line');
  var opt = sel.options[sel.selectedIndex];
  var nameInput = row.querySelector('.rl-name');
  if (sel.value && opt.dataset.name) { nameInput.value = opt.dataset.name; nameInput.disabled = true; }
  else { nameInput.disabled = false; if (!sel.value) nameInput.value = ''; }
};

window.retRecalc = function(){
  var total = 0;
  document.querySelectorAll('#retLines .purch-line').forEach(function(row){
    var q = parseFloat(row.querySelector('.rl-qty').value) || 0;
    var p = parseFloat(row.querySelector('.rl-price').value) || 0;
    var lt = q * p;
    row.querySelector('.rl-total').textContent = lt.toLocaleString();
    total += lt;
  });
  document.getElementById('retTotal').textContent = total.toLocaleString();
};

window.retSave = async function(){
  var type = document.getElementById('retType').value;
  var party = (document.getElementById('retParty').value || '').trim();
  var memo = (document.getElementById('retMemo').value || '').trim();
  if (!party) { erpToast('⚠️ اكتب اسم ' + (type === 'sales' ? 'العميل' : 'المورد') + ' أولاً', 'warning'); return; }
  var lines = [];
  var bad = null;
  document.querySelectorAll('#retLines .purch-line').forEach(function(row){
    var name = (row.querySelector('.rl-name').value || '').trim();
    var q = parseFloat(row.querySelector('.rl-qty').value) || 0;
    var p = parseFloat(row.querySelector('.rl-price').value) || 0;
    var pid = row.querySelector('.rl-product').value || null;
    if (!name && q <= 0 && p <= 0) return;
    if (!name) { bad = 'في سطر ناقص اسم الصنف'; return; }
    if (q <= 0) { bad = 'الكمية في صنف «' + name + '» لازم تكون أكبر من صفر'; return; }
    lines.push({ product_id: pid, item_name: name, qty: q, unit_price: p });
  });
  if (bad) { erpToast('⚠️ ' + bad, 'warning'); return; }
  if (!lines.length) { erpToast('⚠️ أضف صنف واحد على الأقل بكمية وسعر', 'warning'); return; }
  var label = type === 'sales' ? 'مرتجع مبيعات' : 'مرتجع مشتريات';
  if (!confirm('سيتم حفظ ' + label + ' (' + lines.length + ' صنف) وترحيله فوراً:\n' +
    (type === 'sales' ? '• قيد عكسي: مدين مبيعات ← دائن عميل\n• البضاعة ترجع للمخزن' : '• قيد عكسي: مدين مورد ← دائن مخزون\n• البضاعة تخرج من المخزن') + '\nمتابعة؟')) return;
  var r = await supabaseClient.rpc('erp_create_return', { p_type: type, p_party: party, p_memo: memo || null, p_lines: lines });
  if (r.error) {
    erpToast('❌ ' + r.error.message + (r.error.message.includes('does not exist') ? ' — شغّل ملف erp-phase4.sql في SQL Editor أولاً' : ''), 'error');
    return;
  }
  erpToast('✅ تم حفظ وترحيل ' + label + ' رقم ' + r.data);
  logAudit('مرتجع', label + ' رقم ' + r.data + ' — ' + party);
  purchProductsCache = null;
  document.getElementById('retLines').innerHTML = '';
  document.getElementById('retParty').value = '';
  document.getElementById('retMemo').value = '';
  retAddLine(); retRecalc();
  loadReturnsList();
};

window.loadReturnsList = async function(){
  var t = document.getElementById('returnsTable');
  if (!t) return;
  var r = await supabaseClient.from('erp_returns').select('return_number, return_type, party, total, memo, created_at').order('return_number', {ascending: false}).limit(50);
  if (r.error) { t.innerHTML = '<tr><td colspan="6">⚠️ ' + (r.error.message.includes('does not exist') ? 'شغّل ملف erp-phase4.sql في SQL Editor أولاً' : r.error.message) + '</td></tr>'; return; }
  if (!r.data || !r.data.length) { t.innerHTML = '<tr><td colspan="6">لا توجد مرتجعات بعد</td></tr>'; return; }
  t.innerHTML = r.data.map(function(v){
    var isS = v.return_type === 'sales';
    return '<tr><td>' + v.return_number + '</td><td style="color:' + (isS ? '#F97316' : '#8B5CF6') + ';font-weight:700">' + (isS ? '↩️ مبيعات' : '↩️ مشتريات') + '</td><td>' + new Date(v.created_at).toLocaleDateString('ar-EG') + '</td><td>' + erpEsc(v.party) + '</td><td style="font-weight:700">' + Number(v.total).toLocaleString() + '</td><td>' + erpEsc(v.memo || '—') + '</td></tr>';
  }).join('');
};


/* ============================================================
   🧾 المرحلة 5 — المصروفات + شجرة الحسابات + الأرباح الشهرية + تصدير Excel
   (خارج غلاف IIFE — يستخدم erpEsc/erpToast)
   ============================================================ */
window.loadExpensesTab = async function(){
  loadExpenseAccounts();
  loadExpensesList();
};

window.loadExpenseAccounts = async function(){
  var sel = document.getElementById('expAccount');
  if (!sel) return;
  var r = await supabaseClient.from('erp_accounts').select('code, name').eq('kind', 'expense').order('code');
  if (r.error) { sel.innerHTML = '<option value="">⚠️ شغّل erp-phase5.sql أولاً</option>'; return; }
  sel.innerHTML = '<option value="">— حساب المصروف —</option>' + (r.data || []).map(function(a){
    return '<option value="' + a.code + '">' + a.code + ' — ' + erpEsc(a.name) + '</option>';
  }).join('');
};

window.accAdd = async function(){
  var code = (document.getElementById('accCode').value || '').trim();
  var name = (document.getElementById('accName').value || '').trim();
  var kind = document.getElementById('accKind').value;
  if (!/^[0-9]{4}$/.test(code)) { erpToast('⚠️ كود الحساب لازم يكون 4 أرقام', 'warning'); return; }
  if (!name) { erpToast('⚠️ اكتب اسم الحساب', 'warning'); return; }
  var r = await supabaseClient.rpc('erp_add_account', { p_code: code, p_name: name, p_kind: kind });
  if (r.error) { erpToast('❌ ' + r.error.message + (r.error.message.includes('does not exist') ? ' — شغّل erp-phase5.sql أولاً' : ''), 'error'); return; }
  erpToast('✅ تمت إضافة الحساب ' + code + ' — ' + name);
  logAudit('حساب جديد', 'إضافة حساب: ' + code + ' — ' + name);
  document.getElementById('accCode').value = ''; document.getElementById('accName').value = '';
  loadExpenseAccounts();
};

window.expSave = async function(){
  var code = document.getElementById('expAccount').value;
  var amount = parseFloat(document.getElementById('expAmount').value) || 0;
  var party = (document.getElementById('expParty').value || '').trim();
  var memo = (document.getElementById('expMemo').value || '').trim();
  var payFrom = document.getElementById('expPayFrom').value;
  if (!code) { erpToast('⚠️ اختر حساب المصروف', 'warning'); return; }
  if (amount <= 0) { erpToast('⚠️ المبلغ لازم يكون أكبر من صفر', 'warning'); return; }
  if (!confirm('سيتم تسجيل مصروف بمبلغ ' + amount.toLocaleString() + ' ر.س\nالقيد: مدين ' + code + ' ← دائن ' + (payFrom === '1100' ? 'الخزينة' : 'البنك') + '\nمتابعة؟')) return;
  var r = await supabaseClient.rpc('erp_create_expense', { p_account_code: code, p_amount: amount, p_party: party || null, p_memo: memo || null, p_pay_from: payFrom });
  if (r.error) { erpToast('❌ ' + r.error.message + (r.error.message.includes('does not exist') ? ' — شغّل erp-phase5.sql أولاً' : ''), 'error'); return; }
  erpToast('✅ تم تسجيل المصروف رقم ' + r.data);
  logAudit('مصروف', 'مصروف رقم ' + r.data + ' — ' + code + ' — ' + amount + ' ر.س');
  document.getElementById('expAmount').value = ''; document.getElementById('expParty').value = ''; document.getElementById('expMemo').value = '';
  loadExpensesList();
};

window.loadExpensesList = async function(){
  var t = document.getElementById('expensesTable');
  if (!t) return;
  var r = await supabaseClient.from('erp_expenses').select('expense_number, account_code, party, amount, pay_from, memo, created_at').order('expense_number', {ascending: false}).limit(50);
  if (r.error) { t.innerHTML = '<tr><td colspan="7">⚠️ ' + (r.error.message.includes('does not exist') ? 'شغّل ملف erp-phase5.sql في SQL Editor أولاً' : r.error.message) + '</td></tr>'; return; }
  if (!r.data || !r.data.length) { t.innerHTML = '<tr><td colspan="7">لا توجد مصروفات بعد</td></tr>'; return; }
  t.innerHTML = r.data.map(function(x){
    return '<tr><td>' + x.expense_number + '</td><td>' + new Date(x.created_at).toLocaleDateString('ar-EG') + '</td><td>' + x.account_code + '</td><td>' + erpEsc(x.party || '—') + '</td><td style="font-weight:700;color:#EF4444">' + Number(x.amount).toLocaleString() + '</td><td>' + (x.pay_from === '1110' ? '🏦 بنك' : '💵 خزينة') + '</td><td>' + erpEsc(x.memo || '—') + '</td></tr>';
  }).join('');
};

/* 📊 الأرباح الشهرية */
window.loadErpMonthly = async function(){
  var t = document.getElementById('erpMonthlyTable');
  if (!t) return;
  var r = await supabaseClient.from('erp_v_monthly_pl').select('*');
  if (r.error || !r.data || !r.data.length) { t.innerHTML = '<tr><td colspan="4">' + (r.error ? (r.error.message.includes('does not exist') ? 'شغّل erp-phase5.sql لعرض الأرباح الشهرية' : r.error.message) : 'لا توجد بيانات بعد') + '</td></tr>'; return; }
  t.innerHTML = r.data.map(function(m){
    var net = Number(m.net_profit || 0);
    return '<tr><td dir="ltr">' + m.month + '</td><td style="color:#22C55E">' + Number(m.revenue).toLocaleString() + '</td><td style="color:#EF4444">' + Number(m.expenses).toLocaleString() + '</td><td style="font-weight:800;color:' + (net >= 0 ? '#22C55E' : '#EF4444') + '">' + net.toLocaleString() + ' ر.س</td></tr>';
  }).join('');
};

/* 📥 تصدير Excel */
window.erpExport = async function(what){
  if (typeof XLSX === 'undefined') { erpToast('⚠️ مكتبة Excel لم تُحمّل بعد — حدّث الصفحة', 'warning'); return; }
  var cfg = {
    journal: { name: 'دفتر_اليومية', head: ['رقم القيد','التاريخ','البيان','الحساب','الطرف','مدين','دائن'],
      fetch: async function(){
        var r = await supabaseClient.from('erp_journal_entries').select('entry_number, created_at, memo, erp_journal_lines(debit, credit, party, erp_accounts(code, name))').order('entry_number');
        var rows = [];
        (r.data || []).forEach(function(e){ (e.erp_journal_lines || []).forEach(function(l){
          rows.push([e.entry_number, new Date(e.created_at).toLocaleDateString('ar-EG'), e.memo || '', l.erp_accounts ? l.erp_accounts.code + ' — ' + l.erp_accounts.name : '', l.party || '', Number(l.debit), Number(l.credit)]);
        });});
        return rows;
      }},
    trial: { name: 'ميزان_المراجعة', head: ['الكود','الحساب','النوع','إجمالي مدين','إجمالي دائن','الرصيد'],
      fetch: async function(){
        var r = await supabaseClient.from('erp_v_trial_balance').select('*');
        return (r.data || []).map(function(a){ return [a.code, a.name, a.kind, Number(a.total_debit), Number(a.total_credit), Number(a.balance)]; });
      }},
    income: { name: 'قائمة_الدخل', head: ['البند','المبلغ'],
      fetch: async function(){
        var r = await supabaseClient.from('erp_v_income_statement').select('*');
        return (r.data || []).map(function(x){ return [x.line, Number(x.amount)]; });
      }},
    monthly: { name: 'الأرباح_الشهرية', head: ['الشهر','الإيرادات','المصروفات','صافي الربح'],
      fetch: async function(){
        var r = await supabaseClient.from('erp_v_monthly_pl').select('*');
        return (r.data || []).map(function(m){ return [m.month, Number(m.revenue), Number(m.expenses), Number(m.net_profit)]; });
      }}
  };
  var c = cfg[what];
  if (!c) return;
  erpToast('⏳ جاري تجهيز ملف Excel...');
  var rows = await c.fetch();
  var ws = XLSX.utils.aoa_to_sheet([c.head].concat(rows));
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, c.name);
  XLSX.writeFile(wb, c.name + '_' + new Date().toISOString().slice(0,10) + '.xlsx');
  erpToast('✅ تم تصدير ' + c.name + ' (' + rows.length + ' صف)');
  logAudit('تصدير Excel', 'تصدير تقرير: ' + c.name);
};


/* ============================================================
   📤 كشف آفاق اليومي — Batch Z2
   يصدّر فواتير اليوم/الفترة من store_orders مع حالة زاتكا من e_invoices
   كملف Excel (.xlsx عبر مكتبة XLSX المضمّنة، أو CSV UTF-8 BOM كفولباك)
   بأعمدة ثابتة تصلح للاستيراد في برنامج الحسابات الخارجي (آفاق)
   ============================================================ */
var afakyDailyState = null; /* { from, to, rows:[{...}], totals:{...} } */

function afakyDailyDefaultDates(){
  var d = new Date();
  var iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  var f = document.getElementById('afakyDailyFrom'), t = document.getElementById('afakyDailyTo');
  if (f && !f.value) f.value = iso;
  if (t && !t.value) t.value = iso;
}

/* تصنيف طريقة الدفع لخانات التوزيع: نقدي/COD / تحويل / إلكتروني */
function afakyDailyPayClass(method){
  var m = String(method || '').toLowerCase();
  if (/cod|نقد|كاش|عند الاستلام|الاستلام/.test(m)) return 'cod';
  if (/تحويل|transfer|bank/.test(m)) return 'transfer';
  if (m) return 'electronic';
  return 'cod';
}
var AFAKY_PAY_LABELS = { cod: 'نقدي/COD', transfer: 'تحويل بنكي', electronic: 'دفع إلكتروني' };

window.afakyDailyGenerate = async function(){
  var fEl = document.getElementById('afakyDailyFrom'), tEl = document.getElementById('afakyDailyTo');
  var tbody = document.getElementById('afakyDailyTable'), totalsBox = document.getElementById('afakyDailyTotals');
  if (!fEl || !tEl || !tbody) return;
  afakyDailyDefaultDates();
  var from = fEl.value, to = tEl.value;
  if (!from || !to) { erpToast('⚠️ اختر التاريخ أولاً', 'warning'); return; }
  if (to < from) { erpToast('⚠️ تاريخ «إلى» قبل «من» — صحّح الفترة', 'warning'); return; }

  tbody.innerHTML = '<tr><td colspan="11" class="admin-empty">⏳ جاري توليد الكشف...</td></tr>';
  var start = new Date(from + 'T00:00:00');
  var end = new Date(to + 'T00:00:00'); end.setDate(end.getDate() + 1); /* حصري — بداية اليوم التالي */

  var r = await supabaseClient.from('store_orders').select('*')
    .gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
    .order('created_at', { ascending: true });
  if (r.error) {
    tbody.innerHTML = '<tr><td colspan="11" class="admin-empty">❌ ' + erpEsc(r.error.message) + '</td></tr>';
    return;
  }
  var orders = r.data || [];

  /* حالة زاتكا لكل طلب من e_invoices */
  var zatcaByOrder = {};
  var ids = orders.map(function(o){ return o.id; }).filter(function(id){ return id != null; });
  if (ids.length) {
    var rz = await supabaseClient.from('e_invoices').select('order_id, uuid, status').in('order_id', ids);
    if (!rz.error && rz.data) rz.data.forEach(function(e){ zatcaByOrder[e.order_id] = e; });
  }

  var payDist = { cod: 0, transfer: 0, electronic: 0 };
  var payDistSum = { cod: 0, transfer: 0, electronic: 0 };
  var totals = { sales: 0, tax: 0, shipping: 0, count: 0, zatca: 0 };

  var rows = orders.map(function(o){
    var shipping = Number(o.shipping_fee != null ? o.shipping_fee : (o.shipping_cost || 0));
    var tax = Number(o.tax || 0);
    var total = Number(o.total || 0);
    var preTax = o.subtotal != null ? Number(o.subtotal) : (total - tax - shipping);
    var itemsCount = 0;
    if (Array.isArray(o.items)) itemsCount = o.items.reduce(function(a, it){ return a + (Number(it.qty) || 1); }, 0);
    var payKey = afakyDailyPayClass(o.payment_method);
    var z = zatcaByOrder[o.id] || null;
    var row = {
      date: new Date(o.created_at),
      ref: String(o.order_number || o.id),
      customer: o.customer_name || '—',
      items: itemsCount,
      preTax: preTax, tax: tax, shipping: shipping, total: total,
      payKey: payKey,
      payLabel: o.payment_method || AFAKY_PAY_LABELS[payKey],
      payStatus: o.payment_status || '—',
      zatcaUuid: z ? z.uuid : '',
      zatcaOk: !!z
    };
    totals.sales += preTax; totals.tax += tax; totals.shipping += shipping; totals.count++;
    if (z) totals.zatca++;
    payDist[payKey]++; payDistSum[payKey] += total;
    return row;
  });

  afakyDailyState = { from: from, to: to, rows: rows, totals: totals, payDist: payDist, payDistSum: payDistSum };

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="11" class="admin-empty">لا توجد فواتير في هذه الفترة</td></tr>';
  } else {
    tbody.innerHTML = rows.map(function(x){
      return '<tr>'
        + '<td><strong>' + erpEsc(x.ref) + '</strong></td>'
        + '<td dir="ltr">' + x.date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) + '</td>'
        + '<td>' + erpEsc(x.customer) + '</td>'
        + '<td>' + x.items + '</td>'
        + '<td>' + x.preTax.toLocaleString() + '</td>'
        + '<td>' + x.tax.toLocaleString() + '</td>'
        + '<td>' + x.shipping.toLocaleString() + '</td>'
        + '<td style="font-weight:700">' + x.total.toLocaleString() + '</td>'
        + '<td>' + erpEsc(x.payLabel) + '</td>'
        + '<td>' + erpEsc(x.payStatus) + '</td>'
        + '<td>' + (x.zatcaOk ? '✅' : '—') + '</td>'
        + '</tr>';
    }).join('');
  }

  var grand = totals.sales + totals.tax + totals.shipping;
  totalsBox.innerHTML = '<div style="display:flex;gap:10px;flex-wrap:wrap">'
    + '<span class="erp-in" style="background:rgba(34,197,94,.12);font-weight:700">🧾 عدد الفواتير: ' + totals.count + ' (زاتكا: ' + totals.zatca + ')</span>'
    + '<span class="erp-in" style="font-weight:700">💰 المبيعات قبل الضريبة: ' + totals.sales.toLocaleString() + ' ر.س</span>'
    + '<span class="erp-in" style="font-weight:700">🧮 الضريبة: ' + totals.tax.toLocaleString() + ' ر.س</span>'
    + '<span class="erp-in" style="font-weight:700">🚚 الشحن: ' + totals.shipping.toLocaleString() + ' ر.س</span>'
    + '<span class="erp-in" style="background:rgba(14,165,233,.12);font-weight:800">📊 الإجمالي: ' + grand.toLocaleString() + ' ر.س</span>'
    + '</div><div style="margin-top:8px;font-weight:700">💳 توزيع طرق الدفع: '
    + 'نقدي/COD: ' + payDist.cod + ' (' + payDistSum.cod.toLocaleString() + ' ر.س) — '
    + 'تحويل: ' + payDist.transfer + ' (' + payDistSum.transfer.toLocaleString() + ' ر.س) — '
    + 'إلكتروني: ' + payDist.electronic + ' (' + payDistSum.electronic.toLocaleString() + ' ر.س)'
    + '</div>';
  logAudit('كشف آفاق اليومي', 'توليد كشف للفترة ' + from + ' — ' + to + ' (' + rows.length + ' فاتورة)');
};

var AFAKY_DAILY_HEAD = ['التاريخ', 'رقم_الفاتورة', 'العميل', 'الإجمالي_قبل_الضريبة', 'الضريبة', 'الشحن', 'الإجمالي', 'طريقة_الدفع', 'الحالة', 'رقم_زاتكا_UUID'];

function afakyDailyAoa(){
  var s = afakyDailyState;
  return [AFAKY_DAILY_HEAD].concat(s.rows.map(function(x){
    return [
      x.date.getFullYear() + '-' + String(x.date.getMonth() + 1).padStart(2, '0') + '-' + String(x.date.getDate()).padStart(2, '0'),
      x.ref, x.customer,
      Number(x.preTax.toFixed(2)), Number(x.tax.toFixed(2)), Number(x.shipping.toFixed(2)), Number(x.total.toFixed(2)),
      x.payLabel, x.payStatus, x.zatcaUuid
    ];
  }));
}

window.afakyDailyExport = function(){
  if (!afakyDailyState || !afakyDailyState.rows.length) { erpToast('⚠️ ولّد الكشف أولاً باختيار التاريخ والضغط على «توليد الكشف»', 'warning'); return; }
  var aoa = afakyDailyAoa();
  var fname = 'afaky-daily-' + afakyDailyState.from + '_' + afakyDailyState.to;
  if (typeof XLSX !== 'undefined') {
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'كشف_آفاق_اليومي');
    XLSX.writeFile(wb, fname + '.xlsx');
  } else {
    /* فولباك: CSV بترميز UTF-8 BOM ليفتح العربي في Excel */
    var lines = aoa.map(function(row){
      return row.map(function(c){
        c = String(c == null ? '' : c);
        return /[",\r\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join(',');
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = fname + '.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  erpToast('✅ تم تصدير الكشف (' + afakyDailyState.rows.length + ' فاتورة)');
  logAudit('تصدير كشف آفاق', 'تصدير ' + afakyDailyState.rows.length + ' فاتورة للفترة ' + afakyDailyState.from + ' — ' + afakyDailyState.to);
};

window.afakyDailyPrintSummary = function(){
  if (!afakyDailyState) { erpToast('⚠️ ولّد الكشف أولاً', 'warning'); return; }
  var s = afakyDailyState, t = s.totals;
  var grand = t.sales + t.tax + t.shipping;
  var html = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>ملخص يومي — آفاق</title>'
    + '<style>body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}'
    + 'td,th{border:1px solid #999;padding:8px;text-align:right}th{background:#eee}@media print{button{display:none}}</style></head><body>'
    + '<h1>🧾 ملخص المبيعات اليومي — للمحاسبة (آفاق)</h1>'
    + '<p>الفترة: <strong dir="ltr">' + erpEsc(s.from) + ' — ' + erpEsc(s.to) + '</strong> &nbsp;|&nbsp; تاريخ الطباعة: ' + new Date().toLocaleString('ar-EG') + '</p>'
    + '<table><tbody>'
    + '<tr><th>عدد الفواتير</th><td>' + t.count + '</td></tr>'
    + '<tr><th>فواتير زاتكا المعتمدة</th><td>' + t.zatca + '</td></tr>'
    + '<tr><th>إجمالي المبيعات قبل الضريبة</th><td>' + t.sales.toLocaleString() + ' ر.س</td></tr>'
    + '<tr><th>ضريبة القيمة المضافة (15%)</th><td>' + t.tax.toLocaleString() + ' ر.س</td></tr>'
    + '<tr><th>إجمالي الشحن</th><td>' + t.shipping.toLocaleString() + ' ر.س</td></tr>'
    + '<tr><th>الإجمالي العام</th><td><strong>' + grand.toLocaleString() + ' ر.س</strong></td></tr>'
    + '<tr><th>توزيع طرق الدفع</th><td>نقدي/COD: ' + s.payDist.cod + ' (' + s.payDistSum.cod.toLocaleString() + ' ر.س) — تحويل: ' + s.payDist.transfer + ' (' + s.payDistSum.transfer.toLocaleString() + ' ر.س) — إلكتروني: ' + s.payDist.electronic + ' (' + s.payDistSum.electronic.toLocaleString() + ' ر.س)</td></tr>'
    + '</tbody></table>'
    + '<p style="margin-top:24px">توقيع المستلم: ______________________</p>'
    + '<button onclick="window.print()">🖨️ طباعة</button>'
    + '<script>window.onload=function(){window.print();}<\/script></body></html>';
  var w = window.open('', '_blank');
  if (!w) { erpToast('⚠️ المتصفح منع النافذة المنبثقة — اسمح بها وأعد المحاولة', 'warning'); return; }
  w.document.write(html); w.document.close();
  logAudit('ملخص يومي آفاق', 'طباعة ملخص للفترة ' + s.from + ' — ' + s.to);
};

window.erpEsc = erpEsc;
window.erpToast = erpToast;

})();
