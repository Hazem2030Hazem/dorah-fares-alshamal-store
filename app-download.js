// ============================================================
// APP DOWNLOAD — أقسام وشعارات تحميل التطبيق
// ============================================================
(function() {
    'use strict';

    // ===== زرار تحميل صغير جنب إحصائيات البانر =====
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            var heroStats = document.querySelector('.hero-stats');
            if (heroStats) {
                var downloadBadge = document.createElement('div');
                downloadBadge.className = 'hero-stat';
                downloadBadge.style.cssText = 'cursor:pointer;background:linear-gradient(135deg,#0EA5E9,#3B82F6);padding:12px 18px;border-radius:14px;transition:all 0.3s';
                downloadBadge.innerHTML = '<strong style="display:flex;align-items:center;gap:6px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>حمل التطبيق</strong><span>مجاناً</span>';
                downloadBadge.onclick = function() { location.href = 'download.html'; };
                downloadBadge.onmouseenter = function() { this.style.transform = 'scale(1.05)'; this.style.boxShadow = '0 8px 25px rgba(14,165,233,0.4)'; };
                downloadBadge.onmouseleave = function() { this.style.transform = 'scale(1)'; this.style.boxShadow = 'none'; };
                heroStats.appendChild(downloadBadge);
            }
        }, 1000);
    });

    // ===== قسم تحميل التطبيق العالمي (قبل الفوتر) =====
    (function(){
        function onReady(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
        onReady(function(){
            if (document.querySelector('.app-download-btns')) return;
            var section = document.createElement('section');
            section.className = 'global-app-download';
            section.setAttribute('aria-label', 'تحميل تطبيق درة فارس الشمال');
            section.innerHTML = '<div class="global-app-download-box">' +
                '<p class="global-app-download-title">📲 حمّل تطبيق درة فارس الشمال على جوالك أو الكمبيوتر، أو اطلب عرض سعر الآن!</p>' +
                '<div class="app-download-btns">' +
                '<a href="https://github.com/Hazem2030Hazem/dorah-fares-alshamal-store/raw/main/app-release.apk" download class="btn-primary">📱 تحميل تطبيق Android</a>' +
                '<button type="button" data-dora-action="installPWA" class="btn-primary">💻 حمّل تطبيق درة فارس الشمال</button>' +
                '<a href="' + window.doraWhatsAppLink('مرحباً أرغب في طلب عرض سعر من شركة درة فارس الشمال', (window.getDoraSiteSettings().companyPhone1 || '').trim() || undefined) + '" target="_blank" rel="noopener" class="btn-primary">📋 اطلب عرض سعر</a>' +
                '</div>' +
                '<p class="global-app-download-note">اضغط للتثبيت على الشاشة الرئيسية</p>' +
                '</div>';
            var footer = document.querySelector('footer.footer, footer');
            if (footer && footer.parentNode) footer.parentNode.insertBefore(section, footer);
            else document.body.appendChild(section);
        });
    })();

    // ===== قسم تحميل التطبيق في الفوتر — تصميم رسمي =====
    (function () {
        var skip = /admin|invoice|payment-return|test-payment|thankyou|checkout/i;
        function injectAppDownload() {
            if (skip.test(location.pathname)) return;
            if (document.getElementById('doraAppDownload')) return;
            var footer = document.querySelector('footer, .footer');
            if (!footer) return;

            var PLAY_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M3 2.5v19c0 .4.44.64.77.42l16.5-9.5c.3-.18.3-.6 0-.78L3.77 2.08A.48.48 0 0 0 3 2.5z"/></svg>';
            var APPLE_SVG = '<svg viewBox="0 0 384 512" width="20" height="22" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>';
            var PC_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';

            var box = document.createElement('div');
            box.id = 'doraAppDownload';
            box.innerHTML =
                '<div class="dad-wrap">' +
                '<div class="dad-info">' +
                '<h3>درة فارس الشمال… في أي وقت، وأي مكان!</h3>' +
                '<p>حمّل تطبيقنا لتجربة تسوق أسرع وأسهل — متوفر لأندرويد وآيفون والكمبيوتر</p>' +
                '<div class="dad-badges">' +
                '<a href="download.html" class="dad-badge"><span class="dad-badge-ic">' + PLAY_SVG + '</span><span><small>حمّله من</small><b>Google Play</b></span></a>' +
                '<a href="download.html" class="dad-badge"><span class="dad-badge-ic">' + APPLE_SVG + '</span><span><small>حمّله من</small><b>App Store</b></span></a>' +
                '<a href="download.html" class="dad-badge"><span class="dad-badge-ic">' + PC_SVG + '</span><span><small>متاح لـ</small><b>الكمبيوتر</b></span></a>' +
                '</div>' +
                '</div>' +
                '<div class="dad-qrs">' +
                '<div class="dad-qr"><img src="qr-android.png" alt="QR تطبيق أندرويد" loading="lazy"><span>امسح لتحميل<br><b>تطبيق أندرويد</b></span></div>' +
                '<div class="dad-qr"><img src="qr-apple.png" alt="QR تطبيق آيفون" loading="lazy"><span>امسح لتثبيت<br><b>تطبيق آيفون</b></span></div>' +
                '</div>' +
                '</div>';
            footer.parentNode.insertBefore(box, footer);
        }
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectAppDownload);
        else injectAppDownload();
    })();
})();
