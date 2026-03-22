import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { insforge } from '../../lib/insforge';
import { motion, type Variants } from 'framer-motion';
import { Play, TrendingUp, CalendarCheck, Activity, Target } from 'lucide-react';

export default function DashboardPage() {
    const { user, perfil, accessToken } = useAuth();
    const [historial, setHistorial] = React.useState<any[]>([]);
    const [rutinas, setRutinas] = React.useState<any[]>([]);
    const [ejercicios, setEjercicios] = React.useState<any[]>([]);
    const [loaded, setLoaded] = React.useState(false);

    const userName = perfil?.nombre_completo?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario';

    const saludo = useMemo(() => {
        const hora = new Date().getHours();
        if (hora >= 12 && hora < 20) return 'Buenas tardes';
        if (hora >= 20) return 'Buenas noches';
        return 'Buenos días';
    }, []);

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
    const totalMinutos = useMemo(() => historial.reduce((acc, h) => acc + (h.duracion_minutos || 0), 0), [historial]);
    const ultimoEntrenamiento = historial[0];
    const items = rutinas.length > 0 ? rutinas : ejercicios;

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants: Variants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    if (!loaded) {
        return (
            <div className="max-w-6xl mx-auto animate-pulse">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div className="w-64 h-10 bg-white/10 rounded-xl" />
                    <div className="w-40 h-12 bg-white/10 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
                    <div className="h-40 bg-white/5 rounded-2xl" />
                    <div className="h-40 bg-white/5 rounded-2xl" />
                    <div className="h-40 bg-white/5 rounded-2xl" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                    <div className="lg:col-span-2 h-72 bg-white/5 rounded-2xl" />
                    <div className="h-72 bg-white/5 rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <motion.div 
            className="max-w-6xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                        {saludo}, {userName}
                    </h1>
                    <p className="text-gray-400 font-medium">¿Listo para destruir tus metas de hoy?</p>
                </div>
                <Link
                    to="/rutinas"
                    className="w-full md:w-auto px-6 py-3.5 bg-orange-500 text-black font-extrabold tracking-wide uppercase rounded-xl shadow-[0_0_25px_rgba(249,115,22,0.4)] hover:shadow-[0_0_35px_rgba(249,115,22,0.6)] transition-all flex items-center justify-center gap-3 hover:bg-orange-400 group"
                >
                    <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
                    Entrenar Ahora
                </Link>
            </motion.div>

            {/* Stats Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
                {/* Objetivo */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#141414]/90 backdrop-blur-xl border border-white/5 hover:border-orange-500/30 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Tu Objetivo</p>
                            <h3 className="text-xl sm:text-2xl font-bold text-white capitalize">
                                {String(perfil?.objetivo || '').replace('_', ' ') || 'Por definir'}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
                            <Target className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex justify-between text-xs font-medium mb-2">
                        <span className="text-orange-500">Nivel {perfil?.nivel || 'No definido'}</span>
                        <span className="text-gray-500 capitalize">{perfil?.preferencia_lugar || 'Casa'}</span>
                    </div>
                    <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '75%' }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.5)]" 
                        />
                    </div>
                </div>

                {/* Último Entrenamiento */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#141414]/90 backdrop-blur-xl border border-white/5 hover:border-yellow-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Último Entreno</p>
                            <h3 className="text-xl sm:text-2xl font-bold text-white">
                                {ultimoEntrenamiento ? 'Completado' : 'Sin entrenos'}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
                            <CalendarCheck className="w-5 h-5" />
                        </div>
                    </div>
                    {ultimoEntrenamiento ? (
                        <div className="flex items-center gap-4 text-sm font-medium mt-4">
                            <span className="bg-white/5 px-3 py-1 rounded-full text-gray-300">{ultimoEntrenamiento.duracion_minutos || 0} min</span>
                            <span className="bg-white/5 px-3 py-1 rounded-full text-gray-300">{ultimoEntrenamiento.calorias_quemadas || 0} kcal</span>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 mt-4">Comienza tu primer entrenamiento.</p>
                    )}
                </div>

                {/* Total */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#141414]/90 backdrop-blur-xl border border-white/5 hover:border-red-500/30 transition-all cursor-default">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Actividad Total</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-bold text-white">{totalEntrenamientos}</h3>
                                <span className="text-gray-500 text-sm font-medium">sesiones</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                            <Activity className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-4"><span className="text-red-400 font-bold">{totalMinutos}</span> minutos invertidos en tu salud</p>
                </div>
            </motion.div>

            {/* Content Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Activity or Empty State */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-[#141414]/90 backdrop-blur-xl border border-white/5">
                    {totalEntrenamientos > 0 ? (
                        <>
                            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-orange-500"/> Frecuencia Semanal</h2>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-gray-400 text-sm">Has acumulado</span>
                                <span className="text-xl font-bold text-white bg-orange-500/10 px-2 py-1 rounded-lg text-orange-400">{totalMinutos} min</span>
                            </div>
                            <div className="h-48 flex items-end justify-around gap-2">
                                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
                                    <div key={day} className="flex-1 flex flex-col items-center gap-2">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${Math.random() * 80 + 20}%` }}
                                            transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                                            className="w-full rounded-t-lg bg-gradient-to-t from-orange-500/20 to-orange-500/80 shadow-[0_-5px_15px_rgba(249,115,22,0.1)]"
                                        />
                                        <span className="text-xs font-bold text-gray-500">{day}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📊</div>
                            <h2 className="text-xl font-bold text-white mb-2">Sin actividad registrada</h2>
                            <p className="text-gray-400 mb-6">Completa tu primer entrenamiento para ver tu gráfica aquí</p>
                            <Link to="/rutinas" className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 text-white font-bold rounded-lg hover:bg-white/10 transition-colors">
                                Explorar Rutinas
                            </Link>
                        </div>
                    )}
                </div>

                {/* Rutinas / Ejercicios */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">
                            {rutinas.length > 0 ? 'Rutinas' : 'Ejercicios'}
                        </h2>
                        <Link
                            to={rutinas.length > 0 ? '/rutinas' : '/admin/ejercicios'}
                            className="text-sm text-orange-500 hover:text-orange-400 font-bold transition-colors"
                        >
                            Ver todo →
                        </Link>
                    </div>

                    {items.length > 0 ? (
                        <div className="space-y-3">
                            {items.slice(0, 4).map((item: any, i: number) => (
                                <motion.div 
                                    key={item.id} 
                                    whileHover={{ scale: 1.02, x: 5 }}
                                    className="p-4 rounded-xl bg-[#141414]/90 backdrop-blur-xl border border-white/5 hover:border-orange-500/30 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-xl">
                                            {i === 0 ? '🔥' : i === 1 ? '💪' : '🧘'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-white group-hover:text-orange-500 transition-colors truncate">{item.nombre}</h4>
                                            <p className="text-xs text-gray-500 capitalize font-medium">{item.nivel} • {item.duracion_estimada || 30} min</p>
                                        </div>
                                        <div className="text-gray-600 group-hover:text-orange-500 opacity-0 group-hover:opacity-100 transition-all">
                                            →
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 rounded-2xl bg-[#141414]/90 backdrop-blur-xl border border-white/5 text-center">
                            <div className="text-4xl mb-4">📋</div>
                            <p className="text-gray-400 mb-4 text-sm">No hay contenido disponible</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Historial Reciente */}
            {historial.length > 0 && (
                <motion.div variants={itemVariants} className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">Últimas Sesiones</h2>
                        <Link to="/historial" className="text-sm text-orange-500 hover:text-orange-400 font-bold transition-colors">
                            Ver todo →
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {historial.slice(0, 3).map((entrada: any) => (
                            <div key={entrada.id} className="p-4 rounded-xl bg-[#141414]/90 backdrop-blur-xl border border-white/5 hover:border-green-500/30 transition-all flex items-center gap-4 group cursor-pointer">
                                <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-white truncate capitalize">
                                        {new Date(entrada.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                                    </p>
                                    <p className="text-xs text-gray-500 font-medium"> <span className="text-green-400">{entrada.duracion_minutos || 0}m</span> • {entrada.calorias_quemadas || 0} kcal</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
