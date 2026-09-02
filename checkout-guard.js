// ===== حارس حالة المتجر: إيقاف البيع = منع الوصول لصفحة الدفع =====
// يستخدم Edge Function get-site-settings بدلاً من REST API المباشر لعدم exposing الـ anon key.
(async function() {
    try {
        var r = await fetch(window.SUPABASE_URL + '/functions/v1/get-site-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        var data = await r.json();
        if (data.ok && data.settings && data.settings.storeStatus === 'open') return; // البيع مفعّل — أكمل عادي
    } catch(_) { /* عند الشك: امنع */ }
    document.body.innerHTML = '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;font-family:inherit">'
        + '<div style="font-size:64px;margin-bottom:16px">🔒</div>'
        + '<h1 style="font-size:26px;margin-bottom:12px">المتجر تحت التجهيز حالياً</h1>'
        + '<p style="color:#AAB4CC;line-height:2;max-width:420px">نعمل على تجهيز المنتجات وتجربة شراء مثالية — البيع يبدأ قريباً بإذن الله.<br>يمكنك تصفح المنتجات في أي وقت.</p>'
        + '<a href="index.html" style="display:inline-block;margin-top:24px;background:rgba(255,255,255,.1);border:1px solid rgba(220,232,255,.25);color:#EDF3FF;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:800;box-shadow:0 0 18px rgba(168,197,255,.12)">🏠 العودة للرئيسية</a>'
        + '</div>';
    throw new Error('store-closed');
})();
