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

function route(focusHeading = false) {
  const page = window.location.hash === '#explore' ? 'explore' : 'home';
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
  window.scrollTo(0, 0);
  if (focusHeading && page === 'explore') document.querySelector('#explore-heading').focus({ preventScroll: true });
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

function openInfo(eyebrow, title, description) {
  document.querySelector('#dialog-eyebrow').textContent = eyebrow;
  document.querySelector('#dialog-title').textContent = title;
  document.querySelector('#dialog-description').textContent = description;
  dialog.showModal();
}

document.querySelector('[data-about]').addEventListener('click', () => {
  openInfo('THE JUKEBOX PROJECT', 'A new perspective on our planet.', 'Jukebox brings Earth observation and discovery together. Explore the land, air, and water that shape our world — and find the connections in between.');
});
const worldDescriptions = {
  General: 'The big picture: a place to discover how Earth’s systems connect.',
  Lithosphere: 'Solid ground: a place to explore Earth’s landscapes and geological patterns.',
  Atmosphere: 'Above and beyond: a place to discover the air, weather, and sky around us.',
  Hydrosphere: 'Into the blue: a place to explore Earth’s oceans, currents, and water.'
};
document.querySelectorAll('[data-world]').forEach(tile => {
  tile.addEventListener('click', () => {
    const world = tile.dataset.world;
    openInfo('YOUR NEXT DISCOVERY · COMING SOON', world, `${worldDescriptions[world]} This collection is taking shape. More to explore soon.`);
  });
});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('.dialog-done').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
route();
updateMotionButton();
