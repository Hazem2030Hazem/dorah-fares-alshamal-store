// ==================== AUDIO CONTROLLER ====================
// تحكم يدوي بالصوت — لا يتم التشغيل التلقائي إلا بعد تفاعل المستخدم

(function() {
    'use strict';

    const AUDIO_URL = 'https://raw.githubusercontent.com/Hazem2030Hazem/dorah-fares-alshamal-store/refs/heads/main/music.mp3';

    let audio = null;
    let isPlaying = false;

    function createAudio() {
        if (audio) return audio;
        if (window.doraAudio) { audio = window.doraAudio; return audio; }
        audio = new Audio(AUDIO_URL);
        audio.loop = true;
        audio.volume = 0.30;
        audio.preload = 'metadata';
        window.doraAudio = audio;
        return audio;
    }

    window.toggleAudio = function() {
        if (!audio) audio = createAudio();
        if (isPlaying) {
            audio.pause();
            isPlaying = false;
        } else {
            audio.play().then(() => {
                isPlaying = true;
            }).catch((e) => console.log('❌ Toggle failed:', e));
        }
        updateSpeakerIcon();
    };

    function updateSpeakerIcon() {
        const svg = document.getElementById('speakerIconSvg');
        if (!svg) return;
        if (isPlaying) {
            svg.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
            svg.style.opacity = '1';
            svg.style.filter = 'drop-shadow(0 0 8px rgba(16,185,129,0.8))';
        } else {
            svg.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>';
            svg.style.opacity = '0.5';
            svg.style.filter = 'none';
        }
    }

    // لا تشغيل تلقائي — نكتفي بتهيئة العنصر فقط
    function init() {
        createAudio();
        updateSpeakerIcon();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
