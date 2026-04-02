import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Timer, Flame, Trophy, Star, Activity, Maximize2, Info
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
  const [currentTime, setCurrentTime] = useState(0);
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
  const [showInstructions, setShowInstructions] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { celebrateCompletion, celebrateLevelUp } = useCelebration();
  
  useEffect(() => {
    const sessionKey = `workout_start_${rutinaId}`;
    let start = localStorage.getItem(sessionKey);
    if (!start) {
      start = Date.now().toString();
      localStorage.setItem(sessionKey, start);
    }
    startTimeRef.current = parseInt(start);
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setCurrentTime(elapsed);
    }, 1000);
    return () => clearInterval(timer);
  }, [rutinaId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const loadRutina = async () => {
      if (!rutinaId) return;
      try {
        const { data: rutinaData } = await insforge.database.from('rutinas').select('*').eq('id', rutinaId).maybeSingle();
        if (!rutinaData) { setError('Rutina no encontrada'); return; }
        setRutina(rutinaData);
        const { data: ejerciciosData } = await insforge.database.from('rutinas_ejercicios').select('*').eq('rutina_id', rutinaId).order('orden', { ascending: true });
        if (ejerciciosData && ejerciciosData.length > 0) {
          const ejercicioIds = ejerciciosData.map(e => e.ejercicio_id);
          const { data: ejerciciosInfo } = await insforge.database.from('ejercicios').select('*').in('id', ejercicioIds);
          const ejerciciosMap = new Map(ejerciciosInfo?.map(e => [e.id, e]));
          setEjercicios(ejerciciosData.map(re => ({ ...re, ejercicio: ejerciciosMap.get(re.ejercicio_id) })));
        }
      } catch (err) { setError('Error al cargar datos'); } finally { setLoading(false); }
    };
    loadRutina();
  }, [rutinaId]);

  useEffect(() => { if (videoRef.current) videoRef.current.play().catch(() => {}); }, [currentIndex]);

  const saveToHistory = useCallback(async () => {
    if (!user || !rutinaId) return;
    const duracionReal = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000 / 60));
    const baseCalorias = rutina?.calorias_estimadas || 0;
    let caloriasQuemadas = baseCalorias > 0 ? Math.round(baseCalorias * Math.min(duracionReal / (rutina?.duracion_estimada || 30), 2)) : calcularCalorias(duracionReal, 'ejercicio');
    try {
      await insforge.database.from('historial_entrenamientos').insert([{ usuario_id: user.id, rutina_id: rutinaId, duracion_real: duracionReal, calorias_quemadas: caloriasQuemadas, sensacion: 5 }]);
      localStorage.removeItem(`workout_start_${rutinaId}`);
      const result = await processWorkoutCompletion(user.id, duracionReal, 'ejercicio');
      if (result.success) {
        setXpResult({ xp_ganado: result.calculation.xp_ganado, nivel_nuevo: result.calculation.nivel_nuevo, subio_nivel: result.calculation.subio_nivel });
        celebrateCompletion();
        if (result.calculation.subio_nivel) setTimeout(celebrateLevelUp, 500);
      }
    } catch (err) { console.error(err); }
  }, [user, rutinaId, rutina, celebrateCompletion, celebrateLevelUp]);

  const handleSiguiente = useCallback(() => {
    setCompletedExercises(prev => new Set(prev).add(currentIndex));
    if (currentIndex + 1 >= ejercicios.length) { saveToHistory(); setShowCompletionModal(true); } 
    else { setCurrentIndex(prev => prev + 1); setIsPlaying(true); setShowInstructions(false); }
  }, [currentIndex, ejercicios.length, saveToHistory]);

  const handleAnterior = useCallback(() => { if (currentIndex > 0) { setCurrentIndex(prev => prev - 1); setIsPlaying(true); setShowInstructions(false); } }, [currentIndex]);
  const toggleMute = useCallback(() => { setIsMuted(!isMuted); if (videoRef.current) videoRef.current.muted = !isMuted; }, [isMuted]);
  const togglePlayPause = useCallback(() => { setIsPlaying(!isPlaying); if (videoRef.current) isPlaying ? videoRef.current.pause() : videoRef.current.play(); }, [isPlaying]);

  const currentEjercicio = ejercicios[currentIndex];
  const totalEjercicios = ejercicios.length;
  const progreso = ((currentIndex + 1) / totalEjercicios) * 100;

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8 text-center"><div className="flex flex-col items-center gap-6"><div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /><p className="text-gray-500 font-black uppercase tracking-[0.2em] animate-pulse">Sincronizando Arsenal...</p></div></div>;
  if (error || !currentEjercicio) return <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center"><Dumbbell className="w-16 h-16 text-red-500 mb-6" /><p className="text-white font-black text-xl mb-8">{error || 'Objetivo Perdido'}</p><button onClick={() => navigate('/rutinas')} className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3"><ArrowLeft className="w-4 h-4" /> Volver al Cuartel</button></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col text-white select-none overflow-hidden touch-none sm:touch-auto">
      {/* Dynamic Background Glow */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-orange-500/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Extreme Mobile Header */}
      <header className="relative z-40 px-6 py-4 flex flex-col gap-4 bg-[#0a0a0a]/90 backdrop-blur-3xl border-b border-white/5 sticky top-0 shadow-2xl">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/rutinas')} className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 active:scale-90 transition-all">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="text-center flex-1 px-4 min-w-0">
            <h1 className="text-sm font-black text-white uppercase tracking-[0.1em] truncate drop-shadow-sm">{rutina?.nombre}</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{currentIndex + 1} DE {totalEjercicios}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <Timer className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[11px] font-black text-orange-400 font-mono tracking-tighter">{formatTime(currentTime)}</span>
          </div>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden p-[2px] border border-white/5">
          <motion.div 
            className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${progreso}%` }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>
      </header>

      {/* Main Tactical Interface */}
      <main className="relative z-10 flex-1 flex flex-col justify-between p-4 sm:p-8">
        {/* Media Port */}
        <div className="relative w-full max-w-4xl mx-auto flex-1 flex flex-col justify-center gap-6">
          <motion.div 
            key={currentEjercicio.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full aspect-square sm:aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] bg-[#111111] group"
          >
            {currentEjercicio.ejercicio?.video_url ? (
               <video ref={videoRef} src={currentEjercicio.ejercicio.video_url} className="w-full h-full object-cover brightness-[0.8] group-hover:brightness-100 transition-all duration-700" autoPlay loop muted={isMuted} playsInline />
            ) : currentEjercicio.ejercicio?.imagen_url ? (
               <img src={currentEjercicio.ejercicio.imagen_url} alt="" className="w-full h-full object-cover" />
            ) : (
               <div className="w-full h-full flex flex-col items-center justify-center opacity-10 gap-4"><Dumbbell className="w-24 h-24"/><span className="font-black uppercase tracking-widest text-xs">Sin Visual</span></div>
            )}
            
            {/* Media HUD Overlay */}
            <div className="absolute inset-x-0 top-0 p-6 flex justify-between items-start pointer-events-none">
              <span className="px-4 py-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-white/70">Ref: HQ-072</span>
              <div className="flex gap-2 pointer-events-auto">
                <button onClick={toggleMute} className="p-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-black/60 transition-colors">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-8 pt-20 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none">
                <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight uppercase tracking-tighter drop-shadow-2xl">{currentEjercicio.ejercicio?.nombre}</h2>
                <div className="flex items-center gap-3 mt-2">
                   <div className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-lg text-[10px] font-black text-orange-500 uppercase tracking-widest">{currentEjercicio.ejercicio?.grupo_muscular}</div>
                   <button onClick={() => setShowInstructions(true)} className="pointer-events-auto p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                      <Info className="w-4 h-4" />
                   </button>
                </div>
            </div>
            
            {/* Play Button Center (Always visible on mobile to prevent confusion) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                {!isPlaying && <div className="p-10 rounded-full bg-black/60 backdrop-blur-3xl border border-white/10"><Play className="w-12 h-12 fill-white" /></div>}
            </div>
            <button onClick={togglePlayPause} className="absolute inset-0 w-full h-full" />
          </motion.div>

          {/* Tactical Stats Block */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-[#141414]/80 backdrop-blur-3xl p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-1 group overflow-hidden relative">
                <div className="absolute -right-2 -top-2 w-16 h-16 bg-white/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors"/>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] relative z-10">Series</span>
                <span className="text-5xl font-black text-white relative z-10">{currentEjercicio.series}</span>
             </div>
             <div className="bg-[#141414]/80 backdrop-blur-3xl p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-1 group overflow-hidden relative">
                <div className="absolute -right-2 -top-2 w-16 h-16 bg-white/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors"/>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] relative z-10">Reps</span>
                <span className="text-5xl font-black text-white relative z-10">{currentEjercicio.repeticiones}</span>
             </div>
          </div>
          
          {/* Rest Indicator */}
          <div className="w-full h-12 bg-orange-500/5 rounded-2xl border border-orange-500/20 flex items-center justify-between px-6">
             <span className="text-[10px] font-black text-orange-500/70 uppercase tracking-widest">Descanso Estratégico</span>
             <span className="text-lg font-black text-orange-500">{currentEjercicio.descanso_segundos}s</span>
          </div>
        </div>
      </main>

      {/* Ergonomic Navigation Control Center */}
      <footer className="relative z-40 p-6 pt-0 pb-10 bg-gradient-to-t from-black to-transparent">
         <div className="max-w-md mx-auto grid grid-cols-5 items-center gap-4">
            <button
               onClick={handleAnterior}
               disabled={currentIndex === 0}
               className="col-span-1 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center disabled:opacity-20 active:scale-90 transition-all"
            >
               <ChevronLeft className="w-6 h-6" />
            </button>
            <button
               onClick={handleSiguiente}
               className="col-span-3 h-20 bg-orange-500 text-black rounded-[2rem] flex items-center justify-center gap-4 shadow-[0_15px_40px_rgba(249,115,22,0.4)] active:scale-95 transition-all group"
            >
               <span className="text-lg font-black uppercase tracking-[0.2em]">{currentIndex + 1 >= totalEjercicios ? 'Finalizar' : 'Continuar'}</span>
               <ChevronRight className="w-6 h-6 stroke-[3px] group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="col-span-1 flex flex-col items-center gap-1">
               <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
                  <span className="text-lg font-black text-orange-500">{completedExercises.size}</span>
               </div>
               <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Victorias</span>
            </div>
         </div>
      </footer>

      {/* Instructions Slide-up Panel */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInstructions(false)} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-end p-0">
             <motion.div 
               initial={{ y: '100%' }} 
               animate={{ y: 0 }} 
               exit={{ y: '100%' }} 
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               onClick={(e) => e.stopPropagation()}
               className="w-full bg-[#111111] border-t border-white/10 rounded-t-[3rem] p-8 max-h-[80vh] overflow-y-auto"
             >
                <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
                <h3 className="text-xs font-black text-orange-500 uppercase tracking-[0.3em] mb-6">Guía de Operación</h3>
                <h4 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">{currentEjercicio.ejercicio?.nombre}</h4>
                <div className="space-y-6">
                    {currentEjercicio.ejercicio?.instrucciones?.map((ins, i) => (
                      <div key={i} className="flex gap-4">
                         <span className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-xs flex items-center justify-center flex-shrink-0">{i+1}</span>
                         <p className="text-gray-400 text-sm leading-relaxed font-medium">{ins}</p>
                      </div>
                    ))}
                    {!currentEjercicio.ejercicio?.instrucciones && <p className="text-gray-500 italic text-center py-10 uppercase tracking-widest text-[10px]">Sin instrucciones adicionales para este ejercicio</p>}
                </div>
                <button onClick={() => setShowInstructions(false)} className="w-full mt-12 py-4 bg-white/5 rounded-2xl font-black uppercase tracking-widest text-xs border border-white/5">Cerrar Guía</button>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extreme Completion HUD */}
      <AnimatePresence>
        {showCompletionModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/98 flex items-center justify-center p-6 backdrop-blur-3xl">
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm text-center">
              <div className="relative inline-block mb-10">
                 <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }} className="absolute inset-0 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 rounded-full blur-3xl opacity-20 scale-150" />
                 <div className="relative w-24 h-24 rounded-[2rem] bg-orange-500 flex items-center justify-center shadow-[0_0_50px_rgba(249,115,22,0.5)]">
                    <Trophy className="w-12 h-12 text-black" />
                 </div>
              </div>
              <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Victoria Total</h2>
              <p className="text-gray-500 font-black uppercase tracking-widest text-[10px] mb-10">{rutina?.nombre}</p>
              
              {xpResult && (
                <div className="flex justify-center gap-4 mb-12">
                   <div className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl">
                      <span className="block text-[10px] font-black text-gray-500 uppercase mb-1">XP Logrado</span>
                      <span className="text-2xl font-black text-orange-500">+{xpResult.xp_ganado}</span>
                   </div>
                   <div className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl">
                      <span className="block text-[10px] font-black text-gray-500 uppercase mb-1">Status Final</span>
                      <span className="text-2xl font-black text-white">LVL {xpResult.nivel_nuevo}</span>
                   </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                 <button onClick={() => navigate('/rutinas')} className="h-16 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all">Finalizar Misión</button>
                 <button onClick={() => window.location.reload()} className="h-16 bg-white/5 border border-white/5 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 active:scale-95 transition-all">Reiniciar Simulación</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
