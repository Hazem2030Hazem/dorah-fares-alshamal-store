/* ═══════════════════════════════════════════════════════════════
   Batch P — staff-admin.js: تبويب «🔐 مستخدمو البوابات» في لوحة الأدمن
   إدارة مستخدمي بوابات الموظفين (staff.html) عبر RPCs security
   definer بفحص is_admin: staff_admin_list / staff_admin_upsert /
   staff_admin_audit. كلمات المرور تُخزَّن salt$sha256 فقط.
   يعمل بعد admin-v2.js (supabaseClient, erpEsc, erpToast).
   ═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';

function staffUsersReady() { return typeof supabaseClient !== 'undefined' && supabaseClient; }
var esc = function (v) {
  return (typeof erpEsc === 'function') ? erpEsc(v) : String(v == null ? '' : v);
};
var ROLE_LBL = { manager: '👔 مدير', accountant: '📒 محاسب', biller: '🧾 مفوتر',
                 hr: '👥 موارد بشرية', viewer: '👤 عرض' };

async function loadStaffUsersTab() {
  var box = document.getElementById('staffUsersList');
  if (!box || !staffUsersReady()) return;
  box.innerHTML = '<div class="admin-empty">⏳ جاري التحميل...</div>';
  var r = await supabaseClient.rpc('staff_admin_list');
  if (r.error) {
    box.innerHTML = '<div class="admin-empty">⚠️ نفّذ ملف store-staff.sql في Supabase أولاً<br><small>' +
      esc(r.error.message) + '</small></div>';
    return;
  }
  var rows = r.data || [];
  if (!rows.length) {
    box.innerHTML = '<div class="admin-empty">لا مستخدمون بعد — أضف أول مستخدم من الأعلى 👆</div>';
  } else {
    box.innerHTML = '<table style="width:100%"><thead><tr>' +
      '<th>المستخدم</th><th>الاسم</th><th>الدور</th><th>الحالة</th><th>آخر دخول</th><th>إجراءات</th>' +
      '</tr></thead><tbody>' + rows.map(function (u) {
        return '<tr>' +
          '<td style="font-weight:700" dir="ltr">' + esc(u.username) + '</td>' +
          '<td>' + esc(u.full_name || '—') + '</td>' +
          '<td>' + (ROLE_LBL[u.role] || esc(u.role)) + '</td>' +
          '<td>' + (u.is_active
            ? '<span style="color:#10B981;font-weight:700">نشط' + (u.locked ? ' 🔒 مؤقتاً' : '') + '</span>'
            : '<span style="color:#F87171;font-weight:700">معطّل</span>') + '</td>' +
          '<td>' + (u.last_login_at ? new Date(u.last_login_at).toLocaleString('ar-SA') : 'لم يدخل') + '</td>' +
          '<td style="white-space:nowrap">' +
            '<button class="btn-edit" data-dora-call="staffUserResetPw:' + u.id + ':' + esc(u.username) + '">🔑 كلمة مرور</button> ' +
            '<button class="btn-edit" data-dora-call="staffUserRole:' + u.id + ':' + esc(u.username) + ':' + u.role + '">🎭 الدور</button> ' +
            '<button class="btn-edit" data-dora-call="staffUserToggle:' + u.id + ':' + (!u.is_active) + '">' +
              (u.is_active ? '⛔ تعطيل' : '✅ تفعيل') + '</button>' +
          '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  loadStaffAudit();
}

async function staffUserAdd() {
  var u = document.getElementById('suUsername').value.trim().toLowerCase();
  var n = document.getElementById('suFullName').value.trim();
  var r = document.getElementById('suRole').value;
  var p = document.getElementById('suPassword').value;
  if (!/^[a-z0-9_.]{3,30}$/.test(u)) {
    return erpToast('❌ اسم المستخدم: 3-30 حرفاً إنجليزياً صغيراً أو رقماً أو _ .', 'error');
  }
  if (!p || p.length < 6) return erpToast('❌ كلمة المرور 6 أحرف على الأقل', 'error');
  var res = await supabaseClient.rpc('staff_admin_upsert', {
    p_username: u, p_password: p, p_name: n, p_role: r });
  if (res.error) return erpToast('❌ ' + res.error.message, 'error');
  document.getElementById('suUsername').value = '';
  document.getElementById('suFullName').value = '';
  document.getElementById('suPassword').value = '';
  erpToast('✅ أُضيف المستخدم — يدخل من staff.html');
  loadStaffUsersTab();
}

async function staffUserResetPw(id, username) {
  var p = prompt('🔑 كلمة مرور جديدة لـ «' + username + '» (6 أحرف على الأقل):');
  if (p === null) return;
  if (p.length < 6) return erpToast('❌ 6 أحرف على الأقل', 'error');
  var r = await supabaseClient.rpc('staff_admin_upsert', { p_id: id, p_password: p });
  if (r.error) return erpToast('❌ ' + r.error.message, 'error');
  erpToast('✅ غُيّرت كلمة المرور وأُنهيت جلساته القائمة');
  loadStaffUsersTab();
}

async function staffUserRole(id, username, current) {
  var r = prompt('🎭 الدور الجديد لـ «' + username + '»\n(manager / accountant / biller / hr / viewer):', current);
  if (r === null) return;
  r = r.trim().toLowerCase();
  if (['manager','accountant','biller','hr','viewer'].indexOf(r) < 0) {
    return erpToast('❌ دور غير معروف', 'error');
  }
  var res = await supabaseClient.rpc('staff_admin_upsert', { p_id: id, p_role: r });
  if (res.error) return erpToast('❌ ' + res.error.message, 'error');
  erpToast('✅ غُيّر الدور إلى ' + (ROLE_LBL[r] || r));
  loadStaffUsersTab();
}

async function staffUserToggle(id, activate) {
  var r = await supabaseClient.rpc('staff_admin_upsert', { p_id: id, p_active: activate });
  if (r.error) return erpToast('❌ ' + r.error.message, 'error');
  erpToast(activate ? '✅ فُعّل المستخدم' : '⛔ عُطّل وأُنهيت جلساته');
  loadStaffUsersTab();
}

async function loadStaffAudit() {
  var box = document.getElementById('staffAuditList');
  if (!box || !staffUsersReady()) return;
  var r = await supabaseClient.rpc('staff_admin_audit', { p_limit: 100 });
  if (r.error) { box.innerHTML = '<div class="admin-empty">⚠️ ' + esc(r.error.message) + '</div>'; return; }
  var rows = r.data || [];
  if (!rows.length) { box.innerHTML = '<div class="admin-empty">لا أحداث بعد</div>'; return; }
  box.innerHTML = '<table style="width:100%"><thead><tr>' +
    '<th>الوقت</th><th>الموظف</th><th>الحدث</th><th>التفاصيل</th></tr></thead><tbody>' +
    rows.map(function (a) {
      return '<tr><td style="white-space:nowrap">' + new Date(a.created_at).toLocaleString('ar-SA') + '</td>' +
        '<td>' + esc(a.name || a.username || '—') + '</td>' +
        '<td style="font-weight:700">' + esc(a.action) + '</td>' +
        '<td dir="ltr" style="font-family:monospace;font-size:11px;text-align:left">' +
          esc(JSON.stringify(a.details || {})) + '</td></tr>';
    }).join('') + '</tbody></table>';
}

window.loadStaffUsersTab = loadStaffUsersTab;
window.staffUserAdd = staffUserAdd;
window.staffUserResetPw = staffUserResetPw;
window.staffUserRole = staffUserRole;
window.staffUserToggle = staffUserToggle;
window.loadStaffAudit = loadStaffAudit;
})();
