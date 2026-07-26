import React, { useState, useEffect } from 'react';
import { insforge } from '../../lib/insforge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Clock, ChefHat, Lock, Crown,
  AlertCircle, RefreshCw, Sparkles, Flame, UtensilsCrossed
} from 'lucide-react';

// --- Types ---

interface Receta {
  id: string;
  nombre: string;
  descripcion?: string;
  ingredientes: string[];
  instrucciones: string[];
  tiempo_preparacion?: number;
  dificultad: 'facil' | 'media' | 'dificil';
  calorias?: number;
  proteinas?: number;
  carbos?: number;
  grasas?: number;
  imagen_url?: string | null;
}

// --- Filter Chips ---

const DIFFICULTY_CHIPS = [
  { value: 'todas', label: 'Todas' },
  { value: 'facil', label: 'Fáciles' },
  { value: 'media', label: 'Media' },
  { value: 'dificil', label: 'Difícil' },
];

// --- Badge Styles ---

const difficultyBadge: Record<string, { label: string; bg: string }> = {
  facil: { label: 'Fácil', bg: 'bg-green-500/20 text-green-400 border-green-500/30' },
  media: { label: 'Media', bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  dificil: { label: 'Difícil', bg: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

// --- Component ---

export default function NutritionPage() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterChip, setFilterChip] = useState('todas');
  const [busqueda, setBusqueda] = useState('');

  // --- Data Fetching ---

  useEffect(() => {
    const load = async () => {
      setLoaded(false);
      setError(null);
      try {
        const { data, error: fetchError } = await insforge.database
          .from('recetas')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        setRecetas(data || []);
      } catch (err: any) {
        console.error('[Nutrition] Error loading recetas:', err);
        setError('No pudimos cargar las recetas. Verifica tu conexión e inténtalo de nuevo.');
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, []);

  // --- Filtering ---

  const filtered = recetas.filter((receta) => {
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const matchesSearch =
        receta.nombre.toLowerCase().includes(q) ||
        (receta.descripcion?.toLowerCase().includes(q) ?? false);
      if (!matchesSearch) return false;
    }
    if (filterChip !== 'todas' && receta.dificultad !== filterChip) {
      return false;
    }
    return true;
  });

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

          {/* Search skeleton */}
          <div className="h-12 bg-white/5 rounded-lg mb-4" />

          {/* Filter chips skeleton */}
          <div className="flex gap-2 overflow-hidden mb-8">
            {[1, 2, 3, 4].map((i) => (
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
                  <div className="h-5 w-3/4 bg-white/5 rounded-lg" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-white/5 rounded-md" />
                    <div className="h-5 w-20 bg-white/5 rounded-md" />
                  </div>
                  <div className="h-10 w-full bg-white/5 rounded-md" />
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
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary-dark/20 flex items-center justify-center border border-primary/20 shrink-0">
          <ChefHat className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Biblioteca de <span className="text-primary">Recetas</span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-0.5">
            Descubre recetas saludables para complementar tu entrenamiento.
          </p>
        </div>
      </motion.div>

      {/* Filter Panel */}
      <div className="bg-surface border border-white/10 rounded-lg p-4 sm:p-5 mb-6 sm:mb-8">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar recetas por nombre o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-background-darker border border-white/10 rounded-lg text-white text-sm placeholder-text-muted focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {DIFFICULTY_CHIPS.map((chip) => {
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
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Active filter indicator */}
        {filterChip !== 'todas' && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Mostrando{' '}
              <span className="text-primary font-medium">{filtered.length}</span>{' '}
              {filtered.length === 1 ? 'receta' : 'recetas'}
            </p>
            <button
              onClick={() => setFilterChip('todas')}
              className="text-xs text-primary/60 hover:text-primary font-medium transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Recipe Grid */}
      <AnimatePresence mode="popLayout">
        {filtered.length > 0 ? (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {filtered.map((receta, idx) => (
              <motion.div
                layout
                key={receta.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
                className="group bg-surface rounded-lg overflow-hidden border border-white/5 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(255,107,0,0.12)] transition-all duration-500"
              >
                {/* Cover Image */}
                <div className="h-32 sm:h-40 relative overflow-hidden">
                  {receta.imagen_url ? (
                    <>
                      <img
                        src={receta.imagen_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-75"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.classList.add('bg-gradient-to-br', 'from-primary/30', 'to-black');
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                    </>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/5 to-black flex items-center justify-center">
                      <UtensilsCrossed className="w-12 h-12 text-primary/30" />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                    </div>
                  )}

                  {/* Difficulty badge */}
                  <div className="absolute top-2 left-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border backdrop-blur-md ${
                        difficultyBadge[receta.dificultad]?.bg || 'bg-white/10 text-white'
                      }`}
                    >
                      {difficultyBadge[receta.dificultad]?.label || receta.dificultad}
                    </span>
                  </div>

                  {/* Time pill */}
                  {receta.tiempo_preparacion && (
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-md px-2 py-0.5 text-[9px] font-medium text-white flex items-center gap-1">
                      <Clock className="w-3 h-3 text-primary" />
                      {receta.tiempo_preparacion} min
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <h3 className="font-bold text-white text-sm sm:text-base capitalize truncate">
                    {receta.nombre}
                  </h3>
                  {receta.descripcion && (
                    <p className="text-on-surface-variant text-xs sm:text-sm line-clamp-2 mt-1 leading-relaxed">
                      {receta.descripcion}
                    </p>
                  )}

                  {/* Stats chips */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {receta.tiempo_preparacion && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 text-on-surface-variant text-[10px] font-medium border border-white/5">
                        <Clock className="w-3 h-3" />
                        {receta.tiempo_preparacion} min
                      </span>
                    )}
                    {receta.calorias && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 text-on-surface-variant text-[10px] font-medium border border-white/5">
                        <Flame className="w-3 h-3" />
                        {receta.calorias} kcal
                      </span>
                    )}
                    {receta.proteinas && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 text-on-surface-variant text-[10px] font-medium border border-white/5">
                        <Sparkles className="w-3 h-3" />
                        {receta.proteinas}g prot
                      </span>
                    )}
                  </div>

                  {/* Ver Receta CTA */}
                  <div className="mt-4">
                    <span className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 bg-primary text-primary-on font-bold text-xs rounded-lg transition-all group-hover:bg-primary-hover group-hover:shadow-lg group-hover:shadow-primary/20 cursor-default">
                      <ChefHat className="w-3.5 h-3.5" />
                      Ver Receta
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          // --- Empty State ---
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            layout
            className="text-center py-16 bg-surface rounded-lg border border-dashed border-white/10"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {busqueda || filterChip !== 'todas'
                ? 'Sin resultados'
                : 'Pronto tendremos recetas disponibles'}
            </h3>
            <p className="text-on-surface-variant text-sm max-w-xs mx-auto">
              {busqueda
                ? 'Intenta con otro término de búsqueda.'
                : filterChip !== 'todas'
                  ? 'No encontramos recetas para este filtro.'
                  : 'Estamos preparando contenido nutritivo para potenciar tus entrenamientos.'}
            </p>

            {/* Premium Upgrade CTA */}
            {!busqueda && filterChip === 'todas' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-10 max-w-sm mx-auto bg-gradient-to-br from-primary/10 via-primary/5 to-surface border border-primary/20 rounded-lg p-6"
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-base font-bold text-white mb-2">
                  Desbloquea recetas premium
                </h4>
                <p className="text-on-surface-variant text-xs mb-5 leading-relaxed">
                  Accede a planes de alimentación personalizados, recetas exclusivas
                  y seguimiento nutricional avanzado.
                </p>
                <button className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-on font-bold text-sm rounded-lg hover:bg-primary-hover transition-all active:scale-95 shadow-lg shadow-primary/20">
                  <Crown className="w-4 h-4" />
                  Actualizar a Premium
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subscription CTA (always shown when there are recipes too) */}
      {filtered.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-gradient-to-br from-primary/10 via-primary/5 to-surface border border-primary/20 rounded-lg p-6 sm:p-8 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            Desbloquea todas las recetas premium
          </h3>
          <p className="text-on-surface-variant text-sm max-w-md mx-auto mb-5 leading-relaxed">
            Obtén acceso ilimitado a planes de alimentación personalizados,
            recetas exclusivas y seguimiento nutricional avanzado.
          </p>
          <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-on font-bold text-sm rounded-lg hover:bg-primary-hover transition-all active:scale-95 shadow-lg shadow-primary/20">
            <Lock className="w-4 h-4" />
            Actualizar a Premium
          </button>
        </motion.div>
      )}
    </div>
  );
}
