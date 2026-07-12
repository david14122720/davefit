import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
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

/**
 * Shared mutable response for test control of InsForge mock queries.
 * Tests can import this and set `__mockDbResponse.data` / `__mockDbResponse.error`
 * to control what database queries and invokeRpc return.
 */
export const __mockDbResponse = vi.hoisted(() => ({ data: null as any, error: null as any }));

// Mock InsForge SDK with full query builder chaining
vi.mock('../lib/insforge', () => {
  const createQueryBuilder = () => {
    const builder: Record<string, any> = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      in: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      range: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      single: vi.fn(() => Promise.resolve(__mockDbResponse)),
      maybeSingle: vi.fn(() => Promise.resolve(__mockDbResponse)),
      // Makes the builder thenable so `await chain` works for query patterns
      // that don't end with an explicit terminal method (e.g. gte().then)
      then: vi.fn((onFulfilled: any, onRejected: any) =>
        Promise.resolve(__mockDbResponse).then(onFulfilled, onRejected),
      ),
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
    invokeRpc: vi.fn(() => Promise.resolve(__mockDbResponse)),
  };
});
