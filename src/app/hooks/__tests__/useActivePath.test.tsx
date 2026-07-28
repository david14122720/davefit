import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useActivePath } from '../useActivePath';

describe('useActivePath', () => {
  it('returns true for exact path match', () => {
    const { result } = renderHook(() => useActivePath(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/dashboard']}>{children}</MemoryRouter>
      ),
    });
    expect(result.current('/dashboard')).toBe(true);
  });

  it('returns true for nested path prefix', () => {
    const { result } = renderHook(() => useActivePath(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/admin/ejercicios']}>{children}</MemoryRouter>
      ),
    });
    expect(result.current('/admin')).toBe(true);
  });

  it('returns false for non-matching path', () => {
    const { result } = renderHook(() => useActivePath(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/biblioteca']}>{children}</MemoryRouter>
      ),
    });
    expect(result.current('/dashboard')).toBe(false);
  });

  it('returns false for partial substring match without slash boundary', () => {
    const { result } = renderHook(() => useActivePath(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/dashboard-edit']}>{children}</MemoryRouter>
      ),
    });
    // '/dashboard' should NOT match '/dashboard-edit' because 'startsWith(path + '/')'
    // protects against this: '/dashboard-edit' does not start with '/dashboard/'
    expect(result.current('/dashboard')).toBe(false);
  });

  it('handles root path', () => {
    const { result } = renderHook(() => useActivePath(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
      ),
    });
    expect(result.current('/')).toBe(true);
    expect(result.current('/other')).toBe(false);
  });
});
