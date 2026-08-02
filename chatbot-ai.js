// ============================================================
// 🤖 DORA SMART CHATBOT - المساعد الذكي
// ============================================================

var doraChatbot = {
    isOpen: false,
    messages: [],
    
    getResponse: function(msg) {
        msg = msg.toLowerCase().trim();
        
        var knowledgeBase = {
            'السلام': 'وعليكم السلام! 👋 كيف أقدر أساعدك؟',
            'مرحبا': 'أهلاً وسهلاً! 🌟 أنا المساعد الذكي لشركة درة فارس الشمال. أسألني عن: المنتجات، الأسعار، الشحن، الضمان، الدفع، الخصومات، أو أي خدمة تانية!',
            'شحن': '🚚 نوفر شحن لجميع مدن المملكة عبر ناقل وأرامكس وسمسا. الشحن مجاني للطلبات فوق 300 ريال. مدة التوصيل 2-5 أيام عمل.',
            'توصيل': '🚚 نوصل لجميع مناطق المملكة عبر ناقل وأرامكس وسمسا. مدة التوصيل 2-5 أيام عمل.',
            'ضمان': '🛡️ جميع المنتجات عليها ضمان سنة كاملة ضد عيوب التصنيع. نقدر نساعدك في أي مشكلة تواجهك!',
            'سعر': '💰 أسعارنا تنافسية جداً! تقدر تتصفح المنتجات وتشوف الأسعار. ولو عايز عرض سعر مخصص، ابعتلنا على واتساب.',
            'خصم': '🎟️ عندنا كوبونات خصم ممتازة! استخدم كود WELCOME لخصم 15% على أول طلب، DORA10 لخصم 10%، DORA20 لخصم 20%.',
            'كوبون': '🎟️ الكوبونات المتاحة: WELCOME (خصم 15%) - DORA10 (خصم 10%) - DORA20 (خصم 20%). انسخ الكود واستخدمه في صفحة الدفع.',
            'دفع': '💳 نقبل جميع وسائل الدفع: تحويل بنكي، STC Pay، مدى، أبل باي، فيزا، ماستركارد، وتمارا للتقسيط على 4 دفعات بدون فوائد!',
            'تمارا': '🧡 تقدر تقسط مشترياتك على 4 دفعات بدون أي فوائد مع تمارا. اختار تمارا عند الدفع.',
            'واتساب': '💬 تقدر تتواصل معانا مباشرة على واتساب: 0545358773. أو تضغط على أيقونة واتساب في الموقع.',
            'اتصال': '📞 تقدر تتصل بنا على: 0568717449. خدمة العملاء متاحة من 9 صباحاً لـ 9 مساءً.',
            'منتجات': '🛍️ عندنا تشكيلة واسعة: طابعات HP و Canon و Epson و Brother، أجهزة كمبيوتر Dell و Lenovo و HP، رامات، هاردات، بروجكتور، إكسسوارات، أحبار، ومواد غذائية. تقدر تتصفحهم كلهم في صفحة المنتجات!',
            'خدمات': '🔧 نقدم خدمات متكاملة: طباعة، كاميرات مراقبة، نقاط بيع، شبكات، باركود، صيانة أجهزة. تقدر تطلب خدمة من الموقع.',
            'طابعة': '🖨️ عندنا طابعات HP و Canon و Epson و Brother. ليزر وحبر. ألوان وأبيض وأسود. تقدر تشوفهم في قسم الطابعات.',
            'كمبيوتر': '💻 عندنا أجهزة كمبيوتر Dell و Lenovo و HP. مكتبي ومحمول. بمواصفات مختلفة لكل الاحتياجات.',
            'طلب': '📦 تقدر تطلب من الموقع مباشرة! أضف المنتجات للسلة، اختار طريقة الدفع، وهنوصلك لحد باب البيت.',
            'تتبع': '📍 تقدر تتابع حالة طلبك من حسابك في الموقع. لو محتاج مساعدة، ابعتلنا على واتساب.',
            'استرجاع': '🔄 نقبل استرجاع المنتجات خلال 14 يوم من تاريخ الاستلام. المنتج يكون بحالته الأصلية وفي كرتونه.',
            'شكرا': 'العفو! 🌹 مبسوطين إننا قدرنا نساعدك. أي خدمة تانية؟',
            'باي': 'مع السلامة! 👋 يومك سعيد. وإن احتجت أي حاجة، أنا موجود.',
            'عرض سعر': '📋 تقدر تطلب عرض سعر مخصص من واتساب (0545358773) أو من أي صفحة منتج. هتلاقي زرار "عرض سعر" في كل المنتجات.',
            'مساعدة': '👋 أنا هنا لخدمتك! تقدر تسألني عن:\n📦 المنتجات\n💰 الأسعار والعروض\n🚚 الشحن والتوصيل\n🛡️ الضمان\n💳 طرق الدفع\n🎟️ الكوبونات والخصومات\n🔧 الخدمات\n📋 عروض الأسعار',
        };
        
        for (var key in knowledgeBase) {
            if (msg.indexOf(key) !== -1) return knowledgeBase[key];
        }
        
        var replies = [
            '🤔 سؤال جميل! ممكن توضح أكتر عشان أقدر أساعدك بشكل أفضل؟',
            '📝 عندي معلومات كتير عن المنتجات، الأسعار، الشحن، والضمان. ممكن تسألني عن أي حاجة فيهم.',
            '💡 جرب تسأل عن: شحن، ضمان، أسعار، خصومات، دفع، تمارا، منتجات، خدمات. أنا موجود عشان أساعدك!',
            '👋 أنا المساعد الذكي لدرة فارس الشمال. أقدر أجاوبك عن أي استفسار عن منتجاتنا وخدماتنا. جرب تسأل!'
        ];
        return replies[Math.floor(Math.random() * replies.length)];
    },
    
    show: function() {
        if (!document.getElementById('doraChatWidget')) this.create();
        document.getElementById('doraChatWidget').style.display = 'block';
        this.isOpen = true;
        var btn = document.getElementById('doraChatBubble');
        if (btn) btn.style.display = 'none';
    },
    
    hide: function() {
        document.getElementById('doraChatWidget').style.display = 'none';
        this.isOpen = false;
    },
    
    toggle: function() {
        this.isOpen ? this.hide() : this.show();
    },
    
    send: function() {
        var input = document.getElementById('doraChatInput');
        var msg = input.value.trim();
        if (!msg) return;
        
        this.addMessage('أنت', msg, 'user');
        input.value = '';
        
        var reply = this.getResponse(msg);
        var self = this;
        setTimeout(function() {
            self.addMessage('درة فارس', reply, 'bot');
        }, 500 + Math.random() * 500);
    },
    
    addMessage: function(sender, text, type) {
        var container = document.getElementById('doraChatMessages');
        var div = document.createElement('div');
        div.className = 'dora-chat-msg ' + type;
        div.innerHTML = '<strong>' + sender + ':</strong> ' + text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },
    
    quickAsk: function(topic) {
        document.getElementById('doraChatInput').value = topic;
        this.send();
    },

    create: function() {
        var html = '<div id="doraChatWidget" style="display:none;position:fixed;bottom:30px;left:30px;z-index:99999;width:380px;max-width:90vw;background:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,0.2);direction:rtl;font-family:Tajawal,Cairo,sans-serif"><div style="background:#1E1B4B;padding:20px 22px;display:flex;justify-content:space-between;align-items:center"><div style="display:flex;align-items:center;gap:14px"><div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center"><img src="robot.png" alt="Robot" style="width:48px;height:48px" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'<span style=font-size:32px>🤖</span>\'"></div><div><div style="color:white;font-weight:700;font-size:16px">درة فارس</div><div style="color:rgba(255,255,255,0.8);font-size:11px">🟢 متصل</div></div></div><button onclick="document.getElementById(\'doraChatWidget\').style.display=\'none\';doraChatbot.isOpen=false;var b=document.getElementById(\'doraChatBubble\');if(b)b.style.display=\'flex\'" style="background:rgba(255,255,255,0.15);border:none;color:white;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:16px">✕</button></div><div id="doraChatMessages" style="height:320px;overflow-y:auto;padding:20px;background:#F8FAFC"><div class="dora-chat-msg bot">👋 أهلاً وسهلاً! أنا المساعد الذكي لشركة درة فارس الشمال. أقدر أساعدك في أي استفسار عن منتجاتنا وخدماتنا. جرب تسأل عن: الشحن، الضمان، الأسعار، الخصومات، أو الدفع!</div></div><div style="display:flex;padding:16px 18px;background:white;border-top:1px solid #E8ECF1;gap:10px"><input id="doraChatInput" type="text" placeholder="اكتب سؤالك هنا..." onkeydown="if(event.key===\'Enter\')doraChatbot.send()" style="flex:1;padding:14px 18px;border-radius:30px;border:2px solid #E8ECF1;background:#F8FAFC;color:#1E293B;font-family:inherit;font-size:13px;outline:none"><button onclick="doraChatbot.send()" style="background:#1E1B4B;color:white;border:none;width:46px;height:46px;border-radius:50%;cursor:pointer;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 15px rgba(99,102,241,0.4)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></button></div><div style="text-align:center;padding:10px;font-size:10px;color:#94A3B8;background:#F8FAFC">⚡ درة فارس الشمال | في خدمتك دائماً</div></div><style>.dora-chat-msg{padding:12px 16px;margin:6px 0;border-radius:16px;font-size:13px;line-height:1.7;max-width:92%}.dora-chat-msg.user{background:#EFF6FF;color:#1E40AF;margin-right:auto;text-align:right}.dora-chat-msg.bot{background:white;border:1px solid #E8ECF1;margin-left:auto;text-align:right}#doraChatMessages::-webkit-scrollbar{width:4px}#doraChatMessages::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:10px}</style>';
        document.body.insertAdjacentHTML('beforeend', html);
    }
};

window.doraChatbot = doraChatbot;

// أيقونة الروبوت
(function(){
   // إلغاء تفعيل الروبوت العائم القديم
    return; 
    if (document.getElementById('doraChatBubble')) return;
    var wrapper = document.createElement('div');
    wrapper.id = 'doraChatBubbleWrapper';
    wrapper.style.cssText = 'position:fixed;bottom:30px;left:30px;z-index:99998;display:flex;align-items:flex-end;gap:12px';
    
    var greeting = document.createElement('div');
    greeting.innerHTML = 'راسلنا عبر البريد الإلكتروني';
    greeting.style.cssText = 'background:white;color:#1E293B;padding:12px 18px;border-radius:20px 20px 4px 20px;font-size:13px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,0.15);white-space:nowrap;font-family:Tajawal,sans-serif';
    
    var bubble = document.createElement('div');
    bubble.id = 'doraChatBubble';
    bubble.style.cssText = 'width:60px;height:60px;cursor:pointer;transition:0.3s;background:#0B7A4B;border:1px solid #0A6B42;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(11,122,75,0.4)';
    bubble.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>';
    
    bubble.onclick = function() {
        greeting.style.display = 'none';
        var email = 'info@alshamal-df.com';
        try { if (window.getDoraSiteSettings) { var s = window.getDoraSiteSettings(); if (s && s.companyEmail) email = s.companyEmail; } } catch(_) {}
        location.href = 'mailto:' + email + '?subject=' + encodeURIComponent('استفسار من موقع درة فارس الشمال');
    };
    
    wrapper.appendChild(greeting);
    wrapper.appendChild(bubble);
    document.body.appendChild(wrapper);
    setTimeout(function() { greeting.style.display = 'none'; }, 5000);
})();

setInterval(function(){var b=document.getElementById('doraChatBubble');var w=document.getElementById('doraChatWidget');if(b&&w&&w.style.display==='none'&&b.style.display==='none'){b.style.display='flex';}},1000);
// ============================================================
// 👾 ROBOT RESPONSE INTEGRATION (Update Bubble with Chatbot)
// ============================================================
(function(){
    // 1. Initial Welcome Message
    setTimeout(() => {
        const bubble = document.getElementById('robot-bubble');
        if (bubble) bubble.style.opacity = '1';
    }, 1000);

    // 2. Override the Bot Reply to update the bubble
    const originalAddMessage = window.doraChatbot.addMessage;
    window.doraChatbot.addMessage = function(sender, text, type) {
        // Keep the chat history intact
        if (originalAddMessage) {
            originalAddMessage.call(this, sender, text, type);
        }
        
        // Update the 2D Robot Bubble
        if (type === 'bot') {
            updateRobotMessage(text);
        }
    };
    
    // 3. Close Robot Bubble if Chat Widget is opened/closed
    const originalToggle = window.doraChatbot.toggle;
    window.doraChatbot.toggle = function() {
        const bubble = document.getElementById('robot-bubble');
        if (this.isOpen) {
            // Closing chat -> Show bubble back
            if (bubble) bubble.style.opacity = '1';
        } else {
            // Opening chat -> Hide bubble (so it's not blocked)
            if (bubble) bubble.style.opacity = '0';
        }
        if (originalToggle) {
            originalToggle.call(this);
        }
    };
})();
