import React from 'react';
import { useAuth } from '../context/AuthContext';
import { insforge } from '../../lib/insforge';

export default function RoutinesPage() {
    const { accessToken } = useAuth();
    const [rutinas, setRutinas] = React.useState<any[]>([]);
    const [loaded, setLoaded] = React.useState(false);
    const [filter, setFilter] = React.useState('todos');

    React.useEffect(() => {
        if (!accessToken) return;
        const load = async () => {
            const { data } = await insforge.database.from('rutinas').select('*').order('created_at', { ascending: false });
            setRutinas(data || []);
            setLoaded(true);
        };
        load();
    }, [accessToken]);

    const filtered = filter === 'todos' ? rutinas : rutinas.filter(r => r.nivel === filter);

    if (!loaded) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Mis <span className="text-orange-500">Rutinas</span></h1>
                    <p className="text-gray-500 text-sm">{rutinas.length} rutinas disponibles</p>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {['todos', 'principiante', 'intermedio', 'avanzado'].map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-bold flex-shrink-0 transition-all capitalize ${filter === f ? 'bg-orange-500 text-black' : 'bg-[#141414] text-gray-400 hover:text-white border border-white/5'}`}>
                        {f === 'todos' ? '🏋️ Todos' : f}
                    </button>
                ))}
            </div>

            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filtered.map((r: any) => (
                        <div key={r.id} className="bg-[#141414] rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1">
                            <div className="h-32 sm:h-40 bg-gradient-to-br from-orange-500/20 to-orange-400/5 flex items-center justify-center">
                                <span className="text-5xl sm:text-6xl">🏋️</span>
                            </div>
                            <div className="p-4 sm:p-5">
                                <h3 className="font-bold text-white text-base sm:text-lg mb-1 line-clamp-1">{r.nombre}</h3>
                                {r.descripcion && <p className="text-gray-500 text-xs sm:text-sm line-clamp-2 mb-3">{r.descripcion}</p>}
                                <div className="flex gap-2 flex-wrap">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${r.nivel === 'principiante' ? 'bg-green-500/10 text-green-400 border-green-500/20' : r.nivel === 'intermedio' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {r.nivel}
                                    </span>
                                    <span className="px-2 py-1 bg-white/5 rounded-full text-xs text-gray-400 border border-white/5">{r.duracion_estimada || 30} min</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-[#141414] rounded-2xl border border-white/5">
                    <div className="text-6xl mb-4">🏋️</div>
                    <h3 className="text-xl font-bold text-white mb-2">No hay rutinas</h3>
                    <p className="text-gray-400 text-sm">Las rutinas aparecerán aquí cuando estén disponibles.</p>
                </div>
            )}
        </div>
    );
}
