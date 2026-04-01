import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import { processWorkoutCompletion, calcularCalorias } from '../../lib/gamification';
import { useAuth } from '../context/AuthContext';
import { useCelebration } from '../hooks/useCelebration';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Home,
  CheckCircle, Dumbbell, Volume2, VolumeX, Play, Pause,
  Timer, Flame, Trophy, Star
} from 'lucide-react';

interface Ejercicio {
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
    imagen_url?: string;
    video_url?: string;
    descripcion?: string;
    instrucciones?: string[];
  };
}

interface Rutina {
  id: string;
  nombre: string;
  descripcion?: string;
  objetivo?: string;
  nivel?: string;
  duracion_estimada?: number;
  calorias_estimadas?: number;
}

export default function WorkoutPracticePage() {
  const { rutinaId } = useParams<{ rutinaId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const startTimeRef = useRef<number>(Date.now());
  
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [xpResult, setXpResult] = useState<{xp_ganado: number; nivel_nuevo: number; subio_nivel: boolean} | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { celebrateCompletion, celebrateLevelUp } = useCelebration();

  useEffect(() => {
    const loadRutina = async () => {
      if (!rutinaId) {
        setError('ID de rutina no proporcionado');
        setLoading(false);
        return;
      }

      try {
        const { data: rutinaData, error: rutinaError } = await insforge.database
          .from('rutinas')
          .select('*')
          .eq('id', rutinaId)
          .maybeSingle();

        if (rutinaError) {
          console.error('[WorkoutPractice] Error loading rutina:', rutinaError);
          setError('Error al cargar la rutina');
          return;
        }

        if (!rutinaData) {
          setError('Rutina no encontrada');
          return;
        }

        setRutina(rutinaData);

        const { data: ejerciciosData, error: ejerciciosError } = await insforge.database
          .from('rutinas_ejercicios')
          .select('*')
          .eq('rutina_id', rutinaId)
          .order('orden', { ascending: true });

        if (ejerciciosError) {
          console.error('[WorkoutPractice] Error loading ejercicios:', ejerciciosError);
          setError('Error al cargar los ejercicios');
          return;
        }

        if (ejerciciosData && ejerciciosData.length > 0) {
          const ejercicioIds = ejerciciosData.map(e => e.ejercicio_id);
          
          const { data: ejerciciosInfo } = await insforge.database
            .from('ejercicios')
            .select('id, nombre, grupo_muscular, imagen_url, video_url, descripcion, instrucciones')
            .in('id', ejercicioIds);

          const ejerciciosMap = new Map(ejerciciosInfo?.map(e => [e.id, e]));

          const ejerciciosWithDetails = ejerciciosData.map(re => ({
            ...re,
            ejercicio: ejerciciosMap.get(re.ejercicio_id)
          }));

          setEjercicios(ejerciciosWithDetails);
        }
      } catch (err) {
        console.error('[WorkoutPractice] Error:', err);
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    loadRutina();
  }, [rutinaId]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex]);

  const saveToHistory = useCallback(async () => {
    if (!user || !rutinaId) return;

    const duracionReal = Math.round((Date.now() - startTimeRef.current) / 1000 / 60);
    // Calcular calorías: si la rutina tiene un promedio definido, escalamos por el tiempo real vs estimado.
    // De lo contrario, usamos la fórmula MET genérica.
    const duracionEstimada = rutina?.duracion_estimada || 30;
    const baseCalorias = rutina?.calorias_estimadas || 0;
    
    let caloriasQuemadas = 0;
    if (baseCalorias > 0) {
      // Escalamos proporcionalmente pero con un tope para evitar disparates (max 2x la base)
      const factorTiempo = Math.min(duracionReal / duracionEstimada, 2);
      caloriasQuemadas = Math.round(baseCalorias * factorTiempo);
    } else {
      caloriasQuemadas = calcularCalorias(duracionReal, 'ejercicio');
    }

    try {
      const { error: historyError } = await insforge.database
        .from('historial_entrenamientos')
        .insert([{
          usuario_id: user.id,
          rutina_id: rutinaId,
          duracion_real: duracionReal,
          calorias_quemadas: caloriasQuemadas,
          sensacion: 4
        }]);

      if (historyError) {
        console.error('[WorkoutPractice] Error saving to history:', historyError);
      } else {
        const result = await processWorkoutCompletion(user.id, duracionReal, 'ejercicio');
        if (result.success) {
          setXpResult({
            xp_ganado: result.calculation.xp_ganado,
            nivel_nuevo: result.calculation.nivel_nuevo,
            subio_nivel: result.calculation.subio_nivel,
          });
          celebrateCompletion();
          if (result.calculation.subio_nivel) {
            setTimeout(celebrateLevelUp, 500);
          }
        }
      }
    } catch (err) {
      console.error('[WorkoutPractice] Error saving history:', err);
    }
  }, [user, rutinaId, celebrateCompletion, celebrateLevelUp]);

  const handleSiguiente = useCallback(() => {
    setCompletedExercises(prev => {
      const newSet = new Set(prev);
      newSet.add(currentIndex);
      return newSet;
    });

    if (currentIndex + 1 >= ejercicios.length) {
      saveToHistory();
      setShowCompletionModal(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(true);
    }
  }, [currentIndex, ejercicios.length, saveToHistory]);

  const handleAnterior = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(true);
    }
  }, [currentIndex]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  }, [isMuted]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const handleVolverRutinas = useCallback(() => {
    navigate('/rutinas');
  }, [navigate]);

  const currentEjercicio = ejercicios[currentIndex];
  const totalEjercicios = ejercicios.length;
  const progreso = ((currentIndex + 1) / totalEjercicios) * 100;
  const hasVideo = currentEjercicio?.ejercicio?.video_url;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 animate-pulse">Cargando rutina...</p>
        </div>
      </div>
    );
  }

  if (error || !currentEjercicio) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
        <Dumbbell className="w-16 h-16 text-red-500 mb-4" />
        <p className="text-red-400 mb-6 text-center max-w-sm">{error || 'Ejercicio no encontrado'}</p>
        <button
          onClick={handleVolverRutinas}
          className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Rutinas
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col text-white">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] bg-orange-500/5" />
      </div>

      {/* Header */}
      <header className="relative z-40 px-4 py-3 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={handleVolverRutinas}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors p-2 -ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">Salir</span>
          </button>
          
          <div className="text-center flex-1 px-2">
            <h1 className="font-bold text-base sm:text-lg leading-tight truncate max-w-[200px] sm:max-w-xs mx-auto">
              {rutina?.nombre}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">
                {currentIndex + 1} / {totalEjercicios}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] font-bold text-gray-400 capitalize">
              {rutina?.nivel || 'principiante'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-6xl mx-auto mt-3">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400"
              initial={{ width: 0 }}
              animate={{ width: `${progreso}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center p-3 sm:p-6 lg:p-8 gap-4 lg:gap-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentEjercicio.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6"
          >
            {/* Media Section - Video/Image */}
            <div className="lg:col-span-7 order-1 lg:order-1">
              <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] rounded-2xl lg:rounded-3xl overflow-hidden bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border border-white/10 shadow-2xl">
                {hasVideo ? (
                  <>
                    <video
                      ref={videoRef}
                      src={currentEjercicio.ejercicio?.video_url}
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted={isMuted}
                      playsInline
                    />
                    {/* Video Controls Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        onClick={togglePlayPause}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
                      >
                        {isPlaying ? (
                          <Pause className="w-7 h-7 text-white" />
                        ) : (
                          <Play className="w-7 h-7 text-white ml-1" />
                        )}
                      </button>
                    </div>
                    {/* Mute Button */}
                    <button
                      onClick={toggleMute}
                      className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all border border-white/10"
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 text-white" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </>
                ) : currentEjercicio.ejercicio?.imagen_url ? (
                  <img 
                    src={currentEjercicio.ejercicio.imagen_url} 
                    alt={currentEjercicio.ejercicio.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Dumbbell className="w-20 sm:w-32 h-20 sm:h-32 text-orange-400/20" />
                  </div>
                )}
                
                {/* Exercise Name Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  <p className="text-white text-xs font-medium text-orange-400 uppercase tracking-wider">
                    {hasVideo ? 'Video de referencia' : 'Imagen del ejercicio'}
                  </p>
                </div>
              </div>

              {/* Instructions Card - Only visible on lg */}
              <div className="hidden lg:block mt-4 bg-white/5 border border-white/10 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Grupo muscular</h3>
                <p className="text-lg text-white capitalize">{currentEjercicio.ejercicio?.grupo_muscular || 'No especificado'}</p>
                {currentEjercicio.ejercicio?.descripcion && (
                  <p className="text-sm text-gray-400 mt-2 line-clamp-2">{currentEjercicio.ejercicio.descripcion}</p>
                )}
              </div>
            </div>

            {/* Info Section */}
            <div className="lg:col-span-5 order-2 lg:order-2 flex flex-col">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1 sm:mb-2 leading-tight">
                  {currentEjercicio.ejercicio?.nombre}
                </h2>
                <p className="text-base sm:text-lg text-orange-400 font-medium capitalize">
                  {currentEjercicio.ejercicio?.grupo_muscular}
                </p>
              </div>

              {/* Series & Reps Info - Compact for mobile */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-[#141414] border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1 sm:mb-2">
                    <Timer className="w-4 h-4 text-gray-500" />
                    <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Series</p>
                  </div>
                  <p className="text-2xl sm:text-4xl font-black text-white">{currentEjercicio.series}</p>
                </div>
                <div className="bg-[#141414] border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1 sm:mb-2">
                    <Flame className="w-4 h-4 text-gray-500" />
                    <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Reps</p>
                  </div>
                  <p className="text-2xl sm:text-4xl font-black text-white">{currentEjercicio.repeticiones}</p>
                </div>
              </div>

              {/* Descanso */}
              <div className="bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-xl sm:rounded-2xl p-4 mb-4 sm:mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Descanso después</span>
                  <span className="text-orange-400 font-bold text-lg">{currentEjercicio.descanso_segundos}s</span>
                </div>
              </div>

              {/* Instrucciones */}
              {currentEjercicio.ejercicio?.instrucciones && currentEjercicio.ejercicio.instrucciones.length > 0 && (
                <div className="mb-4 sm:mb-6 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Instrucciones</h3>
                  <ol className="space-y-2">
                    {currentEjercicio.ejercicio.instrucciones.map((instruccion, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span>{instruccion}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Mobile: Show group info */}
              <div className="lg:hidden mb-4 sm:mb-6 bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Grupo muscular</p>
                <p className="text-white capitalize">{currentEjercicio.ejercicio?.grupo_muscular || 'No especificado'}</p>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-3 items-center gap-2 sm:gap-4 mt-auto">
                <button
                  onClick={handleAnterior}
                  disabled={currentIndex === 0}
                  className="flex flex-col items-center gap-1 group disabled:opacity-30 transition-opacity"
                >
                  <div className="p-3 sm:p-4 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Atrás</span>
                </button>

                <button
                  onClick={handleSiguiente}
                  className="flex flex-col items-center gap-1 sm:gap-2 group"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 text-white flex items-center justify-center transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] active:scale-95">
                    <ChevronRight className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-widest">
                    {currentIndex + 1 >= totalEjercicios ? 'Fin' : 'Sig'}
                  </span>
                </button>

                <div className="flex flex-col items-center gap-1">
                  <div className="p-3 sm:p-4 rounded-full bg-green-500/10 border border-green-500/20">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">
                    {completedExercises.size}/{totalEjercicios}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0a0a0a]/95 flex items-center justify-center p-4 z-50 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#141414] border border-white/10 rounded-3xl p-8 sm:p-10 max-w-md w-full text-center shadow-[0_0_60px_rgba(34,197,94,0.15)]"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 sm:mb-8 relative">
                <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 animate-pulse" />
                <div className="relative w-full h-full rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-400" />
                </div>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 sm:mb-3">¡Completado!</h2>
              <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">
                <span className="text-white font-bold">{rutina?.nombre}</span>
              </p>

              {/* XP & Level Up Rewards */}
              {xpResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-6 sm:mb-8 p-4 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-2xl border border-orange-500/20"
                >
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 rounded-xl">
                      <Star className="w-5 h-5 text-yellow-400" />
                      <span className="text-white font-bold">+{xpResult.xp_ganado} XP</span>
                    </div>
                    {xpResult.subio_nivel && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-xl"
                      >
                        <Trophy className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 font-bold">Nivel {xpResult.nivel_nuevo}!</span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
              
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => {
                    setShowCompletionModal(false);
                    setXpResult(null);
                    setCurrentIndex(0);
                    setCompletedExercises(new Set());
                    startTimeRef.current = Date.now();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-orange-500 text-black rounded-xl sm:rounded-2xl font-bold sm:font-black hover:bg-orange-400 transition-all active:scale-[0.98]"
                >
                  <ChevronRight className="w-5 h-5" />
                  Repetir
                </button>
                <button
                  onClick={handleVolverRutinas}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-white/5 border border-white/10 text-white rounded-xl sm:rounded-2xl font-bold hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  <Home className="w-5 h-5" />
                  Volver
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
