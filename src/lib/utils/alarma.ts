// Alarma sonora + vibración para temporizadores (descansos y bloques AMRAP/circuito).
export function reproducirAlarma(): void {
  try {
    const AudioContextConstructor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (AudioContextConstructor) {
      const audioContext = new AudioContextConstructor();
      const ahora = audioContext.currentTime;
      const frecuencias = [880, 1046, 880];

      frecuencias.forEach((frecuencia, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const inicio = ahora + index * 0.22;
        const fin = inicio + 0.16;

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frecuencia, inicio);
        gain.gain.setValueAtTime(0.0001, inicio);
        gain.gain.exponentialRampToValueAtTime(0.2, inicio + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, fin);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(inicio);
        oscillator.stop(fin);
      });

      window.setTimeout(() => {
        void audioContext.close();
      }, 1000);
    }

    if (navigator.vibrate) {
      navigator.vibrate([200, 80, 200]);
    }
  } catch {
    // Algunos navegadores bloquean audio programático. En ese caso, solo no suena.
  }
}
