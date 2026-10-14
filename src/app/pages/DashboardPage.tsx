import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { insforge } from '../../lib/insforge';
import { queryWithRetry } from '../../lib/db';
import { getUserStats } from '../../lib/stats';
import { buildWeekView, getInicioSemana, getSaludo } from '../lib/dates';
import type { HistorialEntrenamiento, UserStats } from '../../types';
import { motion, type Variants } from 'framer-motion';
import XPBar from '../components/XPBar';
import WeeklyGoal from '../components/WeeklyGoal';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import {
    Play, TrendingUp, Target, Clock, Flame, Dumbbell, CalendarDays, Sparkles,
    Quote, Zap, Timer, Users, Award, ArrowRight, ChevronRight, Pencil, Lightbulb,
    UtensilsCrossed, Activity,
} from 'lucide-react';

/** Fila semanal mínima que devuelve la query de la semana. */
interface SemanaEntry {
    fecha: string;
    duracion_real: number | null;
    calorias_quemadas: number | null;
}

/** Columnas de `rutinas` que se usan en el join de la sesión recomendada. */
interface RutinaResumen {
    nombre: string;
    imagen_cover_url?: string | null;
    nivel?: string | null;
    descripcion?: string | null;
    duracion_estimada?: number | null;
    objetivo?: string | null;
    tipo_lugar?: string | null;
}

/**
 * Fila de historial con el join ampliado de `rutinas`.
 * `src/types` no está en el alcance de esta tarea: el tipo extendido vive aquí.
 */
interface HistorialRow extends Omit<HistorialEntrenamiento, 'rutinas'> {
    rutinas?: RutinaResumen | null;
}

/** Campos de `recetas` que usa la sección de recarga post-entreno. */
interface RecetaResumen {
    id: string;
    nombre: string;
    imagen_url?: string | null;
    proteinas?: number | null;
    calorias?: number | null;
    tiempo_preparacion?: number | null;
}

/** Fila del ranking mini de comunidad. */
interface ComunidadRow {
    id: string;
    username: string;
    avatar_url?: string | null;
    xp_total: number;
    total_workouts: number;
    dias_racha: number;
}

// ---- Labels legibles de los enums del perfil ----

const OBJETIVO_LABELS: Record<string, string> = {
    mantener_forma: 'Mantener Forma',
    tonificar: 'Tonificar Cuerpo',
    ganar_fuerza: 'Ganar Fuerza',
    perder_peso: 'Perder Peso',
};

const NIVEL_LABELS: Record<string, string> = {
    principiante: 'Principiante',
    intermedio: 'Intermedio',
    avanzado: 'Avanzado',
};

const LUGAR_LABELS: Record<string, string> = {
    casa: 'En casa',
    gimnasio: 'Gimnasio',
    ambos: 'Casa o gimnasio',
};

function labelObjetivo(valor?: string | null): string {
    if (!valor) return 'Por definir';
    return OBJETIVO_LABELS[valor] || valor.replace(/_/g, ' ');
}

function labelNivel(valor?: string | null): string {
    if (!valor) return 'Sin definir';
    return NIVEL_LABELS[valor.toLowerCase()] || valor;
}

function labelLugar(valor?: string | null): string {
    if (!valor) return 'En casa';
    return LUGAR_LABELS[valor.toLowerCase()] || valor;
}

/** Iniciales para el avatar de texto del ranking. */
function iniciales(nombre: string): string {
    return nombre
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0]?.toUpperCase() || '')
        .join('') || 'A';
}

/**
 * Top 3 de la comunidad por XP. Usa las mismas tablas públicas que
 * ComunidadPage (`perfiles_public` + `user_stats_public`). Cualquier fallo
 * devuelve [] para que el widget se oculte sin romper la página.
 */
async function cargarComunidad(): Promise<ComunidadRow[]> {
    try {
        // Payload acotado: solo el top 3 por XP y solo los perfiles de esos 3
        // usuarios (evita traer las vistas públicas completas en cada visita).
        const { data: statsData } = await queryWithRetry<any[]>(() =>
            insforge.database
                .from('user_stats_public')
                .select('user_id, xp_total, total_workouts, dias_racha')
                .order('xp_total', { ascending: false })
                .limit(3)
        );

        if (!Array.isArray(statsData) || statsData.length === 0) return [];

        const ids = statsData.map((s: any) => s.user_id);
        const { data: perfilesData } = await queryWithRetry<any[]>(() =>
            insforge.database.from('perfiles_public').select('id, nombre_completo, avatar_url').in('id', ids)
        );

        if (!Array.isArray(perfilesData)) return [];

        const perfilMap = new Map<string, any>(perfilesData.map((p: any) => [p.id, p]));

        const rows: ComunidadRow[] = [];
        for (const s of statsData) {
            const perfil = perfilMap.get(s.user_id);
            if (!perfil) continue;
            rows.push({
                id: s.user_id,
                username: perfil.nombre_completo?.split(' ')[0] || 'Atleta',
                avatar_url: perfil.avatar_url ?? null,
                xp_total: s.xp_total || 0,
                total_workouts: s.total_workouts || 0,
                dias_racha: s.dias_racha || 0,
            });
        }
        // El server ya devuelve el top 3 ordenado; el sort+slice defiende ante
        // respuestas sin orden (mocks/edge) y garantiza exactamente 3 filas.
        return rows.sort((a, b) => b.xp_total - a.xp_total).slice(0, 3);
    } catch (e) {
        console.error('[Dashboard] Error cargando comunidad:', e);
        return [];
    }
}

export default function DashboardPage() {
    const { user, perfil, accessToken } = useAuth();
    const navigate = useNavigate();
    const [historial, setHistorial] = useState<HistorialRow[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [datosTotales, setDatosTotales] = useState({ count: 0, minutos: 0, calorias: 0 });
    const [datosSemanales, setDatosSemanales] = useState<SemanaEntry[]>([]);
    const [racha, setRacha] = useState(0);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [recetas, setRecetas] = useState<RecetaResumen[]>([]);
    const [comunidad, setComunidad] = useState<ComunidadRow[]>([]);

    const userName = useMemo(() => perfil?.nombre_completo?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario', [perfil, user]);

    useEffect(() => {
        if (!accessToken || !user?.id) return;
        const loadData = async () => {
            try {
                const inicioSemana = getInicioSemana();
                const iso = inicioSemana.toISOString();

                const [h, statsData, weekRes, recetasRes, comunidadData] = await Promise.all([
                    queryWithRetry<HistorialRow[]>(() =>
                        insforge.database
                            .from('historial_entrenamientos')
                            .select('id, fecha, duracion_real, calorias_quemadas, rutina_id, rutinas(nombre, imagen_cover_url, nivel, descripcion, duracion_estimada, objetivo, tipo_lugar)')
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
                    queryWithRetry<RecetaResumen[]>(() =>
                        insforge.database.from('recetas')
                            .select('*')
                            .order('created_at', { ascending: false })
                            .limit(2)
                    ),
                    cargarComunidad(),
                ]);

                setHistorial(h.data || []);

                if (statsData) {
                    setStats(statsData);
                    setRacha(statsData.dias_racha);
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

                // Sección silenciosa: sin recetas (o con error) no se renderiza.
                setRecetas(Array.isArray(recetasRes.data) ? recetasRes.data : []);
                setComunidad(comunidadData);
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
    const rutinaUltima = ultimoEntrenamiento?.rutinas ?? null;

    // Si la rutina fue eliminada (rutina_id null por FK SET NULL), la tarjeta
    // no debe navegar a una ruta rota: sin click y CTA hacia la biblioteca.
    const rutinaIdUltimo = ultimoEntrenamiento?.rutina_id ?? null;
    const puedeReanudar = Boolean(rutinaIdUltimo);
    const handleReanudar = () => {
        if (!rutinaIdUltimo) return;
        navigate(`/rutinas/practicar/${rutinaIdUltimo}`);
    };

    // Barras por día (Lun–Dom) con las kcal de la semana. La altura es
    // relativa al día de mayor quema; el día real de hoy se resalta.
    const chartData = useMemo(() => {
        const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const cortos = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
        const totales = new Array(7).fill(0);

        datosSemanales.forEach((entry) => {
            const date = new Date(entry.fecha);
            // Una fecha inválida no debe producir alturas NaN en la gráfica.
            if (Number.isNaN(date.getTime())) return;
            const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
            totales[dayIndex] += Number(entry.calorias_quemadas) || 0;
        });

        const max = Math.max(...totales, 1);
        const hoy = new Date();
        const hoyIndex = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1;

        return labels.map((label, i) => ({
            label,
            corto: cortos[i],
            kcal: totales[i],
            height: (totales[i] / max) * 100,
            isToday: i === hoyIndex,
        }));
    }, [datosSemanales]);

    const diasActivos = chartData.filter((dia) => dia.kcal > 0).length;
    const promedioKcalDia = diasActivos > 0 ? Math.round(totalCalorias / diasActivos) : 0;
    const promedioMinSesion = totalEntrenamientos > 0 ? Math.round(totalMinutos / totalEntrenamientos) : 0;
    const tieneActividad = totalEntrenamientos > 0 && totalCalorias > 0;

    // Mini-calendario: días reales de la semana actual (Lun–Dom) construidos
    // desde los datos completos de la semana (antes se derivaba de `historial`,
    // truncado a 10, con etiquetas fijas mapeadas a "i días atrás").
    const weekView = useMemo(() => buildWeekView(datosSemanales), [datosSemanales]);

    const nivelLabel = labelNivel(perfil?.nivel);
    const nivelNumero = stats?.nivel ?? 1;
    const objetivoLabel = labelObjetivo(perfil?.objetivo);
    const lugarLabel = labelLugar(perfil?.preferencia_lugar);
    const tipObjetivo = racha > 0
        ? `Si completas la sesión de hoy, alcanzarás una racha de ${racha + 1} días seguidos.`
        : 'Completa tu primera sesión de hoy y arranca tu racha.';

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
            className="w-full flex flex-col gap-5"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* ===== 1. Banner de bienvenida (racha + nivel + objetivo) ===== */}
            <motion.section
                variants={itemVariants}
                className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#1c1b1c] via-[#201f20] to-[#1c1b1c] p-6 md:p-8 shadow-xl"
            >
                <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#ff5e00]/10 blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff5e00]/15 text-[#ff5e00] text-[11px] font-bold uppercase tracking-wider">
                                <Flame className="w-3.5 h-3.5" />
                                {racha} {racha === 1 ? 'día' : 'días'} racha activa
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2a2a2b] text-[#c5c6cc] text-[11px] font-bold uppercase tracking-wider">
                                <Zap className="w-3.5 h-3.5" />
                                Nivel {nivelNumero}: {nivelLabel}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2a2a2b] text-[#c5c6cc] text-[11px] font-bold">
                                <Target className="w-3.5 h-3.5" />
                                {objetivoLabel}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-[38px] md:leading-[48px] font-extrabold tracking-tight text-[#e5e2e3] flex items-center gap-2">
                            ¡{getSaludo()}, {userName}! <span className="inline-block animate-pulse">👋</span>
                        </h1>
                        <p className="text-sm text-[#e4bfb1] italic flex items-center gap-2">
                            <Quote className="w-4 h-4 text-[#ff5e00] shrink-0" />
                            "La disciplina de hoy es tu fuerza y tranquilidad de mañana."
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 shrink-0">
                        <Link
                            to="/biblioteca"
                            className="group w-full lg:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#ff5e00] text-white font-bold shadow-[0_0_24px_-4px_rgba(255,94,0,0.45)] hover:shadow-[0_0_32px_0px_rgba(255,94,0,0.65)] hover:brightness-110 active:scale-95 transition-all duration-200"
                        >
                            <Play className="w-5 h-5 transition-transform duration-200 group-hover:scale-125" />
                            Entrenar ahora
                        </Link>
                    </div>
                </div>
            </motion.section>

            {/* ===== 2. Métricas semanales (4 tarjetas; 2x2 en móvil como el diseño) ===== */}
            <motion.section variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {/* Card 1: Nivel + XP + racha (XPBar conserva sus cálculos) */}
                <XPBar />

                {/* Card 2: Meta de sesiones (WeeklyGoal conserva sus cálculos) */}
                <WeeklyGoal />

                {/* Card 3: Quema acumulada de la semana */}
                <div className="relative overflow-hidden rounded-xl bg-[#1c1b1c] p-4 lg:p-5 hover:bg-[#201f20] transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-[#ff5e00]/20 flex items-center justify-center text-[#ff5e00]">
                            <Flame className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#353436] text-[#c5c6cc]">
                            Semana en curso
                        </span>
                    </div>
                    <p className="text-xs font-semibold text-[#c5c6cc]">Quema Acumulada</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-lg lg:text-2xl font-bold text-[#e5e2e3]">{totalCalorias.toLocaleString()}</span>
                        <span className="text-xs text-[#c5c6cc]">kcal quemadas</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2 text-[11px] lg:text-xs">
                        <span className="flex items-center gap-1 text-[#e5e2e3] whitespace-nowrap">
                            <Dumbbell className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#ffb77d] shrink-0" />
                            {totalEntrenamientos} {totalEntrenamientos === 1 ? 'entreno' : 'entrenos'}
                        </span>
                        <span className="text-[#c5c6cc] whitespace-nowrap">
                            {totalEntrenamientos > 0 ? `Prom: ~${Math.round(totalCalorias / totalEntrenamientos)} kcal` : 'Sin sesiones'}
                        </span>
                    </div>
                </div>

                {/* Card 4: Tiempo activo de la semana */}
                <div className="relative overflow-hidden rounded-xl bg-[#1c1b1c] p-4 lg:p-5 hover:bg-[#201f20] transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-[#2a2a2b] flex items-center justify-center text-[#ff5e00]">
                            <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#353436] text-[#c5c6cc]">
                            Ritmo óptimo
                        </span>
                    </div>
                    <p className="text-xs font-semibold text-[#c5c6cc]">Tiempo en Zona Activa</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-lg lg:text-2xl font-bold text-[#e5e2e3]">{totalMinutos.toLocaleString()}</span>
                        <span className="text-xs text-[#c5c6cc]">minutos totales</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2 text-[11px] lg:text-xs">
                        <span className="flex items-center gap-1 text-[#e5e2e3] whitespace-nowrap">
                            <Timer className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#ff5e00] shrink-0" />
                            {totalEntrenamientos > 0 ? `${promedioMinSesion} min/sesión` : 'Sin sesiones'}
                        </span>
                        <span className="text-[#c5c6cc] whitespace-nowrap">
                            {totalEntrenamientos} {totalEntrenamientos === 1 ? 'sesión' : 'sesiones'}
                        </span>
                    </div>
                </div>
            </motion.section>

            {/* ===== 3. Split principal (65% / 35%): dos columnas independientes
                 en desktop; en móvil las secciones se intercalan con `order`. ===== */}
            <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:items-start">
                {/* Columna izquierda */}
                <div className="contents lg:flex lg:flex-col lg:gap-5 lg:col-span-8">
                    {/* Chart Card: Registro de Esfuerzo Semanal */}
                    <motion.section variants={itemVariants} className="order-1 lg:order-none rounded-xl bg-[#1c1b1c] p-6 shadow-md">
                        {/* Con sesiones pero 0 kcal registradas la gráfica quedaría
                            en barras invisibles (0%); mostrar el estado vacío. */}
                        {tieneActividad ? (
                            <>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4">
                                    <div className="space-y-0.5">
                                        <h2 className="text-lg font-bold text-[#e5e2e3] flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-[#ff5e00]" />
                                            Registro de Esfuerzo Semanal
                                        </h2>
                                        <p className="text-xs text-[#9ea3ae]">Intensidad en volumen y kcal por día de entrenamiento</p>
                                    </div>
                                </div>
                                <div className="w-full pt-4">
                                    <div className="relative h-60 w-full flex items-end justify-between gap-2 sm:gap-4 px-2 pb-6 border-b border-[#353436]">
                                        {chartData.map((dia) => (
                                            <div key={dia.label} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative">
                                                <span className={`text-[11px] font-bold mb-1 transition-colors ${dia.isToday && dia.kcal > 0
                                                    ? 'text-[#ff5e00] opacity-100'
                                                    : 'text-[#c5c6cc] opacity-0 group-hover:opacity-100 group-hover:text-[#ff5e00]'}`}>
                                                    {dia.kcal > 0 ? `${dia.kcal} kcal` : 'Descanso'}
                                                </span>
                                                <div
                                                    className={`w-full max-w-[42px] rounded-t-md transition-all relative ${dia.isToday
                                                        ? 'bg-gradient-to-t from-[#ff5e00] to-[#ffb77d] shadow-[0_0_18px_rgba(255,94,0,0.4)] group-hover:brightness-125'
                                                        : dia.kcal > 0
                                                            ? 'bg-gradient-to-t from-[#353436] to-[#ff5e00]/80 shadow-[0_0_12px_rgba(255,94,0,0.25)] group-hover:brightness-125'
                                                            : 'bg-[#353436]/30 group-hover:bg-[#353436]'}`}
                                                    style={{ height: `${dia.kcal > 0 ? Math.max(dia.height, 8) : 5}%` }}
                                                >
                                                    {dia.isToday && (
                                                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#e5e2e3]" />
                                                    )}
                                                </div>
                                                <span className={`absolute bottom-0 text-xs font-bold transition-colors ${dia.isToday ? 'text-[#ff5e00]' : 'text-[#c5c6cc] group-hover:text-[#e5e2e3]'}`}>
                                                    <span className="hidden sm:inline">{dia.label}</span>
                                                    <span className="sm:hidden">{dia.corto}</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between pt-3 text-xs text-[#9ea3ae]">
                                        <div className="flex items-center gap-4">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-2.5 h-2.5 rounded-sm bg-[#ff5e00]" /> Completado
                                            </span>
                                        </div>
                                        <span className="text-[#9ea3ae] font-bold">
                                            Promedio semanal: {promedioKcalDia} kcal / día activo
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-[#2a2a2b] flex items-center justify-center mx-auto mb-4">
                                    <TrendingUp className="w-8 h-8 text-[#9ea3ae]" />
                                </div>
                                <h2 className="text-xl font-bold text-[#e5e2e3] mb-2">Sin actividad registrada</h2>
                                <p className="text-[#9ea3ae] mb-6">Completa tu primer entrenamiento para ver tu gráfica aquí</p>
                                <Link to="/biblioteca" className="inline-flex items-center gap-2 px-6 py-3 bg-[#ff5e00] text-white font-bold rounded-lg hover:brightness-110 transition-all shadow-lg shadow-[#ff5e00]/20">
                                    Explorar Rutinas
                                </Link>
                            </div>
                        )}
                    </motion.section>

                    {/* Sesión Recomendada de Hoy (último entreno del historial) */}
                    <motion.section variants={itemVariants} className="order-2 lg:order-none rounded-xl bg-[#1c1b1c] p-6 shadow-md relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Dumbbell className="w-5 h-5 text-[#ff5e00] shrink-0" />
                                <h2 className="text-base sm:text-lg font-bold text-[#e5e2e3]">Sesión Recomendada de Hoy</h2>
                            </div>
                            <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-[#ff5e00]/15 text-[#ff5e00] text-[11px] font-bold uppercase whitespace-nowrap">
                                Personalizada para ti
                            </span>
                        </div>
                        {ultimoEntrenamiento ? (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                <div className="md:col-span-5 relative rounded-lg overflow-hidden h-52 bg-[#2a2a2b]">
                                    {rutinaUltima?.imagen_cover_url ? (
                                        <img
                                            src={rutinaUltima.imagen_cover_url}
                                            alt={rutinaUltima.nombre}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2a2a2b] to-[#1c1b1c]">
                                            <Dumbbell className="w-10 h-10 text-[#5f636e]" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0f]/90 via-transparent to-transparent" />
                                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0e0e0f]/85 backdrop-blur-md text-[#e5e2e3] text-[11px] font-bold">
                                        <Timer className="w-3.5 h-3.5 text-[#ff5e00]" />
                                        {ultimoEntrenamiento.duracion_real || rutinaUltima?.duracion_estimada || 0} min
                                    </div>
                                </div>
                                <div className="md:col-span-7 flex flex-col justify-between h-full gap-2">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            {rutinaUltima?.nivel && (
                                                <span className="px-2 py-0.5 rounded bg-[#353436] text-[#c5c6cc] text-[11px] font-bold">
                                                    {labelNivel(rutinaUltima.nivel)}
                                                </span>
                                            )}
                                            {rutinaUltima?.duracion_estimada && (
                                                <span className="px-2 py-0.5 rounded bg-[#353436] text-[#c5c6cc] text-[11px] font-bold">
                                                    {rutinaUltima.duracion_estimada} min
                                                </span>
                                            )}
                                            {(rutinaUltima?.objetivo || rutinaUltima?.tipo_lugar) && (
                                                <span className="px-2 py-0.5 rounded bg-[#353436] text-[#c5c6cc] text-[11px] font-bold">
                                                    {rutinaUltima?.objetivo ? labelObjetivo(rutinaUltima.objetivo) : labelLugar(rutinaUltima?.tipo_lugar)}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-[#e5e2e3] leading-tight group-hover:text-[#ff5e00] transition-colors">
                                            {rutinaUltima?.nombre || 'Última Rutina'}
                                        </h3>
                                        {rutinaUltima?.descripcion && (
                                            <p className="text-sm text-[#e4bfb1] mt-1.5 line-clamp-2">
                                                {rutinaUltima.descripcion}
                                            </p>
                                        )}
                                    </div>
                                    <div className="pt-2 flex flex-wrap items-center gap-4">
                                        {puedeReanudar ? (
                                            <button
                                                onClick={handleReanudar}
                                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#ff5e00] hover:brightness-110 text-white font-bold shadow-md transition-all active:scale-95"
                                            >
                                                Iniciar Sesión de Hoy
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <Link
                                                to="/biblioteca"
                                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#ff5e00] hover:brightness-110 text-white font-bold shadow-md transition-all active:scale-95"
                                            >
                                                Explorar Rutinas
                                                <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col justify-center items-center text-center space-y-2 py-10">
                                <div className="w-12 h-12 rounded-full bg-[#ff5e00]/10 text-[#ff5e00] flex items-center justify-center">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <h3 className="text-[#e5e2e3] font-bold text-sm">Sin entrenos aún</h3>
                                <p className="text-[#9ea3ae] text-xs">Elige una rutina para empezar</p>
                                <Link
                                    to="/biblioteca"
                                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#ff5e00] text-white text-xs font-bold rounded-lg hover:brightness-110 transition-all"
                                >
                                    <Dumbbell className="w-3.5 h-3.5" />
                                    Explorar Rutinas
                                </Link>
                            </div>
                        )}
                    </motion.section>

                    {/* Recarga Post-Entreno Sugerida (últimas 2 recetas reales) */}
                    {recetas.length > 0 && (
                        <motion.section variants={itemVariants} className="order-5 lg:order-none rounded-xl bg-[#1c1b1c] p-6 shadow-md">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <UtensilsCrossed className="w-5 h-5 text-[#ffb77d]" />
                                    <h2 className="text-lg font-bold text-[#e5e2e3]">Recarga Post-Entreno Sugerida</h2>
                                </div>
                                <Link to="/nutricion" className="text-[11px] font-bold text-[#ff5e00] hover:underline flex items-center gap-0.5">
                                    Ver menú completo <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {recetas.map((receta) => (
                                    <div key={receta.id} className="flex gap-4 p-4 rounded-lg bg-[#201f20] hover:bg-[#2a2a2b] transition-all">
                                        <div className="w-20 h-20 rounded-md overflow-hidden bg-[#353436] shrink-0">
                                            {receta.imagen_url ? (
                                                <img
                                                    src={receta.imagen_url}
                                                    alt={receta.nombre}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <UtensilsCrossed className="w-6 h-6 text-[#5f636e]" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col justify-between flex-1 min-w-0">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#ffb77d]">Receta</span>
                                                <h4 className="text-sm font-bold text-[#e5e2e3] truncate">{receta.nombre}</h4>
                                                <p className="text-xs text-[#c5c6cc]">
                                                    {[
                                                        receta.proteinas ? `${receta.proteinas}g Proteína` : null,
                                                        receta.calorias ? `${receta.calorias} kcal` : null,
                                                    ].filter(Boolean).join(' • ') || 'Receta saludable'}
                                                </p>
                                            </div>
                                            {receta.tiempo_preparacion && (
                                                <span className="text-xs text-[#9ea3ae]">⏱ {receta.tiempo_preparacion} min prep</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    )}
                </div>

                {/* Columna derecha */}
                <div className="contents lg:flex lg:flex-col lg:gap-5 lg:col-span-4">
                    {/* Widget: Tu Objetivo Activo */}
                    <motion.section variants={itemVariants} className="order-3 lg:order-none rounded-xl bg-[#1c1b1c] p-6 shadow-md flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-[#ff5e00]" />
                                <h3 className="text-lg font-bold text-[#e5e2e3]">Tu Objetivo Activo</h3>
                            </div>
                            <Link
                                to="/perfil"
                                title="Editar objetivo"
                                className="p-1 rounded text-[#c5c6cc] hover:text-[#e5e2e3] hover:bg-[#2a2a2b] transition-colors"
                            >
                                <Pencil className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="p-4 rounded-lg bg-[#201f20] space-y-3">
                            <div>
                                <span className="text-[11px] font-bold text-[#c5c6cc] uppercase tracking-wider">Foco Principal</span>
                                <p className="text-sm font-bold text-[#e5e2e3]">{objetivoLabel}</p>
                                <p className="text-xs text-[#c5c6cc]">Modalidad: {lugarLabel}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-[#ff5e00]/10">
                            <Lightbulb className="w-5 h-5 text-[#ff5e00] shrink-0 mt-0.5" />
                            <p className="text-xs text-[#e4bfb1]">{tipObjetivo}</p>
                        </div>
                    </motion.section>

                    {/* Widget: Comunidad en Vivo (top 3 real por XP) */}
                    {comunidad.length > 0 && (
                        <motion.section variants={itemVariants} className="order-4 lg:order-none rounded-xl bg-[#1c1b1c] p-6 shadow-md flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-[#ff5e00]" />
                                <h3 className="text-lg font-bold text-[#e5e2e3]">Comunidad en Vivo</h3>
                            </div>
                            <div className="space-y-2.5">
                                {comunidad.map((miembro, i) => (
                                    <div
                                        key={miembro.id}
                                        className={`flex items-center justify-between p-2 rounded-lg transition-colors ${miembro.id === user?.id ? 'bg-[#ff5e00]/15' : 'bg-[#201f20]/60 hover:bg-[#201f20]'}`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className={`w-5 text-center text-xs font-bold ${i === 0 ? 'text-[#ffb77d]' : i === 1 ? 'text-[#c5c6cc]' : 'text-[#ff5e00]'}`}>
                                                {i + 1}
                                            </span>
                                            {/* Círculo con iniciales (como el diseño). No se
                                                renderiza `avatar_url`: la CSP local solo permite el
                                                origen InsForge configurado y los avatares apuntan al
                                                dominio público, lo que generaba errores de consola. */}
                                            <div className="w-7 h-7 rounded-full bg-[#d77917] text-[#4d2600] font-bold flex items-center justify-center text-xs">
                                                {iniciales(miembro.username)}
                                            </div>
                                            <div>
                                                <p className={`text-xs text-[#e5e2e3] ${miembro.id === user?.id ? 'font-bold' : 'font-medium'}`}>
                                                    {miembro.id === user?.id ? `Tú (${miembro.username})` : miembro.username}
                                                </p>
                                                <p className="text-[11px] text-[#c5c6cc]">{miembro.xp_total.toLocaleString()} XP</p>
                                            </div>
                                        </div>
                                        {i === 0 ? (
                                            <Award className="w-4 h-4 text-[#ffb77d]" />
                                        ) : miembro.dias_racha > 0 ? (
                                            <span className="text-[11px] text-[#c5c6cc]">🔥 {miembro.dias_racha}d</span>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                            <Link
                                to="/comunidad"
                                className="block text-center py-2.5 rounded-lg bg-[#2a2a2b] hover:bg-[#3a393a] text-[#e5e2e3] text-[11px] font-bold transition-all"
                            >
                                Ir al muro de la Comunidad →
                            </Link>
                        </motion.section>
                    )}
                </div>
            </div>

            {/* ===== 4. Últimas Sesiones + Mini-calendario (funcionalidad previa) ===== */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Recent Sessions (up to 3) */}
                {historial.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold text-[#e5e2e3] mb-4">Últimas Sesiones</h2>
                        <div className="grid grid-cols-1 gap-4">
                            {historial.slice(0, 3).map((entrada) => (
                                <div key={entrada.id} className="p-4 rounded-xl bg-[#1c1b1c] hover:bg-[#201f20] transition-all flex items-center gap-4 group cursor-pointer">
                                    <div className="w-12 h-12 rounded-lg bg-[#ff5e00]/10 text-[#ff5e00] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-[#e5e2e3] truncate capitalize">
                                            {new Date(entrada.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                                        </p>
                                        <p className="text-xs text-[#9ea3ae] font-medium">
                                            <span className="text-[#ff5e00]">{entrada.duracion_real || 0}m</span> • {entrada.calorias_quemadas || 0} kcal
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Weekly mini calendar */}
                <div className="p-5 rounded-xl bg-[#1c1b1c]">
                    <h3 className="text-sm font-bold text-[#e5e2e3] mb-4">Esta Semana</h3>
                    <div className="grid grid-cols-7 gap-2">
                        {weekView.map((day) => (
                            <div key={day.label} className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-bold text-[#9ea3ae] uppercase">{day.label}</span>
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                                    day.hasTraining
                                        ? 'bg-[#ff5e00] text-white'
                                        : day.isToday
                                            ? 'bg-[#2a2a2b] text-[#e5e2e3] ring-1 ring-[#ff5e00]/40'
                                            : 'bg-[#2a2a2b] text-[#9ea3ae]'
                                }`}>
                                    {day.dayOfMonth}
                                </div>
                                {day.hasTraining && (
                                    <div className="w-1 h-1 rounded-full bg-[#ff5e00]" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* ===== 5. Historial completo (funcionalidad previa) ===== */}
            <motion.div variants={itemVariants}>
                {historial.length > 0 ? (
                    <div>
                        <h2 className="text-lg font-bold text-[#e5e2e3] mb-4">Entrenamientos Recientes</h2>
                        <div className="space-y-3">
                            {historial.map((entrada) => (
                                <motion.div
                                    key={entrada.id}
                                    variants={itemVariants}
                                    className="p-4 rounded-xl bg-[#1c1b1c] hover:bg-[#201f20] transition-all flex items-center gap-4 group"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-[#ff5e00]/10 text-[#ff5e00] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <Dumbbell className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-[#e5e2e3] truncate capitalize">
                                            {entrada.rutinas?.nombre || 'Rutina'}
                                        </p>
                                        <p className="text-xs text-[#9ea3ae]">
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
                                            <span className="flex items-center gap-1 text-[#ff5e00] font-bold">
                                                <Flame className="w-3.5 h-3.5" />
                                                {entrada.calorias_quemadas || 0}
                                            </span>
                                            <span className="text-[#9ea3ae]">•</span>
                                            <span className="text-[#ff5e00] font-bold">{entrada.duracion_real || 0} min</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 rounded-full bg-[#2a2a2b] flex items-center justify-center mx-auto mb-4">
                            <CalendarDays className="w-8 h-8 text-[#9ea3ae]" />
                        </div>
                        <h3 className="text-[#e5e2e3] font-bold text-lg mb-2">Sin entrenamientos registrados</h3>
                        <p className="text-[#9ea3ae] text-sm">Completa tu primer entrenamiento y aparecerá aquí</p>
                        <Link
                            to="/biblioteca"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#ff5e00] text-white font-bold rounded-lg hover:brightness-110 transition-all mt-6"
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
