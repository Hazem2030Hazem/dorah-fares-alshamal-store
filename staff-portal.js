/* ═══════════════════════════════════════════════════════════════
   Batch P — staff-portal.js (بوابات دخول الموظفين بأدوار)
   جزآن في ملف واحد (بلا build step):
   • منطق نقي قابل للاختبار في Node: g.STAFF_PURE / module.exports:
     hashPassword (salt$sha256 مطابق لصيغة SQL)، lockState (قفل
     المحاولات)، sessionExpiry/isSessionValid (12 ساعة)، مصفوفة
     صلاحيات الأدوار ROLE_PERMS + can()، menusForRole (القائمة
     الجانبية من الدور)، makeToken.
   • واجهات المتصفح: دخول موحّد + SPA بأقسام حسب الدور.
   الصلاحيات: لا جلسة Supabase للموظف — كل العمليات عبر RPCs
   staff_* بتوكن staff_sessions، وكل RPC تعيد التحقق من الدور
   سيرفرياً (انظر store-staff.sql) — تغيير الـ JS لا يتجاوز شيئاً.
   ═══════════════════════════════════════════════════════════════ */
(function (g) {
'use strict';

/* ─────────── منطق نقي ١: هاش كلمة المرور (مطابق store-staff.sql) ───────────
   salt$hex(sha256(salt + ':' + password)) — لا تخزين صريح أبداً */
function sha256HexSync(str) {
  // متصفح: لا SHA-256 تزامني — يُستخدم في Node للاختبارات فقط
  if (typeof require === 'function') {
    return require('crypto').createHash('sha256').update(String(str), 'utf8').digest('hex');
  }
  throw new Error('sha256HexSync متاح في Node فقط');
}
function hashPassword(salt, password) {
  return String(salt) + '$' + sha256HexSync(String(salt) + ':' + String(password == null ? '' : password));
}
function verifyPassword(stored, password) {
  const salt = String(stored || '').split('$')[0];
  if (!salt) return false;
  return hashPassword(salt, password) === stored;
}
function isValidUsername(u) { return /^[a-z0-9_.]{3,30}$/.test(String(u || '')); }
function isValidRole(r) { return ['manager', 'accountant', 'biller', 'hr', 'viewer'].indexOf(r) >= 0; }
function makeToken() {
  // 48 hex عشوائي (مطابق gen_random_bytes(24) في SQL)
  if (typeof require === 'function') return require('crypto').randomBytes(24).toString('hex');
  const b = new Uint8Array(24); g.crypto.getRandomValues(b);
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/* ─────────── منطق نقي ٢: قفل المحاولات (5 محاولات ⇒ 5 دقائق) ─────────── */
const MAX_ATTEMPTS = 5, LOCK_MINUTES = 5;
function lockState(failedAttempts, lockedUntilIso, nowIso) {
  const now = new Date(nowIso || Date.now());
  const lockedUntil = lockedUntilIso ? new Date(lockedUntilIso) : null;
  if (lockedUntil && lockedUntil > now) {
    return { locked: true, remainingMinutes: Math.ceil((lockedUntil - now) / 60000) };
  }
  return { locked: false,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - (Number(failedAttempts) || 0)) };
}
// ما يجب أن يحدث بعد محاولة فاشلة رقم n
function nextLockState(failedAttempts, nowIso) {
  const n = (Number(failedAttempts) || 0) + 1;
  if (n >= MAX_ATTEMPTS) {
    const until = new Date(new Date(nowIso || Date.now()).getTime() + LOCK_MINUTES * 60000);
    return { failed_attempts: n, locked_until: until.toISOString(), locked: true };
  }
  return { failed_attempts: n, locked_until: null, locked: false };
}

/* ─────────── منطق نقي ٣: الجلسة (12 ساعة) ─────────── */
const SESSION_HOURS = 12;
function sessionExpiry(createdIso) {
  return new Date(new Date(createdIso).getTime() + SESSION_HOURS * 3600000).toISOString();
}
function isSessionValid(createdIso, nowIso) {
  if (!createdIso) return false;
  return new Date(sessionExpiry(createdIso)) > new Date(nowIso || Date.now());
}

/* ─────────── منطق نقي ٤: مصفوفة صلاحيات الأدوار (مرآة store-staff.sql) ─────────── */
const ROLE_PERMS = {
  manager:    ['dashboard', 'orders', 'einvoice', 'vouchers', 'journal', 'expenses',
               'reports', 'trial_balance', 'aging', 'payroll', 'audit'],
  accountant: ['vouchers', 'journal', 'expenses', 'reports', 'trial_balance', 'aging'],
  biller:     ['orders', 'einvoice'],
  hr:         ['payroll'],
  viewer:     ['reports'],
};
function can(role, action) {
  return (ROLE_PERMS[role] || []).indexOf(action) >= 0;
}
/* القائمة الجانبية لكل دور — تُبنى من هذا الجدول فقط */
const MENU_DEFS = [
  { id: 'dashboard', icon: '📊', label: 'لوحة المؤشرات', perm: 'dashboard' },
  { id: 'orders',    icon: '🧾', label: 'الطلبات والفوترة', perm: 'orders' },
  { id: 'einvoices', icon: '⚡', label: 'فواتير اليوم', perm: 'einvoice' },
  { id: 'vouchers',  icon: '💰', label: 'سندات قبض/صرف', perm: 'vouchers' },
  { id: 'journal',   icon: '📒', label: 'قيد يدوي', perm: 'journal' },
  { id: 'expenses',  icon: '🧾', label: 'المصروفات', perm: 'expenses' },
  { id: 'reports',   icon: '📈', label: 'التقارير', perm: 'reports' },
  { id: 'payroll',   icon: '👥', label: 'الرواتب (عرض)', perm: 'payroll' },
  { id: 'audit',     icon: '🕒', label: 'سجل المراجعة', perm: 'audit' },
];
function menusForRole(role) {
  return MENU_DEFS.filter(m => can(role, m.perm)).map(m => m.id);
}
const ROLE_LABELS = { manager: '👔 مدير', accountant: '📒 محاسب', biller: '🧾 مفوتر',
                      hr: '👥 موارد بشرية', viewer: '👤 عرض' };

const STAFF_PURE = { hashPassword, verifyPassword, isValidUsername, isValidRole, makeToken,
  MAX_ATTEMPTS, LOCK_MINUTES, lockState, nextLockState,
  SESSION_HOURS, sessionExpiry, isSessionValid,
  ROLE_PERMS, can, MENU_DEFS, menusForRole, ROLE_LABELS };
g.STAFF_PURE = STAFF_PURE;
if (typeof module !== 'undefined' && module.exports) module.exports = STAFF_PURE;

/* ═══════════════════════════════════════════════════════════════
   الجزء الثاني — واجهات المتصفح (لا تعمل في Node)
   ═══════════════════════════════════════════════════════════════ */
if (typeof document === 'undefined') return;

const SUPABASE_URL = 'https://kcbmvxuzjlaooknwhqqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjYm12eHV6amxhb29rbndocXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NzkyMjAsImV4cCI6MjA5OTU1NTIyMH0.ayDpkfCKL90GcUKjbHQs7OvS5sxF1VSraWg58NHJ7ek';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function toast(msg, ok) {
  const t = $('staff-toast');
  t.textContent = msg;
  t.className = 'show ' + (ok === false ? 'err' : 'ok');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => { t.className = ''; }, 3500);
}

/* ─── الجلسة ─── */
const LS_KEY = 'staff_portal_session';
let S = null; // {token, role, name, username, loginAt}
function saveSession() { localStorage.setItem(LS_KEY, JSON.stringify(S)); }
function loadSession() {
  try { S = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (_) { S = null; }
  if (S && !STAFF_PURE.isSessionValid(S.loginAt)) {
    S = null; localStorage.removeItem(LS_KEY);
    return 'expired';
  }
  return S ? 'ok' : 'none';
}
async function rpc(fn, args) {
  const r = await sb.rpc(fn, args || {});
  if (r.error) {
    if (/جلسة|الجلسة/.test(r.error.message)) { forceLogout('انتهت الجلسة — سجّل الدخول مجدداً'); }
    throw new Error(r.error.message);
  }
  return r.data;
}
function forceLogout(msg) {
  S = null; localStorage.removeItem(LS_KEY);
  $('portal').style.display = 'none';
  $('staff-login').style.display = 'flex';
  if (msg) { $('login-err').textContent = '⏰ ' + msg; $('login-err').style.display = 'block'; }
}

/* ─── الدخول ─── */
async function doLogin() {
  const u = $('login-user').value.trim(), p = $('login-pass').value;
  const err = $('login-err'); err.style.display = 'none';
  if (!u || !p) { err.textContent = '⚠️ أدخل اسم المستخدم وكلمة المرور'; err.style.display = 'block'; return; }
  $('login-btn').disabled = true;
  try {
    const r = await sb.rpc('staff_login', {
      p_username: u, p_password: p, p_ip: null, p_ua: navigator.userAgent });
    if (r.error) throw new Error(r.error.message);
    const d = r.data || {};
    if (!d.ok) {
      err.textContent = '❌ ' + (d.error || 'فشل الدخول') +
        (d.remaining != null ? ' (متبقٍ ' + d.remaining + ' محاولات)' : '');
      err.style.display = 'block';
      return;
    }
    S = { token: d.token, role: d.role, name: d.name, username: d.username,
          loginAt: new Date().toISOString() };
    saveSession();
    enterPortal();
  } catch (e) {
    err.textContent = '❌ ' + e.message + ' — هل نفّذت store-staff.sql؟';
    err.style.display = 'block';
  } finally { $('login-btn').disabled = false; }
}
async function doLogout() {
  try { if (S) await sb.rpc('staff_logout', { p_token: S.token }); } catch (_) {}
  forceLogout(null);
}

/* ─── دخول البوابة وبناء القائمة من الدور ─── */
async function enterPortal() {
  // تحقق سيرفي عند كل تحميل
  try {
    const v = await rpc('staff_validate', { p_token: S.token });
    if (!v || !v.ok) return forceLogout('الجلسة غير صالحة');
    S.role = v.role; S.name = v.name; saveSession();
  } catch (e) { return; } // forceLogout تم داخل rpc
  $('staff-login').style.display = 'none';
  $('portal').style.display = 'flex';
  $('hdr-name').textContent = S.name || S.username;
  $('hdr-role').textContent = STAFF_PURE.ROLE_LABELS[S.role] || S.role;
  // بناء القائمة الجانبية من الدور
  const nav = $('side-nav');
  const menus = STAFF_PURE.menusForRole(S.role);
  nav.innerHTML = STAFF_PURE.MENU_DEFS.filter(m => menus.indexOf(m.id) >= 0).map(m =>
    '<button class="nav-btn" data-sec="' + m.id + '" onclick="staffShow(\'' + m.id + '\')">' +
    m.icon + ' ' + m.label + '</button>').join('');
  // إخفاء كل الأقسام غير المسموحة (دفاع واجهة — السيرفر يتحقق أيضاً)
  document.querySelectorAll('.sec').forEach(s => {
    s.style.display = menus.indexOf(s.id.replace('sec-', '')) >= 0 ? 'none' : 'none';
  });
  staffShow(menus[0]);
}
function staffShow(id) {
  if (!S || STAFF_PURE.menusForRole(S.role).indexOf(id) < 0) {
    return toast('⛔ صلاحية غير كافية', false);
  }
  document.querySelectorAll('.sec').forEach(s => { s.style.display = 'none'; });
  const el = $('sec-' + id); if (el) el.style.display = 'block';
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.getAttribute('data-sec') === id));
  ({ dashboard: loadDashboard, orders: loadOrders, einvoices: loadEInvoices,
     vouchers: loadVouchers, expenses: loadExpenses, payroll: loadPayroll,
     audit: loadAudit, reports: loadDailyReport }[id] || function () {})();
}

/* ─── 🧾 المفوتر: الطلبات ─── */
async function loadOrders() {
  const tb = $('orders-tb');
  tb.innerHTML = '<tr><td colspan="7">⏳ جاري التحميل...</td></tr>';
  try {
    const rows = await rpc('staff_list_orders', { p_token: S.token, p_limit: 60 });
    tb.innerHTML = (rows || []).map(o =>
      '<tr><td><b>' + esc(o.order_number || o.id) + '</b></td>' +
      '<td>' + esc(o.customer_name || '—') + '</td>' +
      '<td>' + money(o.total) + '</td>' +
      '<td>' + esc(o.payment_method || '—') + '</td>' +
      '<td>' + esc(o.status || '—') + '</td>' +
      '<td>' + new Date(o.created_at).toLocaleString('ar-SA') + '</td>' +
      '<td style="white-space:nowrap">' +
        (o.einvoice
          ? '<span style="color:#34D399;font-weight:700">⚡ ' + esc(o.einvoice.status) + '</span> ' +
            '<button class="btn" onclick="printEinvoice(\'' + o.einvoice.id + '\')">🖨️ طباعة</button>'
          : '<button class="btn primary" onclick="issueEinvoice(' + o.id + ')">⚡ إصدار فاتورة معتمدة</button>') +
      '</td></tr>').join('') || '<tr><td colspan="7">لا توجد طلبات</td></tr>';
  } catch (e) { tb.innerHTML = '<tr><td colspan="7">❌ ' + esc(e.message) + '</td></tr>'; }
}

/* ─── ⚡ إصدار فاتورة معتمدة (يعيد استخدام منطق zatca-store.js النقي) ─── */
let _zcfg = null;
async function issueEinvoice(orderId) {
  const Z = window.ZATCA;
  if (!Z) return toast('❌ مكتبة زاتكا غير محمّلة', false);
  toast('⏳ جاري الإصدار...');
  try {
    if (!_zcfg) _zcfg = await rpc('staff_einvoice_context', { p_token: S.token });
    if (!_zcfg || !_zcfg.vat_number) {
      return toast('⚠️ إعدادات المنشأة غير مكتملة — أكملها من لوحة الأدمن (تبويب زاتكا)', false);
    }
    const order = await rpc('staff_order_details', { p_token: S.token, p_order_id: orderId });
    if (!order || order.error) return toast('❌ تعذر تحميل الطلب', false);
    let items = order.items;
    if (typeof items === 'string') { try { items = JSON.parse(items); } catch (_) { items = null; } }
    const lines = (Array.isArray(items) ? items : []).map(it => ({
      name: it.name || it.title || 'صنف', qty: Number(it.qty || it.quantity) || 1,
      price: Number(it.price) || 0, tax_category: 'standard' }));
    const shipFee = Number(order.shipping_fee) || 0;
    if (shipFee > 0) lines.push({ name: 'رسوم الشحن والتوصيل', qty: 1, price: shipFee, tax_category: 'standard' });
    if (!lines.length) return toast('❌ لا توجد أصناف في الطلب', false);

    const dt = new Date(order.created_at || Date.now());
    const uuid = Z.uuidV4();
    const icv = (Number(_zcfg.last_icv) || 0) + 1;
    const pih = _zcfg.last_hash || Z.FIRST_PIH;
    const xml = Z.buildInvoiceXml({
      number: String(order.order_number || order.id), uuid,
      issueDate: dt.toISOString().slice(0, 10), issueTime: dt.toISOString().slice(11, 19),
      docType: '388', subType: 'simplified', icv, pih,
      seller: { name: _zcfg.org_name || 'شركة درة فارس الشمال للتجارة', vat: _zcfg.vat_number,
        cr: _zcfg.cr_number || '', city: _zcfg.city || '', district: _zcfg.district || '',
        street: _zcfg.street || '', postal: _zcfg.postal_code || '', building: _zcfg.building_no || '' },
      buyer: { name: order.customer_name || 'عميل نقدي' }, lines });
    const hash = await Z.computeInvoiceHash(xml);
    let signature = null;
    if (_zcfg.private_key_jwk) {
      try { signature = await Z.signInvoiceHash(hash, _zcfg.private_key_jwk); } catch (_) {}
    }
    const tlv = Z.zatcaTLV({
      seller: _zcfg.org_name || 'شركة درة فارس الشمال للتجارة', vat: _zcfg.vat_number,
      timestamp: dt.toISOString(),
      total: lines.reduce((a, l) => a + l.qty * l.price, 0).toFixed(2),
      tax: lines.reduce((a, l) => a + Z.lineTax(l.qty * l.price, l.tax_category), 0).toFixed(2),
      hash, signature, pubkey: _zcfg.public_key });
    const saved = await rpc('staff_save_einvoice', { p_token: S.token, p_rec: {
      order_id: order.id, order_ref: String(order.order_number || order.id), uuid, icv,
      invoice_hash: hash, pih, xml, qr_tlv: tlv, signature,
      public_key: _zcfg.public_key || null, doc_type: '388', invoice_kind: 'simplified' } });
    _zcfg.last_icv = saved.icv; _zcfg.last_hash = hash;
    toast('✅ صدرت الفاتورة (ICV ' + saved.icv + ') — QR مرحلة 1');
    printEinvoice(saved.id);
    loadOrders();
  } catch (e) { toast('❌ ' + e.message, false); }
}

async function printEinvoice(id) {
  try {
    const ei = await rpc('staff_get_einvoice', { p_token: S.token, p_id: id });
    if (!ei) return toast('❌ الفاتورة غير موجودة', false);
    const w = window.open('', '_blank');
    if (!w) return toast('⚠️ اسمح بالنوافذ المنبثقة', false);
    w.document.write('<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>فاتورة ' + esc(ei.order_ref) + '</title>' +
      '<style>body{font-family:Tahoma,Arial;max-width:640px;margin:20px auto;padding:20px}' +
      'h2{color:#1D4ED8}.row{display:flex;justify-content:space-between;margin:6px 0}' +
      'canvas{display:block;margin:16px auto}button{padding:10px 24px;font-size:15px;cursor:pointer}' +
      'pre{direction:ltr;text-align:left;font-size:10px;background:#f5f5f5;padding:8px;overflow:auto}</style></head><body>' +
      '<h2>⚡ فاتورة إلكترونية — ' + (ei.invoice_kind === 'standard' ? 'قياسية B2B' : 'مبسطة B2C') + '</h2>' +
      '<div class="row"><span>مرجع الطلب:</span><b>' + esc(ei.order_ref) + '</b></div>' +
      '<div class="row"><span>ICV:</span><b>' + ei.icv + '</b></div>' +
      '<div class="row"><span>الحالة:</span><b>' + esc(ei.status) + '</b></div>' +
      '<div class="row"><span>التاريخ:</span><b>' + new Date(ei.created_at).toLocaleString('ar-SA') + '</b></div>' +
      '<canvas id="q"></canvas><pre>' + esc(ei.uuid) + '</pre>' +
      '<div style="text-align:center"><button onclick="print()">🖨️ طباعة</button></div>' +
      '<script src="zatca-store.js"><\/script>' +
      '<script>ZATCA.drawQrToCanvas(document.getElementById("q"), ' + JSON.stringify(ei.qr_tlv) + ', 5);<\/script>' +
      '</body></html>');
    w.document.close();
  } catch (e) { toast('❌ ' + e.message, false); }
}

/* ─── فواتير اليوم ─── */
async function loadEInvoices() {
  const tb = $('einv-tb');
  tb.innerHTML = '<tr><td colspan="6">⏳ جاري التحميل...</td></tr>';
  try {
    const rows = await rpc('staff_list_einvoices', { p_token: S.token, p_today: true });
    const lbl = { draft: 'مسودة', reported: 'مُبلَّغة ✅', cleared: 'مُصدَّقة ✅', failed: 'فاشلة ❌' };
    tb.innerHTML = (rows || []).map(e =>
      '<tr><td>' + e.icv + '</td><td><b>' + esc(e.order_ref || '—') + '</b></td>' +
      '<td dir="ltr" style="font-family:monospace;font-size:11px">' + esc(String(e.uuid || '').slice(0, 13)) + '…</td>' +
      '<td>' + (e.invoice_kind === 'standard' ? 'قياسية' : 'مبسطة') + '</td>' +
      '<td><b>' + (lbl[e.status] || e.status) + '</b></td>' +
      '<td><button class="btn" onclick="printEinvoice(\'' + e.id + '\')">🖨️ عرض/طباعة</button></td></tr>'
    ).join('') || '<tr><td colspan="6">لا توجد فواتير اليوم</td></tr>';
  } catch (e) { tb.innerHTML = '<tr><td colspan="6">❌ ' + esc(e.message) + '</td></tr>'; }
}

/* ─── 💰 السندات ─── */
async function saveVoucher(type) {
  const party = $('vou-party').value.trim();
  const amount = Number($('vou-amount').value) || 0;
  const memo = $('vou-memo').value.trim();
  try {
    const r = await rpc('staff_voucher', { p_token: S.token, p_type: type,
      p_party: party, p_amount: amount, p_memo: memo || null });
    toast('✅ سند ' + (type === 'receipt' ? 'قبض' : 'صرف') + ' رقم ' + r.voucher_number +
      (r.journal_entry ? ' — قيد ' + r.journal_entry : ''));
    $('vou-party').value = ''; $('vou-amount').value = ''; $('vou-memo').value = '';
    loadVouchers();
  } catch (e) { toast('❌ ' + e.message, false); }
}
async function loadVouchers() {
  const tb = $('vou-tb');
  try {
    const rows = await rpc('staff_list_vouchers', { p_token: S.token, p_limit: 50 });
    tb.innerHTML = (rows || []).map(v =>
      '<tr><td>' + v.voucher_number + '</td>' +
      '<td style="color:' + (v.voucher_type === 'receipt' ? '#34D399' : '#F87171') + ';font-weight:700">' +
        (v.voucher_type === 'receipt' ? '📥 قبض' : '📤 صرف') + '</td>' +
      '<td>' + new Date(v.created_at).toLocaleDateString('ar-SA') + '</td>' +
      '<td>' + esc(v.party) + '</td><td style="font-weight:700">' + money(v.amount) + '</td>' +
      '<td>' + esc(v.memo || '—') + '</td></tr>'
    ).join('') || '<tr><td colspan="6">لا توجد سندات</td></tr>';
  } catch (e) { tb.innerHTML = '<tr><td colspan="6">❌ ' + esc(e.message) + '</td></tr>'; }
}

/* ─── 📒 قيد يدوي ─── */
function journalAddLine() {
  const box = $('j-lines');
  const div = document.createElement('div');
  div.className = 'j-line';
  div.innerHTML = '<input class="in j-code" placeholder="كود الحساب" dir="ltr" style="width:100px">' +
    '<input class="in j-name" placeholder="اسم الحساب (للإنشاء التلقائي)">' +
    '<input class="in j-debit" placeholder="مدين" type="number" step="0.01" dir="ltr" style="width:100px">' +
    '<input class="in j-credit" placeholder="دائن" type="number" step="0.01" dir="ltr" style="width:100px">' +
    '<input class="in j-party" placeholder="طرف (اختياري)">' +
    '<button class="btn" onclick="this.parentElement.remove()">✖</button>';
  box.appendChild(div);
}
async function saveJournal() {
  const memo = $('j-memo').value.trim();
  const lines = [...document.querySelectorAll('#j-lines .j-line')].map(d => ({
    account_code: d.querySelector('.j-code').value.trim(),
    account_name: d.querySelector('.j-name').value.trim(),
    kind: 'expense',
    debit: Number(d.querySelector('.j-debit').value) || 0,
    credit: Number(d.querySelector('.j-credit').value) || 0,
    party: d.querySelector('.j-party').value.trim() || null,
  })).filter(l => l.account_code && (l.debit || l.credit));
  try {
    const r = await rpc('staff_post_journal', { p_token: S.token, p_memo: memo, p_lines: lines });
    toast('✅ رُحّل القيد رقم ' + r.entry_number);
    $('j-memo').value = ''; $('j-lines').innerHTML = '';
  } catch (e) { toast('❌ ' + e.message, false); }
}

/* ─── 🧾 المصروفات ─── */
async function saveExpense() {
  try {
    const r = await rpc('staff_add_expense', { p_token: S.token,
      p_category: $('exp-cat').value.trim(),
      p_amount: Number($('exp-amount').value) || 0,
      p_vendor: $('exp-vendor').value.trim() || null,
      p_memo: $('exp-memo').value.trim() || null,
      p_account_code: '5900',
      p_pay_from: $('exp-payfrom').value });
    toast('✅ سُجّل المصروف' + (r.journal_entry ? ' — قيد ' + r.journal_entry : ''));
    $('exp-cat').value = ''; $('exp-amount').value = ''; $('exp-vendor').value = ''; $('exp-memo').value = '';
    loadExpenses();
  } catch (e) { toast('❌ ' + e.message, false); }
}
async function loadExpenses() {
  const tb = $('exp-tb');
  try {
    const rows = await rpc('staff_list_expenses', { p_token: S.token, p_limit: 50 });
    tb.innerHTML = (rows || []).map(e =>
      '<tr><td>' + esc(e.expense_date) + '</td><td>' + esc(e.category) + '</td>' +
      '<td>' + esc(e.vendor || '—') + '</td><td style="font-weight:700">' + money(e.amount) + '</td>' +
      '<td>' + (e.pay_from === '1110' ? '🏦 بنك' : '💵 خزينة') + '</td>' +
      '<td>' + esc(e.memo || '—') + '</td></tr>'
    ).join('') || '<tr><td colspan="6">لا توجد مصروفات</td></tr>';
  } catch (e) { tb.innerHTML = '<tr><td colspan="6">❌ ' + esc(e.message) + '</td></tr>'; }
}

/* ─── 📈 التقارير ─── */
async function loadDailyReport() {
  const box = $('rep-daily');
  const d = $('rep-date').value || new Date().toISOString().slice(0, 10);
  box.innerHTML = '⏳ ...';
  try {
    const r = await rpc('staff_report_daily', { p_token: S.token, p_date: d });
    const methods = Object.keys(r.by_method || {}).map(k =>
      '<span class="chip">' + esc(k) + ': <b>' + money(r.by_method[k]) + '</b></span>').join(' ');
    box.innerHTML = '<div class="cards">' +
      '<div class="card"><div class="c-lbl">مبيعات ' + esc(r.date) + '</div><div class="c-val">' + money(r.sales_total) + ' ر.س</div></div>' +
      '<div class="card"><div class="c-lbl">عدد الطلبات</div><div class="c-val">' + r.orders_count + '</div></div>' +
      '<div class="card"><div class="c-lbl">الضريبة</div><div class="c-val">' + money(r.tax_total) + '</div></div>' +
      '<div class="card"><div class="c-lbl">فواتير إلكترونية</div><div class="c-val">' + r.einvoices_count + '</div></div>' +
      '</div><div style="margin-top:8px">' + methods + '</div>';
  } catch (e) { box.innerHTML = '❌ ' + esc(e.message); }
}
async function loadTrialBalance() {
  const tb = $('rep-tb-tb');
  tb.innerHTML = '<tr><td colspan="5">⏳ ...</td></tr>';
  try {
    const rows = await rpc('staff_report_trial_balance', { p_token: S.token });
    tb.innerHTML = (rows || []).map(a =>
      '<tr><td dir="ltr">' + esc(a.code) + '</td><td>' + esc(a.name) + '</td><td>' + esc(a.kind) + '</td>' +
      '<td>' + money(a.debit) + '</td><td>' + money(a.credit) + '</td>' +
      '<td style="font-weight:700;color:' + (a.balance >= 0 ? '#34D399' : '#F87171') + '">' + money(a.balance) + '</td></tr>'
    ).join('') || '<tr><td colspan="6">لا حركات بعد</td></tr>';
  } catch (e) { tb.innerHTML = '<tr><td colspan="6">❌ ' + esc(e.message) + '</td></tr>'; }
}
async function loadIncome() {
  const box = $('rep-income');
  try {
    const r = await rpc('staff_report_income', { p_token: S.token,
      p_from: $('rep-from').value || null, p_to: $('rep-to').value || null });
    box.innerHTML = '<div class="cards">' +
      '<div class="card"><div class="c-lbl">الإيرادات (' + esc(r.from) + ' ← ' + esc(r.to) + ')</div><div class="c-val" style="color:#34D399">' + money(r.revenue) + '</div></div>' +
      '<div class="card"><div class="c-lbl">المصروفات</div><div class="c-val" style="color:#F87171">' + money(r.expenses) + '</div></div>' +
      '<div class="card"><div class="c-lbl">صافي الربح</div><div class="c-val" style="color:' + (r.net >= 0 ? '#34D399' : '#F87171') + '">' + money(r.net) + '</div></div></div>' +
      '<table style="margin-top:10px"><thead><tr><th>الكود</th><th>الحساب</th><th>النوع</th><th>المبلغ</th></tr></thead><tbody>' +
      (r.lines || []).map(l => '<tr><td dir="ltr">' + esc(l.code) + '</td><td>' + esc(l.name) + '</td>' +
        '<td>' + (l.kind === 'revenue' ? 'إيراد' : 'مصروف') + '</td><td>' + money(l.amount) + '</td></tr>').join('') +
      '</tbody></table>';
  } catch (e) { box.innerHTML = '❌ ' + esc(e.message); }
}
async function loadAging() {
  const box = $('rep-aging');
  try {
    const r = await rpc('staff_report_aging', { p_token: S.token });
    const b = r.buckets || {};
    box.innerHTML = '<div class="cards">' +
      '<div class="card"><div class="c-lbl">0-30 يوم</div><div class="c-val">' + money(b.b0_30) + '</div></div>' +
      '<div class="card"><div class="c-lbl">31-60 يوم</div><div class="c-val">' + money(b.b31_60) + '</div></div>' +
      '<div class="card"><div class="c-lbl">61-90 يوم</div><div class="c-val">' + money(b.b61_90) + '</div></div>' +
      '<div class="card"><div class="c-lbl">+90 يوم</div><div class="c-val" style="color:#F87171">' + money(b.b90p) + '</div></div></div>' +
      '<table style="margin-top:10px"><thead><tr><th>الطلب</th><th>العميل</th><th>الإجمالي</th><th>العمر</th></tr></thead><tbody>' +
      (r.rows || []).map(o => '<tr><td>' + esc(o.order_number || o.id) + '</td><td>' + esc(o.customer_name || '—') + '</td>' +
        '<td>' + money(o.total) + '</td><td>' + o.age_days + ' يوم</td></tr>').join('') +
      '</tbody></table>';
  } catch (e) { box.innerHTML = '❌ ' + esc(e.message); }
}

/* ─── 📊 لوحة المدير ─── */
async function loadDashboard() {
  const box = $('dash-cards');
  try {
    const r = await rpc('staff_dashboard', { p_token: S.token });
    const bal = r.balances || {};
    box.innerHTML =
      '<div class="card"><div class="c-lbl">مبيعات اليوم</div><div class="c-val">' + money(r.today_sales) + ' ر.س</div><div class="c-sub">' + r.today_orders + ' طلب</div></div>' +
      '<div class="card"><div class="c-lbl">مبيعات الشهر</div><div class="c-val">' + money(r.month_sales) + ' ر.س</div><div class="c-sub">' + r.month_orders + ' طلب</div></div>' +
      '<div class="card"><div class="c-lbl">💵 الخزينة</div><div class="c-val">' + money(bal['1100']) + '</div></div>' +
      '<div class="card"><div class="c-lbl">🏦 البنك</div><div class="c-val">' + money(bal['1110']) + '</div></div>' +
      '<div class="card"><div class="c-lbl">👥 ذمم العملاء</div><div class="c-val">' + money(bal['1200']) + '</div></div>';
    $('dash-top').innerHTML = (r.top_items || []).map(i =>
      '<span class="chip">' + esc(i.name || 'صنف') + ' × <b>' + i.qty + '</b></span>').join(' ') || 'لا مبيعات هذا الشهر';
  } catch (e) { box.innerHTML = '❌ ' + esc(e.message); }
}

/* ─── 👥 الرواتب (عرض) ─── */
async function loadPayroll() {
  const box = $('payroll-box');
  try {
    const r = await rpc('staff_list_payroll', { p_token: S.token });
    box.innerHTML = '<h4 style="margin:10px 0 6px">مسيّرات الرواتب</h4><table><thead><tr>' +
      '<th>الشهر</th><th>الموظفون</th><th>الإجمالي</th><th>GOSI موظف</th><th>GOSI منشأة</th><th>الصافي</th><th>الحالة</th></tr></thead><tbody>' +
      (r.runs || []).map(x => '<tr><td dir="ltr">' + esc(x.month) + '</td><td>' + x.employees_count + '</td>' +
        '<td>' + money(x.total_gross) + '</td><td>' + money(x.total_gosi_employee) + '</td>' +
        '<td>' + money(x.total_gosi_employer) + '</td><td style="font-weight:700">' + money(x.total_net) + '</td>' +
        '<td>' + (x.status === 'posted' ? '✅ مرحّل' : 'مسودة') + '</td></tr>').join('') +
      '</tbody></table><h4 style="margin:14px 0 6px">الموظفون</h4><table><thead><tr>' +
      '<th>الاسم</th><th>المسمى</th><th>الجنسية</th><th>الأساسي</th><th>السكن</th><th>الحالة</th></tr></thead><tbody>' +
      (r.employees || []).map(e => '<tr><td>' + esc(e.name) + '</td><td>' + esc(e.job_title || '—') + '</td>' +
        '<td>' + esc(e.nationality || '—') + '</td><td>' + money(e.basic_salary) + '</td>' +
        '<td>' + money(e.housing_allowance) + '</td><td>' + esc(e.status) + '</td></tr>').join('') +
      '</tbody></table>';
  } catch (e) { box.innerHTML = '❌ ' + esc(e.message); }
}

/* ─── 🕒 سجل المراجعة ─── */
async function loadAudit() {
  const tb = $('audit-tb');
  try {
    const rows = await rpc('staff_audit', { p_token: S.token, p_limit: 100 });
    tb.innerHTML = (rows || []).map(a =>
      '<tr><td>' + new Date(a.created_at).toLocaleString('ar-SA') + '</td>' +
      '<td>' + esc(a.name || a.username || '—') + '</td>' +
      '<td><b>' + esc(a.action) + '</b></td>' +
      '<td dir="ltr" style="font-family:monospace;font-size:11px;text-align:left">' +
        esc(JSON.stringify(a.details || {})) + '</td></tr>'
    ).join('') || '<tr><td colspan="4">لا أحداث بعد</td></tr>';
  } catch (e) { tb.innerHTML = '<tr><td colspan="4">❌ ' + esc(e.message) + '</td></tr>'; }
}

/* ─── إقلاع ─── */
window.staffShow = staffShow;
window.doLogin = doLogin;
window.doLogout = doLogout;
window.issueEinvoice = issueEinvoice;
window.printEinvoice = printEinvoice;
window.saveVoucher = saveVoucher;
window.journalAddLine = journalAddLine;
window.saveJournal = saveJournal;
window.saveExpense = saveExpense;
window.loadDailyReport = loadDailyReport;
window.loadTrialBalance = loadTrialBalance;
window.loadIncome = loadIncome;
window.loadAging = loadAging;
window.loadEInvoices = loadEInvoices;
window.loadOrders = loadOrders;

document.addEventListener('DOMContentLoaded', function () {
  $('login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  $('login-user').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  $('rep-date').value = new Date().toISOString().slice(0, 10);
  const st = loadSession();
  if (st === 'ok') enterPortal();
  else if (st === 'expired') {
    $('login-err').textContent = '⏰ انتهت جلستك (12 ساعة) — سجّل الدخول مجدداً';
    $('login-err').style.display = 'block';
  }
});
})(typeof window !== 'undefined' ? window : globalThis);
