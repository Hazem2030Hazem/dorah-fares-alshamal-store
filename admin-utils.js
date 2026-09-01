/* ============================================================
   درة فارس الشمال — أدوات مساعدة مشتركة للوحة الإدارة
   ============================================================ */
(function(){
'use strict';

window.adminUtils = {
  esc: function(v){ return String(v??'').replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];}); },
  dateAr: function(v){ if(!v)return'—';try{return new Date(v).toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'})}catch(_){return String(v)} },
  money: function(v){ return Number(v||0).toLocaleString('ar-SA')+' ر.س'; },
  adminToast: function(m,t){ if(typeof showToast==='function')showToast(m,t);else alert(m); },
  options: function(map,cur){ return Object.entries(map).map(function(_ref){ var v=_ref[0],l=_ref[1]; return '<option value="'+v+'" '+(v===cur?'selected':'')+'>'+l+'</option>'; }).join(''); },
  formVal: function(id){var el=document.getElementById(id);return el?el.value.trim():'';},
  formSet: function(id,v){var el=document.getElementById(id);if(el)el.value=(v===null||v===undefined?'':v);},
  loadAdminScript: function(src,globalName){
    if(globalName&&window[globalName])return Promise.resolve();
    if(!window.__adminScriptsLoaded) window.__adminScriptsLoaded={};
    if(window.__adminScriptsLoaded[src])return window.__adminScriptsLoaded[src];
    window.__adminScriptsLoaded[src]=new Promise(function(resolve,reject){
      var s=document.createElement('script');s.src=src;s.async=true;
      s.onload=function(){resolve();};
      s.onerror=function(){window.__adminScriptsLoaded[src]=null;reject(new Error('تعذر تحميل: '+src));};
      document.head.appendChild(s);
    });
    return window.__adminScriptsLoaded[src];
  }
};

// تصدير مختصر للنطاق العام ( backwards compatibility )
window.escAdmin = window.adminUtils.esc;
window.dateArAdmin = window.adminUtils.dateAr;
window.moneyAdmin = window.adminUtils.money;
window.adminToast = window.adminUtils.adminToast;
window.optionsAdmin = window.adminUtils.options;
window.formVal = window.adminUtils.formVal;
window.formSet = window.adminUtils.formSet;
window.loadAdminScript = window.adminUtils.loadAdminScript;

})();
