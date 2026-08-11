/* ═══════════════════════════════════════════════════════════════
   Batch P — test-store-staff.js
   اختبارات المنطق النقي لبوابات الموظفين (staff-portal.js):
   هاش salt+SHA-256 (مطابق صيغة SQL)، قفل المحاولات (5/5د)،
   انتهاء الجلسة (12 ساعة)، مصفوفة صلاحيات الأدوار، القوائم.
   التشغيل: node test-store-staff.js
   في المتصفح: حمّل staff-portal.js ثم هذا الملف (sha256HexSync
   يتطلب Node — اختبارات الهاش تُتخطى تلقائياً في المتصفح).
   ═══════════════════════════════════════════════════════════════ */
(function (g) {
'use strict';

var P = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
  ? require('./staff-portal.js')
  : (g.STAFF_PURE || {});
var IS_NODE = (typeof module !== 'undefined' && !!module.exports);

var passed = 0, failed = 0, failures = [];
function ok(cond, name) {
  if (cond) { passed++; }
  else { failed++; failures.push(name); }
}
function eq(a, b, name) { ok(JSON.stringify(a) === JSON.stringify(b), name + ' — got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); }

/* ─── ١) الهاش: salt$sha256(salt:password) — لا صريح أبداً ─── */
if (IS_NODE) {
  var crypto = require('crypto');
  var salt = 'a1b2c3';
  var h = P.hashPassword(salt, 'Secret1');
  eq(h, salt + '$' + crypto.createHash('sha256').update(salt + ':Secret1', 'utf8').digest('hex'),
    'hash matches SQL format salt$sha256(salt:pw)');
  ok(h.indexOf('Secret1') < 0, 'plain password never in hash');
  ok(P.hashPassword('x', 'pw') !== P.hashPassword('y', 'pw'), 'different salt → different hash');
  ok(P.verifyPassword(h, 'Secret1'), 'verify ok');
  ok(!P.verifyPassword(h, 'secret1'), 'verify case-sensitive reject');
  ok(!P.verifyPassword(h, 'Secret2'), 'verify wrong reject');
  ok(!P.verifyPassword('', 'x'), 'empty stored reject');
}

/* ─── ٢) اسم المستخدم والدور ─── */
ok(P.isValidUsername('hazem.saleh_1'), 'username valid');
ok(!P.isValidUsername('HaZem'), 'username uppercase rejected (lowercase إجباري)');
ok(!P.isValidUsername('ab'), 'username too short');
ok(!P.isValidUsername('مستخدم'), 'username arabic rejected');
ok(!P.isValidUsername('a b'), 'username space rejected');
ok(P.isValidRole('manager') && P.isValidRole('viewer'), 'roles valid');
ok(!P.isValidRole('admin') && !P.isValidRole(''), 'admin is NOT a portal role');

/* ─── ٣) قفل المحاولات ─── */
var s = P.nextLockState(0, '2025-01-01T10:00:00Z');
eq([s.failed_attempts, s.locked], [1, false], 'first fail counts, no lock');
s = P.nextLockState(4, '2025-01-01T10:00:00Z');
eq([s.failed_attempts, s.locked], [5, true], '5th fail locks');
eq(s.locked_until, '2025-01-01T10:05:00.000Z', 'lock = +5 minutes');
var ls = P.lockState(5, '2025-01-01T10:05:00Z', '2025-01-01T10:02:00Z');
eq([ls.locked, ls.remainingMinutes], [true, 3], 'locked with remaining minutes');
ls = P.lockState(5, '2025-01-01T10:05:00Z', '2025-01-01T10:06:00Z');
eq(ls.locked, false, 'lock expired');
ls = P.lockState(2, null, '2025-01-01T10:00:00Z');
eq([ls.locked, ls.remainingAttempts], [false, 3], 'remaining attempts computed');

/* ─── ٤) الجلسة 12 ساعة ─── */
eq(P.sessionExpiry('2025-01-01T08:00:00Z'), '2025-01-01T20:00:00.000Z', 'expiry = +12h');
ok(P.isSessionValid('2025-01-01T08:00:00Z', '2025-01-01T19:59:00Z'), 'valid within 12h');
ok(!P.isSessionValid('2025-01-01T08:00:00Z', '2025-01-01T20:01:00Z'), 'expired after 12h');
ok(!P.isSessionValid(null), 'missing session invalid');

/* ─── ٥) مصفوفة صلاحيات الأدوار (مرآة _staff_require في SQL) ─── */
// المدير: كل شيء
['dashboard','orders','einvoice','vouchers','journal','expenses','reports',
 'trial_balance','aging','payroll','audit'].forEach(function (a) {
  ok(P.can('manager', a), 'manager can ' + a);
});
// المحاسب: ماليات بلا إعدادات/مستخدمين/منتجات/رواتب/مراجعة
['vouchers','journal','expenses','reports','trial_balance','aging'].forEach(function (a) {
  ok(P.can('accountant', a), 'accountant can ' + a);
});
['dashboard','orders','einvoice','payroll','audit'].forEach(function (a) {
  ok(!P.can('accountant', a), 'accountant CANNOT ' + a);
});
// المفوتر: طلبات وفواتير فقط
ok(P.can('biller', 'orders') && P.can('biller', 'einvoice'), 'biller orders+einvoice');
['vouchers','journal','expenses','reports','dashboard','payroll','audit'].forEach(function (a) {
  ok(!P.can('biller', a), 'biller CANNOT ' + a);
});
// الموارد: رواتب عرضاً فقط
ok(P.can('hr', 'payroll') && !P.can('hr', 'vouchers') && !P.can('hr', 'dashboard'), 'hr payroll only');
// العرض: تقارير أساسية فقط (لا ميزان مراجعة/ذمم)
ok(P.can('viewer', 'reports'), 'viewer reports');
['vouchers','journal','expenses','trial_balance','aging','orders','einvoice',
 'dashboard','payroll','audit'].forEach(function (a) {
  ok(!P.can('viewer', a), 'viewer CANNOT ' + a);
});
// دور غير معروف = لا شيء
ok(!P.can('ghost', 'reports') && !P.can('', 'reports'), 'unknown role denied');

/* ─── ٦) القوائم الجانبية من الدور ─── */
eq(P.menusForRole('biller'), ['orders', 'einvoices'], 'biller menu');
eq(P.menusForRole('viewer'), ['reports'], 'viewer menu');
eq(P.menusForRole('hr'), ['payroll'], 'hr menu');
eq(P.menusForRole('accountant'), ['vouchers', 'journal', 'expenses', 'reports'], 'accountant menu');
eq(P.menusForRole('manager'),
  ['dashboard', 'orders', 'einvoices', 'vouchers', 'journal', 'expenses', 'reports', 'payroll', 'audit'],
  'manager menu (all)');
eq(P.menusForRole('nobody'), [], 'unknown role → empty menu');
// لا يوجد عنصر قائمة بلا صلاحية معرّفة
ok(P.MENU_DEFS.every(function (m) { return !!m.perm && !!m.id && !!m.label; }), 'menu defs complete');

/* ─── ٧) التوكن 48 hex ─── */
if (IS_NODE) {
  var t = P.makeToken();
  ok(/^[0-9a-f]{48}$/.test(t), 'token 48 hex');
  ok(P.makeToken() !== P.makeToken(), 'tokens unique');
}

/* ─── النتيجة ─── */
var summary = 'staff-portal tests: ' + passed + ' passed, ' + failed + ' failed';
if (typeof document !== 'undefined') {
  var d = document.createElement('pre');
  d.textContent = summary + (failures.length ? '\n' + failures.join('\n') : '');
  document.body.appendChild(d);
} else {
  console.log(summary);
  if (failures.length) { console.log(failures.join('\n')); process.exit(1); }
}
})(typeof window !== 'undefined' ? window : globalThis);
