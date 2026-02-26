import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ redirect }) => {
    // InsForge SDK will pick up the hash from the URL on the next page (Dashboard)
    // and sync it via the BaseLayout script.
    return redirect("/dashboard");
};
