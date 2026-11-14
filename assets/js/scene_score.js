/**
 * Spatial chamber score. Every sounding note is supported by image cells.
 * Time/pan = x, pitch = y, instrument = colour. Values never move geometry.
 * No samples, network requests, backing chords, or semantic object guesses.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EarthSceneScore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clip = (v, a = 0, b = 1) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
  const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // The SAME pitch coordinate system for every instrument, overview and solo.
  const PITCHES = [50, 52, 54, 57, 59, 62, 64, 66, 69, 71, 74, 76, 78, 81];
  const VOICES = {
    red:     { name: "Bowed cedar",    partials: [1, .40, .19, .09, .045], attack: .10, release: .16, cutoff: 2200, decay: .13 },
    orange:  { name: "Mellow horn",    partials: [1, .54, .23, .11, .04],  attack: .09, release: .15, cutoff: 2400, decay: .18 },
    yellow:  { name: "Sunlit harp",    partials: [1, .36, .20, .09, .05],  attack: .018, release: .24, cutoff: 4200, decay: .65 },
    green:   { name: "Woodland flute", partials: [1, .09, .24, .025, .06], attack: .08, release: .14, cutoff: 3100, decay: .16 },
    cyan:    { name: "Glass celesta",  partials: [1, .06, .24, .08, .025], attack: .025, release: .27, cutoff: 4800, decay: .55 },
    blue:    { name: "Ocean marimba",  partials: [1, .17, .05, .11, .015], attack: .028, release: .23, cutoff: 2600, decay: .55 },
    purple:  { name: "Velvet choir",   partials: [1, .30, .13, .19, .035], attack: .13, release: .24, cutoff: 2800, decay: .12 },
    magenta: { name: "Silk strings",   partials: [1, .32, .27, .10, .05],  attack: .10, release: .20, cutoff: 3300, decay: .15 },
    brown:   { name: "Nylon guitar",   partials: [1, .43, .18, .08, .025], attack: .025, release: .17, cutoff: 2100, decay: .60 },
    neutral: { name: "Soft reed",      partials: [1, .08, .035, .015],     attack: .11, release: .18, cutoff: 2000, decay: .15 }
  };
  VOICES.violet = VOICES.purple;

  function environmentFor(data, choice = "auto") {
    const styles = {
      atmosphere: { label: "Air and atmosphere", room: 1.9, wet: .19, air: .016, phrase: 2.6 },
      surface:    { label: "Ground and surface", room: .55, wet: .075, air: 0, phrase: 1.6 },
      ocean:      { label: "Water and ocean", room: 1.25, wet: .13, air: .005, phrase: 2.3 },
      space:      { label: "Open space", room: 2.4, wet: .20, air: 0, phrase: 3.0 },
      neutral:    { label: "Natural chamber", room: .95, wet: .10, air: 0, phrase: 2.0 }
    };
    if (styles[choice]) return { ...styles[choice], kind: choice, basis: "Listener selection" };
    const explicit = data.sonification_profile?.environment;
    if (styles[explicit]) return { ...styles[explicit], kind: explicit, basis: "Image metadata" };
    // Only source context and credible OCR; colour alone cannot identify smoke or land.
    const words = (data.cleanup?.ocr_results?.items || []).filter(x => x.confidence >= .7).map(x => x.text);
    const text = [data.source?.filename, ...(data.source?.path || "").split(/[\\/]/).slice(-3, -1), ...words].join(" ").toLowerCase();
    let kind = "neutral";
    if (/nebula|galax|cosmic|astronom|starfield/.test(text)) kind = "space";
    else if (/aerosol|smoke|atmospher|\bco2\b|\bco2_|carbon.?dioxide|monoxide|monooxide|\bno[x2]?\b|nox\d|nitrogen|ozone|ozonemap|humidity|particulate|pm2[._]?5|\bpm25\b|air.?quality|windspeed|wind.?speed|precip|cloud/.test(text)) kind = "atmosphere";
    else if (/ocean|sea.?surface|sea.?level/.test(text)) kind = "ocean";
    else if (/temperatur|temp.?ano|soil|land|terrain|vegetation|forest|fire|surface|topograph/.test(text)) kind = "surface";
    return { ...styles[kind], kind, basis: kind === "neutral" ? "No subject metadata; neutral sound" : "Inferred from filename, folder or OCR; editable" };
  }

  function pitchForY(y, continuous = false) {
    const north = 1 - clip(y);
    return continuous ? 50 + north * 31 : PITCHES[PITCHES.length - 1 - Math.min(PITCHES.length - 1, Math.floor(clip(y) * PITCHES.length))];
  }

  function position(x, y) {
    return `${y < .34 ? "upper" : y > .66 ? "lower" : "middle"} ${x < .34 ? "left" : x > .66 ? "right" : "centre"}`;
  }

  function connectedRegions(grid, width, height, name) {
    const seen = new Uint8Array(grid.length), queue = new Int32Array(grid.length), found = [];
    for (let i = 0; i < grid.length; i++) {
      if (seen[i] || grid[i] < .06) continue;
      let head = 0, tail = 1, mass = 0, x = 0, y = 0;
      let minX = width, minY = height, maxX = 0, maxY = 0;
      queue[0] = i; seen[i] = 1;
      while (head < tail) {
        const k = queue[head++], r = Math.floor(k / width), c = k % width, a = grid[k];
        mass += a; x += ((c + .5) / width) * a; y += ((r + .5) / height) * a;
        minX = Math.min(minX, c); maxX = Math.max(maxX, c); minY = Math.min(minY, r); maxY = Math.max(maxY, r);
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc, next = nr * width + nc;
          if (nr < 0 || nr >= height || nc < 0 || nc >= width || seen[next] || grid[next] < .06) continue;
          seen[next] = 1; queue[tail++] = next;
        }
      }
      found.push({ name, mass, cells: tail, x: x / mass, y: y / mass,
        bounds: [minX / width, minY / height, (maxX + 1) / width, (maxY + 1) / height] });
    }
    return found.sort((a, b) => b.mass - a.mass);
  }

  function makeScore(data = {}, options = {}) {
    const sheets = data.color_sheets?.sheets || {};
    const dims = data.color_sheets?.grid_dimensions || data.source?.grid_dimensions || {};
    const width = Math.round(clip(Number(dims.width) || 256, 1, 1024));
    const height = Math.round(clip(Number(dims.height) || 128, 1, 1024));
    const solo = options.soloSheet ? String(options.soloSheet).toLowerCase() : null;
    const focus = ({ upper: [0, 1 / 3], middle: [1 / 3, 2 / 3], lower: [2 / 3, 1] })[options.focusBand] || [0, 1];
    const duration = clip(Number(options.duration) || 36, 2, 90);
    const tail = Math.min(.85, duration * .16);
    const scanDuration = duration - tail;
    const environment = environmentFor(data, options.environment);
    const continuous = (options.scaleMode || options.pitchMode) === "continuous";
    const bands = continuous ? (solo ? 28 : 18) : PITCHES.length;
    const polyphony = solo ? 8 : 6;
    const scalar = new Float32Array(width * height).fill(NaN);
    const saliency = new Float32Array(width * height);
    const scalarDims = data.scalar_field?.grid_dimensions || { width, height };
    const scalarMode = data.scalar_field?.mode || "appearance";
    const valuesOrdered = /^(calibrated_physical|legend_relative)$/.test(scalarMode) && !data.scalar_field?.is_categorical;
    if (scalarDims.width === width && scalarDims.height === height) {
      for (const cell of data.scalar_field?.cells || []) {
        const [r, c, value, sal] = cell;
        if (r < 0 || r >= height || c < 0 || c >= width) continue;
        if (value !== null && Number.isFinite(value)) scalar[r * width + c] = clip(value);
        saliency[r * width + c] = clip(sal);
      }
    }
    const names = (data.color_sheets?.active_sheet_order || Object.keys(sheets))
      .filter(n => sheets[n] && (!solo || n.toLowerCase() === solo));
    const columns = Array.from({ length: width }, () => new Map());
    const regions = [], features = [];
    const grids = {};
    for (const name of names) {
      const sheet = sheets[name];
      const grid = new Float32Array(width * height);
      grids[name] = grid;
      let total = 0, sx = 0, sy = 0, minX = width, maxX = -1, minY = height, maxY = -1;
      for (const cell of sheet.cells || []) {
        const [r, c] = cell;
        const a = clip(cell[2]);
        if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r >= height || c < 0 || c >= width || a < .012) continue;
        const y = (r + .5) / height;
        if (y < focus[0] || y >= focus[1]) continue;
        const b = Math.min(bands - 1, Math.floor(y * bands));
        const id = `${name}:${b}`;
        let item = columns[c].get(id);
        if (!item) { item = { id, name, band: b, mass: 0, y: 0, light: 0, chroma: 0, sal: 0, value: 0, valueWeight: 0 }; columns[c].set(id, item); }
        const i = r * width + c;
        grid[i] = a;
        item.mass += a; item.y += y * a;
        item.light += clip(cell[3] ?? sheet.mean_lightness ?? .5) * a;
        item.chroma += clip(cell[4] ?? sheet.mean_chroma ?? .1, 0, .5) * a;
        item.sal += saliency[i] * a;
        if (Number.isFinite(scalar[i])) { item.value += scalar[i] * a; item.valueWeight += a; }
        total += a; sx += ((c + .5) / width) * a; sy += y * a;
        minX = Math.min(minX, c); maxX = Math.max(maxX, c); minY = Math.min(minY, r); maxY = Math.max(maxY, r);
      }
      const components = connectedRegions(grid, width, height, name);
      const major = components.filter(r => r.mass >= Math.max(.5, total * .018));
      features.push(...major);
      if (total > 0) regions.push({ name, mass: total, share: Number(sheet.share_of_data) || 0, x: sx / total, y: sy / total, components: major,
        bounds: [minX / width, minY / height, (maxX + 1) / width, (maxY + 1) / height], instrument: (VOICES[name] || VOICES.neutral).name });
    }
    regions.sort((a, b) => b.mass - a.mass);
    const allMass = regions.reduce((sum, r) => sum + r.mass, 0) || 1;
    for (const r of regions) r.share = r.mass / allMass;
    const frames = [];
    const ambience = [];
    let previous = new Set();
    let retainedMass = 0, availableMass = 0;
    for (let c = 0; c < width; c++) {
      const candidates = [...columns[c].values()].map(item => {
        const m = item.mass;
        const y = item.y / m;
        const coverage = clip(m / Math.max(1, height / bands));
        const light = item.light / m, chroma = item.chroma / m, sal = item.sal / m;
        const appearance = item.valueWeight > 0 ? item.value / item.valueWeight : null;
        const value = valuesOrdered ? appearance : null;
        // Position is pitch for all hues. Value is a separate spectral-brightness cue.
        const midi = continuous ? pitchForY(y, true) : PITCHES[PITCHES.length - 1 - item.band];
        const neutralTrim = item.name === "neutral" && !solo ? .48 : 1;
        const gain = .062 * (.50 + .50 * Math.sqrt(coverage)) * (.67 + .33 * light) * neutralTrim;
        const priority = Math.sqrt(m) * (.72 + .55 * sal + .25 * chroma) * (previous.has(item.id) ? 1.18 : 1) * neutralTrim;
        return { ...item, x: (c + .5) / width, y, light, chroma, sal, value, appearance, midi, hz: midiHz(midi), gain, priority };
      }).sort((a, b) => b.priority - a.priority);
      // Reserve up to four slots for distinct colours before adding spatial chord tones.
      const selected = [], represented = new Set();
      for (const item of candidates) {
        if (represented.has(item.name)) continue;
        selected.push(item); represented.add(item.name);
        if (selected.length >= Math.min(solo ? 1 : 4, polyphony)) break;
      }
      while (selected.length < polyphony) {
        let best = null, bestScore = -Infinity;
        for (const item of candidates) {
          if (selected.includes(item)) continue;
          const sameColour = selected.filter(n => n.name === item.name);
          const distance = sameColour.length ? Math.min(...sameColour.map(n => Math.abs(n.y - item.y))) : .5;
          const spreadPriority = item.priority * (1 + distance * 2.4);
          if (spreadPriority > bestScore) { best = item; bestScore = spreadPriority; }
        }
        if (!best) break;
        selected.push(best);
      }
      const sumGain = selected.reduce((s, n) => s + n.gain, 0);
      const trim = sumGain > .27 ? .27 / sumGain : 1;
      selected.forEach(n => { n.gain *= trim; });
      frames.push(selected);
      const mass = candidates.reduce((s, n) => s + n.mass, 0);
      availableMass += mass; retainedMass += selected.reduce((s, n) => s + n.mass, 0);
      ambience.push({ presence: clip(mass / height), texture: mass ? candidates.reduce((s, n) => s + n.sal * n.mass, 0) / mass : 0 });
      previous = new Set(selected.map(n => n.id));
    }

    // Tie adjacent notes, articulating long regions into gently overlapping breaths.
    const events = [], open = new Map();
    const maxCols = Math.max(1, Math.round((solo ? environment.phrase * .7 : environment.phrase) / scanDuration * width));
    for (let c = 0; c <= width; c++) {
      const now = c < width ? new Map(frames[c].map(n => [n.id, n])) : new Map();
      for (const [id, event] of open) {
        if (!now.has(id) || c - event.startCol >= maxCols) {
          event.endCol = c; event.start = event.startCol / width * scanDuration;
          event.duration = (c - event.startCol) / width * scanDuration;
          events.push(event); open.delete(id);
        }
      }
      for (const [id, note] of now) {
        if (!open.has(id)) open.set(id, { id, name: note.name, startCol: c, midi: note.midi, points: [] });
        open.get(id).points.push(note);
      }
    }
    events.sort((a, b) => a.start - b.start || a.midi - b.midi || a.name.localeCompare(b.name));
    const calibration = valuesOrdered
      ? (scalarMode === "calibrated_physical" ? "Legend-calibrated values: brighter tone means higher value." : "Legend-relative values: brighter tone means higher position on the colour scale.")
      : "Colour appearance only; physical quantities are not established. Tone brightness follows visual contrast and lightness.";
    const focusText = focus[1] - focus[0] < 1 ? `${options.focusBand} third, in the original pitch coordinates. ` : "";
    const summary = regions.length ? `${solo ? `${solo} detail. ` : "Image overview. "}${focusText}${regions.slice(0, 4).map(r => `${r.name}, ${Math.round(r.share * 100)} percent of ${solo ? "selected colour" : "extracted colour"} mass, ${r.components.length > 1 ? `${r.components.length} major patches, largest ${position(r.components[0].x, r.components[0].y)}` : `centred ${position(r.x, r.y)}`}, ${r.instrument}`).join("; ")}. Scan left to right; higher notes mean higher in the image. Separate heights form chords. ${calibration}`
      : "No audible data survived extraction. Try another image or review the scanner mask.";
    return { version: "1.0", width, height, duration, scanDuration, tail, solo, focus, continuous, polyphony, environment,
      frames, events, regions, features, ambience, grids, scalar, scalarMode, valuesOrdered, summary,
      retainedMassFraction: retainedMass / (availableMass || 1),
      mapping: { horizontal: "time and stereo pan", vertical: continuous ? "continuous pitch" : "D major pentatonic pitch", colour: "instrument", value: valuesOrdered ? "spectral brightness" : "unavailable; visual contrast and lightness", opacity: "audible presence", area: "duration and chord extent" } };
  }

  function telemetry(score, elapsed) {
    const progress = clip(elapsed / score.scanDuration);
    const colIdx = Math.min(score.width - 1, Math.floor(progress * score.width));
    const notes = elapsed >= 0 && elapsed < score.scanDuration ? score.frames[colIdx] : [];
    const hueLevels = Object.fromEntries(Object.keys(VOICES).map(name => [name, { mag: 0, label: VOICES[name].name }]));
    for (const n of notes) hueLevels[n.name].mag = Math.max(hueLevels[n.name].mag, n.gain * 6);
    const lead = [...notes].sort((a, b) => b.gain - a.gain)[0];
    const midi = lead?.midi || 62, names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    return { progress, colIdx, totalCols: score.width, stepIdx: colIdx, totalSteps: score.width,
      pan: notes.length ? -0.88 + 1.76 * progress : 0, freqHz: lead?.hz || 0,
      noteName: lead ? `${names[Math.round(midi) % 12]}${Math.floor(midi / 12) - 1}` : "—",
      modIndex: lead?.value ?? lead?.appearance ?? lead?.light ?? 0, active: notes.length > 0, activePreset: "scene_score",
      primaryHue: lead ? `${lead.name} · ${(VOICES[lead.name] || VOICES.neutral).name}` : null, hueLevels,
      notes: notes.map(n => ({ colour: n.name, midi: n.midi, y: n.y, value: n.value })) };
  }

  function inspectPoint(score, x, y) {
    const col = Math.min(score.width - 1, Math.floor(clip(x) * score.width));
    const row = Math.min(score.height - 1, Math.floor(clip(y) * score.height));
    const i = row * score.width + col;
    const cellY = (row + .5) / score.height;
    if (cellY < score.focus[0] || cellY >= score.focus[1]) return { row, col, x, y, colours: [], value: null,
      description: "Outside the selected vertical focus. Choose Whole image to inspect this location." };
    const colours = Object.entries(score.grids).map(([name, grid]) => ({ name, alpha: grid[i] })).filter(n => n.alpha > .012).sort((a, b) => b.alpha - a.alpha);
    const value = score.valuesOrdered && Number.isFinite(score.scalar[i]) ? score.scalar[i] : null;
    return { row, col, x: (col + .5) / score.width, y: (row + .5) / score.height, colours, value,
      description: `${Math.round(x * 100)} percent from left, ${Math.round(y * 100)} percent from top. ${colours.length ? colours.map(n => `${n.name}, ${Math.round(n.alpha * 100)} percent presence`).join("; ") : "No extracted data"}.${value !== null ? ` Relative scale value ${Math.round(value * 100)} percent.` : ""}` };
  }

  function seeded(seed = 9137) {
    let s = seed >>> 0;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  }

  /** Render only the evidence-backed instruments to PCM. The native graph then
   * handles room, air and dynamics. This avoids hundreds of connected filters
   * and panners continuing to process silence on dense images.
   */
  function synthesizePCM(score, sampleRate = 44100) {
    const length = Math.ceil(score.duration * sampleRate);
    const left = new Float32Array(length), right = new Float32Array(length);
    const step = score.scanDuration / score.width;
    const warmth = score.environment.kind === "surface" ? .84 : 1;
    for (const event of score.events) {
      const spec = VOICES[event.name] || VOICES.neutral;
      const attack = Math.min(spec.attack, event.duration * .32);
      const release = Math.min(spec.release, .06 + event.duration * .22, score.tail * .7);
      const controls = event.points.map((point, i) => {
        const brightness = point.value ?? point.appearance ?? point.light;
        const cutoff = clip(spec.cutoff * warmth * (.40 + .90 * brightness) * (.85 + .3 * clip(point.chroma / .22)), 850, 6200);
        const decay = 1 - spec.decay * (1 - Math.exp(-i * step * 2));
        const angle = (.06 + .88 * point.x) * Math.PI / 2;
        const partials = spec.partials.map((a, h) => {
          const frequency = point.hz * (h + 1);
          return frequency >= sampleRate * .47 ? 0 : a / Math.sqrt(1 + Math.pow(frequency / cutoff, 4));
        });
        // Normalize by the oscillator's possible peak; retain a clear fundamental.
        const norm = .88 / Math.sqrt(spec.partials.reduce((sum, a) => sum + a * a, 0));
        return { hz: point.hz, gain: point.gain * decay, l: Math.cos(angle), r: Math.sin(angle), partials: partials.map(a => a * norm) };
      });
      const start = Math.round(event.start * sampleRate);
      const samples = Math.min(length - start, Math.ceil((event.duration + release) * sampleRate));
      let phase = 0;
      for (let j = 0; j < samples; j++) {
        const t = j / sampleRate;
        const frame = Math.min(controls.length - 1, Math.floor(t / step));
        const a = controls[frame], b = controls[Math.min(controls.length - 1, frame + 1)];
        const mix = frame + 1 < controls.length ? clip((t - frame * step) / step) : 0;
        const hz = a.hz + (b.hz - a.hz) * mix;
        const envelope = t < attack ? t / Math.max(1e-6, attack) : t > event.duration ? Math.max(0, 1 - (t - event.duration) / release) : 1;
        const amp = (a.gain + (b.gain - a.gain) * mix) * envelope;
        let value = 0;
        for (let h = 0; h < a.partials.length; h++) {
          value += Math.sin(phase * (h + 1)) * (a.partials[h] + (b.partials[h] - a.partials[h]) * mix);
        }
        value += Math.sin(phase * 2) * .055;
        value *= amp;
        left[start + j] += value * (a.l + (b.l - a.l) * mix);
        right[start + j] += value * (a.r + (b.r - a.r) * mix);
        phase += 2 * Math.PI * hz / sampleRate;
        if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
      }
    }
    return [left, right];
  }

  class Renderer {
    constructor(ctx, destination, score, options = {}) {
      this.ctx = ctx; this.score = score; this.nodes = []; this.sources = [];
      this.master = this.keep(ctx.createGain()); this.master.gain.value = clip(options.volume ?? .85, 0, 1);
      const limiter = this.keep(ctx.createDynamicsCompressor());
      limiter.threshold.value = -6; limiter.knee.value = 5; limiter.ratio.value = 8;
      limiter.attack.value = .004; limiter.release.value = .18;
      const highpass = this.keep(ctx.createBiquadFilter()); highpass.type = "highpass"; highpass.frequency.value = 42; highpass.Q.value = .7;
      this.bus = this.keep(ctx.createGain()); this.bus.gain.value = .9;
      this.bus.connect(highpass); highpass.connect(limiter); limiter.connect(this.master); this.master.connect(destination);
      if (options.reverb !== false && typeof ctx.createConvolver === "function") {
        const env = score.environment, room = this.keep(ctx.createConvolver());
        const buffer = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * env.room), ctx.sampleRate);
        const random = seeded(4501);
        for (let ch = 0; ch < 2; ch++) {
          const pcm = buffer.getChannelData(ch);
          for (let i = 0; i < pcm.length; i++) {
            const t = i / ctx.sampleRate;
            pcm[i] = t < .022 ? 0 : (random() * 2 - 1) * Math.exp(-6.9 * t / env.room) * Math.min(1, (t - .022) / .025);
          }
        }
        room.buffer = buffer;
        const wet = this.keep(ctx.createGain()); wet.gain.value = env.wet;
        const damp = this.keep(ctx.createBiquadFilter()); damp.type = "lowpass"; damp.frequency.value = 3800;
        this.bus.connect(room); room.connect(damp); damp.connect(wet); wet.connect(highpass);
      }
      // Prepare before the live start timestamp is chosen, so synthesis time
      // cannot advance the cursor ahead of the audible scan.
      const pcm = options.preparedPCM || synthesizePCM(this.score, this.ctx.sampleRate);
      this.buffer = this.ctx.createBuffer(2, pcm[0].length, this.ctx.sampleRate);
      this.buffer.getChannelData(0).set(pcm[0]); this.buffer.getChannelData(1).set(pcm[1]);
    }
    keep(node) { this.nodes.push(node); return node; }
    schedule(start, offset = 0) {
      offset = clip(offset, 0, this.score.duration - .05);
      const remaining = this.score.duration - offset;
      this.start = start - offset;
      const source = this.keep(this.ctx.createBufferSource());
      source.buffer = this.buffer; source.connect(this.bus);
      source.start(start, offset); source.stop(start + remaining); this.sources.push(source);
      if (this.score.environment.air > 0) this.air(start, offset);
      const level = this.master.gain.value;
      this.master.gain.setValueAtTime(0, start);
      this.master.gain.linearRampToValueAtTime(level, start + Math.min(.012, remaining / 4));
      this.master.gain.setValueAtTime(level, start + Math.max(.013, remaining - .12));
      this.master.gain.linearRampToValueAtTime(0, start + remaining);
    }
    air(start, offset = 0) {
      const ctx = this.ctx, score = this.score;
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 3.1), ctx.sampleRate);
      const pcm = buffer.getChannelData(0), random = seeded(3011);
      let low = 0;
      for (let i = 0; i < pcm.length; i++) { low = .98 * low + .02 * (random() * 2 - 1); pcm[i] = low * 5; }
      // Crossfade the loop boundary to avoid a periodic click.
      const blend = Math.round(ctx.sampleRate * .06);
      for (let i = 0; i < blend; i++) pcm[pcm.length - blend + i] = pcm[pcm.length - blend + i] * (1 - i / (blend - 1)) + pcm[0] * (i / (blend - 1));
      const source = this.keep(ctx.createBufferSource()); source.buffer = buffer; source.loop = true;
      const filter = this.keep(ctx.createBiquadFilter()); filter.type = "bandpass"; filter.frequency.value = score.environment.kind === "ocean" ? 550 : 1550; filter.Q.value = .48;
      const gain = this.keep(ctx.createGain()); gain.gain.value = 0;
      source.connect(filter); filter.connect(gain); gain.connect(this.bus);
      gain.gain.setValueAtTime(0, start);
      const first = score.ambience[Math.min(score.width - 1, Math.floor(offset / score.scanDuration * score.width))];
      if (offset < score.scanDuration) gain.gain.linearRampToValueAtTime(score.environment.air * Math.sqrt(first.presence) * (.65 + .35 * first.texture), start + .02);
      for (let c = 0; c < score.width; c++) {
        const a = score.ambience[c];
        const time = (c + 1) / score.width * score.scanDuration - offset;
        if (time > .02) gain.gain.linearRampToValueAtTime(score.environment.air * Math.sqrt(a.presence) * (.65 + .35 * a.texture), start + time);
      }
      gain.gain.linearRampToValueAtTime(0, start + Math.max(.025, score.scanDuration + .15 - offset));
      source.start(start); source.stop(start + score.duration - offset); this.sources.push(source);
    }
    stop() {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0, now + .025);
      for (const source of this.sources) { try { source.stop(now + .03); } catch (_) {} }
    }
    dispose() {
      this.stop();
      const nodes = this.nodes.splice(0); this.sources = [];
      const disconnect = () => nodes.forEach(n => { try { n.disconnect(); } catch (_) {} });
      if (this.ctx.state === "running") setTimeout(disconnect, 40); else disconnect();
    }
  }
  return { makeScore, telemetry, inspectPoint, environmentFor, pitchForY, synthesizePCM, PITCHES, VOICES, Renderer };
});
