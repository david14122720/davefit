import { insforge } from './insforge';

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
        const stats = await getOrCreateUserStats(userId);
        if (!stats) {
            return { success: false, calculation: { xp_ganado: 0, nivel_anterior: 1, nivel_nuevo: 1, subio_nivel: false, xp_para_siguiente_nivel: 100, xp_en_nivel_actual: 0 }, error: 'Error al obtener stats' };
        }

        const hoy = new Date();
        const hoyStr = hoy.toISOString().split('T')[0];
        const ultimoEntreno = stats.ultimo_entreno ? new Date(stats.ultimo_entreno).toISOString().split('T')[0] : null;

        let nuevoDiasRacha = stats.dias_racha;
        let nuevoRachaBonus = stats.racha_bonus;

        if (ultimoEntreno === hoyStr) {
            console.log('[Gamification] Ya entrenó hoy, no se modifica racha');
        } else if (ultimoEntreno) {
            const diffDias = Math.floor((hoy.getTime() - new Date(ultimoEntreno).getTime()) / (1000 * 60 * 60 * 24));
            if (diffDias === 1) {
                nuevoDiasRacha += 1;
                nuevoRachaBonus = calcularRachaBonus(nuevoDiasRacha);
            } else if (diffDias > 1) {
                nuevoDiasRacha = 1;
                nuevoRachaBonus = 20;
            }
        } else {
            nuevoDiasRacha = 1;
            nuevoRachaBonus = 20;
        }

        const xpGanado = calcularXpAlCompletarRutina(duracionMinutos, nuevoDiasRacha);
        // El objeto 'stats' inicial contiene la información necesaria (xp_total, nivel, etc)
        // No necesitamos volver a consultarlo de forma redundante.
        
        let nuevoNivel = stats.nivel || 1;
        let xpRestante = stats.xp_total + xpGanado;

        // Limpiar el XP acumulado en niveles anteriores para calcular el nivel nuevo correctamente
        let xpEnNivelActual = xpRestante;
        for (let n = 1; n < nuevoNivel; n++) {
            xpEnNivelActual -= calcularXpParaSiguienteNivel(n);
        }

        // Subir de nivel si excedemos el umbral
        while (xpEnNivelActual >= calcularXpParaSiguienteNivel(nuevoNivel)) {
            xpEnNivelActual -= calcularXpParaSiguienteNivel(nuevoNivel);
            nuevoNivel++;
        }

        const calculation: XpCalculation = {
            xp_ganado: xpGanado,
            nivel_anterior: stats.nivel || 1,
            nivel_nuevo: nuevoNivel,
            subio_nivel: nuevoNivel > (stats.nivel || 1),
            xp_para_siguiente_nivel: calcularXpParaSiguienteNivel(nuevoNivel),
            xp_en_nivel_actual: xpEnNivelActual,
        };

        const { error: updateError } = await insforge.database
            .from('user_stats')
            .update({
                xp_total: stats.xp_total + xpGanado,
                nivel: nuevoNivel,
                dias_racha: nuevoDiasRacha,
                ultimo_entreno: hoyStr,
                racha_bonus: nuevoRachaBonus,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        if (updateError) {
            console.error('[Gamification] Error updating stats:', updateError);
            return { success: false, calculation, error: updateError.message };
        }

        console.log(`[Gamification] XP awarded: ${xpGanado}, New level: ${nuevoNivel}, Streak: ${nuevoDiasRacha}`);
        return { success: true, calculation };

    } catch (e: any) {
        console.error('[Gamification] Exception:', e);
        return { success: false, calculation: { xp_ganado: 0, nivel_anterior: 1, nivel_nuevo: 1, subio_nivel: false, xp_para_siguiente_nivel: 100, xp_en_nivel_actual: 0 }, error: e.message };
    }
}
