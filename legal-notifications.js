// ============================================================
// LEGAL & NOTIFICATIONS — الكوكيز، بوب أب الترحيب، الإشعارات، الشريط القانوني
// ============================================================
(function() {
    'use strict';

    // ============================================================
    // 1. إشعار ملفات تعريف الارتباط (الكوكيز)
    // ============================================================
    (function() {
        if (localStorage.getItem('cookie_consent')) return;
        var banner = document.createElement('div');
        banner.id = 'customCookieBanner';
        banner.innerHTML = `
            <style>
                #customCookieBanner {
                    position: fixed; bottom: 20px; left: 20px; right: 20px;
                    max-width: 600px; margin: 0 auto;
                    background: #1e293b; color: #f8fafc; padding: 20px;
                    border-radius: 16px; z-index: 999999;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    font-family: 'Cairo', sans-serif;
                    display: flex; flex-direction: column; gap: 15px;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                #customCookieBanner.hidden { display: none; }
                #customCookieBanner p { margin: 0; font-size: 14px; line-height: 1.6; }
                .cookie-actions { display: flex; gap: 10px; justify-content: flex-end; }
                .cookie-btn { padding: 8px 20px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; font-size: 14px; transition: 0.3s; }
                .cookie-btn.accept { background: #3b82f6; color: white; }
                .cookie-btn.accept:hover { background: #2563eb; }
                .cookie-btn.decline { background: transparent; color: #94a3b8; border: 1px solid #475569; }
                .cookie-btn.decline:hover { background: rgba(255,255,255,0.05); }
            </style>
            <p>🍪 نحن نستخدم ملفات تعريف الارتباط (Cookies) لتحسين تجربتك في موقع <strong>درة فارس الشمال</strong>.</p>
            <div class="cookie-actions">
                <button class="cookie-btn decline" data-dora-hide-banner="customCookieBanner:cookie_consent:declined">رفض</button>
                <button class="cookie-btn accept" data-dora-hide-banner="customCookieBanner:cookie_consent:accepted">قبول</button>
            </div>
        `;
        document.body.appendChild(banner);
    })();

    // ============================================================
    // 2. بوب أب خصم الترحيب الفاخر
    // ============================================================
    (function() {
        const closedUntil = localStorage.getItem('popup_closed_until');
        if (closedUntil && new Date().getTime() < parseInt(closedUntil)) return;

        var popup = document.createElement('div');
        popup.id = 'welcome-popup-overlay';
        popup.innerHTML = `
            <style>
                #welcome-popup-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(15, 23, 42, 0.85);
                    backdrop-filter: blur(8px);
                    z-index: 9999999;
                    display: flex; align-items: center; justify-content: center;
                    opacity: 0; visibility: hidden; transition: all 0.4s ease;
                }
                #welcome-popup-overlay.show { opacity: 1; visibility: visible; }
                #welcome-popup-box {
                    background: #ffffff; max-width: 580px; width: 90%;
                    border-radius: 24px; padding: 40px; position: relative;
                    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
                    transform: scale(0.9) translateY(30px);
                    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    text-align: center; font-family: 'Cairo', sans-serif; direction: rtl;
                }
                #welcome-popup-overlay.show #welcome-popup-box { transform: scale(1) translateY(0); }
                #popup-close-btn { position: absolute; top: 15px; left: 15px; background: #f1f5f9; border: none; width: 38px; height: 38px; border-radius: 50%; font-size: 18px; cursor: pointer; color: #475569; transition: 0.3s; }
                #popup-close-btn:hover { background: #e2e8f0; transform: rotate(90deg); }
                #popup-icon { display: inline-block; font-size: 56px; margin-bottom: 10px; line-height: 1; }
                #popup-title { font-size: 26px; font-weight: 900; color: #0f172a; margin: 5px 0 10px; }
                #popup-desc { font-size: 15px; color: #64748b; line-height: 1.7; margin-bottom: 20px; }
                #popup-code-box { display: inline-block; background: #f8fafc; border: 2px dashed #94a3b8; padding: 12px 30px; border-radius: 12px; font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: 2px; margin-bottom: 20px; }
                #popup-btn { display: block; width: 100%; padding: 14px; border: none; border-radius: 12px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; font-size: 16px; font-weight: 800; cursor: pointer; transition: 0.3s; box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3); }
                #popup-btn:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(59, 130, 246, 0.5); }
                #popup-footer { margin-top: 15px; font-size: 12px; color: #94a3b8; }
            </style>
            <div id="welcome-popup-box">
                <button id="popup-close-btn" data-dora-call="closeWelcomePopup">✕</button>
                <div id="popup-icon">🎁</div>
                <h3 id="popup-title">خصم خاص لك!</h3>
                <p id="popup-desc">احصل على خصم <strong>15%</strong> على أول طلب لك في متجر درة فارس الشمال.</p>
                <div id="popup-code-box">WELCOME15</div>
                <button id="popup-btn" data-dora-call="copyCodeAndClose">📋 نسخ الكود وبدء التسوق</button>
                <p id="popup-footer">العرض ساري لمدة 24 ساعة</p>
            </div>
        `;
        document.body.appendChild(popup);

        window.closeWelcomePopup = function() {
            document.getElementById('welcome-popup-overlay').classList.remove('show');
            const expiry = new Date().getTime() + 24 * 60 * 60 * 1000;
            localStorage.setItem('popup_closed_until', expiry);
        };
        window.copyCodeAndClose = function() {
            navigator.clipboard.writeText('WELCOME15');
            window.closeWelcomePopup();
            alert('✅ تم نسخ كود الخصم! استخدمه عند الدفع.');
        };

        setTimeout(() => {
            document.getElementById('welcome-popup-overlay').classList.add('show');
        }, 2000);
    })();

    // ============================================================
    // 3. DORA NOTIFICATIONS — جرس الإعلانات والإشعارات
    // ============================================================
    (function() {
        try {
            if (typeof window.supabaseClient === 'undefined' || !window.supabaseClient) return;

            var doraNotifSeen = 0;
            try {
                doraNotifSeen = Number(localStorage.getItem('doraNotifSeen')) || 0;
            } catch (e0) { doraNotifSeen = 0; }

            function doraNotifEsc(s) {
                var d = document.createElement('div');
                d.textContent = String(s == null ? '' : s);
                return d.innerHTML;
            }

            function doraNotifInjectCSS() {
                if (document.getElementById('doraNotifStyle')) return;
                var st = document.createElement('style');
                st.id = 'doraNotifStyle';
                st.textContent = [
                    '#doraNotifBell{position:fixed;bottom:30px;right:30px;z-index:9997;width:58px;height:58px;border-radius:50%;',
                    'background:#1E1B4B;border:1px solid #37347A;',
                    'color:#fff;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;',
                    'box-shadow:0 6px 18px rgba(0,0,0,.35);',
                    'transition:all .3s ease;font-family:inherit;}',
                    '#doraNotifBell:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,0,0,.45);background:#2A2760;}',
                    '#doraNotifBadge{position:absolute;top:-4px;left:-4px;min-width:22px;height:22px;border-radius:12px;background:linear-gradient(135deg,#ef4444,#dc2626);',
                    'color:#fff;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;padding:0 6px;',
                    'box-shadow:0 0 12px rgba(239,68,68,.7);border:2px solid rgba(10,20,40,.9);}',
                    '#doraNotifBadge.doraNotifHide{display:none;}',
                    '#doraNotifPanel{position:fixed;bottom:100px;right:30px;z-index:10002;width:340px;max-width:calc(100vw - 40px);max-height:440px;overflow-y:auto;',
                    'background:rgba(8,18,38,.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(56,189,248,.35);border-radius:20px;',
                    'box-shadow:0 16px 50px rgba(2,10,30,.65),0 0 30px rgba(14,165,233,.15);padding:0;opacity:0;transform:translateY(14px) scale(.97);pointer-events:none;',
                    'transition:all .3s ease;direction:rtl;font-family:\'Cairo\',\'Tajawal\',sans-serif;}',
                    '#doraNotifPanel.doraNotifOpen{opacity:1;transform:none;pointer-events:auto;}',
                    '.doraNotifHead{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(56,189,248,.22);position:sticky;top:0;background:rgba(8,18,38,.97);border-radius:20px 20px 0 0;}',
                    '.doraNotifHead b{color:#7dd3fc;font-size:16px;font-weight:900;}',
                    '.doraNotifHead button{background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.3);color:#9fdcff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px;transition:all .25s ease;}',
                    '.doraNotifHead button:hover{background:rgba(56,189,248,.25);transform:rotate(90deg);}',
                    '.doraNotifItem{padding:15px 20px;border-bottom:1px solid rgba(56,189,248,.12);transition:background .25s ease;}',
                    '.doraNotifItem:last-child{border-bottom:none;border-radius:0 0 20px 20px;}',
                    '.doraNotifItem:hover{background:rgba(14,165,233,.08);}',
                    '.doraNotifItem h4{margin:0 0 6px;color:#eaf6ff;font-size:15px;font-weight:900;display:flex;align-items:center;gap:8px;}',
                    '.doraNotifItem h4 .doraNotifNew{flex:none;font-size:10px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:2px 8px;border-radius:20px;font-weight:900;}',
                    '.doraNotifItem p{margin:0;color:rgba(200,225,245,.8);font-size:13px;line-height:1.8;font-weight:600;}',
                    '@media (max-width:640px){#doraNotifBell{bottom:20px;right:20px;width:52px;height:52px;font-size:21px;}#doraNotifPanel{right:12px;bottom:84px;}}'
                ].join('');
                document.head.appendChild(st);
            }

            function doraNotifBuild(items) {
                doraNotifInjectCSS();

                var maxId = 0;
                items.forEach(function(it) { var id = Number(it.id) || 0; if (id > maxId) maxId = id; });
                var unread = items.filter(function(it) { return (Number(it.id) || 0) > doraNotifSeen; }).length;

                var bell = document.createElement('button');
                bell.id = 'doraNotifBell';
                bell.setAttribute('aria-label', 'الإعلانات والإشعارات');
                bell.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg><span id="doraNotifBadge"' + (unread ? '' : ' class="doraNotifHide"') + '>' + unread + '</span>';

                var panel = document.createElement('div');
                panel.id = 'doraNotifPanel';
                var html = '<div class="doraNotifHead"><b style="display:flex;align-items:center;gap:6px"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg> الإعلانات</b><button type="button" id="doraNotifClose" aria-label="إغلاق">✕</button></div>';
                items.forEach(function(it) {
                    var isNew = (Number(it.id) || 0) > doraNotifSeen;
                    html += '<div class="doraNotifItem"><h4>' + doraNotifEsc(it.title_ar || 'إعلان') +
                        (isNew ? '<span class="doraNotifNew">جديد</span>' : '') + '</h4>' +
                        (it.description_ar ? '<p>' + doraNotifEsc(it.description_ar) + '</p>' : '') + '</div>';
                });
                panel.innerHTML = html;

                function doraNotifMarkSeen() {
                    try {
                        localStorage.setItem('doraNotifSeen', String(maxId));
                        doraNotifSeen = maxId;
                        var b = document.getElementById('doraNotifBadge');
                        if (b) b.classList.add('doraNotifHide');
                        var tags = panel.querySelectorAll('.doraNotifNew');
                        for (var i = 0; i < tags.length; i++) tags[i].remove();
                    } catch (e1) {}
                }

                bell.addEventListener('click', function(ev) {
                    ev.stopPropagation();
                    var open = panel.classList.toggle('doraNotifOpen');
                    if (open) doraNotifMarkSeen();
                });
                panel.addEventListener('click', function(ev) { ev.stopPropagation(); });
                var closeBtn = panel.querySelector('#doraNotifClose');
                if (closeBtn) closeBtn.addEventListener('click', function(ev) {
                    ev.stopPropagation();
                    panel.classList.remove('doraNotifOpen');
                });
                document.addEventListener('click', function() {
                    panel.classList.remove('doraNotifOpen');
                });

                document.body.appendChild(bell);
                document.body.appendChild(panel);
            }

            function doraNotifLoad() {
                try {
                    window.supabaseClient
                        .from('site_items')
                        .select('id,title_ar,description_ar,sort_order')
                        .eq('section_key', 'announcements')
                        .eq('is_active', true)
                        .order('sort_order', { ascending: true })
                        .then(function(res) {
                            try {
                                /* الجدول فاضي أو الاستعلام فشل → الجرس لا يظهر إطلاقاً */
                                if (!res || res.error || !res.data || !res.data.length) return;
                                doraNotifBuild(res.data);
                            } catch (e2) {}
                        })
                        .catch(function() {});
                } catch (e3) {}
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', doraNotifLoad);
            } else {
                doraNotifLoad();
            }
        } catch (e) {
            /* صمت تام — لا نكسر أي صفحة */
        }
    })();

    // ============================================================
    // 4. DORA LEGAL — الشريط القانوني + روابط العروض والتتبع
    // ============================================================
    (function doraLegal() {
        'use strict';
        try {
            // يُقرأ حيًّا من قاعدة البيانات (site_settings) — لا قيم ثابتة
            var _lst = (typeof window.getDoraSiteSettings === 'function') ? window.getDoraSiteSettings() : {};
            var DORA_LEGAL = {
                cr: _lst.companyCR || (_lst.company && _lst.company.commercial_register) || '—',
                vat: _lst.companyTax || (_lst.company && _lst.company.tax_number) || '—',
                maroof: (_lst.gov_docs && _lst.gov_docs.maroof_url) || ''
            };

            // ---------- حقن CSS الخاص بالوحدة ----------
            function doraLegalInjectCSS() {
                if (document.getElementById('doraLegalStyle')) return;
                var st = document.createElement('style');
                st.id = 'doraLegalStyle';
                st.textContent = [
                    '#doraLegalBar{direction:rtl;font-family:\'Cairo\',\'Tajawal\',sans-serif;',
                    'background:linear-gradient(135deg,rgba(8,18,38,.97),rgba(15,23,42,.97));',
                    'border-top:1px solid rgba(56,189,248,.25);padding:14px 20px;text-align:center;',
                    'color:rgba(203,213,225,.85);font-size:13px;font-weight:600;line-height:2;position:relative;z-index:50;}',
                    '#doraLegalBar .doraLegalSep{color:rgba(56,189,248,.5);margin:0 10px;}',
                    '#doraLegalBar a{color:#7dd3fc;text-decoration:none;font-weight:700;transition:color .25s ease;}',
                    '#doraLegalBar a:hover{color:#bae6fd;text-decoration:underline;}',
                    '#doraLegalBar .doraLegalLinks{margin-top:4px;display:flex;justify-content:center;gap:18px;flex-wrap:wrap;}',
                    '@media (max-width:640px){#doraLegalBar{font-size:12px;padding:12px 10px;}}'
                ].join('');
                document.head.appendChild(st);
            }

            // ---------- الشريط القانوني أسفل الفوتر ----------
            function doraLegalInjectBar() {
                if (document.getElementById('doraLegalBar')) return;
                doraLegalInjectCSS();

                var bar = document.createElement('div');
                bar.id = 'doraLegalBar';

                var html = 'سجل تجاري: ' + DORA_LEGAL.cr +
                    '<span class="doraLegalSep">|</span>الرقم الضريبي: ' + DORA_LEGAL.vat +
                    '<span class="doraLegalSep">|</span>شركة درة فارس الشمال © 2026';

                if (DORA_LEGAL.maroof && String(DORA_LEGAL.maroof).trim() !== '') {
                    var m = String(DORA_LEGAL.maroof).trim();
                    var href = /^https?:\/\//i.test(m) ? m : ('https://maroof.sa/' + m);
                    html += '<span class="doraLegalSep">|</span><a href="' + href + '" target="_blank" rel="noopener">✅ توثيق معروف</a>';
                }

                html += '<div class="doraLegalLinks">' +
                    '<a href="privacy.html">🔒 سياسة الخصوصية</a>' +
                    '<a href="terms.html">📜 شروط الاستخدام</a>' +
                    '</div>';

                bar.innerHTML = html;

                var footer = document.querySelector('footer');
                if (footer && footer.parentNode) {
                    footer.parentNode.insertBefore(bar, footer.nextSibling);
                } else if (document.body) {
                    document.body.appendChild(bar);
                }
            }

            // ---------- روابط العروض والتتبع (فوتر فقط) ----------
            function doraLegalInjectQuickLinks() {
                try {
                    var injected = false;
                    var cols = document.querySelectorAll('.footer .footer-col, footer .footer-col');
                    for (var i = 0; i < cols.length; i++) {
                        var h = cols[i].querySelector('h5');
                        var ul = cols[i].querySelector('ul');
                        if (h && ul && h.textContent.indexOf('التصنيفات') !== -1) {
                            if (!ul.querySelector('a[href="offers.html"]')) {
                                var li1 = document.createElement('li');
                                li1.innerHTML = '<a href="offers.html">🔥 العروض</a>';
                                ul.appendChild(li1);
                            }
                            if (!ul.querySelector('a[href="track.html"]')) {
                                var li2 = document.createElement('li');
                                li2.innerHTML = '<a href="track.html">📦 تتبع طلبك</a>';
                                ul.appendChild(li2);
                            }
                            injected = true;
                            break;
                        }
                    }
                    // فولباك: روابط أسفل الفوتر
                    if (!injected) {
                        var bottom = document.querySelector('.footer .footer-bottom div, footer .footer-bottom div');
                        if (bottom) {
                            if (!bottom.querySelector('a[href="offers.html"]')) {
                                var a1 = document.createElement('a');
                                a1.href = 'offers.html';
                                a1.textContent = '🔥 العروض';
                                bottom.appendChild(a1);
                            }
                            if (!bottom.querySelector('a[href="track.html"]')) {
                                var a2 = document.createElement('a');
                                a2.href = 'track.html';
                                a2.textContent = '📦 تتبع طلبك';
                                bottom.appendChild(a2);
                            }
                        }
                    }
                } catch (eFooter) { /* يفشل بصمت بدون كسر */ }
            }

            function doraLegalInit() {
                try { doraLegalInjectBar(); } catch (e1) {}
                try { doraLegalInjectQuickLinks(); } catch (e2) {}
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', doraLegalInit);
            } else {
                doraLegalInit();
            }
        } catch (e) {
            /* صمت تام — لا نكسر أي صفحة */
        }
    })();
})();
