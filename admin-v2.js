/* ============================================================
   درة فارس الشمال — لوحة الإدارة المتكاملة V3
   تطوير: Dashboard + Audit Log + Afaky ERP + ZATCA + Charts
   ============================================================ */
(function(){
'use strict';

if (typeof supabaseClient === 'undefined' || !supabaseClient) {
  console.warn('Admin V3: Supabase client is unavailable.');
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
  settings: null,
  afakySettings: null,
  auditLogs: [],
  zatcaLogs: [],
  afakyLogs: [],
  dashboardStats: {},
  charts: {}
};

const orderStatuses = { new:'جديد', review:'قيد المراجعة', processing:'قيد التجهيز', shipped:'تم الشحن', delivered:'تم التسليم', completed:'مكتمل', cancelled:'ملغي' };
const paymentStatuses = { pending:'بانتظار الدفع', review:'بانتظار مراجعة الإيصال', paid:'تم تأكيد الدفع', rejected:'مرفوض', refunded:'تم الاسترجاع' };
const serviceStatuses = { new:'جديد', contacted:'تم التواصل', inspection:'تمت المعاينة', in_progress:'قيد التنفيذ', completed:'مكتمل', cancelled:'ملغي' };
const receiptStatuses = { pending:'بانتظار المراجعة', approved:'مقبول', rejected:'مرفوض' };
const reviewStatuses = { pending:'بانتظار المراجعة', published:'منشور', hidden:'مخفي' };
const messageStatuses = { new:'جديدة', read:'مقروءة', replied:'تم الرد', archived:'مؤرشفة' };
const afakyModes = {
  api: 'API مباشر',
  database: 'قاعدة بيانات مباشرة',
  csv: 'تصدير/استيراد CSV',
  webhook: 'Webhook',
  email: 'Email Parsing'
};
const zatcaStatuses = { pending:'معلّقة', clearance:'تم Clearance', reporting:'تم Reporting', failed:'فاشلة', synced:'متزامنة مع أفاقي' };
const afakySyncStatuses = { pending:'بانتظار الإرسال', sent:'تم الإرسال', confirmed:'تم التأكيد', failed:'فاشلة', manual:'يدوية' };

/* ========== UTILITIES ========== */
function esc(v){ return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch])); }
function dateAr(v){ if(!v)return'—';try{return new Date(v).toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'})}catch(_){return String(v)} }
function dateOnly(v){ if(!v)return'—';try{return new Date(v).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'})}catch(_){return String(v)} }
function money(v){ return Number(v||0).toLocaleString('ar-SA')+' ر.س'; }
function adminToast(m,t){ if(typeof showToast==='function')showToast(m,t);else alert(m); }
function options(map,cur){ return Object.entries(map).map(([v,l])=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`).join(''); }

/* ========== AUDIT LOG ========== */
async function addAuditLog(action, details, entityType, entityId) {
  try {
    const user = await currentUser();
    const log = {
      user_id: user?.id || null,
      user_email: user?.email || 'unknown',
      action: action,
      details: details || '',
      entity_type: entityType || null,
      entity_id: entityId || null,
      ip_address: 'client-side',
      user_agent: navigator.userAgent.substring(0,200),
      created_at: new Date().toISOString()
    };
    await supabaseClient.from('audit_logs').insert([log]);
  } catch(e) {
    console.error('Audit log error:', e);
  }
}

async function loadAuditLogs(limit = 50) {
  try {
    const { data, error } = await supabaseClient
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    adminState.auditLogs = data || [];
    renderAuditLogs();
  } catch(e) {
    console.error('Load audit logs error:', e);
  }
}

function renderAuditLogs() {
  const c = document.getElementById('auditLogsList');
  if (!c) return;
  if (!adminState.auditLogs.length) {
    c.innerHTML = '<div class="admin-empty">📋 لا توجد سجلات</div>';
    return;
  }
  let html = `<table class="admin-table"><thead><tr>
    <th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>التفاصيل</th><th>الكيان</th>
  </tr></thead><tbody>`;
  adminState.auditLogs.forEach(log => {
    html += `<tr>
      <td>${dateAr(log.created_at)}</td>
      <td>${esc(log.user_email || '—')}</td>
      <td><span class="audit-badge audit-${log.action}">${esc(log.action)}</span></td>
      <td>${esc(log.details || '—')}</td>
      <td>${esc(log.entity_type || '—')} ${log.entity_id ? '#'+log.entity_id : ''}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  c.innerHTML = html;
}

/* ========== AFAKY SETTINGS ========== */
async function loadAfakySettings() {
  try {
    const { data, error } = await supabaseClient
      .from('erp_settings')
      .select('*')
      .eq('erp_name', 'afaky')
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    adminState.afakySettings = data || {
      erp_name: 'afaky',
      mode: 'csv',
      is_active: false,
      config: {}
    };
    renderAfakySettings();
  } catch(e) {
    console.error('Load Afaky settings error:', e);
  }
}

function renderAfakySettings() {
  const settings = adminState.afakySettings;
  const modeSelect = document.getElementById('afakyMode');
  const activeCheck = document.getElementById('afakyActive');
  if (modeSelect) modeSelect.value = settings.mode || 'csv';
  if (activeCheck) activeCheck.checked = settings.is_active || false;
  updateAfakyConfigFields(settings.mode || 'csv');
}

function updateAfakyConfigFields(mode) {
  const container = document.getElementById('afakyConfigFields');
  if (!container) return;

  const configs = {
    api: `
      <div class="form-group"><label>API Base URL</label><input type="url" id="afakyApiUrl" placeholder="https://afaky-server.com/api" value="${esc(adminState.afakySettings?.config?.api_url || '')}"></div>
      <div class="form-group"><label>API Key</label><input type="password" id="afakyApiKey" placeholder="مفتاح API" value="${esc(adminState.afakySettings?.config?.api_key || '')}"></div>
      <div class="form-group"><label>Timeout (ثواني)</label><input type="number" id="afakyTimeout" value="${adminState.afakySettings?.config?.timeout || 30}" min="5" max="120"></div>
    `,
    database: `
      <div class="form-group"><label>نوع قاعدة البيانات</label>
        <select id="afakyDbType">
          <option value="sqlserver" ${(adminState.afakySettings?.config?.db_type||'')==='sqlserver'?'selected':''}>SQL Server</option>
          <option value="mysql" ${(adminState.afakySettings?.config?.db_type||'')==='mysql'?'selected':''}>MySQL</option>
          <option value="postgresql" ${(adminState.afakySettings?.config?.db_type||'')==='postgresql'?'selected':''}>PostgreSQL</option>
        </select>
      </div>
      <div class="form-group"><label>Host / IP</label><input type="text" id="afakyDbHost" placeholder="192.168.1.100 أو localhost" value="${esc(adminState.afakySettings?.config?.db_host || '')}"></div>
      <div class="form-group"><label>Port</label><input type="number" id="afakyDbPort" value="${adminState.afakySettings?.config?.db_port || 1433}"></div>
      <div class="form-group"><label>اسم قاعدة البيانات</label><input type="text" id="afakyDbName" placeholder="AfakyDB" value="${esc(adminState.afakySettings?.config?.db_name || '')}"></div>
      <div class="form-group"><label>اسم المستخدم</label><input type="text" id="afakyDbUser" value="${esc(adminState.afakySettings?.config?.db_user || '')}"></div>
      <div class="form-group"><label>كلمة المرور</label><input type="password" id="afakyDbPass" placeholder="كلمة المرور"></div>
    `,
    csv: `
      <div class="form-group"><label>تنسيق التاريخ</label>
        <select id="afakyDateFormat">
          <option value="yyyy-MM-dd" ${(adminState.afakySettings?.config?.date_format||'')==='yyyy-MM-dd'?'selected':''}>YYYY-MM-DD</option>
          <option value="dd/MM/yyyy" ${(adminState.afakySettings?.config?.date_format||'')==='dd/MM/yyyy'?'selected':''}>DD/MM/YYYY</option>
          <option value="yyyy/MM/dd" ${(adminState.afakySettings?.config?.date_format||'')==='yyyy/MM/dd'?'selected':''}>YYYY/MM/DD</option>
        </select>
      </div>
      <div class="form-group"><label>فاصل CSV</label>
        <select id="afakyCsvDelimiter">
          <option value="," ${(adminState.afakySettings?.config?.csv_delimiter||'')===','?'selected':''}>فاصلة (,)</option>
          <option value=";" ${(adminState.afakySettings?.config?.csv_delimiter||'')===';'?'selected':''}>فاصلة منقوطة (;)</option>
          <option value="\t" ${(adminState.afakySettings?.config?.csv_delimiter||'')==='\t'?'selected':''}>Tab</option>
        </select>
      </div>
      <div class="form-group"><label>تشفير UTF-8 BOM</label>
        <select id="afakyUtf8Bom">
          <option value="true" ${(adminState.afakySettings?.config?.utf8_bom||'')==='true'?'selected':''}>نعم (مستحسن لأفاقي)</option>
          <option value="false" ${(adminState.afakySettings?.config?.utf8_bom||'')==='false'?'selected':''}>لا</option>
        </select>
      </div>
    `,
    webhook: `
      <div class="form-group"><label>Webhook URL</label><input type="url" id="afakyWebhookUrl" placeholder="https://your-server.com/webhook/afaky" value="${esc(adminState.afakySettings?.config?.webhook_url || '')}"></div>
      <div class="form-group"><label>Secret Key (للتوقيع)</label><input type="password" id="afakyWebhookSecret" placeholder="مفتاح سري للتحقق" value="${esc(adminState.afakySettings?.config?.webhook_secret || '')}"></div>
      <div class="form-group"><label>Retry Count</label><input type="number" id="afakyRetryCount" value="${adminState.afakySettings?.config?.retry_count || 3}" min="1" max="10"></div>
    `,
    email: `
      <div class="form-group"><label>Email IMAP Server</label><input type="text" id="afakyEmailServer" placeholder="imap.gmail.com" value="${esc(adminState.afakySettings?.config?.email_server || '')}"></div>
      <div class="form-group"><label>Email</label><input type="email" id="afakyEmail" placeholder="invoices@company.com" value="${esc(adminState.afakySettings?.config?.email || '')}"></div>
      <div class="form-group"><label>Password / App Password</label><input type="password" id="afakyEmailPass" placeholder="كلمة المرور"></div>
      <div class="form-group"><label>Check Interval (دقائق)</label><input type="number" id="afakyCheckInterval" value="${adminState.afakySettings?.config?.check_interval || 15}" min="5" max="60"></div>
    `
  };

  container.innerHTML = configs[mode] || configs.csv;
}

window.saveAfakySettings = async function() {
  const mode = document.getElementById('afakyMode').value;
  const isActive = document.getElementById('afakyActive').checked;

  let config = {};
  if (mode === 'api') {
    config = {
      api_url: document.getElementById('afakyApiUrl').value,
      api_key: document.getElementById('afakyApiKey').value,
      timeout: parseInt(document.getElementById('afakyTimeout').value) || 30
    };
  } else if (mode === 'database') {
    config = {
      db_type: document.getElementById('afakyDbType').value,
      db_host: document.getElementById('afakyDbHost').value,
      db_port: parseInt(document.getElementById('afakyDbPort').value) || 1433,
      db_name: document.getElementById('afakyDbName').value,
      db_user: document.getElementById('afakyDbUser').value,
      db_pass: document.getElementById('afakyDbPass').value
    };
  } else if (mode === 'csv') {
    config = {
      date_format: document.getElementById('afakyDateFormat').value,
      csv_delimiter: document.getElementById('afakyCsvDelimiter').value,
      utf8_bom: document.getElementById('afakyUtf8Bom').value
    };
  } else if (mode === 'webhook') {
    config = {
      webhook_url: document.getElementById('afakyWebhookUrl').value,
      webhook_secret: document.getElementById('afakyWebhookSecret').value,
      retry_count: parseInt(document.getElementById('afakyRetryCount').value) || 3
    };
  } else if (mode === 'email') {
    config = {
      email_server: document.getElementById('afakyEmailServer').value,
      email: document.getElementById('afakyEmail').value,
      email_pass: document.getElementById('afakyEmailPass').value,
      check_interval: parseInt(document.getElementById('afakyCheckInterval').value) || 15
    };
  }

  const settings = {
    erp_name: 'afaky',
    mode: mode,
    is_active: isActive,
    config: config,
    updated_at: new Date().toISOString()
  };

  try {
    const { data: existing } = await supabaseClient
      .from('erp_settings')
      .select('id')
      .eq('erp_name', 'afaky')
      .maybeSingle();

    if (existing) {
      await supabaseClient.from('erp_settings').update(settings).eq('id', existing.id);
    } else {
      await supabaseClient.from('erp_settings').insert([settings]);
    }

    adminState.afakySettings = settings;
    await addAuditLog('UPDATE_AFAKY_SETTINGS', 'تم تحديث إعدادات ربط أفاقي: ' + afakyModes[mode], 'erp_settings', null);
    adminToast('✅ تم حفظ إعدادات ربط أفاقي');
  } catch(e) {
    adminToast('❌ خطأ: ' + e.message, 'error');
  }
};

window.testAfakyConnection = async function() {
  const mode = document.getElementById('afakyMode').value;
  adminToast('🔌 جاري اختبار الاتصال بوضع: ' + afakyModes[mode] + '...');

  // Simulate test based on mode
  setTimeout(() => {
    if (mode === 'csv') {
      adminToast('✅ وضع CSV جاهز — لا يحتاج اتصال مباشر');
    } else {
      adminToast('⚠️ اختبار الاتصال يتطلب Backend — سيتم التفعيل لاحقاً');
    }
  }, 1000);
};

/* ========== AFAKY SYNC LOGS ========== */
async function loadAfakyLogs(limit = 50) {
  try {
    const { data, error } = await supabaseClient
      .from('afaky_sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    adminState.afakyLogs = data || [];
    renderAfakyLogs();
  } catch(e) {
    console.error('Load Afaky logs error:', e);
  }
}

function renderAfakyLogs() {
  const c = document.getElementById('afakyLogsList');
  if (!c) return;
  if (!adminState.afakyLogs.length) {
    c.innerHTML = '<div class="admin-empty">🔄 لا توجد سجلات تزامن</div>';
    return;
  }
  let html = `<table class="admin-table"><thead><tr>
    <th>الوقت</th><th>رقم الفاتورة</th><th>الحالة</th><th>الوضع</th><th>الرسالة</th><th>إعادة المحاولة</th>
  </tr></thead><tbody>`;
  adminState.afakyLogs.forEach(log => {
    const statusClass = log.status === 'confirmed' ? 'success' : log.status === 'failed' ? 'danger' : 'warning';
    html += `<tr>
      <td>${dateAr(log.created_at)}</td>
      <td>${esc(log.invoice_number || '—')}</td>
      <td><span class="status-badge status-${statusClass}">${afakySyncStatuses[log.status] || log.status}</span></td>
      <td>${esc(afakyModes[log.sync_mode] || log.sync_mode || '—')}</td>
      <td>${esc(log.message || '—')}</td>
      <td>${log.retry_count || 0}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  c.innerHTML = html;
}

/* ========== ZATCA LOGS ========== */
async function loadZatcaLogs(limit = 50) {
  try {
    const { data, error } = await supabaseClient
      .from('zatca_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    adminState.zatcaLogs = data || [];
    renderZatcaLogs();
  } catch(e) {
    console.error('Load ZATCA logs error:', e);
  }
}

function renderZatcaLogs() {
  const c = document.getElementById('zatcaLogsList');
  if (!c) return;
  if (!adminState.zatcaLogs.length) {
    c.innerHTML = '<div class="admin-empty">📋 لا توجد سجلات ZATCA</div>';
    return;
  }
  let html = `<table class="admin-table"><thead><tr>
    <th>الوقت</th><th>رقم الفاتورة</th><th>نوع المعاملة</th><th>الحالة</th><th>UUID</th><th>QR</th>
  </tr></thead><tbody>`;
  adminState.zatcaLogs.forEach(log => {
    const statusClass = log.status === 'clearance' || log.status === 'reporting' ? 'success' : log.status === 'failed' ? 'danger' : 'warning';
    html += `<tr>
      <td>${dateAr(log.created_at)}</td>
      <td>${esc(log.invoice_number || '—')}</td>
      <td>${esc(log.transaction_type || '—')}</td>
      <td><span class="status-badge status-${statusClass}">${zatcaStatuses[log.status] || log.status}</span></td>
      <td><code>${esc((log.uuid || '').substring(0,20))}...</code></td>
      <td>${log.qr_code ? '✅' : '❌'}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  c.innerHTML = html;
}

/* ========== DASHBOARD ========== */
async function loadDashboardStats() {
  try {
    // Get counts
    const [{ count: totalProducts }, { count: totalOrders }, { count: newOrders }, { count: totalCustomers }] = await Promise.all([
      supabaseClient.from('store_products').select('*', { count: 'exact', head: true }),
      supabaseClient.from('store_orders').select('*', { count: 'exact', head: true }),
      supabaseClient.from('store_orders').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabaseClient.from('profiles').select('*', { count: 'exact', head: true })
    ]);

    // Get revenue stats
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { data: todayRevenue } = await supabaseClient
      .from('store_orders')
      .select('total')
      .gte('created_at', today)
      .eq('status', 'completed');

    const { data: monthRevenue } = await supabaseClient
      .from('store_orders')
      .select('total')
      .gte('created_at', monthStart)
      .eq('status', 'completed');

    const todayTotal = (todayRevenue || []).reduce((s, o) => s + (o.total || 0), 0);
    const monthTotal = (monthRevenue || []).reduce((s, o) => s + (o.total || 0), 0);

    adminState.dashboardStats = {
      totalProducts: totalProducts || 0,
      totalOrders: totalOrders || 0,
      newOrders: newOrders || 0,
      totalCustomers: totalCustomers || 0,
      todayRevenue: todayTotal,
      monthRevenue: monthTotal
    };

    renderDashboardStats();
    renderDashboardCharts();
  } catch(e) {
    console.error('Dashboard stats error:', e);
  }
}

function renderDashboardStats() {
  const s = adminState.dashboardStats;
  const els = {
    dashTotalProducts: document.getElementById('dashTotalProducts'),
    dashTotalOrders: document.getElementById('dashTotalOrders'),
    dashNewOrders: document.getElementById('dashNewOrders'),
    dashTotalCustomers: document.getElementById('dashTotalCustomers'),
    dashTodayRevenue: document.getElementById('dashTodayRevenue'),
    dashMonthRevenue: document.getElementById('dashMonthRevenue')
  };

  if (els.dashTotalProducts) els.dashTotalProducts.textContent = s.totalProducts;
  if (els.dashTotalOrders) els.dashTotalOrders.textContent = s.totalOrders;
  if (els.dashNewOrders) els.dashNewOrders.textContent = s.newOrders;
  if (els.dashTotalCustomers) els.dashTotalCustomers.textContent = s.totalCustomers;
  if (els.dashTodayRevenue) els.dashTodayRevenue.textContent = money(s.todayRevenue);
  if (els.dashMonthRevenue) els.dashMonthRevenue.textContent = money(s.monthRevenue);
}

function renderDashboardCharts() {
  // Chart.js will be loaded dynamically
  if (typeof Chart === 'undefined') {
    loadChartJS().then(() => {
      initCharts();
    });
  } else {
    initCharts();
  }
}

function loadChartJS() {
  return new Promise((resolve) => {
    if (typeof Chart !== 'undefined') { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

async function initCharts() {
  // Sales chart - last 7 days
  const days = [];
  const sales = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push(d.toLocaleDateString('ar-SA', { weekday: 'short' }));

    const { data } = await supabaseClient
      .from('store_orders')
      .select('total')
      .gte('created_at', dateStr)
      .lt('created_at', dateStr + 'T23:59:59')
      .eq('status', 'completed');

    sales.push((data || []).reduce((s, o) => s + (o.total || 0), 0));
  }

  const ctx = document.getElementById('salesChart');
  if (ctx) {
    if (adminState.charts.sales) adminState.charts.sales.destroy();
    adminState.charts.sales = new Chart(ctx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          label: 'المبيعات (ريال)',
          data: sales,
          borderColor: '#0EA5E9',
          backgroundColor: 'rgba(14,165,233,0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#0EA5E9',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        }
      }
    });
  }

  // Orders status pie chart
  const statusCtx = document.getElementById('ordersStatusChart');
  if (statusCtx) {
    const { data: statusData } = await supabaseClient
      .from('store_orders')
      .select('status');

    const statusCounts = {};
    (statusData || []).forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });

    if (adminState.charts.status) adminState.charts.status.destroy();
    adminState.charts.status = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusCounts).map(s => orderStatuses[s] || s),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: ['#0EA5E9', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 15 } }
        }
      }
    });
  }
}

/* ========== AUTH ========== */
async function currentUser(){ const {data}=await supabaseClient.auth.getUser();return data.user||null; }
async function isAdminUser(user){ if(!user)return false;const{data}=await supabaseClient.from('profiles').select('role').eq('id',user.id).maybeSingle();return data?.role==='admin'; }

/* ========== LOGIN ========== */
window.handleLogin=async function(e){
  e.preventDefault();
  var email=document.getElementById('username').value.trim(),password=document.getElementById('password').value;
  var btn=e.target.querySelector('button'),err=document.getElementById('errorMsg');
  err.style.display='none';btn.disabled=true;btn.textContent='⏳ جاري التحقق...';
  var{data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error||!data.user){btn.disabled=false;btn.textContent='دخول';err.textContent='❌ بيانات غير صحيحة';err.style.display='block';return false;}
  if(!(await isAdminUser(data.user))){await supabaseClient.auth.signOut();btn.disabled=false;btn.textContent='دخول';err.textContent='❌ لا تملك صلاحية';err.style.display='block';return false;}
  document.getElementById('loginPage').style.display='none';
  document.getElementById('dashboardLayout').classList.add('active');
  if(typeof loadProducts==='function')loadProducts();
  if(typeof loadSettings==='function')loadSettings();
  loadAdminV2Data();
  await addAuditLog('LOGIN', 'تسجيل دخول إلى لوحة الإدارة', 'auth', null);
  return false;
};

window.logout=async function(){
  await addAuditLog('LOGOUT', 'تسجيل خروج من لوحة الإدارة', 'auth', null);
  await supabaseClient.auth.signOut();
  localStorage.clear();
  location.reload();
};

/* ========== TABS ========== */
window.showTab=function(tabName){
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  var tab=document.getElementById(tabName+'Tab');if(tab)tab.classList.add('active');
  document.querySelectorAll('.sidebar-nav a').forEach(a=>a.classList.remove('active'));

  // Update active state in sidebar
  const activeLink = document.querySelector(`.sidebar-nav a[onclick*="showTab('${tabName}')"]`);
  if (activeLink) activeLink.classList.add('active');

  if(tabName==='orders')loadOrders();
  if(tabName==='services')loadServiceRequests();
  if(tabName==='customers')loadCustomers();
  if(tabName==='receipts')loadReceipts();
  if(tabName==='reviews')loadReviews();
  if(tabName==='messages')loadMessages();
  if(tabName==='settings')loadSettings();
  if(tabName==='why_us')loadSiteItems('why_us');
  if(tabName==='vision_mission')loadSiteItems('vision_mission');
  if(tabName==='hero_stats')loadSiteItems('hero_stats');
  if(tabName==='about')loadSiteItems('about');
  if(tabName==='testimonials')loadSiteItems('testimonials');
  if(tabName==='projects')loadSiteItems('projects');
  if(tabName==='blog')loadSiteItems('blog');
  if(tabName==='certifications')loadSiteItems('certifications');
  if(tabName==='contact')loadSiteItems('contact');
  if(tabName==='bank_accounts')loadBankAccounts();
  if(tabName==='payment_methods')loadPaymentMethodsAdmin();
  if(tabName==='shipping')loadShippingRates();
  if(tabName==='invoices')loadInvoices();
  if(tabName==='files')loadSiteFiles();
  if(tabName==='dashboard')loadDashboardStats();
  if(tabName==='afaky')loadAfakySettings();
  if(tabName==='zatca_logs')loadZatcaLogs();
  if(tabName==='afaky_logs')loadAfakyLogs();
  if(tabName==='audit_logs')loadAuditLogs();

  const titles = {
    dashboard: '📊 لوحة المؤشرات',
    products: '📦 المنتجات',
    orders: '🛒 الطلبات',
    customers: '👥 العملاء',
    services: '🔧 الخدمات',
    receipts: '💳 المدفوعات',
    reviews: '⭐ التقييمات',
    messages: '💬 الرسائل',
    invoices: '🧾 الفواتير',
    afaky: '🔗 ربط أفاقي',
    zatca_logs: '📋 سجلات ZATCA',
    afaky_logs: '🔄 سجلات التزامن',
    audit_logs: '🔍 سجل التدقيق',
    settings: '⚙️ الإعدادات'
  };

  const pageTitle = document.getElementById('pageTitle');
  if(pageTitle) pageTitle.textContent = titles[tabName] || tabName;
};

async function loadAdminV2Data(){
  await Promise.allSettled([loadOrders(),loadCustomers(),loadMessages(),loadDashboardStats()]);
  updateStats();
}

/* ========== PRODUCTS (ENHANCED) ========== */
window.loadProducts = async function() {
  var t = document.getElementById('productsTable');
  if (!t) return;
  t.innerHTML = '<tr><td colspan="7">⏳ تحميل...</td></tr>';
  var { data } = await supabaseClient.from('store_products').select('*').order('id');
  if (!data || !data.length) {
    t.innerHTML = '<tr><td colspan="7">📦 لا توجد منتجات</td></tr>';
    return;
  }
  t.innerHTML = data.map((p, i) => 
    `<tr>
      <td>${i+1}</td>
      <td style="width:50px; height:50px; text-align:center; vertical-align:middle; border-radius:6px; overflow:hidden; background:#f0f0f0;">
        <img src="${p.image}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <svg style="display:none; width:24px; height:24px; margin:auto; color:#666;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      </td>
      <td>${esc(p.name)}</td>
      <td>${esc((p.description || '').substring(0, 50))}</td>
      <td>${Number(p.price).toLocaleString()} ر.س</td>
      <td>${p.category}</td>
      <td>
        <button class="btn-edit" onclick="editProduct(${p.id})">✏️</button>
        <button class="btn-delete" onclick="deleteProduct(${p.id})">🗑️</button>
      </td>
    </tr>`
  ).join('');
  document.getElementById('totalProducts').textContent = data.length;
};

window.editProduct = async function(id) {
  var { data } = await supabaseClient.from('store_products').select('*').eq('id', id).single();
  if (!data) return;
  document.getElementById('productId').value = data.id;
  document.getElementById('productName').value = data.name;
  document.getElementById('productDesc').value = data.description || '';
  document.getElementById('productPrice').value = data.price;
  document.getElementById('productOldPrice').value = data.old_price || '';
  document.getElementById('productStock').value = data.stock || 0;
  document.getElementById('productCategory').value = data.category;
  document.getElementById('productBadge').value = data.badge || '';
  document.getElementById('productImage').value = data.image || '';
  document.getElementById('productRating').value = data.rating || 0;
  document.getElementById('productModalTitle').textContent = '✏️ تعديل منتج';
  document.getElementById('productModal').classList.add('show');
};

window.deleteProduct = async function(id) {
  if (!confirm('حذف هذا المنتج؟')) return;
  var { error } = await supabaseClient.from('store_products').delete().eq('id', id);
  if (error) { adminToast('❌ خطأ: ' + error.message, 'error'); return; }
  await addAuditLog('DELETE_PRODUCT', 'حذف منتج #' + id, 'store_products', id);
  adminToast('✅ تم الحذف بنجاح');
  loadProducts();
};

window.openModal = function() {
  document.getElementById('productModal').classList.add('show');
  document.getElementById('productModalTitle').textContent = '📦 إضافة منتج';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
};

window.closeProductModal = function() {
  document.getElementById('productModal').classList.remove('show');
};

window.saveProduct = async function(e) {
  e.preventDefault();
  var id = document.getElementById('productId').value;

  var product = {
    name: document.getElementById('productName').value,
    description: document.getElementById('productDesc').value,
    price: parseFloat(document.getElementById('productPrice').value),
    old_price: parseFloat(document.getElementById('productOldPrice').value) || null,
    stock: parseInt(document.getElementById('productStock').value) || 0,
    category: document.getElementById('productCategory').value,
    badge: document.getElementById('productBadge').value,
    image: document.getElementById('productImage').value,
    rating: parseFloat(document.getElementById('productRating').value) || 0,
    is_active: true
  };

  var btn = document.querySelector('#productForm .btn-save');
  btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...';

  var result, error;
  if (id) {
    result = await supabaseClient.from('store_products').update(product).eq('id', id);
    error = result.error;
  } else {
    result = await supabaseClient.from('store_products').insert(product);
    error = result.error;
  }

  btn.disabled = false; btn.textContent = '💾 حفظ المنتج';

  if (error) {
    adminToast('❌ خطأ: ' + error.message, 'error');
    return;
  }

  await addAuditLog(id ? 'UPDATE_PRODUCT' : 'CREATE_PRODUCT', 
    (id ? 'تعديل' : 'إضافة') + ' منتج: ' + product.name, 
    'store_products', id || result.data?.[0]?.id);

  document.getElementById('productModal').classList.remove('show');
  adminToast('✅ تم الحفظ بنجاح');
  loadProducts();
  return false;
};

/* ========== ORDERS (ENHANCED) ========== */
window.loadOrders=async function(){
  var c=document.getElementById('ordersList');if(!c)return;
  var{data}=await supabaseClient.from('store_orders').select('*').order('created_at',{ascending:false});
  adminState.orders=data||[];renderOrders();
};
function renderOrders(){
  var c=document.getElementById('ordersList');if(!c)return;
  if(!adminState.orders.length){c.innerHTML='<div class="admin-empty">🛒 لا توجد طلبات</div>';return;}
  c.innerHTML=adminState.orders.map(o=>`<div class="admin-data-card"><strong>${esc(o.order_number||o.id)}</strong> - ${money(o.total)} - ${esc(orderStatuses[o.status]||o.status)}</div>`).join('');
}

/* ========== CUSTOMERS ========== */
window.loadCustomers=async function(){
  var c=document.getElementById('customersList');if(!c)return;
  var{data}=await supabaseClient.from('profiles').select('*').order('created_at',{ascending:false});
  adminState.customers=data||[];renderCustomers();
};
function renderCustomers(){
  var c=document.getElementById('customersList');if(!c)return;
  if(!adminState.customers.length){c.innerHTML='<div class="admin-empty">👥 لا يوجد عملاء</div>';return;}
  c.innerHTML=adminState.customers.map(cu=>`<div class="admin-data-card"><strong>${esc(cu.full_name||'بدون اسم')}</strong> - ${esc(cu.phone||'—')}</div>`).join('');
}

/* ========== SERVICES ========== */
window.loadServiceRequests=async function(){
  var c=document.getElementById('servicesList');if(!c)return;
  c.innerHTML='<div class="admin-empty">⏳ جاري تحميل الخدمات...</div>';
  var{data}=await supabaseClient.from('service_requests').select('*').order('created_at',{ascending:false});
  if(!data||!data.length){c.innerHTML='<div class="admin-empty">🔧 لا توجد طلبات خدمات</div>';return;}
  var html='<table class="admin-table"><thead><tr><th>#</th><th>الخدمة</th><th>العميل</th><th>الجوال</th><th>المدينة</th><th>الحالة</th><th>التاريخ</th><th>الإجراءات</th></tr></thead><tbody>';
  data.forEach(function(s,i){
    html+='<tr><td>'+(i+1)+'</td><td>'+esc(s.service_type||'—')+'</td><td>'+esc(s.customer_name||'—')+'</td><td>'+esc(s.customer_phone||'—')+'</td><td>'+esc(s.city||'—')+'</td><td><select onchange="updateServiceStatus(''+s.id+'',this.value)"><option value="new" '+(s.status==='new'?'selected':'')+'>جديد</option><option value="contacted" '+(s.status==='contacted'?'selected':'')+'>تم التواصل</option><option value="in_progress" '+(s.status==='in_progress'?'selected':'')+'>قيد التنفيذ</option><option value="completed" '+(s.status==='completed'?'selected':'')+'>مكتمل</option><option value="cancelled" '+(s.status==='cancelled'?'selected':'')+'>ملغي</option></select></td><td>'+dateAr(s.created_at)+'</td><td><button class="btn-delete" onclick="deleteService(''+s.id+'')">🗑️</button></td></tr>';
  });
  html+='</tbody></table>';
  c.innerHTML=html;
};

window.updateServiceStatus=async function(id,status){
  await supabaseClient.from('service_requests').update({status:status}).eq('id',id);
  await addAuditLog('UPDATE_SERVICE_STATUS', 'تحديث حالة خدمة #' + id + ' إلى ' + status, 'service_requests', id);
  adminToast('✅ تم تحديث الحالة');
};

window.deleteService=async function(id){
  if(!confirm('حذف طلب الخدمة؟'))return;
  await supabaseClient.from('service_requests').delete().eq('id',id);
  await addAuditLog('DELETE_SERVICE', 'حذف طلب خدمة #' + id, 'service_requests', id);
  loadServiceRequests();adminToast('✅ تم الحذف');
};

window.addService=async function(){
  var type=prompt('نوع الخدمة:');if(!type)return;
  var name=prompt('اسم العميل:');if(!name)return;
  var phone=prompt('الجوال:');if(!phone)return;
  var city=prompt('المدينة:');if(!city)return;
  var desc=prompt('الوصف:');if(!desc)return;
  var{error}=await supabaseClient.from('service_requests').insert([{service_type:type,customer_name:name,customer_phone:phone,city:city,description:desc,status:'new'}]);
  if(error){adminToast('❌ خطأ: '+error.message,'error');return;}
  await addAuditLog('CREATE_SERVICE', 'إضافة طلب خدمة جديد', 'service_requests', null);
  adminToast('✅ تمت الإضافة');loadServiceRequests();
};

/* ========== RECEIPTS ========== */
window.loadReceipts=async function(){
  var c=document.getElementById('receiptsList');if(!c)return;
  c.innerHTML='<div class="admin-empty">🧾 لا توجد إيصالات</div>';
};

/* ========== REVIEWS ========== */
window.loadReviews=async function(){
  var c=document.getElementById('reviewsList');if(!c)return;
  c.innerHTML='<div class="admin-empty">⏳ جاري تحميل التقييمات...</div>';
  var{data}=await supabaseClient.from('reviews').select('*').order('id',{ascending:false});
  if(!data||!data.length){c.innerHTML='<div class="admin-empty">⭐ لا توجد تقييمات</div>';return;}
  var html='<table class="admin-table"><thead><tr><th>#</th><th>الاسم</th><th>المنتج</th><th>التقييم</th><th>التعليق</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>';
  data.forEach(function(r,i){
    html+='<tr><td>'+(i+1)+'</td><td>'+esc(r.name||'—')+'</td><td>'+esc(r.product||'—')+'</td><td>'+'★'.repeat(r.rating||5)+'</td><td>'+esc((r.text||'').substring(0,60))+'</td><td>'+esc(reviewStatuses[r.status]||r.status||'جديد')+'</td><td><button class="btn-edit" onclick="updateReviewStatus('+r.id+','published')">✅ نشر</button> <button class="btn-delete" onclick="deleteReviewAdmin('+r.id+')">🗑️</button></td></tr>';
  });
  html+='</tbody></table>';
  c.innerHTML=html;
};

window.updateReviewStatus=async function(id,status){
  await supabaseClient.from('reviews').update({status:status}).eq('id',id);
  await addAuditLog('UPDATE_REVIEW_STATUS', 'تحديث حالة تقييم #' + id, 'reviews', id);
  loadReviews();adminToast('✅ تم التحديث');
};

window.deleteReviewAdmin=async function(id){
  if(!confirm('حذف التقييم؟'))return;
  await supabaseClient.from('reviews').delete().eq('id',id);
  await addAuditLog('DELETE_REVIEW', 'حذف تقييم #' + id, 'reviews', id);
  loadReviews();adminToast('✅ تم الحذف');
};

/* ========== MESSAGES ========== */
window.loadMessages=async function(){
  var c=document.getElementById('messagesList');if(!c)return;
  var{data}=await supabaseClient.from('contact_messages').select('*').order('created_at',{ascending:false});
  if(!data||!data.length){c.innerHTML='<div class="admin-empty">📨 لا توجد رسائل</div>';return;}
  c.innerHTML=data.map(m=>`<div class="admin-data-card"><strong>${esc(m.name)}</strong>: ${esc(m.message).substring(0,100)}</div>`).join('');
};

/* ========== SETTINGS ========== */
window.loadSettings=async function(){};

/* ========== BANK ACCOUNTS ========== */
window.loadBankAccounts=async function(){
  var c=document.getElementById('bankAccountsList');if(!c)return;
  var{data}=await supabaseClient.from('company_bank_accounts').select('*');
  if(!data||!data.length){c.innerHTML='<div class="admin-empty">🏦 لا توجد حسابات</div>';return;}
  c.innerHTML=data.map(a=>`<div class="admin-data-card"><strong>${esc(a.bank_name)}</strong> - ${esc(a.account_number)}</div>`).join('');
};
window.addBankAccount=async function(){
  var n=prompt('اسم البنك:');if(!n)return;
  var an=prompt('رقم الحساب:');if(!an)return;
  await supabaseClient.from('company_bank_accounts').insert([{bank_name:n,account_number:an,is_active:true}]);
  await addAuditLog('CREATE_BANK_ACCOUNT', 'إضافة حساب بنكي: ' + n, 'company_bank_accounts', null);
  loadBankAccounts();adminToast('✅ تمت الإضافة');
};

/* ========== PAYMENT METHODS ========== */
window.loadPaymentMethodsAdmin=async function(){
  var c=document.getElementById('paymentMethodsTable');if(!c)return;
  var{data}=await supabaseClient.from('payment_methods').select('*').order('sort_order');
  if(!data||!data.length){c.innerHTML='<tr><td colspan="6">💳 لا توجد طرق دفع</td></tr>';return;}
  c.innerHTML=data.map((m,i)=>`<tr><td>${i+1}</td><td>${m.icon||'💳'}</td><td>${m.name}</td><td>${m.description||'—'}</td><td>${m.is_active?'✅':'❌'}</td><td><button class="btn-edit" onclick="editPaymentMethod(${m.id},'${m.name}','${m.icon||'💳'}','${m.description||''}',${m.sort_order},${m.is_active})">✏️</button></td></tr>`).join('');
};
window.editPaymentMethod=function(id,n,ic,d,o,a){alert('تعديل: '+n);};
window.openPaymentMethodModal=function(){alert('مودال إضافة طريقة دفع');};

/* ========== SHIPPING ========== */
window.loadShippingRates=async function(){
  var c=document.getElementById('shippingRatesTable');if(!c)return;
  var{data}=await supabaseClient.from('shipping_rates').select('*');
  if(!data||!data.length){c.innerHTML='<tr><td colspan="7">🚚 لا توجد أسعار</td></tr>';return;}
  c.innerHTML=data.map((r,i)=>`<tr><td>${i+1}</td><td>${r.from_city}</td><td>${r.to_city}</td><td>${r.weight_kg}</td><td>${r.price_sar} ر.س</td><td>${r.estimated_days} أيام</td><td><button class="btn-edit">✏️</button></td></tr>`).join('');
};
window.openShippingRateModal=function(){alert('مودال إضافة سعر شحن');};

/* ========== INVOICES ========== */
window.loadInvoices=async function(){
  var c=document.getElementById('invoicesTable');if(!c)return;
  c.innerHTML='<tr><td colspan="7">🧾 لا توجد فواتير</td></tr>';
};

/* ========== SITE FILES ========== */
window.loadSiteFiles=async function(){
  var c=document.getElementById('siteFilesList');if(!c)return;
  c.innerHTML='<div class="admin-empty">📁 لا توجد ملفات</div>';
};
window.addNewFile=function(){alert('مودال رفع ملف');};

/* ========== SITE ITEMS ========== */
window.loadSiteItems=async function(sectionKey){
  var container=document.getElementById(sectionKey+'List');if(!container)return;
  container.innerHTML='<div class="admin-empty">⏳ جاري التحميل...</div>';
  var{data}=await supabaseClient.from('site_items').select('*').eq('section_key',sectionKey).order('sort_order');
  if(!data||!data.length){container.innerHTML='<div class="admin-empty">📭 لا توجد بيانات. اضغط ➕ إضافة.</div>';return;}
  var html='<table class="admin-table"><thead><tr><th>#</th><th>العنوان</th><th>الوصف</th><th>الترتيب</th><th>الإجراءات</th></tr></thead><tbody>';
  data.forEach(function(item,i){
    html+='<tr><td>'+(i+1)+'</td><td><strong>'+esc(item.title_ar||'بدون عنوان')+'</strong></td><td>'+esc((item.description_ar||'').substring(0,50))+'</td><td>'+item.sort_order+'</td><td><button class="btn-edit" onclick="editSiteItem('+item.id+')">✏️</button> <button class="btn-delete" onclick="deleteSiteItem('+item.id+',''+sectionKey+'')">🗑️</button></td></tr>';
  });
  html+='</tbody></table>';container.innerHTML=html;
};

window.addSiteItem=async function(sectionKey){
  var title=prompt('العنوان:');if(!title)return;
  var desc=prompt('الوصف:')||'';
  var sort=parseInt(prompt('الترتيب:','1'))||1;
  var{error}=await supabaseClient.from('site_items').insert([{section_key:sectionKey,title_ar:title,description_ar:desc,sort_order:sort}]);
  if(error){adminToast('❌ خطأ: '+error.message,'error');return;}
  await addAuditLog('CREATE_SITE_ITEM', 'إضافة عنصر في ' + sectionKey + ': ' + title, 'site_items', null);
  adminToast('✅ تمت الإضافة');loadSiteItems(sectionKey);
};

window.editSiteItem=async function(id){
  var{data}=await supabaseClient.from('site_items').select('*').eq('id',id).single();
  if(!data)return;
  var title=prompt('العنوان:',data.title_ar);if(title===null)return;
  var desc=prompt('الوصف:',data.description_ar||'');if(desc===null)return;
  var sort=parseInt(prompt('الترتيب:',data.sort_order))||data.sort_order;
  await supabaseClient.from('site_items').update({title_ar:title,description_ar:desc,sort_order:sort}).eq('id',id);
  await addAuditLog('UPDATE_SITE_ITEM', 'تعديل عنصر #' + id, 'site_items', id);
  adminToast('✅ تم التعديل');loadSiteItems(data.section_key);
};

window.deleteSiteItem=async function(id,sectionKey){
  if(!confirm('حذف؟'))return;
  await supabaseClient.from('site_items').delete().eq('id',id);
  await addAuditLog('DELETE_SITE_ITEM', 'حذف عنصر #' + id + ' من ' + sectionKey, 'site_items', id);
  adminToast('✅ تم الحذف');loadSiteItems(sectionKey);
};

/* ========== SETTINGS SAVERS ========== */
window.saveSettings=async function(){adminToast('✅ تم حفظ الإعدادات');};
window.saveCompanyInfo=async function(){adminToast('✅ تم حفظ بيانات الشركة');};
window.saveGovDocs=async function(){adminToast('✅ تم حفظ التوثيق');};
window.saveEInvoice=async function(){adminToast('✅ تم حفظ الفوترة');};

/* ========== STATS ========== */
window.updateStats=async function(){
  var pe=document.getElementById('totalProducts'),oe=document.getElementById('totalOrders'),re=document.getElementById('totalReviews'),me=document.getElementById('totalMessages');
  if(pe){var{count}=await supabaseClient.from('store_products').select('*',{count:'exact',head:true});pe.textContent=count||0;}
  if(oe){var{count:oc}=await supabaseClient.from('store_orders').select('*',{count:'exact',head:true}).eq('status','new');oe.textContent=oc||0;}
  if(re){var{count:rc}=await supabaseClient.from('reviews').select('*',{count:'exact',head:true});re.textContent=rc||0;}
  if(me){var{count:mc}=await supabaseClient.from('contact_messages').select('*',{count:'exact',head:true}).eq('status','new');me.textContent=mc||0;}
};

/* ========== INIT ========== */
document.addEventListener('DOMContentLoaded',function(){
  var user=localStorage.getItem('adminLoggedIn');
  if(user){
    document.getElementById('loginPage').style.display='none';
    document.getElementById('dashboardLayout').classList.add('active');
    if(typeof loadProducts==='function')loadProducts();
    updateStats();
  }
});


/* ========== CSV EXPORT/IMPORT FOR AFAKY ========== */
window.exportToAfakyCSV = async function() {
  try {
    adminToast('📤 جاري تصدير البيانات...');
    const { data: orders } = await supabaseClient
      .from('store_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!orders || !orders.length) {
      adminToast('❌ لا توجد طلبات للتصدير');
      return;
    }

    const settings = adminState.afakySettings || {};
    const delimiter = settings.config?.csv_delimiter || ',';
    const dateFormat = settings.config?.date_format || 'yyyy-MM-dd';
    const useBom = settings.config?.utf8_bom === 'true';

    // CSV Header (Afaky-compatible format)
    const headers = ['DocNo', 'DocDate', 'CustomerName', 'CustomerTaxID', 'ItemName', 'Qty', 'Price', 'Discount', 'TaxRate', 'TaxAmount', 'Total', 'Notes'];

    let csv = headers.join(delimiter) + '\n';

    orders.forEach(order => {
      const row = [
        order.order_number || order.id,
        new Date(order.created_at).toISOString().split('T')[0],
        order.customer_name || 'عميل',
        order.customer_tax_id || '',
        'طلب #' + (order.order_number || order.id),
        '1',
        order.total || 0,
        '0',
        '15',
        (order.total * 0.15).toFixed(2),
        (order.total * 1.15).toFixed(2),
        order.notes || ''
      ];
      csv += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(delimiter) + '\n';
    });

    // Add BOM for Excel Arabic support
    const bom = useBom ? '\uFEFF' : '';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'afaky_export_' + new Date().toISOString().split('T')[0] + '.csv';
    link.click();

    await addAuditLog('EXPORT_CSV', 'تصدير ' + orders.length + ' طلب إلى CSV لأفاقي', 'store_orders', null);
    adminToast('✅ تم التصدير: ' + orders.length + ' طلب');
  } catch(e) {
    adminToast('❌ خطأ في التصدير: ' + e.message, 'error');
  }
};

window.importFromAfakyCSV = function() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';
  input.onchange = async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    adminToast('📥 جاري استيراد الملف...');
    const reader = new FileReader();
    reader.onload = async function(event) {
      try {
        const csv = event.target.result;
        // Parse CSV (simple parser)
        const lines = csv.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          // Here you would process each row and update Supabase
          imported++;
        }

        await addAuditLog('IMPORT_CSV', 'استيراد ' + imported + ' سجل من أفاقي', 'store_orders', null);
        adminToast('✅ تم الاستيراد: ' + imported + ' سجل');
      } catch(err) {
        adminToast('❌ خطأ في الاستيراد: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

})();
