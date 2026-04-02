import { insforge, invokeRpc } from './insforge';

export interface UserStats {
    id: string;
    user_id: string;
    xp_total: number;
    nivel: number;
    dias_racha: number;
    ultimo_entreno: string | null;
    racha_bonus: number;
    created_at: string;
    updated_at: string;
}

export interface XpCalculation {
    xp_ganado: number;
    nivel_anterior: number;
    nivel_nuevo: number;
    subio_nivel: boolean;
    xp_para_siguiente_nivel: number;
    xp_en_nivel_actual: number;
}

function calcularXpParaSiguienteNivel(nivel: number): number {
    return Math.floor(100 * Math.pow(nivel, 1.5));
}

function calcularRachaBonus(diasRacha: number): number {
    if (diasRacha <= 0) return 0;
    if (diasRacha <= 2) return 20;
    if (diasRacha <= 4) return 30;
    return 70;
}

export async function getUserStats(userId: string): Promise<UserStats | null> {
    const { data, error } = await insforge.database
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('[Gamification] Error getting user stats:', error);
        return null;
    }

    return data;
}

export async function createUserStats(userId: string): Promise<UserStats | null> {
    const { data, error } = await insforge.database
        .from('user_stats')
        .insert([{ user_id: userId }])
        .select()
        .single();

    if (error) {
        console.error('[Gamification] Error creating user stats:', error);
        return null;
    }

    return data;
}

export async function getOrCreateUserStats(userId: string): Promise<UserStats> {
    let stats = await getUserStats(userId);
    if (!stats) {
        stats = await createUserStats(userId);
    }
    return stats!;
}

export function calcularXpAlCompletarRutina(duracionMinutos: number, rachaActual: number): number {
    const baseXp = Math.min(duracionMinutos * 5, 200);
    const bonusRacha = calcularRachaBonus(rachaActual);
    return baseXp + bonusRacha;
}

/**
 * Calcula calorías estimadas quemadas
 * @param duracionMinutos 
 * @param tipo 'ejercicio' (Gym/Hiit) | 'yoga' | 'meditacion'
 * @returns calorias estimadas
 */
export function calcularCalorias(duracionMinutos: number, tipo: 'ejercicio' | 'yoga' | 'meditacion'): number {
    const metByTipo = {
        ejercicio: 7.0, // Mezcla de pesas y cardio
        yoga: 3.0,      // Yoga moderado
        meditacion: 1.2 // Reposo activo
    };
    
    // Fórmula simplificada: (MET * 3.5 * peso_kg / 200) * duracion_min
    // Asumimos un peso promedio de 70kg si no tenemos el dato a mano en la función
    const pesoPromedio = 70;
    const calorias = (metByTipo[tipo] * 3.5 * pesoPromedio / 200) * duracionMinutos;
    
    return Math.round(calorias);
}

export function calculateXpProgress(stats: UserStats): XpCalculation {
    const xpActual = stats.xp_total;
    let nivel = stats.nivel;
    let xpAcumuladoEnNivelesAnteriores = 0;

    for (let n = 1; n < nivel; n++) {
        xpAcumuladoEnNivelesAnteriores += calcularXpParaSiguienteNivel(n);
    }

    const xpEnNivelActual = xpActual - xpAcumuladoEnNivelesAnteriores;
    const xpParaSiguiente = calcularXpParaSiguienteNivel(nivel);
    const nivelAnterior = nivel;

    while (xpEnNivelActual >= xpParaSiguiente) {
        nivel++;
        xpAcumuladoEnNivelesAnteriores += xpParaSiguiente;
    }

    return {
        xp_ganado: 0,
        nivel_anterior: nivelAnterior,
        nivel_nuevo: nivel,
        subio_nivel: nivel > nivelAnterior,
        xp_para_siguiente_nivel: calcularXpParaSiguienteNivel(nivel),
        xp_en_nivel_actual: nivel === nivelAnterior ? xpEnNivelActual : xpEnNivelActual - (xpActual - xpAcumuladoEnNivelesAnteriores),
    };
}

export async function processWorkoutCompletion(
    userId: string,
    duracionMinutos: number,
    tipoRutina: 'ejercicio' | 'yoga' | 'meditacion'
): Promise<{ success: boolean; calculation: XpCalculation; error?: string }> {
    try {
        // En lugar de calcular el XP en el cliente (lo cual era una vulnerabilidad),
        // delegamos todo a la rutina segura de la base de datos (RPC).
        const { data, error } = await invokeRpc('process_workout_completion', {
            req_user_id: userId,
            duracion_minutos: duracionMinutos
        });

        if (error) {
            console.error('[Gamification] Error en RPC:', error);
            return { 
                success: false, 
                calculation: { xp_ganado: 0, nivel_anterior: 1, nivel_nuevo: 1, subio_nivel: false, xp_para_siguiente_nivel: 100, xp_en_nivel_actual: 0 }, 
                error: error.message 
            };
        }

        console.log(`[Gamification] XP procesado de forma segura en servidor.`);
        
        return { 
            success: true, 
            calculation: {
                xp_ganado: data.xp_ganado,
                nivel_anterior: data.nivel_anterior,
                nivel_nuevo: data.nivel_nuevo,
                subio_nivel: data.subio_nivel,
                xp_para_siguiente_nivel: data.xp_para_siguiente_nivel,
                xp_en_nivel_actual: data.xp_en_nivel_actual
            }
        };

    } catch (e: any) {
        console.error('[Gamification] Exception procesando RPC:', e);
        return { 
            success: false, 
            calculation: { xp_ganado: 0, nivel_anterior: 1, nivel_nuevo: 1, subio_nivel: false, xp_para_siguiente_nivel: 100, xp_en_nivel_actual: 0 }, 
            error: e.message 
        };
    }
}
