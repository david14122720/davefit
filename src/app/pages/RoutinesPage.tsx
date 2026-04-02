import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Clock, Target, BarChart3, FilterX, Sparkles, ChevronRight, MonitorPlay } from 'lucide-react';

interface Rutina {
    id: string;
    nombre: string;
    descripcion?: string;
    objetivo?: string;
    nivel?: string;
    duracion_estimada?: number;
    tipo_lugar?: string;
    imagen_cover_url?: string;
    es_publica: boolean;
}

interface RutinaEjercicio {
    id: string;
    rutina_id: string;
    ejercicio_id: string;
    orden: number;
    series: number;
    repeticiones: string;
    descanso_segundos: number;
    ejercicio?: {
        nombre: string;
        grupo_muscular: string;
        imagen_url: string;
    };
}

const objetivoLabels: Record<string, string> = {
    mantener_forma: 'Mantener Forma',
    tonificar: 'Tonificar Cuerpo',
    ganar_fuerza: 'Ganar Fuerza',
};

const nivelColors: Record<string, string> = {
    principiante: 'from-green-500/20 to-emerald-500/10 text-green-400 border-green-500/20',
    intermedio: 'from-yellow-500/20 to-amber-500/10 text-yellow-400 border-yellow-500/20',
    avanzado: 'from-red-500/20 to-orange-500/10 text-orange-400 border-red-500/20',
};

export default function RoutinesPage() {
    const { accessToken } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const durationFilter = searchParams.get('duration');
    
    const [rutinas, setRutinas] = useState<Rutina[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [filter, setFilter] = useState('todos');
    const [selectedRutina, setSelectedRutina] = useState<Rutina | null>(null);
    const [ejercicios, setEjercicios] = useState<RutinaEjercicio[]>([]);
    const [loadingEjercicios, setLoadingEjercicios] = useState(false);

    useEffect(() => {
        if (!accessToken) return;
        const load = async () => {
            const { data } = await insforge.database
                .from('rutinas')
                .select('*')
                .order('created_at', { ascending: false });
            setRutinas(data || []);
            setLoaded(true);
        };
        load();
    }, [accessToken]);

    const loadEjerciciosRutina = async (rutinaId: string) => {
        setLoadingEjercicios(true);
        try {
            const { data } = await insforge.database
                .from('rutinas_ejercicios')
                .select('*')
                .eq('rutina_id', rutinaId)
                .order('orden', { ascending: true });
            
            if (data && data.length > 0) {
                const ejercicioIds = data.map(d => d.ejercicio_id);
                const { data: ejerciciosData } = await insforge.database
                    .from('ejercicios')
                    .select('id, nombre, grupo_muscular, imagen_url')
                    .in('id', ejercicioIds);
                
                const ejerciciosMap = new Map(ejerciciosData?.map(e => [e.id, e]));
                
                const ejerciciosWithDetails = data.map(re => ({
                    ...re,
                    ejercicio: ejerciciosMap.get(re.ejercicio_id)
                }));
                
                setEjercicios(ejerciciosWithDetails);
            } else {
                setEjercicios([]);
            }
        } catch (err) {
            console.error('Error loading ejercicios:', err);
            setEjercicios([]);
        } finally {
            setLoadingEjercicios(false);
        }
    };

    const handleOpenRutina = async (rutina: Rutina) => {
        setSelectedRutina(rutina);
        await loadEjerciciosRutina(rutina.id);
    };

    const handleCloseRutina = () => {
        setSelectedRutina(null);
        setEjercicios([]);
    };

    const handleIniciarRutina = () => {
        if (selectedRutina) {
            navigate(`/rutinas/practicar/${selectedRutina.id}`);
        }
    };

    const clearDurationFilter = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('duration');
        setSearchParams(newParams);
    };

    const filtered = rutinas
        .filter(r => filter === 'todos' ? true : r.nivel === filter)
        .filter(r => durationFilter ? (r.duracion_estimada || 30) <= parseInt(durationFilter) : true);

    if (!loaded) return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="animate-pulse space-y-8">
                <div className="h-12 w-1/2 bg-white/5 rounded-2xl" />
                <div className="flex gap-4">
                    <div className="h-10 w-24 bg-white/5 rounded-full" />
                    <div className="h-10 w-24 bg-white/5 rounded-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-72 bg-white/5 rounded-[2.5rem]" />)}
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-4 pb-32 pt-2 md:pt-4">
            {/* Header section - Balanced for mobile */}
            <div className="relative mb-8">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-orange-500/5 blur-[100px] rounded-full pointer-events-none" />
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-none">
                            Tu <span className="text-orange-500">Arsenal</span>
                        </h1>
                        <p className="text-gray-500 text-xs sm:text-sm font-medium mt-1.5 flex items-center gap-2">
                             <MonitorPlay className="w-3.5 h-3.5 text-orange-500/50" />
                            Selecciona tu plan de ataque hoy.
                        </p>
                    </div>
                    {durationFilter && (
                        <motion.button 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={clearDurationFilter}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all"
                        >
                            Express: ≤ {durationFilter}m (X)
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Sticky Filters - Realigned with more mobile padding */}
            <div className="flex gap-2.5 mb-8 overflow-x-auto pb-4 scrollbar-none scroll-smooth sticky top-[-4px] bg-[#0a0a0a]/90 backdrop-blur-3xl z-20 -mx-4 px-4 pt-2">
                {['todos', 'principiante', 'intermedio', 'avanzado'].map(f => (
                    <button 
                        key={f} 
                        onClick={() => setFilter(f)} 
                        className={`px-6 py-2.5 rounded-full text-xs font-bold capitalize tracking-tight flex-shrink-0 transition-all duration-300 border ${
                            filter === f 
                                ? 'bg-orange-500 text-black border-orange-500 shadow-[0_8px_20px_rgba(249,115,22,0.3)] scale-105' 
                                : 'bg-[#141414] text-gray-500 border-white/5 hover:border-white/10'
                        }`}
                    >
                        {f === 'todos' ? '⚔️ Todos' : f}
                    </button>
                ))}
            </div>

            {/* Routines Grid - Optimized for mobile */}
            <AnimatePresence mode="popLayout">
                {filtered.length > 0 ? (
                    <motion.div
                        layout
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                    >
                        {filtered.map((r, idx) => (
                            <motion.button
                                layout
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={r.id}
                                onClick={() => handleOpenRutina(r)}
                                className="group relative bg-[#141414]/50 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-orange-500/30 transition-all duration-500 text-left shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex flex-col min-h-[280px] sm:min-h-[320px]"
                            >
                                {/* Card Cover */}
                                <div className="h-36 sm:h-44 relative overflow-hidden flex-shrink-0">
                                    {r.imagen_cover_url ? (
                                        <img
                                            src={r.imagen_cover_url}
                                            alt=""
                                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 brightness-[0.7] group-hover:brightness-[0.9]"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-tr from-orange-900/40 via-transparent to-transparent" />
                                    )}

                                    {!r.imagen_cover_url && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                            <Sparkles className="w-16 h-16 sm:w-20 sm:h-20 text-orange-500" />
                                        </div>
                                    )}

                                    {/* Glass Badges */}
                                    <div className="absolute top-3 left-3 right-3 sm:top-5 sm:left-5 sm:right-5 flex justify-between items-start">
                                        <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] border backdrop-blur-xl shadow-2xl ${nivelColors[r.nivel || 'principiante']}`}>
                                            {r.nivel || 'principiante'}
                                        </span>
                                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg px-2 py-0.5 sm:px-2.5 sm:py-1 flex items-center gap-1 shadow-2xl">
                                            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500" />
                                            <span className="text-[9px] sm:text-[10px] font-bold text-white uppercase">{r.duracion_estimada || 30}m</span>
                                        </div>
                                    </div>

                                    {/* Bottom Overlay Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent opacity-90" />
                                </div>

                                {/* Content Details */}
                                <div className="p-4 sm:p-6 pt-2 flex-1 flex flex-col">
                                    <h3 className="font-bold text-white text-lg sm:text-xl capitalize tracking-tight group-hover:text-orange-500 transition-colors line-clamp-1">
                                        {r.nombre}
                                    </h3>

                                    {r.descripcion && (
                                        <p className="text-gray-500 text-xs sm:text-sm line-clamp-2 mt-1.5 mb-4 font-medium leading-relaxed">
                                            {r.descripcion}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between mt-auto pt-2">
                                        <div className="bg-white/5 border border-white/5 rounded-lg sm:rounded-xl px-2.5 py-1 sm:px-3 sm:py-1.5 flex items-center gap-1.5 sm:gap-2">
                                            <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500/50" />
                                            <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                {objetivoLabels[r.objetivo || ''] || 'GENERAL'}
                                            </span>
                                        </div>
                                        <div className="p-2 sm:p-2.5 rounded-full bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-all duration-300 shadow-xl group-hover:shadow-orange-500/20">
                                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
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
                        className="text-center py-20 bg-[#111111] rounded-[3rem] border border-dashed border-white/10"
                    >
                        <div className="text-6xl mb-6">🏜️</div>
                        <h3 className="text-xl font-bold text-white mb-2">Arsenal en mantenimiento</h3>
                        <p className="text-gray-500 text-sm max-w-xs mx-auto">No hay rutinas que coincidan con tu radar actual.</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Detail Optimization */}
            <AnimatePresence>
                {selectedRutina && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCloseRutina}
                            className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
                        />
                        
                        <motion.div 
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="relative bg-[#111111] border-t sm:border border-white/10 w-full max-w-2xl h-[94vh] sm:h-auto sm:max-h-[85vh] rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.5)]"
                        >
                            {/* Draggable indicator for mobile */}
                            <div className="sm:hidden w-12 h-1.5 bg-white/10 rounded-full mx-auto my-3 flex-shrink-0" />

                            <div className="relative h-44 sm:h-56 shrink-0">
                                {selectedRutina.imagen_cover_url ? (
                                    <img src={selectedRutina.imagen_cover_url} alt="" className="w-full h-full object-cover brightness-[0.5]" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-orange-600/30 to-black" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#111111] to-transparent" />
                                
                                <button 
                                    onClick={handleCloseRutina} 
                                    className="absolute top-5 right-5 p-2 bg-black/40 backdrop-blur-xl rounded-full text-white border border-white/10"
                                >
                                    <X className="w-6 h-6" />
                                </button>

                                <div className="absolute bottom-6 left-8 right-8">
                                    <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight capitalize">{selectedRutina.nombre}</h2>
                                    {selectedRutina.descripcion && <p className="text-gray-400 text-sm mt-2 line-clamp-1">{selectedRutina.descripcion}</p>}
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                                <div className="grid grid-cols-3 gap-3 mb-8">
                                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center gap-1.5">
                                        <BarChart3 className="w-4 h-4 text-orange-500" />
                                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">Nivel</span>
                                        <span className="text-xs text-white font-bold capitalize">{selectedRutina.nivel}</span>
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center gap-1.5">
                                        <Target className="w-4 h-4 text-orange-500" />
                                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">Meta</span>
                                        <span className="text-xs text-white font-bold">{objetivoLabels[selectedRutina.objetivo || '']?.split(' ')[0] || 'Gral.'}</span>
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-orange-500" />
                                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">Tiempo</span>
                                        <span className="text-xs text-white font-bold">{selectedRutina.duracion_estimada || 30}m</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-2 px-1">Ejercicios ({ejercicios.length})</h3>
                                    
                                    {loadingEjercicios ? (
                                        <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
                                    ) : (
                                        ejercicios.map((ej, index) => (
                                            <div key={ej.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-black text-sm shrink-0">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-bold text-sm truncate capitalize">{ej.ejercicio?.nombre}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">{ej.ejercicio?.grupo_muscular}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-orange-500 font-black text-sm">{ej.series} x {ej.repeticiones}</p>
                                                    <p className="text-[9px] text-gray-600 font-bold">{ej.descanso_segundos}s desc.</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="p-6 bg-[#0a0a0a]/80 backdrop-blur-3xl border-t border-white/5">
                                <button 
                                    onClick={handleIniciarRutina}
                                    className="w-full h-14 bg-orange-500 hover:bg-orange-400 text-black rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-[0_15px_30px_rgba(249,115,22,0.3)] flex items-center justify-center gap-3"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                    Empezar Entrenamiento
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
