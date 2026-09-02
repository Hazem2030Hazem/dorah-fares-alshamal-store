// ===== فلترة فئات الأسئلة الشائعة =====
document.querySelectorAll('.faq-category').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.faq-category').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    var cat = btn.getAttribute('data-category');
    document.querySelectorAll('.faq-item').forEach(function(item){
      item.style.display = (cat === 'all' || item.getAttribute('data-category') === cat) ? '' : 'none';
    });
  });
});

// ===== أكورديون فتح/قفل الإجابات =====
document.querySelectorAll('.faq-question').forEach(function(q){
  q.addEventListener('click', function(){
    var item = q.closest('.faq-item');
    var wasActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(function(i){ i.classList.remove('active'); });
    if (!wasActive) item.classList.add('active');
  });
});

// افتح أول سؤال افتراضياً
var firstItem = document.querySelector('.faq-item');
if (firstItem) firstItem.classList.add('active');
