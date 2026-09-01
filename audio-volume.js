// ============================================================
// AUDIO VOLUME CONTROL — التحكم في مستوى الصوت
// ============================================================
(function(){
  'use strict';

  let currentVolume = 0.30;
  let audioVolumePopupOpen = false;
  let isDraggingVolume = false;

  function showAudioToast(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type);
  }

  function getAudioElement() {
    if (window.doraAudio) return window.doraAudio;
    const audios = document.querySelectorAll('audio');
    if (audios.length > 0) return audios[0];
    const AUDIO_URL = 'https://raw.githubusercontent.com/Hazem2030Hazem/dorah-fares-alshamal-store/refs/heads/main/music.mp3';
    const newAudio = new Audio(AUDIO_URL);
    newAudio.loop = true;
    newAudio.volume = 0.30;
    newAudio.preload = 'auto';
    window.doraAudio = newAudio;
    return newAudio;
  }

  function setAudioVolume(percentage) {
    const normalizedVolume = percentage / 100;
    const gainValue = Math.min(2.0, normalizedVolume * normalizedVolume * 2);
    const audio = getAudioElement();
    if (audio) {
      audio.volume = Math.min(1.0, gainValue);
    }
  }

  function toggleAudioVolumePopup(e) {
    if (e) e.stopPropagation();
    const popup = document.getElementById('audioVolumePopup');
    if (!popup) return;
    audioVolumePopupOpen = !audioVolumePopupOpen;
    if (audioVolumePopupOpen) {
      popup.classList.add('show');
      const audio = getAudioElement();
      if (audio) {
        const vol = audio.volume * 100;
        const fill = document.getElementById('volumeSliderFill');
        const value = document.getElementById('volumeValue');
        if (fill) fill.style.width = vol + '%';
        if (value) value.textContent = Math.round(vol) + '%';
      }
    } else {
      popup.classList.remove('show');
    }
  }

  function setVolumeFromClick(e) {
    if (e) e.stopPropagation();
    const slider = document.getElementById('volumeSlider');
    if (!slider) return;
    const rect = slider.getBoundingClientRect();
    const sliderWidth = rect.width;
    const clickX = e.clientX - rect.left;
    let percentage = 100 - ((clickX / sliderWidth) * 100);
    percentage = Math.max(0, Math.min(100, percentage));
    currentVolume = percentage / 100;
    const fill = document.getElementById('volumeSliderFill');
    const thumb = document.getElementById('volumeSliderThumb');
    const value = document.getElementById('volumeValue');
    if (fill) fill.style.width = percentage + '%';
    if (thumb) {
      thumb.style.left = 'auto';
      thumb.style.right = (percentage - 1) + '%';
    }
    if (value) value.textContent = Math.round(percentage) + '%';
    setAudioVolume(percentage);
  }

  function updateSpeakerIcon() {
    var icon = document.getElementById('speakerIcon');
    if (!icon) return;
    var audio = getAudioElement();
    var isMuted = window.doraAudioMuted || (audio && audio.muted) || currentVolume === 0;
    if (isMuted) {
      icon.innerHTML = '<line x1="1" y1="1" x2="23" y2="23"></line><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>';
    } else {
      icon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
    }
  }

  function toggleMute() {
    const audio = getAudioElement();
    if (!audio) {
      showAudioToast('❌ الصوت غير متاح حالياً');
      return;
    }
    if (currentVolume > 0) {
      audio._lastVolume = currentVolume;
      currentVolume = 0;
      window.doraAudioMuted = true;
      audio.volume = 0;
      audio.muted = true;
      const fill = document.getElementById('volumeSliderFill');
      const thumb = document.getElementById('volumeSliderThumb');
      const value = document.getElementById('volumeValue');
      if (fill) fill.style.width = '0%';
      if (thumb) thumb.style.right = '0%';
      if (value) value.textContent = '0%';
      showAudioToast('🔇 تم كتم الصوت');
    } else {
      currentVolume = audio._lastVolume || 0.30;
      window.doraAudioMuted = false;
      audio.volume = currentVolume;
      audio.muted = false;
      const fill = document.getElementById('volumeSliderFill');
      const thumb = document.getElementById('volumeSliderThumb');
      const value = document.getElementById('volumeValue');
      if (fill) fill.style.width = (currentVolume * 100) + '%';
      if (thumb) thumb.style.right = ((currentVolume * 100) - 1) + '%';
      if (value) value.textContent = Math.round(currentVolume * 100) + '%';
      showAudioToast('🔊 تم تشغيل الصوت');
    }
    updateSpeakerIcon();
  }

  // تصدير للنطاق العام
  window.getAudioElement = getAudioElement;
  window.setAudioVolume = setAudioVolume;
  window.toggleAudioVolumePopup = toggleAudioVolumePopup;
  window.setVolumeFromClick = setVolumeFromClick;
  window.toggleMute = toggleMute;
  window.updateSpeakerIcon = updateSpeakerIcon;

  // إغلاق النافذة عند الضغط خارجها
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.audio-toggle-wrapper')) {
      const popup = document.getElementById('audioVolumePopup');
      if (popup) {
        popup.classList.remove('show');
        audioVolumePopupOpen = false;
      }
    }
  });

  // ربط events السلايدر
  document.addEventListener('DOMContentLoaded', function() {
    const slider = document.getElementById('volumeSlider');
    if (slider) {
      slider.addEventListener('mousedown', function(e) {
        isDraggingVolume = true;
        setVolumeFromClick(e);
      });
    }
    document.addEventListener('mousemove', function(e) {
      if (isDraggingVolume) { setVolumeFromClick(e); }
    });
    document.addEventListener('mouseup', function() { isDraggingVolume = false; });
    document.addEventListener('touchmove', function(e) {
      if (isDraggingVolume && e.touches[0]) {
        const touch = e.touches[0];
        const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY, stopPropagation: function() {} };
        setVolumeFromClick(mouseEvent);
      }
    });
    document.addEventListener('touchend', function() { isDraggingVolume = false; });
  });
})();
