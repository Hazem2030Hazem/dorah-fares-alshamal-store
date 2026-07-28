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
