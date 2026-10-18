import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { insforge } from '../../lib/insforge';
import { getUserStats } from '../../lib/stats';
import { calcularBMR, calcularTDEE, calcularIMC, getCategoriaIMC } from '../../lib/nutrition';
import { toast } from 'sonner';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Loader2,
    Camera,
    Save,
    Flame,
    Swords,
    Target,
    BadgeCheck,
    Scale,
    Ruler,
    Activity,
    Weight,
    Cake,
    Gauge,
    Gift,
    Flag,
    Lightbulb,
    BarChart3,
    Calendar,
    Repeat,
    TrendingUp,
    Users,
    Zap,
    X,
    RefreshCw,
    Mail,
    Dumbbell,
    ArrowRight,
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../lib/cropImage';
import { validateFile } from '../../lib/fileValidation';
import { buildStorageUrl, normalizeStorageUrl, parseStorageObjectUrl } from '../../lib/storage-url';
import type { Perfil } from '../../types';

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

/** Tope defensivo para el blob ya recortado (500x500 JPEG ≈ 50 KB). */
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Labels de objetivo del dominio real (mismos textos que la app usa hoy). */
const OBJETIVO_LABELS: Record<string, string> = {
    perder_peso: 'Bajar grasa',
    tonificar: 'Tonificar',
    ganar_fuerza: 'Ganar músculo',
    mantener_forma: 'Mantener forma',
};

/**
 * Nombres de rango por nivel de `user_stats` — elemento cosmético permitido
 * por el diseño (mismo espíritu de "LVL 2: Escudero", sin columnas nuevas).
 */
const RANGO_LABELS: Record<number, string> = {
    1: 'Aspirante',
    2: 'Escudero',
    3: 'Guerrero',
    4: 'Veterano',
    5: 'Campeón',
};

function rangoLabel(nivel: number): string {
    return RANGO_LABELS[nivel] || 'Leyenda';
}

/**
 * XP que exige el nivel `nivel` para pasar al siguiente.
 * Misma curva que el RPC (`FLOOR(100 * POWER(nivel, 1.5))`) y que XPBar.
 */
function xpParaSubirNivel(nivel: number): number {
    return Math.floor(100 * Math.pow(nivel, 1.5));
}

/** Progreso dentro del nivel actual (misma aritmética que el RPC). */
function calcularProgresoNivel(xpTotal: number, nivel: number) {
    let xpEnNivel = xpTotal;
    for (let n = 1; n < nivel; n++) {
        xpEnNivel -= xpParaSubirNivel(n);
    }

    const xpParaSiguiente = xpParaSubirNivel(nivel);
    const enNivel = Math.max(0, Math.min(xpEnNivel, xpParaSiguiente));
    const pct = xpParaSiguiente > 0 ? Math.min(100, Math.round((enNivel / xpParaSiguiente) * 100)) : 0;

    return {
        pct,
        xpEnNivel: Math.max(0, enNivel),
        xpParaSiguiente,
        restante: Math.max(0, xpParaSiguiente - enNivel),
    };
}

/** Valores del formulario derivados del perfil real (una sola fuente). */
function perfilToFormValues(perfil: Perfil | null): ProfileFormValues {
    return {
        nombre_completo: perfil?.nombre_completo || '',
        genero: (perfil?.genero as any) || '',
        fecha_nacimiento: perfil?.fecha_nacimiento || '',
        peso_actual: (perfil?.peso_actual || '') as any,
        altura: (perfil?.altura || '') as any,
        objetivo: (perfil?.objetivo as any) || '',
        nivel: (perfil?.nivel as any) || '',
        dias_entrenamiento_semana: (perfil?.dias_entrenamiento_semana || '') as any,
    };
}

/** "2025-01-15T..." → "Enero 2025" (para "Miembro desde"). */
function formatMesAnio(iso?: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const mes = d.toLocaleDateString('es-ES', { month: 'long' });
    return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${d.getFullYear()}`;
}

/** "2025-01-15T..." → "15 ene 2025" (para "Última actualización"). */
function formatFecha(iso?: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

const inputCls =
    'w-full bg-transparent text-sm font-medium text-[#e5e2e3] outline-none placeholder:text-[#5f636e] [color-scheme:dark]';

interface CampoPerfilProps {
    label: string;
    hint?: string;
    icon: React.ComponentType<{ className?: string }>;
    htmlFor?: string;
    error?: string;
    children: React.ReactNode;
}

/** Campo de formulario con el lenguaje del diseño (label + icono + control). */
function CampoPerfil({ label, hint, icon: Icon, htmlFor, error, children }: CampoPerfilProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor={htmlFor}
                className="text-[11px] font-semibold uppercase tracking-wider text-[#9ea3ae] flex items-center justify-between gap-2"
            >
                <span>{label}</span>
                {hint && <span className="normal-case tracking-normal text-[#5f636e] font-normal hidden sm:inline">{hint}</span>}
            </label>
            <div
                className={`flex items-center gap-2 bg-[#1c1b1c] focus-within:bg-[#201f20] px-4 py-2.5 rounded-lg transition-colors ${
                    error ? 'ring-1 ring-red-500/60' : ''
                }`}
            >
                <Icon className="w-5 h-5 shrink-0 text-[#5f636e]" />
                {children}
            </div>
            {error && <p className="text-[11px] text-red-500 font-semibold">{error}</p>}
        </div>
    );
}

export default function ProfilePage() {
    const { user, perfil, accessToken, updatePerfil, loading: authLoading } = useAuth();
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [userStats, setUserStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Crop UI states
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    useEffect(() => {
        if (!user) return;
        const loadStats = async () => {
            setLoadingStats(true);
            setError(null);
            try {
                const data = await getUserStats(user.id);
                if (data) {
                    setUserStats(data);
                } else {
                    setError('No pudimos cargar toda tu información clasificada.');
                }
            } catch {
                setError('No pudimos cargar toda tu información clasificada.');
            }
            setLoadingStats(false);
        };
        loadStats();
    }, [user]);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting, isDirty }
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema) as any,
        defaultValues: perfilToFormValues(perfil),
    });

    useEffect(() => {
        if (perfil) reset(perfilToFormValues(perfil));
    }, [perfil, reset]);

    const userName = perfil?.nombre_completo || user?.email?.split('@')[0] || 'Usuario';
    const avatarUrl = normalizeStorageUrl(perfil?.avatar_url);

    const { bmr, tdee, imc, categoriaIMC, edad } = useMemo(() => {
        const calculations = {
            bmr: null as number | null,
            tdee: null as number | null,
            imc: null as any,
            categoriaIMC: '--',
            edad: null as number | null
        };
        if (perfil) {
            try {
                calculations.bmr = calcularBMR(perfil);
                calculations.tdee = calcularTDEE(perfil);
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

    // --- Datos reales para el hero y la gamificación ---
    const nivelStats = Number(userStats?.nivel) || 1;
    const xpTotal = Number(userStats?.xp_total) || 0;
    const diasRacha = Number(userStats?.dias_racha) || 0;
    const progresoXp = useMemo(() => calcularProgresoNivel(xpTotal, nivelStats), [xpTotal, nivelStats]);
    const diasEntreno = perfil?.dias_entrenamiento_semana ?? null;
    const objetivoLabel = perfil?.objetivo ? OBJETIVO_LABELS[perfil.objetivo] || perfil.objetivo : null;
    const miembroDesde = useMemo(() => formatMesAnio(perfil?.created_at), [perfil?.created_at]);
    const ultimaActualizacion = useMemo(() => formatFecha(perfil?.updated_at), [perfil?.updated_at]);
    const diasSeleccionados = Number(watch('dias_entrenamiento_semana') || 0);

    /** Consejo con datos reales cuando existen; copy genérico si no. */
    const consejo = useMemo(() => {
        if (diasEntreno && objetivoLabel) {
            return `${userName}, con ${diasEntreno} ${diasEntreno === 1 ? 'día' : 'días'} de entrenamiento semanal, mantén el foco en tu meta: ${objetivoLabel.toLowerCase()}. La constancia vence al talento.`;
        }
        if (diasEntreno) {
            return `${userName}, con ${diasEntreno} ${diasEntreno === 1 ? 'día' : 'días'} de entrenamiento semanal estás construyendo un gran hábito. La constancia vence al talento.`;
        }
        if (objetivoLabel) {
            return `${userName}, mantén el foco en tu meta: ${objetivoLabel.toLowerCase()}. La constancia vence al talento.`;
        }
        return 'La constancia vence al talento. Entrena hoy y mantén tu progreso.';
    }, [userName, diasEntreno, objetivoLabel]);

    const onSubmit = async (data: ProfileFormValues) => {
        const cleanedData = {
            ...data,
            genero: data.genero === '' ? null : data.genero,
            peso_actual: data.peso_actual === '' ? null : data.peso_actual,
            altura: data.altura === '' ? null : data.altura,
            dias_entrenamiento_semana: data.dias_entrenamiento_semana === '' ? null : data.dias_entrenamiento_semana,
        };

        const promise = updatePerfil(cleanedData as Partial<Perfil>);

        toast.promise(promise, {
            loading: 'Guardando perfil...',
            success: (res) => {
                if (res.error) throw new Error(res.error);
                return '¡Perfil actualizado con éxito!';
            },
            error: (err) => `Error al actualizar: ${err.message}`
        });
    };

    const handleDiscard = () => {
        reset();
        toast('Cambios descartados');
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !accessToken || !user) return;
        const validation = await validateFile(file, 'image/*', 5);
        if (!validation.valid) {
            toast.error(validation.error!);
            e.target.value = '';
            return;
        }
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
            if (!croppedBlob || croppedBlob.size === 0) throw new Error("Error al procesar imagen");
            if (croppedBlob.type !== 'image/jpeg') throw new Error('Formato de imagen inesperado');
            if (croppedBlob.size > MAX_AVATAR_BYTES) throw new Error('La imagen procesada es demasiado grande');
            const ext = 'jpeg';
            const path = `avatars/${user.id}-${Date.now()}.${ext}`;
            const file = new File([croppedBlob], `avatar.${ext}`, { type: 'image/jpeg' });
            const previousAvatar = perfil?.avatar_url || null;
            const { error } = await insforge.storage.from('avatares').upload(path, file);
            if (error) throw error;
            // URL RELATIVA same-origin: la absoluta que devuelve el backend
            // (insforge.dtesh.dev) la bloquea la CSP (img-src 'self') → la
            // imagen subida no se veía. Ver src/lib/storage-url.ts.
            const res = await updatePerfil({ avatar_url: buildStorageUrl('avatares', path) });
            if (res.error) throw new Error(res.error);
            // Limpieza best-effort del avatar anterior (si era de este bucket):
            // antes quedaba accesible públicamente para siempre.
            const previous = parseStorageObjectUrl(previousAvatar);
            if (previous && previous.bucket === 'avatares') {
                insforge.storage.from('avatares').remove(previous.key).catch(() => {});
            }
            toast.success('Imagen actualizada', { id: toastId });
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

    const isPageLoading = authLoading || loadingStats;

    if (isPageLoading) {
        return (
            <div className="w-full flex flex-col gap-6 animate-pulse">
                <div className="h-24 bg-[#1c1b1c] rounded-xl" />
                <div className="h-40 bg-[#0e0e0f] rounded-xl" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-6 h-96 bg-[#0e0e0f] rounded-xl" />
                    <div className="lg:col-span-6 flex flex-col gap-6">
                        <div className="h-64 bg-[#0e0e0f] rounded-xl" />
                        <div className="h-48 bg-[#0e0e0f] rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || (!authLoading && !perfil)) {
        return (
            <div className="w-full flex justify-center pt-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-[#0e0e0f] border border-red-500/20 rounded-2xl p-8 sm:p-10 text-center shadow-[0_15px_60px_rgba(239,68,68,0.1)] relative overflow-hidden"
                >
                    <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-red-500/0 via-red-500 to-red-500/0" />
                    <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                        <div className="w-12 h-12 flex items-center justify-center rotate-45 border-4 rounded-xl border-current" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Identidad Extraviada</h2>
                    <p className="text-[#9ea3ae] mb-8 leading-relaxed text-sm sm:text-base">{error || 'No fue posible acceder a los detalles de tu cuenta de guerrero.'}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 font-black uppercase tracking-widest rounded-2xl transition-all"
                    >
                        Reestablecer Perfil
                    </button>
                </motion.div>
            </div>
        );
    }

    const estaturaTexto = perfil?.altura ? `${perfil.altura} cm` : null;

    return (
        <motion.div
            className="w-full flex flex-col gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* ===== Encabezado: breadcrumb + título + acciones ===== */}
            <motion.header variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-[#9ea3ae]">
                        <span className="text-primary font-semibold">Perfil de Atleta</span>
                        <span className="opacity-40">/</span>
                        <span className="bg-[#2a2a2b] px-2 py-0.5 rounded text-[#e5e2e3]">Nivel {nivelStats}</span>
                        <span className="opacity-40">/</span>
                        <span className="text-[#e5e2e3] font-semibold truncate max-w-[12rem]">{userName}</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#e5e2e3]">
                        Mi Perfil &amp; Ajustes Personales
                    </h1>
                    <p className="text-sm text-[#9ea3ae] max-w-2xl">
                        Gestiona tus métricas biométricas, objetivos físicos y datos de cuenta en un solo lugar.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                    <button
                        type="button"
                        onClick={handleDiscard}
                        disabled={!isDirty}
                        className="flex-1 md:flex-none justify-center px-4 py-2 bg-[#1c1b1c] hover:bg-[#201f20] disabled:opacity-40 disabled:cursor-not-allowed text-[#e5e2e3] text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                        <X className="w-4 h-4" /> Descartar cambios
                    </button>
                    <button
                        type="submit"
                        form="perfil-form"
                        disabled={isSubmitting}
                        className="flex-1 md:flex-none justify-center px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-[#531900] text-sm font-bold rounded-lg transition-all flex items-center gap-2 shadow-md shadow-primary/20"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Cambios
                    </button>
                </div>
            </motion.header>

            {/* ===== Hero de perfil ===== */}
            <motion.section
                variants={itemVariants}
                className="bg-[#0e0e0f] rounded-xl p-5 md:p-8 relative overflow-hidden shadow-lg"
            >
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5 md:gap-6">
                    {/* Avatar con botón de cámara (subida + recorte reales) */}
                    <div className="relative shrink-0 self-start">
                        <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full lg:rounded-xl bg-[#2a2a2b] flex items-center justify-center overflow-hidden shadow-inner relative">
                            {/* Avatar: above the fold → sin lazy, solo decodificación async */}
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" decoding="async" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl lg:text-4xl font-black text-primary-light">
                                    {userName[0]?.toUpperCase() || 'U'}
                                </span>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent pointer-events-none" />
                            {uploadingAvatar && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-xs">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                </div>
                            )}
                        </div>
                        <label
                            aria-label="Cambiar foto de perfil"
                            className="absolute -bottom-1 -right-1 w-8 h-8 lg:w-9 lg:h-9 bg-primary text-[#531900] rounded-full flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform shadow-md z-20"
                        >
                            <Camera className="w-4 h-4" />
                            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploadingAvatar} />
                        </label>
                    </div>

                    {/* Identidad y badges reales */}
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#e5e2e3] truncate">{userName}</h2>
                        <p className="text-sm text-[#9ea3ae] flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                            {user?.email && (
                                <span className="inline-flex items-center gap-1.5 min-w-0">
                                    <Mail className="w-3.5 h-3.5 shrink-0 text-[#5f636e]" />
                                    <span className="truncate">{user.email}</span>
                                </span>
                            )}
                            {miembroDesde && (
                                <>
                                    <span className="opacity-40 hidden sm:inline">•</span>
                                    <span className="hidden sm:inline">Miembro desde {miembroDesde}</span>
                                </>
                            )}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="inline-flex items-center gap-1.5 bg-[#201f20] px-2.5 py-1 rounded-full text-xs text-[#e5e2e3]">
                                <Flame className="w-4 h-4 text-primary" />
                                Racha: <strong className="text-primary">{diasRacha} {diasRacha === 1 ? 'día' : 'días'}</strong>
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-[#201f20] px-2.5 py-1 rounded-full text-xs text-[#e5e2e3]">
                                <Swords className="w-4 h-4 text-primary-light" />
                                Rango: <strong className="text-primary-light">{rangoLabel(nivelStats)} · Nivel {nivelStats}</strong>
                            </span>
                            {objetivoLabel && (
                                <span className="inline-flex items-center gap-1.5 bg-[#201f20] px-2.5 py-1 rounded-full text-xs text-[#e5e2e3]">
                                    <Target className="w-4 h-4 text-primary" />
                                    Meta: <strong className="text-[#e5e2e3]">{objetivoLabel}</strong>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* ===== Split principal: formulario (izq) + métricas/gamificación (der) ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* --- Datos personales & configuración --- */}
                <motion.section
                    variants={itemVariants}
                    className="lg:col-span-6 order-2 lg:order-1 bg-[#0e0e0f] rounded-xl p-5 md:p-8 shadow-md flex flex-col gap-6"
                >
                    <div className="flex items-center gap-3">
                        <span className="w-1 h-6 bg-primary rounded-full" />
                        <Dumbbell className="w-5 h-5 text-primary" />
                        <h3 className="text-sm md:text-base font-bold tracking-tight uppercase text-[#e5e2e3]">
                            Datos Personales &amp; Configuración
                        </h3>
                    </div>

                    <form id="perfil-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="sm:col-span-2">
                                <CampoPerfil
                                    label="Nombre Completo"
                                    hint="visible en el ranking"
                                    icon={BadgeCheck}
                                    htmlFor="nombre_completo"
                                    error={errors.nombre_completo?.message}
                                >
                                    <input
                                        id="nombre_completo"
                                        type="text"
                                        autoComplete="name"
                                        placeholder="Tu nombre"
                                        {...register('nombre_completo')}
                                        className={inputCls}
                                    />
                                </CampoPerfil>
                            </div>

                            <CampoPerfil
                                label="Fecha de Nacimiento"
                                hint={edad !== null ? `${edad} años` : undefined}
                                icon={Calendar}
                                htmlFor="fecha_nacimiento"
                                error={errors.fecha_nacimiento?.message}
                            >
                                <input
                                    id="fecha_nacimiento"
                                    type="date"
                                    {...register('fecha_nacimiento')}
                                    className={inputCls}
                                />
                            </CampoPerfil>

                            <CampoPerfil label="Género" icon={Users} htmlFor="genero" error={errors.genero?.message}>
                                <select id="genero" {...register('genero')} className={`${inputCls} cursor-pointer`}>
                                    <option value="">No especificar</option>
                                    <option value="masculino">Masculino</option>
                                    <option value="femenino">Femenino</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </CampoPerfil>

                            <CampoPerfil label="Peso Actual" icon={Scale} htmlFor="peso_actual" error={errors.peso_actual?.message}>
                                <input
                                    id="peso_actual"
                                    type="number"
                                    step="0.1"
                                    placeholder="kg"
                                    {...register('peso_actual')}
                                    className={inputCls}
                                />
                            </CampoPerfil>

                            <CampoPerfil label="Estatura" icon={Ruler} htmlFor="altura" error={errors.altura?.message}>
                                <input
                                    id="altura"
                                    type="number"
                                    placeholder="cm"
                                    {...register('altura')}
                                    className={inputCls}
                                />
                            </CampoPerfil>

                            {/* Frecuencia semanal: pills 1d–7d (estilo del diseño) */}
                            <div className="flex flex-col gap-1.5 sm:col-span-2">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#9ea3ae] flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-1.5">
                                        <Repeat className="w-3.5 h-3.5" /> Frecuencia Semanal de Entrenamiento
                                    </span>
                                    <span className="normal-case tracking-normal text-[#5f636e] font-normal">
                                        {diasSeleccionados > 0
                                            ? `${diasSeleccionados} ${diasSeleccionados === 1 ? 'día' : 'días'} seleccionado${diasSeleccionados === 1 ? '' : 's'}`
                                            : 'Sin seleccionar'}
                                    </span>
                                </label>
                                <input type="hidden" {...register('dias_entrenamiento_semana')} />
                                <div className="grid grid-cols-7 gap-1.5">
                                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                                        <button
                                            key={d}
                                            type="button"
                                            aria-pressed={diasSeleccionados === d}
                                            onClick={() =>
                                                setValue('dias_entrenamiento_semana', d, { shouldDirty: true, shouldValidate: true })
                                            }
                                            className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                                                diasSeleccionados === d
                                                    ? 'bg-primary text-[#531900] shadow-sm'
                                                    : 'bg-[#1c1b1c] text-[#9ea3ae] hover:bg-[#201f20] hover:text-[#e5e2e3]'
                                            }`}
                                        >
                                            {d}d
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <CampoPerfil
                                label="Nivel de Experiencia"
                                icon={TrendingUp}
                                htmlFor="nivel"
                                error={errors.nivel?.message}
                            >
                                <select id="nivel" {...register('nivel')} className={`${inputCls} cursor-pointer`}>
                                    <option value="principiante">Principiante (&lt; 1 año)</option>
                                    <option value="intermedio">Intermedio (1–2 años)</option>
                                    <option value="avanzado">Avanzado (&gt; 3 años)</option>
                                </select>
                            </CampoPerfil>

                            <CampoPerfil
                                label="Objetivo de Entrenamiento"
                                icon={Target}
                                htmlFor="objetivo"
                                error={errors.objetivo?.message}
                            >
                                <select id="objetivo" {...register('objetivo')} className={`${inputCls} cursor-pointer`}>
                                    <option value="perder_peso">Bajar grasa</option>
                                    <option value="tonificar">Tonificar</option>
                                    <option value="ganar_fuerza">Ganar músculo</option>
                                    <option value="mantener_forma">Mantener peso</option>
                                </select>
                            </CampoPerfil>
                        </div>

                        <div className="pt-2 flex flex-col gap-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-[#531900] text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
                                ) : (
                                    <><Save className="w-5 h-5" /> Guardar Cambios Biométricos</>
                                )}
                            </button>
                            {ultimaActualizacion && (
                                <p className="flex items-center justify-center gap-1.5 text-xs text-[#5f636e]">
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Última actualización: {ultimaActualizacion}
                                </p>
                            )}
                        </div>
                    </form>
                </motion.section>

                {/* --- Métricas + gamificación --- */}
                <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col gap-6">
                    <motion.section
                        variants={itemVariants}
                        className="bg-[#0e0e0f] rounded-xl p-5 md:p-8 shadow-md flex flex-col gap-6"
                    >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3">
                                <span className="w-1 h-6 bg-[#d77917] rounded-full" />
                                <Activity className="w-5 h-5 text-primary-light" />
                                <h3 className="text-sm md:text-base font-bold tracking-tight uppercase text-[#e5e2e3]">
                                    Métricas Metabólicas &amp; Biométricas
                                </h3>
                            </div>
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-semibold">
                                Cálculo Preciso
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-[#1c1b1c] rounded-xl p-4 flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9ea3ae]">
                                        Metabolismo Basal (BMR)
                                    </span>
                                    <span className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                                        <Flame className="w-4 h-4" />
                                    </span>
                                </div>
                                <div>
                                    <div className="text-2xl md:text-3xl font-black tracking-tight text-[#e5e2e3]">
                                        {bmr ?? '--'}
                                    </div>
                                    <span className="text-xs font-semibold text-primary">KCAL / DÍA</span>
                                </div>
                                <p className="text-xs text-[#9ea3ae] leading-relaxed">
                                    Calorías mínimas que tu cuerpo quema en reposo absoluto para mantener sus funciones vitales.
                                </p>
                            </div>

                            <div className="bg-[#1c1b1c] rounded-xl p-4 flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9ea3ae]">
                                        Gasto Total Diario (TDEE)
                                    </span>
                                    <span className="w-8 h-8 rounded-full bg-primary-light/15 text-primary-light flex items-center justify-center shrink-0">
                                        <Zap className="w-4 h-4" />
                                    </span>
                                </div>
                                <div>
                                    <div className="text-2xl md:text-3xl font-black tracking-tight text-primary-light">
                                        {tdee ?? '--'}
                                    </div>
                                    <span className="text-xs font-semibold text-primary-light">KCAL / DÍA</span>
                                </div>
                                <p className="text-xs text-[#9ea3ae] leading-relaxed">
                                    {diasEntreno
                                        ? `Gasto total estimado combinando tu metabolismo y ${diasEntreno} ${diasEntreno === 1 ? 'sesión' : 'sesiones'} semanales de entrenamiento.`
                                        : 'Gasto total estimado combinando tu metabolismo y tu actividad semanal.'}
                                </p>
                            </div>
                        </div>

                        {bmr === null && (
                            <p className="flex items-center gap-1.5 text-xs text-[#5f636e]">
                                <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0" />
                                Completa peso, estatura, nacimiento y género para calcular tus métricas.
                            </p>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-[#201f20] rounded-lg p-3 flex flex-col gap-1">
                                <span className="text-[11px] text-[#9ea3ae] flex items-center gap-1.5">
                                    <Weight className="w-3.5 h-3.5" /> Peso
                                </span>
                                <span className="text-lg font-bold text-[#e5e2e3]">
                                    {perfil?.peso_actual ?? '--'} <span className="text-xs font-normal text-[#9ea3ae]">kg</span>
                                </span>
                            </div>
                            <div className="bg-[#201f20] rounded-lg p-3 flex flex-col gap-1">
                                <span className="text-[11px] text-[#9ea3ae] flex items-center gap-1.5">
                                    <Ruler className="w-3.5 h-3.5" /> Altura
                                </span>
                                <span className="text-lg font-bold text-[#e5e2e3]">
                                    {perfil?.altura ?? '--'} <span className="text-xs font-normal text-[#9ea3ae]">cm</span>
                                </span>
                                {estaturaTexto && <span className="text-[11px] text-[#5f636e]">Estatura fija</span>}
                            </div>
                            <div className="bg-[#201f20] rounded-lg p-3 flex flex-col gap-1">
                                <span className="text-[11px] text-[#9ea3ae] flex items-center gap-1.5">
                                    <Gauge className="w-3.5 h-3.5" /> IMC
                                </span>
                                <span className="text-lg font-bold text-primary">
                                    {imc ? imc.toFixed(1) : '--'}
                                </span>
                                <span className="text-[11px] text-primary-light">{categoriaIMC}</span>
                            </div>
                            <div className="bg-[#201f20] rounded-lg p-3 flex flex-col gap-1">
                                <span className="text-[11px] text-[#9ea3ae] flex items-center gap-1.5">
                                    <Cake className="w-3.5 h-3.5" /> Edad
                                </span>
                                <span className="text-lg font-bold text-[#e5e2e3]">
                                    {edad ?? '--'} <span className="text-xs font-normal text-[#9ea3ae]">años</span>
                                </span>
                            </div>
                        </div>
                    </motion.section>

                    {userStats && (
                        <motion.section
                            variants={itemVariants}
                            className="bg-[#0e0e0f] rounded-xl p-5 md:p-8 shadow-md flex flex-col gap-5"
                        >
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-primary text-[#531900] flex items-center justify-center shrink-0">
                                        <Swords className="w-4 h-4" />
                                    </span>
                                    <div className="flex flex-col">
                                        <h3 className="text-sm md:text-base font-bold tracking-tight uppercase text-[#e5e2e3]">
                                            Camino del Guerrero
                                        </h3>
                                        <span className="text-xs text-[#9ea3ae]">Sistema de Progresión DaveFit</span>
                                    </div>
                                </div>
                                <span className="bg-primary/20 text-primary px-3 md:px-4 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
                                    LVL {nivelStats} · {rangoLabel(nivelStats)}
                                </span>
                            </div>

                            <div className="flex flex-col gap-2 bg-[#1c1b1c] rounded-xl p-4">
                                <div className="flex items-center justify-between gap-2 text-[11px] md:text-xs">
                                    <span className="font-bold text-[#e5e2e3] uppercase tracking-wider">
                                        Progreso de Experiencia (XP)
                                    </span>
                                    <span className="text-primary font-extrabold whitespace-nowrap">
                                        {progresoXp.xpEnNivel} / {progresoXp.xpParaSiguiente} XP
                                    </span>
                                </div>
                                <div className="w-full h-3 bg-[#353436] rounded-full overflow-hidden p-0.5">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#d77917] via-primary to-primary-light rounded-full transition-all duration-500"
                                        style={{ width: `${progresoXp.pct}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-2 text-xs text-[#9ea3ae] pt-1">
                                    <span>{xpTotal.toLocaleString()} XP totales</span>
                                    <span className="text-[#e5e2e3] font-medium text-right">
                                        ¡A solo <strong className="text-primary">{progresoXp.restante} XP</strong> de LVL{' '}
                                        {nivelStats + 1}: {rangoLabel(nivelStats + 1)}!
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-[#201f20] rounded-xl p-4">
                                <Gift className="w-5 h-5 text-primary-light shrink-0 mt-0.5" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-bold text-[#e5e2e3]">Próxima Recompensa Desbloqueable:</span>
                                    <p className="text-xs text-[#9ea3ae] leading-relaxed mt-0.5">
                                        Desbloquea el planificador de comidas automáticas, recetas hiperproteicas avanzadas y la insignia de honor "Constancia Semanal".
                                    </p>
                                </div>
                            </div>
                        </motion.section>
                    )}
                </div>
            </div>

            {/* ===== Tira de consejo + historial real ===== */}
            <motion.section
                variants={itemVariants}
                className="bg-[#0e0e0f] rounded-xl p-4 md:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                        <Flag className="w-5 h-5" />
                    </span>
                    <p className="text-sm text-[#e5e2e3] leading-snug">
                        <strong className="text-primary">Consejo de hoy:</strong> {consejo}
                    </p>
                </div>
                <Link
                    to="/dashboard"
                    className="shrink-0 text-primary hover:text-primary-light text-sm font-semibold flex items-center gap-1 transition-colors"
                >
                    <BarChart3 className="w-4 h-4" /> Ver historial de progreso <ArrowRight className="w-4 h-4" />
                </Link>
            </motion.section>

            {/* ===== Modal de recorte de avatar ===== */}
            <AnimatePresence>
                {imageSrc && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
                    >
                        <div className="relative w-full max-w-md aspect-square bg-[#0e0e0f] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
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
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-linear-to-t from-black via-black/80 to-transparent flex flex-col gap-6">
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full accent-primary"
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setImageSrc(null)}
                                        className="flex-1 h-12 rounded-2xl bg-[#2a2a2b] hover:bg-[#353436] text-white font-bold text-sm transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={processAndUploadCrop}
                                        className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary-dark text-[#531900] font-black uppercase tracking-widest text-sm shadow-xl transition-colors"
                                    >
                                        Confirmar
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
