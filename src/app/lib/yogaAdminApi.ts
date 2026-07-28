// ================================================================
// Yoga Admin API — Client-Side
// ================================================================
// Llama a los endpoints del servidor (/api/admin/yoga-*).
// El servidor verifica JWT + rol admin antes de cada operación.
// ================================================================

import { adminFetch } from './adminFetch';
import { createCrudApi } from './createCrudApi';

export interface YogaPosicion {
    id: string;
    nombre: string;
    nombre_sanscrito?: string;
    descripcion?: string;
    instrucciones?: string[];
    beneficios?: string[];
    imagen_url?: string;
    duracion_segundos_sugerida: number;
    nivel: string;
    created_at: string;
    updated_at: string;
}

export interface YogaRutina {
    id: string;
    nombre: string;
    descripcion?: string;
    nivel: string;
    objetivo: string;
    duracion_minutos: number;
    calorias_estimadas?: number;
    created_at: string;
    updated_at: string;
}

export interface YogaRutinaPosicion {
    id: string;
    rutina_id: string;
    posicion_id: string;
    orden: number;
    duracion_segundos?: number;
    created_at: string;
}

const posicionesCrud = createCrudApi<YogaPosicion>('/api/admin/yoga-posiciones');
const rutinasCrud = createCrudApi<YogaRutina>('/api/admin/yoga-rutinas');

export const { list: getYogaPosiciones, create: createYogaPosicion, update: updateYogaPosicion, del: deleteYogaPosicion } = posicionesCrud;
export const { list: getYogaRutinas, create: createYogaRutina, update: updateYogaRutina, del: deleteYogaRutina } = rutinasCrud;

export async function getYogaRutinaPosiciones(token: string, rutinaId: string): Promise<YogaRutinaPosicion[]> {
    return adminFetch<YogaRutinaPosicion[]>(`/api/admin/yoga-rutina-posiciones/${rutinaId}`, token);
}

export async function addPosicionToYogaRutina(token: string, item: Partial<YogaRutinaPosicion>): Promise<YogaRutinaPosicion> {
    return adminFetch<YogaRutinaPosicion>('/api/admin/yoga-rutina-posiciones', token, {
        method: 'POST',
        body: JSON.stringify(item),
    });
}

export async function removePosicionFromYogaRutina(token: string, id: string): Promise<void> {
    await adminFetch(`/api/admin/yoga-rutina-posiciones/${id}`, token, {
        method: 'DELETE',
    });
}
