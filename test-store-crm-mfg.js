/* ═══════════════════════════════════════════════════════════════
   Batch Z4 — test-store-crm-mfg.js
   اختبارات المنطق النقي لـ store-crm-mfg.js (CRM + تصنيع + مساعد).
   تعمل في Node مباشرة:  node test-store-crm-mfg.js
   وفي المتصفح: افتح ملفاً يحمّل store-crm-mfg.js ثم هذا الملف
   (النتيجة في console + document.title).
   ═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';
const P = (typeof module !== 'undefined' && module.exports)
  ? require('./store-crm-mfg.js') : window.CRM_MFG;

let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.error('❌ ' + name + ' — got: ' + JSON.stringify(got) + ' want: ' + JSON.stringify(want)); }
}
function ok(name, cond) {
  if (cond) pass++; else { fail++; console.error('❌ ' + name); }
}

/* ─── ١) CRM: الحالات والانتقالات ─── */
eq('normalize معروفة', P.normalizeLeadStatus('interested'), 'interested');
eq('normalize غير معروفة → new', P.normalizeLeadStatus('xyz'), 'new');
eq('normalize فارغة → new', P.normalizeLeadStatus(''), 'new');
eq('ست حالات', P.LEAD_STATUSES.length, 6);

ok('new → contacted مسموح', P.leadCanMove('new', 'contacted'));
ok('contacted → interested مسموح', P.leadCanMove('contacted', 'interested'));
ok('interested → negotiation مسموح', P.leadCanMove('interested', 'negotiation'));
ok('negotiation → won مسموح', P.leadCanMove('negotiation', 'won'));
ok('interested → won مسموح', P.leadCanMove('interested', 'won'));
ok('new → won قفز غير مسموح', !P.leadCanMove('new', 'won'));
ok('new → negotiation قفز غير مسموح', !P.leadCanMove('new', 'negotiation'));
ok('contacted → lost مسموح', P.leadCanMove('contacted', 'lost'));
ok('won نهائية', !P.leadCanMove('won', 'contacted') && !P.leadCanMove('won', 'lost'));
ok('lost نهائية', !P.leadCanMove('lost', 'new'));
ok('نفس الحالة ممنوع', !P.leadCanMove('new', 'new'));

/* ─── kanban + متابعات اليوم ─── */
const leads = [
  { id: '1', status: 'new' }, { id: '2', status: 'new' },
  { id: '3', status: 'won' }, { id: '4', status: 'garbage' },
];
const kb = P.kanbanColumns(leads);
eq('kanban عدّاد new (garbage تُطبَّع)', kb.counts.new, 3);
eq('kanban عدّاد won', kb.counts.won, 1);
eq('kanban عدّاد lost', kb.counts.lost, 0);

eq('مستحق اليوم', P.isDueToday({ done: false, remind_at: '2025-01-10' }, '2025-01-10'), true);
eq('متأخر مستحق', P.isDueToday({ done: false, remind_at: '2025-01-01' }, '2025-01-10'), true);
eq('غداً غير مستحق', P.isDueToday({ done: false, remind_at: '2025-01-11' }, '2025-01-10'), false);
eq('منجز غير مستحق', P.isDueToday({ done: true, remind_at: '2025-01-01' }, '2025-01-10'), false);
eq('بلا تاريخ غير مستحق', P.isDueToday({ done: false, remind_at: null }, '2025-01-10'), false);
const fu = P.followupsToday([
  { id: 'a', remind_at: '2025-01-09' }, { id: 'b', remind_at: '2025-01-10' },
  { id: 'c', remind_at: '2025-01-11' }, { id: 'd', remind_at: '2025-01-01', done: true },
], '2025-01-10');
eq('متابعات اليوم مرتبة', fu.map(x => x.id), ['a', 'b']);

/* ─── ٢) التصنيع: التكلفة والتوفر والقيد ─── */
const bomLines = [{ product_id: 10, qty: 2 }, { product_id: 11, qty: 0.5 }];
const uc = P.bomUnitCost(bomLines, { 10: 25, 11: 40 });
eq('تكلفة سطر 1', uc.lines[0].line_cost, 50);
eq('تكلفة سطر 2', uc.lines[1].line_cost, 20);
eq('تكلفة الوحدة', uc.total, 70);
eq('تكلفة بلا خريطة = صفر', P.bomUnitCost(bomLines, null).total, 0);

const chkOk = P.checkAvailability(bomLines, { 10: 20, 11: 5 }, 5);
ok('توفر كافٍ', chkOk.ok);
eq('احتياج 5 وحدات من 10', chkOk.rows[0].need, 10);
const chkNo = P.checkAvailability(bomLines, { 10: 9, 11: 5 }, 5);
ok('نقص يُكتشف', !chkNo.ok);
eq('مقدار النقص', chkNo.rows[0].short, 1);
ok('كمية صفر دائماً كافية', P.checkAvailability(bomLines, {}, 0).ok);

const je = P.buildProductionEntry(140);
eq('قيد: مدين 1310', je[0].account_code, '1310');
eq('قيد: مدين = 140', je[0].debit, 140);
eq('قيد: دائن 1320', je[1].account_code, '1320');
eq('قيد: دائن = 140', je[1].credit, 140);
eq('قيد متوازن', je[0].debit, je[1].credit);
eq('قيد صفري → null', P.buildProductionEntry(0), null);

/* ─── ٣) المساعد: parsePeriod ─── */
const NOW = new Date(2025, 5, 15); // 15 يونيو 2025
eq('اليوم', P.parsePeriod('مبيعات اليوم', NOW), { from: '2025-06-15', to: '2025-06-15', label: 'اليوم 2025-06-15' });
eq('أمس', P.parsePeriod('مبيعات أمس', NOW).from, '2025-06-14');
eq('الأسبوع (7 أيام)', P.parsePeriod('مبيعات الأسبوع', NOW).from, '2025-06-09');
eq('الشهر الماضي', P.parsePeriod('مبيعات الشهر الماضي', NOW), { from: '2025-05-01', to: '2025-05-31', label: 'مايو 2025' });
eq('شهر مارس بلا سنة', P.parsePeriod('مبيعات مارس', NOW), { from: '2025-03-01', to: '2025-03-31', label: 'مارس 2025' });
eq('شهر فبراير بسنة', P.parsePeriod('مبيعات فبراير 2024', NOW), { from: '2024-02-01', to: '2024-02-29', label: 'فبراير 2024' });
eq('بديل شعبي (شباط)', P.parsePeriod('شباط 2023', NOW).label, 'فبراير 2023');
eq('السنة الحالية', P.parsePeriod('أرباح هذه السنة', NOW).from, '2025-01-01');
eq('الافتراضي = الشهر الحالي', P.parsePeriod('كم المبيعات؟', NOW), { from: '2025-06-01', to: '2025-06-15', label: 'يونيو 2025' });
eq('شهر الماضي عبر حد السنة', P.parsePeriod('الشهر الماضي', new Date(2025, 0, 10)).label, 'ديسمبر 2024');

/* ─── matchIntent ─── */
eq('intent مبيعات', P.matchIntent('كم مبيعات اليوم؟', NOW).intent.id, 'sales_period');
eq('intent أعلى عملاء', P.matchIntent('من أعلى العملاء هذا الشهر؟', NOW).intent.id, 'top_customers');
eq('intent أفضل أصناف', P.matchIntent('ما أفضل الأصناف مبيعاً؟', NOW).intent.id, 'top_items');
eq('intent متأخرات', P.matchIntent('أعمار الذمم والمتأخرات', NOW).intent.id, 'overdue');
eq('intent خزينة', P.matchIntent('ما رصيد الخزينة والبنك؟', NOW).intent.id, 'treasury');
eq('intent ربح', P.matchIntent('ما صافي الربح هذا الشهر؟', NOW).intent.id, 'net_profit');
eq('intent ضريبة', P.matchIntent('أعطني الإقرار الضريبي لشهر مايو', NOW).intent.id, 'vat_return');
eq('غير مفهوم → null', P.matchIntent('ما حالة الطقس؟', NOW), null);
eq('فارغ → null', P.matchIntent('   ', NOW), null);
eq('فترة مرفقة بالـ intent', P.matchIntent('مبيعات مارس', NOW).params.period.label, 'مارس 2025');
eq('intent بلا فترة (متأخرات)', P.matchIntent('المتأخرات؟', NOW).params.period, undefined);

/* ─── ضريبة ─── */
eq('vatIncluded 115 → 15', P.vatIncluded(115), 15);
const vs = P.vatSummary({ salesTotal: 1150, outputVat: 150, purchasesTotal: 575, expensesTotal: 0 });
eq('ملخص الضريبة: مدخلات', vs.inputVat, 75);
eq('ملخص الضريبة: صافي مستحق', vs.netDue, 75);

/* ═══ النتيجة ═══ */
const msg = 'Z4 CRM+MFG+Assistant: ' + pass + ' ✅ / ' + fail + ' ❌';
console.log(msg);
if (typeof document !== 'undefined') document.title = msg;
if (fail > 0 && typeof process !== 'undefined') process.exit(1);
})();
