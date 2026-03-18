import { Router } from 'express';
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, relative, normalize, dirname } from 'path';

const router = Router();

const IGNORE = new Set(['.git', 'node_modules', '__pycache__', '.DS_Store', 'dist', '.next', 'build']);

function safeJoin(base, filePath) {
  const resolved = normalize(join(base, filePath));
  if (!resolved.startsWith(base + '/') && resolved !== base) throw new Error('Path traversal');
  return resolved;
}

function listDir(dirPath, base, depth = 0) {
  if (depth > 4) return [];
  let entries;
  try { entries = readdirSync(dirPath, { withFileTypes: true }); } catch { return []; }
  return entries
    .filter(e => !IGNORE.has(e.name) && !e.name.startsWith('.'))
    .map(e => {
      const fullPath = join(dirPath, e.name);
      const relPath = relative(base, fullPath);
      if (e.isDirectory()) {
        return { name: e.name, path: relPath, type: 'dir', children: listDir(fullPath, base, depth + 1) };
      }
      return { name: e.name, path: relPath, type: 'file', size: statSync(fullPath).size };
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

router.get('/:slug/tree', (req, res) => {
  const base = `/projects/${req.params.slug}`;
  if (!existsSync(base)) return res.json([]);
  try { res.json(listDir(base, base)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:slug/content', (req, res) => {
  const base = `/projects/${req.params.slug}`;
  const { path: filePath } = req.query;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  try {
    const abs = safeJoin(base, filePath);
    const content = readFileSync(abs, 'utf-8');
    res.json({ content });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:slug/content', (req, res) => {
  const base = `/projects/${req.params.slug}`;
  const { path: filePath } = req.query;
  const { content } = req.body;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  try {
    const abs = safeJoin(base, filePath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, 'utf-8');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
