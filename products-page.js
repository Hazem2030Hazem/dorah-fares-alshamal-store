(function() {
  var catLabels = {
    all: { title: '🛍️ جميع المنتجات', subtitle: 'تصفح كامل تشكيلتنا من المنتجات التقنية بأفضل الأسعار' },
    printers: { title: '🖨️ الطابعات', subtitle: 'طابعات HP و Canon و Epson و Brother — ليزر وحبر وألوان' },
    computers: { title: '💻 أجهزة الكمبيوتر', subtitle: 'أجهزة مكتبية ومحمولة من Dell و Lenovo و HP' },
    ram: { title: '🧠 الرامات', subtitle: 'رامات DDR3/DDR4/DDR5 بمساحات متنوعة' },
    'hard-drives': { title: '💽 الهاردات والتخزين', subtitle: 'هاردات داخلية وخارجية وSSD بسعات متنوعة' },
    accessories: { title: '🎧 الإكسسوارات', subtitle: 'كيبورد، ماوس، سماعات، وكل ما يكمل جهازك' },
    cables: { title: '🔌 الوصلات والكابلات', subtitle: 'كابلات HDMI و DisplayPort و USB وشواحن' },
    projectors: { title: '📽️ البروجكتورات', subtitle: 'بروجكتورات للمنازل والمكاتب والقاعات' },
    ink: { title: '🖋️ أحبار الطابعات', subtitle: 'أحبار أصلية ومتوافقة لجميع الطابعات' },
    food: { title: '🍯 المنتجات الغذائية', subtitle: 'منتجات غذائية مختارة بجودة عالية' }
  };
  var params = new URLSearchParams(window.location.search);
  var category = params.get('category') || 'all';
  var info = catLabels[category] || catLabels.all;

  document.addEventListener('DOMContentLoaded', function() {
    var titleEl = document.querySelector('.page-title');
    var subEl = document.querySelector('.page-subtitle');
    if (titleEl) titleEl.textContent = info.title;
    if (subEl) subEl.textContent = info.subtitle;

    document.querySelectorAll('.filter-tab').forEach(function(tab) {
      var href = tab.getAttribute('href') || '';
      var isActive = (category === 'all' && href === 'products.html') ||
                     href === 'products.html?category=' + category ||
                     href === 'products-' + category + '.html';
      tab.classList.toggle('active', isActive);
    });

    renderProducts(category === 'all' ? 'all' : category);
    var n = document.querySelectorAll('#productsGrid .prod-card').length;
    var c = document.getElementById('catCount');
    if (c) c.textContent = n + ' منتج متاح';
  });
})();
