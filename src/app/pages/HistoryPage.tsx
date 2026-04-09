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
    const [error, setError] = React.useState<string | null>(null);
    const [filtro, setFiltro] = React.useState<'semanal' | 'mensual' | 'todas'>('todas');

    React.useEffect(() => {
        if (!accessToken) return;
        const load = async () => {
            setLoaded(false);
            setError(null);
            try {
                let query = insforge.database
                    .from('historial_entrenamientos')
                    .select('*, rutinas(nombre, imagen_cover_url)')
                    .order('fecha', { ascending: false });

                // Apply date filters based on selection
                if (filtro === 'semanal') {
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    query = query.gte('fecha', oneWeekAgo.toISOString());
                } else if (filtro === 'mensual') {
                    const oneMonthAgo = new Date();
                    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                    query = query.gte('fecha', oneMonthAgo.toISOString());
                }

                const { data, error: fetchError } = await query;
                
                if (fetchError) throw fetchError;
                setHistorial(data || []);
            } catch (err) {
                console.error('Error loading history:', err);
                setError('No pudimos recuperar tu bitácora. La conexión falló.');
            } finally {
                setLoaded(true);
            }
        };
        load();
    }, [accessToken, filtro]);

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
        <div className="max-w-4xl mx-auto px-4 pb-32 pt-2">
            <div className="animate-pulse">
                {/* Header Skeleton */}
                <div className="mb-10 mt-6">
                    <div className="flex gap-3 items-center mb-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20" />
                        <div className="h-10 w-64 bg-white/5 rounded-xl" />
                    </div>
                    <div className="h-4 w-40 bg-white/5 rounded-lg ml-11" />
                </div>
                
                {/* Stats Dashboard Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-10">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`bg-[#141414] border border-white/5 p-5 sm:p-6 rounded-xl flex flex-col items-center gap-3 ${i === 3 ? 'col-span-2 md:col-span-1' : ''} ${i === 4 ? 'hidden md:flex' : ''}`}>
                            <div className="w-8 h-8 rounded-full bg-white/5" />
                            <div className="w-16 h-8 bg-white/10 rounded-lg" />
                            <div className="w-20 h-3 bg-white/5 rounded-md" />
                        </div>
                    ))}
                </div>

                {/* List Skeleton */}
                <div className="space-y-4">
                    <div className="w-32 h-3 bg-white/5 rounded-md ml-2 mb-4" />
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-[#141414] border border-white/5 rounded-lg p-4 sm:p-5 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="w-48 h-5 bg-white/10 rounded-lg" />
                                <div className="flex gap-2">
                                    <div className="w-16 h-4 bg-white/5 rounded-full" />
                                    <div className="w-20 h-4 bg-white/5 rounded-full" />
                                </div>
                            </div>
                            <div className="w-6 h-6 rounded-md bg-white/5 shrink-0" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    if (error) return (
        <div className="max-w-4xl mx-auto px-4 pb-32 pt-12 flex justify-center">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-[#141414] border border-red-500/20 rounded-[2.5rem] p-8 sm:p-10 text-center shadow-[0_15px_60px_rgba(239,68,68,0.1)] relative overflow-hidden"
            >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0" />
                <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <Activity className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Acceso Denegado</h2>
                <p className="text-gray-400 mb-8 leading-relaxed text-sm sm:text-base">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="w-full py-4 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 font-black uppercase tracking-widest rounded-2xl transition-all"
                >
                    Reestablecer Conexión
                </button>
            </motion.div>
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
                    <div className="flex flex-wrap gap-2 mt-2">
                        <button 
                            onClick={() => setFiltro('semanal')}
                            className={`px-4 py-2 bg-[#141414]/50 border border-white/10 rounded-full text-xs font-black text-white transition-all ${filtro === 'semanal' ? 'bg-orange-500/20 border-orange-500/30 text-orange-500' : 'hover:bg-white/5'}`}
                        >
                            Semanal
                        </button>
                        <button 
                            onClick={() => setFiltro('mensual')}
                            className={`px-4 py-2 bg-[#141414]/50 border border-white/10 rounded-full text-xs font-black text-white transition-all ${filtro === 'mensual' ? 'bg-orange-500/20 border-orange-500/30 text-orange-500' : 'hover:bg-white/5'}`}
                        >
                            Mensual
                        </button>
                        <button 
                            onClick={() => setFiltro('todas')}
                            className={`px-4 py-2 bg-[#141414]/50 border border-white/10 rounded-full text-xs font-black text-white transition-all ${filtro === 'todas' ? 'bg-orange-500/20 border-orange-500/30 text-orange-500' : 'hover:bg-white/5'}`}
                        >
                            Todas
                        </button>
                    </div>
                    <p className="text-gray-500 text-xs sm:text-sm font-black uppercase tracking-[0.2em] mt-1 ml-1">
                        {historial.length} Sesiones de puro fuego{filtro !== 'todas' ? ` (${filtro === 'semanal' ? 'últimos 7 días' : 'último mes'})` : ''}
                    </p>
                </div>
            </motion.div>

            {/* Premium Stats Dashboard - Mobile Optimized */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-10">
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
                <div className="bg-[#141414]/90 backdrop-blur-xl p-5 sm:p-6 rounded-xl border border-white/5 flex flex-col items-center text-center shadow-xl group hover:border-red-500/20 transition-all">
                    <Flame className="w-5 h-5 text-red-500 mb-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                    <span className="text-3xl font-black text-white leading-none mb-1">{totalCalorias}</span>
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Kcal Quemadas</span>
                </div>
            </motion.div>
            
            {/* Filter Feedback Message */}
            {filtro !== 'todas' && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 text-center"
                >
                    <p className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        Rutinas realizadas {filtro === 'semanal' ? 'esta semana' : 'este mes'}
                    </p>
                </motion.div>
            )}

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
