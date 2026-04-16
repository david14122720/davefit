import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { insforge } from '../../lib/insforge';
import { useAuth } from '../context/AuthContext';
import { useCelebration } from '../hooks/useCelebration';
import { Zap, Flame, TrendingUp } from 'lucide-react';

interface UserStats {
    id: string;
    user_id: string;
    xp_total: number;
    nivel: number;
    dias_racha: number;
    ultimo_entreno: string | null;
    racha_bonus: number;
}

function calcularXpParaSiguienteNivel(nivel: number): number {
    return Math.floor(100 * Math.pow(nivel, 1.5));
}

export default function XPBar() {
    const { user } = useAuth();
    const { celebrateStreak } = useCelebration();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const hasCelebratedRef = useRef(false);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const loadStats = async () => {
            try {
                const { data } = await insforge.database
                    .from('user_stats')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();
                setStats(data);

                // Celebrar racha si es mayor a 0 y no hemos celebrado en esta "sesión" de vista
                if (data && data.dias_racha > 0 && !hasCelebratedRef.current) {
                    const sessionKey = `racha_celebrated_${user.id}_${new Date().toDateString()}`;
                    if (!sessionStorage.getItem(sessionKey)) {
                        setTimeout(() => {
                            celebrateStreak();
                            sessionStorage.setItem(sessionKey, 'true');
                        }, 1000); // Un pequeño delay para que cargue la UI
                    }
                    hasCelebratedRef.current = true;
                }
            } catch (err) {
                console.error('[XPBar] Error loading stats:', err);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, [user, celebrateStreak]);

    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                <div className="p-3 sm:p-4 md:p-5 bg-[#141414] rounded-xl sm:rounded-2xl border border-white/5 animate-pulse">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 sm:w-10 md:w-12 h-8 sm:h-10 md:h-12 rounded-full bg-white/10" />
                        <div className="flex-1">
                            <div className="h-3 bg-white/10 rounded w-12 sm:w-16 mb-1" />
                            <div className="h-4 sm:h-5 bg-white/5 rounded w-16 sm:w-20" />
                        </div>
                    </div>
                </div>
                <div className="p-3 sm:p-4 md:p-5 bg-[#141414] rounded-xl sm:rounded-2xl border border-white/5 animate-pulse">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 sm:w-10 md:w-12 h-8 sm:h-10 md:h-12 rounded-full bg-white/10" />
                        <div className="flex-1">
                            <div className="h-3 bg-white/10 rounded w-12 sm:w-16 mb-1" />
                            <div className="h-4 sm:h-5 bg-white/5 rounded w-16 sm:w-20" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const xpActual = stats?.xp_total ?? 0;
    const nivelActual = stats?.nivel ?? 1;
    const diasRacha = stats?.dias_racha ?? 0;

    return (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
            {/* Nivel Card */}
            <div className="p-3 sm:p-4 md:p-5 bg-[#141414] rounded-xl sm:rounded-2xl border border-white/5 hover:border-orange-500/20 transition-all">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 sm:w-10 md:w-12 h-8 sm:h-10 md:h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shrink-0">
                        <Zap className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 text-black" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-gray-400 font-medium truncate">Nivel</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-black text-white leading-none">{nivelActual}</p>
                    </div>
                </div>
                <p className="text-[10px] sm:text-xs text-orange-400 font-bold mt-1 sm:mt-2 ml-10 sm:ml-12 md:ml-14">{xpActual.toLocaleString()} XP</p>
            </div>

            {/* Racha Card */}
            <div className="p-3 sm:p-4 md:p-5 bg-[#141414] rounded-xl sm:rounded-2xl border border-white/5 hover:border-orange-500/20 transition-all">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-8 sm:w-10 md:w-12 h-8 sm:h-10 md:h-12 rounded-full flex items-center justify-center shrink-0 ${diasRacha > 0 ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-white/5'}`}>
                        <Flame className={`w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 ${diasRacha > 0 ? 'text-black' : 'text-gray-600'}`} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-gray-400 font-medium truncate">Racha</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-black text-white leading-none">{diasRacha}</p>
                    </div>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium mt-1 sm:mt-2 ml-10 sm:ml-12 md:ml-14">{diasRacha > 0 ? 'días consecutivos' : 'Sin actividad'}</p>
            </div>
        </div>
    );
}
