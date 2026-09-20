/* Optional Web Audio feedback. Every failure is intentionally silent. */
(function () {
  let context;
  function tone(frequency, duration, type, volume) {
    try {
      context = context || new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type || 'sine';
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      gain.gain.setValueAtTime(volume || 0.025, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + duration);
    } catch (_) { /* Sound is a bonus, never a dependency. */ }
  }
  window.IslandAudio = { click: () => tone(520, 0.07, 'sine', 0.022), choice: () => { tone(392, 0.10, 'triangle', 0.03); setTimeout(() => tone(587, 0.14, 'triangle', 0.025), 75); }, event: () => tone(175, 0.25, 'sine', 0.04), success: () => { tone(523, 0.12, 'triangle', 0.025); setTimeout(() => tone(784, 0.20, 'triangle', 0.027), 90); } };
})();
