// ================================================================
// Rutinas API — Client-Side
// ================================================================
// Llama a los endpoints del servidor (/api/admin/rutinas).
// El servidor verifica JWT + rol admin antes de cada operación.
// ================================================================

import { adminFetch } from './adminFetch';
import { createCrudApi } from './createCrudApi';
import type { Ejercicio } from './ejerciciosApi';

export interface Rutina {
    id: string;
    nombre: string;
    descripcion?: string;
    objetivo?: string;
    nivel?: string;
    duracion_estimada?: number;
    calorias_estimadas?: number;
    tipo_lugar?: string;
    imagen_cover_url?: string;
    es_publica: boolean;
    creado_por?: string;
    created_at: string;
    updated_at: string;
}

export interface RutinaEjercicio {
    id: string;
    rutina_id: string;
    ejercicio_id: string;
    orden: number;
    series?: number;
    repeticiones?: string;
    descanso_segundos?: number;
    ejercicio?: Ejercicio;
}

export interface RutinaConEjercicios extends Rutina {
    ejercicios?: RutinaEjercicio[];
}

const rutinasCrud = createCrudApi<Rutina>('/api/admin/rutinas');

export const { list: getRutinas, create: createRutina, update: updateRutina, del: deleteRutina } = rutinasCrud;

export async function saveRutinaConEjercicios(
    token: string,
    rutinaData: Partial<Rutina>,
    ejercicios: Array<{ ejercicio_id: string; series: number; repeticiones: string; descanso_segundos: number }>
): Promise<Rutina> {
    return adminFetch<Rutina>('/api/admin/rutinas-ejercicios', token, {
        method: 'POST',
        body: JSON.stringify({ rutina: rutinaData, ejercicios }),
    });
}

export async function getRutinaEjercicios(token: string, rutinaId: string): Promise<RutinaEjercicio[]> {
    return adminFetch<RutinaEjercicio[]>(`/api/admin/rutinas-ejercicios/${rutinaId}`, token);
}
