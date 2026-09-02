// ============================================================
// PRODUCT MODAL PLUS v2 — معلومات إضافية داخل مودال المنتج
// ============================================================
(function(){
    'use strict';

    function injectCard(){
        var info = document.querySelector('#productModal .modal-info');
        if (!info || info.querySelector('.mdf-card')) return;
        var m = info.innerHTML.match(/addToCart\((\d+)\)/);
        if (!m) return;
        var id = parseInt(m[1]);
        var p = (typeof window.productsData !== 'undefined' && window.productsData && window.productsData.find) ? window.productsData.find(function(x){ return x.id == id; }) : null;
        if (!p) return;
        var catName = (typeof window.catLabels !== 'undefined' && window.catLabels[p.category]) ? window.catLabels[p.category] : p.category;
        var stockTxt = (typeof p.stock === 'number') ? (p.stock > 0 ? 'متوفر (' + p.stock + ')' : 'غير متوفر') : (p.stock || 'متوفر');
        var revCount = (p.reviews && p.reviews.length) ? p.reviews.length : 0;
        var quoteUrl = window.doraWhatsAppLink('مرحباً، أرغب في طلب عرض سعر لمنتج: ' + p.name, (window.getDoraSiteSettings().companyPhone1 || '').trim() || undefined);
        var card = document.createElement('div');
        card.className = 'mdf-card';
        card.innerHTML = '<div class="mdf-specs">' +
            '<div><span>التصنيف</span><b>' + catName + '</b></div>' +
            '<div><span>التقييم</span><b>' + (p.rating || 0) + ' ★</b></div>' +
            '<div><span>المراجعات</span><b>' + revCount + '</b></div>' +
            '<div><span>المخزون</span><b>' + stockTxt + '</b></div>' +
            '</div>' +
            '<div class="mdf-btns">' +
            '<a class="mdf-btn" href="' + quoteUrl + '" target="_blank" rel="noopener">📋 اطلب عرض سعر للمنتج ده</a>' +
            '</div>';
        var actions = info.querySelector('.modal-actions');
        if (actions && actions.nextSibling) info.insertBefore(card, actions.nextSibling);
        else info.appendChild(card);
    }

    function arm(){
        var target = document.getElementById('productModalContent');
        if (!target) return false;
        new MutationObserver(injectCard).observe(target, {childList: true, subtree: true});
        return true;
    }

    if (!arm()) document.addEventListener('DOMContentLoaded', arm);
})();
