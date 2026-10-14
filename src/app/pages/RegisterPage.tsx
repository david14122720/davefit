import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight, CheckCircle, ShieldCheck, CreditCard, School } from 'lucide-react';
import { normalizeEmail, sanitizeName, evaluatePassword, PASSWORD_REQUIREMENTS, getCsrfToken } from '../../lib/auth';
import { GoogleMark, FilledDumbbell, BoltIcon, Star } from '../components/auth-brand';

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Ingresa tu nombre completo')
      .max(100, 'Máximo 100 caracteres')
      .transform((v) => sanitizeName(v)),
    email: z
      .string()
      .min(1, 'Ingresa tu correo electrónico')
      .email('Ingresa un correo válido')
      .transform((v) => normalizeEmail(v)),
    password: z
      .string()
      .min(PASSWORD_REQUIREMENTS.minLength, PASSWORD_REQUIREMENTS.message.minLength)
      .max(PASSWORD_REQUIREMENTS.maxLength, PASSWORD_REQUIREMENTS.message.maxLength)
      .regex(/[A-Z]/, PASSWORD_REQUIREMENTS.message.upper)
      .regex(/[a-z]/, PASSWORD_REQUIREMENTS.message.lower)
      .regex(/[0-9]/, PASSWORD_REQUIREMENTS.message.number)
      .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/, PASSWORD_REQUIREMENTS.message.special),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
  .refine((data) => evaluatePassword(data.password).score >= 3, {
    message: PASSWORD_REQUIREMENTS.message.strong,
    path: ['password'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color, checks } = evaluatePassword(password);

  if (!password) return null;

  const bars = [
    score >= 1,
    score >= 2,
    score >= 3,
    score >= 4,
  ];

  const colorsMap = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
  ];

  return (
    <div className="mt-1.5 space-y-1">
      {/* Barra */}
      <div className="flex gap-1">
        {bars.map((active, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              active ? colorsMap[score] : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      {/* Label */}
      <div className="flex justify-between items-center">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>
          {label}
        </span>
        {score >= 3 ? (
          <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
        ) : null}
      </div>
      {/* Checks */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {[
          { label: '8+ caracteres', ok: checks.minLength },
          { label: 'Mayúscula', ok: checks.hasUpper },
          { label: 'Minúscula', ok: checks.hasLower },
          { label: 'Número', ok: checks.hasNumber },
          { label: 'Caracter especial', ok: checks.hasSpecial },
        ].map(({ label, ok }) => (
          <span
            key={label}
            className={`text-[10px] font-medium ${
              ok ? 'text-green-500' : 'text-gray-500'
            }`}
          >
            {ok ? '✓' : '○'} {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Small avatar trio used by the mobile hero card (D / A / V). */
function HeroAvatarTrio() {
  return (
    <div className="flex -space-x-2 overflow-hidden" aria-hidden="true">
      <div className="inline-block h-6 w-6 rounded-full bg-[#353436] flex items-center justify-center text-[10px] font-bold text-[#e5e2e3] ring-1 ring-[#1c1b1c]">D</div>
      <div className="inline-block h-6 w-6 rounded-full bg-[#ff5e00]/80 flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-[#1c1b1c]">A</div>
      <div className="inline-block h-6 w-6 rounded-full bg-[#d77917] flex items-center justify-center text-[10px] font-bold text-[#432100] ring-1 ring-[#1c1b1c]">V</div>
    </div>
  );
}

export default function RegisterPage() {
  const { user, loading, signUp, signInWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  // Inicializar token CSRF al montar (double-submit cookie)
  useEffect(() => { getCsrfToken(); }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const watchedPassword = watch('password', '');

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: RegisterFormValues) => {
    const toastId = toast.loading('Creando cuenta...');
    const result = await signUp(data.email, data.password, data.fullName);

    if (result.error) {
      toast.error(result.error, { id: toastId, duration: 5000 });
    } else {
      toast.success('¡Cuenta creada correctamente!', { id: toastId });
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
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[#ff5e00]/20 text-[#ff5e00] flex items-center justify-center">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1.5">¡Cuenta creada!</h3>
          <p className="text-gray-400">Redirigiendo al dashboard...</p>
        </motion.div>
      </div>
    );
  }

  const inputBaseClass = (hasError: boolean) =>
    `w-full h-11 pl-10 pr-4 bg-[#141418] border rounded-xl text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:ring-2 ${
      hasError
        ? 'border-red-500/50 focus:ring-red-500/40 focus:border-red-500/60'
        : 'border-zinc-800 focus:ring-[#ff5e00]/60 focus:border-[#ff5e00]'
    }`;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0B0B0E]">
      {/* ===== Left Brand Showcase (desktop) ===== */}
      <section
        className="relative hidden lg:flex lg:w-[48%] bg-[#0e0e13] border-b lg:border-b-0 lg:border-r border-[#222229] p-8 lg:p-14 xl:p-16 flex-col justify-between overflow-hidden"
        data-purpose="brand-showcase"
      >
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at 45% 50%, rgba(255, 94, 0, 0.16) 0%, rgba(11, 11, 14, 0) 65%)' }}
        />

        {/* Top: logo + badges */}
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between sm:justify-start sm:gap-4">
            <Link to="/" className="flex items-center gap-2 group" title="DaveFit Inicio">
              <div className="w-10 h-10 rounded-xl bg-[#FF5E00] flex items-center justify-center text-white shadow-lg shadow-[#FF5E00]/25 transition-transform group-hover:scale-105">
                <FilledDumbbell className="w-5 h-5 fill-current text-white" />
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-white">
                Fit<span className="text-[#FF5E00]">Dave</span>
              </span>
            </Link>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FF5E00]/10 text-[#FF5E00] border border-[#FF5E00]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5E00] animate-pulse" />
              2025 Edición Campus
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-orange-500/10 border border-[#FF5E00]/30 text-[#FF5E00] text-xs font-bold tracking-wider uppercase">
            <BoltIcon />
            Plan Estudiante Activo
          </div>
        </div>

        {/* Center: headline + social proof */}
        <div className="relative z-10 my-8 lg:my-0 space-y-5 max-w-xl">
          <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
            Entrenamientos en casa{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#FF5E00]/90">
              hechos para estudiantes.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 font-normal leading-relaxed">
            Accede a más de 500 entrenamientos diseñados para dormitorios y espacios reducidos. Sin necesidad de equipo costoso ni suscripciones de gimnasio tradicionales.
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-4 sm:gap-6 border-t border-zinc-800/80">
            <div className="flex items-center -space-x-2.5" aria-hidden="true">
              <div className="w-9 h-9 rounded-full ring-2 ring-[#0B0B0E] bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-200">MR</div>
              <div className="w-9 h-9 rounded-full ring-2 ring-[#0B0B0E] bg-zinc-600 flex items-center justify-center text-xs font-semibold text-zinc-200">SL</div>
              <div className="w-9 h-9 rounded-full ring-2 ring-[#0B0B0E] bg-[#FF5E00] flex items-center justify-center text-xs font-semibold text-white">CP</div>
              <div className="w-9 h-9 rounded-full ring-2 ring-[#0B0B0E] bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300">+2k</div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-amber-400">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
                <span className="ml-1 text-xs font-bold text-zinc-200">4.9/5</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                <span className="font-semibold text-white">+2k estudiantes</span> unidos esta semana
              </p>
            </div>
          </div>
        </div>

        {/* Bottom: guarantee card */}
        <div className="relative z-10 pt-4">
          <div className="rounded-xl bg-[#141419]/90 border border-zinc-800/90 p-4 text-xs text-zinc-400 flex items-center justify-between gap-3 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#FF5E00] flex-shrink-0" />
              <span>Sin tarjeta requerida para iniciar</span>
            </div>
            <span className="text-zinc-600">•</span>
            <div>Cancela cuando quieras</div>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <div className="hidden sm:inline text-zinc-300 font-medium">100% universitario</div>
          </div>
        </div>
      </section>

      {/* ===== Right Registration Form ===== */}
      <section
        className="w-full lg:w-[52%] bg-[#0B0B0E] p-4 sm:p-10 lg:p-14 xl:p-16 flex flex-col justify-center items-center"
        data-purpose="registration-form-panel"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full max-w-[440px] space-y-6"
        >
          {/* Mobile hero card */}
          <div className="lg:hidden relative w-full overflow-hidden rounded-xl bg-[#1c1b1c] p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#201f20] flex items-center justify-center text-[#ff5e00] shadow-sm">
                  <FilledDumbbell className="w-5 h-5 fill-current text-[#ff5e00]" />
                </div>
                <span className="text-lg font-bold text-white tracking-tight">
                  Fit<span className="text-[#ff5e00]">Dave</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ff5e00]/15 text-[#ff5e00]">
                <School className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">Plan Estudiante</span>
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
              Crea tu <span className="text-[#ff5e00]">Cuenta</span>
            </h1>
            <p className="mt-1 text-sm text-[#9ea3ae]">
              Entrena desde tu habitación sin equipamiento costoso. Rutinas adaptadas a tu ritmo.
            </p>
            <div className="mt-3 pt-2 flex items-center justify-between bg-[#0e0e0f]/70 rounded-lg p-2.5">
              <div className="flex items-center gap-2">
                <HeroAvatarTrio />
                <span className="text-xs font-semibold text-white">+2k universitarios</span>
              </div>
              <div className="flex items-center gap-1 bg-[#201f20] px-2 py-0.5 rounded-full">
                <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                <span className="text-xs font-bold text-white">4.9/5</span>
              </div>
            </div>
          </div>

          {/* Desktop header */}
          <header className="hidden lg:block space-y-1.5 text-left">
            <h2 className="text-3xl font-bold tracking-tight text-white">Crea tu Cuenta</h2>
            <p className="text-sm text-zinc-400">Introduce tus datos para comenzar tu entrenamiento.</p>
          </header>

          {/* Google OAuth */}
          <div className="pt-1">
            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full h-12 px-4 rounded-xl bg-[#17171C] hover:bg-[#1E1E24] border border-zinc-800 text-zinc-200 hover:text-white font-medium text-sm flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#FF5E00]/50"
            >
              <GoogleMark className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Continuar con Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="flex-1 border-t border-zinc-800" />
            <span className="bg-[#0B0B0E] px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
              O REGÍSTRATE CON EMAIL
            </span>
            <div className="flex-1 border-t border-zinc-800" />
          </div>

          {/* Registration form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 rounded-xl bg-[#1c1b1c] p-4 shadow-md lg:bg-transparent lg:p-0 lg:shadow-none"
          >
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5" htmlFor="fullname">
                Nombre completo
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <User className={`w-4 h-4 ${errors.fullName ? 'text-red-500' : ''}`} />
                </div>
                <input
                  id="fullname"
                  type="text"
                  autoComplete="name"
                  {...register('fullName')}
                  className={inputBaseClass(!!errors.fullName)}
                  placeholder="Tu nombre completo"
                />
              </div>
              {errors.fullName && <p className="mt-1.5 text-xs text-red-500">{errors.fullName.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5" htmlFor="reg-email">
                Correo electrónico
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Mail className={`w-4 h-4 ${errors.email ? 'text-red-500' : ''}`} />
                </div>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`${inputBaseClass(!!errors.email)} pr-10`}
                  placeholder="tu@email.com"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#FF5E00]/80">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5" htmlFor="reg-password">
                Contraseña
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className={`w-4 h-4 ${errors.password ? 'text-red-500' : ''}`} />
                </div>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('password')}
                  className={`${inputBaseClass(!!errors.password)} pr-10`}
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Mostrar u ocultar contraseña"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
              {/* Strength meter */}
              <PasswordStrengthBar password={watchedPassword || ''} />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5" htmlFor="confirm-password">
                Confirmar contraseña
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className={`w-4 h-4 ${errors.confirmPassword ? 'text-red-500' : ''}`} />
                </div>
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className={`${inputBaseClass(!!errors.confirmPassword)} pr-10`}
                  placeholder="Repite la contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label="Mostrar u ocultar confirmación de contraseña"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-[#FF5E00] hover:bg-[#E05300] active:scale-[0.99] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FF5E00]/30 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4" />
                    <span>Creando cuenta...</span>
                  </>
                ) : (
                  <>
                    <span>Crear Cuenta</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Mobile perks */}
          <div className="lg:hidden grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#1c1b1c] text-center shadow-sm">
              <CreditCard className="w-4 h-4 text-[#ff5e00] mb-1" />
              <span className="text-xs font-medium text-white leading-tight">Sin tarjeta</span>
              <span className="text-[10px] text-[#9ea3ae]">requerida</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#1c1b1c] text-center shadow-sm">
              <ShieldCheck className="w-4 h-4 text-[#ff5e00] mb-1" />
              <span className="text-xs font-medium text-white leading-tight">100% libre</span>
              <span className="text-[10px] text-[#9ea3ae]">universitario</span>
            </div>
          </div>

          {/* Login link */}
          <footer className="pt-2 text-center text-xs text-zinc-400">
            ¿Ya eres miembro?{' '}
            <Link to="/login" className="text-[#FF5E00] font-semibold hover:underline ml-1">
              Inicia Sesión
            </Link>
          </footer>

          {/* Legal */}
          <p className="text-center text-[10px] sm:text-[11px] text-zinc-600 leading-relaxed">
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
