import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import generate from './dist-ssr/generate.js';

const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function error(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}

createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path === '/api/generate') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return error(res, 405, 'Method not allowed');
      }
      const chunks = [];
      let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > 16384) return error(res, 413, 'Request too large');
        chunks.push(chunk);
      }
      try {
        req.body = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        return error(res, 400, 'Invalid JSON');
      }
      return await generate(req, res);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return error(res, 405, 'Method not allowed');
    }
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + sep)) return error(res, 404, 'Not found');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': data.length });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (err) {
    if (err instanceof URIError || err.code === 'ERR_INVALID_ARG_VALUE') return error(res, 400, 'Invalid path');
    if (['ENOENT', 'ENOTDIR', 'EISDIR'].includes(err.code)) return error(res, 404, 'Not found');
    console.error(err.message);
    error(res, 500, 'Server error');
  }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0');
