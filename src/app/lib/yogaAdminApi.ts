import { insforge } from '../../lib/insforge';

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

export async function getYogaPosiciones(): Promise<YogaPosicion[]> {
    const { data, error } = await insforge.database
        .from('yoga_posiciones')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function createYogaPosicion(posicion: Partial<YogaPosicion>): Promise<YogaPosicion> {
    const { data, error } = await insforge.database
        .from('yoga_posiciones')
        .insert([posicion])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateYogaPosicion(id: string, posicion: Partial<YogaPosicion>): Promise<YogaPosicion> {
    const { data, error } = await insforge.database
        .from('yoga_posiciones')
        .update(posicion)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteYogaPosicion(id: string): Promise<void> {
    const { error } = await insforge.database
        .from('yoga_posiciones')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

export async function getYogaRutinas(): Promise<YogaRutina[]> {
    const { data, error } = await insforge.database
        .from('yoga_rutinas')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function createYogaRutina(rutina: Partial<YogaRutina>): Promise<YogaRutina> {
    const { data, error } = await insforge.database
        .from('yoga_rutinas')
        .insert([rutina])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateYogaRutina(id: string, rutina: Partial<YogaRutina>): Promise<YogaRutina> {
    const { data, error } = await insforge.database
        .from('yoga_rutinas')
        .update(rutina)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteYogaRutina(id: string): Promise<void> {
    const { error } = await insforge.database
        .from('yoga_rutinas')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

export async function getYogaRutinaPosiciones(rutinaId: string): Promise<YogaRutinaPosicion[]> {
    const { data, error } = await insforge.database
        .from('yoga_rutina_posiciones')
        .select('*')
        .eq('rutina_id', rutinaId)
        .order('orden', { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function addPosicionToYogaRutina(item: Partial<YogaRutinaPosicion>): Promise<YogaRutinaPosicion> {
    const { data, error } = await insforge.database
        .from('yoga_rutina_posiciones')
        .insert([item])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function removePosicionFromYogaRutina(id: string): Promise<void> {
    const { error } = await insforge.database
        .from('yoga_rutina_posiciones')
        .delete()
        .eq('id', id);
    if (error) throw error;
}
