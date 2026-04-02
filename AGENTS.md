---
description: Agent instructions for DaveFit (Astro + React fitness app)
globs: *
alwaysApply: true
---

# DaveFit - Agent Development Guide

This is an Astro + React hybrid fitness tracking application with InsForge backend.

## Project Overview

- **Framework**: Astro 5.x with React 19 integration
- **UI**: React SPA in `/src/app/` with Astro pages in `/src/pages/`
- **Styling**: Tailwind CSS 3.4 (NOT v4)
- **Backend**: InsForge SDK (PostgreSQL + Auth + Storage)
- **Testing**: Vitest with jsdom
- **Language**: TypeScript (strict mode)

---

## Build & Development Commands

```bash
# Development
npm run dev              # Start Astro dev server
npm run build            # Build for production (SSR)
npm run preview          # Preview production build

# Astro CLI
npm run astro -- --help # View Astro CLI options
```

### Running Tests

```bash
# Run all tests
npx vitest run

# Run tests in watch mode
npx vitest

# Run a single test file
npx vitest run src/lib/stats.test.ts

# Run tests matching a pattern
npx vitest run --grep "user"

# Run with UI
npx vitest --ui
```

**Test file pattern**: `src/**/*.{test,spec}.{ts,tsx}`

**Test setup**: Vitest configured in `vitest.config.ts` with jsdom environment.

---

## Code Style Guidelines

### TypeScript

- Use strict TypeScript; extends `astro/tsconfigs/strict`
- Define interfaces for all data structures
- Use `any` sparingly - prefer explicit types
- Database types from InsForge can use `any` for flexibility (see `src/lib/stats.ts`)

### React Components

- Use functional components with arrow functions or `function` keyword
- Name components with PascalCase: `DashboardPage.tsx`
- Page components go in `src/app/pages/`
- Shared components in `src/components/`
- Context providers in `src/app/context/`

### Imports

```typescript
// External libraries
import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, User } from 'lucide-react';

// Local modules
import { insforge } from '../../lib/insforge';
import { recordWorkoutCompletion } from '../../lib/stats';
```

### Naming Conventions

- **Components**: PascalCase (`LoginPage`, `AppLayout`)
- **Functions**: camelCase (`recordWorkoutCompletion`, `getUserStats`)
- **Interfaces**: PascalCase (`User`, `Perfil`, `UserStats`)
- **Files**: kebab-case for non-components (`auth-context.tsx`, `stats.ts`)
- **CSS Classes**: Tailwind utility classes

### Error Handling Pattern

```typescript
// Database operations - return { success: boolean, error?: string }
export async function someOperation(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await insforge.database.from('table').insert([{...}]);
    if (error) {
      console.error('[Module] Error message:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    console.error('[Module] Exception:', e);
    return { success: false, error: e.message };
  }
}
```

### Form Handling

- Use `react-hook-form` with `zod` for validation
- Schema: Define with `z.object()` and infer types with `z.infer`
- Example from `LoginPage.tsx`:

```typescript
const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type LoginFormValues = z.infer<typeof loginSchema>;
```

### UI Components & Styling

- Use Tailwind CSS with custom colors (dark theme: `#0a0a0a`, accent: orange-500)
- Icons from `lucide-react`
- Animations from `framer-motion`
- Toasts from `sonner` with `theme="dark"`
- Use CSS blur effects for backgrounds: `blur-[120px]`

### Console Logging

Prefix logs with context: `console.error('[Auth] Message:', error)`

### Database (InsForge)

- Always use `{ data, error }` destructuring from SDK
- Use `.maybeSingle()` when row may not exist
- Database inserts require array format: `[{...}]`
- SDK returns `{data, error}` structure for all operations

---

## Environment Variables

Required in `.env`:
```
PUBLIC_INSFORGE_URL=https://insforge.tesh.online
PUBLIC_INSFORGE_ANON_KEY=your-anon-key
```

Access in code:
```typescript
const url = import.meta.env.PUBLIC_INSFORGE_URL;
```

---

## Project Structure

```
src/
├── app/                    # React SPA
│   ├── components/         # Shared React components
│   ├── context/           # React contexts (Auth, Yoga, etc.)
│   └── pages/             # Route pages (LoginPage, DashboardPage, etc.)
├── components/           # Astro components (if any)
├── layouts/              # Astro layouts
├── lib/                  # Business logic & InsForge SDK
│   ├── insforge.ts       # SDK client singleton
│   ├── stats.ts          # Stats/leaderboard functions
│   └── nutrition.ts      # Nutrition helpers
├── pages/                # Astro pages (.astro files)
├── types/                # TypeScript type definitions
└── constants/            # App constants
```

---

## Common Patterns

### Protected Routes
```typescript
<ProtectedRoute>
  <AppLayout><DashboardPage /></AppLayout>
</ProtectedRoute>
```

### Lazy Loading
```typescript
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
```

### Auth Context
```typescript
const { user, perfil, loading, signIn, signOut } = useAuth();
```

---

## Tailwind CSS 3.4 Important

**DO NOT upgrade to Tailwind v4**. Lock to 3.4:
```json
"tailwindcss": "^3.4.19"
```

---

## Testing Guidelines

- Tests go in `src/` matching `{name}.test.ts` or `{name}.spec.ts`
- Use `@testing-library/react` or `@testing-library/preact`
- Vitest setup file: `src/test/setup.ts` (create if needed)
- Mock InsForge SDK for tests

---

## InsForge SDK Usage

Before writing InsForge integration code, use the `fetch-docs` MCP tool to get the latest documentation. Key patterns:

```typescript
import { insforge } from '../lib/insforge';

// Auth
const { data, error } = await insforge.auth.signInWithPassword({ email, password });
const { error } = await insforge.auth.signOut();

// Database
const { data, error } = await insforge.database
  .from('table')
  .select('*')
  .eq('column', value)
  .maybeSingle();

// Insert (array format)
const { error } = await insforge.database
  .from('table')
  .insert([{ column: 'value' }]);
```
