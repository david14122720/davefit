import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
    getRutinas,
    getRutina,
    getPosiciones,
    saveProgreso,
    getHistorialProgreso,
    type RutinaYoga,
    type PosicionYoga,
    type ProgresoYoga,
    type FiltrosRutina,
} from '../lib/yogaApi';

// Timer state for active session
export interface TimerState {
    isRunning: boolean;
    isPaused: boolean;
    currentSeconds: number;
    totalSeconds: number;
}

// Session state
export interface SessionState {
    rutina: RutinaYoga | null;
    posicionIndex: number;
    posicionesCompletadas: number;
    startTime: Date | null;
    isCompleted: boolean;
}

interface YogaContextType {
    // Rutinas
    rutinas: RutinaYoga[];
    rutinaActual: RutinaYoga | null;
    loadingRutinas: boolean;
    errorRutinas: string | null;
    fetchRutinas: (filters?: FiltrosRutina) => Promise<void>;
    fetchRutina: (id: string) => Promise<void>;
    clearRutinaActual: () => void;

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

    // Timer
    timer: TimerState;
    startTimer: (seconds: number) => void;
    pauseTimer: () => void;
    resumeTimer: () => void;
    resetTimer: () => void;
    tickTimer: () => void;

    // Progreso
    historial: ProgresoYoga[];
    loadingHistorial: boolean;
    fetchHistorial: () => Promise<void>;
}

const YogaContext = createContext<YogaContextType | null>(null);

const initialTimer: TimerState = {
    isRunning: false,
    isPaused: false,
    currentSeconds: 0,
    totalSeconds: 0,
};

const initialSession: SessionState = {
    rutina: null,
    posicionIndex: 0,
    posicionesCompletadas: 0,
    startTime: null,
    isCompleted: false,
};

export function YogaProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    // Rutinas state
    const [rutinas, setRutinas] = useState<RutinaYoga[]>([]);
    const [rutinaActual, setRutinaActual] = useState<RutinaYoga | null>(null);
    const [loadingRutinas, setLoadingRutinas] = useState(false);
    const [errorRutinas, setErrorRutinas] = useState<string | null>(null);

    // Posiciones state
    const [posiciones, setPosiciones] = useState<PosicionYoga[]>([]);
    const [loadingPosiciones, setLoadingPosiciones] = useState(false);

    // Session state
    const [session, setSession] = useState<SessionState>(initialSession);

    // Timer state
    const [timer, setTimer] = useState<TimerState>(initialTimer);

    // Progreso state
    const [historial, setHistorial] = useState<ProgresoYoga[]>([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    // Fetch rutinas
    const fetchRutinas = useCallback(async (filters?: FiltrosRutina) => {
        setLoadingRutinas(true);
        setErrorRutinas(null);
        const { data, error } = await getRutinas(filters);
        if (error) {
            setErrorRutinas(error);
        } else {
            setRutinas(data || []);
        }
        setLoadingRutinas(false);
    }, []);

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

    // Clear rutina actual
    const clearRutinaActual = useCallback(() => {
        setRutinaActual(null);
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
        // Iniciar timer con la duración de la primera posición
        const primeraPosicion = rutina.posiciones?.[0];
        if (primeraPosicion) {
            const duracion = primeraPosicion.duracion_segundos ?? 30;
            setTimer({
                isRunning: true,
                isPaused: false,
                currentSeconds: duracion,
                totalSeconds: duracion,
            });
        }
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
        setTimer(initialTimer);
    }, []);

    // Timer functions
    const startTimer = useCallback((seconds: number) => {
        setTimer({
            isRunning: true,
            isPaused: false,
            currentSeconds: seconds,
            totalSeconds: seconds,
        });
    }, []);

    const pauseTimer = useCallback(() => {
        setTimer(prev => ({ ...prev, isPaused: true }));
    }, []);

    const resumeTimer = useCallback(() => {
        setTimer(prev => ({ ...prev, isPaused: false }));
    }, []);

    const resetTimer = useCallback(() => {
        setTimer(initialTimer);
    }, []);

    const tickTimer = useCallback(() => {
        setTimer(prev => {
            if (!prev.isRunning || prev.isPaused) return prev;
            const newSeconds = prev.currentSeconds - 1;
            if (newSeconds <= 0) {
                return { ...prev, currentSeconds: 0, isRunning: false };
            }
            return { ...prev, currentSeconds: newSeconds };
        });
    }, []);

    // Fetch historial
    const fetchHistorial = useCallback(async () => {
        if (!user) return;
        setLoadingHistorial(true);
        const { data } = await getHistorialProgreso(user.id);
        setHistorial(data || []);
        setLoadingHistorial(false);
    }, [user]);

    const contextValue = useMemo(() => ({
        // Rutinas
        rutinas,
        rutinaActual,
        loadingRutinas,
        errorRutinas,
        fetchRutinas,
        fetchRutina,
        clearRutinaActual,

        // Posiciones
        posiciones,
        loadingPosiciones,
        fetchPosiciones,

        // Session
        session,
        startSession,
        nextPosition,
        prevPosition,
        completeSession,
        resetSession,

        // Timer
        timer,
        startTimer,
        pauseTimer,
        resumeTimer,
        resetTimer,
        tickTimer,

        // Progreso
        historial,
        loadingHistorial,
        fetchHistorial,
    }), [
        rutinas, rutinaActual, loadingRutinas, errorRutinas,
        posiciones, loadingPosiciones,
        session, timer,
        historial, loadingHistorial,
        fetchRutinas, fetchRutina, clearRutinaActual, fetchPosiciones,
        startSession, nextPosition, prevPosition, completeSession, resetSession,
        startTimer, pauseTimer, resumeTimer, resetTimer, tickTimer,
        fetchHistorial,
    ]);

    return (
        <YogaContext.Provider value={contextValue}>
            {children}
        </YogaContext.Provider>
    );
}

export function useYoga() {
    const context = useContext(YogaContext);
    if (!context) {
        throw new Error('useYoga debe usarse dentro de un YogaProvider');
    }
    return context;
}