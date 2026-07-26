import { insforge } from '../../lib/insforge';
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

export async function getRutinas(): Promise<Rutina[]> {
    const { data, error } = await insforge.database
        .from('rutinas')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function createRutina(rutina: Partial<Rutina>): Promise<Rutina> {
    const { data, error } = await insforge.database
        .from('rutinas')
        .insert([rutina])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateRutina(id: string, rutina: Partial<Rutina>): Promise<Rutina> {
    const { data, error } = await insforge.database
        .from('rutinas')
        .update(rutina)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteRutina(id: string): Promise<void> {
    const { error } = await insforge.database
        .from('rutinas')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

export async function saveRutinaConEjercicios(
    rutinaData: Partial<Rutina>,
    ejercicios: Array<{ ejercicio_id: string; series: number; repeticiones: string; descanso_segundos: number }>
): Promise<Rutina> {
    let rutinaId: string;

    if (rutinaData.id) {
        const { data, error } = await insforge.database
            .from('rutinas')
            .update(rutinaData)
            .eq('id', rutinaData.id)
            .select()
            .single();
        if (error) throw error;
        rutinaId = data.id;

        await insforge.database.from('rutinas_ejercicios').delete().eq('rutina_id', rutinaId);
    } else {
        const { data, error } = await insforge.database
            .from('rutinas')
            .insert([rutinaData])
            .select()
            .single();
        if (error) throw error;
        rutinaId = data.id;
    }

    if (ejercicios.length > 0) {
        const ejerciciosData = ejercicios.map((e, index) => ({
            rutina_id: rutinaId,
            ejercicio_id: e.ejercicio_id,
            orden: index + 1,
            series: e.series,
            repeticiones: e.repeticiones,
            descanso_segundos: e.descanso_segundos,
        }));

        const { error } = await insforge.database
            .from('rutinas_ejercicios')
            .insert(ejerciciosData);
        if (error) throw error;
    }

    const { data } = await insforge.database
        .from('rutinas')
        .select('*')
        .eq('id', rutinaId)
        .single();
    return data;
}

export async function getRutinaEjercicios(rutinaId: string): Promise<RutinaEjercicio[]> {
    const { data, error } = await insforge.database
        .from('rutinas_ejercicios')
        .select('*')
        .eq('rutina_id', rutinaId)
        .order('orden', { ascending: true });
    if (error) throw error;
    return data || [];
}
