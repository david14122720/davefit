import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { insforge } from '../../lib/insforge';
import { calcularBMR, calcularTDEE, calcularCaloriasObjetivo, calcularIMC, getCategoriaIMC } from '../../lib/nutrition';
import { toast } from 'sonner';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UploadCloud, Edit3, X, Zap, Flame, Check, Scale, Ruler, User as UserIcon, Calendar, Target, Sparkles } from 'lucide-react';
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
        // @ts-ignore
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
        const cleanedData = {
            ...data,
            peso_actual: data.peso_actual === '' ? null : data.peso_actual,
            altura: data.altura === '' ? null : data.altura,
            dias_entrenamiento_semana: data.dias_entrenamiento_semana === '' ? null : data.dias_entrenamiento_semana,
        };
        
        // @ts-ignore
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
        reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || null));
        reader.readAsDataURL(file);
    };

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => setCroppedAreaPixels(croppedAreaPixels), []);

    const processAndUploadCrop = async () => {
        if (!imageSrc || !croppedAreaPixels || !user) return;
        setUploadingAvatar(true);
        const toastId = toast.loading('Subiendo imagen...');
        setImageSrc(null);
        try {
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (!croppedBlob) throw new Error("Error al procesar imagen");
            const ext = 'jpeg';
            const path = `avatars/${user.id}-${Date.now()}.${ext}`;
            const file = new File([croppedBlob], `avatar.${ext}`, { type: 'image/jpeg' });
            const { data, error } = await insforge.storage.from('avatares').upload(path, file);
            if (error) throw error;
            if (data?.url) {
                const res = await updatePerfil({ avatar_url: data.url });
                if (res.error) throw new Error(res.error);
                toast.success('Imagen actualizada', { id: toastId });
            }
        } catch (err: any) {
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally {
            setUploadingAvatar(false);
        }
    };

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    const itemVariants: Variants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <motion.div 
            className="max-w-4xl mx-auto px-4 pb-32 pt-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Card - Premium Mobile Design */}
            <motion.div variants={itemVariants} className="bg-[#141414]/80 backdrop-blur-3xl p-6 sm:p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-6 mb-8 shadow-2xl relative overflow-hidden group">
                {/* Background Decoration */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-orange-500/20 transition-colors duration-700" />
                
                {/* Avatar Section */}
                <div className="relative z-10 flex-shrink-0">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] bg-orange-500/10 flex items-center justify-center text-4xl sm:text-5xl border-4 border-white/5 shadow-2xl overflow-hidden relative rotate-3 group-hover:rotate-0 transition-all duration-500">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                            <span className="font-black text-orange-500">{userName[0]?.toUpperCase() || 'U'}</span>
                        )}
                        {uploadingAvatar && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                            </div>
                        )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center hover:bg-orange-400 hover:scale-110 transition-all shadow-xl cursor-pointer z-20 border-4 border-[#141414]">
                        <UploadCloud className="w-4 h-4 text-black" />
                        <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploadingAvatar} />
                    </label>
                </div>

                {/* Info Section */}
                <div className="text-center z-10 w-full">
                    <h2 className="text-xl sm:text-3xl font-black text-white mb-2 tracking-tight line-clamp-2 leading-tight px-2">
                        {userName}
                    </h2>
                    <p className="text-gray-500 text-xs sm:text-sm font-medium mb-6 flex items-center justify-center gap-1.5 opacity-70">
                        {user?.email}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 justify-center mb-8">
                        {perfil?.nivel && (
                            <span className="px-4 py-1.5 bg-white/5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest border border-white/10 text-gray-300">
                                {perfil.nivel}
                            </span>
                        )}
                        {perfil?.objetivo && (
                            <span className="px-4 py-1.5 bg-orange-500/10 text-orange-400 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest border border-orange-500/20">
                                {perfil.objetivo.replace('_', ' ').replace('perder peso', 'Bajar grasa')}
                            </span>
                        )}
                        {edad !== null && (
                            <span className="px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest border border-blue-500/20">
                                {edad} años
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => setEditing(!editing)}
                        className={`w-full sm:w-auto px-10 h-14 font-black uppercase tracking-[0.15em] rounded-2xl transition-all flex items-center justify-center gap-3 text-sm ${editing ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-orange-500 hover:bg-orange-400 text-black shadow-[0_10px_30px_rgba(249,115,22,0.3)] hover:shadow-[0_15px_40px_rgba(249,115,22,0.4)]'}`}
                    >
                        {editing ? <><X className="w-5 h-5" /> Cancelar</> : <><Edit3 className="w-5 h-5" /> Editar Perfil</>}
                    </button>
                </div>
            </motion.div>

            {/* Editing Form - Integrated & Clean */}
            <AnimatePresence>
                {editing && (
                    <motion.form 
                        initial={{ opacity: 0, y: -20, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -20, height: 0 }}
                        onSubmit={handleSubmit(onSubmit)} 
                        className="bg-[#141414]/90 backdrop-blur-3xl p-6 sm:p-8 rounded-[2.5rem] border border-white/10 mb-8 shadow-2xl overflow-hidden"
                    >
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                            <Sparkles className="w-4 h-4 text-orange-500" /> Datos Personales
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {[
                                { id: 'nombre_completo', label: 'Nombre Completo', icon: UserIcon },
                                { id: 'fecha_nacimiento', label: 'Nacimiento', type: 'date', icon: Calendar },
                                { id: 'peso_actual', label: 'Peso (kg)', type: 'number', step: '0.1', icon: Scale },
                                { id: 'altura', label: 'Altura (cm)', type: 'number', icon: Ruler },
                                { id: 'dias_entrenamiento_semana', label: 'Días/Semana', type: 'number', icon: Flame },
                            ].map(field => (
                                <div key={field.id} className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">{field.label}</label>
                                    <div className="relative">
                                        <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-orange-500 transition-colors" />
                                        <input 
                                            {...register(field.id as any)} 
                                            type={field.type || 'text'}
                                            step={field.step}
                                            className={`w-full pl-12 pr-4 h-12 rounded-xl bg-black/40 border text-sm font-bold text-white focus:ring-2 outline-none transition-all ${errors[field.id as keyof typeof errors] ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/5 focus:ring-orange-500/50 focus:border-orange-500'}`} 
                                        />
                                    </div>
                                    {errors[field.id as keyof typeof errors] && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{errors[field.id as keyof typeof errors]?.message}</p>}
                                </div>
                            ))}
                            
                            {/* Selects */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Objetivo</label>
                                <select {...register('objetivo')} className="w-full px-4 h-12 rounded-xl bg-black/40 border border-white/5 text-sm font-bold text-white focus:ring-2 focus:ring-orange-500/50 outline-none">
                                    <option value="perder_peso">Bajar grasa</option>
                                    <option value="tonificar">Tonificar</option>
                                    <option value="ganar_fuerza">Ganar músculo</option>
                                    <option value="mantener_forma">Mantener peso</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full mt-10 h-14 bg-orange-500 text-black font-black uppercase tracking-widest rounded-2xl hover:bg-orange-400 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl">
                            {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</> : '💾 Guardar Cambios'}
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* Nutrition & Metrics - High Polish Cards */}
            {perfil && (
                <div className="space-y-6">
                    <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Metabolism Card */}
                        <div className="bg-[#141414]/90 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Flame className="w-12 h-12 text-orange-500" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Metabolismo Basal (BMR)</p>
                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-5xl font-black text-white tracking-tighter">{bmr || '--'}</span>
                                <span className="text-gray-600 text-xs font-bold uppercase tracking-widest">kcal/día</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/5 border border-orange-500/10 rounded-full w-fit">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                <span className="text-[9px] text-orange-500 font-black uppercase tracking-tighter">Calorías en reposo</span>
                            </div>
                        </div>

                        {/* TDEE Card */}
                        <div className="bg-[#141414]/90 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Zap className="w-12 h-12 text-yellow-500" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Gasto Calórico Diario</p>
                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-5xl font-black text-white tracking-tighter">{tdee || '--'}</span>
                                <span className="text-gray-600 text-xs font-bold uppercase tracking-widest">kcal/día</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/5 border border-yellow-500/10 rounded-full w-fit">
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                <span className="text-[9px] text-yellow-500 font-black uppercase tracking-tighter">Gasto total real</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Stats Grid */}
                    <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Peso', value: perfil.peso_actual, unit: 'kg', icon: Scale, color: 'text-orange-500' },
                            { label: 'Altura', value: perfil.altura, unit: 'cm', icon: Ruler, color: 'text-blue-500' },
                            { label: 'IMC', value: imc?.toFixed(1), unit: categoriaIMC, icon: Target, color: 'text-purple-500' },
                            { label: 'Edad', value: edad, unit: 'años', icon: Calendar, color: 'text-green-500' },
                        ].map((d, i) => (
                            <div key={i} className="p-5 sm:p-6 bg-[#141414]/50 backdrop-blur-3xl rounded-3xl border border-white/5 flex flex-col items-center text-center group hover:border-orange-500/20 transition-all">
                                <d.icon className={`w-5 h-5 mb-4 ${d.color} opacity-40 group-hover:opacity-100 transition-all duration-300`} />
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.15em] mb-1">{d.label}</p>
                                <div className="text-2xl font-black text-white leading-none mb-1">
                                    {d.value ?? '--'}
                                </div>
                                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter truncate max-w-full px-1">{d.unit}</span>
                            </div>
                        ))}
                    </motion.div>
                    
                    {/* Gamification Stats */}
                    {userStats && (
                        <motion.div variants={itemVariants} className="bg-gradient-to-br from-orange-500/10 to-transparent p-8 rounded-[2.5rem] border border-orange-500/10 shadow-2xl">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-orange-500" /> Camino del Guerrero
                                </h3>
                                <span className="text-3xl font-black text-orange-500">LVL {userStats.nivel || 1}</span>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-gray-400">Progreso de XP</span>
                                    <span className="text-orange-400">{userStats.xp_total} / {(userStats.nivel || 1) * 100}</span>
                                </div>
                                <div className="h-4 bg-black/60 rounded-full p-1 border border-white/5">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(((userStats.xp_total || 0) % 100) / 100 * 100, 100)}%` }}
                                        className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Crop Modal */}
            <AnimatePresence>
                {imageSrc && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
                        <div className="relative w-full max-w-md aspect-square bg-[#111111] rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl">
                            <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-6">
                                <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-orange-500" />
                                <div className="flex gap-3">
                                    <button onClick={() => setImageSrc(null)} className="flex-1 h-12 rounded-2xl bg-white/5 text-white font-bold text-sm">Cancelar</button>
                                    <button onClick={processAndUploadCrop} className="flex-1 h-12 rounded-2xl bg-orange-500 text-black font-black uppercase tracking-widest text-sm shadow-xl">Confirmar</button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
