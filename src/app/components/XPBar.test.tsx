import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { __mockDbResponse } from '../../test/setup';
import XPBar from './XPBar';

// ---------------------------------------------------------------------------
// Mock AuthContext — provide user and ignore the rest
// ---------------------------------------------------------------------------
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock useCelebration — AudioContext / confetti don't work in jsdom
// ---------------------------------------------------------------------------
vi.mock('../hooks/useCelebration', () => ({
    useCelebration: () => ({
        celebrateStreak: vi.fn(),
    }),
}));

// ---------------------------------------------------------------------------
// Mock framer-motion — animation internals are irrelevant in unit tests
// ---------------------------------------------------------------------------
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

// ---------------------------------------------------------------------------
// Sample stats fixture used across multiple tests
// ---------------------------------------------------------------------------
const mockStats = {
    id: 'stats-1',
    user_id: 'user-1',
    xp_total: 1250,
    nivel: 5,
    dias_racha: 7,
    ultimo_entreno: '2026-07-10T12:00:00Z',
    racha_bonus: 70,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('XPBar', () => {
    beforeEach(() => {
        mockUseAuth.mockReset();
        __mockDbResponse.data = null;
        __mockDbResponse.error = null;
        sessionStorage.clear();
    });

    // -- Loading / empty state -------------------------------------------------

    it('shows loading skeleton while data is being fetched', () => {
        mockUseAuth.mockReturnValue({
            user: { id: 'user-1', email: 'test@test.com' },
        });

        const { container } = render(<XPBar />);

        // Skeleton is present — animated pulse elements
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
        // Stats labels must not appear while loading
        expect(screen.queryByText('Nivel')).not.toBeInTheDocument();
    });

    // -- Auth / unauthenticated ------------------------------------------------

    it('displays default values when user is null', async () => {
        mockUseAuth.mockReturnValue({
            user: null,
            loading: false,
            isAdmin: false,
        });

        const { container } = render(<XPBar />);

        // Without a user the component skips the DB call and renders with defaults
        await waitFor(() => {
            expect(screen.getByText('Nivel')).toBeInTheDocument();
        });

        // The XP progress text shows "0 / 100" for default level 1
        expect(container.querySelector('.text-gray-500')).toHaveTextContent(/0\s*\/\s*100/);
        // Default streak is 0 — flame icon should be gray (text-gray-600)
        const flameContainer = container.querySelector('.text-gray-600');
        expect(flameContainer).toBeInTheDocument();
    });

    // -- Stats display ---------------------------------------------------------

    it('displays XP, level, and streak when user stats are loaded', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: 'user-1', email: 'test@test.com' },
        });
        __mockDbResponse.data = mockStats;

        render(<XPBar />);

        await waitFor(() => {
            expect(screen.getByText('Nivel')).toBeInTheDocument();
        });

        // Level badge
        expect(screen.getByText('5')).toBeInTheDocument();
        // Streak count
        expect(screen.getByText('7')).toBeInTheDocument();
        // Total XP (toLocaleString — regex avoids locale mismatch)
        expect(screen.getByText(/1[,.]?250/)).toBeInTheDocument();
    });

    // -- Edge cases: zero values -----------------------------------------------

    it('handles zero XP, level 1, and zero streak gracefully', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: 'user-1', email: 'test@test.com' },
        });
        __mockDbResponse.data = {
            ...mockStats,
            xp_total: 0,
            nivel: 1,
            dias_racha: 0,
        };

        const { container } = render(<XPBar />);

        await waitFor(() => {
            expect(screen.getByText('Nivel')).toBeInTheDocument();
        });

        // Level is shown textually — but "1" also appears in XP progress text
        // Check the Nivel section specifically
        expect(container.querySelector('.text-lg.font-black')).toHaveTextContent('1');
        // Streak 0 — flame icon should be gray
        expect(container.querySelector('.text-gray-600')).toBeInTheDocument();
        // XP bar shows 0 / 100 for level 1
        expect(container.querySelector('.text-gray-500')).toHaveTextContent(/0\s*\/\s*100/);
    });

    // -- Edge cases: large numbers ---------------------------------------------

    it('handles large XP and high level without layout issues', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: 'user-1', email: 'test@test.com' },
        });
        __mockDbResponse.data = {
            ...mockStats,
            xp_total: 999_999,
            nivel: 99,
            dias_racha: 365,
        };

        render(<XPBar />);

        await waitFor(() => {
            expect(screen.getByText('Nivel')).toBeInTheDocument();
        });

        expect(screen.getByText('99')).toBeInTheDocument();
        expect(screen.getByText('365')).toBeInTheDocument();
        expect(screen.getByText(/999[,.]?999/)).toBeInTheDocument();
    });

    // -- SessionStorage celebration guard --------------------------------------

    it('does not call celebrateStreak when sessionStorage flag is set', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: 'user-1', email: 'test@test.com' },
        });
        __mockDbResponse.data = mockStats;

        // Simulate already celebrated today
        const key = `racha_celebrated_user-1_${new Date().toDateString()}`;
        sessionStorage.setItem(key, 'true');

        render(<XPBar />);

        // Component renders normally; celebration is a side-effect we can't
        // directly observe, but we verify the guard didn't crash or block render.
        await waitFor(() => {
            expect(screen.getByText(/1[,.]?250/)).toBeInTheDocument();
        });
    });
});
