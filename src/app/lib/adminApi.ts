export * from './ejerciciosApi';
export * from './rutinasApi';
export * from './yogaAdminApi';
export * from './adminStatsApi';

import {
    getEjercicios,
    createEjercicio,
    updateEjercicio,
    deleteEjercicio,
} from './ejerciciosApi';
import {
    getRutinas,
    createRutina,
    updateRutina,
    deleteRutina,
    saveRutinaConEjercicios,
    getRutinaEjercicios,
} from './rutinasApi';
import {
    getYogaPosiciones,
    createYogaPosicion,
    updateYogaPosicion,
    deleteYogaPosicion,
    getYogaRutinas,
    createYogaRutina,
    updateYogaRutina,
    deleteYogaRutina,
    getYogaRutinaPosiciones,
    addPosicionToYogaRutina,
    removePosicionFromYogaRutina,
} from './yogaAdminApi';
import { getStats } from './adminStatsApi';

const adminApi = {
    getEjercicios,
    createEjercicio,
    updateEjercicio,
    deleteEjercicio,
    getRutinas,
    createRutina,
    updateRutina,
    deleteRutina,
    saveRutinaConEjercicios,
    getRutinaEjercicios,
    getYogaPosiciones,
    createYogaPosicion,
    updateYogaPosicion,
    deleteYogaPosicion,
    getYogaRutinas,
    createYogaRutina,
    updateYogaRutina,
    deleteYogaRutina,
    getYogaRutinaPosiciones,
    addPosicionToYogaRutina,
    removePosicionFromYogaRutina,
    getStats,
};

export default adminApi;
