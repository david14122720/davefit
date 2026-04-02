import { createClient } from '@insforge/sdk';

const insforgeUrl = import.meta.env.PUBLIC_INSFORGE_URL;
const insforgeAnonKey = import.meta.env.PUBLIC_INSFORGE_ANON_KEY;

/**
 * Cliente InsForge singleton para toda la aplicación.
 * El SDK maneja la persistencia de la sesión y los tokens automáticamente.
 */
export const insforge = createClient({
    baseUrl: insforgeUrl,
    anonKey: insforgeAnonKey,
});

// Polyfill para llamar a PostgreSQL RPCs de forma nativa a través del REST API subyacente de InsForge/Supabase
export const invokeRpc = async (functionName: string, payload: any = {}) => {
    try {
        // Obtenemos el token del tokenManager interno del SDK
        const token = (insforge as any)._tokenManager?.accessToken || 
                      (insforge as any).tokenManager?.accessToken ||
                      (insforge as any).accessToken ||
                      null;
        
        const response = await fetch(`${insforgeUrl}/rest/v1/rpc/${functionName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': insforgeAnonKey,
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json();
            return { data: null, error };
        }
        
        // PostgREST puede devolver 204 No Content para RPCs que no retornan nada
        if (response.status === 204) {
            return { data: null, error: null };
        }

        const data = await response.json();
        return { data, error: null };
    } catch (err: any) {
        return { data: null, error: err };
    }
};
