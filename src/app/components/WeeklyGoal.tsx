import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { getWeeklyWorkoutCount } from '../../lib/stats';
import { useAuth } from '../context/AuthContext';
import { useCelebration } from '../hooks/useCelebration';
import { Target, Trophy, CheckCircle2 } from 'lucide-react';

export default function WeeklyGoal() {
    const { user, perfil } = useAuth();
    const { celebrateAchievement } = useCelebration();
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
                            celebrateAchievement();
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
    }, [user, metaSemanal, celebrateAchievement]);

    if (loading) {
        return (
            <div className="p-4 bg-[#141414] rounded-xl border border-white/5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                    <div className="h-4 bg-white/10 rounded-sm w-24 animate-pulse" />
                </div>
                <div className="h-3 bg-white/10 rounded-full animate-pulse" />
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border transition-all ${
                metaAlcanzada 
                    ? 'bg-linear-to-br from-primary/10 to-primary-dark/5 border-primary/30' 
                    : 'bg-[#141414] border-white/5 hover:border-primary/20'
            }`}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {metaAlcanzada ? (
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-primary-dark flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-black" />
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <Target className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <div>
                        <p className="text-xs text-gray-400 font-medium">Meta Semanal</p>
                        <p className="text-lg font-black text-white">
                            {metaAlcanzada ? '¡Completada!' : `${weeklyCount}/${metaSemanal} días`}
                        </p>
                    </div>
                </div>
                {metaAlcanzada && (
                    <div className="flex items-center gap-1 text-primary-light text-sm font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>¡Hecho!</span>
                    </div>
                )}
            </div>

            {metaAlcanzada && (
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-xs text-primary-light font-medium mt-2"
                >
                    ¡Felicidades! Has alcanzado tu meta semanal 🎉
                </motion.p>
            )}
        </motion.div>
    );
}
