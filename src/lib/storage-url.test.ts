import { describe, it, expect } from 'vitest';
import { normalizeStorageUrl, buildStorageUrl, parseStorageObjectUrl } from './storage-url';

// Las URLs de storage se guardaban ABSOLUTAS (las del backend: antes
// insforge.tesh.online, ahora insforge.dtesh.dev). La CSP de la app
// (img-src 'self') las BLOQUEA → la imagen subida "no se ve". Además atan la
// DB a un origen externo. La regla: guardar/renderizar siempre la forma
// RELATIVA same-origin (/api/storage/...), que nginx/Vite proxyean.

describe('normalizeStorageUrl', () => {
  it('convierte una URL absoluta de storage a relativa same-origin', () => {
    expect(
      normalizeStorageUrl(
        'https://insforge.dtesh.dev/api/storage/buckets/avatares/objects/avatars%2Fabc.jpeg',
      ),
    ).toBe('/api/storage/buckets/avatares/objects/avatars%2Fabc.jpeg');
    expect(
      normalizeStorageUrl(
        'http://192.168.50.121:7130/api/storage/buckets/avatares/objects/avatars%2Fabc.jpeg',
      ),
    ).toBe('/api/storage/buckets/avatares/objects/avatars%2Fabc.jpeg');
    // Dominio muerto (tesh.online): también se sana al pasar a relativo.
    expect(
      normalizeStorageUrl(
        'https://insforge.tesh.online/api/storage/buckets/avatares/objects/avatars%2Fviejo.jpeg',
      ),
    ).toBe('/api/storage/buckets/avatares/objects/avatars%2Fviejo.jpeg');
  });

  it('deja intacta una URL que ya es relativa', () => {
    const relative = '/api/storage/buckets/avatares/objects/avatars%2Fabc.jpeg';
    expect(normalizeStorageUrl(relative)).toBe(relative);
  });

  it('no toca URLs externas que no son de storage', () => {
    expect(normalizeStorageUrl('https://raw.githubusercontent.com/x/y.jpg')).toBe(
      'https://raw.githubusercontent.com/x/y.jpg',
    );
    expect(normalizeStorageUrl('https://placehold.co/400x300')).toBe('https://placehold.co/400x300');
  });

  it('resuelve vacíos a null sin romper', () => {
    expect(normalizeStorageUrl(null)).toBeNull();
    expect(normalizeStorageUrl(undefined)).toBeNull();
    expect(normalizeStorageUrl('')).toBeNull();
  });
});

describe('buildStorageUrl', () => {
  it('construye la URL relativa del objeto', () => {
    expect(buildStorageUrl('avatares', 'avatars/u1-123.jpeg')).toBe(
      '/api/storage/buckets/avatares/objects/avatars%2Fu1-123.jpeg',
    );
  });
});

describe('parseStorageObjectUrl', () => {
  it('extrae bucket y key de una URL absoluta o relativa', () => {
    expect(
      parseStorageObjectUrl(
        'https://insforge.dtesh.dev/api/storage/buckets/avatares/objects/avatars%2Fu1-123.jpeg',
      ),
    ).toEqual({ bucket: 'avatares', key: 'avatars/u1-123.jpeg' });
    expect(
      parseStorageObjectUrl('/api/storage/buckets/avatares/objects/avatars%2Fu1-123.jpeg'),
    ).toEqual({ bucket: 'avatares', key: 'avatars/u1-123.jpeg' });
  });

  it('devuelve null para URLs que no son de storage', () => {
    expect(parseStorageObjectUrl('https://example.com/foto.jpg')).toBeNull();
    expect(parseStorageObjectUrl(null)).toBeNull();
    expect(parseStorageObjectUrl('')).toBeNull();
  });
});
