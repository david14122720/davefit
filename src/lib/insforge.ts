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
