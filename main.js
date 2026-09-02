// ============================================================
// MAIN — تهيئة/تنسيق صغير يربط الوحدات معاً
// ============================================================

// استخدام الدوال المشتركة من core-utils.js (sanitizeInput, formatPrice, calculateTax, calculateDiscount)
// ومن auth.js (checkAuth, requireAuth) و ui-utils.js (showToast) و cart.js/products.js/wishlist-compare.js
const supabaseClient = window.supabaseClient;

document.addEventListener('keydown', function(e) {
    // ⚠️ تمت إزالة اختصار الأدمن المخفي (Ctrl+Alt+H) لأسباب أمنية.
    // يجب الدخول إلى لوحة الإدارة عبر admin.html مع Supabase Auth.
    if (e.ctrlKey && e.altKey && (e.key.toLowerCase() === 'g' || e.code === 'KeyG')) {
        e.preventDefault();
        window.open('team-login.html', '_blank');
        window.showToast('👥 جاري فتح بوابة فريق العمل...');
    }
    if (e.key === 'Escape') {
        window.closeProductModal();
        window.closeCompareModal();
        if (document.getElementById('cartSidebar').classList.contains('open')) window.toggleCart();
    }
});

function handleSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('contactName').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const subject = document.getElementById('contactSubject').value;
    const message = document.getElementById('contactMessage').value.trim();

    let hasError = false;

    if (name.length < 3) {
        document.getElementById('contactName').classList.add('error');
        hasError = true;
    } else {
        document.getElementById('contactName').classList.remove('error');
    }

    if (!/^05[0-9]{8}$/.test(phone)) {
        document.getElementById('contactPhone').classList.add('error');
        hasError = true;
    } else {
        document.getElementById('contactPhone').classList.remove('error');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        document.getElementById('contactEmail').classList.add('error');
        hasError = true;
    } else {
        document.getElementById('contactEmail').classList.remove('error');
    }

    if (!subject) {
        document.getElementById('contactSubject').classList.add('error');
        hasError = true;
    } else {
        document.getElementById('contactSubject').classList.remove('error');
    }

    if (message.length < 10) {
        document.getElementById('contactMessage').classList.add('error');
        hasError = true;
    } else {
        document.getElementById('contactMessage').classList.remove('error');
    }

    if (hasError) {
        window.showToast('❌ الرجاء تصحيح الأخطاء في النموذج', 'error');
        return;
    }

    window.showToast('✅ تم إرسال رسالتك بنجاح! سنتواصل معك قريباً');
    e.target.reset();
    document.querySelectorAll('.contact-form input, .contact-form select, .contact-form textarea').forEach(el => el.classList.remove('error'));
}

function showPrivacyPolicy() {
    alert('سياسة الخصوصية\n\nنحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.\n\n1. نجمع فقط البيانات الضرورية لمعالجة طلباتك\n2. لا نشارك بياناتك مع أطراف ثالثة\n3. نستخدم تشفير SSL لحماية بياناتك\n4. يمكنك طلب حذف بياناتك في أي وقت');
}

function showTerms() {
    alert('شروط الاستخدام\n\n1. جميع الأسعار تشمل ضريبة القيمة المضافة 15%\n2. الضمان شامل على جميع المنتجات\n3. يمكن الإرجاع خلال 14 يوماً\n4. التوصيل متاح لجميع مناطق المملكة');
}

async function loadProductsFromSupabase() {
    try {
        var { data, error } = await supabaseClient
            .from('store_products')
            .select('*')
            .eq('is_active', true)
            .order('id');

        if (error) throw error;
        if (data && data.length > 0) {
            window.productsData = data.map(function(p) {
                return {
                    id: p.id,
                    name: p.name,
                    price: Number(p.price),
                    oldPrice: p.old_price ? Number(p.old_price) : null,
                    stock: p.stock || 0,
                    category: p.category,
                    badge: p.badge || '',
                    image: p.image || 'https://via.placeholder.com/50',
                    desc: p.description || '',
                    rating: Number(p.rating) || 0,
                    reviews: []
                };
            });
        }
    } catch(e) {
        console.log('Error loading products:', e);
    }
}

// ============================================================
// 🔄 REALTIME UPDATES - تحديث تلقائي من Supabase
// ============================================================
function initRealtimeUpdates() {

    // قناة المخزون والمنتجات
    supabaseClient
        .channel('store-products-realtime')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'store_products' },
            function(payload) {
                console.log('📦 تحديث منتج:', payload);
                loadProductsFromSupabase().then(function() {
                    window.renderProducts(window.currentFilter);
                    window.updateCategoryCounts();
                });
            }
        )
        .subscribe();

    // قناة site_items (التقييمات والمحتوى)
    supabaseClient
        .channel('site-items-realtime')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'site_items' },
            function(payload) {
                console.log('📝 تحديث محتوى:', payload);
                // إعادة تحميل كل الأقسام
                setTimeout(function() {
                    location.reload();
                }, 500);
            }
        )
        .subscribe();

    // قناة المشاريع
    supabaseClient
        .channel('projects-realtime')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'projects' },
            function() { window.loadSection('projects', 'projectsGridList', window.renderProjects); }
        )
        .subscribe();

    // قناة المقالات
    supabaseClient
        .channel('blog-realtime')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'blog_posts' },
            function() { window.loadSection('blog', 'blogGridList', window.renderBlog); }
        )
        .subscribe();

    // قناة الشهادات
    supabaseClient
        .channel('certifications-realtime')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'certifications' },
            function() { window.loadSection('certifications', 'certificationsGridList', window.renderCertifications); }
        )
        .subscribe();

    // قناة التواصل
    supabaseClient
        .channel('contact-realtime')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'contact_info' },
            function() { window.loadSection('contact', 'contactGridList', window.renderContact); }
        )
        .subscribe();

    // قناة الشركاء
    supabaseClient
        .channel('partners-realtime')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'partners' },
            function() { window.loadPartners(); }
        )
        .subscribe();

    // قناة التقييمات المنفصلة
    supabaseClient
        .channel('reviews-realtime')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'reviews' },
            function(payload) {
                console.log('⭐ تقييم جديد:', payload);
                window.renderReviews();
                window.loadCompanyTestimonials();
                window.showToast('🌟 تم إضافة تقييم جديد!');
            }
        )
        .subscribe();

    // قناة تقييمات الشركات
    supabaseClient
        .channel('testimonials-realtime')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'testimonials' },
            function() { window.loadCompanyTestimonials(); }
        )
        .subscribe();
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
    loadProductsFromSupabase().then(function() {
        // نحافظ على فلتر الصفحة الحالي (صفحات التصنيفات تستدعي window.renderProducts('printers') مثلاً قبل اكتمال التحميل)
        window.renderProducts(window.currentFilter);
        window.updateCategoryCounts();
        // تحديث عدّاد صفحات التصنيفات بعد وصول البيانات الفعلية
        var ccEl = document.getElementById('catCount');
        if (ccEl) {
            var nCards = document.querySelectorAll('#productsGrid .prod-card').length;
            ccEl.textContent = nCards + ' منتج متاح';
        }
    });

    window.updateCartUI();
    window.updateCompareBar();
    window.updateCategoryCounts();
    window.animateCounters();
    window.addGlassHoverEffects();
    window.initSmoothScroll();
    window.initParallax();
    window.initHeaderScroll();
});

// ===== INIT sidebar / realtime =====
document.addEventListener('DOMContentLoaded', function() {
    if (typeof injectSidebar === 'function') injectSidebar();
    window.initWishlistTable();
    window.loadWishlistFromSupabase();
    if (typeof initSidebar === 'function') initSidebar();
    var sidebarCartCount = document.getElementById('sidebarCartCount');
    if (sidebarCartCount) { var count = window.cart.reduce(function(sum, item) { return sum + item.qty; }, 0); sidebarCartCount.textContent = count; sidebarCartCount.style.display = count > 0 ? 'flex' : 'none'; }

    setTimeout(initRealtimeUpdates, 3000);
});
