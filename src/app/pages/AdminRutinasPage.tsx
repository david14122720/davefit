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
    GripVertical,
    Check
} from 'lucide-react';
import { Reorder, motion } from 'framer-motion';
import adminApi, { type Rutina, type Ejercicio } from '../lib/adminApi';
import FileUpload from '../components/FileUpload';

const objetivoOptions = ['mantener_forma', 'tonificar', 'ganar_fuerza'];
const nivelOptions = ['principiante', 'intermedio', 'avanzado'];
const tipoLugarOptions = ['casa', 'gimnasio', 'ambos'];

interface EjercicioSeleccionado {
    ejercicio_id: string;
    ejercicio?: Ejercicio;
    series: number;
    repeticiones: string;
    descanso_segundos: number;
}

interface FormData {
    nombre: string;
    descripcion: string;
    objetivo: string;
    nivel: string;
    duracion_estimada: string;
    calorias_estimadas: string;
    tipo_lugar: string;
    imagen_cover_url: string;
    es_publica: boolean;
}

const initialFormData: FormData = {
    nombre: '',
    descripcion: '',
    objetivo: 'mantener_forma',
    nivel: 'principiante',
    duracion_estimada: '30',
    calorias_estimadas: '200',
    tipo_lugar: 'gimnasio',
    imagen_cover_url: '',
    es_publica: true,
};

export default function AdminRutinasPage() {
    const [rutinas, setRutinas] = useState<Rutina[]>([]);
    const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEjerciciosModalOpen, setIsEjerciciosModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [ejerciciosSeleccionados, setEjerciciosSeleccionados] = useState<EjercicioSeleccionado[]>([]);
    const [saving, setSaving] = useState(false);
    const [ejerciciosSearch, setEjerciciosSearch] = useState('');

    const loadData = async () => {
        try {
            const [rutinasData, ejerciciosData] = await Promise.all([
                adminApi.getRutinas(),
                adminApi.getEjercicios()
            ]);
            setRutinas(rutinasData);
            setEjercicios(ejerciciosData);
        } catch (err) {
            console.error('[AdminRutinas] Error loading:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const loadEjerciciosRutina = async (rutinaId: string) => {
        try {
            const rutinaEjercicios = await adminApi.getRutinaEjercicios(rutinaId);
            const selected = rutinaEjercicios.map(re => {
                const ejercicio = ejercicios.find(e => e.id === re.ejercicio_id);
                return {
                    ejercicio_id: re.ejercicio_id,
                    ejercicio,
                    series: re.series || 3,
                    repeticiones: re.repeticiones || '10',
                    descanso_segundos: re.descanso_segundos || 60,
                };
            });
            setEjerciciosSeleccionados(selected);
        } catch (err) {
            console.error('[AdminRutinas] Error loading ejercicios:', err);
        }
    };

    const filteredRutinas = useMemo(() => {
        if (!search) return rutinas;
        const s = search.toLowerCase();
        return rutinas.filter(r => 
            r.nombre.toLowerCase().includes(s) ||
            r.objetivo?.toLowerCase().includes(s) ||
            r.nivel?.toLowerCase().includes(s)
        );
    }, [rutinas, search]);

    const filteredEjercicios = useMemo(() => {
        if (!ejerciciosSearch) return ejercicios;
        const s = ejerciciosSearch.toLowerCase();
        return ejercicios.filter(e => 
            e.nombre.toLowerCase().includes(s) ||
            e.grupo_muscular.toLowerCase().includes(s)
        );
    }, [ejercicios, ejerciciosSearch]);

    const handleOpenModal = async (rutina?: Rutina) => {
        setEjerciciosSeleccionados([]);
        if (rutina) {
            setEditingId(rutina.id);
            setFormData({
                nombre: rutina.nombre,
                descripcion: rutina.descripcion || '',
                objetivo: rutina.objetivo || 'mantener_forma',
                nivel: rutina.nivel || 'principiante',
                duracion_estimada: String(rutina.duracion_estimada || 30),
                calorias_estimadas: String(rutina.calorias_estimadas || 200),
                tipo_lugar: rutina.tipo_lugar || 'gimnasio',
                imagen_cover_url: rutina.imagen_cover_url || '',
                es_publica: rutina.es_publica,
            });
            await loadEjerciciosRutina(rutina.id);
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
        setEjerciciosSeleccionados([]);
        setEjerciciosSearch('');
    };

    const handleAddEjercicio = (ejercicio: Ejercicio) => {
        if (ejerciciosSeleccionados.find(e => e.ejercicio_id === ejercicio.id)) return;
        
        setEjerciciosSeleccionados([...ejerciciosSeleccionados, {
            ejercicio_id: ejercicio.id,
            ejercicio,
            series: 3,
            repeticiones: '10',
            descanso_segundos: 60,
        }]);
    };

    const handleRemoveEjercicio = (ejercicioId: string) => {
        setEjerciciosSeleccionados(ejerciciosSeleccionados.filter(e => e.ejercicio_id !== ejercicioId));
    };

    const handleUpdateEjercicio = (ejercicioId: string, field: string, value: number | string) => {
        setEjerciciosSeleccionados(ejerciciosSeleccionados.map(e => 
            e.ejercicio_id === ejercicioId ? { ...e, [field]: value } : e
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const rutinaData = {
                nombre: formData.nombre,
                descripcion: formData.descripcion || undefined,
                objetivo: formData.objetivo,
                nivel: formData.nivel,
                duracion_estimada: parseInt(formData.duracion_estimada) || 30,
                calorias_estimadas: parseInt(formData.calorias_estimadas) || 200,
                tipo_lugar: formData.tipo_lugar,
                imagen_cover_url: formData.imagen_cover_url || undefined,
                es_publica: formData.es_publica,
            };

            const ejerciciosData = ejerciciosSeleccionados.map(e => ({
                ejercicio_id: e.ejercicio_id,
                series: e.series,
                repeticiones: e.repeticiones,
                descanso_segundos: e.descanso_segundos,
            }));

            await adminApi.saveRutinaConEjercicios(
                editingId ? { ...rutinaData, id: editingId } : rutinaData,
                ejerciciosData
            );
            
            await loadData();
            handleCloseModal();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta rutina?')) return;
        try {
            await adminApi.deleteRutina(id);
            setRutinas(prev => prev.filter(r => r.id !== id));
        } catch (err: any) {
            alert('Error al eliminar: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
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
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Rutinas</h1>
                    </div>
                    <p className="text-gray-500 text-sm">{rutinas.length} rutinas creadas</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
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
                    className="w-full pl-12 pr-4 py-3 bg-[#141414] border border-white/5 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRutinas.map((r) => (
                    <div key={r.id} className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden hover:border-blue-500/30 transition-colors group">
                        <div className="h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 relative">
                            {r.imagen_cover_url && (
                                <img src={r.imagen_cover_url} alt={r.nombre} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute top-3 right-3 flex gap-2">
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${r.es_publica ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                    {r.es_publica ? 'Pública' : 'Privada'}
                                </span>
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-white mb-1">{r.nombre}</h3>
                            {r.descripcion && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{r.descripcion}</p>}
                            <div className="flex gap-2 flex-wrap mb-3">
                                <span className="px-2 py-1 bg-white/5 rounded-lg text-xs text-gray-400 capitalize">{r.objetivo || 'sin objetivo'}</span>
                                <span className="px-2 py-1 bg-white/5 rounded-lg text-xs text-gray-400 capitalize">{r.nivel || 'sin nivel'}</span>
                                <span className="px-2 py-1 bg-white/5 rounded-lg text-xs text-gray-400">{r.duracion_estimada || 30} min</span>
                                <span className="px-2 py-1 bg-white/5 rounded-lg text-xs text-gray-400">{r.calorias_estimadas || 200} kcal</span>
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
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-bold text-white mb-2">No hay rutinas</h3>
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Nueva Rutina
                    </button>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#141414] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h2 className="text-xl font-bold text-white">
                                {editingId ? 'Editar Rutina' : 'Nueva Rutina'}
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
                                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Descripción</label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 resize-none"
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
                                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                                    >
                                        {objetivoOptions.map(o => (
                                            <option key={o} value={o} className="capitalize">{o}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Nivel *</label>
                                    <select
                                        required
                                        value={formData.nivel}
                                        onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                                    >
                                        {nivelOptions.map(n => (
                                            <option key={n} value={n} className="capitalize">{n}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Duración (min) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={formData.duracion_estimada}
                                        onChange={(e) => setFormData({ ...formData, duracion_estimada: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Calorías Est.</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={formData.calorias_estimadas}
                                        onChange={(e) => setFormData({ ...formData, calorias_estimadas: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                                        placeholder="Ej: 250"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Lugar *</label>
                                    <select
                                        required
                                        value={formData.tipo_lugar}
                                        onChange={(e) => setFormData({ ...formData, tipo_lugar: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                                    >
                                        {tipoLugarOptions.map(t => (
                                            <option key={t} value={t} className="capitalize">{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <FileUpload
                                    label="Imagen de Cover"
                                    value={formData.imagen_cover_url}
                                    onChange={(url) => setFormData({ ...formData, imagen_cover_url: url })}
                                    bucket="ejercicios"
                                    folder="rutinas"
                                    accept="image/*"
                                    placeholder="Sube una imagen"
                                />
                            </div>
                            
                            {/* Ejercicios de la rutina */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-400">Ejercicios</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsEjerciciosModalOpen(true)}
                                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Agregar Ejercicios
                                    </button>
                                </div>
                                
                                {ejerciciosSeleccionados.length > 0 ? (
                                    <Reorder.Group axis="y" values={ejerciciosSeleccionados} onReorder={setEjerciciosSeleccionados} className="space-y-2 max-h-48 overflow-y-auto">
                                        {ejerciciosSeleccionados.map((e, index) => (
                                            <Reorder.Item key={e.ejercicio_id} value={e} className="flex items-center gap-2 p-3 bg-[#0a0a0a] rounded-xl border border-white/10 cursor-grab active:cursor-grabbing">
                                                <motion.div className="cursor-grab">
                                                    <GripVertical className="w-4 h-4 text-gray-600" />
                                                </motion.div>
                                                <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-medium truncate">{e.ejercicio?.nombre || 'Ejercicio'}</p>
                                                    <p className="text-xs text-gray-500 capitalize">{e.ejercicio?.grupo_muscular}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={e.series}
                                                        onChange={(ev) => handleUpdateEjercicio(e.ejercicio_id, 'series', parseInt(ev.target.value))}
                                                        className="w-14 px-2 py-1 bg-[#141414] border border-white/10 rounded-lg text-white text-sm text-center"
                                                        title="Series"
                                                    />
                                                    <span className="text-gray-500 text-xs">x</span>
                                                    <input
                                                        type="text"
                                                        value={e.repeticiones}
                                                        onChange={(ev) => handleUpdateEjercicio(e.ejercicio_id, 'repeticiones', ev.target.value)}
                                                        className="w-16 px-2 py-1 bg-[#141414] border border-white/10 rounded-lg text-white text-sm text-center"
                                                        placeholder="10"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveEjercicio(e.ejercicio_id)}
                                                        className="p-1 text-gray-500 hover:text-red-400"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </Reorder.Item>
                                        ))}
                                    </Reorder.Group>
                                ) : (
                                    <div className="p-4 border border-dashed border-white/10 rounded-xl text-center text-gray-500 text-sm">
                                        No hay ejercicios agregados. Haz clic en "Agregar Ejercicios" para añadir.
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, es_publica: !formData.es_publica })}
                                    className={`w-12 h-6 rounded-full transition-colors ${formData.es_publica ? 'bg-green-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${formData.es_publica ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                                <span className="text-sm text-gray-400">Rutina pública</span>
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
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de selección de ejercicios */}
            {isEjerciciosModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-[#141414] rounded-2xl border border-white/10 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-white/5">
                            <h3 className="text-lg font-bold text-white">Seleccionar Ejercicios</h3>
                            <button onClick={() => setIsEjerciciosModalOpen(false)} className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 border-b border-white/5">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar ejercicios..."
                                    value={ejerciciosSearch}
                                    onChange={(e) => setEjerciciosSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {filteredEjercicios.map(ejercicio => {
                                const isSelected = ejerciciosSeleccionados.find(es => es.ejercicio_id === ejercicio.id);
                                return (
                                    <button
                                        key={ejercicio.id}
                                        type="button"
                                        onClick={() => {
                                            if (!isSelected) {
                                                handleAddEjercicio(ejercicio);
                                            }
                                        }}
                                        disabled={!!isSelected}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                            isSelected 
                                                ? 'bg-blue-500/10 border-blue-500/30 opacity-50' 
                                                : 'bg-[#0a0a0a] border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5'
                                        }`}
                                    >
                                        {ejercicio.imagen_url ? (
                                            <img src={ejercicio.imagen_url} alt={ejercicio.nombre} className="w-10 h-10 rounded-lg object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-lg">💪</div>
                                        )}
                                        <div className="flex-1 text-left">
                                            <p className="text-white font-medium text-sm">{ejercicio.nombre}</p>
                                            <p className="text-gray-500 text-xs capitalize">{ejercicio.grupo_muscular} • {ejercicio.nivel}</p>
                                        </div>
                                        {isSelected ? (
                                            <Check className="w-5 h-5 text-blue-500" />
                                        ) : (
                                            <Plus className="w-5 h-5 text-gray-500" />
                                        )}
                                    </button>
                                );
                            })}
                            {filteredEjercicios.length === 0 && (
                                <p className="text-center text-gray-500 py-8">No se encontraron ejercicios</p>
                            )}
                        </div>
                        <div className="p-4 border-t border-white/5">
                            <button
                                onClick={() => setIsEjerciciosModalOpen(false)}
                                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
                            >
                                Listo ({ejerciciosSeleccionados.length} seleccionados)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
