import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { insforge } from '../../lib/insforge';

export default function DashboardPage() {
    const { user, perfil, accessToken } = useAuth();
    const [historial, setHistorial] = React.useState<any[]>([]);
    const [rutinas, setRutinas] = React.useState<any[]>([]);
    const [ejercicios, setEjercicios] = React.useState<any[]>([]);
    const [loaded, setLoaded] = React.useState(false);

    const userName = perfil?.nombre_completo?.split(' ')[0] || user?.profile?.name?.split(' ')[0] || 'Usuario';

    const hora = new Date().getHours();
    let saludo = 'Buenos días';
    if (hora >= 12 && hora < 20) saludo = 'Buenas tardes';
    else if (hora >= 20) saludo = 'Buenas noches';

    React.useEffect(() => {
        if (!accessToken) return;
        const loadData = async () => {
            try {
                const [h, r, e] = await Promise.all([
                    insforge.database.from('historial_entrenamientos').select('*').order('fecha', { ascending: false }).limit(10),
                    insforge.database.from('rutinas').select('*').limit(5),
                    insforge.database.from('ejercicios').select('*').limit(5),
                ]);
                setHistorial(h.data || []);
                setRutinas(r.data || []);
                setEjercicios(e.data || []);
            } catch (e) {
                console.error('Error cargando dashboard:', e);
            } finally {
                setLoaded(true);
            }
        };
        loadData();
    }, [accessToken]);

    const totalEntrenamientos = historial.length;
    const totalMinutos = historial.reduce((acc, h) => acc + (h.duracion_minutos || 0), 0);
    const ultimoEntrenamiento = historial[0];
    const items = rutinas.length > 0 ? rutinas : ejercicios;

    if (!loaded) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                        {saludo}, {userName}
                    </h1>
                    <p className="text-gray-400">¿Listo para entrenar hoy?</p>
                </div>
                <Link
                    to="/rutinas"
                    className="w-full md:w-auto px-6 py-3 bg-orange-500 text-black font-bold rounded-xl shadow-[0_0_25px_rgba(249,115,22,0.4)] hover:shadow-[0_0_35px_rgba(249,115,22,0.6)] transition-all flex items-center justify-center gap-2 hover:bg-orange-400"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Entrenar Ahora
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
                {/* Objetivo */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/5 hover:border-orange-500/30 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Tu Objetivo</p>
                            <h3 className="text-xl sm:text-2xl font-bold text-white capitalize">
                                {String(perfil?.objetivo || '').replace('_', ' ') || 'Por definir'}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs font-medium mb-2">
                        <span className="text-orange-500">Nivel {perfil?.nivel || 'No definido'}</span>
                        <span className="text-gray-500 capitalize">{perfil?.preferencia_lugar || 'Casa'}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 w-3/4 transition-all duration-1000 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                    </div>
                </div>

                {/* Último Entrenamiento */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/5 hover:border-yellow-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Último Entreno</p>
                            <h3 className="text-xl sm:text-2xl font-bold text-white">
                                {ultimoEntrenamiento ? 'Completado' : 'Sin entrenos'}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                        </div>
                    </div>
                    {ultimoEntrenamiento ? (
                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-4">
                            <span>{ultimoEntrenamiento.duracion_minutos || 0} min</span>
                            <span>{ultimoEntrenamiento.calorias_quemadas || 0} kcal</span>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 mt-4">Comienza tu primer entrenamiento</p>
                    )}
                </div>

                {/* Total */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/5 hover:border-red-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Total Entrenos</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-xl sm:text-2xl font-bold text-white">{totalEntrenamientos}</h3>
                                <span className="text-gray-500 text-sm">sesiones</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-4">{totalMinutos} minutos totales</p>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Activity or Empty State */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-[#141414] border border-white/5">
                    {totalEntrenamientos > 0 ? (
                        <>
                            <h2 className="text-xl font-bold text-white mb-1">Actividad Semanal</h2>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-3xl font-bold text-white">{totalMinutos}</span>
                                <span className="text-orange-500 text-sm font-medium">minutos</span>
                            </div>
                            <div className="h-48 flex items-end justify-around gap-2">
                                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
                                    <div key={day} className="flex-1 flex flex-col items-center gap-2">
                                        <div
                                            className="w-full rounded-t-lg bg-gradient-to-t from-orange-500/20 to-orange-500/60 transition-all"
                                            style={{ height: `${Math.random() * 80 + 20}%` }}
                                        />
                                        <span className="text-xs text-gray-500">{day}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📊</div>
                            <h2 className="text-xl font-bold text-white mb-2">Sin actividad registrada</h2>
                            <p className="text-gray-400 mb-6">Completa tu primer entrenamiento para ver tu progreso aquí</p>
                            <Link to="/rutinas" className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-black font-bold rounded-lg hover:bg-orange-400 transition-colors">
                                Ver Rutinas
                            </Link>
                        </div>
                    )}
                </div>

                {/* Rutinas / Ejercicios */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">
                            {rutinas.length > 0 ? 'Rutinas' : 'Ejercicios'} Disponibles
                        </h2>
                        <Link
                            to={rutinas.length > 0 ? '/rutinas' : '/admin/ejercicios'}
                            className="text-sm text-orange-500 hover:text-orange-400 font-bold transition-colors"
                        >
                            Ver todas →
                        </Link>
                    </div>

                    {items.length > 0 ? (
                        <div className="space-y-3">
                            {items.slice(0, 3).map((item: any, i: number) => (
                                <div key={item.id} className="p-4 rounded-xl bg-[#141414] border border-white/5 hover:border-orange-500/30 transition-all cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center text-xl">
                                            {i === 0 ? '🔥' : i === 1 ? '💪' : '🧘'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-white group-hover:text-orange-500 transition-colors truncate">{item.nombre}</h4>
                                            <p className="text-xs text-gray-500 capitalize">{item.nivel} • {item.duracion_estimada || 30} min</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 rounded-2xl bg-[#141414] border border-white/5 text-center">
                            <div className="text-4xl mb-4">📋</div>
                            <p className="text-gray-400 mb-4">No hay contenido disponible</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Historial Reciente */}
            {historial.length > 0 && (
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">Historial Reciente</h2>
                        <Link to="/historial" className="text-sm text-orange-500 hover:text-orange-400 font-bold transition-colors">
                            Ver todo →
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {historial.slice(0, 3).map((entrada: any) => (
                            <div key={entrada.id} className="p-4 rounded-xl bg-[#141414] border border-white/5 hover:border-green-500/30 transition-all flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white truncate">
                                        {new Date(entrada.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </p>
                                    <p className="text-xs text-gray-500">{entrada.duracion_minutos || 0} min • {entrada.calorias_quemadas || 0} kcal</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
