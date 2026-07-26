const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 🔐 أمان - Helmet (XSS, Clickjacking, MIME Sniffing, etc.)
// ============================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://kcbmvxuzjlaooknwhqqb.supabase.co", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://kcbmvxuzjlaooknwhqqb.supabase.co"],
      connectSrc: ["'self'", "https://kcbmvxuzjlaooknwhqqb.supabase.co"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      mediaSrc: ["'self'", "https://raw.githubusercontent.com"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
}));

// ============================================================
// 🚦 Rate Limiting - منع هجمات Brute Force و DDoS
// ============================================================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 500, // حد أقصى 500 طلب لكل IP
  message: '❌ تم تجاوز الحد الأقصى للطلبات. حاول مرة أخرى لاحقاً.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 20, // حد أقصى 20 محاولة تسجيل دخول
  message: '❌ محاولات تسجيل دخول كثيرة جداً. حاول بعد 15 دقيقة.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);
app.use('/auth', authLimiter);

// ============================================================
// 🗜️ Compression - تحسين الأداء
// ============================================================
app.use(compression({
  level: 6,
  threshold: 1024,
}));

// ============================================================
// 🌍 CORS - السماح فقط للدومين بتاعك
// ============================================================
const allowedOrigins = [
  'https://alshamal-df.com',
  'https://www.alshamal-df.com',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

app.use(cors({
  origin: function (origin, callback) {
    // السماح للطلبات بدون Origin (مثل Postman أو mobile apps)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked: ${origin}`);
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-client-info'],
  credentials: true,
  maxAge: 86400,
}));

// ============================================================
// 🛡️ منع الوصول للملفات الحساسة
// ============================================================
const sensitiveFiles = [
  '.env', '.git', 'package.json', 'package-lock.json',
  'server.js', 'node_modules', 'إعداد-*.sql', '*.sql',
  'admin-v2.js', 'account-system.js', 'dora-forms.js',
  'google-site-verification.html', 'CNAME'
];

app.use((req, res, next) => {
  const url = req.url.toLowerCase();
  const blocked = sensitiveFiles.some(file => {
    if (file.includes('*')) {
      const regex = new RegExp(file.replace('*', '.*').replace('.', '\\.'));
      return regex.test(url);
    }
    return url.includes(file);
  });

  if (blocked) {
    console.warn(`🚫 Blocked access to: ${url} from IP: ${req.ip}`);
    return res.status(403).send('🚫 الوصول ممنوع');
  }

  next();
});

// ============================================================
// 📂 Serve Static Files - مع حماية المجلدات الحساسة
// ============================================================
app.use(express.static(path.join(__dirname), {
  dotfiles: 'deny',
  index: false,
  setHeaders: (res, filePath) => {
    // منع تخزين ملفات JavaScript في الكاش (للأمان)
    if (filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    // ملفات HTML تتحدث بسرعة
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=7200');
    }
    // الصور والخطوط تتخزن أطول
    if (filePath.match(/\.(jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
  }
}));

// ============================================================
// 🏠 Routes
// ============================================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});

// ============================================================
// 🔒 حماية Supabase Keys
// ============================================================
app.use('/api/supabase-key', (req, res) => {
  // منع كشف المفاتيح من الكلاينت
  res.status(403).json({ error: '🚫 الوصول للمفاتيح ممنوع' });
});

// ============================================================
// 📄 صفحة 404 مخصصة
// ============================================================
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// ============================================================
// ❌ Error Handler
// ============================================================
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(500).send('❌ حدث خطأ في السيرفر. جاري الإصلاح...');
});

// ============================================================
// 🚀 Start Server
// ============================================================
app.listen(PORT, () => {
  console.log(`✅ Server running securely on port ${PORT}`);
  console.log(`🔒 Helmet: Active`);
  console.log(`🚦 Rate Limiting: Active`);
  console.log(`🌍 CORS: Restricted to allowed origins`);
  console.log(`🗜️ Compression: Active`);
});
