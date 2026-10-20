/* ABSHER BI - notification-sound.js */
(function () {
  'use strict';

  var soundEnabled = localStorage.getItem('absher_sound_enabled') !== '0';
  var vibrationEnabled = localStorage.getItem('absher_vibration_enabled') !== '0';
  var audioCtx = null;

  // ═══ Play a tone ═══
  function playTone(frequency, startTime, duration, volume) {
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume || 0.15, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // ═══ Sound like WhatsApp ═══
  function playSound() {
    if (!soundEnabled) return;

    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      var now = audioCtx.currentTime;

      // WhatsApp-style: 2 tones
      playTone(587.33, now, 0.12, 0.18);         // D5
      playTone(880, now + 0.13, 0.15, 0.18);     // A5
      playTone(1318.51, now + 0.30, 0.20, 0.15); // E6

    } catch (e) {
      console.warn('[Sound] Failed:', e.message);
    }
  }

  // ═══ Vibrate ═══
  function vibrate() {
    if (!vibrationEnabled) return;
    if (!navigator.vibrate) return;
    try {
      navigator.vibrate([100, 50, 100, 50, 200]);
    } catch (e) {}
  }

  function notifyWithFeedback() {
    playSound();
    vibrate();
  }

  // ═══ Toggle ═══
  function setSoundEnabled(enabled) {
    soundEnabled = enabled;
    localStorage.setItem('absher_sound_enabled', enabled ? '1' : '0');
  }

  function setVibrationEnabled(enabled) {
    vibrationEnabled = enabled;
    localStorage.setItem('absher_vibration_enabled', enabled ? '1' : '0');
  }

  // ═══ Unlock audio ═══
  function unlockAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.01);
      } catch (e) {}
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  ['click', 'touchstart', 'keydown'].forEach(function (evt) {
    document.addEventListener(evt, unlockAudio, { once: true, passive: true });
  });

  // ═══ Export ═══
  window.playNotificationSound = playSound;
  window.vibrateNotification = vibrate;
  window.notifyWithFeedback = notifyWithFeedback;
  window.setSoundEnabled = setSoundEnabled;
  window.setVibrationEnabled = setVibrationEnabled;
  window.isSoundEnabled = function () { return soundEnabled; };
  window.isVibrationEnabled = function () { return vibrationEnabled; };
})();
