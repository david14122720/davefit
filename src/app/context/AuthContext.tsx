import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { insforge } from '../../lib/insforge';
import {
  sanitizeAuthError,
  normalizeEmail,
  sanitizeName,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
} from '../../lib/auth';

// ------------------------------------------------------------------
// Tipos
// ------------------------------------------------------------------

interface User {
  id: string;
  email: string;
  profile?: {
    name?: string;
    avatar_url?: string;
  } | null;
  [key: string]: any;
}

export interface Perfil {
  id: string;
  email?: string | null;
  nombre_completo?: string | null;
  avatar_url?: string | null;
  fecha_nacimiento?: string | null;
  genero?: string | null;
  peso_actual?: number | null;
  altura?: number | null;
  objetivo?: string | null;
  nivel?: string | null;
  preferencia_lugar?: string | null;
  rol?: string | null;
  dias_entrenamiento_semana?: number | null;
  onboarding_completado?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  perfil: Perfil | null;
  accessToken: string | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshPerfil: () => Promise<void>;
  updatePerfil: (data: Partial<Perfil>) => Promise<{ error?: string }>;
}

// ------------------------------------------------------------------
// Constantes
// ------------------------------------------------------------------

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora de inactividad
const TOKEN_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // refrescar cada 10 min
const ALLOWED_PROFILE_FIELDS = new Set([
  'nombre_completo', 'avatar_url', 'fecha_nacimiento', 'genero',
  'peso_actual', 'altura', 'objetivo', 'nivel',
  'dias_entrenamiento_semana', 'preferencia_lugar', 'onboarding_completado',
]);

// ------------------------------------------------------------------
// Context
// ------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef<number>(Date.now());
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = useMemo(() => perfil?.rol === 'admin', [perfil?.rol]);

  // ------------------------------------------------------------------
  // Perfil
  // ------------------------------------------------------------------

  const loadPerfil = useCallback(async (userId: string, token: string, sessionUser?: User) => {
    try {
      const { data, error } = await insforge.database
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[Auth] Error cargando perfil:', error.message);
        return null;
      }

      // Auto-crear perfil si no existe (Google Login)
      if (!data && sessionUser) {
        const { data: newProfile, error: createError } = await insforge.database
          .from('perfiles')
          .insert([{
            id: userId,
            email: sessionUser.email,
            nombre_completo: sanitizeName(sessionUser.profile?.name || sessionUser.email?.split('@')[0] || 'Usuario'),
            rol: 'usuario',
          }])
          .select()
          .single();

        if (createError) {
          console.error('[Auth] Error en autocreación de perfil:', createError.message);
          return null;
        }
        setPerfil(newProfile);
        return newProfile;
      }

      setPerfil(data);
      return data;
    } catch (e: any) {
      console.error('[Auth] Excepción cargando perfil:', e.message);
      return null;
    }
  }, []);

  // ------------------------------------------------------------------
  // Cierre de sesión (definido antes de los efectos que lo usan)
  // ------------------------------------------------------------------

  const signOut = async () => {
    try {
      await insforge.auth.signOut();
    } catch {
      // Forzar cierre aunque falle el backend
    }
    setUser(null);
    setPerfil(null);
    setAccessToken(null);
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
    window.location.href = '/';
  };

  // ------------------------------------------------------------------
  // Actividad y session timeout
  // ------------------------------------------------------------------

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Escuchar actividad del usuario
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;
    events.forEach((ev) => window.addEventListener(ev, updateActivity, { passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, updateActivity));
  }, [updateActivity]);

  // Verificar inactividad periódicamente
  useEffect(() => {
    if (!user) return;

    inactivityTimerRef.current = setInterval(() => {
      const inactive = Date.now() - lastActivityRef.current;
      if (inactive > SESSION_TIMEOUT_MS) {
        console.log('[Auth] Sesión expirada por inactividad');
        signOut();
      }
    }, 60_000); // cada minuto

    return () => {
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
    };
  }, [user]);

  // ------------------------------------------------------------------
  // Refresh token periódico
  // ------------------------------------------------------------------

  useEffect(() => {
    if (!accessToken) return;

    refreshIntervalRef.current = setInterval(async () => {
      try {
        const { data, error } = await insforge.auth.refreshSession();
        if (error) {
          console.warn('[Auth] Error refrescando sesión:', error.message);
          return;
        }
        const session = (data as any)?.session;
        if (session?.access_token) {
          setAccessToken(session.access_token);
          console.log('[Auth] Token refrescado correctamente');
        }
      } catch (e: any) {
        console.warn('[Auth] Excepción refreshing token:', e.message);
      }
    }, TOKEN_REFRESH_INTERVAL_MS);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [accessToken]);

  // ------------------------------------------------------------------
  // Inicializar sesión
  // ------------------------------------------------------------------

  useEffect(() => {
    let mounted = true;

    const hasSessionCookie = (): boolean => {
      if (typeof document === 'undefined') return false;
      return document.cookie
        .split(';')
        .some((c) => c.trim().startsWith('insforge_csrf_token='));
    };

    const initSession = async () => {
      try {
        // --- Intentar restaurar sesión existente (vía cookie httpOnly) ---
        if (hasSessionCookie()) {
          const { data: userData, error } = await (insforge.auth as any).getCurrentUser?.();

          if (userData?.user && !error) {
            const token =
              (insforge as any)._tokenManager?.accessToken ||
              (insforge as any).tokenManager?.accessToken ||
              (insforge as any).accessToken ||
              null;

            if (token && mounted) {
              setUser(userData.user);
              setAccessToken(token);
              await loadPerfil(userData.user.id, token, userData.user);
            }
          }
        }

        // --- Procesar OAuth callback (token en fragmento de URL) ---
        // Se ejecuta incluso sin cookie de sesión (vuelta de OAuth)
        if (window.location.hash.includes('access_token')) {
          const params = new URLSearchParams(window.location.hash.substring(1));
          const tokenFromUrl = params.get('access_token') || params.get('accessToken');

          if (tokenFromUrl) {
            try {
              const { createClient } = await import('@insforge/sdk');
              const tempClient = createClient({
                baseUrl: (insforge as any).baseUrl || import.meta.env.PUBLIC_INSFORGE_URL,
                anonKey: (insforge as any).anonKey || import.meta.env.PUBLIC_INSFORGE_ANON_KEY,
                headers: { Authorization: `Bearer ${tokenFromUrl}` },
              });
              const { data: userRes } = await (tempClient.auth as any).getCurrentUser();
              if (userRes?.user && mounted) {
                setUser(userRes.user);
                setAccessToken(tokenFromUrl);
                await loadPerfil(userRes.user.id, tokenFromUrl, userRes.user);
              }
            } catch (e) {
              console.error('[Auth] Error procesando token OAuth:', e);
            }
          }

          // LIMPIAR el fragmento — el token NO debe quedar visible en la URL
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch (e: any) {
        console.error('[Auth] Excepción en initSession:', e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const timeoutId = setTimeout(initSession, 300);
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [loadPerfil]);

  // ------------------------------------------------------------------
  // signIn con rate-limit y errores sanitizados
  // ------------------------------------------------------------------

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);

    // Rate-limit client-side
    const rateError = checkRateLimit(normalizedEmail);
    if (rateError) return { error: rateError };

    try {
      const { data, error } = await insforge.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        recordFailedAttempt(normalizedEmail);
        return { error: sanitizeAuthError(error) };
      }

      const session = (data as any)?.session || data;
      const token = session?.access_token || session?.accessToken || (data as any)?.accessToken;
      const sessionUser = session?.user || (data as any)?.user;

      if (token && sessionUser) {
        clearRateLimit(normalizedEmail);
        setUser(sessionUser);
        setAccessToken(token);
        updateActivity();
        await loadPerfil(sessionUser.id, token);
      }

      return {};
    } catch (e: any) {
      return { error: sanitizeAuthError(e) };
    }
  };

  // ------------------------------------------------------------------
  // signUp con sanitización
  // ------------------------------------------------------------------

  const signUp = async (email: string, password: string, name: string) => {
    const normalizedEmail = normalizeEmail(email);
    const sanitizedName = sanitizeName(name);

    if (!sanitizedName || sanitizedName.length < 2) {
      return { error: 'El nombre debe tener al menos 2 caracteres' };
    }

    try {
      const { data, error } = await insforge.auth.signUp({
        email: normalizedEmail,
        password,
        name: sanitizedName,
      });

      if (error) {
        return { error: sanitizeAuthError(error) };
      }

      const token = (data as any)?.accessToken;
      const newUser = (data as any)?.user;

      if (token && newUser) {
        setUser(newUser);
        setAccessToken(token);
        updateActivity();

        // Crear perfil inicial
        try {
          await insforge.database.from('perfiles').upsert([{
            id: newUser.id,
            email: normalizedEmail,
            nombre_completo: sanitizedName,
            rol: 'usuario',
          }]);
        } catch (profileError) {
          console.error('[Auth] Error creando perfil inicial:', profileError);
        }
        await loadPerfil(newUser.id, token);
      }

      return {};
    } catch (e: any) {
      return { error: sanitizeAuthError(e) };
    }
  };

  // ------------------------------------------------------------------
  // OAuth
  // ------------------------------------------------------------------

  const signInWithGoogle = async () => {
    updateActivity();
    await insforge.auth.signInWithOAuth({
      provider: 'google',
      redirectTo: window.location.origin + '/dashboard',
    });
  };

  // ------------------------------------------------------------------
  // refreshPerfil
  // ------------------------------------------------------------------

  const refreshPerfil = async () => {
    if (user && accessToken) {
      await loadPerfil(user.id, accessToken);
    }
  };

  // ------------------------------------------------------------------
  // updatePerfil con allowlist (protección mass-assignment)
  // ------------------------------------------------------------------

  const updatePerfil = async (data: Partial<Perfil>) => {
    if (!user || !accessToken) return { error: 'No autenticado' };

    try {
      const filtered: Record<string, any> = { id: user.id, updated_at: new Date().toISOString() };
      for (const key of Object.keys(data)) {
        if (ALLOWED_PROFILE_FIELDS.has(key)) {
          filtered[key] = (data as any)[key];
        }
      }

      const { error } = await insforge.database
        .from('perfiles')
        .upsert([filtered]);

      if (error) return { error: error.message };

      await loadPerfil(user.id, accessToken);
      return {};
    } catch (e: any) {
      return { error: e.message };
    }
  };

  // ------------------------------------------------------------------
  // Memoized context value
  // ------------------------------------------------------------------

  const contextValue = useMemo(() => ({
    user, perfil, accessToken, loading, isAdmin,
    signIn, signUp, signInWithGoogle, signOut,
    refreshPerfil, updatePerfil,
  }), [user, perfil, accessToken, loading, isAdmin]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
