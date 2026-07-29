// ================================================================
// Admin API Route — Server-Side Only
// ================================================================
// TODAS las operaciones de administración pasan por AQUÍ.
// Nunca se ejecutan directamente desde el navegador.
//
// Cada request:
//   1. Verifica JWT + rol admin via verifyAdmin()
//   2. Ejecuta la operación en la base de datos
//   3. Retorna el resultado
// ================================================================

import type { APIRoute } from 'astro';
import { createClient } from '@insforge/sdk';
import { verifyAdmin, AdminAuthError } from '../../../lib/admin-auth';

const INSFORGE_URL = import.meta.env.PUBLIC_INSFORGE_URL!;
const INSFORGE_ANON_KEY = import.meta.env.PUBLIC_INSFORGE_ANON_KEY!;

// ================================================================
// Helpers
// ================================================================

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Parse slug path: "ejercicios/some-id" → ["ejercicios", "some-id"]
 */
function parseSlug(slug: string | undefined): [string, string | undefined] {
  if (!slug) return ['', undefined];
  const parts = slug.split('/');
  return [parts[0], parts[1]];
}

// ================================================================
// Admin CRUD Handlers
// ================================================================

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function handleRequest(method: HttpMethod, slug: string | undefined, request: Request): Promise<Response> {
  // 1. Verificar autenticación y rol admin
  try {
    await verifyAdmin(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return jsonError(err.message, err.statusCode);
    }
    return jsonError('Error de autorización', 500);
  }

  const [resource, id] = parseSlug(slug);
  const body = method !== 'GET' ? await request.json().catch(() => ({})) : undefined;

  // Crear cliente autenticado para operaciones DB
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') || '';
  const db = createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
    headers: { Authorization: `Bearer ${token}` },
  }).database;

  try {
    switch (resource) {
      // ============================================================
      // EJERCICIOS
      // ============================================================
      case 'ejercicios': {
        if (method === 'GET') {
          const { data, error } = await db.from('ejercicios')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) return jsonError(error.message, 500);
          return json(data || []);
        }

        if (method === 'POST') {
          const { data, error } = await db.from('ejercicios')
            .insert([body])
            .select()
            .single();
          if (error) return jsonError(error.message, 500);
          return json(data, 201);
        }

        if (method === 'PUT' && id) {
          const { data, error } = await db.from('ejercicios')
            .update(body)
            .eq('id', id)
            .select()
            .single();
          if (error) return jsonError(error.message, 500);
          return json(data);
        }

        if (method === 'DELETE' && id) {
          // Fetch file URLs to clean up storage
          const { data: ejercicio, error: fetchError } = await db.from('ejercicios')
            .select('imagen_url, video_url')
            .eq('id', id)
            .maybeSingle();
          if (fetchError) return jsonError(fetchError.message, 500);

          if (ejercicio) {
            const storage = createClient({
              baseUrl: INSFORGE_URL,
              anonKey: INSFORGE_ANON_KEY,
              headers: { Authorization: `Bearer ${token}` },
            }).storage;

            const deleteFile = async (url: string | undefined) => {
              if (!url) return;
              const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
              if (match?.[1]) {
                const path = decodeURIComponent(match[1]);
                try { await storage.from('ejercicios').remove(path); } catch { /* ignore */ }
              }
            };
            await deleteFile(ejercicio.imagen_url);
            await deleteFile(ejercicio.video_url);
          }

          const { error } = await db.from('ejercicios').delete().eq('id', id);
          if (error) return jsonError(error.message, 500);
          return json({ success: true });
        }

        return jsonError('Ruta no encontrada', 404);
      }

      // ============================================================
      // RUTINAS
      // ============================================================
      case 'rutinas': {
        if (method === 'GET') {
          const { data, error } = await db.from('rutinas')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) return jsonError(error.message, 500);
          return json(data || []);
        }

        if (method === 'POST') {
          const { data, error } = await db.from('rutinas')
            .insert([body])
            .select()
            .single();
          if (error) return jsonError(error.message, 500);
          return json(data, 201);
        }

        if (method === 'PUT' && id) {
          const { data, error } = await db.from('rutinas')
            .update(body)
            .eq('id', id)
            .select()
            .single();
          if (error) return jsonError(error.message, 500);
          return json(data);
        }

        if (method === 'DELETE' && id) {
          // Clean up relational data
          await db.from('rutinas_ejercicios').delete().eq('rutina_id', id);
          const { error } = await db.from('rutinas').delete().eq('id', id);
          if (error) return jsonError(error.message, 500);
          return json({ success: true });
        }

        return jsonError('Ruta no encontrada', 404);
      }

      // ============================================================
      // RUTINAS — EJERCICIOS RELATION (nested slug: rutinas-ejercicios)
      // ============================================================
      case 'rutinas-ejercicios': {
        if (method === 'POST') {
          // saveRutinaConEjercicios: expects { rutina, ejercicios }
          let rutinaId: string;

          if (body.rutina?.id) {
            const { data, error } = await db.from('rutinas')
              .update(body.rutina)
              .eq('id', body.rutina.id)
              .select()
              .single();
            if (error) return jsonError(error.message, 500);
            rutinaId = data.id;
            await db.from('rutinas_ejercicios').delete().eq('rutina_id', rutinaId);
          } else {
            const { data, error } = await db.from('rutinas')
              .insert([body.rutina])
              .select()
              .single();
            if (error) return jsonError(error.message, 500);
            rutinaId = data.id;
          }

          if (body.ejercicios?.length > 0) {
            const ejerciciosData = body.ejercicios.map((e: any, index: number) => ({
              rutina_id: rutinaId,
              ejercicio_id: e.ejercicio_id,
              orden: index + 1,
              series: e.series,
              repeticiones: e.repeticiones,
              descanso_segundos: e.descanso_segundos,
            }));
            const { error } = await db.from('rutinas_ejercicios').insert(ejerciciosData);
            if (error) return jsonError(error.message, 500);
          }

          const { data: final } = await db.from('rutinas').select('*').eq('id', rutinaId).single();
          return json(final);
        }

        if (method === 'GET' && id) {
          const { data, error } = await db.from('rutinas_ejercicios')
            .select('*')
            .eq('rutina_id', id)
            .order('orden', { ascending: true });
          if (error) return jsonError(error.message, 500);
          return json(data || []);
        }

        return jsonError('Ruta no encontrada', 404);
      }

      // ============================================================
      // YOGA POSICIONES
      // ============================================================
      case 'yoga-posiciones': {
        if (method === 'GET') {
          const { data, error } = await db.from('yoga_posiciones')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) return jsonError(error.message, 500);
          return json(data || []);
        }

        if (method === 'POST') {
          const { data, error } = await db.from('yoga_posiciones')
            .insert([body])
            .select()
            .single();
          if (error) return jsonError(error.message, 500);
          return json(data, 201);
        }

        if (method === 'PUT' && id) {
          const { data, error } = await db.from('yoga_posiciones')
            .update(body)
            .eq('id', id)
            .select()
            .single();
          if (error) return jsonError(error.message, 500);
          return json(data);
        }

        if (method === 'DELETE' && id) {
          const { error } = await db.from('yoga_posiciones').delete().eq('id', id);
          if (error) return jsonError(error.message, 500);
          return json({ success: true });
        }

        return jsonError('Ruta no encontrada', 404);
      }

      // ============================================================
      // YOGA RUTINAS
      // ============================================================
      case 'yoga-rutinas': {
        if (method === 'GET') {
          const { data, error } = await db.from('yoga_rutinas')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) return jsonError(error.message, 500);
          return json(data || []);
        }

        if (method === 'POST') {
          const { data, error } = await db.from('yoga_rutinas')
            .insert([body])
            .select()
            .single();
          if (error) return jsonError(error.message, 500);
          return json(data, 201);
        }

        if (method === 'PUT' && id) {
          const { data, error } = await db.from('yoga_rutinas')
            .update(body)
            .eq('id', id)
            .select()
            .single();
          if (error) return jsonError(error.message, 500);
          return json(data);
        }

        if (method === 'DELETE' && id) {
          const { error } = await db.from('yoga_rutinas').delete().eq('id', id);
          if (error) return jsonError(error.message, 500);
          return json({ success: true });
        }

        return jsonError('Ruta no encontrada', 404);
      }

      // ============================================================
      // YOGA RUTINA POSICIONES
      // ============================================================
      case 'yoga-rutina-posiciones': {
        if (method === 'GET' && id) {
          const { data, error } = await db.from('yoga_rutina_posiciones')
            .select('*')
            .eq('rutina_id', id)
            .order('orden', { ascending: true });
          if (error) return jsonError(error.message, 500);
          return json(data || []);
        }

        if (method === 'POST') {
          const { data, error } = await db.from('yoga_rutina_posiciones')
            .insert([body])
            .select()
            .single();
          if (error) return jsonError(error.message, 500);
          return json(data, 201);
        }

        if (method === 'DELETE' && id) {
          const { error } = await db.from('yoga_rutina_posiciones').delete().eq('id', id);
          if (error) return jsonError(error.message, 500);
          return json({ success: true });
        }

        return jsonError('Ruta no encontrada', 404);
      }

      // ============================================================
      // STATS (admin dashboard counts)
      // ============================================================
      case 'stats': {
        const [ejercicios, rutinas, yogaPosiciones, yogaRutinas] = await Promise.all([
          db.from('ejercicios').select('id', { count: 'exact', head: true }),
          db.from('rutinas').select('id', { count: 'exact', head: true }),
          db.from('yoga_posiciones').select('id', { count: 'exact', head: true }),
          db.from('yoga_rutinas').select('id', { count: 'exact', head: true }),
        ]);
        return json({
          ejercicios: ejercicios.count || 0,
          rutinas: rutinas.count || 0,
          yogaPosiciones: yogaPosiciones.count || 0,
          yogaRutinas: yogaRutinas.count || 0,
        });
      }

      default:
        return jsonError(`Recurso no encontrado: ${resource}`, 404);
    }
  } catch (err: any) {
    console.error(`[AdminAPI] Error en ${method} /${resource}:`, err);
    return jsonError(err?.message || 'Error interno del servidor', 500);
  }
}

// ================================================================
// Route exports
// ================================================================

export const GET: APIRoute = async ({ params, request }) => handleRequest('GET', params.slug, request);
export const POST: APIRoute = async ({ params, request }) => handleRequest('POST', params.slug, request);
export const PUT: APIRoute = async ({ params, request }) => handleRequest('PUT', params.slug, request);
export const DELETE: APIRoute = async ({ params, request }) => handleRequest('DELETE', params.slug, request);
