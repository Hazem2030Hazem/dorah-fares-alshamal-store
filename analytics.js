// ============================================================
// 📊 Google Analytics 4 - بدون Cookiebot
// ============================================================
(function() {
    'use strict';

    var gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-5J1QD56BN0';
    document.head.appendChild(gaScript);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-5J1QD56BN0');
})();
