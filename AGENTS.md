---
description: Agent instructions for DaveFit (Astro + React fitness app)
globs: *
alwaysApply: true
---

# DaveFit - Agent Development Guide

Astro 5.x + React 19 fitness app with InsForge backend (PostgreSQL + Auth + Storage).

## Commands

```bash
# Dev / Build
npm run dev              # Start Astro dev server
npm run build            # Build for production (SSR)
npm run preview          # Preview production build

# Unit tests (Vitest + jsdom)
npx vitest run                    # Run all tests
npx vitest                        # Watch mode
npx vitest run src/lib/foo.test.ts # Single test file
npx vitest run -t "user"          # Tests matching pattern
npx vitest --ui                   # Vitest UI

# E2E tests (Playwright)
npx playwright test               # Run all E2E tests
npx playwright test --project chromium  # Single browser
npx playwright test -g "login"    # Test matching name
npx playwright show-report        # View HTML report
```

**Test patterns**: Unit `src/**/*.{test,spec}.{ts,tsx}` | E2E `e2e/**/*.{test,spec}.{ts}`
**Config**: `vitest.config.ts` (jsdom, `@testing-library/preact`) | `playwright.config.ts` (chromium/firefox/webkit)

## Code Style

### TypeScript
- Strict mode via `astro/tsconfigs/strict`
- Define interfaces for all data structures; avoid `any` except InsForge DB results
- JSX: `react-jsx` with `react` import source

### React Components
- Functional components; PascalCase names: `DashboardPage.tsx`
- Pages: `src/app/pages/` | Shared: `src/components/` | Context: `src/app/context/` | Hooks: `src/app/hooks/`

### Imports
```typescript
// 1. External libs
import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, User } from 'lucide-react';

// 2. Local modules (relative paths)
import { useAuth } from './context/AuthContext';
import { insforge } from '../../lib/insforge';
```

### Naming
- **Components**: PascalCase (`LoginPage`, `AppLayout`)
- **Functions/vars**: camelCase (`recordWorkoutCompletion`)
- **Interfaces/Types**: PascalCase (`User`, `UserStats`)
- **Files**: kebab-case for non-components (`auth-context.tsx`), PascalCase for components

### Error Handling
```typescript
export async function someOp(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await insforge.database.from('table').insert([{...}]);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    console.error('[Module] Exception:', e);
    return { success: false, error: e.message };
  }
}
```

### Forms
- Use `react-hook-form` + `zod` validation
- Schema with `z.object()`, infer types via `z.infer<typeof schema>`

### UI & Styling
- Tailwind CSS 3.4 only — **DO NOT upgrade to v4**
- Dark theme: `#0a0a0a` bg, accent: `orange-500`
- Icons: `lucide-react` | Animations: `framer-motion` | Toasts: `sonner` (dark theme)

### Console Logging
Prefix with context: `console.error('[Auth] Message:', error)`

## InsForge SDK

Use `fetch-docs` MCP tool for latest docs. Key patterns:
```typescript
import { insforge } from '../lib/insforge';

// Auth
const { data, error } = await insforge.auth.signInWithPassword({ email, password });

// DB — always destructure { data, error }; inserts use array format
const { data, error } = await insforge.database.from('table').select('*').eq('col', val).maybeSingle();
const { error } = await insforge.database.from('table').insert([{ col: 'val' }]);
```

## Env Vars

```
PUBLIC_INSFORGE_URL=https://insforge.tesh.online
PUBLIC_INSFORGE_ANON_KEY=your-anon-key
```
Access: `import.meta.env.PUBLIC_INSFORGE_URL`

## Project Structure

```
src/
├── app/                    # React SPA
│   ├── components/         # Shared React components
│   ├── context/            # React contexts (Auth, etc.)
│   ├── hooks/              # Custom React hooks
│   └── pages/              # Route pages
├── components/             # Astro components
├── layouts/                # Astro layouts
├── lib/                    # Business logic
│   ├── insforge.ts         # SDK client singleton
│   ├── stats.ts            # Stats/leaderboard
│   ├── nutrition.ts        # Nutrition helpers
│   ├── gamification.ts     # Gamification logic
│   └── cropImage.ts        # Image cropping utils
├── pages/                  # Astro pages (.astro)
├── types/                  # TypeScript types
└── constants/              # App constants
```

## Common Patterns

```typescript
// Protected route
<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>

// Lazy loading
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Auth context
const { user, perfil, loading, signIn, signOut } = useAuth();
```
