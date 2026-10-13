import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
    getRutina,
    getPosiciones,
    saveProgreso,
    type RutinaYoga,
    type PosicionYoga,
} from '../lib/yogaApi';

// Session state
export interface SessionState {
    rutina: RutinaYoga | null;
    posicionIndex: number;
    posicionesCompletadas: number;
    startTime: Date | null;
    isCompleted: boolean;
}

interface YogaContextType {
    // Rutina activa
    rutinaActual: RutinaYoga | null;
    loadingRutinas: boolean;
    errorRutinas: string | null;
    fetchRutina: (id: string) => Promise<void>;

    // Posiciones
    posiciones: PosicionYoga[];
    loadingPosiciones: boolean;
    fetchPosiciones: () => Promise<void>;

    // Session management
    session: SessionState;
    startSession: (rutina: RutinaYoga) => void;
    nextPosition: () => void;
    prevPosition: () => void;
    completeSession: () => Promise<{ error?: string }>;
    resetSession: () => void;
}

const YogaContext = createContext<YogaContextType | null>(null);

const initialSession: SessionState = {
    rutina: null,
    posicionIndex: 0,
    posicionesCompletadas: 0,
    startTime: null,
    isCompleted: false,
};

export function YogaProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    // Rutina activa state
    const [rutinaActual, setRutinaActual] = useState<RutinaYoga | null>(null);
    const [loadingRutinas, setLoadingRutinas] = useState(false);
    const [errorRutinas, setErrorRutinas] = useState<string | null>(null);

    // Posiciones state
    const [posiciones, setPosiciones] = useState<PosicionYoga[]>([]);
    const [loadingPosiciones, setLoadingPosiciones] = useState(false);

    // Session state
    const [session, setSession] = useState<SessionState>(initialSession);

    // Fetch single rutina
    const fetchRutina = useCallback(async (id: string) => {
        setLoadingRutinas(true);
        setErrorRutinas(null);
        const { data, error } = await getRutina(id);
        if (error) {
            setErrorRutinas(error);
        } else {
            setRutinaActual(data);
        }
        setLoadingRutinas(false);
    }, []);

    // Fetch posiciones
    const fetchPosiciones = useCallback(async () => {
        setLoadingPosiciones(true);
        const { data } = await getPosiciones();
        setPosiciones(data || []);
        setLoadingPosiciones(false);
    }, []);

    // Start session
    const startSession = useCallback((rutina: RutinaYoga) => {
        setSession({
            rutina,
            posicionIndex: 0,
            posicionesCompletadas: 0,
            startTime: new Date(),
            isCompleted: false,
        });
    }, []);

    // Next position
    const nextPosition = useCallback(() => {
        setSession(prev => {
            if (!prev.rutina?.posiciones) return prev;
            const nextIndex = prev.posicionIndex + 1;
            if (nextIndex >= prev.rutina.posiciones.length) {
                return { ...prev, isCompleted: true };
            }
            return {
                ...prev,
                posicionIndex: nextIndex,
                posicionesCompletadas: prev.posicionesCompletadas + 1,
            };
        });
    }, []);

    // Previous position
    const prevPosition = useCallback(() => {
        setSession(prev => {
            const prevIndex = Math.max(0, prev.posicionIndex - 1);
            return { ...prev, posicionIndex: prevIndex };
        });
    }, []);

    // Complete session and save progress
    const completeSession = useCallback(async () => {
        if (!user || !session.rutina || !session.startTime) {
            return { error: 'No hay sesión activa' };
        }

        const endTime = new Date();
        const duracionTotal = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

        const { error } = await saveProgreso({
            user_id: user.id,
            rutina_id: session.rutina.id,
            completado: true,
            fecha_completado: endTime.toISOString(),
            duracion_real_segundos: duracionTotal,
            duracion_estimada: session.rutina.duracion_minutos,
            calorias_estimadas: session.rutina.calorias_estimadas,
        });

        if (error) {
            return { error };
        }

        setSession(prev => ({ ...prev, isCompleted: true }));
        return {};
    }, [user, session]);

    // Reset session
    const resetSession = useCallback(() => {
        setSession(initialSession);
    }, []);

    const contextValue = useMemo(() => ({
        rutinaActual,
        loadingRutinas,
        errorRutinas,
        fetchRutina,

        posiciones,
        loadingPosiciones,
        fetchPosiciones,

        session,
        startSession,
        nextPosition,
        prevPosition,
        completeSession,
        resetSession,
    }), [
        rutinaActual, loadingRutinas, errorRutinas,
        posiciones, loadingPosiciones,
        session,
        fetchRutina, fetchPosiciones,
        startSession, nextPosition, prevPosition, completeSession, resetSession,
    ]);

    return (
        <YogaContext.Provider value={contextValue}>
            {children}
        </YogaContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useYoga() {
    const context = useContext(YogaContext);
    if (!context) {
        throw new Error('useYoga debe usarse dentro de un YogaProvider');
    }
    return context;
}
