# Feature: verify-local + acerca-de-polish

## Objective
Confirm DaveFit works locally via real Chromium testing, fix the dev-CSP scheme bug with the minimal change, and polish the Acerca de section with tasteful animations. No commits or pushes (user restriction overrides work-unit commits).

## Problem / why
Real-browser sweep (2026-10-08) proved: dev CSP hardcodes `https://` for the InsForge host while local `.env` uses `http://`, so 100% of InsForge traffic is CSP-blocked in dev. Acerca de has a +24px horizontal overflow at 390px and no motion design.

## Scope (authorized)
- Fix: `src/lib/csp.ts` (preserve configured URL scheme; PROD output must stay byte-identical), plus `src/lib/csp.test.ts` ONLY if assertions encode the old behavior.
- Polish: `src/app/pages/AcercaDePage.tsx` only (animations via existing framer-motion/Tailwind; no global CSS edits; fix overflow circle ~line 229).
- Forbidden: `.env*`, database, Dokploy, `playwright.config.ts`, auth forms/toast copy, all other pages, any git upload op.

## Tasks
- [x] T1 — Real-browser verification sweep (Chromium, routes, interactions, responsive). Evidence: /tmp/opencode/davefit-verify/ (39 files).
- [x] T2 — Minimal CSP scheme fix + `npx vitest run src/lib/csp.test.ts` + typecheck green. DONE 2026-10-08: csp 5/5 green (parent re-ran), PROD https byte-identical, typecheck partial (13 pre-existing errors outside surfaces).
- [x] T3 — Acerca de polish (identity-preserving, transform/opacity only, `prefers-reduced-motion`, 390px overflow-free) + screenshot proof (390 + 1440). DONE 2026-10-08: hOverflow 0 both widths, console clean, reduced-motion verified. Also fixed pre-existing TS2741 (desc→description) in-file.
- [x] T4 — Judgment day over modified tree. DONE 2026-10-08: dual blind judges, 0 confirmed severe, 2 info suggestions, no fix round. Ledger: odd/tasks/acerca-de-verify-polish.judgment.md. JUDGMENT: APPROVED ✅.
- [ ] T5 — Final user report (tested / fixed / pending-decision / unverified).

## Acceptance criteria
- Dev CSP allows the configured backend scheme; PROD header unchanged.
- `/acerca-de`: zero console errors, no h-overflow at 390px, animations fluid + reduced-motion respected.
- `npx vitest run src/lib/csp.test.ts` green; no new console errors on touched pages.

## Checks applicable
- `npx vitest run src/lib/csp.test.ts` (csp.test.ts exists), `npm run typecheck`, Chromium screenshots of `/acerca-de`.
- Structural readback of every edited hunk (docs-only N/A — code changed).
- Test-first policy: EXCEPTION — T2 is a bugfix with existing test coverage (run tests after fix, extend only if behavior uncovered); T3 is visual (screenshot proof instead of RED/GREEN).

## Progress
- T1 done 2026-10-08: boot clean (~14.9s), guards redirect correctly, defects cataloged (CSP scheme, AcercaDe overflow, e2e rev mismatch, toast copy, a11y) — only the first two authorized for fix.
- Route: delegated direct (mapping + write triggers fired; test evidence ~large, 2 files to write).

## Next step
T2+T3 via one bounded writer, then T4 judgment day.
