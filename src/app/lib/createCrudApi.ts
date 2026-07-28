// ================================================================
// createCrudApi — Generic CRUD API Factory
// ================================================================
// Crea un conjunto tipado de funciones { list, create, update, del }
// sobre adminFetch para un basePath dado.
//
// Uso:
//   const api = createCrudApi<Ejercicio>('/api/admin/ejercicios');
//   const items = await api.list(token);
//   const item = await api.create(token, { nombre: 'Foo' });
// ================================================================

import { adminFetch } from './adminFetch';

export function createCrudApi<T extends { id?: string | number }>(basePath: string) {
  return {
    /** Obtiene todos los recursos */
    list: (token: string): Promise<T[]> =>
      adminFetch<T[]>(basePath, token),

    /** Crea un nuevo recurso */
    create: (token: string, data: Partial<T>): Promise<T> =>
      adminFetch<T>(basePath, token, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    /** Actualiza un recurso existente por ID */
    update: (token: string, id: string | number, data: Partial<T>): Promise<T> =>
      adminFetch<T>(`${basePath}/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    /** Elimina un recurso por ID */
    del: (token: string, id: string | number): Promise<void> =>
      adminFetch<void>(`${basePath}/${id}`, token, {
        method: 'DELETE',
      }),
  };
}
