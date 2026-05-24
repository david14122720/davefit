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
            <div className="flex items-center gap-3 p-3 bg-[#141414] rounded-xl border border-white/5">
                <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/10 rounded animate-pulse w-24" />
                    <div className="h-2 bg-white/5 rounded-full animate-pulse" />
                </div>
            </div>
        );
    }

    const xpActual = stats?.xp_total ?? 0;
    const nivelActual = stats?.nivel ?? 1;
    const diasRacha = stats?.dias_racha ?? 0;
    
    let xpAcumuladoEnNivelesAnteriores = 0;
    for (let n = 1; n < nivelActual; n++) {
        xpAcumuladoEnNivelesAnteriores += calcularXpParaSiguienteNivel(n);
    }

    const xpEnNivelActual = xpActual - xpAcumuladoEnNivelesAnteriores;
    const xpParaSiguiente = calcularXpParaSiguienteNivel(nivelActual);
    const percentage = Math.min((xpEnNivelActual / xpParaSiguiente) * 100, 100);

    return (
        <div className="p-3 bg-[#141414] rounded-xl border border-white/5 hover:border-orange-500/20 transition-all">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-black" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">Nivel</p>
                        <p className="text-lg font-black text-white">{nivelActual}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-xs text-gray-400 font-medium">Racha</p>
                        <div className="flex items-center gap-1">
                            <Flame className={`w-4 h-4 ${diasRacha > 0 ? 'text-orange-500' : 'text-gray-600'}`} />
                            <p className="text-sm font-bold text-white">{diasRacha}</p>
                        </div>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-right">
                        <p className="text-xs text-gray-400 font-medium">Total XP</p>
                        <p className="text-sm font-bold text-orange-400">{(xpActual || 0).toLocaleString()}</p>
                    </div>
                </div>
            </div>
            
            <div className="relative">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>XP</span>
                    <span>{xpEnNivelActual} / {xpParaSiguiente}</span>
                </div>
                <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                    />
                </div>
            </div>
        </div>
    );
}
