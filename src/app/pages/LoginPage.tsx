import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, Dumbbell, ArrowRight, Users, ShieldAlert } from 'lucide-react';
import { normalizeEmail, getCsrfToken } from '../../lib/auth';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Ingresa tu correo electrónico')
    .email('Ingresa un correo válido')
    .transform((v) => normalizeEmail(v)),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { user, loading, signIn, signInWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [rateLimited, setRateLimited] = useState<string | null>(null);

  // Inicializar token CSRF al montar (double-submit cookie)
  useEffect(() => { getCsrfToken(); }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: LoginFormValues) => {
    const toastId = toast.loading('Iniciando sesión...');
    setRateLimited(null);

    const result = await signIn(data.email, data.password);

    if (result.error) {
      toast.error(result.error, { id: toastId, duration: 5000 });
      if (result.error.toLowerCase().includes('demasiados intentos') ||
          result.error.toLowerCase().includes('espera')) {
        setRateLimited(result.error);
      }
    } else {
      toast.success('¡Sesión iniciada correctamente!', { id: toastId });
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 text-primary flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">¡Bienvenido!</h3>
          <p className="text-gray-400">Redirigiendo...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background-dark">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex w-[40%] bg-background-dark relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
        <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          <a href="/" className="inline-block text-3xl font-bold tracking-tighter mb-4">
            <span className="text-white">Fit</span><span className="text-primary">Dave</span>
          </a>

          <div className="flex items-center gap-2 text-primary mb-4">
            <Dumbbell className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">Plan Estudiante</span>
          </div>

          <p className="text-on-surface-variant/80 text-sm leading-relaxed mb-8">
            Entrenamientos en casa hechos para estudiantes. Accede a más de 500 entrenamientos diseñados para dormitorios y espacios reducidos. Sin necesidad de equipo.
          </p>

          <div className="flex items-center gap-2 text-on-surface-variant/60 text-sm mb-10">
            <Users className="w-4 h-4" />
            <span><strong className="text-white">+2k</strong> Estudiantes unidos esta semana</span>
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full py-3.5 px-4 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] text-base"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuar con Google
          </button>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-[60%] min-h-screen flex items-center justify-center p-6 lg:p-12 bg-surface-low">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <a href="/" className="inline-block text-3xl font-bold tracking-tighter">
              <span className="text-white">Fit</span><span className="text-primary">Dave</span>
            </a>
          </div>

          <h1 className="text-2xl lg:text-3xl font-bold text-on-surface mb-2">¡Bienvenido de nuevo!</h1>
          <p className="text-on-surface-variant/70 text-sm mb-8">
            Introduce tus datos para acceder a tu plan de entrenamiento.
          </p>

          {/* Rate-limit warning */}
          {rateLimited && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400 font-medium">{rateLimited}</p>
            </div>
          )}

          {/* Mobile Google button */}
          <button
            type="button"
            onClick={signInWithGoogle}
            className="lg:hidden w-full py-3.5 px-4 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] text-base mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuar con Google
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-surface-low text-on-surface-variant/60 text-[11px] font-semibold uppercase tracking-[0.15em]">
                O CONTINÚA CON EMAIL
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface-variant/80">Correo electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className={`w-5 h-5 ${errors.email ? 'text-red-500' : 'text-on-surface-variant/40'}`} />
                </div>
                <input
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`w-full pl-11 pr-4 py-3.5 rounded-lg bg-surface border text-white placeholder-on-surface-variant/40 focus:ring-4 outline-none transition-all text-base ${
                    errors.email
                      ? 'border-red-500/50 focus:ring-red-500/10 focus:border-red-500/50'
                      : 'border-white/10 focus:ring-primary/20 focus:border-primary/50'
                  }`}
                  placeholder="tu@email.com"
                />
              </div>
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-on-surface-variant/80">Contraseña</label>
                <button type="button" className="text-xs text-primary hover:text-primary/80 transition-colors" tabIndex={-1}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className={`w-5 h-5 ${errors.password ? 'text-red-500' : 'text-on-surface-variant/40'}`} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className={`w-full pl-11 pr-12 py-3.5 rounded-lg bg-surface border text-white placeholder-on-surface-variant/40 focus:ring-4 outline-none transition-all text-base ${
                    errors.password
                      ? 'border-red-500/50 focus:ring-red-500/10 focus:border-red-500/50'
                      : 'border-white/10 focus:ring-primary/20 focus:border-primary/50'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !!rateLimited}
              className="w-full py-3.5 px-4 bg-primary hover:bg-primary-hover text-primary-on font-bold rounded-lg shadow-[0_10px_30px_rgba(255,107,0,0.25)] hover:shadow-[0_10px_40px_rgba(255,107,0,0.35)] transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Entrando...
                </>
              ) : (
                <>
                  Iniciar Sesión
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center mt-6 text-sm text-on-surface-variant/60">
            ¿No eres miembro?{' '}
            <Link to="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Regístrate
            </Link>
          </p>

          {/* Terms footer */}
          <p className="text-center mt-6 text-[11px] text-on-surface-variant/40 leading-relaxed">
            Al continuar, aceptas nuestros{' '}
            <a href="/terminos" className="text-on-surface-variant/60 hover:text-on-surface-variant underline underline-offset-2">Términos de Servicio</a>{' '}
            y{' '}
            <a href="/privacidad" className="text-on-surface-variant/60 hover:text-on-surface-variant underline underline-offset-2">Política de Privacidad</a>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
