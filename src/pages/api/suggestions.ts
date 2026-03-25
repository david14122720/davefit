import type { APIRoute } from 'astro';
import { insforge } from '../../lib/insforge';

export const GET: APIRoute = async ({ url }) => {
    try {
        const limit = parseInt(url.searchParams.get('limit') || '10');
        
        const { data, error } = await insforge.database
            .from('suggestions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ suggestions: data }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { message, rating } = body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return new Response(JSON.stringify({ error: 'Mensaje requerido' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (message.length > 1000) {
            return new Response(JSON.stringify({ error: 'Mensaje demasiado largo (máx 1000 caracteres)' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const ratingValue = typeof rating === 'number' ? Math.min(5, Math.max(0, rating)) : 0;

        const { data, error } = await insforge.database
            .from('suggestions')
            .insert([{ 
                message: message.trim(),
                rating: ratingValue,
                is_approved: true
            }])
            .select()
            .single();

        if (error) {
            console.error('Error guardando sugerencia:', error);
            return new Response(JSON.stringify({ error: 'Error al guardar la sugerencia' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ 
            success: true, 
            suggestion: data,
            message: '¡Gracias por tu sugerencia! La revisaremos pronto.'
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        console.error('Exception:', e);
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};