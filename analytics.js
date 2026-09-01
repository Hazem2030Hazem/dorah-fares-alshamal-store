// ============================================================
// 📊 Google Analytics 4 - مع دعم Cookiebot
// ============================================================
(function() {
    'use strict';

    var gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-5J1QD56BN0';
    gaScript.setAttribute('data-cookieconsent', 'statistics');
    document.head.appendChild(gaScript);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('consent', 'default', {
        'analytics_storage': 'denied',
        'ad_storage': 'denied',
        'wait_for_update': 500
    });

    gtag('config', 'G-5J1QD56BN0');

    window.addEventListener('CookiebotOnAccept', function() {
        gtag('consent', 'update', {
            'analytics_storage': 'granted',
            'ad_storage': 'granted'
        });
    });

    window.addEventListener('CookiebotOnDecline', function() {
        gtag('consent', 'update', {
            'analytics_storage': 'denied',
            'ad_storage': 'denied'
        });
    });
})();
