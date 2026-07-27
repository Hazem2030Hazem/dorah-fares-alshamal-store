// ============================================================
// 🤖 DORA SMART CHATBOT - OpenAI via Supabase Edge Function
// ============================================================

var doraChatbot = {
    isOpen: false,
    messages: [],
    conversationHistory: [],
    
    getSystemPrompt: function() {
        var pageTitle = document.title || 'الموقع';
        var pageUrl = window.location.href;
        var isProduct = pageUrl.includes('product');
        var isCart = pageUrl.includes('cart') || pageUrl.includes('checkout');
        var isHome = pageUrl === window.location.origin + '/' || pageUrl.includes('index');
        
        var context = 'أنت مساعد ذكي لشركة درة فارس الشمال - شركة سعودية متخصصة في بيع وتوريد: الطابعات، الكمبيوتر، الرامات، الهاردات، البروجكتور، الإكسسوارات، الأحبار، والمواد الغذائية.\n\n';
        context += 'معلومات الشركة:\n- الهاتف: 0568717449\n- واتساب: 0545358773\n- الشحن لجميع مدن المملكة\n- شحن مجاني للطلبات فوق 300 ريال\n- ضمان سنة على جميع المنتجات\n- نقبل: تحويل بنكي، STC Pay، مدى، أبل باي، تمارا للتقسيط\n\n';
        context += 'الكوبونات: WELCOME (خصم 15%)، DORA10 (خصم 10%)، DORA20 (خصم 20%)\n\n';
        context += 'العميل حالياً في صفحة: ' + pageTitle + '\n';
        
        if (isHome) context += 'العميل في الصفحة الرئيسية. ساعده في استكشاف المنتجات والخدمات.\n';
        if (isProduct) context += 'العميل بيتفرج على منتج. قدم له معلومات مفيدة عن المنتج واسأله لو عايز يعرف حاجة معينة.\n';
        if (isCart) context += 'العميل في صفحة السلة أو الدفع. ساعده في إتمام الطلب وذكره بالكوبونات.\n';
        
        context += '\nجاوب بالعربي. خلي إجاباتك مختصرة ومفيدة. استخدم إيموجي بسيط.';
        
        return context;
    },
    
    getResponse: async function(msg) {
        msg = msg.toLowerCase().trim();
        
        var quickReplies = {
            'السلام': 'وعليكم السلام! 👋 كيف أقدر أساعدك؟',
            'مرحبا': 'أهلاً وسهلاً! 🌟 أقدر أساعدك في أي استفسار عن منتجاتنا وخدماتنا.',
            'شكرا': 'العفو! 🌹 أي خدمة تانية؟',
            'باي': 'مع السلامة! 👋 يومك سعيد.'
        };
        
        for (var key in quickReplies) {
            if (msg === key || msg.indexOf(key) === 0) return quickReplies[key];
        }
        
        try {
                       var fullMessage = this.getSystemPrompt() + '\n\nسؤال العميل: ' + msg;
            
            var response = await fetch('https://kcbmvxuzjlaooknwhqqb.supabase.co/functions/v1/chat', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjYm12eHV6amxhb29rbndocXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NzkyMjAsImV4cCI6MjA5OTU1NTIyMH0.ayDpkfCKL90GcUKjbHQs7OvS5sxF1VSraWg58NHJ7ek'
                },
                body: JSON.stringify({ message: fullMessage })
            });
            
            var data = await response.json();
            var reply = data.reply;
            
            if (reply) return reply;
            });
            
            var data = await response.json();
            var reply = data.reply;
            
            if (reply) return reply;
        } catch(e) {
            console.log('AI fallback:', e);
        }
        
        var fallbackReplies = [
            '🤔 أقدر أساعدك في: الأسعار، الشحن، الضمان، المنتجات، الدفع، الكوبونات.',
            '📝 جرب تسأل عن: شحن، ضمان، سعر، خصم، دفع، تمارا، منتجات، خدمات.',
            '💡 محتاج مساعدة في إيه بالضبط؟',
            '👋 أنا هنا لخدمتك! اسألني أي حاجة عن منتجاتنا وخدماتنا.'
        ];
        return fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
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
    
    send: async function() {
        var input = document.getElementById('doraChatInput');
        var msg = input.value.trim();
        if (!msg) return;
        
        this.addMessage('أنت', msg, 'user');
        input.value = '';
        input.disabled = true;
        
        var typingDiv = document.createElement('div');
        typingDiv.className = 'dora-chat-msg bot typing';
        typingDiv.innerHTML = '<em>⏳ جاري الكتابة...</em>';
        document.getElementById('doraChatMessages').appendChild(typingDiv);
        
        var reply = await this.getResponse(msg);
        
        if (typingDiv.parentNode) typingDiv.parentNode.removeChild(typingDiv);
        
        this.addMessage('درة فارس', reply, 'bot');
        input.disabled = false;
        input.focus();
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
        var html = '<div id="doraChatWidget" style="display:none;position:fixed;bottom:30px;left:30px;z-index:99999;width:380px;max-width:90vw;background:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,0.2);direction:rtl;font-family:Tajawal,Cairo,sans-serif"><div style="background:linear-gradient(135deg,#6366F1,#8B5CF6);padding:20px 22px;display:flex;justify-content:space-between;align-items:center"><div style="display:flex;align-items:center;gap:14px"><div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center"><img src="robot.png" alt="Robot" style="width:48px;height:48px" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'<span style=font-size:32px>🤖</span>\'"></div><div><div style="color:white;font-weight:700;font-size:16px">درة فارس</div><div style="color:rgba(255,255,255,0.8);font-size:11px">✨ AI متصل</div></div></div><button onclick="document.getElementById(\'doraChatWidget\').style.display=\'none\';doraChatbot.isOpen=false;var b=document.getElementById(\'doraChatBubble\');if(b)b.style.display=\'flex\'" style="background:rgba(255,255,255,0.15);border:none;color:white;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:16px">✕</button></div><div id="doraChatMessages" style="height:320px;overflow-y:auto;padding:20px;background:#F8FAFC"><div class="dora-chat-msg bot">👋 أهلاً وسهلاً! أنا المساعد الذكي لشركة درة فارس الشمال. اسألني أي حاجة عن منتجاتنا، خدماتنا، الشحن، الضمان، والخصومات!</div></div><div style="display:flex;padding:16px 18px;background:white;border-top:1px solid #E8ECF1;gap:10px"><input id="doraChatInput" type="text" placeholder="اسألني أي حاجة..." onkeydown="if(event.key===\'Enter\')doraChatbot.send()" style="flex:1;padding:14px 18px;border-radius:30px;border:2px solid #E8ECF1;background:#F8FAFC;color:#1E293B;font-family:inherit;font-size:13px;outline:none"><button onclick="doraChatbot.send()" style="background:linear-gradient(135deg,#6366F1,#8B5CF6);color:white;border:none;width:46px;height:46px;border-radius:50%;cursor:pointer;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 15px rgba(99,102,241,0.4)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></button></div><div style="text-align:center;padding:10px;font-size:10px;color:#94A3B8;background:#F8FAFC">⚡ مدعوم بالذكاء الاصطناعي | درة فارس الشمال</div></div><style>.dora-chat-msg{padding:12px 16px;margin:6px 0;border-radius:16px;font-size:13px;line-height:1.7;max-width:92%}.dora-chat-msg.user{background:#EFF6FF;color:#1E40AF;margin-right:auto;text-align:right}.dora-chat-msg.bot{background:white;border:1px solid #E8ECF1;margin-left:auto;text-align:right}#doraChatMessages::-webkit-scrollbar{width:4px}#doraChatMessages::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:10px}</style>';
        document.body.insertAdjacentHTML('beforeend', html);
    }
};

window.doraChatbot = doraChatbot;

// أيقونة الروبوت
(function(){
    if (document.getElementById('doraChatBubble')) return;
    var wrapper = document.createElement('div');
    wrapper.id = 'doraChatBubbleWrapper';
    wrapper.style.cssText = 'position:fixed;bottom:30px;left:30px;z-index:99998;display:flex;align-items:flex-end;gap:12px';
    
    var greeting = document.createElement('div');
    greeting.innerHTML = '👋 أهلاً! اسألني أي حاجة';
    greeting.style.cssText = 'background:white;color:#1E293B;padding:12px 18px;border-radius:20px 20px 4px 20px;font-size:13px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,0.15);white-space:nowrap;font-family:Tajawal,sans-serif';
    
    var bubble = document.createElement('div');
    bubble.id = 'doraChatBubble';
    bubble.style.cssText = 'width:75px;height:75px;cursor:pointer;transition:0.3s;filter:drop-shadow(0 6px 20px rgba(99,102,241,0.4))';
    bubble.innerHTML = '<img src="robot.png" alt="Robot" style="width:75px;height:75px">';
    
    bubble.onclick = function() { doraChatbot.toggle(); greeting.style.display = 'none'; };
    
    wrapper.appendChild(greeting);
    wrapper.appendChild(bubble);
    document.body.appendChild(wrapper);
    setTimeout(function() { greeting.style.display = 'none'; }, 5000);
})();

setInterval(function(){var b=document.getElementById('doraChatBubble');var w=document.getElementById('doraChatWidget');if(b&&w&&w.style.display==='none'&&b.style.display==='none'){b.style.display='flex';}},1000);
