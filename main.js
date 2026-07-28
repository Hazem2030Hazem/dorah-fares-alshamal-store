// توجيه لينكات المنتجات للصفحات الجديدة المستقلة
// ============================================================
// 📊 Google Analytics 4 - مع دعم Cookiebot
// ============================================================
(function() {
    var gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-5J1QD56BN0';
    gaScript.setAttribute('data-cookieconsent', 'statistics');
    document.head.appendChild(gaScript);
    
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    
    gtag('consent', 'default', {
        'analytics_storage': 'denied',
        'ad_storage': 'denied',
        'wait_for_update': 500
    });
    
    gtag('config', 'G-5J1QD56BN0');
    
    window.addEventListener('CookiebotOnAccept', function() {
        gtag('consent', 'update', {
            'analytics_storage': 'granted',
            'ad_storage': 'granted'
        });
    });
    
    window.addEventListener('CookiebotOnDecline', function() {
        gtag('consent', 'update', {
            'analytics_storage': 'denied',
            'ad_storage': 'denied'
        });
    });
})();

// توجيه لينكات المنتجات للصفحات الجديدة المستقلة
document.addEventListener('DOMContentLoaded', function(){
  var map = {'printers':'products-printers.html','computers':'products-computers.html','ram':'products-ram.html','hard-drives':'products-hard-drives.html','accessories':'products-accessories.html'};
  document.querySelectorAll('a[href*="products.html"]').forEach(function(a){
    var m = (a.getAttribute('href')||'').match(/category=([a-z-]+)/);
    a.setAttribute('href', (m && map[m[1]]) ? map[m[1]] : 'products.html');
  });
});
// ============================================================
// LIVING BANNER — لوجوهات الشركة بتطفو وتتحرك جوه البانر
// ============================================================
(function(){
  function spawnFloatingLogos(hero){
    if (!hero || hero.querySelector('.floating-logos')) return;
    var layer = document.createElement('div');
    layer.className = 'floating-logos';
    var count = window.innerWidth < 768 ? 8 : 14;
    for (var i = 0; i < count; i++){
      var img = document.createElement('img');
      img.src = 'logo-icon.png';
      img.alt = '';
      img.className = 'float-logo fl' + (1 + (i % 4));
      var size = 50 + Math.random() * 120;
      img.style.width = size.toFixed(0) + 'px';
      var lx = Math.random() * 92, ty = Math.random() * 82;
      img.style.left = lx.toFixed(1) + '%';
      img.style.top = ty.toFixed(1) + '%';
      var inCenter = (lx > 28 && lx < 62 && ty > 25 && ty < 72);
      img.style.opacity = inCenter ? (0.12 + Math.random() * 0.13).toFixed(2)
                                   : (0.38 + Math.random() * 0.4).toFixed(2);
      img.style.animationDuration = (3.5 + Math.random() * 5.5).toFixed(1) + 's';
      img.style.animationDelay = (-Math.random() * 8).toFixed(1) + 's';
      var f=''; if (Math.random()<0.3) f+='blur('+(1+Math.random()*1.6).toFixed(1)+'px) ';
      f+='drop-shadow(0 0 16px rgba(90,145,255,.6))'; img.style.filter=f;
      layer.appendChild(img);
    }
    hero.insertBefore(layer, hero.firstChild);
  }
  function initFloating(){
    document.querySelectorAll('.hero, .page-hero, .service-hero, .services-hero').forEach(spawnFloatingLogos);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initFloating);
  else initFloating();
})();
// لينك "الرئيسية": لو في صفحة داخلية يرجع لـ index.html بدل #home الفاضي
document.addEventListener('click', function(e){
  var a = e.target.closest('a[href="#home"]');
  if (!a) return;
  var path = window.location.pathname;
  var isHome = path === '/' || path === '' || /index\.html?$/.test(path);
  if (!isHome) {
    e.preventDefault();
    window.location.href = 'index.html';
  }
});
// إزالة وسم <base target="_blank"> عشان كل اللينكات تفتح في نفس التاب
(function(){
  function killBase(){ var b = document.querySelector('base[target]'); if (b) b.remove(); }
  killBase();
  document.addEventListener('DOMContentLoaded', killBase);
})();
// Supabase Configuration
const SUPABASE_URL = 'https://kcbmvxuzjlaooknwhqqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjYm12eHV6amxhb29rbndocXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NzkyMjAsImV4cCI6MjA5OTU1NTIyMH0.ayDpkfCKL90GcUKjbHQs7OvS5sxF1VSraWg58NHJ7ek';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASSWORD_HASH = 'fa0364302fd4179ccdc61954ae5547bddaeddb70a7fa410c0b19ba74da23d533';
const TAX_RATE = 0.15;
const COUPONS = {
 'DORA10': { discount: 0.10, label: 'خصم 10%' },
 'DORA20': { discount: 0.20, label: 'خصم 20%' },
 'WELCOME': { discount: 0.15, label: 'خصم ترحيبي 15%' }
};

let productsData = [];

let cart = JSON.parse(localStorage.getItem('doraCart')) || [];
let wishlist = JSON.parse(localStorage.getItem('doraWishlist')) || [];
let compareList = JSON.parse(localStorage.getItem('doraCompare')) || [];
let currentFilter = 'all';
let currentSort = 'default';
let viewMode = 'grid';
let adminUnlocked = false;
let activeCoupon = null;
let currentProductId = null;

const catLabels = {
 printers: 'طابعات', computers: 'كمبيوتر', ram: 'رامات',
 storage: 'هاردات', cables: 'وصلات', projectors: 'بروجكتور', accessories: 'إكسسوارات',
 ink: 'أحبار الطابعات', food: 'المواد الغذائية'
};

function sanitizeInput(input) {
 const div = document.createElement('div');
 div.textContent = input;
 return div.innerHTML;
}

function formatPrice(price) {
 return price.toLocaleString('ar-SA') + ' ر.س';
}

function calculateTax(amount) {
 return Math.round(amount * TAX_RATE);
}

function calculateDiscount(amount, discountPercent) {
 return Math.round(amount * (1 - discountPercent));
}

document.addEventListener('keydown', function(e) {
 if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'h') {
  e.preventDefault();
  window.open('admin.html?secret=dora2024', '_blank');
  showToast('🔓 جاري فتح لوحة الإدارة...');
 }
 if (e.key === 'Escape') {
  closeProductModal();
  closeCompareModal();
  if (document.getElementById('cartSidebar').classList.contains('open')) toggleCart();
 }
});

function handleSearch(query) {
 const resultsDiv = document.getElementById('searchResults');
 if (!query.trim()) {
  resultsDiv.classList.remove('active');
  return;
 }
 const filtered = productsData.filter(p => 
  p.name.toLowerCase().includes(query.toLowerCase()) ||
  p.desc.toLowerCase().includes(query.toLowerCase()) ||
  catLabels[p.category].includes(query)
 );

 if (filtered.length === 0) {
  resultsDiv.innerHTML = '<div class="search-no-results">لا توجد نتائج مطابقة</div>';
 } else {
  resultsDiv.innerHTML = filtered.slice(0, 6).map(p => `
   <div class="search-result-item" onclick="openProductModal(${p.id}); document.getElementById('searchResults').classList.remove('active'); document.getElementById('searchInput').value='';">
    <img class="search-result-img" src="${p.image}" alt="" loading="lazy">
    <div class="search-result-info">
     <div class="search-result-name">${sanitizeInput(p.name)}</div>
     <div class="search-result-price">${formatPrice(p.price)}</div>
    </div>
   </div>
  `).join('');
 }
 resultsDiv.classList.add('active');
}

document.addEventListener('click', function(e) {
 if (!e.target.closest('.search-bar')) {
  document.getElementById('searchResults').classList.remove('active');
 }
});

function getStockClass(stock) {
 if (stock <= 0) return 'stock-out';
 if (stock <= 5) return 'stock-low';
 if (stock <= 15) return 'stock-medium';
 return 'stock-high';
}

function getStockLabel(stock) {
 if (stock <= 0) return 'نفذت الكمية';
 if (stock <= 5) return 'الكمية محدودة (' + stock + ' متبقي)';
 if (stock <= 15) return 'متوفر (' + stock + ' قطعة)';
 return 'متوفر بكثرة (' + stock + ' قطعة)';
}

function getStockPercent(stock) {
 return Math.min((stock / 50) * 100, 100);
}

function getSortedProducts(filter) {
 let filtered = filter === 'all' ? [...productsData] : productsData.filter(p => p.category === filter);

 switch(currentSort) {
  case 'price-asc': filtered.sort((a,b) => a.price - b.price); break;
  case 'price-desc': filtered.sort((a,b) => b.price - a.price); break;
  case 'name-asc': filtered.sort((a,b) => a.name.localeCompare(b.name)); break;
  case 'name-desc': filtered.sort((a,b) => b.name.localeCompare(a.name)); break;
  case 'stock': filtered.sort((a,b) => b.stock - a.stock); break;
 }
 return filtered;
}

function renderProducts(filter) {
 currentFilter = filter;
 const grid = document.getElementById('productsGrid');
 if (!grid) return;
 const filtered = getSortedProducts(filter);

 grid.innerHTML = filtered.map(p => {
  const stockClass = getStockClass(p.stock);
  const stockLabel = getStockLabel(p.stock);
  const stockPercent = getStockPercent(p.stock);
  const outOfStock = p.stock <= 0;
  const inCart = cart.find(c => c.id === p.id);
  const cartQty = inCart ? inCart.qty : 0;
  const canAdd = !outOfStock && (p.stock - cartQty) > 0;
  const isWishlisted = wishlist.includes(p.id);
  const isCompared = compareList.includes(p.id);
  const hasDiscount = p.oldPrice && p.oldPrice > p.price;
  const discountPercent = hasDiscount ? Math.round((1 - p.price/p.oldPrice) * 100) : 0;
  const stars = '★'.repeat(Math.floor(p.rating || 0)) + '☆'.repeat(5 - Math.floor(p.rating || 0));

  return `
   <div class="prod-card ${isWishlisted ? 'wishlisted' : ''}" data-category="${p.category}" data-id="${p.id}">
    <div class="prod-img" onclick="openProductModal(${p.id})">
     ${p.badge ? `<div class="prod-badge ${p.badge === 'جديد' ? 'new' : p.badge === 'خصم' ? 'discount' : ''}">${p.badge}${hasDiscount && p.badge === 'خصم' ? ' -' + discountPercent + '%' : ''}</div>` : ''}
     ${hasDiscount && !p.badge ? `<div class="prod-badge discount">خصم -${discountPercent}%</div>` : ''}
     <img src="${p.image}" alt="${sanitizeInput(p.name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.innerHTML+='<div style=font-size:60px>📦</div>'">
    </div>
    <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist(${p.id}, event)" aria-label="${isWishlisted ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}">
     ${isWishlisted ? '❤️' : '🤍'}
    </button>
    <div class="prod-body">
     <span class="prod-tag">${catLabels[p.category]}</span>
     <h4 class="prod-name" onclick="openProductModal(${p.id})">${sanitizeInput(p.name)}</h4>
     <div class="modal-rating" style="margin-bottom:8px">
      <span class="stars">${stars}</span>
      <span class="rating-text">${p.rating || 0} (${p.reviews ? p.reviews.length : 0} تقييم)</span>
     </div>
     <p class="prod-desc">${sanitizeInput(p.desc)}</p>
     <div class="stock-indicator ${stockClass}">
      <div class="stock-header">
       <span class="stock-label">📦 المخزون</span>
       <span class="stock-value">${stockLabel}</span>
      </div>
      <div class="stock-bar-bg">
       <div class="stock-bar-fill" style="width:${stockPercent}%"></div>
      </div>
     </div>
     <div class="prod-footer">
      <div class="prod-price">
       ${hasDiscount ? `<span class="old-price">${formatPrice(p.oldPrice)}</span>` : ''}
       ${formatPrice(p.price)}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
       <button class="quote-btn" onclick="requestQuote(${p.id}, event)" aria-label="اطلب عرض سعر">
        📋 عرض سعر
       </button>
       <button class="quick-view-btn-icon" onclick="openQuickView(${p.id})" aria-label="نظرة سريعة" style="background:transparent;border:1px solid #D1D5DB;color:#374151;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;gap:4px;transition:all 0.3s ease">
        👁️
       </button>
       <button class="compare-btn ${isCompared ? 'active' : ''}" onclick="toggleCompare(${p.id}, event)" aria-label="مقارنة">
        ${isCompared ? '✓' : '⚖️'}
       </button>
       <button class="add-btn" onclick="addToCart(${p.id})" ${!canAdd ? 'disabled' : ''} aria-label="${outOfStock ? 'نفذت الكمية' : 'أضف للسلة'}">
        ${outOfStock ? '❌ نفذت' : (canAdd ? '🛒 أضف' : '⚠️ الكمية محدودة')}
       </button>
      </div>
     </div>
    </div>
   </div>
  `;
 }).join('');

 document.querySelectorAll('.filter-tab').forEach(btn => {
  btn.classList.remove('active');
  if (filter === 'all' && btn.textContent === 'الكل') btn.classList.add('active');
  else if (filter === 'printers' && btn.textContent === 'طابعات') btn.classList.add('active');
  else if (filter === 'computers' && btn.textContent === 'كمبيوتر') btn.classList.add('active');
  else if (filter === 'ram' && btn.textContent === 'رامات') btn.classList.add('active');
  else if (filter === 'storage' && btn.textContent === 'هاردات') btn.classList.add('active');
  else if (filter === 'cables' && btn.textContent === 'وصلات') btn.classList.add('active');
  else if (filter === 'projectors' && btn.textContent === 'بروجكتور') btn.classList.add('active');
  else if (filter === 'accessories' && btn.textContent === 'إكسسوارات') btn.classList.add('active');
  else if (filter === 'ink' && btn.textContent.includes('أحبار')) btn.classList.add('active');
  else if (filter === 'food' && btn.textContent.includes('غذائية')) btn.classList.add('active');
 });

 updateCategoryCounts();
 updateBreadcrumb(filter);
}

function sortProducts(sortType) {
 currentSort = sortType;
 renderProducts(currentFilter);
}

function setViewMode(mode) {
 viewMode = mode;
 document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
 event.target.classList.add('active');
 document.getElementById('productsGrid').classList.toggle('list-view', mode === 'list');
}

function updateCategoryCounts() {
 const cats = ['printers','computers','ram','storage','cables','projectors','accessories','ink','food'];
 cats.forEach(cat => {
  const count = productsData.filter(p => p.category === cat && p.stock > 0).length;
  const el = document.getElementById('cat-' + cat);
  if (el) el.textContent = count + ' منتجات';
 });
 const total = productsData.filter(p => p.stock > 0).length;
 const statEl = document.getElementById('statProducts');
 const availEl = document.getElementById('statAvailable');
 if (statEl) statEl.textContent = '+' + productsData.length;
 if (availEl) availEl.textContent = '+' + total;
}

function updateBreadcrumb(filter) {
 const breadcrumb = document.getElementById('breadcrumb');
 const current = document.getElementById('breadcrumbCurrent');
 if (filter === 'all') {
  breadcrumb.style.display = 'none';
 } else {
  breadcrumb.style.display = 'block';
  current.textContent = catLabels[filter] || 'المنتجات';
 }
}

function openProductModal(productId) {
 const p = productsData.find(x => x.id === productId);
 if (!p) return;
 currentProductId = productId;
 const stars = '★'.repeat(Math.floor(p.rating || 0)) + '☆'.repeat(5 - Math.floor(p.rating || 0));
 const hasDiscount = p.oldPrice && p.oldPrice > p.price;
 const discountPercent = hasDiscount ? Math.round((1 - p.price/p.oldPrice) * 100) : 0;

 const reviewsHtml = p.reviews && p.reviews.length > 0 ? p.reviews.map(r => `
  <div class="review-item">
   <div class="review-header">
    <span class="review-author">${sanitizeInput(r.author)}</span>
    <span class="review-date">${r.date}</span>
   </div>
   <div class="review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div>
   <div class="review-text">${sanitizeInput(r.text)}</div>
  </div>
 `).join('') : '<p style="color:var(--text-muted);font-size:13px">لا توجد مراجعات بعد. كن أول من يقيم!</p>';

 const relatedProducts = productsData
  .filter(x => x.category === p.category && x.id !== p.id)
  .slice(0, 4);

 document.getElementById('productModalContent').innerHTML = `
  <div class="modal-image">
   <img src="${p.image}" alt="${sanitizeInput(p.name)}" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=font-size:80px loading="lazy">📦</div>'">
  </div>
  <div class="modal-info">
   <span class="modal-category">${catLabels[p.category]}</span>
   <h2 class="modal-name">${sanitizeInput(p.name)}</h2>
   <div class="modal-rating">
    <span class="stars">${stars}</span>
    <span class="rating-text">${p.rating || 0} (${p.reviews ? p.reviews.length : 0} تقييم)</span>
   </div>
   <p class="modal-desc">${sanitizeInput(p.desc)}</p>
   <div class="modal-price">
    ${hasDiscount ? `<span style="text-decoration:line-through;color:var(--text-muted);font-size:20px;margin-left:10px">${formatPrice(p.oldPrice)}</span>` : ''}
    ${formatPrice(p.price)}
    ${hasDiscount ? `<span style="background:var(--accent);color:white;padding:4px 10px;border-radius:20px;font-size:12px;margin-right:10px">خصم ${discountPercent}%</span>` : ''}
   </div>
   <div class="modal-actions">
    <button class="modal-btn modal-btn-primary" onclick="addToCart(${p.id}); closeProductModal();">
     🛒 أضف للسلة
    </button>
    <button class="modal-btn modal-btn-secondary" onclick="toggleWishlist(${p.id}, event); closeProductModal();">
     ${wishlist.includes(p.id) ? '❤️ في المفضلة' : '🤍 أضف للمفضلة'}
    </button>
   </div>
   <div class="modal-reviews">
    <h4>📋 مراجعات العملاء</h4>
    ${reviewsHtml}
    <div class="product-rating-section">
     <button class="product-rating-btn" onclick="openProductRatingModal(${p.id}, '${sanitizeInput(p.name)}')">
      ⭐ قيّم هذا المنتج
     </button>
    </div>
   </div>
  </div>
 `;

 if (relatedProducts.length > 0) {
  document.getElementById('relatedProducts').style.display = 'block';
  document.getElementById('relatedGrid').innerHTML = relatedProducts.map(rp => `
   <div class="prod-card" onclick="openProductModal(${rp.id})" style="cursor:pointer">
    <div class="prod-img" style="height:160px">
     <img src="${rp.image}" alt="${sanitizeInput(rp.name)}" loading="lazy" style="height:100%">
    </div>
    <div class="prod-body" style="padding:15px">
     <h4 class="prod-name" style="font-size:14px">${sanitizeInput(rp.name)}</h4>
     <div class="prod-price" style="font-size:18px">${formatPrice(rp.price)}</div>
    </div>
   </div>
  `).join('');
 } else {
  document.getElementById('relatedProducts').style.display = 'none';
 }

 document.getElementById('productModalOverlay').classList.add('active');
 document.body.style.overflow = 'hidden';
}

function closeProductModal(e) {
 if (e && e.target !== e.currentTarget) return;
 document.getElementById('productModalOverlay').classList.remove('active');
 document.body.style.overflow = '';
 currentProductId = null;
}

function toggleCompare(productId, event) {
 if (event) event.stopPropagation();
 const index = compareList.indexOf(productId);
 if (index > -1) {
  compareList.splice(index, 1);
  showToast('تمت الإزالة من المقارنة', 'warning');
 } else {
  if (compareList.length >= 4) {
   showToast('⚠️ يمكن مقارنة 4 منتجات كحد أقصى', 'warning');
   return;
  }
  compareList.push(productId);
  showToast('✅ تمت الإضافة للمقارنة');
 }
 localStorage.setItem('doraCompare', JSON.stringify(compareList));
 renderProducts(currentFilter);
 updateCompareBar();
}

function updateCompareBar() {
 const bar = document.getElementById('compareBar');
 const itemsDiv = document.getElementById('compareItems');
 if (!bar || !itemsDiv) return;

 if (compareList.length === 0) {
  bar.classList.remove('active');
  return;
 }

 bar.classList.add('active');
 itemsDiv.innerHTML = compareList.map(id => {
  const p = productsData.find(x => x.id === id);
  if (!p) return '';
  return `
   <div class="compare-item">
    <img src="${p.image}" alt="" loading="lazy">
    <span class="compare-item-name">${sanitizeInput(p.name.substring(0, 20))}...</span>
    <button class="compare-item-remove" onclick="toggleCompare(${p.id})">✕</button>
   </div>
  `;
 }).join('');
}

function clearCompare() {
 compareList = [];
 localStorage.setItem('doraCompare', JSON.stringify(compareList));
 renderProducts(currentFilter);
 updateCompareBar();
}

function showCompareModal() {
 if (compareList.length < 2) {
  showToast('⚠️ أضف منتجين على الأقل للمقارنة', 'warning');
  return;
 }

 const products = compareList.map(id => productsData.find(p => p.id === id)).filter(Boolean);

 let html = '<table class="compare-table"><thead><tr><th>المواصفة</th>';
 products.forEach(p => {
  html += `<th><img class="compare-product-img" src="${p.image}" alt="" loading="lazy"><div class="compare-product-name">${sanitizeInput(p.name)}</div><div class="compare-product-price">${formatPrice(p.price)}</div></th>`;
 });
 html += '</tr></thead><tbody>';

 const minPrice = Math.min(...products.map(p => p.price));
 html += '<tr><td>السعر</td>';
 products.forEach(p => {
  html += `<td class="${p.price === minPrice ? 'winner' : ''}">${formatPrice(p.price)}</td>`;
 });
 html += '</tr>';

 const maxStock = Math.max(...products.map(p => p.stock));
 html += '<tr><td>المخزون</td>';
 products.forEach(p => {
  html += `<td class="${p.stock === maxStock ? 'winner' : ''}">${p.stock} قطعة</td>`;
 });
 html += '</tr>';

 html += '<tr><td>التصنيف</td>';
 products.forEach(p => {
  html += `<td>${catLabels[p.category]}</td>`;
 });
 html += '</tr>';

 const maxRating = Math.max(...products.map(p => p.rating || 0));
 html += '<tr><td>التقييم</td>';
 products.forEach(p => {
  html += `<td class="${(p.rating || 0) === maxRating ? 'winner' : ''}">${p.rating || 0}/5</td>`;
 });
 html += '</tr>';

 html += '</tbody></table>';

 document.getElementById('compareModalContent').innerHTML = html;
 document.getElementById('compareModalOverlay').classList.add('active');
 document.body.style.overflow = 'hidden';
}

function closeCompareModal(e) {
 if (e && e.target !== e.currentTarget) return;
 document.getElementById('compareModalOverlay').classList.remove('active');
 document.body.style.overflow = '';
}

async function addToCart(productId) {
    var isLoggedIn = await checkAuth();
    if (!isLoggedIn) {
        requireAuth('تضيف منتجات للسلة');
        return;
    }
    const product = productsData.find(p => p.id === productId);
    if (!product || product.stock <= 0) {
  showToast('❌ عذراً، هذا المنتج غير متوفر حالياً', 'error');
  return;
 }

 const existing = cart.find(item => item.id === productId);
 const inCartQty = existing ? existing.qty : 0;

 if (inCartQty >= product.stock) {
  showToast('⚠️ لا يمكن إضافة المزيد، الكمية المتبقية محدودة (' + (product.stock - inCartQty) + ')', 'warning');
  return;
 }

 if (existing) {
  existing.qty++;
 } else {
  cart.push({id: productId, name: product.name, price: product.price, qty: 1, image: product.image});
 }

 localStorage.setItem('doraCart', JSON.stringify(cart));
 updateCartUI();
 renderProducts(currentFilter);
 showToast('✅ تمت إضافة ' + sanitizeInput(product.name) + ' للسلة');
}

function removeFromCart(productId) {
 cart = cart.filter(item => item.id !== productId);
 localStorage.setItem('doraCart', JSON.stringify(cart));
 updateCartUI();
 renderProducts(currentFilter);
}

function updateQty(productId, change) {
 const item = cart.find(item => item.id === productId);
 const product = productsData.find(p => p.id === productId);

 if (!item) return;

 if (change > 0) {
  if (item.qty >= product.stock) {
   showToast('⚠️ لا يمكن إضافة المزيد، الكمية المتبقية محدودة', 'warning');
   return;
  }
  item.qty++;
 } else {
  item.qty--;
 }

 if (item.qty <= 0) {
  removeFromCart(productId);
  return;
 }

 localStorage.setItem('doraCart', JSON.stringify(cart));
 updateCartUI();
 renderProducts(currentFilter);
}

function updateCartUI() {
 const count = cart.reduce((sum, item) => sum + item.qty, 0);
 const cartCount = document.getElementById('cartCount');
 if (cartCount) cartCount.textContent = count;

 const itemsDiv = document.getElementById('cartItems');
 if (!itemsDiv) return;
 const couponSection = document.getElementById('couponSection');
 if (cart.length === 0) {
  itemsDiv.innerHTML = `
   <div class="cart-empty">
    <span class="icon">🛒</span>
    <p>السلة فارغة</p>
    <small>أضف منتجات لبدء التسوق</small>
   </div>`;
  if (couponSection) couponSection.style.display = 'none';
 } else {
  itemsDiv.innerHTML = cart.map(item => {
   const product = productsData.find(p => p.id === item.id);
   const remaining = product ? product.stock - item.qty : 0;
   return `
    <div class="cart-item">
     <div class="cart-item-img">
      <img src="${item.image}" alt="" onerror="this.style.display='none';this.parentElement.textContent='📦'" loading="lazy">
     </div>
     <div class="cart-item-info">
      <div class="cart-item-name">${sanitizeInput(item.name)}</div>
      <div class="cart-item-price">${formatPrice(item.price)}</div>
      <div class="cart-item-stock">متبقي في المخزن: ${remaining} | الكمية في السلة: ${item.qty}</div>
      <div class="cart-item-actions">
       <button class="qty-btn" onclick="updateQty(${item.id}, -1)" aria-label="تقليل الكمية">−</button>
       <span>${item.qty}</span>
       <button class="qty-btn" onclick="updateQty(${item.id}, 1)" aria-label="زيادة الكمية">+</button>
       <span class="remove-btn" onclick="removeFromCart(${item.id})" aria-label="حذف من السلة">🗑️</span>
      </div>
     </div>
    </div>`;
  }).join('');
  if (couponSection) couponSection.style.display = 'block';
 }

 const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
 const discount = activeCoupon ? Math.round(subtotal * activeCoupon.discount) : 0;
 const afterDiscount = subtotal - discount;
 const tax = calculateTax(afterDiscount);
 const total = afterDiscount + tax;

 const cartTotal = document.getElementById('cartTotal');
 const cartTax = document.getElementById('cartTax');
 if (cartTotal) cartTotal.textContent = formatPrice(total);
 if (cartTax) cartTax.textContent = `شامل الضريبة (15%): ${formatPrice(tax)}${discount > 0 ? ' | خصم: ' + formatPrice(discount) : ''}`;
}

function toggleCart() {
 document.getElementById('cartOverlay').classList.toggle('active');
 document.getElementById('cartSidebar').classList.toggle('open');
}

function applyCoupon() {
 const input = document.getElementById('couponInput') || document.getElementById('couponInputAdmin');
 const code = input ? input.value.trim().toUpperCase() : '';
 if (!code) return;

 const coupon = COUPONS[code];
 if (coupon) {
  activeCoupon = coupon;
  document.getElementById('couponSection').innerHTML = `
   <div class="coupon-applied">
    ✅ ${coupon.label} مُطبق
    <button class="remove-coupon" onclick="removeCoupon()">✕</button>
   </div>
  `;
  updateCartUI();
  showToast('✅ تم تطبيق كود الخصم: ' + coupon.label);
 } else {
  showToast('❌ كود الخصم غير صحيح', 'error');
 }
}

function removeCoupon() {
 activeCoupon = null;
 document.getElementById('couponSection').innerHTML = `
  <div class="coupon-input-wrapper">
   <input type="text" class="coupon-input" id="couponInputAdmin" placeholder="أدخل كود الخصم">
   <button class="coupon-btn" onclick="applyCoupon()">تطبيق</button>
  </div>
 `;
 updateCartUI();
 showToast('تم إلغاء كود الخصم', 'warning');
}
// ===== التحقق من تسجيل الدخول =====
async function checkAuth() {
    var result = await supabaseClient.auth.getSession();
    return result.data.session ? true : false;
}

function requireAuth(action) {
    if (typeof showToast === 'function') {
        showToast('🔐 سجل دخول عشان تقدر ' + action, 'warning');
    }
    setTimeout(function() {
        window.location.href = 'account.html?mode=login&next=' + encodeURIComponent(window.location.href);
    }, 1500);
}
async function checkout() {
    var isLoggedIn = await checkAuth();
    if (!isLoggedIn) {
        requireAuth('تشتري منتجات');
        return;
    }
    if (cart.length === 0) {
        showToast('السلة فارغة! أضف منتجات أولاً', 'warning');
        return;
    }
    window.location.href = 'checkout.html';
}
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('doraTheme', next);

  // تحديث أيقونة الزر فقط
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    if (next === 'dark') {
      themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    } else {
      themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    }
  }
}
function initTheme() {
  const saved = localStorage.getItem('doraTheme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);

  // تحديث أيقونة الزر فقط
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    if (saved === 'dark') {
      themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    } else {
      themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    }
  }
}
async function requestQuote(productId, event) {
 if (event) event.stopPropagation();
 var isLoggedIn = await checkAuth();
 if (!isLoggedIn) {
     requireAuth('تطلب عرض سعر');
     return;
 }
 const p = productsData.find(x => x.id === productId);
 if (!p) return;

 const msg = `مرحباً شركة درة فارس الشمال،

أرغب في طلب عرض سعر للمنتج التالي:

📦 المنتج: ${p.name}
💰 السعر المعروض: ${p.price.toLocaleString()} ر.س
📊 التصنيف: ${catLabels[p.category]}

يرجى إرسال عرض السعر والتواصل معي.
شكراً.`;

 window.open(doraWhatsAppLink(msg), '_blank');
 showToast('📋 تم فتح واتساب لطلب عرض السعر');
}

function filterProducts(cat) {
 renderProducts(cat);
 if (cat !== 'all') {
  document.getElementById('products').scrollIntoView({behavior: 'smooth'});
 }
}

function handleSubmit(e) {
 e.preventDefault();
 const name = document.getElementById('contactName').value.trim();
 const phone = document.getElementById('contactPhone').value.trim();
 const email = document.getElementById('contactEmail').value.trim();
 const subject = document.getElementById('contactSubject').value;
 const message = document.getElementById('contactMessage').value.trim();

 let hasError = false;

 if (name.length < 3) {
  document.getElementById('contactName').classList.add('error');
  hasError = true;
 } else {
  document.getElementById('contactName').classList.remove('error');
 }

 if (!/^05[0-9]{8}$/.test(phone)) {
  document.getElementById('contactPhone').classList.add('error');
  hasError = true;
 } else {
  document.getElementById('contactPhone').classList.remove('error');
 }

 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  document.getElementById('contactEmail').classList.add('error');
  hasError = true;
 } else {
  document.getElementById('contactEmail').classList.remove('error');
 }

 if (!subject) {
  document.getElementById('contactSubject').classList.add('error');
  hasError = true;
 } else {
  document.getElementById('contactSubject').classList.remove('error');
 }

 if (message.length < 10) {
  document.getElementById('contactMessage').classList.add('error');
  hasError = true;
 } else {
  document.getElementById('contactMessage').classList.remove('error');
 }

 if (hasError) {
  showToast('❌ الرجاء تصحيح الأخطاء في النموذج', 'error');
  return;
 }

 showToast('✅ تم إرسال رسالتك بنجاح! سنتواصل معك قريباً');
 e.target.reset();
 document.querySelectorAll('.contact-form input, .contact-form select, .contact-form textarea').forEach(el => el.classList.remove('error'));
}

function showToast(message, type) {
 const toast = document.getElementById('toast');
 const icon = document.getElementById('toastIcon');
 const msg = document.getElementById('toastMsg');

 msg.textContent = message;
 icon.className = 'toast-icon';

 switch(type) {
  case 'success': icon.classList.add('success'); icon.textContent = '✅'; break;
  case 'error': icon.classList.add('error'); icon.textContent = '❌'; break;
  case 'warning': icon.classList.add('warning'); icon.textContent = '⚠️'; break;
  default: icon.textContent = 'ℹ️';
 }

 toast.classList.add('show');
 setTimeout(() => toast.classList.remove('show'), 10000);
}

function showPrivacyPolicy() {
 alert('سياسة الخصوصية\n\nنحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.\n\n1. نجمع فقط البيانات الضرورية لمعالجة طلباتك\n2. لا نشارك بياناتك مع أطراف ثالثة\n3. نستخدم تشفير SSL لحماية بياناتك\n4. يمكنك طلب حذف بياناتك في أي وقت');
}

function showTerms() {
 alert('شروط الاستخدام\n\n1. جميع الأسعار تشمل ضريبة القيمة المضافة 15%\n2. الضمان شامل على جميع المنتجات\n3. يمكن الإرجاع خلال 14 يوماً\n4. التوصيل متاح لجميع مناطق المملكة');
}

let lastScroll = 0;
window.addEventListener('scroll', () => {
 const header = document.getElementById('header');
 const currentScroll = window.pageYOffset;

 if (currentScroll > 100) {
  header.style.boxShadow = '0 4px 20px rgba(0,0,0,.1)';
 } else {
  header.style.boxShadow = 'none';
 }

 lastScroll = currentScroll;
});

function animateCounters() {
 const counters = document.querySelectorAll('.stat-box .num, .hero-stat strong, .achievement-num');

 counters.forEach(counter => {
  const observer = new IntersectionObserver((entries) => {
   entries.forEach(entry => {
    if (entry.isIntersecting) {
     const text = counter.textContent.trim();
     const match = text.match(/\+?(\d+)/);
     if (match) {
      const target = parseInt(match[1]);
      let current = 0;
      const step = target / 50;
      const duration = 2000;
      const interval = duration / 50;

      const timer = setInterval(() => {
       current += step;
       if (current >= target) {
        counter.textContent = text.replace(/\d+/, target);
        clearInterval(timer);
       } else {
        counter.textContent = text.replace(/\d+/, Math.floor(current));
       }
      }, interval);
     }
     observer.unobserve(counter);
    }
   });
  }, { threshold: 0.5 });

  observer.observe(counter);
 });
}

function addGlassHoverEffects() {
 const glassElements = document.querySelectorAll('.prod-card, .cat-card, .about-feature, .stat-box, .info-card, .contact-form');

 glassElements.forEach(el => {
  el.addEventListener('mouseenter', function() {
   this.style.borderColor = 'rgba(14, 165, 233, 0.5)';
   this.style.boxShadow = '0 12px 40px rgba(14, 165, 233, 0.15)';
  });

  el.addEventListener('mouseleave', function() {
   this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
   this.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
  });
 });
}

function initSmoothScroll() {
 document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
   const href = this.getAttribute('href');
   if (href !== '#') {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
     target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
   }
  });
 });
}

function initParallax() {
 const hero = document.querySelector('.hero');
 if (hero) {
  window.addEventListener('scroll', () => {
   const scrolled = window.pageYOffset;
   hero.style.transform = `translateY(${scrolled * 0.3}px)`;
  });
 }
}

function initHeaderScroll() {
 const header = document.getElementById('header');
 if (header) {
  window.addEventListener('scroll', () => {
   if (window.pageYOffset > 100) {
    header.style.background = 'transparent';
    header.style.backdropFilter = 'blur(20px)';
    header.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.3)';
   } else {
    header.style.background = 'transparent';
    header.style.backdropFilter = 'blur(20px)';
    header.style.boxShadow = 'none';
   }
  });
 }
}

// ===== AUDIO VOLUME CONTROL =====
let currentVolume = 0.30;
let audioVolumePopupOpen = false;
let isDraggingVolume = false;

function getAudioElement() {
  if (window.doraAudio) return window.doraAudio;
  const audios = document.querySelectorAll('audio');
  if (audios.length > 0) return audios[0];
  const AUDIO_URL = 'https://raw.githubusercontent.com/Hazem2030Hazem/dorah-fares-alshamal-store/refs/heads/main/music.mp3';
  const newAudio = new Audio(AUDIO_URL);
  newAudio.loop = true;
  newAudio.volume = 0.30;
  newAudio.preload = 'auto';
  window.doraAudio = newAudio;
  return newAudio;
}

function setAudioVolume(percentage) {
  const normalizedVolume = percentage / 100;
  const gainValue = Math.min(2.0, normalizedVolume * normalizedVolume * 2);
  const audio = getAudioElement();
  if (audio) {
    audio.volume = Math.min(1.0, gainValue);
  }
}

function toggleAudioVolumePopup(e) {
  if (e) e.stopPropagation();
  const popup = document.getElementById('audioVolumePopup');
  if (!popup) return;
  audioVolumePopupOpen = !audioVolumePopupOpen;
  if (audioVolumePopupOpen) {
    popup.classList.add('show');
    const audio = getAudioElement();
    if (audio) {
      const vol = audio.volume * 100;
      document.getElementById('volumeSliderFill').style.width = vol + '%';
      document.getElementById('volumeValue').textContent = Math.round(vol) + '%';
    }
  } else {
    popup.classList.remove('show');
  }
}

function setVolumeFromClick(e) {
  if (e) e.stopPropagation();
  const slider = document.getElementById('volumeSlider');
  if (!slider) return;
  const rect = slider.getBoundingClientRect();
  const sliderWidth = rect.width;
  const clickX = e.clientX - rect.left;
  let percentage = 100 - ((clickX / sliderWidth) * 100);
  percentage = Math.max(0, Math.min(100, percentage));
  currentVolume = percentage / 100;
  const fill = document.getElementById('volumeSliderFill');
  const thumb = document.getElementById('volumeSliderThumb');
  const value = document.getElementById('volumeValue');
  if (fill) fill.style.width = percentage + '%';
  if (thumb) {
    thumb.style.left = 'auto';
    thumb.style.right = (percentage - 1) + '%';
  }
  if (value) value.textContent = Math.round(percentage) + '%';
  setAudioVolume(percentage);
}

function toggleMute() {
  const audio = getAudioElement();
  if (!audio) {
    showToast('❌ الصوت غير متاح حالياً');
    return;
  }
  if (currentVolume > 0) {
    audio._lastVolume = currentVolume;
    currentVolume = 0;
    window.doraAudioMuted = true;
    audio.volume = 0;
    audio.muted = true;
    const fill = document.getElementById('volumeSliderFill');
    const thumb = document.getElementById('volumeSliderThumb');
    const value = document.getElementById('volumeValue');
    if (fill) fill.style.width = '0%';
    if (thumb) thumb.style.right = '0%';
    if (value) value.textContent = '0%';
    showToast('🔇 تم كتم الصوت');
  } else {
    currentVolume = audio._lastVolume || 0.30;
    window.doraAudioMuted = false;
    audio.volume = currentVolume;
    audio.muted = false;
    const fill = document.getElementById('volumeSliderFill');
    const thumb = document.getElementById('volumeSliderThumb');
    const value = document.getElementById('volumeValue');
    if (fill) fill.style.width = (currentVolume * 100) + '%';
    if (thumb) thumb.style.right = ((currentVolume * 100) - 1) + '%';
    if (value) value.textContent = Math.round(currentVolume * 100) + '%';
    showToast('🔊 تم تشغيل الصوت');
  }
  updateSpeakerIcon();
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.audio-toggle-wrapper')) {
    const popup = document.getElementById('audioVolumePopup');
    if (popup) {
      popup.classList.remove('show');
      audioVolumePopupOpen = false;
    }
  }
});

document.addEventListener('DOMContentLoaded', function() {
  const slider = document.getElementById('volumeSlider');
  if (slider) {
    slider.addEventListener('mousedown', function(e) {
      isDraggingVolume = true;
      setVolumeFromClick(e);
    });
  }
  document.addEventListener('mousemove', function(e) {
    if (isDraggingVolume) { setVolumeFromClick(e); }
  });
  document.addEventListener('mouseup', function() { isDraggingVolume = false; });
  document.addEventListener('touchmove', function(e) {
    if (isDraggingVolume && e.touches[0]) {
      const touch = e.touches[0];
      const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY, stopPropagation: function() {} };
      setVolumeFromClick(mouseEvent);
    }
  });
  document.addEventListener('touchend', function() { isDraggingVolume = false; });
});

async function loadProductsFromSupabase() {
    try {
        var { data, error } = await supabaseClient
            .from('store_products')
            .select('*')
            .eq('is_active', true)
            .order('id');
        
        if (error) throw error;
        if (data && data.length > 0) {
            productsData = data.map(function(p) {
                return {
                    id: p.id,
                    name: p.name,
                    price: Number(p.price),
                    oldPrice: p.old_price ? Number(p.old_price) : null,
                    stock: p.stock || 0,
                    category: p.category,
                    badge: p.badge || '',
                    image: p.image || 'https://via.placeholder.com/50',
                    desc: p.description || '',
                    rating: Number(p.rating) || 0,
                    reviews: []
                };
            });
        }
    } catch(e) {
        console.log('Error loading products:', e);
    }
}
// ============================================================
// 🔄 REALTIME UPDATES - تحديث تلقائي من Supabase
// ============================================================
function initRealtimeUpdates() {
  // قناة المخزون
  var productChannel = supabaseClient
    .channel('products-realtime')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'store_products' },
      function(payload) {
        console.log('📦 تحديث المخزون:', payload);
        loadProductsFromSupabase().then(function() {
          renderProducts(currentFilter);
          updateCategoryCounts();
        });
      }
    )
    .subscribe();

  // قناة التقييمات
  var reviewsChannel = supabaseClient
    .channel('reviews-realtime')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'site_items', filter: 'section_key=eq.testimonials' },
      function(payload) {
        console.log('⭐ تقييم جديد:', payload);
        renderReviews();
        loadCompanyTestimonials();
        showToast('🌟 تم إضافة تقييم جديد!');
      }
    )
    .subscribe();
}
// ============================================================
// 🔄 REALTIME UPDATES - تحديث تلقائي من Supabase
// ============================================================
function initRealtimeUpdates() {
  
  // قناة المخزون والمنتجات
  supabaseClient
    .channel('store-products-realtime')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'store_products' },
      function(payload) {
        console.log('📦 تحديث منتج:', payload);
        loadProductsFromSupabase().then(function() {
          renderProducts(currentFilter);
          updateCategoryCounts();
        });
      }
    )
    .subscribe();

  // قناة site_items (التقييمات والمحتوى)
  supabaseClient
    .channel('site-items-realtime')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'site_items' },
      function(payload) {
        console.log('📝 تحديث محتوى:', payload);
        // إعادة تحميل كل الأقسام
        setTimeout(function() {
          location.reload();
        }, 500);
      }
    )
    .subscribe();

  // قناة المشاريع
  supabaseClient
    .channel('projects-realtime')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'projects' },
      function() { loadSection('projects', 'projectsGridList', renderProjects); }
    )
    .subscribe();

  // قناة المقالات
  supabaseClient
    .channel('blog-realtime')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'blog_posts' },
      function() { loadSection('blog', 'blogGridList', renderBlog); }
    )
    .subscribe();

  // قناة الشهادات
  supabaseClient
    .channel('certifications-realtime')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'certifications' },
      function() { loadSection('certifications', 'certificationsGridList', renderCertifications); }
    )
    .subscribe();

  // قناة التواصل
  supabaseClient
    .channel('contact-realtime')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'contact_info' },
      function() { loadSection('contact', 'contactGridList', renderContact); }
    )
    .subscribe();

  // قناة الشركاء
  supabaseClient
    .channel('partners-realtime')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'partners' },
      function() { loadPartners(); }
    )
    .subscribe();

  // قناة التقييمات المنفصلة
  supabaseClient
    .channel('reviews-realtime')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'reviews' },
      function(payload) {
        console.log('⭐ تقييم جديد:', payload);
        renderReviews();
        loadCompanyTestimonials();
        showToast('🌟 تم إضافة تقييم جديد!');
      }
    )
    .subscribe();

  // قناة تقييمات الشركات
  supabaseClient
    .channel('testimonials-realtime')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'testimonials' },
      function() { loadCompanyTestimonials(); }
    )
    .subscribe();
}
// كود Realtime هنا

document.addEventListener('DOMContentLoaded', () => {
 initTheme();
    // ===== زرار تحميل صغير جنب إحصائيات البانر =====
setTimeout(function() {
  var heroStats = document.querySelector('.hero-stats');
  if (heroStats) {
    var downloadBadge = document.createElement('div');
    downloadBadge.className = 'hero-stat';
    downloadBadge.style.cssText = 'cursor:pointer;background:linear-gradient(135deg,#0EA5E9,#3B82F6);padding:12px 18px;border-radius:14px;transition:all 0.3s';
    downloadBadge.innerHTML = '<strong style="display:flex;align-items:center;gap:6px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>حمل التطبيق</strong><span>مجاناً</span>';
    downloadBadge.onclick = function() { location.href = 'download.html'; };
    downloadBadge.onmouseenter = function() { this.style.transform = 'scale(1.05)'; this.style.boxShadow = '0 8px 25px rgba(14,165,233,0.4)'; };
    downloadBadge.onmouseleave = function() { this.style.transform = 'scale(1)'; this.style.boxShadow = 'none'; };
    heroStats.appendChild(downloadBadge);
  }
}, 1000);
 checkPWAInstallState();
 renderReviews();

 if ('serviceWorker' in navigator) {
   navigator.serviceWorker.register('sw.js')
     .then(function(registration) { console.log('✅ Service Worker registered:', registration.scope); })
     .catch(function(error) { console.log('❌ Service Worker registration failed:', error); });
 }
 loadProductsFromSupabase().then(function() {
    renderProducts('all');
    updateCategoryCounts();
});
 updateCartUI();
 updateCompareBar();
 updateCategoryCounts();
 animateCounters();
 addGlassHoverEffects();
 initSmoothScroll();
 initParallax();
 initHeaderScroll();

 const installBtn = document.getElementById('installBtn');
 if (installBtn) {
  installBtn.style.display = 'inline-flex';
  installBtn.style.visibility = 'visible';
  installBtn.style.opacity = '1';
  installBtn.style.zIndex = '9999';
 }
});

// ===== RATING SYSTEM FUNCTIONS =====
let currentRating = 5;
let currentProductRating = 5;
let currentProductIdForRating = null;

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) { section.scrollIntoView({ behavior: 'smooth' }); }
}

async function openSiteRatingModal() {
    var isLoggedIn = await checkAuth();
    if (!isLoggedIn) {
        requireAuth('تضيف تقييم');
        return;
    }
    document.getElementById('siteRatingModal').classList.add('show');
    document.body.style.overflow = 'hidden';
    setRating(5);
}

function closeSiteRatingModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('siteRatingModal').classList.remove('show');
    document.body.style.overflow = '';
}

function openProductRatingModal(productId, productName) {
    currentProductIdForRating = productId;
    document.getElementById('productRatingTitle').textContent = 'قيّم: ' + productName;
    document.getElementById('productRatingId').value = productId;
    document.getElementById('productRatingModal').classList.add('show');
    document.body.style.overflow = 'hidden';
    setProductRating(5);
}

function closeProductRatingModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('productRatingModal').classList.remove('show');
    document.body.style.overflow = '';
    currentProductIdForRating = null;
}

function setRating(value) {
    currentRating = value;
    document.getElementById('siteRatingValue').value = value;
    const stars = document.querySelectorAll('#siteRatingStars .star');
    stars.forEach((star, index) => {
        if (index < value) {
            star.classList.add('active');
            star.style.color = '#FFD700';
        } else {
            star.classList.remove('active');
            star.style.color = 'rgba(255,255,255,0.3)';
        }
    });
}

function setProductRating(value) {
    currentProductRating = value;
    document.getElementById('productRatingValue').value = value;
    const stars = document.querySelectorAll('#productRatingStars .star');
    stars.forEach((star, index) => {
        if (index < value) {
            star.classList.add('active');
            star.style.color = '#FFD700';
        } else {
            star.classList.remove('active');
            star.style.color = 'rgba(255,255,255,0.3)';
        }
    });
}

async function submitSiteRating(event) {
    event.preventDefault();
    const name = document.getElementById('siteRaterName').value.trim();
    const product = document.getElementById('siteRaterProduct').value.trim();
    const comment = document.getElementById('siteRaterComment').value.trim();
    const rating = parseInt(document.getElementById('siteRatingValue').value);

    if (!name || !comment) { showToast('❌ الرجاء ملء جميع الحقول المطلوبة', 'error'); return; }

    const form = document.getElementById('siteRatingForm');
    const submitBtn = form.querySelector('.rating-submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ جاري الإرسال...';
    submitBtn.disabled = true;

    try {
        const review = { name: name, product: product || 'الموقع عامةً', text: comment, rating: rating };
        const { data, error } = await supabaseClient.from('site_items').insert([{section_key: 'testimonials', title_ar: name, description_ar: comment, metadata: {rating: rating, company_name: product}, sort_order: 1, is_active: true}])
        if (error) { throw error; }
        closeSiteRatingModal();
        document.getElementById('siteRaterName').value = '';
        document.getElementById('siteRaterProduct').value = '';
        document.getElementById('siteRaterComment').value = '';
        setRating(5);
        showToast('✅ شكراً لتقييمك! تم حفظ التقييم بنجاح');
        await renderReviews();
    } catch (error) {
        showToast('❌ حدث خطأ! ' + (error.message || 'حاول مرة أخرى'), 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function submitProductRating() {
    const name = document.getElementById('productRaterName').value.trim();
    const comment = document.getElementById('productRaterComment').value.trim();
    const rating = parseInt(document.getElementById('productRatingValue').value);
    const productId = parseInt(document.getElementById('productRatingId').value);

    if (!name || !comment) { showToast('❌ الرجاء ملء جميع الحقول المطلوبة', 'error'); return; }

    const product = productsData.find(p => p.id === productId);
    const productName = product ? product.name : 'منتج';

    const form = document.getElementById('productRatingForm');
    const submitBtn = form.querySelector('.rating-submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ جاري الإرسال...';
    submitBtn.disabled = true;

    try {
        const review = { name: name, product: productName, productId: productId, comment: comment, rating: rating, type: 'product', timestamp: new Date().toISOString() };
        await supabaseClient.from('reviews').insert([{name: review.name, product: review.product, text: review.comment, rating: review.rating, date: new Date().toLocaleDateString('ar-SA'), status: 'new'}]);

        if (product) {
            if (!product.reviews) product.reviews = [];
            product.reviews.push({ author: name, date: new Date().toISOString().split('T')[0], stars: rating, text: comment });
            const totalStars = product.reviews.reduce((sum, r) => sum + r.stars, 0);
            product.rating = Math.round((totalStars / product.reviews.length) * 10) / 10;
            localStorage.setItem('doraProducts', JSON.stringify(productsData));
        }
        closeProductRatingModal();
        document.getElementById('productRaterName').value = '';
        document.getElementById('productRaterComment').value = '';
        setProductRating(5);
        showToast('✅ شكراً لتقييم المنتج! تم حفظ التقييم بنجاح');
        await renderReviews();
        renderProducts(currentFilter);
    } catch (error) {
        showToast('❌ حدث خطأ! حاول مرة أخرى', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function renderReviews() {
    var container = document.getElementById('reviewsGrid');
    if (!container) return;
    
    try {
        var { data } = await supabaseClient
            .from('site_items')
            .select('*')
            .eq('section_key', 'testimonials')
            .eq('is_active', true)
            .order('sort_order');
        
        if (!data || !data.length) return;
        
        var companyKeywords = ['شركة', 'مؤسسة', 'مستشفى', 'وزارة', 'هيئة', 'بنك', 'فندق', 'مطاعم', 'مصنع', 'متجر', 'وكالة', 'جامعة', 'مدرسة', 'مجموعة', 'مركز', 'معرض', 'صيدلية', 'مكتب'];
        
        var personalReviews = data.filter(function(r) {
            var name = (r.title_ar || '').trim();
            for (var i = 0; i < companyKeywords.length; i++) {
                if (name.includes(companyKeywords[i])) return false;
            }
            return true;
        });
        
        if (!personalReviews.length) return;
        
        container.innerHTML = personalReviews.map(function(r) {
            var meta = r.metadata || {};
            var stars = '★'.repeat(meta.rating || 5) + '☆'.repeat(5 - (meta.rating || 5));
            return '<div class="review-card">' +
                '<div class="review-card-header"><span class="review-card-author">' + esc(r.title_ar || 'عميل') + '</span></div>' +
                '<div class="review-card-stars">' + stars + '</div>' +
                '<p class="review-card-text">' + esc(r.description_ar || '') + '</p>' +
                '<div class="review-card-product">📦 ' + esc(meta.company_name || meta.product_name || 'الموقع عامةً') + '</div>' +
                '</div>';
        }).join('');
        
    } catch(e) {
        console.log('Render reviews error:', e);
    }
}

// ===== PWA INSTALL PROMPT =====
let deferredPrompt;
let installPromptReady = false;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installPromptReady = true;
    console.log('✅ PWA install prompt ready');
});

window.addEventListener('appinstalled', () => {
    console.log('✅ PWA installed successfully');
    deferredPrompt = null;
    installPromptReady = false;
    showToast('✅ تم تثبيت التطبيق بنجاح!');
});

function installPWA() {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        showToast('📱 التطبيق مثبت بالفعل!'); return;
    }
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                showToast('✅ تم تثبيت التطبيق بنجاح!');
            } else {
                showToast('⚠️ تم إلغاء التثبيت');
            }
            deferredPrompt = null;
        }).catch(() => { showToast('❌ حدث خطأ في التثبيت'); });
    } else {
        showToast('⚠️ جرب تحديث الصفحة (F5) أو استخدم القائمة ⋮ → Install');
    }
}

function dismissInstallPrompt() {
  const prompt = document.getElementById('installPrompt');
  if (prompt) { prompt.classList.remove('show'); localStorage.setItem('doraInstallPromptDismissed', 'true'); }
}

function checkPWAInstallState() {
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    const prompt = document.getElementById('installPrompt'); if (prompt) prompt.classList.remove('show'); return;
  }
  if (localStorage.getItem('doraInstallPromptDismissed')) {
    const prompt = document.getElementById('installPrompt'); if (prompt) prompt.classList.remove('show'); return;
  }
  const prompt = document.getElementById('installPrompt');
  if (prompt && deferredPrompt) { prompt.classList.add('show'); }
}

// ============================================================
// PRODUCT MODAL PLUS v2
// ============================================================
(function(){
  function injectCard(){
    var info = document.querySelector('#productModal .modal-info');
    if (!info || info.querySelector('.mdf-card')) return;
    var m = info.innerHTML.match(/addToCart\((\d+)\)/);
    if (!m) return;
    var id = parseInt(m[1]);
    var p = (typeof productsData !== 'undefined' && productsData && productsData.find) ? productsData.find(function(x){ return x.id == id; }) : null;
    if (!p) return;
    var catName = (typeof catLabels !== 'undefined' && catLabels[p.category]) ? catLabels[p.category] : p.category;
    var stockTxt = (typeof p.stock === 'number') ? (p.stock > 0 ? 'متوفر (' + p.stock + ')' : 'غير متوفر') : (p.stock || 'متوفر');
    var revCount = (p.reviews && p.reviews.length) ? p.reviews.length : 0;
    var quoteUrl = doraWhatsAppLink('مرحباً، أرغب في طلب عرض سعر لمنتج: ' + p.name);
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

// ============================================================
// COMPANY PAGES LINKS + GLOBAL APP DOWNLOAD BOX
// ============================================================
(function(){
  function onReady(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  onReady(function(){
    var companyPages = { 'نبذة عن الشركة': 'about.html', 'رؤيتنا': 'vision.html', 'رسالتنا': 'mission.html', 'فريق العمل': 'team.html', 'الشهادات': 'certifications.html' };
    document.querySelectorAll('.dropdown-menu a').forEach(function(link){
      var label = (link.textContent || '').replace(/\s+/g, ' ').trim();
      if (companyPages[label]) link.setAttribute('href', companyPages[label]);
    });
    if (document.querySelector('.app-download-btns')) return;
    var section = document.createElement('section');
    section.className = 'global-app-download';
    section.setAttribute('aria-label', 'تحميل تطبيق درة فارس الشمال');
    section.innerHTML = '<div class="global-app-download-box">' +
        '<p class="global-app-download-title">📲 حمّل تطبيق درة فارس الشمال على جوالك أو الكمبيوتر، أو اطلب عرض سعر الآن!</p>' +
        '<div class="app-download-btns">' +
          '<a href="https://github.com/Hazem2030Hazem/dorah-fares-alshamal-store/raw/main/app-release.apk" download class="btn-primary">📱 تحميل تطبيق Android</a>' +
          '<button type="button" onclick="installPWA()" class="btn-primary">💻 حمّل تطبيق درة فارس الشمال</button>' +
          '<a href="' + doraWhatsAppLink('مرحباً أرغب في طلب عرض سعر من شركة درة فارس الشمال') + '" target="_blank" rel="noopener" class="btn-primary">📋 اطلب عرض سعر</a>' +
        '</div>' +
        '<p class="global-app-download-note">اضغط للتثبيت على الشاشة الرئيسية</p>' +
      '</div>';
    var footer = document.querySelector('footer.footer, footer');
    if (footer && footer.parentNode) footer.parentNode.insertBefore(section, footer);
    else document.body.appendChild(section);
  });
})();

// ============================================================
// SITE SETTINGS RUNTIME
// ============================================================
const DORA_DEFAULT_SITE_SETTINGS = {
  companyName: 'شركة درة فارس الشمال', companyAddress: 'الرياض، المملكة العربية السعودية',
  companyPhone1: '966568717449', companyPhone2: '966545358773', companyEmail: 'info@alshamal-df.com',
  socialTwitter: 'https://twitter.com/dorafares', socialInstagram: 'https://instagram.com/dorafares',
  socialFacebook: 'https://facebook.com/dorafares', socialLinkedin: 'https://linkedin.com/company/dorafares',
  whatsappMessage: 'مرحباً شركة درة فارس الشمال،\n\nأرغب في الاستفسار عن:\n- \n- \n\nوشكراً'
};
let doraSiteSettings = { ...DORA_DEFAULT_SITE_SETTINGS, ...(JSON.parse(localStorage.getItem('doraSettings') || '{}')) };

function normalizeDoraPhone(phone){ let p = String(phone || '').replace(/\D/g, ''); if (p.startsWith('05')) p = '966' + p.slice(1); return p || DORA_DEFAULT_SITE_SETTINGS.companyPhone1; }
function formatDoraPhone(phone){ const p = normalizeDoraPhone(phone); if (p.length === 12 && p.startsWith('966')) return `+966 ${p.slice(3,5)} ${p.slice(5,8)} ${p.slice(8)}`; return '+' + p; }
function getDoraSiteSettings(){ return { ...DORA_DEFAULT_SITE_SETTINGS, ...doraSiteSettings }; }
function doraWhatsAppLink(message, phone){ const settings = getDoraSiteSettings(); return 'https://wa.me/' + normalizeDoraPhone(phone || settings.companyPhone2) + '?text=' + encodeURIComponent(message || settings.whatsappMessage); }
function replaceDoraText(search, replacement){
  if (!search || !replacement || search === replacement) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) { const node = walker.currentNode; if (node.parentElement && ['SCRIPT','STYLE'].includes(node.parentElement.tagName)) continue; if (node.nodeValue.includes(search)) nodes.push(node); }
  nodes.forEach(node => { node.nodeValue = node.nodeValue.split(search).join(replacement); });
}
function applyDoraSettings(settings){
  doraSiteSettings = { ...DORA_DEFAULT_SITE_SETTINGS, ...(settings || {}) };
  localStorage.setItem('doraSettings', JSON.stringify(doraSiteSettings));
  const s = getDoraSiteSettings();
  const phone1 = normalizeDoraPhone(s.companyPhone1);
  const formattedPhone1 = formatDoraPhone(phone1);
  document.querySelectorAll('a[href*="wa.me/"]').forEach(link => {
    try { const url = new URL(link.href); url.pathname = '/' + phone1; const text = url.searchParams.get('text'); if (text && !text.includes('عرض سعر') && !text.includes('استشارة') && !text.includes('منتج:')) { url.searchParams.set('text', s.whatsappMessage); } link.href = url.toString(); } catch(_) {}
  });
  document.querySelectorAll('a[href^="tel:"]').forEach(link => { link.href = 'tel:+' + phone1; if (/\+?\d[\d\s]{7,}/.test(link.textContent)) link.textContent = formattedPhone1; });
  document.querySelectorAll('a[href^="mailto:"]').forEach(link => { link.href = 'mailto:' + s.companyEmail; if (link.textContent.includes('@')) link.textContent = s.companyEmail; });
  if (s.socialTwitter) document.querySelectorAll('a[href*="twitter.com"], a[href*="x.com"]').forEach(a => a.href = s.socialTwitter);
  if (s.socialInstagram) document.querySelectorAll('a[href*="instagram.com"]').forEach(a => a.href = s.socialInstagram);
  if (s.socialFacebook) document.querySelectorAll('a[href*="facebook.com"]').forEach(a => a.href = s.socialFacebook);
  if (s.socialLinkedin) document.querySelectorAll('a[href*="linkedin.com"]').forEach(a => a.href = s.socialLinkedin);
  replaceDoraText(DORA_DEFAULT_SITE_SETTINGS.companyAddress, s.companyAddress);
  replaceDoraText(DORA_DEFAULT_SITE_SETTINGS.companyEmail, s.companyEmail);
  replaceDoraText(formatDoraPhone(DORA_DEFAULT_SITE_SETTINGS.companyPhone1), formattedPhone1);
  replaceDoraText(DORA_DEFAULT_SITE_SETTINGS.companyPhone1, phone1);
}
async function loadDoraSiteSettings(){
  applyDoraSettings(doraSiteSettings);
  try {
    const { data, error } = await supabaseClient.from('site_settings').select('settings').eq('id', 1).maybeSingle();
    if (!error && data?.settings) applyDoraSettings(data.settings);
  } catch (error) { console.warn('تعذر تحميل إعدادات الموقع العامة:', error); }
}
window.getDoraSiteSettings = getDoraSiteSettings;
window.doraWhatsAppLink = doraWhatsAppLink;
window.addEventListener('storage', function(event){ if (event.key === 'doraSettings') applyDoraSettings(JSON.parse(event.newValue || '{}')); });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadDoraSiteSettings);
else loadDoraSiteSettings();

// ============================================================
// ACCOUNT SYSTEM LOADER
// ============================================================
(function(){
  if (document.querySelector('script[data-account-system]')) return;
  var script = document.createElement('script');
  script.src = 'account-system.js';
  script.async = false;
  script.setAttribute('data-account-system', 'true');
  script.onerror = function(){ console.warn('تعذر تحميل account-system.js'); };
  document.body.appendChild(script);
})();

// ============================================================
// NEW FEATURES: SIDEBAR + QUICK VIEW + WISHLIST (Supabase)
// ============================================================

// ===== WISHLIST FUNCTIONS =====
let wishlistItems = JSON.parse(localStorage.getItem('doraWishlistItems')) || [];

async function initWishlistTable() { try { const { data, error } = await supabaseClient.from('wishlist').select('*').limit(1); if (error && error.code === '42P01') { console.log('Wishlist table not found'); } } catch (e) { console.log('Wishlist init check:', e); } }
function getDeviceId() { let deviceId = localStorage.getItem('doraDeviceId'); if (!deviceId) { deviceId = 'device_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('doraDeviceId', deviceId); } return deviceId; }

async function toggleWishlist(productId, event) {
  if (event) event.stopPropagation();
  var isLoggedIn = await checkAuth();
  if (!isLoggedIn) {
      requireAuth('تضيف للمفضلة');
      return;
  }
  const index = wishlistItems.indexOf(productId);
  if (index > -1) {
    wishlistItems.splice(index, 1);
    showToast('💔 تمت الإزالة من المفضلة', 'warning');
   try { await supabaseClient.from('wishlist').delete().eq('product_id', productId); } catch (e) {}
  } else {
    wishlistItems.push(productId);
    showToast('❤️ تمت الإضافة للمفضلة');
   try { await supabaseClient.from('wishlist').insert([{ product_id: productId, created_at: new Date().toISOString() }]); } catch (e) {}
  }
  localStorage.setItem('doraWishlistItems', JSON.stringify(wishlistItems));
  updateWishlistUI();
  renderProducts(currentFilter);
}

function updateWishlistUI() {
  const sidebarBadge = document.getElementById('sidebarWishlistCount');
  if (sidebarBadge) { sidebarBadge.textContent = wishlistItems.length; sidebarBadge.style.display = wishlistItems.length > 0 ? 'flex' : 'none'; }
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    const productId = parseInt(btn.getAttribute('data-product-id'));
    if (wishlistItems.includes(productId)) { btn.classList.add('active'); btn.innerHTML = '❤️'; }
    else { btn.classList.remove('active'); btn.innerHTML = '🤍'; }
  });
}

async function loadWishlistFromSupabase() {
  try {
    const { data, error } = await supabaseClient.from('wishlist').select('product_id');
    if (!error && data) { wishlistItems = data.map(item => item.product_id); localStorage.setItem('doraWishlistItems', JSON.stringify(wishlistItems)); updateWishlistUI(); }
  } catch (e) { updateWishlistUI(); }
}

// ===== QUICK VIEW =====
function openQuickView(productId) {
  const p = productsData.find(x => x.id === productId);
  if (!p) return;
  const stars = '★'.repeat(Math.floor(p.rating || 0)) + '☆'.repeat(5 - Math.floor(p.rating || 0));
  const hasDiscount = p.oldPrice && p.oldPrice > p.price;
  const isWishlisted = wishlistItems.includes(productId);
  const stockClass = getStockClass(p.stock);
  const stockLabel = getStockLabel(p.stock);
  const stockPercent = getStockPercent(p.stock);
  const content = document.getElementById('quickViewContent');
  if (!content) return;
  content.innerHTML = `
    <div class="quick-view-image"><img src="${p.image}" alt="${sanitizeInput(p.name)}" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=font-size:80px>📦</div>'"></div>
    <div class="quick-view-info">
      <span class="quick-view-category">${catLabels[p.category]}</span>
      <h3 class="quick-view-name">${sanitizeInput(p.name)}</h3>
      <div class="quick-view-rating"><span class="stars">${stars}</span><span class="rating-text">${p.rating || 0} (${p.reviews ? p.reviews.length : 0} تقييم)</span></div>
      <p class="quick-view-desc">${sanitizeInput(p.desc)}</p>
      <div class="quick-view-stock ${stockClass}"><span class="quick-view-stock-label">📦 المخزون:</span><span class="quick-view-stock-value">${stockLabel}</span><div class="quick-view-stock-bar"><div class="quick-view-stock-fill" style="width:${stockPercent}%"></div></div></div>
      <div class="quick-view-price">${hasDiscount ? `<span class="old-price">${formatPrice(p.oldPrice)}</span>` : ''} ${formatPrice(p.price)}</div>
      <div class="quick-view-actions">
        <button class="quick-view-btn quick-view-btn-primary" onclick="addToCart(${p.id}); closeQuickView();">🛒 أضف للسلة</button>
        <button class="quick-view-btn quick-view-btn-wishlist ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist(${p.id}, event); this.classList.toggle('active'); this.innerHTML = this.classList.contains('active') ? '❤️' : '🤍';">${isWishlisted ? '❤️' : '🤍'}</button>
        <button class="quick-view-btn quick-view-btn-secondary" onclick="openProductModal(${p.id}); closeQuickView();">📋 التفاصيل</button>
      </div>
    </div>`;
  const overlay = document.getElementById('quickViewOverlay');
  if (overlay) { overlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function closeQuickView(e) { if (e && e.target !== e.currentTarget) return; const overlay = document.getElementById('quickViewOverlay'); if (overlay) { overlay.classList.remove('active'); document.body.style.overflow = ''; } }

// ===== SIDEBAR INTERACTIONS =====
function initSidebar() {
  const sidebarWrapper = document.getElementById('sidebarWrapper');
  const sidebarPanel = document.getElementById('sidebarPanel');
  if (!sidebarWrapper || !sidebarPanel) return;
  sidebarWrapper.addEventListener('click', function(e) { if (e.target.closest('.sidebar-icon')) return; sidebarWrapper.classList.toggle('open'); });
  sidebarPanel.addEventListener('mouseleave', function() { sidebarWrapper.classList.remove('open'); });
  let touchStartX = 0;
  sidebarWrapper.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; });
  sidebarWrapper.addEventListener('touchend', function(e) { const diff = e.changedTouches[0].clientX - touchStartX; if (diff > 50) sidebarWrapper.classList.add('open'); else if (diff < -50) sidebarWrapper.classList.remove('open'); });
}

// ===== SIDEBAR INJECTION =====
function injectSidebar() {
  const oldSidebars = document.querySelectorAll('.sidebar-icons');
  oldSidebars.forEach(function(el) { if (!el.closest('#sidebarWrapper')) { el.remove(); } });
  if (document.getElementById('sidebarWrapper')) return;
  const sidebarHTML = `
  <div class="sidebar-wrapper" id="sidebarWrapper">
    <div class="sidebar-tab" id="sidebarTab"><span class="sidebar-tab-text">الاختصارات</span><span class="sidebar-tab-arrow">◀</span></div>
    <div class="sidebar-panel" id="sidebarPanel">
      <div class="sidebar-icons">
        <div class="sidebar-icon" title="الرئيسية" onclick="window.location.href='index.html'"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg><span class="icon-glow"></span></div>
        <div class="sidebar-icon" title="المنتجات" onclick="window.location.href='index.html#products'"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg><span class="icon-glow"></span></div>
        <div class="sidebar-icon" title="عن الشركة" onclick="window.location.href='about.html'"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg><span class="icon-glow"></span></div>
        <div class="sidebar-icon" title="تواصل معنا" onclick="window.location.href='index.html#contact'"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg><span class="icon-glow"></span></div>
        <div class="sidebar-icon" title="السلة" onclick="toggleCart()"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><span class="icon-glow"></span><span class="sidebar-badge" id="sidebarCartCount">0</span></div>
        <div class="sidebar-icon" title="التقييم" onclick="openSiteRatingModal()"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><span class="icon-glow"></span></div>
        <div class="sidebar-icon" title="المفضلة" onclick="window.location.href='wishlist.html'"><svg class="icon-svg heart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg><span class="icon-glow heart-glow"></span><span class="sidebar-badge" id="sidebarWishlistCount">0</span></div>
      </div>
    </div>
  </div>`;
  const body = document.body;
  if (body) { body.insertAdjacentHTML('afterbegin', sidebarHTML); }
}

// ===== WISHLIST PAGE RENDER =====
function renderWishlistPage() {
  const container = document.getElementById('wishlistContent');
  if (!container) return;
  if (wishlistItems.length === 0) {
    container.innerHTML = `<div class="wishlist-empty"><span class="icon">❤️</span><h3>قائمة المفضلة فارغة</h3><p>أضف منتجاتك المفضلة من صفحة المنتجات</p><a href="index.html#products" class="btn-primary" style="margin-top:20px;">🛍️ تصفح المنتجات</a></div>`; return;
  }
  const wishlistProducts = productsData.filter(p => wishlistItems.includes(p.id));
  container.innerHTML = `<div class="prod-grid">${wishlistProducts.map(p => {
        const stars = '★'.repeat(Math.floor(p.rating || 0)) + '☆'.repeat(5 - Math.floor(p.rating || 0));
        const hasDiscount = p.oldPrice && p.oldPrice > p.price;
        return `<div class="prod-card wishlisted" data-id="${p.id}"><div class="prod-img" onclick="openQuickView(${p.id})">${p.badge ? `<div class="prod-badge">${p.badge}</div>` : ''}<img src="${p.image}" alt="${p.name}" loading="lazy"></div><button class="wishlist-btn active" onclick="toggleWishlist(${p.id}, event); renderWishlistPage();">❤️</button><div class="prod-body"><span class="prod-tag">${catLabels[p.category]}</span><h4 class="prod-name" onclick="openProductModal(${p.id})">${p.name}</h4><div class="modal-rating" style="margin-bottom:8px"><span class="stars">${stars}</span><span class="rating-text">${p.rating || 0}</span></div><p class="prod-desc">${p.desc}</p><div class="prod-footer"><div class="prod-price">${hasDiscount ? `<span class="old-price">${formatPrice(p.oldPrice)}</span>` : ''} ${formatPrice(p.price)}</div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"><button class="add-btn" onclick="addToCart(${p.id})">🛒 أضف للسلة</button><button class="quote-btn" onclick="requestQuote(${p.id}, event)">📋 عرض سعر</button></div></div></div></div>`;
      }).join('')}</div>`;
}
// ===== تحميل الشركاء والعملاء =====
async function loadPartners() {
    var grid = document.getElementById('partnersGrid');
    var countText = document.getElementById('partnersCount');
    if (!grid) return;

    try {
        var result = await supabaseClient
            .from('partners')
            .select('*')
            .order('id', { ascending: false });

        if (result.error) throw result.error;

        var partners = result.data || [];

        if (partners.length === 0) {
            grid.innerHTML = '<div style="text-align:center;width:100%;padding:30px;color:rgba(255,255,255,0.5)">🤝 لم يتم إضافة شركاء بعد</div>';
            if (countText) countText.textContent = '';
            return;
        }

        grid.innerHTML = partners.map(function(p) {
            var imgHtml = p.image_url ? '<img src="' + esc(p.image_url) + '" alt="' + esc(p.name) + '" style="width:50px;height:50px;border-radius:10px;object-fit:cover">' : '<span style="font-size:30px">🏢</span>';
            return '<div class="why-card">' +
                '<div class="why-icon">' + imgHtml + '</div>' +
                '<h4>' + esc(p.name) + '</h4>' +
                '<p>' + esc(p.category || 'شريك') + '</p>' +
                '<div style="margin-top:8px;font-size:12px;color:#60A5FA;font-weight:700">🤝 شريك</div>' +
                '</div>';
        }).join('');

        if (countText) countText.textContent = 'وأكثر من ' + partners.length + ' شريك وعميل يثقون بخدماتنا';

    } catch (e) {
        console.log('Partners load error:', e);
        grid.innerHTML = '<div style="text-align:center;width:100%;padding:30px;color:#EF4444">⚠️ تعذر تحميل الشركاء</div>';
    }
}
// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
  injectSidebar();
  initWishlistTable();
  loadWishlistFromSupabase();
  initSidebar();
  var sidebarCartCount = document.getElementById('sidebarCartCount');
  if (sidebarCartCount) { var count = cart.reduce(function(sum, item) { return sum + item.qty; }, 0); sidebarCartCount.textContent = count; sidebarCartCount.style.display = count > 0 ? 'flex' : 'none'; }
  
 // تحميل تقييمات الشركات
  setTimeout(loadCompanyTestimonials, 1000);
  
  // تحميل الشركاء
  setTimeout(loadPartners, 500);
   setTimeout(initRealtimeUpdates, 3000); 
});

// ===== عرض تقييمات الشركات والمؤسسات =====
async function loadCompanyTestimonials() {
    var grid = document.getElementById('companyTestimonialsGrid');
    if (!grid) return;

    try {
        var result = await supabaseClient
            .from('site_items')
            .select('*')
            .eq('section_key', 'testimonials')
            .eq('is_active', true)
            .order('sort_order');

        if (result.error || !result.data || result.data.length === 0) return;

        var companyKeywords = ['شركة', 'مؤسسة', 'مستشفى', 'وزارة', 'هيئة', 'بنك', 'فندق', 'مطاعم', 'مصنع', 'متجر', 'وكالة', 'جامعة', 'مدرسة', 'مجموعة', 'مركز', 'معرض', 'صيدلية', 'مكتب'];
        
        var companyReviews = result.data.filter(function(r) {
            var name = (r.title_ar || '').trim();
            for (var i = 0; i < companyKeywords.length; i++) {
                if (name.includes(companyKeywords[i])) return true;
            }
            return false;
        });

        if (companyReviews.length === 0) return;

        grid.innerHTML = companyReviews.map(function(r) {
            var meta = r.metadata || {};
            var stars = '<svg style="width:18px;height:18px;vertical-align:middle;margin:0 2px" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'.repeat(meta.rating || 5);
            return '<div class="why-card">' +
                '<div class="why-icon" style="font-size:24px">💬</div>' +
                '<div style="color:#F59E0B;margin-bottom:8px">' + stars + '</div>' +
                '<h4>' + esc(r.title_ar || 'عميل') + '</h4>' +
                '<p>"' + esc(r.description_ar || '').replace(/"/g, '&quot;') + '"</p>' +
                '<div style="margin-top:8px;font-size:12px;color:rgba(255,255,255,0.4)">📦 ' + esc(meta.company_name || 'جهة معتمدة') + '</div>' +
                '</div>';
        }).join('');

    } catch (e) {
        console.log('Company testimonials:', e);
    }
}
// ===== WHATSAPP CHAT WIDGET =====
(function() {
    // إنشاء عنصر الشات
    var widgetHTML = '<div class="wa-chat-widget" id="waWidget">' +
        '<div class="wa-chat-bubble" id="waBubble" onclick="toggleWaChat()">' +
        '<span class="wa-icon">💬</span>' +
        '</div>' +
        '<div class="wa-chat-box" id="waChatBox" style="display:none">' +
        '<div class="wa-chat-header">' +
        '<span>👋 مرحباً! كيف نقدر نساعدك؟</span>' +
        '<button onclick="toggleWaChat()" style="background:none;border:none;color:white;font-size:20px;cursor:pointer">✕</button>' +
        '</div>' +
        '<div class="wa-chat-body">' +
        '<p>اختر نوع الاستفسار:</p>' +
        '<button onclick="waOpen(\'استفسار عن منتج\')">📦 استفسار عن منتج</button>' +
        '<button onclick="waOpen(\'طلب خدمة\')">🔧 طلب خدمة</button>' +
        '<button onclick="waOpen(\'طلب عرض سعر\')">📋 طلب عرض سعر</button>' +
        '<button onclick="waOpen(\'استفسار عام\')">💬 استفسار عام</button>' +
        '</div>' +
        '</div>' +
        '</div>';

    // إضافة العنصر للصفحة
    document.addEventListener('DOMContentLoaded', function() {
        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    });

    // دوال التحكم
    window.toggleWaChat = function() {
        var box = document.getElementById('waChatBox');
        if (box) {
            box.style.display = box.style.display === 'none' ? 'block' : 'none';
        }
    };

    window.waOpen = function(type) {
        var msg = 'مرحباً شركة درة فارس الشمال،\n\n' + type + '\n\nالاسم: \nالجوال: \nالتفاصيل: ';
        window.open('https://wa.me/966545358773?text=' + encodeURIComponent(msg), '_blank');
    };
// ============================================================
// 🤖 نظام التوصيات الذكية - Dora Smart Recommendations
// ============================================================

// ---------- 1. Recently Viewed - المنتجات اللي شافها العميل ----------
let recentlyViewed = JSON.parse(localStorage.getItem('doraRecentlyViewed')) || [];
const MAX_RECENT = 8;

function addToRecentlyViewed(productId) {
  recentlyViewed = recentlyViewed.filter(id => id !== productId);
  recentlyViewed.unshift(productId);
  if (recentlyViewed.length > MAX_RECENT) recentlyViewed.pop();
  localStorage.setItem('doraRecentlyViewed', JSON.stringify(recentlyViewed));
}

// استدعاء عند فتح مودال المنتج
const originalOpenProductModal = openProductModal;
openProductModal = function(productId) {
  addToRecentlyViewed(productId);
  originalOpenProductModal(productId);
};

// استدعاء عند Quick View
const originalOpenQuickView = openQuickView;
openQuickView = function(productId) {
  addToRecentlyViewed(productId);
  originalOpenQuickView(productId);
};

// ---------- 2. Render Recently Viewed Section ----------
function renderRecentlyViewed() {
  const container = document.getElementById('recentlyViewedGrid');
  if (!container) return;
  
  const validIds = recentlyViewed.filter(id => productsData.find(p => p.id === id));
  if (validIds.length === 0) {
    document.getElementById('recentlyViewedSection').style.display = 'none';
    return;
  }
  
  document.getElementById('recentlyViewedSection').style.display = 'block';
  
  const products = validIds.map(id => productsData.find(p => p.id === id)).filter(Boolean);
  
  container.innerHTML = products.map(p => {
    const stars = '★'.repeat(Math.floor(p.rating || 0)) + '☆'.repeat(5 - Math.floor(p.rating || 0));
    const hasDiscount = p.oldPrice && p.oldPrice > p.price;
    return `
      <div class="prod-card" data-id="${p.id}" onclick="openProductModal(${p.id})" style="cursor:pointer">
        <div class="prod-img" style="height:180px">
          ${p.badge ? `<div class="prod-badge">${p.badge}</div>` : ''}
          ${hasDiscount && !p.badge ? `<div class="prod-badge discount">خصم</div>` : ''}
          <img src="${p.image}" alt="${sanitizeInput(p.name)}" loading="lazy" style="height:100%;width:100%;object-fit:cover" onerror="this.style.display='none';this.parentElement.innerHTML+='<div style=font-size:50px>📦</div>'">
        </div>
        <div class="prod-body" style="padding:12px">
          <span class="prod-tag" style="font-size:11px">${catLabels[p.category]}</span>
          <h4 class="prod-name" style="font-size:13px;margin:5px 0">${sanitizeInput(p.name)}</h4>
          <div style="display:flex;align-items:center;gap:5px;margin:5px 0">
            <span style="color:#FFD700;font-size:12px">${stars}</span>
            <span style="font-size:11px;color:#6B7280">${p.rating || 0}</span>
          </div>
          <div class="prod-price" style="font-size:16px">
            ${hasDiscount ? `<span class="old-price" style="font-size:12px">${formatPrice(p.oldPrice)}</span> ` : ''}
            ${formatPrice(p.price)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ---------- 3. Frequently Bought Together (بسيط - نفس الفئة) ----------
function getFrequentlyBoughtTogether(productId) {
  const product = productsData.find(p => p.id === productId);
  if (!product) return [];
  
  // نجيب منتجات من نفس الفئة مع تقييم عالي
  return productsData
    .filter(p => p.category === product.category && p.id !== productId && p.stock > 0)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 3);
}

// ---------- 4. أفضل المنتجات مبيعاً (حسب التقييم والمخزون) ----------
function getBestSellers(limit = 8) {
  return productsData
    .filter(p => p.stock > 0)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, limit);
}

// ---------- 5. منتجات مشابهة (محسنة) ----------
function getSimilarProducts(productId, limit = 4) {
  const product = productsData.find(p => p.id === productId);
  if (!product) return [];
  
  // الأول: نفس الفئة
  const sameCategory = productsData.filter(p => p.category === product.category && p.id !== productId && p.stock > 0);
  
  // الثاني: فئات تانية مكملة
  const complementary = {
    'printers': ['ink', 'cables'],
    'computers': ['ram', 'storage', 'accessories'],
    'ram': ['computers', 'storage'],
    'storage': ['computers', 'ram', 'cables'],
    'projectors': ['cables', 'accessories'],
    'accessories': ['computers', 'cables'],
    'ink': ['printers'],
    'cables': ['projectors', 'computers', 'printers'],
    'food': ['food']
  };
  
  let results = [...sameCategory];
  
  if (complementary[product.category]) {
    const compProducts = productsData.filter(p => 
      complementary[product.category].includes(p.category) && 
      p.id !== productId && 
      p.stock > 0
    );
    results = [...results, ...compProducts];
  }
  
  return results.slice(0, limit);
}

// ---------- 6. تحديث مودال المنتج (إضافة Frequently Bought Together) ----------
const originalOpenProductModalV2 = openProductModal;
openProductModal = function(productId) {
  originalOpenProductModalV2(productId);
  
  // إضافة Frequently Bought Together بعد فتح المودال
  setTimeout(() => {
    const info = document.querySelector('#productModal .modal-info');
    const relatedSection = document.getElementById('relatedProducts');
    
    if (info && !info.querySelector('.fbt-section')) {
      const fbtProducts = getFrequentlyBoughtTogether(productId);
      
      if (fbtProducts.length > 0) {
        const fbtHTML = `
          <div class="fbt-section" style="margin-top:20px;padding:20px;background:rgba(59,130,246,0.05);border-radius:16px;border:1px solid rgba(59,130,246,0.2)">
            <h4 style="margin:0 0 15px 0;font-size:16px;display:flex;align-items:center;gap:8px">
              🎯 يشتري العملاء معاً غالباً
            </h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
              ${fbtProducts.map(p => `
                <div onclick="openProductModal(${p.id})" style="cursor:pointer;background:white;border-radius:12px;padding:12px;text-align:center;border:1px solid rgba(0,0,0,0.1);transition:all 0.3s ease" onmouseenter="this.style.borderColor='#3B82F6';this.style.boxShadow='0 4px 12px rgba(59,130,246,0.2)'" onmouseleave="this.style.borderColor='rgba(0,0,0,0.1)';this.style.boxShadow='none'">
                  <img src="${p.image}" alt="${sanitizeInput(p.name)}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;margin-bottom:8px" loading="lazy">
                  <div style="font-size:12px;font-weight:bold;margin-bottom:4px;color:#1F2937">${sanitizeInput(p.name.substring(0, 25))}...</div>
                  <div style="font-size:14px;color:#3B82F6;font-weight:bold">${formatPrice(p.price)}</div>
                  ${p.rating ? `<div style="font-size:11px;color:#F59E0B">${'★'.repeat(Math.floor(p.rating))} ${p.rating}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
        
        // Insert before related products
        if (relatedSection) {
          relatedSection.insertAdjacentHTML('beforebegin', fbtHTML);
        } else {
          info.insertAdjacentHTML('beforeend', fbtHTML);
        }
      }
    }
  }, 300);
};

// ---------- 7. إضافة الأقسام الجديدة للصفحة الرئيسية ----------
function injectRecommendationSections() {
  if (document.getElementById('recentlyViewedSection')) return;
  
  const productsSection = document.getElementById('products');
  if (!productsSection) return;
  
  // Recently Viewed Section
  const recentlyHTML = `
    <section id="recentlyViewedSection" class="recommendation-section" style="display:none;padding:60px 0;background:rgba(59,130,246,0.02)">
      <div class="container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:30px">
          <h2 style="font-size:28px;display:flex;align-items:center;gap:10px">👁️ شاهدتها مؤخراً</h2>
          <button onclick="localStorage.removeItem('doraRecentlyViewed');recentlyViewed=[];renderRecentlyViewed();" style="background:none;border:1px solid rgba(0,0,0,0.2);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px">🗑️ مسح السجل</button>
        </div>
        <div id="recentlyViewedGrid" class="prod-grid" style="grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:20px"></div>
      </div>
    </section>
    
    <!-- Best Sellers Section -->
    <section id="bestSellersSection" class="recommendation-section" style="padding:60px 0">
      <div class="container">
        <h2 style="font-size:28px;display:flex;align-items:center;gap:10px;margin-bottom:30px">🔥 الأكثر مبيعاً</h2>
        <div id="bestSellersGrid" class="prod-grid" style="grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:20px"></div>
      </div>
    </section>
  `;
  
  productsSection.insertAdjacentHTML('beforebegin', recentlyHTML);
  
  // Render
  renderRecentlyViewed();
  renderBestSellers();
}

// ---------- 8. Render Best Sellers ----------
function renderBestSellers() {
  const grid = document.getElementById('bestSellersGrid');
  if (!grid) return;
  
  const bestSellers = getBestSellers(8);
  
  grid.innerHTML = bestSellers.map((p, index) => {
    const stars = '★'.repeat(Math.floor(p.rating || 0)) + '☆'.repeat(5 - Math.floor(p.rating || 0));
    const hasDiscount = p.oldPrice && p.oldPrice > p.price;
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
    
    return `
      <div class="prod-card best-seller-card" data-id="${p.id}" onclick="openProductModal(${p.id})" style="cursor:pointer;position:relative">
        ${medal ? `<div style="position:absolute;top:10px;left:10px;font-size:30px;z-index:10">${medal}</div>` : ''}
        <div class="prod-img" style="height:180px">
          <img src="${p.image}" alt="${sanitizeInput(p.name)}" loading="lazy" style="height:100%;width:100%;object-fit:cover" onerror="this.style.display='none';this.parentElement.innerHTML+='<div style=font-size:50px>📦</div>'">
        </div>
        <div class="prod-body" style="padding:12px">
          <span class="prod-tag" style="font-size:11px">${catLabels[p.category]}</span>
          <h4 class="prod-name" style="font-size:13px;margin:5px 0">${sanitizeInput(p.name)}</h4>
          <div style="display:flex;align-items:center;gap:5px;margin:5px 0">
            <span style="color:#FFD700;font-size:12px">${stars}</span>
            <span style="font-size:11px;color:#6B7280">${p.rating || 0} (${p.reviews ? p.reviews.length : 0})</span>
          </div>
          <div class="prod-price" style="font-size:16px">
            ${hasDiscount ? `<span class="old-price" style="font-size:12px">${formatPrice(p.oldPrice)}</span> ` : ''}
            ${formatPrice(p.price)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ---------- 9. إضافة CSS الديناميكي ----------
function injectRecommendationStyles() {
  if (document.getElementById('dora-recommendation-styles')) return;
  
  const styles = `
    <style id="dora-recommendation-styles">
      .recommendation-section {
        direction: rtl;
      }
      
      .best-seller-card {
        transition: all 0.3s ease;
      }
      
      .best-seller-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 12px 40px rgba(59,130,246,0.2);
        border-color: rgba(59,130,246,0.5);
      }
      
      .fbt-section {
        animation: fadeInUp 0.4s ease;
      }
      
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @media (max-width: 768px) {
        #recentlyViewedGrid,
        #bestSellersGrid {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 12px !important;
        }
      }
    </style>
  `;
  
  document.head.insertAdjacentHTML('beforeend', styles);
}

// ---------- 10. Initialize All ----------
document.addEventListener('DOMContentLoaded', function() {
  injectRecommendationStyles();
  
  // Inject sections after a small delay to ensure products section exists
  setTimeout(injectRecommendationSections, 500);
});
// ============================================================
// 📢 DORA MARKETING ENHANCEMENTS - تحسينات تسويقية
// ============================================================

// ---------- 1. تتبع استخدام الكوبونات ----------
var couponUsage = JSON.parse(localStorage.getItem('doraCouponUsage') || '{"WELCOME":0,"DORA10":0,"DORA20":0}');

var originalApplyCoupon = applyCoupon;
applyCoupon = function() {
    var code = (document.getElementById('couponInput') || document.getElementById('couponInputAdmin')).value.trim().toUpperCase();
    originalApplyCoupon();
    if (COUPONS[code] && activeCoupon) {
        couponUsage[code] = (couponUsage[code] || 0) + 1;
        localStorage.setItem('doraCouponUsage', JSON.stringify(couponUsage));
        try {
            supabaseClient.from('coupon_usage').insert([{
                coupon_code: code,
                discount_percent: COUPONS[code].discount * 100,
                used_at: new Date().toISOString()
            }]).then(function(){});
        } catch(e) {}
    }
};

// ---------- 2. كوبونات موسمية إضافية ----------
var SEASONAL_COUPONS = {
    'EID2025': { discount: 0.25, label: 'خصم العيد 25%', validUntil: '2025-07-15' },
    'RAMADAN': { discount: 0.20, label: 'خصم رمضان 20%', validUntil: '2025-04-15' },
    'BACK2SCHOOL': { discount: 0.15, label: 'خصم العودة للمدارس 15%', validUntil: '2025-09-15' },
    'NATIONAL': { discount: 0.30, label: 'خصم اليوم الوطني 30%', validUntil: '2025-09-23' }
};

// دمج الكوبونات الموسمية مع الأساسية
for (var key in SEASONAL_COUPONS) {
    if (SEASONAL_COUPONS.hasOwnProperty(key)) {
        var sc = SEASONAL_COUPONS[key];
        var today = new Date().toISOString().split('T')[0];
        if (sc.validUntil >= today) {
            COUPONS[key] = { discount: sc.discount, label: sc.label };
        }
    }
}

// ---------- 3. عرض سعر مخفض تلقائي في بطاقة المنتج ----------
var originalRenderProducts = renderProducts;
renderProducts = function(filter) {
    originalRenderProducts(filter);
    
    // إضافة شارة "وفر" للمنتجات اللي عليها خصم
    setTimeout(function() {
        document.querySelectorAll('.prod-card').forEach(function(card) {
            var priceEl = card.querySelector('.prod-price');
            var oldPriceEl = card.querySelector('.old-price');
            if (oldPriceEl && !card.querySelector('.save-badge')) {
                var saveBadge = document.createElement('span');
                saveBadge.className = 'save-badge';
                saveBadge.style.cssText = 'background:#10B981;color:white;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;display:inline-block;margin-right:6px;animation:pulse 2s infinite';
                saveBadge.textContent = '💰 وفر';
                priceEl.parentNode.insertBefore(saveBadge, priceEl);
            }
        });
    }, 100);
};

// ---------- 4. عرض الكوبونات المتاحة في صفحة المنتجات ----------
function showAvailableCoupons() {
    var container = document.getElementById('couponSection');
    if (!container || container.querySelector('.available-coupons')) return;
    
    var activeCoupons = [];
    for (var key in COUPONS) {
        if (COUPONS.hasOwnProperty(key)) {
            activeCoupons.push({ code: key, label: COUPONS[key].label });
        }
    }
    
    if (activeCoupons.length > 0) {
        var html = '<div class="available-coupons" style="margin-top:10px;padding:10px;background:rgba(245,158,11,0.1);border-radius:10px;border:1px dashed rgba(245,158,11,0.3)">';
        html += '<p style="font-size:11px;color:#F59E0B;margin-bottom:8px">🎟️ كوبونات متاحة:</p>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
        activeCoupons.forEach(function(c) {
            html += '<span onclick="navigator.clipboard.writeText(\'' + c.code + '\');showToast(\'✅ تم نسخ: ' + c.code + '\')" style="cursor:pointer;background:rgba(245,158,11,0.2);color:#F59E0B;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700" title="اضغط للنسخ">' + c.code + ' (' + c.label + ')</span>';
        });
        html += '</div></div>';
        container.insertAdjacentHTML('beforeend', html);
    }
}

// استدعاء عند تحميل السلة
var originalUpdateCartUI = updateCartUI;
updateCartUI = function() {
    originalUpdateCartUI();
    setTimeout(showAvailableCoupons, 300);
};

// ---------- 5. إضافة CSS للشارات التسويقية ----------
(function() {
    if (document.getElementById('dora-marketing-enhancements')) return;
    var style = document.createElement('style');
    style.id = 'dora-marketing-enhancements';
    style.textContent = '.save-badge{animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.7}}.available-coupons span:hover{background:rgba(245,158,11,0.4)!important;transform:scale(1.05)}';
    document.head.appendChild(style);
})();
    // ============================================================
// ⭐ DORA LOYALTY PROGRAM - برنامج ولاء العملاء
// ============================================================

var doraLoyalty = {
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
function showLoyaltyCard() {
    var data = doraLoyalty.getData();
    var nextTier = null;
    var tiers = ['bronze', 'silver', 'gold', 'diamond'];
    
    for (var i = 0; i < tiers.length; i++) {
        if (doraLoyalty.tiers[tiers[i]].minPoints > data.points) {
            nextTier = doraLoyalty.tiers[tiers[i]];
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
            <button onclick="redeemLoyaltyPoints()" style="width:100%;margin-top:15px;padding:12px;background:linear-gradient(135deg,#F59E0B,#D97706);color:white;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:14px">
                🎁 استبدل نقاطك (${data.points} نقطة = خصم ${doraLoyalty.redeemPoints(data.points)} ر.س)
            </button>
            ` : ''}
        </div>
    `;
}

// صرف النقاط
function redeemLoyaltyPoints() {
    var data = doraLoyalty.getData();
    var discount = doraLoyalty.redeemPoints(data.points);
    if (discount <= 0) {
        showToast('❌ تحتاج 100 نقطة على الأقل للاستبدال', 'error');
        return;
    }
    
    var pointsToUse = Math.floor(data.points / 100) * 100;
    if (confirm('هل تريد استبدال ' + pointsToUse + ' نقطة بخصم ' + discount + ' ر.س؟')) {
        data.points -= pointsToUse;
        doraLoyalty.saveData(data);
        localStorage.setItem('loyaltyDiscount', discount);
        showToast('✅ تم استبدال ' + pointsToUse + ' نقطة! الخصم: ' + discount + ' ر.س');
        showLoyaltyCard();
    }
}

// تحديث النقاط بعد الطلب
var originalPlaceOrder = window.placeOrder;
if (typeof originalPlaceOrder === 'function') {
    window.placeOrder = function() {
        var cart = JSON.parse(localStorage.getItem('doraCart') || '[]');
        var subtotal = cart.reduce(function(s, i) { return s + (i.price * i.qty); }, 0);
        var earned = doraLoyalty.addPoints(subtotal);
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
                showLoyaltyCard();
            }
        }
    }, 2000);
});
// ============================================================
// ربط أقسام الصفحة الرئيسية بـ site_items - موحد واحترافي
// ============================================================
(function(){
  function esc(v){ return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch])); }
// ===== SVG ICONS MAP =====
var doraIcons = {
  why_us: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  vision_mission: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
  projects: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path><path d="M12 12v4"></path><path d="M8 12h8"></path></svg>',
  blog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
  certifications: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>',
  contact: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
 testimonials: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>'
};

function doraIcon(sectionKey, meta) {
  if (meta && meta.icon_name && meta.icon_name.startsWith('<svg')) return meta.icon_name;
  return doraIcons[sectionKey] || doraIcons['default'];
}
    
  async function loadSection(sectionKey, containerId, renderFn) {
    var container = document.getElementById(containerId);
    if (!container) return;
    try {
      var { data } = await supabaseClient.from('site_items').select('*').eq('section_key', sectionKey).eq('is_active', true).order('sort_order');
      if (data && data.length > 0) renderFn(container, data);
    } catch(e) { console.log('Error loading ' + sectionKey, e); }
  }

  // ===== دالة مساعدة لإنشاء بطاقة why-card =====
  function cardHTML(icon, title, desc, extra) {
    return '<div class="why-card">' +
      '<div class="why-icon">' + icon + '</div>' +
      '<h4>' + esc(title) + '</h4>' +
      '<p>' + esc(desc) + '</p>' +
      (extra || '') +
      '</div>';
  }

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {

      // 1. لماذا تختارنا
      loadSection('why_us', 'whyUsGrid', function(container, items) {
        container.innerHTML = items.map(function(item) {
          var meta = item.metadata || {};
         return cardHTML(doraIcon('why_us', meta), item.title_ar || '', item.description_ar || '');
        }).join('');
      });

      // 2. رؤيتنا - رسالتنا - قيمنا
      loadSection('vision_mission', 'visionMissionGrid', function(container, items) {
        container.innerHTML = items.map(function(item) {
          var meta = item.metadata || {};
         return cardHTML(doraIcon('vision_mission', meta), item.title_ar || '', item.description_ar || '');
        }).join('');
      });

      // 3. إحصائيات about
      loadSection('hero_stats', 'aboutStats', function(container, items) {
        container.innerHTML = items.map(function(item) {
          var meta = item.metadata || {};
          return '<div class="why-card" style="text-align:center">' +
            '<div class="stat-number">' + esc(meta.number || '') + '</div>' +
            '<div style="width:30px;height:3px;background:' + esc(meta.color || '#0EA5E9') + ';margin:8px auto;border-radius:2px"></div>' +
            '<p style="font-size:14px;color:#6B7280;font-weight:600">' + esc(item.description_ar || item.title_ar || '') + '</p>' +
            '</div>';
        }).join('');
      });

      // 4. إحصائيات achievements
      loadSection('hero_stats', 'achievementsStats', function(container, items) {
        container.innerHTML = items.map(function(item) {
          var meta = item.metadata || {};
          return '<div class="why-card" style="text-align:center">' +
            '<div class="stat-number">' + esc(meta.number || '') + '</div>' +
            '<div style="width:40px;height:3px;background:' + esc(meta.color || '#0EA5E9') + ';margin:8px auto;border-radius:2px"></div>' +
            '<p style="font-size:15px;color:#6B7280;font-weight:600">' + esc(item.description_ar || item.title_ar || '') + '</p>' +
            '</div>';
        }).join('');
      });

      // 5. آراء عملائنا (أفراد) - بيستخدم renderReviews() خلاص، فمش هنتدخل فيه

      // 6. آراء كبرى الشركات
      loadSection('testimonials', 'companyTestimonialsGrid', function(container, items) {
        container.innerHTML = items.map(function(item) {
          var meta = item.metadata || {};
          var stars = '⭐'.repeat(meta.rating || 5);
          return '<div class="why-card">' +
            '<div class="why-icon">' + doraIcon('testimonials', meta) + '</div>' +
            '<div style="color:#F59E0B;margin-bottom:10px;font-size:18px">' + stars + '</div>' +
            '<h4>' + esc(item.title_ar || 'عميل') + '</h4>' +
            '<p>"' + esc(item.description_ar || '') + '"</p>' +
           '<div class="client-name">' + 
  (meta.client_logo ? '<img src="' + esc(meta.client_logo) + '" alt="logo" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-left:4px" onerror="this.style.display=\'none\'">' : '<svg style="width:14px;height:14px;vertical-align:middle;margin-left:4px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>') + 
  esc(meta.client_name || meta.company_name || 'جهة معتمدة') + 
'</div>' +
            '</div>';
        }).join('');
      });

      // 7. شركاؤنا - خلاص متعمل في loadPartners()، مش هنتدخل فيه

      // 8. مشاريعنا المنفذة
      loadSection('projects', 'projectsGridList', function(container, items) {
        container.innerHTML = items.map(function(item) {
          var meta = item.metadata || {};
          return cardHTML(doraIcon('projects', meta), item.title_ar || '', item.description_ar || '',
            '<div class="client-name">🏢 ' + esc(meta.client_name || '') + '</div>');
        }).join('');
      });

      // 9. أحدث المقالات
      loadSection('blog', 'blogGridList', function(container, items) {
        container.innerHTML = items.map(function(item) {
          var meta = item.metadata || {};
          return '<div class="why-card" style="cursor:pointer" onclick="window.open(\'' + esc(meta.link_url || '#') + '\',\'_blank\')">' +
            '<div class="why-icon">' + doraIcon('blog', meta) + '</div>' +
            '<h4>' + esc(item.title_ar || '') + '</h4>' +
            '<p>' + esc(item.description_ar || '') + '</p>' +
            '<div class="blog-meta"><span><svg style="width:14px;height:14px;vertical-align:middle;margin-left:4px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' + esc(meta.publish_date || '') + '</span><span><svg style="width:14px;height:14px;vertical-align:middle;margin-left:4px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>' + esc(meta.read_time || '') + '</span></div>' +
              '</div>';
        }).join('');
      });

      // 10. تواصل معنا
      loadSection('contact', 'contactGridList', function(container, items) {
        container.innerHTML = items.map(function(item) {
          var meta = item.metadata || {};
var icon = doraIcon('contact', meta);
          return '<div class="why-card" style="cursor:pointer" onclick="window.open(\'' + esc(meta.link_url || '#') + '\',\'_blank\')">' +
            '<div class="why-icon">' + icon + '</div>' +
            '<h4>' + esc(item.title_ar || '') + '</h4>' +
            '<p>' + esc(item.description_ar || '') + '</p>' +
            '<div class="contact-value">' + esc(meta.value || '') + '</div>' +
            '</div>';
        }).join('');
      });

      // 11. شهاداتنا واعتماداتنا
      loadSection('certifications', 'certificationsGridList', function(container, items) {
        container.innerHTML = items.map(function(item) {
          var meta = item.metadata || {};
          return cardHTML(doraIcon('certifications', meta), item.title_ar || '', item.description_ar || '',
            '<div class="cert-badge">✅ ' + esc(meta.badge_text || 'معتمد') + '</div>');
        }).join('');
      });

    }, 800);
  });
})();
})();
