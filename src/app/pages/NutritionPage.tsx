import React, { useState, useEffect, useMemo } from 'react';
import { insforge } from '../../lib/insforge';
import { queryWithRetry } from '../../lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Clock, UtensilsCrossed, AlertCircle, RefreshCw, Flame,
  Apple, ArrowUpDown, ArrowRight, Lightbulb, Gauge,
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

// --- Filter Chips (dificultad existente) ---

const DIFFICULTY_CHIPS = [
  { value: 'todas', label: 'Todas' },
  { value: 'facil', label: 'Fáciles' },
  { value: 'media', label: 'Media' },
  { value: 'dificil', label: 'Difícil' },
];

// --- Badge Styles (colores actuales por dificultad, lenguaje del diseño) ---

const difficultyBadge: Record<string, { label: string; color: string }> = {
  facil: { label: 'Fácil', color: 'text-green-400' },
  media: { label: 'Media', color: 'text-yellow-400' },
  dificil: { label: 'Difícil', color: 'text-red-400' },
};

// --- Ordenamiento local (solo columnas reales de `recetas`) ---

const SORT_OPTIONS = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'proteinas', label: 'Mayor proteína' },
  { value: 'tiempo', label: 'Menor tiempo' },
  { value: 'calorias', label: 'Menos calorías' },
];

// Columnas de la barra de macros según cuántos campos reales existan
const MACRO_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

const SEARCH_PLACEHOLDER =
  'Buscar recetas por nombre, ingredientes o macros (ej. pollo, avena, post-entreno)...';

// --- Component ---

export default function NutritionPage() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterChip, setFilterChip] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('recientes');

  // --- Data Fetching (misma query y campos que antes) ---

  useEffect(() => {
    const load = async () => {
      setLoaded(false);
      setError(null);
      try {
        const { data, error: fetchError } = await queryWithRetry<any[]>(() =>
          insforge.database.from('recetas').select('*', { count: 'exact' }).order('created_at', { ascending: false })
        );

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

  // --- Filtrado + ordenamiento ---

  const filtered = useMemo(() => {
    const q = busqueda.toLowerCase();

    // Misma lógica de filtrado que la versión anterior
    const list = recetas.filter((receta) => {
      if (q) {
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

    // Ordenamiento con datos existentes; los campos ausentes van al final
    switch (orden) {
      case 'proteinas':
        return [...list].sort((a, b) => (b.proteinas ?? -1) - (a.proteinas ?? -1));
      case 'tiempo':
        return [...list].sort(
          (a, b) => (a.tiempo_preparacion ?? Infinity) - (b.tiempo_preparacion ?? Infinity)
        );
      case 'calorias':
        return [...list].sort((a, b) => (a.calorias ?? Infinity) - (b.calorias ?? Infinity));
      default:
        // 'recientes': conserva el orden de la consulta (created_at desc)
        return list;
    }
  }, [recetas, busqueda, filterChip, orden]);

  const hayFiltros = busqueda !== '' || filterChip !== 'todas';

  // --- Skeleton Loading ---

  if (!loaded) {
    return (
      <div className="w-full space-y-6 pb-4 animate-pulse" aria-busy="true">
        {/* Hero skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 shrink-0" />
            <div className="space-y-2">
              <div className="h-8 w-56 md:w-72 bg-white/5 rounded-lg" />
              <div className="h-4 w-64 md:w-96 bg-white/5 rounded-lg" />
            </div>
          </div>
          <div className="h-14 w-full max-w-md bg-white/5 rounded-xl" />
        </div>

        {/* Panel búsqueda + filtros skeleton */}
        <div className="bg-[#1c1b1c] border border-[#2a2a2b] rounded-2xl p-5 md:p-6 space-y-5">
          <div className="h-12 bg-white/5 rounded-xl" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-24 bg-white/5 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Grilla skeleton */}
        <div className="space-y-6">
          <div className="h-6 w-72 bg-white/5 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1c1b1c] border border-[#2a2a2b] rounded-2xl overflow-hidden">
                <div className="h-40 md:h-48 bg-white/5" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-3/4 bg-white/5 rounded-lg" />
                  <div className="h-3 w-full bg-white/5 rounded-lg" />
                  <div className="h-14 w-full bg-white/5 rounded-xl" />
                  <div className="h-10 w-full bg-white/5 rounded-xl" />
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
            className="w-full py-4 bg-primary hover:bg-primary-hover text-primary-on font-bold rounded-xl transition-all shadow-[0_10px_20px_rgba(255,94,0,0.3)] flex items-center justify-center gap-2"
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
    <div className="w-full space-y-5 md:space-y-8 pb-4">
      {/* ===== Hero: título + Tip Pro DaveFit ===== */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4 md:justify-start"
        >
          <div className="flex items-start gap-4">
            <div className="p-2.5 md:p-3.5 rounded-xl md:rounded-2xl bg-linear-to-br from-[#201f20] to-[#121316] border border-primary/30 text-primary shadow-[0_0_25px_-4px_rgba(255,94,0,0.25)] shrink-0">
              <UtensilsCrossed className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                Biblioteca de <span className="text-primary">Recetas</span>
              </h1>
              <p className="text-sm md:text-base text-[#9ea3ae] max-w-2xl mt-1">
                Descubre recetas saludables, económicas y rápidas para complementar tu entrenamiento y estilo de vida estudiantil.
              </p>
            </div>
          </div>
          {/* Círculo decorativo del diseño móvil */}
          <div className="md:hidden w-10 h-10 rounded-full bg-[#201f20] flex items-center justify-center text-primary shrink-0">
            <Apple className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-linear-to-r from-[#1c1b1c] to-[#121316] border border-[#2a2a2b] rounded-xl p-3.5 flex items-center gap-3 max-w-md shadow-sm"
        >
          <div className="p-2 bg-primary/15 rounded-lg text-primary shrink-0">
            <Lightbulb className="w-4 h-4" />
          </div>
          <p className="text-xs text-[#9ea3ae] leading-relaxed">
            <span className="text-primary font-semibold">Tip Pro DaveFit:</span>{' '}
            Prioriza 20-30g de proteína magra en tu ventana posterior al entrenamiento para optimizar la síntesis proteica.
          </p>
        </motion.div>
      </section>

      {/* ===== Buscador + filtros de dificultad ===== */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-[#1c1b1c] border border-[#2a2a2b] rounded-2xl p-5 md:p-6 space-y-5 shadow-xl"
      >
        {/* Buscador */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary/80">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder={SEARCH_PLACEHOLDER}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-[#0b0b0c] border border-[#2a2a2b] focus:border-primary focus:ring-1 focus:ring-primary text-sm text-[#e5e2e3] rounded-xl placeholder-[#5f636e] transition outline-none"
          />
        </div>

        {/* Chips de dificultad */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-[#5f636e] font-bold mr-1">
            Dificultad:
          </span>
          {DIFFICULTY_CHIPS.map((chip) => {
            const isActive = filterChip === chip.value;
            return (
              <button
                key={chip.value}
                onClick={() => setFilterChip(chip.value)}
                aria-pressed={isActive}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition active:scale-95 ${
                  isActive
                    ? 'bg-primary text-primary-on shadow-md shadow-primary/25'
                    : 'bg-[#201f20] text-[#9ea3ae] border border-[#2a2a2b] hover:border-[#353436] hover:text-white'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </motion.section>

      {/* ===== Catálogo ===== */}
      <section className="space-y-6">
        {/* Encabezado de sección + orden */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            Recetas Destacadas de la Semana
            <span className="text-xs font-normal text-[#9ea3ae] bg-[#2a2a2b] px-2 py-0.5 rounded-full ml-1 whitespace-nowrap">
              {filtered.length} disponibles
            </span>
          </h2>
          <div className="flex items-center gap-2 text-xs text-[#9ea3ae]">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#5f636e]" />
            <span>Ordenar por:</span>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              aria-label="Ordenar por"
              className="bg-[#1c1b1c] border border-[#353436] rounded-lg text-xs text-[#e5e2e3] py-1 px-2.5 focus:border-primary outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila de afinidad: cuántos resultados hay y atajo para limpiar */}
        {hayFiltros && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[#9ea3ae]">
              Mostrando <span className="font-bold text-[#e5e2e3]">{filtered.length}</span>{' '}
              {filtered.length === 1 ? 'resultado' : 'resultados'}
            </p>
            <button
              onClick={() => {
                setBusqueda('');
                setFilterChip('todas');
              }}
              className="text-xs font-bold text-[#ff5e00] hover:text-[#fb923c] transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filtered.map((receta, idx) => {
                const badge = difficultyBadge[receta.dificultad];

                // Fila de macros con los campos reales que existan
                const macros: { label: string; value: string; destacado?: boolean }[] = [];
                if (receta.calorias != null) macros.push({ label: 'Calorías', value: `${receta.calorias} kcal` });
                if (receta.proteinas != null) macros.push({ label: 'Proteínas', value: `${receta.proteinas}g`, destacado: true });
                if (receta.carbos != null) macros.push({ label: 'Carbohidratos', value: `${receta.carbos}g` });
                if (receta.grasas != null) macros.push({ label: 'Grasas', value: `${receta.grasas}g` });

                return (
                  <motion.article
                    layout
                    key={receta.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ delay: idx * 0.04, duration: 0.3 }}
                    className="group bg-[#1c1b1c] border border-[#2a2a2b] hover:border-primary/50 rounded-2xl overflow-hidden flex flex-col transition duration-300 hover:shadow-xl hover:shadow-primary/5"
                  >
                    {/* Cover con fallback de gradiente + icono */}
                    <div className="relative h-40 md:h-48 w-full overflow-hidden bg-[#0b0b0c]">
                      <div className="absolute inset-0 bg-linear-to-br from-primary/20 via-primary/5 to-[#0b0b0c] flex items-center justify-center">
                        <UtensilsCrossed className="w-12 h-12 text-primary/30" />
                      </div>
                      {receta.imagen_url && (
                        <img
                          src={receta.imagen_url}
                          alt={receta.nombre}
                          className="relative w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-[#1c1b1c] via-transparent to-black/40 pointer-events-none" />

                      {/* Duración + dificultad */}
                      <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-[#e5e2e3]">
                        {receta.tiempo_preparacion != null && (
                          <span className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-sm">
                            <Clock className="w-3 h-3 text-primary" />
                            {receta.tiempo_preparacion} min
                          </span>
                        )}
                        <span
                          className={`flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-sm ${
                            badge?.color ?? 'text-[#e5e2e3]'
                          }`}
                        >
                          <Gauge className="w-3 h-3" />
                          {badge?.label ?? receta.dificultad}
                        </span>
                      </div>
                    </div>

                    {/* Cuerpo de la card */}
                    <div className="p-4 md:p-5 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <h3 className="text-base md:text-lg font-bold text-white line-clamp-1 group-hover:text-primary transition">
                          {receta.nombre}
                        </h3>
                        {receta.descripcion && (
                          <p className="text-xs text-[#9ea3ae] mt-1 line-clamp-2 leading-relaxed">
                            {receta.descripcion}
                          </p>
                        )}
                      </div>

                      {/* Barra de macros (solo campos existentes) */}
                      {macros.length > 0 && (
                        <div
                          className={`grid ${MACRO_COLS[macros.length] ?? 'grid-cols-3'} gap-2 bg-[#201f20] p-2.5 rounded-xl border border-[#2a2a2b] text-center text-xs`}
                        >
                          {macros.map((macro, i) => (
                            <div key={macro.label} className={i > 0 ? 'border-l border-[#2a2a2b]' : ''}>
                              <span className="block text-[#5f636e] text-[10px]">{macro.label}</span>
                              <span className={`font-bold ${macro.destacado ? 'text-primary' : 'text-white'}`}>
                                {macro.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* CTA (elemento presentacional, igual que la versión anterior) */}
                      <span className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#2a2a2b] group-hover:bg-primary transition flex items-center justify-center gap-2 cursor-default">
                        Ver Receta Completa
                        <ArrowRight className="w-3.5 h-3.5 transition duration-200 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          ) : (
            // --- Empty States ---
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              layout
              className="text-center py-16 bg-[#1c1b1c] rounded-2xl border border-dashed border-[#2a2a2b]"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 text-primary">
                {hayFiltros ? <Search className="w-8 h-8" /> : <UtensilsCrossed className="w-8 h-8" />}
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                {hayFiltros ? 'Sin resultados' : 'Pronto tendremos recetas disponibles'}
              </h3>
              <p className="text-[#9ea3ae] text-sm max-w-xs mx-auto">
                {busqueda
                  ? 'Intenta con otro término de búsqueda.'
                  : filterChip !== 'todas'
                    ? 'No encontramos recetas para este filtro.'
                    : 'Estamos preparando contenido nutritivo para potenciar tus entrenamientos.'}
              </p>
              {hayFiltros && (
                <button
                  onClick={() => {
                    setBusqueda('');
                    setFilterChip('todas');
                  }}
                  className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-primary-on text-xs font-bold rounded-xl transition-all"
                >
                  Limpiar filtros
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
