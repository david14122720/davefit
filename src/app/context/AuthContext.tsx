import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = perfil?.rol === 'admin';

    // Cargar perfil completo desde la tabla 'perfiles'
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

            // Si no hay perfil (típico de Google Login), lo creamos
            if (!data && sessionUser) {
                console.log('[Auth] Creando perfil inicial para el usuario...');
                const { data: newProfile, error: createError } = await insforge.database
                    .from('perfiles')
                    .insert([{
                        id: userId,
                        email: sessionUser.email,
                        nombre_completo: sessionUser.profile?.name || sessionUser.email.split('@')[0],
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

    // Inicializar sesión al cargar
    useEffect(() => {
        let mounted = true;

        const initSession = async () => {
            try {
                // 1. Intentar obtener el usuario actual (método correcto del SDK)
                const { data: userData, error } = await (insforge.auth as any).getCurrentUser?.();
                
                // 2. Si hay usuario, obtener el token del internal tokenManager
                if (userData?.user && !error) {
                    const token = (insforge as any)._tokenManager?.accessToken || 
                                  (insforge as any).tokenManager?.accessToken ||
                                  (insforge as any).accessToken ||
                                  null;
                    
                    if (token) {
                        console.log('[Auth] Autenticado como:', userData.user.email);
                        setUser(userData.user);
                        setAccessToken(token);
                        await loadPerfil(userData.user.id, token, userData.user);
                    }
                }
                
                // 3. Verificar token en URL (OAuth callback con fragmento)
                if (!userData?.user && window.location.hash.includes('access_token')) {
                    console.log('[Auth] Procesando token OAuth del fragmento URL...');
                    const params = new URLSearchParams(window.location.hash.substring(1));
                    const accessTokenFromUrl = params.get('access_token') || params.get('accessToken');
                    
                    if (accessTokenFromUrl) {
                        try {
                            const { createClient } = await import('@insforge/sdk');
                            const tempClient = createClient({
                                baseUrl: (insforge as any).baseUrl || import.meta.env.PUBLIC_INSFORGE_URL,
                                anonKey: (insforge as any).anonKey || import.meta.env.PUBLIC_INSFORGE_ANON_KEY,
                                headers: { Authorization: `Bearer ${accessTokenFromUrl}` }
                            });
                            const { data: userRes } = await (tempClient.auth as any).getCurrentUser();
                            if (userRes?.user) {
                                console.log('[Auth] Usuario OAuth:', userRes.user.email);
                                setUser(userRes.user);
                                setAccessToken(accessTokenFromUrl);
                                await loadPerfil(userRes.user.id, accessTokenFromUrl, userRes.user);
                            }
                        } catch (e) {
                            console.error('[Auth] Error procesando token OAuth:', e);
                        }
                    }
                }
            } catch (e: any) {
                console.error('[Auth] Excepción en initSession:', e.message);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        // Esperar un momento a que el navegador asiente la URL (especialmente en OAuth callbacks)
        const timeoutId = setTimeout(initSession, 300);
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
                await loadPerfil(sessionUser.id, token);
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
                await loadPerfil(newUser.id, token);
            }

            return {};
        } catch (e: any) {
            return { error: e.message || 'Error de conexión' };
        }
    };

    const signInWithGoogle = async () => {
        await insforge.auth.signInWithOAuth({
            provider: 'google',
            redirectTo: window.location.origin + '/dashboard',
        });
    };

    const signOut = async () => {
        await insforge.auth.signOut();
        setUser(null);
        setPerfil(null);
        setAccessToken(null);
        window.location.href = '/';
    };

    const refreshPerfil = async () => {
        if (user && accessToken) {
            await loadPerfil(user.id, accessToken);
        }
    };

    const updatePerfil = async (data: Partial<Perfil>) => {
        if (!user || !accessToken) return { error: 'No autenticado' };

        try {
            const { error } = await insforge.database
                .from('perfiles')
                .upsert([{ id: user.id, ...data, updated_at: new Date().toISOString() }]);

            if (error) return { error: error.message };

            await loadPerfil(user.id, accessToken);
            return {};
        } catch (e: any) {
            return { error: e.message };
        }
    };

    return (
        <AuthContext.Provider value={{
            user, perfil, accessToken, loading, isAdmin,
            signIn, signUp, signInWithGoogle, signOut,
            refreshPerfil, updatePerfil,
        }}>
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
