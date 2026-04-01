import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
    Search, 
    Plus, 
    Edit2, 
    Trash2, 
    X,
    Loader2,
    ChevronDown,
    Save
} from 'lucide-react';
import adminApi, { type Ejercicio } from '../lib/adminApi';
import FileUpload from '../components/FileUpload';

const grupoMuscularOptions = ['pecho', 'espalda', 'piernas', 'brazo', 'hombros', 'core', 'cardio', 'full_body'];
const nivelOptions = ['principiante', 'intermedio', 'avanzado'];
import { grupoIcons, nivelColors, tipoLugarOptions } from '../../constants/fitness';

interface FormData {
    nombre: string;
    descripcion: string;
    grupo_muscular: string;
    nivel: string;
    tipo_lugar: string;
    imagen_url: string;
    video_url: string;
    instrucciones: string;
}

const initialFormData: FormData = {
    nombre: '',
    descripcion: '',
    grupo_muscular: 'pecho',
    nivel: 'principiante',
    tipo_lugar: 'gimnasio',
    imagen_url: '',
    video_url: '',
    instrucciones: '',
};

export default function AdminEjerciciosPage() {
    const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [saving, setSaving] = useState(false);

    const loadData = async () => {
        try {
            const data = await adminApi.getEjercicios();
            setEjercicios(data);
        } catch (err) {
            console.error('[AdminEjercicios] Error loading:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filteredEjercicios = useMemo(() => {
        if (!search) return ejercicios;
        const s = search.toLowerCase();
        return ejercicios.filter(e => 
            e.nombre.toLowerCase().includes(s) ||
            e.grupo_muscular.toLowerCase().includes(s) ||
            e.nivel.toLowerCase().includes(s)
        );
    }, [ejercicios, search]);

    const handleOpenModal = (ejercicio?: Ejercicio) => {
        if (ejercicio) {
            setEditingId(ejercicio.id);
            setFormData({
                nombre: ejercicio.nombre,
                descripcion: ejercicio.descripcion || '',
                grupo_muscular: ejercicio.grupo_muscular,
                nivel: ejercicio.nivel,
                tipo_lugar: ejercicio.tipo_lugar,
                imagen_url: ejercicio.imagen_url,
                video_url: ejercicio.video_url || '',
                instrucciones: ejercicio.instrucciones?.join('\n') || '',
            });
        } else {
            setEditingId(null);
            setFormData(initialFormData);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData(initialFormData);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = {
                nombre: formData.nombre,
                descripcion: formData.descripcion || undefined,
                grupo_muscular: formData.grupo_muscular,
                nivel: formData.nivel,
                tipo_lugar: formData.tipo_lugar,
                imagen_url: formData.imagen_url || 'https://placehold.co/400x300/1a1a1a/666666?text=Ejercicio',
                video_url: formData.video_url || undefined,
                instrucciones: formData.instrucciones ? formData.instrucciones.split('\n').filter(i => i.trim()) : undefined,
            };

            if (editingId) {
                await adminApi.updateEjercicio(editingId, data);
            } else {
                await adminApi.createEjercicio(data);
            }
            await loadData();
            handleCloseModal();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este ejercicio?')) return;
        try {
            await adminApi.deleteEjercicio(id);
            setEjercicios(prev => prev.filter(e => e.id !== id));
        } catch (err: any) {
            alert('Error al eliminar: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Link to="/admin" className="text-gray-500 hover:text-white transition-colors">
                            <ChevronDown className="w-5 h-5 rotate-90" />
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                            Ejercicios
                        </h1>
                    </div>
                    <p className="text-gray-500 text-sm">{ejercicios.length} ejercicios en la biblioteca</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Ejercicio
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                    type="text"
                    placeholder="Buscar ejercicios..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#141414] border border-white/5 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-colors"
                />
            </div>

            {/* Table - Desktop */}
            <div className="hidden md:block rounded-2xl overflow-hidden border border-white/5">
                <table className="w-full">
                    <thead>
                        <tr className="bg-[#0d0d0d]">
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ejercicio</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Grupo</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Lugar</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nivel</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-[#141414]">
                        {filteredEjercicios.map((e) => (
                            <tr key={e.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        {e.imagen_url ? (
                                            <img src={e.imagen_url} alt={e.nombre} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-xl border border-orange-500/20">
                                                {grupoIcons[e.grupo_muscular] || '💪'}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold text-white">{e.nombre}</p>
                                            {e.descripcion && <p className="text-xs text-gray-500 line-clamp-1 max-w-[200px]">{e.descripcion}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-gray-300 border border-white/5 capitalize">
                                        {e.grupo_muscular}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-gray-400 capitalize">{e.tipo_lugar}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${nivelColors[e.nivel] || nivelColors.principiante}`}>
                                        {e.nivel}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleOpenModal(e)}
                                            className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(e.id)}
                                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Cards - Mobile */}
            <div className="md:hidden space-y-3">
                {filteredEjercicios.map((e) => (
                    <div key={e.id} className="bg-[#141414] rounded-2xl border border-white/5 p-4 flex items-center gap-4">
                        {e.imagen_url ? (
                            <img src={e.imagen_url} alt={e.nombre} className="w-14 h-14 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                        ) : (
                            <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center text-2xl border border-orange-500/20 flex-shrink-0">
                                {grupoIcons[e.grupo_muscular] || '💪'}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-white truncate">{e.nombre}</p>
                            <div className="flex gap-2 mt-1 flex-wrap">
                                <span className="text-xs text-gray-500 capitalize">{e.grupo_muscular}</span>
                                <span className="text-xs text-gray-600">•</span>
                                <span className={`text-xs capitalize ${e.nivel === 'principiante' ? 'text-green-400' : e.nivel === 'intermedio' ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {e.nivel}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => handleOpenModal(e)} className="p-2 text-gray-500 hover:text-blue-400">
                                <Edit2 className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleDelete(e.id)} className="p-2 text-gray-500 hover:text-red-400">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredEjercicios.length === 0 && !loading && (
                <div className="text-center py-16 bg-[#141414] rounded-2xl border border-white/5">
                    <div className="text-6xl mb-4">🏋️</div>
                    <h3 className="text-xl font-bold text-white mb-2">No hay ejercicios</h3>
                    <p className="text-gray-400 mb-6 text-sm">Crea tu primer ejercicio para empezar.</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Ejercicio
                    </button>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#141414] rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h2 className="text-xl font-bold text-white">
                                {editingId ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
                            </h2>
                            <button onClick={handleCloseModal} className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Nombre *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50"
                                    placeholder="Nombre del ejercicio"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Descripción</label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50 resize-none"
                                    rows={2}
                                    placeholder="Descripción breve"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Grupo Muscular *</label>
                                    <select
                                        required
                                        value={formData.grupo_muscular}
                                        onChange={(e) => setFormData({ ...formData, grupo_muscular: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50"
                                    >
                                        {grupoMuscularOptions.map(g => (
                                            <option key={g} value={g} className="capitalize">{g}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Nivel *</label>
                                    <select
                                        required
                                        value={formData.nivel}
                                        onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50"
                                    >
                                        {nivelOptions.map(n => (
                                            <option key={n} value={n} className="capitalize">{n}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Tipo de Lugar *</label>
                                <select
                                    required
                                    value={formData.tipo_lugar}
                                    onChange={(e) => setFormData({ ...formData, tipo_lugar: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50"
                                >
                                    {tipoLugarOptions.map(t => (
                                        <option key={t} value={t} className="capitalize">{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <FileUpload
                                    label="Imagen del Ejercicio"
                                    value={formData.imagen_url}
                                    onChange={(url) => setFormData({ ...formData, imagen_url: url })}
                                    bucket="ejercicios"
                                    folder="images"
                                    accept="image/*"
                                    placeholder="Sube una imagen"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Video del Ejercicio</label>
                                <div className="space-y-3">
                                    <FileUpload
                                        value={formData.video_url}
                                        onChange={(url) => setFormData({ ...formData, video_url: url })}
                                        bucket="videos"
                                        folder="ejercicios"
                                        accept="video/*"
                                        placeholder="Sube un video (máx 10MB)"
                                    />
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <span className="text-gray-500 text-xs">URL</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.video_url}
                                            onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                                            className="w-full pl-12 pr-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500/50"
                                            placeholder="O pega un enlace de video (YouTube, etc.)"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-600 italic">Tip: Si el archivo es muy grande, intenta comprimirlo o usa un enlace externo.</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Instrucciones (una por línea)</label>
                                <textarea
                                    value={formData.instrucciones}
                                    onChange={(e) => setFormData({ ...formData, instrucciones: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50 resize-none"
                                    rows={4}
                                    placeholder="Paso 1&#10;Paso 2&#10;Paso 3"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
