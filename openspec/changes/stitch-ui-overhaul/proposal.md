# Proposal: Stitch UI Overhaul

## Intent

Match all DaveFit UI to Stitch "FitDave Landing Page" design — green primary (#13ec5b), dark glassmorphism, Inter, 8px roundness. Restore profile metrics (BMR, TDEE, IMC, avatar crop) lost when `/perfil` became a `/dashboard` redirect.

## Scope

**In**: Tailwind tokens (green swap, surfaces, radius). Auth split-screen (branding + form panels). Biblioteca card grid + chips + "Momento de Mentalidad". Dashboard (greeting, streaks, tabs, charts, next workout). NutritionPage from scratch (recipe catalog, filters, tips). Profile restore into Dashboard tab. Stitch nav labels/icons. About page restyle.

**Out**: Mobile/responsive, new backend features, i18n, admin panel.

## Capabilities

- **New**: `nutrition` — full recipe catalog page with search, filters, tips, subscription CTA
- **Modified**: None (pure UI refactor)

## Approach

4 phases across 3-4 chained PRs (400-line budget):

1. **Foundation** — Tailwind tokens (green), auth split-screen
2. **Main pages** — Biblioteca redesign, Dashboard overhaul
3. **Nutrition + Profile** — New NutritionPage, restore ProfilePage metrics into Dashboard
4. **Nav + Polish** — Stitch nav, About page, final consistency pass

## Affected Areas

| Area | Impact |
|------|--------|
| `tailwind.config.mjs` | Colors (orange→green), radius, glass tokens |
| `src/app/pages/LoginPage.tsx` | Split-screen redesign |
| `src/app/pages/RegisterPage.tsx` | Match split-screen |
| `src/app/pages/BibliotecaPage.tsx` | Stitch card grid + filters |
| `src/app/pages/DashboardPage.tsx` | Greeting, streaks, tabs, charts |
| `src/app/pages/ProfilePage.tsx` | Restore metrics into Dashboard |
| `src/app/pages/NutritionPage.tsx` | New (recipe catalog) |
| `src/app/components/AppLayout.tsx` | Stitch nav items |
| `src/app/App.tsx` | Fix `/perfil`, add Nutrición route |
| `src/pages/index.astro` | About page restyle |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Profile restore breaks Dashboard tabs | Medium | Merge incrementally, keep old code in parallel |
| Green swap misses orange references | High | Global search for `orange-500`, `#ff6b00`, `#e65100` |
| NutritionPage from scratch | Medium | Reuse BibliotecaPage fetching/card patterns |
| Cross-PR merge conflicts | Medium | Stack PRs targeting same base |

## Rollback Plan

Revert `tailwind.config.mjs` to old colors. `git checkout main -- <file>` per page. No data loss.

## Success Criteria

- [ ] Pages match Stitch screens pixel-for-pixel (desktop)
- [ ] Profile metrics (BMR, TDEE, IMC) display in Dashboard
- [ ] `/perfil` accessible (not redirecting)
- [ ] Nutrición shows recipes (not redirect)
- [ ] No orange remnants — green #13ec5b everywhere
- [ ] Nav matches Stitch labels/icons
