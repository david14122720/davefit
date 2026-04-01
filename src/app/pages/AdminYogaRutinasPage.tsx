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
    Calendar
} from 'lucide-react';
import adminApi, { type YogaRutina } from '../lib/adminApi';

const objetivoOptions = ['flexibilidad', 'fuerza', 'relax'];
const nivelOptions = ['principiante', 'intermedio', 'avanzado'];

interface FormData {
    nombre: string;
    descripcion: string;
    objetivo: string;
    nivel: string;
    duracion_minutos: string;
    calorias_estimadas: string;
}

const initialFormData: FormData = {
    nombre: '',
    descripcion: '',
    objetivo: 'flexibilidad',
    nivel: 'principiante',
    duracion_minutos: '30',
    calorias_estimadas: '150',
};

const objetivoIcons: Record<string, string> = {
    flexibilidad: '🤸',
    fuerza: '💪',
    relax: '😌',
};

const nivelColors: Record<string, string> = {
    principiante: 'bg-green-500/10 text-green-400 border-green-500/20',
    intermedio: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    avanzado: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function AdminYogaRutinasPage() {
    const [rutinas, setRutinas] = useState<YogaRutina[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [saving, setSaving] = useState(false);

    const loadData = async () => {
        try {
            const data = await adminApi.getYogaRutinas();
            setRutinas(data);
        } catch (err) {
            console.error('[AdminYogaRutinas] Error loading:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filteredRutinas = useMemo(() => {
        if (!search) return rutinas;
        const s = search.toLowerCase();
        return rutinas.filter(r => 
            r.nombre.toLowerCase().includes(s) ||
            r.objetivo.toLowerCase().includes(s) ||
            r.nivel.toLowerCase().includes(s)
        );
    }, [rutinas, search]);

    const handleOpenModal = (rutina?: YogaRutina) => {
        if (rutina) {
            setEditingId(rutina.id);
            setFormData({
                nombre: rutina.nombre,
                descripcion: rutina.descripcion || '',
                objetivo: rutina.objetivo,
                nivel: rutina.nivel,
                duracion_minutos: String(rutina.duracion_minutos),
                calorias_estimadas: String(rutina.calorias_estimadas || 150),
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
                objetivo: formData.objetivo,
                nivel: formData.nivel,
                duracion_minutos: parseInt(formData.duracion_minutos) || 30,
                calorias_estimadas: parseInt(formData.calorias_estimadas) || 150,
            };

            if (editingId) {
                await adminApi.updateYogaRutina(editingId, data);
            } else {
                await adminApi.createYogaRutina(data);
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
        if (!confirm('¿Estás seguro de eliminar esta rutina de yoga?')) return;
        try {
            await adminApi.deleteYogaRutina(id);
            setRutinas(prev => prev.filter(r => r.id !== id));
        } catch (err: any) {
            alert('Error al eliminar: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-10 h-10 animate-spin text-green-500" />
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
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Yoga Rutinas</h1>
                    </div>
                    <p className="text-gray-500 text-sm">{rutinas.length} rutinas de yoga</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Rutina
                </button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                    type="text"
                    placeholder="Buscar rutinas..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#141414] border border-white/5 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 transition-colors"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRutinas.map((r) => (
                    <div key={r.id} className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden hover:border-green-500/30 transition-colors group">
                        <div className="h-32 bg-gradient-to-br from-green-500/20 to-teal-500/20 relative flex items-center justify-center">
                            <Calendar className="w-14 h-14 text-green-500/30" />
                            <div className="absolute top-3 right-3">
                                <span className="text-2xl">{objetivoIcons[r.objetivo] || '🧘'}</span>
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-white mb-1">{r.nombre}</h3>
                            {r.descripcion && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{r.descripcion}</p>}
                            <div className="flex gap-2 flex-wrap mb-3">
                                <span className="px-2 py-1 bg-white/5 rounded-lg text-xs text-gray-400 capitalize">{r.objetivo}</span>
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium border capitalize ${nivelColors[r.nivel] || nivelColors.principiante}`}>
                                    {r.nivel}
                                </span>
                                <span className="px-2 py-1 bg-white/5 rounded-lg text-xs text-gray-400">{r.duracion_minutos} min</span>
                                <span className="px-2 py-1 bg-white/5 rounded-lg text-xs text-gray-400">{r.calorias_estimadas || 150} kcal</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleOpenModal(r)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(r.id)}
                                    className="px-3 py-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredRutinas.length === 0 && !loading && (
                <div className="text-center py-16 bg-[#141414] rounded-2xl border border-white/5">
                    <div className="text-6xl mb-4">🧘</div>
                    <h3 className="text-xl font-bold text-white mb-2">No hay rutinas de yoga</h3>
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Nueva Rutina
                    </button>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#141414] rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h2 className="text-xl font-bold text-white">
                                {editingId ? 'Editar Rutina' : 'Nueva Rutina de Yoga'}
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
                                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Descripción</label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50 resize-none"
                                    rows={2}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Objetivo *</label>
                                    <select
                                        required
                                        value={formData.objetivo}
                                        onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50"
                                    >
                                        {objetivoOptions.map(o => (
                                            <option key={o} value={o} className="capitalize">{objetivoIcons[o]} {o}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Nivel *</label>
                                    <select
                                        required
                                        value={formData.nivel}
                                        onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50"
                                    >
                                        {nivelOptions.map(n => (
                                            <option key={n} value={n} className="capitalize">{n}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Duración (minutos) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={formData.duracion_minutos}
                                        onChange={(e) => setFormData({ ...formData, duracion_minutos: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Calorías Est. *</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={formData.calorias_estimadas}
                                        onChange={(e) => setFormData({ ...formData, calorias_estimadas: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50"
                                    />
                                </div>
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
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
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
