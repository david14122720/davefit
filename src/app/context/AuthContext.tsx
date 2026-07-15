import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { insforge } from '../../lib/insforge';

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
    signInWithGoogle: () => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
    refreshPerfil: () => Promise<void>;
    updatePerfil: (data: Partial<Perfil>) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = useMemo(() => perfil?.rol === 'admin', [perfil?.rol]);

    const getAccessTokenFromManager = useCallback(() => {
        const tokenManager = (insforge.auth as any).tokenManager;
        return tokenManager?.getAccessToken?.()
            ?? tokenManager?.getSession?.()?.accessToken
            ?? null;
    }, []);

    // Cargar perfil completo desde la tabla 'perfiles'
    const loadPerfil = useCallback(async (userId: string, sessionUser?: User) => {
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

            // Si no hay perfil (típico de Google Login), lo creamos
            if (!data && sessionUser) {
                const { data: newProfile, error: createError } = await insforge.database
                    .from('perfiles')
                    .upsert([{
                        id: userId,
                        email: sessionUser.email,
                        nombre_completo: sessionUser.profile?.name || sessionUser.email?.split('@')[0] || 'Usuario',
                        rol: 'usuario',
                    }], { onConflict: 'id' })
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

    // Inicializar sesión al cargar
    useEffect(() => {
        let mounted = true;

        const initSession = async () => {
            try {
                // 1. getCurrentUser() es el método oficial del SDK que internamente:
                //    - Espera authCallbackHandled (procesa callback OAuth PKCE automáticamente)
                //    - Obtiene token del tokenManager
                //    - Llama a /auth/v1/user para obtener el usuario actual
                const { data: userData, error } = await (insforge.auth as any).getCurrentUser?.();
                
                // 2. Si hay usuario autenticado, extraer token del tokenManager
                if (userData?.user && !error) {
                    const token = getAccessTokenFromManager();
                    
                    setUser(userData.user);
                    if (token) {
                        setAccessToken(token);
                    }
                    await loadPerfil(userData.user.id, userData.user);
                    
                    // Limpiar URL de parámetros OAuth (insforge_code, etc) para evitar
                    // que el código de un solo uso quede visible en historial/referrer
                    if (window.location.search.includes('insforge_code') || window.location.hash.includes('access_token')) {
                        history.replaceState(null, '', window.location.pathname);
                    }
                }
                
                // 3. Fallback OAuth legacy (hash fragment con access_token — flujo implícito)
                if (!userData?.user && window.location.hash.includes('access_token')) {
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    const accessTokenFromUrl = hashParams.get('access_token') || hashParams.get('accessToken');

                    if (accessTokenFromUrl) {
                        try {
                            const { createClient } = await import('@insforge/sdk');
                            const tempClient = createClient({
                                baseUrl: import.meta.env.PUBLIC_INSFORGE_URL,
                                anonKey: import.meta.env.PUBLIC_INSFORGE_ANON_KEY,
                                headers: { Authorization: `Bearer ${accessTokenFromUrl}` }
                            });
                            const { data: userRes } = await (tempClient.auth as any).getCurrentUser();
                            if (userRes?.user) {
                                setUser(userRes.user);
                                setAccessToken(accessTokenFromUrl);
                                await loadPerfil(userRes.user.id, userRes.user);
                            }
                        } catch (e) {
                            console.error('[Auth] Error procesando token OAuth legacy:', e);
                        }
                    }
                    // Limpiar fragmento para que el token no quede visible en la URL
                    history.replaceState(null, '', window.location.pathname);
                }
            } catch (e: any) {
                console.error('[Auth] Excepción en initSession:', e.message);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        // Iniciar inmediatamente — getCurrentUser() espera authCallbackHandled internamente
        const timeoutId = setTimeout(initSession, 0);
        return () => { mounted = false; clearTimeout(timeoutId); };
    }, [loadPerfil]);

    const signIn = async (email: string, password: string) => {
        try {
            const { data, error } = await insforge.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) {
                let msg = error.message || 'Error al iniciar sesión';
                if (msg.includes('Invalid login')) msg = 'Correo o contraseña incorrectos';
                if (msg.includes('Email not confirmed')) msg = 'El correo no ha sido confirmado';
                return { error: msg };
            }

            const session = (data as any)?.session || data;
            const token = session?.access_token || session?.accessToken || (data as any)?.accessToken;
            const sessionUser = session?.user || (data as any)?.user;

            if (token && sessionUser) {
                setUser(sessionUser);
                setAccessToken(token);
                await loadPerfil(sessionUser.id, sessionUser);
            }

            return {};
        } catch (e: any) {
            return { error: e.message || 'Error de conexión' };
        }
    };

    const signUp = async (email: string, password: string, name: string) => {
        try {
            const { data, error } = await insforge.auth.signUp({
                email: email.trim(),
                password,
                name: name.trim(),
            });

            if (error) {
                return { error: error.message || 'Error al crear cuenta' };
            }

            const token = (data as any)?.accessToken;
            const newUser = (data as any)?.user;

            if (token && newUser) {
                setUser(newUser);
                setAccessToken(token);
                // Crear perfil inicial
                try {
                    await insforge.database.from('perfiles').upsert([{
                        id: newUser.id,
                        email: email.trim(),
                        nombre_completo: name.trim(),
                        rol: 'usuario',
                    }]);
                } catch (profileError) {
                    console.error('[Auth] Error creando perfil inicial:', profileError);
                }
                await loadPerfil(newUser.id, newUser);
            }

            return {};
        } catch (e: any) {
            return { error: e.message || 'Error de conexión' };
        }
    };

    const signInWithGoogle = async () => {
        try {
            const { error } = await insforge.auth.signInWithOAuth('google', {
                redirectTo: `${window.location.origin}/dashboard`,
                additionalParams: { prompt: 'select_account' },
            });

            if (error) {
                return { error: error.message || 'No se pudo iniciar sesión con Google' };
            }

            return {};
        } catch (e: any) {
            return { error: e.message || 'No se pudo iniciar sesión con Google' };
        }
    };

    const signOut = async () => {
        await insforge.auth.signOut();
        setUser(null);
        setPerfil(null);
        setAccessToken(null);
        window.location.href = '/';
    };

    const refreshPerfil = async () => {
        if (user) {
            await loadPerfil(user.id, user);
        }
    };

    const PERFIL_ALLOWED_FIELDS = new Set([
        'nombre_completo', 'avatar_url', 'fecha_nacimiento', 'genero',
        'peso_actual', 'altura', 'objetivo', 'nivel',
        'dias_entrenamiento_semana', 'preferencia_lugar', 'onboarding_completado',
    ]);

    const updatePerfil = async (data: Partial<Perfil>) => {
        if (!user || !accessToken) return { error: 'No autenticado' };

        try {
            const filtered: Record<string, any> = { id: user.id, updated_at: new Date().toISOString() };
            for (const key of Object.keys(data)) {
                if (PERFIL_ALLOWED_FIELDS.has(key)) {
                    filtered[key] = (data as any)[key];
                }
            }

            const { error } = await insforge.database
                .from('perfiles')
                .upsert([filtered]);

            if (error) return { error: error.message };

            await loadPerfil(user.id, user);
            return {};
        } catch (e: any) {
            return { error: e.message };
        }
    };

    const contextValue = useMemo(() => ({
        user, perfil, accessToken, loading, isAdmin,
        signIn, signUp, signInWithGoogle, signOut,
        refreshPerfil, updatePerfil,
    }), [user, perfil, accessToken, loading, isAdmin, signIn, signUp, signInWithGoogle, signOut, refreshPerfil, updatePerfil]);

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
