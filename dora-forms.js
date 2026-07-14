// Supabase Configuration
const SUPABASE_URL = 'https://kcbmvxuzjlaooknwhqqb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MLki30Et4ArJbDSMuc4Wyw_SbzwXoS5';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// ===== REVIEW & MESSAGE SYSTEM =====
// This script adds review and contact forms to all pages

(function() {
    // Don't run on admin page
    if (window.location.pathname.includes('admin.html')) return;

    // Load saved settings
    const settings = JSON.parse(localStorage.getItem('doraSettings')) || {};

    // Create Review Form Modal
    function createReviewModal() {
        const modal = document.createElement('div');
        modal.id = 'reviewModal';
        modal.className = 'dora-modal';
        modal.innerHTML = `
            <div class="dora-modal-content">
                <div class="dora-modal-header">
                    <h3>⭐ أضف تقييمك</h3>
                    <button class="dora-modal-close" onclick="closeReviewModal()">✕</button>
                </div>
                <form id="reviewForm" onsubmit="return submitReview(event)">
                    <div class="dora-form-group">
                        <label>👤 اسمك</label>
                        <input type="text" id="reviewName" placeholder="أدخل اسمك" required>
                    </div>
                    <div class="dora-form-group">
                        <label>⭐ التقييم</label>
                        <div class="dora-star-rating" id="starRating">
                            <span class="dora-star" data-value="1">★</span>
                            <span class="dora-star" data-value="2">★</span>
                            <span class="dora-star" data-value="3">★</span>
                            <span class="dora-star" data-value="4">★</span>
                            <span class="dora-star" data-value="5">★</span>
                        </div>
                        <input type="hidden" id="reviewRating" value="5">
                    </div>
                    <div class="dora-form-group">
                        <label>📦 المنتج/الخدمة</label>
                        <input type="text" id="reviewProduct" placeholder="اسم المنتج أو الخدمة">
                    </div>
                    <div class="dora-form-group">
                        <label>💬 رأيك</label>
                        <textarea id="reviewText" rows="4" placeholder="اكتب تقييمك هنا..." required></textarea>
                    </div>
                    <button type="submit" class="dora-btn-submit">📨 إرسال التقييم</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Star rating functionality
        const stars = modal.querySelectorAll('.dora-star');
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const value = parseInt(this.dataset.value);
                document.getElementById('reviewRating').value = value;
                stars.forEach((s, i) => {
                    s.classList.toggle('active', i < value);
                });
            });
        });
        // Set default 5 stars
        stars.forEach(s => s.classList.add('active'));
    }

    // Create Message Form Modal
    function createMessageModal() {
        const modal = document.createElement('div');
        modal.id = 'messageModal';
        modal.className = 'dora-modal';
        modal.innerHTML = `
            <div class="dora-modal-content">
                <div class="dora-modal-header">
                    <h3>📨 تواصل معنا</h3>
                    <button class="dora-modal-close" onclick="closeMessageModal()">✕</button>
                </div>
                <form id="messageForm" onsubmit="return submitMessage(event)">
                    <div class="dora-form-group">
                        <label>👤 اسمك</label>
                        <input type="text" id="msgName" placeholder="أدخل اسمك" required>
                    </div>
                    <div class="dora-form-group">
                        <label>📱 رقم الجوال</label>
                        <input type="tel" id="msgPhone" placeholder="05xxxxxxxx" required pattern="05[0-9]{8}">
                    </div>
                    <div class="dora-form-group">
                        <label>✉️ البريد الإلكتروني</label>
                        <input type="email" id="msgEmail" placeholder="your@email.com" required>
                    </div>
                    <div class="dora-form-group">
                        <label>📌 الموضوع</label>
                        <select id="msgSubject" required>
                            <option value="">اختر الموضوع</option>
                            <option value="استفسار">❓ استفسار</option>
                            <option value="شكوى">😞 شكوى</option>
                            <option value="اقتراح">💡 اقتراح</option>
                            <option value="طلب منتج">📦 طلب منتج</option>
                            <option value="أخرى">📝 أخرى</option>
                        </select>
                    </div>
                    <div class="dora-form-group">
                        <label>💬 الرسالة</label>
                        <textarea id="msgText" rows="4" placeholder="اكتب رسالتك هنا..." required></textarea>
                    </div>
                    <button type="submit" class="dora-btn-submit">📨 إرسال الرسالة</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Add styles
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .dora-modal {display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;align-items:center;justify-content:center;padding:20px}
            .dora-modal.active {display:flex}
            .dora-modal-content {background:rgba(15,12,41,0.95);backdrop-filter:blur(20px);border:1px solid rgba(239,68,68,0.3);border-radius:24px;padding:30px;width:100%;max-width:450px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5)}
            .dora-modal-header {display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
            .dora-modal-header h3 {font-size:20px;font-weight:900;color:#fff}
            .dora-modal-close {background:none;border:none;color:#fff;font-size:24px;cursor:pointer;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:all 0.3s}
            .dora-modal-close:hover {background:rgba(255,255,255,0.1)}
            .dora-form-group {margin-bottom:15px}
            .dora-form-group label {display:block;color:rgba(255,255,255,0.8);font-size:13px;margin-bottom:6px;font-weight:600}
            .dora-form-group input, .dora-form-group textarea, .dora-form-group select {width:100%;padding:12px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:#fff;font-size:14px;font-family:'Cairo','Tajawal',sans-serif;transition:all 0.3s}
            .dora-form-group input:focus, .dora-form-group textarea:focus, .dora-form-group select:focus {outline:none;border-color:#EF4444;box-shadow:0 0 15px rgba(239,68,68,0.3)}
            .dora-form-group input::placeholder, .dora-form-group textarea::placeholder {color:rgba(255,255,255,0.4)}
            .dora-form-group select option {background:#1a1a2e;color:#fff}
            .dora-star-rating {display:flex;gap:8px;font-size:28px;cursor:pointer;justify-content:center;margin:10px 0}
            .dora-star-rating .dora-star {color:rgba(255,255,255,0.3);transition:all 0.2s;cursor:pointer}
            .dora-star-rating .dora-star.active, .dora-star-rating .dora-star:hover {color:#F59E0B}
            .dora-btn-submit {width:100%;padding:14px;background:linear-gradient(135deg, #EF4444, #DC2626);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;transition:all 0.3s;font-family:'Cairo','Tajawal',sans-serif;margin-top:10px}
            .dora-btn-submit:hover {transform:translateY(-2px);box-shadow:0 8px 25px rgba(239,68,68,0.4)}
            .dora-btn-float {position:fixed;bottom:100px;left:30px;z-index:9998;width:55px;height:55px;background:linear-gradient(135deg, #F59E0B, #D97706);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 4px 20px rgba(245,158,11,0.4);transition:all 0.3s;border:none;animation:dora-pulse 2s infinite}
            .dora-btn-float:hover {transform:scale(1.1);box-shadow:0 8px 30px rgba(245,158,11,0.6)}
            .dora-btn-float.msg-btn {bottom:170px;background:linear-gradient(135deg, #3B82F6, #2563EB);box-shadow:0 4px 20px rgba(59,130,246,0.4)}
            .dora-btn-float.msg-btn:hover {box-shadow:0 8px 30px rgba(59,130,246,0.6)}
            @keyframes dora-pulse {0%,100%{box-shadow:0 4px 20px rgba(245,158,11,0.4)}50%{box-shadow:0 4px 30px rgba(245,158,11,0.7)}}
            .dora-toast {position:fixed;bottom:30px;right:30px;background:rgba(15,12,41,0.95);color:#fff;padding:15px 25px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.5);display:flex;align-items:center;gap:10px;transform:translateY(100px);opacity:0;transition:all 0.4s;z-index:10000;border:1px solid rgba(239,68,68,0.3);font-family:'Cairo','Tajawal',sans-serif}
            .dora-toast.show {transform:translateY(0);opacity:1}
            .dora-toast-icon {font-size:20px}
            .dora-tooltip {position:absolute;right:65px;background:#fff;color:#333;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;white-space:nowrap;opacity:0;visibility:hidden;transition:all 0.3s;box-shadow:0 2px 10px rgba(0,0,0,0.1);font-family:'Cairo','Tajawal',sans-serif}
            .dora-btn-float:hover .dora-tooltip {opacity:1;visibility:visible;right:70px}
            @media(max-width:768px){.dora-tooltip{display:none}}
        `;
        document.head.appendChild(style);
    }

    // Add floating buttons
    function addFloatingButtons() {
        const reviewBtn = document.createElement('button');
        reviewBtn.className = 'dora-btn-float';
        reviewBtn.innerHTML = '⭐<span class="dora-tooltip">أضف تقييم</span>';
        reviewBtn.onclick = openReviewModal;
        document.body.appendChild(reviewBtn);

        const msgBtn = document.createElement('button');
        msgBtn.className = 'dora-btn-float msg-btn';
        msgBtn.innerHTML = '📨<span class="dora-tooltip">تواصل معنا</span>';
        msgBtn.onclick = openMessageModal;
        document.body.appendChild(msgBtn);
    }

    // Initialize
    addStyles();
    createReviewModal();
    createMessageModal();
    addFloatingButtons();

})();

// Global functions
function openReviewModal() {
    document.getElementById('reviewModal').classList.add('active');
    document.getElementById('reviewForm').reset();
    document.querySelectorAll('.dora-star').forEach(s => s.classList.add('active'));
    document.getElementById('reviewRating').value = 5;
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.remove('active');
}

function openMessageModal() {
    document.getElementById('messageModal').classList.add('active');
    document.getElementById('messageForm').reset();
}

function closeMessageModal() {
    document.getElementById('messageModal').classList.remove('active');
}

function showToast(message, type) {
    const existing = document.querySelector('.dora-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'dora-toast';
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
    toast.innerHTML = `<span class="dora-toast-icon">${icon}</span><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

async function submitReview(e) {
    e.preventDefault();
    const name = document.getElementById('reviewName').value.trim();
    const rating = parseInt(document.getElementById('reviewRating').value);
    const product = document.getElementById('reviewProduct').value.trim();
    const text = document.getElementById('reviewText').value.trim();

    if (!name || !text) {
        showToast('❌ الرجاء ملء جميع الحقول', 'error');
        return false;
    }

    // Save to Supabase
    const { error } = await supabase.from('reviews').insert([{
        name,
        rating,
        product: product || 'منتج عام',
        text,
        date: new Date().toLocaleDateString('ar-SA'),
        status: 'new'
    }]);

    if (error) {
        showToast('❌ حدث خطأ: ' + error.message, 'error');
        return false;
    }

    closeReviewModal();
    showToast('✅ تم إرسال التقييم بنجاح! شكراً لك', 'success');
    return false;
}

async function submitMessage(e) {
    e.preventDefault();
    const name = document.getElementById('msgName').value.trim();
    const phone = document.getElementById('msgPhone').value.trim();
    const email = document.getElementById('msgEmail').value.trim();
    const subject = document.getElementById('msgSubject').value;
    const text = document.getElementById('msgText').value.trim();

    if (!name || !phone || !email || !subject || !text) {
        showToast('❌ الرجاء ملء جميع الحقول', 'error');
        return false;
    }

    // Save to Supabase
    const { error } = await supabase.from('messages').insert([{
        name,
        phone,
        email,
        subject,
        message: text,
        date: new Date().toLocaleDateString('ar-SA'),
        status: 'new'
    }]);

    if (error) {
        showToast('❌ حدث خطأ: ' + error.message, 'error');
        return false;
    }

    closeMessageModal();
    showToast('✅ تم إرسال رسالتك بنجاح! سنتواصل معك قريباً', 'success');
    return false;
}

// Close modals on outside click
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('dora-modal')) {
        e.target.classList.remove('active');
    }
});

// ===== ADMIN SHORTCUT =====
// Press Ctrl+Shift+A to show admin button
let adminButtonVisible = false;

document.addEventListener('keydown', function(e) {
    // Check for Ctrl+Shift+A
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        toggleAdminButton();
    }
});

function toggleAdminButton() {
    let adminBtn = document.getElementById('doraAdminBtn');

    if (!adminBtn) {
        // Create admin button
        adminBtn = document.createElement('button');
        adminBtn.id = 'doraAdminBtn';
        adminBtn.innerHTML = '⚙️';
        adminBtn.title = 'لوحة الإدارة';
        adminBtn.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 9999;
            width: 45px;
            height: 45px;
            background: linear-gradient(135deg, #EF4444, #DC2626);
            border: none;
            border-radius: 12px;
            color: white;
            font-size: 20px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(239,68,68,0.4);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Cairo', 'Tajawal', sans-serif;
        `;
        adminBtn.onclick = openAdminLoginModal;
        document.body.appendChild(adminBtn);

        // Add tooltip
        const tooltip = document.createElement('div');
        tooltip.id = 'doraAdminTooltip';
        tooltip.textContent = 'لوحة الإدارة';
        tooltip.style.cssText = `
            position: fixed;
            top: 70px;
            left: 20px;
            z-index: 9999;
            background: rgba(15,12,41,0.95);
            color: white;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            font-family: 'Cairo', 'Tajawal', sans-serif;
            border: 1px solid rgba(239,68,68,0.3);
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            white-space: nowrap;
        `;
        document.body.appendChild(tooltip);

        adminBtn.onmouseenter = function() {
            this.style.transform = 'scale(1.1)';
            this.style.boxShadow = '0 6px 20px rgba(239,68,68,0.6)';
            tooltip.style.opacity = '1';
            tooltip.style.visibility = 'visible';
        };
        adminBtn.onmouseleave = function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 4px 15px rgba(239,68,68,0.4)';
            tooltip.style.opacity = '0';
            tooltip.style.visibility = 'hidden';
        };
    }

    // Toggle visibility
    adminButtonVisible = !adminButtonVisible;
    adminBtn.style.display = adminButtonVisible ? 'flex' : 'none';

    if (adminButtonVisible) {
        showToast('⚙️ زر الإدارة ظاهر! اضغط عليه للدخول', 'success');
    }
}

// Admin Login Modal
function openAdminLoginModal() {
    const existing = document.getElementById('doraAdminLoginModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'doraAdminLoginModal';
    modal.className = 'dora-modal active';
    modal.innerHTML = `
        <div class="dora-modal-content" style="max-width:400px;">
            <div class="dora-modal-header">
                <h3>🔐 تسجيل الدخول</h3>
                <button class="dora-modal-close" onclick="closeAdminLoginModal()">✕</button>
            </div>
            <form id="adminLoginForm" onsubmit="return handleAdminLogin(event)">
                <div class="dora-form-group">
                    <label>👤 اسم المستخدم</label>
                    <input type="text" id="adminLoginUser" placeholder="admin" required>
                </div>
                <div class="dora-form-group">
                    <label>🔒 كلمة المرور</label>
                    <input type="password" id="adminLoginPass" placeholder="••••••" required>
                </div>
                <div id="adminLoginError" style="color:#EF4444;font-size:13px;text-align:center;margin-bottom:10px;display:none;">
                    ❌ اسم المستخدم أو كلمة المرور غير صحيحة
                </div>
                <button type="submit" class="dora-btn-submit">🔓 دخول</button>
            </form>
            <p style="text-align:center;color:rgba(255,255,255,0.5);font-size:12px;margin-top:15px;">
                اضغط Ctrl+Shift+A لإخفاء الزر
            </p>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeAdminLoginModal() {
    const modal = document.getElementById('doraAdminLoginModal');
    if (modal) modal.remove();
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const user = document.getElementById('adminLoginUser').value;
    const pass = document.getElementById('adminLoginPass').value;

    // Verify admin credentials from Supabase
    const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', user)
        .eq('password', pass)
        .single();

    if (error || !data) {
        document.getElementById('adminLoginError').style.display = 'block';
        return false;
    }

    localStorage.setItem('adminLoggedIn', 'true');
    localStorage.setItem('adminLoginTime', Date.now());
    closeAdminLoginModal();
    window.open('admin.html?secret=' + pass, '_blank');
    showToast('✅ تم تسجيل الدخول! جاري فتح لوحة الإدارة...', 'success');
    return false;
}
