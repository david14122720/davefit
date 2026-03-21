import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { insforge } from '../../lib/insforge';
import { calcularBMR, calcularTDEE, calcularCaloriasObjetivo, calcularIMC, getCategoriaIMC } from '../../lib/nutrition';

export default function ProfilePage() {
    const { user, perfil, accessToken, updatePerfil, refreshPerfil } = useAuth();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [form, setForm] = useState({
        nombre_completo: perfil?.nombre_completo || '',
        genero: perfil?.genero || '',
        fecha_nacimiento: perfil?.fecha_nacimiento || '',
        peso_actual: perfil?.peso_actual || '',
        altura: perfil?.altura || '',
        objetivo: perfil?.objetivo || '',
        nivel: perfil?.nivel || '',
        dias_entrenamiento_semana: perfil?.dias_entrenamiento_semana || '',
    });

    React.useEffect(() => {
        if (perfil) {
            setForm({
                nombre_completo: perfil.nombre_completo || '',
                genero: perfil.genero || '',
                fecha_nacimiento: perfil.fecha_nacimiento || '',
                peso_actual: perfil.peso_actual || '',
                altura: perfil.altura || '',
                objetivo: perfil.objetivo || '',
                nivel: perfil.nivel || '',
                dias_entrenamiento_semana: perfil.dias_entrenamiento_semana || '',
            });
        }
    }, [perfil]);

    const userName = perfil?.nombre_completo || user?.email?.split('@')[0] || 'Usuario';
    const avatarUrl = perfil?.avatar_url || null;

    // Calcular métricas
    let bmr = null, tdee = null, caloriasObjetivo: any = null, imc = null, categoriaIMC = '--', edad = null;
    if (perfil) {
        try {
            bmr = calcularBMR(perfil);
            tdee = calcularTDEE(perfil);
            caloriasObjetivo = calcularCaloriasObjetivo(perfil);
            imc = calcularIMC(perfil.peso_actual ?? null, perfil.altura ?? null);
            categoriaIMC = getCategoriaIMC(imc);
            if (perfil.fecha_nacimiento) {
                const hoy = new Date();
                const nac = new Date(perfil.fecha_nacimiento);
                if (!isNaN(nac.getTime())) {
                    edad = hoy.getFullYear() - nac.getFullYear();
                    const m = hoy.getMonth() - nac.getMonth();
                    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
                }
            }
        } catch (e) { console.error('Error en cálculos:', e); }
    }

    const datosCompletos = !!(perfil?.peso_actual && perfil?.altura && perfil?.fecha_nacimiento && perfil?.genero);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        const data: any = { ...form };
        if (data.peso_actual) data.peso_actual = parseFloat(data.peso_actual);
        if (data.altura) data.altura = parseFloat(data.altura);
        if (data.dias_entrenamiento_semana) data.dias_entrenamiento_semana = parseInt(data.dias_entrenamiento_semana);

        const result = await updatePerfil(data);
        setSaving(false);

        if (result.error) {
            setMessage('Error: ' + result.error);
        } else {
            setMessage('¡Perfil actualizado con éxito!');
            setEditing(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    // Avatar upload
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !accessToken || !user) return;

        try {
            const ext = file.name.split('.').pop() || 'jpg';
            const path = `avatars/${user.id}-${Date.now()}.${ext}`;

            const { data, error } = await insforge.storage.from('avatares').upload(path, file);
            if (error) {
                console.error('Error subiendo avatar:', error);
                return;
            }
            if (data?.url) {
                await updatePerfil({ avatar_url: data.url });
            }
        } catch (err) {
            console.error('Error en avatar:', err);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            {message && (
                <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${message.startsWith('Error') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}>
                    {message}
                </div>
            )}

            {/* Header */}
            <div className="bg-[#141414]/80 backdrop-blur-xl p-4 sm:p-6 md:p-8 rounded-2xl border border-white/10 flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:gap-8 mb-6 sm:mb-8">
                <div className="relative flex-shrink-0">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-orange-500/20 flex items-center justify-center text-4xl sm:text-5xl border-4 border-[#141414] shadow-[0_0_30px_rgba(249,115,22,0.3)] overflow-hidden">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="font-bold text-orange-500">{userName[0] || 'U'}</span>
                        )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-400 transition-colors shadow-lg cursor-pointer">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                </div>

                <div className="text-center md:text-left flex-1 min-w-0">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 truncate">{userName}</h2>
                    <p className="text-gray-400 mb-3 truncate">{user?.email}</p>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        <span className="px-3 py-1 bg-white/5 rounded-full text-xs sm:text-sm border border-white/10 capitalize">{perfil?.nivel || 'Sin nivel'}</span>
                        <span className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-xs sm:text-sm border border-orange-500/20 capitalize">{perfil?.objetivo?.replace('_', ' ') || 'Sin objetivo'}</span>
                        {edad !== null && (
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs sm:text-sm border border-blue-500/20">{edad} años</span>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => setEditing(!editing)}
                    className="w-full md:w-auto px-6 py-3 bg-orange-500 text-black font-bold rounded-xl hover:bg-orange-400 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                    {editing ? 'Cancelar' : 'Editar'}
                </button>
            </div>

            {/* Edit Form */}
            {editing && (
                <form onSubmit={handleSave} className="bg-[#141414]/80 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-white/10 mb-8">
                    <h3 className="text-lg font-bold text-white mb-6">Editar Perfil</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { key: 'nombre_completo', label: 'Nombre completo', type: 'text' },
                            { key: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date' },
                            { key: 'peso_actual', label: 'Peso (kg)', type: 'number' },
                            { key: 'altura', label: 'Altura (cm)', type: 'number' },
                            { key: 'dias_entrenamiento_semana', label: 'Días de entrenamiento/semana', type: 'number' },
                        ].map(field => (
                            <div key={field.key} className="space-y-1">
                                <label className="text-sm text-gray-400">{field.label}</label>
                                <input
                                    type={field.type}
                                    value={(form as any)[field.key]}
                                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all"
                                />
                            </div>
                        ))}
                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Género</label>
                            <select value={form.genero} onChange={e => setForm(prev => ({ ...prev, genero: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:ring-2 focus:ring-orange-500/50 outline-none">
                                <option value="">Seleccionar</option>
                                <option value="masculino">Masculino</option>
                                <option value="femenino">Femenino</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Objetivo</label>
                            <select value={form.objetivo} onChange={e => setForm(prev => ({ ...prev, objetivo: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:ring-2 focus:ring-orange-500/50 outline-none">
                                <option value="">Seleccionar</option>
                                <option value="tonificar">Tonificar</option>
                                <option value="ganar_fuerza">Ganar Fuerza</option>
                                <option value="mantener_forma">Mantener</option>
                                <option value="perder_peso">Perder Peso</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Nivel</label>
                            <select value={form.nivel} onChange={e => setForm(prev => ({ ...prev, nivel: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:ring-2 focus:ring-orange-500/50 outline-none">
                                <option value="">Seleccionar</option>
                                <option value="principiante">Principiante</option>
                                <option value="intermedio">Intermedio</option>
                                <option value="avanzado">Avanzado</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" disabled={saving} className="mt-6 px-8 py-3 bg-orange-500 text-black font-bold rounded-xl hover:bg-orange-400 transition-all disabled:opacity-50 flex items-center gap-2">
                        {saving ? 'Guardando...' : '💾 Guardar Cambios'}
                    </button>
                </form>
            )}

            {/* Nutrition Cards */}
            {datosCompletos && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
                    <div className="bg-[#141414]/80 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-2 mb-3"><span className="text-2xl">🔥</span><h3 className="text-gray-400 text-xs sm:text-sm font-medium">Metabolismo Basal (BMR)</h3></div>
                        <div className="flex items-baseline gap-2 mb-3"><span className="text-3xl sm:text-4xl font-bold text-white">{bmr || '--'}</span><span className="text-gray-500 text-sm">kcal/día</span></div>
                    </div>
                    <div className="bg-[#141414]/80 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-2 mb-3"><span className="text-2xl">⚡</span><h3 className="text-gray-400 text-xs sm:text-sm font-medium">Gasto Total (TDEE)</h3></div>
                        <div className="flex items-baseline gap-2 mb-3"><span className="text-3xl sm:text-4xl font-bold text-white">{tdee || '--'}</span><span className="text-gray-500 text-sm">kcal/día</span></div>
                    </div>
                    <div className="bg-[#141414]/80 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-orange-500/30 bg-orange-500/5 sm:col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2 mb-3"><span className="text-2xl">🎯</span><h3 className="text-orange-400 text-xs sm:text-sm font-medium">Tu Objetivo</h3></div>
                        <div className="flex items-baseline gap-2 mb-3"><span className="text-4xl sm:text-5xl font-bold text-orange-400">{caloriasObjetivo?.calorias || '--'}</span><span className="text-gray-400 text-sm">kcal/día</span></div>
                    </div>
                </div>
            )}

            {/* Datos */}
            {perfil && (
                <div className="bg-[#141414]/80 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4 sm:mb-6">Tus Datos</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                        {[
                            { emoji: '⚖️', label: 'Peso', value: perfil.peso_actual, unit: 'kg' },
                            { emoji: '📏', label: 'Altura', value: perfil.altura, unit: 'cm' },
                            { emoji: '🎂', label: 'Edad', value: edad, unit: 'años' },
                            { emoji: '📉', label: 'IMC', value: imc?.toFixed(1), unit: categoriaIMC },
                        ].map(d => (
                            <div key={d.label} className="p-3 sm:p-4 bg-white/5 rounded-xl text-center">
                                <div className="text-xl sm:text-2xl mb-1">{d.emoji}</div>
                                <div className="text-gray-400 text-xs sm:text-sm">{d.label}</div>
                                <div className="text-xl sm:text-2xl font-bold text-white">{d.value || '--'} <span className="text-xs sm:text-sm font-normal text-gray-500">{d.unit}</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
