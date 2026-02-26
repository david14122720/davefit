import { useState } from 'preact/hooks';
import { insforge } from '../../lib/insforge';

export default function ExerciseForm() {
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        grupo_muscular: 'pecho',
        nivel: 'principiante',
        tipo_lugar: 'casa',
        instrucciones: ''
    });
    const [file, setFile] = useState<File | null>(null);

    const handleImageChange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const selectedFile = target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const updateForm = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setLoading(true);

        try {
            let imagenUrl = '';

            // Subir imagen si existe
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `ejercicios/${fileName}`;

                const { error: uploadError } = await insforge.storage
                    .from('ejercicios')
                    .upload(filePath, file);

                if (uploadError) {
                    throw new Error('Error subiendo imagen: ' + uploadError.message);
                }

                imagenUrl = insforge.storage
                    .from('ejercicios')
                    .getPublicUrl(filePath);
            }

            // Crear ejercicio en la base de datos
            const { error: insertError } = await insforge.database
                .from('ejercicios')
                .insert([{
                    nombre: formData.nombre,
                    descripcion: formData.descripcion,
                    grupo_muscular: formData.grupo_muscular,
                    nivel: formData.nivel,
                    tipo_lugar: formData.tipo_lugar,
                    imagen_url: imagenUrl,
                    instrucciones: formData.instrucciones ? [formData.instrucciones] : null
                }]);

            if (insertError) {
                throw new Error('Error creando ejercicio: ' + insertError.message);
            }

            alert('Ejercicio creado exitosamente');
            // Resetear formulario
            setFormData({
                nombre: '',
                descripcion: '',
                grupo_muscular: 'pecho',
                nivel: 'principiante',
                tipo_lugar: 'casa',
                instrucciones: ''
            });
            setPreview(null);
            setFile(null);
        } catch (err: any) {
            console.error('Error:', err);
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Details */}
            <div class="lg:col-span-2 space-y-8">
                <div class="bg-[#2b2623] p-8 rounded-2xl border border-white/5">
                    <div class="flex items-center gap-2 mb-6 text-orange-500">
                        <span>ℹ</span>
                        <h3 class="text-lg font-bold text-white">Detalles del Ejercicio</h3>
                    </div>

                    <div class="space-y-6">
                        <div>
                            <label class="block text-sm font-bold text-gray-400 mb-2">Nombre del Ejercicio</label>
                            <input
                                type="text"
                                value={formData.nombre}
                                onInput={(e) => updateForm('nombre', (e.target as HTMLInputElement).value)}
                                class="w-full bg-[#1e1c1a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-orange-500 outline-none transition-colors"
                                placeholder="Ej: Flexiones Diamante"
                                required
                            />
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-bold text-gray-400 mb-2">Grupo Muscular</label>
                                <select
                                    value={formData.grupo_muscular}
                                    onChange={(e) => updateForm('grupo_muscular', (e.target as HTMLSelectElement).value)}
                                    class="w-full bg-[#1e1c1a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-orange-500 outline-none appearance-none"
                                >
                                    <option value="pecho">Pecho</option>
                                    <option value="espalda">Espalda</option>
                                    <option value="piernas">Piernas</option>
                                    <option value="brazos">Brazos</option>
                                    <option value="hombros">Hombros</option>
                                    <option value="abdomen">Abdomen</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-sm font-bold text-gray-400 mb-2">Dificultad</label>
                                <div class="flex bg-[#1e1c1a] p-1 rounded-lg border border-white/10">
                                    {['principiante', 'intermedio', 'avanzado'].map(lvl => (
                                        <button
                                            type="button"
                                            onClick={() => updateForm('nivel', lvl)}
                                            class={`flex-1 py-2 text-xs font-bold rounded capitalize transition-all ${formData.nivel === lvl
                                                    ? 'bg-orange-500 text-black shadow-md'
                                                    : 'text-gray-500 hover:text-white'
                                                }`}
                                        >
                                            {lvl}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-bold text-gray-400 mb-2">Equipamiento Necesario</label>
                            <div class="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => updateForm('tipo_lugar', 'casa')}
                                    class={`flex-1 py-4 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${formData.tipo_lugar === 'casa'
                                            ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                                            : 'border-white/10 bg-[#1e1c1a] text-gray-400 hover:border-white/30'
                                        }`}
                                >
                                    <span>🏠</span> Casa / Sin Equipo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateForm('tipo_lugar', 'gimnasio')}
                                    class={`flex-1 py-4 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${formData.tipo_lugar === 'gimnasio'
                                            ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                                            : 'border-white/10 bg-[#1e1c1a] text-gray-400 hover:border-white/30'
                                        }`}
                                >
                                    <span>🏋️</span> Gym / Pesas
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-[#2b2623] p-8 rounded-2xl border border-white/5">
                    <div class="flex items-center gap-2 mb-6 text-orange-500">
                        <span>📝</span>
                        <h3 class="text-lg font-bold text-white">Descripción</h3>
                    </div>
                    <textarea
                        value={formData.descripcion}
                        onInput={(e) => updateForm('descripcion', (e.target as HTMLTextAreaElement).value)}
                        rows={4}
                        class="w-full bg-[#1e1c1a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-orange-500 outline-none resize-none"
                        placeholder="Explica la forma correcta y errores comunes..."
                    />
                </div>

                {/* Submit Button */}
                <div class="flex gap-4">
                    <button
                        type="submit"
                        disabled={loading || !formData.nombre}
                        class="flex-1 py-4 bg-orange-500 text-black font-bold rounded-xl hover:bg-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creando...' : 'Crear Ejercicio'}
                    </button>
                    <a
                        href="/admin/ejercicios"
                        class="px-6 py-4 bg-white/5 text-white font-medium rounded-xl hover:bg-white/10 transition-colors"
                    >
                        Cancelar
                    </a>
                </div>
            </div>

            {/* Right Column: Visuals */}
            <div class="bg-[#2b2623] p-8 rounded-2xl border border-white/5 h-fit">
                <div class="flex items-center gap-2 mb-6 text-orange-500">
                    <span>📺</span>
                    <h3 class="text-lg font-bold text-white">Demostración Visual</h3>
                </div>

                <div class="border-2 border-dashed border-orange-500/30 rounded-2xl p-8 text-center bg-[#1e1c1a] relative group hover:border-orange-500/60 transition-colors">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />

                    {preview ? (
                        <div class="aspect-video rounded-lg overflow-hidden relative">
                            <img src={preview} class="w-full h-full object-cover" />
                            <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span class="bg-black/80 text-white px-3 py-1 rounded-full text-xs font-bold">Cambiar Imagen</span>
                            </div>
                        </div>
                    ) : (
                        <div class="py-8">
                            <div class="w-16 h-16 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-4 text-2xl">
                                ☁
                            </div>
                            <h4 class="text-white font-bold mb-1">Arrastra archivos media</h4>
                            <p class="text-xs text-gray-500">GIFs o JPGs de alta calidad. Max 10MB.</p>
                            <span class="inline-block mt-4 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-300">Explorar Archivos</span>
                        </div>
                    )}
                </div>

                <div class="grid grid-cols-4 gap-2 mt-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} class="aspect-square rounded-lg bg-[#1e1c1a] border border-white/5 flex items-center justify-center text-gray-600 text-xl hover:bg-white/5 cursor-pointer">
                            +
                        </div>
                    ))}
                </div>
            </div>
        </form>
    );
}
