// ============================================================
// DORA ACTIONS DISPATCHER — يحول أحداث HTML inline إلى مستمعين خارجيين
// data-dora-action          => click
// data-dora-action-input    => input
// data-dora-action-change   => change
// data-dora-action-submit   => submit
// data-dora-stop-propagation="true" => يوقف انتشار الحدث
// data-dora-prevent-default="true"  => يمنع السلوك الافتراضي
// data-dora-overlay-close="funcName" => يغلق النافذة عند الضغط على الخلفية
// data-dora-error="hide|showCertPlaceholder|fallback" => بديل لـ onerror
// ============================================================
(function() {
    'use strict';

    function parseArgs(actionAttr, el) {
        var parts = actionAttr.split(':');
        var name = parts[0];
        var args = [];
        for (var i = 1; i < parts.length; i++) {
            var a = parts[i];
            if (a === '$element') {
                args.push(el);
            } else if (a === '$value') {
                args.push(el ? el.value : '');
            } else if (a === '$checked') {
                args.push(el ? el.checked : false);
            } else if (!isNaN(a) && a !== '') {
                args.push(Number(a));
            } else {
                args.push(a);
            }
        }
        return { name: name, args: args };
    }

    function runGlobal(name, args) {
        var fn = window[name];
        if (typeof fn !== 'function') {
            console.warn('dora-actions: unknown function', name);
            return undefined;
        }
        return fn.apply(null, args);
    }

    function applyModifiers(el, e, result) {
        if (el.getAttribute('data-dora-stop-propagation') === 'true') {
            e.stopPropagation();
        }
        if (result === false || el.getAttribute('data-dora-prevent-default') === 'true') {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
        }
    }

    function handleAction(el, e, attrName) {
        var action = el.getAttribute(attrName);
        if (!action) return;

        // معالجات خاصة مسبقة
        if (attrName === 'data-dora-action') {
            if (action.indexOf('navigate:') === 0) {
                var url = action.substring('navigate:'.length);
                if (url) window.location.href = url;
                applyModifiers(el, e, undefined);
                return;
            }
            // استبدال onclick="event.stopPropagation()" بدون تحذير
            if (action === 'stopPropagation') {
                applyModifiers(el, e, undefined);
                return;
            }
        }

        var parsed = parseArgs(action, el);
        // تمرير الحدث كآخر معامل لأي دالة تحتاجه (e.g. setVolumeFromClick)
        parsed.args.push(e);
        var result = runGlobal(parsed.name, parsed.args);
        applyModifiers(el, e, result);
    }

    document.addEventListener('click', function(e) {
        var el = e.target.closest('[data-dora-action]');
        if (!el) return;
        handleAction(el, e, 'data-dora-action');
    });

    document.addEventListener('input', function(e) {
        var el = e.target.closest('[data-dora-action-input]');
        if (!el) return;
        var action = el.getAttribute('data-dora-action-input');
        if (!action) return;
        var parsed = parseArgs(action, el);
        var result = runGlobal(parsed.name, parsed.args);
        applyModifiers(el, e, result);
    });

    document.addEventListener('change', function(e) {
        var el = e.target.closest('[data-dora-action-change]');
        if (!el) return;
        var action = el.getAttribute('data-dora-action-change');
        if (!action) return;

        // معالجة خاصة: تحديث عداد الصور
        if (action.indexOf('doraUpdateImageCount:') === 0) {
            var parsed = parseArgs(action, el);
            var countId = parsed.args[0];
            var suffix = parsed.args[1] || 'صور مختارة';
            var countEl = document.getElementById(countId);
            if (countEl && el.files) countEl.textContent = el.files.length + ' ' + suffix;
            return;
        }

        handleAction(el, e, 'data-dora-action-change');
    });

    document.addEventListener('submit', function(e) {
        var el = e.target.closest('[data-dora-action-submit]');
        if (!el) return;
        e.preventDefault();
        handleAction(el, e, 'data-dora-action-submit');
    });

    // ===== إغلاق النافذة عند الضغط على الخلفية =====
    document.addEventListener('click', function(e) {
        var el = e.target.closest('[data-dora-overlay-close]');
        if (!el) return;
        if (e.target !== el) return;
        var fnName = el.getAttribute('data-dora-overlay-close');
        if (fnName && typeof window[fnName] === 'function') {
            window[fnName](e);
        }
    });

    // ===== معالج onerror للصور =====
    document.addEventListener('error', function(e) {
        var el = e.target;
        if (!el || el.tagName !== 'IMG') return;
        var mode = el.getAttribute('data-dora-error');
        if (mode === 'hide') {
            el.style.display = 'none';
        } else if (mode === 'showCertPlaceholder') {
            el.style.display = 'none';
            var ph = document.getElementById('cert-placeholder');
            if (ph) ph.style.display = 'flex';
        } else if (mode === 'fallback') {
            if (el.src && el.src.indexOf('default-product.png') === -1) {
                el.src = 'default-product.png';
            }
        }
    }, true);

    // ===== تفويض أحداث المنتجات (Product actions delegation) =====
    document.addEventListener('click', function(e) {
        var el = e.target.closest('[data-action]');
        if (!el) return;
        var action = el.getAttribute('data-action');
        var productId = parseInt(el.getAttribute('data-product-id'), 10);
        var closeModal = el.getAttribute('data-close-modal');
        var productName = el.getAttribute('data-product-name');

        if (action === 'open-modal' && productId && typeof window.openProductModal === 'function') {
            window.openProductModal(productId);
        } else if (action === 'quick-view' && productId && typeof window.openQuickView === 'function') {
            window.openQuickView(productId);
        } else if (action === 'add-to-cart' && productId && typeof window.addToCart === 'function') {
            window.addToCart(productId);
        } else if (action === 'wishlist' && productId && typeof window.toggleWishlist === 'function') {
            window.toggleWishlist(productId, e);
            if (el.getAttribute('data-re-render') === 'wishlist' && typeof window.renderWishlistPage === 'function') {
                window.renderWishlistPage();
            }
        } else if (action === 'compare' && productId && typeof window.toggleCompare === 'function') {
            window.toggleCompare(productId, e);
        } else if (action === 'quote' && productId && typeof window.requestQuote === 'function') {
            window.requestQuote(productId, e);
        } else if (action === 'rate' && productId && typeof window.openProductRatingModal === 'function') {
            window.openProductRatingModal(productId, productName || '');
        } else if (action === 'load-more' && typeof window.loadMoreProducts === 'function') {
            window.loadMoreProducts();
        } else if (action === 'clear-recently-viewed') {
            localStorage.removeItem('doraRecentlyViewed');
            if (typeof window.renderRecentlyViewed === 'function') window.renderRecentlyViewed();
        }

        if (closeModal === 'productModal' && typeof window.closeProductModal === 'function') window.closeProductModal();
        if (closeModal === 'quickView' && typeof window.closeQuickView === 'function') window.closeQuickView();
        if (closeModal === 'compareModal' && typeof window.closeCompareModal === 'function') window.closeCompareModal();

        if (el.getAttribute('data-dismiss-search') === 'true') {
            var sr = document.getElementById('searchResults');
            if (sr) sr.classList.remove('active');
            var si = document.getElementById('searchInput');
            if (si) si.value = '';
        }
    });

    // ===== دوال مساعدة عامة =====
    window.doraNavigate = function(url) {
        if (url) window.location.href = url;
    };

    window.doraPrint = function() {
        window.print();
    };

    window.doraWindowClose = function() {
        window.close();
    };

    window.doraPosReprint = function() {
        if (window._posReprint && typeof window._posReprint === 'function') {
            window._posReprint();
        }
    };

    window.doraHideElement = function(selector) {
        var el = document.querySelector(selector);
        if (el) el.style.display = 'none';
    };

    window.doraHideCountdownBar = function() {
        var el = document.getElementById('countdownBar');
        if (el) el.style.display = 'none';
    };

    window.doraCopyCoupon = function(code) {
        if (code && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).catch(function() {});
        }
        if (window.closeWelcomePopup && typeof window.closeWelcomePopup === 'function') {
            window.closeWelcomePopup();
        }
    };

    // ===== معالج عام لبقية الأحداث من ملفات JS =====
    function handleDoraCall(el, e, attrName) {
        var action = el.getAttribute(attrName);
        if (!action) return;
        var parts = action.split(':');
        var name = parts[0];
        var args = [];
        for (var i = 1; i < parts.length; i++) {
            var a = parts[i];
            if (a === 'true') args.push(true);
            else if (a === 'false') args.push(false);
            else if (!isNaN(a) && a !== '') args.push(Number(a));
            else args.push(a);
        }
        if (el.getAttribute('data-dora-use-value') === 'true') args.push(el ? el.value : '');
        else if (el.getAttribute('data-dora-use-element') === 'true') args.push(el);
        if (e) args.push(e);
        if (typeof window[name] === 'function') {
            window[name].apply(null, args);
        } else {
            console.warn('dora-actions: unknown call', name);
        }
    }

    document.addEventListener('click', function(e) {
        var el = e.target.closest('[data-dora-call]');
        if (!el) return;
        handleDoraCall(el, e, 'data-dora-call');
    });

    document.addEventListener('input', function(e) {
        var el = e.target.closest('[data-dora-call-input]');
        if (!el) return;
        handleDoraCall(el, e, 'data-dora-call-input');
    });

    document.addEventListener('change', function(e) {
        var el = e.target.closest('[data-dora-call-change]');
        if (!el) return;
        handleDoraCall(el, e, 'data-dora-call-change');
    });

    document.addEventListener('submit', function(e) {
        var el = e.target.closest('[data-dora-call-submit]');
        if (!el) return;
        e.preventDefault();
        handleDoraCall(el, e, 'data-dora-call-submit');
    });

    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        var el = e.target.closest('[data-dora-keydown-enter]');
        if (!el) return;
        var fnName = el.getAttribute('data-dora-keydown-enter');
        if (fnName && typeof window[fnName] === 'function') {
            window[fnName]();
        }
    });

    document.addEventListener('click', function(e) {
        var el = e.target.closest('[data-dora-hide-banner]');
        if (!el) return;
        var parts = el.getAttribute('data-dora-hide-banner').split(':');
        var bannerId = parts[0];
        var lsKey = parts[1];
        var lsValue = parts[2];
        var banner = document.getElementById(bannerId);
        if (banner) banner.classList.add('hidden');
        if (lsKey) localStorage.setItem(lsKey, lsValue);
    });

    // ===== دوال مساعدة إضافية =====
    window.doraRemoveParent = function(el) {
        if (el && el.parentElement) el.parentElement.remove();
    };

    window.doraRemoveOverlay = function(el) {
        if (!el) return;
        var overlay = el.closest('[style*="fixed"], [style*=fixed]');
        if (overlay) overlay.remove();
    };

    window.doraRemoveParentAndCall = function(fnName, el) {
        if (el && el.parentElement) el.parentElement.remove();
        if (fnName && typeof window[fnName] === 'function') window[fnName]();
    };

    window.doraPrint = function() {
        window.print();
    };

    window.doraOpenWindow = function(urlOrEl) {
        var url = urlOrEl;
        if (urlOrEl && urlOrEl.getAttribute) {
            url = urlOrEl.getAttribute('data-href') || '';
        }
        if (url) window.open(url, '_blank');
    };

    window.doraStopPropagationAction = function(e) {
        if (e) e.stopPropagation();
    };

    window.doraCopyIban = function(el) {
        if (!el) return;
        var copy = el.getAttribute('data-copy');
        if (copy && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(copy).catch(function() {});
        }
        el.textContent = '✅ تم النسخ';
    };

    window.doraHideBanner = function(bannerId, lsKey, lsValue) {
        var banner = document.getElementById(bannerId);
        if (banner) banner.classList.add('hidden');
        if (lsKey) localStorage.setItem(lsKey, lsValue);
    };

    // ===== معالج onerror الموسع =====
    document.addEventListener('error', function(e) {
        var el = e.target;
        if (!el || el.tagName !== 'IMG') return;
        var mode = el.getAttribute('data-dora-error');
        if (mode === 'cart-fallback') {
            el.style.display = 'none';
            if (el.parentElement) el.parentElement.textContent = '📦';
        } else if (mode === 'chatbot-fallback') {
            el.style.display = 'none';
            if (el.parentElement) el.parentElement.innerHTML = '<span style="font-size:32px">🤖</span>';
        } else if (mode === 'admin-fallback') {
            el.style.display = 'none';
            if (el.nextElementSibling) el.nextElementSibling.style.display = 'block';
        }
    }, true);
})();
