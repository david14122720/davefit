import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { insforge } from '../../lib/insforge';
import { calcularBMR, calcularTDEE, calcularCaloriasObjetivo, calcularIMC, getCategoriaIMC } from '../../lib/nutrition';
import { toast } from 'sonner';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UploadCloud, Edit3, X, Zap, Flame, Check } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../lib/cropImage';

const profileSchema = z.object({
    nombre_completo: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    fecha_nacimiento: z.string().optional(),
    peso_actual: z.coerce.number().min(30, 'El peso es demasiado bajo').max(300, 'Revisa el peso ingresado').optional().or(z.literal('')),
    altura: z.coerce.number().min(100, 'Revisa la altura ingresada').max(250, 'Revisa la altura ingresada').optional().or(z.literal('')),
    dias_entrenamiento_semana: z.coerce.number().min(0).max(7).optional().or(z.literal('')),
    genero: z.enum(['masculino', 'femenino', 'otro', '']).optional(),
    objetivo: z.enum(['tonificar', 'ganar_fuerza', 'mantener_forma', 'perder_peso', '']).optional(),
    nivel: z.enum(['principiante', 'intermedio', 'avanzado', '']).optional(),
});

type ProfileFormValues = z.input<typeof profileSchema>;

export default function ProfilePage() {
    const { user, perfil, accessToken, updatePerfil } = useAuth();
    const [editing, setEditing] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [userStats, setUserStats] = useState<any>(null);

    // Crop UI states
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    useEffect(() => {
        if (!user) return;
        insforge.database
            .from('user_stats')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()
            .then(({ data }) => setUserStats(data));
    }, [user]);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<ProfileFormValues>({
        // @ts-ignore - Resolver issues with mixed types in input/output
        resolver: zodResolver(profileSchema),
        defaultValues: {
            nombre_completo: perfil?.nombre_completo || '',
            genero: (perfil?.genero as any) || '',
            fecha_nacimiento: perfil?.fecha_nacimiento || '',
            peso_actual: perfil?.peso_actual || '',
            altura: perfil?.altura || '',
            objetivo: (perfil?.objetivo as any) || '',
            nivel: (perfil?.nivel as any) || '',
            dias_entrenamiento_semana: perfil?.dias_entrenamiento_semana || '',
        }
    });

    useEffect(() => {
        if (perfil) {
            reset({
                nombre_completo: perfil.nombre_completo || '',
                genero: (perfil.genero as any) || '',
                fecha_nacimiento: perfil.fecha_nacimiento || '',
                peso_actual: perfil.peso_actual || '',
                altura: perfil.altura || '',
                objetivo: (perfil.objetivo as any) || '',
                nivel: (perfil.nivel as any) || '',
                dias_entrenamiento_semana: perfil.dias_entrenamiento_semana || '',
            });
        }
    }, [perfil, reset]);

    const userName = perfil?.nombre_completo || user?.email?.split('@')[0] || 'Usuario';
    const avatarUrl = perfil?.avatar_url || null;

    const { bmr, tdee, caloriasObjetivo, imc, categoriaIMC, edad } = useMemo(() => {
        let calculations = { 
            bmr: null as number | null, 
            tdee: null as number | null, 
            caloriasObjetivo: null as any, 
            imc: null as any, 
            categoriaIMC: '--', 
            edad: null as number | null 
        };
        if (perfil) {
            try {
                calculations.bmr = calcularBMR(perfil);
                calculations.tdee = calcularTDEE(perfil);
                calculations.caloriasObjetivo = calcularCaloriasObjetivo(perfil);
                calculations.imc = calcularIMC(perfil.peso_actual ?? null, perfil.altura ?? null);
                calculations.categoriaIMC = getCategoriaIMC(calculations.imc);
                if (perfil.fecha_nacimiento) {
                    const hoy = new Date();
                    const nac = new Date(perfil.fecha_nacimiento);
                    if (!isNaN(nac.getTime())) {
                        let age = hoy.getFullYear() - nac.getFullYear();
                        const m = hoy.getMonth() - nac.getMonth();
                        if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) age--;
                        calculations.edad = age;
                    }
                }
            } catch (e) {
                console.error('Error en cálculos:', e);
            }
        }
        return calculations;
    }, [perfil]);

    const datosCompletos = useMemo(() => !!(perfil?.peso_actual && perfil?.altura && perfil?.fecha_nacimiento && perfil?.genero), [perfil]);

    const onSubmit = async (data: ProfileFormValues) => {
        // Clean empty values for numeric fields
        const cleanedData = {
            ...data,
            peso_actual: data.peso_actual === '' ? null : data.peso_actual,
            altura: data.altura === '' ? null : data.altura,
            dias_entrenamiento_semana: data.dias_entrenamiento_semana === '' ? null : data.dias_entrenamiento_semana,
        };
        
        // @ts-ignore - Partial type issues with combined schema/profile
        const promise = updatePerfil(cleanedData);
        
        toast.promise(promise, {
            loading: 'Guardando perfil...',
            success: (res) => {
                if (res.error) throw new Error(res.error);
                setEditing(false);
                return '¡Perfil actualizado con éxito!';
            },
            error: (err) => `Error al actualizar: ${err.message}`
        });
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !accessToken || !user) return;

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            setImageSrc(reader.result?.toString() || null);
        });
        reader.readAsDataURL(file);
    };

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const processAndUploadCrop = async () => {
        if (!imageSrc || !croppedAreaPixels || !user) return;

        setUploadingAvatar(true);
        const toastId = toast.loading('Optimizando y subiendo imagen...');
        setImageSrc(null); // Ocultar el modal de recorte
        
        try {
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (!croppedBlob) throw new Error("No se pudo recortar la imagen");

            const ext = 'jpeg';
            const path = `avatars/${user.id}-${Date.now()}.${ext}`;

            const file = new File([croppedBlob], `avatar.${ext}`, { type: 'image/jpeg' });

            const { data, error } = await insforge.storage.from('avatares').upload(path, file);
            if (error) {
                throw error;
            }
            if (data?.url) {
                const res = await updatePerfil({ avatar_url: data.url });
                if (res.error) throw new Error(res.error);
                toast.success('Imagen de perfil actualizada y optimizada', { id: toastId });
            }
        } catch (err: any) {
            toast.error(`Error al subir imagen: ${err.message || 'Desconocido'}`, { id: toastId });
        } finally {
            setUploadingAvatar(false);
        }
    };

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants: Variants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <motion.div 
            className="max-w-6xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="bg-[#141414]/80 backdrop-blur-xl p-4 sm:p-6 md:p-8 rounded-2xl border border-white/10 flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:gap-8 mb-6 sm:mb-8 shadow-xl">
                <div className="relative flex-shrink-0 group">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-orange-500/20 flex items-center justify-center text-4xl sm:text-5xl border-4 border-[#141414] shadow-[0_0_30px_rgba(249,115,22,0.3)] overflow-hidden relative">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                            <span className="font-bold text-orange-500">{userName[0] || 'U'}</span>
                        )}
                        {uploadingAvatar && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                            </div>
                        )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-400 hover:scale-110 transition-all shadow-lg cursor-pointer z-10">
                        <UploadCloud className="w-5 h-5 text-black" />
                        <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploadingAvatar} />
                    </label>
                </div>

                <div className="text-center md:text-left flex-1 min-w-0">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 truncate">{userName}</h2>
                    <p className="text-gray-400 mb-3 truncate">{user?.email}</p>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        {perfil?.nivel && <span className="px-3 py-1 bg-white/5 rounded-full text-xs sm:text-sm border border-white/10 capitalize">{perfil.nivel}</span>}
                        {perfil?.objetivo && <span className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-xs sm:text-sm border border-orange-500/20 capitalize">{perfil.objetivo.replace('_', ' ')}</span>}
                        {edad !== null && (
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs sm:text-sm border border-blue-500/20">{edad} años</span>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => setEditing(!editing)}
                    className={`w-full md:w-auto px-6 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${editing ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-orange-500 hover:bg-orange-400 text-black shadow-lg hover:shadow-orange-500/25'}`}
                >
                    {editing ? <><X className="w-5 h-5" /> Cancelar</> : <><Edit3 className="w-5 h-5" /> Editar Perfil</>}
                </button>
            </motion.div>

            {/* Edit Form */}
            {editing && (
                <motion.form 
                    initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.3 }}
                    onSubmit={handleSubmit(onSubmit)} 
                    className="bg-[#141414]/80 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-white/10 mb-8 shadow-xl"
                >
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-orange-500" /> Modificar Datos
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        
                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Nombre completo</label>
                            <input {...register('nombre_completo')} className={`w-full px-4 py-3 rounded-xl bg-black/40 border text-white focus:ring-2 outline-none transition-all ${errors.nombre_completo ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:ring-orange-500/50 focus:border-orange-500'}`} />
                            {errors.nombre_completo && <p className="text-xs text-red-400 mt-1">{errors.nombre_completo.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Fecha de nacimiento</label>
                            <input type="date" {...register('fecha_nacimiento')} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Peso (kg)</label>
                            <input type="number" step="0.1" {...register('peso_actual')} className={`w-full px-4 py-3 rounded-xl bg-black/40 border text-white focus:ring-2 outline-none transition-all ${errors.peso_actual ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:ring-orange-500/50 focus:border-orange-500'}`} />
                            {errors.peso_actual && <p className="text-xs text-red-400 mt-1">{errors.peso_actual.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Altura (cm)</label>
                            <input type="number" step="1" {...register('altura')} className={`w-full px-4 py-3 rounded-xl bg-black/40 border text-white focus:ring-2 outline-none transition-all ${errors.altura ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:ring-orange-500/50 focus:border-orange-500'}`} />
                            {errors.altura && <p className="text-xs text-red-400 mt-1">{errors.altura.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Días de entrenamiento/semana</label>
                            <input type="number" {...register('dias_entrenamiento_semana')} className={`w-full px-4 py-3 rounded-xl bg-black/40 border text-white focus:ring-2 outline-none transition-all ${errors.dias_entrenamiento_semana ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:ring-orange-500/50 focus:border-orange-500'}`} />
                            {errors.dias_entrenamiento_semana && <p className="text-xs text-red-400 mt-1">{errors.dias_entrenamiento_semana.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Género</label>
                            <select {...register('genero')} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:ring-2 focus:ring-orange-500/50 outline-none">
                                <option value="">Seleccionar</option>
                                <option value="masculino">Masculino</option>
                                <option value="femenino">Femenino</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Objetivo</label>
                            <select {...register('objetivo')} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:ring-2 focus:ring-orange-500/50 outline-none">
                                <option value="">Seleccionar</option>
                                <option value="perder_peso">Bajar grasa (Perder peso)</option>
                                <option value="tonificar">Bajar grasa (Tonificar)</option>
                                <option value="ganar_fuerza">Ganar músculo (fuerza)</option>
                                <option value="mantener_forma">Mantener peso</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Nivel</label>
                            <select {...register('nivel')} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:ring-2 focus:ring-orange-500/50 outline-none">
                                <option value="">Seleccionar</option>
                                <option value="principiante">Principiante</option>
                                <option value="intermedio">Intermedio</option>
                                <option value="avanzado">Avanzado</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-8 flex gap-4">
                        <button type="submit" disabled={isSubmitting} className="flex-1 px-8 py-3.5 bg-orange-500 text-black font-bold rounded-xl hover:bg-orange-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20">
                            {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</> : '💾 Guardar Cambios'}
                        </button>
                    </div>
                </motion.form>
            )}

            {/* Nutrition Cards */}
            {datosCompletos && (
                <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
                    <div className="bg-[#141414]/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-white/10 shadow-lg hover:border-orange-500/20 transition-colors">
                        <div className="flex items-center gap-2 mb-1"><span className="text-2xl">🔥</span><h3 className="text-white text-sm sm:text-base font-bold">Metabolismo Basal</h3></div>
                        <p className="text-gray-500 text-xs mb-3">Calorías que quemas en reposo (sin moverte)</p>
                        <div className="flex items-baseline gap-2"><span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{bmr || '--'}</span><span className="text-gray-500 text-sm font-medium">kcal/día</span></div>
                    </div>
                    <div className="bg-[#141414]/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-white/10 shadow-lg hover:border-orange-500/20 transition-colors">
                        <div className="flex items-center gap-2 mb-1"><span className="text-2xl">⚡</span><h3 className="text-white text-sm sm:text-base font-bold">Gasto Total</h3></div>
                        <p className="text-gray-500 text-xs mb-3">Lo que quemas en total (incluye ejercicio)</p>
                        <div className="flex items-baseline gap-2"><span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{tdee || '--'}</span><span className="text-gray-500 text-sm font-medium">kcal/día</span></div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-orange-500/30 sm:col-span-2 md:col-span-1 shadow-lg shadow-orange-500/5 group relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-10 transform scale-150 rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-0">
                            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z"/></svg>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                {perfil?.objetivo === 'perder_peso' || perfil?.objetivo === 'tonificar' ? (
                                    <span className="text-2xl">🎯</span>
                                ) : perfil?.objetivo === 'ganar_fuerza' ? (
                                    <span className="text-2xl">💪</span>
                                ) : (
                                    <span className="text-2xl">⚖️</span>
                                )}
                                <h3 className="text-orange-400 text-sm font-black uppercase tracking-wider">
                                    {perfil?.objetivo === 'perder_peso' || perfil?.objetivo === 'tonificar' ? 'Bajar grasa' : 
                                     perfil?.objetivo === 'ganar_fuerza' ? 'Ganar músculo' : 
                                     'Mantener peso'}
                                </h3>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-4xl sm:text-5xl font-black text-orange-400 tracking-tighter drop-shadow-sm">
                                    {caloriasObjetivo?.calorias || '--'}
                                </span>
                                <span className="text-orange-500/70 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest leading-tight">
                                    calorías recomendadas según <br/> tu perfil y objetivo
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Datos */}
            {perfil && (
                <motion.div variants={itemVariants} className="bg-[#141414]/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-white/10 shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                         Tus Métricas Físicas
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                        {[
                            { emoji: '⚖️', label: 'Peso', value: perfil.peso_actual, unit: 'kg' },
                            { emoji: '📏', label: 'Altura', value: perfil.altura, unit: 'cm' },
                            { emoji: '🎂', label: 'Edad', value: edad, unit: 'años' },
                            { emoji: '📉', label: 'IMC', value: imc?.toFixed(1), unit: categoriaIMC, desc: 'Relación peso/altura' },
                        ].map(d => (
                            <div key={d.label} className="p-4 sm:p-5 bg-black/40 rounded-xl text-center border border-white/5 hover:bg-white/5 transition-colors">
                                <div className="text-2xl sm:text-3xl mb-2">{d.emoji}</div>
                                <div className="text-gray-400 text-xs sm:text-sm font-bold uppercase tracking-wide mb-1">{d.label}</div>
                                <div className="text-2xl sm:text-3xl font-extrabold text-white">{d.value !== null && d.value !== undefined ? d.value : '--'} <span className="text-xs sm:text-sm font-medium text-gray-500">{d.unit}</span></div>
                                {d.desc && <p className="text-gray-600 text-[10px] mt-1">{d.desc}</p>}
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Gamificación - XP & Nivel */}
            {userStats && (
                <motion.div variants={itemVariants} className="bg-gradient-to-br from-orange-500/10 to-purple-500/10 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-orange-500/20 shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-orange-500" /> Progreso & Gamificación
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-black/40 rounded-xl text-center border border-white/5">
                            <div className="text-3xl mb-2">⭐</div>
                            <div className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-1">Nivel</div>
                            <div className="text-3xl font-extrabold text-orange-400">{userStats.nivel || 1}</div>
                        </div>
                        <div className="p-4 bg-black/40 rounded-xl text-center border border-white/5 flex flex-col items-center justify-center">
                            <div className="mb-2">
                                <Flame className={`w-10 h-10 ${(userStats.dias_racha || 0) > 0 ? 'text-orange-500 fill-orange-500/20' : 'text-gray-600'}`} />
                            </div>
                            <div className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-1">Racha</div>
                            <div className="text-3xl font-extrabold text-white">{userStats.dias_racha || 0} <span className="text-xs font-medium text-gray-500">días</span></div>
                        </div>
                        <div className="p-4 bg-black/40 rounded-xl text-center border border-white/5">
                            <div className="text-3xl mb-2">⚡</div>
                            <div className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-1">XP Total</div>
                            <div className="text-3xl font-extrabold text-yellow-400">{(userStats.xp_total || 0).toLocaleString()}</div>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-black/40 rounded-xl">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progreso al siguiente nivel</span>
                        </div>
                        <div className="h-3 bg-black/60 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full"
                                style={{ width: `${Math.min(((userStats.xp_total || 0) % 100) / 100 * 100, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-right">{userStats.xp_total || 0} XP</p>
                    </div>
                </motion.div>
            )}

            {/* Modal de Recorte de Imagen (Crop UI) */}
            <AnimatePresence>
                {imageSrc && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-4"
                    >
                        <div className="relative w-full max-w-sm sm:max-w-md h-[400px] sm:h-[500px] bg-[#141414] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col">
                            <div className="relative flex-1 bg-black/50">
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={false}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            </div>
                            <div className="p-4 sm:p-5 bg-[#1a1a1a] flex flex-col gap-4">
                                <div>
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3 block text-center">Ajustar Tamaño</label>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        aria-labelledby="Zoom"
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="w-full accent-orange-500 cursor-pointer"
                                    />
                                </div>
                                <div className="flex justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setImageSrc(null)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-colors active:scale-95"
                                    >
                                        <X className="w-5 h-5" /> Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={processAndUploadCrop}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-extrabold shadow-[0_4px_15px_rgba(249,115,22,0.3)] hover:shadow-[0_4px_25px_rgba(249,115,22,0.5)] transition-all active:scale-95"
                                    >
                                        <Check className="w-5 h-5" /> Confirmar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
