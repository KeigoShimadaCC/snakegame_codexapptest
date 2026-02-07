export type SoundFx = 'eat' | 'bird' | 'banana' | 'phase' | 'gameover' | 'shift' | 'bonus';

let audioCtx: AudioContext | null = null;
let enabled = true;

const getCtx = (): AudioContext => {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
};

export const setSoundEnabled = (value: boolean) => {
  enabled = value;
};

const playTone = (frequency: number, duration = 0.12, type: OscillatorType = 'sine') => {
  if (!enabled) {
    return;
  }
  const ctx = getCtx();
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
};

export const playSound = (fx: SoundFx) => {
  switch (fx) {
    case 'eat':
      playTone(620, 0.1, 'triangle');
      break;
    case 'bird':
      playTone(860, 0.08, 'square');
      playTone(1040, 0.06, 'square');
      break;
    case 'banana':
      playTone(420, 0.14, 'sine');
      break;
    case 'bonus':
      playTone(760, 0.1, 'triangle');
      playTone(980, 0.1, 'triangle');
      break;
    case 'phase':
      playTone(520, 0.08, 'sine');
      playTone(760, 0.08, 'sine');
      break;
    case 'shift':
      playTone(300, 0.12, 'sawtooth');
      break;
    case 'gameover':
      playTone(220, 0.2, 'triangle');
      playTone(180, 0.18, 'triangle');
      break;
  }
};
