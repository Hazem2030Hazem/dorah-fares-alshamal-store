/* ═══════════════════════════════════════════════════════════════
   Batch C1 — pos-admin.js: تبويب «🧑‍💼 الكاشيرون» في لوحة الأدمن
   إدارة الكاشيرين عبر RPCs security definer بفحص is_admin:
   pos_admin_list_cashiers / pos_admin_set_cashier (PIN يُخزَّن هاش).
   يعمل بعد admin-v2.js (supabaseClient, erpEsc, erpToast).
   ═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';

function cashiersLoaded() { return typeof supabaseClient !== 'undefined' && supabaseClient; }

async function loadCashiersTab() {
  var box = document.getElementById('cashiersList');
  if (!box || !cashiersLoaded()) return;
  box.innerHTML = '<div class="admin-empty">⏳ جاري التحميل...</div>';
  var r = await supabaseClient.rpc('pos_admin_list_cashiers');
  if (r.error) {
    box.innerHTML = '<div class="admin-empty">⚠️ نفّذ ملف store-pos.sql في Supabase أولاً<br><small>' +
      (typeof erpEsc === 'function' ? erpEsc(r.error.message) : r.error.message) + '</small></div>';
    return;
  }
  var rows = r.data || [];
  var esc = (typeof erpEsc === 'function') ? erpEsc : function (v) { return String(v == null ? '' : v); };
  if (!rows.length) {
    box.innerHTML = '<div class="admin-empty">لا كاشيرون بعد — أضف أول كاشير من الأعلى 👆</div>';
    return;
  }
  box.innerHTML = '<table style="width:100%"><thead><tr>' +
    '<th>المستخدم</th><th>الاسم</th><th>الفرع</th><th>الحالة</th><th>أُنشئ</th><th>إجراءات</th>' +
    '</tr></thead><tbody>' + rows.map(function (c) {
      return '<tr>' +
        '<td style="font-weight:700" dir="ltr">' + esc(c.username) + '</td>' +
        '<td>' + esc(c.full_name || '—') + '</td>' +
        '<td>' + esc(c.branch || '—') + '</td>' +
        '<td>' + (c.is_active
          ? '<span style="color:#10B981;font-weight:700">نشط' + (c.locked ? ' 🔒 مؤقتاً' : '') + '</span>'
          : '<span style="color:#F87171;font-weight:700">معطّل</span>') + '</td>' +
        '<td>' + new Date(c.created_at).toLocaleDateString('ar-SA') + '</td>' +
        '<td style="white-space:nowrap">' +
          '<button class="btn-edit" onclick="cashierResetPin(\'' + c.id + '\',\'' + esc(c.username) + '\')">🔑 PIN</button> ' +
          '<button class="btn-edit" onclick="cashierToggle(\'' + c.id + '\',' + (!c.is_active) + ')">' +
            (c.is_active ? '⛔ تعطيل' : '✅ تفعيل') + '</button>' +
        '</td></tr>';
    }).join('') + '</tbody></table>';
}

async function cashierAdd() {
  var u = document.getElementById('cashUsername').value.trim();
  var n = document.getElementById('cashFullName').value.trim();
  var b = document.getElementById('cashBranch').value.trim();
  var p = document.getElementById('cashPin').value.trim();
  if (!u) return erpToast('❌ اسم المستخدم مطلوب', 'error');
  if (!/^[0-9]{4,6}$/.test(p)) return erpToast('❌ الرمز السري 4-6 أرقام', 'error');
  var r = await supabaseClient.rpc('pos_admin_set_cashier', {
    p_username: u, p_pin: p, p_full_name: n, p_branch: b || null });
  if (r.error) return erpToast('❌ ' + r.error.message, 'error');
  document.getElementById('cashUsername').value = '';
  document.getElementById('cashFullName').value = '';
  document.getElementById('cashBranch').value = '';
  document.getElementById('cashPin').value = '';
  erpToast('✅ أُضيف الكاشير — يدخل من pos.html');
  loadCashiersTab();
}

async function cashierResetPin(id, username) {
  var p = prompt('🔑 PIN جديد للكاشير «' + username + '» (4-6 أرقام):');
  if (p === null) return;
  if (!/^[0-9]{4,6}$/.test(p.trim())) return erpToast('❌ الرمز 4-6 أرقام', 'error');
  var r = await supabaseClient.rpc('pos_admin_set_cashier', {
    p_cashier_id: id, p_pin: p.trim() });
  if (r.error) return erpToast('❌ ' + r.error.message, 'error');
  erpToast('✅ غُيّر الرمز وفُكّ القفل المؤقت إن وُجد');
  loadCashiersTab();
}

async function cashierToggle(id, activate) {
  var r = await supabaseClient.rpc('pos_admin_set_cashier', {
    p_cashier_id: id, p_is_active: activate });
  if (r.error) return erpToast('❌ ' + r.error.message, 'error');
  erpToast(activate ? '✅ فُعّل الكاشير' : '⛔ عُطّل الكاشير');
  loadCashiersTab();
}

window.loadCashiersTab = loadCashiersTab;
window.cashierAdd = cashierAdd;
window.cashierResetPin = cashierResetPin;
window.cashierToggle = cashierToggle;
})();
