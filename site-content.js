// ============================================================
// SITE CONTENT LOADER - يجيب المحتوى من site_items
// ============================================================
var doraContent = {
  cache: {},
  
  load: async function(sectionKey, containerId, renderFn) {
    var container = document.getElementById(containerId);
    if (!container) return;
    
    if (this.cache[sectionKey]) {
      renderFn(container, this.cache[sectionKey]);
      return;
    }
    
    try {
      var { data } = await supabaseClient
        .from('site_items')
        .select('*')
        .eq('section_key', sectionKey)
        .eq('is_active', true)
        .order('sort_order');
      
      this.cache[sectionKey] = data || [];
      renderFn(container, this.cache[sectionKey]);
    } catch(e) {
      console.log('Error loading ' + sectionKey, e);
    }
  }
};
// ============================================================
// إضافة روبوت 2D إلى جميع الصفحات (موجود في site-content.js)
// ============================================================
(function() {
    if (document.getElementById('chat-robot-container')) return;

    var container = document.createElement('div');
    container.id = 'chat-robot-container';
    container.onclick = function() { 
        if (typeof doraChatbot !== 'undefined' && doraChatbot.toggle) {
            doraChatbot.toggle(); 
        }
    };

    var bubble = document.createElement('div');
    bubble.id = 'robot-bubble';
    bubble.innerText = 'أهلاً! اسألني أي حاجة 🤖';

    var img = document.createElement('img');
    img.id = 'chat-robot-img';
    img.src = 'robot.png';
    img.alt = 'مساعد درة فارس';

    container.appendChild(bubble);
    container.appendChild(img);
    document.body.appendChild(container);
})();
