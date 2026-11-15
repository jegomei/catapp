const roomIdPattern = /^[a-f0-9]{12}$/;
const tokenPattern = /^[a-f0-9-]{36}$/;

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireValue(condition, message, status = 400) {
  if (!condition) throw new RequestError(status, message);
}

function clean(value, max) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

function shuffled(values) {
  const result = [...values];
  const random = new Uint32Array(1);
  for (let i = result.length - 1; i > 0; i--) {
    const range = i + 1;
    const limit = Math.floor(0x100000000 / range) * range;
    do crypto.getRandomValues(random); while (random[0] >= limit);
    const j = random[0] % range;
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function readToken(request) {
  const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  requireValue(tokenPattern.test(token ?? ''), 'Vuelve a abrir Catapp para continuar.', 401);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function member(name, token, sample = false) {
  return { id: crypto.randomUUID(), name, token, sample, ballot: null };
}

function publicRoom(room, viewer) {
  const own = room.people.find(person => person.token === viewer);
  const base = {
    id: room.id, title: room.title, theme: room.theme, size: room.size,
    created: room.created, stage: room.stage, demo: room.demo,
    memberCount: room.people.length,
  };
  if (!own) return base;

  const host = own.id === room.people[0].id;
  const order = room.stage === 'revealing' || room.stage === 'revealed' ? room.order : null;
  return {
    ...base,
    me: own.id, host, myBallot: own.ballot, wines: room.wines,
    people: room.people.map(person => ({
      id: person.id, name: person.name, sample: person.sample, voted: !!person.ballot,
      ...(order ? {
        correct: order.map((wine, index) => person.ballot[index] === wine),
      } : {}),
    })),
    ...(order ? { order } : {}),
  };
}

async function loadRoom(db, id) {
  const row = await db.prepare('SELECT revision, data FROM rooms WHERE id = ?').bind(id).first();
  requireValue(row, 'No encontramos esta cata. Comprueba el enlace.', 404);
  return { revision: row.revision, room: JSON.parse(row.data) };
}

async function createRoom(db, id, viewer, body) {
  const demo = body.demo === true;
  const title = clean(body.title, 70);
  const name = clean(body.name, 32);
  const names = Array.isArray(body.wines) ? body.wines.map(value => clean(value, 90)) : [];
  const size = body.size;
  requireValue(title && name && ['tinto', 'blanco'].includes(body.theme), 'Revisa el nombre y el tipo de cata.');
  requireValue(Number.isInteger(size) && size >= 2 && size <= 10, 'Elige entre 2 y 10 participantes.');
  requireValue(names.length >= 2 && names.length <= 12 && names.every(Boolean), 'Añade entre 2 y 12 vinos con nombre.');
  requireValue(new Set(names.map(wine => wine.toLocaleLowerCase('es'))).size === names.length, 'Cada vino necesita un nombre distinto.');

  const wines = names.map((label, index) => ({ id: index, label }));
  const people = [member(name, viewer)];
  if (demo) {
    const guests = ['Lucía', 'Mateo', 'Inés', 'Pablo', 'Clara', 'Julia', 'Hugo', 'Vera', 'Diego']
      .filter(guest => guest.toLowerCase() !== name.toLowerCase());
    if (guests.length < size - 1) guests.push('Sara');
    for (const guest of guests.slice(0, size - 1)) people.push(member(guest, null, true));
  }

  const room = {
    id, title, theme: body.theme, size, wines: shuffled(wines), people,
    demo, created: new Date().toISOString(), stage: 'lobby',
  };
  const result = await db.prepare('INSERT OR IGNORE INTO rooms (id, data) VALUES (?, ?)')
    .bind(id, JSON.stringify(room)).run();
  if (result.meta.changes) return publicRoom(room, viewer);

  const saved = (await loadRoom(db, id)).room;
  requireValue(saved.people[0].token === viewer, 'Ese código ya existe. Vuelve a crear la cata.', 409);
  return publicRoom(saved, viewer);
}

function sampleBallots(room) {
  const wineIds = room.wines.map(wine => wine.id);
  for (const person of room.people.slice(1)) person.ballot = shuffled(wineIds);
}

function mutate(room, viewer, action, body) {
  const own = room.people.find(person => person.token === viewer);
  const host = own && own.id === room.people[0].id;

  if (action === 'join') {
    if (own) return false;
    requireValue(!room.demo && room.stage === 'lobby', 'Esta cata ya ha comenzado.', 409);
    requireValue(room.people.length < room.size, 'Esta cata está completa.', 409);
    const name = clean(body.name, 32);
    requireValue(name, 'Escribe el nombre que verán los demás.');
    requireValue(!room.people.some(person => person.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es')),
      'Ya hay alguien con ese nombre en la cata.');
    room.people.push(member(name, viewer));
    return true;
  }

  requireValue(own, 'Únete primero a esta cata.', 403);
  if (action === 'start') {
    requireValue(host, 'Solo quien organiza puede iniciar la cata.', 403);
    if (room.stage !== 'lobby') return false;
    requireValue(room.people.length === room.size, 'Todavía faltan participantes.', 409);
    room.stage = 'voting';
    return true;
  }

  if (action === 'vote') {
    if (own.ballot) return false;
    requireValue(room.stage === 'voting', 'La votación está cerrada.', 409);
    const ballot = body.ballot;
    requireValue(Array.isArray(ballot) && ballot.length === room.wines.length &&
      new Set(ballot).size === ballot.length && ballot.every(id => room.wines.some(wine => wine.id === id)),
    'Elige un vino diferente para cada copa.');
    own.ballot = ballot;
    if (room.demo) sampleBallots(room);
    return true;
  }

  if (action === 'reveal') {
    requireValue(host, 'Solo quien organiza puede revelar la cata.', 403);
    if (room.stage === 'revealing' || room.stage === 'revealed') return false;
    requireValue(room.stage === 'voting' && room.people.every(person => person.ballot), 'Todavía faltan votos.', 409);
    room.order = [];
    room.stage = 'revealing';
    return true;
  }

  if (action === 'reveal-wine') {
    requireValue(host, 'Solo quien organiza puede registrar el vino de la copa.', 403);
    const { position, wine } = body;
    requireValue(Number.isInteger(position) && position >= 0 && position < room.wines.length,
      'Esa copa no es válida.');
    requireValue(room.wines.some(candidate => candidate.id === wine), 'Elige un vino de la cata.');
    requireValue(room.stage === 'revealing' || room.stage === 'revealed', 'El revelado aún no ha comenzado.', 409);
    if (room.order[position] === wine) return false;
    requireValue(room.stage === 'revealing' && position === room.order.length,
      'Solo se puede registrar la siguiente copa pendiente.', 409);
    requireValue(!room.order.includes(wine), 'Ese vino ya se reveló en otra copa.', 409);

    room.order.push(wine);
    if (room.order.length === room.wines.length) room.stage = 'revealed';
    return true;
  }

  throw new RequestError(404, 'Acción desconocida.');
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function roomsAPI(request, db, pathname) {
  try {
    requireValue(db, 'La sala no está disponible. Inténtalo en un momento.', 503);
    const [, , , id, action] = pathname.split('/');
    requireValue(roomIdPattern.test(id ?? ''), 'El código de la cata no es válido.', 404);
    const viewer = await readToken(request);
    if (request.method === 'GET' && !action) {
      return json(publicRoom((await loadRoom(db, id)).room, viewer));
    }
    requireValue(request.method === 'POST' && action, 'Acción desconocida.', 404);
    const raw = await request.text();
    requireValue(raw.length <= 8192, 'El formulario es demasiado largo.', 413);
    let body;
    try { body = JSON.parse(raw); } catch { throw new RequestError(400, 'El formulario no es válido.'); }
    requireValue(body && typeof body === 'object' && !Array.isArray(body), 'El formulario no es válido.');

    if (action === 'create') return json(await createRoom(db, id, viewer, body), 201);

    for (let attempt = 0; attempt < 8; attempt++) {
      const { revision, room } = await loadRoom(db, id);
      if (!mutate(room, viewer, action, body)) return json(publicRoom(room, viewer));
      const result = await db.prepare('UPDATE rooms SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?')
        .bind(JSON.stringify(room), id, revision).run();
      if (result.meta.changes) return json(publicRoom(room, viewer));
    }
    throw new RequestError(409, 'La sala está cambiando. Inténtalo otra vez.');
  } catch (error) {
    if (error instanceof RequestError) return json({ error: error.message }, error.status);
    console.error('Room request failed', error.message);
    return json({ error: 'La sala no está disponible. Inténtalo en un momento.' }, 503);
  }
}
