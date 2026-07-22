/* Tiny WebAudio synth — no assets, instant sounds. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = typeof localStorage !== "undefined" && localStorage.getItem("chapa.muted") === "1";

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.4;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem("chapa.muted", m ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** call from a user gesture to unlock audio */
export function unlockAudio() {
  ac();
}

function tone(freq: number, dur: number, type: OscillatorType = "triangle", vol = 0.2, freqEnd?: number) {
  if (muted) return;
  const c = ac();
  if (!c || !master) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(c.currentTime + dur + 0.03);
  } catch {
    /* ignore */
  }
}

function noise(dur: number, vol = 0.12) {
  if (muted) return;
  const c = ac();
  if (!c || !master) return;
  try {
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(master);
    src.start();
  } catch {
    /* ignore */
  }
}

const arp = (notes: number[], step = 55, type: OscillatorType = "triangle", vol = 0.22) =>
  notes.forEach((f, i) => setTimeout(() => tone(f, 0.13, type, vol), i * step));

export const sfx = {
  click: () => tone(620, 0.05, "triangle", 0.15),
  /** pitch climbs with each stacked piece — very satisfying */
  place: (i: number) => tone(230 + i * 42, 0.09, "triangle", 0.26, 320 + i * 42),
  undo: () => tone(340, 0.08, "triangle", 0.18, 210),
  tick: () => tone(960, 0.045, "square", 0.1),
  bad: () => {
    tone(175, 0.22, "sawtooth", 0.2, 75);
    noise(0.12, 0.1);
  },
  serve: () => arp([523, 659, 784, 1046]),
  perfect: () => arp([659, 784, 988, 1319, 1568], 45, "square", 0.14),
  angry: () => {
    tone(320, 0.5, "sawtooth", 0.24, 65);
    noise(0.3, 0.14);
  },
  levelup: () => arp([392, 523, 659, 784, 1046, 1319], 85),
  pop: () => tone(500, 0.06, "sine", 0.2, 760),
  gameover: () => arp([392, 330, 262, 196], 140, "sawtooth", 0.16),
};
