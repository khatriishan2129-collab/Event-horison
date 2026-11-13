const home = document.querySelector('#home');
const explore = document.querySelector('#explore');
const studio = document.querySelector('#studio');
const video = document.querySelector('#background-video');
const motionButton = document.querySelector('#motion-toggle');
const dialog = document.querySelector('#info-dialog');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let motionPaused = reducedMotion.matches;

function updateMotionButton() {
  const paused = motionPaused || video.paused;
  motionButton.innerHTML = `<span aria-hidden="true">${paused ? '▷' : 'Ⅱ'}</span> ${paused ? 'Play motion' : 'Pause motion'}`;
  motionButton.setAttribute('aria-label', `${paused ? 'Play' : 'Pause'} background video`);
}

function syncVideo() {
  if (home.hidden || motionPaused || document.hidden) video.pause();
  else video.play().catch(updateMotionButton);
}

const worldDescriptions = {
  General: 'The big picture: a place to discover how Earth’s systems connect.',
  Lithosphere: 'Solid ground: a place to explore Earth’s landscapes and geological patterns.',
  Atmosphere: 'Above and beyond: a place to discover the air, weather, and sky around us.',
  Hydrosphere: 'Into the blue: a place to explore Earth’s oceans, currents, and water.'
};

const validWorlds = ['general', 'lithosphere', 'atmosphere', 'hydrosphere'];

const worldToDataset = {
  general: 'general_precip',
  lithosphere: 'lithosphere_temp',
  atmosphere: 'atmosphere_aod',
  hydrosphere: 'hydrosphere_sst'
};

let currentModalWorld = 'atmosphere';

function openInfo(eyebrow, title, description, theme = 'general', artHtml = '') {
  currentModalWorld = theme.toLowerCase();
  dialog.classList.remove('theme-general', 'theme-lithosphere', 'theme-atmosphere', 'theme-hydrosphere');
  dialog.classList.add(`theme-${currentModalWorld}`);
  dialog.setAttribute('data-theme', currentModalWorld);

  document.querySelector('#dialog-eyebrow').textContent = eyebrow;
  document.querySelector('#dialog-title').textContent = title;
  document.querySelector('#dialog-description').textContent = description;

  const artContainer = document.querySelector('#dialog-art');
  if (artContainer) {
    if (artHtml) {
      artContainer.innerHTML = artHtml;
      artContainer.hidden = false;
    } else {
      artContainer.innerHTML = '';
      artContainer.hidden = true;
    }
  }

  if (!dialog.open) {
    dialog.showModal();
  }
}

function closeDialog() {
  if (dialog.open) dialog.close();
}

// ============================================================================
// STUDIO STATE & RENDERING ENGINE
// ============================================================================

const mapCanvas = document.querySelector('#studio-map-canvas');
const mapViewport = document.querySelector('#map-viewport');
const scanlineV = document.querySelector('#scanline-v');
const scanlineH = document.querySelector('#scanline-h');
const scanOrb = document.querySelector('#scan-target-orb');
const probePin = document.querySelector('#probe-pin');
const playBtn = document.querySelector('#studio-play-btn');
const playSymbol = document.querySelector('#studio-play-symbol');
const playText = document.querySelector('#studio-play-text');
const resetBtn = document.querySelector('#studio-reset-btn');
const scrubber = document.querySelector('#studio-scrubber');
const scrubCurrTime = document.querySelector('#scrub-curr-time');
const scrubTotalTime = document.querySelector('#scrub-total-time');
const speedSlider = document.querySelector('#studio-speed-slider');
const speedIndicator = document.querySelector('#speed-indicator');
const droneSlider = document.querySelector('#studio-drone-slider');
const droneIndicator = document.querySelector('#drone-indicator');
const volSlider = document.querySelector('#studio-vol-slider');
const volIndicator = document.querySelector('#vol-indicator');
const datasetSelect = document.querySelector('#dataset-select');
const sphereNameBadge = document.querySelector('#studio-sphere-name');
const studioSphereDisplay = document.querySelector('#studio-sphere-display');
const studioNarrative = document.querySelector('#studio-narrative');
const studioLayerTag = document.querySelector('#studio-layer-tag');
const rampMin = document.querySelector('#ramp-min');
const rampMax = document.querySelector('#ramp-max');

// Telemetry Elements
const telPhysVal = document.querySelector('#tel-phys-val');
const telUnit = document.querySelector('#tel-unit');
const telAnomaly = document.querySelector('#tel-anomaly');
const telCoords = document.querySelector('#tel-coords');
const telRegion = document.querySelector('#tel-region');
const telVoice = document.querySelector('#tel-voice');
const telFreq = document.querySelector('#tel-freq');
const hueMeterGrid = document.querySelector('#hue-meter-grid');

// Build 8 Hue Meters
const hueKeys = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'magenta'];
const hueColors = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  purple: '#a855f7',
  magenta: '#ec4899'
};

const hueBarFills = {};
if (hueMeterGrid) {
  hueMeterGrid.innerHTML = '';
  hueKeys.forEach(k => {
    const item = document.createElement('div');
    item.className = 'hue-bar-item';
    item.innerHTML = `
      <span class="hue-bar-name">${k.slice(0, 3)}</span>
      <div class="hue-bar-track">
        <div class="hue-bar-fill" style="background:${hueColors[k]}; height:0%;"></div>
      </div>
    `;
    hueMeterGrid.appendChild(item);
    hueBarFills[k] = item.querySelector('.hue-bar-fill');
  });
}

function drawProceduralMap(ctx, width, height, ds) {
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    const latNorm = y / height;
    const latAngle = (0.5 - latNorm) * Math.PI;
    const cosLat = Math.cos(latAngle);

    for (let x = 0; x < width; x++) {
      const lonNorm = x / width;
      const idx = (y * width + x) * 4;

      let val = 0.5 + 0.35 * Math.sin(lonNorm * Math.PI * 4) * cosLat;
      if (ds.theme === 'atmosphere') {
        val = 0.15 + 0.75 * Math.exp(-Math.pow((latNorm - 0.42) * 4, 2)) * Math.max(0, Math.sin(lonNorm * Math.PI * 2.2));
      } else if (ds.theme === 'hydrosphere') {
        val = 0.05 + 0.9 * cosLat + 0.15 * Math.sin(lonNorm * 10);
      } else if (ds.theme === 'lithosphere') {
        val = 0.2 + 0.6 * Math.sin(lonNorm * 8) * Math.cos(latNorm * 5);
      }

      val = Math.max(0, Math.min(1, val));
      if (ds.theme === 'lithosphere') {
        data[idx] = Math.round(val * 240 + 15);
        data[idx + 1] = Math.round(val * 180 + 20);
        data[idx + 2] = Math.round((1 - val) * 160 + 20);
      } else if (ds.theme === 'atmosphere') {
        data[idx] = Math.round(val * 200 + 40);
        data[idx + 1] = Math.round((1 - val) * 160 + 50);
        data[idx + 2] = Math.round(245 - val * 60);
      } else if (ds.theme === 'hydrosphere') {
        data[idx] = Math.round(15 + val * 60);
        data[idx + 1] = Math.round(50 + val * 180);
        data[idx + 2] = Math.round(120 + val * 135);
      } else {
        data[idx] = Math.round(20 + val * 160);
        data[idx + 1] = Math.round(80 + val * 175);
        data[idx + 2] = Math.round(60 + val * 140);
      }
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

function applyStudioTheme(themeName) {
  if (!studio) return;
  const theme = (themeName || 'atmosphere').toLowerCase();
  studio.classList.remove('theme-general', 'theme-lithosphere', 'theme-atmosphere', 'theme-hydrosphere');
  studio.classList.add(`theme-${theme}`);
  studio.setAttribute('data-theme', theme);
  const sphereCapitalized = theme.charAt(0).toUpperCase() + theme.slice(1);
  if (sphereNameBadge) {
    sphereNameBadge.textContent = sphereCapitalized;
  }
  if (studioSphereDisplay) {
    studioSphereDisplay.textContent = sphereCapitalized;
  }
  const dsKey = worldToDataset[theme];
  const ds = window.earthSonifier?.datasets?.[dsKey];
  if (ds) {
    if (studioNarrative) studioNarrative.textContent = ds.sub;
    if (studioLayerTag) studioLayerTag.textContent = ds.title;
    if (rampMin) rampMin.textContent = ds.rampMin;
    if (rampMax) rampMax.textContent = ds.rampMax;
  }
}

async function mountStudioWorld(sphereKey) {
  const normKey = (sphereKey || 'atmosphere').toLowerCase();
  const dsKey = worldToDataset[normKey] || 'atmosphere_aod';
  
  // Synchronously set theme and badge immediately to eliminate any lag or color mismatch
  applyStudioTheme(normKey);

  if (datasetSelect) datasetSelect.value = dsKey;
  await mountStudioDataset(dsKey);
}

async function mountStudioDataset(dsKey) {
  if (!window.earthSonifier) return;
  
  // Pre-apply metadata if dataset definition exists synchronously
  const syncDs = window.earthSonifier.datasets?.[dsKey];
  if (syncDs) {
    applyStudioTheme(syncDs.theme);
    if (studioSphereDisplay) studioSphereDisplay.textContent = syncDs.sphere;
    if (studioNarrative) studioNarrative.textContent = syncDs.sub;
    if (studioLayerTag) studioLayerTag.textContent = syncDs.title;
    if (rampMin) rampMin.textContent = syncDs.rampMin;
    if (rampMax) rampMax.textContent = syncDs.rampMax;
    if (telUnit) telUnit.textContent = syncDs.unit;
    if (telPhysVal) telPhysVal.textContent = ((syncDs.minVal + syncDs.maxVal) / 2).toFixed(1);
    if (telAnomaly) telAnomaly.textContent = `Nominal ${syncDs.sphere} Range`;
  }

  const ds = await window.earthSonifier.loadDataset(dsKey);
  
  // Apply theme to Studio Page
  applyStudioTheme(ds.theme);

  if (sphereNameBadge) sphereNameBadge.textContent = ds.sphere;
  if (studioSphereDisplay) studioSphereDisplay.textContent = ds.sphere;
  if (studioNarrative) studioNarrative.textContent = ds.sub;
  if (studioLayerTag) studioLayerTag.textContent = ds.title;
  if (rampMin) rampMin.textContent = ds.rampMin;
  if (rampMax) rampMax.textContent = ds.rampMax;
  if (telUnit) telUnit.textContent = ds.unit;
  if (telPhysVal) telPhysVal.textContent = ((ds.minVal + ds.maxVal) / 2).toFixed(1);
  if (telAnomaly) telAnomaly.textContent = `Nominal ${ds.sphere} Range`;

  // Draw base map image onto canvas
  if (mapCanvas) {
    mapCanvas.width = 1024;
    mapCanvas.height = 512;
    const ctx = mapCanvas.getContext('2d');
    if (window.earthSonifier.imgSource && window.earthSonifier.imgSource.complete && window.earthSonifier.imgSource.naturalWidth > 0) {
      try {
        ctx.drawImage(window.earthSonifier.imgSource, 0, 0, 1024, 512);
      } catch (e) {
        drawProceduralMap(ctx, 1024, 512, ds);
      }
    } else {
      drawProceduralMap(ctx, 1024, 512, ds);
    }
  }

  // Set visual mode display
  updateScanlineMode(window.earthSonifier.mode);
}

function updateScanlineMode(mode) {
  if (!scanlineV || !scanlineH || !scanOrb) return;
  if (mode === 'we') {
    scanlineV.style.display = 'block';
    scanlineH.style.display = 'none';
    scanOrb.style.display = 'none';
  } else if (mode === 'ns') {
    scanlineV.style.display = 'none';
    scanlineH.style.display = 'block';
    scanOrb.style.display = 'none';
  } else if (mode === 'spiral') {
    scanlineV.style.display = 'none';
    scanlineH.style.display = 'none';
    scanOrb.style.display = 'block';
  }
}

// Connect Sonifier Engine Callbacks
if (window.earthSonifier) {
  window.earthSonifier.onUpdate(state => {
    // 1. Position Scanline
    if (state.mode === 'we') {
      scanlineV.style.left = `${(state.scanX * 100).toFixed(2)}%`;
    } else if (state.mode === 'ns') {
      scanlineH.style.top = `${(state.scanY * 100).toFixed(2)}%`;
    } else if (state.mode === 'spiral') {
      scanOrb.style.left = `${(state.scanX * 100).toFixed(2)}%`;
      scanOrb.style.top = `${(state.scanY * 100).toFixed(2)}%`;
    }

    // 2. Telemetry Values
    if (telPhysVal) telPhysVal.textContent = state.physVal;
    if (telUnit) telUnit.textContent = state.unit;
    if (telAnomaly) {
      telAnomaly.textContent = state.anomalyText;
      telAnomaly.style.color = state.isAnomaly ? 'var(--theme-accent)' : 'var(--mist)';
    }
    if (telCoords) telCoords.textContent = `${state.latStr}, ${state.lonStr}`;
    if (telRegion) telRegion.textContent = state.regionStr;
    if (telVoice) telVoice.textContent = state.leadVoice;
    if (telFreq) {
      const panPct = Math.round(Math.abs(state.pan) * 100);
      const panDir = state.pan < -0.05 ? `${panPct}% L` : state.pan > 0.05 ? `${panPct}% R` : 'Center';
      telFreq.textContent = `Pitch: ${state.targetFreq} Hz · Stereo: ${panDir}`;
    }

    // 3. Hue-Wheel Meters
    if (state.hueDist) {
      const maxCount = Math.max(1, ...Object.values(state.hueDist));
      for (const [k, count] of Object.entries(state.hueDist)) {
        if (hueBarFills[k]) {
          const pct = Math.round((count / maxCount) * 100);
          hueBarFills[k].style.height = `${pct}%`;
        }
      }
    }

    // 4. Scrubber & Time
    if (scrubber && !scrubber.matches(':active')) {
      scrubber.value = Math.round(state.progress * 1000);
    }
    if (scrubCurrTime) {
      const totalSec = window.earthSonifier.durationSec || 36;
      const curSec = Math.floor(state.progress * totalSec);
      const m = Math.floor(curSec / 60).toString().padStart(2, '0');
      const s = (curSec % 60).toString().padStart(2, '0');
      scrubCurrTime.textContent = `${m}:${s}`;
    }

    // 5. Playing state class
    if (state.isPlaying) {
      studio.classList.add('playing');
      if (playSymbol) playSymbol.textContent = '⏸';
      if (playText) playText.textContent = 'Pause Sonifier';
    } else {
      studio.classList.remove('playing');
      if (playSymbol) playSymbol.textContent = '▶';
      if (playText) playText.textContent = 'Play Sonifier';
    }
  });
}

// Setup Transport Buttons
if (playBtn) {
  playBtn.addEventListener('click', () => {
    if (window.earthSonifier) window.earthSonifier.togglePlay();
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    if (window.earthSonifier) window.earthSonifier.seek(0);
  });
}

if (scrubber) {
  scrubber.addEventListener('input', e => {
    if (window.earthSonifier) {
      window.earthSonifier.seek(Number(e.target.value) / 1000);
    }
  });
}

// Sweep Mode Tabs
document.querySelectorAll('[data-sweep]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[data-sweep]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const mode = tab.dataset.sweep;
    if (window.earthSonifier) {
      window.earthSonifier.setMode(mode);
      updateScanlineMode(mode);
    }
  });
});

// Audio Sliders
if (speedSlider) {
  speedSlider.addEventListener('input', e => {
    const val = Number(e.target.value);
    if (speedIndicator) speedIndicator.textContent = `${val.toFixed(2)}x`;
    if (window.earthSonifier) window.earthSonifier.setSpeed(val);
  });
}
if (droneSlider) {
  droneSlider.addEventListener('input', e => {
    const val = Number(e.target.value);
    if (droneIndicator) droneIndicator.textContent = `${Math.round(val * 100)}%`;
    if (window.earthSonifier) window.earthSonifier.setDroneLevel(val);
  });
}
if (volSlider) {
  volSlider.addEventListener('input', e => {
    const val = Number(e.target.value);
    if (volIndicator) volIndicator.textContent = `${Math.round(val * 100)}%`;
    if (window.earthSonifier) window.earthSonifier.setVolume(val);
  });
}

// Dataset Switcher
if (datasetSelect) {
  datasetSelect.addEventListener('change', e => {
    mountStudioDataset(e.target.value);
  });
}

// Map Viewport Interactive Point Probe
if (mapViewport) {
  mapViewport.addEventListener('click', e => {
    const rect = mapViewport.getBoundingClientRect();
    const xNorm = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const yNorm = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    if (probePin) {
      probePin.style.display = 'block';
      probePin.style.left = `${(xNorm * 100).toFixed(1)}%`;
      probePin.style.top = `${(yNorm * 100).toFixed(1)}%`;
    }

    if (window.earthSonifier) {
      if (window.earthSonifier.mode === 'we') window.earthSonifier.seek(xNorm);
      else if (window.earthSonifier.mode === 'ns') window.earthSonifier.seek(yNorm);
      else window.earthSonifier.seek(xNorm);

      if (!window.earthSonifier.isPlaying) {
        window.earthSonifier.play();
      }
    }
  });
}

// Keyboard shortcuts for studio
window.addEventListener('keydown', e => {
  if (studio.hidden) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

  if (e.code === 'Space') {
    e.preventDefault();
    if (window.earthSonifier) window.earthSonifier.togglePlay();
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    if (window.earthSonifier) {
      window.earthSonifier.seek(window.earthSonifier.progress + 0.02);
    }
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    if (window.earthSonifier) {
      window.earthSonifier.seek(window.earthSonifier.progress - 0.02);
    }
  } else if (e.key === '1') {
    document.querySelector('[data-sweep="we"]')?.click();
  } else if (e.key === '2') {
    document.querySelector('[data-sweep="ns"]')?.click();
  } else if (e.key === '3') {
    document.querySelector('[data-sweep="spiral"]')?.click();
  }
});

// Launch button inside info dialog (if opened from about)
const dialogLaunchBtn = document.querySelector('#dialog-launch-btn');
if (dialogLaunchBtn) {
  dialogLaunchBtn.addEventListener('click', () => {
    if (dialog.open) dialog.close();
    window.location.hash = `studio/${currentModalWorld}`;
  });
}

// ============================================================================
// ROUTING ENGINE (3 Pages: #home, #explore, #studio)
// ============================================================================

function route(focusHeading = false) {
  const hash = window.location.hash.toLowerCase().replace('#', '');
  const parts = hash.split('/');
  const routeName = parts[0] || 'home';
  const subTarget = parts[1] || '';

  const isWorld = validWorlds.includes(routeName);
  const isStudio = routeName === 'studio' || isWorld;
  const isExplore = routeName === 'explore';

  let activePage = 'home';
  if (isStudio) activePage = 'studio';
  else if (isExplore) activePage = 'explore';

  home.hidden = activePage !== 'home';
  explore.hidden = activePage !== 'explore';
  studio.hidden = activePage !== 'studio';

  document.querySelectorAll('[data-nav]').forEach(link => {
    const navVal = link.dataset.nav;
    const active = navVal === activePage;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  if (activePage === 'studio') {
    document.title = 'Sonifier Studio — Earth in Sound';
    const sphereTarget = isWorld ? routeName : (subTarget || currentModalWorld || 'atmosphere');
    mountStudioWorld(sphereTarget);
    if (dialog.open) dialog.close();
  } else if (activePage === 'explore') {
    document.title = 'Explore our planet — Jukebox';
    if (window.earthSonifier && window.earthSonifier.isPlaying) {
      window.earthSonifier.pause();
    }
    if (dialog.open) dialog.close();
    if (focusHeading) document.querySelector('#explore-heading').focus({ preventScroll: true });
  } else {
    document.title = 'Jukebox — The planet has a rhythm.';
    if (dialog.open) dialog.close();
    if (window.earthSonifier && window.earthSonifier.isPlaying) {
      window.earthSonifier.pause();
    }
  }

  const section = activePage === 'home' ? home : activePage === 'explore' ? explore : studio;
  section.classList.remove('page-enter');
  requestAnimationFrame(() => section.classList.add('page-enter'));

  window.scrollTo(0, 0);
  syncVideo();
}

motionButton.addEventListener('click', () => {
  motionPaused = !motionPaused;
  syncVideo();
  updateMotionButton();
});
video.addEventListener('play', updateMotionButton);
video.addEventListener('pause', updateMotionButton);
document.addEventListener('visibilitychange', syncVideo);
reducedMotion.addEventListener('change', event => { motionPaused = event.matches; syncVideo(); });
window.addEventListener('hashchange', () => route(true));

document.querySelector('[data-about]').addEventListener('click', () => {
  openInfo('THE JUKEBOX PROJECT', 'A new perspective on our planet.', 'Jukebox brings Earth observation and discovery together. Explore the land, air, and water that shape our world — and find the connections in between.', 'general');
});

// Click ANY tab card on Page 2: DIRECTLY opens the Studio page in that tab's theme (NO POPUP)
document.querySelectorAll('[data-world]').forEach(tile => {
  tile.addEventListener('click', () => {
    const world = tile.dataset.world;
    const theme = world.toLowerCase();
    window.location.hash = `studio/${theme}`;
  });
});

document.querySelector('.dialog-close').addEventListener('click', closeDialog);
document.querySelector('.dialog-done').addEventListener('click', closeDialog);
dialog.addEventListener('click', event => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      closeDialog();
    }
  }
});

route();
updateMotionButton();
