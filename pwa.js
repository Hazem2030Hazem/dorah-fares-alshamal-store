// ============================================================
// PWA INSTALL PROMPT — تثبيت التطبيق وتسجيل Service Worker
// ============================================================
(function() {
    'use strict';

    let deferredPrompt;
    let installPromptReady = false;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installPromptReady = true;
        console.log('✅ PWA install prompt ready');
    });

    window.addEventListener('appinstalled', () => {
        console.log('✅ PWA installed successfully');
        deferredPrompt = null;
        installPromptReady = false;
        if (typeof window.showToast === 'function') window.showToast('✅ تم تثبيت التطبيق بنجاح!');
    });

    window.installPWA = function() {
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            if (typeof window.showToast === 'function') window.showToast('📱 التطبيق مثبت بالفعل!');
            return;
        }
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    if (typeof window.showToast === 'function') window.showToast('✅ تم تثبيت التطبيق بنجاح!');
                } else {
                    if (typeof window.showToast === 'function') window.showToast('⚠️ تم إلغاء التثبيت');
                }
                deferredPrompt = null;
            }).catch(() => {
                if (typeof window.showToast === 'function') window.showToast('❌ حدث خطأ في التثبيت');
            });
        } else {
            if (typeof window.showToast === 'function') window.showToast('⏳ جاري فتح صفحة التثبيت...');
            window.location.href = 'download.html';
        }
    };

    window.dismissInstallPrompt = function() {
        const prompt = document.getElementById('installPrompt');
        if (prompt) { prompt.classList.remove('show'); localStorage.setItem('doraInstallPromptDismissed', 'true'); }
    };

    function checkPWAInstallState() {
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            const prompt = document.getElementById('installPrompt'); if (prompt) prompt.classList.remove('show'); return;
        }
        if (localStorage.getItem('doraInstallPromptDismissed')) {
            const prompt = document.getElementById('installPrompt'); if (prompt) prompt.classList.remove('show'); return;
        }
        const prompt = document.getElementById('installPrompt');
        if (prompt && deferredPrompt) { prompt.classList.add('show'); }
    }

    document.addEventListener('DOMContentLoaded', function() {
        checkPWAInstallState();

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(function(registration) { console.log('✅ Service Worker registered:', registration.scope); })
                .catch(function(error) { console.log('❌ Service Worker registration failed:', error); });
        }

        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
            installBtn.style.display = 'inline-flex';
            installBtn.style.visibility = 'visible';
            installBtn.style.opacity = '1';
            installBtn.style.zIndex = '9999';
        }
    });
})();
