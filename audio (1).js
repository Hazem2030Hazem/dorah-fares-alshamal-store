// ==================== AUDIO AUTO-PLAY ====================
// This file handles automatic audio playback across all pages
// Audio source: Vocaroo direct link

(function() {
    'use strict';

    // Audio file URL - Vocaroo direct link (CORRECT)
    const AUDIO_URL = 'https://media1.vocaroo.com/mp3/1nfxRhrC5dha';

    let audio = null;
    let audioPlaying = false;
    let initAttempts = 0;
    const MAX_ATTEMPTS = 3;

    // Initialize audio element
    function createAudio() {
        if (audio) return audio;

        audio = new Audio(AUDIO_URL);
        audio.loop = true;
        audio.volume = 0.20; // Low volume (20%)
        audio.preload = 'auto';

        // Add error handling
        audio.addEventListener('error', function(e) {
            console.log('❌ Audio error:', e);
        });

        return audio;
    }

    // Try to play audio
    function tryPlayAudio() {
        if (audioPlaying || !audio) return;

        initAttempts++;
        console.log('🎵 Trying to play audio (attempt ' + initAttempts + ')...');

        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                audioPlaying = true;
                console.log('✅ Audio auto-played successfully');
                updateAudioButtonState(true);
                localStorage.setItem('doraAudioPlaying', 'true');
            }).catch((error) => {
                console.log('⚠️ Auto-play blocked (attempt ' + initAttempts + '):', error.message);

                if (initAttempts < MAX_ATTEMPTS) {
                    setTimeout(tryPlayAudio, 1000);
                } else {
                    console.log('🔄 Waiting for user interaction...');
                    setupInteractionListeners();
                }
            });
        }
    }

    // Setup interaction listeners (fallback)
    function setupInteractionListeners() {
        const events = ['click', 'scroll', 'touchstart', 'keydown', 'mousemove'];

        function onInteraction() {
            if (!audioPlaying && audio) {
                audio.play().then(() => {
                    audioPlaying = true;
                    console.log('✅ Audio played after user interaction');
                    updateAudioButtonState(true);
                    localStorage.setItem('doraAudioPlaying', 'true');
                }).catch((e) => {
                    console.log('❌ Audio play failed:', e);
                });
            }

            events.forEach(event => {
                document.removeEventListener(event, onInteraction);
            });
        }

        events.forEach(event => {
            document.addEventListener(event, onInteraction, { once: true });
        });
    }

    // Update audio button visual state
    function updateAudioButtonState(playing) {
        const btn = document.querySelector('.audio-toggle');
        const icon = document.getElementById('speakerIcon');

        if (btn) {
            btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
            btn.style.opacity = playing ? '1' : '0.6';
        }

        if (icon) {
            icon.style.filter = playing ? 'brightness(1.5) contrast(1.2)' : 'brightness(0.8)';
        }
    }

    // Toggle audio function (for button)
    window.toggleAudio = function() {
        if (!audio) {
            audio = createAudio();
        }

        if (audioPlaying) {
            audio.pause();
            audioPlaying = false;
            updateAudioButtonState(false);
            localStorage.setItem('doraAudioPlaying', 'false');
        } else {
            audio.play().then(() => {
                audioPlaying = true;
                updateAudioButtonState(true);
                localStorage.setItem('doraAudioPlaying', 'true');
            }).catch((e) => {
                console.log('❌ Audio toggle failed:', e);
                showToast('❌ تعذر تشغيل الصوت', 'error');
            });
        }
    };

    // Initialize on page load
    function init() {
        audio = createAudio();

        // Try to play immediately
        tryPlayAudio();

        // Multiple retry attempts
        setTimeout(tryPlayAudio, 500);
        setTimeout(tryPlayAudio, 1500);
        setTimeout(tryPlayAudio, 3000);
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Also run on window load
    window.addEventListener('load', function() {
        if (!audioPlaying) {
            tryPlayAudio();
        }
    });

})();
