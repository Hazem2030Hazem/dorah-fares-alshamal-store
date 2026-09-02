// ============================================================
// REVIEWS — تقييمات الموقع والمنتجات وعرضها
// ============================================================
(function() {
    'use strict';

    let currentRating = 5;
    let currentProductRating = 5;
    let currentProductIdForRating = null;

    window.scrollToSection = function(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) { section.scrollIntoView({ behavior: 'smooth' }); }
    };

    window.openSiteRatingModal = async function() {
        var isLoggedIn = await window.checkAuth();
        if (!isLoggedIn) {
            window.requireAuth('تضيف تقييم');
            return;
        }
        document.getElementById('siteRatingModal').classList.add('show');
        document.body.style.overflow = 'hidden';
        setRating(5);
    };

    window.closeSiteRatingModal = function(e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('siteRatingModal').classList.remove('show');
        document.body.style.overflow = '';
    };

    window.openProductRatingModal = function(productId, productName) {
        currentProductIdForRating = productId;
        document.getElementById('productRatingTitle').textContent = 'قيّم: ' + productName;
        document.getElementById('productRatingId').value = productId;
        document.getElementById('productRatingModal').classList.add('show');
        document.body.style.overflow = 'hidden';
        setProductRating(5);
    };

    window.closeProductRatingModal = function(e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('productRatingModal').classList.remove('show');
        document.body.style.overflow = '';
        currentProductIdForRating = null;
    };

    window.setRating = function(value) {
        currentRating = value;
        document.getElementById('siteRatingValue').value = value;
        const stars = document.querySelectorAll('#siteRatingStars .star');
        stars.forEach((star, index) => {
            if (index < value) {
                star.classList.add('active');
                star.style.color = '#FFD700';
            } else {
                star.classList.remove('active');
                star.style.color = 'rgba(255,255,255,0.3)';
            }
        });
    };

    window.setProductRating = function(value) {
        currentProductRating = value;
        document.getElementById('productRatingValue').value = value;
        const stars = document.querySelectorAll('#productRatingStars .star');
        stars.forEach((star, index) => {
            if (index < value) {
                star.classList.add('active');
                star.style.color = '#FFD700';
            } else {
                star.classList.remove('active');
                star.style.color = 'rgba(255,255,255,0.3)';
            }
        });
    };

    window.submitSiteRating = async function(event) {
        event.preventDefault();
        const name = document.getElementById('siteRaterName').value.trim();
        const product = document.getElementById('siteRaterProduct').value.trim();
        const comment = document.getElementById('siteRaterComment').value.trim();
        const rating = parseInt(document.getElementById('siteRatingValue').value);

        if (!name || !comment) { window.showToast('❌ الرجاء ملء جميع الحقول المطلوبة', 'error'); return; }

        const form = document.getElementById('siteRatingForm');
        const submitBtn = form.querySelector('.rating-submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '⏳ جاري الإرسال...';
        submitBtn.disabled = true;

        try {
            const review = { name: name, product: product || 'الموقع عامةً', text: comment, rating: rating };
            const { data, error } = await window.supabaseClient.from('site_items').insert([{section_key: 'testimonials', title_ar: name, description_ar: comment, metadata: {rating: rating, company_name: product}, sort_order: 1, is_active: true}]);
            if (error) { throw error; }
            window.closeSiteRatingModal();
            document.getElementById('siteRaterName').value = '';
            document.getElementById('siteRaterProduct').value = '';
            document.getElementById('siteRaterComment').value = '';
            window.setRating(5);
            window.showToast('✅ شكراً لتقييمك! تم حفظ التقييم بنجاح');
            await window.renderReviews();
        } catch (error) {
            window.showToast('❌ حدث خطأ! ' + (error.message || 'حاول مرة أخرى'), 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    };

    window.submitProductRating = async function() {
        const name = document.getElementById('productRaterName').value.trim();
        const comment = document.getElementById('productRaterComment').value.trim();
        const rating = parseInt(document.getElementById('productRatingValue').value);
        const productId = parseInt(document.getElementById('productRatingId').value);

        if (!name || !comment) { window.showToast('❌ الرجاء ملء جميع الحقول المطلوبة', 'error'); return; }

        const product = window.productsData.find(p => p.id === productId);
        const productName = product ? product.name : 'منتج';

        const form = document.getElementById('productRatingForm');
        const submitBtn = form.querySelector('.rating-submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '⏳ جاري الإرسال...';
        submitBtn.disabled = true;

        try {
            const review = { name: name, product: productName, productId: productId, comment: comment, rating: rating, type: 'product', timestamp: new Date().toISOString() };
            await window.supabaseClient.from('reviews').insert([{name: review.name, product: review.product, text: review.comment, rating: review.rating, date: new Date().toLocaleDateString('ar-SA'), status: 'new'}]);

            if (product) {
                if (!product.reviews) product.reviews = [];
                product.reviews.push({ author: name, date: new Date().toISOString().split('T')[0], stars: rating, text: comment });
                const totalStars = product.reviews.reduce((sum, r) => sum + r.stars, 0);
                product.rating = Math.round((totalStars / product.reviews.length) * 10) / 10;
                localStorage.setItem('doraProducts', JSON.stringify(window.productsData));
            }
            window.closeProductRatingModal();
            document.getElementById('productRaterName').value = '';
            document.getElementById('productRaterComment').value = '';
            window.setProductRating(5);
            window.showToast('✅ شكراً لتقييم المنتج! تم حفظ التقييم بنجاح');
            await window.renderReviews();
            window.renderProducts(window.currentFilter);
        } catch (error) {
            window.showToast('❌ حدث خطأ! حاول مرة أخرى', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    };

    window.renderReviews = async function() {
        var container = document.getElementById('reviewsGrid');
        if (!container) return;

        try {
            var { data } = await window.supabaseClient
                .from('site_items')
                .select('*')
                .eq('section_key', 'testimonials')
                .eq('is_active', true)
                .order('sort_order');

            if (!data || !data.length) return;

            var companyKeywords = ['شركة', 'مؤسسة', 'مستشفى', 'وزارة', 'هيئة', 'بنك', 'فندق', 'مطاعم', 'مصنع', 'متجر', 'وكالة', 'جامعة', 'مدرسة', 'مجموعة', 'مركز', 'معرض', 'صيدلية', 'مكتب'];

            var personalReviews = data.filter(function(r) {
                var name = (r.title_ar || '').trim();
                for (var i = 0; i < companyKeywords.length; i++) {
                    if (name.includes(companyKeywords[i])) return false;
                }
                return true;
            });

            if (!personalReviews.length) return;

            container.innerHTML = personalReviews.map(function(r) {
                var meta = r.metadata || {};
                var stars = '★'.repeat(meta.rating || 5) + '☆'.repeat(5 - (meta.rating || 5));
                return '<div class="review-card">' +
                    '<div class="review-card-header"><span class="review-card-author">' + window.esc(r.title_ar || 'عميل') + '</span></div>' +
                    '<div class="review-card-stars">' + stars + '</div>' +
                    '<p class="review-card-text">' + window.esc(r.description_ar || '') + '</p>' +
                    '<div class="review-card-product">📦 ' + window.esc(meta.company_name || meta.product_name || 'الموقع عامةً') + '</div>' +
                    '</div>';
            }).join('');

        } catch(e) {
            console.log('Render reviews error:', e);
        }
    };

    window.loadCompanyTestimonials = async function() {
        var grid = document.getElementById('companyTestimonialsGrid');
        if (!grid) return;

        try {
            var result = await window.supabaseClient
                .from('site_items')
                .select('*')
                .eq('section_key', 'testimonials')
                .eq('is_active', true)
                .order('sort_order');

            if (result.error || !result.data || result.data.length === 0) return;

            var companyKeywords = ['شركة', 'مؤسسة', 'مستشفى', 'وزارة', 'هيئة', 'بنك', 'فندق', 'مطاعم', 'مصنع', 'متجر', 'وكالة', 'جامعة', 'مدرسة', 'مجموعة', 'مركز', 'معرض', 'صيدلية', 'مكتب'];

            var companyReviews = result.data.filter(function(r) {
                var name = (r.title_ar || '').trim();
                for (var i = 0; i < companyKeywords.length; i++) {
                    if (name.includes(companyKeywords[i])) return true;
                }
                return false;
            });

            if (companyReviews.length === 0) return;

            grid.innerHTML = companyReviews.map(function(r) {
                var meta = r.metadata || {};
                var stars = '<svg style="width:18px;height:18px;vertical-align:middle;margin:0 2px" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'.repeat(meta.rating || 5);
                return '<div class="why-card">' +
                    '<div class="why-icon" style="font-size:24px">💬</div>' +
                    '<div style="color:#F59E0B;margin-bottom:8px">' + stars + '</div>' +
                    '<h4>' + window.esc(r.title_ar || 'عميل') + '</h4>' +
                    '<p>"' + window.esc(r.description_ar || '').replace(/"/g, '&quot;') + '"</p>' +
                    '<div style="margin-top:8px;font-size:12px;color:rgba(255,255,255,0.4)">📦 ' + window.esc(meta.company_name || 'جهة معتمدة') + '</div>' +
                    '</div>';
            }).join('');

        } catch (e) {
            console.log('Company testimonials:', e);
        }
    };

    document.addEventListener('DOMContentLoaded', function() {
        window.renderReviews();
        setTimeout(window.loadCompanyTestimonials, 1000);
    });
})();
