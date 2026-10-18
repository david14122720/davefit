import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import { queryWithRetry } from '../../lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Search, Clock, Sparkles,
    Dumbbell, Flower2, RefreshCw, AlertCircle,
    Zap, Heart, Activity, TrendingUp, SearchX, ArrowRight, X
} from 'lucide-react';

// --- Types ---

interface CatalogoItem {
    id: string;
    nombre: string;
    descripcion?: string;
    objetivo?: string;
    nivel?: string;
    duracion_estimada?: number;
    imagen_cover_url?: string | null;
    calorias_estimadas?: number;
    tipo: 'ejercicio' | 'yoga';
}

interface YogaRutinaDB {
    id: string;
    nombre: string;
    descripcion?: string;
    objetivo: string;
    nivel: string;
    duracion_minutos: number;
    calorias_estimadas?: number;
    created_at?: string;
}

// --- Filter Chips ---

interface ChipConfig {
    value: string;
    label: string;
    icon: React.ReactNode;
}

const CHIPS: ChipConfig[] = [
    { value: 'todo', label: 'Todo', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { value: 'fuerza', label: 'Fuerza', icon: <Zap className="w-3.5 h-3.5" /> },
    { value: 'cardio', label: 'Cardio', icon: <Heart className="w-3.5 h-3.5" /> },
    { value: 'yoga', label: 'Yoga', icon: <Flower2 className="w-3.5 h-3.5" /> },
    { value: 'hiit', label: 'HIIT', icon: <Activity className="w-3.5 h-3.5" /> },
];

// --- Helpers ---

const equipoLabel = 'Sin equipo';

const nivelLabels: Record<string, string> = {
    principiante: 'Principiante',
    intermedio: 'Intermedio',
    avanzado: 'Avanzado',
};

// Colores de badge del diseño Stitch: naranja para ejercicio, esmeralda para yoga
const tipoBadge: Record<string, { label: string; bg: string; icon: React.ReactNode }> = {
    ejercicio: {
        label: 'Ejercicio',
        bg: 'bg-[#ff5e00]/90',
        icon: <Dumbbell className="w-3.5 h-3.5" />,
    },
    yoga: {
        label: 'Yoga',
        bg: 'bg-emerald-600/90',
        icon: <Flower2 className="w-3.5 h-3.5" />,
    },
};

const randomQuote = () => {
    const quotes = [
        '"La disciplina es el puente entre metas y logros."',
        '"Tu único límite es el que te pones a ti mismo."',
        '"El éxito es la suma de pequeños esfuerzos repetidos día tras día."',
        '"No esperes a estar listo. Empieza y vuélvete bueno en el camino."',
        '"Los campeones siguen jugando hasta que lo hacen bien."',
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
};

// --- Component ---

export default function BibliotecaPage() {
    const navigate = useNavigate();

    const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filterChip, setFilterChip] = useState('todo');
    const [busqueda, setBusqueda] = useState('');

    // --- Data Fetching ---

    useEffect(() => {
        const load = async () => {
            setLoaded(false);
            setError(null);
            try {
                const [rutinasResult, yogaResult] = await Promise.all([
                    queryWithRetry<any[]>(() =>
                        // Cliente pesado: columnas explícitas (no select(*)) — reduce el payload JSON
                        // en la ruta crítica /biblioteca sin cambiar la API del backend (S6).
                        insforge.database.from('rutinas').select(
                            'id, nombre, descripcion, objetivo, nivel, duracion_estimada, imagen_cover_url, calorias_estimadas'
                        ).eq('es_publica', true).order('created_at', { ascending: false })
                    ),
                    queryWithRetry<any[]>(() =>
                        insforge.database.from('yoga_rutinas').select(
                            'id, nombre, descripcion, objetivo, nivel, duracion_minutos, calorias_estimadas'
                        ).order('created_at', { ascending: false })
                    ),
                ]);

                if (rutinasResult.error) throw rutinasResult.error;
                if (yogaResult.error) throw yogaResult.error;

                const ejerciciosNormalized: CatalogoItem[] = (rutinasResult.data || []).map((r: any) => ({
                    id: r.id,
                    nombre: r.nombre,
                    descripcion: r.descripcion,
                    objetivo: r.objetivo,
                    nivel: r.nivel,
                    duracion_estimada: r.duracion_estimada,
                    imagen_cover_url: r.imagen_cover_url,
                    calorias_estimadas: r.calorias_estimadas,
                    tipo: 'ejercicio' as const,
                }));

                const yogaNormalized: CatalogoItem[] = (yogaResult.data || []).map((y: YogaRutinaDB) => ({
                    id: y.id,
                    nombre: y.nombre,
                    descripcion: y.descripcion,
                    objetivo: y.objetivo,
                    nivel: y.nivel,
                    duracion_estimada: y.duracion_minutos,
                    imagen_cover_url: null,
                    calorias_estimadas: y.calorias_estimadas,
                    tipo: 'yoga' as const,
                }));

                // Combine: ejercicio first, then yoga
                setCatalogo([...ejerciciosNormalized, ...yogaNormalized]);
            } catch (err: any) {
                console.error('[Biblioteca] Error loading catalog:', err);
                setError('No pudimos cargar el catálogo. Verifica tu conexión e inténtalo de nuevo.');
            } finally {
                setLoaded(true);
            }
        };
        load();
    }, []);

    // --- Filtering ---

    const filtered = catalogo.filter((item) => {
        // Search filter
        if (busqueda) {
            const q = busqueda.toLowerCase();
            const matchesSearch =
                item.nombre.toLowerCase().includes(q) ||
                (item.descripcion?.toLowerCase().includes(q) ?? false);
            if (!matchesSearch) return false;
        }

        // Chip filter
        switch (filterChip) {
            case 'todo':
                return true;
            case 'fuerza':
                return item.tipo === 'ejercicio' && item.objetivo === 'ganar_fuerza';
            case 'cardio':
                return item.tipo === 'ejercicio' && item.objetivo === 'mantener_forma';
            case 'yoga':
                return item.tipo === 'yoga';
            case 'hiit':
                return item.tipo === 'ejercicio' && item.objetivo === 'perder_peso';
            default:
                return true;
        }
    });

    const hayFiltrosActivos = filterChip !== 'todo' || busqueda.trim() !== '';
    // Catálogo realmente vacío (sin filtros): copy informativo, no de "sin coincidencias"
    const catalogoVacioSinFiltros = catalogo.length === 0 && !hayFiltrosActivos;

    // --- Card Click ---

    const handleCardClick = (item: CatalogoItem) => {
        if (item.tipo === 'yoga') {
            navigate(`/yoga/practicar/${item.id}`);
        } else {
            navigate(`/rutinas/practicar/${item.id}`);
        }
    };

    // --- Reset filters (estado "Sin resultados") ---

    const resetFiltros = () => {
        setFilterChip('todo');
        setBusqueda('');
    };

    // --- Skeleton Loading ---

    if (!loaded) {
        return (
            <div className="w-full space-y-4 sm:space-y-5 pb-4 animate-pulse" aria-busy="true">
                {/* Header skeleton */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 shrink-0" />
                    <div className="space-y-2">
                        <div className="h-7 w-56 bg-white/5 rounded-lg" />
                        <div className="h-4 w-72 bg-white/5 rounded-lg" />
                    </div>
                </div>

                {/* Mindset banner skeleton */}
                <div className="h-16 bg-white/5 rounded-xl" />

                {/* Search + chips skeleton */}
                <div className="bg-white/5 rounded-xl p-3.5 sm:p-4 space-y-3">
                    <div className="h-10 bg-white/5 rounded-xl" />
                    <div className="flex gap-2 overflow-hidden">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-8 w-24 bg-white/5 rounded-full shrink-0" />
                        ))}
                    </div>
                </div>

                {/* Grid skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="bg-[#1c1b1c] border border-white/5 rounded-2xl overflow-hidden"
                        >
                            <div className="aspect-[4/3] sm:aspect-auto sm:h-56 bg-white/5" />
                            <div className="p-4 sm:p-6 space-y-3">
                                <div className="h-6 w-3/4 bg-white/5 rounded-lg" />
                                <div className="h-3 w-full bg-white/5 rounded-md" />
                                <div className="h-3 w-2/3 bg-white/5 rounded-md" />
                                <div className="h-10 w-full bg-white/5 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // --- Error State ---

    if (error) {
        return (
            <div className="w-full flex justify-center py-12">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-[#1c1b1c] border border-red-500/20 rounded-2xl p-8 text-center shadow-[0_15px_50px_rgba(239,68,68,0.1)]"
                >
                    <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
                        Error al cargar
                    </h2>
                    <p className="text-[#9ea3ae] mb-8 text-sm leading-relaxed">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-primary hover:bg-[#ea580c] text-white font-bold rounded-xl transition-all shadow-[0_10px_20px_rgba(255,94,0,0.3)] flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Reintentar
                    </button>
                </motion.div>
            </div>
        );
    }

    // --- Main Render ---

    return (
        <div className="w-full space-y-4 sm:space-y-5 pb-4">
            {/* ===== Encabezado + Momento de Mentalidad ===== */}
            <section className="space-y-3">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3"
                >
                    <div className="w-10 h-10 rounded-xl bg-[#ff5e00]/10 border border-[#ff5e00]/20 flex items-center justify-center text-[#fb923c] shrink-0">
                        <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                            Biblioteca de{' '}
                            <span className="bg-linear-to-r from-[#ff7a29] via-[#ff5e00] to-[#ff3d00] bg-clip-text text-transparent">
                                Rutinas
                            </span>
                        </h1>
                        <p className="text-[#9ea3ae] text-xs sm:text-sm">
                            Explora ejercicios y yoga. Todo en un solo lugar.
                        </p>
                    </div>
                </motion.div>

                {/* Momento de Mentalidad: card en móvil, banner en desktop */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative overflow-hidden rounded-xl bg-[#2a2a2b] sm:bg-linear-to-r sm:from-[#16161d] sm:via-[#1c1b1c] sm:to-[#16161d] sm:border sm:border-[#353436]/80 px-4 py-4 sm:px-4 sm:py-2.5 shadow-md"
                >
                    <div className="absolute -right-6 -bottom-6 sm:-right-10 sm:-bottom-10 w-28 h-28 sm:w-24 sm:h-24 bg-[#ff5e00]/10 rounded-full blur-xl pointer-events-none" />
                    <div className="relative z-10 flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full sm:rounded-lg bg-[#ff5e00]/15 border border-[#ff5e00]/30 flex items-center justify-center text-[#fb923c] shrink-0">
                            <Zap className="w-5 h-5 sm:w-4 sm:h-4" />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2.5 min-w-0">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#fb923c] shrink-0">
                                Momento de Mentalidad
                                <span
                                    className="sm:hidden inline-block w-1.5 h-1.5 rounded-full bg-[#ff5e00] animate-pulse"
                                    aria-hidden="true"
                                />
                            </span>
                            <p className="text-[#e5e2e3] font-medium italic text-sm leading-snug">
                                {randomQuote()}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* ===== Búsqueda + Filtros ===== */}
            <section
                className="space-y-3 bg-[#1c1b1c] border border-white/5 p-3.5 sm:p-4 rounded-xl shadow-md"
                aria-label="Búsqueda y filtros"
            >
                {/* Input de búsqueda inline */}
                <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5f636e]">
                        <Search className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar rutinas por nombre, grupo muscular o disciplina..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        aria-label="Buscar rutinas"
                        className="w-full bg-[#0e0e0f] text-[#e5e2e3] placeholder-[#5f636e] pl-10 pr-10 py-2.5 rounded-xl border border-[#353436]/80 focus:border-[#ff5e00] focus:ring-2 focus:ring-[#ff5e00]/20 text-xs sm:text-sm transition-all outline-none"
                    />
                    {busqueda && (
                        <button
                            onClick={() => setBusqueda('')}
                            aria-label="Limpiar búsqueda"
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#5f636e] hover:text-[#e5e2e3] transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Chips de disciplina con scroll horizontal sin scrollbar */}
                <div
                    className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    aria-label="Filtros de disciplina"
                >
                    {CHIPS.map((chip) => {
                        const isActive = filterChip === chip.value;
                        return (
                            <button
                                key={chip.value}
                                onClick={() => setFilterChip(chip.value)}
                                aria-pressed={isActive}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full sm:rounded-lg text-xs shrink-0 transition-all active:scale-95 ${
                                    isActive
                                        ? 'bg-primary text-[#531900] font-bold shadow-sm shadow-[#ff5e00]/25'
                                        : 'bg-[#201f20] sm:bg-[#16161d] text-[#9ea3ae] hover:text-white hover:bg-[#2a2a2b] font-medium border border-transparent sm:border-[#353436]'
                                }`}
                            >
                                <span className={isActive ? 'text-[#531900]' : 'text-[#fb923c]'}>
                                    {chip.icon}
                                </span>
                                {chip.label}
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Fila de afinidad: cuántos resultados hay y atajo para limpiar */}
            {hayFiltrosActivos && filtered.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-[#9ea3ae]">
                        Mostrando <span className="font-bold text-[#e5e2e3]">{filtered.length}</span>{' '}
                        {filtered.length === 1 ? 'resultado' : 'resultados'}
                    </p>
                    <button
                        onClick={resetFiltros}
                        className="text-xs font-bold text-[#ff5e00] hover:text-[#fb923c] transition-colors"
                    >
                        Limpiar filtros
                    </button>
                </div>
            )}

            {/* ===== Catálogo / Estado sin resultados ===== */}
            <AnimatePresence mode="popLayout">
                {filtered.length > 0 ? (
                    <motion.div
                        layout
                        aria-label="Catálogo de rutinas"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                    >
                        {filtered.map((item, idx) => (
                            <motion.button
                                layout
                                key={`${item.tipo}-${item.id}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ delay: idx * 0.04, duration: 0.3 }}
                                onClick={() => handleCardClick(item)}
                                className="group bg-[#1c1b1c] border border-white/5 hover:border-[#ff5e00]/45 rounded-2xl overflow-hidden flex flex-col text-left w-full transition-all duration-300 hover:shadow-[0_10px_30px_-10px_rgba(255,94,0,0.2)]"
                            >
                                {/* Cover con badge de tipo y chip de duración */}
                                <div className="relative aspect-[4/3] sm:aspect-auto sm:h-56 w-full bg-[#353436] overflow-hidden">
                                    {/* Fallback (visible si no hay cover o si la imagen falla) */}
                                    <div
                                        className={`absolute inset-0 flex items-center justify-center ${
                                            item.tipo === 'yoga'
                                                ? 'bg-linear-to-br from-emerald-700/30 via-emerald-600/10 to-[#0e0e0f]'
                                                : 'bg-linear-to-br from-[#ff5e00]/30 via-[#ff5e00]/10 to-[#0e0e0f]'
                                        }`}
                                    >
                                        {item.tipo === 'yoga' ? (
                                            <Flower2 className="w-12 h-12 text-emerald-400/30" />
                                        ) : (
                                            <Dumbbell className="w-12 h-12 text-[#ff5e00]/30" />
                                        )}
                                    </div>
                                    {item.imagen_cover_url && (
                                        <img
                                            src={item.imagen_cover_url}
                                            alt=""
                                            loading="lazy"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-linear-to-t from-[#1c1b1c] via-transparent to-black/40 pointer-events-none" />

                                    {/* Badge de tipo */}
                                    <span
                                        className={`absolute top-3 left-3 sm:top-4 sm:left-4 backdrop-blur-md text-white text-[10px] sm:text-[11px] font-extrabold uppercase px-2.5 py-1 sm:px-3 rounded-md tracking-wider shadow-sm flex items-center gap-1.5 ${
                                            tipoBadge[item.tipo].bg
                                        }`}
                                    >
                                        {tipoBadge[item.tipo].icon}
                                        {tipoBadge[item.tipo].label}
                                    </span>

                                    {/* Chip de duración: arriba-derecha en móvil, abajo-derecha en desktop */}
                                    <span className="absolute top-3 right-3 bottom-auto sm:top-auto sm:bottom-3 sm:right-4 bg-black/80 backdrop-blur-md text-[#e5e2e3] text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 border border-white/10">
                                        <Clock className="w-3.5 h-3.5 text-[#fb923c]" />
                                        {item.duracion_estimada || 30} min
                                    </span>
                                </div>

                                {/* Cuerpo de la card */}
                                <div className="p-4 sm:p-6 flex flex-col flex-grow justify-between space-y-4 sm:space-y-5">
                                    <div>
                                        <h3 className="text-base sm:text-xl font-bold text-white group-hover:text-[#fb923c] transition-colors line-clamp-2">
                                            {item.nombre}
                                        </h3>
                                        {item.descripcion && (
                                            <p className="mt-1.5 sm:mt-2 text-[#9ea3ae] text-xs sm:text-sm leading-relaxed line-clamp-2">
                                                {item.descripcion}
                                            </p>
                                        )}
                                    </div>

                                    {/* Tags: nivel + equipo */}
                                    <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs font-medium text-[#e5e2e3]">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2a2a2b] rounded-lg border border-white/5">
                                            <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#fb923c]" />
                                            {nivelLabels[item.nivel || 'principiante']}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2a2a2b] rounded-lg border border-white/5">
                                            <Dumbbell className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#fb923c]" />
                                            {equipoLabel}
                                        </span>
                                    </div>

                                    {/* CTA: conserva la navegación actual de la card */}
                                    <span className="w-full py-2.5 sm:py-3 px-4 bg-primary group-hover:bg-[#ea580c] active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl text-center flex items-center justify-center gap-2 shadow-lg shadow-[#ff5e00]/20 transition-all">
                                        Probar Gratis
                                        <ArrowRight className="w-4 h-4" />
                                    </span>
                                </div>
                            </motion.button>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        layout
                        className="flex flex-col items-center justify-center py-14 sm:py-16 text-center gap-2 bg-[#201f20]/50 rounded-xl p-6 sm:p-8 border border-dashed border-white/10"
                    >
                        <div className="w-14 h-14 rounded-full bg-[#2a2a2b] flex items-center justify-center text-[#ff5e00]">
                            <SearchX className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#e5e2e3]">
                                {catalogoVacioSinFiltros ? 'No hay rutinas disponibles' : 'Sin resultados encontrados'}
                            </h3>
                            <p className="text-[#9ea3ae] text-sm mt-1 max-w-md mx-auto leading-relaxed">
                                {catalogoVacioSinFiltros
                                    ? 'El catálogo estará disponible próximamente.'
                                    : 'No encontramos rutinas que coincidan con tus criterios. Intenta con otro término o limpia los filtros.'}
                            </p>
                        </div>
                        {!catalogoVacioSinFiltros && (
                            <button
                                onClick={resetFiltros}
                                className="mt-2 px-4 py-1.5 bg-[#353436] text-[#e5e2e3] rounded-lg text-sm font-medium hover:bg-primary hover:text-[#531900] transition-colors"
                            >
                                Restablecer filtros
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
