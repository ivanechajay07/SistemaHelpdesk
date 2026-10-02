// Sonido de notificación sintetizado (Web Audio), estilo app de mensajería.
// No requiere archivos de audio externos. Reutiliza un único AudioContext.

let audioCtx: AudioContext | null = null;

const getContext = (): AudioContext | null => {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  } catch {
    return null;
  }
};

/**
 * Reproduce un tono de notificación breve (dos notas descendentes y brillantes),
 * inspirado en el sonido de las apps de mensajería.
 */
export function playNotificationTone(enabled = true): void {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.value = 0.14;
  master.connect(ctx.destination);

  // Dos notas: E6 -> B5 (rápida, alegre, tipo "pop" de mensaje)
  const notes = [
    { freq: 1318.51, start: 0.0, dur: 0.11, gain: 1.0 },
    { freq: 987.77, start: 0.085, dur: 0.18, gain: 0.9 },
  ];

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = note.freq;

    const t0 = now + note.start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(note.gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + note.dur);

    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + note.dur + 0.03);
  }
}
