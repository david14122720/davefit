import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

// ---------------------------------------------------------------------------
// Injectable mock response for InsForge DB queries.
// Tests import this and set data/error before calling code that hits the DB.
// The mock builder reads from this object at resolution time (thenable,
// maybeSingle, single) so late binding works correctly.
//
// Stored on globalThis because vi.mock factories are hoisted above module
// declarations, so closure capture of a local variable doesn't work.
// globalThis is the shared mutable store that both the mock factory and
// test files can read/write.
// ---------------------------------------------------------------------------
(globalThis as any).__mockDbResponse = { data: null, error: null };

export const __mockDbResponse: { data: any; error: any } = (globalThis as any).__mockDbResponse;

// Mock InsForge SDK with full query builder chaining.
// The builder is thenable so `await chain` works for query patterns
// that don't end with an explicit terminal method.
vi.mock('../lib/insforge', () => {
  const getResponse = () => (globalThis as any).__mockDbResponse || { data: null, error: null };

  const createQueryBuilder = () => {
    // Late binding: resolve current mock data at call time.
    // Reads from globalThis so tests can set __mockDbResponse.data/error
    // between calling code and the query resolution.
    const resolveData = () => ({
      data: getResponse().data,
      error: getResponse().error,
    });

    const builder: Record<string, any> = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      in: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      range: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      update: vi.fn(() => builder),
      delete: vi.fn(() => builder),
      // Terminal methods — resolve at call time
      single: vi.fn(() => Promise.resolve(resolveData())),
      maybeSingle: vi.fn(() => Promise.resolve(resolveData())),
      // Thenable — resolves at await time
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(resolveData()).then(onFulfilled, onRejected),
    };
    return builder;
  };

  return {
    insforge: {
      auth: {
        getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
      database: {
        from: vi.fn(() => createQueryBuilder()),
      },
    },
    invokeRpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
});
