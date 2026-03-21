import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { insforge } from '../../lib/insforge';

const grupoIcons: Record<string, string> = {
    pecho: '🎯', espalda: '🔙', piernas: '🦵', brazo: '💪',
    hombros: '🏋️', core: '🔥', cardio: '🏃', full_body: '⚡',
};

export default function ExercisesAdminPage() {
    const { accessToken } = useAuth();
    const [ejercicios, setEjercicios] = React.useState<any[]>([]);
    const [loaded, setLoaded] = React.useState(false);

    const load = async () => {
        if (!accessToken) return;
        const { data } = await insforge.database.from('ejercicios').select('*').order('created_at', { ascending: false });
        setEjercicios(data || []);
        setLoaded(true);
    };

    React.useEffect(() => { load(); }, [accessToken]);

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este ejercicio?')) return;
        // No need for accessToken check if insforge is globally initialized or handles auth internally.
        const { error } = await insforge.database.from('ejercicios').delete().eq('id', id);
        if (error) {
            alert('Error al eliminar: ' + error.message);
        } else {
            setEjercicios(prev => prev.filter(e => e.id !== id));
        }
    };

    if (!loaded) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Link to="/admin" className="text-gray-500 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Gestionar <span className="text-orange-500">Ejercicios</span></h1>
                    </div>
                    <p className="text-gray-500 text-sm">{ejercicios.length} ejercicios en la biblioteca</p>
                </div>
            </div>

            {ejercicios.length > 0 ? (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block rounded-2xl overflow-hidden border border-white/5">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[#0d0d0d]">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ejercicio</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Grupo</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nivel</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 bg-[#141414]">
                                {ejercicios.map((e: any) => (
                                    <tr key={e.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                {e.imagen_url ? (
                                                    <img src={e.imagen_url} alt={e.nombre} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-xl border border-orange-500/20">
                                                        {grupoIcons[e.grupo_muscular] || '💪'}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-white">{e.nombre}</p>
                                                    {e.descripcion && <p className="text-xs text-gray-500 line-clamp-1 max-w-[300px]">{e.descripcion}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-gray-300 border border-white/5 capitalize">{e.grupo_muscular || '—'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${e.nivel === 'principiante' ? 'bg-green-500/10 text-green-400 border-green-500/20' : e.nivel === 'intermedio' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                {e.nivel || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleDelete(e.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Eliminar">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {ejercicios.map((e: any) => (
                            <div key={e.id} className="bg-[#141414] rounded-2xl border border-white/5 p-4 flex items-center gap-4">
                                {e.imagen_url ? (
                                    <img src={e.imagen_url} alt={e.nombre} className="w-14 h-14 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                                ) : (
                                    <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center text-2xl border border-orange-500/20 flex-shrink-0">
                                        {grupoIcons[e.grupo_muscular] || '💪'}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-white truncate">{e.nombre}</p>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-xs text-gray-500 capitalize">{e.grupo_muscular}</span>
                                        <span className="text-xs text-gray-600">•</span>
                                        <span className={`text-xs capitalize ${e.nivel === 'principiante' ? 'text-green-400' : e.nivel === 'intermedio' ? 'text-yellow-400' : 'text-red-400'}`}>{e.nivel}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(e.id)} className="p-2 text-gray-500 hover:text-red-400 flex-shrink-0" title="Eliminar">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="text-center py-16 bg-[#141414] rounded-2xl border border-white/5">
                    <div className="text-6xl mb-4">🏋️</div>
                    <h3 className="text-xl font-bold text-white mb-2">No hay ejercicios</h3>
                    <p className="text-gray-400 mb-6 text-sm">Crea tu primer ejercicio para empezar.</p>
                </div>
            )}
        </div>
    );
}
