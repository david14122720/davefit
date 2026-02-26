import { useState } from 'preact/hooks';
import { insforge } from '../../lib/insforge';

type Step = 'info' | 'goal' | 'details' | 'finish';

export default function OnboardingWizard() {
    const [step, setStep] = useState<Step>('info');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        genero: '',
        fecha_nacimiento: '',
        objetivo: '',
        nivel: '',
        preferencia_lugar: '',
        peso_actual: '',
        altura: ''
    });

    const updateForm = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const { data: userData } = await insforge.auth.getCurrentUser();
            const user = userData?.user;
            if (!user) throw new Error('No usuario autenticado');

            const { error } = await insforge.database
                .from('perfiles')
                .update({
                    ...formData,
                    peso_actual: parseFloat(formData.peso_actual),
                    altura: parseFloat(formData.altura),
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            window.location.href = '/dashboard';
        } catch (err) {
            console.error(err);
            alert('Error al guardar perfil. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const CardOption = ({ selected, onClick, title, desc, icon }: any) => (
        <button
            onClick={onClick}
            class={`w-full p-4 rounded-xl border text-left transition-all ${selected
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
        >
            <div class="text-2xl mb-2">{icon}</div>
            <div class="font-bold text-white mb-1">{title}</div>
            <div class="text-sm text-gray-400">{desc}</div>
        </button>
    );

    return (
        <div class="bg-[var(--color-bg-card)] border border-white/10 rounded-2xl p-6 md:p-10 shadow-2xl">
            {/* Progress Bar */}
            <div class="flex gap-2 mb-8">
                {['info', 'goal', 'details'].map((s, i) => {
                    const steps = ['info', 'goal', 'details'];
                    const currentIndex = steps.indexOf(step);
                    const sIndex = steps.indexOf(s);
                    return (
                        <div
                            key={s}
                            class={`h-1.5 flex-1 rounded-full ${sIndex <= currentIndex ? 'bg-[var(--color-primary)]' : 'bg-white/10'
                                }`}
                        />
                    );
                })}
            </div>

            {step === 'info' && (
                <div class="space-y-6 animate-fade-in">
                    <div>
                        <h2 class="text-2xl font-bold text-white mb-2">Cuéntanos sobre ti</h2>
                        <p class="text-gray-400">Para personalizar tus métricas base.</p>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-1">Género</label>
                            <select
                                value={formData.genero}
                                onChange={(e) => updateForm('genero', (e.target as HTMLSelectElement).value)}
                                class="w-full px-4 py-3 rounded-lg bg-[var(--color-bg-dark)] border border-white/10 text-white outline-none focus:border-[var(--color-primary)]"
                            >
                                <option value="">Selecciona</option>
                                <option value="masculino">Masculino</option>
                                <option value="femenino">Femenino</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-1">Fecha Nacimiento</label>
                            <input
                                type="date"
                                value={formData.fecha_nacimiento}
                                onInput={(e) => updateForm('fecha_nacimiento', (e.target as HTMLInputElement).value)}
                                class="w-full px-4 py-3 rounded-lg bg-[var(--color-bg-dark)] border border-white/10 text-white outline-none focus:border-[var(--color-primary)]"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-1">Peso (kg)</label>
                            <input
                                type="number"
                                value={formData.peso_actual}
                                onInput={(e) => updateForm('peso_actual', (e.target as HTMLInputElement).value)}
                                class="w-full px-4 py-3 rounded-lg bg-[var(--color-bg-dark)] border border-white/10 text-white outline-none focus:border-[var(--color-primary)]"
                                placeholder="75"
                            />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-1">Altura (cm)</label>
                            <input
                                type="number"
                                value={formData.altura}
                                onInput={(e) => updateForm('altura', (e.target as HTMLInputElement).value)}
                                class="w-full px-4 py-3 rounded-lg bg-[var(--color-bg-dark)] border border-white/10 text-white outline-none focus:border-[var(--color-primary)]"
                                placeholder="175"
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => setStep('goal')}
                        disabled={!formData.genero || !formData.peso_actual || !formData.altura}
                        class="w-full py-4 bg-[var(--color-primary)] text-[var(--color-bg-dark)] font-bold rounded-xl hover:bg-[#ff8533] transition-colors disabled:opacity-50"
                    >
                        Siguiente
                    </button>
                </div>
            )}

            {step === 'goal' && (
                <div class="space-y-6 animate-fade-in">
                    <div>
                        <h2 class="text-2xl font-bold text-white mb-2">Tu Objetivo Principal</h2>
                        <p class="text-gray-400">Adaptaremos las rutinas a esta meta.</p>
                    </div>

                    <div class="grid grid-cols-1 gap-3">
                        <CardOption
                            title="Mantenerse en Forma"
                            desc="Mejorar resistencia y salud general"
                            icon="🏃"
                            selected={formData.objetivo === 'mantener_forma'}
                            onClick={() => updateForm('objetivo', 'mantener_forma')}
                        />
                        <CardOption
                            title="Tonificar y Definir"
                            desc="Perder grasa y marcar musculatura"
                            icon="🔥"
                            selected={formData.objetivo === 'tonificar'}
                            onClick={() => updateForm('objetivo', 'tonificar')}
                        />
                        <CardOption
                            title="Ganar Fuerza y Músculo"
                            desc="Hipertrofia y aumento de fuerza"
                            icon="💪"
                            selected={formData.objetivo === 'ganar_fuerza'}
                            onClick={() => updateForm('objetivo', 'ganar_fuerza')}
                        />
                    </div>

                    <div class="flex gap-3">
                        <button
                            onClick={() => setStep('info')}
                            class="flex-1 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10"
                        >
                            Atrás
                        </button>
                        <button
                            onClick={() => setStep('details')}
                            disabled={!formData.objetivo}
                            class="flex-[2] py-4 bg-[var(--color-primary)] text-[var(--color-bg-dark)] font-bold rounded-xl hover:bg-[#ff8533] disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}

            {step === 'details' && (
                <div class="space-y-6 animate-fade-in">
                    <div>
                        <h2 class="text-2xl font-bold text-white mb-2">Últimos Detalles</h2>
                        <p class="text-gray-400">Define tu nivel y lugar de entreno.</p>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Nivel de Experiencia</label>
                            <div class="grid grid-cols-3 gap-2">
                                {['principiante', 'intermedio', 'avanzado'].map(l => (
                                    <button
                                        key={l}
                                        onClick={() => updateForm('nivel', l)}
                                        class={`p-3 rounded-lg border text-sm capitalize ${formData.nivel === l
                                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                            : 'border-white/10 bg-white/5 text-gray-400'
                                            }`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Lugar de Entrenamiento</label>
                            <div class="grid grid-cols-3 gap-2">
                                {['casa', 'gimnasio', 'ambos'].map(l => (
                                    <button
                                        key={l}
                                        onClick={() => updateForm('preferencia_lugar', l)}
                                        class={`p-3 rounded-lg border text-sm capitalize ${formData.preferencia_lugar === l
                                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                            : 'border-white/10 bg-white/5 text-gray-400'
                                            }`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div class="flex gap-3 pt-4">
                        <button
                            onClick={() => setStep('goal')}
                            class="flex-1 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10"
                        >
                            Atrás
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !formData.nivel || !formData.preferencia_lugar}
                            class="flex-[2] py-4 bg-[var(--color-primary)] text-[var(--color-bg-dark)] font-bold rounded-xl hover:bg-[#ff8533] disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
                        >
                            {loading ? 'Guardando...' : 'Comenzar Aventura'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
