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
    Save,
    Sparkles
} from 'lucide-react';
import adminApi, { type YogaPosicion } from '../lib/adminApi';
import FileUpload from '../components/FileUpload';

const nivelOptions = ['principiante', 'intermedio', 'avanzado'];

interface FormData {
    nombre: string;
    nombre_sanscrito: string;
    descripcion: string;
    instrucciones: string;
    beneficios: string;
    imagen_url: string;
    duracion_segundos_sugerida: string;
    nivel: string;
}

const initialFormData: FormData = {
    nombre: '',
    nombre_sanscrito: '',
    descripcion: '',
    instrucciones: '',
    beneficios: '',
    imagen_url: '',
    duracion_segundos_sugerida: '30',
    nivel: 'principiante',
};

const nivelColors: Record<string, string> = {
    principiante: 'bg-green-500/10 text-green-400 border-green-500/20',
    intermedio: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    avanzado: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function AdminYogaPosicionesPage() {
    const [posiciones, setPosiciones] = useState<YogaPosicion[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [saving, setSaving] = useState(false);

    const loadData = async () => {
        try {
            const data = await adminApi.getYogaPosiciones();
            setPosiciones(data);
        } catch (err) {
            console.error('[AdminYogaPosiciones] Error loading:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filteredPosiciones = useMemo(() => {
        if (!search) return posiciones;
        const s = search.toLowerCase();
        return posiciones.filter(p => 
            p.nombre.toLowerCase().includes(s) ||
            p.nombre_sanscrito?.toLowerCase().includes(s) ||
            p.nivel.toLowerCase().includes(s)
        );
    }, [posiciones, search]);

    const handleOpenModal = (posicion?: YogaPosicion) => {
        if (posicion) {
            setEditingId(posicion.id);
            setFormData({
                nombre: posicion.nombre,
                nombre_sanscrito: posicion.nombre_sanscrito || '',
                descripcion: posicion.descripcion || '',
                instrucciones: posicion.instrucciones?.join('\n') || '',
                beneficios: posicion.beneficios?.join('\n') || '',
                imagen_url: posicion.imagen_url || '',
                duracion_segundos_sugerida: String(posicion.duracion_segundos_sugerida),
                nivel: posicion.nivel,
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
                nombre_sanscrito: formData.nombre_sanscrito || undefined,
                descripcion: formData.descripcion || undefined,
                instrucciones: formData.instrucciones ? formData.instrucciones.split('\n').filter(i => i.trim()) : undefined,
                beneficios: formData.beneficios ? formData.beneficios.split('\n').filter(i => i.trim()) : undefined,
                imagen_url: formData.imagen_url || undefined,
                duracion_segundos_sugerida: parseInt(formData.duracion_segundos_sugerida) || 30,
                nivel: formData.nivel,
            };

            if (editingId) {
                await adminApi.updateYogaPosicion(editingId, data);
            } else {
                await adminApi.createYogaPosicion(data);
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
        if (!confirm('¿Estás seguro de eliminar esta posición?')) return;
        try {
            await adminApi.deleteYogaPosicion(id);
            setPosiciones(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
            alert('Error al eliminar: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Link to="/admin" className="text-gray-500 hover:text-white transition-colors">
                            <ChevronDown className="w-5 h-5 rotate-90" />
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Yoga Posiciones</h1>
                    </div>
                    <p className="text-gray-500 text-sm">{posiciones.length} posiciones de yoga</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Posición
                </button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                    type="text"
                    placeholder="Buscar posiciones..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#141414] border border-white/5 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPosiciones.map((p) => (
                    <div key={p.id} className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden hover:border-purple-500/30 transition-colors">
                        <div className="h-40 bg-gradient-to-br from-purple-500/20 to-pink-500/20 relative flex items-center justify-center">
                            {p.imagen_url ? (
                                <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                            ) : (
                                <Sparkles className="w-16 h-16 text-purple-500/30" />
                            )}
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-white mb-1">{p.nombre}</h3>
                            {p.nombre_sanscrito && <p className="text-xs text-purple-400 italic mb-2">{p.nombre_sanscrito}</p>}
                            <div className="flex gap-2 flex-wrap mb-3">
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium border capitalize ${nivelColors[p.nivel] || nivelColors.principiante}`}>
                                    {p.nivel}
                                </span>
                                <span className="px-2 py-1 bg-white/5 rounded-lg text-xs text-gray-400">
                                    {p.duracion_segundos_sugerida}s
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleOpenModal(p)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(p.id)}
                                    className="px-3 py-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredPosiciones.length === 0 && !loading && (
                <div className="text-center py-16 bg-[#141414] rounded-2xl border border-white/5">
                    <div className="text-6xl mb-4">🧘</div>
                    <h3 className="text-xl font-bold text-white mb-2">No hay posiciones</h3>
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Nueva Posición
                    </button>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#141414] rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h2 className="text-xl font-bold text-white">
                                {editingId ? 'Editar Posición' : 'Nueva Posición'}
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
                                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Nombre en Sánscrito</label>
                                <input
                                    type="text"
                                    value={formData.nombre_sanscrito}
                                    onChange={(e) => setFormData({ ...formData, nombre_sanscrito: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Descripción</label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 resize-none"
                                    rows={2}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Nivel *</label>
                                    <select
                                        required
                                        value={formData.nivel}
                                        onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                                    >
                                        {nivelOptions.map(n => (
                                            <option key={n} value={n} className="capitalize">{n}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Duración (seg) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="5"
                                        value={formData.duracion_segundos_sugerida}
                                        onChange={(e) => setFormData({ ...formData, duracion_segundos_sugerida: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                                    />
                                </div>
                            </div>
                            <div>
                                <FileUpload
                                    label="Imagen de la Posición"
                                    value={formData.imagen_url}
                                    onChange={(url) => setFormData({ ...formData, imagen_url: url })}
                                    bucket="yoga"
                                    folder="posiciones"
                                    accept="image/*"
                                    placeholder="Sube una imagen"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Instrucciones (una por línea)</label>
                                <textarea
                                    value={formData.instrucciones}
                                    onChange={(e) => setFormData({ ...formData, instrucciones: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 resize-none"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Beneficios (uno por línea)</label>
                                <textarea
                                    value={formData.beneficios}
                                    onChange={(e) => setFormData({ ...formData, beneficios: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 resize-none"
                                    rows={3}
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
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
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
