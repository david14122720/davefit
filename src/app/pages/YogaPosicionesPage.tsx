import React, { useEffect, useState, useMemo } from 'react';
import { useYoga } from '../context/YogaContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, ChevronUp, Search, Flower2, 
  Clock, BarChart3, CheckCircle
} from 'lucide-react';

type Nivel = 'principiante' | 'intermedio' | 'avanzado';

const nivelColors: Record<Nivel, string> = {
  principiante: 'bg-green-500/20 text-green-400 border-green-500/30',
  intermedio: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  avanzado: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export default function YogaPosicionesPage() {
  const { posiciones, loadingPosiciones, fetchPosiciones } = useYoga();
  const [busqueda, setBusqueda] = useState('');
  const [filtroNivel, setFiltroNivel] = useState<Nivel | null>(null);
  const [posicionExpandida, setPosicionExpandida] = useState<string | null>(null);

  useEffect(() => {
    fetchPosiciones();
  }, [fetchPosiciones]);

  const posicionesFiltradas = useMemo(() => {
    return posiciones.filter(pos => {
      const matchesBusqueda = busqueda 
        ? pos.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          pos.nombre_sanscrito?.toLowerCase().includes(busqueda.toLowerCase()) ||
          pos.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
        : true;
      const matchesNivel = filtroNivel ? pos.nivel === filtroNivel : true;
      return matchesBusqueda && matchesNivel;
    });
  }, [posiciones, busqueda, filtroNivel]);

  const toggleExpandir = (id: string) => {
    setPosicionExpandida(posicionExpandida === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-orange-500/30 mb-4">
            <Flower2 className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Posiciones de Yoga</h1>
          <p className="text-gray-400">Aprende cada postura con instrucciones paso a paso</p>
        </motion.div>

        {/* Buscador */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar posiciones..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Filtros de Nivel */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFiltroNivel(null)}
            className={`px-4 py-2 rounded-full border transition-all ${
              filtroNivel === null
                ? 'bg-orange-500/20 border-orange-500/30 text-white'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            Todas
          </button>
          {(['principiante', 'intermedio', 'avanzado'] as Nivel[]).map((nivel) => (
            <button
              key={nivel}
              onClick={() => setFiltroNivel(filtroNivel === nivel ? null : nivel)}
              className={`px-4 py-2 rounded-full border transition-all capitalize ${
                filtroNivel === nivel
                  ? nivelColors[nivel]
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {nivel}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loadingPosiciones && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Posiciones List */}
        {!loadingPosiciones && (
          <div className="space-y-4">
            {posicionesFiltradas.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                <Flower2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No se encontraron posiciones</p>
              </div>
            ) : (
              posicionesFiltradas.map((posicion, index) => (
                <motion.div
                  key={posicion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                >
                  {/* Posición Header */}
                  <button
                    onClick={() => toggleExpandir(posicion.id)}
                    className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/5 transition-colors"
                  >
                    {/* Image */}
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-orange-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                      {posicion.imagen_url ? (
                        <img 
                          src={posicion.imagen_url} 
                          alt={posicion.nombre}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Flower2 className="w-8 h-8 text-orange-400/50" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {posicion.nombre}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${nivelColors[posicion.nivel]}`}>
                          {posicion.nivel}
                        </span>
                      </div>
                      {posicion.nombre_sanscrito && (
                        <p className="text-orange-400 text-sm">{posicion.nombre_sanscrito}</p>
                      )}
                      {posicion.descripcion && (
                        <p className="text-gray-400 text-sm truncate">{posicion.descripcion}</p>
                      )}
                    </div>

                    {/* Duration & Expand Icon */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {posicion.duracion_segundos_sugerida && (
                        <div className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{posicion.duracion_segundos_sugerida}s</span>
                        </div>
                      )}
                      {posicionExpandida === posicion.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {posicionExpandida === posicion.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10 overflow-hidden"
                      >
                        <div className="p-4 space-y-6">
                          {/* Descripción Completa */}
                          {posicion.descripcion && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" />
                                Descripción
                              </h4>
                              <p className="text-gray-300">{posicion.descripcion}</p>
                            </div>
                          )}

                          {/* Instrucciones Paso a Paso */}
                          {posicion.instrucciones && posicion.instrucciones.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Instrucciones
                              </h4>
                              <ol className="space-y-3">
                                {posicion.instrucciones.map((instruccion, i) => (
                                  <li key={i} className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-sm font-bold flex items-center justify-center">
                                      {i + 1}
                                    </span>
                                    <span className="text-gray-300">{instruccion}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {/* Beneficios */}
                          {posicion.beneficios && posicion.beneficios.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                                <Flower2 className="w-4 h-4" />
                                Beneficios
                              </h4>
                              <ul className="space-y-2">
                                {posicion.beneficios.map((beneficio, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-300">{beneficio}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
