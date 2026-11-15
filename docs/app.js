const svgPaths = {
  wine: '<path d="M8 22h8m-4-7v7M7 2h10l1.3 6.1A5.7 5.7 0 0 1 12.7 15h-1.4a5.7 5.7 0 0 1-5.6-6.9L7 2Zm-1 7h12"/>',
  glass: '<path d="M7 2h10l1.3 6.1A5.7 5.7 0 0 1 12.7 15h-1.4a5.7 5.7 0 0 1-5.6-6.9L7 2Zm5 13v7m-4 0h8"/><path d="M6.2 9h11.6a5.7 5.7 0 0 1-5.1 5.3h-1.4A5.7 5.7 0 0 1 6.2 9Z" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="M19 12H5m6 6-6-6 6-6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  book: '<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M5 17h15m-10-9h5m-5 4h3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4m-3-12a4 4 0 0 1 0 8"/><circle cx="9" cy="7" r="4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  link: '<path d="M10 13a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-2 2m2 6a4 4 0 0 0-6 0l-4 4a4 4 0 0 0 6 6l2-2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 2v2"/>',
  edit: '<path d="m16 3 5 5M4 20l4.5-1 12-12a2.8 2.8 0 0 0-4-4l-12 12L4 20Z"/>',
  sparkle: '<path d="M12 2c.8 6 4 9.2 10 10-6 .8-9.2 4-10 10-.8-6-4-9.2-10-10 6-.8 9.2-4 10-10Z"/>',
  trophy: '<path d="M8 21h8m-4-5v5M7 3h10v8a5 5 0 0 1-10 0V3ZM7 5H3v2a4 4 0 0 0 4 4m10-6h4v2a4 4 0 0 1-4 4"/>',
  flask: '<path d="M9 3h6m-5 0v7l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3m-6 12h8"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5m-13 8v3h16v-3"/>',
};
const icon = (name, size = 20, extra = '') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${svgPaths[name]}</svg>`;
const html = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const capitalize = (value) => value[0].toUpperCase() + value.slice(1);
function winePhoto(theme, scene = '') {
  const color = theme === 'blanco' ? 'blanco' : 'tinto';
  return new URL(`./assets/${color}${scene ? '-' + scene : ''}.webp`, import.meta.url).href;
}
const wineScenes = ['servir', 'remolino', 'copa-en-mano', 'dos-copas', 'reflejos', 'decantador'];
const cupPhoto = (theme, index) => winePhoto(theme, wineScenes[index % wineScenes.length]);
const roomsOrigin = location.hostname === 'jegomei.github.io'
  ? document.querySelector('meta[name="catapp-rooms-origin"]').content
  : location.origin;

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem('catapp:' + key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem('catapp:' + key, JSON.stringify(value)); }
  catch { /* The current page remains usable when device storage is unavailable. */ }
}

const shell = document.querySelector('#shell');
const notice = document.querySelector('#announcer');
const token = read('token', '') || crypto.randomUUID();
save('token', token);
let mode = read('theme', 'tinto') === 'blanco' ? 'blanco' : 'tinto';
let form = makeForm();
let room = null;
let activeId = '';
let draft = null;
let round = 0;
let subview = '';
let slide = 0;
let pending = false;
let loadError = '';
let notified;
let demoId = '';
let pollInProgress = false;

function makeForm() {
  return { id: '', theme: mode, title: '', name: read('name', ''), size: 6, wines: ['', ''] };
}
const sample = {
  id: 'ejemplo', title: 'Entre amigos y entre copas', theme: 'tinto', size: 6, stage: 'revealed', demo: true,
  created: '2026-10-24T12:00:00Z', wines: ['Viña Ardanza', 'Muga Reserva', 'Emilio Moro', 'La Montesa', 'Pétalos del Bierzo', 'Juan Gil Etiqueta Plata'].map((label, id) => ({ id, label })),
  order: [3, 0, 5, 2, 1, 4],
  people: [
    ['Lucía', [true, true, false, true, true, true]],
    ['Mateo', [true, true, true, false, false, true]],
    ['Inés', [false, true, false, true, false, true]],
    ['Pablo', [true, false, false, false, true, false]],
    ['Clara', [false, false, true, false, false, true]],
    ['Álex', [false, true, false, false, false, false]],
  ].map(([name, correct], id) => ({ id, name, correct })),
};
const routes = () => location.hash.slice(1).split('/');
function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}
function announce(message) {
  clearTimeout(notified);
  notice.textContent = message;
  notice.classList.add('visible');
  notified = setTimeout(() => notice.classList.remove('visible'), 3200);
}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name=theme-color]').content = theme === 'tinto' ? '#170c10' : '#f7f0df';
}
function moveFocus(selector = 'h1') {
  requestAnimationFrame(() => {
    const target = document.querySelector(selector);
    if (!target) return;
    if (!target.matches('button, input, textarea, select, a')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
}
function top() { window.scrollTo({ top: 0, behavior: 'instant' }); }

function renderHeader(theme, plain = false) {
  const page = routes()[0];
  return `<header class="masthead"><div class="masthead-inner">
    <a class="brand" href="#inicio" aria-label="Catapp, inicio"><span class="brand-icon">${icon('wine', 22)}</span><span>Catapp<span class="brand-dot">.</span></span></a>
    <nav class="nav" aria-label="Principal">
      <a href="#inicio" ${!page || page === 'inicio' ? 'aria-current="page"' : ''}>Inicio</a>
      <a href="#historial" ${page === 'historial' ? 'aria-current="page"' : ''}>Historial</a>
    </nav>
    ${plain ? `<span class="current-mode"><i></i>${capitalize(theme)}</span>` : `<div class="theme-switch" role="group" aria-label="Estilo de vino">
      ${['tinto', 'blanco'].map(value => `<button type="button" data-action="theme" data-value="${value}" aria-pressed="${theme === value}"><i></i>${capitalize(value)}</button>`).join('')}
    </div>`}
  </div></header>`;
}

function button(label, action, iconName = '', extra = '') {
  return `<button type="button" class="button ${extra}" data-action="${action}">${iconName ? icon(iconName, 18) : ''}<span>${label}</span></button>`;
}
function pill(label, cls = '') { return `<span class="pill ${cls}">${label}</span>`; }
function backLink(href, label) { return `<a class="back-link" href="${href}">${icon('back', 17)} ${label}</a>`; }
function peopleMeta(number) { return `<span>${icon('users', 15)} ${number} participantes</span>`; }
function dateShort(date) {
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));
}
function displayRooms(includeSample = true) {
  const saved = read('history', []);
  return includeSample ? [...saved, sample] : saved;
}

function historyCard(item) {
  const example = item.id === 'ejemplo';
  const href = example ? '#ejemplo' : '#cata/' + item.id;
  const wineCount = item.wines.length;
  const stages = { lobby: 'En sala', voting: 'En curso', revealing: 'En revelado', revealed: 'Finalizada' };
  const status = example ? 'Ejemplo' : stages[item.stage];
  const image = example ? winePhoto(item.theme, 'decantador') : cupPhoto(item.theme, parseInt(item.id.slice(-4), 16));
  return `<a class="history-card" href="${href}">
    <span class="history-thumb ${item.theme}"><img src="${image}" alt="" loading="lazy"></span>
    <span class="history-info">
      <span class="history-title">${html(item.title)}</span>
      <span class="history-meta">${peopleMeta(item.size)}<span class="meta-divider"></span><span>${icon('wine', 15)} ${wineCount} vinos</span></span>
      ${example ? '' : `<span class="history-date">${dateShort(item.created)}</span>`}
    </span>
    <span class="history-end">${pill(status, 'status-pill')}${icon('chevron', 19)}</span>
  </a>`;
}
function home() {
  const isWhite = mode === 'blanco';
  return `<div class="content home">
    <section class="hero">
      <div class="hero-art"><img src="${winePhoto(mode)}" alt="Copa de vino ${mode}"></div>
      <div class="hero-content">
        <div class="eyebrow"><span class="hairline"></span> CATAS ENTRE AMIGOS</div>
        <h1>Catas<br><em>a ciegas.</em></h1>
        <p>Sirve el vino, pon a prueba tu paladar y descubre quién reconoce más copas.</p>
        <div class="hero-actions">
          ${button('Nueva cata', 'new', 'plus', 'primary')}
          ${button('Probar una demo', 'demo', 'flask', 'secondary')}
        </div>
      </div>
      <span class="photo-caption"><i></i> VINO ${isWhite ? 'BLANCO' : 'TINTO'}</span>
    </section>
    <section class="tastings" aria-labelledby="recent">
      <div class="section-heading"><h2 id="recent">Tus catas</h2><a href="#historial">Ver historial ${icon('arrow', 16)}</a></div>
      <div class="history-list">${displayRooms().slice(0, 3).map(historyCard).join('')}</div>
    </section>
  </div>`;
}
function historyPage() {
  return `<div class="content narrow page">${backLink('#inicio', 'Inicio')}
    <div class="page-intro"><h1>Historial de catas</h1><p>Consulta las catas que has creado o jugado en este navegador.</p></div>
    <div class="history-list">${displayRooms().map(historyCard).join('')}</div>
    <div class="page-actions">${button('Nueva cata', 'new', 'plus', 'primary')}</div>
  </div>`;
}
function createPage() {
  return `<div class="content narrow page">
    ${backLink('#inicio', 'Inicio')}
    <div class="page-intro"><h1>Nueva cata</h1><p>Añade los vinos y crea una sala sin registrarte.</p></div>
    <form id="create-form" class="flow-form">
      <section class="panel">
        <h2>Vinos</h2>
        <div class="wine-fields">${form.wines.map((name, i) => `<div class="wine-field">
          <label for="wine-${i}" class="round-number">${String(i + 1).padStart(2, '0')}</label>
          <input id="wine-${i}" aria-label="Vino ${i + 1}" placeholder="Nombre del vino" maxlength="90" data-wine="${i}" value="${html(name)}" required>
          ${form.wines.length > 2 ? `<button type="button" class="icon-button" data-action="remove-wine" data-value="${i}" aria-label="Quitar vino ${i + 1}">${icon('close', 18)}</button>` : ''}
        </div>`).join('')}</div>
        <button type="button" class="text-button add-wine" data-action="add-wine" ${form.wines.length >= 12 ? 'disabled' : ''}>${icon('plus', 19)} Añadir vino</button>
      </section>
      <section class="panel form-fields">
        <h2>Detalles de la cata</h2>
        <label>Nombre de la cata<input name="title" placeholder="La cata del sábado" maxlength="70" value="${html(form.title)}" required></label>
        <label>Tu nombre<input name="name" autocomplete="nickname" placeholder="Tu nombre" maxlength="32" value="${html(form.name)}" required></label>
        <label>Participantes, incluyéndote<select name="size">${Array.from({ length: 9 }, (_, i) => i + 2).map(number => `<option ${form.size === number ? 'selected' : ''}>${number}</option>`).join('')}</select></label>
      </section>
      <button class="button primary wide" type="submit">Crear sala ${icon('arrow', 18)}</button>
    </form>
  </div>`;
}
function roomHeading(label, title, text) {
  return `<div class="page-intro">${label ? `<div class="eyebrow"><span class="hairline"></span>${label}</div>` : ''}<h1>${html(title)}</h1><p>${text}</p></div>`;
}
function roster(displayVotes) {
  return `<ul class="roster">
    ${room.people.map((person, index) => `<li>
        <span class="avatar" style="--avatar:${index % 5}">${html(person.name.slice(0, 1).toUpperCase())}</span>
        <span>${html(person.name)}${person.id === room.me ? ' <small>(tú)</small>' : ''}${index === 0 ? '<small class="role">Anfitrión</small>' : ''}</span>
        ${displayVotes ? pill(person.voted ? 'Votó' : 'Pendiente', person.voted ? 'success-pill' : '') : icon('check', 17, 'class="roster-check"')}
    </li>`).join('')}
  </ul>`;
}
function joinPage() {
  const canJoin = !room.demo && room.stage === 'lobby' && room.memberCount < room.size;
  return `<div class="content narrow page">${backLink('#inicio', 'Inicio')}
    ${roomHeading('INVITACIÓN A UNA CATA', room.title, canJoin ? 'Escribe tu nombre para unirte a la sala.' : 'La sala está completa o la cata ya ha empezado.')}
    ${canJoin ? `<form id="join-form" class="panel form-fields"><label>Tu nombre<input name="name" autocomplete="nickname" maxlength="32" value="${html(read('name', ''))}" required></label>
      <button type="submit" class="button primary wide">Unirme a la cata ${icon('arrow', 18)}</button></form>` : ''}
  </div>`;
}
function lobby() {
  const full = room.people.length === room.size;
  return `<div class="content narrow page">
    ${backLink('#inicio', 'Inicio')}
    ${roomHeading(room.demo ? 'CATA DE DEMOSTRACIÓN' : 'SALA DE ESPERA', room.title, room.demo
      ? 'Hay cinco invitados simulados. Votarán cuando envíes tus elecciones.'
      : room.host ? 'Comparte el enlace. Numerad las botellas tapadas y dejad las etiquetas para el final.' : 'La cata empezará cuando el anfitrión dé paso a la primera copa.')}
    ${!room.demo ? `<div class="panel invite-panel"><div><span>Código de la sala</span><strong>${room.id.toUpperCase()}</strong></div>${button('Compartir enlace', 'share', 'link', 'secondary')}</div>` : ''}
    <section class="panel">
      <div class="panel-heading"><h2>Participantes</h2>${pill(`${room.people.length} / ${room.size}`, full ? 'success-pill' : '')}</div>
      ${roster(false)}
    </section>
    ${room.host ? `<div class="page-actions stacked">
      <button type="button" class="button primary wide" data-action="start" ${full ? '' : 'disabled'}>Empezar cata a ciegas ${icon('arrow', 18)}</button>
    </div>` : ''}
  </div>`;
}

function updateHistory() {
  if (!room?.me || room.id === 'ejemplo') return;
  const history = displayRooms(false).filter(item => item.id !== room.id);
  const { id, title, theme, demo, wines, stage, size, created } = room;
  save('history', [{ id, title, theme, demo, wines, stage, size, created }, ...history].sort((a, b) => b.created.localeCompare(a.created)));
}
function blankDraft(id, count) {
  const saved = read('draft:' + id, {});
  return {
    choices: Array.from({ length: count }, (_, index) => saved.choices?.[index] ?? null),
    notes: Array.from({ length: count }, (_, index) => saved.notes?.[index] ?? ''),
  };
}
function persistDraft() { save('draft:' + room.id, draft); }
function wineName(id) { return html(room.wines.find(wine => wine.id === id)?.label ?? 'Sin asignar'); }
function pickedCount() { return draft.choices.filter(choice => choice !== null).length; }
function progress(total, position, actions = false) {
  return `<div class="segments" aria-label="${actions ? 'Copa' : 'Tarjeta'} ${position + 1} de ${total}">${Array.from({ length: total }, (_, i) => actions
    ? `<button type="button" class="${i === position ? 'active' : draft.choices[i] !== null ? 'done' : ''}" data-action="round" data-value="${i}" aria-label="Copa ${i + 1}" ${i === position ? 'aria-current="step"' : ''}></button>`
    : `<span class="${i === position ? 'active' : i < position ? 'done' : ''}"></span>`).join('')}</div>`;
}
function voting() {
  const total = room.wines.length;
  const count = pickedCount();
  return `<div class="content narrow page voting">
    <div class="voting-top">${backLink('#inicio', 'Inicio')}<button data-action="review" type="button" class="text-button">${icon('book', 17)} Revisar elecciones</button></div>
    ${progress(total, round, true)}
    <div class="round-banner" style="--photo:url('${cupPhoto(room.theme, round)}')">
      <div><span class="eyebrow">COPA ${String(round + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span><h1>Vino ${round + 1}</h1></div>
    </div>
    <section class="panel vote-panel">
      <div class="panel-heading"><h2>¿Qué vino es?</h2>${pill(`${count} / ${total}`)}</div>
      <div class="options" role="group" aria-label="Elige un vino para la copa ${round + 1}">
        ${room.wines.map(wine => {
          const index = draft.choices.indexOf(wine.id);
          const selected = index === round;
          return `<button type="button" class="wine-option" data-action="pick" data-value="${wine.id}" aria-pressed="${selected}">
            <span class="option-dot">${selected ? icon('check', 12) : ''}</span><span>${html(wine.label)}${index >= 0 && !selected ? `<small>Asignado a la copa ${index + 1}</small>` : ''}</span>
          </button>`;
        }).join('')}
      </div>
    </section>
    <section class="panel notes-panel">
      <label for="private-notes"><span>Notas privadas</span><span>${icon('lock', 16)} Solo tú</span></label>
      <textarea id="private-notes" placeholder="Aromas, textura, primeras impresiones…" maxlength="3000">${html(draft.notes[round])}</textarea>
    </section>
    <div class="page-actions between">
      ${round ? button('Anterior', 'previous', 'back', 'secondary') : '<span></span>'}
      <button class="button primary" type="button" data-action="next">${round === total - 1 ? 'Revisar elecciones' : 'Siguiente copa'} ${icon('arrow', 18)}</button>
    </div>
  </div>`;
}
function review() {
  const count = pickedCount();
  const total = room.wines.length;
  return `<div class="content narrow page">
    <button type="button" class="back-link" data-action="edit-vote">${icon('back', 17)} Volver a las copas</button>
    ${roomHeading('', 'Tus elecciones', 'Comprueba el orden antes de enviar tus votos.')}
    <section class="panel">
      <div class="panel-heading"><h2>Orden de las copas</h2>${pill(`${count} / ${total}`)}</div>
      <ol class="review-list">${draft.choices.map((id, index) => `<li>
        <button type="button" data-action="round" data-value="${index}" aria-label="Editar copa ${index + 1}">
          <span class="round-number">${String(index + 1).padStart(2, '0')}</span>
          <span>${wineName(id)}${draft.notes[index] ? '<small>Con notas privadas</small>' : ''}</span>
          ${icon('edit', 17)}
        </button></li>`).join('')}</ol>
    </section>
    <div class="page-actions stacked">
      <button type="button" class="button primary wide" data-action="submit-vote" ${count === total ? '' : 'disabled'}>${icon('check', 19)} Enviar mis votos</button>
      <p class="muted centered">${count === total ? 'Una vez enviados, los votos quedan cerrados.' : 'Asigna un vino a cada copa para poder votar.'}</p>
    </div>
  </div>`;
}
function waiting() {
  const votes = room.people.filter(person => person.voted).length;
  const all = votes === room.size;
  return `<div class="content narrow page">
    ${backLink('#inicio', 'Inicio')}
    <div class="status-intro"><span class="status-icon">${icon(all ? 'sparkle' : 'check', 29)}</span>
    ${roomHeading('', all ? 'Todo listo para revelar' : 'Votos enviados', all
      ? room.host ? 'Todas las personas han votado. Destapad las etiquetas copa a copa para ver quién acertó.' : 'Ya están todos los votos. El anfitrión dará paso al revelado.'
      : 'La cata se resolverá cuando todos hayan enviado sus votos.')}</div>
    <section class="panel"><div class="panel-heading"><h2>Votación</h2>${pill(`${votes} / ${room.size}`, all ? 'success-pill' : '')}</div>
      ${roster(true)}
    </section>
    ${room.host ? `<div class="page-actions"><button class="button primary wide" type="button" data-action="reveal" ${all ? '' : 'disabled'}>${icon('sparkle', 18)} Resolver cata</button></div>` : ''}
  </div>`;
}

function revealQuestion() {
  if (!room.host) return `<h1>Copa ${slide + 1}</h1><p>Esperando a que el anfitrión revele el vino.</p>`;

  const remaining = room.wines.filter(wine => !room.order.includes(wine.id));
  return `<h1 id="reveal-question">¿Qué vino había en la copa ${slide + 1}?</h1>
    <form id="reveal-form">
      <select name="wine" aria-labelledby="reveal-question" required>
        <option value="">Elige el vino</option>
        ${remaining.map(wine => `<option value="${wine.id}">${html(wine.label)}</option>`).join('')}
      </select>
    </form>`;
}
function revealedWine() {
  const correct = room.people.filter(person => person.correct[slide]);
  return `<h1>${wineName(room.order[slide])}</h1>
    <div class="correct"><h2>${correct.length === 1 ? '1 acierto' : `${correct.length} aciertos`}</h2>
      <div class="correct-names">${correct.length ? correct.map(person => pill(`${icon('check', 13)} ${html(person.name)}`)).join('') : '<span>Nadie ha acertado esta copa.</span>'}</div>
    </div>`;
}
function results() {
  const total = room.wines.length;
  if (slide === total) return ranking();
  const known = slide < room.order.length;
  const photo = cupPhoto(room.theme, slide + (known ? 3 : 1));
  return `<div class="content story-wrap">
    <section class="story" aria-roledescription="revelado por copas" style="--photo:url('${photo}')">
      <div class="story-top">
        ${progress(total + 1, slide)}
        <div><span>${html(room.title)}</span><a href="#historial" class="icon-button" aria-label="Cerrar revelado">${icon('close', 21)}</a></div>
      </div>
      <div class="story-body" ${known ? 'tabindex="0" aria-label="Toca a la izquierda para retroceder y a la derecha para avanzar"' : ''}>
        ${known ? `<div class="story-zones">
          <button type="button" data-action="slide-back" aria-label="Copa anterior" ${slide === 0 ? 'disabled' : ''} tabindex="-1"></button>
          <button type="button" data-action="slide-next" aria-label="Copa siguiente" tabindex="-1"></button>
        </div>` : ''}
        <div class="story-copy ${known ? '' : 'story-question'}">
          <div class="eyebrow"><span class="hairline"></span> COPA ${String(slide + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</div>
          ${known ? revealedWine() : revealQuestion()}
        </div>
      </div>
      <div class="story-bottom">
        ${slide ? button('Anterior', 'slide-back', 'back', 'secondary story-button') : '<span></span>'}
        ${known ? `<button class="button primary" type="button" data-action="slide-next">${slide === total - 1 ? 'Ver clasificación' : 'Siguiente copa'} ${icon('arrow', 18)}</button>`
          : room.host ? `<button class="button primary" type="submit" form="reveal-form">Ver quién acertó ${icon('arrow', 18)}</button>` : ''}
      </div>
    </section>
  </div>`;
}
function freezeReport() {
  return {
    cata: room.title, tipo: room.theme, fecha: room.created,
    orden: room.order.map((id, index) => ({
      copa: index + 1,
      vino: room.wines.find(wine => wine.id === id).label,
      aciertos: room.people.filter(person => person.correct[index]).map(person => person.name),
    })),
  };
}
function ranking() {
  const entries = room.people.map(person => ({ ...person, score: person.correct.filter(Boolean).length }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'es'));
  const total = room.order.length;
  return `<div class="content narrow page">
    ${backLink('#historial', 'Historial')}
    <div class="status-intro"><span class="status-icon">${icon('trophy', 29)}</span>
    ${roomHeading('RESULTADOS', 'Clasificación', html(room.title))}</div>
    <ol class="panel ranking">
      ${entries.map((person, index) => {
        const position = entries.findIndex(entry => entry.score === person.score) + 1;
        return `<li class="${index === 0 ? 'first' : ''}">
          <span class="round-number">${position}</span>
          <span class="rank-name">${html(person.name)}${person.id === room.me ? ' <small>(tú)</small>' : ''}</span>
          <span class="score" aria-label="${person.score} de ${total} aciertos">
            <span class="score-icons">${Array.from({ length: person.score }, () => icon('glass', 15)).join('')}</span> <strong>${person.score}/${total}</strong>
          </span>
        </li>`;
      }).join('')}
    </ol>
    <div class="page-actions stacked">
      ${button('Volver al revelado', 'restart-story', 'wine', 'primary wide')}
      ${button('Descargar resultados', 'export', 'download', 'secondary wide')}
      ${room.myBallot ? button('Ver mis notas', 'read-notes', 'lock', 'secondary wide') : ''}
    </div>
  </div>`;
}
function notesPage() {
  return `<div class="content narrow page">
    <button type="button" class="back-link" data-action="close-notes">${icon('back', 17)} Clasificación</button>
    ${roomHeading('', 'Mis notas', 'Guardadas en este navegador.')}
    <div class="panel"><ol class="review-list">${room.order.map((id, index) => `<li class="saved-note">
      <span class="round-number">${index + 1}</span><div><strong>${wineName(id)}</strong>
      <p>${html(draft?.notes[index] || 'Sin notas')}</p></div>
    </li>`).join('')}</ol></div>
  </div>`;
}
function roomPage() {
  if (!room) return `<div class="content narrow page">${backLink('#inicio', 'Inicio')}
    ${loadError ? `<h1>No se pudo abrir la sala</h1><p>${html(loadError)}</p>${button('Volver a intentar', 'retry', '', 'primary')}` : '<p class="loading" role="status">Abriendo la sala…</p>'}
  </div>`;
  if (!room.me && room.id !== 'ejemplo') return joinPage();
  if (room.stage === 'lobby') return lobby();
  if (Array.isArray(room.order)) return subview === 'notes' ? notesPage() : results();
  if (room.myBallot) return waiting();
  return subview === 'review' ? review() : voting();
}
function render({ focus = '', scroll = false } = {}) {
  const [page] = routes();
  const inRoom = page === 'cata' || page === 'ejemplo';
  const theme = inRoom && room ? room.theme : page === 'nueva' ? form.theme : mode;
  setTheme(theme);
  const immersive = inRoom && Array.isArray(room?.order) && slide < room.wines.length && !subview;
  const section = inRoom ? roomPage() : page === 'nueva' ? createPage() : page === 'historial' ? historyPage() : home();
  shell.innerHTML = `${immersive ? '' : renderHeader(theme, inRoom)}<main id="main">${section}</main>
    ${immersive ? '' : '<footer class="footer"><span>Catapp</span><span>Catas a ciegas entre amigos</span></footer>'}`;
  if (scroll) top();
  if (focus) moveFocus(focus);
}
async function api(id, method = 'GET', action = '', body = {}) {
  const response = await fetch(`${roomsOrigin}/api/rooms/${id}${action ? '/' + action : ''}`, {
    method,
    headers: { Authorization: 'Bearer ' + token, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('No se ha podido conectar con la sala.');
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error ?? 'Inténtalo de nuevo.');
    error.status = response.status;
    throw error;
  }
  return result;
}
function applyRoom(data) {
  const changedStage = room && room.stage !== data.stage;
  if (!room && data.host && data.stage === 'revealing') slide = Math.max(0, data.order.length - 1);
  room = data;
  if (data.wines && !draft) {
    draft = blankDraft(data.id, data.wines.length);
    const unassigned = draft.choices.indexOf(null);
    round = unassigned < 0 ? 0 : unassigned;
  }
  if (changedStage) subview = '';
  updateHistory();
}
async function route() {
  const [page, id] = routes();
  room = null;
  activeId = '';
  draft = null;
  subview = '';
  slide = 0;
  loadError = '';
  if (page === 'ejemplo') room = sample;
  if (page === 'cata') {
    activeId = /^[a-f0-9]{12}$/.test(id ?? '') ? id : '';
    if (!activeId) loadError = 'El código de la cata no es válido.';
  }
  render({ scroll: true });
  if (activeId) await refresh(false, true);
}
async function refresh(silent = true, initial = false) {
  const id = activeId;
  if (!id || (silent && (pending || pollInProgress || document.hidden))) return;
  if (silent && room && (room.stage === 'revealed' || (room.stage === 'voting' && room.me && !room.myBallot))) return;
  const current = room;
  pollInProgress = true;
  try {
    const next = await api(id);
    if (id !== activeId || (silent && (pending || room !== current)) || JSON.stringify(next) === JSON.stringify(room)) return;
    const stageChanged = room && next.stage !== room.stage;
    const cupRevealed = room?.order?.[slide] === undefined && next.order?.[slide] !== undefined;
    if (silent && !stageChanged && !room?.me && document.activeElement?.matches('#join-form input')) return;
    applyRoom(next);
    loadError = '';
    const focused = document.activeElement?.getAttribute('data-action');
    render({ scroll: initial || stageChanged, focus: stageChanged || cupRevealed ? 'h1' : focused ? `[data-action="${focused}"]` : '' });
  } catch (error) {
    if (id !== activeId) return;
    if (!silent) {
      if (!room) { loadError = error.message; render(); }
      else announce(error.message);
    }
  } finally { pollInProgress = false; }
}
function busy(value) {
  pending = value;
  shell.querySelector('main')?.toggleAttribute('aria-busy', value);
}
async function create(demo) {
  if (pending) return;
  const definition = demo ? {
    demo: true, title: 'Cata de demostración', name: read('name', '') || 'Tú',
    theme: mode, size: 6, wines: mode === 'blanco'
      ? ['Martín Códax Albariño', 'José Pariente Verdejo', 'Mar de Frades', 'Pazo de Señorans', 'O Luar do Sil', 'Terras Gauda']
      : sample.wines.map(wine => wine.label),
  } : form;
  if (demo) demoId ||= newId();
  else form.id ||= newId();
  const id = demo ? demoId : form.id;
  const sourceRoute = location.hash;
  busy(true);
  try {
    const created = await api(id, 'POST', 'create', definition);
    if (!demo) { save('name', created.people[0].name); form = makeForm(); }
    else demoId = '';
    if (location.hash === sourceRoute) go('#cata/' + id);
  } catch (error) { announce(error.message); }
  finally { busy(false); }
}
function newId() { return crypto.randomUUID().replaceAll('-', '').slice(0, 12); }
async function changeRoom(action, body = {}) {
  if (pending || !activeId) return;
  const id = activeId;
  busy(true);
  try {
    const next = await api(id, 'POST', action, body);
    if (activeId !== id) return;
    if (action === 'join') save('name', next.people.find(person => person.id === next.me).name);
    applyRoom(next);
    render({ scroll: true, focus: 'h1' });
  } catch (error) { announce(error.message); }
  finally { busy(false); }
}
async function share() {
  const url = new URL(location.href);
  url.hash = 'cata/' + room.id;
  const title = room.title;
  try {
    if (navigator.share) {
      await navigator.share({ title, text: 'Únete a nuestra cata a ciegas en Catapp.', url: url.href });
      return;
    }
  } catch (error) { if (error.name === 'AbortError') return; }
  try {
    await navigator.clipboard.writeText(url.href);
    announce('Enlace de invitación copiado.');
  } catch {
    window.prompt('Copia el enlace de la cata', url.href);
  }
}
function pick(value) {
  const previous = draft.choices.indexOf(value);
  if (previous === round) return;
  if (previous >= 0) draft.choices[previous] = draft.choices[round];
  draft.choices[round] = value;
  persistDraft();
  render({ focus: `[data-action="pick"][data-value="${value}"]` });
  if (previous >= 0) announce(draft.choices[previous] === null
    ? `La copa ${previous + 1} queda pendiente.`
    : `Se intercambiaron las copas ${previous + 1} y ${round + 1}.`);
}
function showRound(value) {
  round = value;
  subview = '';
  render({ scroll: true, focus: 'h1' });
}
function showSlide(position) {
  if (position < 0 || position > room.order.length) return;
  slide = position;
  render({ scroll: true, focus: 'h1' });
}
function exportResults() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(freezeReport(), null, 2)], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: `catapp-${room.id}.json` });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

shell.addEventListener('click', async event => {
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  const action = target.dataset.action;
  const value = target.dataset.value;
  switch (action) {
    case 'theme':
      mode = value;
      save('theme', mode);
      if (routes()[0] === 'nueva') form.theme = mode;
      render({ focus: `[data-action="theme"][data-value="${mode}"]` });
      break;
    case 'new': form = makeForm(); go('#nueva'); break;
    case 'demo': await create(true); break;
    case 'retry': await route(); break;
    case 'add-wine':
      form.wines.push('');
      render({ focus: '#wine-' + (form.wines.length - 1) });
      break;
    case 'remove-wine':
      form.wines.splice(Number(value), 1);
      render({ focus: '#wine-' + Math.min(Number(value), form.wines.length - 1) });
      break;
    case 'share': await share(); break;
    case 'start': await changeRoom('start'); break;
    case 'round': showRound(Number(value)); break;
    case 'pick': pick(Number(value)); break;
    case 'previous': showRound(round - 1); break;
    case 'edit-vote': showRound(round); break;
    case 'next':
    case 'review':
      if (action === 'next' && round < room.wines.length - 1) showRound(round + 1);
      else { subview = 'review'; render({ scroll: true, focus: 'h1' }); }
      break;
    case 'submit-vote': await changeRoom('vote', { ballot: draft.choices }); break;
    case 'reveal': await changeRoom('reveal'); break;
    case 'slide-next': showSlide(slide + 1); break;
    case 'slide-back': showSlide(slide - 1); break;
    case 'restart-story': showSlide(0); break;
    case 'export': exportResults(); break;
    case 'read-notes': subview = 'notes'; render({ scroll: true, focus: 'h1' }); break;
    case 'close-notes': subview = ''; render({ scroll: true, focus: 'h1' }); break;
  }
});
shell.addEventListener('input', event => {
  const input = event.target;
  if (input.form?.id === 'create-form') {
    if (input.dataset.wine !== undefined) form.wines[Number(input.dataset.wine)] = input.value;
    else if (input.name) form[input.name] = input.name === 'size' ? Number(input.value) : input.value;
  }
  if (input.id === 'private-notes') {
    draft.notes[round] = input.value;
    persistDraft();
  }
});
shell.addEventListener('submit', async event => {
  event.preventDefault();
  if (event.target.id === 'create-form') await create(false);
  if (event.target.id === 'join-form') await changeRoom('join', { name: new FormData(event.target).get('name') });
  if (event.target.id === 'reveal-form') {
    const wine = new FormData(event.target).get('wine');
    if (wine) await changeRoom('reveal-wine', { position: slide, wine: Number(wine) });
  }
});
window.addEventListener('keydown', event => {
  if (!document.querySelector('.story') || event.target.matches?.('select') || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    showSlide(slide + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
window.addEventListener('hashchange', route);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
setInterval(refresh, 2600);
route();
