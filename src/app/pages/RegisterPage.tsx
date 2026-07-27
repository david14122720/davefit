import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight, CheckCircle, Dumbbell, Users, ShieldCheck } from 'lucide-react';
import { normalizeEmail, sanitizeName, evaluatePassword, PASSWORD_REQUIREMENTS, getCsrfToken } from '../../lib/auth';

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
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/, PASSWORD_REQUIREMENTS.message.special),
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
    <div className="mt-2 space-y-1.5">
      {/* Barra */}
      <div className="flex gap-1">
        {bars.map((active, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
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
      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
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

export default function RegisterPage() {
  const { user, loading, signUp, signInWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

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
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 text-primary flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">¡Cuenta creada!</h3>
          <p className="text-gray-400">Redirigiendo al dashboard...</p>
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

          <div className="flex items-center gap-2 text-on-surface-variant/60 text-sm mb-6">
            <Users className="w-4 h-4" />
            <span><strong className="text-white">+2k</strong> Estudiantes unidos esta semana</span>
          </div>
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

          <h1 className="text-2xl lg:text-3xl font-bold text-on-surface mb-2">Crea tu Cuenta</h1>
          <p className="text-on-surface-variant/70 text-sm mb-8">
            Introduce tus datos para comenzar tu entrenamiento.
          </p>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full py-3.5 px-4 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] text-base mb-6"
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
                O REGÍSTRATE CON EMAIL
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface-variant/80">Nombre completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className={`w-5 h-5 ${errors.fullName ? 'text-red-500' : 'text-on-surface-variant/40'}`} />
                </div>
                <input
                  type="text"
                  autoComplete="name"
                  {...register('fullName')}
                  className={`w-full pl-11 pr-4 py-3.5 rounded-lg bg-surface border text-white placeholder-on-surface-variant/40 focus:ring-4 outline-hidden transition-all text-base ${
                    errors.fullName
                      ? 'border-red-500/50 focus:ring-red-500/10 focus:border-red-500/50'
                      : 'border-white/10 focus:ring-primary/20 focus:border-primary/50'
                  }`}
                  placeholder="Tu nombre completo"
                />
              </div>
              {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
            </div>

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
                  className={`w-full pl-11 pr-4 py-3.5 rounded-lg bg-surface border text-white placeholder-on-surface-variant/40 focus:ring-4 outline-hidden transition-all text-base ${
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
              <label className="block text-sm font-medium text-on-surface-variant/80">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className={`w-5 h-5 ${errors.password ? 'text-red-500' : 'text-on-surface-variant/40'}`} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('password')}
                  className={`w-full pl-11 pr-12 py-3.5 rounded-lg bg-surface border text-white placeholder-on-surface-variant/40 focus:ring-4 outline-hidden transition-all text-base ${
                    errors.password
                      ? 'border-red-500/50 focus:ring-red-500/10 focus:border-red-500/50'
                      : 'border-white/10 focus:ring-primary/20 focus:border-primary/50'
                  }`}
                  placeholder="Mínimo 8 caracteres"
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
              {/* Strength meter */}
              <PasswordStrengthBar password={watchedPassword || ''} />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface-variant/80">Confirmar contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className={`w-5 h-5 ${errors.confirmPassword ? 'text-red-500' : 'text-on-surface-variant/40'}`} />
                </div>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className={`w-full pl-11 pr-12 py-3.5 rounded-lg bg-surface border text-white placeholder-on-surface-variant/40 focus:ring-4 outline-hidden transition-all text-base ${
                    errors.confirmPassword
                      ? 'border-red-500/50 focus:ring-red-500/10 focus:border-red-500/50'
                      : 'border-white/10 focus:ring-primary/20 focus:border-primary/50'
                  }`}
                  placeholder="Repite la contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-primary hover:bg-primary-hover text-primary-on font-bold rounded-lg shadow-[0_10px_30px_rgba(255,107,0,0.25)] hover:shadow-[0_10px_40px_rgba(255,107,0,0.35)] transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear Cuenta
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center mt-6 text-sm text-on-surface-variant/60">
            ¿Ya eres miembro?{' '}
            <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Inicia Sesión
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
