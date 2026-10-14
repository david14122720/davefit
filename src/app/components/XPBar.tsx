import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCelebration } from '../hooks/useCelebration';
import { getUserStats } from '../../lib/stats';
import { Medal } from 'lucide-react';
import type { UserStats } from '../../types';

/**
 * XP que exige el nivel `nivel` para pasar al siguiente.
 *
 * Réplica exacta de la curva del RPC `process_workout_completion_unsafe`
 * (`FLOOR(100 * POWER(nivel, 1.5))`), para poder mostrar el progreso sin
 * inventar porcentajes ni columnas que no existen en `user_stats`.
 */
function xpParaSubirNivel(nivel: number): number {
    return Math.floor(100 * Math.pow(nivel, 1.5));
}

/** Progreso dentro del nivel actual (misma aritmética que el RPC). */
function calcularProgresoNivel(xpTotal: number, nivel: number) {
    let xpEnNivel = xpTotal;
    for (let n = 1; n < nivel; n++) {
        xpEnNivel -= xpParaSubirNivel(n);
    }

    const xpParaSiguiente = xpParaSubirNivel(nivel);
    const enNivel = Math.max(0, Math.min(xpEnNivel, xpParaSiguiente));
    const pct = xpParaSiguiente > 0 ? Math.min(100, Math.round((enNivel / xpParaSiguiente) * 100)) : 0;

    return { pct, restante: Math.max(0, xpParaSiguiente - enNivel) };
}

export default function XPBar() {
    const { user } = useAuth();
    const { celebrateStreak } = useCelebration();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const hasCelebratedRef = useRef(false);
    const userId = user?.id;

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const loadStats = async () => {
            try {
                const data = await getUserStats(userId);
                setStats(data);

                // Celebrar racha si es mayor a 0 y no hemos celebrado en esta "sesión" de vista
                if (data && data.dias_racha > 0 && !hasCelebratedRef.current) {
                    const sessionKey = `racha_celebrated_${userId}_${new Date().toDateString()}`;
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
    }, [userId, celebrateStreak]);

    if (loading) {
        return (
            <div className="relative overflow-hidden rounded-xl bg-[#1c1b1c] p-4 lg:p-5">
                <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-white/10 animate-pulse" />
                    <div className="h-5 w-20 rounded-full bg-white/10 animate-pulse" />
                </div>
                <div className="h-3 w-28 rounded-sm bg-white/10 animate-pulse mb-2" />
                <div className="h-6 w-32 rounded-sm bg-white/10 animate-pulse mb-3" />
                <div className="h-2 w-full rounded-full bg-white/5 animate-pulse" />
            </div>
        );
    }

    const xpActual = stats?.xp_total ?? 0;
    const nivelActual = stats?.nivel ?? 1;
    const diasRacha = stats?.dias_racha ?? 0;
    const { pct, restante } = calcularProgresoNivel(xpActual, nivelActual);

    return (
        <div className="relative overflow-hidden rounded-xl bg-[#1c1b1c] p-4 lg:p-5 hover:bg-[#201f20] transition-all group">
            <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-[#ff5e00]/20 flex items-center justify-center text-[#ff5e00]">
                    <Medal className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#353436] text-[#ffb77d]">
                    Racha {diasRacha} {diasRacha === 1 ? 'día' : 'días'} 🔥
                </span>
            </div>
            <p className="text-xs font-semibold text-[#c5c6cc]">Progreso de Jugador</p>
            <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg lg:text-2xl font-bold text-[#e5e2e3]">Nivel {nivelActual}</span>
                <span className="text-xs text-[#c5c6cc]">{(xpActual || 0).toLocaleString()} XP</span>
            </div>
            <div className="mt-3 space-y-1.5">
                <div className="w-full h-2 rounded-full bg-[#353436] overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-[#d77917] to-[#ff5e00] rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <div className="flex justify-between text-[11px] font-bold text-[#9ea3ae]">
                    <span>{pct}% para Nivel {nivelActual + 1}</span>
                    <span>{restante.toLocaleString()} XP rest.</span>
                </div>
            </div>
        </div>
    );
}
