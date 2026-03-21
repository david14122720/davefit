import React from 'react';
import { useAuth } from '../context/AuthContext';
import { insforge } from '../../lib/insforge';

export default function HistoryPage() {
    const { accessToken } = useAuth();
    const [historial, setHistorial] = React.useState<any[]>([]);
    const [loaded, setLoaded] = React.useState(false);

    React.useEffect(() => {
        if (!accessToken) return;
        const load = async () => {
            const { data } = await insforge.database.from('historial_entrenamientos').select('*').order('fecha', { ascending: false });
            setHistorial(data || []);
            setLoaded(true);
        };
        load();
    }, [accessToken]);

    const totalMinutos = historial.reduce((acc, h) => acc + (h.duracion_minutos || 0), 0);
    const totalCalorias = historial.reduce((acc, h) => acc + (h.calorias_quemadas || 0), 0);

    if (!loaded) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Historial de <span className="text-orange-500">Entrenamientos</span></h1>
                <p className="text-gray-500 text-sm mt-1">{historial.length} entrenamientos registrados</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-[#141414] p-4 sm:p-6 rounded-2xl border border-white/5 text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-orange-500">{historial.length}</p>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Sesiones</p>
                </div>
                <div className="bg-[#141414] p-4 sm:p-6 rounded-2xl border border-white/5 text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-yellow-500">{totalMinutos}</p>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Minutos</p>
                </div>
                <div className="bg-[#141414] p-4 sm:p-6 rounded-2xl border border-white/5 text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-red-500">{totalCalorias}</p>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Calorías</p>
                </div>
            </div>

            {historial.length > 0 ? (
                <div className="space-y-3">
                    {historial.map((entry: any) => (
                        <div key={entry.id} className="bg-[#141414] border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center justify-between hover:border-white/10 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <div>
                                    <p className="font-bold text-white">
                                        {new Date(entry.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </p>
                                    <div className="flex gap-3 mt-1">
                                        <span className="text-xs text-gray-500">{entry.duracion_minutos || 0} min</span>
                                        <span className="text-xs text-gray-500">{entry.calorias_quemadas || 0} kcal</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-[#141414] border border-white/5 rounded-2xl p-12 text-center">
                    <div className="text-6xl mb-4">📅</div>
                    <h3 className="text-xl font-bold text-white mb-2">Sin historial</h3>
                    <p className="text-gray-400 text-sm">Completa tu primer entrenamiento para empezar a registrar tu progreso.</p>
                </div>
            )}
        </div>
    );
}
