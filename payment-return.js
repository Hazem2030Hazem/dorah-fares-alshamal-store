        (function() {
            var params = new URLSearchParams(window.location.search);
            var status = params.get('status'); // success | failed
            var orderId = params.get('order') || '';
            var gateway = params.get('gateway') || '';

            var card = document.getElementById('resultCard');
            var icon = document.getElementById('resultIcon');
            var title = document.getElementById('resultTitle');
            var msg = document.getElementById('resultMsg');
            var orderBox = document.getElementById('orderNumber');
            var note = document.getElementById('statusNote');
            var buttons = document.getElementById('resultButtons');

            if (orderId) {
                orderBox.style.display = 'block';
                orderBox.textContent = 'رقم الطلب: ' + orderId;
            }

            // ✅ حالة النجاح: عرض رسالة التأكيد
            function handleSuccess(verified) {
                card.className = 'result-card success';
                icon.textContent = '🎉';
                title.textContent = verified ? 'تم التحقق من الدفع!' : 'تم استلام عملية الدفع!';
                msg.textContent = 'شكراً لك — ' + (verified
                    ? 'تم التحقق من الدفع' + (gateway ? ' عبر ' + gateway : '') + ' وسيتم تجهيز طلبك فوراً.'
                    : 'تم استلام إثبات الدفع' + (gateway ? ' عبر ' + gateway : '') + '. سيتم التحقق والتأكيد خلال لحظات، وسيتم تجهيز طلبك فوراً بعد ذلك.');
                note.textContent = verified ? '✅ تم تحديث حالة الطلب من الخادم.' : '⏳ جاري التحقق النهائي من البوابة.';

                // 🧹 إفراغ السلة بعد الدفع الناجح (يعتمد على ثقة المستخدم المحلي)
                try { localStorage.removeItem('doraCart'); } catch (e) {}

                buttons.innerHTML =
                    '<a href="track.html" class="btn btn-primary">📦 تتبع الطلب</a>' +
                    '<a href="account.html" class="btn btn-secondary">🧾 طلباتي وفواتيري</a>' +
                    '<br><a href="index.html" class="btn btn-secondary">🏠 العودة للرئيسية</a>';
            }

            // ❌ حالة الفشل: رسالة + إعادة محاولة + واتساب
            function handleFailed() {
                card.className = 'result-card failed';
                icon.textContent = '❌';
                title.textContent = 'فشلت عملية الدفع';
                msg.textContent = 'لم يتم خصم أي مبلغ. يمكنك إعادة المحاولة أو اختيار طريقة دفع أخرى — طلبك محفوظ ولم يُلغَ.';
                if (gateway) note.textContent = 'البوابة: ' + gateway;
                buttons.innerHTML =
                    '<a href="checkout.html" class="btn btn-retry">🔄 إعادة المحاولة</a>' +
                    '<br><a href="index.html" class="btn btn-secondary">🏠 العودة للرئيسية</a>';
            }

            // 🔐 التحقق من حالة الدفع عبر Edge Function (بدون exposing أسرار البوابة)
            async function verifyWithServer() {
                try {
                    var r = await fetch(window.SUPABASE_URL + '/functions/v1/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            order_id: orderId,
                            gateway: gateway,
                            transaction_id: transactionId
                        })
                    });
                    var data = await r.json();
                    if (data.ok && data.verified) {
                        handleSuccess(true);
                    } else {
                        handleSuccess(false);
                    }
                } catch (e) {
                    handleSuccess(false);
                }
            }

            // توجيه حسب الحالة
            if (status === 'success') {
                if (orderId) {
                    title.textContent = 'جاري التحقق من الدفع...';
                    verifyWithServer();
                } else {
                    handleSuccess(false);
                }
            } else {
                handleFailed();
            }
        })();
