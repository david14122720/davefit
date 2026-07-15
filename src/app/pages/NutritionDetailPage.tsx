import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronUp, UtensilsCrossed,
  Clock, Flame, Beef, Wheat, Droplets,
  CheckCircle, ArrowLeft, Loader2
} from 'lucide-react';
import { insforge } from '../../lib/insforge';
import type { Receta } from '../lib/adminApi';

const getDificultadColor = (dificultad: string): string => {
  switch (dificultad) {
    case 'facil': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'media': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'dificil': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const getDificultadLabel = (dificultad: string): string => {
  switch (dificultad) {
    case 'facil': return 'Fácil';
    case 'media': return 'Media';
    case 'dificil': return 'Difícil';
    default: return dificultad;
  }
};

export default function NutritionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [receta, setReceta] = useState<Receta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pasoExpandido, setPasoExpandido] = useState<number | null>(null);

  useEffect(() => {
    const fetchReceta = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await insforge.database
          .from('recetas')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw new Error(fetchError.message);
        setReceta(data);
      } catch (e: any) {
        console.error('[NutritionDetail] Error:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReceta();
  }, [id]);

  const togglePaso = (index: number) => {
    setPasoExpandido(pasoExpandido === index ? null : index);
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Skeleton Header */}
          <div className="animate-pulse mb-8">
            <div className="w-full h-48 sm:h-64 bg-white/5 rounded-2xl mb-6" />
            <div className="h-8 w-2/3 bg-white/10 rounded-lg mb-3" />
            <div className="flex gap-3">
              <div className="w-20 h-7 bg-white/10 rounded-full" />
              <div className="w-24 h-7 bg-white/5 rounded-full" />
            </div>
          </div>

          {/* Skeleton Macro Stats */}
          <div className="animate-pulse grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="w-8 h-8 bg-white/10 rounded-lg mx-auto mb-2" />
                <div className="w-12 h-6 bg-white/10 rounded mx-auto mb-1" />
                <div className="w-16 h-3 bg-white/5 rounded mx-auto" />
              </div>
            ))}
          </div>

          {/* Skeleton Description */}
          <div className="animate-pulse mb-8">
            <div className="h-5 w-24 bg-white/10 rounded-lg mb-3" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-white/5 rounded" />
              <div className="h-4 w-5/6 bg-white/5 rounded" />
              <div className="h-4 w-4/6 bg-white/5 rounded" />
            </div>
          </div>

          {/* Skeleton Ingredientes */}
          <div className="animate-pulse mb-8">
            <div className="h-5 w-28 bg-white/10 rounded-lg mb-3" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-white/10 rounded-full" />
                  <div className="h-4 w-3/4 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error or Not Found State
  if (error || !receta) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center py-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full bg-[#141414] border border-white/10 rounded-[2.5rem] p-8 sm:p-10 text-center"
            >
              <div className="w-24 h-24 bg-orange-500/10 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-orange-500/20">
                <UtensilsCrossed className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Receta no encontrada</h2>
              <p className="text-gray-400 mb-8 leading-relaxed text-sm">
                {error || 'La receta que buscas no existe o ha sido eliminada.'}
              </p>
              <button
                onClick={() => navigate('/nutricion')}
                className="w-full py-4 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-black border border-orange-500/20 font-black uppercase tracking-widest rounded-2xl transition-all"
              >
                Volver a recetas
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Receta Found
  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-6 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/nutricion')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Volver a recetas</span>
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Image */}
          {receta.imagen_url ? (
            <img
              src={receta.imagen_url}
              alt={receta.nombre}
              className="w-full h-48 sm:h-64 object-cover rounded-2xl border border-white/10 mb-6"
            />
          ) : (
            <div className="w-full h-48 sm:h-64 bg-gradient-to-br from-orange-500/20 to-green-500/20 rounded-2xl flex items-center justify-center border border-white/10 mb-6">
              <UtensilsCrossed className="w-16 h-16 text-orange-400/50" />
            </div>
          )}

          {/* Title & Badges */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">{receta.nombre}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border capitalize ${getDificultadColor(receta.dificultad)}`}>
                {getDificultadLabel(receta.dificultad)}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-white/10 text-gray-300 border border-white/10 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {receta.tiempo_preparacion} min
              </span>
            </div>
          </div>
        </motion.div>

        {/* Macro Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
        >
          {/* Calorías */}
          <div className="bg-[#111111] border border-white/10 rounded-xl p-4 text-center hover:border-orange-500/30 transition-colors">
            <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {receta.calorias ?? <span className="text-gray-500 text-lg">—</span>}
            </p>
            <p className="text-xs text-gray-500 mt-1">Calorías</p>
          </div>

          {/* Proteínas */}
          <div className="bg-[#111111] border border-white/10 rounded-xl p-4 text-center hover:border-red-500/30 transition-colors">
            <Beef className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {receta.proteinas ?? <span className="text-gray-500 text-lg">—</span>}
              {receta.proteinas && <span className="text-sm text-gray-400 ml-0.5">g</span>}
            </p>
            <p className="text-xs text-gray-500 mt-1">Proteínas</p>
          </div>

          {/* Carbohidratos */}
          <div className="bg-[#111111] border border-white/10 rounded-xl p-4 text-center hover:border-yellow-500/30 transition-colors">
            <Wheat className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {receta.carbos ?? <span className="text-gray-500 text-lg">—</span>}
              {receta.carbos && <span className="text-sm text-gray-400 ml-0.5">g</span>}
            </p>
            <p className="text-xs text-gray-500 mt-1">Carbohidratos</p>
          </div>

          {/* Grasas */}
          <div className="bg-[#111111] border border-white/10 rounded-xl p-4 text-center hover:border-blue-500/30 transition-colors">
            <Droplets className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {receta.grasas ?? <span className="text-gray-500 text-lg">—</span>}
              {receta.grasas && <span className="text-sm text-gray-400 ml-0.5">g</span>}
            </p>
            <p className="text-xs text-gray-500 mt-1">Grasas</p>
          </div>
        </motion.div>

        {/* Description */}
        {receta.descripcion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            <h2 className="text-lg font-semibold text-white mb-3">Descripción</h2>
            <p className="text-gray-300 leading-relaxed">{receta.descripcion}</p>
          </motion.div>
        )}

        {/* Ingredientes */}
        {receta.ingredientes && receta.ingredientes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-lg font-semibold text-white mb-3">Ingredientes</h2>
            <div className="bg-[#111111] border border-white/10 rounded-xl p-5">
              <ul className="space-y-3">
                {receta.ingredientes.map((ingrediente, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{ingrediente}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}

        {/* Instrucciones Accordion */}
        {receta.instrucciones && receta.instrucciones.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="text-lg font-semibold text-white mb-3">Instrucciones</h2>
            <div className="space-y-3">
              {receta.instrucciones.map((instruccion, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-[#111111] border border-white/10 rounded-xl overflow-hidden"
                >
                  {/* Paso Header */}
                  <button
                    onClick={() => togglePaso(index)}
                    className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-sm">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-white font-medium">Paso {index + 1}</span>
                    {pasoExpandido === index ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {/* Paso Content */}
                  <AnimatePresence>
                    {pasoExpandido === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10 overflow-hidden"
                      >
                        <div className="p-4">
                          <p className="text-gray-300 leading-relaxed">{instruccion}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
