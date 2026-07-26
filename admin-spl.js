// ============================================================
// admin-spl.js — إضافة SPL Shipping + Inventory Management
// ضع هذا الملف بجانب admin-v2.js واربطه في admin.html
// ============================================================

(function() {
    'use strict';

    // نستنى لحد ما Supabase يبقى جاهز
    function initSPL() {
        if (typeof supabaseClient === 'undefined') {
            setTimeout(initSPL, 500);
            return;
        }
        console.log('✅ SPL Module loaded');
        injectTabs();
        injectStyles();
    }

    // ========== 1. إضافة التابات ديناميكياً ==========
    function injectTabs() {
        const tabsContainer = document.getElementById('adminTabs');
        if (!tabsContainer) return;

        // تاب المخزون
        const invTab = document.createElement('button');
        invTab.className = 'tab-btn';
        invTab.textContent = '📋 المخزون';
        invTab.onclick = function() { showTab('inventory'); };
        tabsContainer.appendChild(invTab);

        // تاب الشحن
        const shipTab = document.createElement('button');
        shipTab.className = 'tab-btn';
        shipTab.textContent = '🚚 الشحن SPL';
        shipTab.onclick = function() { showTab('shipping'); };
        tabsContainer.appendChild(shipTab);

        // ========== محتوى تاب المخزون ==========
        const invContent = document.createElement('div');
        invContent.className = 'tab-content';
        invContent.id = 'inventoryTab';
        invContent.innerHTML = `
            <div class="table-container">
                <div class="table-header">
                    <h3>📋 إدارة المخزون</h3>
                    <button class="btn-add" onclick="loadInventory()">🔄 تحديث</button>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th><th>الصورة</th><th>المنتج</th><th>التصنيف</th>
                                <th>المخزون الحالي</th><th>الحد الأدنى</th><th>الحالة</th><th>تحديث</th>
                            </tr>
                        </thead>
                        <tbody id="inventoryTable">
                            <tr><td colspan="8" style="text-align:center">⏳ جاري التحميل...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.querySelector('.container').appendChild(invContent);

        // ========== محتوى تاب الشحن ==========
        const shipContent = document.createElement('div');
        shipContent.className = 'tab-content';
        shipContent.id = 'shippingTab';
        shipContent.innerHTML = `
            <div class="table-container">
                <div class="table-header">
                    <h3>🚚 إعدادات الشحن SPL</h3>
                </div>
                <div style="padding:20px">
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;background:rgba(255,255,255,0.03);border-radius:12px;margin-bottom:20px;border:1px solid rgba(255,255,255,0.08);">
                        <label style="font-weight:700;color:#fff;">تفعيل الشحن الآلي (SPL)</label>
                        <div id="splToggleBtn" onclick="toggleSPL()" style="width:48px;height:26px;background:#444;border-radius:13px;position:relative;cursor:pointer;transition:background 0.3s;">
                            <div id="splToggleKnob" style="width:22px;height:22px;background:#fff;border-radius:50%;position:absolute;top:2px;right:2px;transition:transform 0.3s;"></div>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:20px;">
                        <div class="form-group">
                            <label>🔑 API Key</label>
                            <input type="text" id="splApiKey" placeholder="انسخ API Key من موقع SPL">
                        </div>
                        <div class="form-group">
                            <label>📋 رقم الحساب</label>
                            <input type="text" id="splAccountNumber" placeholder="رقم حسابك في SPL">
                        </div>
                        <div class="form-group">
                            <label>🔒 Secret Key (اختياري)</label>
                            <input type="password" id="splSecretKey" placeholder="Secret Key">
                        </div>
                        <div class="form-group">
                            <label>🌐 رابط API</label>
                            <input type="text" id="splBaseUrl" value="https://api.spl.sa">
                        </div>
                    </div>
                    <button class="btn-save" onclick="saveSPLSettings()" style="width:100%;">💾 حفظ إعدادات الشحن</button>
                    <div id="splStatusMsg" style="margin-top:12px;padding:12px;border-radius:8px;font-weight:700;display:none;"></div>
                </div>
            </div>

            <div class="table-container" style="margin-top:24px;">
                <div class="table-header">
                    <h3>💰 أسعار الشحن بين المدن</h3>
                    <button class="btn-add" onclick="openRateModal()">➕ إضافة سعر</button>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr><th>من</th><th>إلى</th><th>الوزن (كجم)</th><th>السعر (ر.س)</th><th>المدة (يوم)</th><th>إجراءات</th></tr>
                        </thead>
                        <tbody id="shippingRatesTable">
                            <tr><td colspan="6" style="text-align:center">⏳ جاري التحميل...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.querySelector('.container').appendChild(shipContent);

        // ========== مودال إضافة سعر شحن ==========
        const rateModal = document.createElement('div');
        rateModal.className = 'modal';
        rateModal.id = 'rateModal';
        rateModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>➕ إضافة سعر شحن</h3>
                    <button class="btn-close" onclick="closeRateModal()">✕</button>
                </div>
                <form onsubmit="return saveShippingRate(event)">
                    <div class="form-group">
                        <label>من مدينة</label>
                        <select id="rateFromCity" style="width:100%;padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#fff;">
                            <option>الرياض</option><option>جدة</option><option>مكة</option><option>المدينة المنورة</option>
                            <option>الدمام</option><option>الطائف</option><option>الخبر</option><option>بريدة</option>
                            <option>تبوك</option><option>أبها</option><option>حائل</option><option>سكاكا</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>إلى مدينة</label>
                        <select id="rateToCity" style="width:100%;padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#fff;">
                            <option>جدة</option><option>الرياض</option><option>مكة</option><option>المدينة المنورة</option>
                            <option>الدمام</option><option>الطائف</option><option>الخبر</option><option>بريدة</option>
                            <option>تبوك</option><option>أبها</option><option>حائل</option><option>سكاكا</option>
                        </select>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
                        <div class="form-group"><label>الوزن (كجم)</label><input type="number" id="rateWeight" value="1" step="0.5" min="0.5"></div>
                        <div class="form-group"><label>السعر (ر.س)</label><input type="number" id="ratePrice" placeholder="25" step="0.5" min="0" required></div>
                        <div class="form-group"><label>المدة (يوم)</label><input type="number" id="rateDays" value="2" min="1"></div>
                    </div>
                    <button type="submit" class="btn-save" style="width:100%;margin-top:12px;">💾 حفظ السعر</button>
                </form>
            </div>
        `;
        document.body.appendChild(rateModal);
    }

    // ========== 2. CSS إضافي بسيط ==========
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #splToggleBtn.active { background: #EF4444 !important; }
            #splToggleBtn.active #splToggleKnob { transform: translateX(-22px); }
            .stock-input { width: 80px; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: #fff; text-align: center; }
            .badge-inv { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
            .badge-inv.ok { background: rgba(0,255,136,0.15); color: #00ff88; }
            .badge-inv.low { background: rgba(255,204,0,0.15); color: #ffcc00; }
            .badge-inv.out { background: rgba(239,68,68,0.15); color: #EF4444; }
        `;
        document.head.appendChild(style);
    }

    // ========== 3. دوال المخزون ==========
    window.loadInventory = async function() {
        const tbody = document.getElementById('inventoryTable');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">⏳ جاري التحميل...</td></tr>';

        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select('id,name,category,price,stock,image')
                .order('stock', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">لا يوجد منتجات</td></tr>';
                return;
            }

            tbody.innerHTML = data.map((p, i) => {
                const status = p.stock <= 0 ? 'نفذ' : p.stock < 5 ? 'منخفض' : 'جيد';
                const badgeClass = p.stock <= 0 ? 'out' : p.stock < 5 ? 'low' : 'ok';
                return `
                    <tr>
                        <td>${i + 1}</td>
                        <td><img src="${p.image || 'placeholder.jpg'}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;"></td>
                        <td>${p.name}</td>
                        <td>${p.category || '-'}</td>
                        <td><input type="number" class="stock-input" id="stock-${p.id}" value="${p.stock}" min="0"></td>
                        <td>5</td>
                        <td><span class="badge-inv ${badgeClass}">${status}</span></td>
                        <td><button class="btn-add" style="padding:6px 14px;font-size:12px;" onclick="updateStock('${p.id}')">💾 حفظ</button></td>
                    </tr>
                `;
            }).join('');
        } catch(e) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#EF4444;">خطأ في التحميل</td></tr>';
        }
    };

    window.updateStock = async function(id) {
        const input = document.getElementById('stock-' + id);
        if (!input) return;
        const newStock = parseInt(input.value);
        if (isNaN(newStock) || newStock < 0) { alert('أدخل رقم صحيح'); return; }

        try {
            const { error } = await supabaseClient
                .from('products')
                .update({ stock: newStock, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            alert('✅ تم تحديث المخزون!');
            loadInventory();
        } catch(e) {
            alert('❌ خطأ: ' + (e.message || 'مشكلة في الحفظ'));
        }
    };

    // ========== 4. دوال الشحن SPL ==========
    let splEnabled = false;

    window.loadSPLSettings = async function() {
        try {
            const { data, error } = await supabaseClient
                .from('shipping_settings')
                .select('*')
                .eq('provider', 'spl')
                .single();

            if (data) {
                document.getElementById('splApiKey').value = data.api_key || '';
                document.getElementById('splAccountNumber').value = data.account_number || '';
                document.getElementById('splSecretKey').value = data.secret_key || '';
                document.getElementById('splBaseUrl').value = data.base_url || 'https://api.spl.sa';
                splEnabled = data.enabled || false;
                updateToggleUI();
            }
        } catch(e) { console.log('SPL not configured'); }
    };

    window.toggleSPL = function() {
        splEnabled = !splEnabled;
        updateToggleUI();
    };

    function updateToggleUI() {
        const btn = document.getElementById('splToggleBtn');
        if (btn) {
            if (splEnabled) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    }

    window.saveSPLSettings = async function() {
        const msg = document.getElementById('splStatusMsg');
        msg.style.display = 'none';

        const settings = {
            provider: 'spl',
            api_key: document.getElementById('splApiKey').value.trim(),
            account_number: document.getElementById('splAccountNumber').value.trim(),
            secret_key: document.getElementById('splSecretKey').value.trim(),
            base_url: document.getElementById('splBaseUrl').value.trim() || 'https://api.spl.sa',
            enabled: splEnabled,
            updated_at: new Date().toISOString()
        };

        if (settings.enabled && (!settings.api_key || !settings.account_number)) {
            showSPLStatus('❌ API Key ورقم الحساب مطلوبان لتفعيل الشحن!', 'error');
            return;
        }

        try {
            const { data: existing } = await supabaseClient.from('shipping_settings').select('id').eq('provider','spl').single();
            let result;
            if (existing) {
                result = await supabaseClient.from('shipping_settings').update(settings).eq('id', existing.id);
            } else {
                settings.created_at = new Date().toISOString();
                result = await supabaseClient.from('shipping_settings').insert([settings]);
            }
            if (result.error) throw result.error;
            showSPLStatus('✅ تم حفظ إعدادات الشحن بنجاح!', 'success');
        } catch(e) {
            showSPLStatus('❌ خطأ: ' + (e.message || 'مشكلة في الحفظ'), 'error');
        }
    };

    function showSPLStatus(text, type) {
        const msg = document.getElementById('splStatusMsg');
        msg.textContent = text;
        msg.style.display = 'block';
        msg.style.background = type === 'success' ? 'rgba(0,255,136,0.1)' : 'rgba(239,68,68,0.1)';
        msg.style.color = type === 'success' ? '#00ff88' : '#EF4444';
        msg.style.border = type === 'success' ? '1px solid rgba(0,255,136,0.3)' : '1px solid rgba(239,68,68,0.3)';
        setTimeout(() => { msg.style.display = 'none'; }, 4000);
    }

    // ========== 5. دوال أسعار الشحن ==========
    window.loadShippingRates = async function() {
        const tbody = document.getElementById('shippingRatesTable');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">⏳ جاري التحميل...</td></tr>';

        try {
            const { data, error } = await supabaseClient
                .from('shipping_rates')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">لا يوجد أسعار مسجلة</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(r => `
                <tr>
                    <td>${r.from_city}</td>
                    <td>${r.to_city}</td>
                    <td>${r.weight_kg}</td>
                    <td>${r.price_sar} ر.س</td>
                    <td>${r.estimated_days} يوم</td>
                    <td><button class="btn-add" style="padding:6px 12px;font-size:12px;background:rgba(239,68,68,0.2);color:#EF4444;" onclick="deleteRate('${r.id}')">🗑️</button></td>
                </tr>
            `).join('');
        } catch(e) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#EF4444;">خطأ في التحميل</td></tr>';
        }
    };

    window.openRateModal = function() {
        document.getElementById('rateFromCity').value = 'الرياض';
        document.getElementById('rateToCity').value = 'جدة';
        document.getElementById('rateWeight').value = '1';
        document.getElementById('ratePrice').value = '';
        document.getElementById('rateDays').value = '2';
        document.getElementById('rateModal').style.display = 'flex';
    };

    window.closeRateModal = function() {
        document.getElementById('rateModal').style.display = 'none';
    };

    window.saveShippingRate = async function(e) {
        e.preventDefault();
        const rate = {
            from_city: document.getElementById('rateFromCity').value,
            to_city: document.getElementById('rateToCity').value,
            weight_kg: parseFloat(document.getElementById('rateWeight').value) || 1,
            price_sar: parseFloat(document.getElementById('ratePrice').value) || 0,
            estimated_days: parseInt(document.getElementById('rateDays').value) || 2,
            provider: 'spl',
            created_at: new Date().toISOString()
        };
        if (!rate.price_sar) { alert('❌ أدخل السعر!'); return; }

        try {
            const { error } = await supabaseClient.from('shipping_rates').insert([rate]);
            if (error) throw error;
            alert('✅ تم إضافة السعر!');
            closeRateModal();
            loadShippingRates();
        } catch(e) {
            alert('❌ خطأ: ' + (e.message || 'مشكلة في الحفظ'));
        }
        return false;
    };

    window.deleteRate = async function(id) {
        if (!confirm('هل أنت متأكد من الحذف؟')) return;
        try {
            const { error } = await supabaseClient.from('shipping_rates').delete().eq('id', id);
            if (error) throw error;
            loadShippingRates();
        } catch(e) { alert('❌ خطأ في الحذف'); }
    };

    // ========== 6. ربط التابات الجديدة مع showTab الأصلية ==========
    const originalShowTab = window.showTab;
    window.showTab = function(tabName) {
        // ننادي الفنكشن الأصلي لو موجود
        if (originalShowTab) originalShowTab(tabName);

        // نخفي كل التابات الجديدة
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

        // نفعل التاب المختار
        const target = document.getElementById(tabName + 'Tab');
        if (target) target.classList.add('active');

        // نفعل الزرار
        const buttons = document.querySelectorAll('.tab-btn');
        buttons.forEach(btn => {
            if (btn.textContent.includes(tabName === 'inventory' ? 'المخزون' : tabName === 'shipping' ? 'الشحن' : '')) {
                btn.classList.add('active');
            }
        });

        // نحمل البيانات
        if (tabName === 'inventory') loadInventory();
        if (tabName === 'shipping') { loadSPLSettings(); loadShippingRates(); }
    };

    // ========== 7. إعداد SQL للجداول الجديدة (نسخ/لصق في Supabase) ==========
    window.splSQLSetup = `-- انسخ هذا الكود في Supabase SQL Editor
CREATE TABLE IF NOT EXISTS shipping_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT DEFAULT 'spl',
    api_key TEXT,
    account_number TEXT,
    secret_key TEXT,
    base_url TEXT DEFAULT 'https://api.spl.sa',
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_city TEXT,
    to_city TEXT,
    weight_kg NUMERIC DEFAULT 1,
    price_sar NUMERIC DEFAULT 0,
    provider TEXT DEFAULT 'spl',
    estimated_days INTEGER DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE shipping_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_shipping_settings" ON shipping_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_shipping_rates" ON shipping_rates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_read_rates" ON shipping_rates FOR SELECT USING (true);

INSERT INTO shipping_settings (provider, api_key, account_number, enabled)
VALUES ('spl', '', '', false) ON CONFLICT DO NOTHING;
`;

    // ========== بدء التشغيل ==========
    initSPL();

})();
