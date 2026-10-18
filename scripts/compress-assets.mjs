#!/usr/bin/env node
// ============================================================
// Precompress dist/client static assets → .gz (gzip level 9).
// ============================================================
//
// Cliente pesado / servidor modesto: nginx sirve los estáticos
// directamente desde disco y usa `gzip_static` para NO gastar CPU
// de compresión en runtime (1 núcleo). Esta fase recorre
// dist/client y genera el hermano .gz de cada .js/.css/.svg.
//
// - Mismo tamaño que client-side gzip por defecto de nginx (nivel≈6),
//  pero comprimió al máximo en build: ahorra bytes de red en móvil.
// - Idempotente: si el .gz ya existe y es más nuevo que el fuente,
//   se salta.
//
// Corre al final de `npm run build` (package.json). Sin deps nuevas.
// Ver odd/tasks/client-heavy-optimization.md (T1).

import { promises as fs } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const CLIENT_DIR = path.resolve('dist/client');
const COMPRESSIBLE = new Set(['.js', '.css', '.svg', '.txt', '.json']);

const MIN_SIZE = 1024; // bajo esto, gzip_static no compensa (igual que gzip_min_length en nginx)

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  let stat;
  try {
    stat = await fs.stat(CLIENT_DIR);
  } catch {
    console.error('[compress-assets] dist/client no existe — ¿corrió `npm run build` antes?');
    process.exit(1);
  }
  if (!stat.isDirectory()) {
    console.error('[compress-assets] dist/client no es un directorio');
    process.exit(1);
  }

  const files = await walk(CLIENT_DIR);
  let compressed = 0;
  let skipped = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!COMPRESSIBLE.has(ext)) continue;

    const source = await fs.readFile(file);
    if (source.length < MIN_SIZE) continue;

    const gzPath = `${file}.gz`;

    // Idempotencia: existe y es más nuevo → skip
    try {
      const gzStat = await fs.stat(gzPath);
      const srcStat = await fs.stat(file);
      if (gzStat.mtime >= srcStat.mtime) {
        skipped++;
        continue;
      }
    } catch {
      // no existe → comprimir
    }

    const gz = zlib.gzipSync(source, { level: 9 });
    await fs.writeFile(gzPath, gz);
    compressed++;
    bytesBefore += source.length;
    bytesAfter += gz.length;
  }

  const mb = (n) => (n / 1024 / 1024).toFixed(2);
  console.log(
    `[compress-assets] ${compressed} archivos comprimidos, ${skipped} ya existentes. ` +
      `Texto: ${mb(bytesBefore)}MB → ${mb(bytesAfter)}MB gz (${Math.max(
        0,
        Math.round((1 - bytesAfter / Math.max(1, bytesBefore)) * 100)
      )}% ahorrado en red con gzip_static)`
  );
}

main().catch((err) => {
  console.error('[compress-assets] Falló la precompresión:', err);
  process.exit(1);
});
