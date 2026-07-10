// ==================== AUDIO AUTO-PLAY ====================
// Simple and stable audio autoplay for Dorat Fares Al-Shamal

(function() {
    'use strict';

    // Your custom audio file from GitHub
    const AUDIO_URL = 'https://raw.githubusercontent.com/Hazem2030Hazem/dorah-fares-alshamal-store/refs/heads/main/music.mp3';

    let audio = null;
    let isPlaying = false;

    // Create audio element
    function createAudio() {
        if (audio) return audio;

        audio = new Audio(AUDIO_URL);
        audio.loop = true;
        audio.volume = 0.30; // 30% volume
        audio.preload = 'auto';

        return audio;
    }

    // Try to play
    function tryPlay() {
        if (isPlaying || !audio) return;

        audio.play().then(() => {
            isPlaying = true;
            console.log('✅ Audio playing');
        }).catch((err) => {
            console.log('⚠️ Autoplay blocked, waiting for user interaction...');
            // Wait for first click
            document.addEventListener('click', function playOnClick() {
                audio.play().then(() => {
                    isPlaying = true;
                    console.log('✅ Audio playing after click');
                }).catch((e) => console.log('❌ Audio failed:', e));
                document.removeEventListener('click', playOnClick);
            }, { once: true });
        });
    }

    // Toggle function for button
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
    };

    // Initialize
    function init() {
        createAudio();
        tryPlay();

        // Try again after 1 second
        setTimeout(tryPlay, 1000);
    }

    // Run when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
