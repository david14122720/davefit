// ================================================================
// Ejercicios API — Client-Side
// ================================================================
// Llama a los endpoints del servidor (/api/admin/ejercicios).
// El servidor verifica JWT + rol admin antes de cada operación.
// ================================================================

import { createCrudApi } from './createCrudApi';

export interface Ejercicio {
    id: string;
    nombre: string;
    descripcion?: string;
    grupo_muscular: string;
    nivel: string;
    tipo_lugar: string;
    imagen_url: string;
    video_url?: string;
    instrucciones?: string[];
    creado_por?: string;
    created_at: string;
    updated_at: string;
}

export type NuevoEjercicio = Omit<Ejercicio, 'id' | 'created_at' | 'updated_at'>;

const crud = createCrudApi<Ejercicio>('/api/admin/ejercicios');

export const { list: getEjercicios, create: createEjercicio, update: updateEjercicio, del: deleteEjercicio } = crud;
