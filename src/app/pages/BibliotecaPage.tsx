import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Search, Clock, Sparkles,
    Dumbbell, Flower2, RefreshCw, AlertCircle,
    Zap, Heart, Wind, Moon, ChevronRight
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
    { value: 'todos', label: 'Todos', icon: <Sparkles className="w-4 h-4" /> },
    { value: 'fuerza', label: 'Fuerza', icon: <Zap className="w-4 h-4" /> },
    { value: 'cardio', label: 'Cardio', icon: <Heart className="w-4 h-4" /> },
    { value: 'yoga', label: 'Yoga', icon: <Flower2 className="w-4 h-4" /> },
    { value: 'flexibilidad', label: 'Flexibilidad', icon: <Wind className="w-4 h-4" /> },
    { value: 'relajacion', label: 'Relajación', icon: <Moon className="w-4 h-4" /> },
];

// --- Helpers ---

const nivelColors: Record<string, string> = {
    principiante: 'bg-green-500/20 text-green-400 border-green-500/30',
    intermedio: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    avanzado: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const nivelLabels: Record<string, string> = {
    principiante: 'Principiante',
    intermedio: 'Intermedio',
    avanzado: 'Avanzado',
};

const tipoBadge: Record<string, { label: string; bg: string }> = {
    ejercicio: {
        label: 'Ejercicio',
        bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    },
    yoga: {
        label: 'Yoga',
        bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    },
};

// --- Component ---

export default function BibliotecaPage() {
    const navigate = useNavigate();

    const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filterChip, setFilterChip] = useState('todos');
    const [busqueda, setBusqueda] = useState('');

    // --- Data Fetching ---

    useEffect(() => {
        const load = async () => {
            setLoaded(false);
            setError(null);
            try {
                const [rutinasResult, yogaResult] = await Promise.all([
                    insforge.database
                        .from('rutinas')
                        .select('*')
                        .eq('es_publica', true)
                        .order('created_at', { ascending: false }),
                    insforge.database
                        .from('yoga_rutinas')
                        .select('*')
                        .order('created_at', { ascending: false }),
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
            case 'todos':
                return true;
            case 'fuerza':
                return item.tipo === 'ejercicio' && item.objetivo === 'ganar_fuerza';
            case 'cardio':
                return item.tipo === 'ejercicio' && item.objetivo === 'mantener_forma';
            case 'yoga':
                return item.tipo === 'yoga';
            case 'flexibilidad':
                return item.tipo === 'yoga' && item.objetivo === 'tonificar';
            case 'relajacion':
                return item.tipo === 'yoga' && item.objetivo === 'estres';
            default:
                return true;
        }
    });

    // --- Card Click ---

    const handleCardClick = (item: CatalogoItem) => {
        if (item.tipo === 'yoga') {
            navigate(`/yoga/practicar/${item.id}`);
        } else {
            navigate(`/rutinas/practicar/${item.id}`);
        }
    };

    // --- Skeleton Loading ---

    if (!loaded) {
        return (
            <div className="w-full px-4 sm:px-6 pb-24 pt-2 max-w-6xl mx-auto">
                <div className="animate-pulse">
                    {/* Header skeleton */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-white/5" />
                        <div className="space-y-2">
                            <div className="h-6 w-48 bg-white/5 rounded-lg" />
                            <div className="h-4 w-64 bg-white/5 rounded-lg" />
                        </div>
                    </div>

                    {/* Filter panel skeleton */}
                    <div className="bg-[#111111] border border-white/5 rounded-xl p-5 mb-8">
                        <div className="h-12 bg-white/5 rounded-2xl mb-4" />
                        <div className="flex gap-2 overflow-hidden">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="h-10 w-24 bg-white/5 rounded-xl shrink-0" />
                            ))}
                        </div>
                    </div>

                    {/* Grid skeleton */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                                key={i}
                                className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden"
                            >
                                <div className="h-32 sm:h-40 bg-white/5" />
                                <div className="p-4 space-y-3">
                                    <div className="flex gap-2">
                                        <div className="h-5 w-16 bg-white/5 rounded-md" />
                                        <div className="h-5 w-20 bg-white/5 rounded-md" />
                                    </div>
                                    <div className="h-5 w-3/4 bg-white/5 rounded-lg" />
                                    <div className="h-3 w-full bg-white/5 rounded-md" />
                                    <div className="h-3 w-2/3 bg-white/5 rounded-md" />
                                    <div className="h-4 w-20 bg-white/5 rounded-md" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- Error State ---

    if (error) {
        return (
            <div className="w-full px-4 sm:px-6 pb-24 pt-12 max-w-6xl mx-auto flex justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-[#141414] border border-red-500/20 rounded-[2rem] p-8 text-center shadow-[0_15px_50px_rgba(239,68,68,0.1)]"
                >
                    <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
                        Error al cargar
                    </h2>
                    <p className="text-gray-400 mb-8 text-sm leading-relaxed">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-black font-bold rounded-xl transition-all shadow-[0_10px_20px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2"
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 pt-2">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-6 sm:mb-8"
            >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-purple-500/20 flex items-center justify-center border border-orange-500/20 shrink-0">
                    <BookOpen className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                        Biblioteca de <span className="text-orange-500">Rutinas</span>
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        Explora ejercicios y yoga. Todo en un solo lugar.
                    </p>
                </div>
            </motion.div>

            {/* Filter Panel - Glassmorphism */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 sm:p-5 mb-6 sm:mb-8">
                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar rutinas por nombre o descripción..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all"
                    />
                </div>

                {/* Filter Chips - Horizontal scroll on mobile */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {CHIPS.map((chip) => {
                        const isActive = filterChip === chip.value;
                        return (
                            <button
                                key={chip.value}
                                onClick={() => setFilterChip(chip.value)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border whitespace-nowrap text-sm font-medium transition-all shrink-0 ${
                                    isActive
                                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                }`}
                            >
                                {chip.icon}
                                {chip.label}
                            </button>
                        );
                    })}
                </div>

                {/* Active filter indicator */}
                {filterChip !== 'todos' && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                            Mostrando{' '}
                            <span className="text-orange-400 font-medium">{filtered.length}</span>{' '}
                            {filtered.length === 1 ? 'resultado' : 'resultados'}
                        </p>
                        <button
                            onClick={() => setFilterChip('todos')}
                            className="text-xs text-orange-400/60 hover:text-orange-400 font-medium transition-colors"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                )}
            </div>

            {/* Catalog Grid */}
            <AnimatePresence mode="popLayout">
                {filtered.length > 0 ? (
                    <motion.div
                        layout
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
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
                                className="group bg-[#141414] rounded-2xl overflow-hidden border border-white/5 hover:border-orange-500/30 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] transition-all duration-500 text-left w-full"
                            >
                                {/* Cover Image */}
                                <div className="h-32 sm:h-40 md:h-44 relative overflow-hidden">
                                    {item.imagen_cover_url ? (
                                        <>
                                            <img
                                                src={item.imagen_cover_url}
                                                alt=""
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-75"
                                                loading="lazy"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    const parent = e.currentTarget.parentElement;
                                                    if (parent) {
                                                        parent.classList.add(
                                                            'bg-gradient-to-br',
                                                            item.tipo === 'yoga'
                                                                ? 'from-purple-700/30 to-black'
                                                                : 'from-orange-700/30 to-black'
                                                        );
                                                    }
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
                                        </>
                                    ) : (
                                        <div
                                            className={`w-full h-full flex items-center justify-center ${
                                                item.tipo === 'yoga'
                                                    ? 'bg-gradient-to-br from-purple-700/30 via-purple-600/10 to-black'
                                                    : 'bg-gradient-to-br from-orange-700/30 via-orange-600/10 to-black'
                                            }`}
                                        >
                                            {item.tipo === 'yoga' ? (
                                                <Flower2 className="w-12 h-12 text-purple-400/30" />
                                            ) : (
                                                <Dumbbell className="w-12 h-12 text-orange-400/30" />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
                                        </div>
                                    )}

                                    {/* Badges */}
                                    <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
                                        {/* Type badge */}
                                        <span
                                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border backdrop-blur-md flex items-center gap-1 ${
                                                tipoBadge[item.tipo].bg
                                            }`}
                                        >
                                            {item.tipo === 'ejercicio' ? (
                                                <Dumbbell className="w-2.5 h-2.5" />
                                            ) : (
                                                <Flower2 className="w-2.5 h-2.5" />
                                            )}
                                            {tipoBadge[item.tipo].label}
                                        </span>

                                        {/* Level badge */}
                                        <span
                                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border backdrop-blur-md ${
                                                nivelColors[item.nivel || 'principiante']
                                            }`}
                                        >
                                            {nivelLabels[item.nivel || 'principiante']}
                                        </span>
                                    </div>

                                    {/* Duration pill */}
                                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-md px-2 py-0.5 text-[9px] font-medium text-white flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-orange-400" />
                                        {item.duracion_estimada || 30} min
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-4">
                                    <h3 className="font-bold text-white text-sm sm:text-base capitalize truncate">
                                        {item.nombre}
                                    </h3>
                                    {item.descripcion && (
                                        <p className="text-gray-500 text-xs sm:text-sm line-clamp-2 mt-1 leading-relaxed">
                                            {item.descripcion}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-[10px] font-medium text-gray-500 capitalize">
                                            {item.objetivo?.replace(/_/g, ' ') || 'General'}
                                        </span>
                                        <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-all flex items-center justify-center shrink-0">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        layout
                        className="text-center py-16 bg-[#111111] rounded-2xl border border-dashed border-white/10"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                            {filterChip === 'yoga' || filterChip === 'relajacion' || filterChip === 'flexibilidad' ? (
                                <Flower2 className="w-8 h-8 text-gray-500" />
                            ) : (
                                <Dumbbell className="w-8 h-8 text-gray-500" />
                            )}
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">No hay rutinas disponibles</h3>
                        <p className="text-gray-500 text-sm max-w-xs mx-auto">
                            {busqueda
                                ? 'Intenta con otro término de búsqueda.'
                                : filterChip !== 'todos'
                                  ? 'No encontramos rutinas para este filtro.'
                                  : 'El catálogo estará disponible próximamente.'}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
