  /* ===== صفحة حسابي — my-account.html (قيم حية من قاعدة البيانات) ===== */
  var MAC_LS_KEY = 'doraMyPhone';

  function macEsc(s) {
    var d = document.createElement('div');
    d.textContent = String(s == null ? '' : s);
    return d.innerHTML;
  }

  function macFmtPrice(n) {
    n = Number(n) || 0;
    if (typeof formatPrice === 'function') { try { return formatPrice(n); } catch(e){} }
    return n.toLocaleString('ar-SA') + ' ريال';
  }

  function macStatusInfo(status) {
    var s = String(status || '').toLowerCase().trim();
    if (['cancelled','canceled','rejected'].indexOf(s) !== -1) return { label: 'ملغي', cls: 'b-cancel' };
    if (['delivered','completed','complete'].indexOf(s) !== -1) return { label: 'تم التسليم', cls: 'b-done' };
    if (['shipped','shipping','out_for_delivery','out-for-delivery'].indexOf(s) !== -1) return { label: 'تم الشحن', cls: 'b-ship' };
    if (['processing','preparing','confirmed','in_progress'].indexOf(s) !== -1) return { label: 'قيد التجهيز', cls: 'b-prog' };
    return { label: 'جديد', cls: 'b-new' };
  }

  function macParseItems(items) {
    var arr = items;
    if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch (e) { arr = []; } }
    return Array.isArray(arr) ? arr : [];
  }

  function macOrderTotal(o, items) {
    var t = Number(o.total || o.total_amount || o.grand_total || o.amount || 0);
    if (t > 0) return t;
    var s = 0;
    items.forEach(function(it){ s += (Number(it.price || 0) * Number(it.qty || it.quantity || 1)); });
    return s;
  }

  function macLogin() {
    var inp = document.getElementById('macPhoneInput');
    var err = document.getElementById('macGateErr');
    var ph = (inp.value || '').replace(/\D/g, '');
    if (ph.length < 9) {
      err.textContent = '⚠️ أدخل رقم جوال صحيح (9 أرقام على الأقل)';
      err.style.display = 'block';
      return;
    }
    err.style.display = 'none';
    localStorage.setItem(MAC_LS_KEY, ph);
    macLoadAccount(ph);
  }

  function macLogout() {
    localStorage.removeItem(MAC_LS_KEY);
    location.reload();
  }

  async function macLoadAccount(phone) {
    document.getElementById('macGate').style.display = 'none';
    document.getElementById('macMain').style.display = 'block';
    document.getElementById('macHelloPhone').textContent = '📱 ' + phone;
    var box = document.getElementById('macOrders');
    box.innerHTML = '<div class="mac-loading">⏳ جاري تحميل طلباتك من قاعدة البيانات...</div>';

    /* رقم واتساب خدمة العملاء من إعدادات الموقع الحية */
    try {
      if (typeof getDoraSiteSettings === 'function') {
        var st = getDoraSiteSettings() || {};
        var wa = st.whatsapp || st.whatsappNumber || st.whatsapp_number || (st.contact && st.contact.whatsapp) || '';
        var waDigits = String(wa).replace(/\D/g, '');
        if (waDigits) document.getElementById('macWaBtn').href = 'https://wa.me/' + waDigits;
      }
    } catch(e) {}
    if (!document.getElementById('macWaBtn').href || document.getElementById('macWaBtn').href === location.href + '#') {
      document.getElementById('macWaBtn').style.display = 'none';
    }

    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient) throw new Error('no-db');
      var res = await supabaseClient.rpc('customer_orders_by_phone', { p_phone: phone });
      if (res.error) throw res.error;
      var orders = res.data || [];

      if (!orders.length) {
        box.innerHTML = '<div class="mac-glass mac-empty"><div class="big">🛒</div><h3>لا توجد طلبات بعد على هذا الرقم</h3><p>أول ما تطلب من المتجر، طلباتك هتظهر هنا على طول</p><a class="mac-btn mac-btn-full" href="products.html" style="display:block;text-decoration:none;margin-top:14px">🛍️ ابدأ التسوّق</a></div>';
        return;
      }

      /* اسم العميل من أحدث طلب */
      var nm = orders[0].customer_name || orders[0].name || '';
      if (nm) document.getElementById('macHelloName').textContent = 'مرحبًا يا ' + nm + ' 👋';

      var html = '';
      orders.forEach(function(o) {
        var items = macParseItems(o.items);
        var st = macStatusInfo(o.status);
        var dateStr = '';
        try {
          var d = new Date(o.created_at);
          dateStr = d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch(e) { dateStr = String(o.created_at || ''); }
        var total = macOrderTotal(o, items);
        var pay = o.payment_method || o.payment_method_ar || o.payment || '';

        html += '<div class="mac-glass mac-order">';
        html += '<div class="mac-order-top"><span class="mac-order-num">📦 طلب ' + macEsc(o.order_number || '') + '</span><span class="mac-badge ' + st.cls + '">' + st.label + '</span></div>';
        html += '<div class="mac-order-meta"><span>🗓️ ' + macEsc(dateStr) + '</span>' + (pay ? '<span>💳 ' + macEsc(pay) + '</span>' : '') + '<span>🛍️ ' + items.length + ' منتج</span></div>';
        if (items.length) {
          html += '<div class="mac-order-items">';
          items.slice(0, 4).forEach(function(it) {
            var nm2 = it.name || it.title || it.product_name || 'منتج';
            var qty = Number(it.qty || it.quantity || 1);
            html += '<div><span>' + macEsc(nm2) + '</span><span>× ' + qty + '</span></div>';
          });
          if (items.length > 4) html += '<div><span style="color:#8F9BC9">... و' + (items.length - 4) + ' منتجات أخرى</span><span></span></div>';
          html += '</div>';
        }
        html += '<div class="mac-order-foot"><span class="mac-order-total">' + (total > 0 ? macFmtPrice(total) : '—') + '</span>';
        html += '<span class="mac-order-actions"><a class="mac-mini-btn" href="track.html">🚚 تتبع</a></span></div>';
        html += '</div>';
      });
      box.innerHTML = html;

    } catch(e) {
      console.error(e);
      box.innerHTML = '<div class="mac-glass mac-err">⚠️ تعذّر تحميل الطلبات حاليًا — جرب مرة أخرى بعد قليل أو تواصل معنا واتساب</div>';
    }
  }

  (function macInit() {
    var saved = localStorage.getItem(MAC_LS_KEY);
    if (saved) { macLoadAccount(saved); }
    else { document.getElementById('macGate').style.display = 'block'; }
  })();
