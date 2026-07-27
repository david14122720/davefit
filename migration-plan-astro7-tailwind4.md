# Migration Plan: Astro 5 → 7 + Tailwind CSS 3 → 4

## Current State

| Dependency | Current | Target | Risk |
|---|---|---|---|
| `astro` | ^5.18.1 | ^7.x | **High** — 2 major jumps |
| `@astrojs/node` | ^9.5.5 | compat with Astro 7 | Medium |
| `@astrojs/react` | ^4.4.2 | compat with Astro 7 | Medium |
| `@astrojs/sitemap` | ^3.7.2 | compat with Astro 7 | Low |
| `@astrojs/tailwind` | ^6.0.2 | **REMOVE** (replaced) | — |
| `tailwindcss` | ^3.4.19 | ^4.x | **High** — complete rewrite |
| `vite` | (bundled with Astro 5) | Vite 8 (Astro 7) | Medium |
| `vitest` | ^3.0.7 | must be Vite 8-compatible | Medium |

## Codebase Analysis (No-Breaking-Change Findings)

These features are **NOT used**, which simplifies the migration significantly:

- ❌ `Astro.glob()` — not used anywhere
- ❌ Content collections (`src/content/`) — not used
- ❌ Experimental flags — none in astro.config.mjs
- ❌ Container API (`getContainerRenderer`) — not used
- ❌ `@astrojs/db` — not used
- ❌ `dark:` variants — not used (app is dark-only)
- ❌ PostCSS custom config — none exists
- ❌ Custom Tailwind plugins — none used
- ❌ View transition animations — only `transition:animate="none"`

## Astro 5 → 6 Breaking Changes

| Change | Impact on DaveFit | Action |
|---|---|---|
| `Astro.glob()` removed | **None** — not used | Nothing to do |
| Legacy content collections removed | **None** — not used | Nothing to do |
| Vite 6 | Build may differ slightly | Test build after upgrade |

## Astro 6 → 7 Breaking Changes

| Change | Impact on DaveFit | Action |
|---|---|---|
| **Rust compiler (only compiler)** | **Medium** — stricter HTML validation | Check all `.astro` files for unclosed tags, invalid HTML |
| Vite 8 | **Medium** — vitest compat | Check vitest version supports Vite 8 |
| `compressHTML` default → `'jsx'` | **Low** — cosmetic whitespace diff | Add `compressHTML: true` to preserve current behavior |
| `astro:transitions` internals removed | **Low** — only import `ClientRouter` | Verify `ClientRouter` still works (it's public API) |
| Experimental flags stabilized | **None** — no experimental flags used | Nothing to do |
| Logger/cache config moved | **None** — no custom logger/cache | Nothing to do |

## Tailwind CSS 3 → 4 Breaking Changes

| Change | Impact on DaveFit | Action |
|---|---|---|
| No `tailwind.config.mjs` | **Major** — theme moves to CSS `@theme` | Convert all custom colors/fonts/animations |
| No `@tailwind` directives | **Medium** — use `@import "tailwindcss"` | Update `global.css` |
| `@astrojs/tailwind` → `@tailwindcss/vite` | **Medium** — config change | Remove integration, add Vite plugin |
| Opacity modifiers (`/20`, `/30`) | **Low** — still supported | Verify behavior |
| Color format: oklch preferred | **Low** — hex still works in `@theme` | Keep hex values, no change needed |
| `@apply` still works | **None** | Keep existing `@apply` directives |
| `dark:` variants | **None** — not used | Nothing to do |

## Custom Theme Tokens to Migrate

These Tailwind v3 custom colors from `tailwind.config.mjs` need to be converted to CSS `@theme`:

### Colors to Define in `@theme`

```
--color-primary: #ff6b00;
--color-primary-light: #ff8533;
--color-primary-dark: #e65100;
--color-primary-hover: #e65a00;
--color-primary-on: #ffffff;
--color-primary-glow: rgba(255, 107, 0, 0.3);
--color-background-dark: #0a0a0a;
--color-background-darker: #050505;
--color-background-card: #141414;
--color-background-surface: #1e1e1e;
--color-background-elevated: #252525;
--color-background-glass: rgba(20, 20, 20, 0.8);
--color-surface: #1e1e1e;
--color-surface-dark: #141414;
--color-on-surface: #f8ddd2;
--color-on-surface-variant: #9ca3af;
--color-text-muted: #9ca3af;
```

### Animations to Define

```
--animate-fade-in: fadeIn 0.5s ease-out forwards;
--animate-slide-in: slideIn 0.4s ease-out forwards;
--animate-slide-up: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
--animate-float: float 6s ease-in-out infinite;
--animate-pulse-slow: pulse 3s ease-in-out infinite;
```

### Keyframes (native CSS)

Move keyframes from tailwind.config.mjs to CSS `@keyframes` in global.css.

### Font Family

```
--font-sans: Inter, system-ui, sans-serif;
```

## Migration Order (Recommended)

### Option A: Incremental (Safer)

```
Step 1: Tailwind 3→4 only (keep Astro 5)  →  test
Step 2: Astro 5→6                         →  test
Step 3: Astro 6→7                         →  test
```

**Pros**: Isolate failures. Each step testable independently.
**Cons**: More intermediate commits. `@tailwindcss/vite` must work with Astro 5's Vite version.

### Option B: Big Bang (Faster)

```
Step 1: Remove @astrojs/tailwind + tailwind.config.mjs
Step 2: Install tailwindcss@4 @tailwindcss/vite
Step 3: Update astro + all @astrojs/* to v7
Step 4: Convert global.css to @import + @theme
Step 5: Fix any Rust compiler HTML errors
Step 6: Test everything
```

**Pros**: Single migration, less thrash.
**Cons**: If something breaks, harder to isolate.

## Detailed Steps (Option A — Recommended)

### Phase 1: Tailwind CSS 3 → 4

1. **Run upgrade tool** (in a branch):
   ```bash
   npx @tailwindcss/upgrade
   ```
   This handles:
   - Package.json updates (removes v3, adds v4 packages)
   - Converts `tailwind.config.mjs` content to CSS `@theme`
   - Replaces `@tailwind` directives with `@import "tailwindcss"`
   - Updates class names that changed

2. **Verify & fix**:
   - Remove `@astrojs/tailwind` from `astro.config.mjs`
   - Add `@tailwindcss/vite` plugin:
     ```js
     import tailwindcss from '@tailwindcss/vite';
     // in vite.plugins: [tailwindcss()]
     ```
   - Check opacity modifiers work: `bg-primary/20`
   - Check `text-on-surface-variant/80` etc.
   - Fix any `@apply` issues

3. **Test**: `npm run build` + `npx vitest run`

### Phase 2: Astro 5 → 6

1. **Run upgrade tool**:
   ```bash
   npx @astrojs/upgrade
   ```
   This bumps `astro`, `@astrojs/node`, `@astrojs/react`, `@astrojs/sitemap`

2. **Test**: `npm run build` + smoke test pages

### Phase 3: Astro 6 → 7

1. **Run upgrade tool** again:
   ```bash
   npx @astrojs/upgrade
   ```

2. **Check HTML validity** (Rust compiler is strict now):
   ```bash
   npm run build  # will fail on unclosed tags
   ```

3. **Add `compressHTML: true`** to `astro.config.mjs` if whitespace matters.

4. **Test**: `npm run build` + `npx vitest run` + manual smoke test

## Risk Summary

| Risk | Likelihood | Mitigation |
|---|---|---|
| Tailwind v4 upgrade tool misses some classes | Medium | Manual review of changed files |
| Rust compiler catches pre-existing HTML issues | High | Add `--loglevel debug` to find exact issues |
| `@tailwindcss/vite` compatibility with Vite version | Low | Use latest version |
| Vitest compat with Vite 8 | Medium | May need `vitest@^4.x` |
| React component changes from Tailwind theme change | Low | Mostly CSS, no component logic changes |

## Recommended Approach

**Go with Option A (Incremental)**. The migration is complex enough that isolating failures is worth the extra steps. Plan for ~2-3 hours of work.

Start with Phase 1 (Tailwind only), then proceed to Phase 2 and 3.

---

*Document generated: 2026-07-27*
