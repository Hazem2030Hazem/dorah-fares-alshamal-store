// ============================================================
// AUTH — التحقق من تسجيل الدخول عبر Supabase Auth
// ============================================================
(function() {
    'use strict';

    window.checkAuth = async function() {
        if (typeof window.supabaseClient === 'undefined' || !window.supabaseClient) return false;
        try {
            const { data } = await window.supabaseClient.auth.getSession();
            return !!data.session;
        } catch (e) {
            return false;
        }
    };

    window.requireAuth = function(action) {
        if (typeof window.showToast === 'function') {
            window.showToast('🔐 سجل دخول عشان تقدر ' + (action || 'تستخدم هذه الميزة'), 'warning');
        }
        setTimeout(function() {
            window.location.href = 'account.html?mode=login&next=' + encodeURIComponent(window.location.href);
        }, 1500);
    };
})();
