import type { APIRoute } from 'astro';
import { insforge } from '../../lib/insforge';

export const GET: APIRoute = async () => {
    try {
        // Obtener conteos reales
        const [exercisesResult, usersResult, suggestionsResult] = await Promise.all([
            insforge.database.from('ejercicios').select('id', { count: 'exact', head: true }),
            insforge.database.from('perfiles').select('id', { count: 'exact', head: true }),
            insforge.database.from('suggestions').select('rating')
        ]);

        const totalExercises = exercisesResult.count || 0;
        const totalUsers = usersResult.count || 0;
        
        // Calcular rating promedio de todas las sugerencias
        const ratings = suggestionsResult.data?.map(s => s.rating || 0).filter(r => r > 0) || [];
        const totalReviews = ratings.length;
        const avgRating = totalReviews > 0 
            ? ratings.reduce((a, b) => a + b, 0) / totalReviews 
            : 0;

        return new Response(JSON.stringify({
            exercises: totalExercises,
            users: totalUsers,
            rating: parseFloat(avgRating.toFixed(2)),
            reviews: totalReviews
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300, s-maxage=600' // Cache 5 min client, 10 min CDN
            }
        });
    } catch (e: any) {
        console.error('Error getting stats:', e);
        
        // Fallback a valores por defecto
        return new Response(JSON.stringify({
            exercises: 0,
            users: 0,
            rating: 0,
            reviews: 0
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};