#!/usr/bin/env node
/**
 * import-ejercicios.mjs — Transform + dry-run del dataset hasaneyldrm al contrato `ejercicios`.
 *
 * Pipeline (design D1-D9):
 *   Stage 0 — validar input (--dataset | DAVEFIT_DATASET | default)      -> exit 1 si falta
 *   Stage 1 — ingest (readFileSync + JSON.parse)                         -> exit 1 si inválido
 *   Stage 2 — transform (category→grupo_muscular, diccionario ES, urls)  -> WARNs no fatales
 *   Stage 3 — dedupe nombres ("- 2", "- 3", …) por orden de archivo
 *   Stage 4 — emit payload.json + media-manifest.json + report.json
 *   Stage 5 — validación dry-run + exit (0 con WARNs, 1 solo fallo estructural)
 *
 * Determinismo (R7): sin Date.now / Math.random / crypto; salida fija
 * JSON.stringify(x, null, 2) + "\n"; orden derivado del input.
 *
 * NO ejecuta inserts. NO sube media. Uso: ver README.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

// --- Constantes (R4, R5, R6, D3) ---
const DEFAULT_DATASET = '/tmp/opencode/davefit-dataset/exercises.json';
const DEFAULT_OUTPUT = '/tmp/opencode/davefit-dataset/output/';
const RAW_BASE_URL = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';
const FUTURE_BUCKET_URL = 'https://insforge.tesh.online/api/storage/buckets/ejercicios/objects/';
const ATTRIBUTION = '© Gym visual — https://gymvisual.com/';
const EXPECTED_TOTAL = 1324;

// Mapa 10→8 de categoría a grupo_muscular (R2); nunca emite full_body.
const CATEGORY_MAP = Object.freeze({
  chest: 'pecho',
  back: 'espalda',
  'upper legs': 'piernas',
  'lower legs': 'piernas',
  'upper arms': 'brazo',
  'lower arms': 'brazo',
  shoulders: 'hombros',
  waist: 'core',
  cardio: 'cardio',
  neck: 'cuello',
});

// Claves exactas del payload (R5 "Exact key set"; id/created_at/updated_at -> defaults DB).
const PAYLOAD_KEYS = ['nombre', 'descripcion', 'grupo_muscular', 'musculo_objetivo', 'musculos_primarios', 'musculos_secundarios', 'imagen_url', 'video_url', 'instrucciones', 'creado_por'];

// --- CLI / env / defaults (T2) ---
function parseArgs(argv) {
  const args = { dataset: undefined, output: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dataset') args.dataset = argv[++i];
    else if (a === '--output') args.output = argv[++i];
  }
  return args;
}

// --- Stage 2: transform (T4, R2) ---
function transform(record, diccionario, warnCollector) {
  const category = String(record.category ?? '');
  const grupoMuscular = CATEGORY_MAP[category];
  if (!grupoMuscular) {
    warnCollector.categoriasDesconocidas.add(category);
  }

  const traducir = (term) => {
    if (term == null) return null;
    const key = String(term).toLowerCase();
    const es = diccionario[key];
    if (es === undefined) warnCollector.terminosSinTraducir.set(key, (warnCollector.terminosSinTraducir.get(key) ?? 0) + 1);
    return es ?? key;
  };

  const musculosSecundarios = Array.isArray(record.secondary_muscles)
    ? record.secondary_muscles.map(traducir).filter((t) => t !== null)
    : [];

  return {
    nombre: String(record.name ?? ''),
    descripcion: record.instructions?.es ?? null,
    grupo_muscular: grupoMuscular ?? category,
    musculo_objetivo: traducir(record.target),
    musculos_primarios: [traducir(record.muscle_group)].filter((t) => t !== null),
    musculos_secundarios: musculosSecundarios,
    imagen_url: RAW_BASE_URL + String(record.gif_url ?? ''),
    video_url: null, // D4: clave presente, valor NULL
    instrucciones: Array.isArray(record.instruction_steps?.es) ? record.instruction_steps.es : null,
    creado_por: null, // D4
  };
}

// --- Stage 3: dedupe (T5, R3) — orden de archivo, "- 2", "- 3", … ---
function dedupe(records) {
  const seen = new Map(); // nombre -> count
  const renombres = [];
  for (const rec of records) {
    const base = rec.nombre;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    if (count === 1) continue;
    let suffix = count;
    let final = `${base} - ${suffix}`;
    while (seen.has(final)) {
      suffix += 1;
      final = `${base} - ${suffix}`;
    }
    seen.set(final, 1);
    rec.nombre = final;
    renombres.push({ nombre_original: base, nombre_final: final });
  }
  return renombres;
}

// --- Stage 4: emit (T6, R4/R5, D7) ---
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// --- Stage 5: validación estructural (T7, R6) ---
function structuralErrors(payload, report) {
  const errors = [];
  const total = payload.length;
  if (total !== EXPECTED_TOTAL) errors.push(`conteo esperado ${EXPECTED_TOTAL}, obtenido ${total}`);

  const notNull = { nombre: 0, grupo_muscular: 0, imagen_url: 0 };
  for (const rec of payload) {
    if (rec.nombre) notNull.nombre += 1;
    if (rec.grupo_muscular) notNull.grupo_muscular += 1;
    if (rec.imagen_url) notNull.imagen_url += 1;
    if (typeof rec.imagen_url !== 'string' || !rec.imagen_url.startsWith('https://')) errors.push(`imagen_url sin prefijo https:// en "${rec.nombre}"`);
    if (!Array.isArray(rec.musculos_primarios) || !Array.isArray(rec.musculos_secundarios)) errors.push(`musculos no-array en "${rec.nombre}"`);
    if (rec.instrucciones !== null && !Array.isArray(rec.instrucciones)) errors.push(`instrucciones no text[] en "${rec.nombre}"`);
    if (Object.keys(rec).sort().join(',') !== [...PAYLOAD_KEYS].sort().join(',')) errors.push(`keys inesperadas en "${rec.nombre}"`);
  }
  report.checks_not_null = notNull;
  if (notNull.nombre !== total || notNull.grupo_muscular !== total || notNull.imagen_url !== total) {
    errors.push(`cobertura NOT NULL incompleta: ${JSON.stringify(notNull)}`);
  }
  const unicos = new Set(payload.map((r) => r.nombre));
  if (unicos.size !== total) errors.push(`nombres duplicados tras dedupe (${total - unicos.size})`);
  return errors;
}

// --- main ---
function main() {
  const args = parseArgs(process.argv.slice(2));
  const datasetPath = args.dataset ?? process.env.DAVEFIT_DATASET ?? DEFAULT_DATASET;
  const outputDir = args.output ?? process.env.DAVEFIT_OUTPUT ?? DEFAULT_OUTPUT;

  // Stage 0 (T2, R1): el archivo debe existir y ser legible; error nombra la ruta.
  let raw;
  try {
    raw = fs.readFileSync(datasetPath, 'utf8');
  } catch (e) {
    console.error(`[import-ejercicios] ERROR: no se pudo leer el dataset "${datasetPath}" (${e.code})`);
    process.exit(1);
  }

  // Stage 1 (T3, R1): JSON.parse en try/catch; no-array -> exit 1.
  let dataset;
  try {
    dataset = JSON.parse(raw);
  } catch (e) {
    console.error(`[import-ejercicios] ERROR: JSON inválido en "${datasetPath}": ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(dataset)) {
    console.error(`[import-ejercicios] ERROR: el contenido de "${datasetPath}" no es un array (${typeof dataset})`);
    process.exit(1);
  }

  const diccionario = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, 'diccionario.json'), 'utf8'));
  const warnCollector = { categoriasDesconocidas: new Set(), terminosSinTraducir: new Map() };

  // Stage 2 + 3 (T4/T5)
  const records = dataset.map((r) => transform(r, diccionario, warnCollector));
  const renombres = dedupe(records);

  // Stage 4: emit (T6)
  fs.mkdirSync(outputDir, { recursive: true });
  const payloadPath = path.join(outputDir, 'payload.json');
  const manifestPath = path.join(outputDir, 'media-manifest.json');
  const reportPath = path.join(outputDir, 'report.json');

  writeJson(payloadPath, records);

  const manifest = records.map((rec, i) => ({
    media_id: String(dataset[i].media_id ?? ''),
    nombre: rec.nombre,
    imagen_url: rec.imagen_url,
    url_futura_insforge: FUTURE_BUCKET_URL + String(dataset[i].media_id ?? '') + '.gif',
    attribution: ATTRIBUTION,
  }));
  writeJson(manifestPath, manifest);

  // Report: por_grupo_muscular con claves ordenadas alfabéticamente (D7).
  const porGrupo = {};
  for (const rec of records) porGrupo[rec.grupo_muscular] = (porGrupo[rec.grupo_muscular] ?? 0) + 1;
  const porGrupoSorted = Object.fromEntries(Object.entries(porGrupo).sort(([a], [b]) => a.localeCompare(b)));

  const flagsCirilicos = records
    .filter((r) => /[\u0400-\u04FF]/.test(r.nombre))
    .map((r) => r.nombre);
  const terminosSinTraducir = [...warnCollector.terminosSinTraducir.entries()]
    .map(([termino, conteo]) => ({ termino, conteo }))
    .sort((a, b) => a.termino.localeCompare(b.termino));

  const report = {
    total: records.length,
    por_grupo_muscular: porGrupoSorted,
    renombres,
    terminos_sin_traducir: terminosSinTraducir,
    categorias_desconocidas: [...warnCollector.categoriasDesconocidas].sort(),
    flags_cirilicos: flagsCirilicos,
    checks_not_null: { nombre: 0, grupo_muscular: 0, imagen_url: 0 }, // rellenado en Stage 5
    unmapped_categories: warnCollector.categoriasDesconocidas.size,
    untranslated_terms: terminosSinTraducir.length,
    renames_count: renombres.length,
    cyrillic_flags: flagsCirilicos.length,
    nota_equipment: 'campo equipment descartado: la tabla ejercicios no tiene columna',
    attribution: ATTRIBUTION,
    exit_code: 0,
  };

  // Stage 5: validación estructural (T7). WARNs no cambian exit; fallo estructural -> exit 1.
  const errors = structuralErrors(records, report);
  for (const [termino, conteo] of warnCollector.terminosSinTraducir) {
    console.warn(`[import-ejercicios] WARN: "${termino}" sin traducción (${conteo} registro(s))`);
  }
  for (const cat of warnCollector.categoriasDesconocidas) {
    console.warn(`[import-ejercicios] WARN: categoría desconocida "${cat}" — se conserva el valor crudo`);
  }
  if (flagsCirilicos.length > 0) {
    console.warn(`[import-ejercicios] WARN: ${flagsCirilicos.length} nombre(s) con caracteres cirílicos — importados tal cual, sin corregir`);
    flagsCirilicos.forEach((n) => console.warn(`  - ${n}`));
  }

  report.exit_code = errors.length === 0 ? 0 : 1;
  writeJson(reportPath, report);

  console.log(`[import-ejercicios] OK: ${records.length} registros -> ${payloadPath}`);
  console.log(`[import-ejercicios] OK: manifest (${manifest.length}) -> ${manifestPath}`);
  console.log(`[import-ejercicios] OK: report -> ${reportPath}`);
  if (errors.length > 0) {
    for (const err of errors) console.error(`[import-ejercicios] ERROR estructural: ${err}`);
    process.exit(1);
  }
  console.log(`[import-ejercicios] Exit 0 (renombres: ${renombres.length}, flags cirílicos: ${flagsCirilicos.length})`);
}

main();
