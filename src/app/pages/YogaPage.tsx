import React, { useEffect, useState, useMemo, useCallback, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useYoga } from '../context/YogaContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Play, Clock, Users, Sparkles, Heart, 
  Activity, Zap, Search, Flower2, SlidersHorizontal
} from 'lucide-react';

type Nivel = 'principiante' | 'intermedio' | 'avanzado';
type Objetivo = 'flexibilidad' | 'fuerza' | 'relajacion';

const NIVELES: { value: Nivel; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'principiante', label: 'Principiante', icon: <Users className="w-5 h-5" />, color: 'from-green-500/20 to-emerald-500/20 border-green-500/30' },
  { value: 'intermedio', label: 'Intermedio', icon: <Activity className="w-5 h-5" />, color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30' },
  { value: 'avanzado', label: 'Avanzado', icon: <Zap className="w-5 h-5" />, color: 'from-purple-500/20 to-violet-500/20 border-purple-500/30' },
];

const OBJETIVOS: { value: Objetivo; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'flexibilidad', label: 'Flexibilidad', icon: <Sparkles className="w-5 h-5" />, color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30' },
  { value: 'fuerza', label: 'Fuerza', icon: <Heart className="w-5 h-5" />, color: 'from-red-500/20 to-orange-500/20 border-red-500/30' },
  { value: 'relajacion', label: 'Relajación', icon: <Flower2 className="w-5 h-5" />, color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30' },
];

const getNivelColor = (nivel: string): string => {
  switch (nivel) {
    case 'principiante': return 'text-green-400 bg-green-500/20';
    case 'intermedio': return 'text-blue-400 bg-blue-500/20';
    case 'avanzado': return 'text-purple-400 bg-purple-500/20';
    default: return 'text-gray-400 bg-gray-500/20';
  }
};

const getObjetivoLabel = (objetivo: string | null | undefined): string => {
  switch (objetivo) {
    case 'flexibilidad': return 'Flexibilidad';
    case 'fuerza': return 'Fuerza';
    case 'relajacion': return 'Relajación';
    default: return objetivo ?? '';
  }
};

export default function YogaPage() {
  const navigate = useNavigate();
  const { rutinas, loadingRutinas, errorRutinas, fetchRutinas } = useYoga();
  const [nivelSeleccionado, setNivelSeleccionado] = useState<Nivel | null>(null);
  const [objetivoSeleccionado, setObjetivoSeleccionado] = useState<Objetivo | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetchRutinas();
  }, [fetchRutinas]);

  const handleSetNivel = useCallback((nivel: Nivel | null) => {
    startTransition(() => {
      setNivelSeleccionado(nivel);
    });
  }, []);

  const handleSetObjetivo = useCallback((objetivo: Objetivo | null) => {
    startTransition(() => {
      setObjetivoSeleccionado(objetivo);
    });
  }, []);

  const handleSetBusqueda = useCallback((value: string) => {
    setBusqueda(value);
  }, []);

  const handlePracticar = useCallback((rutinaId: string) => {
    navigate(`/yoga/practicar/${rutinaId}`);
  }, [navigate]);

  const handleNavigatePosiciones = useCallback(() => {
    navigate('/yoga/posiciones');
  }, [navigate]);

  const rutinasFiltradas = useMemo(() => {
    return rutinas.filter(rutina => {
      const matchesNivel = nivelSeleccionado ? rutina.nivel === nivelSeleccionado : true;
      const matchesObjetivo = objetivoSeleccionado ? rutina.objetivo === objetivoSeleccionado : true;
      const searchLower = busqueda.toLowerCase();
      const matchesBusqueda = busqueda 
        ? rutina.nombre.toLowerCase().includes(searchLower) ||
          (rutina.descripcion?.toLowerCase().includes(searchLower) ?? false)
        : true;
      return matchesNivel && matchesObjetivo && matchesBusqueda;
    });
  }, [rutinas, nivelSeleccionado, objetivoSeleccionado, busqueda]);

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'principiante': return 'text-green-400 bg-green-500/20';
      case 'intermedio': return 'text-blue-400 bg-blue-500/20';
      case 'avanzado': return 'text-purple-400 bg-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getObjetivoLabel = (objetivo: string | null | undefined) => {
    switch (objetivo) {
      case 'flexibilidad': return 'Flexibilidad';
      case 'fuerza': return 'Fuerza';
      case 'relajacion': return 'Relajación';
      default: return objetivo;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-orange-500/30 mb-5 shadow-[0_0_30px_rgba(249,115,22,0.15)]">
            <Flower2 className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">Yoga para la <span className="text-orange-500">Mente</span></h1>
          <p className="text-gray-400 font-medium">Encuentra tu equilibrio y paz interior.</p>
        </motion.div>

        {/* Filter & Search Section */}
        <div className="bg-[#111111] border border-white/5 rounded-xl p-6 sm:p-8 mb-8 backdrop-blur-sm relative overflow-hidden">
          {/* Subtle Background Glow for filters */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end relative z-10">
            {/* Search - Takes 5/12 columns on large screens */}
            <div className="lg:col-span-4 space-y-3">
              <label className="text-xs font-bold text-gray-500 flex items-center gap-2 ml-1">
                 <Search className="w-3 h-3" /> Buscador
              </label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
                <input
                  type="text"
                  placeholder="¿Qué buscas hoy?"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all"
                />
              </div>
            </div>

            {/* Filters Container - Takes 8/12 columns */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nivel Filter */}
              <div className="space-y-3 flex-1 min-w-[200px]">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <SlidersHorizontal className="w-3 h-3" /> Nivel
                  </label>
                  {nivelSeleccionado && (
                    <button 
                      onClick={() => setNivelSeleccionado(null)}
                      className="text-[10px] text-orange-500/60 hover:text-orange-500 font-bold uppercase transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {NIVELES.map((nivel) => (
                    <button
                      key={nivel.value}
                      onClick={() => handleSetNivel(nivelSeleccionado === nivel.value ? null : nivel.value)}
                      title={nivel.label}
                      className={`flex-1 flex items-center justify-center p-3 rounded-2xl border transition-all relative ${
                        nivelSeleccionado === nivel.value
                          ? `${nivel.color} text-white shadow-lg shadow-black/20`
                          : 'bg-black/20 border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
                      }`}
                    >
                      {nivel.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Objetivo Filter */}
              <div className="space-y-3 flex-1 min-w-[200px]">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold text-gray-500 flex items-center gap-2">
                    <Heart className="w-3 h-3" /> Objetivo
                  </label>
                  {objetivoSeleccionado && (
                    <button 
                      onClick={() => setObjetivoSeleccionado(null)}
                      className="text-[10px] text-orange-500/60 hover:text-orange-500 font-bold uppercase transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {OBJETIVOS.map((obj) => (
                    <button
                      key={obj.value}
                      onClick={() => handleSetObjetivo(objetivoSeleccionado === obj.value ? null : obj.value)}
                      title={obj.label}
                      className={`flex-1 flex items-center justify-center p-3 rounded-2xl border transition-all relative ${
                        objetivoSeleccionado === obj.value
                          ? `${obj.color} text-white shadow-lg shadow-black/20`
                          : 'bg-black/20 border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
                      }`}
                    >
                      {obj.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Library Link - More integrated */}
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              ¿Quieres aprender posiciones específicas?
            </p>
              <button
              onClick={handleNavigatePosiciones}
              className="flex items-center gap-2 px-6 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-xl text-sm font-bold hover:bg-orange-500 hover:text-black transition-all group"
            >
              Ver Biblioteca Posiciones
              <Flower2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loadingRutinas && (
          <div className="animate-pulse">
            <div className="h-6 w-32 bg-white/5 rounded-lg mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden h-64 flex flex-col">
                  {/* Image Placeholder */}
                  <div className="h-32 bg-gradient-to-br from-orange-500/10 to-purple-500/10" />
                  
                  {/* Content Placeholder */}
                  <div className="p-4 flex flex-col flex-1 justify-between">
                    <div>
                      <div className="flex gap-2 mb-3">
                        <div className="w-20 h-4 bg-white/10 rounded-full" />
                        <div className="w-24 h-4 bg-white/5 rounded-full" />
                      </div>
                      <div className="h-5 w-3/4 bg-white/10 rounded-md mb-2" />
                      <div className="h-4 w-full bg-white/5 rounded-md" />
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <div className="w-16 h-4 bg-white/5 rounded-md" />
                      <div className="w-24 h-8 bg-orange-500/10 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {errorRutinas && (
          <div className="flex justify-center py-12">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-[#141414] border border-red-500/20 rounded-[2.5rem] p-8 sm:p-10 text-center shadow-[0_15px_60px_rgba(239,68,68,0.1)] relative overflow-hidden"
            >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0" />
                <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <Activity className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Equilibrio Alterado</h2>
                <p className="text-gray-400 mb-8 leading-relaxed text-sm sm:text-base">
                  {errorRutinas.includes('Network') || errorRutinas.includes('fetch') 
                    ? 'No pudimos acceder al templo mental. Los servidores están desconectados.'
                    : errorRutinas}
                </p>
                <button 
                    onClick={() => fetchRutinas()}
                    className="w-full py-4 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_10px_20px_rgba(239,68,68,0.15)]"
                >
                    Recuperar Conexión
                </button>
            </motion.div>
          </div>
        )}

        {/* Rutinas Grid */}
        {!loadingRutinas && !errorRutinas && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Rutinas ({rutinasFiltradas.length})
            </h2>
            
            {rutinasFiltradas.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                <Flower2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No se encontraron rutinas</p>
                <p className="text-gray-500 text-sm mt-1">Intenta con otros filtros</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rutinasFiltradas.map((rutina, index) => (
                  <motion.div
                    key={rutina.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-orange-500/30 transition-colors group"
                  >
                    {/* Card Image Placeholder */}
                    <div className="h-32 bg-gradient-to-br from-orange-500/20 to-purple-500/20 flex items-center justify-center">
                      <Flower2 className="w-12 h-12 text-orange-400/50 group-hover:text-orange-400 transition-colors" />
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getNivelColor(rutina.nivel)}`}>
                          {rutina.nivel.charAt(0).toUpperCase() + rutina.nivel.slice(1)}
                        </span>
                        {rutina.objetivo && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-gray-300">
                            {getObjetivoLabel(rutina.objetivo)}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-1">{rutina.nombre}</h3>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                        {rutina.descripcion || 'Sin descripción'}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{rutina.duracion_minutos} min</span>
                        </div>
                        
                        <button
                          onClick={() => handlePracticar(rutina.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-black rounded-lg font-medium hover:bg-orange-400 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          <span>Iniciar</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
