# Project Context — DaveFit

> Bootstrap file created by SDD init (2026-10-08). Source of truth for project identity used by SDD phases.

## Identity

- **Workspace root**: `/home/david/Nextcloud2/Ubuntu/proyecto_Davefit` — single project, no monorepo (`package.json` has no `workspaces`; package name: `violet-velocity`).
- **Purpose**: DaveFit — intelligent training platform for students (landing + SPA + InsForge backend).

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Astro 7.1.4, SSR via `@astrojs/node` standalone |
| UI | React 19.2 SPA, React Router 7 (lazy-loaded routes under `/app/*`) |
| Styling | Tailwind CSS 4.3.3 (`@tailwindcss/vite`) — do not downgrade |
| Language | TypeScript 5.9, strict (`astro/tsconfigs/strict`) |
| Backend | InsForge (`@insforge/sdk`, Supabase-compatible) + Postgres |
| Forms | react-hook-form 7 + zod 3 |
| Animations/icons | framer-motion, lucide-react, sonner toasts |

## Commands

| Purpose | Command |
| --- | --- |
| Dev | `npm run dev` |
| Build (double astro build for CSP hashes) | `npm run build` |
| Unit tests | `npx vitest run` (`npm run test`) |
| Unit + coverage | `npm run test:coverage` |
| E2E tests | `npx playwright test` (no package.json script) |
| Lint | `npm run lint` (ESLint 10 flat config) |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) |
| Formatter | none configured |

No single workspace-level command covers unit + e2e → Strict TDD is `false`; run per-layer commands explicitly.

## Architecture Notes

- `/` → Astro landing/static; `/app/*` → catch-all shell `src/pages/[...slug].astro` rendering `App.tsx` (`client:only="react"`).
- Code splitting: `React.lazy` for every route; Vite `manualChunks` vendor split (react, insforge, framer, chart, icons).
- Roles: `usuario` / `admin` (admin panel routes behind `ProtectedRoute adminOnly`).
- Deployment: local Dokploy (server `192.168.101.133`), Dockerfile; SPA catch-all required to avoid 404s.

## Existing OpenSpec State (do not modify during init)

- `openspec/specs/`: `ejercicios-import`, `nutrition`, `workout-practice` (main specs).
- `openspec/changes/`: active — `ejercicios-schema-dataset`, `stitch-ui-overhaul`; `archive/` — 6 archived changes (complexity-reduction, hardening-fase3, ejercicios-import-script, ejercicios-import-carga, workout-practice-descripcion, hardening-seguridad).
- Init only added `openspec/config.yaml` and this file.

## Known Doc Drift (risk, out of scope for init)

- `CLAUDE.md` states Astro 5.x / Tailwind 3.4 / `src/pages/app/[...slug].astro`; reality is Astro 7.1.4 / Tailwind 4.3.3 / `src/pages/[...slug].astro`.
- `CLAUDE.md` progress/stories figures are stale; trust code over docs.
