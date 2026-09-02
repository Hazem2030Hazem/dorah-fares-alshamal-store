// ============================================================
// BOTTOM NAV — شريط التنقل السفلي للجوال
// ============================================================
(function(){
    'use strict';

    var _bnPage = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    /* صفحات مستثناة: الدفع (تصميمها مُقفل) والفاتورة (طباعة) ولوحة التحكم */
    if (/^(checkout|invoice|admin)\.html$/.test(_bnPage)) return;

    var _bnCSS =
        '@media (max-width: 768px) {' +
        '  body { padding-bottom: 76px !important; }' +
        '  #doraBottomNav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 9990;' +
        '    display: flex; justify-content: space-around; align-items: stretch;' +
        '    background: rgba(13, 11, 36, 0.82); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);' +
        '    border-top: 1px solid rgba(220, 232, 255, 0.22);' +
        '    box-shadow: 0 -6px 24px rgba(0,0,0,0.45), 0 0 18px rgba(168,197,255,0.10);' +
        '    padding: 6px 4px calc(6px + env(safe-area-inset-bottom, 0px)); direction: rtl;' +
        '    font-family: inherit; }' +
        '  #doraBottomNav a, #doraBottomNav button { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;' +
        '    gap: 3px; background: none; border: none; text-decoration: none; cursor: pointer;' +
        '    color: #B9C4E8; font-size: 11px; font-weight: 600; padding: 6px 2px; border-radius: 12px;' +
        '    transition: all 0.25s ease; font-family: inherit; position: relative; }' +
        '  #doraBottomNav svg { width: 22px; height: 22px; stroke: #B9C4E8; fill: none; stroke-width: 2; transition: all 0.25s ease;' +
        '    filter: drop-shadow(0 0 6px rgba(168,197,255,0.25)); }' +
        '  #doraBottomNav .bn-active { color: #EDF3FF; background: rgba(255,255,255,0.10);' +
        '    box-shadow: 0 0 16px rgba(168,197,255,0.18) inset, 0 0 12px rgba(255,255,255,0.10); }' +
        '  #doraBottomNav .bn-active svg { stroke: #FFFFFF; filter: drop-shadow(0 0 8px rgba(255,255,255,0.55)); }' +
        '  #doraBottomNav a:active, #doraBottomNav button:active { transform: scale(0.93); }' +
        '  #doraBottomNav .bn-badge { position: absolute; top: 2px; left: calc(50% - 20px); min-width: 17px; height: 17px;' +
        '    background: linear-gradient(135deg, #22C55E, #16A34A); color: #fff; font-size: 10px; font-weight: 800;' +
        '    border-radius: 999px; display: flex; align-items: center; justify-content: center; padding: 0 4px;' +
        '    box-shadow: 0 0 10px rgba(34,197,94,0.6); }' +
        '  #doraBottomNav .bn-badge.bn-hide { display: none; }' +
        /* رفع العناصر العائمة فوق الشريط — منع التداخل (شكل فقط، بدون لمس وظائفها) */
        '  #chat-robot-container { bottom: 96px !important; left: 14px !important; }' +
        '  #doraChatWidget { bottom: 96px !important; left: 14px !important; }' +
        '  #waWidget, .wa-chat-widget { bottom: 96px !important; }' +
        '  .wa-chat-panel, #waPanel { bottom: 168px !important; }' +
        '  #doraNotifBell { bottom: 172px !important; right: 14px !important; }' +
        '  #doraNotifPanel { bottom: 246px !important; right: 14px !important; }' +
        '  #customCookieBanner { bottom: 86px !important; }' +
        '  #socialProofToast { bottom: 168px !important; }' +
        '  .toast { bottom: 96px !important; }' +
        '  .compare-bar { bottom: 76px !important; }' +
        '}' +
        '@media (min-width: 769px) { #doraBottomNav { display: none; } }' +

        /* ===== وضوح وتقسيم الرئيسية — عناوين كبيرة وفواصل واضحة (طابع ضوء القمر) ===== */
        '.section-header { position: relative; padding-top: 18px; margin-bottom: 30px; }' +
        '.section-header::before { content: ""; display: block; width: 72px; height: 4px; border-radius: 4px;' +
        '  background: linear-gradient(90deg, #22C55E, #A8C5FF); box-shadow: 0 0 14px rgba(168,197,255,.55);' +
        '  margin: 0 auto 16px; }' +
        '.section-header h3 { font-size: 30px !important; font-weight: 900 !important;' +
        '  letter-spacing: .3px; }' +
        '.section-header p { font-size: 15px !important; opacity: .85; }' +
        'section[id] { border-top: 1px solid rgba(220,232,255,.08); }' +
        'section.hero { border-top: none; }' +
        '@media (max-width: 768px) {' +
        '  .section-header h3 { font-size: 23px !important; }' +
        '  .section-header p { font-size: 13.5px !important; }' +
        '  .section-header { padding-top: 12px; margin-bottom: 22px; }' +
        '}';

    var _bnIcons = {
        home: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
        grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect></svg>',
        cart: '<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>',
        user: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
        menu: '<svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>'
    };

    function _bnCartCount(){
        try {
            var c = JSON.parse(localStorage.getItem('doraCart') || '[]');
            var n = 0;
            for (var i = 0; i < c.length; i++) n += (parseInt(c[i].quantity, 10) || parseInt(c[i].qty, 10) || 1);
            return n;
        } catch(e) { return 0; }
    }

    function injectDoraBottomNav(){
        if (document.getElementById('doraBottomNav')) return;
        var st = document.createElement('style');
        st.id = 'doraBottomNavCSS';
        st.textContent = _bnCSS;
        document.head.appendChild(st);

        var nav = document.createElement('nav');
        nav.id = 'doraBottomNav';
        nav.setAttribute('aria-label', 'شريط التنقل السفلي');

        var isHome = (_bnPage === 'index.html' || _bnPage === '');
        var isProducts = (_bnPage.indexOf('products') === 0) || (_bnPage === 'offers.html');
        var isAccount = (_bnPage === 'my-account.html' || _bnPage === 'account.html');

        nav.innerHTML =
            '<a href="index.html" class="' + (isHome ? 'bn-active' : '') + '">' + _bnIcons.home + '<span>الرئيسية</span></a>' +
            '<a href="products.html" class="' + (isProducts ? 'bn-active' : '') + '">' + _bnIcons.grid + '<span>المنتجات</span></a>' +
            '<button type="button" id="bnCartBtn">' + _bnIcons.cart + '<span>السلة</span><span class="bn-badge bn-hide" id="bnCartBadge">0</span></button>' +
            '<a href="my-account.html" class="' + (isAccount ? 'bn-active' : '') + '">' + _bnIcons.user + '<span>حسابي</span></a>' +
            '<button type="button" id="bnMenuBtn">' + _bnIcons.menu + '<span>القائمة</span></button>';

        document.body.appendChild(nav);

        /* زر السلة: يفتح سلة الموقع الموجودة (وإلا يوجّه لصفحة المنتجات) */
        document.getElementById('bnCartBtn').onclick = function(){
            if (typeof window.toggleCart === 'function') { try { window.toggleCart(); return; } catch(e){} }
            location.href = 'products.html';
        };

        /* زر القائمة: يفتح قائمة الموقع الموجودة (نفس الهمبرغر) */
        document.getElementById('bnMenuBtn').onclick = function(){
            var nl = document.querySelector('.nav-links');
            if (nl) { nl.classList.toggle('active'); return; }
            location.href = 'index.html';
        };

        /* عدّاد السلة — تحديث حي */
        function _bnRefreshBadge(){
            var b = document.getElementById('bnCartBadge');
            if (!b) return;
            var n = _bnCartCount();
            b.textContent = n > 99 ? '99+' : n;
            b.classList.toggle('bn-hide', n <= 0);
        }
        _bnRefreshBadge();
        setInterval(function(){ if (!document.hidden) _bnRefreshBadge(); }, 2000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectDoraBottomNav);
    else injectDoraBottomNav();
})();
