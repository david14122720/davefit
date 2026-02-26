import { useState } from 'preact/hooks';
import { insforge } from '../../lib/insforge';

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(false);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleLogin = async (e: Event) => {
        e.preventDefault();

        if (!email || !password) {
            setError('Por favor ingresa correo y contraseña');
            return;
        }

        setLoading(true);
        setError(null);

        try {


            // Llamar al endpoint API
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password: password
                }),
            });

            const data = await response.json();


            if (!response.ok) {
                throw new Error(data.error || 'Error al iniciar sesión');
            }

            if (data.success) {
                setSuccess(true);
                // Redirigir inmediatamente
                window.location.href = data.redirect || '/dashboard';
            }
        } catch (err: any) {
            console.error('Error de login:', err);

            let errorMessage = err.message || 'Error al iniciar sesión';

            if (errorMessage.includes('Invalid login')) {
                errorMessage = 'Correo o contraseña incorrectos';
            } else if (errorMessage.includes('Email not confirmed')) {
                errorMessage = 'El correo no ha sido confirmado';
            } else if (errorMessage.includes('network')) {
                errorMessage = 'Error de conexión';
            }

            setError(errorMessage);
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await insforge.auth.signInWithOAuth({
                provider: 'google',
                redirectTo: window.location.origin + '/dashboard', // The SDK will handle the token on dashboard
            });
        } catch (err: any) {
            setError('Error al iniciar sesión con Google');
        }
    };

    if (success) {
        return (
            <div class="text-center py-8">
                <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">¡Bienvenido!</h3>
                <p class="text-gray-400">Redirigiendo...</p>
            </div>
        );
    }

    return (
        <div class="space-y-6">
            {error && (
                <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
                    <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleLogin} class="space-y-5">
                {/* Email Field */}
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-300">Correo electrónico</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
                            </svg>
                        </div>
                        <input
                            type="email"
                            value={email}
                            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                            required
                            class="w-full pl-11 pr-4 py-3.5 sm:py-4 rounded-xl bg-[var(--color-bg-darker)] border border-[var(--color-border)] text-white placeholder-gray-500 focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] outline-none transition-all text-base"
                            placeholder="tu@email.com"
                        />
                    </div>
                </div>

                {/* Password Field */}
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <label class="block text-sm font-medium text-gray-300">Contraseña</label>
                        <a href="#" class="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-light)] transition-colors">
                            ¿Olvidaste tu contraseña?
                        </a>
                    </div>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                            </svg>
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                            required
                            class="w-full pl-11 pr-12 py-3.5 sm:py-4 rounded-xl bg-[var(--color-bg-darker)] border border-[var(--color-border)] text-white placeholder-gray-500 focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] outline-none transition-all text-base"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                            {showPassword ? (
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                                </svg>
                            ) : (
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || !email || !password}
                    class="w-full py-4 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-[var(--color-bg-dark)] font-bold rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 text-base sm:text-lg"
                >
                    {loading ? (
                        <>
                            <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Entrando...
                        </>
                    ) : (
                        <>
                            Iniciar Sesión
                        </>
                    )}
                </button>
            </form>

            {/* Divider */}
            <div class="relative">
                <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-white/10"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                    <span class="px-4 bg-[var(--color-bg-card)] text-gray-500">O continúa con</span>
                </div>
            </div>

            {/* Google Button */}
            <button
                type="button"
                onClick={handleGoogleLogin}
                class="w-full py-3.5 sm:py-4 px-4 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 hover:border-white/30 transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] text-base"
            >
                <svg class="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
            </button>
        </div>
    );
}
