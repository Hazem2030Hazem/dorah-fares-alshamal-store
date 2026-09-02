        (function() {
            var params = new URLSearchParams(window.location.search);
            var orderRef = params.get('order') || '';
            var amount = params.get('amount') || '';
            var gateway = params.get('gateway') || 'بوابة دفع';
            // رابط العودة: يُبنى تلقائياً لو غير ممرر
            var returnUrl = params.get('return') || ('payment-return.html?order=' + encodeURIComponent(orderRef));

            document.getElementById('orderRef').textContent = orderRef || '—';
            document.getElementById('gatewayName').textContent = gateway;
            var amountNum = Number(amount);
            document.getElementById('payAmount').textContent = (isNaN(amountNum) ? amount : amountNum.toLocaleString()) + ' ر.س';

            // بناء رابط العودة مع حالة الدفع
            function go(status) {
                try {
                    var sep = returnUrl.indexOf('?') !== -1 ? '&' : '?';
                    window.location.href = returnUrl + sep + 'status=' + status +
                        (orderRef && returnUrl.indexOf('order=') === -1 ? '&order=' + encodeURIComponent(orderRef) : '') +
                        '&gateway=' + encodeURIComponent(gateway) + '&mode=test';
                } catch (e) {
                    // فولباك: تحويل مباشر بأبسط صيغة
                    window.location.href = 'payment-return.html?status=' + status + '&order=' + encodeURIComponent(orderRef);
                }
            }

            document.getElementById('btnSuccess').addEventListener('click', function() { go('success'); });
            document.getElementById('btnFail').addEventListener('click', function() { go('failed'); });
        })();
    </script>
