/* ===== تتبع الطلبات - track.html (يستخدم supabaseClient من main.js) ===== */
var DTRACK_STAGES = ['تم الاستلام', 'قيد التجهيز', 'تم الشحن', 'تم التسليم'];
var DTRACK_ICONS = ['📥', '⚙️', '🚚', '✅'];

function dtrackEsc(s) {
  var d = document.createElement('div');
  d.textContent = String(s == null ? '' : s);
  return d.innerHTML;
}

function dtrackStageIndex(status) {
  var s = String(status || '').toLowerCase().trim();
  if (['delivered', 'completed', 'done', 'complete'].indexOf(s) !== -1) return 3;
  if (['shipped', 'shipping', 'out_for_delivery', 'out-for-delivery'].indexOf(s) !== -1) return 2;
  if (['processing', 'preparing', 'confirmed', 'in_progress'].indexOf(s) !== -1) return 1;
  return 0; /* new وأي حالة أخرى = تم الاستلام */
}

function dtrackIsCancelled(status) {
  var s = String(status || '').toLowerCase().trim();
  return ['cancelled', 'canceled', 'rejected'].indexOf(s) !== -1;
}

function dtrackPhoneVariants(phone) {
  var raw = String(phone || '').trim();
  var digits = raw.replace(/\D/g, '');
  var v = [raw, digits];
  if (digits.indexOf('966') === 0) {
    v.push('+' + digits, '0' + digits.slice(3), digits.slice(3));
  } else if (digits.indexOf('0') === 0) {
    v.push('966' + digits.slice(1), '+966' + digits.slice(1));
  } else if (digits.length === 9) {
    v.push('0' + digits, '966' + digits, '+966' + digits);
  }
  return v.filter(function(x, i) { return x && v.indexOf(x) === i; });
}

async function dtrackFindOrder(orderNum, phone) {
  /* نستخدم دالة track_order الآمنة (SECURITY DEFINER) — تتجاوز RLS بأمان:
     لا تُرجع الطلب إلا إذا تطابق رقم الطلب + آخر 9 أرقام من الجوال معاً.
     (الاستعلام المباشر على store_orders كان محظوراً على الزوار بسياسات RLS) */
  var num = String(orderNum || '').trim();
  var ph = String(phone || '').trim();
  var res = await supabaseClient.rpc('track_order', { p_order_number: num, p_phone: ph });
  if (res.error) throw res.error;
  if (res.data && res.data.length) return res.data[0];
  return null;
}

function dtrackParseItems(items) {
  var arr = items;
  if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch (e) { arr = []; } }
  return Array.isArray(arr) ? arr : [];
}

function dtrackRenderOrder(o) {
  var res = document.getElementById('dtrackResult');
  var cancelled = dtrackIsCancelled(o.status);
  var stage = dtrackStageIndex(o.status);
  var dateStr = '';
  try {
    var d = new Date(o.created_at);
    dateStr = d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) +
      ' - ' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { dateStr = String(o.created_at || ''); }

  var statusLabels = { 'new': 'جديد', 'processing': 'قيد التجهيز', 'preparing': 'قيد التجهيز', 'confirmed': 'مؤكد', 'shipped': 'تم الشحن', 'delivered': 'تم التسليم', 'completed': 'مكتمل', 'cancelled': 'ملغي', 'canceled': 'ملغي' };
  var statusLabel = statusLabels[String(o.status || '').toLowerCase()] || String(o.status || '');

  var html = '<div class="dtrack-card">';
  html += '<div class="dtrack-head"><h3>📦 الطلب ' + dtrackEsc(o.order_number) + '</h3><span class="dtrack-status-badge">' + dtrackEsc(statusLabel) + '</span></div>';
  html += '<div class="dtrack-meta"><span>👤 <b>' + dtrackEsc(o.customer_name || '') + '</b></span><span>🗓️ <b>' + dtrackEsc(dateStr) + '</b></span></div>';

  if (cancelled) {
    html += '<div class="dtrack-cancel" style="margin-top:20px">❌ عذراً، هذا الطلب ملغي — للاستفسار تواصل معنا عبر واتساب</div>';
  } else {
    html += '<div class="dtrack-timeline"><div class="dtrack-bar" style="width:' + (stage * 28) + '%"></div>';
    for (var i = 0; i < DTRACK_STAGES.length; i++) {
      var cls = i < stage ? 'done' : (i === stage ? 'current' : '');
      html += '<div class="dtrack-step ' + cls + '"><div class="dtrack-dot">' + (i < stage ? '✓' : DTRACK_ICONS[i]) + '</div><div class="dtrack-lbl">' + DTRACK_STAGES[i] + '</div></div>';
    }
    html += '</div>';
  }

  var items = dtrackParseItems(o.items);
  if (items.length) {
    html += '<div class="dtrack-items"><h4>🛒 منتجات الطلب</h4>';
    items.forEach(function(it) {
      var nm = it.name || it.title || it.product_name || 'منتج';
      var qty = Number(it.qty || it.quantity || 1);
      var pr = Number(it.price || 0);
      html += '<div class="dtrack-item"><span>' + dtrackEsc(nm) + '</span><span class="q">× ' + qty + '</span><span>' + (pr ? formatPrice(pr * qty) : '') + '</span></div>';
    });
    html += '</div>';
  }
  if (o.total != null && o.total !== '') {
    html += '<div class="dtrack-total"><span>💰 الإجمالي (شامل الضريبة)</span><span>' + formatPrice(Number(o.total)) + '</span></div>';
  }
  html += '</div>';
  res.innerHTML = html;
  res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function dtrackRenderNotFound(orderNum) {
  var res = document.getElementById('dtrackResult');
  res.innerHTML = '<div class="dtrack-empty"><span class="ic">🔎</span>' +
    '<p>لم نعثر على الطلب</p>' +
    '<small>تأكد من رقم الطلب ورقم الجوال المدخَل، أو تواصل معنا مباشرة وسنساعدك فوراً</small>' +
    '<a class="dtrack-wa" href="https://wa.me/966545358773?text=' + encodeURIComponent('مرحباً، أريد الاستفسار عن طلبي رقم: ' + orderNum) + '" target="_blank" rel="noopener">💬 تواصل عبر واتساب</a></div>';
}

async function dtrackSearch(e) {
  if (e && e.preventDefault) e.preventDefault();
  var btn = document.getElementById('dtrackBtn');
  var res = document.getElementById('dtrackResult');
  var orderNum = document.getElementById('dtrackOrder').value.trim();
  var phone = document.getElementById('dtrackPhone').value.trim();
  if (!orderNum || !phone) return false;
  btn.disabled = true;
  btn.textContent = '⏳ جاري البحث...';
  res.innerHTML = '<div class="dtrack-loading">⏳ جاري البحث عن طلبك...</div>';
  try {
    var order = await dtrackFindOrder(orderNum, phone);
    if (order) dtrackRenderOrder(order);
    else dtrackRenderNotFound(orderNum);
  } catch (err) {
    /* فشل الاستعلام أو RLS منع القراءة — نعرض رسالة مهذبة */
    dtrackRenderNotFound(orderNum);
  }
  btn.disabled = false;
  btn.textContent = '🔍 تتبع الطلب';
  return false;
}
