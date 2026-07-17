/* ============================================================
   درة فارس الشمال — نظام الحسابات والطلبات والتقييمات الموثقة
   يعمل مع Supabase ولا يغير شكل الموقع الحالي
   ============================================================ */
(function(){
'use strict';

if (typeof supabaseClient === 'undefined' || !supabaseClient) {
  console.warn('Dora account system: Supabase client is not available.');
  return;
}

const state = {
  user: null,
  profile: null,
  addresses: [],
  orders: [],
  services: [],
  receipts: [],
  reviews: [],
  currentTab: 'overview',
  accountReady: false
};

const orderStatusLabels = {
  new: 'جديد', review: 'قيد المراجعة', processing: 'قيد التجهيز',
  shipped: 'تم الشحن', delivered: 'تم التسليم', completed: 'مكتمل', cancelled: 'ملغي'
};
const paymentStatusLabels = {
  pending: 'بانتظار الدفع', review: 'بانتظار مراجعة الإيصال',
  paid: 'تم تأكيد الدفع', rejected: 'الإيصال مرفوض', refunded: 'تم الاسترجاع'
};
const serviceStatusLabels = {
  new: 'جديد', contacted: 'تم التواصل', inspection: 'تمت المعاينة',
  in_progress: 'قيد التنفيذ', completed: 'مكتمل', cancelled: 'ملغي'
};
const reviewStatusLabels = { pending: 'بانتظار المراجعة', published: 'منشور', approved: 'منشور', hidden: 'مخفي' };

function esc(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}
function money(value){
  const n = Number(value || 0);
  return typeof formatPrice === 'function' ? formatPrice(n) : n.toLocaleString('ar-SA') + ' ر.س';
}
function dateAr(value){
  if (!value) return '—';
  try { return new Date(value).toLocaleDateString('ar-SA', {year:'numeric',month:'long',day:'numeric'}); }
  catch(_) { return String(value); }
}
function notify(message, type){
  if (typeof showToast === 'function') showToast(message, type || 'success');
  else alert(message);
}
function getParam(name){ return new URLSearchParams(location.search).get(name); }

async function getCurrentUser(){
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) return null;
  return data.user || null;
}

async function ensureProfile(user, seed){
  if (!user) return null;
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (data) return data;
  if (error && error.code !== 'PGRST116') console.warn('profile select:', error);

  const payload = {
    id: user.id,
    full_name: seed?.full_name || user.user_metadata?.full_name || '',
    phone: seed?.phone || user.user_metadata?.phone || '',
    role: 'customer'
  };
  const { data: created, error: upsertError } = await supabaseClient
    .from('profiles')
    .upsert([payload], { onConflict: 'id' })
    .select('*')
    .single();
  if (upsertError) {
    console.warn('profile upsert:', upsertError);
    return payload;
  }
  return created;
}

async function getDefaultAddress(userId){
  const { data, error } = await supabaseClient
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) return null;
  return data && data[0] ? data[0] : null;
}

function redirectToAccount(tab, next){
  const params = new URLSearchParams();
  if (tab) params.set('tab', tab);
  if (next) params.set('next', next);
  setTimeout(() => { location.href = 'account.html' + (params.toString() ? '?' + params.toString() : ''); }, 900);
}

async function requireLogin(tab, next){
  const user = await getCurrentUser();
  if (user) return user;
  notify('🔐 سجّل الدخول أولاً لإكمال العملية', 'warning');
  redirectToAccount(tab || 'overview', next || '');
  return null;
}

function injectHeroAccountButtons(){
  // إزالة أي زر حساب قديم من الهيدر وإرجاع السلة لمكانها الأصلي
  document.querySelectorAll('.account-header-btn').forEach(btn => btn.remove());

  const heroes = document.querySelectorAll('.hero, .page-hero, .service-hero, .services-hero');
  heroes.forEach(hero => {
    if (hero.querySelector('.hero-account-wrap')) return;

    const wrap = document.createElement('span');
    wrap.className = 'hero-account-wrap';
    wrap.innerHTML = `
      <button type="button" class="btn-primary hero-account-trigger" aria-haspopup="true" aria-expanded="false">
        👤 <span class="hero-account-label">الحساب</span> <span class="hero-account-chevron">⌄</span>
      </button>
      <span class="hero-account-menu" role="menu">
        <a href="account.html?mode=register" role="menuitem"><span>✨</span><strong>إنشاء حساب</strong></a>
        <a href="account.html?mode=login" role="menuitem"><span>🔐</span><strong>تسجيل دخول</strong></a>
      </span>
    `;

    const heroButtons = hero.querySelector('.hero-btns');
    if (heroButtons) {
      heroButtons.appendChild(wrap);
    } else {
      const content = hero.querySelector('.hero-content') || hero;
      const row = document.createElement('div');
      row.className = 'hero-account-row';
      row.appendChild(wrap);
      content.appendChild(row);
    }

    const trigger = wrap.querySelector('.hero-account-trigger');
    trigger.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const user = await getCurrentUser();
      if (user) {
        location.href = 'account.html';
        return;
      }
      const isOpen = wrap.classList.toggle('open');
      trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });

  if (!window.__heroAccountMenuBound) {
    window.__heroAccountMenuBound = true;
    document.addEventListener('click', event => {
      document.querySelectorAll('.hero-account-wrap.open').forEach(wrap => {
        if (!wrap.contains(event.target)) {
          wrap.classList.remove('open');
          wrap.querySelector('.hero-account-trigger')?.setAttribute('aria-expanded', 'false');
        }
      });
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        document.querySelectorAll('.hero-account-wrap.open').forEach(wrap => {
          wrap.classList.remove('open');
          wrap.querySelector('.hero-account-trigger')?.setAttribute('aria-expanded', 'false');
        });
      }
    });
  }

  updateAccountButtonLabel();
}

async function updateAccountButtonLabel(){
  const buttons = document.querySelectorAll('.hero-account-label');
  if (!buttons.length) return;
  const user = await getCurrentUser();
  buttons.forEach(label => {
    label.textContent = user ? 'حسابي' : 'الحساب';
  });
}

/* ============================================================
   صفحة حسابي
   ============================================================ */
function accountApp(){ return document.getElementById('accountApp'); }

async function initAccountPage(force){
  const app = accountApp();
  if (!app || (state.accountReady && !force)) return;
  state.accountReady = true;
  app.innerHTML = '<div class="account-loading"><span>⏳</span><p>جاري تجهيز حسابك...</p></div>';

  state.user = await getCurrentUser();
  if (!state.user) {
    renderAuth();
    updateAccountButtonLabel();
    return;
  }

  state.profile = await ensureProfile(state.user);
  await loadAccountData();
  const requestedTab = getParam('tab');
  if (requestedTab) state.currentTab = requestedTab;
  renderDashboard();
  updateAccountButtonLabel();
}

function renderAuth(message){
  const app = accountApp();
  if (!app) return;
  app.innerHTML = `
    <div class="account-auth-grid">
      <div class="account-auth-intro">
        <span class="account-auth-icon">👤</span>
        <h2>حسابك في درة فارس الشمال</h2>
        <p>سجّل الدخول أو أنشئ حساباً جديداً لتتمكن من حفظ عناوينك، متابعة طلباتك وخدماتك، رفع إيصالات الدفع، وتقييم المنتجات التي اشتريتها.</p>
        <div class="account-benefits">
          <span>📦 متابعة الطلبات</span>
          <span>📍 حفظ العناوين</span>
          <span>🧾 إيصالات الدفع</span>
          <span>⭐ تقييم موثق</span>
        </div>
        ${message ? `<div class="account-success-message">${esc(message)}</div>` : ''}
      </div>

      <div class="account-card account-auth-card">
        <div class="account-tabs two">
          <button class="active" data-auth-tab="login" type="button">تسجيل الدخول</button>
          <button data-auth-tab="register" type="button">إنشاء حساب</button>
        </div>

        <form id="accountLoginForm" class="account-form">
          <label>البريد الإلكتروني</label>
          <input type="email" id="loginEmail" required placeholder="example@email.com">
          <label>كلمة المرور</label>
          <input type="password" id="loginPassword" required placeholder="••••••••" minlength="6">
          <button type="submit" class="btn-primary account-submit">🔐 دخول</button>
        </form>

        <form id="accountRegisterForm" class="account-form" style="display:none">
          <label>الاسم الكامل</label>
          <input type="text" id="registerName" required placeholder="محمد علي">
          <label>رقم الجوال</label>
          <input type="tel" id="registerPhone" required placeholder="05xxxxxxxx">
          <label>البريد الإلكتروني</label>
          <input type="email" id="registerEmail" required placeholder="example@email.com">
          <label>كلمة المرور</label>
          <input type="password" id="registerPassword" required placeholder="6 أحرف على الأقل" minlength="6">
          <button type="submit" class="btn-primary account-submit">✨ إنشاء الحساب</button>
        </form>
      </div>
    </div>
  `;

  app.querySelectorAll('[data-auth-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      app.querySelectorAll('[data-auth-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const isLogin = btn.dataset.authTab === 'login';
      document.getElementById('accountLoginForm').style.display = isLogin ? 'grid' : 'none';
      document.getElementById('accountRegisterForm').style.display = isLogin ? 'none' : 'grid';
    });
  });
  const requestedMode = getParam('mode') === 'register' ? 'register' : 'login';
  app.querySelector(`[data-auth-tab="${requestedMode}"]`)?.click();
  document.getElementById('accountLoginForm').addEventListener('submit', signIn);
  document.getElementById('accountRegisterForm').addEventListener('submit', signUp);
}

async function signIn(event){
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = event.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = '⏳ جاري الدخول...';
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = '🔐 دخول';
  if (error) {
    notify('❌ البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
    return;
  }
  notify('✅ تم تسجيل الدخول بنجاح');
  state.accountReady = false;
  await initAccountPage(true);
}

async function signUp(event){
  event.preventDefault();
  const fullName = document.getElementById('registerName').value.trim();
  const phone = document.getElementById('registerPhone').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const btn = event.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = '⏳ جاري إنشاء الحساب...';

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone } }
  });

  btn.disabled = false; btn.textContent = '✨ إنشاء الحساب';
  if (error) {
    notify('❌ تعذر إنشاء الحساب: ' + (error.message || 'حاول مرة أخرى'), 'error');
    return;
  }

  if (!data.session) {
    renderAuth('✅ تم إنشاء الحساب. إذا كان تأكيد البريد مفعلاً، افحص بريدك ثم سجل الدخول.');
    return;
  }

  state.user = data.user;
  state.profile = await ensureProfile(data.user, { full_name: fullName, phone });
  notify('✅ تم إنشاء حسابك بنجاح');
  state.accountReady = false;
  await initAccountPage(true);
}

async function loadAccountData(){
  if (!state.user) return;
  const userId = state.user.id;
  const [addresses, orders, services, receipts, reviews] = await Promise.all([
    supabaseClient.from('addresses').select('*').eq('user_id', userId).order('is_default', {ascending:false}).order('created_at', {ascending:false}),
    supabaseClient.from('store_orders').select('*').eq('user_id', userId).order('created_at', {ascending:false}),
    supabaseClient.from('service_requests').select('*').eq('user_id', userId).order('created_at', {ascending:false}),
    supabaseClient.from('payment_receipts').select('*').eq('user_id', userId).order('created_at', {ascending:false}),
    supabaseClient.from('reviews').select('*').eq('user_id', userId).order('id', {ascending:false})
  ]);
  state.addresses = addresses.data || [];
  state.orders = orders.data || [];
  state.services = services.data || [];
  state.receipts = receipts.data || [];
  state.reviews = reviews.data || [];
}

function renderDashboard(){
  const app = accountApp();
  if (!app || !state.user) return;
  const name = state.profile?.full_name || state.user.user_metadata?.full_name || 'عميلنا الكريم';
  app.innerHTML = `
    <div class="account-dashboard">
      <div class="account-card account-user-card">
        <div class="account-avatar">${esc(name.trim().charAt(0) || 'د')}</div>
        <div>
          <h2>${esc(name)}</h2>
          <p>${esc(state.user.email || '')}</p>
        </div>
        <button class="account-logout" type="button" onclick="doraSignOut()">🚪 تسجيل الخروج</button>
      </div>

      <div class="account-tabs">
        ${accountTabButton('overview','🏠 نظرة عامة')}
        ${accountTabButton('profile','👤 بياناتي')}
        ${accountTabButton('addresses','📍 عناويني')}
        ${accountTabButton('orders','📦 طلباتي')}
        ${accountTabButton('services','🔧 طلبات الخدمات')}
        ${accountTabButton('reviews','⭐ تقييماتي')}
      </div>

      <div class="account-content">${renderCurrentTab()}</div>
    </div>
  `;
}

function accountTabButton(tab, label){
  return `<button type="button" class="${state.currentTab === tab ? 'active' : ''}" onclick="doraSwitchAccountTab('${tab}')">${label}</button>`;
}

window.doraSwitchAccountTab = function(tab){
  state.currentTab = tab;
  renderDashboard();
};

window.doraSignOut = async function(){
  await supabaseClient.auth.signOut();
  state.user = null; state.profile = null; state.accountReady = false;
  notify('تم تسجيل الخروج');
  renderAuth();
  updateAccountButtonLabel();
};

function renderCurrentTab(){
  switch(state.currentTab){
    case 'profile': return renderProfileTab();
    case 'addresses': return renderAddressesTab();
    case 'orders': return renderOrdersTab();
    case 'services': return renderServicesTab();
    case 'reviews': return renderReviewsTab();
    default: return renderOverviewTab();
  }
}

function renderOverviewTab(){
  return `
    <div class="account-stats-grid">
      ${accountStat('📦', state.orders.length, 'طلبات المنتجات')}
      ${accountStat('🔧', state.services.length, 'طلبات الخدمات')}
      ${accountStat('📍', state.addresses.length, 'العناوين المحفوظة')}
      ${accountStat('⭐', state.reviews.length, 'تقييماتي')}
    </div>
    <div class="account-card">
      <h3>أهلاً بك في حسابك</h3>
      <p>من هنا يمكنك إدارة بياناتك وعناوينك، متابعة حالة الطلبات والخدمات، رفع إيصالات الدفع، والاطلاع على تقييماتك.</p>
      <div class="account-quick-actions">
        <button class="btn-primary" onclick="doraSwitchAccountTab('orders')">📦 متابعة الطلبات</button>
        <button class="btn-primary" onclick="doraSwitchAccountTab('addresses')">📍 إضافة عنوان</button>
        <button class="btn-primary" onclick="doraSwitchAccountTab('services')">🔧 طلب خدمة</button>
      </div>
    </div>
  `;
}
function accountStat(icon, num, label){
  return `<div class="account-stat"><span>${icon}</span><strong>${num}</strong><small>${label}</small></div>`;
}

function renderProfileTab(){
  return `
    <div class="account-card">
      <h3>👤 بياناتي</h3>
      <form class="account-form" onsubmit="doraSaveProfile(event)">
        <label>الاسم الكامل</label>
        <input id="profileName" type="text" value="${esc(state.profile?.full_name || '')}" required>
        <label>رقم الجوال</label>
        <input id="profilePhone" type="tel" value="${esc(state.profile?.phone || '')}" required>
        <label>البريد الإلكتروني</label>
        <input type="email" value="${esc(state.user.email || '')}" disabled>
        <button class="btn-primary account-submit" type="submit">💾 حفظ البيانات</button>
      </form>
    </div>
  `;
}

window.doraSaveProfile = async function(event){
  event.preventDefault();
  const fullName = document.getElementById('profileName').value.trim();
  const phone = document.getElementById('profilePhone').value.trim();
  const { data, error } = await supabaseClient
    .from('profiles')
    .upsert([{ id: state.user.id, full_name: fullName, phone }], { onConflict: 'id' })
    .select('*')
    .single();
  if (error) return notify('❌ تعذر حفظ البيانات: ' + error.message, 'error');
  state.profile = data;
  notify('✅ تم حفظ البيانات بنجاح');
};

function renderAddressesTab(){
  const list = state.addresses.length ? state.addresses.map(address => `
    <div class="account-list-item">
      <div>
        <strong>${esc(address.label)} ${address.is_default ? '<span class="account-badge">افتراضي</span>' : ''}</strong>
        <p>${esc(address.city)}${address.district ? ' — ' + esc(address.district) : ''}${address.street ? '، ' + esc(address.street) : ''}${address.building ? '، مبنى ' + esc(address.building) : ''}</p>
        ${address.notes ? `<small>${esc(address.notes)}</small>` : ''}
      </div>
      <div class="account-item-actions">
        ${!address.is_default ? `<button onclick="doraSetDefaultAddress('${address.id}')">⭐ افتراضي</button>` : ''}
        <button class="danger" onclick="doraDeleteAddress('${address.id}')">🗑️ حذف</button>
      </div>
    </div>
  `).join('') : '<div class="account-empty">📍 لم تحفظ أي عنوان بعد.</div>';

  return `
    <div class="account-two-col">
      <div class="account-card">
        <h3>📍 إضافة عنوان جديد</h3>
        <form class="account-form" onsubmit="doraAddAddress(event)">
          <label>اسم العنوان</label>
          <input id="addressLabel" value="المنزل" required>
          <label>المدينة</label>
          <input id="addressCity" placeholder="تبوك" required>
          <label>الحي</label>
          <input id="addressDistrict" placeholder="الحي">
          <label>الشارع</label>
          <input id="addressStreet" placeholder="اسم الشارع">
          <label>رقم المبنى / الشقة</label>
          <input id="addressBuilding" placeholder="اختياري">
          <label>ملاحظات</label>
          <textarea id="addressNotes" placeholder="مثال: بجوار..."></textarea>
          <label class="account-check"><input id="addressDefault" type="checkbox"> تعيين كعنوان افتراضي</label>
          <button class="btn-primary account-submit" type="submit">💾 حفظ العنوان</button>
        </form>
      </div>
      <div class="account-card"><h3>العناوين المحفوظة</h3><div class="account-list">${list}</div></div>
    </div>
  `;
}

window.doraAddAddress = async function(event){
  event.preventDefault();
  const payload = {
    user_id: state.user.id,
    label: document.getElementById('addressLabel').value.trim(),
    city: document.getElementById('addressCity').value.trim(),
    district: document.getElementById('addressDistrict').value.trim(),
    street: document.getElementById('addressStreet').value.trim(),
    building: document.getElementById('addressBuilding').value.trim(),
    notes: document.getElementById('addressNotes').value.trim(),
    is_default: document.getElementById('addressDefault').checked || state.addresses.length === 0
  };
  const { error } = await supabaseClient.from('addresses').insert([payload]);
  if (error) return notify('❌ تعذر حفظ العنوان: ' + error.message, 'error');
  notify('✅ تم حفظ العنوان');
  await loadAccountData(); renderDashboard();
};
window.doraDeleteAddress = async function(id){
  if (!confirm('هل تريد حذف هذا العنوان؟')) return;
  const { error } = await supabaseClient.from('addresses').delete().eq('id', id);
  if (error) return notify('❌ تعذر حذف العنوان', 'error');
  await loadAccountData(); renderDashboard();
};
window.doraSetDefaultAddress = async function(id){
  const { error } = await supabaseClient.from('addresses').update({ is_default: true }).eq('id', id);
  if (error) return notify('❌ تعذر تعيين العنوان الافتراضي', 'error');
  await loadAccountData(); renderDashboard();
};

function renderOrdersTab(){
  const list = state.orders.length ? state.orders.map(order => {
    const items = Array.isArray(order.items) ? order.items : [];
    return `
      <div class="account-order-card">
        <div class="account-order-head">
          <div><strong>طلب ${esc(order.order_number || order.id.slice(0,8))}</strong><small>${dateAr(order.created_at)}</small></div>
          <div class="account-status">${esc(orderStatusLabels[order.status] || order.status)}</div>
        </div>
        <div class="account-order-items">
          ${items.map(item => `<span>📦 ${esc(item.name)} × ${Number(item.qty || 1)}</span>`).join('')}
        </div>
        <div class="account-order-footer">
          <strong>${money(order.total)}</strong>
          <span>${esc(paymentStatusLabels[order.payment_status] || order.payment_status)}</span>
        </div>
        <div class="account-receipt-box">
          ${order.receipt_path ? `<span class="account-badge success">✅ تم رفع إيصال الدفع</span><button type="button" class="account-upload-btn" onclick="doraViewReceipt('${esc(order.receipt_path)}')">👁️ عرض الإيصال</button>` : `<span>لم يتم رفع إيصال الدفع بعد</span>`}
          <label class="account-upload-btn">🧾 رفع إيصال
            <input type="file" accept="image/*" onchange="doraUploadReceipt('${order.id}', this)">
          </label>
        </div>
      </div>
    `;
  }).join('') : '<div class="account-empty">📦 لا توجد طلبات في حسابك بعد.</div>';
  return `<div class="account-card"><h3>📦 طلباتي</h3><div class="account-list orders">${list}</div></div>`;
}

window.doraUploadReceipt = async function(orderId, input){
  const file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return notify('❌ الرجاء اختيار صورة فقط', 'error');
  if (file.size > 5 * 1024 * 1024) return notify('❌ حجم الصورة يجب ألا يتجاوز 5MB', 'error');
  notify('⏳ جاري رفع الإيصال...', 'warning');

  const safeName = file.name.replace(/[^\w.\-]+/g, '-');
  const path = `${state.user.id}/${orderId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabaseClient.storage
    .from('payment-receipts')
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (uploadError) return notify('❌ تعذر رفع الصورة: ' + uploadError.message, 'error');

  const { error: receiptError } = await supabaseClient.from('payment_receipts').insert([{
    user_id: state.user.id,
    order_id: orderId,
    file_path: path,
    status: 'pending'
  }]);
  if (receiptError) return notify('❌ تم رفع الصورة لكن تعذر تسجيلها: ' + receiptError.message, 'error');

  const { error: attachError } = await supabaseClient.rpc('attach_payment_receipt', {
    p_order_id: orderId,
    p_file_path: path
  });
  if (attachError) return notify('❌ تم تسجيل الإيصال لكن تعذر ربطه بالطلب: ' + attachError.message, 'error');
  notify('✅ تم رفع إيصال الدفع وسيتم مراجعته');
  await loadAccountData(); renderDashboard();
};

window.doraViewReceipt = async function(path){
  const { data, error } = await supabaseClient.storage
    .from('payment-receipts')
    .createSignedUrl(path, 3600);
  if (error) return notify('❌ تعذر فتح الإيصال: ' + error.message, 'error');
  window.open(data.signedUrl, '_blank');
};

function renderServicesTab(){
  const list = state.services.length ? state.services.map(service => `
    <div class="account-list-item">
      <div>
        <strong>${esc(service.service_type)}</strong>
        <p>${esc(service.description)}</p>
        <small>${service.city ? esc(service.city) + ' — ' : ''}${dateAr(service.created_at)}</small>
      </div>
      <span class="account-status">${esc(serviceStatusLabels[service.status] || service.status)}</span>
    </div>
  `).join('') : '<div class="account-empty">🔧 لا توجد طلبات خدمات بعد.</div>';

  return `
    <div class="account-two-col">
      <div class="account-card">
        <h3>🔧 طلب خدمة جديدة</h3>
        <form class="account-form" onsubmit="doraSubmitAccountService(event)">
          <label>نوع الخدمة</label>
          <select id="accountServiceType" required>
            <option value="خدمات الطباعة">خدمات الطباعة</option>
            <option value="كاميرات المراقبة">كاميرات المراقبة</option>
            <option value="نقاط البيع">نقاط البيع</option>
            <option value="الشبكات">الشبكات</option>
            <option value="الباركود">الباركود</option>
            <option value="الصيانة">الصيانة</option>
          </select>
          <label>المدينة</label>
          <input id="accountServiceCity" placeholder="تبوك">
          <label>العنوان</label>
          <input id="accountServiceAddress" placeholder="الحي والشارع">
          <label>تفاصيل الخدمة</label>
          <textarea id="accountServiceDescription" required placeholder="اشرح المشكلة أو الخدمة المطلوبة"></textarea>
          <button class="btn-primary account-submit" type="submit">📨 إرسال الطلب</button>
        </form>
      </div>
      <div class="account-card"><h3>طلبات الخدمات</h3><div class="account-list">${list}</div></div>
    </div>
  `;
}

window.doraSubmitAccountService = async function(event){
  event.preventDefault();
  const payload = {
    user_id: state.user.id,
    service_type: document.getElementById('accountServiceType').value,
    customer_name: state.profile?.full_name || state.user.user_metadata?.full_name || 'عميل',
    customer_phone: state.profile?.phone || state.user.user_metadata?.phone || '',
    customer_email: state.user.email || '',
    city: document.getElementById('accountServiceCity').value.trim(),
    address: document.getElementById('accountServiceAddress').value.trim(),
    description: document.getElementById('accountServiceDescription').value.trim()
  };
  const { error } = await supabaseClient.from('service_requests').insert([payload]);
  if (error) return notify('❌ تعذر إرسال طلب الخدمة: ' + error.message, 'error');
  notify('✅ تم إرسال طلب الخدمة بنجاح');
  await loadAccountData(); renderDashboard();
};

function renderReviewsTab(){
  const list = state.reviews.length ? state.reviews.map(review => `
    <div class="account-list-item">
      <div>
        <strong>${esc(review.product || 'الموقع عامةً')}</strong>
        <div class="account-stars">${'★'.repeat(Number(review.rating || 5))}${'☆'.repeat(5 - Number(review.rating || 5))}</div>
        <p>${esc(review.text || '')}</p>
        ${review.verified_purchase ? '<span class="account-badge success">مشتري موثق</span>' : ''}
      </div>
      <span class="account-status">${esc(reviewStatusLabels[review.status] || review.status || 'منشور')}</span>
    </div>
  `).join('') : '<div class="account-empty">⭐ لم تقم بإضافة تقييمات بعد.</div>';
  return `<div class="account-card"><h3>⭐ تقييماتي</h3><div class="account-list">${list}</div></div>`;
}

/* ============================================================
   checkout — حفظ الطلب في Supabase ثم فتح واتساب
   ============================================================ */
window.checkout = async function(){
  if (!Array.isArray(cart) || cart.length === 0) {
    notify('السلة فارغة! أضف منتجات أولاً', 'warning');
    return;
  }

  const user = await requireLogin('orders', 'checkout');
  if (!user) return;
  const profile = await ensureProfile(user);
  const address = await getDefaultAddress(user.id);

  if (!profile?.full_name || !profile?.phone) {
    notify('📌 أكمل اسمك ورقم جوالك في حسابك أولاً', 'warning');
    redirectToAccount('profile', 'checkout');
    return;
  }
  if (!address) {
    notify('📍 احفظ عنوان التوصيل في حسابك أولاً', 'warning');
    redirectToAccount('addresses', 'checkout');
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 1)), 0);
  const discount = activeCoupon ? Math.round(subtotal * activeCoupon.discount) : 0;
  const afterDiscount = subtotal - discount;
  const tax = calculateTax(afterDiscount);
  const total = afterDiscount + tax;
  const orderNumber = `DF-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const items = cart.map(item => ({
    product_id: item.id,
    name: item.name,
    price: Number(item.price || 0),
    qty: Number(item.qty || 1),
    image: item.image || ''
  }));

  const payload = {
    order_number: orderNumber,
    user_id: user.id,
    customer_name: profile.full_name,
    customer_phone: profile.phone,
    customer_email: user.email || '',
    address,
    items,
    subtotal,
    discount,
    tax,
    total,
    status: 'new',
    payment_method: 'bank_transfer',
    payment_gateway: 'manual_receipt',
    payment_status: 'pending'
  };

  let savedOrder = null;
  const { data, error } = await supabaseClient.from('store_orders').insert([payload]).select('*').single();
  if (error) {
    console.error('order save:', error);
    notify('⚠️ سيتم فتح واتساب، لكن تعذر حفظ الطلب في الحساب. تأكد من تشغيل ملف SQL.', 'warning');
  } else {
    savedOrder = data;
  }

  let msg = `*طلب جديد من شركة درة فارس الشمال*\n\n`;
  msg += `*رقم الطلب:* ${savedOrder?.order_number || orderNumber}\n`;
  msg += `*العميل:* ${profile.full_name}\n*الجوال:* ${profile.phone}\n\n*المنتجات:*\n`;
  items.forEach((item, i) => {
    msg += `${i+1}. ${item.name}\n  الكمية: ${item.qty}\n  السعر: ${item.price.toLocaleString()} ر.س\n  المجموع: ${(item.price*item.qty).toLocaleString()} ر.س\n\n`;
  });
  msg += `*المجموع الفرعي: ${subtotal.toLocaleString()} ر.س*\n`;
  if (discount > 0) msg += `*الخصم: ${discount.toLocaleString()} ر.س*\n`;
  msg += `*الضريبة (15%): ${tax.toLocaleString()} ر.س*\n`;
  msg += `*المجموع الكلي: ${total.toLocaleString()} ر.س*\n\n`;
  msg += `*العنوان:* ${address.city}${address.district ? ' — ' + address.district : ''}${address.street ? '، ' + address.street : ''}\n`;
  msg += 'يرجى تأكيد الطلب.';

  if (savedOrder) {
    cart = [];
    localStorage.setItem('doraCart', JSON.stringify(cart));
    updateCartUI();
    renderProducts(currentFilter);
    notify(`✅ تم حفظ الطلب ${savedOrder.order_number} في حسابك`);
  }

  const choice = confirm('اضغط "موافق" للتواصل عبر الرقم الأول (+966 56 871 7449)\n\nاضغط "إلغاء" للتواصل عبر الرقم الثاني (+966 54 535 8773)');
  const phone = choice ? '966568717449' : '966545358773';
  window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
};

/* ============================================================
   نموذج التواصل — حفظ الرسائل في Supabase
   ============================================================ */
window.handleSubmit = async function(e){
  e.preventDefault();
  const name = document.getElementById('contactName').value.trim();
  const phone = document.getElementById('contactPhone').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const subject = document.getElementById('contactSubject').value;
  const message = document.getElementById('contactMessage').value.trim();

  let hasError = false;
  const fields = [
    ['contactName', name.length >= 3],
    ['contactPhone', phone.length >= 9],
    ['contactEmail', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)],
    ['contactSubject', !!subject],
    ['contactMessage', message.length >= 10]
  ];
  fields.forEach(([id, valid]) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('error', !valid);
    if (!valid) hasError = true;
  });
  if (hasError) return notify('❌ الرجاء تصحيح الأخطاء في النموذج', 'error');

  const user = await getCurrentUser();
  const { error } = await supabaseClient.from('contact_messages').insert([{
    user_id: user ? user.id : null,
    name, email, phone, subject, message, status: 'new'
  }]);
  if (error) return notify('❌ تعذر حفظ الرسالة: ' + error.message, 'error');

  notify('✅ تم إرسال رسالتك وحفظها لدى الإدارة بنجاح');
  e.target.reset();
  document.querySelectorAll('.contact-form input, .contact-form select, .contact-form textarea').forEach(el => el.classList.remove('error'));
};

/* ============================================================
   نموذج طلب خدمة داخل صفحات الخدمات
   ============================================================ */
function injectServiceRequestForm(){
  if (!/service_.*\.html/.test(location.pathname) || document.querySelector('.service-request-section')) return;
  const serviceTitle = document.querySelector('.service-hero h1, .services-hero h1, .page-hero h1')?.textContent.trim() || document.title.replace(/\s*\|.*$/, '');
  const section = document.createElement('section');
  section.className = 'service-request-section';
  section.innerHTML = `
    <div class="service-request-box">
      <div class="service-request-intro">
        <span>🔧</span>
        <h2>اطلب الخدمة من حسابك</h2>
        <p>سيتم حفظ الطلب في حسابك وتظهر حالته في لوحة الإدارة.</p>
      </div>
      <form class="account-form service-request-form" onsubmit="doraSubmitServicePageRequest(event)">
        <input type="hidden" id="servicePageType" value="${esc(serviceTitle)}">
        <input id="servicePageName" type="text" placeholder="الاسم الكامل" required>
        <input id="servicePagePhone" type="tel" placeholder="رقم الجوال" required>
        <input id="servicePageCity" type="text" placeholder="المدينة">
        <textarea id="servicePageDescription" placeholder="اشرح الخدمة المطلوبة" required></textarea>
        <button class="btn-primary" type="submit">📨 إرسال طلب الخدمة</button>
      </form>
    </div>
  `;
  const footer = document.querySelector('footer.footer, footer');
  if (footer && footer.parentNode) footer.parentNode.insertBefore(section, footer);
  else document.body.appendChild(section);
}

window.doraSubmitServicePageRequest = async function(event){
  event.preventDefault();
  const user = await requireLogin('services', 'service');
  if (!user) return;
  const payload = {
    user_id: user.id,
    service_type: document.getElementById('servicePageType').value,
    customer_name: document.getElementById('servicePageName').value.trim(),
    customer_phone: document.getElementById('servicePagePhone').value.trim(),
    customer_email: user.email || '',
    city: document.getElementById('servicePageCity').value.trim(),
    address: '',
    description: document.getElementById('servicePageDescription').value.trim()
  };
  const { error } = await supabaseClient.from('service_requests').insert([payload]);
  if (error) return notify('❌ تعذر إرسال طلب الخدمة: ' + error.message, 'error');
  notify('✅ تم حفظ طلب الخدمة في حسابك');
  event.target.reset();
};

/* ============================================================
   التقييم الموثق — للمشترين بعد التسليم فقط
   ============================================================ */
async function findEligibleOrder(productId){
  const user = await getCurrentUser();
  if (!user) return { user: null, order: null };
  const { data, error } = await supabaseClient
    .from('store_orders')
    .select('id,items,status')
    .eq('user_id', user.id)
    .in('status', ['delivered','completed']);
  if (error || !data) return { user, order: null };
  const order = data.find(o => {
    const items = Array.isArray(o.items) ? o.items : [];
    return items.some(item => Number(item.product_id || item.id) === Number(productId));
  });
  return { user, order: order || null };
}

window.openSiteRatingModal = async function(){
  const user = await requireLogin('reviews', 'review');
  if (!user) return;
  const profile = await ensureProfile(user);
  const nameInput = document.getElementById('siteRaterName');
  if (nameInput) nameInput.value = profile?.full_name || user.user_metadata?.full_name || '';
  document.getElementById('siteRatingModal').classList.add('show');
  document.body.style.overflow = 'hidden';
  setRating(5);
};

window.submitSiteRating = async function(event){
  event.preventDefault();
  const user = await requireLogin('reviews', 'review');
  if (!user) return;
  const name = document.getElementById('siteRaterName').value.trim();
  const product = document.getElementById('siteRaterProduct').value.trim();
  const comment = document.getElementById('siteRaterComment').value.trim();
  const rating = parseInt(document.getElementById('siteRatingValue').value);
  if (!name || !comment) return notify('❌ الرجاء ملء جميع الحقول المطلوبة', 'error');

  const { error } = await supabaseClient.from('reviews').insert([{
    user_id: user.id,
    name,
    product: product || 'الموقع عامةً',
    text: comment,
    rating,
    date: new Date().toLocaleDateString('ar-SA'),
    status: 'pending',
    verified_purchase: false
  }]);
  if (error) return notify('❌ تعذر حفظ التقييم: ' + error.message, 'error');

  closeSiteRatingModal();
  event.target.reset();
  setRating(5);
  notify('✅ شكراً لتقييمك! سيظهر بعد مراجعة الإدارة');
  renderReviews();
};

window.openProductRatingModal = async function(productId, productName){
  const { user, order } = await findEligibleOrder(productId);
  if (!user) {
    notify('🔐 سجّل الدخول أولاً حتى تتمكن من التقييم', 'warning');
    redirectToAccount('reviews', 'review');
    return;
  }
  if (!order) {
    notify('⭐ التقييم متاح فقط بعد شراء المنتج واكتمال تسليم الطلب', 'warning');
    return;
  }
  const profile = await ensureProfile(user);
  currentProductIdForRating = productId;
  document.getElementById('productRatingTitle').textContent = 'قيّم: ' + productName;
  document.getElementById('productRatingId').value = productId;
  document.getElementById('productRaterName').value = profile?.full_name || user.user_metadata?.full_name || '';
  document.getElementById('productRatingModal').classList.add('show');
  document.body.style.overflow = 'hidden';
  setProductRating(5);
};

window.submitProductRating = async function(event){
  event.preventDefault();
  const productId = parseInt(document.getElementById('productRatingId').value);
  const comment = document.getElementById('productRaterComment').value.trim();
  const rating = parseInt(document.getElementById('productRatingValue').value);
  const { user, order } = await findEligibleOrder(productId);
  if (!user || !order) return notify('⭐ التقييم متاح فقط بعد شراء المنتج واكتمال تسليم الطلب', 'error');
  if (!comment) return notify('❌ الرجاء كتابة التقييم', 'error');

  const profile = await ensureProfile(user);
  const product = productsData.find(p => Number(p.id) === Number(productId));
  const productName = product ? product.name : 'منتج';
  const { error } = await supabaseClient.from('reviews').insert([{
    user_id: user.id,
    order_id: order.id,
    product_id: productId,
    name: profile?.full_name || user.user_metadata?.full_name || 'عميل',
    product: productName,
    text: comment,
    rating,
    date: new Date().toLocaleDateString('ar-SA'),
    status: 'pending',
    verified_purchase: true
  }]);
  if (error) return notify('❌ تعذر حفظ التقييم: ' + error.message, 'error');

  closeProductRatingModal();
  document.getElementById('productRaterComment').value = '';
  setProductRating(5);
  notify('✅ تم إرسال تقييمك وسيظهر بعد مراجعة الإدارة');
  renderReviews();
};

window.renderReviews = async function(){
  const reviewsGrid = document.getElementById('reviewsGrid');
  if (!reviewsGrid) return;
  const { data, error } = await supabaseClient
    .from('reviews')
    .select('*')
    .or('status.eq.published,status.eq.approved,status.is.null')
    .order('id', { ascending: false });
  if (error) return;
  const reviews = (data || []).map(r => ({
    name: r.name || 'عميل',
    product: r.product || 'الموقع عامةً',
    comment: r.text || '',
    rating: Number(r.rating || 5),
    date: r.date || dateAr(r.created_at),
    verified: !!r.verified_purchase
  }));
  reviewsGrid.innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-card-header">
        <span class="review-card-author">${esc(r.name)}</span>
        <span class="review-card-date">${esc(r.date)}</span>
      </div>
      <div class="review-card-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
      <p class="review-card-text">${esc(r.comment)}</p>
      <div class="review-card-product">📦 ${esc(r.product)} ${r.verified ? '<span class="account-badge success">مشتري موثق</span>' : ''}</div>
    </div>
  `).join('');
};

/* ============================================================
   مزامنة تقييمات المنتجات المنشورة داخل كروت المنتجات
   ============================================================ */
async function syncVerifiedProductReviews(){
  if (!Array.isArray(productsData) || !productsData.length) return;
  const { data, error } = await supabaseClient
    .from('reviews')
    .select('*')
    .eq('verified_purchase', true)
    .in('status', ['published','approved']);
  if (error || !data) return;

  let changed = false;
  data.forEach(review => {
    const productId = Number(review.product_id);
    if (!productId) return;
    const product = productsData.find(p => Number(p.id) === productId);
    if (!product) return;
    if (!Array.isArray(product.reviews)) product.reviews = [];
    const exists = product.reviews.some(r => r.reviewId === review.id || (r.orderId && r.orderId === review.order_id));
    if (exists) return;
    product.reviews.push({
      reviewId: review.id,
      orderId: review.order_id,
      author: review.name || 'عميل موثق',
      date: review.date || dateAr(review.created_at),
      stars: Number(review.rating || 5),
      text: review.text || '',
      verified: true
    });
    const totalStars = product.reviews.reduce((sum, r) => sum + Number(r.stars || 5), 0);
    product.rating = Math.round((totalStars / product.reviews.length) * 10) / 10;
    changed = true;
  });

  if (changed) {
    localStorage.setItem('doraProducts', JSON.stringify(productsData));
    if (typeof renderProducts === 'function') renderProducts(currentFilter);
  }
}

/* ============================================================
   تشغيل النظام
   ============================================================ */
function boot(){
  injectHeroAccountButtons();
  injectServiceRequestForm();
  syncVerifiedProductReviews();
  if (accountApp()) initAccountPage();
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user || null;
    updateAccountButtonLabel();
    if (accountApp()) {
      state.accountReady = false;
      initAccountPage(true);
    }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
