import { insforge, getInsforgeClient } from '../lib/insforge';

/**
 * Servicio Centralizado para Auth y Perfiles.
 * Mantiene la lógica limpia y reutilizable.
 */
export class AuthService {
    /**
     * Sincroniza la sesión del cliente con el servidor (cookies).
     */
    static async syncSession(accessToken: string, user: any) {
        try {
            const response = await fetch('/api/auth/set-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken, user })
            });
            return response.ok;
        } catch (e) {
            console.error('[AuthService] Error syncing session:', e);
            return false;
        }
    }

    /**
     * Obtiene el perfil del usuario desde la DB.
     */
    static async getUserProfile(accessToken: string, userId: string) {
        try {
            const client = getInsforgeClient(accessToken);
            const { data, error } = await client.database
                .from('perfiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (e) {
            console.error('[AuthService] Error getting user profile:', e);
            return null;
        }
    }
}
