/* ============================================================
   درة فارس الشمال — إدارة اللغة (i18n) للوحة الإدارة
   ============================================================ */
(function () {
  'use strict';

  const DEFAULT_LANG = 'ar';

  const TRANSLATIONS = {
    ar: {
      crm_title: '🤝 إدارة علاقات العملاء (CRM) — العملاء المحتملون',
      crm_new_lead: '➕ عميل محتمل جديد',
      crm_ph_name: 'الاسم *',
      crm_ph_phone: 'الجوال',
      crm_ph_source: 'المصدر (واتساب/موقع/معرض...)',
      crm_ph_interest: 'الاهتمام (منتج/خدمة)',
      crm_ph_notes: 'ملاحظات',
      crm_save: '💾 حفظ',
      crm_clear: 'مسح',
      crm_act_title: '📞 تسجيل نشاط متابعة',
      crm_act_save: '💾 حفظ النشاط',
      crm_sub_board: '🗂️ لوحة الحالات',
      crm_sub_follow: '⏰ متابعات اليوم',
      crm_fu_lead: 'العميل المحتمل',
      crm_fu_type: 'النوع',
      crm_fu_note: 'الملاحظة',
      crm_fu_date: 'التاريخ',
      crm_fu_state: 'الحالة',
      crm_fu_done: 'إنجاز',
      mfg_title: '🏭 التصنيع — قوائم المكونات وأوامر التصنيع',
      mfg_sub_bom: '📋 قوائم المكونات (BOM)',
      mfg_sub_orders: '🏭 أوامر التصنيع',
      mfg_new_bom: '➕ قائمة مكونات جديدة',
      mfg_finished: 'المنتج التام',
      mfg_components: 'المكونات (لكل وحدة منتج تام)',
      mfg_add_line: '➕ إضافة مكوّن',
      mfg_save_bom: '💾 حفظ القائمة',
      mfg_order_title: '🏭 أمر تصنيع جديد',
      mfg_qty: 'الكمية',
      mfg_check: '🔍 تحقق من التوفر',
      mfg_create: '💾 إنشاء (مسودة)',
      mfg_th_product: 'المنتج التام',
      mfg_th_comps: 'المكونات',
      mfg_th_notes: 'ملاحظات',
      mfg_th_date: 'التاريخ',
      mfg_th_actions: 'إجراءات',
      mfg_th_no: 'الرقم',
      mfg_th_qty: 'الكمية',
      mfg_th_cost: 'التكلفة',
      mfg_th_status: 'الحالة',
      mfg_th_entry: 'القيد',
      asst_title: '🤖 المساعد الذكي — اسأل عن أرقام متجرك',
      asst_hint: 'محرك قواعد محلي بالكامل — لا تُرسل أي بيانات خارج المتصفح.',
      asst_ph: 'مثال: مبيعات الشهر الماضي؟ أفضل الأصناف؟ المتأخرات؟',
      asst_send: 'إرسال'
    },
    en: {
      crm_title: '🤝 Customer Relationship Management (CRM) — Leads',
      crm_new_lead: '➕ New Lead',
      crm_ph_name: 'Name *',
      crm_ph_phone: 'Phone',
      crm_ph_source: 'Source (WhatsApp/Site/Exhibition...)',
      crm_ph_interest: 'Interest (product/service)',
      crm_ph_notes: 'Notes',
      crm_save: '💾 Save',
      crm_clear: 'Clear',
      crm_act_title: '📞 Log Follow-up Activity',
      crm_act_save: '💾 Save Activity',
      crm_sub_board: '🗺️ Status Board',
      crm_sub_follow: "⏰ Today's Follow-ups",
      crm_fu_lead: 'Lead',
      crm_fu_type: 'Type',
      crm_fu_note: 'Note',
      crm_fu_date: 'Date',
      crm_fu_state: 'Status',
      crm_fu_done: 'Done',
      mfg_title: '🏭 Manufacturing — BOMs & Work Orders',
      mfg_sub_bom: '📋 Bills of Materials',
      mfg_sub_orders: '🏭 Work Orders',
      mfg_new_bom: '➕ New BOM',
      mfg_finished: 'Finished Product',
      mfg_components: 'Components (per finished unit)',
      mfg_add_line: '➕ Add Component',
      mfg_save_bom: '💾 Save BOM',
      mfg_order_title: '🏭 New Work Order',
      mfg_qty: 'Quantity',
      mfg_check: '🔍 Check Availability',
      mfg_create: '💾 Create (Draft)',
      mfg_th_product: 'Finished Product',
      mfg_th_comps: 'Components',
      mfg_th_notes: 'Notes',
      mfg_th_date: 'Date',
      mfg_th_actions: 'Actions',
      mfg_th_no: 'No.',
      mfg_th_qty: 'Qty',
      mfg_th_cost: 'Cost',
      mfg_th_status: 'Status',
      mfg_th_entry: 'Entry',
      asst_title: '🤖 Smart Assistant — Ask about your store numbers',
      asst_hint: 'Fully local rule engine — no data leaves the browser.',
      asst_ph: 'e.g. sales today? top items? overdue?',
      asst_send: 'Send'
    }
  };

  function storeLangSet(lang) {
    const l = (lang === 'en') ? 'en' : 'ar';
    localStorage.setItem('dora_admin_lang', l);

    const dict = TRANSLATIONS[l] || TRANSLATIONS[DEFAULT_LANG];

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        if (el.hasAttribute('data-i18n-ph')) {
          el.setAttribute('placeholder', dict[key]);
        } else {
          el.textContent = dict[key];
        }
      }
    });

    document.querySelectorAll('.store-lang-sel').forEach(function (sel) {
      sel.value = l;
    });
  }

  function storeLangInit() {
    const saved = localStorage.getItem('dora_admin_lang') || DEFAULT_LANG;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { storeLangSet(saved); });
    } else {
      storeLangSet(saved);
    }
  }

  if (typeof window !== 'undefined') {
    window.storeLangSet = storeLangSet;
    window.storeLangInit = storeLangInit;
    storeLangInit();
  }
})();
