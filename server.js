const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;

const products = [
    { id: 1, name: "سماعات لاسلكية فاخرة", category: "electronics", price: 299, oldPrice: 450, rating: 4.8, reviews: 128, badge: "sale", icon: "🎧", stock: 15 },
    { id: 2, name: "ساعة ذكية رياضية", category: "electronics", price: 499, oldPrice: null, rating: 4.6, reviews: 89, badge: "new", icon: "⌚", stock: 20 },
    { id: 3, name: "حقيبة يد جلدية", category: "fashion", price: 349, oldPrice: 500, rating: 4.9, reviews: 234, badge: "sale", icon: "👜", stock: 8 },
    { id: 4, name: "طقم أواني منزلية", category: "home", price: 199, oldPrice: null, rating: 4.5, reviews: 67, badge: "new", icon: "🏺", stock: 25 },
    { id: 5, name: "مجموعة عناية بالبشرة", category: "beauty", price: 159, oldPrice: 220, rating: 4.7, reviews: 156, badge: "sale", icon: "✨", stock: 30 },
    { id: 6, name: "حذاء رياضي عصري", category: "fashion", price: 279, oldPrice: null, rating: 4.4, reviews: 98, badge: "new", icon: "👟", stock: 12 },
    { id: 7, name: "مصباح طاولة مودرن", category: "home", price: 129, oldPrice: 180, rating: 4.6, reviews: 45, badge: "sale", icon: "💡", stock: 18 },
    { id: 8, name: "كاميرا رقمية احترافية", category: "electronics", price: 1299, oldPrice: null, rating: 4.9, reviews: 312, badge: "new", icon: "📷", stock: 5 }
];

const HTML_PAGE = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>متجر دورا فارس | Dora Fares Store</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
:root {
    --primary: #6C5CE7;
    --primary-dark: #5B4BC4;
    --secondary: #00CEC9;
    --accent: #FD79A8;
    --dark: #2D3436;
    --light: #F8F9FA;
    --gray: #636E72;
    --gradient: linear-gradient(135deg, #6C5CE7 0%, #00CEC9 100%);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Tajawal', sans-serif;
    background: var(--light);
    color: var(--dark);
    overflow-x: hidden;
}

.header {
    background: white;
    box-shadow: 0 2px 20px rgba(0,0,0,0.08);
    position: fixed;
    width: 100%;
    top: 0;
    z-index: 1000;
    transition: all 0.3s;
}

.header.scrolled {
    box-shadow: 0 4px 30px rgba(0,0,0,0.12);
}

.header-inner {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 70px;
}

.logo {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
}

.logo-icon {
    width: 45px;
    height: 45px;
    background: var(--gradient);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
}

.logo-text {
    font-size: 24px;
    font-weight: 800;
    background: var(--gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.nav-links {
    display: flex;
    gap: 35px;
    list-style: none;
}

.nav-links a {
    text-decoration: none;
    color: var(--gray);
    font-weight: 500;
    font-size: 16px;
    transition: all 0.3s;
    position: relative;
}

.nav-links a:hover,
.nav-links a.active {
    color: var(--primary);
}

.nav-links a::after {
    content: '';
    position: absolute;
    bottom: -5px;
    right: 0;
    width: 0;
    height: 3px;
    background: var(--gradient);
    border-radius: 2px;
    transition: width 0.3s;
}

.nav-links a:hover::after,
.nav-links a.active::after {
    width: 100%;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 20px;
}

.search-box {
    position: relative;
}

.search-box input {
    width: 250px;
    padding: 10px 40px 10px 15px;
    border: 2px solid #E8E8E8;
    border-radius: 25px;
    font-family: 'Tajawal', sans-serif;
    font-size: 14px;
    outline: none;
    transition: all 0.3s;
}

.search-box input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(108,92,231,0.1);
}

.search-box i {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--gray);
}

.cart-btn, .user-btn {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 2px solid #E8E8E8;
    background: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: var(--dark);
    transition: all 0.3s;
    position: relative;
}

.cart-btn:hover, .user-btn:hover {
    border-color: var(--primary);
    color: var(--primary);
    transform: translateY(-2px);
}

.cart-count {
    position: absolute;
    top: -5px;
    left: -5px;
    background: var(--accent);
    color: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
}

.mobile-menu-btn {
    display: none;
    background: none;
    border: none;
    font-size: 24px;
    color: var(--dark);
    cursor: pointer;
}

.hero {
    margin-top: 70px;
    min-height: 85vh;
    background: var(--gradient);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
}

.hero::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.hero-inner {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 30px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: center;
    position: relative;
    z-index: 1;
}

.hero-content h1 {
    font-size: 56px;
    font-weight: 800;
    color: white;
    line-height: 1.2;
    margin-bottom: 20px;
}

.hero-content h1 span {
    color: #FFEaa7;
}

.hero-content p {
    font-size: 20px;
    color: rgba(255,255,255,0.9);
    margin-bottom: 35px;
    line-height: 1.8;
}

.hero-btns {
    display: flex;
    gap: 15px;
}

.btn {
    padding: 14px 35px;
    border-radius: 30px;
    font-family: 'Tajawal', sans-serif;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
    border: none;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.btn-primary {
    background: white;
    color: var(--primary);
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.btn-primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 40px rgba(0,0,0,0.3);
}

.btn-outline {
    background: transparent;
    color: white;
    border: 2px solid rgba(255,255,255,0.5);
}

.btn-outline:hover {
    background: rgba(255,255,255,0.1);
    border-color: white;
}

.hero-image {
    position: relative;
}

.hero-image img {
    width: 100%;
    max-width: 550px;
    border-radius: 30px;
    box-shadow: 0 30px 60px rgba(0,0,0,0.3);
    animation: float 6s ease-in-out infinite;
}

@keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
}

.floating-card {
    position: absolute;
    background: white;
    padding: 15px 20px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    animation: float 4s ease-in-out infinite;
}

.floating-card.card-1 {
    top: 20%;
    left: -30px;
    animation-delay: 0s;
}

.floating-card.card-2 {
    bottom: 20%;
    right: -20px;
    animation-delay: 2s;
}

.floating-card i {
    color: var(--secondary);
    font-size: 24px;
    margin-left: 10px;
}

.floating-card span {
    font-weight: 700;
    color: var(--dark);
}

.categories {
    padding: 80px 30px;
    max-width: 1400px;
    margin: 0 auto;
}

.section-header {
    text-align: center;
    margin-bottom: 50px;
}

.section-header h2 {
    font-size: 36px;
    font-weight: 800;
    color: var(--dark);
    margin-bottom: 10px;
}

.section-header p {
    color: var(--gray);
    font-size: 18px;
}

.categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 25px;
}

.category-card {
    background: white;
    border-radius: 20px;
    padding: 30px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;
    border: 2px solid transparent;
}

.category-card:hover {
    transform: translateY(-10px);
    border-color: var(--primary);
    box-shadow: 0 20px 40px rgba(108,92,231,0.15);
}

.category-icon {
    width: 70px;
    height: 70px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 15px;
    font-size: 28px;
}

.cat-electronics { background: #E8F4FD; color: #0984E3; }
.cat-fashion { background: #FFF0F3; color: #FD79A8; }
.cat-home { background: #E8F8F5; color: #00B894; }
.cat-beauty { background: #FFF5E6; color: #E17055; }

.category-card h3 {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 5px;
}

.category-card span {
    color: var(--gray);
    font-size: 14px;
}

.products {
    padding: 60px 30px;
    max-width: 1400px;
    margin: 0 auto;
}

.products-filter {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-bottom: 40px;
    flex-wrap: wrap;
}

.filter-btn {
    padding: 10px 25px;
    border: 2px solid #E8E8E8;
    background: white;
    border-radius: 25px;
    font-family: 'Tajawal', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    color: var(--gray);
}

.filter-btn:hover, .filter-btn.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
}

.products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 30px;
}

.product-card {
    background: white;
    border-radius: 20px;
    overflow: hidden;
    transition: all 0.3s;
    position: relative;
}

.product-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 25px 50px rgba(0,0,0,0.1);
}

.product-badge {
    position: absolute;
    top: 15px;
    left: 15px;
    color: white;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    z-index: 2;
}

.product-badge.sale { background: #E74C3C; }
.product-badge.new { background: var(--secondary); }

.product-img {
    height: 250px;
    background: #F8F9FA;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
}

.product-img .icon {
    font-size: 80px;
}

.product-actions {
    position: absolute;
    bottom: -50px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 10px;
    transition: bottom 0.3s;
}

.product-card:hover .product-actions {
    bottom: 15px;
}

.action-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    transition: all 0.3s;
    color: var(--dark);
}

.action-btn:hover {
    background: var(--primary);
    color: white;
    transform: scale(1.1);
}

.product-info {
    padding: 20px;
}

.product-category {
    color: var(--primary);
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 5px;
}

.product-name {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 10px;
    color: var(--dark);
}

.product-rating {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 10px;
}

.stars {
    color: #FDCB6E;
    font-size: 14px;
}

.rating-count {
    color: var(--gray);
    font-size: 13px;
}

.product-price {
    display: flex;
    align-items: center;
    gap: 10px;
}

.current-price {
    font-size: 22px;
    font-weight: 800;
    color: var(--primary);
}

.old-price {
    font-size: 16px;
    color: var(--gray);
    text-decoration: line-through;
}

.features {
    background: white;
    padding: 80px 30px;
}

.features-inner {
    max-width: 1400px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 40px;
}

.feature-item {
    text-align: center;
    padding: 30px;
}

.feature-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--light);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 32px;
    color: var(--primary);
    transition: all 0.3s;
}

.feature-item:hover .feature-icon {
    background: var(--primary);
    color: white;
    transform: rotateY(360deg);
}

.feature-item h3 {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 10px;
}

.feature-item p {
    color: var(--gray);
    line-height: 1.7;
}

.newsletter {
    background: var(--gradient);
    padding: 80px 30px;
    text-align: center;
}

.newsletter-inner {
    max-width: 600px;
    margin: 0 auto;
}

.newsletter h2 {
    font-size: 36px;
    font-weight: 800;
    color: white;
    margin-bottom: 15px;
}

.newsletter p {
    color: rgba(255,255,255,0.9);
    font-size: 18px;
    margin-bottom: 30px;
}

.newsletter-form {
    display: flex;
    gap: 10px;
    background: white;
    padding: 8px;
    border-radius: 50px;
}

.newsletter-form input {
    flex: 1;
    border: none;
    padding: 12px 20px;
    font-family: 'Tajawal', sans-serif;
    font-size: 16px;
    outline: none;
}

.newsletter-form button {
    padding: 12px 30px;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 50px;
    font-family: 'Tajawal', sans-serif;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
}

.newsletter-form button:hover {
    background: var(--primary-dark);
    transform: scale(1.05);
}

.footer {
    background: var(--dark);
    color: white;
    padding: 60px 30px 20px;
}

.footer-inner {
    max-width: 1400px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 40px;
    margin-bottom: 40px;
}

.footer-brand .logo-text {
    color: white;
    -webkit-text-fill-color: white;
    margin-bottom: 15px;
    display: inline-block;
}

.footer-brand p {
    color: rgba(255,255,255,0.7);
    line-height: 1.8;
    margin-bottom: 20px;
}

.social-links {
    display: flex;
    gap: 12px;
}

.social-links a {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    text-decoration: none;
    transition: all 0.3s;
}

.social-links a:hover {
    background: var(--primary);
    transform: translateY(-3px);
}

.footer-col h4 {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 20px;
}

.footer-col ul {
    list-style: none;
}

.footer-col ul li {
    margin-bottom: 12px;
}

.footer-col ul li a {
    color: rgba(255,255,255,0.7);
    text-decoration: none;
    transition: all 0.3s;
}

.footer-col ul li a:hover {
    color: white;
    padding-right: 5px;
}

.footer-bottom {
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 20px;
    text-align: center;
    color: rgba(255,255,255,0.5);
    font-size: 14px;
}

.cart-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 2000;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s;
}

.cart-overlay.active {
    opacity: 1;
    visibility: visible;
}

.cart-sidebar {
    position: fixed;
    top: 0;
    left: -400px;
    width: 400px;
    max-width: 90vw;
    height: 100vh;
    background: white;
    z-index: 2001;
    transition: left 0.4s ease;
    display: flex;
    flex-direction: column;
}

.cart-sidebar.active {
    left: 0;
}

.cart-header {
    padding: 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.cart-header h3 {
    font-size: 20px;
    font-weight: 700;
}

.close-cart {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--gray);
}

.cart-items {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
}

.cart-item {
    display: flex;
    gap: 15px;
    padding: 15px 0;
    border-bottom: 1px solid #eee;
}

.cart-item-img {
    width: 80px;
    height: 80px;
    background: #F8F9FA;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
}

.cart-item-info {
    flex: 1;
}

.cart-item-info h4 {
    font-size: 15px;
    margin-bottom: 5px;
}

.cart-item-info .price {
    color: var(--primary);
    font-weight: 700;
}

.cart-item-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
}

.qty-btn {
    width: 28px;
    height: 28px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.remove-item {
    color: #E74C3C;
    cursor: pointer;
    font-size: 14px;
}

.cart-footer {
    padding: 20px;
    border-top: 1px solid #eee;
}

.cart-total {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
    font-size: 18px;
    font-weight: 700;
}

.checkout-btn {
    width: 100%;
    padding: 15px;
    background: var(--gradient);
    color: white;
    border: none;
    border-radius: 10px;
    font-family: 'Tajawal', sans-serif;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
}

.checkout-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(108,92,231,0.3);
}

#toast {
    position: fixed;
    bottom: 30px;
    left: 30px;
    background: var(--dark);
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    transform: translateY(100px);
    opacity: 0;
    transition: all 0.4s;
    z-index: 3000;
    font-weight: 600;
}

@media(max-width: 992px) {
    .hero-inner { grid-template-columns: 1fr; text-align: center; }
    .hero-content h1 { font-size: 40px; }
    .hero-image { display: none; }
    .footer-inner { grid-template-columns: 1fr 1fr; }
}

@media(max-width: 768px) {
    .nav-links, .search-box { display: none; }
    .mobile-menu-btn { display: block; }
    .hero-content h1 { font-size: 32px; }
    .categories-grid { grid-template-columns: repeat(2, 1fr); }
    .footer-inner { grid-template-columns: 1fr; }
    .newsletter-form { flex-direction: column; border-radius: 20px; }
}

.fade-in {
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.6s ease;
}

.fade-in.visible {
    opacity: 1;
    transform: translateY(0);
}
</style>
</head>
<body>

<header class="header" id="header">
    <div class="header-inner">
        <a href="#" class="logo">
            <div class="logo-icon"><i class="fas fa-shopping-bag"></i></div>
            <span class="logo-text">دورا فارس</span>
        </a>
        <ul class="nav-links">
            <li><a href="#home" class="active">الرئيسية</a></li>
            <li><a href="#categories">الأقسام</a></li>
            <li><a href="#products">المنتجات</a></li>
            <li><a href="#features">مميزاتنا</a></li>
            <li><a href="#contact">تواصل معنا</a></li>
        </ul>
        <div class="header-actions">
            <div class="search-box">
                <input type="text" id="searchInput" placeholder="ابحث عن منتج..." onkeyup="searchProducts()">
                <i class="fas fa-search"></i>
            </div>
            <button class="cart-btn" onclick="toggleCart()">
                <i class="fas fa-shopping-cart"></i>
                <span class="cart-count" id="cartCount">0</span>
            </button>
            <button class="user-btn"><i class="fas fa-user"></i></button>
            <button class="mobile-menu-btn"><i class="fas fa-bars"></i></button>
        </div>
    </div>
</header>

<section class="hero" id="home">
    <div class="hero-inner">
        <div class="hero-content">
            <h1>تسوق بذكاء<br>ووفّر <span>أكثر</span></h1>
            <p>اكتشف تشكيلة واسعة من المنتجات المتميزة بأسعار تنافسية. توصيل سريع، جودة مضمونة، وخدمة عملاء على مدار الساعة.</p>
            <div class="hero-btns">
                <a href="#products" class="btn btn-primary"><i class="fas fa-shopping-bag"></i> تسوق الآن</a>
                <a href="#features" class="btn btn-outline"><i class="fas fa-play-circle"></i> تعرف أكثر</a>
            </div>
        </div>
        <div class="hero-image">
            <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=500&fit=crop" alt="Shopping">
            <div class="floating-card card-1"><i class="fas fa-truck"></i><span>توصيل مجاني</span></div>
            <div class="floating-card card-2"><i class="fas fa-shield-alt"></i><span>ضمان الجودة</span></div>
        </div>
    </div>
</section>

<section class="categories" id="categories">
    <div class="section-header fade-in">
        <h2>تصفح حسب القسم</h2>
        <p>اختر من مجموعة متنوعة من الأقسام المتميزة</p>
    </div>
    <div class="categories-grid" id="categoriesGrid"></div>
</section>

<section class="products" id="products">
    <div class="section-header fade-in">
        <h2>منتجات مميزة</h2>
        <p>أفضل المنتجات بأسعار لا تُقاوم</p>
    </div>
    <div class="products-filter fade-in">
        <button class="filter-btn active" onclick="filterProducts('all', this)">الكل</button>
        <button class="filter-btn" onclick="filterProducts('electronics', this)">إلكترونيات</button>
        <button class="filter-btn" onclick="filterProducts('fashion', this)">أزياء</button>
        <button class="filter-btn" onclick="filterProducts('home', this)">منزل</button>
        <button class="filter-btn" onclick="filterProducts('beauty', this)">جمال</button>
    </div>
    <div class="products-grid" id="productsGrid"></div>
</section>

<section class="features" id="features">
    <div class="features-inner">
        <div class="feature-item fade-in">
            <div class="feature-icon"><i class="fas fa-shipping-fast"></i></div>
            <h3>توصيل سريع</h3>
            <p>نوصل طلباتك في أسرع وقت ممكن مع خدمة التوصيل المجاني للطلبات فوق 200 ريال</p>
        </div>
        <div class="feature-item fade-in">
            <div class="feature-icon"><i class="fas fa-undo-alt"></i></div>
            <h3>إرجاع سهل</h3>
            <p>سياسة إرجاع مرنة خلال 14 يوما من استلام الطلب بدون أي أسئلة</p>
        </div>
        <div class="feature-item fade-in">
            <div class="feature-icon"><i class="fas fa-headset"></i></div>
            <h3>دعم 24/7</h3>
            <p>فريق دعم فني متخصص جاهز لمساعدتك على مدار الساعة طوال أيام الأسبوع</p>
        </div>
        <div class="feature-item fade-in">
            <div class="feature-icon"><i class="fas fa-lock"></i></div>
            <h3>دفع آمن</h3>
            <p>نستخدم أحدث تقنيات التشفير لحماية بياناتك ومعاملاتك المالية</p>
        </div>
    </div>
</section>

<section class="newsletter">
    <div class="newsletter-inner fade-in">
        <h2>اشترك في نشرتنا الإخبارية</h2>
        <p>احصل على أحدث العروض والخصومات مباشرة إلى بريدك الإلكتروني</p>
        <form class="newsletter-form" onsubmit="subscribeNewsletter(event)">
            <input type="email" id="newsletterEmail" placeholder="أدخل بريدك الإلكتروني" required>
            <button type="submit">اشترك الآن</button>
        </form>
    </div>
</section>

<footer class="footer" id="contact">
    <div class="footer-inner">
        <div class="footer-brand">
            <span class="logo-text" style="font-size:28px">دورا فارس</span>
            <p>وجهتك المثالية للتسوق الإلكتروني. نقدم لك تجربة تسوق فريدة مع منتجات عالية الجودة وخدمة متميزة.</p>
            <div class="social-links">
                <a href="#"><i class="fab fa-facebook-f"></i></a>
                <a href="#"><i class="fab fa-twitter"></i></a>
                <a href="#"><i class="fab fa-instagram"></i></a>
                <a href="#"><i class="fab fa-snapchat-ghost"></i></a>
            </div>
        </div>
        <div class="footer-col">
            <h4>روابط سريعة</h4>
            <ul>
                <li><a href="#">عن المتجر</a></li>
                <li><a href="#">المنتجات</a></li>
                <li><a href="#">العروض</a></li>
                <li><a href="#">المدونة</a></li>
            </ul>
        </div>
        <div class="footer-col">
            <h4>خدمة العملاء</h4>
            <ul>
                <li><a href="#">حسابي</a></li>
                <li><a href="#">طلباتي</a></li>
                <li><a href="#">سياسة الإرجاع</a></li>
                <li><a href="#">الأسئلة الشائعة</a></li>
            </ul>
        </div>
        <div class="footer-col">
            <h4>تواصل معنا</h4>
            <ul>
                <li><a href="#"><i class="fas fa-phone"></i> +966 50 123 4567</a></li>
                <li><a href="#"><i class="fas fa-envelope"></i> info@dorafares.com</a></li>
                <li><a href="#"><i class="fas fa-map-marker-alt"></i> الرياض، المملكة العربية السعودية</a></li>
            </ul>
        </div>
    </div>
    <div class="footer-bottom">
        <p>© 2026 متجر دورا فارس. جميع الحقوق محفوظة.</p>
    </div>
</footer>

<div class="cart-overlay" id="cartOverlay" onclick="toggleCart()"></div>
<div class="cart-sidebar" id="cartSidebar">
    <div class="cart-header">
        <h3><i class="fas fa-shopping-cart"></i> سلة التسوق</h3>
        <button class="close-cart" onclick="toggleCart()"><i class="fas fa-times"></i></button>
    </div>
    <div class="cart-items" id="cartItems"></div>
    <div class="cart-footer">
        <div class="cart-total">
            <span>المجموع:</span>
            <span id="cartTotal">0 ر.س</span>
        </div>
        <button class="checkout-btn" onclick="checkout()">إتمام الشراء</button>
    </div>
</div>

<div id="toast"></div>

<script>
const API_URL = window.location.origin;
let cart = [];

const productsData = [
    { id: 1, name: "سماعات لاسلكية فاخرة", category: "electronics", price: 299, oldPrice: 450, rating: 4.8, reviews: 128, badge: "sale", icon: "🎧" },
    { id: 2, name: "ساعة ذكية رياضية", category: "electronics", price: 499, oldPrice: null, rating: 4.6, reviews: 89, badge: "new", icon: "⌚" },
    { id: 3, name: "حقيبة يد جلدية", category: "fashion", price: 349, oldPrice: 500, rating: 4.9, reviews: 234, badge: "sale", icon: "👜" },
    { id: 4, name: "طقم أواني منزلية", category: "home", price: 199, oldPrice: null, rating: 4.5, reviews: 67, badge: "new", icon: "🏺" },
    { id: 5, name: "مجموعة عناية بالبشرة", category: "beauty", price: 159, oldPrice: 220, rating: 4.7, reviews: 156, badge: "sale", icon: "✨" },
    { id: 6, name: "حذاء رياضي عصري", category: "fashion", price: 279, oldPrice: null, rating: 4.4, reviews: 98, badge: "new", icon: "👟" },
    { id: 7, name: "مصباح طاولة مودرن", category: "home", price: 129, oldPrice: 180, rating: 4.6, reviews: 45, badge: "sale", icon: "💡" },
    { id: 8, name: "كاميرا رقمية احترافية", category: "electronics", price: 1299, oldPrice: null, rating: 4.9, reviews: 312, badge: "new", icon: "📷" }
];

function loadCategories() {
    const cats = [
        { id: 'electronics', name: 'إلكترونيات', icon: '💻', count: 3 },
        { id: 'fashion', name: 'أزياء', icon: '👕', count: 2 },
        { id: 'home', name: 'منزل وديكور', icon: '🏠', count: 2 },
        { id: 'beauty', name: 'جمال وعناية', icon: '💄', count: 2 }
    ];
    renderCategories(cats);
}

function renderCategories(categories) {
    const grid = document.getElementById('categoriesGrid');
    const catClasses = {
        electronics: 'cat-electronics',
        fashion: 'cat-fashion',
        home: 'cat-home',
        beauty: 'cat-beauty'
    };
    const catIcons = {
        electronics: 'fa-laptop',
        fashion: 'fa-tshirt',
        home: 'fa-couch',
        beauty: 'fa-spa'
    };

    grid.innerHTML = categories.map((cat, index) => {
        const filterBtns = document.querySelectorAll('.filter-btn');
        return `<div class="category-card fade-in" onclick="filterProducts('${cat.id}', document.querySelectorAll('.filter-btn')[${index + 1}])">
            <div class="category-icon ${catClasses[cat.id]}">
                <i class="fas ${catIcons[cat.id]}"></i>
            </div>
            <h3>${cat.name}</h3>
            <span>${cat.count}+ منتج</span>
        </div>`;
    }).join('');

    setTimeout(() => {
        document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
    }, 100);
}

function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = products.map(p => {
        const badgeHtml = p.badge ? `<span class="product-badge ${p.badge}">${p.badge === 'sale' ? 'خصم' : 'جديد'}</span>` : '';
        const oldPriceHtml = p.oldPrice ? `<span class="old-price">${p.oldPrice} ر.س</span>` : '';
        const fullStars = Math.floor(p.rating);
        const emptyStars = 5 - fullStars;

        return `<div class="product-card fade-in" data-category="${p.category}">
            ${badgeHtml}
            <div class="product-img">
                <div class="icon">${p.icon}</div>
                <div class="product-actions">
                    <button class="action-btn" onclick="addToCart(${p.id})" title="أضف للسلة">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                    <button class="action-btn" title="المفضلة">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="action-btn" title="عرض سريع">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <div class="product-category">${getCategoryName(p.category)}</div>
                <h3 class="product-name">${p.name}</h3>
                <div class="product-rating">
                    <span class="stars">${'★'.repeat(fullStars)}${'☆'.repeat(emptyStars)}</span>
                    <span class="rating-count">(${p.reviews})</span>
                </div>
                <div class="product-price">
                    <span class="current-price">${p.price} ر.س</span>
                    ${oldPriceHtml}
                </div>
            </div>
        </div>`;
    }).join('');

    setTimeout(() => {
        document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
    }, 100);
}

function getCategoryName(cat) {
    const names = {
        electronics: 'إلكترونيات',
        fashion: 'أزياء',
        home: 'منزل وديكور',
        beauty: 'جمال وعناية'
    };
    return names[cat] || cat;
}

function filterProducts(category, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    else document.querySelectorAll('.filter-btn')[0].classList.add('active');

    const filtered = category === 'all' ? productsData : productsData.filter(p => p.category === category);
    renderProducts(filtered);
}

function searchProducts() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = productsData.filter(p => p.name.toLowerCase().includes(query));
    renderProducts(filtered);
}

function addToCart(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
    showToast(`تم إضافة "${product.name}" إلى السلة`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
}

function updateQty(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.qty += change;
        if (item.qty <= 0) {
            removeFromCart(productId);
        } else {
            updateCartUI();
        }
    }
}

function updateCartUI() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');

    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    cartCount.textContent = totalQty;
    cartTotal.textContent = totalPrice + ' ر.س';

    if (cart.length === 0) {
        cartItems.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--gray)">
            <i class="fas fa-shopping-basket" style="font-size:60px;margin-bottom:20px;opacity:0.3"></i>
            <p>السلة فارغة</p>
        </div>`;
    } else {
        cartItems.innerHTML = cart.map(item => {
            return `<div class="cart-item">
                <div class="cart-item-img">${item.icon}</div>
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div class="price">${item.price} ر.س</div>
                    <div class="cart-item-actions">
                        <button class="qty-btn" onclick="updateQty(${item.id}, -1)">-</button>
                        <span>${item.qty}</span>
                        <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
                        <span class="remove-item" onclick="removeFromCart(${item.id})">
                            <i class="fas fa-trash"></i>
                        </span>
                    </div>
                </div>
            </div>`;
        }).join('');
    }
}

function toggleCart() {
    document.getElementById('cartOverlay').classList.toggle('active');
    document.getElementById('cartSidebar').classList.toggle('active');
}

function checkout() {
    if (cart.length === 0) {
        showToast('السلة فارغة! أضف بعض المنتجات أولا');
        return;
    }
    showToast('جاري تحويلك إلى صفحة الدفع...');
    setTimeout(() => alert('شكرا لتسوقك معنا! سيتم توجيهك لبوابة الدفع.'), 1000);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
    }, 3000);
}

function subscribeNewsletter(e) {
    e.preventDefault();
    showToast('تم الاشتراك بنجاح! شكرا لك');
    e.target.reset();
}

function handleScroll() {
    const header = document.getElementById('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }

    document.querySelectorAll('.fade-in').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
            el.classList.add('visible');
        }
    });
}

window.addEventListener('scroll', handleScroll);

window.addEventListener('load', () => {
    loadCategories();
    filterProducts('all');
    handleScroll();
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        let jsonBody = {};
        try { jsonBody = JSON.parse(body); } catch (e) {}

        if (path === '/' || path === '/index.html') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(HTML_PAGE);
            return;
        }

        if (path === '/api/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, status: 'running', timestamp: new Date().toISOString() }));
            return;
        }

        if (path === '/api/products' && method === 'GET') {
            const { category, search, sort } = parsedUrl.query;
            let result = [...products];
            if (category && category !== 'all') result = result.filter(p => p.category === category);
            if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
            if (sort) {
                switch(sort) {
                    case 'price_asc': result.sort((a, b) => a.price - b.price); break;
                    case 'price_desc': result.sort((a, b) => b.price - a.price); break;
                    case 'rating': result.sort((a, b) => b.rating - a.rating); break;
                }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, count: result.length, products: result }));
            return;
        }

        if (path === '/api/categories' && method === 'GET') {
            const cats = [
                { id: 'electronics', name: 'إلكترونيات', icon: '💻', count: products.filter(p => p.category === 'electronics').length },
                { id: 'fashion', name: 'أزياء', icon: '👕', count: products.filter(p => p.category === 'fashion').length },
                { id: 'home', name: 'منزل وديكور', icon: '🏠', count: products.filter(p => p.category === 'home').length },
                { id: 'beauty', name: 'جمال وعناية', icon: '💄', count: products.filter(p => p.category === 'beauty').length }
            ];
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, categories: cats }));
            return;
        }

        if (path === '/api/subscribe' && method === 'POST') {
            const { email } = jsonBody;
            if (!email || !email.includes('@')) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'بريد إلكتروني غير صالح' }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'تم الاشتراك بنجاح!' }));
            return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'الصفحة غير موجودة' }));
    });
});

server.listen(PORT, () => {
    console.log('DORA FARES STORE running on port ' + PORT);
});
