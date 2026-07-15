import { describe, it, expect, beforeEach } from 'vitest';
import { __mockDbResponse } from '../../test/setup';
import adminApi from './adminApi';

const mockRecetas = [
  {
    id: 'rec-001',
    nombre: 'Ensalada de Pollo',
    descripcion: 'Ensalada fresca con pollo a la plancha',
    ingredientes: ['pollo', 'lechuga', 'tomate', 'aceite de oliva'],
    instrucciones: ['Cortar pollo', 'Mezclar ingredientes', 'Aliñar'],
    tiempo_preparacion: 20,
    dificultad: 'facil',
    calorias: 350,
    proteinas: 30,
    carbos: 15,
    grasas: 12,
    imagen_url: null,
    creado_por: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rec-002',
    nombre: 'Batido de Proteínas',
    descripcion: 'Batido post-entrenamiento',
    ingredientes: ['proteína', 'leche', 'plátano'],
    instrucciones: ['Añadir polvo', 'Mezclar', 'Servir'],
    tiempo_preparacion: 5,
    dificultad: 'facil',
    calorias: 250,
    proteinas: 25,
    carbos: 30,
    grasas: 3,
    imagen_url: null,
    creado_por: null,
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
  },
];

describe('adminApi.getRecetas', () => {
  beforeEach(() => {
    __mockDbResponse.data = null;
    __mockDbResponse.error = null;
  });

  it('returns list of recetas', async () => {
    __mockDbResponse.data = mockRecetas;
    const result = await adminApi.getRecetas();
    expect(result).toEqual(mockRecetas);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no data', async () => {
    __mockDbResponse.data = null;
    const result = await adminApi.getRecetas();
    expect(result).toEqual([]);
  });

  it('throws error when DB fails', async () => {
    __mockDbResponse.error = { message: 'DB error' };
    await expect(adminApi.getRecetas()).rejects.toThrow('DB error');
  });
});

describe('adminApi.createReceta', () => {
  beforeEach(() => {
    __mockDbResponse.data = null;
    __mockDbResponse.error = null;
  });

  it('creates a receta and returns it', async () => {
    const newReceta = {
      nombre: 'Nueva Receta',
      descripcion: 'Test descripción',
      ingredientes: ['ing1', 'ing2'],
      instrucciones: ['paso1'],
      tiempo_preparacion: 15,
      dificultad: 'media',
      calorias: 300,
      proteinas: 20,
      carbos: 30,
      grasas: 10,
    };
    const created = { id: 'rec-003', ...newReceta, created_at: '2025-01-03T00:00:00Z', updated_at: '2025-01-03T00:00:00Z', creado_por: null, imagen_url: null };
    __mockDbResponse.data = created;
    const result = await adminApi.createReceta(newReceta);
    expect(result).toEqual(created);
    expect(result.id).toBe('rec-003');
  });

  it('throws error on insert failure', async () => {
    __mockDbResponse.error = { message: 'Insert failed' };
    await expect(adminApi.createReceta({ nombre: 'Fail' })).rejects.toThrow('Insert failed');
  });
});

describe('adminApi.updateReceta', () => {
  beforeEach(() => {
    __mockDbResponse.data = null;
    __mockDbResponse.error = null;
  });

  it('updates a receta and returns it', async () => {
    const update = { nombre: 'Receta Actualizada' };
    const updated = { ...mockRecetas[0], ...update };
    __mockDbResponse.data = updated;
    const result = await adminApi.updateReceta('rec-001', update);
    expect(result.nombre).toBe('Receta Actualizada');
  });

  it('throws error on update failure', async () => {
    __mockDbResponse.error = { message: 'Update failed' };
    await expect(adminApi.updateReceta('rec-001', { nombre: 'X' })).rejects.toThrow('Update failed');
  });
});

describe('adminApi.deleteReceta', () => {
  beforeEach(() => {
    __mockDbResponse.data = null;
    __mockDbResponse.error = null;
  });

  it('deletes a receta successfully', async () => {
    __mockDbResponse.data = null;
    __mockDbResponse.error = null;
    await expect(adminApi.deleteReceta('rec-001')).resolves.toBeUndefined();
  });

  it('throws error on delete failure', async () => {
    __mockDbResponse.error = { message: 'Delete failed' };
    await expect(adminApi.deleteReceta('rec-001')).rejects.toThrow('Delete failed');
  });
});
