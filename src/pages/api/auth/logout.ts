import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
    // Eliminar todas las cookies de sesión
    const cookieOpts = { path: '/' };

    cookies.delete('if-access-token', cookieOpts);
    cookies.delete('user_name', cookieOpts);
    cookies.delete('user_rol', cookieOpts);
    cookies.delete('user_avatar', cookieOpts);
    cookies.delete('user_profile_cache', cookieOpts);

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};

export const GET: APIRoute = async ({ redirect, cookies }) => {
    // También permitir GET para logout rápido via link
    const cookieOpts = { path: '/' };
    cookies.delete('if-access-token', cookieOpts);
    cookies.delete('user_name', cookieOpts);
    cookies.delete('user_rol', cookieOpts);
    cookies.delete('user_avatar', cookieOpts);

    return redirect('/login');
};
