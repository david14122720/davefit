import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { insforge } from '../../lib/insforge';
import { queryWithRetry } from '../../lib/db';
import { getUserStats } from '../../lib/stats';
import { buildWeekView, getInicioSemana, getSaludo } from '../lib/dates';
import type { HistorialEntrenamiento } from '../../types';
import { motion, type Variants } from 'framer-motion';
import XPBar from '../components/XPBar';
import WeeklyGoal from '../components/WeeklyGoal';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import { Play, TrendingUp, Activity, Target, Clock, Flame, Dumbbell, CalendarDays, Sparkles, Zap } from 'lucide-react';

/** Fila semanal mínima que devuelve la query de la semana. */
interface SemanaEntry {
    fecha: string;
    duracion_real: number | null;
    calorias_quemadas: number | null;
}

export default function DashboardPage() {
    const { user, perfil, accessToken } = useAuth();
    const navigate = useNavigate();
    const [historial, setHistorial] = useState<HistorialEntrenamiento[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [datosTotales, setDatosTotales] = useState({ count: 0, minutos: 0, calorias: 0 });
    const [datosSemanales, setDatosSemanales] = useState<SemanaEntry[]>([]);
    const [racha, setRacha] = useState(0);

    const userName = useMemo(() => perfil?.nombre_completo?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario', [perfil, user]);

    const nivel = perfil?.nivel || 'Principiante';

    useEffect(() => {
        if (!accessToken || !user?.id) return;
        const loadData = async () => {
            try {
                const inicioSemana = getInicioSemana();
                const iso = inicioSemana.toISOString();

                const [h, stats, weekRes] = await Promise.all([
                    queryWithRetry<HistorialEntrenamiento[]>(() =>
                        insforge.database
                            .from('historial_entrenamientos')
                            .select('id, fecha, duracion_real, calorias_quemadas, rutina_id, rutinas(nombre)')
                            .eq('usuario_id', user.id)
                            .order('fecha', { ascending: false })
                            .limit(10)
                    ),
                    getUserStats(user.id),
                    queryWithRetry<SemanaEntry[]>(() =>
                        insforge.database.from('historial_entrenamientos')
                            .select('duracion_real, calorias_quemadas, fecha')
                            .eq('usuario_id', user.id)
                            .gte('fecha', iso)
                    ),
                ]);
                
                setHistorial(h.data || []);
                
                if (stats) {
                    setRacha(stats.dias_racha);
                }
                
                // Las filas de la semana ya vienen completas → `data.length`
                // reemplaza al `{ count: 'exact' }` redundante.
                const weekItems = weekRes.data || [];
                setDatosTotales({
                    count: weekItems.length,
                    minutos: weekItems.reduce((acc, curr) => acc + (curr.duracion_real || 0), 0),
                    calorias: weekItems.reduce((acc, curr) => acc + (curr.calorias_quemadas || 0), 0)
                });
                setDatosSemanales(weekItems);
            } catch (e) {
                console.error('Error cargando dashboard:', e);
            } finally {
                setLoaded(true);
            }
        };
        loadData();
    }, [accessToken, user?.id]);

    const totalEntrenamientos = datosTotales.count;
    const totalMinutos = datosTotales.minutos;
    const totalCalorias = datosTotales.calorias;
    const ultimoEntrenamiento = historial[0];

    // Si la rutina fue eliminada (rutina_id null por FK SET NULL), la tarjeta
    // no debe navegar a una ruta rota: sin click y CTA hacia la biblioteca.
    const rutinaIdUltimo = ultimoEntrenamiento?.rutina_id ?? null;
    const puedeReanudar = Boolean(rutinaIdUltimo);
    const handleReanudar = () => {
        if (!rutinaIdUltimo) return;
        navigate(`/rutinas/practicar/${rutinaIdUltimo}`);
    };

    const chartData = useMemo(() => {
        const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
        const dayTotals = new Array(7).fill(0);

        datosSemanales.forEach((entry) => {
            const date = new Date(entry.fecha);
            // Una fecha inválida no debe producir alturas NaN en la gráfica.
            if (Number.isNaN(date.getTime())) return;
            const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
            dayTotals[dayIndex] += Number(entry.duracion_real) || 0;
        });

        const max = Math.max(...dayTotals, 1);

        return days.map((day, i) => ({
            day,
            height: (dayTotals[i] / max) * 100
        }));
    }, [datosSemanales]);

    // Mini-calendario: días reales de la semana actual (Lun–Dom) construidos
    // desde los datos completos de la semana (antes se derivaba de `historial`,
    // truncado a 10, con etiquetas fijas mapeadas a "i días atrás").
    const weekView = useMemo(() => buildWeekView(datosSemanales), [datosSemanales]);

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants: Variants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    if (!loaded) {
        return <DashboardSkeleton />;
    }

    return (
        <motion.div 
            className="max-w-6xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* ===== 1. Hero: Greeting + Streak Badge + Level Badge ===== */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-start mb-8 gap-4 scroll-mt-24">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                            {getSaludo()}, {userName}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                            <Flame className="w-3.5 h-3.5" />
                            {racha} días racha
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20">
                            <Zap className="w-3.5 h-3.5" />
                            Nivel {nivel}
                        </span>
                    </div>
                </div>
                
                <div className="w-full md:w-auto flex flex-col items-start md:items-end gap-3">
                    <Link
                        to="/biblioteca"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 active:scale-95"
                    >
                        <Play className="w-4 h-4" />
                        Entrenar ahora
                    </Link>
                </div>
            </motion.div>

            {/* ===== 2. XPBar + WeeklyGoal (side by side) ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <motion.div variants={itemVariants}>
                    <XPBar />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <WeeklyGoal />
                </motion.div>
            </div>

            {/* ===== 3. Stat Cards ===== */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
                <div className="p-5 rounded-lg bg-surface border border-white/5 hover:border-primary/30 transition-all">
                    <div className="flex justify-between items-start mb-3">
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Entrenamientos</p>
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <Activity className="w-4 h-4" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white">{totalEntrenamientos}</h3>
                    <p className="text-xs text-gray-400 mt-1">esta semana</p>
                </div>

                <div className="p-5 rounded-lg bg-surface border border-white/5 hover:border-primary/30 transition-all">
                    <div className="flex justify-between items-start mb-3">
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Calorías</p>
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <Flame className="w-4 h-4" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white">{totalCalorias}</h3>
                    <p className="text-xs text-gray-400 mt-1">kcal quemadas</p>
                </div>

                <div className="p-5 rounded-lg bg-surface border border-white/5 hover:border-primary/30 transition-all">
                    <div className="flex justify-between items-start mb-3">
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Minutos</p>
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white">{totalMinutos}</h3>
                    <p className="text-xs text-gray-400 mt-1">min activos</p>
                </div>
            </motion.div>

            {/* ===== 4. Weekly Activity Chart + Next Workout ===== */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-8">
                <div className="lg:col-span-2 p-6 rounded-lg bg-surface border border-white/5">
                    {/* Con sesiones pero 0 minutos registrados la gráfica quedaría
                        en barras invisibles (0%); mostrar el estado vacío. */}
                    {totalEntrenamientos > 0 && totalMinutos > 0 ? (
                        <>
                            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" /> Actividad Semanal
                            </h2>
                            <div className="flex items-center gap-2 mb-6 flex-wrap">
                                <span className="text-gray-400 text-sm">Has acumulado</span>
                                <span className="text-xl font-bold text-white bg-primary/10 px-2 py-1 rounded-lg text-primary">{totalMinutos} min</span>
                                <span className="text-gray-400 text-sm">y</span>
                                <span className="text-xl font-bold text-white bg-primary/10 px-2 py-1 rounded-lg text-primary">{totalCalorias} kcal</span>
                            </div>
                            <div className="h-48 flex items-end justify-around gap-2">
                                {chartData.map((data, i) => (
                                    <div key={data.day} className="flex-1 h-full flex flex-col items-center gap-2">
                                        {/* Track con altura definida: un height % necesita
                                            un padre con altura resuelta (antes el padre era
                                            auto → la barra quedaba en 0px). */}
                                        <div className="flex-1 w-full flex items-end min-h-0">
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${data.height}%` }}
                                                transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                                                className="w-full rounded-t-lg bg-linear-to-t from-primary/20 to-primary/80 shadow-[0_-5px_15px_rgba(255,107,0,0.1)]"
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-gray-400">{data.day}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                <TrendingUp className="w-8 h-8 text-gray-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Sin actividad registrada</h2>
                            <p className="text-gray-400 mb-6">Completa tu primer entrenamiento para ver tu gráfica aquí</p>
                            <Link to="/biblioteca" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-all shadow-lg shadow-primary/20">
                                Explorar Rutinas
                            </Link>
                        </div>
                    )}
                </div>

                {/* Next Workout + Goal */}
                <div className="flex flex-col gap-4">
                    {ultimoEntrenamiento ? (
                        <motion.div
                            variants={itemVariants}
                            className={`flex-1 p-5 rounded-lg bg-linear-to-br from-primary/20 to-primary/5 border border-primary/20 group relative overflow-hidden ${puedeReanudar ? 'cursor-pointer' : ''}`}
                            onClick={puedeReanudar ? handleReanudar : undefined}
                        >
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                        <Play className="w-4 h-4 text-primary" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-primary">Siguiente Entreno</p>
                                </div>
                                <h3 className="text-lg font-bold text-white leading-tight mb-3">
                                    {ultimoEntrenamiento.rutinas?.nombre || 'Última Rutina'}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ultimoEntrenamiento.duracion_real || 30} min</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{ultimoEntrenamiento.calorias_quemadas || 0} kcal</span>
                                </div>
                                {puedeReanudar ? (
                                    <button className="px-4 py-2 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-lg transition-transform group-hover:scale-105 active:scale-95">
                                        Reanudar Ahora →
                                    </button>
                                ) : (
                                    <Link
                                        to="/biblioteca"
                                        className="inline-flex px-4 py-2 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-lg transition-transform group-hover:scale-105 active:scale-95"
                                    >
                                        Explorar Rutinas →
                                    </Link>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <div className="flex-1 p-5 rounded-lg bg-surface border border-white/5 flex flex-col justify-center items-center text-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <h3 className="text-white font-bold text-sm">Sin entrenos aún</h3>
                            <p className="text-gray-400 text-xs">Elige una rutina para empezar</p>
                            <Link
                                to="/biblioteca"
                                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-all"
                            >
                                <Dumbbell className="w-3.5 h-3.5" />
                                Explorar Rutinas
                            </Link>
                        </div>
                    )}

                    {/* Goal Card */}
                    <motion.div variants={itemVariants} className="flex-1 p-5 rounded-lg bg-surface border border-white/5 hover:border-primary/30 transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Tu Objetivo</p>
                                <h3 className="text-lg font-bold text-white capitalize">
                                    {String(perfil?.objetivo || '').replace('_', ' ') || 'Por definir'}
                                </h3>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                <Target className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-primary">Nivel {perfil?.nivel || 'No definido'}</span>
                            <span className="text-gray-400 capitalize">{perfil?.preferencia_lugar || 'Casa'}</span>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* ===== 5. Recent Sessions + Weekly Mini Calendar ===== */}
            <motion.div variants={itemVariants} className="mb-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Sessions (up to 3) */}
                    {historial.length > 0 && (
                        <div>
                            <h2 className="text-lg font-bold text-white mb-4">Últimas Sesiones</h2>
                            <div className="grid grid-cols-1 gap-4">
                                {historial.slice(0, 3).map((entrada) => (
                                    <div key={entrada.id} className="p-4 rounded-lg bg-surface border border-white/5 hover:border-primary/30 transition-all flex items-center gap-4 group cursor-pointer">
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <Activity className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-white truncate capitalize">
                                                {new Date(entrada.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                                            </p>
                                            <p className="text-xs text-gray-400 font-medium">
                                                <span className="text-primary">{entrada.duracion_real || 0}m</span> • {entrada.calorias_quemadas || 0} kcal
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Weekly mini calendar */}
                    <div className="p-5 rounded-lg bg-surface border border-white/5">
                        <h3 className="text-sm font-bold text-white mb-4">Esta Semana</h3>
                        <div className="grid grid-cols-7 gap-2">
                            {weekView.map((day) => (
                                <div key={day.label} className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{day.label}</span>
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                                        day.hasTraining
                                            ? 'bg-primary text-white'
                                            : day.isToday
                                                ? 'bg-white/5 text-gray-300 ring-1 ring-primary/40'
                                                : 'bg-white/5 text-gray-400'
                                    }`}>
                                        {day.dayOfMonth}
                                    </div>
                                    {day.hasTraining && (
                                        <div className="w-1 h-1 rounded-full bg-primary" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ===== 6. Full Training History (replaces "Ver todo →") ===== */}
            <motion.div variants={itemVariants} className="mb-8">
                {historial.length > 0 ? (
                    <div>
                        <h2 className="text-lg font-bold text-white mb-4">Entrenamientos Recientes</h2>
                        <div className="space-y-3">
                            {historial.map((entrada) => (
                                <motion.div
                                    key={entrada.id}
                                    variants={itemVariants}
                                    className="p-4 rounded-lg bg-surface border border-white/5 hover:border-primary/30 transition-all flex items-center gap-4 group"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <Dumbbell className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-white truncate capitalize">
                                            {entrada.rutinas?.nombre || 'Rutina'}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {new Date(entrada.fecha).toLocaleDateString('es-ES', {
                                                weekday: 'long',
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="flex items-center gap-1 text-primary font-bold">
                                                <Flame className="w-3.5 h-3.5" />
                                                {entrada.calorias_quemadas || 0}
                                            </span>
                                            <span className="text-gray-400">•</span>
                                            <span className="text-primary font-bold">{entrada.duracion_real || 0} min</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                            <CalendarDays className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">Sin entrenamientos registrados</h3>
                        <p className="text-gray-400 text-sm">Completa tu primer entrenamiento y aparecerá aquí</p>
                        <Link
                            to="/biblioteca"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-all mt-6"
                        >
                            <Play className="w-4 h-4" />
                            Empezar Ahora
                        </Link>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
