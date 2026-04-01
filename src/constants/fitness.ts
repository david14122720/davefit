export const grupoIcons: Record<string, string> = {
    pecho: '🎯',
    espalda: '🔙',
    piernas: '🦵',
    brazo: '💪',
    hombros: '🏋️',
    core: '🔥',
    cardio: '🏃',
    full_body: '⚡',
};

export const nivelColors: Record<string, string> = {
    principiante: 'bg-green-500/10 text-green-400 border-green-500/20',
    intermedio: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    avanzado: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export const tipoLugarOptions = ['gimnasio', 'casa', 'exterior', 'oficina'];

export const objetivoRutinaOptions = [
    { value: 'mantener_forma', label: 'Mantener Forma' },
    { value: 'tonificar', label: 'Tonificar' },
    { value: 'ganar_fuerza', label: 'Ganar Fuerza' },
];

export const objetivoYogaOptions = [
    { value: 'flexibilidad', label: 'Flexibilidad' },
    { value: 'fuerza', label: 'Fuerza' },
    { value: 'relax', label: 'Relax' },
];
