// ============================================================
// ⭐ DORA LOYALTY PROGRAM — برنامج ولاء العملاء
// ============================================================
(function() {
    'use strict';

    window.doraLoyalty = {
        // مستويات العضوية
        tiers: {
            bronze: { name: 'برونزي', icon: '🥉', minPoints: 0, discount: 0, color: '#CD7F32' },
            silver: { name: 'فضي', icon: '🥈', minPoints: 500, discount: 2, color: '#C0C0C0' },
            gold:   { name: 'ذهبي', icon: '🥇', minPoints: 2000, discount: 5, color: '#FFD700' },
            diamond:{ name: 'ماسي', icon: '💎', minPoints: 5000, discount: 10, color: '#B9F2FF' }
        },

        // حساب النقاط من الطلب
        earnPoints: function(orderTotal) {
            return Math.floor(orderTotal); // 1 ريال = 1 نقطة
        },

        // تحديد المستوى الحالي
        getTier: function(points) {
            if (points >= 5000) return this.tiers.diamond;
            if (points >= 2000) return this.tiers.gold;
            if (points >= 500) return this.tiers.silver;
            return this.tiers.bronze;
        },

        // الحصول على بيانات العميل
        getData: function() {
            var data = JSON.parse(localStorage.getItem('doraLoyalty') || '{"points":0,"totalSpent":0,"orders":0}');
            data.tier = this.getTier(data.points);
            return data;
        },

        // حفظ البيانات
        saveData: function(data) {
            localStorage.setItem('doraLoyalty', JSON.stringify(data));
        },

        // إضافة نقاط بعد طلب
        addPoints: function(orderTotal) {
            var data = this.getData();
            var earned = this.earnPoints(orderTotal);
            data.points += earned;
            data.totalSpent += orderTotal;
            data.orders += 1;
            this.saveData(data);
            return earned;
        },

        // صرف نقاط (خصم)
        redeemPoints: function(points) {
            var data = this.getData();
            if (points > data.points) return 0;
            var discount = Math.floor(points / 100) * 5; // كل 100 نقطة = 5 ريال خصم
            return discount;
        }
    };

    // عرض بطاقة الولاء في حساب العميل
    window.showLoyaltyCard = function() {
        var data = window.doraLoyalty.getData();
        var nextTier = null;
        var tiers = ['bronze', 'silver', 'gold', 'diamond'];

        for (var i = 0; i < tiers.length; i++) {
            if (window.doraLoyalty.tiers[tiers[i]].minPoints > data.points) {
                nextTier = window.doraLoyalty.tiers[tiers[i]];
                break;
            }
        }

        var progress = 100;
        if (nextTier) {
            var currentMin = data.tier.minPoints;
            var nextMin = nextTier.minPoints;
            progress = Math.floor(((data.points - currentMin) / (nextMin - currentMin)) * 100);
        }

        var card = document.getElementById('loyaltyCard');
        if (!card) return;

        card.innerHTML = `
            <div style="background:linear-gradient(135deg, ${data.tier.color}22, ${data.tier.color}44);border:2px solid ${data.tier.color};border-radius:20px;padding:25px;margin:20px 0;color:white;position:relative;overflow:hidden">
                <div style="position:absolute;top:-30px;left:-30px;font-size:120px;opacity:0.1">${data.tier.icon}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                    <div>
                        <h3 style="margin:0;font-size:24px;color:${data.tier.color}">${data.tier.icon} مستوى ${data.tier.name}</h3>
                        <p style="margin:5px 0 0;opacity:0.8;font-size:14px">خصم ${data.tier.discount}% على كل الطلبات</p>
                    </div>
                    <div style="text-align:center">
                        <div style="font-size:36px;font-weight:900;color:${data.tier.color}">${data.points.toLocaleString()}</div>
                        <div style="font-size:12px;opacity:0.7">نقطة</div>
                    </div>
                </div>

                ${nextTier ? `
                <div style="margin:15px 0">
                    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px">
                        <span>${data.tier.icon} ${data.tier.name}</span>
                        <span>${nextTier.icon} ${nextTier.name}</span>
                    </div>
                    <div style="background:rgba(255,255,255,0.1);border-radius:10px;height:10px;overflow:hidden">
                        <div style="background:${data.tier.color};height:100%;width:${progress}%;transition:width 0.5s;border-radius:10px"></div>
                    </div>
                    <p style="text-align:center;font-size:11px;margin-top:5px;opacity:0.7">${(nextTier.minPoints - data.points).toLocaleString()} نقطة متبقية للوصول لـ ${nextTier.name}</p>
                </div>
                ` : '<p style="text-align:center;color:#FFD700;font-weight:700;margin:15px 0">🏆 أنت في أعلى مستوى!</p>'}

                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center;margin-top:15px">
                    <div style="background:rgba(255,255,255,0.05);padding:12px;border-radius:10px">
                        <div style="font-size:20px;font-weight:900">${data.totalSpent.toLocaleString()} ر.س</div>
                        <div style="font-size:11px;opacity:0.7">إجمالي المشتريات</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.05);padding:12px;border-radius:10px">
                        <div style="font-size:20px;font-weight:900">${data.orders}</div>
                        <div style="font-size:11px;opacity:0.7">طلبات</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.05);padding:12px;border-radius:10px">
                        <div style="font-size:20px;font-weight:900;color:#10B981">${data.tier.discount}%</div>
                        <div style="font-size:11px;opacity:0.7">خصم</div>
                    </div>
                </div>

                ${data.points >= 100 ? `
                <button data-dora-action="redeemLoyaltyPoints" style="width:100%;margin-top:15px;padding:12px;background:linear-gradient(135deg,#F59E0B,#D97706);color:white;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:14px">
                    🎁 استبدل نقاطك (${data.points} نقطة = خصم ${window.doraLoyalty.redeemPoints(data.points)} ر.س)
                </button>
                ` : ''}
            </div>
        `;
    };

    // صرف النقاط
    window.redeemLoyaltyPoints = function() {
        var data = window.doraLoyalty.getData();
        var discount = window.doraLoyalty.redeemPoints(data.points);
        if (discount <= 0) {
            window.showToast('❌ تحتاج 100 نقطة على الأقل للاستبدال', 'error');
            return;
        }

        var pointsToUse = Math.floor(data.points / 100) * 100;
        if (confirm('هل تريد استبدال ' + pointsToUse + ' نقطة بخصم ' + discount + ' ر.س؟')) {
            data.points -= pointsToUse;
            window.doraLoyalty.saveData(data);
            localStorage.setItem('loyaltyDiscount', discount);
            window.showToast('✅ تم استبدال ' + pointsToUse + ' نقطة! الخصم: ' + discount + ' ر.س');
            window.showLoyaltyCard();
        }
    };

    // تحديث النقاط بعد الطلب
    var originalPlaceOrder = window.placeOrder;
    if (typeof originalPlaceOrder === 'function') {
        window.placeOrder = function() {
            var cart = JSON.parse(localStorage.getItem('doraCart') || '[]');
            var subtotal = cart.reduce(function(s, i) { return s + (i.price * i.qty); }, 0);
            var earned = window.doraLoyalty.addPoints(subtotal);
            localStorage.setItem('lastEarnedPoints', earned);
            originalPlaceOrder();
        };
    }

    // إضافة كارت الولاء لحساب العميل
    document.addEventListener('DOMContentLoaded', function() {
        // بعد تحميل الحساب
        setTimeout(function() {
            var accountApp = document.getElementById('accountApp');
            if (accountApp && !document.getElementById('loyaltyCard')) {
                var container = document.createElement('div');
                container.id = 'loyaltyCard';
                container.style.cssText = 'margin:20px 0';

                // إدراج قبل المحتوى الرئيسي
                var firstChild = accountApp.querySelector('.account-content, .account-dashboard');
                if (firstChild) {
                    firstChild.insertBefore(container, firstChild.firstChild);
                    window.showLoyaltyCard();
                }
            }
        }, 2000);
    });
})();
