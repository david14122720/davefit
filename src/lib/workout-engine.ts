import type { Database } from './types';

type Perfil = Database['public']['Tables']['perfiles']['Row'];

// Interfaces temporales hasta que se creen las tablas en la BD
interface Rutina {
    id: string;
    nombre: string;
    descripcion: string | null;
    nivel: 'principiante' | 'intermedio' | 'avanzado';
    tipo_lugar: 'casa' | 'gimnasio' | 'ambos';
    duracion_estimada: number | null;
    objetivo: string | null;
    creado_por: string | null;
    created_at: string;
    updated_at: string;
}

interface Historial {
    id: string;
    usuario_id: string;
    rutina_id: string | null;
    fecha: string;
    duracion_minutos: number | null;
    calorias_quemadas: number | null;
    sensacion: number | null; // 1-5
    notas: string | null;
    created_at: string;
}

interface WorkoutRecommendation {
    routine: Rutina;
    reason: string;
    adjustment?: string;
}

export class WorkoutEngine {

    /**
     * Analiza el objetivo del usuario y devuelve una estructura de prioridades
     */
    static analyzeUserGoal(profile: Perfil) {
        switch (profile.objetivo) {
            case 'mantener_forma':
                return { focus: ['cardio', 'full_body'], intensity: 'media' };
            case 'tonificar':
                return { focus: ['full_body', 'hiit', 'piernas'], intensity: 'alta' };
            case 'ganar_fuerza':
                return { focus: ['pecho', 'espalda', 'piernas', 'fuerza'], intensity: 'muy_alta' };
            default:
                return { focus: ['full_body'], intensity: 'baja' };
        }
    }

    /**
     * Detecta fatiga basada en el historial reciente
     */
    static detectFatigue(recentHistory: Historial[]): number {
        if (!recentHistory.length) return 0;

        // Si entrenó ayer y la sensación fue baja (1 o 2), hay fatiga
        const lastWorkout = recentHistory[0]; // Asumimos ordenado por fecha DESC
        const today = new Date();
        const lastDate = new Date(lastWorkout.fecha || '');
        const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

        if (diffDays === 0) return 10; // Ya entrenó hoy
        if (diffDays === 1 && (lastWorkout.sensacion || 3) <= 2) return 7; // Fatiga acumulada
        if (diffDays > 3) return -5; // Descansado / Necesita retomar

        return 0;
    }

    /**
     * Genera recomendaciones de rutinas
     */
    static recommendRoutines(
        profile: Perfil,
        availableRoutines: Rutina[],
        recentHistory: Historial[]
    ): WorkoutRecommendation[] {
        const priorities = this.analyzeUserGoal(profile);
        const fatigue = this.detectFatigue(recentHistory);

        // Filtrar por nivel y lugar
        let candidates = availableRoutines.filter(r =>
            (r.nivel === profile.nivel || r.nivel === 'principiante') && // Siempre permitir principiante
            (r.tipo_lugar === profile.preferencia_lugar || r.tipo_lugar === 'ambos' || profile.preferencia_lugar === 'ambos')
        );

        // Si hay mucha fatiga, recomendar algo suave
        if (fatigue > 5) {
            return candidates
                .filter(r => r.duracion_estimada && r.duracion_estimada < 30) // Rutinas cortas
                .map(r => ({
                    routine: r,
                    reason: "Detectamos fatiga reciente. Esta rutina es más ligera para recuperación activa.",
                    adjustment: "Reduce las cargas un 20%"
                }));
        }

        // Clasificar y ordenar por objetivo
        // Esto es simplificado, idealmente tendríamos tags en las rutinas
        return candidates.slice(0, 3).map(r => ({
            routine: r,
            reason: `Alineada con tu objetivo de ${profile.objetivo?.replace('_', ' ')}`,
            adjustment: undefined
        }));
    }
}
