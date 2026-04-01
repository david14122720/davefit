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

export interface YogaRutinaPosicion {
    id: string;
    rutina_id: string;
    posicion_id: string;
    orden: number;
    duracion_segundos?: number;
    created_at: string;
}

const adminApi = {
    async getEjercicios(): Promise<Ejercicio[]> {
        const { data, error } = await insforge.database
            .from('ejercicios')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async createEjercicio(ejercicio: Partial<Ejercicio>): Promise<Ejercicio> {
        const { data, error } = await insforge.database
            .from('ejercicios')
            .insert([ejercicio])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateEjercicio(id: string, ejercicio: Partial<Ejercicio>): Promise<Ejercicio> {
        const { data, error } = await insforge.database
            .from('ejercicios')
            .update(ejercicio)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteEjercicio(id: string): Promise<void> {
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
    },

    async getRutinas(): Promise<Rutina[]> {
        const { data, error } = await insforge.database
            .from('rutinas')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async createRutina(rutina: Partial<Rutina>): Promise<Rutina> {
        const { data, error } = await insforge.database
            .from('rutinas')
            .insert([rutina])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateRutina(id: string, rutina: Partial<Rutina>): Promise<Rutina> {
        const { data, error } = await insforge.database
            .from('rutinas')
            .update(rutina)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteRutina(id: string): Promise<void> {
        const { error } = await insforge.database
            .from('rutinas')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async saveRutinaConEjercicios(
        rutinaData: Partial<Rutina>, 
        ejercicios: Array<{ejercicio_id: string; series: number; repeticiones: string; descanso_segundos: number}>
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
    },

    async getRutinaEjercicios(rutinaId: string): Promise<RutinaEjercicio[]> {
        const { data, error } = await insforge.database
            .from('rutinas_ejercicios')
            .select('*')
            .eq('rutina_id', rutinaId)
            .order('orden', { ascending: true });
        if (error) throw error;
        return data || [];
    },


    async getYogaPosiciones(): Promise<YogaPosicion[]> {
        const { data, error } = await insforge.database
            .from('yoga_posiciones')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async createYogaPosicion(posicion: Partial<YogaPosicion>): Promise<YogaPosicion> {
        const { data, error } = await insforge.database
            .from('yoga_posiciones')
            .insert([posicion])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateYogaPosicion(id: string, posicion: Partial<YogaPosicion>): Promise<YogaPosicion> {
        const { data, error } = await insforge.database
            .from('yoga_posiciones')
            .update(posicion)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteYogaPosicion(id: string): Promise<void> {
        const { error } = await insforge.database
            .from('yoga_posiciones')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async getYogaRutinas(): Promise<YogaRutina[]> {
        const { data, error } = await insforge.database
            .from('yoga_rutinas')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async createYogaRutina(rutina: Partial<YogaRutina>): Promise<YogaRutina> {
        const { data, error } = await insforge.database
            .from('yoga_rutinas')
            .insert([rutina])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateYogaRutina(id: string, rutina: Partial<YogaRutina>): Promise<YogaRutina> {
        const { data, error } = await insforge.database
            .from('yoga_rutinas')
            .update(rutina)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteYogaRutina(id: string): Promise<void> {
        const { error } = await insforge.database
            .from('yoga_rutinas')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async getYogaRutinaPosiciones(rutinaId: string): Promise<YogaRutinaPosicion[]> {
        const { data, error } = await insforge.database
            .from('yoga_rutina_posiciones')
            .select('*')
            .eq('rutina_id', rutinaId)
            .order('orden', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async addPosicionToYogaRutina(item: Partial<YogaRutinaPosicion>): Promise<YogaRutinaPosicion> {
        const { data, error } = await insforge.database
            .from('yoga_rutina_posiciones')
            .insert([item])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async removePosicionFromYogaRutina(id: string): Promise<void> {
        const { error } = await insforge.database
            .from('yoga_rutina_posiciones')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async getStats() {
        const [ejercicios, rutinas, yogaPosiciones, yogaRutinas] = await Promise.all([
            insforge.database.from('ejercicios').select('id', { count: 'exact', head: true }),
            insforge.database.from('rutinas').select('id', { count: 'exact', head: true }),
            insforge.database.from('yoga_posiciones').select('id', { count: 'exact', head: true }),
            insforge.database.from('yoga_rutinas').select('id', { count: 'exact', head: true }),
        ]);
        return {
            ejercicios: ejercicios.count || 0,
            rutinas: rutinas.count || 0,
            yogaPosiciones: yogaPosiciones.count || 0,
            yogaRutinas: yogaRutinas.count || 0,
        };
    },
};

export default adminApi;
