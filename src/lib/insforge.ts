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

const ALLOWED_RPCS = new Set([
    'process_workout_completion',
]);

export const invokeRpc = async (functionName: string, payload: any = {}) => {
    if (!ALLOWED_RPCS.has(functionName)) {
        console.error(`[InsForge] RPC no permitida: "${functionName}"`);
        return { data: null, error: new Error(`RPC "${functionName}" no está en la lista blanca`) };
    }
    try {
        const tokenManager = (insforge.auth as any).tokenManager;
        const token = tokenManager?.getAccessToken() ?? null;

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
        
        if (response.status === 204) {
            return { data: null, error: null };
        }

        const data = await response.json();
        return { data, error: null };
    } catch (err: any) {
        return { data: null, error: err };
    }
};
