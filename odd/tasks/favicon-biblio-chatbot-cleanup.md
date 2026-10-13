# Feature: favicon + biblio-compact + chatbot-analysis + deadcode-cleanup

## Objective
Fix blurry/small favicon at its root cause, compact Biblioteca top without losing info, analyze chatbot viability (read-only), remove proven-dead code in small verified batches, and validate with two judgment passes. No commits or pushes.

## Standing user rules
- Test base :7130 is backend context (verified); app under test = local `npm run dev`. If live state changed, re-diagnose, report, adapt.
- T2 is ANALYSIS ONLY: zero InsForge mutations (no tables/functions/keys/configs), zero project changes for it.
- T4: delete ONLY multi-signal proven-dead code; doubt → report. Never touch env/sensitive, configs, docs, openspec/odd/.atl, db/.
- Deps removal: REPORT only (lockfile risk).
- Fix policy: pass-1 problems → fix before cleanup; pass-2 deletion-caused problems → restore + notify.

## Recon (parent, 2026-10-08)
- Favicon root cause (strong suspect): `BaseLayout.astro:47` references ONLY `/davefitIMG.ico`, which `file` reports as Targa-garbage (92KB, "Map 32x26469"); real icons `favicon.ico` (PNG-in-ICO-clothing, 32px single size) and `favicon.svg` exist but are UNREFERENCED.
- Biblioteca: `src/app/pages/BibliotecaPage.tsx` (+test).

## Tasks
- [x] T1 — Favicon: confirm cause (bytes, declarations, padding, cache), fix at root (crisp SVG + raster fallbacks, correct links, identity kept), prove fresh-load bytes in browser; state cache caveat honestly.
- [x] T2 — Chatbot viability analysis (InsForge MCP metadata + docs + code; read-only). Deliverable = report section only.
- [x] T3 — Compact Biblioteca top (header + mindset banner + search/filters), all info kept, matrix 5 viewports, search/filters functional, px gained measured.
- [x] J1 — Judgment pass 1 over T1+T3 delta (dual blind judges; fix confirmed-severe before cleanup).
- [x] T4 — Dead-code removal in small batches (typecheck + vitest + dev smoke per batch; full prod build once at end).
- [x] J2 — Judgment pass 2 over T4 delta INCLUDING prod-build proof (restore + notify on deletion-caused issues).
- [ ] T5 — Final user report (6 sections requested).

## Scopes
- Implementer B (T1+T3): public/favicon.svg, public/favicon.ico, public/davefitIMG.ico (rewrite/delete with proof), NEW icon files inside public/ only, src/layouts/BaseLayout.astro (link tags only), src/app/pages/BibliotecaPage.tsx (+test conditional). Nothing else.
- Researcher A (T2): read-only everywhere; InsForge MCP read-only calls only (metadata, docs, list/get — NO run-raw-sql, NO creates/updates/deletes).
- Cleaner C (T4): delete-only within src/**, public/**, scripts/**, e2e/**; EXCLUDED: .env*, configs, package.json/lock, docs, openspec/, odd/, .atl/, db/, middleware/security/auth/gamification core (report-only if suspect).

## Acceptance criteria
- Favicon: fresh browser profile requests new bytes (200), correct declarations, sharp at 1x/2x; cache limitation stated if visual tab proof impossible.
- Biblioteca: all blocks present + functional, 0 h-overflow on 5 viewports, measured px gained.
- T4: every deletion multi-signal proven; typecheck no-new-errors; vitest green; prod build green at end.
- J1 + J2 terminal verdicts recorded with ledgers.

## Progress
- Route: delegated (research + writer parallel; cleanup after J1; judges per skill).
- Resume 2026-10-09: prior session cut mid-flight. Partial T1 state found in worktree (favicon.svg viewBox cropped, raster PNGs + apple-touch generated untracked, favicon.ico single-16px, BaseLayout still references corrupt davefitIMG.ico, no fresh-load proof). T2/T3/T4/J1/J2 pending. Relaunching A (T2) + B (T1+T3) in parallel.
- A done: T2 report delivered (no InsForge MCP in runtime, stated; :7130 unreachable from worker machine, classification unknown; docs-verified gateway/functions/pricing + code-verified no-AI-today; auth-gated edge-function recommendation; 2–4d MVP / 1–1.5wk full).
- B done: T1 5-link chain wired (BaseLayout:47-51), ICO multi-size 16+32, PNGs+180px regenerated from SVG, davefitIMG.ico left unreferenced; T3 top-block compact only; vitest Biblioteca 7 passed; tsc failures pre-existing only; Playwright fresh-profile 5 viewports pass, top 353→289px @1280 (64px gained); honest cache caveat (no visual tab proof); :7130 classified backend-only per .env but unreachable from machine → verified via local :4321 with fixtures.
- Parent spot-check: 5-link chain present, diff scoped to allowed surfaces (4 files + 3 new PNGs).
- J1 verdict: PASS with non-blocking follow-ups. Judge A: APPROVE narrative (5 links present, corrupt ico unreferenced, all files decodable, Biblioteca content preserved, tests green, tsc failures pre-existing). Judge B rows: JD-B-001 SUGGESTION (favicon.svg viewBox 19.4/14/89.2/110.9 aspect 0.804 non-square → letterboxed in square tab viewport; cosmetic only) carried as user-decision follow-up; JD-B-002 WARNING (davefitIMG.ico 92KB Targa-mislabeled, confirmed unreferenced, still shipped+tracked) → routed to T4 batch 1 with deletion proof. No fix round opened (no confirmed-severe); proceeding to cleanup per fix policy.
- T4 done (Cleaner C): DELETED public/davefitIMG.ico (3 signals re-verified: Targa bytes, zero refs, superseded by 5-link chain) + `calcularCaloriasObjetivo` in src/lib/nutrition.ts (-58 lines, zero call sites, sibling `caloriasObjetivo` type field unrelated). RESTORED: none. DOUBTED: scripts/create-admin.ts (hardcoded anon-key JWT + admin email/pass → report-only, needs rotation decision), getCurrentUserSafely (documented public helper), public/robots.txt (convention-served), others' pre-existing deletions (off-limits). VERIFICATION: tsc error set identical (13 pre-existing) after each batch; vitest 15 files/71 passed after each; dev smoke 200 + clean port free per batch; final `npm run build` green. Parent spot-check: ico gone + zero refs, nutrition refs gone.

## Next step
Launch A (T2 research) + B (T1+T3 writer) in parallel → spot-check → J1.

## J2 verdict (2026-10-09)
PASS — both judges APPROVE, no restoration. Judge A: both deletions verified safe, zero downstream impact. Judge B rows: JD-B-001 SUGGESTION (NutritionMetrics.caloriasObjetivo now producer-less, whole interface zero consumers → optional future cleanup, user decides); JD-B-002 WARNING (worktree mixes ~42 files from concurrent batches incl. .env.production:2 + Dockerfile:6 pointing PUBLIC_INSFORGE_URL at cleartext http://192.168.50.121:7130 — needs deliberate user confirmation it is intended for production; batches cannot be isolated via git since nothing is committed per user restriction). Read-only-unverifiable (judges cannot run builds): tsc-13-identical, vitest 15/71, smokes, build-green accepted on cleaner evidence + static support (zero-importer removal cannot add TS errors; all 5 favicon targets exist on disk; excision site coherent).
T5 report delivered in chat. Open user decisions: (1) square-viewBox polish JD-B-001(J1); (2) NutritionMetrics residue; (3) scripts/create-admin.ts hardcoded credentials → rotation + env move before any deletion; (4) confirm http backend URL in .env.production/Dockerfile intended for production; (5) visual tab proof pending aggressive favicon cache.
