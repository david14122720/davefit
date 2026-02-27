import { createClient } from '@insforge/sdk';

const insforgeUrl = import.meta.env.PUBLIC_INSFORGE_URL;
const insforgeAnonKey = import.meta.env.PUBLIC_INSFORGE_ANON_KEY;

export const insforge = createClient({
    baseUrl: insforgeUrl,
    anonKey: insforgeAnonKey
});

export function getInsforgeClient(token?: string) {
    if (!token) return insforge;
    return createClient({
        baseUrl: insforgeUrl,
        anonKey: insforgeAnonKey,
        headers: { Authorization: `Bearer ${token}` }
    });
}
