const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const connection = navigator.connection;
const constrainedConnection = connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '');
let previewsPaused = reducedMotion || constrainedConnection;
let items = [];
const activityNames = ['Food preparation','Retail','Logistics','Production','Cleaning','Healthcare','Repair','Personal care','Construction','Office work','Farming','Craft','Education'];
const activityLabel = name => ({'Office work':'Office setting','Education':'School setting'}[name] || name);
let activeRawFilter = 'all';
let activeViewerItems = [], activeViewerIndex = 0;
function formatDuration(seconds) { const n=Math.round(seconds||0);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`; }
const dialog = $('#media-dialog');
const heroFilm = $('#hero-film');
const previewVideos = new Set();
const previewLimit = matchMedia('(max-width: 600px)').matches ? 1 : 2;
const releaseTimers = new WeakMap();
const sourcePositions = new WeakMap();
let previewTimer;

function cancelRelease(video) {
  clearTimeout(releaseTimers.get(video));
  releaseTimers.delete(video);
}

function loadVideo(video) {
  cancelRelease(video);
  if (!video.getAttribute('src') && video.dataset.src) {
    video.src = video.dataset.src;
  }
}

function unloadVideo(video, remember = false) {
  cancelRelease(video);
  if (remember && video.hasAttribute('src')) sourcePositions.set(video, video.currentTime || 0);
  video.pause();
  video.classList.remove('preview-ready');
  if (video.hasAttribute('src')) {
    video.removeAttribute('src');
    video.load();
  }
}

function releaseLater(video, remember = false) {
  video.pause();
  if (!video.hasAttribute('src') || releaseTimers.has(video)) return;
  releaseTimers.set(video, setTimeout(() => unloadVideo(video, remember), 1000));
}

function restorePosition(video) {
  const position = sourcePositions.get(video);
  if (position > 0 && Number.isFinite(video.duration)) video.currentTime = Math.min(position, video.duration);
  sourcePositions.delete(video);
}

function releasePreview(video) {
  unloadVideo(video);
}

function syncPreviews() {
  clearTimeout(previewTimer);
  const blocked = previewsPaused || dialog.open || document.hidden || !heroFilm.paused || !$('#process-video').paused;
  const candidates = blocked ? [] : [...previewVideos]
    .filter(video => video.isConnected && Number(video.dataset.visibility) >= .5)
    .sort((a, b) => Number(b.dataset.priority || 0) - Number(a.dataset.priority || 0) || Number(b.dataset.visibility) - Number(a.dataset.visibility));
  const active = new Set(candidates.slice(0, previewLimit));
  for (const video of previewVideos) {
    if (active.has(video)) cancelRelease(video);
    else if (blocked) releasePreview(video);
    else releaseLater(video);
  }
  // Let scrolling settle before opening another decoder or starting a request.
  if (active.size) previewTimer = setTimeout(() => {
    for (const video of active) {
      loadVideo(video);
      if (video.paused) video.play().catch(() => {});
    }
  }, 180);
}
const previewObserver = new IntersectionObserver(entries => {
  for (const { target, intersectionRatio } of entries) target.dataset.visibility = String(intersectionRatio);
  syncPreviews();
}, { threshold: [0, .5, .9] });
const posterObserver = new IntersectionObserver(entries => {
  for (const { target, isIntersecting } of entries) if (isIntersecting) {
    target.src = target.dataset.src;
    posterObserver.unobserve(target);
  }
}, { rootMargin: '160px', threshold: 0 });

function makeVideo(item, preview = false) {
  const video = document.createElement('video');
  video.preload = 'none';
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.muted = true;
  video.loop = true;
  if (preview) {
    video.dataset.src = item.preview || item.file;
    video.className = 'auto-preview';
    video.setAttribute('aria-hidden', 'true');
    video.addEventListener('playing', () => video.classList.add('preview-ready'));
    previewVideos.add(video);
    previewObserver.observe(video);
  } else {
    video.poster = item.poster;
    video.src = item.file;
    video.controls = true;
    video.setAttribute('aria-label', item.title);
  }
  return video;
}

function openViewer(item) {
  heroFilm.pause();
  $('#process-video').pause();
  previewVideos.forEach(releasePreview);
  const area = $('#dialog-content');
  const previousVideo = $('video', area);
  if (previousVideo) unloadVideo(previousVideo);
  area.replaceChildren();
  const video = makeVideo(item);
  video.preload = 'auto';
  video.muted = item.id !== 'research-film';
  video.loop = item.id !== 'research-film';
  area.append(video);
  $('#dialog-title').textContent = item.title;
  $('#dialog-description').textContent = item.description || '';
  activeViewerItems = item.category ? items.filter(i => i.category === item.category && (item.category !== 'raw' || activeRawFilter === 'all' || i.activity === activeRawFilter)) : [item];
  activeViewerIndex = activeViewerItems.findIndex(i => i.id === item.id);
  if (activeViewerIndex < 0) { activeViewerItems = [item]; activeViewerIndex = 0; }
  $('#dialog-category').textContent = item.category === 'raw' ? `WINDEX-HAND / ${activityLabel(item.activity) || 'CAPTURE'}` : item.category === 'world' ? 'WORLD-FRAME 3D RECONSTRUCTION' : item.category === 'teleop' ? 'HAND2TELEOP / PHYSICAL ROBOT' : item.category === 'policy' ? 'HAND2POLICY / SIMULATION' : 'WINDEX / RESEARCH FILM';
  $('#dialog-position').textContent = activeViewerItems.length > 1 ? `${activeViewerIndex+1} / ${activeViewerItems.length}` : '';
  $('#dialog-prev').hidden = $('#dialog-next').hidden = activeViewerItems.length < 2;
  $('#dialog-playlist').replaceChildren(...(activeViewerItems.length > 1 ? activeViewerItems.map((entry, n) => {
    const button=document.createElement('button');button.setAttribute('aria-label', `Show ${entry.title}`);button.setAttribute('aria-pressed',String(n===activeViewerIndex));
    const img=document.createElement('img');img.src=entry.poster;img.alt='';img.loading='lazy';const caption=document.createElement('span');caption.textContent=entry.title;button.append(img,caption);button.addEventListener('click',()=>openViewer(entry));return button;
  }) : []));
  if (!dialog.open) dialog.showModal();
  syncPreviews();
  const activeThumb=$('#dialog-playlist [aria-pressed="true"]');if(activeThumb) activeThumb.scrollIntoView({behavior:'instant',block:'nearest',inline:'center'});
  document.body.style.overflow = 'hidden';
  video.play().catch(() => {});
}
function moveViewer(direction) { if(activeViewerItems.length > 1) openViewer(activeViewerItems[(activeViewerIndex+direction+activeViewerItems.length)%activeViewerItems.length]); }
$('#dialog-prev').addEventListener('click',()=>moveViewer(-1));
$('#dialog-next').addEventListener('click',()=>moveViewer(1));
dialog.addEventListener('keydown',e=>{ if(e.target.tagName==='VIDEO')return; if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();moveViewer(e.key==='ArrowLeft'?-1:1);} });
$('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => {
  const video = $('#dialog-content video');
  if (video) unloadVideo(video);
  $('#dialog-content').replaceChildren();
  document.body.style.overflow = '';
  if (!document.hidden) {
    if (filmInView) loadVideo(heroFilm);
    if (processInView) loadVideo($('#process-video'));
  }
  syncPreviews();
});
$$('[data-film]').forEach(button => button.addEventListener('click', () => openViewer({ id: 'research-film', title: 'WinDEX · Research film', description: 'Capture, world-frame reconstruction, learned inference, and robot manipulation.', file: heroFilm.dataset.src, poster: 'assets/film-poster.jpg' })));
$('#film-sound').addEventListener('click', () => {
  sourcePositions.delete(heroFilm);
  loadVideo(heroFilm);
  heroFilm.currentTime = 0;
  heroFilm.muted = false;
  heroFilm.play().catch(() => {});
});
heroFilm.addEventListener('error', () => { $('#film-error').hidden = false; });
heroFilm.addEventListener('playing', () => { $('#film-error').hidden = true; });
$('#film-retry').addEventListener('click', () => {
  loadVideo(heroFilm);
  heroFilm.load();
  heroFilm.play().catch(() => { $('#film-error').hidden = false; });
});
let filmResumeOnReturn = false;
let filmStarted = false;
let filmInView = false;
heroFilm.addEventListener('loadedmetadata', () => restorePosition(heroFilm));
heroFilm.addEventListener('play', syncPreviews);
heroFilm.addEventListener('pause', syncPreviews);
const filmObserver = new IntersectionObserver(entries => {
  filmInView = entries[0].isIntersecting;
  if (!filmInView && !document.fullscreenElement) {
    filmResumeOnReturn = !heroFilm.paused;
    releaseLater(heroFilm, true);
  } else if (filmInView && !dialog.open && !document.hidden) {
    loadVideo(heroFilm);
    const shouldPlay = filmResumeOnReturn || (!filmStarted && !reducedMotion && !constrainedConnection);
    filmStarted = true;
    filmResumeOnReturn = false;
    if (shouldPlay) heroFilm.play().catch(() => {});
  }
}, { threshold: .05 });
filmObserver.observe(heroFilm);

function mediaCard(item, index) {
  const article = document.createElement('article');
  article.className = `media-card ${item.category}-card`;
  const button = document.createElement('button');
  button.className = 'media-open';
  button.setAttribute('aria-label', `Play ${item.title}`);
  const poster = document.createElement('img');
  poster.className = 'media-poster';
  poster.dataset.src = item.poster;
  poster.alt = '';
  poster.loading = 'lazy';
  poster.decoding = 'async';
  posterObserver.observe(poster);
  const preview = makeVideo(item, true);
  button.append(poster, preview);
  const prioritize = value => { preview.dataset.priority = value; syncPreviews(); };
  button.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') prioritize('1'); });
  button.addEventListener('pointerleave', () => prioritize('0'));
  button.addEventListener('focus', () => prioritize('1'));
  button.addEventListener('blur', () => prioritize('0'));
  const number = document.createElement('span'); number.className = 'card-index'; number.textContent = String(index + 1).padStart(2, '0');
  const play = document.createElement('span'); play.className = 'card-play'; play.textContent = '▶'; play.setAttribute('aria-hidden', 'true');
  button.append(number, play);
  if (item.category === 'raw' && item.activity) { const badge=document.createElement('span');badge.className='activity-badge';badge.textContent=activityLabel(item.activity);button.append(badge); }
  if (item.category === 'policy') { const badge = document.createElement('span'); badge.className = 'media-badge'; badge.textContent = 'SIMULATION'; button.append(badge); }
  button.addEventListener('click', () => openViewer(item));
  const label = document.createElement('div'); label.className = 'card-label';
  const heading = document.createElement('h3'); heading.textContent = item.title;
  const duration = document.createElement('span'); duration.textContent = `${formatDuration(item.duration)} ↗`;
  label.append(heading, duration); article.append(button, label);
  return article;
}

const rails = new Map();
function updateRail(name) {
  const { rail, shell } = rails.get(name);
  const distance = rail.scrollWidth - rail.clientWidth;
  const atStart = rail.scrollLeft <= 3, atEnd = rail.scrollLeft >= distance - 3;
  $('[data-dir="-1"]', shell).disabled = atStart;
  $('[data-dir="1"]', shell).disabled = atEnd;
  const track = $('.rail-meter i', shell);
  const fraction = rail.clientWidth / Math.max(rail.scrollWidth, 1);
  track.style.width = `${Math.max(fraction * 100, 5)}%`;
  track.style.left = `${distance > 0 ? rail.scrollLeft / distance * (100 - Math.max(fraction * 100, 5)) : 0}%`;
}
function scrollRail(name, direction) {
  const { rail } = rails.get(name);
  rail.scrollBy({ left: direction * rail.clientWidth * .85, behavior: reducedMotion ? 'instant' : 'smooth' });
}
$$('[data-rail-shell]').forEach(shell => {
  const name = shell.dataset.railShell, rail = $('.media-rail', shell);
  rails.set(name, { shell, rail });
  rail.addEventListener('scroll', () => updateRail(name), { passive: true });
  rail.addEventListener('keydown', e => {
    if (e.target !== rail) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); scrollRail(name, e.key === 'ArrowLeft' ? -1 : 1); }
  });
  let pointer = null, suppressClick = false;
  rail.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    pointer = { x: e.clientX, scroll: rail.scrollLeft, id: e.pointerId, dragging: false };
  });
  rail.addEventListener('pointermove', e => {
    if (!pointer) return;
    const delta = e.clientX - pointer.x;
    if (Math.abs(delta) > 6 && !pointer.dragging) {
      pointer.dragging = true;
      rail.setPointerCapture(pointer.id);
      rail.classList.add('dragging');
    }
    if (pointer.dragging) { e.preventDefault(); rail.scrollLeft = pointer.scroll - delta; }
  });
  const stopDrag = () => {
    if (!pointer) return;
    if (pointer.dragging) {
      suppressClick = true;
      if (rail.hasPointerCapture(pointer.id)) rail.releasePointerCapture(pointer.id);
      setTimeout(() => { suppressClick = false; }, 0);
    }
    pointer = null; rail.classList.remove('dragging');
  };
  rail.addEventListener('pointerup', stopDrag);
  rail.addEventListener('pointercancel', stopDrag);
  rail.addEventListener('pointerleave', () => { if (pointer && !pointer.dragging) pointer = null; });
  rail.addEventListener('click', e => { if (suppressClick) { e.preventDefault(); e.stopPropagation(); } }, true);
  new ResizeObserver(() => updateRail(name)).observe(rail);
});
$$('[data-rail]').forEach(button => button.addEventListener('click', () => scrollRail(button.dataset.rail, Number(button.dataset.dir))));

function fillRail(name, selected) {
  const { rail } = rails.get(name);
  $$('video', rail).forEach(video => { previewObserver.unobserve(video); previewVideos.delete(video); releasePreview(video); });
  $$('.media-poster', rail).forEach(img => posterObserver.unobserve(img));
  rail.classList.toggle('short-rail', selected.length < 7);
  rail.replaceChildren(...selected.map(mediaCard));
  rail.scrollLeft = 0;
  $(`#${name}-count`).textContent = selected.length;
  requestAnimationFrame(() => updateRail(name));
}
function renderRaw(filter = 'all') {
  activeRawFilter = filter;
  fillRail('raw', items.filter(i => i.category === 'raw' && (filter === 'all' || i.activity === filter)));
  $('#activity-selection').textContent = filter === 'all' ? 'All activities' : activityLabel(filter);
  $$('[data-filter]').forEach(b => { const active=b.dataset.filter===filter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active)); });
}
function buildActivityFilters() {
 const allRaw=items.filter(i=>i.category==='raw');
 const filters=$('#activity-filters');filters.replaceChildren();
 ['all',...activityNames].forEach(name=>{
  const count=name==='all'?allRaw.length:allRaw.filter(i=>i.activity===name).length;
  const button=document.createElement('button');button.dataset.filter=name;button.setAttribute('aria-pressed',String(name==='all'));button.className=name==='all'?'active':'';
  button.textContent=name==='all'?'All activities':activityLabel(name);
  const number=document.createElement('span');number.textContent=count;button.append(number);button.disabled=count===0;
  button.addEventListener('click',()=>renderRaw(name));filters.append(button);
 });
}

function setStage(id, play = false) {
  const item = items.find(i => i.id === id); if (!item) return;
  const video = $('#process-video'); unloadVideo(video); sourcePositions.delete(video); video.dataset.src = item.file; video.poster = item.poster; video.loop = true; video.setAttribute('aria-label', item.title);
  const button = $(`[data-stage="${id}"]`);
  $('#process-number').textContent = `${$('span', button).textContent} / ${item.title.toUpperCase()}`;
  $('#process-caption').textContent = item.description || '';
  $$('[data-stage]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  if (play || processInView) loadVideo(video);
  if (play) video.play().catch(() => {});
}
$$('[data-stage]').forEach(button => button.addEventListener('click', () => setStage(button.dataset.stage, true)));
let processInView = false;
$('#process-video').addEventListener('loadedmetadata', () => restorePosition($('#process-video')));
$('#process-video').addEventListener('play', syncPreviews);
$('#process-video').addEventListener('pause', syncPreviews);
const processObserver = new IntersectionObserver(entries => {
  processInView = entries[0].isIntersecting;
  if (processInView && !dialog.open && !document.hidden) loadVideo($('#process-video'));
  else releaseLater($('#process-video'), true);
}, { threshold: .1 });
processObserver.observe($('#process-video'));
const motionButton = $('#motion-toggle');
function syncMotionButton() { motionButton.textContent = previewsPaused ? 'Play previews ▷' : 'Pause previews Ⅱ'; motionButton.setAttribute('aria-pressed', String(previewsPaused)); }
syncMotionButton();
motionButton.addEventListener('click', () => { previewsPaused = !previewsPaused; syncMotionButton(); syncPreviews(); });
const tabResume = new Set();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    tabResume.clear();
    [heroFilm, $('#process-video')].forEach(v => { if (!v.paused) tabResume.add(v); });
    $$('video').forEach(v => v.pause());
    releaseLater(heroFilm, true);
    releaseLater($('#process-video'), true);
  } else if (!dialog.open) {
    [[heroFilm, filmInView], [$('#process-video'), processInView]].forEach(([video, inView]) => {
      if (inView) {
        loadVideo(video);
        if (tabResume.has(video)) video.play().catch(() => {});
      }
    });
    tabResume.clear();
  }
  syncPreviews();
});

$('.menu-toggle').addEventListener('click', () => { const open = $('.topbar nav').classList.toggle('open'); $('.menu-toggle').setAttribute('aria-expanded', String(open)); });
$$('.topbar nav a').forEach(a => a.addEventListener('click', () => { $('.topbar nav').classList.remove('open'); $('.menu-toggle').setAttribute('aria-expanded', 'false'); }));
const sectionObserver = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) $$('.topbar nav a').forEach(a => a.classList.toggle('active', a.hash === '#' + entry.target.id)); }, { rootMargin: '-15% 0px -60% 0px' });
$$('section[id]').forEach(section => sectionObserver.observe(section));

fetch('assets/media/manifest.json?v=20261116-perf1').then(r => { if (!r.ok) throw new Error('Media manifest unavailable'); return r.json(); }).then(manifest => {
  items = Array.isArray(manifest) ? manifest : manifest.items;
  buildActivityFilters();
  renderRaw();
  fillRail('world', items.filter(i => i.category === 'world'));
  fillRail('teleop', items.filter(i => i.category === 'teleop'));
  const policy = items.filter(i => i.category === 'policy');
  fillRail('policy', [...policy.filter(i => i.id !== 'policy-multiple-objects'), ...policy.filter(i => i.id === 'policy-multiple-objects')]);
  setStage('processing-observations');
}).catch(error => {
  const message = document.createElement('p'); message.textContent = 'The video gallery could not load. Please reload this page with the local server running.';
  $('#raw-gallery').append(message); console.error(error);
});
fetch('assets/paper-metadata.json').then(r => r.ok ? r.json() : null).then(metadata => { if (metadata?.abstract) $('#paper-abstract').textContent = metadata.abstract; }).catch(() => {});

// Gentle section entrances and reading progress; no animation gates the content.
const revealObserver = new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('entered');revealObserver.unobserve(entry.target);}},{threshold:.08});
if(!reducedMotion)$$('.section-heading,.hero-copy,.hero-cinema,.speed-grid,.paper-info').forEach(el=>{el.classList.add('reveal-ready');revealObserver.observe(el);});
let progressFrame=false;
addEventListener('scroll',()=>{if(progressFrame)return;progressFrame=true;requestAnimationFrame(()=>{const distance=document.documentElement.scrollHeight-innerHeight;$('.reading-progress i').style.width=`${distance>0?scrollY/distance*100:0}%`;progressFrame=false;});},{passive:true});
