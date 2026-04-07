import React from 'react';
import { useAuth } from '../context/AuthContext';
import { insforge } from '../../lib/insforge';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Flame, Activity, ChevronRight, Trophy, History as HistoryIcon, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HistoryPage() {
    const { accessToken } = useAuth();
    const [historial, setHistorial] = React.useState<any[]>([]);
    const [loaded, setLoaded] = React.useState(false);

    React.useEffect(() => {
        if (!accessToken) return;
        const load = async () => {
            const { data } = await insforge.database
                .from('historial_entrenamientos')
                .select('*, rutinas(nombre, imagen_cover_url)')
                .order('fecha', { ascending: false });
            setHistorial(data || []);
            setLoaded(true);
        };
        load();
    }, [accessToken]);

    const totalMinutos = historial.reduce((acc, h) => acc + (h.duracion_real || 0), 0);
    const totalCalorias = historial.reduce((acc, h) => acc + (h.calorias_quemadas || 0), 0);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    if (!loaded) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs">Consultando Archivos...</p>
        </div>
    );

    return (
        <motion.div 
            className="max-w-4xl mx-auto px-4 pb-32 pt-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header section */}
            <motion.div variants={itemVariants} className="relative mb-10">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-orange-500/5 blur-[100px] rounded-full pointer-events-none" />
                <div className="flex flex-col gap-2 relative z-10">
                    <div className="flex items-center gap-3">
                        <HistoryIcon className="w-6 h-6 text-orange-500" />
                        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none uppercase">
                            Bitácora de <span className="text-orange-500">Guerra</span>
                        </h1>
                    </div>
                    <p className="text-gray-500 text-xs sm:text-sm font-black uppercase tracking-[0.2em] mt-1 ml-1">
                        {historial.length} Sesiones de puro fuego.
                    </p>
                </div>
            </motion.div>

            {/* Premium Stats Dashboard - Mobile Optimized */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-10">
                <div className="bg-[#141414]/90 backdrop-blur-xl p-5 sm:p-6 rounded-xl border border-white/5 flex flex-col items-center text-center shadow-xl group hover:border-orange-500/20 transition-all">
                    <Trophy className="w-5 h-5 text-orange-500 mb-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                    <span className="text-3xl font-black text-white leading-none mb-1">{historial.length}</span>
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Sesiones</span>
                </div>
                <div className="bg-[#141414]/90 backdrop-blur-xl p-5 sm:p-6 rounded-xl border border-white/5 flex flex-col items-center text-center shadow-xl group hover:border-yellow-500/20 transition-all">
                    <Clock className="w-5 h-5 text-yellow-500 mb-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                    <span className="text-3xl font-black text-white leading-none mb-1">{totalMinutos}</span>
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Minutos</span>
                </div>
                <div className="bg-[#141414]/90 backdrop-blur-xl p-5 sm:p-6 rounded-xl border border-white/5 flex flex-col items-center text-center shadow-xl group hover:border-red-500/20 transition-all col-span-2 md:col-span-1">
                    <Flame className="w-5 h-5 text-red-500 mb-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                    <span className="text-3xl font-black text-white leading-none mb-1">{totalCalorias}</span>
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Kcal Quemadas</span>
                </div>
                <div className="hidden md:flex bg-gradient-to-br from-orange-500/10 to-transparent p-5 sm:p-6 rounded-xl border border-orange-500/10 flex-col items-center text-center shadow-xl">
                    <Sparkles className="w-5 h-5 text-orange-400 mb-3" />
                    <span className="text-3xl font-black text-orange-500 leading-none mb-1">Elite</span>
                    <span className="text-[10px] text-orange-500/60 font-black uppercase tracking-widest">Estado</span>
                </div>
            </motion.div>

            {/* History List */}
            {historial.length > 0 ? (
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2 mb-4">Cronología Reciente</h3>
                    <AnimatePresence mode="popLayout">
                        {historial.map((entry: any, idx) => (
                            <motion.div 
                                key={entry.id}
                                layout
                                variants={itemVariants}
                                exit={{ opacity: 0, x: -20 }}
                                className="group relative bg-[#141414]/40 backdrop-blur-md border border-white/5 rounded-lg p-4 sm:p-5 flex items-center justify-between hover:bg-[#1a1a1a]/60 hover:border-orange-500/30 transition-all duration-300 shadow-lg overflow-hidden"
                            >
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 flex flex-col items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-black transition-all">
                                        <span className="text-xs font-black leading-none">{new Date(entry.fecha).getDate()}</span>
                                        <span className="text-[8px] font-black uppercase tracking-tighter">{new Date(entry.fecha).toLocaleDateString('es-ES', { month: 'short' })}</span>
                                    </div>
                                    
                                    <div className="min-w-0">
                                        <p className="font-extrabold text-white text-sm sm:text-base mb-1 truncate capitalize tracking-tight group-hover:text-orange-500 transition-colors">
                                            {entry.rutinas?.nombre || 'Rutina Personalizada'}
                                        </p>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-full border border-white/5">
                                                <Clock className="w-3 h-3 text-orange-400 opacity-70" />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{entry.duracion_real || 0}m</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-full border border-white/5">
                                                <Flame className="w-3 h-3 text-red-400 opacity-70" />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{entry.calorias_quemadas || 0} kcal</span>
                                            </div>
                                            {entry.sensacion && (
                                                <span className="hidden sm:inline text-[10px] text-gray-600 font-black uppercase tracking-tighter">Perfecto</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 relative z-10 shrink-0">
                                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-orange-500 transition-all group-hover:translate-x-1" />
                                </div>
                                
                                {/* Inner glow decoration */}
                                <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-orange-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-[#111111] border border-dashed border-white/10 rounded-xl p-16 text-center shadow-xl"
                >
                    <div className="text-7xl mb-6">🏜️</div>
                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Archivo Vacío</h3>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto font-medium">Aún no has tallado tu historia en DaveFit. Comienza tu primera sesión ahora.</p>
                    <Link to="/rutinas" className="inline-block mt-8 px-8 py-3.5 bg-orange-500 text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl hover:bg-orange-400 transition-all hover:scale-105 active:scale-95">
                        Iniciar Campaña
                    </Link>
                </motion.div>
            )}
        </motion.div>
    );
}
