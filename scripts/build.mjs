import { mkdir, readFile, readdir, writeFile, copyFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: { 'pages-origin': { type: 'string' } },
});
const pagesOrigin = values['pages-origin'];
if (pagesOrigin && (new URL(pagesOrigin).protocol !== 'https:' || new URL(pagesOrigin).origin !== pagesOrigin)) {
  throw new Error('El origen de GitHub Pages debe ser una URL HTTPS sin ruta.');
}

const mime = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8', webp: 'image/webp' };
const assets = {};
if (!pagesOrigin) {
  for (const directory of ['docs', 'docs/assets']) {
    for (const file of await readdir(directory, { withFileTypes: true })) {
      const type = mime[file.name.split('.').at(-1)];
      if (!file.isFile() || !type) continue;
      const name = `${directory}/${file.name}`;
      const bytes = await readFile(name);
      assets[name.slice('docs'.length)] = [type, bytes.toString('base64')];
    }
  }
}

const worker = await readFile('server/rooms.js', 'utf8');
const entrypoint = `${worker}

const assets = ${JSON.stringify(assets)};
const pagesOrigin = ${JSON.stringify(pagesOrigin ?? null)};
const allowedHeaders = {
  'Access-Control-Allow-Origin': pagesOrigin,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '600',
};
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/rooms/')) {
      const origin = request.headers.get('Origin');
      if (!pagesOrigin || !origin) return roomsAPI(request, env.DB, pathname);
      if (origin !== pagesOrigin) return new Response('Origen no autorizado', { status: 403 });
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: allowedHeaders });

      const response = await roomsAPI(request, env.DB, pathname);
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', pagesOrigin);
      headers.append('Vary', 'Origin');
      return new Response(response.body, { status: response.status, headers });
    }
    const canonical = pathname === '/' ? '/index.html' : pathname;
    const asset = Object.hasOwn(assets, canonical) && assets[canonical];
    if (!asset) return new Response('Página no encontrada', { status: 404 });
    const [type, data] = asset;
    return new Response(Uint8Array.from(atob(data), character => character.charCodeAt(0)), {
      headers: {
        'Content-Type': type,
        'Cache-Control': canonical.startsWith('/assets/') ? 'public, max-age=3600' : 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
};
`;

await mkdir('dist/server', { recursive: true });
await writeFile('dist/server/index.js', entrypoint);
try {
  await mkdir('dist/.openai', { recursive: true });
  await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
