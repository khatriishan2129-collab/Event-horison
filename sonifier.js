/**
 * Earth Jukebox - Realtime Map Sonification Engine
 * Supports 3 sweep modes:
 *  1. 'we'     - West -> East Longitudinal Sweep (Time: Longitude | Pitch: Latitude | Pan: West-East)
 *  2. 'ns'     - North -> South Latitudinal Sweep (Time: Latitude | Stereo: Longitude spread | Pitch: Climate bands)
 *  3. 'spiral' - Cyclone / Radial Spiral (Angle: Doppler Stereo Rotation | Radius: Vorticity & Pitch Acceleration)
 */

class EarthSonifier {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.droneGain = null;
    this.panner = null;
    this.filter = null;
    this.carrierOsc = null;
    this.harmOsc = null;
    this.droneOsc = null;
    this.carrierGain = null;
    this.harmGain = null;

    this.isPlaying = false;
    this.mode = 'we'; // 'we' | 'ns' | 'spiral'
    this.progress = 0; // 0 to 1
    this.speed = 1.0;
    this.volume = 0.85;
    this.droneLevel = 0.35;
    this.durationSec = 36;
    this.lastFrameTime = 0;
    this.animId = null;

    this.canvas = null;
    this.ctx = null;
    this.imageData = null;
    this.imgWidth = 0;
    this.imgHeight = 0;
    this.imgSource = null;

    this.activeTheme = 'atmosphere';
    this.activeDatasetKey = 'atmosphere_aod';

    // Base root notes per sphere theme
    this.themeRoots = {
      atmosphere: { rootFreq: 110.0, scale: [110, 137.5, 165, 220, 275, 330, 440, 550, 660] }, // F Lydian / A
      lithosphere: { rootFreq: 98.0, scale: [98, 122.5, 147, 196, 245, 294, 392, 490, 588] },   // D Major warm
      hydrosphere: { rootFreq: 82.4, scale: [82.4, 110, 123.5, 164.8, 220, 246.9, 329.6, 440] }, // C / E fluid
      general:     { rootFreq: 98.0, scale: [98, 110, 130.8, 146.8, 164.8, 196, 220, 261.6, 293.6] } // G Pentatonic
    };

    this.datasets = {
      atmosphere_aod: {
        sphere: 'Atmosphere',
        theme: 'atmosphere',
        title: 'Aerosol Optical Depth (AOD)',
        sub: 'Atmospheric smoke, dust plumes & airborne clean-air visibility',
        file: 'assets/maps/atmosphere_aod.png',
        unit: 'AOD',
        minVal: 0.0,
        maxVal: 1.2,
        rampMin: '0.0 AOD (Pristine Air)',
        rampMax: '1.2+ AOD (Dense Smoke)',
        anomalyThreshold: 0.75,
        anomalyLabel: 'High Smoke/Dust Plume'
      },
      lithosphere_temp: {
        sphere: 'Lithosphere',
        theme: 'lithosphere',
        title: 'Surface Temperature Anomaly',
        sub: 'Solid ground heat variance, thermal shifting landscapes & crustal flux',
        file: 'assets/maps/lithosphere_temp.png',
        unit: '°C anomaly',
        minVal: -5.0,
        maxVal: 5.0,
        rampMin: '-5.0 °C (Cold Anomaly)',
        rampMax: '+5.0 °C (Heatwave)',
        anomalyThreshold: 3.2,
        anomalyLabel: 'Severe Thermal Heatwave'
      },
      hydrosphere_sst: {
        sphere: 'Hydrosphere',
        theme: 'hydrosphere',
        title: 'Sea Surface Temperature & Currents',
        sub: 'Global marine thermal layers, currents & oceanic circulation',
        file: 'assets/maps/hydrosphere_sst.png',
        unit: '°C',
        minVal: -2.0,
        maxVal: 32.0,
        rampMin: '-2.0 °C (Sea Ice)',
        rampMax: '32.0 °C (Tropical Warm Pool)',
        anomalyThreshold: 29.0,
        anomalyLabel: 'Equatorial Warm Current'
      },
      general_precip: {
        sphere: 'General',
        theme: 'general',
        title: 'Global Precipitation & Planetary Moisture',
        sub: 'Connected Earth moisture flux, monsoon clouds & rain systems',
        file: 'assets/maps/general_precip.png',
        unit: 'mm/day',
        minVal: 0.0,
        maxVal: 25.0,
        rampMin: '0 mm/day (Arid / Clear)',
        rampMax: '25+ mm/day (Heavy Rain)',
        anomalyThreshold: 18.0,
        anomalyLabel: 'Intense Tropical Rain Band'
      }
    };

    this.listeners = new Set();
  }

  onUpdate(callback) {
    this.listeners.add(callback);
  }

  notifyUpdate(state) {
    for (const cb of this.listeners) {
      cb(state);
    }
  }

  async initAudio() {
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      return;
    }

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioCtor({ latencyHint: 'interactive' });
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    const ctx = this.audioCtx;

    // Master bus
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);

    // Dynamics Limiter
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-3, ctx.currentTime);
    limiter.knee.setValueAtTime(6, ctx.currentTime);
    limiter.ratio.setValueAtTime(12, ctx.currentTime);
    limiter.attack.setValueAtTime(0.003, ctx.currentTime);
    limiter.release.setValueAtTime(0.12, ctx.currentTime);

    // Stereo Panner (Binaural placement)
    if (ctx.createStereoPanner) {
      this.panner = ctx.createStereoPanner();
      this.panner.pan.setValueAtTime(0, ctx.currentTime);
    } else {
      this.panner = ctx.createGain(); // Fallback
    }

    // Dynamic Filter
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(800, ctx.currentTime);
    this.filter.Q.setValueAtTime(1.8, ctx.currentTime);

    // Primary Voice Carrier
    this.carrierOsc = ctx.createOscillator();
    this.carrierOsc.type = 'triangle';
    this.carrierOsc.frequency.setValueAtTime(146.8, ctx.currentTime);
    this.carrierGain = ctx.createGain();
    this.carrierGain.gain.setValueAtTime(0, ctx.currentTime);
    this.carrierOsc.connect(this.carrierGain);

    // Harmonic Richness Overtone
    this.harmOsc = ctx.createOscillator();
    this.harmOsc.type = 'sawtooth';
    this.harmOsc.frequency.setValueAtTime(220, ctx.currentTime);
    this.harmGain = ctx.createGain();
    this.harmGain.gain.setValueAtTime(0, ctx.currentTime);
    this.harmOsc.connect(this.harmGain);

    // Sub-bass Foundation Drone
    this.droneOsc = ctx.createOscillator();
    this.droneOsc.type = 'sine';
    this.droneOsc.frequency.setValueAtTime(73.4, ctx.currentTime);
    this.droneGain = ctx.createGain();
    this.droneGain.gain.setValueAtTime(this.droneLevel, ctx.currentTime);
    this.droneOsc.connect(this.droneGain);

    // Spatial feedback delay
    const delay = ctx.createDelay();
    delay.delayTime.setValueAtTime(0.22, ctx.currentTime);
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.setValueAtTime(0.35, ctx.currentTime);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);

    // Connect voice network
    this.carrierGain.connect(this.filter);
    this.harmGain.connect(this.filter);
    this.droneGain.connect(this.filter);

    this.filter.connect(this.panner);
    this.panner.connect(this.masterGain);
    this.filter.connect(delay);
    delay.connect(this.panner);

    this.masterGain.connect(limiter);
    limiter.connect(ctx.destination);

    // Start oscillators
    this.carrierOsc.start();
    this.harmOsc.start();
    this.droneOsc.start();
  }

  generateFallbackRaster(width, height, ds) {
    const imgData = new ImageData(width, height);
    const data = imgData.data;
    for (let y = 0; y < height; y++) {
      const latNorm = y / height; // 0 (North) to 1 (South)
      const latAngle = (0.5 - latNorm) * Math.PI;
      const cosLat = Math.cos(latAngle);

      for (let x = 0; x < width; x++) {
        const lonNorm = x / width; // 0 to 1
        const idx = (y * width + x) * 4;

        // Climate wave features based on dataset
        let val = 0.5 + 0.35 * Math.sin(lonNorm * Math.PI * 4) * cosLat;
        if (ds.theme === 'atmosphere') {
          // Dust plume in subtropics
          val = 0.2 + 0.6 * Math.exp(-Math.pow((latNorm - 0.4) * 4, 2)) * Math.max(0, Math.sin(lonNorm * Math.PI * 2));
        } else if (ds.theme === 'hydrosphere') {
          // Warm equatorial pool
          val = 0.1 + 0.8 * cosLat;
        } else if (ds.theme === 'lithosphere') {
          // Continental land heat
          val = 0.3 + 0.5 * Math.sin(lonNorm * 6) * Math.cos(latNorm * 4);
        }

        val = Math.max(0, Math.min(1, val));
        data[idx] = Math.round(val * 240);
        data[idx + 1] = Math.round((1 - Math.abs(val - 0.5) * 2) * 220);
        data[idx + 2] = Math.round((1 - val) * 255);
        data[idx + 3] = 255;
      }
    }
    return imgData;
  }

  async loadDataset(datasetKey) {
    const ds = this.datasets[datasetKey] || this.datasets.atmosphere_aod;
    this.activeDatasetKey = datasetKey;
    this.activeTheme = ds.theme;

    return new Promise((resolve) => {
      const img = new Image();
      // DO NOT set crossOrigin if on file:/// protocol to prevent local CORS blocks
      if (window.location.protocol !== 'file:') {
        img.crossOrigin = 'anonymous';
      }

      const onImageReady = () => {
        if (!this.canvas) {
          this.canvas = document.createElement('canvas');
          this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        }
        const w = 512;
        const h = 256;
        this.canvas.width = w;
        this.canvas.height = h;

        try {
          this.ctx.drawImage(img, 0, 0, w, h);
          this.imageData = this.ctx.getImageData(0, 0, w, h);
        } catch (e) {
          // Fallback to procedural calibrated raster if local file security restricts getImageData
          this.imageData = this.generateFallbackRaster(w, h, ds);
        }

        this.imgWidth = w;
        this.imgHeight = h;
        this.imgSource = img;
        this.updateRootFreq();
        resolve(ds);
      };

      img.onload = onImageReady;
      img.onerror = () => {
        this.imageData = this.generateFallbackRaster(512, 256, ds);
        this.imgWidth = 512;
        this.imgHeight = 256;
        this.updateRootFreq();
        resolve(ds);
      };

      img.src = ds.file;
    });
  }

  updateRootFreq() {
    if (!this.droneOsc || !this.audioCtx) return;
    const config = this.themeRoots[this.activeTheme] || this.themeRoots.atmosphere;
    const now = this.audioCtx.currentTime;
    this.droneOsc.frequency.setTargetAtTime(config.rootFreq * 0.75, now, 0.2);
  }

  setTheme(theme) {
    if (this.themeRoots[theme]) {
      this.activeTheme = theme;
      this.updateRootFreq();
    }
  }

  setMode(mode) {
    if (['we', 'ns', 'spiral'].includes(mode)) {
      this.mode = mode;
      this.notifyUpdate({ mode: this.mode, progress: this.progress });
    }
  }

  setSpeed(val) {
    this.speed = Math.max(0.2, Math.min(3.0, Number(val) || 1.0));
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number(val) || 0.85));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.05);
    }
  }

  setDroneLevel(val) {
    this.droneLevel = Math.max(0, Math.min(1, Number(val) || 0.35));
    if (this.droneGain && this.audioCtx) {
      this.droneGain.gain.setTargetAtTime(this.droneLevel, this.audioCtx.currentTime, 0.05);
    }
  }

  seek(progress) {
    this.progress = Math.max(0, Math.min(1, progress));
    this.evaluateSonification(this.progress);
  }

  async play() {
    await this.initAudio();
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.carrierGain.gain.setTargetAtTime(0.45, this.audioCtx.currentTime, 0.1);
    this.harmGain.gain.setTargetAtTime(0.20, this.audioCtx.currentTime, 0.1);

    const step = (time) => {
      if (!this.isPlaying) return;
      const dt = (time - this.lastFrameTime) / 1000;
      this.lastFrameTime = time;

      const increment = (dt / this.durationSec) * this.speed;
      this.progress += increment;
      if (this.progress > 1.0) {
        this.progress = 0; // Seamless loop
      }

      this.evaluateSonification(this.progress);
      this.animId = requestAnimationFrame(step);
    };

    this.animId = requestAnimationFrame(step);
    this.notifyUpdate({ isPlaying: true, progress: this.progress });
  }

  pause() {
    this.isPlaying = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.carrierGain && this.audioCtx) {
      this.carrierGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.08);
      this.harmGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.08);
    }
    this.notifyUpdate({ isPlaying: false, progress: this.progress });
  }

  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  getPixel(xNorm, yNorm) {
    if (!this.imageData) return { r: 128, g: 128, b: 128, a: 255 };
    const x = Math.max(0, Math.min(this.imgWidth - 1, Math.floor(xNorm * this.imgWidth)));
    const y = Math.max(0, Math.min(this.imgHeight - 1, Math.floor(yNorm * this.imgHeight)));
    const idx = (y * this.imgWidth + x) * 4;
    const d = this.imageData.data;
    return { r: d[idx], g: d[idx + 1], b: d[idx + 2], a: d[idx + 3] };
  }

  evaluateSonification(t) {
    if (!this.imageData) return;

    let scanX = 0.5;
    let scanY = 0.5;
    let panVal = 0.0;
    let samplePixels = [];

    if (this.mode === 'we') {
      scanX = t;
      panVal = (scanX - 0.5) * 1.8;
      for (let s = 0; s < 16; s++) {
        const yNorm = (s + 0.5) / 16;
        samplePixels.push({ ...this.getPixel(scanX, yNorm), yNorm });
      }
      scanY = 0.5;
    } else if (this.mode === 'ns') {
      scanY = t;
      for (let s = 0; s < 16; s++) {
        const xNorm = (s + 0.5) / 16;
        samplePixels.push({ ...this.getPixel(xNorm, scanY), xNorm });
      }
      scanX = 0.5;
      panVal = 0.0;
    } else if (this.mode === 'spiral') {
      const centerX = 0.50;
      const centerY = 0.50;
      const turns = 2.5;
      const theta = t * turns * Math.PI * 2;
      const r = 0.06 + t * 0.40;
      scanX = Math.max(0, Math.min(1, centerX + r * Math.cos(theta)));
      scanY = Math.max(0, Math.min(1, centerY + r * Math.sin(theta)));
      panVal = Math.sin(theta) * 0.95;
      samplePixels.push({ ...this.getPixel(scanX, scanY), yNorm: scanY });
    }

    let sumL = 0;
    let sumC = 0;
    let sumVal = 0;
    let focalY = 0;
    let hueDist = { red: 0, orange: 0, yellow: 0, green: 0, cyan: 0, blue: 0, purple: 0, magenta: 0 };

    for (const p of samplePixels) {
      const r = p.r / 255;
      const g = p.g / 255;
      const b = p.b / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      const lum = (max + min) / 2;
      const sat = lum > 0.5 ? delta / (2 - max - min || 1) : delta / (max + min || 1);

      let h = 0;
      if (delta > 0.01) {
        if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
        else if (max === g) h = ((b - r) / delta + 2) * 60;
        else h = ((r - g) / delta + 4) * 60;
      }

      if (h < 20 || h >= 340) hueDist.red += 1;
      else if (h < 45) hueDist.orange += 1;
      else if (h < 70) hueDist.yellow += 1;
      else if (h < 160) hueDist.green += 1;
      else if (h < 200) hueDist.cyan += 1;
      else if (h < 260) hueDist.blue += 1;
      else if (h < 300) hueDist.purple += 1;
      else hueDist.magenta += 1;

      sumL += lum;
      sumC += sat;
      sumVal += lum;
      if (p.yNorm !== undefined) {
        focalY += (1.0 - p.yNorm) * lum;
      }
    }

    const n = Math.max(1, samplePixels.length);
    const meanL = sumL / n;
    const meanC = sumC / n;
    const meanNorm = sumVal / n;
    const normFocal = (focalY / (sumL || 1));

    const ds = this.datasets[this.activeDatasetKey] || this.datasets.atmosphere_aod;
    const physVal = ds.minVal + meanNorm * (ds.maxVal - ds.minVal);

    const themeScale = (this.themeRoots[this.activeTheme] || this.themeRoots.atmosphere).scale;
    const octaveShift = meanL > 0.65 ? 2.0 : meanL < 0.35 ? 0.75 : 1.0;
    const scaleIndex = Math.floor(Math.max(0, Math.min(themeScale.length - 1, normFocal * themeScale.length)));
    const targetFreq = (themeScale[scaleIndex] || 220) * octaveShift;

    if (this.audioCtx && this.carrierOsc && this.isPlaying) {
      const now = this.audioCtx.currentTime;
      this.carrierOsc.frequency.setTargetAtTime(targetFreq, now, 0.06);
      this.harmOsc.frequency.setTargetAtTime(targetFreq * 1.5, now, 0.06);

      const cutoff = 250 + meanC * 2800 + meanL * 1200;
      this.filter.frequency.setTargetAtTime(cutoff, now, 0.08);

      if (this.panner && this.panner.pan) {
        this.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, panVal)), now, 0.05);
      }
    }

    let leadHue = 'cyan';
    let maxH = -1;
    for (const [k, count] of Object.entries(hueDist)) {
      if (count > maxH) {
        maxH = count;
        leadHue = k;
      }
    }

    const leadNames = {
      red: 'Low Cello (Red / Low)',
      orange: 'French Horn (Orange / Earth)',
      yellow: 'Warm Harp (Yellow / High Sun)',
      green: 'Woodwinds (Green / Vegetative)',
      cyan: 'Water Harp (Cyan / Azure)',
      blue: 'Flute & Deep Ocean (Blue)',
      purple: 'Celestial Strings (Violet / Cosmic)',
      magenta: 'Ethereal Voice (Magenta / High)'
    };

    const lat = (0.5 - scanY) * 180;
    const lon = (scanX - 0.5) * 360;
    const latStr = `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'}`;
    const lonStr = `${Math.abs(lon).toFixed(1)}° ${lon >= 0 ? 'E' : 'W'}`;

    let regionStr = 'Global Meridian';
    if (lat > 60) regionStr = 'Arctic / Northern Polar Basin';
    else if (lat < -60) regionStr = 'Antarctic Continental Shelf';
    else if (Math.abs(lat) < 23.5) {
      if (lon >= -180 && lon < -60) regionStr = 'Pacific Ocean Basin';
      else if (lon >= -60 && lon < 20) regionStr = 'Atlantic Ocean / Amazonia';
      else if (lon >= 20 && lon < 100) regionStr = 'Indian Ocean / South Asia';
      else regionStr = 'Equatorial Pacific / Australasia';
    } else {
      if (lon >= -140 && lon < -50) regionStr = 'North America';
      else if (lon >= -20 && lon < 60) regionStr = 'Europe & Mediterranean';
      else if (lon >= 60 && lon < 150) regionStr = 'Central & East Asia';
      else regionStr = 'Southern Oceans';
    }

    const state = {
      progress: t,
      scanX,
      scanY,
      pan: panVal,
      mode: this.mode,
      latStr,
      lonStr,
      regionStr,
      physVal: physVal.toFixed(2),
      unit: ds.unit,
      targetFreq: Math.round(targetFreq),
      leadVoice: leadNames[leadHue] || 'Equalizer Active',
      leadHue,
      hueDist,
      isAnomaly: physVal >= ds.anomalyThreshold,
      anomalyText: physVal >= ds.anomalyThreshold ? ds.anomalyLabel : 'Nominal Climate Range'
    };

    this.notifyUpdate(state);
  }
}

window.earthSonifier = new EarthSonifier();
