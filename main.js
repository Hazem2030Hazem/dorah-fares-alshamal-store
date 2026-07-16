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

let productsData = JSON.parse(localStorage.getItem('doraProducts')) || [
 {id:1, name:"طابعة HP LaserJet Pro M404n", price:1299, oldPrice:1499, stock:5, category:"printers", badge:"الأكثر مبيعاً", image:"https://images.unsplash.com/photo-1612815154858-60aa4c43e64e?w=400&h=300&fit=crop", desc:"طابعة ليزر أحادية اللون، سرعة طباعة 40 صفحة/دقيقة، دعم الشبكة السلكية", rating:4.8, reviews:[{author:"أحمد",date:"2024-06-15",stars:5,text:"طابعة ممتازة وسرعة طباعة رائعة"},{author:"محمد",date:"2024-06-10",stars:4,text:"جودة جيدة لكن السعر مرتفع قليلاً"}]},
 {id:2, name:"طابعة Canon PIXMA G6020", price:999, oldPrice:1199, stock:12, category:"printers", badge:"جديد", image:"https://images.unsplash.com/photo-1569091791842-7cfb64e04797?w=400&h=300&fit=crop", desc:"طابعة حبر فائقة الاقتصاد، خزان حبر قابل لإعادة الملء، طباعة حتى 7700 صفحة", rating:4.5, reviews:[{author:"سعد",date:"2024-06-20",stars:5,text:"توفير كبير في الحبر"}]},
 {id:3, name:"طابعة Epson EcoTank L3250", price:849, oldPrice:999, stock:3, category:"printers", badge:"خصم", image:"https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop", desc:"طابعة 3 في 1 بتقنية EcoTank، تكلفة طباعة منخفضة جداً", rating:4.3, reviews:[]},
 {id:4, name:"طابعة Brother HL-L2350DW", price:749, stock:8, category:"printers", badge:"", image:"https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=400&h=300&fit=crop", desc:"طابعة ليزر مع WiFi، طباعة تلقائية على الوجهين، مثالية للمنزل", rating:4.6, reviews:[{author:"خالد",date:"2024-05-28",stars:4,text:"جيدة للاستخدام المنزلي"}]},
 {id:5, name:"كمبيوتر Dell OptiPlex 7090", price:3499, oldPrice:3999, stock:7, category:"computers", badge:"الأكثر مبيعاً", image:"https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=400&h=300&fit=crop", desc:"كمبيوتر مكتبي للأعمال، Intel Core i7، 16GB رام، 512GB SSD", rating:4.9, reviews:[{author:"فهد",date:"2024-06-18",stars:5,text:"أداء ممتاز للأعمال"}]},
 {id:6, name:"لابتوب HP ProBook 450 G8", price:2899, oldPrice:3299, stock:4, category:"computers", badge:"جديد", image:"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop", desc:"لابتوب أعمال 15.6 بوصة، Intel Core i5، شاشة FHD، بطارية تدوم طوال اليوم", rating:4.4, reviews:[]},
 {id:7, name:"كمبيوتر Lenovo ThinkCentre M70q", price:2199, oldPrice:2499, stock:2, category:"computers", badge:"خصم", image:"https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=400&h=300&fit=crop", desc:"كمبيوتر صغير الحجم (Tiny)، أداء قوي بتصميم مدمج للمساحات المحدودة", rating:4.2, reviews:[{author:"عبدالله",date:"2024-06-01",stars:4,text:"حجم صغير وأداء جيد"}]},
 {id:8, name:"لابتوب Dell Latitude 3520", price:2599, stock:9, category:"computers", badge:"", image:"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop", desc:"لابتوب أعمال موثوق، شاشة 15.6 بوصة FHD، معالج Intel Core i5", rating:4.5, reviews:[]},
 {id:9, name:"رام Kingston DDR4 16GB 3200MHz", price:299, oldPrice:349, stock:25, category:"ram", badge:"الأكثر مبيعاً", image:"https://images.unsplash.com/photo-1562976540-3602a999dd8c?w=400&h=300&fit=crop", desc:"ذاكرة Kingston FURY Beast DDR4، سرعة 3200MHz، مثالية للألعاب", rating:4.7, reviews:[{author:"ناصر",date:"2024-06-12",stars:5,text:"سرعة ممتازة وسعر منافس"}]},
 {id:10, name:"رام Corsair Vengeance DDR4 32GB", price:549, oldPrice:649, stock:15, category:"ram", badge:"جديد", image:"https://images.unsplash.com/photo-1592664857866-c6e56c5f9f7?w=400&h=300&fit=crop", desc:"ذاكرة Corsair Vengeance RGB Pro، 32GB، سرعة 3600MHz، إضاءة RGB", rating:4.8, reviews:[]},
 {id:11, name:"رام Crucial DDR4 8GB 2666MHz", price:149, oldPrice:199, stock:30, category:"ram", badge:"خصم", image:"https://images.unsplash.com/photo-1628556270448-4d4e6a4d57c1?w=400&h=300&fit=crop", desc:"ذاكرة Crucial DDR4 موثوقة، 8GB، سرعة 2666MHz، متوافقة مع الأجهزة المحمولة", rating:4.1, reviews:[{author:"سلطان",date:"2024-05-20",stars:4,text:"جيدة للاستخدام الأساسي"}]},
 {id:12, name:"رام G.Skill Trident Z5 DDR5 32GB", price:799, oldPrice:899, stock:6, category:"ram", badge:"جديد", image:"https://images.unsplash.com/photo-1624705002806-5d72df19c3ad?w=400&h=300&fit=crop", desc:"ذاكرة DDR5 الجيل الجديد، 32GB، سرعة 5600MHz، أداء فائق", rating:4.9, reviews:[]},
 {id:13, name:"SSD Samsung 980 NVMe 1TB", price:449, oldPrice:499, stock:18, category:"storage", badge:"الأكثر مبيعاً", image:"https://images.unsplash.com/photo-1597872252721-5c3e0f4353f2?w=400&h=300&fit=crop", desc:"قرص SSD NVMe M.2 سعة 1TB، سرعة قراءة 3500MB/s، سرعة كتابة 3000MB/s", rating:4.8, reviews:[{author:"بندر",date:"2024-06-14",stars:5,text:"سرعة خرافية مقارنة بالHDD"}]},
 {id:14, name:"SSD Kingston NV2 500GB", price:199, oldPrice:249, stock:22, category:"storage", badge:"جديد", image:"https://images.unsplash.com/photo-1531492746076-161ca9bcad29?w=400&h=300&fit=crop", desc:"قرص SSD NVMe PCIe 4.0، سعة 500GB، سرعة قراءة 3500MB/s", rating:4.3, reviews:[]},
 {id:15, name:"هارد ديسك WD Blue 2TB", price:299, oldPrice:349, stock:14, category:"storage", badge:"خصم", image:"https://images.unsplash.com/photo-1555664424-778a69022365?w=400&h=300&fit=crop", desc:"قرص صلب 3.5 بوصة سعة 2TB، سرعة 7200RPM، كاش 256MB", rating:4.4, reviews:[{author:"ماجد",date:"2024-06-08",stars:4,text:"سعة كبيرة بسعر جيد"}]},
 {id:16, name:"SSD Crucial MX500 1TB SATA", price:379, stock:11, category:"storage", badge:"", image:"https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=400&h=300&fit=crop", desc:"قرص SSD SATA 2.5 بوصة سعة 1TB، سرعة قراءة 560MB/s، ضمان 5 سنوات", rating:4.5, reviews:[]},
 {id:17, name:"كابل HDMI 2.1 UGREEN 2M", price:89, oldPrice:109, stock:50, category:"cables", badge:"الأكثر مبيعاً", image:"https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop", desc:"كابل HDMI 2.1 عالي الجودة، يدعم 8K@60Hz و 4K@120Hz، طول 2 متر", rating:4.6, reviews:[{author:"تركي",date:"2024-06-11",stars:5,text:"جودة ممتازة وواضح جداً"}]},
 {id:18, name:"كابل USB-C to USB-C 3.1", price:59, oldPrice:79, stock:35, category:"cables", badge:"خصم", image:"https://images.unsplash.com/photo-1625153666466-233456c5f9f7?w=400&h=300&fit=crop", desc:"كابل USB-C عالي السرعة، يدعم الشحن السريع 60W ونقل البيانات 10Gbps", rating:4.2, reviews:[]},
 {id:19, name:"كابل DisplayPort 1.4 4K", price:79, stock:28, category:"cables", badge:"جديد", image:"https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=400&h=300&fit=crop", desc:"كابل DisplayPort 1.4، يدعم 4K@144Hz و 8K@60Hz، مثالي للألعاب", rating:4.5, reviews:[]},
 {id:20, name:"وصلة VGA to HDMI محول", price:69, stock:42, category:"cables", badge:"", image:"https://images.unsplash.com/photo-1550009158-9ebf690569ba?w=400&h=300&fit=crop", desc:"محول VGA إلى HDMI مع صوت، لتوصيل الأجهزة القديمة بشاشات حديثة", rating:3.9, reviews:[{author:"فيصل",date:"2024-05-15",stars:3,text:"يعمل لكن الجودة متوسطة"}]},
 {id:21, name:"بروجكتور Epson EB-E01 XGA", price:1899, oldPrice:2199, stock:5, category:"projectors", badge:"الأكثر مبيعاً", image:"https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=300&fit=crop", desc:"بروجكتور Epson للأعمال والتعليم، سطوع 3300 لومن، دقة XGA", rating:4.7, reviews:[{author:"ياسر",date:"2024-06-16",stars:5,text:"سطوع ممتاز للقاعات"}]},
 {id:22, name:"بروجكتور ViewSonic PA503W WXGA", price:1499, oldPrice:1799, stock:3, category:"projectors", badge:"جديد", image:"https://images.unsplash.com/photo-1517604931442-710c8ef5ad25?w=400&h=300&fit=crop", desc:"بروجكتور ViewSonic متعدد الاستخدامات، سطوع 3600 لومن، دقة WXGA", rating:4.4, reviews:[]},
 {id:23, name:"بروجكتور BenQ MS560 SVGA", price:999, oldPrice:1199, stock:7, category:"projectors", badge:"خصم", image:"https://images.unsplash.com/photo-1535016120720-40c646be5580?w=400&h=300&fit=crop", desc:"بروجكتور BenQ اقتصادي، سطوع 4000 لومن، دقة SVGA", rating:4.0, reviews:[{author:"هيثم",date:"2024-05-25",stars:4,text:"جيد للعرض التقديمي"}]},
 {id:24, name:"بروجكتور محمول Anker Nebula", price:1299, oldPrice:1499, stock:4, category:"projectors", badge:"جديد", image:"https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop", desc:"بروجكتور ذكي محمول، Android TV مدمج، سطوع 200 ANSI لومن، بطارية 2.5 ساعة", rating:4.6, reviews:[]},
 {id:25, name:"ماوس لاسلكي Logitech MX Master 3S", price:399, oldPrice:449, stock:20, category:"accessories", badge:"الأكثر مبيعاً", image:"https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=300&fit=crop", desc:"ماوس احترافي لاسلكي، استشعار 8000 DPI، عجلة MagSpeed", rating:4.9, reviews:[{author:"عمر",date:"2024-06-19",stars:5,text:"أفضل ماوس استخدمته في حياتي"}]},
 {id:26, name:"كيبورد ميكانيكي Keychron K2", price:449, oldPrice:499, stock:8, category:"accessories", badge:"جديد", image:"https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=300&fit=crop", desc:"كيبورد ميكانيكي لاسلكي 75%، مفاتيح Gateron G Pro، إضاءة RGB", rating:4.7, reviews:[]},
 {id:27, name:"سماعات رأس JBL Tune 760NC", price:349, oldPrice:399, stock:16, category:"accessories", badge:"خصم", image:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop", desc:"سماعات رأس لاسلكية مع إلغاء الضوضاء النشط، صوت JBL Pure Bass، بطارية 35 ساعة", rating:4.3, reviews:[{author:"راكان",date:"2024-06-05",stars:4,text:"صوت جيد لكن إلغاء الضوضاء متوسط"}]},
 {id:28, name:"هاب USB 3.0 Anker 7-Port", price:149, stock:33, category:"accessories", badge:"", image:"https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400&h=300&fit=crop", desc:"هاب USB 3.0 بـ 7 منافذ، سرعة نقل 5Gbps، مصدر طاقة 36W مدمج", rating:4.4, reviews:[]},
 {id:29, name:"حبر HP 305XL أسود عالي الإنتاجية", price:89, oldPrice:119, stock:45, category:"ink", badge:"الأكثر مبيعاً", image:"https://images.unsplash.com/photo-1612815154858-60aa4c43e64e?w=400&h=300&fit=crop", desc:"حبر أصلي HP 305XL أسود، يطبع حتى 400 صفحة، متوافق مع طابعات HP DeskJet", rating:4.7, reviews:[{author:"سعد",date:"2024-06-20",stars:5,text:"جودة ممتازة ويعمل بكفاءة"}]},
 {id:30, name:"حبر Canon PG-445 ملون", price:75, stock:38, category:"ink", badge:"", image:"https://images.unsplash.com/photo-1569091791842-7cfb64e04797?w=400&h=300&fit=crop", desc:"حبر Canon أصلي ملون (C/M/Y)، يطبع حتى 180 صفحة ملونة", rating:4.3, reviews:[]},
 {id:31, name:"حبر Epson 103 عبوة إعادة ملء", price:45, oldPrice:59, stock:52, category:"ink", badge:"خصم", image:"https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop", desc:"حبر Epson 103 للطابعات EcoTank، عبوة إعادة ملء اقتصادية", rating:4.5, reviews:[{author:"خالد",date:"2024-06-15",stars:4,text:"توفير كبير مقارنة بالعبوات العادية"}]},
 {id:32, name:"حبر Brother TN-2420 أسود", price:129, stock:22, category:"ink", badge:"جديد", image:"https://images.unsplash.com/photo-1589652717521-10c0d092dea9?w=400&h=300&fit=crop", desc:" toner Brother TN-2420 أسود، يطبع حتى 3000 صفحة، متوافق مع طابعات Brother الليزر", rating:4.6, reviews:[]},
 {id:33, name:"عسل سدر طبيعي 100%", price:120, oldPrice:150, stock:20, category:"food", badge:"الأكثر مبيعاً", image:"https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop", desc:"عسل سدر طبيعي 100% من إنتاج محلي، وزن 500 جرام، جودة ممتازة", rating:4.9, reviews:[{author:"فهد",date:"2024-06-18",stars:5,text:"أفضل عسل جربته، طعم أصلي"}]},
 {id:34, name:"تمور صقعي فاخرة 1 كجم", price:85, stock:35, category:"food", badge:"", image:"https://images.unsplash.com/photo-1596386461350-326256694e69?w=400&h=300&fit=crop", desc:"تمور صقعي فاخرة من المدينة المنورة، طازجة وعالية الجودة، وزن 1 كجم", rating:4.7, reviews:[]},
 {id:35, name:"زيت زيتون بكر ممتاز 1 لتر", price:65, oldPrice:79, stock:28, category:"food", badge:"خصم", image:"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=300&fit=crop", desc:"زيت زيتون بكر ممتاز، عصرة أولى، إنتاج مزارع محلية، 1 لتر", rating:4.5, reviews:[{author:"ناصر",date:"2024-06-12",stars:4,text:"جودة ممتازة وسعر منافس"}]},
 {id:36, name:"قهوة عربية فاخرة 250 جرام", price:55, stock:40, category:"food", badge:"جديد", image:"https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=300&fit=crop", desc:"قهوة عربية فاخرة محمصة، مزيج تقليدي أصيل، وزن 250 جرام", rating:4.8, reviews:[]}
];

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
 // Ctrl + Alt + H → Open admin page directly
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

function toggleWishlist(productId, event) {
 if (event) event.stopPropagation();
 const index = wishlist.indexOf(productId);
 if (index > -1) {
  wishlist.splice(index, 1);
  showToast('💔 تمت الإزالة من المفضلة', 'warning');
 } else {
  wishlist.push(productId);
  showToast('❤️ تمت الإضافة للمفضلة');
 }
 localStorage.setItem('doraWishlist', JSON.stringify(wishlist));
 renderProducts(currentFilter);
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

function addToCart(productId) {
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
 document.getElementById('cartCount').textContent = count;

 const itemsDiv = document.getElementById('cartItems');
 if (cart.length === 0) {
  itemsDiv.innerHTML = `
   <div class="cart-empty">
    <span class="icon">🛒</span>
    <p>السلة فارغة</p>
    <small>أضف منتجات لبدء التسوق</small>
   </div>`;
  document.getElementById('couponSection').style.display = 'none';
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
  document.getElementById('couponSection').style.display = 'block';
 }

 const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
 const discount = activeCoupon ? Math.round(subtotal * activeCoupon.discount) : 0;
 const afterDiscount = subtotal - discount;
 const tax = calculateTax(afterDiscount);
 const total = afterDiscount + tax;

 document.getElementById('cartTotal').textContent = formatPrice(total);
 document.getElementById('cartTax').textContent = `شامل الضريبة (15%): ${formatPrice(tax)}${discount > 0 ? ' | خصم: ' + formatPrice(discount) : ''}`;
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

function checkout() {
 if (cart.length === 0) {
  showToast('السلة فارغة! أضف منتجات أولاً', 'warning');
  return;
 }

 const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
 const discount = activeCoupon ? Math.round(subtotal * activeCoupon.discount) : 0;
 const afterDiscount = subtotal - discount;
 const tax = calculateTax(afterDiscount);
 const total = afterDiscount + tax;

 let msg = '*طلب جديد من شركة درة فارس الشمال*\n\n';
 msg += '*المنتجات:*\n';
 cart.forEach((item, i) => {
  msg += `${i+1}. ${item.name}\n  الكمية: ${item.qty}\n  السعر: ${item.price.toLocaleString()} ر.س\n  المجموع: ${(item.price*item.qty).toLocaleString()} ر.س\n\n`;
 });
 msg += `*المجموع الفرعي: ${subtotal.toLocaleString()} ر.س*\n`;
 if (discount > 0) msg += `*الخصم: ${discount.toLocaleString()} ر.س*\n`;
 msg += `*الضريبة (15%): ${tax.toLocaleString()} ر.س*\n`;
 msg += `*المجموع الكلي: ${total.toLocaleString()} ر.س*\n\n`;
 msg += 'يرجى تأكيد الطلب.';

 const choice = confirm('اضغط "موافق" للتواصل عبر الرقم الأول (+966 56 871 7449)\n\nاضغط "إلغاء" للتواصل عبر الرقم الثاني (+966 54 535 8773)');
 const phone = choice ? '966568717449' : '966545358773';
 window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('doraTheme', next);

  // Direct style manipulation for immediate effect
  if (next === 'dark') {
    document.body.style.setProperty('background', '#ffffff', 'important');
    document.body.style.setProperty('background-image', 'none', 'important');
    document.body.style.setProperty('background-size', '100% 100%', 'important');
    document.body.style.setProperty('animation', 'none', 'important');
  } else {
    document.body.style.setProperty('background', '#ffffff', 'important');
    document.body.style.setProperty('background-image', 'none', 'important');
    document.body.style.setProperty('background-size', '100% 100%', 'important');
    document.body.style.setProperty('animation', 'none', 'important');
  }

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

  // Direct style manipulation for immediate effect
  if (saved === 'dark') {
    document.body.style.setProperty('background', '#ffffff', 'important');
    document.body.style.setProperty('background-image', 'none', 'important');
    document.body.style.setProperty('background-size', '100% 100%', 'important');
    document.body.style.setProperty('animation', 'none', 'important');
  } else {
    document.body.style.setProperty('background', '#ffffff', 'important');
    document.body.style.setProperty('background-image', 'none', 'important');
    document.body.style.setProperty('background-size', '100% 100%', 'important');
    document.body.style.setProperty('animation', 'none', 'important');
  }

  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    if (saved === 'dark') {
      themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    } else {
      themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    }
  }
}
function requestQuote(productId, event) {
 if (event) event.stopPropagation();
 const p = productsData.find(x => x.id === productId);
 if (!p) return;

 const msg = `مرحباً شركة درة فارس الشمال،

أرغب في طلب عرض سعر للمنتج التالي:

📦 المنتج: ${p.name}
💰 السعر المعروض: ${p.price.toLocaleString()} ر.س
📊 التصنيف: ${catLabels[p.category]}

يرجى إرسال عرض السعر والتواصل معي.
شكراً.`;

 window.open('https://wa.me/966568717449?text=' + encodeURIComponent(msg), '_blank');
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
 setTimeout(() => toast.classList.remove('show'), 10000); // 10 seconds for user to read
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

// Get the audio element - use the global one from the autoplay script
function getAudioElement() {
  // First try the global audio from the autoplay script
  if (window.doraAudio) return window.doraAudio;

  // Fallback: find any audio element in the DOM
  const audios = document.querySelectorAll('audio');
  if (audios.length > 0) return audios[0];

  // If not found, create one with the same URL
  const AUDIO_URL = 'https://raw.githubusercontent.com/Hazem2030Hazem/dorah-fares-alshamal-store/refs/heads/main/music.mp3';
  const newAudio = new Audio(AUDIO_URL);
  newAudio.loop = true;
  newAudio.volume = 0.30;
  newAudio.preload = 'auto';
  window.doraAudio = newAudio;
  return newAudio;
}

// Set volume with higher max (up to 200% using exponential curve)
function setAudioVolume(percentage) {
  // percentage is 0-100
  // Use exponential curve for louder perceived volume
  // 0% -> 0.0, 50% -> 0.5, 100% -> 1.0 (but we can go higher with exponential)
  const normalizedVolume = percentage / 100;

  // Use exponential curve: volume = normalizedVolume^2 * 2
  // This gives: 0% -> 0, 50% -> 0.5, 100% -> 2.0 (200%)
  const gainValue = Math.min(2.0, normalizedVolume * normalizedVolume * 2);

  const audio = getAudioElement();
  if (audio) {
    // Standard audio volume (0.0 - 1.0)
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
    // Update slider position based on current volume
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

  // For RTL (Arabic): 
  // The slider is horizontal but RTL means right-to-left
  // We need to calculate based on the click position relative to the slider width

  const clickX = e.clientX - rect.left;

  // For RTL: 
  // clickX = 0 means right edge (100% volume)
  // clickX = sliderWidth means left edge (0% volume)
  // So percentage = 100 - (clickX / sliderWidth * 100)
  let percentage = 100 - ((clickX / sliderWidth) * 100);
  percentage = Math.max(0, Math.min(100, percentage));

  currentVolume = percentage / 100;

  // Update visual elements
  const fill = document.getElementById('volumeSliderFill');
  const thumb = document.getElementById('volumeSliderThumb');
  const value = document.getElementById('volumeValue');

  if (fill) fill.style.width = percentage + '%';

  // Move thumb to follow the fill position
  // For RTL: thumb position = percentage from the right
  if (thumb) {
    thumb.style.left = 'auto';
    thumb.style.right = (percentage - 1) + '%';
  }

  if (value) value.textContent = Math.round(percentage) + '%';

  // Update the actual audio volume
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

// Close popup when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.audio-toggle-wrapper')) {
    const popup = document.getElementById('audioVolumePopup');
    if (popup) {
      popup.classList.remove('show');
      audioVolumePopupOpen = false;
    }
  }
});

// Drag support for slider
document.addEventListener('DOMContentLoaded', function() {
  const slider = document.getElementById('volumeSlider');
  if (slider) {
    slider.addEventListener('mousedown', function(e) {
      isDraggingVolume = true;
      setVolumeFromClick(e);
    });
  }

  document.addEventListener('mousemove', function(e) {
    if (isDraggingVolume) {
      setVolumeFromClick(e);
    }
  });

  document.addEventListener('mouseup', function() {
    isDraggingVolume = false;
  });

  // Touch support for mobile
  document.addEventListener('touchmove', function(e) {
    if (isDraggingVolume && e.touches[0]) {
      const touch = e.touches[0];
      const mouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        stopPropagation: function() {}
      };
      setVolumeFromClick(mouseEvent);
    }
  });

  document.addEventListener('touchend', function() {
    isDraggingVolume = false;
  });
});
document.addEventListener('DOMContentLoaded', () => {
 initTheme();
 checkPWAInstallState();
 renderReviews();

 // Register Service Worker for PWA
 if ('serviceWorker' in navigator) {
   navigator.serviceWorker.register('sw.js')
     .then(function(registration) {
       console.log('✅ Service Worker registered:', registration.scope);
     })
     .catch(function(error) {
       console.log('❌ Service Worker registration failed:', error);
     });
 }
 renderProducts('all');
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
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function openSiteRatingModal() {
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

    if (!name || !comment) {
        showToast('❌ الرجاء ملء جميع الحقول المطلوبة', 'error');
        return;
    }

    // Show loading
    const form = document.getElementById('siteRatingForm');
    const submitBtn = form.querySelector('.rating-submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ جاري الإرسال...';
    submitBtn.disabled = true;

    try {
        const review = {
            name: name,
            product: product || 'الموقع عامةً',
            text: comment,
            rating: rating
        };

        console.log('Submitting review:', review);

        const { data, error } = await supabaseClient.from('reviews').insert([review]);

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Review saved:', data);

        closeSiteRatingModal();
        document.getElementById('siteRaterName').value = '';
        document.getElementById('siteRaterProduct').value = '';
        document.getElementById('siteRaterComment').value = '';
        setRating(5);
        showToast('✅ شكراً لتقييمك! تم حفظ التقييم بنجاح');
        await renderReviews();

    } catch (error) {
        console.error('Error saving review:', error);
        showToast('❌ حدث خطأ! ' + (error.message || 'حاول مرة أخرى'), 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}async function submitProductRating() {
    const name = document.getElementById('productRaterName').value.trim();
    const comment = document.getElementById('productRaterComment').value.trim();
    const rating = parseInt(document.getElementById('productRatingValue').value);
    const productId = parseInt(document.getElementById('productRatingId').value);

    if (!name || !comment) {
        showToast('❌ الرجاء ملء جميع الحقول المطلوبة', 'error');
        return;
    }

    const product = productsData.find(p => p.id === productId);
    const productName = product ? product.name : 'منتج';

    // Show loading
    const form = document.getElementById('productRatingForm');
    const submitBtn = form.querySelector('.rating-submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ جاري الإرسال...';
    submitBtn.disabled = true;

    try {
        const review = {
            name: name,
            product: productName,
            productId: productId,
            comment: comment,
            rating: rating,
            type: 'product',
            timestamp: new Date().toISOString()
        };

        await supabaseClient.from('reviews').insert([{name: review.name, product: review.product, text: review.comment, rating: review.rating, date: new Date().toLocaleDateString('ar-SA'), status: 'new'}]);

        // Also add to product reviews locally
        if (product) {
            if (!product.reviews) product.reviews = [];
            product.reviews.push({
                author: name,
                date: new Date().toISOString().split('T')[0],
                stars: rating,
                text: comment
            });
            const totalStars = product.reviews.reduce((sum, r) => sum + r.stars, 0);
            product.rating = Math.round((totalStars / product.reviews.length) * 10) / 10;
            localStorage.setItem('doraProducts', JSON.stringify(productsData));
        }

        // Close modal first
        closeProductRatingModal();

        // Reset form
        document.getElementById('productRaterName').value = '';
        document.getElementById('productRaterComment').value = '';
        setProductRating(5);

        // Show success message
        showToast('✅ شكراً لتقييم المنتج! تم حفظ التقييم بنجاح');

        // Refresh
        await renderReviews();
        renderProducts(currentFilter);
    } catch (error) {
        console.error('Error saving product review:', error);
        showToast('❌ حدث خطأ! حاول مرة أخرى', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function renderReviews() {
    const reviewsGrid = document.getElementById('reviewsGrid');
    if (!reviewsGrid) return;

    try {
        console.log('Fetching reviews from Supabase...');
        const { data: reviewsData, error } = await supabaseClient.from('reviews').select('*').order('id', {ascending: false});

        if (error) {
            console.error('Error fetching reviews:', error);
            return;
        }

        console.log('Reviews fetched:', reviewsData);

        let reviews = [];

        if (reviewsData && reviewsData.length > 0) {
            reviews = reviewsData.map(r => ({
                name: r.name || 'زائر',
                product: r.product || 'الموقع عامةً',
                comment: r.text || '',
                rating: r.rating || 5,
                date: r.date || new Date().toLocaleDateString('ar-SA')
            }));
        }

        if (reviews.length === 0) {
            reviews = [
                {name: 'محمد العتيبي', product: 'طابعة HP LaserJet', comment: 'تم تركيب نظام الطباعة بالكامل خلال يوم واحد فقط.', rating: 5, date: '2024-06-15'},
                {name: 'أحمد السبيعي', product: 'كاميرات المراقبة', comment: 'تعاملنا مع درة فارس الشمال في تركيب كاميرات المراقبة.', rating: 5, date: '2024-06-10'},
                {name: 'فهد الدوسري', product: 'نقاط البيع', comment: 'صيانة سريعة ودعم فني على مدار الساعة.', rating: 5, date: '2024-06-08'}
            ];
        }

        reviewsGrid.innerHTML = reviews.map(r => {
            const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
            return `
                <div class="review-card">
                    <div class="review-card-header">
                        <span class="review-card-author">${r.name}</span>
                        <span class="review-card-date">${r.date}</span>
                    </div>
                    <div class="review-card-stars">${stars}</div>
                    <p class="review-card-text">${r.comment}</p>
                    <div class="review-card-product">📦 ${r.product}</div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error in renderReviews:', error);
    }
}// ===== PWA INSTALL PROMPT =====
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
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
        showToast('📱 التطبيق مثبت بالفعل!');
        return;
    }

    // Try deferredPrompt (Chrome/Desktop/Android)
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('✅ User accepted the install prompt');
                showToast('✅ تم تثبيت التطبيق بنجاح!');
            } else {
                console.log('⚠️ User dismissed the install prompt');
                showToast('⚠️ تم إلغاء التثبيت');
            }
            deferredPrompt = null;
        }).catch((err) => {
            console.error('❌ Error showing install prompt:', err);
            showToast('❌ حدث خطأ في التثبيت');
        });
    } else {
        // If no deferredPrompt, show instructions
        showToast('⚠️ جرب تحديث الصفحة (F5) أو استخدم القائمة ⋮ → Install');
    }
}function dismissInstallPrompt() {
  const prompt = document.getElementById('installPrompt');
  if (prompt) {
    prompt.classList.remove('show');
    localStorage.setItem('doraInstallPromptDismissed', 'true');
  }
}

function checkPWAInstallState() {
  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true) {
    console.log('✅ PWA already installed');
    const prompt = document.getElementById('installPrompt');
    if (prompt) {
      prompt.classList.remove('show');
    }
    return;
  }

  // Check if user dismissed before
  if (localStorage.getItem('doraInstallPromptDismissed')) {
    console.log('ℹ️ Prompt previously dismissed');
    const prompt = document.getElementById('installPrompt');
    if (prompt) {
      prompt.classList.remove('show');
    }
    return;
  }

  // Show prompt by default (it will work when clicked)
  console.log('ℹ️ Checking PWA install state...');
  const prompt = document.getElementById('installPrompt');
  if (prompt) {
    // Only show if we have deferred prompt or after a delay
    if (deferredPrompt) {
      prompt.classList.add('show');
    }
  }
}