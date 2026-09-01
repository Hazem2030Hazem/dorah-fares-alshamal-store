/* ═══════════════════════════════════════════════════════════════
   Batch C1 — pos-store.js (شاشة كاشير المتجر المستقلة)
   جزآن في ملف واحد (بلا build step):
   • منطق نقي قابل للاختبار في Node: g.POS_STORE / module.exports:
     computeTender (دفع منقّس + باقٍ + آجل)، paymentTotals،
     shiftCashDiff (Z-report)، canvasToRaster + escposBuild
     (ESC/POS raster GS v 0)، makeToken، sha256HexSync.
   • واجهات المتصفح: دخول كاشير (PIN pad)، شبكة أصناف، سلة،
     تعليق/استرجاع، مرتجع، ورديات، طباعة حرارية (متصفح/Serial/جسر)،
     جهاز دفع (يدوي/Serial/جسر)، قارئ باركود (لوحة مفاتيح).
   الصلاحيات: لا جلسة Supabase للكاشير — كل الكتابة عبر RPCs
   pos_* بتوكن جلسة pos_sessions (انظر store-pos.sql).
   منقول ومكيَّف من hazem-erp/project/pos-plus.js.
   ═══════════════════════════════════════════════════════════════ */
(function (g) {
'use strict';

const _r2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

/* ─────────── منطق نقي ١: تسوية الدفع المنقّس ───────────
   lines: [{method:'cash|card|transfer', amount, reference}]
   يعيد الإجماليات + الباقي + الآجل + سطور التسجيل بعد خصم الباقي من النقد. */
function computeTender(total, lines) {
  total = _r2(total);
  const ls = (lines || [])
    .map(l => ({ method: String(l.method || 'cash'), amount: _r2(l.amount), reference: l.reference || '' }))
    .filter(l => l.amount !== 0);
  const paid = _r2(ls.reduce((s, l) => s + l.amount, 0));
  const cashGiven = _r2(ls.filter(l => l.method === 'cash').reduce((s, l) => s + l.amount, 0));
  const over = _r2(paid - total);
  const change = over > 0 ? over : 0;
  const credit = over < 0 ? _r2(-over) : 0;
  const recorded = ls.map(l => ({ ...l }));
  let rem = change;
  for (let i = recorded.length - 1; i >= 0 && rem > 0; i--) {
    if (recorded[i].method !== 'cash') continue;
    const d = Math.min(recorded[i].amount, rem);
    recorded[i].amount = _r2(recorded[i].amount - d);
    rem = _r2(rem - d);
  }
  if (credit > 0) recorded.push({ method: 'credit', amount: credit, reference: '' });
  const overpayOk = over <= 0 || _r2(over - cashGiven) <= 0;
  return { total, paid, cashGiven, change, credit, recorded, overpayOk };
}

/* ─────────── منطق نقي ٢: إجماليات طرق الدفع ─────────── */
function paymentTotals(rows) {
  const m = { cash: 0, card: 0, transfer: 0, credit: 0 };
  (rows || []).forEach(r => {
    if (!(r.method in m)) m[r.method] = 0;
    m[r.method] = _r2(m[r.method] + Number(r.amount || 0));
  });
  m.grand = _r2(Object.keys(m).filter(k => k !== 'grand').reduce((s, k) => s + m[k], 0));
  return m;
}

/* ─────────── منطق نقي ٣: فرق جرد الوردية ─────────── */
function shiftCashDiff(expected, actual) {
  const e = _r2(expected), a = _r2(actual), d = _r2(a - e);
  return { expected: e, actual: a, diff: d,
    state: d === 0 ? 'match' : (d < 0 ? 'short' : 'over') };
}

/* ─────────── منطق نقي ٤: canvas → ESC/POS raster (GS v 0) ───────────
   العرض يُكمل لمضاعف 8. getPixel(x,y) ترجع truthy للنقطة السوداء. */
function canvasToRaster(width, height, getPixel) {
  const xBytes = Math.ceil(width / 8);
  const out = [0x1D, 0x76, 0x30, 0x00, xBytes & 0xFF, (xBytes >> 8) & 0xFF,
    height & 0xFF, (height >> 8) & 0xFF];
  for (let y = 0; y < height; y++) {
    for (let xb = 0; xb < xBytes; xb++) {
      let byte = 0;
      for (let b = 0; b < 8; b++) {
        const x = xb * 8 + b;
        if (x < width && getPixel(x, y)) byte |= (0x80 >> b);
      }
      out.push(byte);
    }
  }
  return out;
}

/* ─────────── منطق نقي ٥: حزمة ESC/POS (تهيئة + raster + فتح درج اختياري + قص) ─────────── */
function escposBuild(rasterBytes, openDrawer) {
  return [0x1B, 0x40,                          // ESC @ تهيئة
    ...(openDrawer ? [0x1B, 0x70, 0x00, 0x19, 0xFA] : []), // ESC p 0 فتح درج النقدية
    ...(rasterBytes || []),                    // GS v 0 صورة نقطية
    0x1B, 0x64, 0x05,                          // ESC d تغذية 5 أسطر
    0x1D, 0x56, 0x42, 0x00];                   // GS V قص مع تغذية
}

/* ─────────── منطق نقي ٦: توليد توكن عشوائي hex (rng قابل للحقن) ─────────── */
function makeToken(bytes, rng) {
  bytes = bytes || 24;
  const r = rng || (() => Math.floor(Math.random() * 256));
  let s = '';
  for (let i = 0; i < bytes; i++) s += (r() & 0xFF).toString(16).padStart(2, '0');
  return s;
}

/* ─────────── منطق نقي ٧: SHA-256 hex (Node — للاختبارات؛ المتصفح يستخدم WebCrypto) ─────────── */
function sha256HexSync(pin) {
  // Node فقط — في المتصفح لا نحسب هاش PIN إطلاقاً (يُحسب سيرفرياً)
  if (typeof require === 'undefined') throw new Error('node only');
  return require('crypto').createHash('sha256').update(String(pin)).digest('hex');
}
function validPin(pin) { return /^[0-9]{4,6}$/.test(String(pin || '')); }

/* ─────────── منطق نقي ٨: أمر بيع نصي لجهاز الدفع (بروتوكول تجريبي موثق) ─────────── */
function paymentCommand(amount, currency) {
  return 'SALE ' + _r2(amount).toFixed(2) + ' ' + String(currency || 'SAR') + '\n';
}
function parsePaymentResponse(text) {
  const t = String(text || '').trim().toUpperCase();
  if (/APPROVED|OK|SUCCESS|00/.test(t)) return { approved: true, raw: t };
  if (/DECLINED|FAIL|ERROR|CANCEL/.test(t)) return { approved: false, raw: t };
  return { approved: null, raw: t }; // رد غير مفهوم — يقرره الكاشير يدوياً
}

const pureExports = { _r2, computeTender, paymentTotals, shiftCashDiff,
  canvasToRaster, escposBuild, makeToken, sha256HexSync, validPin,
  paymentCommand, parsePaymentResponse };
if (typeof module !== 'undefined' && module.exports) module.exports = pureExports;
if (typeof document === 'undefined') { Object.assign(g, { POS_STORE: pureExports }); return; }

/* ═══════════════ واجهات المتصفح ═══════════════ */

// استخدام الإعدادات المشتركة من config.js
const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
const fmt = (n) => _r2(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
function toast(msg, ok) {
  const t = $('#pos-toast');
  t.textContent = msg;
  t.className = 'show ' + (ok === false ? 'err' : 'ok');
  clearTimeout(t._h); t._h = setTimeout(() => { t.className = ''; }, 3200);
}
async function rpc(name, params) {
  const r = await sb.rpc(name, params);
  if (r.error) throw new Error(r.error.message || 'rpc_failed');
  return r.data;
}

/* ─────────── الحالة ─────────── */
const S = {
  sess: null,          // {token, cashier_id, name, branch}
  shift: null,
  products: [],
  cart: [],            // {id, name, price, qty, discount}
  discountTotal: 0,
  devices: {
    printer: { mode: 'browser', paper: '80', bridge_url: 'ws://127.0.0.1:9101', address: '', port: 9100, copies: 1, open_drawer: true },
    payment: { mode: 'manual', address: '', port: 9100, timeout: 60, bridge_url: 'ws://127.0.0.1:9101', currency: 'SAR' },
  },
  lastReceipt: null,
};

/* ─────────── الجلسة (sessionStorage) ─────────── */
function sessSave() { try { sessionStorage.setItem('pos_sess', JSON.stringify(S.sess)); } catch (e) {} }
function sessLoad() {
  try { S.sess = JSON.parse(sessionStorage.getItem('pos_sess') || 'null'); } catch (e) { S.sess = null; }
  return !!(S.sess && S.sess.token);
}

/* ─────────── شاشة الدخول (PIN pad للمس) ─────────── */
let _pin = '';
function loginRender() {
  $('#pos-login').style.display = 'flex';
  $('#pos-app').style.display = 'none';
  _pin = ''; pinDots();
  $('#pin-pad').innerHTML = ['1','2','3','4','5','6','7','8','9','⌫','0','✓'].map(k =>
    `<button class="pin-key" data-k="${k}">${k}</button>`).join('');
  $$('#pin-pad .pin-key').forEach(b => b.onclick = () => pinPress(b.dataset.k));
  $('#login-user').onkeydown = (e) => { if (e.key === 'Enter') $('#pin-pad [data-k="1"]').focus(); };
}
function pinDots() { $('#pin-dots').textContent = '●'.repeat(_pin.length) || '——————'; }
function pinPress(k) {
  if (k === '⌫') { _pin = _pin.slice(0, -1); pinDots(); return; }
  if (k === '✓') { doLogin(); return; }
  if (_pin.length >= 6) return;
  _pin += k; pinDots();
  if (_pin.length >= 4) { /* Enter يدوي بزر ✓ */ }
}
async function doLogin() {
  const u = $('#login-user').value.trim();
  if (!u) return toast('أدخل اسم المستخدم', false);
  if (!validPin(_pin)) return toast('الرمز 4-6 أرقام', false);
  try {
    $('#login-btn').disabled = true;
    const r = await rpc('pos_cashier_login', { p_username: u, p_pin: _pin });
    _pin = ''; pinDots();
    if (!r || !r.ok) return toast(r && r.error || 'فشل الدخول', false);
    S.sess = { token: r.token, cashier_id: r.cashier_id, name: r.name || u, branch: r.branch };
    sessSave();
    await bootApp();
    toast('مرحباً ' + S.sess.name + ' 👋');
  } catch (e) {
    toast('فشل الاتصال: ' + e.message, false);
  } finally {
    $('#login-btn').disabled = false;
  }
}
async function doLogout() {
  try { await rpc('pos_logout', { p_token: S.sess.token }); } catch (e) {}
  S.sess = null; S.shift = null; S.cart = [];
  try { sessionStorage.removeItem('pos_sess'); } catch (e) {}
  loginRender();
}

/* ─────────── إقلاع التطبيق بعد الدخول ─────────── */
async function bootApp() {
  $('#pos-login').style.display = 'none';
  $('#pos-app').style.display = 'flex';
  $('#hdr-cashier').textContent = S.sess.name + (S.sess.branch ? ' — ' + S.sess.branch : '');
  await Promise.all([loadDevices(), loadProducts(), loadShift()]);
  cartRender(); syncShiftBar();
  const si = $('#search-input');
  si.focus();
}
async function loadShift() {
  try {
    const r = await rpc('pos_current_shift', { p_token: S.sess.token });
    S.shift = (r && r.shift) || null;
  } catch (e) { S.shift = null; }
  syncShiftBar();
}
function syncShiftBar() {
  const el = $('#shift-badge');
  if (S.shift) {
    el.textContent = '🟢 وردية #' + S.shift.number + ' — عهدة ' + fmt(S.shift.opening_cash);
    el.className = 'shift-badge open';
    $('#btn-checkout').disabled = false;
  } else {
    el.textContent = '🔴 لا توجد وردية مفتوحة';
    el.className = 'shift-badge closed';
    $('#btn-checkout').disabled = true;
  }
}

/* ─────────── المنتجات (قراءة عامة مسموحة من المتجر) ─────────── */
async function loadProducts() {
  $('#product-grid').innerHTML = '<div class="muted">⏳ جاري تحميل الأصناف...</div>';
  try {
    const r = await sb.from('store_products').select('id, name, price, image, category, barcode, stock')
      .eq('is_active', true).order('id');
    S.products = (!r.error && r.data) ? r.data : [];
  } catch (e) { S.products = []; }
  gridRender('');
}
function gridRender(q) {
  q = String(q || '').trim().toLowerCase();
  const list = q ? S.products.filter(p =>
    String(p.name || '').toLowerCase().includes(q) ||
    String(p.barcode || '').includes(q) ||
    String(p.id) === q) : S.products;
  $('#product-grid').innerHTML = list.slice(0, 120).map(p => `
    <button class="prod-card" data-id="${p.id}">
      <div class="prod-img">${p.image ? `<img src="${esc(p.image)}" loading="lazy" alt="">` : '📦'}</div>
      <div class="prod-name">${esc(p.name)}</div>
      <div class="prod-price">${fmt(p.price)} ر.س</div>
    </button>`).join('') || '<div class="muted">لا نتائج</div>';
  $$('#product-grid .prod-card').forEach(b => b.onclick = () => addToCart(Number(b.dataset.id)));
}
/* قارئ الباركود: يعمل كلوحة مفاتيح — حقل البحث دائم التركيز + Enter سريع.
   لا يحتاج أي إعداد أو تعريف جهاز. */
function searchEnter() {
  const si = $('#search-input');
  const q = si.value.trim();
  if (!q) return;
  const exact = S.products.find(p => String(p.barcode || '') === q || String(p.id) === q)
    || (S.products.filter(p => String(p.name || '').toLowerCase().includes(q.toLowerCase())).length === 1
        ? S.products.find(p => String(p.name || '').toLowerCase().includes(q.toLowerCase())) : null);
  if (exact) { addToCart(exact.id); si.value = ''; gridRender(''); }
  else gridRender(q);
}

/* ─────────── السلة ─────────── */
function addToCart(id) {
  const p = S.products.find(x => Number(x.id) === Number(id));
  if (!p) return;
  const line = S.cart.find(l => Number(l.id) === Number(id));
  if (line) line.qty++;
  else S.cart.push({ id: p.id, name: p.name, price: _r2(p.price), qty: 1, discount: 0 });
  cartRender();
}
function cartTotals() {
  const sub = _r2(S.cart.reduce((s, l) => s + l.qty * l.price, 0));
  const lineDisc = _r2(S.cart.reduce((s, l) => s + (Number(l.discount) || 0), 0));
  const disc = _r2(Math.min(sub, lineDisc + (Number(S.discountTotal) || 0)));
  const net = _r2(sub - disc);
  const tax = Math.round(net * 0.15); // يطابق round() السيرفري
  return { sub, disc, net, tax, total: _r2(net + tax) };
}
function cartRender() {
  const box = $('#cart-lines');
  box.innerHTML = S.cart.map((l, i) => `
    <div class="cart-line">
      <button class="cl-del" data-i="${i}">✕</button>
      <div class="cl-name">${esc(l.name)}</div>
      <div class="cl-qty">
        <button data-i="${i}" data-d="-1">−</button>
        <b>${l.qty}</b>
        <button data-i="${i}" data-d="1">+</button>
      </div>
      <input class="cl-disc" data-i="${i}" type="number" min="0" step="any" value="${l.discount || ''}" placeholder="خصم" title="خصم السطر">
      <div class="cl-total">${fmt(l.qty * l.price - (Number(l.discount) || 0))}</div>
    </div>`).join('') || '<div class="muted" style="text-align:center;padding:20px">السلة فارغة — امسح باركود أو اختر صنفاً</div>';
  $$('#cart-lines .cl-del').forEach(b => b.onclick = () => { S.cart.splice(Number(b.dataset.i), 1); cartRender(); });
  $$('#cart-lines .cl-qty button').forEach(b => b.onclick = () => {
    const l = S.cart[Number(b.dataset.i)];
    l.qty = Math.max(1, l.qty + Number(b.dataset.d)); cartRender();
  });
  $$('#cart-lines .cl-disc').forEach(inp => inp.oninput = () => {
    S.cart[Number(inp.dataset.i)].discount = Math.max(0, Number(inp.value) || 0); cartTotalsRender();
  });
  cartTotalsRender();
}
function cartTotalsRender() {
  const t = cartTotals();
  $('#ct-sub').textContent = fmt(t.sub);
  $('#ct-disc').textContent = fmt(t.disc);
  $('#ct-tax').textContent = fmt(t.tax);
  $('#ct-total').textContent = fmt(t.total);
}

/* ─────────── الدفع المنقّس (منقول من pos-plus.js ومكيَّف) ─────────── */
const PM_NAMES = { cash: 'نقدي', card: 'شبكة', transfer: 'تحويل', credit: 'آجل' };
const QUICK_AMOUNTS = [50, 100, 200, 500];
let _payLines = [];

function openPayModal() {
  if (!S.shift) return toast('افتح وردية أولاً', false);
  if (!S.cart.length) return toast('السلة فارغة', false);
  const t = cartTotals();
  _payLines = [{ method: 'cash', amount: t.total, reference: '' }];
  $('#pay-total').textContent = fmt(t.total);
  $('#pay-quick').innerHTML =
    `<button class="btn-ghost" data-quick="exact">بالضبط (${fmt(t.total)})</button>` +
    QUICK_AMOUNTS.map(a => `<button class="btn-ghost" data-quick="${a}">${fmt(a)}</button>`).join('');
  $$('#pay-quick [data-quick]').forEach(b => b.onclick = () => {
    const v = b.dataset.quick === 'exact' ? t.total : Number(b.dataset.quick);
    const ci = _payLines.findIndex(l => l.method === 'cash');
    if (ci >= 0) _payLines[ci].amount = v;
    else _payLines.unshift({ method: 'cash', amount: v, reference: '' });
    payRender();
  });
  $('#pay-customer').value = '';
  payRender();
  showModal('pay-modal');
}
function payRender() {
  $('#pay-lines').innerHTML = _payLines.map((l, i) => `
    <div class="pay-line">
      <select data-i="${i}" class="pl-method">
        ${['cash', 'card', 'transfer'].map(m =>
          `<option value="${m}" ${l.method === m ? 'selected' : ''}>${PM_NAMES[m]}</option>`).join('')}
      </select>
      <input data-i="${i}" class="pl-amount" type="number" min="0" step="any" dir="ltr" value="${l.amount}">
      <input data-i="${i}" class="pl-ref" value="${esc(l.reference || '')}"
             placeholder="رقم الإيصال/المرجع" ${l.method === 'cash' ? 'disabled' : ''}>
      <button class="cl-del" data-i="${i}">✕</button>
    </div>`).join('');
  $$('#pay-lines .pl-method').forEach(s => s.onchange = () => {
    _payLines[Number(s.dataset.i)].method = s.value; payRender();
  });
  $$('#pay-lines .pl-amount').forEach(inp => inp.oninput = () => {
    _payLines[Number(inp.dataset.i)].amount = Number(inp.value) || 0; paySync();
  });
  $$('#pay-lines .pl-ref').forEach(inp => inp.oninput = () => {
    _payLines[Number(inp.dataset.i)].reference = inp.value;
  });
  $$('#pay-lines .cl-del').forEach(b => b.onclick = () => {
    if (_payLines.length <= 1) return;
    _payLines.splice(Number(b.dataset.i), 1); payRender();
  });
  paySync();
}
function paySync() {
  const t = cartTotals();
  const r = computeTender(t.total, _payLines);
  $('#pay-sum').textContent = fmt(r.paid);
  const ch = $('#pay-change');
  ch.textContent = fmt(r.change);
  ch.style.color = r.change > 0 ? '#10B981' : '';
  const hasCredit = r.credit > 0;
  $('#pay-credit-row').style.display = hasCredit ? 'flex' : 'none';
  $('#pay-credit').textContent = fmt(r.credit);
  $('#pay-customer-row').style.display = hasCredit ? 'block' : 'none';
  const ok = r.paid > 0 && (r.overpayOk || r.change === 0)
    && (!hasCredit || !!$('#pay-customer').value.trim());
  $('#pay-confirm').disabled = !ok;
  return r;
}

/* ─────────── جهاز الدفع: 3 أوضاع واقعية ───────────
   1) manual: الكاشير يمرر البطاقة على الجهاز المستقل ويؤكد (يعمل فوراً مع أي جهاز).
   2) serial: إرسال «SALE <amount> SAR» عبر WebSerial وانتظار APPROVED/DECLINED
      (بروتوكول تجريبي — الدعم يعتمد على إعدادات الجهاز من البنك المكتسِب).
   3) bridge: نفس الأمر عبر جسر WebSocket المحلي → TCP لجهاز الشبكة. */
async function runCardPayment(amount) {
  const d = S.devices.payment;
  if (d.mode === 'manual') {
    return await confirmDialog(
      '💳 مرّر البطاقة على جهاز الشبكة بمبلغ ' + fmt(amount) + ' ر.س ثم أكّد النتيجة',
      '✅ نجحت العملية', '❌ فشلت');
  }
  if (d.mode === 'serial') return await cardPaySerial(amount, d);
  if (d.mode === 'bridge') return await cardPayBridge(amount, d);
  return true;
}
async function cardPaySerial(amount, d) {
  if (!('serial' in navigator)) { toast('WebSerial غير مدعوم — استخدم Chrome/Edge', false); return false; }
  let port;
  try {
    toast('⏳ أرسلنا ' + fmt(amount) + ' للجهاز — بانتظار الرد (مهلة ' + (d.timeout || 60) + ' ثانية)...');
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: Number(d.baud) || 9600 });
    const cmd = new TextEncoder().encode(paymentCommand(amount, d.currency));
    const writer = port.writable.getWriter();
    await writer.write(cmd); writer.releaseLock();
    const resp = await readSerialWithTimeout(port, (Number(d.timeout) || 60) * 1000);
    const pr = parsePaymentResponse(resp);
    if (pr.approved === true) { toast('✅ APPROVED — نجحت عملية الشبكة'); return true; }
    if (pr.approved === false) { toast('❌ DECLINED — ' + pr.raw, false); return false; }
    // رد غير مفهوم: يقرر الكاشير
    return await confirmDialog('رد الجهاز غير واضح: «' + (pr.raw || 'لا رد') + '» — هل نجحت العملية؟', '✅ نجحت', '❌ فشلت');
  } catch (e) {
    if (e && e.name === 'NotFoundError') return false; // ألغى اختيار المنفذ
    toast('جهاز الدفع Serial: ' + e.message + ' — تأكد من تفعيل وضع المطوّر بالجهاز من البنك', false);
    return false;
  } finally { try { await port.close(); } catch (e) {} }
}
function readSerialWithTimeout(port, ms) {
  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => { try { reader.cancel(); } catch (e) {} resolve(''); }, ms);
    const reader = port.readable.getReader();
    let buf = '';
    try {
      const dec = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value);
        if (/APPROVED|DECLINED|OK|FAIL/i.test(buf)) break;
      }
    } catch (e) { /* مهلة */ }
    clearTimeout(timer);
    try { reader.releaseLock(); } catch (e) {}
    resolve(buf);
  });
}
async function cardPayBridge(amount, d) {
  try {
    toast('⏳ أرسلنا ' + fmt(amount) + ' عبر الجسر — بانتظار الجهاز...');
    const resp = await bridgeRequest(d.bridge_url || 'ws://127.0.0.1:9101', {
      type: 'payment', address: d.address, port: Number(d.port) || 9100,
      timeout: Number(d.timeout) || 60,
      payload: paymentCommand(amount, d.currency),
    });
    const pr = parsePaymentResponse(resp);
    if (pr.approved === true) { toast('✅ APPROVED — نجحت عملية الشبكة'); return true; }
    if (pr.approved === false) { toast('❌ DECLINED — ' + pr.raw, false); return false; }
    return await confirmDialog('رد الجهاز: «' + (pr.raw || 'لا رد') + '» — هل نجحت؟', '✅ نجحت', '❌ فشلت');
  } catch (e) {
    toast('الجسر غير متاح: ' + e.message + '\nشغّل pos-printer-bridge.py على جهاز الكاشير أو بدّل الوضع لـ«يدوي»', false);
    return false;
  }
}
/* جسر WebSocket محلي: يرسل JSON وينتظر رد الجسر (انظر pos-printer-bridge.py) */
function bridgeRequest(url, msg, waitMs) {
  return new Promise((resolve, reject) => {
    let ws;
    try { ws = new WebSocket(url); } catch (e) { return reject(new Error('عنوان جسر غير صالح')); }
    const timer = setTimeout(() => { try { ws.close(); } catch (e) {} reject(new Error('انتهت المهلة')); },
      (waitMs || (Number(msg.timeout) || 30) * 1000) + 5000);
    ws.onopen = () => ws.send(JSON.stringify(msg));
    ws.onmessage = (ev) => {
      clearTimeout(timer);
      try {
        const r = JSON.parse(ev.data);
        if (r.ok === false) reject(new Error(r.error || 'bridge_error'));
        else resolve(r.response || '');
      } catch (e) { resolve(String(ev.data || '')); }
      try { ws.close(); } catch (e) {}
    };
    ws.onerror = () => { clearTimeout(timer); reject(new Error('تعذر الاتصال بـ ' + url + ' — هل الجسر يعمل؟')); };
  });
}
function confirmDialog(msg, okTxt, noTxt) {
  return new Promise((resolve) => {
    $('#confirm-msg').textContent = msg;
    $('#confirm-ok').textContent = okTxt || 'نعم';
    $('#confirm-no').textContent = noTxt || 'لا';
    showModal('confirm-modal');
    $('#confirm-ok').onclick = () => { closeModal('confirm-modal'); resolve(true); };
    $('#confirm-no').onclick = () => { closeModal('confirm-modal'); resolve(false); };
  });
}

/* ─────────── تأكيد البيع ─────────── */
async function confirmCheckout() {
  const t = cartTotals();
  const r = computeTender(t.total, _payLines);
  if (r.change > 0 && !r.overpayOk) return toast('الزيادة فوق الإجمالي نقداً فقط', false);
  const customer = $('#pay-customer').value.trim();
  if (r.credit > 0 && !customer) return toast('البيع الآجل يتطلب اسم العميل', false);

  // أسطر الشبكة: نشغّل جهاز الدفع أولاً (حسب وضع الربط)
  const cardTotal = _r2(r.recorded.filter(l => l.method === 'card' || l.method === 'transfer')
    .reduce((s, l) => s + l.amount, 0));
  if (cardTotal > 0) {
    const okPay = await runCardPayment(cardTotal);
    if (!okPay) return toast('أُلغيت العملية — لم يُحفظ أي بيع', false);
  }

  const btn = $('#pay-confirm');
  btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...';
  try {
    const payments = r.recorded.filter(l => l.method !== 'credit')
      .map(l => ({ method: l.method, amount: l.amount, reference: l.reference }));
    const data = await rpc('pos_checkout_store', {
      p_token: S.sess.token,
      p_items: S.cart.map(l => ({ id: l.id, qty: l.qty })),
      p_payments: payments,
      p_discount: t.disc,
      p_customer_name: customer || null,
      p_shift_id: S.shift.id,
    });
    if (!data || !data.ok) throw new Error(data && data.error || 'checkout_failed');
    const receipt = {
      number: data.order_id, shift: data.shift_number,
      created_at: new Date().toISOString(),
      cashier: S.sess.name,
      lines: (data.items || []).map(l => ({ name: l.name, qty: l.qty, price: l.price })),
      subtotal: data.subtotal, discount: data.discount, tax: data.tax, total: data.total,
      payments: data.payments || [], change: data.change,
      customer: customer || '',
    };
    S.lastReceipt = receipt;
    closeModal('pay-modal');
    S.cart = []; S.discountTotal = 0; cartRender();
    const hadCash = (data.payments || []).some(p => p.method === 'cash');
    await printReceipt(receipt, { openDrawer: hadCash && S.devices.printer.open_drawer });
    showSaleSuccess(receipt, data);
  } catch (e) {
    toast('فشل حفظ البيع: ' + e.message, false);
  } finally {
    btn.disabled = false; btn.textContent = '✅ تأكيد وتحصيل';
  }
}
function showSaleSuccess(rc, data) {
  $('#success-info').innerHTML = `
    <div class="succ-num">فاتورة #${esc(String(rc.number))}</div>
    <div class="succ-total">${fmt(rc.total)} ر.س</div>
    ${rc.change > 0 ? `<div class="succ-change">الباقي للعميل: <b>${fmt(rc.change)}</b></div>` : ''}
    ${data.credit > 0 ? `<div class="succ-change">آجل على ${esc(rc.customer)}: <b>${fmt(data.credit)}</b></div>` : ''}
    ${data.journal_ok === false ? '<div class="muted">⚠️ القيد المحاسبي لم يُرحَّل (يراجَع من اللوحة)</div>' : ''}`;
  showModal('success-modal');
  $('#btn-reprint').onclick = () => printReceipt(S.lastReceipt, {});
}

/* ─────────── الإيصال الحراري (80/58مم RTL) ─────────── */
function receiptHtml(rc) {
  const d = S.devices.printer;
  const w = d.paper === '58' ? 58 : 80;
  const rows = rc.lines.map(l => `
    <tr><td>${esc(l.name)}</td><td class="n">${fmt(l.qty)}</td>
        <td class="n">${fmt(l.price)}</td><td class="n">${fmt(l.qty * l.price)}</td></tr>`).join('');
  const pays = (rc.payments || []).map(p => `
    <tr><td colspan="3">${PM_NAMES[p.method] || p.method}${p.reference ? ' (' + esc(p.reference) + ')' : ''}</td>
        <td class="n">${fmt(p.amount)}</td></tr>`).join('');
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>إيصال ${rc.number}</title>
    <style>
      @page { size: ${w}mm auto; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { width: ${w - 4}mm; margin: 2mm; font-family: 'Segoe UI', Tahoma, sans-serif;
             font-size: 11px; color: #000; direction: rtl; }
      .c { text-align: center; } .b { font-weight: 700; }
      .shop { font-size: 15px; font-weight: 800; }
      hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 1px 0; vertical-align: top; }
      .n { text-align: left; white-space: nowrap; }
      .tot { font-size: 14px; font-weight: 800; }
    </style></head><body>
    <div class="c shop">درة فارس الشمال</div>
    <div class="c">فاتورة كاشير #: <b>${esc(String(rc.number))}</b> — وردية ${esc(String(rc.shift || '—'))}</div>
    <div class="c" dir="ltr">${new Date(rc.created_at).toLocaleString('ar-SA')}</div>
    <div class="c">الكاشير: ${esc(rc.cashier || '')}${rc.customer ? ' — العميل: ' + esc(rc.customer) : ''}</div>
    <hr><table><tbody>${rows}</tbody></table><hr>
    <table><tbody>
      <tr><td colspan="3">الإجمالي قبل الضريبة</td><td class="n">${fmt(rc.subtotal - (rc.discount || 0))}</td></tr>
      ${rc.discount ? `<tr><td colspan="3">الخصم</td><td class="n">${fmt(rc.discount)}</td></tr>` : ''}
      <tr><td colspan="3">ضريبة القيمة المضافة 15%</td><td class="n">${fmt(rc.tax)}</td></tr>
      <tr class="tot"><td colspan="3">الإجمالي</td><td class="n">${fmt(rc.total)}</td></tr>
      ${pays}
      <tr><td colspan="3">الباقي</td><td class="n b">${fmt(rc.change || 0)}</td></tr>
    </tbody></table>
    <hr><div class="c b">شكراً لتسوقكم معنا</div>
    </body></html>`;
}
function printReceiptBrowser(rc) {
  const copies = Math.min(4, Math.max(1, Number(S.devices.printer.copies) || 1));
  try {
    const w = window.open('', '_blank', 'width=420,height=640');
    if (!w) return toast('المتصفح منع النافذة المنبثقة — اسمح بها للطباعة', false);
    w.document.write(receiptHtml(rc));
    w.document.close();
    w.addEventListener('load', () => {
      w.focus();
      for (let i = 0; i < copies; i++) setTimeout(() => w.print(), i * 400);
    });
    setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 600);
  } catch (e) { /* الطباعة اختيارية */ }
}

/* رسم الإيصال نقطياً (العربية على طابعات ESC/POS الصينية مشكلة codepage —
   لذلك نرسم على canvas ونرسل raster bit image — منقول من pos-plus.js) */
function drawReceiptCanvas(rc) {
  const W = S.devices.printer.paper === '58' ? 384 : 576;
  const lineH = 22;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  const estH = 150 + rc.lines.length * lineH + ((rc.payments || []).length + 3) * lineH;
  cv.width = W; cv.height = estH;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, estH);
  ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.direction = 'rtl';
  let y = 30;
  ctx.font = 'bold 24px Tahoma'; ctx.fillText('درة فارس الشمال', W / 2, y); y += 26;
  ctx.font = '17px Tahoma';
  ctx.fillText(`فاتورة كاشير #${rc.number} — وردية ${rc.shift || '—'}`, W / 2, y); y += 22;
  ctx.fillText(new Date(rc.created_at).toLocaleString('ar-SA'), W / 2, y); y += 20;
  ctx.fillText('الكاشير: ' + (rc.cashier || '') + (rc.customer ? ' — العميل: ' + rc.customer : ''), W / 2, y); y += 24;
  ctx.textAlign = 'right';
  rc.lines.forEach(l => {
    ctx.font = '16px Tahoma';
    ctx.fillText(`${l.name} ×${l.qty}`, W - 8, y);
    ctx.textAlign = 'left'; ctx.fillText(fmt(l.qty * l.price), 8, y); ctx.textAlign = 'right';
    y += lineH;
  });
  y += 6;
  ctx.font = '16px Tahoma';
  ctx.fillText('ضريبة 15%', W - 8, y);
  ctx.textAlign = 'left'; ctx.fillText(fmt(rc.tax), 8, y); ctx.textAlign = 'right'; y += lineH;
  ctx.font = 'bold 20px Tahoma';
  ctx.fillText('الإجمالي', W - 8, y);
  ctx.textAlign = 'left'; ctx.fillText(fmt(rc.total), 8, y); ctx.textAlign = 'right'; y += lineH;
  ctx.font = '16px Tahoma';
  (rc.payments || []).forEach(p => {
    ctx.fillText(PM_NAMES[p.method] || p.method, W - 8, y);
    ctx.textAlign = 'left'; ctx.fillText(fmt(p.amount), 8, y); ctx.textAlign = 'right';
    y += lineH;
  });
  ctx.fillText('الباقي', W - 8, y);
  ctx.textAlign = 'left'; ctx.fillText(fmt(rc.change || 0), 8, y); ctx.textAlign = 'right'; y += 28;
  ctx.font = 'bold 18px Tahoma'; ctx.textAlign = 'center';
  ctx.fillText('شكراً لتسوقكم معنا', W / 2, y + 8);
  return cv;
}
async function receiptBytes(rc, openDrawer) {
  const cv = drawReceiptCanvas(rc);
  const ctx = cv.getContext('2d');
  const img = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const raster = canvasToRaster(cv.width, cv.height, (x, y) => img[(y * cv.width + x) * 4] < 128);
  return new Uint8Array(escposBuild(raster, openDrawer));
}
/* طباعة حسب وضع الطابعة المضبوط في «⚙️ الأجهزة» */
async function printReceipt(rc, opts) {
  opts = opts || {};
  const d = S.devices.printer;
  try {
    if (d.mode === 'serial') return await printSerial(rc, opts.openDrawer);
    if (d.mode === 'bridge') return await printBridge(rc, opts.openDrawer);
    return printReceiptBrowser(rc);
  } catch (e) {
    toast('تعذرت الطباعة المباشرة (' + e.message + ') — فتحنا طباعة المتصفح', false);
    printReceiptBrowser(rc);
  }
}
async function printSerial(rc, openDrawer) {
  if (!('serial' in navigator)) { toast('WebSerial غير مدعوم — استخدم Chrome/Edge', false); return printReceiptBrowser(rc); }
  try {
    const bytes = await receiptBytes(rc, openDrawer);
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    const writer = port.writable.getWriter();
    await writer.write(bytes);
    writer.releaseLock();
    await port.close();
    toast('🖨️ تمت الطباعة المباشرة');
  } catch (e) {
    if (e && e.name === 'NotFoundError') return;
    toast('ESC/POS Serial: ' + e.message, false);
    printReceiptBrowser(rc);
  }
}
/* طابعة شبكة عبر الجسر المحلي: المتصفح لا يفتح TCP خام —
   الجسر (pos-printer-bridge.py على ws://127.0.0.1:9101) يستقبل ويعيد التوجيه TCP لطابعة IP:9100 */
async function printBridge(rc, openDrawer) {
  const d = S.devices.printer;
  const bytes = await receiptBytes(rc, openDrawer);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  await bridgeRequest(d.bridge_url || 'ws://127.0.0.1:9101', {
    type: 'print', address: d.address, port: Number(d.port) || 9100,
    payload_b64: btoa(bin),
  }, 20000);
  toast('🖨️ أُرسل الإيصال للطابعة الشبكية ' + (d.address || '') + ':' + (d.port || 9100));
}

/* ─────────── تعليق / استرجاع فاتورة ─────────── */
const _parkKey = () => 'pos_parked_' + (S.sess ? S.sess.cashier_id : 'x');
function parkList() { try { return JSON.parse(localStorage.getItem(_parkKey()) || '[]'); } catch (e) { return []; } }
function parkSave(list) { try { localStorage.setItem(_parkKey(), JSON.stringify(list)); } catch (e) {} }
function parkCart() {
  if (!S.cart.length) return toast('السلة فارغة — لا شيء للتعليق', false);
  const label = prompt('اسم/رقم الفاتورة المعلقة (طاولة/عميل):', 'فاتورة ' + (parkList().length + 1));
  if (label === null) return;
  const list = parkList();
  list.push({ label: label || ('فاتورة ' + (list.length + 1)), at: Date.now(), cart: S.cart, discountTotal: S.discountTotal });
  parkSave(list);
  S.cart = []; S.discountTotal = 0; cartRender();
  toast('⏸️ عُلّقت الفاتورة — استرجعها من زر 📑');
}
function unparkUI() {
  const list = parkList();
  $('#parked-list').innerHTML = list.map((p, i) => `
    <div class="parked-row">
      <span>${esc(p.label)} <small class="muted">${new Date(p.at).toLocaleTimeString('ar-SA')}</small></span>
      <span>${fmt(p.cart.reduce((s, l) => s + l.qty * l.price, 0))} ر.س</span>
      <button class="btn-ghost" data-i="${i}">استرجاع</button>
      <button class="cl-del" data-i="${i}">✕</button>
    </div>`).join('') || '<div class="muted">لا فواتير معلقة</div>';
  $$('#parked-list .btn-ghost').forEach(b => b.onclick = () => {
    const list2 = parkList();
    const p = list2.splice(Number(b.dataset.i), 1)[0];
    parkSave(list2);
    S.cart = p.cart || []; S.discountTotal = p.discountTotal || 0;
    cartRender(); closeModal('parked-modal');
    toast('▶️ استُرجعت: ' + p.label);
  });
  $$('#parked-list .cl-del').forEach(b => b.onclick = () => {
    const list2 = parkList();
    list2.splice(Number(b.dataset.i), 1);
    parkSave(list2); unparkUI();
  });
  showModal('parked-modal');
}

/* ─────────── مرتجع ─────────── */
async function doReturn() {
  const id = prompt('رقم فاتورة الكاشير المرجعة (order #):');
  if (!id) return;
  const reason = prompt('سبب الإرجاع (اختياري):', '') || '';
  if (!confirm('تأكيد مرتجع كامل للفاتورة #' + id + '؟ يُعكس المبلغ على الوردية.')) return;
  try {
    const r = await rpc('pos_return_store', { p_token: S.sess.token, p_order_id: Number(id), p_reason: reason });
    if (!r || !r.ok) throw new Error(r && r.error || 'return_failed');
    toast('↩️ تم المرتجع — فاتورة عكسية #' + r.return_order_id + ' بمبلغ ' + fmt(r.total));
  } catch (e) { toast('فشل المرتجع: ' + e.message, false); }
}

/* ─────────── الورديات ─────────── */
async function openShiftUI() {
  if (S.shift) return closeShiftUI();
  const v = prompt('💵 عهدة بداية الوردية (النقدية في الدرج):', '0');
  if (v === null) return;
  try {
    const r = await rpc('pos_open_shift', { p_token: S.sess.token, p_opening_cash: Number(v) || 0 });
    S.shift = r.shift;
    syncShiftBar();
    toast('🟢 فُتحت الوردية #' + S.shift.number);
  } catch (e) { toast('فشل فتح الوردية: ' + e.message, false); }
}
async function closeShiftUI() {
  const actual = prompt('🔒 جرد النقدية الفعلي في الدرج الآن (ر.س):', '');
  if (actual === null) return;
  try {
    const r = await rpc('pos_close_shift', { p_token: S.sess.token, p_actual_cash: Number(actual) || 0 });
    const z = r.z;
    S.shift = null; syncShiftBar();
    const methods = Object.keys(z.methods || {}).map(k =>
      `<tr><td>${PM_NAMES[k] || k}</td><td class="n">${fmt(z.methods[k])}</td></tr>`).join('');
    $('#z-body').innerHTML = `
      <table class="z-table"><tbody>
        <tr><td>وردية</td><td class="n">#${z.shift_number}</td></tr>
        <tr><td>عدد الفواتير</td><td class="n">${z.invoices_count}</td></tr>
        <tr><td>إجمالي المبيعات</td><td class="n b">${fmt(z.sales_total)}</td></tr>
        ${methods}
        <tr><td>الرصيد الافتتاحي</td><td class="n">${fmt(z.opening_cash)}</td></tr>
        <tr><td>النقدية المتوقعة</td><td class="n">${fmt(z.expected_cash)}</td></tr>
        <tr><td>الجرد الفعلي</td><td class="n">${fmt(z.actual_cash)}</td></tr>
        <tr><td>الفرق</td><td class="n b" style="color:${z.state === 'match' ? '#10B981' : '#F87171'}">
          ${fmt(z.difference)} (${z.state === 'match' ? 'مطابق ✅' : z.state === 'short' ? 'عجز ⚠️' : 'زيادة'})</td></tr>
      </tbody></table>`;
    showModal('z-modal');
    $('#btn-z-print').onclick = () => printReceiptBrowser({
      number: 'Z-' + z.shift_number, shift: z.shift_number, created_at: new Date().toISOString(),
      cashier: S.sess.name, lines: [{ name: 'تقرير إقفال وردية', qty: 1, price: z.sales_total }],
      subtotal: z.sales_total, discount: 0, tax: 0, total: z.sales_total,
      payments: Object.keys(z.methods || {}).map(k => ({ method: k, amount: z.methods[k] })),
      change: z.difference,
    });
  } catch (e) { toast('فشل إقفال الوردية: ' + e.message, false); }
}

/* ─────────── صفحة «⚙️ الأجهزة» ─────────── */
async function loadDevices() {
  try {
    const rows = await rpc('pos_get_devices', { p_token: S.sess.token });
    (rows || []).forEach(d => {
      const base = S.devices[d.device_type] || {};
      S.devices[d.device_type] = Object.assign(base, d.settings || {}, {
        mode: d.mode || base.mode, address: d.address || '', port: d.port || base.port,
      });
    });
  } catch (e) { /* الإعدادات الافتراضية تكفي */ }
}
async function saveDevice(type) {
  const d = S.devices[type];
  try {
    await rpc('pos_save_device', {
      p_token: S.sess.token, p_device_type: type, p_mode: d.mode,
      p_address: d.address || null, p_port: Number(d.port) || null,
      p_settings: Object.assign({}, d),
    });
    toast('💾 حُفظت إعدادات ' + (type === 'printer' ? 'الطابعة' : 'جهاز الدفع'));
  } catch (e) { toast('فشل حفظ الإعدادات: ' + e.message, false); }
}
function devicesUI() {
  const pr = S.devices.printer, py = S.devices.payment;
  $('#dev-printer-mode').value = pr.mode;
  $('#dev-printer-paper').value = pr.paper || '80';
  $('#dev-printer-bridge').value = pr.bridge_url || 'ws://127.0.0.1:9101';
  $('#dev-printer-addr').value = pr.address || '';
  $('#dev-printer-port').value = pr.port || 9100;
  $('#dev-printer-copies').value = pr.copies || 1;
  $('#dev-printer-drawer').checked = pr.open_drawer !== false;
  $('#dev-pay-mode').value = py.mode;
  $('#dev-pay-bridge').value = py.bridge_url || 'ws://127.0.0.1:9101';
  $('#dev-pay-addr').value = py.address || '';
  $('#dev-pay-port').value = py.port || 9100;
  $('#dev-pay-timeout').value = py.timeout || 60;
  $('#dev-printer-serial-note').textContent = ('serial' in navigator)
    ? '✅ WebSerial مدعوم في هذا المتصفح' : '⚠️ WebSerial غير مدعوم — استخدم Chrome/Edge على HTTPS';
  showModal('devices-modal');
}
function devicesRead() {
  const pr = S.devices.printer, py = S.devices.payment;
  pr.mode = $('#dev-printer-mode').value;
  pr.paper = $('#dev-printer-paper').value;
  pr.bridge_url = $('#dev-printer-bridge').value.trim() || 'ws://127.0.0.1:9101';
  pr.address = $('#dev-printer-addr').value.trim();
  pr.port = Number($('#dev-printer-port').value) || 9100;
  pr.copies = Math.min(4, Math.max(1, Number($('#dev-printer-copies').value) || 1));
  pr.open_drawer = $('#dev-printer-drawer').checked;
  py.mode = $('#dev-pay-mode').value;
  py.bridge_url = $('#dev-pay-bridge').value.trim() || 'ws://127.0.0.1:9101';
  py.address = $('#dev-pay-addr').value.trim();
  py.port = Number($('#dev-pay-port').value) || 9100;
  py.timeout = Math.min(300, Math.max(10, Number($('#dev-pay-timeout').value) || 60));
}
async function testPrint() {
  devicesRead();
  await printReceipt({
    number: 'TEST', shift: S.shift ? S.shift.number : '—', created_at: new Date().toISOString(),
    cashier: S.sess.name,
    lines: [{ name: 'اختبار طباعة — إيصال تجريبي', qty: 1, price: 1 }],
    subtotal: 1, discount: 0, tax: 0, total: 1,
    payments: [{ method: 'cash', amount: 1 }], change: 0,
  }, { openDrawer: false });
}
async function testBridge() {
  devicesRead();
  try {
    await bridgeRequest(S.devices.printer.bridge_url, { type: 'ping' }, 5000);
    toast('✅ الجسر يعمل ويستجيب');
  } catch (e) {
    toast('❌ الجسر لا يستجيب: ' + e.message +
      '\nشغّل على جهاز الكاشير: python pos-printer-bridge.py ثم اضبط IP الطابعة/الجهاز بالأعلى', false);
  }
}

/* ─────────── المودالات ─────────── */
function showModal(id) { $('#' + id).classList.add('open'); }
function closeModal(id) { $('#' + id).classList.remove('open'); }

/* ─────────── التهيئة ─────────── */
function init() {
  loginRender();
  $('#login-btn').onclick = doLogin;
  $('#btn-logout').onclick = doLogout;
  $('#btn-shift').onclick = openShiftUI;
  $('#btn-devices').onclick = devicesUI;
  $('#btn-checkout').onclick = openPayModal;
  $('#btn-park').onclick = parkCart;
  $('#btn-parked').onclick = unparkUI;
  $('#btn-return').onclick = doReturn;
  $('#btn-clear-cart').onclick = () => { if (S.cart.length && confirm('إفراغ السلة؟')) { S.cart = []; cartRender(); } };
  $('#btn-new-sale').onclick = () => { closeModal('success-modal'); $('#search-input').focus(); };
  $('#pay-add-line').onclick = () => { _payLines.push({ method: 'card', amount: 0, reference: '' }); payRender(); };
  $('#pay-customer').oninput = paySync;
  $('#pay-confirm').onclick = confirmCheckout;
  $('#dev-save-printer').onclick = () => { devicesRead(); saveDevice('printer'); };
  $('#dev-save-payment').onclick = () => { devicesRead(); saveDevice('payment'); };
  $('#dev-test-print').onclick = testPrint;
  $('#dev-test-bridge').onclick = testBridge;
  $$('.modal-close').forEach(b => b.onclick = () => closeModal(b.dataset.modal));
  const si = $('#search-input');
  si.oninput = () => gridRender(si.value);
  si.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); searchEnter(); } };
  // حقل البحث دائم التركيز (قارئ الباركود لوحة مفاتيح) — يعود التركيز بعد أي نقرة خارج حقول الإدخال
  document.addEventListener('click', (e) => {
    if (!e.target.closest('input, select, textarea, .modal.open, .pin-key')) {
      setTimeout(() => si.focus(), 50);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.modal.open').forEach(m => m.classList.remove('open'));
    if (e.key === 'F9') { e.preventDefault(); if (!$('#btn-checkout').disabled) openPayModal(); }
  });
  // استعادة جلسة سابقة
  if (sessLoad()) {
    bootApp().catch(() => loginRender());
  }
}
init();

Object.assign(g, { POS_STORE: pureExports, _posState: S });
})(typeof window !== 'undefined' ? window : globalThis);
