// ============================================================
// ESLint flat config — Hardening Fase 3
// Pragmático: aplica quality gate sin fricción innecesaria.
// ============================================================

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  // ─── Ignorar artefactos ──────────────────────────────
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.astro/**',
      'coverage/**',
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
      'e2e/**',
      'scripts/**',
    ],
  },

  // ─── Reglas base JS ──────────────────────────────────
  js.configs.recommended,

  // ─── Reglas TypeScript ──────────────────────────────
  ...tseslint.configs.recommended,

  // ─── Reglas React (hooks + refresh) ──────────────────
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // React Hooks — reglas críticas de correctness
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // React Refresh — HMR seguro en Vite
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // TS: imports coherentes
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],

      // TS: no any implícito
      '@typescript-eslint/no-explicit-any': 'warn',

      // TS: unused solo en variables/argumentos reales (ignora `_` prefix)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Consola — permitir warn/error pero no log
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],

      // Igualdad estricta
      eqeqeq: ['error', 'always', { null: 'ignore' }],

      // typeof correcto
      'valid-typeof': 'error',
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // ─── Relajar en archivos de test ─────────────────────
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', 'src/test/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

  // ─── Astro env.d.ts: triple-slash reference es el patrón estándar
  {
    files: ['**/*.d.ts', 'src/env.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  }
);
