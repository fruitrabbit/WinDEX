const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let previewsPaused = reducedMotion;
let items = [];
const activityNames = ['Food preparation','Retail','Logistics','Production','Cleaning','Healthcare','Repair','Personal care','Construction','Office work','Farming','Craft','Education'];
const activityLabel = name => ({'Office work':'Office setting','Education':'School setting'}[name] || name);
let activeRawFilter = 'all';
let activeViewerItems = [], activeViewerIndex = 0;
function formatDuration(seconds) { const n=Math.round(seconds||0);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`; }
const dialog = $('#media-dialog');
const heroFilm = $('#hero-film');
const previewVideos = new Set();
const previewLimit = matchMedia('(max-width: 600px)').matches ? 4 : 8;

function syncPreviews() {
  let active = 0;
  for (const video of previewVideos) {
    const play = video.isConnected && video.dataset.visible === 'true' && !previewsPaused && !dialog.open && !document.hidden && active < previewLimit;
    if (play) {
      active++;
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      video.play().catch(() => {});
    } else video.pause();
  }
}
const previewObserver = new IntersectionObserver(entries => {
  for (const { target, isIntersecting } of entries) target.dataset.visible = String(isIntersecting);
  syncPreviews();
}, { threshold: .25 });

function makeVideo(item, preview = false) {
  const video = document.createElement('video');
  video.poster = item.poster;
  video.preload = 'none';
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.muted = true;
  video.loop = true;
  if (preview) {
    video.dataset.src = item.file;
    video.className = 'auto-preview';
    video.setAttribute('aria-hidden', 'true');
    previewVideos.add(video);
    previewObserver.observe(video);
  } else {
    video.src = item.file;
    video.controls = true;
    video.setAttribute('aria-label', item.title);
  }
  return video;
}

function openViewer(item) {
  heroFilm.pause();
  $('#process-video').pause();
  previewVideos.forEach(v => v.pause());
  const area = $('#dialog-content');
  const previousVideo = $('video', area);
  if (previousVideo) { previousVideo.pause(); previousVideo.removeAttribute('src'); previousVideo.load(); }
  area.replaceChildren();
  const video = makeVideo(item);
  video.preload = 'auto';
  video.muted = item.file !== 'assets/WinDEX-film-browser-v2.mp4';
  video.loop = item.file !== 'assets/WinDEX-film-browser-v2.mp4';
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
  $('#dialog-content video')?.pause();
  $('#dialog-content').replaceChildren();
  document.body.style.overflow = '';
  syncPreviews();
});
$$('[data-film]').forEach(button => button.addEventListener('click', () => openViewer({ title: 'WinDEX · Research film', description: 'Capture, world-frame reconstruction, learned inference, and robot manipulation.', file: 'assets/WinDEX-film-browser-v2.mp4', poster: 'assets/film-poster.jpg' })));
$('#film-sound').addEventListener('click', () => {
  heroFilm.currentTime = 0;
  heroFilm.muted = false;
  heroFilm.play().catch(() => {});
});
heroFilm.addEventListener('error', () => { $('#film-error').hidden = false; });
heroFilm.addEventListener('playing', () => { $('#film-error').hidden = true; });
$('#film-retry').addEventListener('click', () => {
  heroFilm.load();
  heroFilm.play().catch(() => { $('#film-error').hidden = false; });
});
if (reducedMotion) { heroFilm.autoplay = false; heroFilm.pause(); }
let filmResumeOnReturn = false;
const filmObserver = new IntersectionObserver(entries => {
  if (!entries[0].isIntersecting && !document.fullscreenElement) {
    filmResumeOnReturn = !heroFilm.paused;
    heroFilm.pause();
  } else if (filmResumeOnReturn && !dialog.open && !document.hidden) {
    filmResumeOnReturn = false;
    heroFilm.play().catch(() => {});
  }
}, { threshold: .05 });
filmObserver.observe(heroFilm);

function mediaCard(item, index) {
  const article = document.createElement('article');
  article.className = `media-card ${item.category}-card`;
  const button = document.createElement('button');
  button.className = 'media-open';
  button.setAttribute('aria-label', `Play ${item.title}`);
  button.append(makeVideo(item, true));
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
  $$('video', rail).forEach(video => { previewObserver.unobserve(video); previewVideos.delete(video); video.pause(); video.removeAttribute('src'); video.load(); });
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
  const video = $('#process-video'); video.pause(); video.src = item.file; video.poster = item.poster; video.loop = true; video.setAttribute('aria-label', item.title);
  const button = $(`[data-stage="${id}"]`);
  $('#process-number').textContent = `${$('span', button).textContent} / ${item.title.toUpperCase()}`;
  $('#process-caption').textContent = item.description || '';
  $$('[data-stage]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  if (play) video.play().catch(() => {});
}
$$('[data-stage]').forEach(button => button.addEventListener('click', () => setStage(button.dataset.stage, true)));
const processObserver = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) $('#process-video').pause(); }, { threshold: .1 });
processObserver.observe($('#process-video'));
const motionButton = $('#motion-toggle');
function syncMotionButton() { motionButton.textContent = previewsPaused ? 'Play previews ▷' : 'Pause previews Ⅱ'; motionButton.setAttribute('aria-pressed', String(previewsPaused)); }
syncMotionButton();
motionButton.addEventListener('click', () => { previewsPaused = !previewsPaused; syncMotionButton(); syncPreviews(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) $$('video').forEach(v => v.pause()); else syncPreviews(); });

$('.menu-toggle').addEventListener('click', () => { const open = $('.topbar nav').classList.toggle('open'); $('.menu-toggle').setAttribute('aria-expanded', String(open)); });
$$('.topbar nav a').forEach(a => a.addEventListener('click', () => { $('.topbar nav').classList.remove('open'); $('.menu-toggle').setAttribute('aria-expanded', 'false'); }));
const sectionObserver = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) $$('.topbar nav a').forEach(a => a.classList.toggle('active', a.hash === '#' + entry.target.id)); }, { rootMargin: '-15% 0px -60% 0px' });
$$('section[id]').forEach(section => sectionObserver.observe(section));

fetch('assets/media/manifest.json').then(r => { if (!r.ok) throw new Error('Media manifest unavailable'); return r.json(); }).then(manifest => {
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
