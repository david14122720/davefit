import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { insforge } from '../../lib/insforge';
import { motion, type Variants } from 'framer-motion';
import TimeSelector from '../components/TimeSelector';
import XPBar from '../components/XPBar';
import WeeklyGoal from '../components/WeeklyGoal';
import { Play, TrendingUp, CalendarCheck, Activity, Target, Zap } from 'lucide-react';

export default function DashboardPage() {
    const { user, perfil, accessToken } = useAuth();
    const navigate = useNavigate();
    const [historial, setHistorial] = React.useState<any[]>([]);
    const [rutinas, setRutinas] = React.useState<any[]>([]);
    const [ejercicios, setEjercicios] = React.useState<any[]>([]);
    const [loaded, setLoaded] = React.useState(false);
    const [datosTotales, setDatosTotales] = React.useState({ count: 0, minutos: 0, calorias: 0 });

    const userName = useMemo(() => perfil?.nombre_completo?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario', [perfil, user]);

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
                const [h, r, e, countRes, sumRes] = await Promise.all([
                    insforge.database
                        .from('historial_entrenamientos')
                        .select('*, rutinas(nombre)')
                        .order('fecha', { ascending: false })
                        .limit(10),
                    insforge.database.from('rutinas').select('*').limit(5),
                    insforge.database.from('ejercicios').select('*').limit(5),
                    // Obtener conteo real total
                    insforge.database.from('historial_entrenamientos').select('*', { count: 'exact', head: true }),
                    // Obtener sumas (usando rpc o calculando de una muestra mayor)
                    insforge.database.from('historial_entrenamientos').select('duracion_real, calorias_quemadas')
                ]);
                
                setHistorial(h.data || []);
                setRutinas(r.data || []);
                setEjercicios(e.data || []);
                
                const all = sumRes.data || [];
                setDatosTotales({
                    count: countRes.count || 0,
                    minutos: all.reduce((acc, curr) => acc + (curr.duracion_real || 0), 0),
                    calorias: all.reduce((acc, curr) => acc + (curr.calorias_quemadas || 0), 0)
                });
            } catch (e) {
                console.error('Error cargando dashboard:', e);
            } finally {
                setLoaded(true);
            }
        };
        loadData();
    }, [accessToken]);

    const totalEntrenamientos = datosTotales.count;
    const totalMinutos = datosTotales.minutos;
    const totalCalorias = datosTotales.calorias;
    const ultimoEntrenamiento = historial[0];
    const items = rutinas.length > 0 ? rutinas : ejercicios;

    // Memoize the chart "random" data so it doesn't jump on every re-render
    const chartData = useMemo(() => 
        ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => ({
            day,
            height: Math.random() * 80 + 20
        }))
    , [totalEntrenamientos]); // Only change if new training is added
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
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-start mb-10 gap-8">
                <div className="flex-1">
                    <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 drop-shadow-[0_0_20px_rgba(249,115,22,0.2)] tracking-tight">
                        {saludo}, {userName}
                    </h1>
                    <p className="text-gray-400 font-medium text-base sm:text-lg">¿Listo para destruir tus metas de hoy?</p>
                </div>
                
                <div className="w-full md:w-auto -mt-2">
                    <TimeSelector />
                    <Link
                        to="/rutinas"
                        className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-500 hover:text-orange-400 transition-colors ml-1"
                    >
                        Ver todas las rutinas →
                    </Link>
                </div>
            </motion.div>

            {/* XP & Streak Bar */}
            <motion.div variants={itemVariants} className="mb-6">
                <XPBar />
            </motion.div>

            {/* Weekly Goal */}
            <motion.div variants={itemVariants} className="mb-6">
                <WeeklyGoal />
            </motion.div>

            {/* Stats Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                {/* Objetivo */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#141414]/90 backdrop-blur-xl border border-white/5 hover:border-orange-500/30 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] transition-all sm:col-span-2 lg:col-span-1">
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

                {/* Especial: Quick Resume (US-072) */}
                {ultimoEntrenamiento ? (
                    <motion.div 
                        variants={itemVariants}
                        whileHover={{ scale: 1.02 }}
                        className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-500 border border-orange-400/30 shadow-[0_10px_40px_rgba(249,115,22,0.3)] group cursor-pointer relative overflow-hidden"
                        onClick={() => navigate(`/rutinas/practicar/${ultimoEntrenamiento.rutina_id}`)}
                    >
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-1">Continuar Misión</p>
                            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight mb-3">
                                {ultimoEntrenamiento.rutinas?.nombre || 'Última Rutina'}
                            </h3>
                            <button className="px-4 py-2 bg-white text-black text-xs font-black uppercase tracking-widest rounded-lg transition-transform group-hover:scale-105 active:scale-95">
                                Reanudar Ahora →
                            </button>
                        </div>
                        <Play className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                    </motion.div>
                ) : (
                    <div className="p-5 sm:p-6 rounded-2xl bg-[#141414]/90 backdrop-blur-xl border border-white/5 flex flex-col justify-center items-center text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
                            <Zap className="w-6 h-6" />
                        </div>
                        <h3 className="text-white font-bold text-sm">Sin misiones activas</h3>
                        <p className="text-gray-500 text-[10px]">Elige una rutina para empezar tu leyenda.</p>
                    </div>
                )}

                {/* Último Entrenamiento Info */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#141414]/90 backdrop-blur-xl border border-white/5 hover:border-yellow-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Último Logro</p>
                            <h3 className="text-xl sm:text-2xl font-bold text-white">
                                {ultimoEntrenamiento ? '🔥 Victoria' : 'Sin datos'}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
                            <CalendarCheck className="w-5 h-5" />
                        </div>
                    </div>
                    {ultimoEntrenamiento ? (
                        <div className="flex flex-col gap-1 mt-4">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <span className="bg-white/5 px-3 py-1 rounded-full text-gray-300">{ultimoEntrenamiento.duracion_real || 0} min</span>
                                <span className="bg-white/5 px-3 py-1 rounded-full text-gray-300 group-hover:text-yellow-400">{ultimoEntrenamiento.calorias_quemadas || 0} kcal</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest font-bold">
                                {new Date(ultimoEntrenamiento.fecha).toLocaleDateString()}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 mt-4">Tus hazañas aparecerán aquí.</p>
                    )}
                </div>

                {/* Total */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#141414]/90 backdrop-blur-xl border border-white/5 hover:border-red-500/30 transition-all cursor-default">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Actividad Total</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-bold text-white">{totalEntrenamientos}</h3>
                                <span className="text-gray-500 text-sm font-medium uppercase tracking-tighter">batallas</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                            <Activity className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-4 leading-relaxed">
                        <span className="text-orange-400 font-bold">{totalMinutos}</span> min acumulados <br/>
                        <span className="text-yellow-400 font-bold">{totalCalorias}</span> kcal quemadas
                    </p>
                </div>
            </motion.div>

            {/* Content Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Activity or Empty State */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-[#141414]/90 backdrop-blur-xl border border-white/5">
                    {totalEntrenamientos > 0 ? (
                        <>
                            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-orange-500"/> Frecuencia Semanal</h2>
                            <div className="flex items-center gap-2 mb-6 flex-wrap">
                                <span className="text-gray-400 text-sm">Has acumulado</span>
                                <span className="text-xl font-bold text-white bg-orange-500/10 px-2 py-1 rounded-lg text-orange-400">{totalMinutos} min</span>
                                <span className="text-gray-400 text-sm">y</span>
                                <span className="text-xl font-bold text-white bg-yellow-500/10 px-2 py-1 rounded-lg text-yellow-400">{totalCalorias} kcal</span>
                            </div>
                            <div className="h-48 flex items-end justify-around gap-2">
                                {chartData.map((data, i) => (
                                    <div key={data.day} className="flex-1 flex flex-col items-center gap-2">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${data.height}%` }}
                                            transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                                            className="w-full rounded-t-lg bg-gradient-to-t from-orange-500/20 to-orange-500/80 shadow-[0_-5px_15px_rgba(249,115,22,0.1)]"
                                        />
                                        <span className="text-xs font-bold text-gray-500">{data.day}</span>
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
                                Explororar Rutinas
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
                                    onClick={() => navigate(rutinas.length > 0 ? `/rutinas` : `/admin/ejercicios`)}
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
                        <div className="p-8 rounded-2xl bg-[#141414]/90 backdrop-blur-xl border border-white/5 text-center space-y-3">
                            <div className="text-5xl">⚡</div>
                            <h4 className="text-white font-bold">¡Arsenal vacío!</h4>
                            <p className="text-gray-500 text-xs">Crea tu primera rutina o explora los ejercicios para empezar tu transformación.</p>
                            <Link 
                                to="/admin/rutinas"
                                className="inline-block mt-2 text-xs font-bold text-orange-500 hover:text-orange-400"
                            >
                                Crear Rutina Ahora →
                            </Link>
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
                                    <p className="text-xs text-gray-500 font-medium"> <span className="text-green-400">{entrada.duracion_real || 0}m</span> • {entrada.calorias_quemadas || 0} kcal</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
