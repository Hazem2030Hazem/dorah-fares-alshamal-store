/* ═══════════════════════════════════════════════════════════════
   Batch Z3 — store-erp-plus.js
   وحدات ERP إضافية للوحة المتجر، منقولة ومُكيَّفة من HAZEM-ERP:
   hr.js (GOSI السعودي/غير السعودي بسقف 45,000، مكافأة نهاية الخدمة،
   قسائم الرواتب، WPS CSV)، assets.js (إهلاك: قسط ثابت / متناقص 2× /
   وحدات إنتاج)، expenses.js (تواريخ التكرار الشهري)، reports.js
   (أعمار الذمم FIFO بالشرائح 0-30/31-60/61-90/+90).
   جزآن في ملف واحد (بلا build step):
   • منطق نقي قابل للاختبار في Node: g.ERP_PLUS / module.exports.
   • واجهات المتصفح (بعد admin-v2.js): تبويب الموظفون والرواتب،
     تبويب الأصول الثابتة، إضافات المصروفات، تقارير متقدمة.
   قرارات موثقة:
   • القيود تُرحَّل عبر RPC ‏erp_plus_post_journal (store-erp-plus.sql)
     التي تنشئ الحسابات الناقصة بالكود تلقائياً — لا RPC قيد يدوي عام
     كان موجوداً في قاعدة المتجر.
   • حسابات افتراضية تُنشأ عند أول ترحيل: 5200 رواتب وأجور، 5210 حصة
     صاحب العمل GOSI، 2300 رواتب مستحقة، 2310 GOSI مستحق، 1590 مجمع
     إهلاك، 5300 مصروف إهلاك، 1100 خزينة، 1110 بنك.
   • المصروفات تُسجَّل بكامل المبلغ (شامل الضريبة) مديناً في حساب
     المصروف — لا فصل ضريبة مدخلات في القيد (ملخص الضريبة في التقارير
     يحتسبها حسابياً 15% شاملة) — تبسيط موثق.
   ═══════════════════════════════════════════════════════════════ */
(function (g) {
'use strict';

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const _num = (v) => Number(v) || 0;

/* ─────────── ١) GOSI (من hr.js) ─────────── */
const GOSI_DEFAULT = { sa_emp: 0.10, sa_er: 0.12, expat_er: 0.02, cap: 45000 };
function gosiCalc(basic, housing, isSaudi, cfg) {
  cfg = Object.assign({}, GOSI_DEFAULT, cfg || {});
  const base = Math.min(_num(basic) + _num(housing), _num(cfg.cap));
  if (isSaudi) return { base: r2(base), employee: r2(base * cfg.sa_emp), employer: r2(base * cfg.sa_er) };
  return { base: r2(base), employee: 0, employer: r2(base * cfg.expat_er) };
}
const isSaudiNat = (nat) => !/^(غير|non|expat)/i.test(String(nationalityTrim(nat)));
function nationalityTrim(n) { return String(n || 'سعودي').trim(); }

/* ─────────── ٢) مكافأة نهاية الخدمة (من hr.js) ─────────── */
// in: { hireDate, endDate, wage (أجر شامل شهري), reason: 'termination'|'resignation' }
function computeEOS(o) {
  const hire = new Date(o.hireDate), end = new Date(o.endDate);
  const wage = _num(o.wage);
  if (isNaN(hire) || isNaN(end) || end <= hire || wage <= 0) {
    return { years: 0, months: 0, gross: 0, factor: 0, award: 0 };
  }
  const years = (end - hire) / 86400000 / 365;
  const months = 0.5 * Math.min(years, 5) + Math.max(years - 5, 0);
  const gross = wage * months;
  let factor = 1;
  if (o.reason === 'resignation') {
    if (years < 2) factor = 0;
    else if (years < 5) factor = 1 / 3;
    else if (years < 10) factor = 2 / 3;
    else factor = 1;
  }
  return { years: r2(years * 100) / 100, months: r2(months * 1000) / 1000,
           gross: r2(gross), factor, award: r2(gross * factor) };
}

/* ─────────── ٣) قسيمة راتب (من hr.js — بدلات: سكن + أخرى) ─── */
function slipCalc(o, cfg) {
  const basic = r2(o.basic), housing = r2(o.housing), other = r2(o.other);
  const allowances = r2(housing + other);
  const gross = r2(basic + allowances);
  const gosi = gosiCalc(basic, housing, !!o.isSaudi, cfg);
  const net = r2(gross - gosi.employee);
  return { basic, housing, other, allowances, gross,
           gosi_base: gosi.base, gosi_employee: gosi.employee, gosi_employer: gosi.employer, net };
}

/* ─────────── ٤) ملف حماية الأجور WPS CSV (من hr.js + سجل إجمالي) ─── */
// HDR (سجل غير الراتب/المنشأة) + EMP لكل موظف + TOT (سجل الإجمالي)
function buildWpsCsv(run, slips, estNo) {
  const lines = [];
  lines.push(['HDR', estNo || '', run.month, slips.length, r2(run.total_net).toFixed(2)].join(','));
  (slips || []).forEach(s => {
    lines.push(['EMP',
      s.id_number || '', s.employee_name || '', String(s.iban || '').replace(/\s/g, ''),
      _num(s.basic).toFixed(2), r2(_num(s.housing) + _num(s.other)).toFixed(2),
      _num(s.gosi_employee).toFixed(2), _num(s.net).toFixed(2)].join(','));
  });
  const totGross = r2((slips || []).reduce((x, s) => x + _num(s.gross), 0));
  const totNet = r2((slips || []).reduce((x, s) => x + _num(s.net), 0));
  lines.push(['TOT', slips.length, totGross.toFixed(2), totNet.toFixed(2)].join(','));
  return lines.join('\r\n');
}

/* ─────────── ٥) الإهلاك (من assets.js) ─── */
function monthShift(period, n) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(period || ''));
  if (!m) return null;
  let y = +m[1], mo = +m[2] + (n || 0);
  y += Math.floor((mo - 1) / 12);
  mo = ((mo - 1) % 12 + 12) % 12 + 1;
  return y + '-' + String(mo).padStart(2, '0');
}
// بداية الإهلاك: الشهر التالي لتاريخ الشراء
function depStartPeriod(purchaseDate) {
  const d = new Date(purchaseDate);
  if (isNaN(d)) return null;
  const p = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  return monthShift(p, 1);
}
// القسط الثابت: (التكلفة − الخردة)/العمر شهرياً، الأخير يمتص التقريب
function slSchedule(o) {
  const base = r2(_num(o.cost) - _num(o.salvage));
  const months = Math.max(1, Math.round(_num(o.lifeYears) * 12));
  if (base <= 0 || !o.startPeriod) return [];
  const each = r2(base / months);
  const out = [];
  for (let i = 0; i < months - 1; i++) out.push({ period: monthShift(o.startPeriod, i), amount: each });
  out.push({ period: monthShift(o.startPeriod, months - 1), amount: r2(base - each * (months - 1)) });
  return out;
}
// القسط المتناقص: معدل سنوي 2× القسط الثابت على القيمة الدفترية، بسقف الخردة
function dbSchedule(o) {
  const salvage = _num(o.salvage);
  const rate = _num(o.rate) > 0 ? _num(o.rate) : (_num(o.lifeYears) > 0 ? 2 / _num(o.lifeYears) : 0);
  if (_num(o.cost) <= salvage || rate <= 0 || !o.startPeriod) return [];
  const mRate = rate / 12;
  const out = [];
  let bv = r2(o.cost);
  for (let i = 0; i < 1200; i++) {
    if (bv <= salvage) break;
    const remaining = r2(bv - salvage);
    let amt = r2(bv * mRate);
    if (amt <= 0 || amt >= remaining) amt = remaining;
    out.push({ period: monthShift(o.startPeriod, i), amount: amt });
    bv = r2(bv - amt);
    if (amt === remaining) break;
  }
  return out;
}
// وحدات الإنتاج: معدل الوحدة = (التكلفة − الخردة)/إجمالي الوحدات
function uopRate(cost, salvage, totalUnits) {
  const units = _num(totalUnits);
  if (units <= 0) return 0;
  return r2((_num(cost) - _num(salvage)) / units * 10000) / 10000;
}
function uopAmount(cost, salvage, totalUnits, unitsUsed) {
  return r2(uopRate(cost, salvage, totalUnits) * _num(unitsUsed));
}
function buildSchedule(asset) {
  const start = depStartPeriod(asset.purchase_date);
  const base = { cost: asset.cost, salvage: asset.salvage, lifeYears: asset.life_years, startPeriod: start };
  if (asset.dep_method === 'db') return dbSchedule(Object.assign({}, base, { rate: asset.db_rate }));
  if (asset.dep_method === 'uop') return [];
  return slSchedule(base);
}
// إهلاك فترة لأصل، مقيّد بالمتبقي حتى الخردة
function periodDepreciation(asset, period, accumulated, unitsUsed) {
  const start = depStartPeriod(asset.purchase_date);
  if (!start || !period || period < start) return 0;
  const cap = r2(_num(asset.cost) - _num(asset.salvage) - _num(accumulated));
  if (cap <= 0) return 0;
  let amt = 0;
  if (asset.dep_method === 'uop') amt = uopAmount(asset.cost, asset.salvage, asset.total_units, unitsUsed);
  else {
    const row = buildSchedule(asset).find(s => s.period === period);
    amt = row ? row.amount : 0;
  }
  return r2(Math.min(amt, cap));
}

/* ─────────── ٦) تواريخ التكرار الشهري (من expenses.js) ─── */
const _iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
  '-' + String(d.getDate()).padStart(2, '0');
function addMonthsClamped(isoDate, months) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ''));
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const target = new Date(y, mo - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return _iso(new Date(target.getFullYear(), target.getMonth(), Math.min(d, lastDay)));
}
function nextRunDate(fromIso) { return addMonthsClamped(fromIso, 1); } // شهري فقط
function recurringIsDue(tpl, todayIso) {
  if (!tpl || tpl.is_active === false) return false;
  const next = tpl.next_run_date;
  if (!next || !todayIso || String(next) > String(todayIso)) return false;
  return true;
}

/* ─────────── ٧) أعمار الذمم (من reports.js — FIFO + شرائح) ─── */
function allocateFifo(invoices, paymentsTotal) {
  let pool = r2(_num(paymentsTotal));
  return (invoices || []).map(inv => {
    const total = r2(_num(inv.total));
    const paid = r2(Math.min(pool, total));
    pool = r2(Math.max(pool - paid, 0));
    return Object.assign({}, inv, { paid, remaining: r2(total - paid) });
  });
}
function overdueDays(dueIso, todayIso) {
  const a = new Date(dueIso), b = new Date(todayIso);
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(0, Math.floor((b - a) / 86400000));
}
function agingRows(invoices, paymentsTotal, todayIso, termDays) {
  const term = termDays == null ? 30 : _num(termDays);
  return allocateFifo(invoices, paymentsTotal)
    .filter(i => i.remaining > 0)
    .map(i => {
      const base = new Date(i.created_at);
      const due = isNaN(base) ? null : _iso(new Date(base.getTime() + term * 86400000));
      return Object.assign({}, i, { due_date: due, overdue_days: due ? overdueDays(due, todayIso) : 0 });
    });
}
function agingBucket(days) {
  const d = _num(days);
  if (d <= 30) return 'b30';
  if (d <= 60) return 'b60';
  if (d <= 90) return 'b90';
  return 'b90p';
}
function aggregateAging(rows) {
  const by = {};
  (rows || []).forEach(r => {
    const k = String(r.party_id);
    if (!by[k]) by[k] = { party_id: r.party_id, party_name: r.party_name || '—',
      b30: 0, b60: 0, b90: 0, b90p: 0, total: 0 };
    const b = agingBucket(r.overdue_days);
    by[k][b] = r2(by[k][b] + _num(r.remaining));
    by[k].total = r2(by[k].total + _num(r.remaining));
  });
  const list = Object.values(by).sort((a, b) => b.total - a.total);
  const totals = { b30: 0, b60: 0, b90: 0, b90p: 0, total: 0 };
  list.forEach(r => { ['b30', 'b60', 'b90', 'b90p', 'total'].forEach(k => { totals[k] = r2(totals[k] + r[k]); }); });
  return { rows: list, totals };
}

/* ─────────── ٨) ضريبة 15% شاملة + ملخص الفترة ─── */
const VAT_RATE = 0.15;
const vatIncluded = (gross) => r2(_num(gross) * VAT_RATE / (1 + VAT_RATE));
// ملخص ضريبي: مبيعات (من طلبات المتجر) + مشتريات/مصروفات (شاملة) → صافي المستحق
function vatSummary(o) {
  const salesTotal = r2(_num(o.salesTotal));
  const outputVat = o.outputVat != null ? r2(o.outputVat) : vatIncluded(salesTotal);
  const purchasesTotal = r2(_num(o.purchasesTotal));
  const expensesTotal = r2(_num(o.expensesTotal));
  const inputVat = r2(vatIncluded(purchasesTotal) + vatIncluded(expensesTotal));
  return { salesTotal, taxableSales: r2(salesTotal - outputVat), outputVat,
           purchasesTotal, expensesTotal, inputVat, netDue: r2(outputVat - inputVat) };
}

const ERP_PLUS = {
  r2, GOSI_DEFAULT, gosiCalc, isSaudiNat, computeEOS, slipCalc, buildWpsCsv,
  monthShift, depStartPeriod, slSchedule, dbSchedule, uopRate, uopAmount,
  buildSchedule, periodDepreciation,
  addMonthsClamped, nextRunDate, recurringIsDue,
  allocateFifo, overdueDays, agingRows, agingBucket, aggregateAging,
  VAT_RATE, vatIncluded, vatSummary,
};
g.ERP_PLUS = ERP_PLUS;
if (typeof module !== 'undefined' && module.exports) module.exports = ERP_PLUS;
if (typeof document === 'undefined') return; // Node: منطق نقي فقط

/* ═══════════════════════ واجهات المتصفح ═══════════════════════ */
const P = ERP_PLUS;
const sb = (typeof supabaseClient !== 'undefined') ? supabaseClient : null;
const $p = (id) => document.getElementById(id);
const pEsc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
const pToast = (m, ok) => { if (typeof showToast === 'function') showToast(m, ok === false ? 'error' : 'success'); else alert(m); };
const pFmt = (n) => P.r2(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const todayIso = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const curMonth = () => todayIso().slice(0, 7);
const SQL_HINT = ' — نفّذ ملف store-erp-plus.sql في SQL Editor أولاً';
const pErr = (e) => pToast('❌ ' + (e && e.message ? e.message : e) + (e && e.message && /does not exist|schema cache|relation/i.test(e.message) ? SQL_HINT : ''), false);

// حسابات القيود الافتراضية (تُنشأ تلقائياً بالكود عند أول ترحيل)
const ACC = {
  salExp: { code: '5200', name: 'رواتب وأجور', kind: 'expense' },
  gosiExp: { code: '5210', name: 'حصة صاحب العمل — GOSI', kind: 'expense' },
  eosExp: { code: '5220', name: 'مصروف مكافأة نهاية الخدمة', kind: 'expense' },
  depExp: { code: '5300', name: 'مصروف الإهلاك', kind: 'expense' },
  genExp: { code: '5900', name: 'مصروفات تشغيلية عامة', kind: 'expense' },
  salPay: { code: '2300', name: 'رواتب مستحقة', kind: 'liability' },
  gosiPay: { code: '2310', name: 'اشتراكات GOSI مستحقة', kind: 'liability' },
  eosPay: { code: '2320', name: 'مخصص مكافآت نهاية الخدمة', kind: 'liability' },
  depAcc: { code: '1590', name: 'مجمع إهلاك الأصول الثابتة', kind: 'asset' },
  cash: { code: '1100', name: 'الخزينة', kind: 'asset' },
  bank: { code: '1110', name: 'البنك', kind: 'asset' },
};
const L = (acc, dr, cr, party) => ({ account_code: acc.code, account_name: acc.name, kind: acc.kind,
  debit: P.r2(dr), credit: P.r2(cr), party: party || null });

async function postJournal(memo, refType, lines) {
  const r = await sb.rpc('erp_plus_post_journal', { p_memo: memo, p_ref_type: refType, p_lines: lines });
  if (r.error) throw r.error;
  return r.data; // entry_number
}
async function pDownload(filename, content, mime) {
  const blob = new Blob(['﻿' + content], { type: (mime || 'text/csv') + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
}
function pPrint(title, bodyHtml) {
  const w = window.open('', '_blank');
  if (!w) { pToast('⚠️ اسمح بالنوافذ المنبثقة للطباعة', false); return; }
  w.document.write('<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>' + pEsc(title) + '</title>' +
    '<style>body{font-family:Tahoma,Arial;padding:24px;color:#111}table{width:100%;border-collapse:collapse;margin:12px 0}' +
    'th,td{border:1px solid #999;padding:8px;text-align:right}th{background:#eee}h2{margin:0 0 4px}.tot{font-weight:700;font-size:18px}</style></head><body>' +
    '<h2>' + pEsc(title) + '</h2>' + bodyHtml + '<script>window.onload=function(){window.print()}<' + '/script></body></html>');
  w.document.close();
}
function xlsxExport(sheetName, aoa, filename) {
  if (typeof XLSX === 'undefined') { pToast('⚠️ مكتبة XLSX غير محمّلة', false); return; }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

/* ═══════════════ ١) الموظفون والرواتب ═══════════════ */
let _emps = [], _runs = [], _runSlips = [];

window.loadHrPlusTab = async function () {
  if (!sb) return;
  const m = $p('hrpRunMonth'); if (m && !m.value) m.value = curMonth();
  const [e1, e2] = await Promise.all([
    sb.from('erp_employees').select('*').order('created_at', { ascending: false }),
    sb.from('erp_payroll_runs').select('*').order('month', { ascending: false }),
  ]);
  if (e1.error) { pErr(e1.error); return; }
  _emps = e1.data || []; _runs = e2.data || [];
  renderEmps(); renderRuns(); hrpFillEosEmps();
};
window.hrpSub = function (sub) {
  ['emps', 'runs', 'eos'].forEach(s => {
    const b = $p('hrp-pane-' + s); if (b) b.style.display = s === sub ? '' : 'none';
    const t = $p('hrp-sub-' + s); if (t) { t.style.background = s === sub ? '#8B5CF6' : 'rgba(148,163,184,.2)'; }
  });
};
function renderEmps() {
  const tb = $p('hrpEmpsTable'); if (!tb) return;
  if (!_emps.length) { tb.innerHTML = '<tr><td colspan="9" class="admin-empty">👥 لا يوجد موظفون بعد — أضف من النموذج بالأعلى</td></tr>'; return; }
  tb.innerHTML = _emps.map(e =>
    '<tr><td style="font-weight:700">' + pEsc(e.name) + '</td><td>' + pEsc(e.nationality) + '</td>' +
    '<td dir="ltr">' + pEsc(e.phone || '—') + '</td><td>' + pEsc(e.job_title || '—') + '</td>' +
    '<td>' + pFmt(e.basic_salary) + '</td><td>' + pFmt(e.housing_allowance) + '</td><td>' + pFmt(e.other_allowances) + '</td>' +
    '<td>' + (e.status === 'active' ? '<span style="color:#22C55E;font-weight:700">نشط</span>' : '<span style="color:#EF4444">موقوف</span>') + '</td>' +
    '<td style="white-space:nowrap"><button class="btn-add" style="padding:4px 10px;font-size:12px" data-dora-call="hrpEditEmp:' + e.id + '">✏️</button> ' +
    '<button class="btn-add" style="padding:4px 10px;font-size:12px;background:' + (e.status === 'active' ? '#F59E0B' : '#22C55E') + '" data-dora-call="hrpToggleEmp:' + e.id + '">' + (e.status === 'active' ? '⏸️' : '▶️') + '</button></td></tr>').join('');
}
window.hrpSaveEmp = async function () {
  const id = $p('hrpEmpId').value;
  const rec = {
    name: $p('hrpEmpName').value.trim(),
    nationality: $p('hrpEmpNat').value,
    phone: $p('hrpEmpPhone').value.trim() || null,
    job_title: $p('hrpEmpJob').value.trim() || null,
    basic_salary: P.r2($p('hrpEmpBasic').value),
    housing_allowance: P.r2($p('hrpEmpHousing').value),
    other_allowances: P.r2($p('hrpEmpOther').value),
    hire_date: $p('hrpEmpHire').value || null,
    iban: $p('hrpEmpIban').value.trim() || null,
  };
  if (!rec.name) { pToast('⚠️ اكتب اسم الموظف', false); return; }
  if (rec.basic_salary <= 0) { pToast('⚠️ الراتب الأساسي لازم يكون أكبر من صفر', false); return; }
  const r = id ? await sb.from('erp_employees').update(rec).eq('id', id)
               : await sb.from('erp_employees').insert(Object.assign({ status: 'active' }, rec));
  if (r.error) { pErr(r.error); return; }
  pToast('✅ تم حفظ الموظف «' + rec.name + '»');
  hrpResetEmpForm(); loadHrPlusTab();
};
window.hrpEditEmp = function (id) {
  const e = _emps.find(x => x.id === id); if (!e) return;
  $p('hrpEmpId').value = e.id; $p('hrpEmpName').value = e.name; $p('hrpEmpNat').value = e.nationality || 'سعودي';
  $p('hrpEmpPhone').value = e.phone || ''; $p('hrpEmpJob').value = e.job_title || '';
  $p('hrpEmpBasic').value = e.basic_salary; $p('hrpEmpHousing').value = e.housing_allowance;
  $p('hrpEmpOther').value = e.other_allowances; $p('hrpEmpHire').value = e.hire_date || '';
  $p('hrpEmpIban').value = e.iban || '';
  $p('hrpEmpSaveBtn').textContent = '💾 حفظ التعديل';
  $p('hrpEmpName').focus();
};
window.hrpResetEmpForm = function () {
  ['hrpEmpId', 'hrpEmpName', 'hrpEmpPhone', 'hrpEmpJob', 'hrpEmpHire', 'hrpEmpIban'].forEach(i => { $p(i).value = ''; });
  ['hrpEmpBasic', 'hrpEmpHousing', 'hrpEmpOther'].forEach(i => { $p(i).value = ''; });
  $p('hrpEmpSaveBtn').textContent = '➕ إضافة الموظف';
};
window.hrpToggleEmp = async function (id) {
  const e = _emps.find(x => x.id === id); if (!e) return;
  const st = e.status === 'active' ? 'suspended' : 'active';
  const r = await sb.from('erp_employees').update({ status: st }).eq('id', id);
  if (r.error) { pErr(r.error); return; }
  pToast(st === 'active' ? '▶️ تم تفعيل الموظف' : '⏸️ تم إيقاف الموظف');
  loadHrPlusTab();
};

/* ─── مسيّرات الرواتب ─── */
function renderRuns() {
  const tb = $p('hrpRunsTable'); if (!tb) return;
  if (!_runs.length) { tb.innerHTML = '<tr><td colspan="8" class="admin-empty">🧾 لا توجد مسيّرات — اختر الشهر واضغط «توليد المسيّر»</td></tr>'; return; }
  tb.innerHTML = _runs.map(r =>
    '<tr><td dir="ltr" style="font-weight:700">' + r.month + '</td><td>' + r.employees_count + '</td>' +
    '<td>' + pFmt(r.total_gross) + '</td><td>' + pFmt(r.total_gosi_employee) + '</td><td>' + pFmt(r.total_gosi_employer) + '</td>' +
    '<td style="font-weight:700;color:#22C55E">' + pFmt(r.total_net) + '</td>' +
    '<td>' + (r.status === 'posted' ? '<span style="color:#22C55E;font-weight:700">✅ مرحّل (قيد ' + (r.entry_number || '—') + ')</span>' : '<span style="color:#F59E0B">مسودة</span>') + '</td>' +
    '<td style="white-space:nowrap">' +
    '<button class="btn-add" style="padding:4px 10px;font-size:12px" data-dora-call="hrpViewRun:' + r.id + '">📋 القسائم</button> ' +
    (r.status === 'draft' ? '<button class="btn-add" style="padding:4px 10px;font-size:12px;background:#22C55E" data-dora-call="hrpPostRun:' + r.id + '">📤 ترحيل القيد</button> ' : '') +
    '<button class="btn-add" style="padding:4px 10px;font-size:12px;background:#0EA5E9" data-dora-call="hrpExportWps:' + r.id + '">🏦 WPS</button> ' +
    (r.status === 'draft' ? '<button class="btn-delete" style="padding:4px 10px;font-size:12px" data-dora-call="hrpDeleteRun:' + r.id + '">🗑️</button>' : '') +
    '</td></tr>').join('');
}
window.hrpGenerateRun = async function () {
  const month = $p('hrpRunMonth').value;
  if (!month) { pToast('⚠️ اختر الشهر أولاً', false); return; }
  if (_runs.some(r => r.month === month)) { pToast('⚠️ يوجد مسيّر لهذا الشهر مسبقاً', false); return; }
  const emps = _emps.filter(e => e.status === 'active');
  if (!emps.length) { pToast('⚠️ لا يوجد موظفون نشطون', false); return; }
  const slips = emps.map(e => ({
    emp: e,
    s: P.slipCalc({ basic: e.basic_salary, housing: e.housing_allowance, other: e.other_allowances,
                    isSaudi: P.isSaudiNat(e.nationality) }),
  }));
  const tot = (k) => P.r2(slips.reduce((x, p) => x + p.s[k], 0));
  const run = await sb.from('erp_payroll_runs').insert({
    month, status: 'draft', employees_count: slips.length,
    total_gross: tot('gross'), total_gosi_employee: tot('gosi_employee'),
    total_gosi_employer: tot('gosi_employer'), total_net: tot('net'),
  }).select().single();
  if (run.error) { pErr(run.error); return; }
  for (const p of slips) {
    const r = await sb.from('erp_payroll_slips').insert({
      run_id: run.data.id, employee_id: p.emp.id, employee_name: p.emp.name,
      basic: p.s.basic, housing: p.s.housing, other: p.s.other, gross: p.s.gross,
      gosi_base: p.s.gosi_base, gosi_employee: p.s.gosi_employee, gosi_employer: p.s.gosi_employer, net: p.s.net,
    });
    if (r.error) { pErr(r.error); return; }
  }
  pToast('✅ تم توليد مسيّر ' + month + ' لعدد ' + slips.length + ' موظفاً');
  loadHrPlusTab(); hrpViewRun(run.data.id);
};
window.hrpViewRun = async function (runId) {
  const run = _runs.find(r => r.id === runId); if (!run) return;
  const r = await sb.from('erp_payroll_slips').select('*').eq('run_id', runId).order('created_at');
  if (r.error) { pErr(r.error); return; }
  _runSlips = r.data || [];
  const box = $p('hrpSlipsBox'); if (!box) return;
  box.style.display = '';
  $p('hrpSlipsTitle').textContent = '📋 قسائم رواتب ' + run.month;
  $p('hrpSlipsTable').innerHTML = _runSlips.map(s =>
    '<tr><td style="font-weight:700">' + pEsc(s.employee_name) + '</td><td>' + pFmt(s.basic) + '</td><td>' + pFmt(s.housing) + '</td>' +
    '<td>' + pFmt(s.other) + '</td><td>' + pFmt(s.gross) + '</td><td style="color:#EF4444">' + pFmt(s.gosi_employee) + '</td>' +
    '<td>' + pFmt(s.gosi_employer) + '</td><td style="font-weight:700;color:#22C55E">' + pFmt(s.net) + '</td>' +
    '<td><button class="btn-add" style="padding:4px 10px;font-size:12px;background:#0EA5E9" data-dora-call="hrpPrintSlip:' + s.id + '">🖨️ قسيمة</button></td></tr>').join('');
};
window.hrpPostRun = async function (runId) {
  const run = _runs.find(r => r.id === runId);
  if (!run || run.status !== 'draft') return;
  if (!confirm('ترحيل قيد رواتب ' + run.month + '؟ (مدين: رواتب + GOSI صاحب عمل / دائن: رواتب مستحقة + GOSI مستحق)')) return;
  const lines = [L(ACC.salExp, run.total_gross, 0)];
  if (run.total_gosi_employer > 0) lines.push(L(ACC.gosiExp, run.total_gosi_employer, 0));
  lines.push(L(ACC.salPay, 0, run.total_net));
  const gosiTot = P.r2(run.total_gosi_employee + run.total_gosi_employer);
  if (gosiTot > 0) lines.push(L(ACC.gosiPay, 0, gosiTot));
  let num;
  try { num = await postJournal('رواتب شهر ' + run.month, 'payroll', lines); }
  catch (e) { pErr(e); return; }
  const u = await sb.from('erp_payroll_runs').update({ status: 'posted', entry_number: num }).eq('id', runId);
  if (u.error) { pErr(u.error); return; }
  pToast('✅ تم ترحيل القيد رقم ' + num);
  loadHrPlusTab();
};
window.hrpDeleteRun = async function (runId) {
  const run = _runs.find(r => r.id === runId);
  if (!run || run.status !== 'draft') return;
  if (!confirm('حذف مسيّر ' + run.month + ' (مسودة)؟')) return;
  const r = await sb.from('erp_payroll_runs').delete().eq('id', runId);
  if (r.error) { pErr(r.error); return; }
  pToast('🗑️ تم حذف المسيّر'); loadHrPlusTab();
  const box = $p('hrpSlipsBox'); if (box) box.style.display = 'none';
};
window.hrpPrintSlip = function (slipId) {
  const s = _runSlips.find(x => x.id === slipId); if (!s) return;
  const e = _emps.find(x => x.id === s.employee_id) || {};
  const row = (t, v) => '<tr><td>' + t + '</td><td style="text-align:left">' + pFmt(v) + ' ر.س</td></tr>';
  pPrint('قسيمة راتب — ' + (s.employee_name || ''),
    '<p><b>الموظف:</b> ' + pEsc(s.employee_name) + ' &nbsp;|&nbsp; <b>الوظيفة:</b> ' + pEsc(e.job_title || '—') +
    ' &nbsp;|&nbsp; <b>IBAN:</b> <span dir="ltr">' + pEsc(e.iban || '—') + '</span></p>' +
    '<table><thead><tr><th>الاستحقاقات</th><th>المبلغ</th></tr></thead><tbody>' +
    row('الراتب الأساسي', s.basic) + row('بدل السكن', s.housing) + row('بدلات أخرى', s.other) +
    '<tr style="font-weight:700"><td>الإجمالي</td><td style="text-align:left">' + pFmt(s.gross) + ' ر.س</td></tr></tbody></table>' +
    '<table><thead><tr><th>الاستقطاعات</th><th>المبلغ</th></tr></thead><tbody>' +
    row('GOSI — حصة الموظف (10%)', s.gosi_employee) + '</tbody></table>' +
    '<p class="tot">صافي الراتب: ' + pFmt(s.net) + ' ر.س</p>' +
    '<p style="color:#555;font-size:13px">حصة صاحب العمل في GOSI (تكلفة إضافية): ' + pFmt(s.gosi_employer) + ' ر.س</p>');
};
window.hrpExportWps = async function (runId) {
  const run = _runs.find(r => r.id === runId); if (!run) return;
  const r = await sb.from('erp_payroll_slips').select('*').eq('run_id', runId);
  if (r.error) { pErr(r.error); return; }
  const slips = (r.data || []).map(s => {
    const e = _emps.find(x => x.id === s.employee_id) || {};
    return Object.assign({}, s, { iban: e.iban, id_number: e.phone || '' });
  });
  let estNo = '';
  try {
    const z = await sb.from('zatca_config').select('vat_number').eq('id', 1).maybeSingle();
    estNo = (z.data && z.data.vat_number) || '';
  } catch (_) {}
  await pDownload('WPS-' + run.month + '.csv', P.buildWpsCsv(run, slips, estNo));
  pToast('🏦 تم تصدير ملف حماية الأجور WPS-' + run.month + '.csv');
};

/* ─── حاسبة نهاية الخدمة ─── */
function hrpFillEosEmps() {
  const sel = $p('hrpEosEmp'); if (!sel) return;
  sel.innerHTML = '<option value="">— اختر الموظف (تعبئة تلقائية) —</option>' +
    _emps.map(e => '<option value="' + e.id + '">' + pEsc(e.name) + '</option>').join('');
}
window.hrpEosFill = function () {
  const e = _emps.find(x => x.id === $p('hrpEosEmp').value); if (!e) return;
  $p('hrpEosHire').value = e.hire_date || '';
  $p('hrpEosWage').value = P.r2((Number(e.basic_salary) || 0) + (Number(e.housing_allowance) || 0) + (Number(e.other_allowances) || 0));
};
window.hrpEosCalc = function () {
  const o = P.computeEOS({
    hireDate: $p('hrpEosHire').value, endDate: $p('hrpEosEnd').value || todayIso(),
    wage: $p('hrpEosWage').value, reason: $p('hrpEosReason').value,
  });
  const box = $p('hrpEosResult');
  const facLbl = o.factor === 1 ? 'كاملة' : o.factor === 0 ? 'لا تستحق' : o.factor === 1 / 3 ? 'الثلث' : 'الثلثان';
  box.innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:12px">' +
    [['سنوات الخدمة', o.years], ['الأشهر المستحقة', o.months], ['الإجمالي قبل الشرائح', pFmt(o.gross) + ' ر.س'],
     ['معامل الاستحقاق', facLbl], ['💰 المكافأة المستحقة', pFmt(o.award) + ' ر.س']].map(x =>
      '<div class="erp-box" style="border:1px solid rgba(148,163,184,.25);border-radius:10px;padding:12px;text-align:center">' +
      '<div style="font-size:12px;color:#94A3B8">' + x[0] + '</div><div style="font-size:18px;font-weight:700;color:#22C55E">' + x[1] + '</div></div>').join('') + '</div>';
  box.dataset.award = o.award;
  if (o.award <= 0) pToast('⚠️ لا تستحق مكافأة (تحقق من المدخلات)', false);
};
window.hrpEosPost = async function () {
  const award = Number(($p('hrpEosResult').dataset || {}).award) || 0;
  if (award <= 0) { pToast('⚠️ احسب المكافأة أولاً', false); return; }
  const empName = ($p('hrpEosEmp').selectedOptions[0] || {}).textContent || '';
  if (!confirm('ترحيل قيد مكافأة نهاية خدمة بمبلغ ' + pFmt(award) + ' ر.س؟')) return;
  let num;
  try { num = await postJournal('مكافأة نهاية خدمة — ' + empName, 'eos', [L(ACC.eosExp, award, 0), L(ACC.eosPay, 0, award, empName)]); }
  catch (e) { pErr(e); return; }
  pToast('✅ تم ترحيل القيد رقم ' + num);
};

/* ═══════════════ ٢) الأصول الثابتة ═══════════════ */
let _assets = [], _depEntries = [];
const DEP_LBL = { sl: 'قسط ثابت', db: 'قسط متناقص 2×', uop: 'وحدات إنتاج' };

window.loadAssetsPlusTab = async function () {
  if (!sb) return;
  const m = $p('astDepMonth'); if (m && !m.value) m.value = curMonth();
  const [a, d] = await Promise.all([
    sb.from('erp_assets').select('*').order('created_at', { ascending: false }),
    sb.from('erp_asset_depreciation').select('*').order('period', { ascending: false }),
  ]);
  if (a.error) { pErr(a.error); return; }
  _assets = a.data || []; _depEntries = d.data || [];
  renderAssets(); renderDepLog();
};
function assetAccum(id, uptoPeriod) {
  return P.r2(_depEntries.filter(x => x.asset_id === id && (!uptoPeriod || x.period <= uptoPeriod))
    .reduce((s, x) => s + (Number(x.amount) || 0), 0));
}
function renderAssets() {
  const tb = $p('astTable'); if (!tb) return;
  if (!_assets.length) { tb.innerHTML = '<tr><td colspan="9" class="admin-empty">🏢 لا توجد أصول — أضف من النموذج بالأعلى</td></tr>'; return; }
  tb.innerHTML = _assets.map(a => {
    const accum = assetAccum(a.id);
    const bv = P.r2((Number(a.cost) || 0) - accum);
    return '<tr><td style="font-weight:700">' + pEsc(a.name) + '</td><td>' + pEsc(a.category || '—') + '</td>' +
      '<td dir="ltr">' + pEsc(a.purchase_date) + '</td><td>' + pFmt(a.cost) + '</td><td>' + pFmt(a.salvage) + '</td>' +
      '<td>' + a.life_years + ' سنوات</td><td>' + (DEP_LBL[a.dep_method] || a.dep_method) + '</td>' +
      '<td>' + pFmt(accum) + '</td><td style="font-weight:700;color:#22C55E">' + pFmt(bv) + '</td>' +
      '<td><button class="btn-delete" style="padding:4px 10px;font-size:12px" data-dora-call="astDelete:' + a.id + '">🗑️</button></td></tr>';
  }).join('');
}
function renderDepLog() {
  const tb = $p('astDepTable'); if (!tb) return;
  if (!_depEntries.length) { tb.innerHTML = '<tr><td colspan="4" class="admin-empty">لا توجد إهلاكات مرحّلة بعد</td></tr>'; return; }
  tb.innerHTML = _depEntries.slice(0, 100).map(d => {
    const a = _assets.find(x => x.id === d.asset_id) || {};
    return '<tr><td dir="ltr">' + d.period + '</td><td>' + pEsc(a.name || '—') + '</td>' +
      '<td>' + pFmt(d.amount) + '</td><td>' + (d.entry_number ? 'قيد ' + d.entry_number : '—') + '</td></tr>';
  }).join('');
}
window.astSave = async function () {
  const rec = {
    name: $p('astName').value.trim(), category: $p('astCat').value.trim() || null,
    purchase_date: $p('astDate').value, cost: P.r2($p('astCost').value),
    salvage: P.r2($p('astSalvage').value), life_years: Number($p('astLife').value) || 5,
    dep_method: $p('astMethod').value,
    total_units: $p('astMethod').value === 'uop' ? (Number($p('astUnits').value) || null) : null,
  };
  if (!rec.name) { pToast('⚠️ اكتب اسم الأصل', false); return; }
  if (!rec.purchase_date) { pToast('⚠️ اختر تاريخ الشراء', false); return; }
  if (rec.cost <= 0) { pToast('⚠️ التكلفة لازم تكون أكبر من صفر', false); return; }
  if (rec.salvage >= rec.cost) { pToast('⚠️ قيمة الخردة لازم تكون أقل من التكلفة', false); return; }
  if (rec.dep_method === 'uop' && !(rec.total_units > 0)) { pToast('⚠️ أدخل إجمالي الوحدات المقدرة', false); return; }
  const r = await sb.from('erp_assets').insert(rec);
  if (r.error) { pErr(r.error); return; }
  pToast('✅ تم حفظ الأصل «' + rec.name + '»');
  ['astName', 'astCat', 'astCost', 'astSalvage', 'astUnits'].forEach(i => { $p(i).value = ''; });
  loadAssetsPlusTab();
};
window.astDelete = async function (id) {
  if (assetAccum(id) > 0) { pToast('⚠️ لا يمكن حذف أصل له إهلاكات مرحّلة', false); return; }
  if (!confirm('حذف الأصل؟')) return;
  const r = await sb.from('erp_assets').delete().eq('id', id);
  if (r.error) { pErr(r.error); return; }
  pToast('🗑️ تم الحذف'); loadAssetsPlusTab();
};
window.astMethodChange = function () {
  const u = $p('astUnits'); if (u) u.style.display = $p('astMethod').value === 'uop' ? '' : 'none';
};
// معاينة إهلاك الشهر قبل الترحيل
window.astPreviewDep = function () {
  const period = $p('astDepMonth').value;
  if (!period) { pToast('⚠️ اختر الشهر', false); return; }
  const box = $p('astDepPreview'); const tb = $p('astDepPreviewTable');
  const rows = [];
  _assets.forEach(a => {
    if (_depEntries.some(d => d.asset_id === a.id && d.period === period)) return; // مرحّل مسبقاً
    const accum = assetAccum(a.id);
    if (a.dep_method === 'uop') {
      rows.push({ a, uop: true, amount: 0 });
    } else {
      const amt = P.periodDepreciation(a, period, accum, 0);
      if (amt > 0) rows.push({ a, amount: amt });
    }
  });
  if (!rows.length) {
    box.style.display = '';
    tb.innerHTML = '<tr><td colspan="4" class="admin-empty">لا يوجد إهلاك مستحق لهذا الشهر (أو مُرحّل مسبقاً)</td></tr>';
    $p('astDepPostBtn').style.display = 'none';
    return;
  }
  box.style.display = '';
  $p('astDepPostBtn').style.display = '';
  tb.innerHTML = rows.map((r, i) =>
    '<tr><td>' + pEsc(r.a.name) + '</td><td>' + (DEP_LBL[r.a.dep_method] || r.a.dep_method) + '</td>' +
    (r.uop
      ? '<td><input type="number" min="0" step="any" class="erp-in" style="width:110px" id="astUopUnits' + i + '" placeholder="وحدات الشهر" data-idx="' + i + '"></td><td>—</td>'
      : '<td>—</td><td style="font-weight:700">' + pFmt(r.amount) + '</td>') + '</tr>').join('');
  box._rows = rows;
};
window.astPostDep = async function () {
  const period = $p('astDepMonth').value;
  const box = $p('astDepPreview'); const rows = box._rows || [];
  if (!period || !rows.length) { pToast('⚠️ اعرض المعاينة أولاً', false); return; }
  const toPost = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    let amt = r.amount;
    if (r.uop) {
      const inp = document.getElementById('astUopUnits' + i);
      const units = inp ? Number(inp.value) || 0 : 0;
      amt = P.periodDepreciation(r.a, period, assetAccum(r.a.id), units);
    }
    if (amt > 0) toPost.push({ asset: r.a, amount: amt });
  }
  if (!toPost.length) { pToast('⚠️ لا توجد مبالغ للترحيل (أدخل وحدات الإنتاج)', false); return; }
  const total = P.r2(toPost.reduce((s, x) => s + x.amount, 0));
  if (!confirm('ترحيل إهلاك ' + period + ' لعدد ' + toPost.length + ' أصل بإجمالي ' + pFmt(total) + ' ر.س؟')) return;
  let num;
  try { num = await postJournal('إهلاك الأصول الثابتة — ' + period, 'depreciation',
    [L(ACC.depExp, total, 0), L(ACC.depAcc, 0, total)]); }
  catch (e) { pErr(e); return; }
  for (const x of toPost) {
    const r = await sb.from('erp_asset_depreciation').insert({
      asset_id: x.asset.id, period, amount: x.amount, entry_number: num });
    if (r.error) { pErr(r.error); return; }
  }
  pToast('✅ تم ترحيل الإهلاك — قيد رقم ' + num);
  box.style.display = 'none';
  loadAssetsPlusTab();
};

/* ═══════════════ ٣) المصروفات الموسّعة + مراكز التكلفة + المتكررة ═══════════════ */
let _ccs = [], _expRecs = [], _recs = [], _expAccounts = [];

window.loadExpensesPlus = async function () {
  if (!sb || !$p('exp2Table')) return;
  const m = $p('exp2Month'); if (m && !m.value) m.value = curMonth();
  const d = $p('exp2Date'); if (d && !d.value) d.value = todayIso();
  const [cc, ac, rec] = await Promise.all([
    sb.from('erp_cost_centers').select('*').order('code'),
    sb.from('erp_accounts').select('code, name').eq('kind', 'expense').order('code'),
    sb.from('erp_recurring_expenses').select('*').order('next_run_date'),
  ]);
  if (cc.error) { pErr(cc.error); return; }
  _ccs = cc.data || []; _expAccounts = ac.data || []; _recs = rec.data || [];
  fillExp2Selects(); renderRecs();
  await processDueRecurring(); // يولّد المستحق عند فتح الشاشة
  await loadExp2List();
};
function fillExp2Selects() {
  const ccOpts = '<option value="">— بلا مركز تكلفة —</option>' +
    _ccs.map(c => '<option value="' + c.id + '">' + pEsc(c.code) + ' — ' + pEsc(c.name) + '</option>').join('');
  ['exp2Cc', 'recCc'].forEach(i => { const s = $p(i); if (s) s.innerHTML = ccOpts; });
  const accOpts = _expAccounts.map(a => '<option value="' + a.code + '"' + (a.code === '5900' ? ' selected' : '') + '>' +
    a.code + ' — ' + pEsc(a.name) + '</option>').join('');
  ['exp2Acc', 'recAcc'].forEach(i => { const s = $p(i); if (s) s.innerHTML = accOpts || '<option value="5900">5900 — مصروفات تشغيلية عامة</option>'; });
}
async function loadExp2List() {
  const month = $p('exp2Month').value;
  const cat = ($p('exp2FilterCat').value || '').trim();
  let q = sb.from('erp_expense_records').select('*').order('expense_date', { ascending: false }).limit(200);
  if (month) q = q.gte('expense_date', month + '-01').lte('expense_date', month + '-31');
  if (cat) q = q.eq('category', cat);
  const r = await q;
  if (r.error) { pErr(r.error); return; }
  _expRecs = r.data || [];
  const tb = $p('exp2Table');
  if (!_expRecs.length) { tb.innerHTML = '<tr><td colspan="8" class="admin-empty">💸 لا توجد مصروفات مطابقة للفلتر</td></tr>'; return; }
  tb.innerHTML = _expRecs.map(x => {
    const cc = _ccs.find(c => c.id === x.cost_center_id);
    return '<tr><td dir="ltr">' + x.expense_date + '</td><td>' + pEsc(x.category) + '</td>' +
      '<td style="font-weight:700">' + pFmt(x.amount) + '</td><td>' + (cc ? pEsc(cc.name) : '—') + '</td>' +
      '<td>' + pEsc(x.vendor || '—') + '</td><td>' + pEsc(x.memo || '—') + '</td>' +
      '<td>' + (x.attachment_url ? '<a href="' + pEsc(x.attachment_url) + '" target="_blank" style="color:#0EA5E9">📎 مرفق</a>' : '—') + '</td>' +
      '<td>' + (x.entry_number ? 'قيد ' + x.entry_number : '—') + '</td></tr>';
  }).join('');
}
window.exp2Reload = loadExp2List;
window.exp2Save = async function () {
  const rec = {
    expense_date: $p('exp2Date').value || todayIso(),
    category: $p('exp2Cat').value.trim(),
    amount: P.r2($p('exp2Amount').value),
    cost_center_id: $p('exp2Cc').value || null,
    vendor: $p('exp2Vendor').value.trim() || null,
    memo: $p('exp2Memo').value.trim() || null,
    attachment_url: $p('exp2Attach').value.trim() || null,
    account_code: $p('exp2Acc').value || '5900',
    pay_from: $p('exp2PayFrom').value,
  };
  if (!rec.category) { pToast('⚠️ اكتب البند/التصنيف', false); return; }
  if (rec.amount <= 0) { pToast('⚠️ المبلغ لازم يكون أكبر من صفر', false); return; }
  const accRow = _expAccounts.find(a => a.code === rec.account_code) || ACC.genExp;
  const payAcc = rec.pay_from === '1110' ? ACC.bank : ACC.cash;
  let num;
  try {
    num = await postJournal('مصروف: ' + rec.category + (rec.vendor ? ' — ' + rec.vendor : ''), 'expense', [
      { account_code: rec.account_code, account_name: accRow.name, kind: 'expense', debit: rec.amount, credit: 0, party: rec.vendor },
      L(payAcc, 0, rec.amount, rec.vendor),
    ]);
  } catch (e) { pErr(e); return; }
  const r = await sb.from('erp_expense_records').insert(Object.assign({}, rec, { entry_number: num }));
  if (r.error) { pErr(r.error); return; }
  pToast('✅ تم حفظ المصروف وترحيل القيد رقم ' + num);
  ['exp2Amount', 'exp2Vendor', 'exp2Memo', 'exp2Attach'].forEach(i => { $p(i).value = ''; });
  loadExp2List();
};
window.ccAdd = async function () {
  const code = $p('ccCode').value.trim(), name = $p('ccName').value.trim();
  if (!code || !name) { pToast('⚠️ أدخل الكود والاسم', false); return; }
  const r = await sb.from('erp_cost_centers').insert({ code, name });
  if (r.error) { pToast('❌ ' + (r.error.code === '23505' ? 'الكود مستخدم مسبقاً' : r.error.message), false); return; }
  pToast('✅ تمت إضافة مركز التكلفة'); $p('ccCode').value = ''; $p('ccName').value = '';
  loadExpensesPlus();
};
function renderRecs() {
  const tb = $p('recTable'); if (!tb) return;
  if (!_recs.length) { tb.innerHTML = '<tr><td colspan="6" class="admin-empty">لا توجد مصروفات متكررة</td></tr>'; return; }
  tb.innerHTML = _recs.map(r =>
    '<tr><td>' + pEsc(r.category) + '</td><td style="font-weight:700">' + pFmt(r.amount) + '</td>' +
    '<td dir="ltr">' + r.next_run_date + '</td><td>' + (r.runs_count || 0) + '</td>' +
    '<td>' + (r.is_active ? '<span style="color:#22C55E">نشط</span>' : '<span style="color:#94A3B8">موقوف</span>') + '</td>' +
    '<td><button class="btn-add" style="padding:4px 10px;font-size:12px;background:' + (r.is_active ? '#F59E0B' : '#22C55E') +
    '" data-dora-call="recToggle:' + r.id + '">' + (r.is_active ? '⏸️ إيقاف' : '▶️ تفعيل') + '</button></td></tr>').join('');
}
window.recAdd = async function () {
  const rec = {
    category: $p('recCat').value.trim(), amount: P.r2($p('recAmount').value),
    cost_center_id: $p('recCc').value || null, vendor: $p('recVendor').value.trim() || null,
    account_code: $p('recAcc').value || '5900', pay_from: $p('recPayFrom').value,
    start_date: $p('recStart').value || todayIso(), next_run_date: $p('recStart').value || todayIso(),
  };
  if (!rec.category || rec.amount <= 0) { pToast('⚠️ أدخل البند والمبلغ', false); return; }
  const r = await sb.from('erp_recurring_expenses').insert(rec);
  if (r.error) { pErr(r.error); return; }
  pToast('✅ تمت إضافة المصروف المتكرر (شهري) — سيُولَّد قيده تلقائياً عند استحقاقه');
  ['recCat', 'recAmount', 'recVendor'].forEach(i => { $p(i).value = ''; });
  loadExpensesPlus();
};
window.recToggle = async function (id) {
  const r0 = _recs.find(x => x.id === id); if (!r0) return;
  const r = await sb.from('erp_recurring_expenses').update({ is_active: !r0.is_active }).eq('id', id);
  if (r.error) { pErr(r.error); return; }
  loadExpensesPlus();
};
// توليد قيود المتكررات المستحقة عند فتح الشاشة (لحاقاً بكل شهر فائت، بحد 12)
async function processDueRecurring() {
  const today = todayIso();
  let generated = 0;
  for (const tpl of _recs) {
    let guard = 0, tplGen = 0;
    let next = tpl.next_run_date;
    while (guard++ < 12 && P.recurringIsDue({ is_active: tpl.is_active, next_run_date: next }, today)) {
      const accRow = _expAccounts.find(a => a.code === tpl.account_code) || ACC.genExp;
      const payAcc = tpl.pay_from === '1110' ? ACC.bank : ACC.cash;
      try {
        const num = await postJournal('مصروف متكرر: ' + tpl.category + ' — ' + String(next).slice(0, 7), 'recurring_expense', [
          { account_code: tpl.account_code || '5900', account_name: accRow.name, kind: 'expense', debit: tpl.amount, credit: 0, party: tpl.vendor },
          L(payAcc, 0, tpl.amount, tpl.vendor),
        ]);
        const ins = await sb.from('erp_expense_records').insert({
          expense_date: next, category: tpl.category, amount: tpl.amount,
          cost_center_id: tpl.cost_center_id, vendor: tpl.vendor, memo: '(متكرر شهري)',
          account_code: tpl.account_code || '5900', pay_from: tpl.pay_from || '1100', entry_number: num,
        });
        if (ins.error) throw ins.error;
        generated++; tplGen++;
      } catch (e) { pErr(e); break; }
      next = P.nextRunDate(next);
    }
    if (next !== tpl.next_run_date) {
      await sb.from('erp_recurring_expenses')
        .update({ next_run_date: next, runs_count: (tpl.runs_count || 0) + tplGen })
        .eq('id', tpl.id);
    }
  }
  if (generated > 0) pToast('🔁 تم توليد ' + generated + ' قيد مصروف متكرر مستحق');
}

/* ═══════════════ ٤) التقارير المتقدمة (داخل تبويب المحاسبة) ═══════════════ */
let _agingDoc = null;

window.loadReportsPlus = function () {
  if (!sb || !$p('reportsPlusArea')) return;
  const cf = $p('rpCfMonth'); if (cf && !cf.value) cf.value = curMonth();
  const now = curMonth();
  const vf = $p('rpVatFrom'); if (vf && !vf.value) vf.value = now + '-01';
  const vt = $p('rpVatTo'); if (vt && !vt.value) vt.value = todayIso();
};

/* ─── أعمار ذمم العملاء: طلبات غير مدفوعة + توزيع FIFO لسندات القبض ─── */
window.rpAgingRun = async function () {
  const tb = $p('rpAgingTable');
  tb.innerHTML = '<tr><td colspan="7" class="admin-empty">⏳ جاري الحساب...</td></tr>';
  const [ord, vou] = await Promise.all([
    sb.from('store_orders').select('id, order_number, customer_name, total, status, payment_status, created_at')
      .neq('status', 'cancelled').order('created_at'),
    sb.from('erp_vouchers').select('party, amount').eq('voucher_type', 'receipt'),
  ]);
  if (ord.error) { tb.innerHTML = '<tr><td colspan="7" class="admin-empty">❌ تعذر التحميل</td></tr>'; pErr(ord.error); return; }
  const receiptsByParty = {};
  (vou.data || []).forEach(v => {
    const k = String(v.party || '').trim();
    receiptsByParty[k] = P.r2((receiptsByParty[k] || 0) + (Number(v.amount) || 0));
  });
  const byCust = {};
  (ord.data || []).forEach(o => {
    if (String(o.payment_status || '').toLowerCase() === 'paid') return;
    const k = String(o.customer_name || 'بدون اسم').trim();
    if (!byCust[k]) byCust[k] = [];
    byCust[k].push({ id: o.id, total: o.total, created_at: o.created_at });
  });
  const today = todayIso();
  const allRows = [];
  Object.keys(byCust).forEach(cust => {
    const rows = P.agingRows(byCust[cust], receiptsByParty[cust] || 0, today, 30);
    rows.forEach(r => allRows.push({ party_id: cust, party_name: cust, remaining: r.remaining, overdue_days: r.overdue_days }));
  });
  const doc = P.aggregateAging(allRows);
  _agingDoc = doc;
  if (!doc.rows.length) { tb.innerHTML = '<tr><td colspan="7" class="admin-empty">✅ لا توجد ذمم غير مسددة</td></tr>'; return; }
  tb.innerHTML = doc.rows.map(r =>
    '<tr><td style="font-weight:700">' + pEsc(r.party_name) + '</td>' +
    ['b30', 'b60', 'b90', 'b90p'].map(k => '<td style="color:' + (r[k] > 0 ? (k === 'b30' ? '#F59E0B' : '#EF4444') : '#94A3B8') + '">' + pFmt(r[k]) + '</td>').join('') +
    '<td style="font-weight:700">' + pFmt(r.total) + '</td></tr>').join('') +
    '<tr style="font-weight:700;background:rgba(139,92,246,.12)"><td>الإجمالي</td>' +
    ['b30', 'b60', 'b90', 'b90p', 'total'].map(k => '<td>' + pFmt(doc.totals[k]) + '</td>').join('') + '</tr>';
};
window.rpAgingExport = function () {
  if (!_agingDoc || !_agingDoc.rows.length) { pToast('⚠️ شغّل التقرير أولاً', false); return; }
  const aoa = [['العميل', '0-30 يوم', '31-60 يوم', '61-90 يوم', '+90 يوم', 'الإجمالي']];
  _agingDoc.rows.forEach(r => aoa.push([r.party_name, r.b30, r.b60, r.b90, r.b90p, r.total]));
  aoa.push(['الإجمالي', _agingDoc.totals.b30, _agingDoc.totals.b60, _agingDoc.totals.b90, _agingDoc.totals.b90p, _agingDoc.totals.total]);
  xlsxExport('أعمار الذمم', aoa, 'aging-' + todayIso() + '.xlsx');
};

/* ─── تدفق نقدي شهري مبسط من السندات ─── */
window.rpCashflowRun = async function () {
  const month = $p('rpCfMonth').value || curMonth();
  const tb = $p('rpCfTable');
  tb.innerHTML = '<tr><td colspan="4" class="admin-empty">⏳ جاري الحساب...</td></tr>';
  const months = [];
  for (let i = 5; i >= 0; i--) months.push(P.monthShift(month, -i));
  const r = await sb.from('erp_vouchers').select('voucher_type, amount, created_at')
    .gte('created_at', months[0] + '-01T00:00:00Z');
  if (r.error) { tb.innerHTML = '<tr><td colspan="4" class="admin-empty">❌ تعذر التحميل</td></tr>'; pErr(r.error); return; }
  const agg = {};
  (r.data || []).forEach(v => {
    const m = String(v.created_at || '').slice(0, 7);
    if (!agg[m]) agg[m] = { in: 0, out: 0 };
    if (v.voucher_type === 'receipt') agg[m].in = P.r2(agg[m].in + (Number(v.amount) || 0));
    else agg[m].out = P.r2(agg[m].out + (Number(v.amount) || 0));
  });
  tb.innerHTML = months.map(m => {
    const a = agg[m] || { in: 0, out: 0 };
    const net = P.r2(a.in - a.out);
    const hl = m === month ? ' style="background:rgba(139,92,246,.12);font-weight:700"' : '';
    return '<tr' + hl + '><td dir="ltr">' + m + '</td><td style="color:#22C55E">' + pFmt(a.in) + '</td>' +
      '<td style="color:#EF4444">' + pFmt(a.out) + '</td>' +
      '<td style="font-weight:700;color:' + (net >= 0 ? '#22C55E' : '#EF4444') + '">' + pFmt(net) + '</td></tr>';
  }).join('');
};

/* ─── ملخص ضريبة القيمة المضافة للفترة ─── */
window.rpVatRun = async function () {
  const from = $p('rpVatFrom').value, to = $p('rpVatTo').value;
  if (!from || !to) { pToast('⚠️ اختر الفترة', false); return; }
  const box = $p('rpVatResult');
  const [ord, pur, exp] = await Promise.all([
    sb.from('store_orders').select('total, tax, shipping_fee').neq('status', 'cancelled')
      .gte('created_at', from + 'T00:00:00Z').lte('created_at', to + 'T23:59:59Z'),
    sb.from('erp_purchases').select('total').gte('created_at', from + 'T00:00:00Z').lte('created_at', to + 'T23:59:59Z'),
    sb.from('erp_expense_records').select('amount').gte('expense_date', from).lte('expense_date', to),
  ]);
  if (ord.error) { pErr(ord.error); return; }
  const salesTotal = P.r2((ord.data || []).reduce((s, o) => s + (Number(o.total) || 0) - (Number(o.shipping_fee) || 0), 0));
  // الضريبة: عمود tax إن وُجد وإلا 15% من الإجمالي الشامل
  const outputVat = P.r2((ord.data || []).reduce((s, o) =>
    s + (o.tax != null ? Number(o.tax) : P.vatIncluded((Number(o.total) || 0) - (Number(o.shipping_fee) || 0))), 0));
  const purchasesTotal = P.r2((pur.data || []).reduce((s, p) => s + (Number(p.total) || 0), 0));
  const expensesTotal = P.r2((exp.data || []).reduce((s, x) => s + (Number(x.amount) || 0), 0));
  const v = P.vatSummary({ salesTotal, outputVat, purchasesTotal, expensesTotal });
  const cell = (lbl, val, color) =>
    '<div class="erp-box" style="border:1px solid rgba(148,163,184,.25);border-radius:10px;padding:12px;text-align:center">' +
    '<div style="font-size:12px;color:#94A3B8">' + lbl + '</div><div style="font-size:17px;font-weight:700;color:' + (color || '#E2E8F0') + '">' + pFmt(val) + ' ر.س</div></div>';
  box.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-top:12px">' +
    cell('المبيعات (شاملة، بلا شحن)', v.salesTotal) +
    cell('المبيعات الخاضعة', v.taxableSales) +
    cell('ضريبة المخرجات 15%', v.outputVat, '#F59E0B') +
    cell('المشتريات (شاملة)', v.purchasesTotal) +
    cell('المصروفات (شاملة)', v.expensesTotal) +
    cell('ضريبة المدخلات التقديرية', v.inputVat, '#0EA5E9') +
    cell('صافي الضريبة المستحقة', v.netDue, v.netDue >= 0 ? '#EF4444' : '#22C55E') + '</div>' +
    '<div class="zatca-note" style="margin-top:10px">ℹ️ ضريبة المدخلات للمشتريات والمصروفات محسوبة تقديرياً كـ 15% شاملة (لا يُفصَل سطر ضريبة في قيودها).</div>';
};

})(typeof window !== 'undefined' ? window : globalThis);
