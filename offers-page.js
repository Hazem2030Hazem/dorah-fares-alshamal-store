/* ===== صفحة العروض - تعرض فقط المنتجات المخفَّضة والمتوفرة ===== */
document.addEventListener('DOMContentLoaded', function() {
  var grid = document.getElementById('productsGrid');
  var c = document.getElementById('catCount');

  function doffersRender() {
    if (!grid) return;
    /* نسخة مستقلة حتى لا نؤثر على productsData الأصلي، ونفرغ الـ badge
       ليظهر شارة نسبة الخصم المحسوبة تلقائياً من renderProducts (-25%) */
    var offers = (productsData || []).filter(function(p) {
      return p.oldPrice && p.oldPrice > p.price && p.stock > 0;
    }).map(function(p) {
      var cp = {};
      for (var k in p) cp[k] = p[k];
      cp.badge = '';
      return cp;
    }).sort(function(a, b) {
      return (1 - b.price / b.oldPrice) - (1 - a.price / a.oldPrice);
    });

    if (!offers.length) {
      grid.innerHTML = '<div class="doffers-empty">🔥 لا توجد عروض حالياً<small>تابعنا قريباً — عروض جديدة في الطريق إليك!</small></div>';
      if (c) c.textContent = '';
      return;
    }
    var backup = productsData;
    productsData = offers;
    renderProducts('all');
    productsData = backup;
    if (c) c.textContent = offers.length + ' عرض متاح الآن';
  }

  /* main.js يحمّل المنتجات تلقائياً عند DOMContentLoaded — ننتظر اكتمال التحميل */
  var tries = 0;
  var timer = setInterval(function() {
    tries++;
    if (productsData && productsData.length) {
      clearInterval(timer);
      doffersRender();
    } else if (tries >= 80) { /* ~8 ثوانٍ: نحمل بأنفسنا كاحتياط */
      clearInterval(timer);
      loadProductsFromSupabase().then(doffersRender);
    }
  }, 100);
});
