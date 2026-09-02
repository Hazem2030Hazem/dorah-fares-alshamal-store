        // تسجيل Service Worker من الصفحة نفسها — شرط أساسي للتثبيت
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(function(){});
        }

        var deferredPrompt = null;

        window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredPrompt = e;
            document.getElementById('installMsg').textContent = '✅ التطبيق جاهز للتثبيت — اضغط الزرار';
        });

        // هل التطبيق مثبت بالفعل على هذا الجهاز؟
        function isAppInstalled() {
            if (window.matchMedia('(display-mode: standalone)').matches) return true;
            if (window.navigator.standalone === true) return true;
            return false;
        }

        function toggleSteps(id) {
            var el = document.getElementById(id);
            el.classList.toggle('show');
        }

        function installDesktop() {
            var msg = document.getElementById('installMsg');
            if (isAppInstalled()) {
                msg.textContent = '✅ التطبيق مثبت بالفعل على جهازك — افتحه من قائمة البرامج';
                document.getElementById('updateBtn').style.display = 'inline-flex';
                return;
            }
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(function(choice) {
                    if (choice.outcome === 'accepted') {
                        msg.textContent = '✅ تم تثبيت التطبيق بنجاح — ستجده في قائمة البرامج';
                    } else {
                        msg.textContent = '';
                        toggleSteps('desktopSteps');
                    }
                    deferredPrompt = null;
                });
            } else {
                toggleSteps('desktopSteps');
                msg.textContent = '⚠️ لو التطبيق اتثبت قبل كده لازم تمسحه الأول (شرح بالأسفل) — أو استخدم أيقونة التثبيت في شريط العنوان';
            }
        }

        // تحديث إجباري: حذف الكاش + تحديث الـ Service Worker
        async function updateApp() {
            var msg = document.getElementById('installMsg');
            var btn = document.getElementById('updateBtn');
            btn.disabled = true;
            btn.textContent = '⏳ جاري التحديث...';
            try {
                if ('caches' in window) {
                    var names = await caches.keys();
                    await Promise.all(names.map(function(n){ return caches.delete(n); }));
                }
                if ('serviceWorker' in navigator) {
                    var regs = await navigator.serviceWorker.getRegistrations();
                    for (var i = 0; i < regs.length; i++) { await regs[i].update(); }
                }
                msg.textContent = '✅ تم التحديث بنجاح — افتح التطبيق من قائمة البرامج وستجد أحدث نسخة';
            } catch (e) {
                msg.textContent = '⚠️ أغلق التطبيق وافتحه من جديد — سيتحدث تلقائيًا';
            }
            btn.disabled = false;
            btn.innerHTML = '🔄 تحديث النسخة المثبتة';
        }

        // عرض حالة التثبيت عند فتح الصفحة
        window.addEventListener('load', function() {
            if (isAppInstalled()) {
                document.getElementById('installMsg').textContent = '✅ التطبيق مثبت بالفعل على جهازك';
                document.getElementById('updateBtn').style.display = 'inline-flex';
            }
        });

        if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
            document.getElementById('desktopSteps').classList.add('show');
        }
