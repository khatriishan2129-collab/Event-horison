const home = document.querySelector('#home');
const explore = document.querySelector('#explore');
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

function openInfo(eyebrow, title, description, theme = 'general', artHtml = '') {
  dialog.classList.remove('theme-general', 'theme-lithosphere', 'theme-atmosphere', 'theme-hydrosphere');
  dialog.classList.add(`theme-${theme.toLowerCase()}`);
  dialog.setAttribute('data-theme', theme.toLowerCase());

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
  const currentHash = window.location.hash.toLowerCase().replace('#', '');
  if (validWorlds.includes(currentHash)) {
    history.replaceState(null, '', '#explore');
  }
}

function route(focusHeading = false) {
  const rawHash = window.location.hash.toLowerCase().replace('#', '');
  const isWorld = validWorlds.includes(rawHash);
  const page = (rawHash === 'explore' || isWorld) ? 'explore' : 'home';

  home.hidden = page !== 'home';
  explore.hidden = page !== 'explore';

  document.querySelectorAll('[data-nav]').forEach(link => {
    const active = link.dataset.nav === page;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  document.title = page === 'explore' ? 'Explore our planet — Jukebox' : 'Jukebox — The planet has a rhythm.';
  const section = page === 'home' ? home : explore;
  section.classList.remove('page-enter');
  requestAnimationFrame(() => section.classList.add('page-enter'));

  if (page === 'explore') {
    if (isWorld) {
      const worldName = rawHash.charAt(0).toUpperCase() + rawHash.slice(1);
      const tile = document.querySelector(`[data-world="${worldName}"]`);
      if (tile) {
        const art = tile.querySelector('.tile-art')?.innerHTML || '';
        const kicker = tile.querySelector('.tile-kicker')?.textContent;
        const eyebrow = kicker ? `${kicker} · COMING SOON` : 'YOUR NEXT DISCOVERY · COMING SOON';
        openInfo(eyebrow, worldName, `${worldDescriptions[worldName]} This collection is taking shape. More to explore soon.`, rawHash, art);
      }
    } else {
      if (dialog.open) dialog.close();
      if (focusHeading) document.querySelector('#explore-heading').focus({ preventScroll: true });
    }
  } else {
    if (dialog.open) dialog.close();
  }

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

document.querySelectorAll('[data-world]').forEach(tile => {
  tile.addEventListener('click', () => {
    const world = tile.dataset.world;
    const theme = world.toLowerCase();
    const art = tile.querySelector('.tile-art')?.innerHTML || '';
    const kicker = tile.querySelector('.tile-kicker')?.textContent;
    const eyebrow = kicker ? `${kicker} · COMING SOON` : 'YOUR NEXT DISCOVERY · COMING SOON';

    window.location.hash = theme;
    openInfo(eyebrow, world, `${worldDescriptions[world]} This collection is taking shape. More to explore soon.`, theme, art);
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
dialog.addEventListener('close', () => {
  const currentHash = window.location.hash.toLowerCase().replace('#', '');
  if (validWorlds.includes(currentHash)) {
    history.replaceState(null, '', '#explore');
  }
});

route();
updateMotionButton();
