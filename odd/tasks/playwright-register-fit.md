# Feature: playwright-100 + register-fit

## Objective
Leave Playwright fully working against the LOCAL dev server (`npm run dev`, localhost:4321), then compact the Register page so it fits small laptops and phones without losing identity, fields, or functionality. Backend at http://192.168.50.121:7130 is read-only context (separate LAN host, InsForge/Express — verified 2026-10-08). No commits or pushes.

## Standing user rules (do not renegotiate)
- Frontend under test: LOCAL dev server (`npm run dev`, http://localhost:4321). Start it yourself if not running; kill it when done (never kill servers you didn't start). Backend http://192.168.50.121:7130 is READ-ONLY context.
- Config files that contradict the address: REPORT ONLY, never edit.
- `.env*`, database, Dokploy: read-only. No real signup submissions (no backend writes).
- Install ONLY what Playwright strictly needs. Anything else: ask first (via parent report).
- Doubt that risks an error: STOP and report instead of assuming.

## Tasks
- [x] T1 — RESOLVED 2026-10-08: :7130 is the InsForge backend on separate host .121 (Express dashboard; DaveFit routes 404 there). Frontend base = local `npm run dev`. Proceed T2→.
- [x] T2 — DONE 2026-10-08: Playwright 1.58.2 + browsers 1208/1509/2248 via unzip workaround (extractor hangs on Ubuntu 26.04); webkit system deps missing (no passwordless sudo) → webkit not runnable. Suite: chromium + firefox 1pass/1fail each, same pre-existing stale assertion (`/Entrar/i` vs "Iniciar Sesión"), reported untouched.
- [x] T3 — PROOF GREEN 12/12 against local dev (load, render, interact, /register form).
- [x] T4 — RegisterPage.tsx compacted 52+/52- (spacing/text/padding harmony, identity kept, inputs text-base anti-zoom). Test file untouched.
- [x] T5 — Matrix 6/6 green (360x640 → 1920x1080), h-overflow 0, validation + wiring proven via aborted intercepted POST (zero backend writes). Vitest 6/6 (parent re-ran); typecheck 0 new in surfaces.
- [x] T6 — Server killed, artifacts cleaned, no commits. Diff on surfaces: RegisterPage.tsx only.

## Acceptance criteria
- `npx playwright test` (or equivalent proof) runs green against http://192.168.50.121:7130.
- Register usable head-to-toe on all six viewports; zero horizontal scroll; zero cut elements.
- No backend writes performed during verification; servers killed; repo has no generated junk.

## Checks applicable
- Test-first EXCEPTION (env fix + visual resize): proof test + screenshot matrix instead of RED/GREEN.
- Structural readback of every edited hunk; `git diff --stat`.

## Progress
- Route: delegated direct (diagnosis + multi-file verification exceed inline budget; single writer).

## Next step
Single bounded executor for T1→T6 with STOP-and-report gates; then parent report.
