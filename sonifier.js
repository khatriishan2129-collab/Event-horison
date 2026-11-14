/* Website transport for the scanner's sparse data and the shared sonifier. */
(function (root) {
  "use strict";
  const FOCUS = { upper: [0, 1 / 3], middle: [1 / 3, 2 / 3], lower: [2 / 3, 1] };
  function focusData(scan, focus) {
    if (!FOCUS[focus]) return scan;
    const [low, high] = FOCUS[focus], height = scan.color_sheets.grid_dimensions.height;
    const accepts = cell => (cell[0] + .5) / height >= low && (cell[0] + .5) / height < high;
    const sheets = Object.fromEntries(Object.entries(scan.color_sheets.sheets).map(([name, sheet]) =>
      [name, { ...sheet, cells: (sheet.cells || []).filter(accepts) }]));
    return { ...scan, color_sheets: { ...scan.color_sheets, sheets },
      scalar_field: { ...scan.scalar_field, cells: (scan.scalar_field?.cells || []).filter(accepts) } };
  }
  class StudioPlayer {
    constructor(onUpdate) {
      Object.assign(this, { onUpdate, state: "empty", duration: 36, progress: 0, revision: 0,
        engine: null, worker: null, frame: null, solo: null, busy: false,
        options: { preset: "scene_score", scaleMode: "major_pentatonic", focusBand: "all" } });
    }
    notify(message = "") { this.onUpdate?.({ state: this.state, progress: this.progress, solo: this.solo, message }); }
    stop() {
      this.revision++;
      this.busy = false;
      this.worker?.terminate(); this.worker = null;
      cancelAnimationFrame(this.frame);
      this.engine?.disposeNodes(); this.engine = null;
      this.progress = 0;
    }
    async load(scan, entry) {
      this.stop(); this.scan = scan; this.entry = entry; this.solo = null; this.pendingSeek = null;
      if (entry.kind === "reference" || !scan.color_sheets.active_sheet_order.length) {
        this.state = "reference";
        this.notify(entry.kind === "reference" ? "Reference image · no measurement sonification" : "No extracted data to play");
        return;
      }
      return this.prepare();
    }
    async configure(options, solo = this.solo, autoplay = this.state === "playing") {
      this.options = { ...this.options, ...options }; this.solo = solo;
      if (!this.scan || this.entry?.kind === "reference") return;
      return this.prepare(autoplay);
    }
    async prepare(autoplay = false) {
      this.stop();
      const revision = this.revision;
      this.state = "preparing"; this.notify("Preparing sound…");
      try {
        const ctx = EarthJukeboxEngine.getSharedAudioContext();
        if (!ctx) throw new Error("This browser does not support Web Audio.");
        const options = { ...this.options, soloSheet: this.solo, duration: this.duration, volume: .75, environment: "auto", reverb: true };
        const scan = focusData(this.scan, this.options.focusBand);
        let pcm = null;
        if (options.preset === "scene_score") {
          pcm = await new Promise((resolve, reject) => {
            const worker = new Worker(new URL("assets/js/score-worker.js", document.baseURI)); this.worker = worker;
            worker.onmessage = ({ data }) => {
              worker.terminate(); if (this.worker === worker) this.worker = null;
              data.error ? reject(new Error(data.error)) : resolve(data.pcm);
            };
            worker.onerror = event => { worker.terminate(); reject(new Error(event.message || "Sound preparation failed.")); };
            worker.postMessage({ scan, options, sampleRate: ctx.sampleRate });
          });
        }
        if (revision !== this.revision) return;
        this.preparedOptions = { ...options, preparedPCM: pcm };
        this.engine = new EarthJukeboxEngine(scan, this.preparedOptions);
        if (options.preset === "pixel_128") this.engine._getPixel128Plan();
        this.state = "ready"; this.notify("Ready to listen");
        if (this.pendingSeek != null) { const position = this.pendingSeek; this.pendingSeek = null; await this.seek(position); }
        else if (autoplay) await this.play();
      } catch (error) {
        if (revision === this.revision) { this.state = "error"; this.notify(error.message); }
      }
    }
    async play() {
      if (!this.engine || this.busy || !["ready", "paused", "ended"].includes(this.state)) return;
      this.busy = true;
      const revision = this.revision, engine = this.engine;
      this.notify("Starting…");
      try {
        if (this.state === "paused") await EarthJukeboxEngine.unlockAudio();
        else await engine.playLive();
        if (revision !== this.revision) { engine.disposeNodes(); return; }
        this.state = "playing"; this.notify("Playing"); this.tick();
      } catch (error) {
        if (revision === this.revision) { this.state = "error"; this.notify(error.message); }
      } finally { if (revision === this.revision) { this.busy = false; this.notify(); } }
    }
    async pause() {
      if (this.state !== "playing" || this.busy) return;
      this.busy = true;
      this.notify();
      const revision = this.revision;
      try {
        await EarthJukeboxEngine.getSharedAudioContext().suspend();
        if (revision !== this.revision) return;
        cancelAnimationFrame(this.frame); this.state = "paused"; this.notify("Paused");
      } finally { if (revision === this.revision) { this.busy = false; this.notify(); } }
    }
    toggle() { return this.state === "playing" ? this.pause() : this.play(); }
    async seek(position) {
      position = Math.max(0, Math.min(.998, Number(position) || 0));
      if (!this.engine || this.state === "preparing") {
        if (this.scan && this.state === "preparing") this.pendingSeek = position;
        return;
      }
      const revision = ++this.revision, previous = this.engine;
      cancelAnimationFrame(this.frame);
      previous.disposeNodes();
      const engine = new EarthJukeboxEngine(previous.data, this.preparedOptions);
      engine._pixel128Plan = previous._pixel128Plan;
      this.engine = engine;
      this.progress = position; this.busy = true; this.state = "seeking"; this.notify("Starting from selected position…");
      try {
        await engine.playLive(position * this.duration);
        if (revision !== this.revision) { engine.disposeNodes(); return; }
        this.state = "playing"; this.notify("Playing from selected position"); this.tick();
      } catch (error) {
        if (revision === this.revision) { this.state = "error"; this.notify(error.message); }
      } finally { if (revision === this.revision) { this.busy = false; this.notify(); } }
    }
    tick() {
      if (this.state !== "playing" || !this.engine) return;
      const ctx = EarthJukeboxEngine.getSharedAudioContext();
      this.progress = Math.max(0, Math.min(1, (ctx.currentTime - this.engine.startTime) / this.duration));
      if (this.progress >= 1) { this.engine.disposeNodes(); this.state = "ended"; this.notify("Finished · play again"); return; }
      this.notify(); this.frame = requestAnimationFrame(() => this.tick());
    }
  }
  root.StudioPlayer = StudioPlayer;
})(globalThis);
