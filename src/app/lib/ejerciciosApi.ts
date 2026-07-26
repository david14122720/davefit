import { insforge } from '../../lib/insforge';

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

export async function getEjercicios(): Promise<Ejercicio[]> {
    const { data, error } = await insforge.database
        .from('ejercicios')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function createEjercicio(ejercicio: Partial<Ejercicio>): Promise<Ejercicio> {
    const { data, error } = await insforge.database
        .from('ejercicios')
        .insert([ejercicio])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateEjercicio(id: string, ejercicio: Partial<Ejercicio>): Promise<Ejercicio> {
    const { data, error } = await insforge.database
        .from('ejercicios')
        .update(ejercicio)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteEjercicio(id: string): Promise<void> {
    const { data: ejercicio, error: fetchError } = await insforge.database
        .from('ejercicios')
        .select('imagen_url, video_url')
        .eq('id', id)
        .maybeSingle();

    if (fetchError) throw fetchError;

    const deleteFile = async (url: string | undefined) => {
        if (!url) return;

        const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
        if (match && match[1]) {
            const path = decodeURIComponent(match[1]);
            try {
                await insforge.storage.from('ejercicios').remove(path);
            } catch (e) {
                console.error('[AdminApi] Error borrando archivo:', e);
            }
        }
    };

    if (ejercicio) {
        await deleteFile(ejercicio.imagen_url);
        await deleteFile(ejercicio.video_url);
    }

    const { error } = await insforge.database
        .from('ejercicios')
        .delete()
        .eq('id', id);
    if (error) throw error;
}
