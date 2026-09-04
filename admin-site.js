// ============================================================
// ADMIN SITE CONTENT STUBS — دوال إدارة محتوى الموقع
// نسخة أولية تحمي من أخطاء Console إلى حين استكمال الميزة
// ============================================================
(function() {
    'use strict';

    if (typeof window.supabaseClient === 'undefined' || !window.supabaseClient) {
        console.warn('admin-site.js: supabaseClient غير متوفر');
    }

    const esc = window.adminUtils && window.adminUtils.esc
        ? window.adminUtils.esc
        : function(v) { return String(v || '').replace(/[&<>"']/g, function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]; }); };

    function adminToast(message, type) {
        if (window.adminUtils && window.adminUtils.adminToast) {
            window.adminUtils.adminToast(message, type);
        } else if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            alert(message);
        }
    }

    window.loadSiteItems = async function(sectionKey) {
        var container = document.getElementById(sectionKey + 'List');
        if (!container) return;
        container.innerHTML = '<div class="admin-empty">⏳ جاري التحميل...</div>';
        try {
            var supabaseClient = window.supabaseClient;
            if (!supabaseClient) throw new Error('Supabase غير متوفر');
            var { data, error } = await supabaseClient
                .from('site_items')
                .select('*')
                .eq('section_key', sectionKey)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (error) throw error;
            var items = data || [];
            if (items.length === 0) {
                container.innerHTML = '<div class="admin-empty">لا توجد عناصر بعد — اضغط "إضافة" لإنشاء عنصر جديد</div>';
                return;
            }
            container.innerHTML = items.map(function(item) {
                return '<div class="admin-card" style="padding:12px;border:1px solid rgba(255,255,255,0.1);border-radius:10px;margin-bottom:10px">' +
                    '<h5 style="margin:0 0 6px">' + esc(item.title || 'بدون عنوان') + '</h5>' +
                    '<p style="margin:0;color:var(--text-muted);font-size:13px">' + esc(item.description || item.content || '') + '</p>' +
                    '</div>';
            }).join('');
        } catch(e) {
            console.warn('loadSiteItems error:', e);
            container.innerHTML = '<div class="admin-empty">⚠️ تعذر تحميل العناصر</div>';
        }
    };

    window.addSiteItem = async function(sectionKey) {
        try {
            var title = prompt('أدخل العنوان:');
            if (!title) return;
            var content = prompt('أدخل المحتوى:');
            var supabaseClient = window.supabaseClient;
            if (!supabaseClient) throw new Error('Supabase غير متوفر');
            var { error } = await supabaseClient.from('site_items').insert([{
                section_key: sectionKey,
                title: title,
                description: content,
                is_active: true,
                sort_order: 0
            }]);
            if (error) throw error;
            adminToast('✅ تمت الإضافة', 'success');
            window.loadSiteItems(sectionKey);
        } catch(e) {
            console.warn('addSiteItem error:', e);
            adminToast('⚠️ لم تكتمل الإضافة: ' + (e.message || 'خطأ غير معروف'), 'error');
        }
    };

    window.loadPaymentGateways = async function() {
        var container = document.getElementById('gatewaysContainer') || document.getElementById('gatewaysTab');
        if (!container) return;
        // لا نغيّر محتوى كامل التاب؛ نكتفي بإظهار رسالة لو كان هناك عنصر مخصص
        var statusEl = document.getElementById('gatewayStatus');
        if (statusEl) statusEl.textContent = 'جاهز';
    };

    window.loadSiteFiles = async function() {
        var container = document.getElementById('filesList');
        if (!container) return;
        container.innerHTML = '<div class="admin-empty">📁 الملفات الثابتة تُدار من لوحة Supabase Storage</div>';
    };
})();
