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
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('dashboardLayout').classList.add('active');
  if (typeof loadProducts === 'function') loadProducts();
  if (typeof loadSettings === 'function') loadSettings();
  loadAdminV2Data();
};

function showLoginOnly(){
  const login = document.getElementById('loginPage');
  const dashboard = document.getElementById('dashboardLayout');
  if (login) login.style.display = 'flex';
  if (dashboard) dashboard.classList.remove('active');
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
   document.querySelectorAll('.sidebar-nav a').forEach(function(a){a.classList.remove('active');});
var sidebarLinks = document.querySelectorAll('.sidebar-nav a');
sidebarLinks.forEach(function(a){
  if(a.getAttribute('onclick') && a.getAttribute('onclick').indexOf("'"+tabName+"'") > -1) a.classList.add('active');
});
document.getElementById('pageTitle').textContent = tabName === 'products' ? 'المنتجات' : tabName === 'orders' ? 'الطلبات' : tabName === 'customers' ? 'العملاء' : tabName === 'services' ? 'الخدمات' : tabName === 'receipts' ? 'المدفوعات' : tabName === 'reviews' ? 'التقييمات' : tabName === 'messages' ? 'الرسائل' : tabName === 'settings' ? 'الإعدادات' : tabName === 'marketing' ? 'التسويق' : tabName;
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
  whatsappMessage: 'مرحباً شركة درة فارس الشمال، أرغب في الاستفسار عن منتجاتكم',
  commercialReg: '',
  taxNumber: ''
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
    whatsappMessage: document.getElementById('whatsappMessage')?.value.trim() || defaultSiteSettings.whatsappMessage,
         commercialReg: document.getElementById('commercialReg')?.value.trim() || '',
    taxNumber: document.getElementById('taxNumber')?.value.trim() || ''
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
    whatsappMessage: merged.whatsappMessage,
         commercialReg: merged.commercialReg,
    taxNumber: merged.taxNumber
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
window.updateStats = async function(){
  // المنتجات
  var productsCount = 0;
  var productsEl = document.getElementById('totalProducts');
  if (productsEl) {
    var productsResult = await supabaseClient.from('store_products').select('*', { count: 'exact', head: true });
    productsCount = productsResult.count || 0;
    productsEl.textContent = productsCount;
  }
  
  // الطلبات الجديدة
  var ordersEl = document.getElementById('totalOrders');
  if (ordersEl) {
    var ordersResult = await supabaseClient.from('store_orders').select('*', { count: 'exact', head: true }).eq('status', 'new');
    ordersEl.textContent = ordersResult.count || 0;
  }
  
  // التقييمات
  var reviewsEl = document.getElementById('totalReviews');
  if (reviewsEl) {
    var reviewsResult = await supabaseClient.from('reviews').select('*', { count: 'exact', head: true });
    reviewsEl.textContent = reviewsResult.count || 0;
  }
  
  // الرسائل الجديدة
  var messagesEl = document.getElementById('totalMessages');
  if (messagesEl) {
    var messagesResult = await supabaseClient.from('contact_messages').select('*', { count: 'exact', head: true }).eq('status', 'new');
    messagesEl.textContent = messagesResult.count || 0;
  }
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
   if (tabName === 'partners') loadPartnersAdmin();
   if (tabName === 'invoices') loadInvoices();
   if (tabName === 'shipping') loadShippingRates();
  if (tabName === 'content') loadSiteContent();
};
/* ============================================================
   إدارة صفحات الموقع — تحكم كامل (موسع)
   ============================================================ */
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
   إدارة الملفات والمستندات — Site Files Management
   ============================================================ */
window.loadSiteFiles = async function(){
  const container = document.getElementById('siteFilesList');
  if (!container) return;
  container.innerHTML = '<div class="admin-empty">⏳ جاري تحميل الملفات...</div>';

  const { data, error } = await supabaseClient
    .from('site_files')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<div class="admin-empty error">❌ خطأ: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="admin-empty">📁 لا توجد ملفات مرفوعة حالياً. اضغط على «رفع ملف جديد».</div>';
    return;
  }

  container.innerHTML = data.map(item => `
    <div class="admin-data-card">
      <div class="admin-card-main">
        <div class="admin-card-title">
          <strong>📄 ${item.file_label || item.file_name}</strong>
          <span>${item.category} | ${item.is_active ? '✅ نشط' : '❌ مخفي'}</span>
        </div>
        <div class="admin-meta" style="margin-top:8px;">
          <span>📅 ${new Date(item.created_at).toLocaleDateString('ar-SA')}</span>
          <a href="${item.file_url}" target="_blank" style="color:#1D4ED8;font-weight:800;">🔗 رابط الملف</a>
        </div>
      </div>
      <div class="admin-card-actions buttons">
        <button class="btn-view" onclick="window.open('${item.file_url}', '_blank')">👁️ عرض</button>
        <button class="btn-edit" onclick="editSiteFile(${item.id})">✏️ تعديل</button>
        <button class="btn-delete" onclick="deleteSiteFile(${item.id})">🗑️ حذف</button>
      </div>
    </div>
  `).join('');
};

window.addNewFile = function(){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.ppt,.pptx';
  input.onchange = async function(e){
    const file = e.target.files[0];
    if (!file) return;

    const label = prompt('اسم العرض للملف (مثلاً: شهادة HP للشركة):', file.name);
    if (!label) return;

    const category = prompt('التصنيف (مثلاً: شهادات، ملفات تعريفية، عقود):', 'عام');
    if (!category) return;

    const safeName = file.name.replace(/[^\w.\-]+/g, '-');
    const path = `public/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('site-files')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      alert('❌ فشل رفع الملف: ' + uploadError.message);
      return;
    }

    const { data: urlData } = await supabaseClient.storage
      .from('site-files')
      .getPublicUrl(path);

    const { error: dbError } = await supabaseClient
      .from('site_files')
      .insert([{
        file_name: safeName,
        file_label: label,
        file_url: urlData.publicUrl,
        category: category,
        is_active: true
      }]);

    if (dbError) {
      alert('❌ خطأ في حفظ بيانات الملف: ' + dbError.message);
      return;
    }

    alert('✅ تم رفع الملف بنجاح!');
    loadSiteFiles();
  };
  // ✅ إضافة العنصر للصفحة
  document.body.appendChild(input);
  input.click();
  // ✅ حذف العنصر بعد اختيار الملف
  setTimeout(() => { if (input && input.parentNode) input.parentNode.removeChild(input); }, 1000);
};

window.editSiteFile = async function(id){
  const { data, error } = await supabaseClient
    .from('site_files')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) { alert('❌ لم يتم العثور على الملف'); return; }

  const label = prompt('اسم العرض:', data.file_label);
  if (label === null) return;
  const category = prompt('التصنيف:', data.category);
  if (category === null) return;
  const isActive = confirm('الملف نشط؟ (OK = نعم, Cancel = لا)');

  const { error: updateError } = await supabaseClient
    .from('site_files')
    .update({
      file_label: label,
      category: category,
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (updateError) { alert('❌ خطأ: ' + updateError.message); return; }
  alert('✅ تم تحديث الملف بنجاح!');
  loadSiteFiles();
};

window.deleteSiteFile = async function(id){
  if (!confirm('هل أنت متأكد من حذف هذا الملف؟')) return;
  const { error } = await supabaseClient
    .from('site_files')
    .delete()
    .eq('id', id);

  if (error) { alert('❌ خطأ: ' + error.message); return; }
  alert('✅ تم حذف الملف!');
  loadSiteFiles();
};
/* ============================================================
   إدارة المنتجات
   ============================================================ */
const catLabels = { printers:'طابعات', computers:'كمبيوتر', ram:'رامات', storage:'هاردات', cables:'وصلات', projectors:'بروجكتور', accessories:'إكسسوارات', ink:'أحبار', food:'مواد غذائية' };

// ✅ تحميل المنتجات
window.loadProducts = async function(){
  const tbody = document.getElementById('productsTable');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px">⏳ جاري تحميل المنتجات...</td></tr>';

  const { data, error } = await supabaseClient
    .from('store_products')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#EF4444">❌ خطأ: ${error.message}</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px">📦 لا توجد منتجات</td></tr>';
    document.getElementById('totalProducts').textContent = '0';
    return;
  }

  tbody.innerHTML = data.map((product, index) => {
    const shortDesc = (product.description || '').length > 60 ? (product.description || '').slice(0, 60) + '…' : (product.description || '—');
    return `
      <tr>
        <td>${index + 1}</td>
        <td><img src="${product.image || 'https://via.placeholder.com/50'}" class="product-img" alt=""></td>
        <td>${product.name}</td>
        <td title="${product.description || ''}">${shortDesc}</td>
        <td>${Number(product.price).toLocaleString()} ر.س</td>
        <td>${catLabels[product.category] || product.category}</td>
        <td>
          <button class="btn-edit" onclick="editProduct(${product.id})">✏️</button>
          <button class="btn-delete" onclick="deleteProduct(${product.id})">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('totalProducts').textContent = data.length;
};

// ✅ فتح المودال لإضافة منتج
window.openModal = function(){
  document.getElementById('modalTitle').textContent = '➕ إضافة منتج';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('productModal').classList.add('active');
};

// ✅ إغلاق المودال
window.closeModal = function(){
  document.getElementById('productModal').classList.remove('active');
};

// ✅ تعديل منتج
window.editProduct = async function(id){
  const { data, error } = await supabaseClient
    .from('store_products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) { alert('❌ لم يتم العثور على المنتج'); return; }

  document.getElementById('modalTitle').textContent = '✏️ تعديل منتج';
  document.getElementById('productId').value = data.id;
  document.getElementById('productImage').value = data.image || '';
  document.getElementById('productName').value = data.name;
  document.getElementById('productDesc').value = data.description || '';
  document.getElementById('productPrice').value = data.price;
  document.getElementById('productCategory').value = data.category;
  document.getElementById('productModal').classList.add('active');
};

// ✅ حفظ المنتج
window.saveProduct = async function(event){
  event.preventDefault();
  const id = document.getElementById('productId').value;
  const payload = {
    name: document.getElementById('productName').value.trim(),
    price: parseFloat(document.getElementById('productPrice').value),
    image: document.getElementById('productImage').value || 'https://via.placeholder.com/50',
    description: document.getElementById('productDesc').value.trim(),
    category: document.getElementById('productCategory').value,
    updated_at: new Date().toISOString()
  };

  let error;
  if (id) {
    ({ error } = await supabaseClient.from('store_products').update(payload).eq('id', id));
  } else {
    payload.created_at = new Date().toISOString();
    payload.stock = 10; payload.is_active = true;
    ({ error } = await supabaseClient.from('store_products').insert([payload]));
  }

  if (error) { alert('❌ خطأ: ' + error.message); return false; }
  alert('✅ تم الحفظ!');
  closeModal();
  loadProducts();
  return false;
};

// ✅ حذف منتج
window.deleteProduct = async function(id){
  if (!confirm('حذف هذا المنتج؟')) return;
  const { error } = await supabaseClient.from('store_products').delete().eq('id', id);
  if (error) { alert('❌ خطأ: ' + error.message); return; }
  alert('✅ تم الحذف!');
  loadProducts();
};

// ✅ تحميل المنتجات أول ما تفتح الصفحة
if (document.getElementById('productsTable')) loadProducts();
// ===== إدارة الشركاء والعملاء =====
async function loadPartnersAdmin() {
    var tbody = document.getElementById('partnersTable');
    if (!tbody) return;

    try {
        var result = await supabaseClient
            .from('partners')
            .select('*')
            .order('id', { ascending: false });

        if (result.error) throw result.error;

        var partners = result.data || [];

        if (partners.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.5)">🤝 لم يتم إضافة شركاء بعد</td></tr>';
            return;
        }

        tbody.innerHTML = partners.map(function(p, index) {
            var imgHtml = p.image_url 
                ? '<img src="' + p.image_url + '" style="width:50px;height:50px;border-radius:10px;object-fit:cover" onerror="this.style.display=\'none\'">' 
                : '<span style="font-size:30px">🏢</span>';
            return '<tr>' +
                '<td>' + (index + 1) + '</td>' +
                '<td>' + imgHtml + '</td>' +
                '<td><strong>' + p.name + '</strong></td>' +
                '<td>' + p.category + '</td>' +
                '<td>' +
                '<button class="btn-edit" onclick="editPartner(\'' + p.id + '\', \'' + p.name.replace(/'/g, "\\'") + '\', \'' + p.category + '\', \'' + (p.image_url || '') + '\')">✏️ تعديل</button>' +
                '<button class="btn-delete" onclick="deletePartner(\'' + p.id + '\')">🗑️ حذف</button>' +
                '</td>' +
                '</tr>';
        }).join('');

    } catch (e) {
        console.log('Partners admin load error:', e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#EF4444">⚠️ تعذر تحميل الشركاء</td></tr>';
    }
}

function openPartnerModal(id, name, category, imageUrl) {
    if (id) {
        document.getElementById('partnerModalTitle').textContent = '✏️ تعديل شريك';
        document.getElementById('partnerId').value = id;
        document.getElementById('partnerName').value = name || '';
        document.getElementById('partnerCategory').value = category || 'شريك';
        document.getElementById('partnerImage').value = imageUrl || '';
    } else {
        document.getElementById('partnerModalTitle').textContent = '➕ إضافة شريك';
        document.getElementById('partnerId').value = '';
        document.getElementById('partnerName').value = '';
        document.getElementById('partnerCategory').value = 'شريك';
        document.getElementById('partnerImage').value = '';
    }
    document.getElementById('partnerModal').style.display = 'flex';
}

function closePartnerModal() {
    document.getElementById('partnerModal').style.display = 'none';
}

function editPartner(id, name, category, imageUrl) {
    openPartnerModal(id, name, category, imageUrl);
}

async function savePartner(event) {
    event.preventDefault();
    var id = document.getElementById('partnerId').value;
    var name = document.getElementById('partnerName').value.trim();
    var category = document.getElementById('partnerCategory').value;
    var imageUrl = document.getElementById('partnerImage').value.trim();

    if (!name) {
        adminToast('❌ الرجاء إدخال اسم الشريك', 'error');
        return false;
    }

    var payload = {
        name: name,
        category: category,
        image_url: imageUrl
    };

    var result;
    if (id) {
        result = await supabaseClient.from('partners').update(payload).eq('id', id);
    } else {
        result = await supabaseClient.from('partners').insert([payload]);
    }

    if (result.error) {
        adminToast('❌ تعذر حفظ الشريك: ' + result.error.message, 'error');
        return false;
    }

    closePartnerModal();
    adminToast('✅ تم حفظ الشريك بنجاح');
    loadPartnersAdmin();
    return false;
}

async function deletePartner(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الشريك؟')) return;

    var result = await supabaseClient.from('partners').delete().eq('id', id);
    if (result.error) {
        adminToast('❌ تعذر حذف الشريك: ' + result.error.message, 'error');
        return;
    }

    adminToast('✅ تم حذف الشريك بنجاح');
    loadPartnersAdmin();
}
async function loadPaymentMethodsAdmin() {
    var tbody = document.getElementById('paymentMethodsTable');
    if (!tbody) return;
    try {
        var result = await supabaseClient.from('payment_methods').select('*').order('sort_order');
        var methods = result.data || [];
        if (methods.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">💳 لا توجد طرق دفع</td></tr>';
            return;
        }
        tbody.innerHTML = methods.map(function(m, i) {
            return '<tr><td>' + (i+1) + '</td><td style="font-size:30px">' + (m.icon||'💳') + '</td><td>' + m.name + '</td><td>' + (m.description||'—') + '</td>' +
                '<td style="color:' + (m.is_active?'#10B981':'#EF4444') + '">' + (m.is_active?'✅ نشط':'❌ غير نشط') + '</td>' +
                '<td><button class="btn-edit" onclick="editPaymentMethod(' + m.id + ',\'' + m.name + '\',\'' + (m.icon||'💳') + '\',\'' + (m.description||'') + '\',' + m.sort_order + ',' + m.is_active + ')">✏️</button>' +
                '<button class="btn-delete" onclick="deletePaymentMethod(' + m.id + ')">🗑️</button></td></tr>';
        }).join('');
    } catch(e) { console.log(e); }
}

function openPaymentMethodModal(id, name, icon, desc, order, active) {
    document.getElementById('paymentMethodModalTitle').textContent = id ? '✏️ تعديل' : '➕ إضافة';
    document.getElementById('paymentMethodId').value = id || '';
    document.getElementById('paymentMethodName').value = name || '';
    document.getElementById('paymentMethodIcon').value = icon || '💳';
    document.getElementById('paymentMethodDesc').value = desc || '';
    document.getElementById('paymentMethodOrder').value = order || 1;
    document.getElementById('paymentMethodActive').checked = active !== false;
    document.getElementById('paymentMethodModal').style.display = 'flex';
}

function closePaymentMethodModal() { document.getElementById('paymentMethodModal').style.display = 'none'; }

function editPaymentMethod(id, name, icon, desc, order, active) { openPaymentMethodModal(id, name, icon, desc, order, active); }

async function savePaymentMethod(event) {
    event.preventDefault();
    var id = document.getElementById('paymentMethodId').value;
    var payload = {
        name: document.getElementById('paymentMethodName').value.trim(),
        icon: document.getElementById('paymentMethodIcon').value.trim() || '💳',
        description: document.getElementById('paymentMethodDesc').value.trim(),
        sort_order: parseInt(document.getElementById('paymentMethodOrder').value) || 1,
        is_active: document.getElementById('paymentMethodActive').checked
    };
    if (!payload.name) { adminToast('❌ أدخل الاسم', 'error'); return false; }
    var result = id ? await supabaseClient.from('payment_methods').update(payload).eq('id', id)
                    : await supabaseClient.from('payment_methods').insert([payload]);
    if (result.error) { adminToast('❌ خطأ: ' + result.error.message, 'error'); return false; }
    closePaymentMethodModal();
    adminToast('✅ تم الحفظ');
    loadPaymentMethodsAdmin();
    return false;
}

async function deletePaymentMethod(id) {
    if (!confirm('حذف طريقة الدفع؟')) return;
    await supabaseClient.from('payment_methods').delete().eq('id', id);
    adminToast('✅ تم الحذف');
    loadPaymentMethodsAdmin();
}
// ===== نظام الإشعارات =====
var notifSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2qEcP+1j2OUmpmEOQB1Y2N5mJumfVpWSpORrIdgWE+Cz9zSdGJ2/62Qb5ugoIVoY1p4raKMOUE+eNTLp2hsi4DK0MGXhHqNwaSHc4CHpZJ5cGxxsaqUZ2RycLOrj3JhY22glotoZFpsmJuJcWZjcKull3BgXmajnJBlZGRrrautZWNqfLOvk3htbneYlot7b2R/raeZcV9gXqGYhF5PUGiPiGlVUFBpiodjW11jaoB3XVVVX15dWVhYWFlYVg==');

function playNotif() {
    notifSound.play().catch(function(){});
}

function listenForNewOrders() {
    supabaseClient
        .channel('new-orders')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'store_orders' }, function() {
            playNotif();
            updateStats();
            showToast('🔔 طلب جديد!', 'success');
        })
        .subscribe();
}

function listenForNewServices() {
    supabaseClient
        .channel('new-services')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'service_requests' }, function() {
            playNotif();
            updateStats();
            showToast('🔔 طلب خدمة جديد!', 'success');
        })
        .subscribe();
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        listenForNewOrders();
        listenForNewServices();
    }, 2000);
});

// ===== إدارة الشحن =====
async function loadShippingSettings() {
    var result = await supabaseClient.from('shipping_settings').select('*').single();
    if (result.data) {
        document.getElementById('shippingApiKey').value = result.data.api_key || '';
        document.getElementById('shippingAccountNumber').value = result.data.account_number || '';
        document.getElementById('shippingBaseUrl').value = result.data.base_url || 'https://api.spl.sa';
        document.getElementById('shippingEnabled').checked = result.data.enabled || false;
    }
}

function openShippingModal() {
    document.getElementById('shippingModal').style.display = 'flex';
    loadShippingSettings();
}

function closeShippingModal() {
    document.getElementById('shippingModal').style.display = 'none';
}

async function saveShippingSettings(event) {
    event.preventDefault();
    var payload = {
        api_key: document.getElementById('shippingApiKey').value.trim(),
        account_number: document.getElementById('shippingAccountNumber').value.trim(),
        base_url: document.getElementById('shippingBaseUrl').value.trim(),
        enabled: document.getElementById('shippingEnabled').checked,
        provider: 'spl'
    };
    await supabaseClient.from('shipping_settings').upsert([payload]);
    closeShippingModal();
    adminToast('✅ تم حفظ إعدادات الشحن');
    return false;
}

async function loadShippingRates() {
    var tbody = document.getElementById('shippingRatesTable');
    if (!tbody) return;
    var result = await supabaseClient.from('shipping_rates').select('*').order('created_at', { ascending: false });
    var rates = result.data || [];
    if (rates.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">🚚 لا توجد أسعار شحن</td></tr>';
        return;
    }
    tbody.innerHTML = rates.map(function(r, i) {
        return '<tr><td>' + (i+1) + '</td><td>' + r.from_city + '</td><td>' + r.to_city + '</td><td>' + r.weight_kg + '</td><td>' + r.price_sar + ' ر.س</td><td>' + r.estimated_days + ' أيام</td>' +
        '<td><button class="btn-edit" onclick="editShippingRate(\'' + r.id + '\',\'' + r.from_city + '\',\'' + r.to_city + '\',' + r.weight_kg + ',' + r.price_sar + ',' + r.estimated_days + ')">✏️</button>' +
        '<button class="btn-delete" onclick="deleteShippingRate(\'' + r.id + '\')">🗑️</button></td></tr>';
    }).join('');
}

function openShippingRateModal(id, from, to, weight, price, days) {
    document.getElementById('shippingRateId').value = id || '';
    document.getElementById('srFromCity').value = from || '';
    document.getElementById('srToCity').value = to || '';
    document.getElementById('srWeight').value = weight || 1;
    document.getElementById('srPrice').value = price || 0;
    document.getElementById('srDays').value = days || 2;
    document.getElementById('shippingRateModalTitle').textContent = id ? '✏️ تعديل سعر' : '➕ إضافة سعر';
    document.getElementById('shippingRateModal').style.display = 'flex';
}

function closeShippingRateModal() { document.getElementById('shippingRateModal').style.display = 'none'; }

function editShippingRate(id, from, to, weight, price, days) { openShippingRateModal(id, from, to, weight, price, days); }

async function saveShippingRate(event) {
    event.preventDefault();
    var id = document.getElementById('shippingRateId').value;
    var payload = {
        from_city: document.getElementById('srFromCity').value.trim(),
        to_city: document.getElementById('srToCity').value.trim(),
        weight_kg: parseFloat(document.getElementById('srWeight').value),
        price_sar: parseInt(document.getElementById('srPrice').value),
        estimated_days: parseInt(document.getElementById('srDays').value),
        provider: 'spl'
    };
    if (id) { await supabaseClient.from('shipping_rates').update(payload).eq('id', id); }
    else { await supabaseClient.from('shipping_rates').insert([payload]); }
    closeShippingRateModal();
    adminToast('✅ تم حفظ سعر الشحن');
    loadShippingRates();
    return false;
}

async function deleteShippingRate(id) {
    if (!confirm('حذف سعر الشحن؟')) return;
    await supabaseClient.from('shipping_rates').delete().eq('id', id);
    adminToast('✅ تم الحذف');
    loadShippingRates();
}
// ===== إدارة الفواتير =====
async function loadInvoices() {
    var tbody = document.getElementById('invoicesTable');
    if (!tbody) return;
    var result = await supabaseClient.from('invoices').select('*').order('created_at', { ascending: false });
    var invoices = result.data || [];
    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">🧾 لا توجد فواتير</td></tr>';
        return;
    }
    tbody.innerHTML = invoices.map(function(inv, i) {
        return '<tr><td>' + (i+1) + '</td><td><strong>' + inv.invoice_number + '</strong></td><td>' + (inv.customer_name || '—') + '</td><td>' + Number(inv.total || 0).toLocaleString() + ' ر.س</td><td>' + (inv.status === 'issued' ? '✅ صادرة' : '⏳ معلقة') + '</td><td>' + new Date(inv.created_at).toLocaleDateString('ar-SA') + '</td>' +
        '<td><button class="btn-view" onclick="viewInvoice(\'' + inv.id + '\')">👁️ عرض</button></td></tr>';
    }).join('');
}

function viewInvoice(id) {
    window.open('invoice.html?id=' + id, '_blank');
}

function exportInvoices() {
    exportJson(invoices, 'dora-invoices');
}
// ============================================================
// 📢 DORA MARKETING ADMIN - إحصائيات تسويقية للوحة الإدارة
// ============================================================

// ---------- 1. تحديث إحصائيات التسويق ----------
window.updateMarketingStats = async function() {
    // عدد مرات استخدام الكوبونات
    var couponUsage = JSON.parse(localStorage.getItem('doraCouponUsage') || '{"WELCOME":0,"DORA10":0,"DORA20":0}');
    var totalCouponUsage = 0;
    for (var key in couponUsage) {
        totalCouponUsage += couponUsage[key] || 0;
    }
    
    var usageEl = document.getElementById('totalCouponUsage');
    if (usageEl) usageEl.textContent = totalCouponUsage;
    
    // إجمالي الخصومات الممنوحة
    var coupons = {
        'WELCOME': 0.15, 'DORA10': 0.10, 'DORA20': 0.20
    };
    var totalDiscount = 0;
    try {
        var ordersResult = await supabaseClient.from('store_orders').select('total, subtotal');
        var orders = ordersResult.data || [];
        orders.forEach(function(order) {
            if (order.subtotal && order.total) {
                var diff = order.subtotal - order.total;
                if (diff > 0) totalDiscount += diff;
            }
        });
    } catch(e) {}
    
    var discountEl = document.getElementById('totalDiscountGiven');
    if (discountEl) discountEl.textContent = Math.round(totalDiscount).toLocaleString() + ' ر.س';
    
    // معدل التحويل التقريبي
    try {
        var allOrdersResult = await supabaseClient.from('store_orders').select('id', { count: 'exact', head: true });
        var allOrders = allOrdersResult.count || 0;
        var popupShown = localStorage.getItem('doraWelcomeShown') ? 1 : 0;
        var rate = allOrders > 0 ? Math.round((allOrders / Math.max(allOrders + popupShown, 1)) * 100) : 0;
        
        var rateEl = document.getElementById('conversionRate');
        if (rateEl) rateEl.textContent = rate + '%';
    } catch(e) {}
};

// ---------- 2. تحميل إحصائيات التسويق مع التبويب ----------
var origShowTabMarketing = window.showTab;
window.showTab = function(tabName) {
    if (origShowTabMarketing) origShowTabMarketing(tabName);
    
    // تحديث الإحصائيات عند فتح تبويب التسويق
    if (tabName === 'marketing') {
        setTimeout(updateMarketingStats, 500);
    }
    
    // التبويبات التانية
    if (tabName === 'pages' && typeof loadSitePages === 'function') loadSitePages();
    if (tabName === 'services_content' && typeof loadServicePagesContent === 'function') loadServicePagesContent();
    if (tabName === 'bank_accounts' && typeof loadBankAccounts === 'function') loadBankAccounts();
    if (tabName === 'files' && typeof loadSiteFiles === 'function') loadSiteFiles();
    if (tabName === 'partners' && typeof loadPartnersAdmin === 'function') loadPartnersAdmin();
    if (tabName === 'invoices' && typeof loadInvoices === 'function') loadInvoices();
    if (tabName === 'shipping' && typeof loadShippingRates === 'function') loadShippingRates();
    if (tabName === 'content' && typeof loadSiteContent === 'function') loadSiteContent();
    if (tabName === 'payment_methods' && typeof loadPaymentMethodsAdmin === 'function') loadPaymentMethodsAdmin();
};

// ---------- 3. تحديث الإحصائيات مع تحميل البيانات ----------
var origUpdateStats = window.updateStats;
window.updateStats = async function() {
    if (origUpdateStats) await origUpdateStats();
    // تحديث إحصائيات التسويق كمان
    setTimeout(updateMarketingStats, 1000);
};

// ---------- 4. إضافة إحصائيات التسويق للوحة الرئيسية ----------
var origShowDashboard = window.showDashboard;
window.showDashboard = function() {
    if (origShowDashboard) origShowDashboard();
    // إضافة كاردات التسويق بعد تحميل الداشبورد
    setTimeout(function() {
        var statsRow = document.querySelector('.dashboard .container > div[style*="grid-template-columns"]');
        if (statsRow && !document.getElementById('marketingStatsCard')) {
            var marketingCard = document.createElement('div');
            marketingCard.id = 'marketingStatsCard';
            marketingCard.className = 'stat-card';
            marketingCard.style.cssText = 'border-color:rgba(245,158,11,0.5);background:rgba(245,158,11,0.05)';
            marketingCard.innerHTML = '<span class="num" id="totalCouponUsageStat" style="color:#F59E0B">0</span><span class="label" style="color:#F59E0B">🎟️ استخدام الكوبونات</span>';
            statsRow.appendChild(marketingCard);
            updateMarketingStats();
            
            // تحديث رقم الكوبونات في الكارد
            setInterval(function() {
                var usage = JSON.parse(localStorage.getItem('doraCouponUsage') || '{"WELCOME":0,"DORA10":0,"DORA20":0}');
                var total = 0;
                for (var k in usage) total += usage[k] || 0;
                var el = document.getElementById('totalCouponUsageStat');
                if (el) el.textContent = total;
                var el2 = document.getElementById('totalCouponUsage');
                if (el2) el2.textContent = total;
            }, 5000);
        }
    }, 1500);
};
// ============================================================
// 📦 إدارة المخزون واللوجستيات
// ============================================================

// ---------- 1. فحص المخزون المنخفض ----------
window.checkLowStock = async function() {
    try {
        var result = await supabaseClient.from('store_products').select('*').lte('stock', 5).gt('stock', 0);
        var lowStock = result.data || [];
        if (lowStock.length > 0) {
            var notifEl = document.createElement('div');
            notifEl.style.cssText = 'position:fixed;top:20px;right:20px;background:#EF4444;color:white;padding:15px 20px;border-radius:12px;z-index:99999;max-width:350px;font-size:13px;box-shadow:0 10px 40px rgba(239,68,68,0.4)';
            notifEl.innerHTML = '<strong>⚠️ مخزون منخفض!</strong><br>' + lowStock.length + ' منتجات تحتاج إعادة تخزين<br><small>اضغط للإغلاق</small>';
            notifEl.onclick = function() { notifEl.remove(); };
            document.body.appendChild(notifEl);
            setTimeout(function() { notifEl.remove(); }, 8000);
        }
    } catch(e) {}
};

// ---------- 2. تصدير تقرير المخزون ----------
window.exportInventory = async function() {
    var result = await supabaseClient.from('store_products').select('*').order('category');
    var products = result.data || [];
    var csv = 'الاسم,التصنيف,السعر,المخزون,الحالة\n';
    products.forEach(function(p) {
        var status = p.stock <= 0 ? 'نفذ' : p.stock <= 5 ? 'منخفض' : 'متوفر';
        csv += '"' + p.name + '","' + (catLabels[p.category] || p.category) + '","' + p.price + '","' + (p.stock || 0) + '","' + status + '"\n';
    });
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'تقرير-المخزون-' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    adminToast('✅ تم تصدير تقرير المخزون');
};

// ---------- 3. تحديث سريع للمخزون ----------
window.quickUpdateStock = async function(productId, newStock) {
    var stock = parseInt(newStock);
    if (isNaN(stock) || stock < 0) { adminToast('❌ قيمة غير صالحة', 'error'); return; }
    await supabaseClient.from('store_products').update({ stock: stock, updated_at: new Date().toISOString() }).eq('id', productId);
    adminToast('✅ تم تحديث المخزون إلى ' + stock + ' قطعة');
    loadProducts();
};

// ---------- 4. إضافة عمود المخزون ----------
var origLoadProducts = window.loadProducts;
window.loadProducts = async function() {
    await origLoadProducts();
    var tbody = document.getElementById('productsTable');
    if (!tbody) return;
    var result = await supabaseClient.from('store_products').select('*').order('id');
    var products = result.data || [];
    if (!products.length) return;
    var thead = document.querySelector('#productsTab table thead tr');
    if (thead && !document.getElementById('stockHeader')) {
        var th = document.createElement('th');
        th.id = 'stockHeader';
        th.textContent = '📦 المخزون';
        thead.insertBefore(th, thead.querySelector('th:last-child'));
    }
    var rows = tbody.querySelectorAll('tr');
    rows.forEach(function(row, i) {
        if (i < products.length && !row.querySelector('.stock-cell')) {
            var p = products[i];
            var td = document.createElement('td');
            td.className = 'stock-cell';
            var color = p.stock <= 0 ? '#EF4444' : p.stock <= 5 ? '#F59E0B' : '#10B981';
            td.innerHTML = '<span style="color:' + color + ';font-weight:700">' + (p.stock || 0) + '</span> <input type="number" value="' + (p.stock || 0) + '" style="width:60px;padding:4px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:white;font-size:12px" onchange="quickUpdateStock(' + p.id + ', this.value)">';
            row.insertBefore(td, row.querySelector('td:last-child'));
        }
    });
    setTimeout(checkLowStock, 1000);
};

// ---------- 5. زر تصدير المخزون ----------
var origShowTabInventory = window.showTab;
window.showTab = function(tabName) {
    if (origShowTabInventory) origShowTabInventory(tabName);
    if (tabName === 'products') {
        setTimeout(function() {
            var header = document.querySelector('#productsTab .table-header');
            if (header && !document.getElementById('exportInventoryBtn')) {
                var btn = document.createElement('button');
                btn.id = 'exportInventoryBtn';
                btn.className = 'btn-add';
                btn.textContent = '📦 تصدير المخزون';
                btn.onclick = exportInventory;
                header.appendChild(btn);
            }
        }, 800);
    }
};

// ============================================================
// 🏢📋🧾 التبويبات الجديدة: بيانات الشركة + التوثيق + الفوترة
// ============================================================

// ---------- 🏢 حفظ بيانات الشركة ----------
window.saveCompanyInfo = async function() {
    var data = {
        name: document.getElementById('ci_name')?.value || '',
        cr: document.getElementById('ci_cr')?.value || '',
        vat: document.getElementById('ci_vat')?.value || '',
        iban: document.getElementById('ci_iban')?.value || '',
        bank: document.getElementById('ci_bank')?.value || '',
        phone: document.getElementById('ci_phone')?.value || '',
        landline: document.getElementById('ci_landline')?.value || '',
        email: document.getElementById('ci_email')?.value || '',
        website: document.getElementById('ci_website')?.value || '',
        address: document.getElementById('ci_address')?.value || '',
        logo: document.getElementById('ci_logo')?.value || ''
    };
    
    
    try {
        await supabaseClient.from('company_info').upsert([{ id: 1, data: data, updated_at: new Date().toISOString() }], { onConflict: 'id' });
    } catch(e) {}
    
    adminToast('✅ تم حفظ بيانات الشركة بنجاح');
};

// ---------- 📋 حفظ التوثيق الحكومي ----------
window.saveGovDocs = async function() {
    var data = {
        baladia: document.getElementById('gd_baladia')?.value || '',
        baladia_exp: document.getElementById('gd_baladia_exp')?.value || '',
        zakat: document.getElementById('gd_zakat')?.value || '',
        zakat_exp: document.getElementById('gd_zakat_exp')?.value || '',
        vat_cert: document.getElementById('gd_vat_cert')?.value || '',
        saudization: document.getElementById('gd_saudization')?.value || '',
        insurance: document.getElementById('gd_insurance')?.value || '',
        civil_defense: document.getElementById('gd_civil_defense')?.value || '',
        iso: document.getElementById('gd_iso')?.value || '',
        hp: document.getElementById('gd_hp')?.value || '',
        zebra: document.getElementById('gd_zebra')?.value || '',
        honeywell: document.getElementById('gd_honeywell')?.value || ''
    };
    
    
    try {
        await supabaseClient.from('gov_docs').upsert([{ id: 1, data: data, updated_at: new Date().toISOString() }], { onConflict: 'id' });
    } catch(e) {}
    
    adminToast('✅ تم حفظ التوثيق الحكومي بنجاح');
};

// ---------- 🧾 حفظ إعدادات الفوترة الإلكترونية ----------
window.saveEInvoice = async function() {
    var data = {
        afaq_key: document.getElementById('ei_afaq_key')?.value || '',
        afaq_url: document.getElementById('ei_afaq_url')?.value || '',
        afaq_active: document.getElementById('ei_afaq_active')?.checked || false,
        zatca_id: document.getElementById('ei_zatca_id')?.value || '',
        cert_path: document.getElementById('ei_cert_path')?.value || '',
        qr: document.getElementById('ei_qr')?.value || 'yes',
        zatca_auto: document.getElementById('ei_zatca_auto')?.value || 'no'
    };
    
    
    try {
        await supabaseClient.from('einvoice_settings').upsert([{ id: 1, data: data, updated_at: new Date().toISOString() }], { onConflict: 'id' });
    } catch(e) {}
    
    adminToast('✅ تم حفظ إعدادات الفوترة الإلكترونية بنجاح');
};

// ---------- تحميل البيانات عند فتح التبويبات ----------
var origShowTabFinal = window.showTab;
window.showTab = async function(tabName) {
    if (origShowTabFinal) origShowTabFinal(tabName);
    
    // تحميل بيانات الشركة
    if (tabName === 'company_info') {
                var ci = {};
        try {
            var result = await supabaseClient.from('company_info').select('data').eq('id', 1).maybeSingle();
            if (result.data?.data) ci = result.data.data;
        } catch(e) {}
        if (ci.name) document.getElementById('ci_name').value = ci.name;
        if (ci.cr) document.getElementById('ci_cr').value = ci.cr;
        if (ci.vat) document.getElementById('ci_vat').value = ci.vat;
        if (ci.iban) document.getElementById('ci_iban').value = ci.iban;
        if (ci.bank) document.getElementById('ci_bank').value = ci.bank;
        if (ci.phone) document.getElementById('ci_phone').value = ci.phone;
        if (ci.landline) document.getElementById('ci_landline').value = ci.landline;
        if (ci.email) document.getElementById('ci_email').value = ci.email;
        if (ci.website) document.getElementById('ci_website').value = ci.website;
        if (ci.address) document.getElementById('ci_address').value = ci.address;
        if (ci.logo) document.getElementById('ci_logo').value = ci.logo;
    }
    
    // تحميل التوثيق الحكومي
    if (tabName === 'gov_docs') {
                var gd = {};
        try {
            var result = await supabaseClient.from('gov_docs').select('data').eq('id', 1).maybeSingle();
            if (result.data?.data) gd = result.data.data;
        } catch(e) {}
        if (gd.baladia) document.getElementById('gd_baladia').value = gd.baladia;
        if (gd.baladia_exp) document.getElementById('gd_baladia_exp').value = gd.baladia_exp;
        if (gd.zakat) document.getElementById('gd_zakat').value = gd.zakat;
        if (gd.zakat_exp) document.getElementById('gd_zakat_exp').value = gd.zakat_exp;
        if (gd.vat_cert) document.getElementById('gd_vat_cert').value = gd.vat_cert;
        if (gd.saudization) document.getElementById('gd_saudization').value = gd.saudization;
        if (gd.insurance) document.getElementById('gd_insurance').value = gd.insurance;
        if (gd.civil_defense) document.getElementById('gd_civil_defense').value = gd.civil_defense;
        if (gd.iso) document.getElementById('gd_iso').value = gd.iso;
        if (gd.hp) document.getElementById('gd_hp').value = gd.hp;
        if (gd.zebra) document.getElementById('gd_zebra').value = gd.zebra;
        if (gd.honeywell) document.getElementById('gd_honeywell').value = gd.honeywell;
    }
    
    // تحميل إعدادات الفوترة
    if (tabName === 'einvoice') {
                var ei = {};
        try {
            var result = await supabaseClient.from('einvoice_settings').select('data').eq('id', 1).maybeSingle();
            if (result.data?.data) ei = result.data.data;
        } catch(e) {}
        if (ei.afaq_key) document.getElementById('ei_afaq_key').value = ei.afaq_key;
        if (ei.afaq_url) document.getElementById('ei_afaq_url').value = ei.afaq_url;
        if (ei.afaq_active) document.getElementById('ei_afaq_active').checked = ei.afaq_active;
        if (ei.zatca_id) document.getElementById('ei_zatca_id').value = ei.zatca_id;
        if (ei.cert_path) document.getElementById('ei_cert_path').value = ei.cert_path;
        if (ei.qr) document.getElementById('ei_qr').value = ei.qr;
        if (ei.zatca_auto) document.getElementById('ei_zatca_auto').value = ei.zatca_auto;
    }
};
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(checkLowStock, 3000);
});

// ============================================================
// 🌐 إدارة المحتوى الديناميكي للموقع - 7 تبويبات
// ============================================================

// ---------- 📊 الإحصائيات ----------
window.loadSiteStats = async function() {
    var tbody = document.getElementById('siteStatsTable');
    if (!tbody) return;
    var result = await supabaseClient.from('site_stats').select('*').order('sort_order');
    var data = result.data || [];
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="7">لا توجد إحصائيات</td></tr>'; return; }
    tbody.innerHTML = data.map(function(item, i) {
        return '<tr><td>' + (i+1) + '</td><td>' + (item.icon_name||'') + '</td><td>' + (item.number||'') + '</td><td>' + (item.label||'') + '</td><td><span style="color:' + (item.color||'') + '">●</span></td><td>' + (item.sort_order||1) + '</td><td><button class="btn-edit" onclick="editSiteStat(' + item.id + ')">✏️</button> <button class="btn-delete" onclick="deleteSiteStat(' + item.id + ')">🗑️</button></td></tr>';
    }).join('');
};

window.addSiteStat = function() {
    var number = prompt('الرقم (مثلاً: +15):'); if (!number) return;
    var label = prompt('العنوان (مثلاً: سنة خبرة):'); if (!label) return;
    var color = prompt('اللون (مثلاً: #22D3EE):', '#22D3EE');
    var icon = prompt('الأيقونة (مثلاً: trophy):', 'trophy');
    supabaseClient.from('site_stats').insert([{number:number, label:label, color:color, icon_name:icon}]).then(function() { loadSiteStats(); adminToast('✅ تمت الإضافة'); });
};

window.editSiteStat = async function(id) {
    var result = await supabaseClient.from('site_stats').select('*').eq('id', id).single();
    if (!result.data) return;
    var d = result.data;
    var number = prompt('الرقم:', d.number); if (!number) return;
    var label = prompt('العنوان:', d.label); if (!label) return;
    var color = prompt('اللون:', d.color);
    await supabaseClient.from('site_stats').update({number:number, label:label, color:color}).eq('id', id);
    loadSiteStats(); adminToast('✅ تم التعديل');
};

window.deleteSiteStat = async function(id) {
    if (!confirm('حذف هذه الإحصائية؟')) return;
    await supabaseClient.from('site_stats').delete().eq('id', id);
    loadSiteStats(); adminToast('✅ تم الحذف');
};

// ---------- 🌟 الرؤية والقيم ----------
window.loadSiteAbout = async function() {
    var tbody = document.getElementById('siteAboutTable');
    if (!tbody) return;
    var result = await supabaseClient.from('site_about').select('*').order('sort_order');
    var data = result.data || [];
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="6">لا يوجد محتوى</td></tr>'; return; }
    tbody.innerHTML = data.map(function(item, i) {
        var typeLabel = item.section_type === 'vision' ? 'رؤية' : item.section_type === 'mission' ? 'رسالة' : 'قيم';
        return '<tr><td>' + (i+1) + '</td><td>' + typeLabel + '</td><td>' + (item.title||'') + '</td><td>' + ((item.content||'').substring(0,50) + '...') + '</td><td><span style="color:' + (item.icon_color||'') + '">●</span></td><td><button class="btn-edit" onclick="editSiteAbout(' + item.id + ')">✏️</button></td></tr>';
    }).join('');
};

window.editSiteAbout = async function(id) {
    var result = await supabaseClient.from('site_about').select('*').eq('id', id).single();
    if (!result.data) return;
    var d = result.data;
    var title = prompt('العنوان:', d.title); if (!title) return;
    var content = prompt('المحتوى:', d.content); if (!content) return;
    await supabaseClient.from('site_about').update({title:title, content:content}).eq('id', id);
    loadSiteAbout(); adminToast('✅ تم التعديل');
};

// ---------- 💬 آراء الشركات ----------
window.loadSiteTestimonials = async function() {
    var tbody = document.getElementById('siteTestimonialsTable');
    if (!tbody) return;
    var result = await supabaseClient.from('testimonials').select('*').order('id');
    var data = result.data || [];
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="7">لا توجد آراء</td></tr>'; return; }
    tbody.innerHTML = data.map(function(item, i) {
        return '<tr><td>' + (i+1) + '</td><td>' + (item.company_name||'') + '</td><td>' + (item.reviewer_name||'') + '</td><td>' + '⭐'.repeat(item.rating||5) + '</td><td>' + (item.product_name||'') + '</td><td>' + (item.is_active?'✅':'❌') + '</td><td><button class="btn-edit" onclick="editTestimonial(' + item.id + ')">✏️</button> <button class="btn-delete" onclick="deleteTestimonial(' + item.id + ')">🗑️</button></td></tr>';
    }).join('');
};

window.addTestimonial = function() {
    var company = prompt('اسم الشركة:'); if (!company) return;
    var reviewer = prompt('اسم المقيم:'); if (!reviewer) return;
    var content = prompt('نص التقييم:'); if (!content) return;
    supabaseClient.from('testimonials').insert([{company_name:company, reviewer_name:reviewer, content:content, rating:5, is_active:true}]).then(function() { loadSiteTestimonials(); adminToast('✅ تمت الإضافة'); });
};

window.editTestimonial = async function(id) {
    var result = await supabaseClient.from('testimonials').select('*').eq('id', id).single();
    if (!result.data) return;
    var d = result.data;
    var content = prompt('نص التقييم:', d.content); if (!content) return;
    await supabaseClient.from('testimonials').update({content:content}).eq('id', id);
    loadSiteTestimonials(); adminToast('✅ تم التعديل');
};

window.deleteTestimonial = async function(id) {
    if (!confirm('حذف هذا التقييم؟')) return;
    await supabaseClient.from('testimonials').delete().eq('id', id);
    loadSiteTestimonials(); adminToast('✅ تم الحذف');
};

// ---------- 📦 المشاريع ----------
window.loadSiteProjects = async function() {
    var tbody = document.getElementById('siteProjectsTable');
    if (!tbody) return;
    var result = await supabaseClient.from('projects').select('*').order('sort_order');
    var data = result.data || [];
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="7">لا توجد مشاريع</td></tr>'; return; }
    tbody.innerHTML = data.map(function(item, i) {
        return '<tr><td>' + (i+1) + '</td><td>' + (item.title||'') + '</td><td>' + (item.client_name||'') + '</td><td>' + ((item.description||'').substring(0,40) + '...') + '</td><td><span style="color:' + (item.icon_color||'') + '">●</span></td><td>' + (item.is_active?'✅':'❌') + '</td><td><button class="btn-edit" onclick="editProject(' + item.id + ')">✏️</button> <button class="btn-delete" onclick="deleteProject(' + item.id + ')">🗑️</button></td></tr>';
    }).join('');
};

window.addProject = function() {
    var title = prompt('عنوان المشروع:'); if (!title) return;
    var client = prompt('اسم العميل:'); if (!client) return;
    var desc = prompt('الوصف:'); if (!desc) return;
    supabaseClient.from('projects').insert([{title:title, client_name:client, description:desc, is_active:true}]).then(function() { loadSiteProjects(); adminToast('✅ تمت الإضافة'); });
};

window.editProject = async function(id) {
    var result = await supabaseClient.from('projects').select('*').eq('id', id).single();
    if (!result.data) return;
    var d = result.data;
    var title = prompt('العنوان:', d.title); if (!title) return;
    var client = prompt('العميل:', d.client_name); if (!client) return;
    await supabaseClient.from('projects').update({title:title, client_name:client}).eq('id', id);
    loadSiteProjects(); adminToast('✅ تم التعديل');
};

window.deleteProject = async function(id) {
    if (!confirm('حذف هذا المشروع؟')) return;
    await supabaseClient.from('projects').delete().eq('id', id);
    loadSiteProjects(); adminToast('✅ تم الحذف');
};

// ---------- 📝 المقالات ----------
window.loadSiteBlog = async function() {
    var tbody = document.getElementById('siteBlogTable');
    if (!tbody) return;
    var result = await supabaseClient.from('blog_posts').select('*').order('sort_order');
    var data = result.data || [];
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="7">لا توجد مقالات</td></tr>'; return; }
    tbody.innerHTML = data.map(function(item, i) {
        return '<tr><td>' + (i+1) + '</td><td>' + (item.title||'') + '</td><td>' + (item.publish_date||'') + '</td><td>' + (item.read_time||'') + '</td><td><a href="' + (item.link_url||'#') + '" target="_blank">🔗</a></td><td>' + (item.is_active?'✅':'❌') + '</td><td><button class="btn-edit" onclick="editBlogPost(' + item.id + ')">✏️</button> <button class="btn-delete" onclick="deleteBlogPost(' + item.id + ')">🗑️</button></td></tr>';
    }).join('');
};

window.addBlogPost = function() {
    var title = prompt('عنوان المقال:'); if (!title) return;
    var date = prompt('التاريخ (مثلاً: يناير 2025):'); if (!date) return;
    var time = prompt('وقت القراءة (مثلاً: 5 دقائق):'); if (!time) return;
    var link = prompt('الرابط:'); if (!link) return;
    supabaseClient.from('blog_posts').insert([{title:title, publish_date:date, read_time:time, link_url:link, is_active:true}]).then(function() { loadSiteBlog(); adminToast('✅ تمت الإضافة'); });
};

window.editBlogPost = async function(id) {
    var result = await supabaseClient.from('blog_posts').select('*').eq('id', id).single();
    if (!result.data) return;
    var d = result.data;
    var title = prompt('العنوان:', d.title); if (!title) return;
    var date = prompt('التاريخ:', d.publish_date); if (!date) return;
    await supabaseClient.from('blog_posts').update({title:title, publish_date:date}).eq('id', id);
    loadSiteBlog(); adminToast('✅ تم التعديل');
};

window.deleteBlogPost = async function(id) {
    if (!confirm('حذف هذا المقال؟')) return;
    await supabaseClient.from('blog_posts').delete().eq('id', id);
    loadSiteBlog(); adminToast('✅ تم الحذف');
};

// ---------- 📜 الشهادات ----------
window.loadSiteCertifications = async function() {
    var tbody = document.getElementById('siteCertificationsTable');
    if (!tbody) return;
    var result = await supabaseClient.from('certifications').select('*').order('sort_order');
    var data = result.data || [];
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="7">لا توجد شهادات</td></tr>'; return; }
    tbody.innerHTML = data.map(function(item, i) {
        return '<tr><td>' + (i+1) + '</td><td>' + (item.title||'') + '</td><td>' + (item.badge_text||'') + '</td><td>' + ((item.description||'').substring(0,40) + '...') + '</td><td><span style="color:' + (item.icon_color||'') + '">●</span></td><td>' + (item.is_active?'✅':'❌') + '</td><td><button class="btn-edit" onclick="editCertification(' + item.id + ')">✏️</button> <button class="btn-delete" onclick="deleteCertification(' + item.id + ')">🗑️</button></td></tr>';
    }).join('');
};

window.addCertification = function() {
    var title = prompt('عنوان الشهادة:'); if (!title) return;
    var badge = prompt('الشارة (مثلاً: معتمد):'); if (!badge) return;
    var desc = prompt('الوصف:'); if (!desc) return;
    supabaseClient.from('certifications').insert([{title:title, badge_text:badge, description:desc, is_active:true}]).then(function() { loadSiteCertifications(); adminToast('✅ تمت الإضافة'); });
};

window.editCertification = async function(id) {
    var result = await supabaseClient.from('certifications').select('*').eq('id', id).single();
    if (!result.data) return;
    var d = result.data;
    var title = prompt('العنوان:', d.title); if (!title) return;
    var badge = prompt('الشارة:', d.badge_text); if (!badge) return;
    await supabaseClient.from('certifications').update({title:title, badge_text:badge}).eq('id', id);
    loadSiteCertifications(); adminToast('✅ تم التعديل');
};

window.deleteCertification = async function(id) {
    if (!confirm('حذف هذه الشهادة؟')) return;
    await supabaseClient.from('certifications').delete().eq('id', id);
    loadSiteCertifications(); adminToast('✅ تم الحذف');
};

// ---------- 📞 التواصل ----------
window.loadSiteContact = async function() {
    var tbody = document.getElementById('siteContactTable');
    if (!tbody) return;
    var result = await supabaseClient.from('contact_info').select('*').order('sort_order');
    var data = result.data || [];
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="7">لا توجد بيانات</td></tr>'; return; }
    tbody.innerHTML = data.map(function(item, i) {
        return '<tr><td>' + (i+1) + '</td><td>' + (item.type||'') + '</td><td>' + (item.label||'') + '</td><td>' + (item.value||'') + '</td><td><a href="' + (item.link_url||'#') + '" target="_blank">🔗</a></td><td>' + (item.is_active?'✅':'❌') + '</td><td><button class="btn-edit" onclick="editContactInfo(' + item.id + ')">✏️</button> <button class="btn-delete" onclick="deleteContactInfo(' + item.id + ')">🗑️</button></td></tr>';
    }).join('');
};

window.addContactInfo = function() {
    var type = prompt('النوع (phone/whatsapp/email/location):', 'phone'); if (!type) return;
    var label = prompt('العنوان (مثلاً: اتصل بنا):'); if (!label) return;
    var value = prompt('القيمة (مثلاً: +966 56 871 7449):'); if (!value) return;
    var link = prompt('الرابط (مثلاً: tel:+966...):'); if (!link) return;
    supabaseClient.from('contact_info').insert([{type:type, label:label, value:value, link_url:link, is_active:true}]).then(function() { loadSiteContact(); adminToast('✅ تمت الإضافة'); });
};

window.editContactInfo = async function(id) {
    var result = await supabaseClient.from('contact_info').select('*').eq('id', id).single();
    if (!result.data) return;
    var d = result.data;
    var label = prompt('العنوان:', d.label); if (!label) return;
    var value = prompt('القيمة:', d.value); if (!value) return;
    await supabaseClient.from('contact_info').update({label:label, value:value}).eq('id', id);
    loadSiteContact(); adminToast('✅ تم التعديل');
};

window.deleteContactInfo = async function(id) {
    if (!confirm('حذف جهة الاتصال؟')) return;
    await supabaseClient.from('contact_info').delete().eq('id', id);
    loadSiteContact(); adminToast('✅ تم الحذف');
};

/* ============================================================
   🌐 مدير المحتوى الديناميكي الموحد
   ============================================================ */
const sectionLabels = {
  hero_stats: 'الإحصائيات',
  about: 'عن الشركة',
  testimonials: 'آراء العملاء',
  projects: 'المشاريع',
  blog: 'المقالات',
  certifications: 'الشهادات والتراخيص',
  contact: 'معلومات التواصل'
};

if (typeof esc === 'undefined') {
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, function(ch) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];
    });
  }
}
window.loadSiteItems = async function(sectionKey) {
  var container = document.getElementById(sectionKey + 'List');
  if (!container) return;
  container.innerHTML = '<div class="admin-empty">⏳ جاري التحميل...</div>';

  var result = await supabaseClient
    .from('site_items')
    .select('*')
    .eq('section_key', sectionKey)
    .order('sort_order');

  if (result.error) {
    container.innerHTML = '<div class="admin-empty" style="color:#EF4444">❌ خطأ: ' + result.error.message + '</div>';
    return;
  }

  var items = result.data || [];
  if (!items.length) {
    container.innerHTML = '<div class="admin-empty">📭 لا توجد بيانات. اضغط ➕ إضافة.</div>';
    return;
  }

  var html = '<table><thead><tr><th>#</th><th>العنوان</th><th>الوصف</th><th>التفاصيل</th><th>الترتيب</th><th>الإجراءات</th></tr></thead><tbody>';
  
  items.forEach(function(item, index) {
    var meta = item.metadata || {};
    var desc = (item.description_ar || '').substring(0, 50) + ((item.description_ar || '').length > 50 ? '…' : '');
    var extra = '';
    if (meta.number) extra += '📊 ' + esc(meta.number) + ' ';
    if (meta.rating) extra += '⭐' + meta.rating + ' ';
    if (meta.badge_text) extra += '🏅 ' + esc(meta.badge_text) + ' ';
    if (meta.type) extra += '📌 ' + esc(meta.type) + ' ';
    if (meta.value) extra += esc(meta.value).substring(0,20);
    html += '<tr>' +
      '<td>' + (index + 1) + '</td>' +
      '<td><strong>' + esc(item.title_ar || 'بدون عنوان') + '</strong></td>' +
      '<td>' + esc(desc || '—') + '</td>' +
      '<td>' + (extra || '—') + '</td>' +
      '<td>' + item.sort_order + '</td>' +
      '<td>' +
        '<button class="btn-edit" onclick="editSiteItem(' + item.id + ')">✏️</button> ' +
        '<button class="btn-delete" onclick="deleteSiteItem(' + item.id + ', \'' + sectionKey + '\')">🗑️</button>' +
      '</td>' +
    '</tr>';
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
};

window.addSiteItem = async function(sectionKey) {
  var title = prompt('العنوان:');
  if (!title) return;
  var description = prompt('الوصف (اختياري):') || '';
  var sortOrder = parseInt(prompt('الترتيب (رقم):', '1')) || 1;
  var metadata = {};
  
  if (sectionKey === 'hero_stats') {
    metadata.number = prompt('الرقم (مثلاً: +500):', '') || '';
    metadata.color = prompt('اللون (مثلاً: #22D3EE):', '#22D3EE') || '#22D3EE';
    metadata.icon_name = prompt('الإيموجي (مثلاً: 🏆):', '🏆') || '🏆';
  } else if (sectionKey === 'testimonials') {
    metadata.reviewer_name = title;
    metadata.company_name = prompt('اسم الشركة:') || '';
    metadata.rating = parseInt(prompt('التقييم (1-5):', '5')) || 5;
  } else if (sectionKey === 'blog') {
    metadata.publish_date = prompt('تاريخ النشر:') || '';
    metadata.read_time = prompt('وقت القراءة:') || '';
    metadata.link_url = prompt('الرابط:') || '#';
  } else if (sectionKey === 'contact') {
    metadata.type = prompt('النوع (phone/email/whatsapp/location):', 'phone') || 'phone';
    metadata.value = prompt('القيمة:') || '';
    metadata.link_url = prompt('الرابط:') || '#';
  } else if (sectionKey === 'certifications') {
    metadata.badge_text = prompt('الشارة (مثلاً: معتمد):') || '';
  } else if (sectionKey === 'projects') {
    metadata.client_name = prompt('اسم العميل:') || '';
  }

  var result = await supabaseClient.from('site_items').insert([{
    section_key: sectionKey, title_ar: title, description_ar: description,
    metadata: metadata, sort_order: sortOrder
  }]);

  if (result.error) { adminToast('❌ خطأ: ' + result.error.message, 'error'); return; }
  adminToast('✅ تمت الإضافة بنجاح');
  loadSiteItems(sectionKey);
};

window.editSiteItem = async function(id) {
  var result = await supabaseClient.from('site_items').select('*').eq('id', id).single();
  if (result.error || !result.data) { adminToast('❌ لم يتم العثور على العنصر', 'error'); return; }
  var item = result.data;
  var title = prompt('العنوان:', item.title_ar);
  if (title === null) return;
  var description = prompt('الوصف:', item.description_ar || '');
  if (description === null) return;
  var sortOrder = parseInt(prompt('الترتيب:', item.sort_order)) || item.sort_order;

  var result2 = await supabaseClient.from('site_items').update({
    title_ar: title, description_ar: description, sort_order: sortOrder
  }).eq('id', id);

  if (result2.error) { adminToast('❌ خطأ: ' + result2.error.message, 'error'); return; }
  adminToast('✅ تم التعديل بنجاح');
  loadSiteItems(item.section_key);
};

window.deleteSiteItem = async function(id, sectionKey) {
  if (!confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;
  var result = await supabaseClient.from('site_items').delete().eq('id', id);
  if (result.error) { adminToast('❌ خطأ: ' + result.error.message, 'error'); return; }
  adminToast('✅ تم الحذف بنجاح');
  loadSiteItems(sectionKey);
};

/* ============================================================
   📑 مدير التبويبات النهائي
   ============================================================ */
var _finalShowTab = window.showTab;
window.showTab = function(tabName) {
  if (_finalShowTab) _finalShowTab(tabName);
  if (tabName === 'hero_stats') loadSiteItems('hero_stats');
  if (tabName === 'about') loadSiteItems('about');
  if (tabName === 'testimonials') loadSiteItems('testimonials');
  if (tabName === 'projects') loadSiteItems('projects');
  if (tabName === 'blog') loadSiteItems('blog');
  if (tabName === 'certifications') loadSiteItems('certifications');
  if (tabName === 'contact') loadSiteItems('contact');
};
window.handleLogin = async function(e){
  e.preventDefault();
  var email = document.getElementById('username').value.trim();
  var password = document.getElementById('password').value;
  var btn = e.target.querySelector('button[type="submit"]');
  var errorMsg = document.getElementById('errorMsg');
  errorMsg.style.display = 'none';
  btn.disabled = true;
  btn.textContent = '⏳ جاري التحقق...';

  var result = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
  if (result.error || !result.data.user) {
    btn.disabled = false; btn.textContent = 'دخول إلى لوحة التحكم';
    errorMsg.textContent = '❌ البريد الإلكتروني أو كلمة المرور غير صحيحة';
    errorMsg.style.display = 'block';
    return false;
  }

  var allowed = await isAdminUser(result.data.user);
  if (!allowed) {
    await supabaseClient.auth.signOut();
    btn.disabled = false; btn.textContent = 'دخول إلى لوحة التحكم';
    errorMsg.textContent = '❌ هذا الحساب لا يملك صلاحية الإدارة';
    errorMsg.style.display = 'block';
    return false;
  }

  localStorage.setItem('adminLoggedIn', 'true');
  localStorage.setItem('adminLoginTime', Date.now());
  showDashboard();
  return false;
};
