// ============================================================
// DYNAMIC SECTIONS — أقسام الصفحة الرئيسية الديناميكية والمحتوى المحقون
// ============================================================
(function() {
    'use strict';

    // ===== دالة مساعدة لتجنب XSS =====
    window.esc = function(v) {
        return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    };

    // ============================================================
    // COMPANY PAGES LINKS — تثبيت روابط صفحات الشركة في القائمة المنسدلة
    // ============================================================
    (function(){
        function onReady(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
        onReady(function(){
            var companyPages = { 'نبذة عن الشركة': 'about.html', 'رؤيتنا': 'vision.html', 'رسالتنا': 'mission.html', 'فريق العمل': 'team.html', 'الشهادات': 'certifications.html' };
            document.querySelectorAll('.dropdown-menu a').forEach(function(link){
                var label = (link.textContent || '').replace(/\s+/g, ' ').trim();
                if (companyPages[label]) link.setAttribute('href', companyPages[label]);
            });
        });
    })();

    // ============================================================
    // ACCOUNT SYSTEM LOADER — تحميل نظام الحسابات
    // ============================================================
    (function(){
        if (document.querySelector('script[data-account-system]')) return;
        var script = document.createElement('script');
        script.src = 'account-system.js';
        script.async = false;
        script.setAttribute('data-account-system', 'true');
        script.onerror = function(){ console.warn('تعذر تحميل account-system.js'); };
        document.body.appendChild(script);
    })();

    // ===== تحميل الشركاء والعملاء =====
    window.loadPartners = async function() {
        var grid = document.getElementById('partnersGrid');
        var countText = document.getElementById('partnersCount');
        if (!grid) return;

        try {
            var result = await window.supabaseClient
                .from('partners')
                .select('*')
                .order('id', { ascending: false });

            if (result.error) throw result.error;

            var partners = result.data || [];

            if (partners.length === 0) {
                grid.innerHTML = '<div style="text-align:center;width:100%;padding:30px;color:rgba(255,255,255,0.5)">🤝 لم يتم إضافة شركاء بعد</div>';
                if (countText) countText.textContent = '';
                return;
            }

            grid.innerHTML = partners.map(function(p) {
                var imgHtml = p.image_url ? '<img src="' + window.esc(p.image_url) + '" alt="' + window.esc(p.name) + '" loading="lazy" style="width:50px;height:50px;border-radius:10px;object-fit:cover">' : '<span style="font-size:30px">🏢</span>';
                return '<div class="why-card">' +
                    '<div class="why-icon">' + imgHtml + '</div>' +
                    '<h4>' + window.esc(p.name) + '</h4>' +
                    '<p>' + window.esc(p.category || 'شريك') + '</p>' +
                    '<div style="margin-top:8px;font-size:12px;color:#60A5FA;font-weight:700">🤝 شريك</div>' +
                    '</div>';
            }).join('');

            if (countText) countText.textContent = 'وأكثر من ' + partners.length + ' شريك وعميل يثقون بخدماتنا';

        } catch (e) {
            console.log('Partners load error:', e);
            grid.innerHTML = '<div style="text-align:center;width:100%;padding:30px;color:#EF4444">⚠️ تعذر تحميل الشركاء</div>';
        }
    };

    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(loadPartners, 500);
    });

    // ============================================================
    // ربط أقسام الصفحة الرئيسية بـ site_items
    // ============================================================
    (function(){
        // ===== SVG ICONS MAP =====
        var doraIcons = {
            why_us: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            vision_mission: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
            projects: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path><path d="M12 12v4"></path><path d="M8 12h8"></path></svg>',
            blog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
            certifications: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>',
            contact: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
            testimonials: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
            default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>'
        };

        function doraIcon(sectionKey, meta) {
            if (meta && meta.icon_name && meta.icon_name.startsWith('<svg')) return meta.icon_name;
            return doraIcons[sectionKey] || doraIcons['default'];
        }

        window.loadSection = async function(sectionKey, containerId, renderFn) {
            var container = document.getElementById(containerId);
            if (!container) return;
            try {
                var { data } = await window.supabaseClient.from('site_items').select('*').eq('section_key', sectionKey).eq('is_active', true).order('sort_order');
                if (data && data.length > 0) renderFn(container, data);
            } catch(e) { console.log('Error loading ' + sectionKey, e); }
        };

        // دالة مساعدة لإنشاء بطاقة why-card
        function cardHTML(icon, title, desc, extra) {
            return '<div class="why-card">' +
                '<div class="why-icon">' + icon + '</div>' +
                '<h4>' + window.esc(title) + '</h4>' +
                '<p>' + window.esc(desc) + '</p>' +
                (extra || '') +
                '</div>';
        }

        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {

                // 1. لماذا تختارنا
                loadSection('why_us', 'whyUsGrid', function(container, items) {
                    container.innerHTML = items.map(function(item) {
                        var meta = item.metadata || {};
                        return cardHTML(doraIcon('why_us', meta), item.title_ar || '', item.description_ar || '');
                    }).join('');
                });

                // 2. رؤيتنا - رسالتنا - قيمنا
                loadSection('vision_mission', 'visionMissionGrid', function(container, items) {
                    container.innerHTML = items.map(function(item) {
                        var meta = item.metadata || {};
                        return cardHTML(doraIcon('vision_mission', meta), item.title_ar || '', item.description_ar || '');
                    }).join('');
                });

                // 3. إحصائيات about
                loadSection('hero_stats', 'aboutStats', function(container, items) {
                    container.innerHTML = items.map(function(item) {
                        var meta = item.metadata || {};
                        return '<div class="why-card" style="text-align:center">' +
                            '<div class="stat-number">' + window.esc(meta.number || '') + '</div>' +
                            '<div style="width:30px;height:3px;background:' + window.esc(meta.color || '#0EA5E9') + ';margin:8px auto;border-radius:2px"></div>' +
                            '<p style="font-size:14px;color:#6B7280;font-weight:600">' + window.esc(item.description_ar || item.title_ar || '') + '</p>' +
                            '</div>';
                    }).join('');
                });

                // 4. إحصائيات achievements
                loadSection('hero_stats', 'achievementsStats', function(container, items) {
                    container.innerHTML = items.map(function(item) {
                        var meta = item.metadata || {};
                        return '<div class="why-card" style="text-align:center">' +
                            '<div class="stat-number">' + window.esc(meta.number || '') + '</div>' +
                            '<div style="width:40px;height:3px;background:' + window.esc(meta.color || '#0EA5E9') + ';margin:8px auto;border-radius:2px"></div>' +
                            '<p style="font-size:15px;color:#6B7280;font-weight:600">' + window.esc(item.description_ar || item.title_ar || '') + '</p>' +
                            '</div>';
                    }).join('');
                });

                // 5. آراء عملائنا (أفراد) - بيستخدم renderReviews() خلاص، فمش هنتدخل فيه

                // 6. آراء كبرى الشركات
                loadSection('testimonials', 'companyTestimonialsGrid', function(container, items) {
                    container.innerHTML = items.map(function(item) {
                        var meta = item.metadata || {};
                        var stars = '⭐'.repeat(meta.rating || 5);
                        return '<div class="why-card">' +
                            '<div class="why-icon">' + doraIcon('testimonials', meta) + '</div>' +
                            '<div style="color:#F59E0B;margin-bottom:10px;font-size:18px">' + stars + '</div>' +
                            '<h4>' + window.esc(item.title_ar || 'عميل') + '</h4>' +
                            '<p>"' + window.esc(item.description_ar || '') + '"</p>' +
                            '<div class="client-name">' +
                            (meta.client_logo ? '<img src="' + window.esc(meta.client_logo) + '" alt="logo" loading="lazy" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-left:4px" data-dora-error="hide">' : '<svg style="width:14px;height:14px;vertical-align:middle;margin-left:4px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>') +
                            window.esc(meta.client_name || meta.company_name || 'جهة معتمدة') +
                            '</div>' +
                            '</div>';
                    }).join('');
                });

                // 7. شركاؤنا - خلاص متعمل في loadPartners()، مش هنتدخل فيه

                // 8. مشاريعنا المنفذة
                loadSection('projects', 'projectsGridList', function(container, items) {
                    container.innerHTML = items.map(function(item) {
                        var meta = item.metadata || {};
                        return cardHTML(doraIcon('projects', meta), item.title_ar || '', item.description_ar || '',
                            '<div class="client-name">🏢 ' + window.esc(meta.client_name || '') + '</div>');
                    }).join('');
                });

                // 9. أحدث المقالات
                loadSection('blog', 'blogGridList', function(container, items) {
                    container.innerHTML = items.map(function(item) {
                        var meta = item.metadata || {};
                        return '<div class="why-card" style="cursor:pointer" data-href="' + window.esc(meta.link_url || '#') + '" data-dora-call="doraOpenWindow:$element">' +
                            '<div class="why-icon">' + doraIcon('blog', meta) + '</div>' +
                            '<h4>' + window.esc(item.title_ar || '') + '</h4>' +
                            '<p>' + window.esc(item.description_ar || '') + '</p>' +
                            '<div class="blog-meta"><span><svg style="width:14px;height:14px;vertical-align:middle;margin-left:4px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' + window.esc(meta.publish_date || '') + '</span><span><svg style="width:14px;height:14px;vertical-align:middle;margin-left:4px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>' + window.esc(meta.read_time || '') + '</span></div>' +
                            '</div>';
                    }).join('');
                });

                // 10. تواصل معنا
                loadSection('contact', 'contactGridList', function(container, items) {
                    container.innerHTML = items.map(function(item) {
                        var meta = item.metadata || {};
                        var icon = doraIcon('contact', meta);
                        return '<div class="why-card" style="cursor:pointer" data-href="' + window.esc(meta.link_url || '#') + '" data-dora-call="doraOpenWindow:$element">' +
                            '<div class="why-icon">' + icon + '</div>' +
                            '<h4>' + window.esc(item.title_ar || '') + '</h4>' +
                            '<p>' + window.esc(item.description_ar || '') + '</p>' +
                            '<div class="contact-value">' + window.esc(meta.value || '') + '</div>' +
                            '</div>';
                    }).join('');
                });

                // 11. شهاداتنا واعتماداتنا
                loadSection('certifications', 'certificationsGridList', function(container, items) {
                    container.innerHTML = items.map(function(item) {
                        var meta = item.metadata || {};
                        return cardHTML(doraIcon('certifications', meta), item.title_ar || '', item.description_ar || '',
                            '<div class="cert-badge">✅ ' + window.esc(meta.badge_text || 'معتمد') + '</div>');
                    }).join('');
                });

            }, 800);
        });
    })();

    // ============================================================
    // WHATSAPP CHAT WIDGET — زر التواصل العائم
    // ============================================================
    (function() {
        var widgetHTML = '<div class="wa-chat-widget" id="waWidget">' +
            '<div class="wa-chat-bubble" id="waBubble" data-dora-call="toggleWaChat">' +
            '<span class="wa-icon" style="display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg></span>' +
            '</div>' +
            '<div class="wa-chat-box" id="waChatBox" style="display:none">' +
            '<div class="wa-chat-header">' +
            '<span>👋 مرحباً! كيف نقدر نساعدك؟</span>' +
            '<button data-dora-call="toggleWaChat" style="background:none;border:none;color:white;font-size:20px;cursor:pointer">✕</button>' +
            '</div>' +
            '<div class="wa-chat-body">' +
            '<p>اختر نوع الاستفسار:</p>' +
            '<button data-dora-action="waOpen:استفسار عن منتج">📦 استفسار عن منتج</button>' +
            '<button data-dora-action="waOpen:طلب خدمة">🔧 طلب خدمة</button>' +
            '<button data-dora-action="waOpen:طلب عرض سعر">📋 طلب عرض سعر</button>' +
            '<button data-dora-action="waOpen:استفسار عام">💬 استفسار عام</button>' +
            '</div>' +
            '</div>' +
            '</div>';

        document.addEventListener('DOMContentLoaded', function() {
            document.body.insertAdjacentHTML('beforeend', widgetHTML);
        });

        window.toggleWaChat = function() {
            var email = 'info@alshamal-df.com';
            try { if (window.getDoraSiteSettings) { var s = window.getDoraSiteSettings(); if (s && s.companyEmail) email = s.companyEmail; } } catch(_) {}
            location.href = 'mailto:' + email + '?subject=' + encodeURIComponent('استفسار من موقع درة فارس الشمال');
        };

        window.waOpen = function(type) {
            var msg = 'مرحباً شركة درة فارس الشمال،\n\n' + type + '\n\nالاسم: \nالجوال: \nالتفاصيل: ';
            window.open('https://wa.me/966545358773?text=' + encodeURIComponent(msg), '_blank');
        };
    })();

    // ============================================================
    // 2D ROBOT — مساعد الشات العائم
    // ============================================================
    (function() {
        if (document.getElementById('chat-robot-container')) return;
        var container = document.createElement('div');
        container.id = 'chat-robot-container';
        container.onclick = function() {
            if (typeof window.doraChatbot !== 'undefined' && window.doraChatbot.toggle) {
                window.doraChatbot.toggle();
            }
        };
        var bubble = document.createElement('div');
        bubble.id = 'robot-bubble';
        bubble.innerText = 'أهلاً! اسألني أي حاجة 🤖';
        var img = document.createElement('img');
        img.id = 'chat-robot-img';
        img.src = 'robot.png';
        img.alt = 'مساعد درة فارس';
        container.appendChild(bubble);
        container.appendChild(img);
        document.body.appendChild(container);
    })();

    // ============================================================
    // BRAND ICONS — أيقونات طرق الدفع
    // ============================================================
    window.DORA_BRAND_ICONS = {
        visa: '<svg viewBox="0 0 48 32" width="44" height="30" aria-label="Visa"><rect width="48" height="32" rx="5" fill="#fff" stroke="#E5E7EB"/><text x="24" y="21.5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="12.5" font-weight="900" font-style="italic" fill="#1A1F71" letter-spacing="1">VISA</text></svg>',
        mastercard: '<svg viewBox="0 0 48 32" width="44" height="30" aria-label="Mastercard"><rect width="48" height="32" rx="5" fill="#fff" stroke="#E5E7EB"/><circle cx="20" cy="16" r="8" fill="#EB001B"/><circle cx="28" cy="16" r="8" fill="#F79E1B" fill-opacity="0.85"/></svg>',
        mada: '<svg viewBox="0 0 48 32" width="44" height="30" aria-label="mada"><rect width="48" height="32" rx="5" fill="#fff" stroke="#E5E7EB"/><text x="17" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="900" fill="#006C68">مدى</text><text x="36" y="20.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="8.5" font-weight="800" font-style="italic" fill="#8DC63F">mada</text></svg>',
        stcpay: '<svg viewBox="0 0 48 32" width="44" height="30" aria-label="STC Pay"><rect width="48" height="32" rx="5" fill="#4F008C"/><text x="24" y="15.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="10.5" font-weight="900" fill="#fff">stc</text><text x="24" y="25" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" font-weight="700" fill="#FF375E">pay</text></svg>',
        applepay: '<svg viewBox="0 0 48 32" width="44" height="30" aria-label="Apple Pay"><rect width="48" height="32" rx="5" fill="#000"/><text x="24" y="20.5" text-anchor="middle" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="11" font-weight="600" fill="#fff">&#63743; Pay</text></svg>',
        tabby: '<svg viewBox="0 0 48 32" width="44" height="30" aria-label="Tabby"><rect width="48" height="32" rx="5" fill="#3EFFC1"/><text x="24" y="20.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="10.5" font-weight="900" fill="#0F0C29">tabby</text></svg>',
        tamara: '<svg viewBox="0 0 48 32" width="44" height="30" aria-label="Tamara"><rect width="48" height="32" rx="5" fill="#fff" stroke="#E5E7EB"/><text x="24" y="20.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="9.5" font-weight="900" fill="#1A1A2E">tamara<tspan fill="#00C48C">.</tspan></text></svg>',
        bank: '<svg viewBox="0 0 48 32" width="44" height="30" aria-label="تحويل بنكي"><rect width="48" height="32" rx="5" fill="#0F2B5B"/><path d="M24 7 L38 13.5 H10 Z" fill="#fff"/><rect x="13" y="15.5" width="3.6" height="8" fill="#fff"/><rect x="19.2" y="15.5" width="3.6" height="8" fill="#fff"/><rect x="25.2" y="15.5" width="3.6" height="8" fill="#fff"/><rect x="31.4" y="15.5" width="3.6" height="8" fill="#fff"/><rect x="10" y="24.8" width="28" height="2.2" fill="#fff"/></svg>',
        cash: '<svg viewBox="0 0 48 32" width="44" height="30" aria-label="نقدي"><rect width="48" height="32" rx="5" fill="#0B7A4B"/><rect x="9" y="9.5" width="30" height="13" rx="2" fill="#fff" fill-opacity="0.16" stroke="#fff" stroke-width="1.4"/><circle cx="24" cy="16" r="4" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="13.5" cy="12.5" r="1" fill="#fff"/><circle cx="34.5" cy="19.5" r="1" fill="#fff"/></svg>',
        card: '<svg viewBox="0 0 48 32" width="44" height="30" aria-label="بطاقة"><rect width="48" height="32" rx="5" fill="#374151"/><rect x="6" y="10" width="36" height="4.5" fill="#9CA3AF"/><rect x="6" y="19" width="14" height="3.5" rx="1.5" fill="#D1D5DB"/></svg>'
    };

    window.doraBrandIcon = function(name) {
        var n = String(name || '').toLowerCase();
        if (/visa|فيزا/.test(n)) return window.DORA_BRAND_ICONS.visa;
        if (/master|ماستر/.test(n)) return window.DORA_BRAND_ICONS.mastercard;
        if (/مدى|mada/.test(n)) return window.DORA_BRAND_ICONS.mada;
        if (/stc|اس تي سي/.test(n)) return window.DORA_BRAND_ICONS.stcpay;
        if (/apple|آبل|ابل/.test(n)) return window.DORA_BRAND_ICONS.applepay;
        if (/tabby|تابي/.test(n)) return window.DORA_BRAND_ICONS.tabby;
        if (/tamara|تمارا/.test(n)) return window.DORA_BRAND_ICONS.tamara;
        if (/تحويل|بنك|حساب/.test(n)) return window.DORA_BRAND_ICONS.bank;
        if (/كاش|نقد|استلام|cash/.test(n)) return window.DORA_BRAND_ICONS.cash;
        return window.DORA_BRAND_ICONS.card;
    };
})();
