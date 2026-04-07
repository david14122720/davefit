import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useYoga } from '../context/YogaContext';
import { useAuth } from '../context/AuthContext';
import { useCelebration } from '../hooks/useCelebration';
import { processWorkoutCompletion, calcularCalorias } from '../../lib/gamification';
import YogaTimer from '../components/YogaTimer';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  ArrowLeft, Play, Pause, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, Home, RotateCcw,
  Sparkles, Flower2, Star, Trophy
} from 'lucide-react';

const REST_TIME = 10; // seconds

export default function YogaPracticePage() {
  const { rutinaId } = useParams<{ rutinaId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    rutinaActual, 
    loadingRutinas, 
    errorRutinas, 
    fetchRutina, 
    session, 
    startSession,
    nextPosition,
    prevPosition,
    completeSession,
    resetSession
  } = useYoga();
  const { celebrateCompletion, celebrateLevelUp } = useCelebration();
  
  const [tiempoRestante, setTiempoRestante] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [xpResult, setXpResult] = useState<{xp_ganado: number; nivel_nuevo: number; subio_nivel: boolean} | null>(null);

  useEffect(() => {
    if (rutinaId) {
      fetchRutina(rutinaId);
    }
    return () => resetSession();
  }, [rutinaId, fetchRutina, resetSession]);

  useEffect(() => {
    if (rutinaActual && !session.rutina) {
      startSession(rutinaActual);
      const primeraPosicion = rutinaActual.posiciones?.[0];
      if (primeraPosicion) {
        setTiempoRestante(primeraPosicion.duracion_segundos ?? 30);
      }
    }
  }, [rutinaActual, session.rutina, startSession]);

  const totalPosiciones = session.rutina?.posiciones?.length || 0;
  const posicionActual = session.rutina?.posiciones?.[session.posicionIndex];
  const siguientePosicion = session.rutina?.posiciones?.[session.posicionIndex + 1];

  const handleTimerComplete = useCallback(() => {
    setIsTimerRunning(false);
    
    if (isResting) {
      // Finished resting, start next pose
      setIsResting(false);
      const pose = session.rutina?.posiciones?.[session.posicionIndex];
      if (pose) {
        setTiempoRestante(pose.duracion_segundos ?? 30);
        setIsTimerRunning(true);
      }
    } else {
      // Finished pose
      if (session.posicionIndex + 1 >= totalPosiciones) {
        handleFinalizar();
      } else {
        // Prepare rest
        setIsResting(true);
        setTiempoRestante(REST_TIME);
        setIsTimerRunning(true);
        nextPosition();
        toast.success('¡Posición completada!', {
          description: `Descansa ${REST_TIME} segundos...`,
          icon: <Sparkles className="w-4 h-4 text-orange-400" />
        });
      }
    }
  }, [isResting, session.posicionIndex, totalPosiciones, session.rutina, nextPosition]);

  const handleSiguiente = useCallback(() => {
    setIsTimerRunning(false);
    setIsResting(false);
    
    if (session.posicionIndex + 1 >= totalPosiciones) {
      handleFinalizar();
    } else {
      nextPosition();
      const next = session.rutina?.posiciones?.[session.posicionIndex + 1];
      if (next) {
        setTiempoRestante(next.duracion_segundos ?? 30);
      }
    }
  }, [session.posicionIndex, totalPosiciones, session.rutina, nextPosition]);

  const handleAnterior = useCallback(() => {
    setIsTimerRunning(false);
    setIsResting(false);
    if (session.posicionIndex > 0) {
      prevPosition();
      const prev = session.rutina?.posiciones?.[session.posicionIndex - 1];
      if (prev) {
        setTiempoRestante(prev.duracion_segundos ?? 30);
      }
    }
  }, [session.posicionIndex, session.rutina, prevPosition]);

  const handleFinalizar = useCallback(async () => {
    setIsTimerRunning(false);
    const result = await completeSession();
    if (!result.error) {
      if (user && session.rutina && session.startTime) {
        const duracionMin = Math.floor((Date.now() - session.startTime.getTime()) / 1000 / 60);
        const xpResult = await processWorkoutCompletion(user.id, Math.max(duracionMin, 1), 'yoga');
        if (xpResult.success) {
          setXpResult({
            xp_ganado: xpResult.calculation.xp_ganado,
            nivel_nuevo: xpResult.calculation.nivel_nuevo,
            subio_nivel: xpResult.calculation.subio_nivel,
          });
          celebrateCompletion();
          if (xpResult.calculation.subio_nivel) {
            setTimeout(celebrateLevelUp, 500);
          }
        }
      }
      setShowCompletionModal(true);
    } else {
      toast.error('Error al guardar el progreso');
    }
  }, [completeSession, user, session.rutina, session.startTime, celebrateCompletion, celebrateLevelUp]);

  const handleVolverInicio = useCallback(() => {
    resetSession();
    navigate('/yoga');
  }, [resetSession, navigate]);

  if (loadingRutinas) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 animate-pulse">Preparando tu espacio...</p>
        </div>
      </div>
    );
  }

  if (errorRutinas) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <p className="text-red-400 mb-6 text-center max-w-sm">{errorRutinas}</p>
        <button
          onClick={() => navigate('/yoga')}
          className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Yoga
        </button>
      </div>
    );
  }

  if (!posicionActual) {
    return null;
  }

  const progreso = ((session.posicionIndex + (isResting ? 0 : 1)) / totalPosiciones) * 100;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col text-white">
      {/* Header / Nav */}
      <header className="px-4 py-4 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={handleVolverInicio}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors p-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Finalizar</span>
          </button>
          
          <div className="text-center">
            <h1 className="font-bold text-lg leading-tight truncate max-w-[150px] sm:max-w-xs px-2">
              {session.rutina?.nombre}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-0.5">
               <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">
                 {isResting ? 'Descanso' : 'En práctica'}
               </span>
               <span className="text-gray-600">•</span>
               <span className="text-xs text-gray-400">
                 {session.posicionIndex + (isResting ? 0 : 1)} / {totalPosiciones}
               </span>
            </div>
          </div>

          <div className="w-24 flex justify-end">
            <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] font-bold text-gray-400">
              {session.rutina?.nivel}
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="max-w-5xl mx-auto mt-4 px-2">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600"
              initial={{ width: 0 }}
              animate={{ width: `${progreso}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </header>

      {/* Main Experience */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        {/* Ambient Background Glow */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] transition-colors duration-1000 ${isResting ? 'bg-purple-500/10' : 'bg-orange-500/10'}`} />
        </div>

        <AnimatePresence mode="wait">
          {isResting ? (
            <motion.div
              key="rest-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="z-10 flex flex-col items-center text-center max-w-lg"
            >
              <div className="mb-8 p-6 bg-purple-500/10 rounded-full border border-purple-500/20 animate-pulse">
                <Flower2 className="w-16 h-16 text-purple-400" />
              </div>
              <h2 className="text-4xl font-extrabold mb-2 text-white">¡Toma un respiro!</h2>
              <p className="text-purple-400 font-medium mb-8">Siguiente posicición en el horizonte...</p>
              
              <div className="mb-12">
                 <YogaTimer
                    initialSeconds={REST_TIME}
                    onComplete={handleTimerComplete}
                    autoStart={true}
                    poseName={`Preparando: ${posicionActual.posicion?.nombre}`}
                 />
              </div>

              <div className="flex flex-col items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/10 w-full">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">A continuación</p>
                <h3 className="text-xl font-bold text-white">{posicionActual.posicion?.nombre}</h3>
                <p className="text-sm text-gray-400 line-clamp-2">{posicionActual.posicion?.descripcion}</p>
                <button 
                   onClick={() => handleTimerComplete()}
                   className="mt-2 text-sm font-bold text-orange-500 hover:text-orange-400 transition-colors"
                >
                   Omitir descanso
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={posicionActual.posicion_id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12"
            >
              {/* Media Section */}
              <div className="flex flex-col gap-6">
                <div className="aspect-[4/3] bg-gradient-to-br from-orange-500/20 to-purple-500/20 rounded-xl border border-white/10 overflow-hidden shadow-2xl relative group">
                  {posicionActual.posicion?.imagen_url ? (
                    <img 
                      src={posicionActual.posicion.imagen_url} 
                      alt={posicionActual.posicion.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Flower2 className="w-32 h-32 text-orange-400/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-6 flex items-end">
                     <p className="text-white text-sm font-bold">{posicionActual.posicion?.nombre}</p>
                  </div>
                </div>

                <div className="hidden lg:block bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Instrucciones clave</h3>
                    <ul className="space-y-3">
                       {posicionActual.posicion?.instrucciones?.slice(0, 3).map((ins, i) => (
                           <li key={i} className="flex gap-3 text-sm text-gray-300">
                             <span className="text-orange-500">•</span>
                             {ins}
                           </li>
                       ))}
                    </ul>
                </div>
              </div>

              {/* Interaction Section */}
              <div className="flex flex-col">
                <div className="mb-8">
                  <h2 className="text-4xl font-extrabold text-white mb-2 leading-tight">
                    {posicionActual.posicion?.nombre}
                  </h2>
                  {posicionActual.posicion?.nombre_sanscrito && (
                    <p className="text-orange-400 text-xl font-medium tracking-tight">
                      {posicionActual.posicion.nombre_sanscrito}
                    </p>
                  )}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center py-6">
                   <YogaTimer
                    initialSeconds={tiempoRestante}
                    onComplete={handleTimerComplete}
                    autoStart={isTimerRunning}
                  />
                </div>

                {/* Controls */}
                <div className="grid grid-cols-3 items-center gap-4 mt-8">
                  <button
                    onClick={handleAnterior}
                    disabled={session.posicionIndex === 0}
                    className="flex flex-col items-center gap-1 group disabled:opacity-30 transition-opacity"
                  >
                    <div className="p-4 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                       <ChevronLeft className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Anterior</span>
                  </button>

                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                      isTimerRunning 
                        ? 'bg-orange-500 text-black shadow-[0_0_30px_rgba(249,115,22,0.4)]' 
                        : 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                    }`}>
                      {isTimerRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                    </div>
                    <span className="text-xs font-bold text-white uppercase tracking-widest">
                      {isTimerRunning ? 'Pausar' : 'Reanudar'}
                    </span>
                  </button>

                  <button
                    onClick={handleSiguiente}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className="p-4 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                       <ChevronRight className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Siguiente</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
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
              className="bg-[#141414] border border-white/10 rounded-xl p-10 max-w-md w-full text-center shadow-[0_0_50px_rgba(34,197,94,0.1)]"
            >
              <div className="w-24 h-24 mx-auto mb-8 relative">
                 <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 animate-pulse" />
                 <div className="relative w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-green-400" />
                 </div>
              </div>
              
              <h2 className="text-3xl font-black text-white mb-2">¡Namasté!</h2>
              <p className="text-gray-400 mb-4 leading-relaxed">
                Has completado <span className="text-white font-bold">{session.rutina?.nombre}</span> con éxito. Tu cuerpo y mente te lo agradecerán.
              </p>

              {/* XP & Level Up Rewards */}
              {xpResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-6 p-4 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-2xl border border-orange-500/20"
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
                    resetSession();
                    if (rutinaId) fetchRutina(rutinaId);
                  }}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-orange-500 text-black rounded-2xl font-black hover:bg-orange-400 transition-all shadow-lg active:scale-[0.98]"
                >
                  <RotateCcw className="w-5 h-5" />
                  Repetir Sesión
                </button>
                <button
                  onClick={handleVolverInicio}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  <Home className="w-5 h-5" />
                  Volver a Yoga
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
