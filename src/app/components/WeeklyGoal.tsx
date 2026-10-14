import { useEffect, useState, useRef } from 'react';
import { getWeeklyWorkoutCount } from '../../lib/stats';
import { getInicioSemana } from '../lib/dates';
import { useAuth } from '../context/AuthContext';
import { useCelebration } from '../hooks/useCelebration';
import { Target, CheckCircle2 } from 'lucide-react';

export default function WeeklyGoal() {
    const { user, perfil } = useAuth();
    const { celebrateAchievement } = useCelebration();
    const [weeklyCount, setWeeklyCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const hasCelebratedRef = useRef(false);
    const userId = user?.id;

    const metaSemanal = perfil?.dias_entrenamiento_semana || 3;
    const metaAlcanzada = weeklyCount >= metaSemanal;
    const faltan = Math.max(0, metaSemanal - weeklyCount);
    const pct = metaSemanal > 0 ? Math.min(100, Math.round((weeklyCount / metaSemanal) * 100)) : 0;

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const loadWeeklyCount = async () => {
            try {
                const count = await getWeeklyWorkoutCount(userId);
                setWeeklyCount(count);

                if (count >= metaSemanal && !hasCelebratedRef.current) {
                    // Clave semanal (lunes de la semana actual), no mensual: la
                    // celebración es por meta semanal.
                    const inicioSemana = getInicioSemana();
                    const weekKey = `${inicioSemana.getFullYear()}-${String(inicioSemana.getMonth() + 1).padStart(2, '0')}-${String(inicioSemana.getDate()).padStart(2, '0')}`;
                    const sessionKey = `meta_semanal_${userId}_${weekKey}`;
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
    }, [userId, metaSemanal, celebrateAchievement]);

    if (loading) {
        return (
            <div className="relative overflow-hidden rounded-xl bg-[#1c1b1c] p-4 lg:p-5">
                <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-white/10 animate-pulse" />
                    <div className="h-5 w-24 rounded-full bg-white/10 animate-pulse" />
                </div>
                <div className="h-3 w-28 rounded-sm bg-white/10 animate-pulse mb-2" />
                <div className="h-6 w-24 rounded-sm bg-white/10 animate-pulse mb-3" />
                <div className="h-2 w-full rounded-full bg-white/5 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-xl bg-[#1c1b1c] p-4 lg:p-5 hover:bg-[#201f20] transition-all">
            <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-[#2a2a2b] flex items-center justify-center text-[#ffb77d]">
                    <Target className="w-5 h-5" />
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${metaAlcanzada ? 'bg-[#ff5e00]/20 text-[#ff5e00]' : 'bg-[#353436] text-[#c5c6cc]'}`}>
                    {metaAlcanzada ? '¡Completada!' : `${pct}% Completado`}
                </span>
            </div>
            <p className="text-xs font-semibold text-[#c5c6cc]">Meta de Sesiones</p>
            <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg lg:text-2xl font-bold text-[#e5e2e3]">{weeklyCount} / {metaSemanal}</span>
                <span className="text-xs text-[#c5c6cc]">días cumplidos</span>
            </div>
            <div className="mt-3 space-y-1.5">
                <div className="w-full h-2 rounded-full bg-[#353436] overflow-hidden">
                    <div
                        className="h-full bg-[#ff5e00] rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <div className="flex items-center justify-between">
                    {metaAlcanzada ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-[#ff5e00]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ¡Hecho!
                        </span>
                    ) : (
                        <span className="text-[11px] font-bold text-[#ff5e00]">
                            {faltan === 1 ? '¡Falta 1!' : `¡Faltan ${faltan}!`}
                        </span>
                    )}
                </div>
            </div>
            {metaAlcanzada && (
                <p className="text-center text-[11px] text-[#ffb77d] font-medium mt-2">
                    ¡Felicidades! Has alcanzado tu meta semanal 🎉
                </p>
            )}
        </div>
    );
}
