// ============================================================
// CORE UTILITIES — دوال مساعدة مشتركة (لا تعتمد على متغيرات main.js)
// ============================================================
(function() {
    'use strict';

    window.sanitizeInput = function(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    };

    window.formatPrice = function(price) {
        return Number(price || 0).toLocaleString('ar-SA') + ' ر.س';
    };

    window.calculateTax = function(amount, taxRate) {
        return Math.round(amount * (taxRate || 0.15));
    };

    window.calculateDiscount = function(amount, discountPercent) {
        return Math.round(amount * (1 - discountPercent));
    };

    window.getStockClass = function(stock) {
        if (stock <= 0) return 'stock-out';
        if (stock <= 5) return 'stock-low';
        if (stock <= 15) return 'stock-medium';
        return 'stock-high';
    };

    window.getStockLabel = function(stock) {
        if (stock <= 0) return 'نفذت الكمية';
        if (stock <= 5) return 'الكمية محدودة (' + stock + ' متبقي)';
        if (stock <= 15) return 'متوفر (' + stock + ' قطعة)';
        return 'متوفر بكثرة (' + stock + ' قطعة)';
    };

    window.getStockPercent = function(stock) {
        return Math.min((stock / 50) * 100, 100);
    };
})();
