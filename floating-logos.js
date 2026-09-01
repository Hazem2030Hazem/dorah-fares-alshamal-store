// ============================================================
// LIVING BANNER — لوجوهات الشركة بتطفو وتتحرك جوه البانر
// ============================================================
(function(){
  function spawnFloatingLogos(hero){
    if (!hero || hero.querySelector('.floating-logos')) return;
    var layer = document.createElement('div');
    layer.className = 'floating-logos';
    var count = window.innerWidth < 768 ? 8 : 14;
    for (var i = 0; i < count; i++){
      var img = document.createElement('img');
      img.src = 'logo-icon.png';
      img.alt = '';
      img.className = 'float-logo fl' + (1 + (i % 4));
      var size = 50 + Math.random() * 120;
      img.style.width = size.toFixed(0) + 'px';
      var lx = Math.random() * 92, ty = Math.random() * 82;
      img.style.left = lx.toFixed(1) + '%';
      img.style.top = ty.toFixed(1) + '%';
      var inCenter = (lx > 28 && lx < 62 && ty > 25 && ty < 72);
      img.style.opacity = inCenter ? (0.12 + Math.random() * 0.13).toFixed(2)
                                   : (0.38 + Math.random() * 0.4).toFixed(2);
      img.style.animationDuration = (3.5 + Math.random() * 5.5).toFixed(1) + 's';
      img.style.animationDelay = (-Math.random() * 8).toFixed(1) + 's';
      var f=''; if (Math.random()<0.3) f+='blur('+(1+Math.random()*1.6).toFixed(1)+'px) ';
      f+='drop-shadow(0 0 16px rgba(90,145,255,.6))'; img.style.filter=f;
      layer.appendChild(img);
    }
    hero.insertBefore(layer, hero.firstChild);
  }
  function initFloating(){
    document.querySelectorAll('.hero, .page-hero, .service-hero, .services-hero').forEach(spawnFloatingLogos);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initFloating);
  else initFloating();
})();
