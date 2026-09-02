// إظهار البانر التسويقي بعد تحميل الحساب
var accountObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (document.getElementById('accountApp') && 
            !document.getElementById('accountApp').querySelector('.account-loading')) {
            
            var banner = document.getElementById('accountMarketingBanner');
            if (banner && banner.style.display === 'none') {
                banner.style.display = 'block';
                
                // إدراج البانر قبل محتوى الحساب
                var accountApp = document.getElementById('accountApp');
                var firstChild = accountApp.firstChild;
                if (firstChild && !firstChild.id) {
                    accountApp.insertBefore(banner, firstChild);
                }
                
                // تحميل سجل الكوبونات
                loadCouponHistory();
                accountObserver.disconnect();
            }
        }
    });
});

accountObserver.observe(document.getElementById('accountApp'), {
    childList: true,
    subtree: true
});

// تحميل سجل الكوبونات
function loadCouponHistory() {
    var couponUsage = JSON.parse(localStorage.getItem('doraCouponUsage') || '{}');
    var list = document.getElementById('couponHistoryList');
    
    var used = [];
    for (var code in couponUsage) {
        if (couponUsage[code] > 0) {
            used.push({ code: code, count: couponUsage[code] });
        }
    }
    
    if (used.length === 0) {
        list.innerHTML = '<p style="color:rgba(255,255,255,0.4);font-size:13px">لم تستخدم أي كوبونات بعد</p>';
        return;
    }
    
    list.innerHTML = used.map(function(c) {
        var label = c.code === 'WELCOME' ? 'خصم ترحيبي 15%' : 
                    c.code === 'DORA10' ? 'خصم 10%' : 
                    c.code === 'DORA20' ? 'خصم 20%' : c.code;
        return '<div class="coupon-used-item"><span>🎟️ <strong>' + c.code + '</strong> - ' + label + '</span><span style="color:#10B981">استخدم ' + c.count + ' مرات</span></div>';
    }).join('');
}

// نسخ للنص
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {});
}
