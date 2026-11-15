import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import './build.mjs';

const { default: worker } = await import('../dist/server/index.js');
const database = new DatabaseSync(':memory:');
database.exec(await readFile('drizzle/0000_rooms.sql', 'utf8'));
const DB = {
  prepare(sql) {
    const statement = database.prepare(sql);
    return {
      bind(...parameters) {
        return {
          first: async () => statement.get(...parameters),
          run: async () => ({ meta: statement.run(...parameters) }),
        };
      },
    };
  },
};

const port = Number(process.env.CATAPP_PORT || 4173);
createServer(async (incoming, outgoing) => {
  try {
    const request = new Request(`http://127.0.0.1:${port}${incoming.url}`, {
      method: incoming.method, headers: incoming.headers,
      ...(incoming.method === 'POST' ? { body: incoming, duplex: 'half' } : {}),
    });
    const response = await worker.fetch(request, { DB });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    outgoing.writeHead(500).end();
  }
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}`));
