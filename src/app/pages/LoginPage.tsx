import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, Shield, CheckCircle } from 'lucide-react';

const loginSchema = z.object({
    email: z.string().email('Ingresa un correo válido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const { user, loading, signIn, signInWithGoogle } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    if (!loading && user) {
        return <Navigate to="/dashboard" replace />;
    }

    const onSubmit = async (data: LoginFormValues) => {
        const toastId = toast.loading('Iniciando sesión...');
        const result = await signIn(data.email, data.password);
        
        if (result.error) {
            toast.error(result.error, { id: toastId });
        } else {
            toast.success('¡Sesión iniciada correctamente!', { id: toastId });
            setSuccess(true);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">¡Bienvenido!</h3>
                    <p className="text-gray-400">Redirigiendo...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#0a0a0a] relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-orange-500/10 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-orange-400/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-[420px] relative z-10"
            >
                <a href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group text-sm">
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    Volver al inicio
                </a>

                <div className="text-center mb-6 sm:mb-8">
                    <a href="/" className="inline-block text-3xl sm:text-4xl font-bold tracking-tighter mb-2">
                        Dave<span className="text-orange-500">Fit</span>
                    </a>
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Bienvenido de nuevo</h1>
                    <p className="text-gray-400 mt-2 text-sm">Continúa tu transformación</p>
                </div>

                <div className="bg-[#141414]/90 backdrop-blur-xl p-6 sm:p-8 rounded-2xl sm:rounded-xl shadow-2xl border border-white/10">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">Correo electrónico</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className={`w-5 h-5 ${errors.email ? 'text-red-500' : 'text-gray-500'}`} />
                                </div>
                                <input
                                    type="email"
                                    {...register('email')}
                                    className={`w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/40 border text-white placeholder-gray-500 focus:ring-2 outline-none transition-all text-base ${errors.email ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500' : 'border-white/10 focus:ring-orange-500/50 focus:border-orange-500'}`}
                                    placeholder="tu@email.com"
                                />
                            </div>
                            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">Contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className={`w-5 h-5 ${errors.password ? 'text-red-500' : 'text-gray-500'}`} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    {...register('password')}
                                    className={`w-full pl-11 pr-12 py-3.5 rounded-xl bg-black/40 border text-white placeholder-gray-500 focus:ring-2 outline-none transition-all text-base ${errors.password ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500' : 'border-white/10 focus:ring-orange-500/50 focus:border-orange-500'}`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 px-4 bg-orange-500 hover:bg-orange-400 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 text-base sm:text-lg"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin h-5 w-5" />
                                    Entrando...
                                </>
                            ) : 'Iniciar Sesión'}
                        </button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-[#141414] text-gray-500">O continúa con</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={signInWithGoogle}
                        className="w-full py-3.5 px-4 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] text-base"
                    >
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                    </button>
                </div>

                <p className="text-center mt-6 text-sm text-gray-400">
                    ¿No tienes una cuenta?{' '}
                    <Link to="/register" className="text-orange-500 hover:text-orange-400 font-medium transition-colors hover:underline">
                        Regístrate gratis
                    </Link>
                </p>

                <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-orange-500" />
                        Seguro
                    </span>
                    <span className="flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-orange-500" />
                        Gratis
                    </span>
                </div>
            </motion.div>
        </div>
    );
}
