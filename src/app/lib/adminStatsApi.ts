import { insforge } from '../../lib/insforge';

export interface AdminStats {
    ejercicios: number;
    rutinas: number;
    yogaPosiciones: number;
    yogaRutinas: number;
}

export async function getStats(): Promise<AdminStats> {
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
}
