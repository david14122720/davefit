# Design: Ejercicios Schema & Dataset Alignment

## Technical Approach

Coordinated catalog alignment (approach 1 from exploration, validated in proposal): migrate `ejercicios` to the 13-column dataset-ready schema via InsForge MCP, and in the same change remove `nivel`/`tipo_lugar` from the frontend contract. No form UI for the 3 new muscle columns yet (R1–R2, R6). Media mapping **A**: dataset `gif_url` → `imagen_url` — `<img>` animates GIFs, `WorkoutPracticePage` stays untouched; admin can swap to real video via existing `video_url` field (R4). Server API (`[...slug].ts`) is a body passthrough (`insert([body])`/`update(body)`) — zero server changes; the payload is controlled by the frontend.

## Architecture Decisions

| Decision | Option | Tradeoff | Decision |
|---|---|---|---|
| Column removal order | Explicit `DROP INDEX IF EXISTS` first | Idempotent; avoids ambiguity vs relying on auto-drop | **Explicit DROP INDEX IF EXISTS, then ALTER** |
| `text[]` defaults | `NULL DEFAULT '{}'` | Column stays nullable (R1) but inserts get `[]` — no null/array ambiguity in JS | **`NULL DEFAULT '{}'`** |
| Media mapping | A: `gif_url→imagen_url` / B: `gif_url→video_url` + `.gif` detection in player | A: zero player changes, `<img>` animates GIFs; B: player change, black-screen risk | **A** (spec R4) |
| `tipoLugarOptions` | Keep / remove | Verified orphan — only `AdminEjerciciosPage` imports it (grep) | **Remove**; `nivelColors` stays (yoga admin uses it) |
| Dead `Ejercicio` in `types/index.ts` | Remove / ignore | Unimported (grep), divergent (`tipo`, `animacion_url`) → trap | **Remove** (optional, safe) |
| `cuello` icon | 🦒 / 🧣 / 🦴 | Icon style is playful/body-part oriented | **`cuello: '🦒'`** (adjustable) |

## Data Flow

    AdminForm ──payload (no nivel/tipo_lugar)──▶ /api/admin/ejercicios (passthrough)
        ▶ PostgREST insert/update ▶ ejercicios (13 cols) ▶ list ▶ AdminEjerciciosPage/AdminRutinasPage picker
    Future import (out of scope) ▶ category→vocab map ▶ musculo_objetivo/musculos_primarios/secundarios

## Migration SQL (InsForge MCP — document only, NOT executed here)

```sql
DROP INDEX IF EXISTS idx_ejercicios_nivel;
ALTER TABLE ejercicios
  DROP COLUMN nivel,
  DROP COLUMN tipo_lugar,
  ADD COLUMN musculo_objetivo text,
  ADD COLUMN musculos_primarios text[] DEFAULT '{}',
  ADD COLUMN musculos_secundarios text[] DEFAULT '{}';
```

Post-ALTER verify: `get-table-schema` → 13 columns; no `nivel`/`tipo_lugar`/`idx_ejercicios_nivel`; `nombre` UNIQUE NOT NULL and `grupo_muscular` NOT NULL intact; RLS/triggers unchanged (reference no dropped column). Rollback (0 rows → lossless):

```sql
ALTER TABLE ejercicios
  ADD COLUMN nivel text NOT NULL,
  ADD COLUMN tipo_lugar text NOT NULL,
  DROP COLUMN musculo_objetivo,
  DROP COLUMN musculos_primarios,
  DROP COLUMN musculos_secundarios;
CREATE INDEX idx_ejercicios_nivel ON ejercicios (nivel);
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| DB `ejercicios` (InsForge MCP) | Modify | ALTER above — −2 cols +idx, +3 cols |
| `src/app/lib/ejerciciosApi.ts` | Modify | `Ejercicio` interface: −`nivel`/`tipo_lugar`, +3 optional muscle fields |
| `src/app/pages/AdminEjerciciosPage.tsx` | Modify | −`nivelOptions`; −form selects nivel (349-361)/tipo_lugar (363-375) + grid wrapper; −thead cols "Lugar"/"Nivel" (193-194); −tbody cells (221-228); −mobile nivel badge (269-271); −filter `e.nivel` (73); −payload keys (84-85, 111-112); import → `{ grupoIcons }` only; +`'cuello'` in `grupoMuscularOptions` (17); grupo select standalone full-width |
| `src/app/pages/AdminRutinasPage.tsx` | Modify | :574 `{grupo_muscular} • {nivel}` → `{grupo_muscular}` |
| `src/constants/fitness.ts` | Modify | +`cuello: '🦒'` in `grupoIcons`; −`tipoLugarOptions`; keep `nivelColors` |
| `src/types/index.ts` | Modify (optional) | Remove dead `Ejercicio` (59-70) — nothing imports it |
| `src/pages/api/admin/[...slug].ts` | — | No change (passthrough; DELETE storage regex skips external GIFs → safe no-op) |

## Interfaces / Contracts

```typescript
export interface Ejercicio {
  id: string; nombre: string; descripcion?: string;
  grupo_muscular: string;
  musculo_objetivo?: string | null;
  musculos_primarios?: string[] | null;
  musculos_secundarios?: string[] | null;
  imagen_url: string; video_url?: string; instrucciones?: string[];
  creado_por?: string; created_at: string; updated_at: string;
}
```

Vocabulary: pecho, espalda, piernas, brazo, hombros, core, cardio, **cuello**, full_body (manual-only, R6).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Compile (gate) | No `ejercicio.nivel`/`tipo_lugar` refs remain | `npm run typecheck` + `npm run build` (astro check) |
| Unit | Baseline comparison | `npx vitest run` BEFORE change (known config issue), re-run after — expect identical results (no test touches these fields) |
| Integration | Admin POST/PUT 200 | Manual post-deploy: create/edit exercise with catalog fields only |
| Schema | ALTER correctness | `get-table-schema` post-migration (13 cols, constraints intact) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary is introduced or modified. (Migration runs via MCP tool; the DELETE storage-regex path is existing, unchanged code.)

## Migration / Rollout

1. Baseline `npx vitest run` (record pre-existing failures).
2. Run SQL via InsForge MCP `run-raw-sql` → verify `get-table-schema`.
3. Apply frontend edits → `typecheck`/`build` → `vitest run`.
4. Commit (conventional) → push → Dokploy deploy.
5. Smoke: admin create/edit exercise → 200; `cuello` selectable; picker shows grupo only.
Known bounded window: between ALTER and deploy, old bundle sending `nivel` → PostgREST 400 (0 rows, manual actions only). Rollback: revert PR + rollback SQL above, both together (R5).

## Open Questions

- [ ] `cuello` icon choice (🦒 default; trivial to swap)
- [ ] Out of scope note: `Rutina`/`RutinaEjercicio` in `types/index.ts` also unimported — leave for later cleanup
