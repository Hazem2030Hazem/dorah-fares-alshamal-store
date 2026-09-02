/* ============================================================
   درة فارس الشمال — orchestrator للوحة الإدارة
   تم تقسيم الكود السابق على الملفات التالية:
     admin-auth.js | admin-ui.js | admin-orders.js |
     admin-products.js | admin-reports.js | admin-erp.js
   ============================================================ */
(function(){
'use strict';

if (typeof window.supabaseClient === 'undefined' || !window.supabaseClient) {
  console.warn('Admin orchestrator: Supabase client is unavailable.');
  return;
}

window.adminState = window.adminState || { user: null, orders: [], services: [], customers: [], receipts: [], reviews: [], messages: [], settings: null };
window.adminPanelRole = window.adminPanelRole || null;

console.log('Admin modules orchestrator loaded.');
})();
