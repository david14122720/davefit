// ============================================================
// URLs de objetos de storage → forma RELATIVA same-origin
// ============================================================
//
// Por qué: el backend devuelve URLs absolutas apuntando a SU origen
// (antes https://insforge.tesh.online, hoy https://insforge.dtesh.dev).
// Guardar/renderizar esa forma tiene dos problemas:
//  1. La CSP de la app (img-src 'self') bloquea el origen externo → la
//     imagen recién subida "no se ve" aunque la subida funcione.
//  2. Ata los datos al origen de turno: al cambiar de dominio/puerto
//     (deploy en LAN, dominio nuevo) todas las URLs viejas mueren.
// La forma relativa `/api/storage/...` funciona bajo CUALQUIER origen porque
// Vite (dev) y nginx (prod) proxyean /api/storage al backend.

/**
 * Convierte una URL absoluta de storage a su forma relativa same-origin.
 * Las URLs externas que no son de storage pasan intactas; `null`/vacío → null.
 */
export function normalizeStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/api/storage/')) return url;
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith('/api/storage/')) {
      return parsed.pathname + parsed.search;
    }
    return url; // URL externa legítima (p. ej. dataset de ejercicios): intacta.
  } catch {
    return url; // Ya es relativa (u otro formato): como está.
  }
}

/** Construye la URL relativa canónica de un objeto de storage. */
export function buildStorageUrl(bucket: string, key: string): string {
  return `/api/storage/buckets/${bucket}/objects/${encodeURIComponent(key)}`;
}

/**
 * Extrae `{ bucket, key }` de una URL de storage (absoluta o relativa).
 * Sirve para borrar el objeto anterior al reemplazarlo. `null` si la URL no
 * apunta a un objeto de storage.
 */
export function parseStorageObjectUrl(
  url: string | null | undefined,
): { bucket: string; key: string } | null {
  if (!url) return null;

  let pathname: string;
  let search: string;
  try {
    const parsed = url.startsWith('/')
      ? new URL(url, 'http://same-origin.local')
      : new URL(url);
    pathname = parsed.pathname;
    search = parsed.search;
  } catch {
    return null;
  }

  // Las URLs de objeto de este backend no llevan query string.
  if (search) return null;

  const match = pathname.match(/^\/api\/storage\/buckets\/([^/]+)\/objects\/(.+)$/);
  if (!match) return null;

  try {
    return { bucket: decodeURIComponent(match[1]), key: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}
