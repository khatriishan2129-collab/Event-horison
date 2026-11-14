/**
 * Earth Jukebox: Spatial Chamber Sonification Engine (v7.0)
 * Team: Event Horizon | NASA Earth Information Center Challenge
 *
 * Default: scene_score.js plans evidence-backed spatial chords and renders
 * additive instrument PCM, shared by live playback and offline WAV export.
 * Position determines time/pan and pitch; colour determines timbre; calibrated
 * value or appearance determines spectral brightness. Air and room follow
 * labelled subject context. Legacy orchestra, contour and pixel modes remain
 * available for comparison.
 */

const SceneScore = typeof module !== "undefined" && module.exports
  ? require("./scene_score.js") : globalThis.EarthSceneScore;

const NOTE_OFFSETS = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4,
  F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11
};

const NOTE_NAMES_12 = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const SCALE_PITCH_CLASSES = {
  major_pentatonic: new Set([0, 2, 4, 7, 9]),     // C Major Pentatonic: C D E G A (warm, open, uplifting)
  lydian: new Set([5, 7, 9, 11, 0, 2, 4]),        // F Lydian: F G A B C D E (bright, expansive)
  pentatonic: new Set([0, 2, 4, 7, 9]),           // Compatibility alias mapped to warm Major Pentatonic
  dorian: new Set([5, 7, 9, 11, 0, 2, 4])         // Compatibility alias mapped to expansive Lydian
};

const HUE_TRACK_ORDER = [
  "red",
  "orange",
  "yellow",
  "green",
  "cyan",
  "blue",
  "purple",
  "magenta",
  "neutral"
];

/**
 * Warm Earth Hue-Wheel Instruments tuned in consonant C-Major / Perfect-Fifth / Octave registers
 * (C2..G5) with organic harmonic overtone ratios (integer 2x / 3x / 1.5x, zero harsh FM screech).
 */
const HUE_TRACK_SPECS = {
  red: {
    label: "Red (Warm Low Cello)",
    color: "#ef4444",
    hueDeg: 30,
    kind: "harmonic",
    carType: "sawtooth",       // Rich bowed cello harmonics shaped smoothly by lightness lowpass
    harmType: "sine",
    harmMult: 1.5,             // Chroma adds warm consonant 5th richness (while Brightness drives 2x/4x octaves)
    harmMix: 0.40,
    cutoffMin: 200,
    cutoffMax: 3200,
    minHz: 98.0,               // G2
    maxHz: 392.0,              // G4 (Exact 2-octave span on C-Major 5th)
    midiMin: 43,
    midiMax: 67,
    minMod: 0.15,
    maxMod: 1.0,
    baseQ: 0.85,
    airTintHz: 420,
    airWeight: 0.08,
    lfoHz: 3.6,
    pan: -0.48,
    weight: 1.0,
    levelTrim: 1.07
  },
  orange: {
    label: "Orange (French Horn & Earth)",
    color: "#f97316",
    hueDeg: 57,
    kind: "harmonic",
    carType: "sawtooth",       // Brass/horn harmonic warmth tempered by golden mid cutoff
    harmType: "triangle",
    harmMult: 1.5,             // Saturated orange blooms with warm French horn 5th harmonic
    harmMix: 0.42,
    cutoffMin: 230,
    cutoffMax: 3400,
    minHz: 130.81,             // C3
    maxHz: 523.25,             // C5 (Exact 2-octave span)
    midiMin: 48,
    midiMax: 72,
    minMod: 0.15,
    maxMod: 1.0,
    baseQ: 0.95,
    airTintHz: 680,
    airWeight: 0.11,
    lfoHz: 4.2,
    pan: 0.44,
    weight: 1.0,
    levelTrim: 1.05
  },
  yellow: {
    label: "Yellow (Sunlit Warm Harp)",
    color: "#eab308",
    hueDeg: 96,
    kind: "harmonic",
    carType: "triangle",
    harmType: "sine",
    harmMult: 1.5,             // Sunlit 5th color fullness
    harmMix: 0.42,
    cutoffMin: 280,
    cutoffMax: 3600,
    minHz: 196.0,              // G3 (Open fifth above C3)
    maxHz: 783.99,             // G5 (Exact 2-octave span)
    midiMin: 55,
    midiMax: 79,
    minMod: 0.15,
    maxMod: 1.0,
    baseQ: 0.85,
    airTintHz: 1200,
    airWeight: 0.08,
    lfoHz: 4.8,
    pan: -0.22,
    weight: 1.0,
    levelTrim: 0.79
  },
  green: {
    label: "Green (Forest Flute & Reed)",
    color: "#22c55e",
    hueDeg: 145,
    kind: "harmonic",
    carType: "triangle",       // Woody hollow clarinet/flute body + warm 3rd harmonic overtone
    harmType: "sine",
    harmMult: 3.0,             // Distinct odd-harmonic woodwind color driven by Chroma
    harmMix: 0.36,
    cutoffMin: 220,
    cutoffMax: 3300,
    minHz: 130.81,             // C3 (Unison/octave with Orange & Blue -> zero clash)
    maxHz: 523.25,             // C5 (Exact 2-octave span)
    midiMin: 48,
    midiMax: 72,
    minMod: 0.15,
    maxMod: 1.0,
    baseQ: 1.0,
    airTintHz: 900,
    airWeight: 0.10,
    lfoHz: 4.0,
    pan: 0.28,
    weight: 1.0,
    levelTrim: 0.82
  },
  cyan: {
    label: "Cyan (Glass Harmonica & Clear Air)",
    color: "#06b6d4",
    hueDeg: 202,
    kind: "harmonic",
    carType: "sine",           // Pure crystalline glass fundamental + subtle unison shimmer for Chroma
    harmType: "triangle",
    harmMult: 1.5,
    harmMix: 0.36,
    cutoffMin: 320,
    cutoffMax: 3800,
    minHz: 261.63,             // C4 (Clean octave above Green & Orange)
    maxHz: 1046.5,             // C6 (Exact 2-octave span matching every hue track!)
    midiMin: 60,
    midiMax: 84,
    minMod: 0.15,
    maxMod: 1.0,
    baseQ: 0.90,
    airTintHz: 1550,
    airWeight: 0.11,
    lfoHz: 5.0,
    pan: -0.62,
    weight: 1.0,
    levelTrim: 0.65
  },
  blue: {
    label: "Blue (Deep Ocean Contrabass)",
    color: "#3b82f6",
    hueDeg: 256,
    kind: "harmonic",
    carType: "triangle",       // Deep oceanic swell with warm 5th body for Chroma
    harmType: "sine",
    harmMult: 1.5,
    harmMix: 0.44,
    cutoffMin: 170,
    cutoffMax: 2600,
    minHz: 65.41,              // C2 (Rich grounded ocean bass)
    maxHz: 261.63,             // C4 (Exact 2-octave span)
    midiMin: 36,
    midiMax: 60,
    minMod: 0.15,
    maxMod: 1.0,
    baseQ: 0.75,
    airTintHz: 380,
    airWeight: 0.12,
    lfoHz: 3.2,
    pan: -0.72,
    weight: 1.0,
    levelTrim: 0.79
  },
  purple: {
    label: "Purple (Warm Choir Strings)",
    color: "#a855f7",
    hueDeg: 303,
    kind: "harmonic",
    carType: "sawtooth",       // Expressive warm string ensemble in pure 5th register
    harmType: "triangle",
    harmMult: 1.004,           // Warm acoustic string unison chorus detune for saturated Purple
    harmMix: 0.40,
    cutoffMin: 260,
    cutoffMax: 3500,
    minHz: 196.0,              // G3 (Consonant fifth above C)
    maxHz: 783.99,             // G5 (Exact 2-octave span)
    midiMin: 55,
    midiMax: 79,
    minMod: 0.15,
    maxMod: 1.0,
    baseQ: 1.05,
    airTintHz: 1050,
    airWeight: 0.09,
    lfoHz: 4.5,
    pan: 0.65,
    weight: 1.0,
    levelTrim: 1.05
  },
  magenta: {
    label: "Magenta (Radiant Acoustic Choir)",
    color: "#ec4899",
    hueDeg: 346,
    kind: "harmonic",
    carType: "triangle",       // Uplifting Major-3rd/Octave choral bridge back into Red
    harmType: "sine",
    harmMult: 1.004,           // Smooth vocal unison choir warmth (no harsh 7th dissonance)
    harmMix: 0.42,
    cutoffMin: 300,
    cutoffMax: 3600,
    minHz: 164.81,             // E3 (Warm C-Major 3rd!) -> bridges warmly back toward Red G2
    maxHz: 659.25,             // E5 (Exact 2-octave span)
    midiMin: 52,
    midiMax: 76,
    minMod: 0.15,
    maxMod: 1.0,
    baseQ: 0.95,
    airTintHz: 1350,
    airWeight: 0.10,
    lfoHz: 5.2,
    pan: 0.72,
    weight: 1.0,
    levelTrim: 0.79
  },
  neutral: {
    label: "Neutral (Muted for Now)",
    color: "#94a3b8",
    hueDeg: null,
    kind: "noise",
    cutoffMin: 220,
    cutoffMax: 1650,
    minHz: 220.0,
    maxHz: 1650.0,
    midiMin: 52,
    midiMax: 76,
    minMod: 0.6,
    maxMod: 2.0,               // Gentle broad Q keeps breeze soft & natural, never whistling/alien
    baseQ: 0.80,
    lfoHz: 3.5,
    pan: 0.0,
    weight: 1.0,
    levelTrim: 11.4            // Acoustic equalization so filtered pink noise matches oscillator RMS
  }
};

// Compatibility aliases
HUE_TRACK_SPECS.brown = { ...HUE_TRACK_SPECS.orange, label: "Brown (Earth)" };
HUE_TRACK_SPECS.violet = { ...HUE_TRACK_SPECS.purple, label: "Violet (Strings)" };

// Exact 12-Voice "Hue Voices" Wheel (1 per 30 deg, zigzagging D Major Pentatonic)
const HUE_WHEEL_MIDI = [50, 54, 59, 64, 69, 74, 76, 71, 66, 62, 57, 52];
const HUE_WHEEL_NOTES = ["D3", "F#3", "B3", "E4", "A4", "D5", "E5", "B4", "F#4", "D4", "A3", "E3"];
const HUE_WHEEL_VOICES = [
  { name: "Cello",           tier: "bass",    type: "sawtooth", lp: 950,  q: 0.8, vib: [5.1, 10], lvl: 0.40 },
  { name: "French horn",     tier: "bass",    fm: [1, 0.45],    lp: 1500, q: 0.7, vib: [4.7, 6],  lvl: 0.42 },
  { name: "Clarinet",        tier: "mid",     partials: [1, 0, 0.5, 0, 0.25, 0, 0.12, 0, 0.06], lp: 2600, q: 0.7, vib: [5.4, 4], lvl: 0.42 },
  { name: "Reed organ",      tier: "mid",     partials: [1, 0.6, 0.45, 0.3, 0.2, 0.12, 0.08],   lp: 2200, q: 0.7, vib: [5.8, 6], lvl: 0.36 },
  { name: "Alto flute",      tier: "mid",     partials: [1, 0.18, 0.05], lp: 3000, q: 0.5, vib: [5.6, 8], lvl: 0.48 },
  { name: "Glass harmonica", tier: "mid",     fm: [2, 0.25],    lp: 3400, q: 0.5, vib: [4.2, 3],  lvl: 0.42 },
  { name: "Crystal pad",     tier: "soprano", fm: [1, 0.35],    lp: 3400, q: 0.5, vib: [3.8, 5],  lvl: 0.38 },
  { name: "Violin",          tier: "soprano", type: "sawtooth", lp: 3200, q: 0.6, vib: [6.0, 12], lvl: 0.32 },
  { name: "Choir",           tier: "soprano", type: "sawtooth", lp: 1100, q: 1.4, vib: [5.5, 12], lvl: 0.38 },
  { name: "Theremin",        tier: "soprano", type: "sine",     lp: 3200, q: 0.5, vib: [6.0, 16], lvl: 0.45 },
  { name: "Ondes",           tier: "soprano", type: "triangle", lp: 2800, q: 0.6, vib: [5.0, 14], lvl: 0.45 },
  { name: "Euphonium",       tier: "bass",    fm: [1, 0.45],    lp: 1200, q: 0.8, vib: [4.5, 7],  lvl: 0.40 }
].map((v, k) => {
  const hue = k * 30;
  return {
    ...v,
    index: k,
    hue,
    midi: HUE_WHEEL_MIDI[k],
    note: HUE_WHEEL_NOTES[k],
    hz: 440 * Math.pow(2, (HUE_WHEEL_MIDI[k] - 69) / 12),
    pan: Math.max(-0.65, Math.min(0.65, Math.sin((hue * Math.PI) / 180) * 0.55))
  };
});

// Map perceptual OKLCH hue angles cleanly onto HSL 0..360 Hue Voices wheel degrees
const OKLCH_TO_HSL_STOPS = [
  [0, 338],
  [29, 0],     // Red -> Cello (0°)
  [55, 30],    // Orange -> French horn (30°)
  [102, 60],   // Yellow -> Clarinet (60°)
  [142, 120],  // Green -> Alto flute (120°)
  [196, 180],  // Cyan -> Crystal pad (180°)
  [262, 240],  // Blue -> Choir (240°)
  [298, 270],  // Purple -> Theremin (270°)
  [332, 300],  // Magenta -> Ondes (300°)
  [360, 338]
];

function oklchHueToWheelDeg(oklchDeg) {
  const h = ((Number(oklchDeg) % 360) + 360) % 360;
  for (let s = 0; s < OKLCH_TO_HSL_STOPS.length - 1; s++) {
    const [x0, y0] = OKLCH_TO_HSL_STOPS[s];
    const [x1, y1] = OKLCH_TO_HSL_STOPS[s + 1];
    if (h >= x0 && h <= x1) {
      const t = (h - x0) / Math.max(1e-6, x1 - x0);
      let dy = y1 - y0;
      if (dy < -180) dy += 360;
      if (dy > 180) dy -= 360;
      return ((y0 + t * dy) % 360 + 360) % 360;
    }
  }
  return h;
}

function hueWheelWeights(wheelDeg) {
  const h = ((Number(wheelDeg) % 360) + 360) % 360;
  const t = h / 30;
  const base = Math.floor(t);
  const f = t - base;
  const i = base % HUE_WHEEL_VOICES.length;
  const j = (i + 1) % HUE_WHEEL_VOICES.length;
  return { i, j, a: Math.cos((f * Math.PI) / 2), b: Math.sin((f * Math.PI) / 2) };
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function clamp01(val) {
  return Number.isFinite(val) ? clamp(val, 0, 1) : 0;
}

function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function midiToNoteName(midi) {
  const m = Math.round(midi);
  const octave = Math.floor(m / 12) - 1;
  return NOTE_NAMES_12[((m % 12) + 12) % 12] + octave;
}

function noteToHz(note) {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(String(note).trim());
  if (!m) return 220;
  const semitone = NOTE_OFFSETS[m[1]];
  const octave = parseInt(m[2], 10);
  return midiToHz((octave + 1) * 12 + semitone);
}

function hzToNearestNote(hz) {
  if (!hz || hz <= 0) return "--";
  const midi = Math.round(69 + 12 * Math.log2(hz / 440));
  return midiToNoteName(midi);
}

function buildScaleMidis(midiMin, midiMax, modeName) {
  const pitchClasses = SCALE_PITCH_CLASSES[modeName] || SCALE_PITCH_CLASSES.major_pentatonic;
  const list = [];
  for (let m = Math.floor(midiMin); m <= Math.ceil(midiMax); m++) {
    if (pitchClasses.has(((m % 12) + 12) % 12)) list.push(m);
  }
  return list.length > 0 ? list : [Math.round((midiMin + midiMax) * 0.5)];
}

function circularDeltaDeg(a, b) {
  return ((a - b + 540) % 360) - 180;
}

/**
 * ITU-R BS.1770 K-weighted integrated loudness estimate & peak safety normalization.
 */
function measureIntegratedLufs(audioBuffer) {
  const numCh = audioBuffer.numberOfChannels;
  const len = audioBuffer.length;
  const sr = audioBuffer.sampleRate || 44100;
  if (len === 0 || numCh === 0) return -70.0;

  const f0 = 1681.974450955533;
  const G = 3.999843853973347;
  const Q1 = 0.7071752369554196;
  const K1 = Math.tan((Math.PI * f0) / sr);
  const Vh = Math.pow(10, G / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);
  const a0_1 = 1 + K1 / Q1 + K1 * K1;
  const b0_1 = (Vh + (Vb * K1) / Q1 + K1 * K1) / a0_1;
  const b1_1 = (2 * (K1 * K1 - Vh)) / a0_1;
  const b2_1 = (Vh - (Vb * K1) / Q1 + K1 * K1) / a0_1;
  const a1_1 = (2 * (K1 * K1 - 1)) / a0_1;
  const a2_1 = (1 - K1 / Q1 + K1 * K1) / a0_1;

  const f2 = 38.13547087602444;
  const Q2 = 0.5003270373238773;
  const K2 = Math.tan((Math.PI * f2) / sr);
  const a0_2 = 1 + K2 / Q2 + K2 * K2;
  const b0_2 = 1.0;
  const b1_2 = -2.0;
  const b2_2 = 1.0;
  const a1_2 = (2 * (K2 * K2 - 1)) / a0_2;
  const a2_2 = (1 - K2 / Q2 + K2 * K2) / a0_2;

  const weightedSq = new Float64Array(len);
  for (let ch = 0; ch < numCh; ch++) {
    const x = audioBuffer.getChannelData(ch);
    let x1_1 = 0, x2_1 = 0, y1_1 = 0, y2_1 = 0;
    let x1_2 = 0, x2_2 = 0, y1_2 = 0, y2_2 = 0;
    for (let i = 0; i < len; i++) {
      const s = x[i];
      const y1 = b0_1 * s + b1_1 * x1_1 + b2_1 * x2_1 - a1_1 * y1_1 - a2_1 * y2_1;
      x2_1 = x1_1; x1_1 = s; y2_1 = y1_1; y1_1 = y1;
      const y2 = b0_2 * y1 + b1_2 * x1_2 + b2_2 * x2_2 - a1_2 * y1_2 - a2_2 * y2_2;
      x2_2 = x1_2; x1_2 = y1; y2_2 = y1_2; y1_2 = y2;
      weightedSq[i] += y2 * y2;
    }
  }

  const blockSamples = Math.max(1, Math.round(sr * 0.4));
  const stepSamples = Math.max(1, Math.round(sr * 0.1));
  const blocks = [];
  for (let start = 0; start + blockSamples <= len; start += stepSamples) {
    let sum = 0;
    for (let i = start; i < start + blockSamples; i++) sum += weightedSq[i];
    const meanPow = sum / blockSamples;
    if (-0.691 + 10 * Math.log10(Math.max(1e-12, meanPow)) > -70.0) {
      blocks.push(meanPow);
    }
  }
  if (blocks.length === 0) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += weightedSq[i];
    return -0.691 + 10 * Math.log10(Math.max(1e-12, sum / len));
  }

  const avgAbs = blocks.reduce((acc, v) => acc + v, 0) / blocks.length;
  const relThresholdPow = avgAbs * Math.pow(10, -10.0 / 10.0);
  let gatedSum = 0;
  let gatedCount = 0;
  for (const p of blocks) {
    if (p >= relThresholdPow) {
      gatedSum += p;
      gatedCount += 1;
    }
  }
  const finalMean = gatedCount > 0 ? gatedSum / gatedCount : avgAbs;
  return -0.691 + 10 * Math.log10(Math.max(1e-12, finalMean));
}

function normalizeBufferToLufsAndPeak(audioBuffer, targetLufs = -16.0, peakCeilingDb = -1.0) {
  const numCh = audioBuffer.numberOfChannels;
  const len = audioBuffer.length;
  if (numCh === 0 || len === 0) return;

  let peakBefore = 0;
  for (let ch = 0; ch < numCh; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < len; i++) peakBefore = Math.max(peakBefore, Math.abs(data[i]));
  }
  if (peakBefore <= 1e-6) return;

  const currentLufs = measureIntegratedLufs(audioBuffer);
  const ceilingLinear = Math.pow(10, peakCeilingDb / 20);
  const rawGain = currentLufs > -68 ? Math.pow(10, (targetLufs - currentLufs) / 20) : 1.0;
  const appliedGain = clamp(rawGain, 0.25, 16.0);
  const knee = ceilingLinear * 0.82;
  const headroom = ceilingLinear - knee;

  for (let ch = 0; ch < numCh; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const x = data[i] * appliedGain;
      const absX = Math.abs(x);
      if (absX <= knee) {
        data[i] = x;
      } else {
        const sign = x >= 0 ? 1 : -1;
        const shaped = knee + headroom * Math.tanh((absX - knee) / Math.max(1e-5, headroom));
        data[i] = sign * Math.min(ceilingLinear, shaped);
      }
    }
  }
}

const HALL_IR_CACHE = new Map();

function getHallImpulseData(sampleRate) {
  const sr = Math.max(8000, Math.round(sampleRate || 44100));
  const cached = HALL_IR_CACHE.get(sr);
  if (cached) return cached;

  const irLen = Math.floor(sr * 1.6);
  const left = new Float32Array(irLen);
  const right = new Float32Array(irLen);
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed / 2147483647) * 2 - 1;
  };
  for (let ch = 0; ch < 2; ch++) {
    const out = ch === 0 ? left : right;
    let lp = 0;
    for (let i = 0; i < irLen; i++) {
      const env = Math.pow(1 - i / irLen, 3.2) * Math.min(1, i / (sr * 0.015));
      lp = lp * 0.65 + rand() * 0.35;
      out[i] = lp * env * 0.35;
    }
  }
  const entry = { irLen, left, right };
  HALL_IR_CACHE.set(sr, entry);
  return entry;
}

const PIXEL_128_WORKLET_MODS = new WeakSet();

const PIXEL_128_WORKLET_CODE = `
class EarthPixel128Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.width = opts.width || 256;
    this.height = opts.height || 128;
    this.ampU8 = opts.ampU8 || new Uint8Array(this.width * this.height);
    this.lightU8 = opts.lightU8 || new Uint8Array(this.width * this.height);
    this.satU8 = opts.satU8 || new Uint8Array(this.width * this.height);
    this.hueU8 = opts.hueU8 || new Uint8Array(this.width * this.height);
    this.colScale = opts.colScale || new Float32Array(this.width).fill(0.2);
    this.rowHz = opts.rowHz || new Float32Array(this.height);
    this.startTime = Number.isFinite(opts.startTime) ? opts.startTime : 0.05;
    this.audibleStartTime = Number.isFinite(opts.audibleStartTime) ? opts.audibleStartTime : this.startTime;
    this.effectiveDuration = Math.max(1.0, Number(opts.effectiveDuration) || 35.4);
    this.fadeOutEnd = this.startTime + this.effectiveDuration + 0.40;
    this.stopTime = this.startTime + this.effectiveDuration + 0.55;
    this.stopped = false;

    this.port.onmessage = (ev) => {
      if (ev && ev.data === 'stop') this.stopped = true;
    };

    const H = this.height;
    const T_LEN = 512;
    const T_MASK = 511;
    const P_WRAP = 1024.0;
    const PI2 = 6.283185307179586;

    // 12 Hue Voices band-limited zero-DC normalized wavetables (512 samples -> fits cleanly in L1/L2 cache)
    const makeHarm = (amps) => {
      const buf = new Float32Array(T_LEN);
      for (let i = 0; i < T_LEN; i++) {
        const ph = (i / T_LEN) * PI2;
        let s = 0;
        for (let h = 0; h < amps.length; h++) s += amps[h] * Math.sin(ph * (h + 1));
        buf[i] = s;
      }
      return buf;
    };
    const makeFm = (harmRatio, idx) => {
      const buf = new Float32Array(T_LEN);
      for (let i = 0; i < T_LEN; i++) {
        const ph = (i / T_LEN) * PI2;
        buf[i] = Math.sin(ph + idx * Math.sin(ph * harmRatio));
      }
      return buf;
    };
    const normalizeTable = (buf) => {
      let mean = 0;
      for (let i = 0; i < T_LEN; i++) mean += buf[i];
      mean /= T_LEN;
      let sq = 0;
      for (let i = 0; i < T_LEN; i++) {
        buf[i] -= mean;
        sq += buf[i] * buf[i];
      }
      const scale = 0.7071 / Math.sqrt(Math.max(1e-8, sq / T_LEN));
      for (let i = 0; i < T_LEN; i++) buf[i] *= scale;
      return buf;
    };

    const base12 = [
      makeHarm([1, 0.55, 0.36, 0.25, 0.18, 0.12, 0.08, 0.05]), // 0 Cello
      makeFm(1, 1.6),                                           // 1 French horn
      makeHarm([1, 0, 0.5, 0, 0.25, 0, 0.12, 0, 0.06]),         // 2 Clarinet
      makeHarm([1, 0.6, 0.45, 0.3, 0.2, 0.12, 0.08]),           // 3 Reed organ
      makeHarm([1, 0.18, 0.05]),                                // 4 Alto flute
      makeFm(3, 0.5),                                           // 5 Glass harmonica
      makeFm(2, 1.2),                                           // 6 Crystal pad
      makeHarm([1, 0.65, 0.45, 0.32, 0.22, 0.15, 0.10]),        // 7 Violin
      makeHarm([1, 0.72, 0.38, 0.48, 0.22, 0.12]),              // 8 Choir
      makeHarm([1]),                                            // 9 Theremin
      makeHarm([1, 0, -0.11, 0, 0.04]),                         // 10 Ondes
      makeFm(1, 2.2)                                            // 11 Euphonium
    ].map(normalizeTable);

    // Pre-blend 24 equal-power Hue Voices wavetables (every 15 deg, 48 KB total)
    this.tables24 = new Array(24);
    for (let k = 0; k < 24; k++) {
      const t = k / 2;
      const base = Math.floor(t);
      const f = t - base;
      const tA = base12[base % 12];
      const tB = base12[(base + 1) % 12];
      const wA = Math.cos(f * Math.PI * 0.5);
      const wB = Math.sin(f * Math.PI * 0.5);
      const blended = new Float32Array(T_LEN);
      for (let i = 0; i < T_LEN; i++) {
        blended[i] = wA * tA[i] + wB * tB[i];
      }
      this.tables24[k] = blended;
    }

    // Precompute 240 Hue Voices wheel LUTs + constant-power stereo pan LUT (zero cos/sin in process)
    this.hueTblIdx = new Uint8Array(240);
    this.huePan = new Float32Array(240);
    for (let b = 0; b < 240; b++) {
      const deg = (b / 240) * 360;
      this.hueTblIdx[b] = Math.round((deg / 360) * 24) % 24;
      this.huePan[b] = Math.max(-0.55, Math.min(0.55, Math.sin((deg * Math.PI) / 180) * 0.48));
    }
    this.panLUTL = new Float32Array(256);
    this.panLUTR = new Float32Array(256);
    for (let u = 0; u < 256; u++) {
      const pan = (u / 255) * 2.0 - 1.0;
      const ang = (pan + 1.0) * 0.78539816339;
      this.panLUTL[u] = Math.cos(ang);
      this.panLUTR[u] = Math.sin(ang);
    }

    // Lightness -> 3-octave weights (-1 / 0 / +1 oct)
    this.octSub = new Float32Array(256);
    this.octMid = new Float32Array(256);
    this.octHi = new Float32Array(256);
    for (let u = 0; u < 256; u++) {
      const L = u / 255;
      const l = Math.max(0, Math.min(1, (L - 0.14) / 0.70));
      this.octSub[u] = Math.pow(Math.max(0, Math.min(1, (0.55 - l) / 0.55)), 1.35) * 0.85;
      this.octMid[u] = Math.max(0, Math.min(1, 1.0 - Math.abs(l - 0.5) * 1.45)) * 0.92 + 0.14;
      this.octHi[u] = Math.pow(Math.max(0, Math.min(1, (l - 0.45) / 0.55)), 1.35) * 0.90;
    }

    // Per-row state arrays (all 128 independent row voices)
    this.phases = new Float32Array(H);
    this.inc = new Float32Array(H);
    this.curAmp = new Float32Array(H);
    this.tgtAmp = new Float32Array(H);
    this.curLp = new Float32Array(H).fill(0.45);
    this.lpState = new Float32Array(H);
    this.rowLpMin = new Float32Array(H);
    this.rowLpMax = new Float32Array(H);
    this.rowAmpTrim = new Float32Array(H);
    this.rowTgtSub = new Float32Array(H);
    this.rowTgtMid = new Float32Array(H).fill(1);
    this.rowTgtHi = new Float32Array(H);
    this.rowTbl = new Uint8Array(H);
    this.rowPanL = new Float32Array(H).fill(0.707);
    this.rowPanR = new Float32Array(H).fill(0.707);
    this.rowMicroPan = new Float32Array(H);

    for (let r = 0; r < H; r++) {
      // Golden-ratio phase decorrelation prevents coherent cancellation across 128 simultaneous rows
      this.phases[r] = ((r * 0.61803398875) % 1.0) * P_WRAP;
      const hz = Math.max(40, Math.min(8000, this.rowHz[r] || (110 * Math.pow(16, (H - 1 - r) / Math.max(1, H - 1)))));
      this.inc[r] = (hz / sampleRate) * T_LEN;
      const lpMinHz = Math.max(220, Math.min(3600, hz * 0.95));
      const lpMaxHz = Math.max(600, Math.min(8500, hz * 5.8));
      this.rowLpMin[r] = Math.max(0.03, Math.min(0.95, 1.0 - Math.exp((-PI2 * lpMinHz) / sampleRate)));
      this.rowLpMax[r] = Math.max(0.05, Math.min(0.96, 1.0 - Math.exp((-PI2 * lpMaxHz) / sampleRate)));
      this.rowAmpTrim[r] = Math.max(0.75, Math.min(1.90, Math.pow(hz / 340.0, 0.36)));
      this.rowMicroPan[r] = (((r % 7) - 3) / 3) * 0.18;
    }

    this.ampSlew = 1.0 - Math.exp(-1.0 / (sampleRate * 0.0045));
  }

  _updateControlFrame(colFloat, masterEnv) {
    const W = this.width;
    const H = this.height;
    const c0 = Math.max(0, Math.min(W - 1, Math.floor(colFloat)));
    const c1 = Math.min(W - 1, c0 + 1);
    const frac = Math.max(0, Math.min(1, colFloat - c0));
    const scale0 = this.colScale[c0] || 0.25;
    const scale1 = this.colScale[c1] || 0.25;
    const base0 = c0 * H;
    const base1 = c1 * H;

    const ampU8 = this.ampU8, lightU8 = this.lightU8, satU8 = this.satU8, hueU8 = this.hueU8;
    const octSub = this.octSub, octMid = this.octMid, octHi = this.octHi;
    const hueTblIdx = this.hueTblIdx, huePan = this.huePan, panLUTL = this.panLUTL, panLUTR = this.panLUTR;
    const rowLpMin = this.rowLpMin, rowLpMax = this.rowLpMax, rowAmpTrim = this.rowAmpTrim;

    for (let r = 0; r < H; r++) {
      const i0 = base0 + r;
      const i1 = base1 + r;
      const a0 = (ampU8[i0] / 255) * scale0;
      const a1 = (ampU8[i1] / 255) * scale1;

      if (a0 === 0 && a1 === 0) {
        this.tgtAmp[r] = 0;
        continue;
      }

      const dA = Math.abs(a1 - a0);
      const t = dA > 0.08 ? Math.max(0, Math.min(1, (frac - 0.55) / 0.35)) : frac;
      this.tgtAmp[r] = (a0 + (a1 - a0) * t) * rowAmpTrim[r] * masterEnv;

      const useIdx = (a1 > a0 && t > 0.5) || a0 === 0 ? i1 : i0;
      const lByte = ((lightU8[i0] + (lightU8[i1] - lightU8[i0]) * t) | 0) & 255;
      const sNorm = (satU8[i0] + (satU8[i1] - satU8[i0]) * t) * 0.0039215686;
      const hBin = hueU8[useIdx] % 240;

      this.rowTgtSub[r] = octSub[lByte];
      this.rowTgtMid[r] = octMid[lByte];
      this.rowTgtHi[r] = octHi[lByte];
      this.curLp[r] = rowLpMax[r] + (rowLpMin[r] - rowLpMax[r]) * sNorm;
      this.rowTbl[r] = hueTblIdx[hBin];

      const pIdx = (((huePan[hBin] + this.rowMicroPan[r] + 1.0) * 127.5) | 0) & 255;
      this.rowPanL[r] = panLUTL[pIdx];
      this.rowPanR[r] = panLUTR[pIdx];
    }
  }

  process(inputs, outputs) {
    if (this.stopped) return false;
    const out = outputs[0];
    if (!out || out.length === 0) return true;
    const outL = out[0];
    const outR = out[1] || outL;
    const nFrames = outL.length;

    const tBlockStart = currentTime;
    if (tBlockStart >= this.stopTime) {
      outL.fill(0);
      if (outR !== outL) outR.fill(0);
      return false;
    }

    const H = this.height;
    const W = this.width;
    const phases = this.phases, inc = this.inc;
    const curAmp = this.curAmp, tgtAmp = this.tgtAmp;
    const curLp = this.curLp, lpState = this.lpState;
    const wSub = this.rowTgtSub, wMid = this.rowTgtMid, wHi = this.rowTgtHi;
    const rowTbl = this.rowTbl, panL = this.rowPanL, panR = this.rowPanR;
    const tables24 = this.tables24;
    const slew = this.ampSlew;
    const srInv = 1.0 / sampleRate;

    // Compute control envelope once per 128-sample Web Audio quantum (~2.9 ms)
    const tCtrl = tBlockStart + (nFrames * 0.5) * srInv;
    if (tCtrl >= this.startTime) {
      const elapsed = tCtrl - this.startTime;
      const progress = Math.max(0, Math.min(1, elapsed / this.effectiveDuration));
      let masterEnv = 1.0;
      if (tCtrl > this.startTime + this.effectiveDuration) {
        masterEnv = Math.max(0, (this.fadeOutEnd - tCtrl) / 0.40);
      }
      this._updateControlFrame(progress * Math.max(1, W - 1), masterEnv);
    }

    for (let i = 0; i < nFrames; i++) {
      if (tBlockStart + i * srInv < this.audibleStartTime) {
        outL[i] = 0;
        if (outR !== outL) outR[i] = 0;
        continue;
      }

      let sumL = 0;
      let sumR = 0;
      for (let r = 0; r < H; r++) {
        const a = curAmp[r] + (tgtAmp[r] - curAmp[r]) * slew;
        curAmp[r] = a;
        if (a < 1e-5) continue;

        let p = phases[r] + inc[r];
        if (p >= 1024.0) p -= 1024.0;
        phases[r] = p;

        const tBuf = tables24[rowTbl[r]];
        const raw = wSub[r] * tBuf[(p * 0.5) | 0]
          + wMid[r] * tBuf[(p | 0) & 511]
          + wHi[r] * tBuf[((p * 2.0) | 0) & 511];

        const filt = lpState[r] + curLp[r] * (raw - lpState[r]);
        lpState[r] = filt;

        const outRow = filt * a;
        sumL += outRow * panL[r];
        sumR += outRow * panR[r];
      }

      outL[i] = sumL;
      if (outR !== outL) outR[i] = sumR;
    }
    return true;
  }
}
registerProcessor('earth-pixel-128', EarthPixel128Processor);
`;

class EarthJukeboxEngine {
  constructor(scanData, options = {}) {
    this.data = scanData || {};
    this.duration = clamp(Number(options.duration) || 36, 2, 90);
    this.presetName = options.preset === "auto" ? "scene_score" : (options.preset || "scene_score");
    this.scaleMode = options.scaleMode || options.pitchMode || "major_pentatonic";
    this.useReverb = options.reverb === true;
    this.muteNoise = options.muteNoise ?? true;
    this.soloSheet = options.soloSheet ? String(options.soloSheet).toLowerCase() : null;
    this.environment = options.environment || "auto";
    this.volume = clamp(Number(options.volume ?? 0.85), 0, 1);
    this._scoreRenderer = null;
    this.sceneScore = this.presetName === "scene_score" && SceneScore
      ? SceneScore.makeScore(this.data, { ...options, duration: this.duration, soloSheet: this.soloSheet }) : null;
    this._scoreReverb = options.reverb !== false;
    this._preparedPCM = options.preparedPCM || null;
    this.isPlaying = false;
    this.startTime = 0;

    this._instruments = [];
    this._tempNodes = [];
    this._tracks = [];
    this._sharedNoise = null;
    this._workletNode = null;
    this._pixel128Plan = null;
    this.masterLimiter = null;
    this.masterGain = null;
    this.masterCompressor = null;
    this.masterReverb = null;

    this.prepared = this._preparePlan();
    if (this.sceneScore) {
      this.prepared.activePreset = "scene_score";
      this.prepared.scene = this.sceneScore;
    }
    this._nativeCtx = null;
    this._isNativeAudio = false;
    this._lookaheadTimer = null;
    this._schedState = null;
    this._wheelVoices = null;
  }

  static getSharedAudioContext() {
    if (typeof globalThis === "undefined") return null;
    const AudioCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (typeof AudioCtor !== "function") return null;
    let ctx = globalThis.__earthJukeboxAudioCtx;
    if (!ctx || ctx.state === "closed") {
      ctx = new AudioCtor({ latencyHint: "playback" });
      globalThis.__earthJukeboxAudioCtx = ctx;
    }
    return ctx;
  }

  static async unlockAudio() {
    const ctx = EarthJukeboxEngine.getSharedAudioContext();
    if (ctx && ctx.state === "suspended" && typeof ctx.resume === "function") {
      await ctx.resume();
    }
    return ctx;
  }

  _createRoomReverb(rawCtx, duration = 1.2, decay = 2.8) {
    if (!rawCtx || typeof rawCtx.createConvolver !== "function" || typeof rawCtx.createBuffer !== "function") {
      return null;
    }
    try {
      const sampleRate = rawCtx.sampleRate || 44100;
      const length = Math.max(128, Math.floor(sampleRate * duration));
      const impulse = rawCtx.createBuffer(2, length, sampleRate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);

      // Procedural acoustic chamber impulse response (early reflections + dense diffuse exponential decay)
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-decay * t);
        const early = t < 0.045 ? (Math.sin(t * 420.0) * 0.4) : 0;
        left[i] = ((Math.random() * 2 - 1) * env * 0.75 + early * 0.25) * 0.65;
        right[i] = ((Math.random() * 2 - 1) * env * 0.75 + early * 0.25) * 0.65;
      }

      const convolver = rawCtx.createConvolver();
      convolver.buffer = impulse;
      return convolver;
    } catch (e) {
      return null;
    }
  }

  getCurrentTime() {
    if (this._nativeCtx && typeof this._nativeCtx.currentTime === "number") {
      return this._nativeCtx.currentTime;
    }
    if (typeof Tone !== "undefined" && typeof Tone.now === "function") {
      return Tone.now();
    }
    return 0;
  }

  _getTrackSpec(sheetName) {
    const key = String(sheetName || "neutral").toLowerCase();
    return HUE_TRACK_SPECS[key] || HUE_TRACK_SPECS.neutral;
  }

  _northnessToNote(spec, northness) {
    const mode = this.scaleMode === "lydian" || this.scaleMode === "dorian" ? "lydian" : "major_pentatonic";
    const scaleMidis = buildScaleMidis(spec.midiMin, spec.midiMax, mode);
    const idx = Math.min(scaleMidis.length - 1, Math.max(0, Math.round(clamp01(northness) * (scaleMidis.length - 1))));
    const midi = scaleMidis[idx];
    return { midi, hz: midiToHz(midi), note: midiToNoteName(midi) };
  }

  _melodicNorthnessToHz(northness, voiceSpec = null) {
    const n = clamp01(northness);

    if (voiceSpec) {
      // Orthogonal Orchestral Register Tiers:
      // Bass Tier (Red, Orange, Brown, Euphonium): D2 (73.4 Hz) .. D4 (293.7 Hz)
      // Mid Tier (Yellow, Green, Clarinet, Flute):   D3 (146.8 Hz) .. D5 (587.3 Hz)
      // Soprano Tier (Cyan, Blue, Violin, Choir):     D4 (293.7 Hz) .. D6 (1174.7 Hz)
      // Each tier spans 24 semitones (2.0 octaves) so slopes are bold and expressive,
      // yet separate frequency registers NEVER collide or create dissonant beating!
      const tier = voiceSpec.tier || (
        (voiceSpec.hue <= 35 || voiceSpec.hue >= 325) ? "bass" :
        (voiceSpec.hue >= 45 && voiceSpec.hue <= 165) ? "mid" : "soprano"
      );

      let minMidi = 50; // default mid (D3)
      if (tier === "bass") minMidi = 38;      // D2 (73.4 Hz)
      else if (tier === "mid") minMidi = 50;  // D3 (146.8 Hz)
      else minMidi = 62;                      // D4 (293.7 Hz)

      const maxMidi = minMidi + 24;           // Exact 2-octave span (24 semitones)
      const minHz = midiToHz(minMidi);
      const maxHz = midiToHz(maxMidi);

      if (this.scaleMode === "continuous") {
        // Continuous contour glissando: 100% continuous data glide with dramatic vertical sensitivity
        return minHz * Math.pow(maxHz / minHz, n);
      }

      // Discrete step mode (only if user explicitly chooses discrete steps)
      const D_PENTATONIC = [
        38, 40, 42, 45, 47,
        50, 52, 54, 57, 59,
        62, 64, 66, 69, 71,
        74, 76, 78, 81, 83,
        86, 88, 90, 93
      ];
      const scaleSubset = D_PENTATONIC.filter((m) => m >= minMidi - 1 && m <= maxMidi + 1);
      if (scaleSubset.length > 0) {
        const idx = Math.min(scaleSubset.length - 1, Math.max(0, Math.round(n * (scaleSubset.length - 1))));
        return midiToHz(scaleSubset[idx]);
      }
      return minHz * Math.pow(maxHz / minHz, n);
    }

    if (this.scaleMode === "continuous") {
      return 110.0 * Math.pow(880.0 / 110.0, n); // A2 (110.0 Hz) to A5 (880.0 Hz) - 3 full octaves!
    }

    const dMajorPitches = [38, 42, 45, 50, 54, 57, 62, 66, 69, 74, 78, 81, 86];
    const idx = Math.min(dMajorPitches.length - 1, Math.max(0, Math.round(n * (dMajorPitches.length - 1))));
    return midiToHz(dMajorPitches[idx]);
  }

  _northnessToHz(spec, northness) {
    const n = clamp01(northness);
    if (this.scaleMode !== "continuous") {
      return this._northnessToNote(spec, n).hz;
    }
    return spec.minHz * Math.pow(spec.maxHz / spec.minHz, n);
  }

  _buildFallbackColProfile(sheet, width, height, fallbackHue) {
    const colCells = Array.from({ length: width }, () => []);
    if (Array.isArray(sheet.cells)) {
      for (const cell of sheet.cells) {
        const r = cell[0];
        const c = cell[1];
        const a = clamp01(cell[2]);
        if (r < 0 || r >= height || c < 0 || c >= width || a <= 0) continue;
        colCells[c].push({
          r,
          a,
          L: clamp01(cell[3] ?? sheet.mean_lightness ?? 0.5),
          C: Math.max(0, cell[4] ?? sheet.mean_chroma ?? 0.1),
          h: cell.length >= 6 && Number.isFinite(cell[5]) ? cell[5] : fallbackHue
        });
      }
    } else if (Array.isArray(sheet.alpha_grid)) {
      for (let r = 0; r < Math.min(height, sheet.alpha_grid.length); r++) {
        const rowA = sheet.alpha_grid[r] || [];
        for (let c = 0; c < Math.min(width, rowA.length); c++) {
          const a = clamp01(rowA[c]);
          if (a <= 0.02) continue;
          colCells[c].push({
            r,
            a,
            L: clamp01(sheet.lightness_grid?.[r]?.[c] ?? sheet.mean_lightness ?? 0.5),
            C: Math.max(0, sheet.chroma_grid?.[r]?.[c] ?? sheet.mean_chroma ?? 0.1),
            h: sheet.hue_grid?.[r]?.[c] ?? fallbackHue
          });
        }
      }
    }

    const colMeanAlpha = new Float32Array(width);
    const colProfile = new Array(width);
    for (let c = 0; c < width; c++) {
      const list = colCells[c];
      if (list.length === 0) continue;
      let aSum = 0;
      for (const item of list) aSum += item.a;
      colMeanAlpha[c] = aSum / list.length;
    }

    for (let c = 0; c < width; c++) {
      const list = colCells[c];
      if (list.length === 0) {
        colProfile[c] = {
          x: (c + 0.5) / width,
          coverage: 0,
          mean_alpha: 0,
          mean_lightness: null,
          mean_chroma: null,
          mean_hue: null,
          focal_y: null,
          y_spread: 0,
          texture: 0,
          clusters: []
        };
        continue;
      }

      list.sort((u, v) => u.r - v.r);
      let aSum = 0, lSum = 0, cSum = 0, ySum = 0, cosSum = 0, sinSum = 0, texSum = 0;
      for (let idx = 0; idx < list.length; idx++) {
        const item = list[idx];
        const y = (item.r + 0.5) / Math.max(1, height);
        const hRad = (item.h * Math.PI) / 180;
        const prevItem = idx > 0 ? list[idx - 1] : null;
        const dVert = prevItem && prevItem.r === item.r - 1
          ? Math.abs(item.a - prevItem.a) + Math.abs(item.L - prevItem.L) * item.a
          : item.a * 0.5;
        const dHoriz = Math.abs(colMeanAlpha[c] - colMeanAlpha[Math.max(0, c - 1)]) * 0.6;
        const localTex = clamp01((dVert + dHoriz) * 1.4);

        aSum += item.a;
        lSum += item.a * item.L;
        cSum += item.a * item.C;
        ySum += item.a * y;
        cosSum += item.a * Math.cos(hRad);
        sinSum += item.a * Math.sin(hRad);
        texSum += item.a * localTex;
      }

      const safeA = Math.max(1e-6, aSum);
      const focalY = ySum / safeA;
      let varY = 0;
      for (const item of list) {
        const y = (item.r + 0.5) / Math.max(1, height);
        varY += item.a * (y - focalY) * (y - focalY);
      }

      const clusters = [];
      let seg = [list[0]];
      for (let i = 1; i <= list.length; i++) {
        if (i < list.length && list[i].r <= list[i - 1].r + 1) {
          seg.push(list[i]);
        } else {
          let sa = 0, sy = 0, sl = 0, sc = 0;
          for (const it of seg) {
            sa += it.a;
            sy += it.a * ((it.r + 0.5) / Math.max(1, height));
            sl += it.a * it.L;
            sc += it.a * it.C;
          }
          const sSafe = Math.max(1e-6, sa);
          clusters.push({
            y_center: sy / sSafe,
            height: seg.length / Math.max(1, height),
            mean_alpha: sa / seg.length,
            mean_lightness: sl / sSafe,
            mean_chroma: sc / sSafe
          });
          if (i < list.length) seg = [list[i]];
        }
      }

      const meanHue = ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360;
      colProfile[c] = {
        x: (c + 0.5) / width,
        coverage: list.length / Math.max(1, height),
        mean_alpha: aSum / list.length,
        mean_lightness: lSum / safeA,
        mean_chroma: cSum / safeA,
        mean_hue: meanHue,
        focal_y: focalY,
        y_spread: Math.sqrt(varY / safeA),
        texture: texSum / safeA,
        clusters
      };
    }
    return colProfile;
  }

  _preparePlan() {
    const sheetsData = this.data?.color_sheets;
    const sheetsMap = sheetsData?.sheets || {};
    const dims = sheetsData?.grid_dimensions || this.data?.source?.grid_dimensions || {};
    const width = Math.max(1, Number(dims.width) || 256);
    const height = Math.max(1, Number(dims.height) || 128);

    const baseSheetNames = Array.isArray(sheetsData?.active_sheet_order) && sheetsData.active_sheet_order.length > 0
      ? sheetsData.active_sheet_order
      : Object.keys(sheetsMap);
    const sheetNames = this.soloSheet
      ? baseSheetNames.filter((n) => String(n).toLowerCase() === this.soloSheet)
      : baseSheetNames;

    const tracks = [];
    for (const name of sheetNames) {
      const sheet = sheetsMap[name];
      if (!sheet) continue;
      const spec = this._getTrackSpec(name);
      const isExplicitSolo = Boolean(this.soloSheet && this.soloSheet === String(name).toLowerCase());
      if (this.muteNoise && spec.kind === "noise" && !isExplicitSolo) continue;

      const fallbackHue = spec.hueDeg ?? 0;
      const approxWheelDeg = oklchHueToWheelDeg(fallbackHue);
      const approxVoiceIdx = Math.round(approxWheelDeg / 30) % HUE_WHEEL_VOICES.length;
      const trackVoiceSpec = HUE_WHEEL_VOICES[approxVoiceIdx];
      const rawCols = Array.isArray(sheet.col_profile) && sheet.col_profile.length === width
        ? sheet.col_profile
        : this._buildFallbackColProfile(sheet, width, height, fallbackHue);

      const activeCovs = rawCols
        .map((c) => clamp01(c?.coverage))
        .filter((v) => v > 0)
        .sort((a, b) => a - b);
      if (activeCovs.length === 0) continue;

      const p90Cov = Math.max(0.06, activeCovs[Math.min(activeCovs.length - 1, Math.floor(activeCovs.length * 0.90))]);
      const shareBalance = isExplicitSolo
        ? 1.15
        : clamp(0.42 / Math.sqrt(Math.max(0.05, Number(sheet.share_of_data) || 0.12)), 0.62, 1.48);

      const frames = new Array(width);
      let hasAnyActive = false;
      let maxTexture = 0;
      let wheelDegSum = 0;
      let wheelWeightSum = 0;

      for (let c = 0; c < width; c++) {
        const col = rawCols[c] || {};
        const cov = clamp01(col.coverage);
        const alpha = clamp01(col.mean_alpha);
        if (cov <= 0 || alpha <= 0) {
          frames[c] = {
            active: false,
            coverage: 0,
            gain: 0,
            northness: 0.5,
            hz: this._melodicNorthnessToHz(0.5, trackVoiceSpec),
            secHz: null,
            secGain: 0,
            lightness: clamp01(sheet.mean_lightness ?? 0.5),
            chroma: Math.max(0, sheet.mean_chroma ?? 0.1),
            hueDeg: spec.hueDeg ?? 0,
            wheelDeg: oklchHueToWheelDeg(spec.hueDeg ?? 0),
            ySpread: 0,
            texture: 0,
            changeBoost: 0,
            edgeScore: c > 0 && frames[c - 1]?.active ? 0.92 : 0
          };
          continue;
        }

        hasAnyActive = true;
        const clusters = Array.isArray(col.clusters) ? col.clusters : [];
        let primaryNorth = 1.0 - clamp01(col.focal_y ?? 0.5);
        let secHz = null;
        let secGain = 0;

        if (clusters.length >= 1) {
          const sorted = [...clusters].sort((a, b) => (b.height * b.mean_alpha) - (a.height * a.mean_alpha));
          primaryNorth = 1.0 - clamp01(sorted[0].y_center ?? col.focal_y ?? 0.5);
        }
        secHz = null;
        secGain = 0;

        const primaryHz = this._melodicNorthnessToHz(primaryNorth, trackVoiceSpec);
        const lightness = clamp01(col.mean_lightness ?? sheet.mean_lightness ?? 0.5);
        const chroma = Math.max(0, col.mean_chroma ?? sheet.mean_chroma ?? 0.1);
        const hueDeg = Number.isFinite(col.mean_hue) ? col.mean_hue : fallbackHue;
        const wheelDeg = oklchHueToWheelDeg(hueDeg);
        const ySpread = col.y_spread || 0;
        const tex = clamp01(col.texture ?? 0);
        maxTexture = Math.max(maxTexture, tex);

        const prev = c > 0 ? frames[c - 1] : null;
        const prevCov = prev ? prev.coverage : 0;
        const prevActive = Boolean(prev && prev.active);
        const dCov = Math.abs(cov - prevCov);
        const dNorth = prevActive ? Math.abs(primaryNorth - prev.northness) : 0;
        const dLight = prevActive ? Math.abs(lightness - prev.lightness) : 0;

        const relIntensity = clamp01(cov / p90Cov);
        const lineFocus = clamp01(1.0 - ySpread * 2.5);
        const changeBoost = clamp01(dNorth * 4.5 + dCov * 3.6 + dLight * 2.4 + tex * 0.65);
        const edgeScore = clamp01(Math.max(dCov * 2.8, dNorth * 3.2, dLight * 2.2, !prevActive && c > 0 ? 0.92 : 0));

        const rawGain = clamp01(
          alpha
          * shareBalance
          * (0.14 + 0.44 * relIntensity + 0.42 * clamp01(0.45 * lineFocus + 0.65 * changeBoost))
        );

        wheelDegSum += wheelDeg * rawGain;
        wheelWeightSum += rawGain;

        frames[c] = {
          active: true,
          coverage: cov,
          gain: rawGain,
          northness: primaryNorth,
          hz: primaryHz,
          secHz: secHz || primaryHz,
          secGain,
          lightness,
          chroma,
          hueDeg,
          wheelDeg,
          ySpread,
          texture: tex,
          changeBoost,
          edgeScore
        };
      }

      if (!hasAnyActive) continue;

      const avgWheelDeg = wheelWeightSum > 0
        ? ((wheelDegSum / wheelWeightSum) % 360 + 360) % 360
        : oklchHueToWheelDeg(fallbackHue);
      const voiceIdx = Math.round(avgWheelDeg / 30) % HUE_WHEEL_VOICES.length;
      const voiceSpec = HUE_WHEEL_VOICES[voiceIdx];

      // Pre-position silent gaps cleanly to adjacent column states so edges enter/exit without swoops
      let nextValid = frames.find((f) => f.active) || frames[0];
      for (let c = width - 1; c >= 0; c--) {
        if (frames[c].active) {
          nextValid = frames[c];
        } else {
          frames[c].northness = nextValid.northness;
          frames[c].hz = nextValid.hz;
          frames[c].secHz = nextValid.secHz || nextValid.hz;
          frames[c].lightness = nextValid.lightness;
          frames[c].chroma = nextValid.chroma;
          frames[c].hueDeg = nextValid.hueDeg;
          frames[c].wheelDeg = nextValid.wheelDeg;
        }
      }
      let prevValid = frames.find((f) => f.active) || frames[0];
      for (let c = 0; c < width; c++) {
        if (frames[c].active) {
          prevValid = frames[c];
        } else if (c > 0 && frames[c - 1].active) {
          frames[c].northness = prevValid.northness;
          frames[c].hz = prevValid.hz;
          frames[c].secHz = prevValid.secHz || prevValid.hz;
          frames[c].lightness = prevValid.lightness;
          frames[c].chroma = prevValid.chroma;
          frames[c].hueDeg = prevValid.hueDeg;
          frames[c].wheelDeg = prevValid.wheelDeg;
        }
      }

      tracks.push({ name, spec, voiceSpec, voiceIdx, frames, maxTexture });
    }

    if (tracks.length === 0 && Array.isArray(this.data?.heatmap?.grid)) {
      const hm = this.data.heatmap.grid;
      const hmH = hm.length || height;
      const hmW = (hm[0] && hm[0].length) || width;
      const spec = HUE_TRACK_SPECS.blue;
      const frames = [];
      for (let c = 0; c < hmW; c++) {
        let sum = 0, ySum = 0;
        for (let r = 0; r < hmH; r++) {
          const v = clamp01(hm[r][c]);
          sum += v;
          ySum += v * ((r + 0.5) / hmH);
        }
        const active = sum > 0.01;
        const north = active ? 1.0 - ySum / sum : 0.5;
        const hz = this._melodicNorthnessToHz(north);
        frames.push({
          active,
          coverage: sum / Math.max(1, hmH),
          gain: active ? clamp01(sum / (hmH * 0.35)) : 0,
          northness: north,
          hz,
          secHz: hz,
          secGain: 0,
          lightness: clamp01(sum / Math.max(1, hmH)),
          chroma: 0.15,
          hueDeg: 256,
          wheelDeg: oklchHueToWheelDeg(256),
          ySpread: 0.1,
          texture: 0,
          changeBoost: 0,
          edgeScore: 0
        });
      }
      const voiceIdx = Math.round(oklchHueToWheelDeg(256) / 30) % HUE_WHEEL_VOICES.length;
      tracks.push({ name: "blue", spec, voiceSpec: HUE_WHEEL_VOICES[voiceIdx], voiceIdx, frames, maxTexture: 0 });
    }

    // Balance polyphony per column so solo lines sing brightly while multi-color chords stay crisp & never clip
    for (let c = 0; c < width; c++) {
      let sumSq = 0;
      let maxMotion = 0;
      for (const t of tracks) {
        const f = t.frames[c];
        if (!f || !f.active) continue;
        sumSq += f.gain * f.gain;
        maxMotion = Math.max(maxMotion, f.changeBoost);
      }
      const rmsNorm = Math.sqrt(sumSq);
      const chordTrim = rmsNorm > 0.92 ? 0.92 / rmsNorm : 1.0;
      for (const t of tracks) {
        const f = t.frames[c];
        if (!f || !f.active) continue;
        const motionDuck = maxMotion > 0.35 && f.changeBoost < 0.08 ? 0.52 : 1.0;
        f.gain = clamp01(f.gain * chordTrim * motionDuck);
        f.secGain = clamp01(f.secGain * chordTrim);
      }
    }

    const wheelFrames = this._buildWheelFrames(tracks, width);
    const contourTracks = (this.presetName === "orchestral_harmony" || this.presetName === "contour_trio")
      ? this._extractContourTracks(tracks, sheetsData, width, height)
      : null;

    const activePreset = (this.presetName === "orchestral_harmony" || this.presetName === "contour_trio")
      ? this.presetName
      : (this.presetName === "pixel_128" ? "pixel_128" : "hue_voices_data");

    return {
      width,
      height,
      activePreset,
      tracks,
      contourTracks,
      wheelFrames,
      activeHueList: tracks.map((t) => t.name)
    };
  }

  _extractContourTracks(tracks, sheetsData, width, height) {
    const sheetsMap = sheetsData?.sheets || {};
    const contourTracks = [];

    for (const baseTrack of tracks) {
      const sheet = sheetsMap[baseTrack.name] || {};
      const spec = baseTrack.spec;
      const isExplicitSolo = Boolean(this.soloSheet && this.soloSheet === String(baseTrack.name).toLowerCase());
      const fallbackHue = spec.hueDeg ?? 0;

      // 1. Collect pixels per column (from sparse cells, alpha_grid, or track fallback)
      const colPixels = Array.from({ length: width }, () => []);
      if (Array.isArray(sheet.cells)) {
        for (const cell of sheet.cells) {
          const r = cell[0] | 0;
          const c = cell[1] | 0;
          const a = clamp01(cell[2]);
          if (r < 0 || r >= height || c < 0 || c >= width || a <= 0.005) continue;
          colPixels[c].push({
            r,
            a,
            L: clamp01(cell[3] ?? sheet.mean_lightness ?? 0.5),
            C: Math.max(0, cell[4] ?? sheet.mean_chroma ?? 0.1),
            h: cell.length >= 6 && Number.isFinite(cell[5]) ? cell[5] : fallbackHue
          });
        }
      } else if (Array.isArray(sheet.alpha_grid)) {
        for (let r = 0; r < Math.min(height, sheet.alpha_grid.length); r++) {
          const rowA = sheet.alpha_grid[r] || [];
          for (let c = 0; c < Math.min(width, rowA.length); c++) {
            const a = clamp01(rowA[c]);
            if (a <= 0.02) continue;
            colPixels[c].push({
              r,
              a,
              L: clamp01(sheet.lightness_grid?.[r]?.[c] ?? sheet.mean_lightness ?? 0.5),
              C: Math.max(0, sheet.chroma_grid?.[r]?.[c] ?? sheet.mean_chroma ?? 0.1),
              h: sheet.hue_grid?.[r]?.[c] ?? fallbackHue
            });
          }
        }
      } else {
        for (let c = 0; c < width; c++) {
          const f = baseTrack.frames[c];
          if (!f || !f.active || f.gain <= 0) continue;
          const centerR = clamp(Math.round((1.0 - (f.northness ?? 0.5)) * (height - 1)), 0, height - 1);
          colPixels[c].push({
            r: centerR,
            a: clamp01(f.gain),
            L: f.lightness,
            C: f.chroma,
            h: f.hueDeg
          });
        }
      }

      // Row occupancy lookup per column to preserve real 1px persistent lines while filtering noise specks
      const colRowSets = colPixels.map((lst) => {
        const s = new Set();
        for (const it of lst) s.add(it.r);
        return s;
      });
      const hasNeighborCol = (c, r) => {
        for (const nc of [c - 1, c + 1]) {
          if (nc < 0 || nc >= width) continue;
          const ns = colRowSets[nc];
          for (let dr = -2; dr <= 2; dr++) {
            if (ns.has(r + dr)) return true;
          }
        }
        return false;
      };

      // 2. Gradient-aware vertical grouping + top/com/bot strip extraction
      const maxSlots = isExplicitSolo ? 4 : 2;
      const colRuns = new Array(width);
      for (let c = 0; c < width; c++) {
        const list = colPixels[c];
        if (list.length === 0) {
          colRuns[c] = [];
          continue;
        }
        list.sort((u, v) => u.r - v.r);

        const rawSegs = [];
        let seg = [list[0]];
        for (let i = 1; i < list.length; i++) {
          const p = list[i];
          const prev = list[i - 1];
          const gap = p.r - prev.r;
          const dL = Math.abs(p.L - prev.L);
          const dC = Math.abs(p.C - prev.C);
          // Bridge <=1px gaps inside blobs, split only on >=2px void or genuine sharp vertical contrast jump
          if (gap <= 2 && dL <= 0.20 && dC <= 0.055) {
            seg.push(p);
          } else {
            rawSegs.push(seg);
            seg = [p];
          }
        }
        rawSegs.push(seg);

        const hasMultiPx = rawSegs.some((s) => s.length >= 2);
        const strips = [];
        for (const s of rawSegs) {
          if (s.length === 1 && hasMultiPx && !hasNeighborCol(c, s[0].r)) {
            continue;
          }
          const topP = s[0];
          const botP = s[s.length - 1];
          let aSum = 0, lSum = 0, cSum = 0, ySum = 0, cosSum = 0, sinSum = 0;
          for (const it of s) {
            const hRad = (it.h * Math.PI) / 180;
            const yPos = 1.0 - (it.r + 0.5) / Math.max(1, height);
            aSum += it.a;
            lSum += it.a * it.L;
            cSum += it.a * it.C;
            ySum += it.a * yPos;
            cosSum += it.a * Math.cos(hRad);
            sinSum += it.a * Math.sin(hRad);
          }
          const safeA = Math.max(1e-6, aSum);
          const pxCount = s.length;
          const meanAlpha = aSum / pxCount;
          const yCom = ySum / safeA;
          const yTop = 1.0 - (topP.r + 0.5) / Math.max(1, height);
          const yBot = 1.0 - (botP.r + 0.5) / Math.max(1, height);
          const meanHue = ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360;
          const baseWeight = clamp01(Math.sqrt(pxCount / Math.max(8, height * 0.24)) * meanAlpha);
          const shareNorm = isExplicitSolo
            ? 1.15
            : clamp(0.45 / Math.sqrt(Math.max(0.05, Number(sheet.share_of_data) || 0.12)), 0.62, 1.45);

          strips.push({
            pxCount,
            isBlob: pxCount >= 4,
            yTop,
            yCom,
            yBot,
            topHz: this._melodicNorthnessToHz(yTop, baseTrack.voiceSpec),
            hz: this._melodicNorthnessToHz(yCom, baseTrack.voiceSpec),
            botHz: this._melodicNorthnessToHz(yBot, baseTrack.voiceSpec),
            lightness: clamp01(lSum / safeA),
            chroma: Math.max(0, cSum / safeA),
            hueDeg: meanHue,
            wheelDeg: spec.kind === "noise" ? 270 : oklchHueToWheelDeg(meanHue),
            gain: clamp01(baseWeight * shareNorm)
          });
        }

        strips.sort((a, b) => b.gain - a.gain);
        colRuns[c] = strips.slice(0, maxSlots);
      }

      // 3. Persistent slot matching across columns c -> c+1 by nearest Y center of mass
      const slotFrames = Array.from({ length: maxSlots }, () => new Array(width));
      for (let c = 0; c < width; c++) {
        const candidates = colRuns[c];
        const assignedCand = new Uint8Array(candidates.length);
        const assignedSlot = new Array(maxSlots).fill(null);

        if (c > 0) {
          const pairs = [];
          for (let s = 0; s < maxSlots; s++) {
            const prev = slotFrames[s][c - 1];
            if (!prev || !prev.active) continue;
            for (let j = 0; j < candidates.length; j++) {
              const dist = Math.abs(candidates[j].yCom - prev.northness);
              if (dist <= 0.18) {
                pairs.push({ s, j, dist });
              }
            }
          }
          pairs.sort((a, b) => a.dist - b.dist);
          for (const pair of pairs) {
            if (assignedSlot[pair.s] !== null || assignedCand[pair.j]) continue;
            assignedSlot[pair.s] = candidates[pair.j];
            assignedCand[pair.j] = 1;
          }
        }

        for (let j = 0; j < candidates.length; j++) {
          if (assignedCand[j]) continue;
          const freeSlot = assignedSlot.findIndex((x) => x === null);
          if (freeSlot === -1) break;
          assignedSlot[freeSlot] = candidates[j];
          assignedCand[j] = 1;
        }

        for (let s = 0; s < maxSlots; s++) {
          const run = assignedSlot[s];
          const allowEdges = isExplicitSolo || s === 0;
          if (!run) {
            const prevF = c > 0 ? slotFrames[s][c - 1] : null;
            slotFrames[s][c] = {
              active: false,
              coverage: 0,
              gain: 0,
              pxCount: 0,
              isBlob: false,
              allowEdges,
              northness: prevF ? prevF.northness : 0.5,
              yTop: prevF ? prevF.yTop : 0.5,
              yBot: prevF ? prevF.yBot : 0.5,
              hz: prevF ? prevF.hz : this._melodicNorthnessToHz(0.5, baseTrack.voiceSpec),
              topHz: prevF ? prevF.topHz : this._melodicNorthnessToHz(0.5, baseTrack.voiceSpec),
              botHz: prevF ? prevF.botHz : this._melodicNorthnessToHz(0.5, baseTrack.voiceSpec),
              secHz: prevF ? prevF.hz : this._melodicNorthnessToHz(0.5, baseTrack.voiceSpec),
              secGain: 0,
              lightness: prevF ? prevF.lightness : 0.5,
              chroma: prevF ? prevF.chroma : 0.08,
              hueDeg: prevF ? prevF.hueDeg : fallbackHue,
              wheelDeg: prevF ? prevF.wheelDeg : oklchHueToWheelDeg(fallbackHue),
              texture: 0,
              changeBoost: 0,
              edgeScore: prevF && prevF.active ? 0.90 : 0
            };
            continue;
          }

          const prev = c > 0 ? slotFrames[s][c - 1] : null;
          const prevActive = Boolean(prev && prev.active);
          const dY = prevActive ? Math.abs(run.yCom - prev.northness) : 0;
          const dG = Math.abs(run.gain - (prev ? prev.gain : 0));
          const dL = prevActive ? Math.abs(run.lightness - prev.lightness) : 0;
          const edgeScore = clamp01(Math.max(dG * 2.5, dY * 3.0, dL * 2.2, !prevActive && c > 0 ? 0.90 : 0));
          const changeBoost = clamp01(dY * 4.5 + dG * 3.2 + dL * 2.2);

          slotFrames[s][c] = {
            active: true,
            coverage: run.pxCount / Math.max(1, height),
            gain: run.gain,
            pxCount: run.pxCount,
            isBlob: run.isBlob,
            allowEdges,
            northness: run.yCom,
            yTop: run.yTop,
            yBot: run.yBot,
            hz: run.hz,
            topHz: run.topHz,
            botHz: run.botHz,
            secHz: run.hz,
            secGain: 0,
            lightness: run.lightness,
            chroma: run.chroma,
            hueDeg: run.hueDeg,
            wheelDeg: run.wheelDeg,
            texture: 0,
            changeBoost,
            edgeScore
          };
        }
      }

      // 4. Keep non-empty slots & pre-position silent gaps cleanly
      for (let s = 0; s < maxSlots; s++) {
        const frames = slotFrames[s];
        const hasAny = frames.some((f) => f.active);
        if (!hasAny) continue;

        let nextValid = frames.find((f) => f.active) || frames[0];
        for (let c = width - 1; c >= 0; c--) {
          if (frames[c].active) {
            nextValid = frames[c];
          } else {
            frames[c].northness = nextValid.northness;
            frames[c].yTop = nextValid.yTop;
            frames[c].yBot = nextValid.yBot;
            frames[c].hz = nextValid.hz;
            frames[c].topHz = nextValid.topHz;
            frames[c].botHz = nextValid.botHz;
            frames[c].lightness = nextValid.lightness;
            frames[c].chroma = nextValid.chroma;
            frames[c].hueDeg = nextValid.hueDeg;
            frames[c].wheelDeg = nextValid.wheelDeg;
          }
        }
        let prevValid = frames.find((f) => f.active) || frames[0];
        for (let c = 0; c < width; c++) {
          if (frames[c].active) {
            prevValid = frames[c];
          } else if (c > 0 && frames[c - 1].active) {
            frames[c].northness = prevValid.northness;
            frames[c].yTop = prevValid.yTop;
            frames[c].yBot = prevValid.yBot;
            frames[c].hz = prevValid.hz;
            frames[c].topHz = prevValid.topHz;
            frames[c].botHz = prevValid.botHz;
            frames[c].lightness = prevValid.lightness;
            frames[c].chroma = prevValid.chroma;
            frames[c].hueDeg = prevValid.hueDeg;
            frames[c].wheelDeg = prevValid.wheelDeg;
          }
        }

        const hasBlobs = frames.some((f) => f.active && f.isBlob && f.allowEdges);
        contourTracks.push({
          name: baseTrack.name,
          slotIndex: s,
          hasEdges: hasBlobs,
          spec: baseTrack.spec,
          voiceSpec: baseTrack.voiceSpec,
          voiceIdx: baseTrack.voiceIdx,
          frames
        });
      }
    }

    // Equalize simultaneous polyphony across all active contour slots per column
    for (let c = 0; c < width; c++) {
      let sumSq = 0;
      for (const ct of contourTracks) {
        const f = ct.frames[c];
        if (f && f.active) sumSq += f.gain * f.gain;
      }
      const rms = Math.sqrt(sumSq);
      if (rms > 0.95) {
        const trim = 0.95 / rms;
        for (const ct of contourTracks) {
          const f = ct.frames[c];
          if (f && f.active) f.gain = clamp01(f.gain * trim);
        }
      }
    }

    return contourTracks;
  }

  _buildPixel128RowHz(height) {
    const rowHz = new Float32Array(height);
    if (this.scaleMode === "continuous") {
      for (let r = 0; r < height; r++) {
        const north = (height - 1 - r) / Math.max(1, height - 1);
        rowHz[r] = 110.0 * Math.pow(16.0, north);
      }
      return rowHz;
    }

    const mode = this.scaleMode === "lydian" || this.scaleMode === "dorian" ? "lydian" : "major_pentatonic";
    const scaleMidis = buildScaleMidis(45, 93, mode);
    const binCounts = new Map();
    const rowBins = new Int32Array(height);
    for (let r = 0; r < height; r++) {
      const north = (height - 1 - r) / Math.max(1, height - 1);
      const bin = Math.min(scaleMidis.length - 1, Math.max(0, Math.round(north * (scaleMidis.length - 1))));
      rowBins[r] = bin;
      binCounts.set(bin, (binCounts.get(bin) || 0) + 1);
    }
    const binSeen = new Map();
    for (let r = 0; r < height; r++) {
      const bin = rowBins[r];
      const count = binCounts.get(bin) || 1;
      const seen = binSeen.get(bin) || 0;
      binSeen.set(bin, seen + 1);
      const centOffset = count > 1 ? (seen - (count - 1) * 0.5) * (10.0 / count) : 0;
      rowHz[r] = midiToHz(scaleMidis[bin]) * Math.pow(2, centOffset / 1200);
    }
    return rowHz;
  }

  _getPixel128Plan() {
    if (this._pixel128Plan) return this._pixel128Plan;
    const sheetsData = this.data?.color_sheets;
    const sheetsMap = sheetsData?.sheets || {};
    const width = this.prepared.width || 256;
    const height = this.prepared.height || 128;
    const nCells = width * height;

    const wSum = new Float32Array(nCells);
    const lSum = new Float32Array(nCells);
    const cSum = new Float32Array(nCells);
    const cosSum = new Float32Array(nCells);
    const sinSum = new Float32Array(nCells);

    const baseNames = Array.isArray(sheetsData?.active_sheet_order) && sheetsData.active_sheet_order.length > 0
      ? sheetsData.active_sheet_order
      : Object.keys(sheetsMap);
    const allowedNames = this.soloSheet
      ? baseNames.filter((n) => String(n).toLowerCase() === this.soloSheet)
      : baseNames;

    let populatedFromCells = false;
    for (const name of allowedNames) {
      const sheet = sheetsMap[name];
      if (!sheet) continue;
      const spec = this._getTrackSpec(name);
      const isExplicitSolo = Boolean(this.soloSheet && this.soloSheet === String(name).toLowerCase());
      if (this.muteNoise && spec.kind === "noise" && !isExplicitSolo) continue;

      const fallbackHue = spec.hueDeg ?? 270;
      if (Array.isArray(sheet.cells)) {
        populatedFromCells = true;
        for (const cell of sheet.cells) {
          const r = cell[0] | 0;
          const c = cell[1] | 0;
          const a = clamp01(cell[2]);
          if (r < 0 || r >= height || c < 0 || c >= width || a <= 0.005) continue;
          const L = clamp01(cell[3] ?? sheet.mean_lightness ?? 0.5);
          const C = Math.max(0, cell[4] ?? sheet.mean_chroma ?? 0.1);
          const h = spec.kind === "noise" ? 270 : (cell.length >= 6 && Number.isFinite(cell[5]) ? cell[5] : fallbackHue);
          const hRad = (h * Math.PI) / 180;
          const idx = c * height + r;
          wSum[idx] += a;
          lSum[idx] += a * L;
          cSum[idx] += a * C;
          cosSum[idx] += a * Math.cos(hRad);
          sinSum[idx] += a * Math.sin(hRad);
        }
      } else if (Array.isArray(sheet.alpha_grid)) {
        populatedFromCells = true;
        for (let r = 0; r < Math.min(height, sheet.alpha_grid.length); r++) {
          const rowA = sheet.alpha_grid[r] || [];
          for (let c = 0; c < Math.min(width, rowA.length); c++) {
            const a = clamp01(rowA[c]);
            if (a <= 0.005) continue;
            const L = clamp01(sheet.lightness_grid?.[r]?.[c] ?? sheet.mean_lightness ?? 0.5);
            const C = Math.max(0, sheet.chroma_grid?.[r]?.[c] ?? sheet.mean_chroma ?? 0.1);
            const h = spec.kind === "noise" ? 270 : (sheet.hue_grid?.[r]?.[c] ?? fallbackHue);
            const hRad = (h * Math.PI) / 180;
            const idx = c * height + r;
            wSum[idx] += a;
            lSum[idx] += a * L;
            cSum[idx] += a * C;
            cosSum[idx] += a * Math.cos(hRad);
            sinSum[idx] += a * Math.sin(hRad);
          }
        }
      }
    }

    if (!populatedFromCells) {
      // Fallback for synthetic payloads providing only col_profile / tracks
      for (const t of (this.prepared.tracks || [])) {
        for (let c = 0; c < width; c++) {
          const f = t.frames[c];
          if (!f || !f.active || f.gain <= 0) continue;
          const centerR = clamp(Math.round((1.0 - (f.northness ?? 0.5)) * (height - 1)), 0, height - 1);
          const halfSpan = Math.max(1, Math.round((f.ySpread || 0.04) * height));
          const hRad = ((f.hueDeg ?? 200) * Math.PI) / 180;
          for (let r = Math.max(0, centerR - halfSpan); r <= Math.min(height - 1, centerR + halfSpan); r++) {
            const idx = c * height + r;
            const a = clamp01(f.gain);
            wSum[idx] += a;
            lSum[idx] += a * f.lightness;
            cSum[idx] += a * f.chroma;
            cosSum[idx] += a * Math.cos(hRad);
            sinSum[idx] += a * Math.sin(hRad);
          }
        }
      }
    }

    const ampU8 = new Uint8Array(nCells);
    const lightU8 = new Uint8Array(nCells);
    const satU8 = new Uint8Array(nCells);
    const hueU8 = new Uint8Array(nCells);
    const colScale = new Float32Array(width);

    for (let c = 0; c < width; c++) {
      const base = c * height;
      let sqSum = 0;
      for (let r = 0; r < height; r++) {
        const idx = base + r;
        const w = wSum[idx];
        if (w <= 0.005) continue;
        // Mild floor/gamma keeps every lit pixel row audible alongside strong bands
        const aBoost = clamp01(0.18 + 0.82 * Math.pow(clamp01(w), 0.50));
        ampU8[idx] = Math.round(aBoost * 255);
        sqSum += aBoost * aBoost;

        const L = clamp01(lSum[idx] / w);
        const C = Math.max(0, cSum[idx] / w);
        const rawHue = ((Math.atan2(sinSum[idx], cosSum[idx]) * 180) / Math.PI + 360) % 360;
        const wheelDeg = oklchHueToWheelDeg(rawHue);

        lightU8[idx] = Math.round(L * 255);
        satU8[idx] = Math.round(clamp01((C - 0.015) / 0.14) * 255);
        hueU8[idx] = Math.round((wheelDeg / 360) * 240) % 240;
      }
      colScale[c] = sqSum > 0 ? 1.0 / Math.sqrt(Math.max(4.0, sqSum * 0.40)) : 0;
    }

    this._pixel128Plan = {
      width,
      height,
      ampU8,
      lightU8,
      satU8,
      hueU8,
      colScale,
      rowHz: this._buildPixel128RowHz(height)
    };
    return this._pixel128Plan;
  }

  async _ensurePixel128Worklet(ctx) {
    if (PIXEL_128_WORKLET_MODS.has(ctx)) return;
    const blob = new Blob([PIXEL_128_WORKLET_CODE], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    try {
      await ctx.audioWorklet.addModule(url);
      PIXEL_128_WORKLET_MODS.add(ctx);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  _buildPixel128AudioGraph(rawCtx, destNode, startTime, offsetSeconds = 0) {
    this.disposeNodes();
    this._nativeCtx = rawCtx;
    this._isNativeAudio = true;

    const dest = destNode || rawCtx.destination;
    const masterGain = rawCtx.createGain();
    masterGain.gain.value = 1.12;
    masterGain.connect(dest);
    this.masterGain = masterGain;

    const masterLimiter = rawCtx.createDynamicsCompressor();
    masterLimiter.threshold.value = -2;
    masterLimiter.knee.value = 0;
    masterLimiter.ratio.value = 20;
    masterLimiter.attack.value = 0.003;
    masterLimiter.release.value = 0.05;
    masterLimiter.connect(masterGain);
    this.masterLimiter = masterLimiter;

    const masterCompressor = rawCtx.createDynamicsCompressor();
    masterCompressor.threshold.value = -14;
    masterCompressor.knee.value = 6;
    masterCompressor.ratio.value = 3.0;
    masterCompressor.attack.value = 0.02;
    masterCompressor.release.value = 0.25;
    masterCompressor.connect(masterLimiter);
    this.masterCompressor = masterCompressor;

    const dcBlock = rawCtx.createBiquadFilter();
    dcBlock.type = "highpass";
    dcBlock.frequency.value = 32;
    dcBlock.Q.value = 0.707;
    dcBlock.connect(masterCompressor);
    this.masterReverb = null;

    const plan = this._getPixel128Plan();
    const effectiveDuration = Math.max(1.5, this.duration - 0.6);
    const worklet = new AudioWorkletNode(rawCtx, "earth-pixel-128", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: {
        width: plan.width,
        height: plan.height,
        ampU8: plan.ampU8,
        lightU8: plan.lightU8,
        satU8: plan.satU8,
        hueU8: plan.hueU8,
        colScale: plan.colScale,
        rowHz: plan.rowHz,
        startTime: startTime - offsetSeconds,
        audibleStartTime: startTime,
        effectiveDuration
      }
    });
    worklet.connect(dcBlock);
    this._workletNode = worklet;
    this._instruments = [worklet, dcBlock];
  }

  _buildWheelFrames(tracks, width) {
    const numVoices = HUE_WHEEL_VOICES.length;
    const frames = new Array(width);

    for (let c = 0; c < width; c++) {
      const wSq = new Float64Array(numVoices);
      const wSum = new Float64Array(numVoices);
      const lSum = new Float64Array(numVoices);
      const cSum = new Float64Array(numVoices);
      let totalSq = 0;

      for (const track of tracks) {
        if (this.muteNoise && track.spec.kind === "noise") continue;
        const f = track.frames[c];
        if (!f || !f.active || f.gain <= 0) continue;

        const wheelDeg = oklchHueToWheelDeg(f.hueDeg);
        const w = hueWheelWeights(wheelDeg);
        const wA = f.gain * w.a;
        const wB = f.gain * w.b;

        wSq[w.i] += wA * wA;
        wSum[w.i] += wA;
        lSum[w.i] += wA * f.lightness;
        cSum[w.i] += wA * f.chroma;

        wSq[w.j] += wB * wB;
        wSum[w.j] += wB;
        lSum[w.j] += wB * f.lightness;
        cSum[w.j] += wB * f.chroma;

        totalSq += f.gain * f.gain;
      }

      const voices = new Array(numVoices);
      let activeTotalSq = 0;
      for (let k = 0; k < numVoices; k++) {
        const amp = clamp01(Math.sqrt(wSq[k]));
        const ws = wSum[k];
        activeTotalSq += amp * amp;
        voices[k] = {
          amp,
          active: amp > 0.002,
          lightness: ws > 1e-6 ? clamp01(lSum[k] / ws) : 0.5,
          chroma: ws > 1e-6 ? Math.max(0, cSum[k] / ws) : 0.08
        };
      }

      frames[c] = {
        voices,
        activity: clamp01(Math.sqrt(totalSq || activeTotalSq))
      };
    }

    // Pre-position silent spans for each of the 12 voices so voices fade smoothly in/out without filter/octave jumps
    for (let k = 0; k < numVoices; k++) {
      let nextL = 0.5;
      let nextC = 0.08;
      let found = false;
      for (let c = 0; c < width; c++) {
        if (frames[c].voices[k].active) {
          nextL = frames[c].voices[k].lightness;
          nextC = frames[c].voices[k].chroma;
          found = true;
          break;
        }
      }
      if (!found) continue;
      for (let c = width - 1; c >= 0; c--) {
        const v = frames[c].voices[k];
        if (v.active) {
          nextL = v.lightness;
          nextC = v.chroma;
        } else {
          v.lightness = nextL;
          v.chroma = nextC;
        }
      }
      let prevL = frames[0].voices[k].lightness;
      let prevC = frames[0].voices[k].chroma;
      for (let c = 0; c < width; c++) {
        const v = frames[c].voices[k];
        if (v.active) {
          prevL = v.lightness;
          prevC = v.chroma;
        } else if (c > 0 && frames[c - 1].voices[k].active) {
          v.lightness = prevL;
          v.chroma = prevC;
        }
      }
    }

    return frames;
  }

  _buildAudioGraph(destinationNode, nativeCtxOverride = null) {
    this.disposeNodes();

    const rawCtx = nativeCtxOverride
      || (destinationNode && destinationNode.context && typeof destinationNode.context.createOscillator === "function"
        ? destinationNode.context
        : null);
    const isNative = Boolean(
      rawCtx
      && typeof rawCtx.createOscillator === "function"
      && typeof rawCtx.createGain === "function"
      && typeof rawCtx.createBiquadFilter === "function"
      && (!destinationNode || destinationNode === rawCtx.destination || destinationNode.context === rawCtx)
    );

    if (this.sceneScore && isNative) {
      this._nativeCtx = rawCtx;
      this._isNativeAudio = true;
      this._scoreRenderer = new SceneScore.Renderer(rawCtx, destinationNode || rawCtx.destination, this.sceneScore,
        { reverb: this._scoreReverb, volume: this.volume, preparedPCM: this._preparedPCM });
      return;
    }

    this._nativeCtx = isNative ? rawCtx : null;
    this._isNativeAudio = isNative;

    const isContourMode = (this.presetName === "contour_trio");
    const dataTracks = (isContourMode && Array.isArray(this.prepared.contourTracks) && this.prepared.contourTracks.length > 0)
      ? this.prepared.contourTracks
      : (this.prepared.tracks || []);
    const builtVoices = [];

    if (isNative) {
      const dest = destinationNode || rawCtx.destination;

      const masterGain = rawCtx.createGain();
      masterGain.gain.value = 1.15;
      masterGain.connect(dest);
      this.masterGain = masterGain;

      const masterLimiter = rawCtx.createDynamicsCompressor();
      masterLimiter.threshold.value = -2;
      masterLimiter.knee.value = 0;
      masterLimiter.ratio.value = 20;
      masterLimiter.attack.value = 0.003;
      masterLimiter.release.value = 0.05;
      masterLimiter.connect(masterGain);
      this.masterLimiter = masterLimiter;

      const masterCompressor = rawCtx.createDynamicsCompressor();
      masterCompressor.threshold.value = -14;
      masterCompressor.knee.value = 6;
      masterCompressor.ratio.value = 3.0;
      masterCompressor.attack.value = 0.02;
      masterCompressor.release.value = 0.25;
      masterCompressor.connect(masterLimiter);
      this.masterCompressor = masterCompressor;

      // Direct signal bus + optional acoustic concert chamber convolver reverb
      const dcBlock = rawCtx.createBiquadFilter();
      dcBlock.type = "highpass";
      dcBlock.frequency.value = 32;
      dcBlock.Q.value = 0.707;
      dcBlock.connect(masterCompressor);

      const bus = rawCtx.createGain();
      bus.gain.value = 1.0;

      const dryGain = rawCtx.createGain();
      dryGain.gain.value = this.useReverb ? 0.82 : 1.0;
      bus.connect(dryGain);
      dryGain.connect(dcBlock);

      let roomConvolver = null;
      let wetGain = null;
      if (this.useReverb) {
        roomConvolver = this._createRoomReverb(rawCtx, 1.35, 2.7);
        if (roomConvolver) {
          wetGain = rawCtx.createGain();
          wetGain.gain.value = 0.20;
          bus.connect(roomConvolver);
          roomConvolver.connect(wetGain);
          wetGain.connect(dcBlock);
        }
      }
      this.masterReverb = roomConvolver;

      const allNodes = [bus, dryGain, dcBlock, roomConvolver, wetGain].filter(Boolean);

      for (let idx = 0; idx < dataTracks.length; idx++) {
        const track = dataTracks[idx];
        const v = track.voiceSpec || HUE_WHEEL_VOICES[0];
        const k = track.voiceIdx || 0;
        const phase = (idx * 47 + k * 37) % 360;
        const f0 = track.frames[0] || {};
        const initHz = clamp(f0.hz || 220, 45, 2400);

        let panner;
        if (typeof rawCtx.createStereoPanner === "function") {
          panner = rawCtx.createStereoPanner();
          panner.pan.value = v.pan;
        } else {
          panner = rawCtx.createGain();
          panner.gain.value = 1.0;
        }
        panner.connect(bus);

        const voiceGain = rawCtx.createGain();
        voiceGain.gain.value = 0;
        voiceGain.connect(panner);

        const filter = rawCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = v.lp;
        filter.Q.value = v.q;
        filter.connect(voiceGain);

        const osc = rawCtx.createOscillator();
        osc.frequency.value = initHz;

        const topOsc = track.hasEdges ? rawCtx.createOscillator() : null;
        if (topOsc) {
          topOsc.frequency.value = clamp(f0.topHz || initHz, 45, 2400);
        }
        const botOsc = track.hasEdges ? rawCtx.createOscillator() : null;
        if (botOsc) {
          botOsc.frequency.value = clamp(f0.botHz || initHz, 45, 2400);
        }

        let modOsc = null;
        let modGain = null;

        if (v.fm) {
          osc.type = "sine";
          modOsc = rawCtx.createOscillator();
          modOsc.type = "sine";
          modOsc.frequency.value = initHz * v.fm[0];
          modGain = rawCtx.createGain();
          modGain.gain.value = initHz * v.fm[1];
          modOsc.connect(modGain);
          modGain.connect(osc.frequency);

          if (topOsc) topOsc.type = "sine";
          if (botOsc) botOsc.type = "sine";
        } else if (v.partials && typeof rawCtx.createPeriodicWave === "function") {
          const nHarm = v.partials.length;
          const real = new Float32Array(nHarm + 1);
          const imag = new Float32Array(nHarm + 1);
          const phaseRad = (phase * Math.PI) / 180;
          for (let h = 0; h < nHarm; h++) {
            const amp = v.partials[h] || 0;
            const theta = phaseRad * (h + 1);
            real[h + 1] = amp * Math.sin(theta);
            imag[h + 1] = amp * Math.cos(theta);
          }
          const pWave = rawCtx.createPeriodicWave(real, imag);
          osc.setPeriodicWave(pWave);
          if (topOsc) topOsc.setPeriodicWave(pWave);
          if (botOsc) botOsc.setPeriodicWave(pWave);
        } else {
          osc.type = v.type || "sine";
          if (topOsc) topOsc.type = v.type || "sine";
          if (botOsc) botOsc.type = v.type || "sine";
        }

        const vibOsc = rawCtx.createOscillator();
        vibOsc.type = "sine";
        vibOsc.frequency.value = v.vib[0];
        const vibGain = rawCtx.createGain();
        vibGain.gain.value = v.vib[1];
        vibOsc.connect(vibGain);
        vibGain.connect(osc.detune);
        if (topOsc) vibGain.connect(topOsc.detune);
        if (botOsc) vibGain.connect(botOsc.detune);

        const midGain = rawCtx.createGain();
        midGain.gain.value = 1;
        osc.connect(midGain);
        midGain.connect(filter);

        const topGain = topOsc ? rawCtx.createGain() : null;
        if (topGain) {
          topGain.gain.value = 0;
          topOsc.connect(topGain);
          topGain.connect(filter);
        }

        const botGain = botOsc ? rawCtx.createGain() : null;
        if (botGain) {
          botGain.gain.value = 0;
          botOsc.connect(botGain);
          botGain.connect(filter);
        }

        builtVoices.push({
          trackIndex: idx,
          track,
          voiceIndex: k,
          spec: v,
          panner,
          gain: voiceGain,
          filter,
          osc,
          modOsc,
          modGain,
          topOsc,
          botOsc,
          topGain,
          botGain,
          midGain,
          vibOsc,
          vibGain,
          subOsc: null,
          hiOsc: null,
          secOsc: null,
          secModOsc: null,
          secModGain: null,
          secGain: null,
          subGain: null,
          hiGain: null
        });
        allNodes.push(
          panner, voiceGain, filter, osc, modOsc, modGain,
          topOsc, botOsc, topGain, botGain, midGain, vibOsc, vibGain
        );
      }

      this._wheelVoices = builtVoices;
      this._drone = null;
      this._sharedNoise = null;
      this._tracks = builtVoices;
      this._instruments = allNodes.filter(Boolean);
      return;
    }

    // Fallback Tone.js graph path (for Node unit tests & non-native mocks)
    const dest = destinationNode || (typeof Tone.getDestination === "function" ? Tone.getDestination() : Tone.Destination);

    this.masterGain = new Tone.Gain(1.15).connect(dest);
    this.masterLimiter = new Tone.Limiter(-2).connect(this.masterGain);
    this.masterCompressor = new Tone.Compressor({
      threshold: -14,
      ratio: 3.0,
      attack: 0.02,
      release: 0.25
    }).connect(this.masterLimiter);

    const dcBlock = new Tone.Filter({
      type: "highpass",
      frequency: 32,
      Q: 0.707,
      rolloff: -12
    }).connect(this.masterCompressor);
    const bus = new Tone.Gain(1.0).connect(dcBlock);
    this.masterReverb = null;

    const allNodes = [bus, dcBlock];

    for (let idx = 0; idx < dataTracks.length; idx++) {
      const track = dataTracks[idx];
      const v = track.voiceSpec || HUE_WHEEL_VOICES[0];
      const k = track.voiceIdx || 0;
      const phase = (idx * 47 + k * 37) % 360;
      const f0 = track.frames[0] || {};
      const initHz = clamp(f0.hz || 220, 45, 2400);

      const panner = new Tone.Panner(v.pan).connect(bus);
      const voiceGain = new Tone.Gain(0).connect(panner);
      const filter = new Tone.Filter({
        type: "lowpass",
        frequency: v.lp,
        Q: v.q,
        rolloff: -12
      }).connect(voiceGain);

      let osc;
      let modOsc = null;
      let modGain = null;

      if (v.fm) {
        osc = new Tone.Oscillator({ frequency: initHz, type: "sine", phase });
        modOsc = new Tone.Oscillator({ frequency: initHz * v.fm[0], type: "sine", phase: (phase + 90) % 360 });
        modGain = new Tone.Gain(initHz * v.fm[1]);
        modOsc.connect(modGain);
        if (osc.frequency) {
          modGain.connect(osc.frequency);
        }
      } else if (v.partials) {
        osc = new Tone.Oscillator({ frequency: initHz, type: "custom", partials: v.partials, phase });
      } else {
        osc = new Tone.Oscillator({ frequency: initHz, type: v.type, phase });
      }

      const topOsc = track.hasEdges ? new Tone.Oscillator({
        frequency: clamp(f0.topHz || initHz, 45, 2400),
        type: v.partials ? "custom" : (v.type || "sine"),
        partials: v.partials,
        phase: (phase + 60) % 360
      }) : null;
      const botOsc = track.hasEdges ? new Tone.Oscillator({
        frequency: clamp(f0.botHz || initHz, 45, 2400),
        type: v.partials ? "custom" : (v.type || "sine"),
        partials: v.partials,
        phase: (phase + 240) % 360
      }) : null;

      const vibOsc = new Tone.Oscillator({ frequency: v.vib[0], type: "sine", phase: (k * 53) % 360 });
      const vibGain = new Tone.Gain(v.vib[1]);
      vibOsc.connect(vibGain);
      if (osc.detune) {
        vibGain.connect(osc.detune);
      }
      if (topOsc && topOsc.detune) {
        vibGain.connect(topOsc.detune);
      }
      if (botOsc && botOsc.detune) {
        vibGain.connect(botOsc.detune);
      }

      const midGain = new Tone.Gain(1).connect(filter);
      osc.connect(midGain);

      const topGain = topOsc ? new Tone.Gain(0).connect(filter) : null;
      const botGain = botOsc ? new Tone.Gain(0).connect(filter) : null;
      if (topOsc && topGain) topOsc.connect(topGain);
      if (botOsc && botGain) botOsc.connect(botGain);

      builtVoices.push({
        trackIndex: idx,
        track,
        voiceIndex: k,
        spec: v,
        panner,
        gain: voiceGain,
        filter,
        osc,
        modOsc,
        modGain,
        topOsc,
        botOsc,
        topGain,
        botGain,
        midGain,
        vibOsc,
        vibGain,
        subOsc: null,
        hiOsc: null,
        secOsc: null,
        secModOsc: null,
        secModGain: null,
        secGain: null,
        subGain: null,
        hiGain: null
      });
      allNodes.push(
        panner, voiceGain, filter, osc, modOsc, modGain,
        topOsc, botOsc, topGain, botGain, midGain, vibOsc, vibGain
      );
    }

    this._wheelVoices = builtVoices;
    this._drone = null;
    this._sharedNoise = null;
    this._tracks = builtVoices;
    this._instruments = allNodes.filter(Boolean);
  }

  _octaveMix(lightness) {
    const l = clamp01((lightness - 0.14) / 0.70);
    const wSub = Math.pow(clamp01((0.55 - l) / 0.55), 1.35) * 0.90;
    const wMid = clamp01(1.0 - Math.abs(l - 0.5) * 1.45) * 0.92 + 0.14;
    const wHi = Math.pow(clamp01((l - 0.45) / 0.55), 1.35) * 0.95;
    return { wSub, wMid, wHi };
  }

  _filterState(spec, chroma, lightness = 0.5, changeBoost = 0) {
    const satNorm = clamp01((chroma - 0.015) / 0.14);
    const lightNorm = clamp01((lightness - 0.14) / 0.70);
    const baseCutoff = spec.lp || 1800;
    // Acoustic formant filter: stays warm and pleasant (no piercing treble buzz)
    const filterFactor = 0.55 + 0.55 * satNorm + 0.15 * (lightNorm - 0.5) + 0.15 * clamp01(changeBoost);
    const cutoff = clamp(baseCutoff * filterFactor, 220, 3800);
    const q = clamp((spec.q || 0.7) * (0.75 + 0.40 * satNorm), 0.5, 1.25);
    return { cutoff, q, satNorm, lightNorm };
  }

  _scheduleColumnsUpTo(horizonSec) {
    const st = this._schedState;
    if (!st || st.finished) return;
    const voices = this._wheelVoices || [];
    const mixScale = 0.85;

    const setParam = (param, val, t) => {
      if (param && typeof param.setValueAtTime === "function") param.setValueAtTime(val, t);
    };
    const rampParam = (param, val, t) => {
      if (param && typeof param.linearRampToValueAtTime === "function") param.linearRampToValueAtTime(val, t);
    };

    const setVoiceState = (fn, vn, state, t) => {
      fn(vn.gain.gain, state.amp, t);
      fn(vn.filter.frequency, state.filt.cutoff, t);
      fn(vn.filter.Q, state.filt.q, t);
      fn(vn.osc.frequency, state.hz, t);
      if (vn.topOsc && vn.topGain) {
        fn(vn.topOsc.frequency, state.topHz, t);
        fn(vn.topGain.gain, state.edgeAmp, t);
      }
      if (vn.botOsc && vn.botGain) {
        fn(vn.botOsc.frequency, state.botHz, t);
        fn(vn.botGain.gain, state.edgeAmp, t);
      }
      if (vn.modOsc && vn.modGain && vn.spec.fm) {
        const fmMult = state.fmModMult ?? 1.0;
        fn(vn.modOsc.frequency, state.hz * vn.spec.fm[0], t);
        fn(vn.modGain.gain, state.hz * vn.spec.fm[1] * fmMult, t);
      }
      fn(vn.vibGain.gain, state.vibDepth, t);
      if (vn.panner && vn.panner.pan) {
        fn(vn.panner.pan, state.pan, t);
      }
    };

    const buildColState = (vn, f) => {
      const filt = this._filterState(vn.spec, f.chroma, f.lightness, f.changeBoost);
      const active = Boolean(f.active && f.gain > 0.002);

      // Contrast dynamics: warm presence on dull, clear singing resonance on bright
      const brilliance = 0.65 + 0.35 * filt.satNorm + 0.15 * (filt.lightNorm - 0.5);
      const amp = active ? clamp01(f.gain) * vn.spec.lvl * mixScale * clamp(brilliance, 0.45, 1.10) : 0;

      const hz = clamp(f.hz || 220, 45, 2600);
      const topHz = clamp(f.topHz || hz, 45, 2600);
      const botHz = clamp(f.botHz || hz, 45, 2600);
      const isBlob = Boolean(active && f.isBlob && f.allowEdges);
      const edgeAmp = isBlob ? clamp(0.10 + (f.coverage || 0.05) * 1.0, 0.08, 0.20) : 0;
      const vibDepth = vn.spec.vib[1] * (0.70 + 0.35 * filt.satNorm + 0.35 * clamp01(f.texture));
      const pan = clamp(Math.sin(((f.wheelDeg ?? vn.spec.hue) * Math.PI) / 180) * 0.55, -0.65, 0.65);
      const fmModMult = 0.35 + 0.40 * filt.satNorm;
      return { active, amp, hz, topHz, botHz, edgeAmp, filt, vibDepth, pan, fmModMult };
    };

    while (st.nextCol < st.numCols) {
      const c = st.nextCol;
      const tPrev = c === 0
        ? st.startTime
        : st.startTime + (c / Math.max(1, st.numCols)) * st.effectiveDuration;
      const tTarget = st.startTime + ((c + 1) / Math.max(1, st.numCols)) * st.effectiveDuration;
      if (Number.isFinite(horizonSec) && tTarget > horizonSec && c > 0) {
        break;
      }

      for (let idx = 0; idx < voices.length; idx++) {
        const vn = voices[idx];
        const frames = vn.track.frames;
        const f = frames[c];
        const prevSilent = c === 0 ? true : !(frames[c - 1]?.active && frames[c - 1].gain > 0.002);
        const curSilent = !(f.active && f.gain > 0.002);
        const nextSilent = c + 1 >= st.numCols ? true : !(frames[c + 1]?.active && frames[c + 1].gain > 0.002);

        if (prevSilent && curSilent && nextSilent && c > 0) {
          continue;
        }

        const curState = buildColState(vn, f);
        if (prevSilent && curSilent && !nextSilent) {
          // Pre-position silent gap to next entry pitch & timbre so edge starts cleanly over 1 slice
          const nextState = buildColState(vn, frames[c + 1]);
          setVoiceState(setParam, vn, { ...nextState, amp: 0, edgeAmp: 0 }, tTarget);
          vn._lastState = { ...nextState, amp: 0, edgeAmp: 0 };
          continue;
        }

        const edge = clamp01(f.edgeScore ?? 0);
        if (edge >= 0.28 && c > 0 && vn._lastState && tTarget > tPrev + 1e-4) {
          // Hold previous state up to just before the visual edge so sharp contours snap cleanly without blur
          const holdFrac = clamp(edge * 0.85, 0.25, 0.88);
          const tAnchor = tPrev + (tTarget - tPrev) * holdFrac;
          setVoiceState(setParam, vn, vn._lastState, tAnchor);
        }

        setVoiceState(rampParam, vn, curState, tTarget);
        vn._lastState = curState;
      }

      st.nextCol += 1;
    }

    if (st.nextCol >= st.numCols && !st.finished) {
      for (let idx = 0; idx < voices.length; idx++) {
        const vn = voices[idx];
        rampParam(vn.gain.gain, 0, st.fadeOutTime);
        if (vn.topGain) rampParam(vn.topGain.gain, 0, st.fadeOutTime);
        if (vn.botGain) rampParam(vn.botGain.gain, 0, st.fadeOutTime);
        if (vn.osc && typeof vn.osc.stop === "function") vn.osc.stop(st.stopTime);
        if (vn.topOsc && typeof vn.topOsc.stop === "function") vn.topOsc.stop(st.stopTime);
        if (vn.botOsc && typeof vn.botOsc.stop === "function") vn.botOsc.stop(st.stopTime);
        if (vn.modOsc && typeof vn.modOsc.stop === "function") vn.modOsc.stop(st.stopTime);
        if (vn.vibOsc && typeof vn.vibOsc.stop === "function") vn.vibOsc.stop(st.stopTime);
      }
      st.finished = true;
      if (this._lookaheadTimer !== null) {
        clearInterval(this._lookaheadTimer);
        this._lookaheadTimer = null;
      }
    }
  }

  _scheduleAt(startTime, options = {}) {
    if (this._scoreRenderer) {
      this._scoreRenderer.schedule(startTime, options.offsetSeconds || 0);
      return;
    }
    const voices = this._wheelVoices || [];
    const width = this.prepared.width || 0;
    if (voices.length === 0 || width === 0) return;

    const numCols = width;
    const effectiveDuration = Math.max(1.5, this.duration - 0.6);
    const fadeOutTime = startTime + effectiveDuration + 0.40;
    const stopTime = startTime + effectiveDuration + 0.60;

    const setParam = (param, val, t) => {
      if (param && typeof param.setValueAtTime === "function") param.setValueAtTime(val, t);
    };

    for (let idx = 0; idx < voices.length; idx++) {
      const vn = voices[idx];
      const f0 = vn.track.frames[0] || {};
      const filt0 = this._filterState(vn.spec, f0.chroma ?? 0.08, f0.lightness ?? 0.5, f0.changeBoost ?? 0);
      const initHz = clamp(f0.hz || 220, 45, 2600);
      const topHz = clamp(f0.topHz || initHz, 45, 2600);
      const botHz = clamp(f0.botHz || initHz, 45, 2600);
      const initPan = clamp(Math.sin(((f0.wheelDeg ?? vn.spec.hue) * Math.PI) / 180) * 0.55, -0.65, 0.65);
      const fmModMult0 = 0.40 + 0.95 * filt0.satNorm;

      if (vn.osc && typeof vn.osc.start === "function") vn.osc.start(startTime);
      if (vn.topOsc && typeof vn.topOsc.start === "function") vn.topOsc.start(startTime);
      if (vn.botOsc && typeof vn.botOsc.start === "function") vn.botOsc.start(startTime);
      if (vn.modOsc && typeof vn.modOsc.start === "function") vn.modOsc.start(startTime);
      if (vn.vibOsc && typeof vn.vibOsc.start === "function") vn.vibOsc.start(startTime);

      setParam(vn.gain.gain, 0, startTime);
      if (vn.topGain) setParam(vn.topGain.gain, 0, startTime);
      if (vn.botGain) setParam(vn.botGain.gain, 0, startTime);
      setParam(vn.filter.frequency, filt0.cutoff, startTime);
      setParam(vn.filter.Q, filt0.q, startTime);
      setParam(vn.osc.frequency, initHz, startTime);
      if (vn.topOsc) setParam(vn.topOsc.frequency, topHz, startTime);
      if (vn.botOsc) setParam(vn.botOsc.frequency, botHz, startTime);
      if (vn.modOsc && vn.modGain && vn.spec.fm) {
        setParam(vn.modOsc.frequency, initHz * vn.spec.fm[0], startTime);
        setParam(vn.modGain.gain, initHz * vn.spec.fm[1] * fmModMult0, startTime);
      }
      setParam(vn.vibGain.gain, vn.spec.vib[1], startTime);
      if (vn.panner && vn.panner.pan) {
        setParam(vn.panner.pan, initPan, startTime);
      }
      vn._lastState = {
        active: false,
        amp: 0,
        hz: initHz,
        topHz,
        botHz,
        edgeAmp: 0,
        filt: filt0,
        vibDepth: vn.spec.vib[1],
        pan: initPan,
        fmModMult: fmModMult0
      };
    }

    this._schedState = {
      startTime,
      effectiveDuration,
      fadeOutTime,
      stopTime,
      numCols,
      nextCol: 0,
      finished: false
    };

    const upToSec = Number.isFinite(options.upToSec) ? options.upToSec : Infinity;
    const initialHorizon = Number.isFinite(upToSec) ? startTime + upToSec : Infinity;
    this._scheduleColumnsUpTo(initialHorizon);
  }

  getTelemetryAt(elapsedSec) {
    if (this.sceneScore) return SceneScore.telemetry(this.sceneScore, elapsedSec);
    const effectiveDuration = Math.max(1.5, this.duration - 0.6);
    const progress = clamp01(elapsedSec / effectiveDuration);
    const colIdx = Math.min(
      this.prepared.width - 1,
      Math.max(0, Math.round(progress * (this.prepared.width - 1)))
    );

    const hueLevels = {};
    for (const h of HUE_TRACK_ORDER) {
      const spec = this._getTrackSpec(h);
      hueLevels[h] = { mag: 0, label: spec.label, color: spec.color };
    }

    let primaryHue = null;
    let primaryVoice = null;
    let primaryGain = 0;
    let panSum = 0;
    let hzSum = 0;
    let modSum = 0;
    let wSum = 0;

    const rawTracks = this.prepared.tracks || [];
    for (const t of rawTracks) {
      const f = t.frames[colIdx];
      if (!f) continue;
      const bucket = t.name === "brown" ? "orange" : t.name === "violet" ? "purple" : t.name;
      if (hueLevels[bucket]) {
        hueLevels[bucket].mag = Math.max(hueLevels[bucket].mag, f.gain);
      }
      if (f.active && f.gain > 0.01) {
        const chromaNorm = clamp01((f.chroma - 0.015) / 0.14);
        const l = clamp01((f.lightness - 0.14) / 0.70);
        const octShift = (l - 0.5) * 0.65;
        const effHz = f.hz * Math.pow(2, octShift);
        const pan = clamp(Math.sin(((f.wheelDeg ?? 0) * Math.PI) / 180) * 0.55, -0.65, 0.65);

        panSum += pan * f.gain;
        hzSum += effHz * f.gain;
        modSum += (1.0 - chromaNorm) * f.gain;
        wSum += f.gain;
        if (f.gain > primaryGain) {
          primaryGain = f.gain;
          primaryHue = t.name;
          primaryVoice = t.voiceSpec?.name || null;
        }
      }
    }

    const freqHz = wSum > 0 ? hzSum / wSum : 220.0;
    const pan = wSum > 0 ? clamp(panSum / wSum, -1, 1) : 0;
    const modIndex = wSum > 0 ? modSum / wSum : 0;

    return {
      progress,
      colIdx,
      totalCols: this.prepared.width,
      stepIdx: colIdx,
      totalSteps: this.prepared.width,
      pan,
      freqHz,
      modIndex,
      noteName: hzToNearestNote(freqHz),
      active: wSum > 0.005,
      activePreset: this.prepared?.activePreset || "pixel_128",
      primaryHue: primaryHue && primaryVoice ? `${primaryHue} · ${primaryVoice}` : (primaryHue || primaryVoice),
      hueLevels
    };
  }

  buildAudioGraph(destinationNode) {
    this._buildAudioGraph(destinationNode);
  }

  scheduleAt(startTime) {
    this._scheduleAt(startTime);
  }

  async playLive(offsetSeconds = 0) {
    offsetSeconds = Math.max(0, Math.min(this.duration - .05, Number(offsetSeconds) || 0));
    let unlockTimer;
    const startGuard = new Promise((_, reject) =>
      { unlockTimer = setTimeout(() => reject(new Error("AudioContext unlock timed out")), 10000); }
    );
    let nativeCtx;
    try { nativeCtx = await Promise.race([
      (async () => {
        const ctx = await EarthJukeboxEngine.unlockAudio();
        if (!ctx && typeof Tone !== "undefined") {
          await Tone.start();
          if (Tone.context.state !== "running") {
            await Tone.context.resume();
          }
        }
        return ctx;
      })(),
      startGuard
    ]); } finally { clearTimeout(unlockTimer); }

    if (
      nativeCtx
      && this.presetName === "pixel_128"
      && typeof AudioWorkletNode === "function"
      && nativeCtx.audioWorklet
    ) {
      await this._ensurePixel128Worklet(nativeCtx);
      const startTime = nativeCtx.currentTime + 0.06;
      this._buildPixel128AudioGraph(nativeCtx, nativeCtx.destination, startTime, offsetSeconds);
      this.isPlaying = true;
      this.startTime = startTime - offsetSeconds;
      return;
    }

    if (nativeCtx) {
      this._buildAudioGraph(nativeCtx.destination, nativeCtx);
      const startTime = nativeCtx.currentTime + 0.08;
      this._scheduleAt(startTime, { upToSec: 2.5, offsetSeconds });
      this.isPlaying = true;
      this.startTime = startTime - offsetSeconds;
      if (this._schedState && !this._schedState.finished) {
        this._lookaheadTimer = setInterval(() => {
          if (!this.isPlaying || !this._nativeCtx) {
            if (this._lookaheadTimer !== null) {
              clearInterval(this._lookaheadTimer);
              this._lookaheadTimer = null;
            }
            return;
          }
          this._scheduleColumnsUpTo(this._nativeCtx.currentTime + 2.5);
        }, 120);
      }
      return;
    }

    const liveDest = typeof Tone.getDestination === "function" ? Tone.getDestination() : Tone.Destination;
    this._buildAudioGraph(liveDest);
    const startTime = Tone.now() + 0.16;
    this._scheduleAt(startTime);
    this.isPlaying = true;
    this.startTime = startTime;
  }

  stop() {
    this.isPlaying = false;
    if (this._scoreRenderer) this._scoreRenderer.stop();
    if (this._lookaheadTimer !== null) {
      clearInterval(this._lookaheadTimer);
      this._lookaheadTimer = null;
    }
    this._schedState = null;
    if (this._workletNode) {
      try { this._workletNode.port.postMessage("stop"); } catch (e) {}
      this._workletNode = null;
    }
    for (const node of [...(this._instruments || []), ...(this._tempNodes || [])]) {
      if (!node) continue;
      try { if (typeof node.releaseAll === "function") node.releaseAll(); } catch (e) {}
      try { if (typeof node.stop === "function") node.stop(); } catch (e) {}
      if (node.gain && typeof node.gain.cancelScheduledValues === "function") {
        try { node.gain.cancelScheduledValues(0); node.gain.value = 0; } catch (e) {}
      }
    }
  }

  disposeNodes() {
    this.stop();
    if (this._scoreRenderer) {
      this._scoreRenderer.dispose();
      this._scoreRenderer = null;
    }
    const all = [
      ...(this._instruments || []),
      ...(this._tempNodes || []),
      this.masterReverb,
      this.masterCompressor,
      this.masterGain,
      this.masterLimiter
    ];
    for (const node of all) {
      if (node) {
        try { if (typeof node.disconnect === "function") node.disconnect(); } catch (e) {}
        try { if (typeof node.dispose === "function") node.dispose(); } catch (e) {}
      }
    }
    this._instruments = [];
    this._tempNodes = [];
    this._tracks = [];
    this._wheelVoices = [];
    this._workletNode = null;
    this._drone = null;
    this._sharedNoise = null;
    this._nativeCtx = null;
    this._isNativeAudio = false;
    this.masterReverb = null;
    this.masterCompressor = null;
    this.masterGain = null;
    this.masterLimiter = null;
  }

  async renderOfflineWav() {
    const OfflineCtor = typeof globalThis !== "undefined"
      ? (globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext)
      : null;

    if (typeof OfflineCtor === "function") {
      const sr = 44100;
      const totalSamples = Math.max(1, Math.ceil(this.duration * sr));
      const offlineCtx = new OfflineCtor(2, totalSamples, sr);
      if (
        this.presetName === "pixel_128"
        && typeof AudioWorkletNode === "function"
        && offlineCtx.audioWorklet
      ) {
        await this._ensurePixel128Worklet(offlineCtx);
        this._buildPixel128AudioGraph(offlineCtx, offlineCtx.destination, 0.08);
      } else {
        this._buildAudioGraph(offlineCtx.destination, offlineCtx);
        this._scheduleAt(0.08);
      }
      const audioBuffer = await offlineCtx.startRendering();
      this.disposeNodes();
      normalizeBufferToLufsAndPeak(audioBuffer, -16.0, -1.0);
      return this.audioBufferToWav(audioBuffer);
    }

    let buffer;
    if (
      typeof Tone.OfflineContext === "function"
      && typeof Tone.getContext === "function"
      && typeof Tone.setContext === "function"
    ) {
      const prevCtx = Tone.getContext();
      const offlineCtx = new Tone.OfflineContext(2, this.duration, 44100);
      let renderPromise;
      Tone.setContext(offlineCtx);
      try {
        this._buildAudioGraph(offlineCtx.destination);
        this._scheduleAt(0.08);
        renderPromise = offlineCtx.render(false);
      } finally {
        Tone.setContext(prevCtx);
      }
      buffer = await renderPromise;
    } else {
      buffer = await Tone.Offline((offlineCtx) => {
        const dest = (offlineCtx && offlineCtx.destination)
          || (typeof Tone.getDestination === "function" ? Tone.getDestination() : Tone.Destination);
        this._buildAudioGraph(dest);
        this._scheduleAt(0.08);
      }, this.duration, 2, 44100);
    }

    this.disposeNodes();
    const audioBuffer = buffer.get();
    normalizeBufferToLufsAndPeak(audioBuffer, -16.0, -1.0);
    return this.audioBufferToWav(audioBuffer);
  }

  audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = buffer.length * blockAlign;
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeStr(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeStr(36, "data");
    view.setUint32(40, dataSize, true);

    // Acquire channel views once. Reacquiring them for every PCM sample can
    // repeatedly copy browser-owned audio memory and stall long exports.
    const channels = Array.from({ length: numChannels }, (_, ch) => buffer.getChannelData(ch));
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = clamp(channels[channel][i], -1, 1);
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    return new Blob([view], { type: "audio/wav" });
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    EarthJukeboxEngine,
    HUE_TRACK_ORDER,
    HUE_TRACK_SPECS,
    HUE_WHEEL_VOICES,
    hueWheelWeights,
    oklchHueToWheelDeg,
    measureIntegratedLufs,
    normalizeBufferToLufsAndPeak,
    noteToHz,
    hzToNearestNote
  };
}
