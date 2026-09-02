// ============================================================
// UI UTILITIES — دوال واجهة المستخدم المشتركة (Toast + modals)
// ============================================================
(function() {
    'use strict';

    window.showToast = function(message, type) {
        const toast = document.getElementById('toast');
        const icon = document.getElementById('toastIcon');
        const msg = document.getElementById('toastMsg');

        if (!toast || !msg) {
            // fallback إذا لم تكن عناصر Toast موجودة
            if (type === 'error') console.error(message);
            else if (type === 'warning') console.warn(message);
            else console.log(message);
            return;
        }

        msg.textContent = message;
        if (icon) {
            icon.className = 'toast-icon';
            switch(type) {
                case 'success': icon.classList.add('success'); icon.textContent = '✅'; break;
                case 'error': icon.classList.add('error'); icon.textContent = '❌'; break;
                case 'warning': icon.classList.add('warning'); icon.textContent = '⚠️'; break;
                default: icon.textContent = 'ℹ️';
            }
        }

        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 10000);
    };
})();
