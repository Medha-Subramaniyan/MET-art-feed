// Dev server: serves this folder, plus /met-image and /met-api, small proxies for the Met.
//
// Why the proxies: WebGL can only use an image if its response has a CORS header. The Met's server sends
// one, but their CDN drops it from cached copies, so most images fail in the browser at random. The API
// can also start refusing a browser after a burst of requests, and those refusals have no CORS header.
// Asking from here avoids CORS altogether, and keeps a copy so each thing is only requested once.
//
// Run with: node server.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT) || 5173;
const ROOT = fileURLToPath(new URL('.', import.meta.url));
const MET_IMAGES = 'https://images.metmuseum.org/CRDImages/';
const MET_API = 'https://collectionapi.metmuseum.org/public/collection/';
const CACHE_LIMIT = 400 * 1024 * 1024;
const BACK_OFF = 2 * 60 * 1000; // after the Met refuses us, leave them alone for a while

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
};

const cache = new Map(); // Met url -> { body, type }
let cacheSize = 0;
let quietUntil = 0;

function remember(url, entry)
{
    cache.set(url, entry);
    cacheSize += entry.body.length;

    // a Map keeps insertion order, so the first key is the oldest
    for (const [oldest, { body }] of cache) {
        if (cacheSize <= CACHE_LIMIT) break;
        cache.delete(oldest);
        cacheSize -= body.length;
    }
}

async function proxy(url, res)
{
    let entry = cache.get(url);

    if (!entry) {
        if (Date.now() < quietUntil) {
            res.writeHead(503).end();
            return;
        }

        const upstream = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!upstream.ok) {
            if (upstream.status === 403 || upstream.status === 429) {
                quietUntil = Date.now() + BACK_OFF;
                console.log(`The Met refused a request (${upstream.status}). Pausing for ${BACK_OFF / 1000}s.`);
            }
            res.writeHead(upstream.status).end(); // never cache a refusal
            return;
        }
        entry = {
            body: Buffer.from(await upstream.arrayBuffer()),
            type: upstream.headers.get('content-type') || 'application/octet-stream',
        };
        remember(url, entry);
    }

    res.writeHead(200, { 'Content-Type': entry.type, 'Cache-Control': 'public, max-age=86400' });
    res.end(entry.body);
}

// Only ever reach the Met's image folder and API, so these can't be used to fetch anything else.
function safePath(path)
{
    return Boolean(path) && /^[\w./-]+$/.test(path) && !path.includes('..');
}

async function staticFile(pathname, res)
{
    const file = normalize(join(ROOT, pathname.endsWith('/') ? `${pathname}index.html` : pathname));

    if (file !== ROOT && !file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) {
        res.writeHead(403).end();
        return;
    }

    try {
        const body = await readFile(file);
        res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(body);
    } catch {
        res.writeHead(404).end('Not found');
    }
}

createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        const apiPath = url.pathname.slice('/met-api/'.length);

        if (url.pathname === '/met-image') {
            const path = url.searchParams.get('path');
            if (safePath(path)) await proxy(MET_IMAGES + path, res);
            else res.writeHead(400).end('Not a Met image path');
        } else if (url.pathname.startsWith('/met-api/')) {
            if (safePath(apiPath)) await proxy(MET_API + apiPath + url.search, res);
            else res.writeHead(400).end('Not a Met API path');
        } else {
            await staticFile(decodeURIComponent(url.pathname), res);
        }
    } catch (error) {
        console.log('request failed', req.url, error.message);
        if (!res.headersSent) res.writeHead(502);
        res.end();
    }
}).listen(PORT, '127.0.0.1', () => {
    console.log(`After Hours is open at http://localhost:${PORT}`);
});
