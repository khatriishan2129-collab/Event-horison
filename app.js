(function () {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const home = $("#home"), explore = $("#explore"), studio = $("#studio");
  const video = $("#background-video"), motionButton = $("#motion-toggle"), dialog = $("#info-dialog");
  const libraryDialog = $("#studio-image-library");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let motionPaused = reducedMotion.matches, sphere = "atmosphere", page = "home";
  let manifest, selected, scan, selectionRevision = 0, stripsRendered = false, positionEditing = false;
  const validWorlds = ["general", "lithosphere", "atmosphere", "hydrosphere"];
  const payloads = new Map();
  const defaults = { atmosphere: "atmosphere/wildfire_smoke.png", lithosphere: "lithosphere/active_fires_robinson.png",
    hydrosphere: "hydrosphere/sea_surface_temperature_global.jpg", general: "general/global_precipitation_rate.png" };
  const titles = { atmosphere: "Atmosphere", lithosphere: "Lithosphere", hydrosphere: "Hydrosphere", general: "General" };
  const player = new StudioPlayer(updatePlayback);
  window.studioPlayer = player;

  function syncVideo() {
    if (page !== "home" || motionPaused || document.hidden) video.pause();
    else video.play().catch(() => {});
    motionButton.innerHTML = `<span aria-hidden="true">${motionPaused ? "▶" : "❚❚"}</span> ${motionPaused ? "Play" : "Pause"} motion`;
  }
    const earthFallbackCanvas = document.querySelector('#earth-fallback-canvas');
    if (earthFallbackCanvas) {
      const fCtx = earthFallbackCanvas.getContext('2d');
      let fTime = 0;

      const resizeFallback = () => {
        earthFallbackCanvas.width = window.innerWidth;
        earthFallbackCanvas.height = window.innerHeight;
      };
      window.addEventListener('resize', resizeFallback);
      resizeFallback();

      function renderEarthHorizonFallback() {
        requestAnimationFrame(renderEarthHorizonFallback);
        if (home.hidden) return;
        // If actual video has loaded frames and is playing, skip drawing fallback
        if (video && video.readyState >= 2 && video.videoWidth > 0) return;

        const w = earthFallbackCanvas.width;
        const h = earthFallbackCanvas.height;
        if (!motionPaused) fTime += 0.004;

        fCtx.fillStyle = '#03080d';
        fCtx.fillRect(0, 0, w, h);

        const cx = w * 0.44;
        const cy = h * 0.52;
        const R = Math.min(w, h) * 0.52;

        // Atmospheric limb glow
        const limb = fCtx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.28);
        limb.addColorStop(0, 'rgba(20, 110, 150, 0.45)');
        limb.addColorStop(0.55, 'rgba(111, 212, 178, 0.22)');
        limb.addColorStop(1, 'rgba(4, 11, 16, 0)');
        fCtx.fillStyle = limb;
        fCtx.beginPath();
        fCtx.arc(cx, cy, R * 1.28, 0, Math.PI * 2);
        fCtx.fill();

        // Clipped planetary body with swirling clouds and oceans
        fCtx.save();
        fCtx.beginPath();
        fCtx.arc(cx, cy, R, 0, Math.PI * 2);
        fCtx.clip();

        const oceanGrad = fCtx.createRadialGradient(cx - R * 0.28, cy - R * 0.25, R * 0.08, cx, cy, R);
        oceanGrad.addColorStop(0, '#165b7d');
        oceanGrad.addColorStop(0.5, '#092e46');
        oceanGrad.addColorStop(0.85, '#041320');
        oceanGrad.addColorStop(1, '#02070c');
        fCtx.fillStyle = oceanGrad;
        fCtx.fillRect(cx - R, cy - R, R * 2, R * 2);

        // Moving atmospheric cloud bands & continental glow
        for (let i = 0; i < 28; i++) {
          const angle = (i / 28) * Math.PI * 2 + fTime;
          const latY = cy + Math.sin(i * 1.7) * R * 0.72;
          const lonX = cx + Math.cos(angle) * R * 0.68;
          const rad = R * (0.14 + (i % 5) * 0.04);
          const cloud = fCtx.createRadialGradient(lonX, latY, 2, lonX, latY, rad);
          if (i % 3 === 0) {
            cloud.addColorStop(0, 'rgba(111, 212, 178, 0.22)');
            cloud.addColorStop(1, 'rgba(111, 212, 178, 0)');
          } else {
            cloud.addColorStop(0, 'rgba(225, 242, 250, 0.18)');
            cloud.addColorStop(1, 'rgba(225, 242, 250, 0)');
          }
          fCtx.fillStyle = cloud;
          fCtx.beginPath();
          fCtx.arc(lonX, latY, rad, 0, Math.PI * 2);
          fCtx.fill();
        }

        // Day/Night terminator shadow
        const nightShadow = fCtx.createLinearGradient(cx - R * 0.5, cy - R * 0.4, cx + R * 0.85, cy + R * 0.65);
        nightShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
        nightShadow.addColorStop(0.58, 'rgba(2, 8, 14, 0.45)');
        nightShadow.addColorStop(1, 'rgba(2, 6, 10, 0.94)');
        fCtx.fillStyle = nightShadow;
        fCtx.fillRect(cx - R, cy - R, R * 2, R * 2);
        fCtx.restore();
      }
      renderEarthHorizonFallback();
    }



  function applyTheme(value) {
    sphere = validWorlds.includes(value) ? value : "atmosphere";
    studio.className = `studio-page theme-${sphere}${player.state === "playing" ? " playing" : ""}`;
    $("#studio-sphere-name").textContent = titles[sphere];
    document.querySelectorAll("[data-world-switch]").forEach(button => {
      const active = button.dataset.worldSwitch === sphere;
      button.classList.toggle("active", active); button.setAttribute("aria-pressed", String(active));
    });
  }
  function route(target = "home", world = sphere, push = true) {
    if (validWorlds.includes(target)) { world = target; target = "studio"; }
    page = ["home", "explore", "studio"].includes(target) ? target : "home";
    home.hidden = page !== "home"; explore.hidden = page !== "explore"; studio.hidden = page !== "studio";
    document.body.classList.toggle("is-home", page === "home");
    document.body.classList.toggle("is-explore", page === "explore");
    $(".header-worlds-bar").style.display = page === "studio" ? "" : "none";
    document.querySelectorAll("[data-nav]").forEach(link => {
      link.classList.toggle("active", link.dataset.nav === page);
      if (link.dataset.nav === page) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
    applyTheme(world);
    if (page !== "studio" && player.state === "playing") player.pause();
    if (dialog.open) dialog.close();
    const hash = page === "studio" ? `#studio/${sphere}` : `#${page}`;
    if (push && location.hash !== hash) history.pushState(null, "", hash);
    document.title = page === "studio" ? "Sonifier Studio — Jukebox" : "Jukebox — The planet has a rhythm.";
    if (page === "studio" && manifest && (!selected || selected.sphere !== sphere)) selectEntry(defaultEntry(sphere));
    window.scrollTo(0, 0); syncVideo();
  }
  function routeHash() {
    const [target, world] = location.hash.slice(1).split("/");
    route(target || "home", world || sphere, false);
  }
  function defaultEntry(world) {
    return manifest.entries.find(entry => entry.source === defaults[world]) || manifest.entries.find(entry => entry.sphere === world && entry.kind === "observation");
  }
  async function getData(entry) {
    if (!payloads.has(entry.data)) {
      const request = (async () => {
        const cached = "caches" in window ? await caches.match(new URL(entry.data, document.baseURI)).catch(() => null) : null;
        const response = cached || await fetch(entry.data);
        if (!response.ok) throw new Error(`Could not load ${entry.name}. Please reload the page.`);
        return response.json();
      })().catch(error => { payloads.delete(entry.data); throw error; });
      payloads.set(entry.data, request);
      if (payloads.size > 6) payloads.delete(payloads.keys().next().value);
    }
    return payloads.get(entry.data);
  }
  async function selectEntry(entry) {
    if (!entry) return;
    const revision = ++selectionRevision;
    player.stop(); player.state = "loading"; player.notify("Loading prepared image…");
    selected = entry; scan = null; applyTheme(entry.sphere);
    if (page === "studio") history.replaceState(null, "", `#studio/${sphere}`);
    $("#studio-heading").textContent = entry.name;
    $("#studio-narrative").textContent = entry.explanation || entry.description;
    const keyText = entry.source.startsWith("atmosphere/air_quality_labels") ?
      "CO: 40–500 ppbv · PM2.5: 0.4–409.6 µg/m³ · NOₓ: 10⁻³–10¹ ppbv · O₃: 5–60 ppbv" : entry.legend?.text;
    $("#studio-legend").hidden = !keyText;
    $("#studio-legend").textContent = keyText ? `Legend · ${keyText}` : "";
    $("#studio-map-image").src = entry.image;
    $("#studio-map-image").alt = `${entry.name}. ${entry.description}.`;
    $("#colour-strips").open = false; stripsRendered = false;
    $("#colour-strips-list").replaceChildren(); $("#colour-count").textContent = "";
    $("#studio-background-note").textContent = "";
    document.querySelectorAll("[data-image-id]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.imageId === entry.id)));
    try {
      const data = await getData(entry);
      if (revision !== selectionRevision) return;
      scan = data;
      const background = scan.basemap_extraction;
      const bases = ["ocean", "land"].filter(region => background?.[`${region}_rgb_255`]);
      $("#studio-background-note").textContent = background?.measurement_layer?.policy ?
        "Sound follows the extracted measurement layer. Physical map context and annotations are suppressed." :
        background?.applied ? `Identified ${bases.join(" and ") || "map"} base colours are excluded from the sound.` : "Sound follows extracted colour and position.";
      if (!keyText) {
        const legend = scan.cleanup?.legend_reading;
        if (legend?.value_range?.length === 2) {
          $("#studio-legend").textContent = `Legend · ${legend.value_range.join(" to ")}${legend.units ? " " + legend.units : ""}`;
          $("#studio-legend").hidden = false;
        }
      }
      $("#colour-count").textContent = `${data.color_sheets.active_sheet_order.length} colours`;
      updateFocus();
      await player.load(data, entry);
      if (revision === selectionRevision) prefetchNeighbours(entry);
    } catch (error) {
      if (revision === selectionRevision) { player.state = "error"; player.notify(error.message); }
    }
  }
  function updatePlayback({ state, progress, solo, message }) {
    const playing = state === "playing";
    studio.classList.toggle("playing", playing);
    $("#studio-play-btn").disabled = player.busy || !["ready", "playing", "paused", "ended"].includes(state);
    $("#studio-play-text").textContent = playing ? "Pause" : state === "paused" ? "Resume" : "Play";
    $("#studio-play-symbol").textContent = playing ? "❚❚" : "▶";
    $("#studio-play-btn").setAttribute("aria-label", `${playing ? "Pause" : state === "paused" ? "Resume" : "Play"} ${solo ? solo + " colour" : "full image"}`);
    if (!positionEditing) $("#studio-progress").value = progress;
    $("#studio-time").textContent = `00:${String(Math.floor(progress * player.duration)).padStart(2, "0")}`;
    $("#full-image-btn").hidden = !solo;
    if (message) {
      $("#engine-status-text").textContent = message;
      $("#studio-status").textContent = `${message}${["ready", "playing", "paused", "ended"].includes(state) ? ` · ${solo ? solo + " colour" : "Full image"}` : ""}`;
    }
    const cursor = $("#studio-scanline"); cursor.hidden = !["playing", "paused", "seeking"].includes(state);
    if (scan) {
      const dimensions = scan.source.dimensions, box = scan.source.map_crop_box?.pixels || [0, 0, dimensions.width, dimensions.height];
      const duration = scanDuration();
      const x = Math.min(1, progress * player.duration / duration);
      cursor.style.left = `${100 * (box[0] + x * (box[2] - box[0])) / dimensions.width}%`;
    }
    document.querySelectorAll("[data-colour]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.colour === solo)));
  }
  function updateFocus() {
    const windowElement = $("#studio-focus-window"), focus = $("#studio-focus").value;
    windowElement.hidden = focus === "all" || !scan;
    if (!scan) return;
    const height = scan.source.dimensions.height, box = scan.source.map_crop_box?.pixels || [0, 0, scan.source.dimensions.width, height];
    const third = { upper: 0, middle: 1, lower: 2 }[focus] || 0;
    windowElement.style.top = `${100 * (box[1] + third * (box[3] - box[1]) / 3) / height}%`;
    windowElement.style.height = `${100 * (box[3] - box[1]) / height / 3}%`;
  }
  function renderStrips() {
    if (stripsRendered || !scan) return;
    stripsRendered = true;
    const list = $("#colour-strips-list"), dimensions = scan.color_sheets.grid_dimensions;
    const colours = { red:[239,68,68], orange:[249,115,22], yellow:[234,179,8], green:[34,197,94], cyan:[6,182,212], blue:[59,130,246], purple:[168,85,247], violet:[168,85,247], magenta:[236,72,153], brown:[180,110,70], neutral:[203,213,225] };
    if (!scan.color_sheets.active_sheet_order.length) {
      const note = document.createElement("p"); note.className = "studio-status"; note.textContent = "No measurement colour strips for this image."; list.append(note); return;
    }
    for (const name of scan.color_sheets.active_sheet_order) {
      const button = document.createElement("button"); button.type = "button"; button.className = "colour-strip"; button.dataset.colour = name;
      button.setAttribute("aria-label", `Play ${name} colour strip`); button.setAttribute("aria-pressed", String(player.solo === name));
      const label = document.createElement("span"); label.className = "colour-strip-name"; label.textContent = name;
      const voice = document.createElement("small"); voice.textContent = (EarthSceneScore.VOICES[name] || EarthSceneScore.VOICES.neutral).name; label.append(voice);
      const canvas = document.createElement("canvas"); canvas.width = dimensions.width; canvas.height = dimensions.height; canvas.setAttribute("aria-hidden", "true");
      const context = canvas.getContext("2d"), pixels = context.createImageData(canvas.width, canvas.height);
      for (const [row, col, alpha] of scan.color_sheets.sheets[name].cells || []) {
        const i = (row * canvas.width + col) * 4; pixels.data.set([...(colours[name] || colours.neutral), Math.round(alpha * 255)], i);
      }
      context.putImageData(pixels, 0, 0);
      const icon = document.createElement("span"); icon.textContent = "▶"; icon.setAttribute("aria-hidden", "true");
      button.append(label, canvas, icon);
      button.addEventListener("click", () => { EarthJukeboxEngine.unlockAudio(); player.configure({}, name, true); });
      list.append(button);
    }
  }
  function renderLibrary() {
    const grid = $("#studio-library-grid");
    const observations = manifest.entries.filter(entry => entry.kind === "observation");
    $("#library-count").textContent = `${observations.length} observation images`;
    for (const entry of observations) {
      const button = document.createElement("button"); button.type = "button"; button.className = "studio-library-tile"; button.dataset.imageId = entry.id;
      button.setAttribute("aria-pressed", "false");
      const image = document.createElement("img"); image.src = entry.thumbnail; image.alt = ""; image.loading = "lazy"; image.width = 480; image.height = 240;
      const caption = document.createElement("span"); caption.className = "studio-library-caption";
      const name = document.createElement("strong"); name.textContent = entry.name;
      const description = document.createElement("small"); description.textContent = entry.description;
      const category = document.createElement("small"); category.className = "library-sphere"; category.textContent = `${titles[entry.sphere]}${entry.kind === "reference" ? " · Reference" : ""}`;
      caption.append(name, description, category); button.append(image, caption);
      button.addEventListener("pointerenter", () => getData(entry).catch(() => {}));
      button.addEventListener("focus", () => getData(entry).catch(() => {}));
      button.addEventListener("click", () => { libraryDialog.close(); selectEntry(entry); studio.scrollIntoView({ behavior: "instant", block: "start" }); });
      grid.append(button);
    }
  }
  function prefetchNeighbours(entry) {
    const observations = manifest.entries.filter(item => item.kind === "observation"), index = observations.indexOf(entry);
    observations.slice(index + 1, index + 3).forEach(next => getData(next).catch(() => {}));
  }
  async function warmLibrary() {
    if (!("caches" in window)) return;
    const cache = await caches.open("jukebox-library-v1");
    const queue = manifest.entries.filter(entry => entry.kind === "observation");
    await Promise.all([0, 1].map(async () => {
      while (queue.length) {
        const entry = queue.shift(), url = new URL(entry.data, document.baseURI);
        try { if (!await cache.match(url)) { const response = await fetch(url, { priority: "low" }); if (response.ok) await cache.put(url, response); } } catch (_) { /* Normal selection still uses the network. */ }
      }
    }));
  }
  $("#studio-play-btn").addEventListener("click", () => player.toggle());
  $("#full-image-btn").addEventListener("click", () => player.configure({}, null));
  for (const [id, key] of [["#studio-scale", "scaleMode"], ["#studio-mode", "preset"], ["#studio-focus", "focusBand"]]) {
    $(id).addEventListener("change", event => { updateFocus(); player.configure({ [key]: event.target.value }); });
  }
  $("#colour-strips").addEventListener("toggle", () => { if ($("#colour-strips").open) renderStrips(); });
  function openLibrary() { if (!libraryDialog.open) libraryDialog.showModal(); }
  function scanDuration() { return player.engine?.sceneScore?.scanDuration || (player.options.preset === "pixel_128" ? player.duration - .6 : player.duration); }
  $("#studio-header-library-btn").addEventListener("click", openLibrary);
  $("#studio-library-close").addEventListener("click", () => libraryDialog.close());
  libraryDialog.addEventListener("click", event => {
    const rect = libraryDialog.getBoundingClientRect();
    if (event.target === libraryDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) libraryDialog.close();
  });
  $("#map-viewport").addEventListener("click", event => {
    if (!scan) return;
    EarthJukeboxEngine.unlockAudio();
    const rect = $("#studio-map-image").getBoundingClientRect();
    const width = scan.source.dimensions.width, box = scan.source.map_crop_box?.pixels || [0, 0, width, scan.source.dimensions.height];
    const imageX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * width;
    const scanX = Math.max(0, Math.min(1, (imageX - box[0]) / (box[2] - box[0])));
    player.seek(scanX * scanDuration() / player.duration);
  });
  $("#studio-progress").addEventListener("input", () => { positionEditing = true; });
  $("#studio-progress").addEventListener("blur", () => { positionEditing = false; });
  $("#studio-progress").addEventListener("pointercancel", () => { positionEditing = false; });
  $("#studio-progress").addEventListener("change", event => { positionEditing = false; EarthJukeboxEngine.unlockAudio(); player.seek(Number(event.target.value)); });
  $("#studio-back-btn").addEventListener("click", () => route("explore"));
  document.querySelectorAll("[data-nav], [data-route-link]").forEach(link => link.addEventListener("click", event => { event.preventDefault(); route(link.dataset.nav || link.dataset.routeLink); }));
  document.querySelectorAll("[data-world-switch]").forEach(button => button.addEventListener("click", () => route("studio", button.dataset.worldSwitch)));
  document.querySelectorAll("[data-world]").forEach(button => button.addEventListener("click", event => { event.preventDefault(); route("studio", button.dataset.world.toLowerCase()); }));
  document.querySelectorAll("[data-open-library]").forEach(button => {
    const open = event => { event.preventDefault(); event.stopPropagation(); route("studio", button.dataset.openLibrary.toLowerCase()); openLibrary(); };
    button.addEventListener("click", open); button.addEventListener("keydown", event => { if (["Enter", " "].includes(event.key)) open(event); });
  });
  $("#home-quick-listen").addEventListener("click", () => route("studio"));
  $("[data-about]").addEventListener("click", () => dialog.showModal());
  $(".dialog-close").addEventListener("click", () => dialog.close());
  $(".dialog-done").addEventListener("click", () => dialog.close());
  $("#dialog-launch-btn").addEventListener("click", () => route("studio"));
  motionButton.addEventListener("click", () => { motionPaused = !motionPaused; syncVideo(); });
  reducedMotion.addEventListener("change", event => { motionPaused = event.matches; syncVideo(); });
  document.addEventListener("visibilitychange", () => { syncVideo(); if (document.hidden && player.state === "playing") player.pause(); });
  window.addEventListener("hashchange", routeHash); window.addEventListener("popstate", routeHash);
  window.addEventListener("pagehide", () => player.stop());
  document.addEventListener("keydown", event => {
    if (studio.hidden || libraryDialog.open || dialog.open || event.target.closest("input,select,textarea,button,a,summary")) return;
    if (event.code === "Space") { event.preventDefault(); player.toggle(); }
  });
  routeHash();
  fetch("assets/data/manifest.json").then(response => {
    if (!response.ok) throw new Error("The image library could not load. Serve the website over HTTP and reload.");
    return response.json();
  }).then(async data => {
    manifest = data; renderLibrary(); await selectEntry(defaultEntry(sphere));
    (window.requestIdleCallback || (callback => setTimeout(callback, 200)))(() => warmLibrary().catch(() => {}));
  }).catch(error => { player.state = "error"; player.notify(error.message); });
})();
