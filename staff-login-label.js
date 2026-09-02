/* عنوان شاشة الدخول حسب الدور القادم من بوابة الفريق (team-login.html?role=) */
(function () {
  var LABELS = { manager: '👔 دخول المدير', accountant: '📒 دخول المحاسب',
                 biller: '🧾 دخول المفوتر', hr: '👥 دخول الموارد البشرية',
                 support: '🎧 دخول خدمة العملاء',
                 viewer: '👁️ دخول المتابعة والعرض' };
  try {
    var r = new URLSearchParams(location.search).get('role');
    if (r && LABELS[r]) {
      document.getElementById('login-title').textContent = LABELS[r];
      document.getElementById('login-sub').textContent =
        'درة فارس الشمال — ' + LABELS[r].replace(/^[^ ]+ /, '');
    }
  } catch (e) {}
})();
