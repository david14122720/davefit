// ================================================================
// Admin Stats API — Client-Side
// ================================================================
// Llama al endpoint del servidor (/api/admin/stats).
// El servidor verifica JWT + rol admin antes de cada operación.
// ================================================================

import { adminFetch } from './adminFetch';

export interface AdminStats {
    ejercicios: number;
    rutinas: number;
    yogaPosiciones: number;
    yogaRutinas: number;
}

export async function getStats(token: string): Promise<AdminStats> {
    return adminFetch<AdminStats>('/api/admin/stats', token);
}
