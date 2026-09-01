// ============================================================
// إصلاحات التنقل العامة
// ============================================================

// لينك "الرئيسية": لو في صفحة داخلية يرجع لـ index.html بدل #home الفاضي
document.addEventListener('click', function(e){
  var a = e.target.closest('a[href="#home"]');
  if (!a) return;
  var path = window.location.pathname;
  var isHome = path === '/' || path === '' || /index\.html?$/.test(path);
  if (!isHome) {
    e.preventDefault();
    window.location.href = 'index.html';
  }
});

// إزالة وسم <base target="_blank"> عشان كل اللينكات تفتح في نفس التاب
(function(){
  function killBase(){ var b = document.querySelector('base[target]'); if (b) b.remove(); }
  killBase();
  document.addEventListener('DOMContentLoaded', killBase);
})();
