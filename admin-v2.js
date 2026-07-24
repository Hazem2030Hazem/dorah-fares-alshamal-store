/* ============================================================
   درة فارس الشمال — لوحة الإدارة المتكاملة V2
   طلبات، خدمات، عملاء، مدفوعات، تقييمات، رسائل
   ============================================================ */
(function(){
'use strict';

if (typeof supabaseClient === 'undefined' || !supabaseClient) {
  console.warn('Admin V2: Supabase client is unavailable.');
  return;
}

const adminState = {
  user: null,
  orders: [],
  services: [],
  customers: [],
  receipts: [],
  reviews: [],
  messages: [],
  settings: null
};

const orderStatuses = {
  new: 'جديد', review: 'قيد المراجعة', processing: 'قيد التجهيز',
  shipped: 'تم الشحن', delivered: 'تم التسليم', completed: 'مكتمل', cancelled: 'ملغي'
};
const paymentStatuses = {
  pending: 'بانتظار الدفع', review: 'بانتظار مراجعة الإيصال',
  paid: 'تم تأكيد الدفع', rejected: 'مرفوض', refunded: 'تم الاسترجاع'
};
const serviceStatuses = {
  new: 'جديد', contacted: 'تم التواصل', inspection: 'تمت المعاينة',
  in_progress: 'قيد التنفيذ', completed: 'مكتمل', cancelled: 'ملغي'
};
const receiptStatuses = { pending: 'بانتظار المراجعة', approved: 'مقبول', rejected: 'مرفوض' };
const reviewStatuses = { pending: 'بانتظار المراجعة', published: 'منشور', hidden: 'مخفي' };
const messageStatuses = { new: 'جديدة', read: 'مقروءة', replied: 'تم الرد', archived: 'مؤرشفة' };

function esc(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}
function dateAr(value){
  if (!value) return '—';
  try { return new Date(value).toLocaleString('ar-SA', {dateStyle:'medium', timeStyle:'short'}); }
  catch(_) { return String(value); }
}
function money(value){ return Number(value || 0).toLocaleString('ar-SA') + ' ر.س'; }
function adminToast(message, type){ if (typeof showToast === 'function') showToast(message, type); else alert(message); }
function normalizePhone(phone){
  let p = String(phone || '').replace(/\D/g, '');
  if (p.startsWith('05')) p = '966' + p.slice(1);
  return p;
}
function options(map, current){
  return Object.entries(map).map(([value,label]) => `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`).join('');
}
function addressText(address){
  if (!address) return '—';
  const a = typeof address === 'string' ? JSON.parse(address) : address;
  return [a.city, a.district, a.street, a.building].filter(Boolean).join(' — ') || '—';
}
function orderItems(order){
  const items = Array.isArray(order.items) ? order.items : [];
  return items.map(item => `<span>${esc(item.name)} × ${Number(item.qty || 1)}</span>`).join('');
}

async function currentUser(){
  const { data } = await supabaseClient.auth.getUser();
  return data.user || null;
}
async function currentProfile(userId){
  const { data } = await supabaseClient.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data || null;
}
async function isAdminUser(user){
  if (!user) return false;
  const profile = await currentProfile(user.id);
  return profile?.role === 'admin';
}

/* ============================================================
   دخول الأدمن — Supabase Auth + role=admin
   ============================================================ */
window.handleLogin = async function(e){
  e.preventDefault();
  const email = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const btn = e.target.querySelector('button[type="submit"]');
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.style.display = 'none';
  btn.disabled = true;
  btn.textContent = '⏳ جاري التحقق...';

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    btn.disabled = false; btn.textContent = 'دخول إلى لوحة التحكم';
    errorMsg.textContent = '❌ البريد الإلكتروني أو كلمة المرور غير صحيحة';
    errorMsg.style.display = 'block';
    return false;
  }

  const allowed = await isAdminUser(data.user);
  if (!allowed) {
    await supabaseClient.auth.signOut();
    btn.disabled = false; btn.textContent = 'دخول إلى لوحة التحكم';
    errorMsg.textContent = '❌ هذا الحساب لا يملك صلاحية الإدارة';
    errorMsg.style.display = 'block';
    return false;
  }

  adminState.user = data.user;
  localStorage.setItem('adminLoggedIn', 'true');
  localStorage.setItem('adminLoginTime', Date.now());
  showDashboard();
  adminToast('✅ أهلاً بك في لوحة الإدارة');
  return false;
};

window.logout = async function(){
  await supabaseClient.auth.signOut();
  localStorage.removeItem('adminLoggedIn');
  localStorage.removeItem('adminLoginTime');
  location.reload();
};

window.showDashboard = function(){
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  if (typeof loadProducts === 'function') loadProducts();
  if (typeof loadSettings === 'function') loadSettings();
  loadAdminV2Data();
};

function showLoginOnly(){
  const login = document.getElementById('loginSection');
  const dashboard = document.getElementById('dashboard');
  if (login) login.style.display = 'flex';
  if (dashboard) dashboard.style.display = 'none';
}

async function initAdminAuth(){
  const user = await currentUser();
  if (!user) {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminLoginTime');
    showLoginOnly();
    return;
  }
  const allowed = await isAdminUser(user);
  if (!allowed) {
    await supabaseClient.auth.signOut();
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminLoginTime');
    showLoginOnly();
    return;
  }
  adminState.user = user;
  showDashboard();
}

/* ============================================================
   التبويبات
   ============================================================ */
window.showTab = function(tabName){
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  const clicked = window.event?.target;
  if (clicked && clicked.classList) clicked.classList.add('active');
  const tab = document.getElementById(tabName + 'Tab');
  if (tab) tab.classList.add('active');

  if (tabName === 'orders') loadOrders();
  if (tabName === 'services') loadServiceRequests();
  if (tabName === 'customers') loadCustomers();
  if (tabName === 'receipts') loadReceipts();
  if (tabName === 'reviews') loadReviews();
  if (tabName === 'messages') loadMessages();
  if (tabName === 'settings') loadSettings();
};

async function loadAdminV2Data(){
  await Promise.allSettled([
    loadOrders(), loadServiceRequests(), loadCustomers(),
    loadReceipts(), loadReviews(), loadMessages()
  ]);
  updateStats();
}

/* ============================================================
   الطلبات
   ============================================================ */
window.loadOrders = async function(){
  const container = document.getElementById('ordersList');
  if (!container) return;
  container.innerHTML = '<div class="admin-empty">⏳ جاري تحميل الطلبات...</div>';
  const { data, error } = await supabaseClient.from('store_orders').select('*').order('created_at', { ascending:false });
  if (error) {
    container.innerHTML = `<div class="admin-empty error">تعذر تحميل الطلبات: ${esc(error.message)}</div>`;
    return;
  }
  adminState.orders = data || [];
  renderOrders();
  updateStats();
};

function renderOrders(){
  const container = document.getElementById('ordersList');
  if (!container) return;
  if (!adminState.orders.length) {
    container.innerHTML = '<div class="admin-empty">🛒 لا توجد طلبات بعد</div>';
    return;
  }
  container.innerHTML = `
    <div class="table-header admin-subheader"><h3>🛒 إدارة الطلبات</h3><button class="btn-add" onclick="exportOrders()">📥 تصدير الطلبات</button></div>
    ${adminState.orders.map(order => `
      <div class="admin-data-card order-admin-card">
        <div class="admin-card-main">
          <div class="admin-card-title">
            <strong>${esc(order.order_number || order.id)}</strong>
            <span>${dateAr(order.created_at)}</span>
          </div>
          <div class="admin-meta">
            <span>👤 ${esc(order.customer_name)}</span>
            <span>📱 ${esc(order.customer_phone)}</span>
            <span>✉️ ${esc(order.customer_email || '—')}</span>
          </div>
          <div class="admin-items">${orderItems(order)}</div>
          <p class="admin-note">📍 ${esc(addressText(order.address))}</p>
          <div class="admin-total">الإجمالي: <strong>${money(order.total)}</strong></div>
        </div>
        <div class="admin-card-actions">
          <label>حالة الطلب</label>
          <select onchange="updateOrderStatus('${order.id}', this.value)">${options(orderStatuses, order.status)}</select>
          <label>حالة الدفع</label>
          <select onchange="updatePaymentStatus('${order.id}', this.value)">${options(paymentStatuses, order.payment_status)}</select>
          ${order.receipt_path ? `<button class="btn-view" onclick="viewReceipt('${esc(order.receipt_path)}')">🧾 عرض الإيصال</button>` : '<span class="admin-muted">لا يوجد إيصال</span>'}
        </div>
      </div>
    `).join('')}
  `;
}

window.updateOrderStatus = async function(id, status){
  const { error } = await supabaseClient.from('store_orders').update({ status }).eq('id', id);
  if (error) return adminToast('❌ تعذر تحديث حالة الطلب: ' + error.message, 'error');
  const order = adminState.orders.find(o => o.id === id);
  if (order) order.status = status;
  renderOrders(); updateStats();
  adminToast('✅ تم تحديث حالة الطلب');
};
window.updatePaymentStatus = async function(id, payment_status){
  const { error } = await supabaseClient.from('store_orders').update({ payment_status }).eq('id', id);
  if (error) return adminToast('❌ تعذر تحديث حالة الدفع: ' + error.message, 'error');
  const order = adminState.orders.find(o => o.id === id);
  if (order) order.payment_status = payment_status;
  renderOrders();
  adminToast('✅ تم تحديث حالة الدفع');
};
window.viewReceipt = async function(path){
  const { data, error } = await supabaseClient.storage.from('payment-receipts').createSignedUrl(path, 3600);
  if (error) return adminToast('❌ تعذر فتح الإيصال: ' + error.message, 'error');
  window.open(data.signedUrl, '_blank');
};
window.exportOrders = function(){ exportJson(adminState.orders, 'dora-orders'); };

/* ============================================================
   طلبات الخدمات
   ============================================================ */
window.loadServiceRequests = async function(){
  const container = document.getElementById('servicesList');
  if (!container) return;
  container.innerHTML = '<div class="admin-empty">⏳ جاري تحميل طلبات الخدمات...</div>';
  const { data, error } = await supabaseClient.from('service_requests').select('*').order('created_at', { ascending:false });
  if (error) {
    container.innerHTML = `<div class="admin-empty error">تعذر تحميل الخدمات: ${esc(error.message)}</div>`;
    return;
  }
  adminState.services = data || [];
  renderServices();
};
function renderServices(){
  const container = document.getElementById('servicesList');
  if (!container) return;
  if (!adminState.services.length) {
    container.innerHTML = '<div class="admin-empty">🔧 لا توجد طلبات خدمات بعد</div>';
    return;
  }
  container.innerHTML = adminState.services.map(service => `
    <div class="admin-data-card">
      <div class="admin-card-main">
        <div class="admin-card-title"><strong>${esc(service.service_type)}</strong><span>${dateAr(service.created_at)}</span></div>
        <div class="admin-meta"><span>👤 ${esc(service.customer_name)}</span><span>📱 ${esc(service.customer_phone)}</span><span>📍 ${esc(service.city || '—')}</span></div>
        <p class="admin-note">${esc(service.description)}</p>
      </div>
      <div class="admin-card-actions">
        <label>حالة الطلب</label>
        <select onchange="updateServiceStatus('${service.id}', this.value)">${options(serviceStatuses, service.status)}</select>
      </div>
    </div>
  `).join('');
}
window.updateServiceStatus = async function(id, status){
  const { error } = await supabaseClient.from('service_requests').update({ status }).eq('id', id);
  if (error) return adminToast('❌ تعذر تحديث حالة الخدمة: ' + error.message, 'error');
  const service = adminState.services.find(s => s.id === id);
  if (service) service.status = status;
  renderServices();
  adminToast('✅ تم تحديث حالة الخدمة');
};

/* ============================================================
   العملاء
   ============================================================ */
window.loadCustomers = async function(){
  const container = document.getElementById('customersList');
  if (!container) return;
  container.innerHTML = '<div class="admin-empty">⏳ جاري تحميل العملاء...</div>';
  const [{ data: profiles, error }, { data: addresses }] = await Promise.all([
    supabaseClient.from('profiles').select('*').order('created_at', { ascending:false }),
    supabaseClient.from('addresses').select('*')
  ]);
  if (error) {
    container.innerHTML = `<div class="admin-empty error">تعذر تحميل العملاء: ${esc(error.message)}</div>`;
    return;
  }
  adminState.customers = (profiles || []).map(profile => ({
    ...profile,
    addresses: (addresses || []).filter(a => a.user_id === profile.id)
  }));
  renderCustomers();
};
function renderCustomers(){
  const container = document.getElementById('customersList');
  if (!container) return;
  if (!adminState.customers.length) {
    container.innerHTML = '<div class="admin-empty">👥 لا يوجد عملاء مسجلون بعد</div>';
    return;
  }
  container.innerHTML = adminState.customers.map(customer => `
    <div class="admin-data-card">
      <div class="admin-card-main">
        <div class="admin-card-title"><strong>${esc(customer.full_name || 'بدون اسم')}</strong><span>${customer.role === 'admin' ? 'مدير' : 'عميل'}</span></div>
        <div class="admin-meta"><span>📱 ${esc(customer.phone || '—')}</span><span>📅 ${dateAr(customer.created_at)}</span></div>
        <p class="admin-note">📍 ${customer.addresses.length ? esc(addressText(customer.addresses.find(a => a.is_default) || customer.addresses[0])) : 'لا يوجد عنوان محفوظ'}</p>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   إيصالات الدفع
   ============================================================ */
window.loadReceipts = async function(){
  const container = document.getElementById('receiptsList');
  if (!container) return;
  container.innerHTML = '<div class="admin-empty">⏳ جاري تحميل الإيصالات...</div>';
  const { data, error } = await supabaseClient.from('payment_receipts').select('*').order('created_at', { ascending:false });
  if (error) {
    container.innerHTML = `<div class="admin-empty error">تعذر تحميل الإيصالات: ${esc(error.message)}</div>`;
    return;
  }
  adminState.receipts = data || [];
  renderReceipts();
};
function renderReceipts(){
  const container = document.getElementById('receiptsList');
  if (!container) return;
  if (!adminState.receipts.length) {
    container.innerHTML = '<div class="admin-empty">🧾 لا توجد إيصالات دفع بعد</div>';
    return;
  }
  container.innerHTML = adminState.receipts.map(receipt => {
    const order = adminState.orders.find(o => o.id === receipt.order_id);
    return `
      <div class="admin-data-card">
        <div class="admin-card-main">
          <div class="admin-card-title"><strong>إيصال ${esc(order?.order_number || receipt.order_id)}</strong><span>${dateAr(receipt.created_at)}</span></div>
          <div class="admin-meta"><span>💰 ${money(order?.total || 0)}</span><span>📌 ${esc(receiptStatuses[receipt.status] || receipt.status)}</span></div>
        </div>
        <div class="admin-card-actions">
          <button class="btn-view" onclick="viewReceipt('${esc(receipt.file_path)}')">🧾 عرض</button>
          <select onchange="updateReceiptStatus('${receipt.id}', this.value, '${receipt.order_id}')">${options(receiptStatuses, receipt.status)}</select>
        </div>
      </div>
    `;
  }).join('');
}
window.updateReceiptStatus = async function(id, status, orderId){
  const user = await currentUser();
  const { error } = await supabaseClient.from('payment_receipts').update({
    status,
    reviewed_by: user ? user.id : null,
    reviewed_at: new Date().toISOString()
  }).eq('id', id);
  if (error) return adminToast('❌ تعذر تحديث الإيصال: ' + error.message, 'error');
  await supabaseClient.from('store_orders').update({ payment_status: status === 'approved' ? 'paid' : status === 'rejected' ? 'rejected' : 'review' }).eq('id', orderId);
  await Promise.all([loadReceipts(), loadOrders()]);
  adminToast('✅ تم تحديث حالة الإيصال');
};

/* ============================================================
   التقييمات
   ============================================================ */
window.loadReviews = async function(){
  const container = document.getElementById('reviewsList');
  if (!container) return;
  container.innerHTML = '<div class="admin-empty">⏳ جاري تحميل التقييمات...</div>';
  const { data, error } = await supabaseClient.from('reviews').select('*').order('id', { ascending:false });
  if (error) {
    container.innerHTML = `<div class="admin-empty error">تعذر تحميل التقييمات: ${esc(error.message)}</div>`;
    return;
  }
  adminState.reviews = data || [];
  renderAdminReviews();
  updateStats();
};
function renderAdminReviews(){
  const container = document.getElementById('reviewsList');
  if (!container) return;
  if (!adminState.reviews.length) {
    container.innerHTML = '<div class="admin-empty">⭐ لا توجد تقييمات بعد</div>';
    return;
  }
  container.innerHTML = adminState.reviews.map(review => {
    const rating = Number(review.rating || 5);
    return `
      <div class="admin-data-card">
        <div class="admin-card-main">
          <div class="admin-card-title"><strong>${esc(review.name || 'عميل')}</strong><span>${esc(review.product || 'الموقع عامةً')}</span></div>
          <div class="admin-stars">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</div>
          <p class="admin-note">${esc(review.text || '')}</p>
          <div class="admin-meta">
            <span>📅 ${esc(review.date || dateAr(review.created_at))}</span>
            <span>${review.verified_purchase ? '✅ مشتري موثق' : 'تقييم عام'}</span>
            <span>📌 ${esc(reviewStatuses[review.status] || review.status || 'منشور')}</span>
          </div>
        </div>
        <div class="admin-card-actions buttons">
          <button class="btn-view" onclick="updateReviewStatus(${review.id}, 'published')">✅ نشر</button>
          <button class="btn-edit" onclick="updateReviewStatus(${review.id}, 'hidden')">🙈 إخفاء</button>
          <button class="btn-delete" onclick="deleteReviewAdmin(${review.id})">🗑️ حذف</button>
        </div>
      </div>
    `;
  }).join('');
}
window.updateReviewStatus = async function(id, status){
  const { error } = await supabaseClient.from('reviews').update({ status }).eq('id', id);
  if (error) return adminToast('❌ تعذر تحديث التقييم: ' + error.message, 'error');
  await loadReviews();
  adminToast('✅ تم تحديث التقييم');
};
window.deleteReviewAdmin = async function(id){
  if (!confirm('هل تريد حذف هذا التقييم نهائياً؟')) return;
  const { error } = await supabaseClient.from('reviews').delete().eq('id', id);
  if (error) return adminToast('❌ تعذر حذف التقييم: ' + error.message, 'error');
  await loadReviews();
  adminToast('✅ تم حذف التقييم');
};
window.exportReviews = function(){ exportJson(adminState.reviews, 'dora-reviews'); };

/* ============================================================
   رسائل التواصل
   ============================================================ */
window.loadMessages = async function(){
  const container = document.getElementById('messagesList');
  if (!container) return;
  container.innerHTML = '<div class="admin-empty">⏳ جاري تحميل الرسائل...</div>';
  const { data, error } = await supabaseClient.from('contact_messages').select('*').order('created_at', { ascending:false });
  if (error) {
    container.innerHTML = `<div class="admin-empty error">تعذر تحميل الرسائل: ${esc(error.message)}</div>`;
    return;
  }
  adminState.messages = data || [];
  renderAdminMessages();
  updateStats();
};
function renderAdminMessages(){
  const container = document.getElementById('messagesList');
  if (!container) return;
  if (!adminState.messages.length) {
    container.innerHTML = '<div class="admin-empty">📨 لا توجد رسائل بعد</div>';
    return;
  }
  container.innerHTML = adminState.messages.map(message => `
    <div class="admin-data-card">
      <div class="admin-card-main">
        <div class="admin-card-title"><strong>${esc(message.name)}</strong><span>${esc(messageStatuses[message.status] || message.status)}</span></div>
        <div class="admin-meta"><span>📱 ${esc(message.phone)}</span><span>✉️ ${esc(message.email)}</span><span>📅 ${dateAr(message.created_at)}</span></div>
        <p class="admin-note"><strong>${esc(message.subject || 'رسالة')}</strong><br>${esc(message.message)}</p>
        ${message.reply ? `<p class="admin-reply">📨 الرد: ${esc(message.reply)}</p>` : ''}
      </div>
      <div class="admin-card-actions buttons">
        <button class="btn-view" onclick="markMessageRead('${message.id}')">👁️ مقروءة</button>
        <button class="btn-reply" onclick="replyToMessage('${message.id}')">📨 رد</button>
        <button class="btn-delete" onclick="deleteMessageAdmin('${message.id}')">🗑️ حذف</button>
      </div>
    </div>
  `).join('');
}
window.markMessageRead = async function(id){
  const { error } = await supabaseClient.from('contact_messages').update({ status:'read' }).eq('id', id);
  if (error) return adminToast('❌ تعذر تحديث الرسالة: ' + error.message, 'error');
  await loadMessages();
};
window.replyToMessage = async function(id){
  const message = adminState.messages.find(m => m.id === id);
  if (!message) return;
  const reply = prompt('اكتب الرد للعميل:', message.reply || '');
  if (!reply) return;
  const { error } = await supabaseClient.from('contact_messages').update({
    reply,
    replied_at: new Date().toISOString(),
    status: 'replied'
  }).eq('id', id);
  if (error) return adminToast('❌ تعذر حفظ الرد: ' + error.message, 'error');
  const phone = normalizePhone(message.phone);
  if (phone) {
    const text = `مرحباً ${message.name}،\n\nشكراً لتواصلك مع شركة درة فارس الشمال.\n\n${reply}`;
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(text), '_blank');
  }
  await loadMessages();
};
window.deleteMessageAdmin = async function(id){
  if (!confirm('هل تريد حذف هذه الرسالة؟')) return;
  const { error } = await supabaseClient.from('contact_messages').delete().eq('id', id);
  if (error) return adminToast('❌ تعذر حذف الرسالة: ' + error.message, 'error');
  await loadMessages();
};
window.exportMessages = function(){ exportJson(adminState.messages, 'dora-messages'); };

/* ============================================================
   إعدادات الموقع العامة — Supabase + localStorage fallback
   ============================================================ */
const defaultSiteSettings = {
  companyName: 'شركة درة فارس الشمال',
  companyAddress: 'الرياض، المملكة العربية السعودية',
  companyPhone1: '966568717449',
  companyPhone2: '966545358773',
  companyEmail: 'info@alshamal-df.com',
  socialTwitter: 'https://twitter.com/dorafares',
  socialInstagram: 'https://instagram.com/dorafares',
  socialFacebook: 'https://facebook.com/dorafares',
  socialLinkedin: 'https://linkedin.com/company/dorafares',
  whatsappMessage: 'مرحباً شركة درة فارس الشمال، أرغب في الاستفسار عن منتجاتكم'
};

function readSettingsForm(){
  return {
    companyName: document.getElementById('companyName')?.value.trim() || defaultSiteSettings.companyName,
    companyAddress: document.getElementById('companyAddress')?.value.trim() || defaultSiteSettings.companyAddress,
    companyPhone1: normalizePhone(document.getElementById('companyPhone1')?.value || defaultSiteSettings.companyPhone1),
    companyPhone2: normalizePhone(document.getElementById('companyPhone2')?.value || defaultSiteSettings.companyPhone2),
    companyEmail: document.getElementById('companyEmail')?.value.trim() || defaultSiteSettings.companyEmail,
    socialTwitter: document.getElementById('socialTwitter')?.value.trim() || '',
    socialInstagram: document.getElementById('socialInstagram')?.value.trim() || '',
    socialFacebook: document.getElementById('socialFacebook')?.value.trim() || '',
    socialLinkedin: document.getElementById('socialLinkedin')?.value.trim() || '',
    whatsappMessage: document.getElementById('whatsappMessage')?.value.trim() || defaultSiteSettings.whatsappMessage
  };
}

function fillSettingsForm(settings){
  const merged = { ...defaultSiteSettings, ...(settings || {}) };
  const fields = {
    companyName: merged.companyName,
    companyAddress: merged.companyAddress,
    companyPhone1: merged.companyPhone1,
    companyPhone2: merged.companyPhone2,
    companyEmail: merged.companyEmail,
    socialTwitter: merged.socialTwitter,
    socialInstagram: merged.socialInstagram,
    socialFacebook: merged.socialFacebook,
    socialLinkedin: merged.socialLinkedin,
    whatsappMessage: merged.whatsappMessage
  };
  Object.entries(fields).forEach(([id, value]) => {
    const input = document.getElementById(id);
    if (input) input.value = value || '';
  });
  adminState.settings = merged;
  localStorage.setItem('doraSettings', JSON.stringify(merged));
}

window.loadSettings = async function(){
  let settings = JSON.parse(localStorage.getItem('doraSettings') || 'null') || defaultSiteSettings;
  const { data, error } = await supabaseClient
    .from('site_settings')
    .select('settings')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.warn('site_settings:', error);
    adminToast('⚠️ يتم عرض الإعدادات المحلية. شغّل ملف إعداد-إعدادات-الموقع.sql لتفعيل الحفظ العام.', 'warning');
  } else if (data?.settings) {
    settings = { ...defaultSiteSettings, ...data.settings };
  }
  fillSettingsForm(settings);
};

window.saveSettings = async function(){
  const settings = readSettingsForm();
  fillSettingsForm(settings);

  const user = await currentUser();
  const { error } = await supabaseClient
    .from('site_settings')
    .upsert([{ id: 1, settings, updated_by: user?.id || null, updated_at: new Date().toISOString() }], { onConflict: 'id' });

  if (error) {
    console.error('save site settings:', error);
    adminToast('❌ تم الحفظ محليًا فقط. شغّل ملف إعداد-إعدادات-الموقع.sql ثم أعد المحاولة: ' + error.message, 'error');
    return;
  }

  adminToast('✅ تم حفظ الإعدادات ونشرها على الموقع');
};

/* ============================================================
   إحصائيات وتصدير
   ============================================================ */
window.updateStats = function(){
  const productsCount = Array.isArray(products) ? products.length : 0;
  const totalProducts = document.getElementById('totalProducts');
  const totalOrders = document.getElementById('totalOrders');
  const totalReviews = document.getElementById('totalReviews');
  const totalMessages = document.getElementById('totalMessages');
  if (totalProducts) totalProducts.textContent = productsCount;
  if (totalOrders) totalOrders.textContent = adminState.orders.filter(o => o.status === 'new').length;
  if (totalReviews) totalReviews.textContent = adminState.reviews.length;
  if (totalMessages) totalMessages.textContent = adminState.messages.filter(m => m.status === 'new').length;
};

function exportJson(data, prefix){
  const blob = new Blob([JSON.stringify({ data, exportDate: new Date().toISOString() }, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${prefix}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAdminAuth);
else initAdminAuth();

})();
/* ============================================================
   إدارة محتوى الموقع — Site Content Management
   ============================================================ */
window.loadSiteContent = async function(){
  const container = document.getElementById('siteContentList');
  if (!container) return;
  container.innerHTML = '<div class="admin-empty">⏳ جاري تحميل المحتوى...</div>';

  const { data, error } = await supabaseClient
    .from('site_content')
    .select('*')
    .order('section', { ascending: true });

  if (error) {
    container.innerHTML = `<div class="admin-empty error">❌ تعذر تحميل المحتوى: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="admin-empty">📝 لا يوجد محتوى لإدارته حالياً.</div>';
    return;
  }

  container.innerHTML = data.map(item => `
    <div class="admin-data-card" style="grid-template-columns: 1fr auto;">
      <div class="admin-card-main">
        <div class="admin-card-title">
          <strong>${item.section} — ${item.field_name}</strong>
        </div>
        <div class="admin-note" style="margin-top: 8px; word-break: break-all;">
          القيمة الحالية: <span style="color:#2C4F86;font-weight:800;">${item.field_value || '(فارغ)'}</span>
        </div>
      </div>
      <div class="admin-card-actions buttons">
        <button class="btn-edit" onclick="editSiteContent(${item.id}, '${item.field_name.replace(/'/g, "\\'")}', '${(item.field_value || '').replace(/'/g, "\\'")}')">✏️ تعديل</button>
      </div>
    </div>
  `).join('');
};

window.editSiteContent = function(id, fieldName, currentValue){
  const newValue = prompt(`تعديل: ${fieldName}`, currentValue);
  if (newValue === null || newValue === currentValue) return;

  updateSiteContent(id, newValue);
};

async function updateSiteContent(id, value){
  const { error } = await supabaseClient
    .from('site_content')
    .update({ field_value: value, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    alert('❌ تعذر حفظ التغيير: ' + error.message);
    return;
  }
  alert('✅ تم حفظ التغيير بنجاح');
  loadSiteContent();
}
/* ============================================================
   إدارة محتوى صفحات الخدمات
   ============================================================ */
window.loadServicePagesContent = async function(){
  const container = document.getElementById('servicePagesList');
  if (!container) return;
  container.innerHTML = '<div class="admin-empty">⏳ جاري التحميل...</div>';

  const { data, error } = await supabaseClient
    .from('service_pages_content')
    .select('*')
    .order('page_key');

  if (error) {
    container.innerHTML = `<div class="admin-empty error">❌ خطأ: ${error.message}</div>`;
    return;
  }

  const pageNames = {
    printing: 'الطباعة', cameras: 'كاميرات المراقبة', pos: 'نقاط البيع',
    network: 'الشبكات', barcode: 'الباركود', maintenance: 'الصيانة'
  };

  container.innerHTML = data.map(item => `
    <div class="admin-data-card">
      <div class="admin-card-main">
        <div class="admin-card-title">
          <strong>📄 ${pageNames[item.page_key] || item.page_key}</strong>
          <span>آخر تحديث: ${item.updated_at ? new Date(item.updated_at).toLocaleDateString('ar-SA') : '—'}</span>
        </div>
        <div style="margin-top:10px;display:grid;gap:6px;">
          <div><small style="color:#64748B;">العنوان:</small> <span style="color:#111827;font-weight:700;">${item.hero_title || '(فارغ)'}</span></div>
          <div><small style="color:#64748B;">الوصف:</small> <span style="color:#111827;">${item.hero_subtitle || '(فارغ)'}</span></div>
          <div><small style="color:#64748B;">الإحصائية:</small> <span style="color:#111827;font-weight:700;">${item.stats_count || '(فارغ)'}</span> — ${item.stats_label || ''}</div>
        </div>
      </div>
      <div class="admin-card-actions buttons">
        <button class="btn-edit" onclick="editServicePage('${item.page_key}')">✏️ تعديل</button>
      </div>
    </div>
  `).join('');
};

window.editServicePage = function(pageKey){
  const newTitle = prompt('العنوان الجديد:');
  if (newTitle === null) return;
  const newSubtitle = prompt('الوصف الجديد:');
  if (newSubtitle === null) return;
  const newStatsCount = prompt('رقم الإحصائية (مثلاً: +500):');
  if (newStatsCount === null) return;
  const newStatsLabel = prompt('نص الإحصائية (مثلاً: طابعة مباعة):');
  if (newStatsLabel === null) return;
  const newCta = prompt('نص زر الدعوة (مثلاً: جاهز لتحسين طباعتك؟):');
  if (newCta === null) return;

  updateServicePage(pageKey, newTitle, newSubtitle, newStatsCount, newStatsLabel, newCta);
};

async function updateServicePage(pageKey, title, subtitle, statsCount, statsLabel, cta){
  const { error } = await supabaseClient
    .from('service_pages_content')
    .update({
      hero_title: title,
      hero_subtitle: subtitle,
      stats_count: statsCount,
      stats_label: statsLabel,
      cta_text: cta,
      updated_at: new Date().toISOString()
    })
    .eq('page_key', pageKey);

  if (error) { alert('❌ خطأ: ' + error.message); return; }
  alert('✅ تم حفظ التغييرات بنجاح!');
  loadServicePagesContent();
}


/* ============================================================
   إدارة الحسابات البنكية
   ============================================================ */
window.loadBankAccounts = async function(){
  const container = document.getElementById('bankAccountsList');
  if (!container) return;
  container.innerHTML = '<div class="admin-empty">⏳ جاري التحميل...</div>';

  const { data, error } = await supabaseClient
    .from('company_bank_accounts')
    .select('*')
    .order('sort_order');

  if (error) {
    container.innerHTML = `<div class="admin-empty error">❌ خطأ: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="admin-empty">🏦 لا توجد حسابات بنكية مضافة.</div>';
    return;
  }

  container.innerHTML = data.map(item => `
    <div class="admin-data-card">
      <div class="admin-card-main">
        <div class="admin-card-title">
          <strong>🏦 ${item.bank_name}</strong>
          <span>${item.is_active ? '✅ نشط' : '❌ غير نشط'}</span>
        </div>
        <div class="admin-meta" style="margin-top:8px;">
          <span>👤 ${item.account_name || '—'}</span>
          <span>🔢 ${item.account_number || '—'}</span>
          <span>📋 ${item.iban || '—'}</span>
        </div>
      </div>
      <div class="admin-card-actions buttons">
        <button class="btn-edit" onclick="editBankAccount(${item.id})">✏️ تعديل</button>
        <button class="btn-delete" onclick="deleteBankAccount(${item.id})">🗑️ حذف</button>
      </div>
    </div>
  `).join('');
};

window.addBankAccount = async function(){
  const name = prompt('اسم البنك:');
  if (!name) return;
  const accountName = prompt('اسم صاحب الحساب:');
  const accountNumber = prompt('رقم الحساب:');
  const iban = prompt('IBAN:');

  const { error } = await supabaseClient
    .from('company_bank_accounts')
    .insert([{
      bank_name: name,
      account_name: accountName,
      account_number: accountNumber,
      iban: iban,
      is_active: true
    }]);

  if (error) { alert('❌ خطأ: ' + error.message); return; }
  alert('✅ تم إضافة الحساب البنكي بنجاح!');
  loadBankAccounts();
};

window.editBankAccount = async function(id){
  const { data, error } = await supabaseClient
    .from('company_bank_accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) { alert('❌ لم يتم العثور على الحساب'); return; }

  const name = prompt('اسم البنك:', data.bank_name);
  if (name === null) return;
  const accountName = prompt('اسم صاحب الحساب:', data.account_name);
  if (accountName === null) return;
  const accountNumber = prompt('رقم الحساب:', data.account_number);
  if (accountNumber === null) return;
  const iban = prompt('IBAN:', data.iban);
  if (iban === null) return;

  const { error: updateError } = await supabaseClient
    .from('company_bank_accounts')
    .update({
      bank_name: name,
      account_name: accountName,
      account_number: accountNumber,
      iban: iban,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (updateError) { alert('❌ خطأ: ' + updateError.message); return; }
  alert('✅ تم تحديث الحساب البنكي بنجاح!');
  loadBankAccounts();
};

window.deleteBankAccount = async function(id){
  if (!confirm('هل أنت متأكد من حذف هذا الحساب البنكي؟')) return;
  const { error } = await supabaseClient
    .from('company_bank_accounts')
    .delete()
    .eq('id', id);

  if (error) { alert('❌ خطأ: ' + error.message); return; }
  alert('✅ تم حذف الحساب البنكي!');
  loadBankAccounts();
};
/* ============================================================
   إدارة صفحات الموقع — Site Pages Management
   ============================================================ */
window.loadSitePages = async function(){
  const container = document.getElementById('sitePagesList');
  if (!container) return;
  container.innerHTML = '<div class="admin-empty">⏳ جاري التحميل...</div>';

  const { data, error } = await supabaseClient
    .from('site_pages')
    .select('*')
    .order('page_key');

  if (error) {
    container.innerHTML = `<div class="admin-empty error">❌ خطأ: ${error.message}</div>`;
    return;
  }

  const pageNames = {
    about: 'عن الشركة', vision: 'رؤيتنا', mission: 'رسالتنا',
    team: 'فريق العمل', certifications: 'الشهادات',
    privacy: 'سياسة الخصوصية', terms: 'شروط الاستخدام',
    faq: 'الأسئلة الشائعة', contact: 'تواصل معنا'
  };

  container.innerHTML = data.map(item => `
    <div class="admin-data-card">
      <div class="admin-card-main">
        <div class="admin-card-title">
          <strong>📄 ${pageNames[item.page_key] || item.page_key}</strong>
          <span>${item.updated_at ? new Date(item.updated_at).toLocaleDateString('ar-SA') : '—'}</span>
        </div>
        <div style="margin-top:10px;display:grid;gap:6px;">
          <div><small>العنوان:</small> <strong>${item.hero_title || '(فارغ)'}</strong></div>
          <div><small>الوصف:</small> ${item.hero_subtitle || '(فارغ)'}</div>
        </div>
      </div>
      <div class="admin-card-actions buttons">
        <button class="btn-edit" onclick="editSitePage('${item.page_key}')">✏️ تعديل</button>
        <button class="btn-view" onclick="window.open('https://alshamal-df.com/${item.page_key}.html', '_blank')">👁️ معاينة</button>
      </div>
    </div>
  `).join('');
};

window.editSitePage = function(pageKey){
  const heroTitle = prompt('العنوان الرئيسي للصفحة:');
  if (heroTitle === null) return;
  const heroSubtitle = prompt('الوصف تحت العنوان:');
  if (heroSubtitle === null) return;
  const section1Title = prompt('عنوان القسم الأول:');
  if (section1Title === null) return;
  const section1Content = prompt('محتوى القسم الأول:');
  if (section1Content === null) return;

  updateSitePage(pageKey, {
    hero_title: heroTitle,
    hero_subtitle: heroSubtitle,
    section_1_title: section1Title,
    section_1_content: section1Content
  });
};

async function updateSitePage(pageKey, updates){
  const { error } = await supabaseClient
    .from('site_pages')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('page_key', pageKey);

  if (error) { alert('❌ خطأ: ' + error.message); return; }
  alert('✅ تم حفظ التغييرات بنجاح!');
  loadSitePages();
};

/* ============================================================
   تحميل التبويبات تلقائياً
   ============================================================ */
const origShowTab = window.showTab;
window.showTab = function(tabName){
  origShowTab(tabName);
  if (tabName === 'pages') loadSitePages();
  if (tabName === 'services_content') loadServicePagesContent();
  if (tabName === 'bank_accounts') loadBankAccounts();
  if (tabName === 'files') loadSiteFiles();
  if (tabName === 'content') loadSiteContent();
};
/* ============================================================
   إدارة صفحات الموقع — تحكم كامل (موسع)
   ============================================================ */
window.editSitePage = async function(pageKey){
  // جلب البيانات الحالية للصفحة
  const { data, error } = await supabaseClient
    .from('site_pages')
    .select('*')
    .eq('page_key', pageKey)
    .single();

  if (error || !data) { alert('❌ لم يتم العثور على الصفحة'); return; }

  // تعديل الحقول الأساسية
  const heroTitle = prompt('العنوان الرئيسي للصفحة:', data.hero_title || '');
  if (heroTitle === null) return;
  const heroSubtitle = prompt('الوصف تحت العنوان:', data.hero_subtitle || '');
  if (heroSubtitle === null) return;

  // القسم الأول
  const section1Title = prompt('عنوان القسم الأول:', data.section_1_title || '');
  if (section1Title === null) return;
  const section1Content = prompt('محتوى القسم الأول (نص طويل):', data.section_1_content || '');
  if (section1Content === null) return;
  const section1Image = prompt('رابط صورة القسم الأول (اختياري):', data.section_1_image || '');
  if (section1Image === null) return;
  const section1ButtonText = prompt('نص زر القسم الأول (اختياري):', data.section_1_button_text || '');
  if (section1ButtonText === null) return;
  const section1ButtonUrl = prompt('رابط زر القسم الأول (اختياري):', data.section_1_button_url || '');
  if (section1ButtonUrl === null) return;

  // الإحصائيات
  const stats = prompt('الإحصائيات (مثلاً: +15,سنة خبرة|+500,عميل سعيد|+1000,مشروع|4.9/5,تقييم):', data.section_1_stats || '');
  if (stats === null) return;

  // أعضاء الفريق
  const teamMembers = prompt('أعضاء الفريق (مثلاً: 👨‍💼,محمد علي,المدير العام|👨‍🔧,فريق الفنيين,+12 فني):', data.team_members || '');
  if (teamMembers === null) return;

  // الشهادات
  const certifications = prompt('الشهادات (مثلاً: 🏆,شهادة HP,شريك معتمد|✅,ISO 9001,معتمد):', data.certifications_list || '');
  if (certifications === null) return;

  // الأسئلة الشائعة
  const faqItems = prompt('الأسئلة الشائعة (مثلاً: كيف أطلب؟,يمكنك الطلب عبر...|ما هي طرق الدفع؟,نقبل...):', data.faq_items || '');
  if (faqItems === null) return;

  // معلومات التواصل
  const contactEmail = prompt('البريد الإلكتروني:', data.contact_email || '');
  if (contactEmail === null) return;
  const contactPhone = prompt('رقم الهاتف:', data.contact_phone || '');
  if (contactPhone === null) return;
  const contactWhatsapp = prompt('رقم الواتساب:', data.contact_whatsapp || '');
  if (contactWhatsapp === null) return;
  const contactAddress = prompt('العنوان:', data.contact_address || '');
  if (contactAddress === null) return;

  // حفظ كل التغييرات
  const { error: updateError } = await supabaseClient
    .from('site_pages')
    .update({
      hero_title: heroTitle,
      hero_subtitle: heroSubtitle,
      section_1_title: section1Title,
      section_1_content: section1Content,
      section_1_image: section1Image,
      section_1_button_text: section1ButtonText,
      section_1_button_url: section1ButtonUrl,
      section_1_stats: stats,
      team_members: teamMembers,
      certifications_list: certifications,
      faq_items: faqItems,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      contact_whatsapp: contactWhatsapp,
      contact_address: contactAddress,
      updated_at: new Date().toISOString()
    })
    .eq('page_key', pageKey);

  if (updateError) { alert('❌ خطأ: ' + updateError.message); return; }
  alert('✅ تم حفظ جميع التغييرات بنجاح!');
  loadSitePages();
};
