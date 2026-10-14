import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { normalizeEmail, getCsrfToken } from '../../lib/auth';
import { GoogleMark, BrandDumbbell, BadgeDumbbell, Star, StudentAvatars } from '../components/auth-brand';

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
      <div className="min-h-screen flex items-center justify-center bg-[#0b0b0c]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#ff5e00]/20 text-[#ff5e00] flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">¡Bienvenido!</h3>
          <p className="text-gray-400">Redirigiendo...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#0b0b0c]">
      {/* ===== Left Hero Section (desktop) ===== */}
      <section
        className="hidden lg:flex lg:w-5/12 xl:w-[46%] relative overflow-hidden flex-col justify-between p-10 xl:p-14 border-r border-white/5"
        style={{
          background:
            'radial-gradient(circle at 40% 35%, rgba(255, 94, 0, 0.14) 0%, rgba(20, 16, 14, 0.85) 60%, rgba(13, 13, 14, 1) 100%)',
        }}
        data-purpose="brand-hero"
      >
        {/* Ambient glow orbs */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 bg-[#ff5e00]/10 rounded-full blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-1/4 right-0 w-80 h-80 bg-[#ea580c]/10 rounded-full blur-3xl" />

        {/* Top branding */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group" title="DaveFit Inicio">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff5e00] to-amber-600 flex items-center justify-center shadow-lg shadow-[#ff5e00]/20 group-hover:scale-105 transition-transform">
              <BrandDumbbell />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white">
              Fit<span className="text-[#ff5e00]">Dave</span>
            </span>
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ff5e00]/10 border border-[#ff5e00]/20 text-[#fb923c]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e00] animate-pulse" />
            2025 Edición Campus
          </span>
        </div>

        {/* Middle: value proposition */}
        <div className="relative z-10 my-auto py-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#fb923c] text-xs font-bold uppercase tracking-wider mb-6">
            <BadgeDumbbell />
            Plan Estudiante
          </div>
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-[1.2] mb-5">
            Entrenamientos en casa hechos para estudiantes.
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed mb-8">
            Accede a más de 500 entrenamientos diseñados para dormitorios y espacios reducidos. Sin necesidad de equipo costoso ni traslados.
          </p>

          <div className="flex items-center gap-4 pt-2 pb-8 border-b border-white/10">
            <StudentAvatars />
            <div className="text-sm">
              <div className="flex items-center gap-1 text-amber-400">
                <Star />
                <span className="font-bold text-white">4.9/5</span>
                <span className="text-zinc-400 ml-1">por universitarios</span>
              </div>
              <p className="text-xs text-zinc-400">+2,000 estudiantes unidos esta semana</p>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.07]">
            <p className="text-xs italic text-zinc-300 mb-2">
              "Logré mantenerme en forma durante la temporada de exámenes finales sin salir de mi habitación. ¡FitDave es brutal!"
            </p>
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-medium text-white">Carlos M. — Medicina, 3er año</span>
              <span className="text-[#fb923c]">Rutinas de 20 min</span>
            </div>
          </div>
        </div>

        {/* Left footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-zinc-500 pt-6 border-t border-white/5">
          <span>© 2025 FitDave Inc.</span>
          <span>Hecho para superar tus metas</span>
        </div>
      </section>

      {/* ===== Right Form Section ===== */}
      <section
        className="w-full lg:w-7/12 xl:w-[54%] bg-[#0b0b0c] flex flex-col justify-center items-center px-4 sm:px-12 lg:px-16 xl:px-24 py-12 relative"
        data-purpose="auth-container"
      >
        {/* Mobile brand row */}
        <div className="w-full max-w-md lg:hidden flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ff5e00] flex items-center justify-center">
              <BadgeDumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Fit<span className="text-[#ff5e00]">Dave</span></span>
          </div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full max-w-md mx-auto"
        >
          {/* Mobile hero card */}
          <div className="lg:hidden relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#2a2a2b]/60 via-[#201f20]/40 to-[#0e0e0f] p-4 mb-6 shadow-xl">
            <div aria-hidden="true" className="absolute -top-10 -right-10 w-36 h-36 bg-[#ff5e00]/15 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ff5e00]/15 text-[#ff5e00]">
                <BadgeDumbbell className="w-4 h-4 text-[#ff5e00]" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Plan Estudiante</span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#353436] text-[#c5c6cc] text-[11px] font-semibold">
                2025 Edición Campus
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight leading-[1.2]">
              ¡Bienvenido de nuevo!
            </h1>
            <p className="mt-1 text-sm text-[#9ea3ae]">
              Introduce tus datos para acceder a tu plan de entrenamiento personalizado.
            </p>
            <div className="mt-4 flex items-center gap-2 pt-1">
              <StudentAvatars sizeClass="w-7 h-7" />
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-white">+2k</span>
                <span className="text-xs text-[#9ea3ae]">estudiantes unidos esta semana</span>
              </div>
            </div>
          </div>

          {/* Desktop form header */}
          <header className="hidden lg:block text-left mb-8">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              ¡Bienvenido de nuevo!
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Introduce tus datos para acceder a tu plan de entrenamiento.
            </p>
          </header>

          {/* Rate-limit warning */}
          {rateLimited && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400 font-medium">{rateLimited}</p>
            </div>
          )}

          {/* Google OAuth */}
          <div className="mb-6">
            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-white/10 bg-[#161619] hover:bg-[#1e1e23] hover:border-white/20 text-zinc-200 font-medium text-sm transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-[#ff5e00]/50"
              data-purpose="google-oauth-button"
            >
              <GoogleMark className="w-5 h-5 transition-transform group-hover:scale-105" />
              <span>Continuar con Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-7 flex items-center">
            <div aria-hidden="true" className="flex-1 border-t border-zinc-800" />
            <span className="bg-[#0b0b0c] pl-3 pr-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 whitespace-nowrap">
              O CONTINÚA CON EMAIL
            </span>
          </div>

          {/* Credentials form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2" htmlFor="email">
                Correo electrónico
              </label>
              <div
                className={`relative rounded-xl border bg-[#111113]/90 transition-all focus-within:border-[#ff5e00] focus-within:[box-shadow:0_0_0_2px_rgba(255,94,0,0.45)] ${
                  errors.email ? 'border-red-500/50' : 'border-zinc-800'
                }`}
              >
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Mail className={`h-5 w-5 ${errors.email ? 'text-red-500' : ''}`} />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className="w-full bg-transparent pl-11 pr-4 py-3.5 text-sm text-zinc-100 placeholder-zinc-500 rounded-xl border-none outline-none focus:ring-0"
                  placeholder="tu@email.com"
                />
              </div>
              {errors.email && <p className="mt-2 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300" htmlFor="password">
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-[#ff5e00] hover:text-[#fb923c] transition-colors"
                  tabIndex={-1}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div
                className={`relative rounded-xl border bg-[#111113]/90 transition-all focus-within:border-[#ff5e00] focus-within:[box-shadow:0_0_0_2px_rgba(255,94,0,0.45)] ${
                  errors.password ? 'border-red-500/50' : 'border-zinc-800'
                }`}
              >
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className={`h-5 w-5 ${errors.password ? 'text-red-500' : ''}`} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className="w-full bg-transparent pl-11 pr-11 py-3.5 text-sm text-zinc-100 placeholder-zinc-500 rounded-xl border-none outline-none focus:ring-0"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Mostrar u ocultar contraseña"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-2 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !!rateLimited}
              className="w-full mt-3 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#ff5e00] to-[#ff6a00] hover:from-[#ea580c] hover:to-[#ff5e00] text-white font-bold text-sm tracking-wide shadow-[0_10px_30px_-5px_rgba(255,94,0,0.35)] hover:shadow-[0_10px_40px_-5px_rgba(255,94,0,0.45)] transform active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          {/* Register link */}
          <div className="mt-8 text-center text-sm text-zinc-400">
            ¿No eres miembro?{' '}
            <Link
              to="/register"
              className="font-semibold text-[#ff5e00] hover:text-[#fb923c] ml-1 transition-colors underline-offset-4 hover:underline"
            >
              Regístrate gratis
            </Link>
          </div>

          {/* Mobile rating card */}
          <div className="lg:hidden mt-4 rounded-xl bg-[#1c1b1c] p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[#ff5e00]/20 flex items-center justify-center flex-shrink-0 text-[#ff5e00] mt-0.5">
              <Star className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">4.9 / 5.0</span>
                <span className="flex text-amber-400 text-xs" aria-hidden="true">★★★★★</span>
              </div>
              <p className="text-xs text-[#9ea3ae]">
                Más de 500 entrenamientos diseñados para dormitorios y espacios reducidos. Sin necesidad de equipo.
              </p>
            </div>
          </div>

          {/* Legal */}
          <p className="mt-8 text-center text-[11px] text-zinc-600 leading-normal">
            Al continuar, aceptas nuestros{' '}
            <a href="/terminos" className="text-zinc-500 hover:text-zinc-400 underline underline-offset-2">Términos de Servicio</a>{' '}
            y{' '}
            <a href="/privacidad" className="text-zinc-500 hover:text-zinc-400 underline underline-offset-2">Política de Privacidad</a>.
          </p>
        </motion.div>
      </section>
    </div>
  );
}
