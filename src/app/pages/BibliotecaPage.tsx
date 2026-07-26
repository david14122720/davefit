import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Search, Clock, Sparkles,
    Dumbbell, Flower2, RefreshCw, AlertCircle,
    Zap, Heart, Wind, ChevronRight, Activity
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
    { value: 'todo', label: 'Todo', icon: <Sparkles className="w-4 h-4" /> },
    { value: 'fuerza', label: 'Fuerza', icon: <Zap className="w-4 h-4" /> },
    { value: 'cardio', label: 'Cardio', icon: <Heart className="w-4 h-4" /> },
    { value: 'yoga', label: 'Yoga', icon: <Flower2 className="w-4 h-4" /> },
    { value: 'hiit', label: 'HIIT', icon: <Activity className="w-4 h-4" /> },
];

// --- Helpers ---

const equipoLabel = 'Sin equipo';

const nivelLabels: Record<string, string> = {
    principiante: 'Principiante',
    intermedio: 'Intermedio',
    avanzado: 'Avanzado',
};

const tipoBadge: Record<string, { label: string; bg: string; icon: React.ReactNode }> = {
    ejercicio: {
        label: 'Ejercicio',
        bg: 'bg-primary/20 text-primary border-primary/30',
        icon: <Dumbbell className="w-2.5 h-2.5" />,
    },
    yoga: {
        label: 'Yoga',
        bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        icon: <Flower2 className="w-2.5 h-2.5" />,
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
                        <div className="w-12 h-12 rounded-lg bg-white/5" />
                        <div className="space-y-2">
                            <div className="h-6 w-48 bg-white/5 rounded-lg" />
                            <div className="h-4 w-64 bg-white/5 rounded-lg" />
                        </div>
                    </div>

                    {/* Mentalidad widget skeleton */}
                    <div className="bg-white/5 rounded-lg p-6 mb-8">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-white/5" />
                            <div className="flex-1 space-y-2">
                                <div className="h-5 w-48 bg-white/5 rounded-lg" />
                                <div className="h-4 w-3/4 bg-white/5 rounded-lg" />
                                <div className="h-9 w-28 bg-white/5 rounded-lg" />
                            </div>
                        </div>
                    </div>

                    {/* Search skeleton */}
                    <div className="h-12 bg-white/5 rounded-lg mb-4" />

                    {/* Filter pills skeleton */}
                    <div className="flex gap-2 overflow-hidden mb-8">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-10 w-24 bg-white/5 rounded-lg shrink-0" />
                        ))}
                    </div>

                    {/* Grid skeleton */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="bg-surface rounded-lg border border-white/5 overflow-hidden"
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
                    className="max-w-md w-full bg-surface border border-red-500/20 rounded-lg p-8 text-center shadow-[0_15px_50px_rgba(239,68,68,0.1)]"
                >
                    <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
                        Error al cargar
                    </h2>
                    <p className="text-gray-400 mb-8 text-sm leading-relaxed">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-primary hover:bg-primary-hover text-black font-bold rounded-lg transition-all shadow-[0_10px_20px_rgba(255,107,0,0.3)] flex items-center justify-center gap-2"
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
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border border-primary/20 shrink-0">
                    <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                        Biblioteca de <span className="text-primary">Rutinas</span>
                    </h1>
                    <p className="text-on-surface-variant text-sm mt-0.5">
                        Explora ejercicios y yoga. Todo en un solo lugar.
                    </p>
                </div>
            </motion.div>

            {/* Momento de Mentalidad Widget */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-r from-primary/10 via-primary/5 to-surface border border-primary/20 rounded-lg p-5 mb-6"
            >
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Wind className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-base">Momento de Mentalidad</h3>
                        <p className="text-on-surface-variant text-sm mt-1 italic leading-relaxed">
                            {randomQuote()}
                        </p>
                        <button className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-black font-bold rounded-lg text-sm hover:bg-primary-hover transition-all active:scale-95 shadow-lg shadow-primary/20">
                            <Wind className="w-4 h-4" />
                            Comenzar
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Filter Panel */}
            <div className="bg-surface border border-white/10 rounded-lg p-4 sm:p-5 mb-6 sm:mb-8">
                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Buscar rutinas por nombre o descripción..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-background-darker border border-white/10 rounded-lg text-white text-sm placeholder-text-muted focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                </div>

                {/* Filter Chips */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {CHIPS.map((chip) => {
                        const isActive = filterChip === chip.value;
                        return (
                            <button
                                key={chip.value}
                                onClick={() => setFilterChip(chip.value)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border whitespace-nowrap text-sm font-medium transition-all shrink-0 ${
                                    isActive
                                        ? 'bg-primary text-primary-on border-primary shadow-lg shadow-primary/20'
                                        : 'bg-surface border-white/10 text-on-surface-variant hover:text-white hover:border-white/20'
                                }`}
                            >
                                {chip.icon}
                                {chip.label}
                            </button>
                        );
                    })}
                </div>

                {/* Active filter indicator */}
                {filterChip !== 'todo' && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                        <p className="text-xs text-text-muted">
                            Mostrando{' '}
                            <span className="text-primary font-medium">{filtered.length}</span>{' '}
                            {filtered.length === 1 ? 'resultado' : 'resultados'}
                        </p>
                        <button
                            onClick={() => setFilterChip('todo')}
                            className="text-xs text-primary/60 hover:text-primary font-medium transition-colors"
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
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
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
                                className="group bg-surface rounded-lg overflow-hidden border border-white/5 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(255,107,0,0.12)] transition-all duration-500 text-left w-full"
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
                                                                : 'from-primary/30 to-black'
                                                        );
                                                    }
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                                        </>
                                    ) : (
                                        <div
                                            className={`w-full h-full flex items-center justify-center ${
                                                item.tipo === 'yoga'
                                                    ? 'bg-gradient-to-br from-purple-700/30 via-purple-600/10 to-black'
                                                    : 'bg-gradient-to-br from-primary/30 via-primary/10 to-black'
                                            }`}
                                        >
                                            {item.tipo === 'yoga' ? (
                                                <Flower2 className="w-12 h-12 text-purple-400/30" />
                                            ) : (
                                                <Dumbbell className="w-12 h-12 text-primary/30" />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                                        </div>
                                    )}

                                    {/* Type badge overlay */}
                                    <div className="absolute top-2 left-2">
                                        <span
                                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border backdrop-blur-md flex items-center gap-1 ${
                                                tipoBadge[item.tipo].bg
                                            }`}
                                        >
                                            {tipoBadge[item.tipo].icon}
                                            {tipoBadge[item.tipo].label}
                                        </span>
                                    </div>

                                    {/* Duration pill */}
                                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-md px-2 py-0.5 text-[9px] font-medium text-white flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-primary" />
                                        {item.duracion_estimada || 30} min
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-4">
                                    <h3 className="font-bold text-white text-sm sm:text-base capitalize truncate">
                                        {item.nombre}
                                    </h3>
                                    {item.descripcion && (
                                        <p className="text-on-surface-variant text-xs sm:text-sm line-clamp-2 mt-1 leading-relaxed">
                                            {item.descripcion}
                                        </p>
                                    )}

                                    {/* Chips: difficulty + equipment */}
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 text-on-surface-variant text-[10px] font-medium border border-white/5">
                                            <Clock className="w-3 h-3" />
                                            {item.duracion_estimada || 30} min
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 text-on-surface-variant text-[10px] font-medium border border-white/5">
                                            <Activity className="w-3 h-3" />
                                            {nivelLabels[item.nivel || 'principiante']}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 text-on-surface-variant text-[10px] font-medium border border-white/5">
                                            <Dumbbell className="w-3 h-3" />
                                            {equipoLabel}
                                        </span>
                                    </div>

                                    {/* Probar Gratis CTA */}
                                    <div className="mt-4">
                                        <span className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 bg-primary text-primary-on font-bold text-xs rounded-lg transition-all group-hover:bg-primary-hover group-hover:shadow-lg group-hover:shadow-primary/20">
                                            Probar Gratis
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </span>
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
                        className="text-center py-16 bg-surface rounded-lg border border-dashed border-white/10"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                            {filterChip === 'yoga' || filterChip === 'hiit' ? (
                                <Flower2 className="w-8 h-8 text-text-muted" />
                            ) : (
                                <Dumbbell className="w-8 h-8 text-text-muted" />
                            )}
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">No hay rutinas disponibles</h3>
                        <p className="text-on-surface-variant text-sm max-w-xs mx-auto">
                            {busqueda
                                ? 'Intenta con otro término de búsqueda.'
                                : filterChip !== 'todo'
                                  ? 'No encontramos rutinas para este filtro.'
                                  : 'El catálogo estará disponible próximamente.'}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
