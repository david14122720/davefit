import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { insforge } from '../../lib/insforge';
import { getWeeklyWorkoutCount } from '../../lib/stats';
import { useAuth } from '../context/AuthContext';
import { Target, Trophy, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Perfil {
    id: string;
    user_id: string;
    dias_entrenamiento_semana: number | null;
}

export default function WeeklyGoal() {
    const { user, perfil } = useAuth();
    const [weeklyCount, setWeeklyCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const hasCelebratedRef = useRef(false);

    const metaSemanal = perfil?.dias_entrenamiento_semana || 3;
    const metaAlcanzada = weeklyCount >= metaSemanal;

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const loadWeeklyCount = async () => {
            try {
                const count = await getWeeklyWorkoutCount(user.id);
                setWeeklyCount(count);

                if (count >= metaSemanal && !hasCelebratedRef.current) {
                    const sessionKey = `meta_semanal_${user.id}_${new Date().toISOString().slice(0, 7)}`;
                    if (!sessionStorage.getItem(sessionKey)) {
                        setTimeout(() => {
                            confetti({
                                particleCount: 100,
                                spread: 70,
                                origin: { y: 0.6 },
                                colors: ['#22c55e', '#10b981', '#f97316']
                            });
                            sessionStorage.setItem(sessionKey, 'true');
                        }, 1000);
                    }
                    hasCelebratedRef.current = true;
                }
            } catch (err) {
                console.error('[WeeklyGoal] Error loading weekly count:', err);
            } finally {
                setLoading(false);
            }
        };

        loadWeeklyCount();
    }, [user, metaSemanal]);

    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#141414] rounded-xl border border-white/5 animate-pulse">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/10" />
                        <div className="flex-1">
                            <div className="h-3 bg-white/10 rounded w-16 mb-1" />
                            <div className="h-4 bg-white/5 rounded w-12" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3">
            {/* Meta Semanal Card */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl border transition-all ${
                    metaAlcanzada 
                        ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30' 
                        : 'bg-[#141414] border-white/5 hover:border-blue-500/20'
                }`}
            >
                <div className="flex items-center gap-2">
                    {metaAlcanzada ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shrink-0">
                            <Trophy className="w-4 h-4 text-black" />
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
                            <Target className="w-4 h-4 text-white" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 font-medium truncate">Meta Semanal</p>
                        <p className="text-lg font-black text-white leading-none">
                            {metaAlcanzada ? '✓' : `${weeklyCount}/${metaSemanal}`}
                        </p>
                    </div>
                </div>
                <p className={`text-[10px] font-medium mt-1 ml-10 ${metaAlcanzada ? 'text-green-400' : 'text-gray-500'}`}>
                    {metaAlcanzada ? 'Completada!' : 'días entrenados'}
                </p>
            </motion.div>
        </div>
    );
}
