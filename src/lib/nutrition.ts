// Utilidades para cálculos nutricionales

interface PerfilData {
    peso_actual: number | null;
    altura: number | null;
    fecha_nacimiento: string | null;
    genero: 'masculino' | 'femenino' | 'otro' | null;
    nivel: 'principiante' | 'intermedio' | 'avanzado' | null;
    objetivo: 'mantener_forma' | 'tonificar' | 'ganar_fuerza' | null;
    dias_entrenamiento_semana: number;
}

// Factores de actividad según nivel
const factoresActividad: Record<string, number> = {
    'sedentario': 1.2,      // Poco o nada de ejercicio
    'ligero': 1.375,        // 1–3 días/semana
    'moderado': 1.55,       // 3–5 días/semana
    'activo': 1.725,        // 6–7 días/semana
    'muy_activo': 1.9       // Entrenamiento intenso diario
};

// Mapear nivel a factor de actividad
function getFactorActividad(nivel: string | null, diasSemana: number): number {
    // Primero consideramos los días de entrenamiento
    if (diasSemana <= 1) return factoresActividad.sedentario;
    if (diasSemana <= 3) return factoresActividad.ligero;
    if (diasSemana <= 5) return factoresActividad.moderado;
    if (diasSemana <= 7) return factoresActividad.activo;
    return factoresActividad.muy_activo;
}

// Calcular edad a partir de fecha de nacimiento
function calcularEdad(fechaNacimiento: string | null): number | null {
    if (!fechaNacimiento) return null;
    
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    
    return edad;
}

// Calcular BMR usando Mifflin-St Jeor
export function calcularBMR(perfil: PerfilData): number | null {
    const { peso_actual, altura, fecha_nacimiento, genero } = perfil;
    
    // Verificar que tenemos todos los datos necesarios
    if (!peso_actual || !altura || !fecha_nacimiento || !genero) {
        return null;
    }
    
    const edad = calcularEdad(fecha_nacimiento);
    if (!edad || edad < 10 || edad > 100) {
        return null;
    }
    
    let bmr: number;
    
    if (genero === 'masculino') {
        // Hombre: BMR = (10 × peso) + (6.25 × estatura) − (5 × edad) + 5
        bmr = (10 * peso_actual) + (6.25 * altura) - (5 * edad) + 5;
    } else if (genero === 'femenino') {
        // Mujer: BMR = (10 × peso) + (6.25 × estatura) − (5 × edad) − 161
        bmr = (10 * peso_actual) + (6.25 * altura) - (5 * edad) - 161;
    } else {
        // Para 'otro', usamos promedio entre hombre y mujer
        const bmrHombre = (10 * peso_actual) + (6.25 * altura) - (5 * edad) + 5;
        const bmrMujer = (10 * peso_actual) + (6.25 * altura) - (5 * edad) - 161;
        bmr = (bmrHombre + bmrMujer) / 2;
    }
    
    return Math.round(bmr);
}

// Calcular TDEE (Total Daily Energy Expenditure)
export function calcularTDEE(perfil: PerfilData): number | null {
    const bmr = calcularBMR(perfil);
    if (!bmr) return null;
    
    const factorActividad = getFactorActividad(perfil.nivel, perfil.dias_entrenamiento_semana);
    return Math.round(bmr * factorActividad);
}

// Calcular calorías objetivo según el objetivo del usuario
export function calcularCaloriasObjetivo(perfil: PerfilData): {
    calorias: number | null;
    tipo: string;
    descripcion: string;
} {
    const tdee = calcularTDEE(perfil);
    
    if (!tdee) {
        return {
            calorias: null,
            tipo: 'No calculable',
            descripcion: 'Completa tu perfil para calcular tus calorías'
        };
    }
    
    const { objetivo } = perfil;
    
    switch (objetivo) {
        case 'mantener_forma':
            return {
                calorias: tdee,
                tipo: 'Mantenimiento',
                descripcion: 'Mantén tu peso actual'
            };
        
        case 'tonificar':
            // Tonificar generalmente implica definir (bajar grasa) o mantener
            // Usamos déficit moderado de 400 calorías
            return {
                calorias: tdee - 400,
                tipo: 'Déficit moderado',
                descripcion: 'Pérdida de grasa moderada para definición'
            };
        
        case 'ganar_fuerza':
            // Ganar fuerza/músculo requiere superávit
            return {
                calorias: tdee + 400,
                tipo: 'Superávit calórico',
                descripcion: 'Ganancia muscular óptima'
            };
        
        default:
            return {
                calorias: tdee,
                tipo: 'Mantenimiento',
                descripcion: 'Define tu objetivo para un cálculo personalizado'
            };
    }
}

// Obtener información del nivel de actividad
export function getInfoActividad(nivel: string | null, diasSemana: number): {
    nivel: string;
    factor: number;
    descripcion: string;
} {
    const factor = getFactorActividad(nivel, diasSemana);
    
    let nivelTexto: string;
    let descripcion: string;
    
    if (factor <= 1.2) {
        nivelTexto = 'Sedentario';
        descripcion = 'Poco o nada de ejercicio';
    } else if (factor <= 1.375) {
        nivelTexto = 'Ligero';
        descripcion = '1-3 días/semana';
    } else if (factor <= 1.55) {
        nivelTexto = 'Moderado';
        descripcion = '3-5 días/semana';
    } else if (factor <= 1.725) {
        nivelTexto = 'Activo';
        descripcion = '6-7 días/semana';
    } else {
        nivelTexto = 'Muy activo';
        descripcion = 'Entrenamiento intenso diario';
    }
    
    return { nivel: nivelTexto, factor, descripcion };
}

// Calcular IMC (Índice de Masa Corporal)
export function calcularIMC(peso: number | null, altura: number | null): number | null {
    if (!peso || !altura || altura <= 0) return null;
    return peso / ((altura / 100) ** 2);
}

// Obtener categoría del IMC
export function getCategoriaIMC(imc: number | null): string {
    if (!imc) return '--';
    
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Peso normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
}
