// ============================================================
// 🌐🔗 DORA LANGUAGE SUITE + HERO QUICK BAR
// شريط أزرار أنيق فوق البانر في كل الصفحات (العروض / تتبع الطلب / اللغة)
// + نظام لغات: العربية (افتراضي) / English يدوي مضبوط / Google Translate
// ملاحظة: محتوى المنتجات القادم من قاعدة البيانات (الأسماء/الأوصاف)
// يُترك كما هو في وضع English اليدوي — Google Translate يغطيه في وضع اللغات الأخرى.
// ============================================================
(function doraLangSuite() {
    'use strict';
    try {
        var LS_KEY = 'doraLang'; // القيم: 'ar' (افتراضي) | 'en' | 'gt:<code>'

        function doraGetLang() {
            try { return localStorage.getItem(LS_KEY) || 'ar'; } catch (e) { return 'ar'; }
        }
        function doraSetLang(v) {
            try { localStorage.setItem(LS_KEY, v); } catch (e) {}
        }

        // ---------- لغات Google Translate المتاحة ----------
        var DORA_GT_LANGS = [
            ['en', 'English', '🇬🇧'], ['fr', 'Français', '🇫🇷'], ['de', 'Deutsch', '🇩🇪'],
            ['tr', 'Türkçe', '🇹🇷'], ['es', 'Español', '🇪🇸'], ['it', 'Italiano', '🇮🇹'],
            ['ru', 'Русский', '🇷🇺'], ['zh-CN', '中文 (简体)', '🇨🇳'], ['hi', 'हिन्दी', '🇮🇳'],
            ['ur', 'اردو', '🇵🇰'], ['id', 'Bahasa Indonesia', '🇮🇩'], ['fa', 'فارسی', '🇮🇷'],
            ['pt', 'Português', '🇵🇹'], ['nl', 'Nederlands', '🇳🇱'], ['ja', '日本語', '🇯🇵'],
            ['ko', '한국어', '🇰🇷'], ['ms', 'Bahasa Melayu', '🇲🇾'], ['sw', 'Kiswahili', '🇰🇪'],
            ['tl', 'Filipino', '🇵🇭'], ['bn', 'বাংলা', '🇧🇩']
        ];

        // ---------- قاموس الترجمة الإنجليزية اليدوية ----------
        var DORA_EN = {
            // القائمة العلوية وقوائمها
            'الرئيسية': 'Home',
            'عن الشركة': 'About Us',
            'التصنيفات': 'Categories',
            'المنتجات': 'Products',
            'المعلومات': 'Information',
            'الدعم': 'Support',
            'نبذة عن الشركة': 'About the Company',
            'رؤيتنا': 'Our Vision',
            'رسالتنا': 'Our Mission',
            'فريق العمل': 'Our Team',
            'الشهادات': 'Certifications',
            'خدمات الطباعة': 'Printing Services',
            'كاميرات المراقبة': 'Security Cameras',
            'نقاط البيع': 'POS Systems',
            'شبكات': 'Networking',
            'باركود': 'Barcode Systems',
            'الصيانة': 'Maintenance',
            'جميع المنتجات': 'All Products',
            '🛍️ جميع المنتجات': '🛍️ All Products',
            'طابعات': 'Printers',
            'أجهزة الكمبيوتر': 'Computers',
            'كمبيوتر': 'Computers',
            'رامات': 'RAM',
            'هاردات': 'Hard Drives',
            'إكسسوارات': 'Accessories',
            'وصلات': 'Cables',
            'بروجكتور': 'Projectors',
            'أحبار الطابعات': 'Printer Ink',
            'أحبار': 'Ink',
            'مواد غذائية': 'Food Products',
            'المواد الغذائية': 'Food Products',
            'غذائية': 'Food',
            'سياسة الخصوصية': 'Privacy Policy',
            '🔒 سياسة الخصوصية': '🔒 Privacy Policy',
            'شروط الاستخدام': 'Terms of Use',
            '📜 شروط الاستخدام': '📜 Terms of Use',
            'الأسئلة الشائعة': 'FAQ',
            'تواصل معنا': 'Contact Us',
            // الهيرو
            '✨ حلول تقنية متكاملة للشركات والأفراد': '✨ Integrated tech solutions for businesses & individuals',
            'شركة درة فارس الشمال': 'Dora Fares Al Shamal Co.',
            'درة فارس الشمال': 'Dora Fares Al Shamal',
            'للتجارة': 'Trading',
            '💬 تحدث مع خبير': '💬 Talk to an Expert',
            '🛠️ خدماتنا': '🛠️ Our Services',
            'منتج متنوع': 'Products',
            'متاح الآن': 'Available Now',
            'عميل سعيد': 'Happy Clients',
            'أجهزة ولابتوب': 'PCs & Laptops',
            'فني متخصص': 'Specialized Technicians',
            // عناوين الأقسام
            'استكشف منتجاتنا': 'Explore Our Products',
            'اختر التصنيف المناسب واكتشف مجموعة واسعة من المنتجات التقنية عالية الجودة': 'Choose a category and discover a wide range of high-quality tech products',
            'لماذا تختارنا؟': 'Why Choose Us?',
            'نقدم لك تجربة فريدة تجمع بين الجودة والسرعة والثقة': 'A unique experience combining quality, speed and trust',
            'منتجاتنا المميزة': 'Featured Products',
            'أحدث المنتجات التقنية بأفضل الأسعار': 'The latest tech products at the best prices',
            'منتجات ذات صلة': 'Related Products',
            'نحن شركة درة فارس الشمال': 'We are Dora Fares Al Shamal Co.',
            'أرقامنا تتحدث': 'Our Numbers Speak',
            'ثقة عملائنا هي مؤشر نجاحنا الحقيقي': 'Our customers’ trust is our true measure of success',
            'آراء عملائنا': 'Customer Reviews',
            'تقييمات حقيقية من زوارنا الكرام': 'Real reviews from our valued visitors',
            'آراء كبرى الشركات والمؤسسات': 'Reviews from Major Companies & Enterprises',
            'نفخر بثقة عملائنا ونسعى دائماً لتقديم الأفضل': 'Proud of our clients’ trust, always striving to deliver the best',
            'شركاؤنا وعملاؤنا': 'Our Partners & Clients',
            'نفخر بالتعاون مع كبرى الشركات والمؤسسات في المملكة': 'Proudly cooperating with major companies and institutions across the Kingdom',
            'مشاريعنا المنفذة': 'Our Completed Projects',
            'نماذج من مشاريعنا التي نفذناها باحترافية ودقة عالية': 'Samples of our professionally and precisely executed projects',
            'أحدث المقالات': 'Latest Articles',
            'نصائح تقنية وآخر الأخبار من عالم التقنية': 'Tech tips and the latest news from the tech world',
            'نحن هنا لمساعدتك': 'We Are Here to Help',
            'نحن هنا لمساعدتك - تواصل معنا بأي طريقة تناسبك': 'We are here to help — contact us however you prefer',
            'تواصل معنا عبر أي من الطرق التالية وسنرد عليك في أسرع وقت': 'Contact us through any of the following methods and we will reply ASAP',
            'شهاداتنا واعتماداتنا': 'Our Certifications & Accreditations',
            'نلتزم بأعلى معايير الجودة والاحترافية': 'We adhere to the highest standards of quality and professionalism',
            'منتجات مختارة عالية الجودة': 'Selected high-quality products',
            // تبويبات التصنيفات
            'الكل': 'All',
            // صفحة المنتجات
            'تصفح كامل تشكيلتنا من المنتجات التقنية بأفضل الأسعار': 'Browse our full range of tech products at the best prices',
            'الترتيب الافتراضي': 'Default Sorting',
            'السعر: من الأقل للأعلى': 'Price: Low to High',
            'السعر: من الأعلى للأقل': 'Price: High to Low',
            'الاسم: أ-ي': 'Name: A-Z',
            'الاسم: ي-أ': 'Name: Z-A',
            'التوفر': 'Availability',
            'منتج متاح': 'product available',
            // نصوص البطاقات
            '📦 المخزون': '📦 Stock',
            'نفذت الكمية': 'Out of Stock',
            'متوفر': 'Available',
            'غير متوفر': 'Unavailable',
            'جديد': 'New',
            'خصم': 'Sale',
            '💰 وفر': '💰 Save',
            '📋 عرض سعر': '📋 Get a Quote',
            'عرض سعر': 'Get a Quote',
            '🛒 أضف': '🛒 Add',
            'أضف للسلة': 'Add to Cart',
            '❌ نفذت': '❌ Sold Out',
            '⚠️ الكمية محدودة': '⚠️ Limited Stock',
            'إضافة للمفضلة': 'Add to Wishlist',
            'إزالة من المفضلة': 'Remove from Wishlist',
            '🤍 أضف للمفضلة': '🤍 Add to Wishlist',
            'مقارنة': 'Compare',
            '📊 مقارنة': '📊 Compare',
            'نظرة سريعة': 'Quick View',
            'لا توجد نتائج مطابقة': 'No matching results',
            'لا توجد مراجعات بعد. كن أول من يقيم!': 'No reviews yet. Be the first to review!',
            'المراجعات': 'Reviews',
            'التقييم': 'Rating',
            'المخزون': 'Stock',
            'التصنيف': 'Category',
            'السعر': 'Price',
            'المواصفة': 'Specification',
            'قطعة': 'pcs',
            'تقييم': 'reviews',
            'منتجات': 'products',
            // السلة والمقارنة
            '🛒 سلة المشتريات': '🛒 Shopping Cart',
            'السلة فارغة': 'Cart is Empty',
            'أضف منتجات لبدء التسوق': 'Add products to start shopping',
            'السلة فارغة! أضف منتجات أولاً': 'Cart is empty! Add products first',
            'المجموع:': 'Subtotal:',
            '🛒 إتمام الشراء': '🛒 Checkout',
            '❌ إفراغ': '❌ Clear',
            '💰 الإجمالي (شامل الضريبة)': '💰 Total (VAT included)',
            '🎟️ كوبونات متاحة:': '🎟️ Available coupons:',
            '⚠️ يمكن مقارنة 4 منتجات كحد أقصى': '⚠️ You can compare up to 4 products',
            '⚠️ أضف منتجين على الأقل للمقارنة': '⚠️ Add at least 2 products to compare',
            '✅ تمت الإضافة للمقارنة': '✅ Added to compare',
            'تمت الإزالة من المقارنة': 'Removed from compare',
            'تمت الإضافة للسلة': 'Added to cart',
            // الفوتر
            'روابط سريعة': 'Quick Links',
            'طرق الدفع': 'Payment Methods',
            'الخدمات': 'Services',
            'وجهتك الأولى لكل ما يتعلق بالتقنية. نقدم منتجات عالية الجودة بأسعار تنافسية.': 'Your first destination for everything tech. High-quality products at competitive prices.',
            '© 2024 شركة درة فارس الشمال. جميع الحقوق محفوظة.': '© 2024 Dora Fares Al Shamal Co. All rights reserved.',
            '© 2026 شركة درة فارس الشمال للتجارة. جميع الحقوق محفوظة.': '© 2026 Dora Fares Al Shamal Trading Co. All rights reserved.',
            'حلول تقنية متكاملة للشركات والأفراد. خبرة 15+ سنة في خدمة أكثر من 500 عميل.': 'Integrated tech solutions for businesses and individuals. 15+ years serving 500+ clients.',
            'تأسست عام 2009': 'Founded in 2009',
            // سكشن تحميل التطبيق
            '📲 حمّل تطبيق درة فارس الشمال على جوالك أو الكمبيوتر، أو اطلب عرض سعر الآن!': '📲 Download the Dora Fares Al Shamal app on your phone or computer, or request a quote now!',
            '📲 حمّل تطبيق درة فارس الشمال على جوالك!': '📲 Download the Dora Fares Al Shamal app on your phone!',
            '📱 تحميل تطبيق Android': '📱 Download Android App',
            '💻 حمّل تطبيق درة فارس الشمال': '💻 Install Dora Fares App',
            '💻 حمّل تطبيق درة فارس الشمال!': '💻 Install Dora Fares Al Shamal App!',
            '📋 اطلب عرض سعر': '📋 Request a Quote',
            '📋 اطلب عرض سعر الآن': '📋 Request a Quote Now',
            'اضغط للتثبيت على الشاشة الرئيسية': 'Tap to install on your home screen',
            'تحميل تطبيق درة فارس الشمال': 'Download Dora Fares Al Shamal App',
            // صفحة تواصل
            'أرسل لنا رسالة': 'Send Us a Message',
            'املأ النموذج وسنرد عليك في أقرب وقت': 'Fill out the form and we will reply as soon as possible',
            'الاسم الكامل *': 'Full Name *',
            'رقم الهاتف *': 'Phone Number *',
            'البريد الإلكتروني': 'Email',
            'البريد الإلكتروني *': 'Email *',
            'الموضوع': 'Subject',
            'اختر الموضوع': 'Choose a subject',
            'استفسار عام': 'General Inquiry',
            'طلب منتج': 'Product Request',
            '📦 طلب منتج': '📦 Product Request',
            'طلب عرض سعر': 'Quote Request',
            'دعم فني': 'Technical Support',
            'شكوى': 'Complaint',
            '💡 اقتراح': '💡 Suggestion',
            '😞 شكوى': '😞 Complaint',
            'الرسالة *': 'Message *',
            'إرسال الرسالة': 'Send Message',
            '📨 إرسال الرسالة': '📨 Send Message',
            'موقعنا': 'Our Location',
            'ساعات العمل': 'Working Hours',
            'طوال أيام الأسبوع من الساعة 9ص إلى الساعة 11:50م': 'Every day from 9 AM to 11:50 PM',
            'متاح من الأحد إلى الخميس 9 ص - 6 م': 'Available Sunday to Thursday, 9 AM - 6 PM',
            'الرياض، المملكة العربية السعودية': 'Riyadh, Saudi Arabia',
            'اتصل بنا': 'Call Us',
            'واتساب': 'WhatsApp',
            'تواصل سريع': 'Quick Contact',
            'تواصل الآن': 'Contact Now',
            'جاهزون لخدمتك.': 'Ready to serve you.',
            'نرد خلال 24 ساعة': 'We reply within 24 hours',
            'رد فوري': 'Instant Reply',
            'اتصال': 'Call',
            'إيميل': 'Email',
            'تطبيق': 'App',
            'مباشر': 'Direct',
            '📱 رقم الجوال': '📱 Mobile Number',
            '✉️ البريد الإلكتروني': '✉️ Email',
            '📨 تواصل معنا': '📨 Contact Us',
            '💬 تواصل عبر واتساب': '💬 Chat on WhatsApp',
            'تواصل معنا على واتساب': 'Contact us on WhatsApp',
            '❌ الرجاء تصحيح الأخطاء في النموذج': '❌ Please correct the errors in the form',
            '✅ تم إرسال رسالتك بنجاح! سنتواصل معك قريباً': '✅ Your message was sent successfully! We will contact you soon',
            // صفحة تتبع الطلب
            '📦 تتبع طلبك': '📦 Track Your Order',
            'أدخل رقم الطلب ورقم الجوال المسجَّل لدينا لمعرفة حالة طلبك لحظة بلحظة': 'Enter your order number and registered mobile number to track your order live',
            '🔢 رقم الطلب': '🔢 Order Number',
            '🔍 تتبع الطلب': '🔍 Track Order',
            '⏳ جاري البحث عن طلبك...': '⏳ Searching for your order...',
            'لم نعثر على الطلب': 'Order Not Found',
            'تأكد من رقم الطلب ورقم الجوال المدخَل، أو تواصل معنا مباشرة وسنساعدك فوراً': 'Check the order number and mobile number, or contact us directly and we will help immediately',
            '🛒 منتجات الطلب': '🛒 Order Items',
            '💬 اطلب الآن عبر واتساب': '💬 Order Now via WhatsApp',
            // صفحة العروض
            '🔥 العروض والتخفيضات': '🔥 Offers & Discounts',
            'أقوى الخصومات على منتجات مختارة — الكمية محدودة': 'The strongest discounts on selected products — limited quantity',
            '🔥 لا توجد عروض حالياً': '🔥 No offers currently',
            'تابعنا قريباً — عروض جديدة في الطريق إليك!': 'Follow us soon — new offers are on the way!',
            'العرض ساري لمدة 24 ساعة': 'Offer valid for 24 hours',
            'استخدم كود': 'Use code',
            'عند إتمام الشراء': 'at checkout',
            // التقييمات والنماذج
            '⭐ قيّم تجربتك': '⭐ Rate Your Experience',
            '⭐ قيّم المنتج': '⭐ Rate the Product',
            '⭐ التقييم': '⭐ Rating',
            '⭐ أضف تقييمك': '⭐ Add Your Review',
            'شاركنا رأيك في المنتج': 'Share your opinion about the product',
            'شاركنا رأيك في موقع شركة درة فارس الشمال': 'Share your opinion about the Dora Fares Al Shamal website',
            '📨 إرسال التقييم': '📨 Submit Review',
            '👤 اسمك': '👤 Your Name',
            'اسمك': 'Your Name',
            'اكتب تقييمك هنا...': 'Write your review here...',
            'اكتب تقييمك للمنتج هنا...': 'Write your product review here...',
            'المنتج أو الخدمة (اختياري)': 'Product or service (optional)',
            '💬 رأيك': '💬 Your Opinion',
            '📦 المنتج/الخدمة': '📦 Product/Service',
            '❓ استفسار': '❓ Inquiry',
            '📝 أخرى': '📝 Other',
            'أخرى': 'Other',
            '📌 الموضوع': '📌 Subject',
            '💬 الرسالة': '💬 Message',
            '⏳ جاري الإرسال...': '⏳ Sending...',
            '❌ الرجاء ملء جميع الحقول المطلوبة': '❌ Please fill in all required fields',
            '✅ شكراً لتقييمك! تم حفظ التقييم بنجاح': '✅ Thank you! Your review was saved successfully',
            '❌ حدث خطأ! حاول مرة أخرى': '❌ An error occurred! Try again',
            'خصم 10% على أول طلب!': '10% Off Your First Order!',
            '📋 نسخ الكود والبدء بالتسوق': '📋 Copy Code & Start Shopping',
            '🔊 مستوى الصوت': '🔊 Volume Level',
            '🔇 كتم / تشغيل': '🔇 Mute / Unmute',
            // الشات بوت
            'مساعد درة فارس': 'Dora Fares Assistant',
            'أهلاً! اسألني أي حاجة 🤖': 'Hello! Ask me anything 🤖',
            '👋 مرحباً! كيف نقدر نساعدك؟': '👋 Hello! How can we help you?',
            'اختر نوع الاستفسار:': 'Choose inquiry type:',
            // الشريط القانوني
            'سجل تجاري:': 'Commercial Registration:',
            'الرقم الضريبي:': 'VAT Number:',
            'شركة درة فارس الشمال © 2026': 'Dora Fares Al Shamal Co. © 2026',
            '✅ توثيق معروف': '✅ Maroof Verification',
            '🔔 الإعلانات': '🔔 Announcements',
            'إعلان': 'Announcement',
            'الإعلانات والإشعارات': 'Announcements & Notifications',
            // بانر الأزرار المحقون
            '🔥 العروض': '🔥 Offers',
            'اللغة': 'Language',
            'العربية': 'Arabic',
            // checkout الأساسيات
            'إتمام الطلب': 'Checkout',
            'معلومات العميل': 'Customer Information',
            'طريقة الدفع': 'Payment Method',
            'ملخص الطلب': 'Order Summary',
            'تأكيد الطلب': 'Confirm Order',
            'الدفع عند الاستلام': 'Cash on Delivery',
            'تحويل بنكي': 'Bank Transfer',
            'العنوان': 'Address',
            'المدينة': 'City',
            'ملاحظات': 'Notes',
            'الإجمالي': 'Total',
            'الضريبة': 'VAT',
            'رقم الجوال': 'Mobile Number',
            // بحث ومتفرقات
            'ابحث عن منتج...': 'Search for a product...',
            'اسمك الكامل': 'Your full name',
            'رقم جوالك': 'Your mobile number',
            'بريدك الإلكتروني': 'Your email',
            'اكتب رسالتك هنا...': 'Write your message here...',
            'خدمة في جميع مناطق المملكة': 'Serving all regions of the Kingdom',
            'دعم فني 24/7': '24/7 Technical Support',
            'دعم على مدار الساعة عبر الهاتف والواتساب': '24/7 support via phone and WhatsApp',
            'توصيل وتركيب': 'Delivery & Installation',
            'توصيل وتركيب في جميع المناطق': 'Delivery and installation in all regions',
            'ضمان شامل': 'Full Warranty',
            'ضمان على جميع الأجهزة والتركيب': 'Warranty on all devices and installations',
            'أسعار تنافسية': 'Competitive Prices',
            'أفضل الأسعار مع عروض للمشاريع الكبيرة': 'Best prices with offers for large projects',
            '24 ساعة': '24 Hours',
            'معتمد': 'Certified',
            'شريك': 'Partner',
            'عميل': 'Client',
            'شركة': 'Company',
            'مؤسسة': 'Establishment',
            'مستشفى': 'Hospital',
            'وزارة': 'Ministry',
            'جامعة': 'University',
            'مدرسة': 'School',
            'مطاعم': 'Restaurants',
            'فندق': 'Hotel',
            'مصنع': 'Factory',
            'متجر': 'Store',
            'صيدلية': 'Pharmacy',
            'مكتب': 'Office',
            'معرض': 'Showroom',
            'مركز': 'Center',
            'هيئة': 'Authority',
            'وكالة': 'Agency',
            'مجموعة': 'Group',
            'قائمة': 'List',
            'القائمة': 'Menu',
            // إضافات مكملة (هيرو الرئيسية + الحساب + الكوكيز)
            'نوفر لك أحدث الأجهزة التقنية، حلول الطباعة، نقاط البيع، كاميرات المراقبة، والشبكات. خبرة 15+ سنة في خدمة أكثر من 500 عميل في المملكة.': 'We provide the latest tech devices, printing solutions, POS systems, security cameras and networking. 15+ years serving 500+ clients across the Kingdom.',
            'الحساب': 'Account',
            'مسجل دخول': 'Logged In',
            'تسجيل الدخول': 'Log In',
            'إنشاء حساب': 'Create Account',
            'تسجيل الخروج': 'Log Out',
            'حمل التطبيق': 'Download the App',
            'مجاناً': 'Free',
            'نحن نستخدم ملفات تعريف الارتباط (Cookies) لتحسين تجربتك في موقع': 'We use cookies to improve your experience on',
            '🍪 نحن نستخدم ملفات تعريف الارتباط (Cookies) لتحسين تجربتك في موقع': '🍪 We use cookies to improve your experience on',
            'رفض': 'Decline',
            'قبول': 'Accept',
            'الاختصارات': 'Shortcuts',
            'خصم خاص لك!': 'Special Discount for You!',
            'احصل على خصم': 'Get',
            'على أول طلب لك في متجر درة فارس الشمال.': 'off your first order at Dora Fares Al Shamal store.',
            '📋 نسخ الكود وبدء التسوق': '📋 Copy Code & Start Shopping',
            // عناوين صفحات التصنيفات
            '🖨️ الطابعات': '🖨️ Printers',
            '💻 أجهزة الكمبيوتر': '💻 Computers',
            '🧠 الرامات': '🧠 RAM',
            '💾 الهاردات': '💾 Hard Drives',
            '🎧 الإكسسوارات': '🎧 Accessories',
            '🔌 وصلات وكابلات': '🔌 Cables & Connectors',
            '📽️ بروجكتور وشاشات عرض': '📽️ Projectors & Displays',
            '🖨️ أحبار الطابعات': '🖨️ Printer Ink',
            '🛒 مواد غذائية': '🛒 Food Products',
            'طابعات ليزر ونفث حبر من أفضل الماركات العالمية': 'Laser and inkjet printers from the best global brands',
            'أجهزة مكتبية ولابتوبات وأجهزة الكل في واحد بأحدث المواصفات': 'Desktops, laptops and all-in-one PCs with the latest specs',
            'رامات DDR4 و DDR5 بجميع السعات والسرعات': 'DDR4 & DDR5 RAM in all capacities and speeds',
            'هاردات SSD و HDD بمساحات تناسب كل احتياجك': 'SSD & HDD drives in sizes for every need',
            'كل الإكسسوارات والكماليات التقنية الأصلية': 'All original tech accessories and peripherals',
            'وصلات وكابلات أصلية بجودة عالية لجميع الأجهزة': 'Original high-quality cables for all devices',
            'أجهزة بروجكتور وشاشات عرض احترافية للشركات والمنازل': 'Professional projectors and displays for businesses and homes',
            'أحبار طابعات أصلية ومتوافقة لجميع موديلات الطابعات': 'Original and compatible printer ink for all printer models',
            'تشكيلة مواد غذائية مختارة بعناية وبجودة مضمونة': 'A carefully selected range of food products with guaranteed quality',
            '🔥 الأكثر مبيعاً': '🔥 Best Sellers',
            'الأكثر مبيعاً': 'Best Seller'
        };

        // ---------- قواعد أنماط للنصوص الديناميكية (أرقام متغيرة) ----------
        var DORA_EN_PATTERNS = [
            [/^متوفر بكثرة \((\d+) قطعة\)$/, function (m) { return 'Well stocked (' + m[1] + ' pcs)'; }],
            [/^متوفر \((\d+) قطعة\)$/, function (m) { return 'In stock (' + m[1] + ' pcs)'; }],
            [/^الكمية محدودة \((\d+) متبقي\)$/, function (m) { return 'Limited stock (' + m[1] + ' left)'; }],
            [/^(\d+) قطعة$/, function (m) { return m[1] + ' pcs'; }],
            [/^([0-9٠-٩][0-9٠-٩,٬]*)\s*ر\.س$/, function (m) { return m[1] + ' SAR'; }],
            [/^شامل الضريبة \(15%\):?\s*([0-9٠-٩,٬]*)\s*ر\.س$/, function (m) { return 'Incl. VAT (15%): ' + m[1] + ' SAR'; }],
            [/^([+\d]+)\s*منتج متاح$/, function (m) { return m[1] + ' products available'; }],
            [/^\+?(\d+)\s*منتجات$/, function (m) { return m[1] + ' products'; }],
            [/^\+(\d+)$/, function (m) { return '+' + m[1]; }],
            [/^(\d(?:\.\d)?) \((\d+) تقييم\)$/, function (m) { return m[1] + ' (' + m[2] + ' reviews)'; }],
            [/^(\d+) تقييم$/, function (m) { return m[1] + ' reviews'; }],
            [/^خصم -(\d+)%$/, function (m) { return 'Sale -' + m[1] + '%'; }],
            [/^خصم (\d+)%$/, function (m) { return m[1] + '% Off'; }],
            [/^جديد -(\d+)%$/, function (m) { return 'New -' + m[1] + '%'; }],
            [/^✅ تمت إضافة .+ للسلة$/, function () { return '✅ Added to cart'; }],
            [/^⚠️ لا يمكن إضافة المزيد، الكمية المتبقية محدودة( \((\d+)\))?$/, function (m) { return '⚠️ Cannot add more, limited stock' + (m[2] ? ' (' + m[2] + ')' : ''); }],
            [/^✅ تم نسخ: (.+)$/, function (m) { return '✅ Copied: ' + m[1]; }],
            [/^([+\d]+) فني متخصص$/, function (m) { return '+' + m[1] + ' Specialized Technicians'; }],
            [/^أكثر من (\d+) عميل/, function (m) { return 'More than ' + m[1] + ' clients'; }]
        ];

        // ==================================================
        // محرك الترجمة اليدوية (EN) — نصوص + خصائص + مراقبة ديناميكية
        // ==================================================
        var doraENActive = false;
        var doraOrigNodes = [];                    // textNodes المترجمة
        var doraOrigMap = new WeakMap();           // textNode -> النص الأصلي
        var doraAttrOrig = [];                     // [{el, attr, orig}]
        var doraAttrMap = new WeakMap();           // el -> {attr: true} لمنع التكرار
        var doraObserver = null;

        var DORA_SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, IFRAME: 1, CODE: 1, PRE: 1, TEXTAREA: 1 };

        function doraTrStr(s) {
            if (!s) return null;
            var t = s.replace(/\s+/g, ' ').trim();
            if (!t || !/[؀-ۿ]/.test(t)) return null;
            if (Object.prototype.hasOwnProperty.call(DORA_EN, t)) return DORA_EN[t];
            for (var i = 0; i < DORA_EN_PATTERNS.length; i++) {
                var m = t.match(DORA_EN_PATTERNS[i][0]);
                if (m) return DORA_EN_PATTERNS[i][1](m);
            }
            return null;
        }

        function doraSkipEl(el) {
            return el && el.closest && el.closest('.notranslate, #dhbLangMenu, #doraGTHidden, .goog-te-combo');
        }

        function doraTrTextNode(node) {
            var tr = doraTrStr(node.nodeValue);
            if (tr && tr !== node.nodeValue) {
                if (doraOrigMap.get(node) == null) {
                    doraOrigMap.set(node, node.nodeValue);
                    doraOrigNodes.push(node);
                }
                node.nodeValue = tr;
            }
        }

        function doraWalk(root) {
            if (!root) return;
            if (root.nodeType === 3) { // text node مباشرة
                var p0 = root.parentElement;
                if (p0 && !DORA_SKIP_TAGS[p0.tagName] && !doraSkipEl(p0)) doraTrTextNode(root);
                return;
            }
            if (root.nodeType !== 1 && root.nodeType !== 9) return;
            var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
                acceptNode: function (node) {
                    if (!node.nodeValue || !/[؀-ۿ]/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
                    var p = node.parentElement;
                    if (!p || DORA_SKIP_TAGS[p.tagName] || doraSkipEl(p)) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            });
            var nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            for (var i = 0; i < nodes.length; i++) doraTrTextNode(nodes[i]);
        }

        var DORA_ATTRS = ['placeholder', 'aria-label', 'title'];
        function doraWalkAttrs(root) {
            if (!root) return;
            var list = [];
            if (root.nodeType === 1 && root.matches && root.matches('[placeholder],[aria-label],[title]')) list.push(root);
            if (root.querySelectorAll) {
                var q = root.querySelectorAll('[placeholder],[aria-label],[title]');
                for (var i = 0; i < q.length; i++) list.push(q[i]);
            }
            list.forEach(function (el) {
                if (doraSkipEl(el)) return;
                var rec = doraAttrMap.get(el);
                if (!rec) { rec = {}; doraAttrMap.set(el, rec); }
                DORA_ATTRS.forEach(function (attr) {
                    if (rec[attr]) return;
                    var v = el.getAttribute(attr);
                    if (v && /[؀-ۿ]/.test(v)) {
                        var tr = doraTrStr(v);
                        if (tr && tr !== v) {
                            doraAttrOrig.push({ el: el, attr: attr, orig: v });
                            rec[attr] = true;
                            el.setAttribute(attr, tr);
                        }
                    }
                });
            });
        }

        function doraStartObserver() {
            if (doraObserver || typeof MutationObserver === 'undefined') return;
            doraObserver = new MutationObserver(function (muts) {
                if (!doraENActive) return;
                muts.forEach(function (mu) {
                    if (mu.type === 'characterData') {
                        var node = mu.target;
                        if (node && node.nodeValue && /[؀-ۿ]/.test(node.nodeValue)) {
                            var p = node.parentElement;
                            if (p && !DORA_SKIP_TAGS[p.tagName] && !doraSkipEl(p)) doraTrTextNode(node);
                        }
                    } else {
                        for (var i = 0; i < mu.addedNodes.length; i++) {
                            var n = mu.addedNodes[i];
                            if (n.nodeType === 1) { doraWalk(n); doraWalkAttrs(n); }
                            else if (n.nodeType === 3) { doraWalk(n); }
                        }
                    }
                });
            });
            doraObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
        }

        function doraApplyEN() {
            if (doraENActive) return;
            doraENActive = true;
            document.documentElement.setAttribute('dir', 'ltr');
            document.documentElement.setAttribute('lang', 'en');
            doraWalk(document.body);
            doraWalkAttrs(document.body);
            doraStartObserver();
            dhbUpdateLangUI();
        }

        function doraRestoreAR() {
            if (!doraENActive) return;
            doraENActive = false;
            if (doraObserver) { doraObserver.disconnect(); doraObserver = null; }
            for (var i = 0; i < doraOrigNodes.length; i++) {
                var node = doraOrigNodes[i];
                var orig = doraOrigMap.get(node);
                if (orig != null && node.nodeValue !== orig) node.nodeValue = orig;
            }
            doraOrigNodes = [];
            for (var j = 0; j < doraAttrOrig.length; j++) {
                var r = doraAttrOrig[j];
                try { r.el.setAttribute(r.attr, r.orig); } catch (e) {}
            }
            doraAttrOrig = [];
            doraAttrMap = new WeakMap();
            document.documentElement.setAttribute('dir', 'rtl');
            document.documentElement.setAttribute('lang', 'ar');
            dhbUpdateLangUI();
        }

        // ==================================================
        // Google Translate — يُحمّل فقط عند اختيار لغة غير ar/en
        // ==================================================
        var doraGTLoading = false;

        function doraGTSetCookie(code) {
            var val = '/ar/' + code;
            try {
                document.cookie = 'googtrans=' + val + ';path=/';
                document.cookie = 'googtrans=' + val + ';path=/;domain=' + location.hostname;
            } catch (e) {}
        }
        function doraGTClearCookie() {
            var exp = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
            try {
                document.cookie = 'googtrans=;' + exp + ';path=/';
                document.cookie = 'googtrans=;' + exp + ';path=/;domain=' + location.hostname;
                document.cookie = 'googtrans=;' + exp + ';path=/;domain=.' + location.hostname;
            } catch (e) {}
        }

        function doraGTLoad(cb) {
            if (window.google && window.google.translate && window.google.translate.TranslateElement) { cb(); return; }
            if (doraGTLoading) {
                var wait = setInterval(function () {
                    if (window.google && window.google.translate && window.google.translate.TranslateElement) {
                        clearInterval(wait); cb();
                    }
                }, 300);
                return;
            }
            doraGTLoading = true;
            if (!document.getElementById('doraGTHidden')) {
                var d = document.createElement('div');
                d.id = 'doraGTHidden';
                d.className = 'notranslate';
                d.style.display = 'none';
                document.body.appendChild(d);
            }
            window.googleTranslateElementInit = function () {
                try {
                    new google.translate.TranslateElement({ pageLanguage: 'ar', autoDisplay: false }, 'doraGTHidden');
                } catch (e) {}
                cb();
            };
            var s = document.createElement('script');
            s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            s.async = true;
            document.head.appendChild(s);
        }

        function doraGTApply(code) {
            doraGTSetCookie(code);
            document.documentElement.classList.add('dora-gt-active');
            doraGTLoad(function () {
                var tries = 0;
                var iv = setInterval(function () {
                    var combo = document.querySelector('.goog-te-combo');
                    if (combo) {
                        clearInterval(iv);
                        combo.value = code;
                        combo.dispatchEvent(new Event('change'));
                    } else if (++tries > 80) { clearInterval(iv); }
                }, 250);
            });
        }

        // ==================================================
        // شريط أزرار البانر (العروض / تتبع الطلب / اللغة)
        // ==================================================
        function dhbInjectCSS() {
            if (document.getElementById('doraHeroBarStyle')) return;
            var st = document.createElement('style');
            st.id = 'doraHeroBarStyle';
            st.textContent = [
                '#doraHeroBar{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;',
                'padding:6px 12px;position:relative;z-index:5;font-family:\'Cairo\',\'Tajawal\',sans-serif;}',
                '#doraHeroBar.dhb-abs{position:absolute;top:100px;left:0;right:0;padding:0 12px;}',
                '#doraHeroBar.dhb-top{margin-top:110px;}',
                '.dhb-pill{display:inline-flex;align-items:center;gap:6px;padding:8px 20px;border-radius:50px;',
                'font-size:14px;font-weight:800;color:#FDE68A;background:rgba(8,15,35,.55);',
                'border:1px solid rgba(245,158,11,.45);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);',
                'text-decoration:none;cursor:pointer;transition:all .25s ease;box-shadow:0 4px 18px rgba(0,0,0,.25);',
                'font-family:inherit;line-height:1.4;white-space:nowrap;}',
                '.dhb-pill:hover{transform:translateY(-2px);border-color:rgba(245,158,11,.9);',
                'background:rgba(20,25,50,.78);box-shadow:0 8px 26px rgba(245,158,11,.28);color:#FFF7E0;}',
                '.dhb-lang-wrap{position:relative;}',
                '#dhbLangMenu{display:none;position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%);',
                'min-width:200px;background:rgba(8,15,35,.94);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);',
                'border:1px solid rgba(245,158,11,.35);border-radius:14px;padding:8px;z-index:10060;',
                'box-shadow:0 14px 40px rgba(0,0,0,.55);direction:rtl;text-align:right;}',
                '#dhbLangMenu.dhb-open{display:block;}',
                '#dhbLangMenu button{display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;border:none;',
                'background:transparent;color:#E8EDF5;font-size:14px;font-weight:700;border-radius:9px;cursor:pointer;',
                'font-family:inherit;transition:background .2s ease;text-align:right;}',
                '#dhbLangMenu button:hover{background:rgba(245,158,11,.15);color:#FDE68A;}',
                '#dhbLangMenu button.dhb-active{background:rgba(245,158,11,.18);color:#FDE68A;}',
                '#dhbLangMenu .dhb-check{margin-inline-start:auto;color:#F59E0B;font-weight:900;visibility:hidden;}',
                '#dhbLangMenu button.dhb-active .dhb-check{visibility:visible;}',
                '#dhbOtherList{display:none;margin-top:4px;border-top:1px solid rgba(245,158,11,.2);padding-top:6px;',
                'max-height:250px;overflow-y:auto;}',
                '#dhbOtherList.dhb-open{display:block;}',
                '#dhbOtherList::-webkit-scrollbar{width:5px}',
                '#dhbOtherList::-webkit-scrollbar-thumb{background:rgba(245,158,11,.4);border-radius:4px}',
                '#dhbLangOtherToggle .dhb-sub-arrow{margin-inline-start:auto;color:#F59E0B;transition:transform .25s ease;}',
                '#dhbLangOtherToggle.dhb-open .dhb-sub-arrow{transform:rotate(90deg);}',
                // إخفاء شريط Google Translate القبيح مع إبقاء الترجمة شغالة
                'html.dora-gt-active body{top:0 !important;position:static !important;}',
                'html.dora-gt-active .goog-te-banner-frame,',
                'html.dora-gt-active .goog-te-banner-frame.skiptranslate,',
                'html.dora-gt-active .VIpgJd-ZVi9od-ORHb-OEVmcd,',
                'html.dora-gt-active .VIpgJd-ZVi9od-aZ2wEe-wOHMyf{display:none !important;}',
                'html.dora-gt-active #goog-gt-tt,html.dora-gt-active .goog-te-balloon-frame{display:none !important;}',
                'html.dora-gt-active .goog-text-highlight{background:transparent !important;box-shadow:none !important;}',
                '#goog-gt-tt{display:none !important;}',
                '@media (max-width:640px){',
                '#doraHeroBar{gap:6px;padding:4px 6px;}',
                '#doraHeroBar.dhb-abs{position:relative;top:auto;left:auto;right:auto;margin:96px auto 10px;}',
                '.dhb-pill{padding:7px 13px;font-size:12.5px;}',
                '#dhbLangMenu{min-width:180px;}',
                '}'
            ].join('');
            document.head.appendChild(st);
        }

        function dhbUpdateLangUI() {
            var lbl = document.getElementById('dhbLangLabel');
            var mode = doraGetLang();
            if (lbl) {
                if (mode === 'en') lbl.textContent = 'English';
                else if (mode.indexOf('gt:') === 0) {
                    var code = mode.slice(3);
                    var found = null;
                    for (var i = 0; i < DORA_GT_LANGS.length; i++) if (DORA_GT_LANGS[i][0] === code) found = DORA_GT_LANGS[i];
                    lbl.textContent = found ? found[1] : code;
                } else lbl.textContent = 'العربية';
            }
            var menu = document.getElementById('dhbLangMenu');
            if (menu) {
                var btns = menu.querySelectorAll('[data-dora-lang]');
                for (var j = 0; j < btns.length; j++) {
                    var v = btns[j].getAttribute('data-dora-lang');
                    btns[j].classList.toggle('dhb-active', v === mode || (v === 'ar' && mode === 'ar'));
                }
            }
        }

        function dhbCloseMenu() {
            var menu = document.getElementById('dhbLangMenu');
            if (menu) menu.classList.remove('dhb-open');
        }

        window.doraChooseLang = function (choice) {
            var cur = doraGetLang();
            if (choice === cur) { dhbCloseMenu(); return; }
            if (choice === 'ar') {
                doraSetLang('ar');
                dhbCloseMenu();
                if (cur.indexOf('gt:') === 0) { doraGTClearCookie(); location.reload(); return; }
                doraRestoreAR();
            } else if (choice === 'en') {
                doraSetLang('en');
                dhbCloseMenu();
                if (cur.indexOf('gt:') === 0) { doraGTClearCookie(); location.reload(); return; }
                doraApplyEN();
            } else if (choice.indexOf('gt:') === 0) {
                // وضع Google يلغي وضع EN اليدوي نظيفاً (والعكس) — إعادة التحميل هي الأثبت مع Google
                if (doraENActive) doraRestoreAR();
                doraSetLang(choice);
                doraGTSetCookie(choice.slice(3));
                location.reload();
            }
        };

        function dhbInject() {
            if (document.getElementById('doraHeroBar')) return;
            dhbInjectCSS();

            var bar = document.createElement('div');
            bar.id = 'doraHeroBar';

            var html = '<a class="dhb-pill dhb-offers" href="offers.html">🔥 العروض</a>' +
                '<a class="dhb-pill dhb-track" href="track.html">📦 تتبع طلبك</a>' +
                '<div class="dhb-lang-wrap">' +
                '<button type="button" class="dhb-pill dhb-lang" id="dhbLangBtn" aria-haspopup="true" aria-expanded="false">🌐 <span id="dhbLangLabel">العربية</span> <span style="font-size:10px;color:#F59E0B">▾</span></button>' +
                '<div id="dhbLangMenu" class="notranslate" role="menu">' +
                '<button type="button" data-dora-lang="ar">🇸🇦 العربية <span class="dhb-check">✓</span></button>' +
                '<button type="button" data-dora-lang="en">🇬🇧 English <span class="dhb-check">✓</span></button>' +
                '<button type="button" id="dhbLangOtherToggle">🌍 <span>لغة أخرى / Other</span> <span class="dhb-sub-arrow">▸</span></button>' +
                '<div id="dhbOtherList">';
            for (var i = 0; i < DORA_GT_LANGS.length; i++) {
                var L = DORA_GT_LANGS[i];
                html += '<button type="button" data-dora-lang="gt:' + L[0] + '">' + L[2] + ' ' + L[1] + ' <span class="dhb-check">✓</span></button>';
            }
            html += '</div></div></div>';
            bar.innerHTML = html;

            // نقطة الحقن: داخل أول بانر (hero) كشريط مطلق أعلى البانر، وإلا أعلى body
            var hero = document.querySelector('.page-hero, .service-hero, .services-hero, .hero');
            if (hero) {
                bar.classList.add('dhb-abs');
                // يُدرج كأول عنصر: على الموبايل يصبح في التدفق الطبيعي فوق المحتوى (بلا تداخل)
                hero.insertBefore(bar, hero.firstChild);
            } else {
                var header = document.querySelector('header.header, header');
                if (header) bar.classList.add('dhb-top');
                document.body.insertBefore(bar, document.body.firstChild);
            }

            // أحداث القائمة
            var langBtn = document.getElementById('dhbLangBtn');
            var menu = document.getElementById('dhbLangMenu');
            langBtn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                var open = menu.classList.toggle('dhb-open');
                langBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
            menu.addEventListener('click', function (ev) { ev.stopPropagation(); });
            var otherToggle = document.getElementById('dhbLangOtherToggle');
            var otherList = document.getElementById('dhbOtherList');
            otherToggle.addEventListener('click', function (ev) {
                ev.stopPropagation();
                otherList.classList.toggle('dhb-open');
                otherToggle.classList.toggle('dhb-open');
            });
            var langBtns = menu.querySelectorAll('[data-dora-lang]');
            for (var j = 0; j < langBtns.length; j++) {
                langBtns[j].addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    window.doraChooseLang(this.getAttribute('data-dora-lang'));
                });
            }
            document.addEventListener('click', dhbCloseMenu);
            document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') dhbCloseMenu(); });
        }

        // ---------- التهيئة ----------
        function doraLangInit() {
            try { dhbInject(); } catch (e1) {}
            try { dhbUpdateLangUI(); } catch (e2) {}
            var mode = doraGetLang();
            try {
                if (mode === 'en') { doraApplyEN(); }
                else if (mode.indexOf('gt:') === 0) { doraGTApply(mode.slice(3)); }
            } catch (e3) {}
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', doraLangInit);
        } else {
            doraLangInit();
        }
    } catch (e) {
        /* صمت تام — لا نكسر أي صفحة */
    }
})();
