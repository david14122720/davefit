import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import { Play, X, Clock, Target, BarChart3, FilterX } from 'lucide-react';

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
    tonificar: 'Tonificar',
    ganar_fuerza: 'Ganar Fuerza',
};

const nivelColors: Record<string, string> = {
    principiante: 'bg-green-500/10 text-green-400 border-green-500/20',
    intermedio: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    avanzado: 'bg-red-500/10 text-red-400 border-red-500/20',
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
        <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Tu <span className="text-orange-500">Arsenal</span> de Guerra</h1>
                    <p className="text-gray-500 text-sm font-medium">Elige tu arma y domina el día.</p>
                </div>
                {durationFilter && (
                    <button 
                        onClick={clearDurationFilter}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-orange-500 hover:text-orange-400 hover:bg-white/10 rounded-xl text-sm font-bold transition-all animate-in fade-in slide-in-from-right-4"
                    >
                        <FilterX className="w-4 h-4" />
                        Express: ≤ {durationFilter} min (Quitar)
                    </button>
                )}
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
                {['todos', 'principiante', 'intermedio', 'avanzado'].map(f => (
                    <button 
                        key={f} 
                        onClick={() => setFilter(f)} 
                        className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-black uppercase tracking-widest flex-shrink-0 transition-all border ${filter === f ? 'bg-orange-500 text-black border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'bg-[#141414] text-gray-500 hover:text-white border-white/5'}`}
                    >
                        {f === 'todos' ? '🏋️ Todos' : f}
                    </button>
                ))}
            </div>

            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filtered.map((r) => (
                        <button
                            key={r.id}
                            onClick={() => handleOpenRutina(r)}
                            className="bg-[#141414] rounded-2xl overflow-hidden border border-white/5 hover:border-orange-500/30 transition-all hover:-translate-y-1 text-left group"
                        >
                            <div className="h-32 sm:h-40 bg-gradient-to-br from-orange-500/20 to-orange-400/5 flex items-center justify-center relative">
                                {r.imagen_cover_url ? (
                                    <img src={r.imagen_cover_url} alt={r.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <span className="text-5xl sm:text-6xl group-hover:scale-110 transition-transform">🏋️</span>
                                )}
                                <div className="absolute top-3 left-3">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter border ${nivelColors[r.nivel || 'principiante']}`}>
                                        {r.nivel || 'principiante'}
                                    </span>
                                </div>
                                <div className="absolute bottom-2 right-2">
                                    <span className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-orange-500" />
                                        {r.duracion_estimada || 30} MIN
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 sm:p-5">
                                <h3 className="font-bold text-white text-base sm:text-lg mb-1 line-clamp-1 group-hover:text-orange-500 transition-colors">{r.nombre}</h3>
                                {r.descripcion && <p className="text-gray-500 text-xs sm:text-sm line-clamp-2 mb-4 leading-relaxed">{r.descripcion}</p>}
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black p-1 uppercase text-gray-500 bg-white/5 rounded px-2">
                                        {objetivoLabels[r.objetivo || ''] || 'GENERAL'}
                                    </span>
                                    <div className="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Entrenar →
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-[#141414] rounded-3xl border border-dashed border-white/10 space-y-6">
                    <div className="text-7xl">⚔️</div>
                    <div className="max-w-md mx-auto px-4">
                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">
                            {durationFilter ? `Misión Fallida: Sin rutinas de ${durationFilter}m` : 'Tu arsenal está vacío'}
                        </h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            {durationFilter 
                                ? 'No hay batallas tan cortas en tu lista actual. Prueba un tiempo mayor o quita el filtro para ver todo tu arsenal.' 
                                : 'Parece que aún no tienes rutinas preparadas. Es hora de crear tu primer plan de ataque y empezar a ganar.'
                            }
                        </p>
                    </div>
                    {durationFilter && (
                        <button 
                            onClick={clearDurationFilter}
                            className="bg-orange-500 text-black px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-orange-400 transition-all shadow-[0_10px_30px_rgba(249,115,22,0.3)]"
                        >
                            Ver Todo el Arsenal
                        </button>
                    )}
                </div>
            )}

            {/* Modal de Rutina */}
            {selectedRutina && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#141414] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-white/5">
                            <div>
                                <h2 className="text-xl font-bold text-white">{selectedRutina.nombre}</h2>
                                {selectedRutina.descripcion && <p className="text-sm text-gray-400">{selectedRutina.descripcion}</p>}
                            </div>
                            <button onClick={handleCloseRutina} className="p-2 text-gray-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-4 px-4 py-3 bg-[#0a0a0a] border-b border-white/5">
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <BarChart3 className="w-4 h-4" />
                                <span className="capitalize">{selectedRutina.nivel}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <Target className="w-4 h-4" />
                                <span>{objetivoLabels[selectedRutina.objetivo || ''] || selectedRutina.objetivo}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <Clock className="w-4 h-4" />
                                <span>{selectedRutina.duracion_estimada || 30} min</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Ejercicios</h3>
                            
                            {loadingEjercicios ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : ejercicios.length > 0 ? (
                                <div className="space-y-3">
                                    {ejercicios.map((ej, index) => (
                                        <div key={ej.id} className="flex items-center gap-3 p-3 bg-[#0a0a0a] rounded-xl border border-white/5">
                                            <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">
                                                {index + 1}
                                            </span>
                                            {ej.ejercicio?.imagen_url ? (
                                                <img src={ej.ejercicio.imagen_url} alt={ej.ejercicio.nombre} className="w-10 h-10 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">💪</div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium text-sm truncate">{ej.ejercicio?.nombre || 'Ejercicio'}</p>
                                                <p className="text-gray-500 text-xs capitalize">{ej.ejercicio?.grupo_muscular}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-orange-400 font-bold">{ej.series} x {ej.repeticiones}</p>
                                                <p className="text-gray-500 text-xs">{ej.descanso_segundos}s descanso</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No hay ejercicios en esta rutina</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-white/5">
                            <button 
                                onClick={handleIniciarRutina}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors"
                            >
                                <Play className="w-5 h-5" />
                                Iniciar Rutina
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
