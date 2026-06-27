let ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

/** Synthesizes a camera-shutter "click-clack" with no external audio asset. */
export function playShutterSound(): void {
  const audio = getContext();
  const now = audio.currentTime;

  const noiseBurst = (start: number, duration: number, gainValue: number, freq: number) => {
    const bufferSize = Math.floor(audio.sampleRate * duration);
    const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = audio.createBufferSource();
    source.buffer = buffer;

    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.8;

    const gain = audio.createGain();
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    source.start(start);
    source.stop(start + duration);
  };

  noiseBurst(now, 0.025, 0.9, 2400);
  noiseBurst(now + 0.07, 0.05, 0.6, 900);
}

/** Soft electronic blip used for UI feedback (snap, hold ticks). */
export function playBlip(freq = 880, duration = 0.08, gainValue = 0.15): void {
  const audio = getContext();
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  osc.type = 'square';
  osc.frequency.value = freq;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration);
}

/** Rising chime played on puzzle completion. */
export function playSuccessChime(): void {
  const freqs = [523.25, 659.25, 783.99, 1046.5];
  freqs.forEach((f, i) => {
    setTimeout(() => playBlip(f, 0.25, 0.12), i * 110);
  });
}
