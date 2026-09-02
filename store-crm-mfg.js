/* ============================================================
   درة فارس الشمال — CRM + تصنيع + مساعد ذكي
   منطق نقي + واجهات HTML wrappers
   ============================================================ */
(function (global, factory) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    global.CRM_MFG = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ─── ١) CRM: الحالات والانتقالات ─── */
  const LEAD_STATUSES = ['new', 'contacted', 'interested', 'negotiation', 'won', 'lost'];

  function normalizeLeadStatus(status) {
    const s = String(status || '').trim().toLowerCase();
    if (LEAD_STATUSES.indexOf(s) !== -1) return s;
    return 'new';
  }

  function leadCanMove(from, to) {
    const f = normalizeLeadStatus(from);
    const t = normalizeLeadStatus(to);
    if (f === t) return false;
    if (f === 'won' || f === 'lost') return false;
    const allowed = {
      new: ['contacted'],
      contacted: ['interested', 'lost'],
      interested: ['negotiation', 'won'],
      negotiation: ['won']
    };
    return (allowed[f] || []).indexOf(t) !== -1;
  }

  function kanbanColumns(leads) {
    const cols = {};
    LEAD_STATUSES.forEach(s => { cols[s] = []; });
    const counts = {};
    LEAD_STATUSES.forEach(s => { counts[s] = 0; });
    (leads || []).forEach(function (lead) {
      const s = normalizeLeadStatus(lead && lead.status);
      cols[s].push(lead);
      counts[s]++;
    });
    return { columns: cols, counts: counts };
  }

  function isDueToday(followup, todayStr) {
    if (!followup || followup.done) return false;
    if (!followup.remind_at) return false;
    return followup.remind_at <= todayStr;
  }

  function followupsToday(followups, todayStr) {
    return (followups || [])
      .filter(function (f) { return isDueToday(f, todayStr); })
      .sort(function (a, b) {
        const ra = (a && a.remind_at) || '';
        const rb = (b && b.remind_at) || '';
        return ra.localeCompare(rb);
      });
  }

  /* ─── ٢) التصنيع ─── */
  function bomUnitCost(bomLines, priceMap) {
    const pm = priceMap || {};
    let total = 0;
    const lines = (bomLines || []).map(function (line) {
      const price = Number(pm[line.product_id]) || 0;
      const qty = Number(line.qty) || 0;
      const lineCost = price * qty;
      total += lineCost;
      return { product_id: line.product_id, qty: qty, price: price, line_cost: lineCost };
    });
    return { lines: lines, total: total };
  }

  function checkAvailability(bomLines, stockMap, qty) {
    const q = Number(qty) || 0;
    if (q === 0) return { ok: true, rows: [] };
    const sm = stockMap || {};
    const rows = (bomLines || []).map(function (line) {
      const need = (Number(line.qty) || 0) * q;
      const available = Number(sm[line.product_id]) || 0;
      const short = Math.max(0, need - available);
      return { product_id: line.product_id, need: need, available: available, short: short };
    });
    const ok = rows.every(function (r) { return r.short === 0; });
    return { ok: ok, rows: rows };
  }

  function buildProductionEntry(cost) {
    const c = Number(cost) || 0;
    if (c === 0) return null;
    return [
      { account_code: '1310', debit: c, credit: 0 },
      { account_code: '1320', debit: 0, credit: c }
    ];
  }

  /* ─── ٣) المساعد الذكي ─── */
  const MONTH_NAMES = {
    'يناير': 0, 'كانون الثاني': 0, 'كانون': 0,
    'فبراير': 1, 'شباط': 1,
    'مارس': 2, 'آذار': 2,
    'أبريل': 3, 'نيسان': 3,
    'مايو': 4, 'أيار': 4,
    'يونيو': 5, 'حزيران': 5,
    'يوليو': 6, 'تموز': 6,
    'أغسطس': 7, 'آب': 7,
    'سبتمبر': 8, 'أيلول': 8,
    'أكتوبر': 9, 'تشرين الأول': 9,
    'نوفمبر': 10, 'تشرين الثاني': 10,
    'ديسمبر': 11, 'كانون الأول': 11
  };

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function toDateStr(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parsePeriod(text, NOW) {
    const t = String(text || '').trim();
    const base = NOW || new Date();
    const y = base.getFullYear();
    const m = base.getMonth();
    const d = base.getDate();

    const todayStr = toDateStr(base);

    if (/اليوم/.test(t)) {
      return { from: todayStr, to: todayStr, label: 'اليوم ' + todayStr };
    }
    if (/أمس|البارحة/.test(t)) {
      const dt = new Date(base); dt.setDate(d - 1);
      const s = toDateStr(dt);
      return { from: s, to: s, label: 'أمس ' + s };
    }
    if (/الأسبوع|هذا الأسبوع/.test(t)) {
      const dt = new Date(base); dt.setDate(d - 6);
      return { from: toDateStr(dt), to: todayStr, label: 'الأسبوع ' + toDateStr(dt) + ' — ' + todayStr };
    }
    if (/الشهر الماضي/.test(t)) {
      const first = new Date(y, m - 1, 1);
      const last = new Date(y, m, 0);
      const label = last.toLocaleString('ar-SA', { month: 'long', year: 'numeric' });
      return { from: toDateStr(first), to: toDateStr(last), label: label };
    }
    if (/هذه السنة|السنة الحالية|العام الحالي/.test(t)) {
      return { from: y + '-01-01', to: todayStr, label: 'السنة ' + y };
    }

    // شهر باسم (مع سنة أو بدون)
    for (const name in MONTH_NAMES) {
      const re = new RegExp(name + '(?:\\s+(\\d{4}))?');
      const match = t.match(re);
      if (match) {
        const year = match[1] ? parseInt(match[1], 10) : y;
        const month = MONTH_NAMES[name];
        const first = new Date(year, month, 1);
        const last = new Date(year, month + 1, 0);
        const label = first.toLocaleString('ar-SA', { month: 'long', year: 'numeric' });
        return { from: toDateStr(first), to: toDateStr(last), label: label };
      }
    }

    // افتراضي = الشهر الحالي حتى اليوم
    const first = new Date(y, m, 1);
    const label = base.toLocaleString('ar-SA', { month: 'long', year: 'numeric' });
    return { from: toDateStr(first), to: todayStr, label: label };
  }

  const INTENTS = [
    { id: 'sales_period', patterns: ['مبيعات', 'مبيعاتي', 'كم بعت', 'المبيعات', 'مبيعات اليوم', 'مبيعات الشهر'] },
    { id: 'top_customers', patterns: ['أعلى عملاء', 'أفضل عملاء', 'أكثر عملاء', 'العملاء الأكثر'] },
    { id: 'top_items', patterns: ['أفضل أصناف', 'أكثر أصناف', 'أعلى أصناف', 'أفضل منتجات', 'أكثر منتجات'] },
    { id: 'overdue', patterns: ['متأخرات', 'أعمار الذمم', 'ذمم', 'متأخر', 'آجل'] },
    { id: 'treasury', patterns: ['خزينة', 'رصيد الخزينة', 'رصيد البنك', 'البنك والخزينة', 'ال treasury'] },
    { id: 'net_profit', patterns: ['صافي الربح', 'ربح', 'أرباح', 'net profit'] },
    { id: 'vat_return', patterns: ['إقرار ضريبي', 'الإقرار الضريبي', 'ضريبة', 'VAT', 'الضريبة'] }
  ];

  function matchIntent(text, NOW) {
    const t = String(text || '').trim();
    if (!t) return null;
    const lower = t.toLowerCase();

    for (let i = 0; i < INTENTS.length; i++) {
      const intent = INTENTS[i];
      for (let j = 0; j < intent.patterns.length; j++) {
        if (lower.indexOf(intent.patterns[j]) !== -1) {
          const result = { intent: { id: intent.id }, params: {} };
          if (intent.id !== 'overdue' && intent.id !== 'treasury') {
            result.params.period = parsePeriod(t, NOW);
          }
          return result;
        }
      }
    }
    return null;
  }

  function vatIncluded(amountWithVat) {
    const a = Number(amountWithVat) || 0;
    return Math.round((a - a / 1.15) * 100) / 100;
  }

  function vatSummary(data) {
    const salesTotal = Number(data && data.salesTotal) || 0;
    const outputVat = Number(data && data.outputVat) || 0;
    const purchasesTotal = Number(data && data.purchasesTotal) || 0;
    const expensesTotal = Number(data && data.expensesTotal) || 0;
    const inputVat = Math.round(((purchasesTotal + expensesTotal) * 0.15) * 100) / 100;
    const netDue = Math.round((outputVat - inputVat) * 100) / 100;
    return { inputVat: inputVat, netDue: netDue };
  }

  /* ─── ٤) واجهات HTML wrappers ─── */
  const MODULE = {
    LEAD_STATUSES: LEAD_STATUSES,
    normalizeLeadStatus: normalizeLeadStatus,
    leadCanMove: leadCanMove,
    kanbanColumns: kanbanColumns,
    isDueToday: isDueToday,
    followupsToday: followupsToday,
    bomUnitCost: bomUnitCost,
    checkAvailability: checkAvailability,
    buildProductionEntry: buildProductionEntry,
    parsePeriod: parsePeriod,
    matchIntent: matchIntent,
    vatIncluded: vatIncluded,
    vatSummary: vatSummary
  };

  function toast(m, t) {
    if (typeof window !== 'undefined' && typeof window.adminUtils !== 'undefined' && window.adminUtils.adminToast) {
      window.adminUtils.adminToast(m, t);
    } else if (typeof showToast === 'function') {
      showToast(m, t);
    } else {
      console.log('[' + (t || 'info') + ']', m);
    }
  }

  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? e.value.trim() : ''; }
  function setVal(id, v) { var e = el(id); if (e) e.value = v === undefined || v === null ? '' : v; }

  /* ─── CRM UI ─── */
  function crmLeadSave() {
    const name = val('crmLeadName');
    if (!name) { toast('❌ الاسم مطلوب', 'error'); return; }
    const lead = {
      id: 'lead_' + Date.now(),
      name: name,
      phone: val('crmLeadPhone'),
      source: val('crmLeadSource'),
      interest: val('crmLeadInterest'),
      notes: val('crmLeadNotes'),
      status: 'new',
      created_at: new Date().toISOString()
    };
    const leads = JSON.parse(localStorage.getItem('dora_crm_leads') || '[]');
    leads.push(lead);
    localStorage.setItem('dora_crm_leads', JSON.stringify(leads));
    crmLeadReset();
    toast('✅ تم حفظ العميل المحتمل');
    crmSubShow('board');
  }

  function crmLeadReset() {
    ['crmLeadId', 'crmLeadName', 'crmLeadPhone', 'crmLeadSource', 'crmLeadInterest', 'crmLeadNotes'].forEach(setVal);
  }

  function crmActSave() {
    toast('✅ تم تسجيل النشاط (نموذج)');
  }

  function crmSubShow(sub) {
    ['board', 'followups'].forEach(function (s) {
      var btn = el('crmSub_' + s);
      if (btn) btn.classList.toggle('active', s === sub);
    });
  }

  /* ─── MFG UI ─── */
  function mfgSubShow(sub) {
    ['bom', 'orders'].forEach(function (s) {
      var btn = el('mfgSub_' + s);
      if (btn) btn.classList.toggle('active', s === sub);
    });
  }

  function mfgBomAddLine() {
    toast('➕ أضف سطر BOM من الواجهة (نموذج)');
  }

  function mfgBomSave() {
    toast('✅ تم حفظ قائمة المكونات (نموذج)');
  }

  function mfgOrderCheckNow() {
    toast('🔍 تم التحقق من التوفر (نموذج)');
  }

  function mfgOrderSave() {
    toast('✅ تم إنشاء أمر التصنيع (نموذج)');
  }

  /* ─── Assistant UI ─── */
  function asstAsk() {
    const input = el('asstInput');
    const q = input ? input.value.trim() : '';
    if (!q) { toast('❌ اكتب سؤالاً أولاً', 'error'); return; }
    const matched = matchIntent(q, new Date());
    const out = el('asstOutput') || el('asstChat');
    if (out) {
      const p = document.createElement('div');
      p.style.marginBottom = '10px';
      p.innerHTML = '<b>أنت:</b> ' + MODULE.esc(q) + '<br><b>المساعد:</b> ' +
        (matched ? 'الطلب: <code>' + matched.intent.id + '</code> — الفترة: ' + (matched.params.period ? matched.params.period.label : 'غير محددة') :
          'عذراً، لم أفهم السؤال. جرّب: "مبيعات اليوم" أو "أفضل الأصناف".');
      out.appendChild(p);
    }
    if (input) input.value = '';
  }

  function esc(v) {
    return String(v || '').replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch];
    });
  }
  MODULE.esc = esc;

  /* ─── تصدير للمتصفح ─── */
  if (typeof window !== 'undefined') {
    window.crmLeadSave = crmLeadSave;
    window.crmLeadReset = crmLeadReset;
    window.crmActSave = crmActSave;
    window.crmSubShow = crmSubShow;
    window.mfgSubShow = mfgSubShow;
    window.mfgBomAddLine = mfgBomAddLine;
    window.mfgBomSave = mfgBomSave;
    window.mfgOrderCheckNow = mfgOrderCheckNow;
    window.mfgOrderSave = mfgOrderSave;
    window.asstAsk = asstAsk;
  }

  return MODULE;
}));
