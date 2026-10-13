export const grupoIcons: Record<string, string> = {
    pecho: '🎯',
    espalda: '🔙',
    piernas: '🦵',
    brazo: '💪',
    hombros: '🏋️',
    core: '🔥',
    cardio: '🏃',
    full_body: '⚡',
    cuello: '🦒',
};

export const nivelColors: Record<string, string> = {
    principiante: 'bg-green-500/10 text-green-400 border-green-500/20',
    intermedio: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    avanzado: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export const nivelOptions = ['principiante', 'intermedio', 'avanzado'];

export const objetivoRutinaOptions = ['mantener_forma', 'tonificar', 'ganar_fuerza'];

export const objetivoYogaOptions = ['flexibilidad', 'fuerza', 'relajacion'];

export const grupoMuscularOptions = Object.keys(grupoIcons);

export const rutinaDisponibilidadOptions = ['casa', 'gimnasio', 'ambos'];


