import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import { getUserStats } from '../../lib/stats';
import ProfilePage from './ProfilePage';

// Reglas que cubre este test:
// 1. La URL que se guarda en perfiles.avatar_url debe ser RELATIVA
//    same-origin (/api/storage/...): la absoluta del backend (hoy
//    insforge.dtesh.dev) la bloquea la CSP (img-src 'self') y ata la DB a
//    un origen externo.
// 2. El avatar anterior del bucket se borra tras el reemplazo (best-effort):
//    antes quedaba público para siempre.
// 3. El formulario (siempre visible, como el diseño Stitch) envía los campos
//    reales editados: nombre y frecuencia semanal por pills.
// 4. "Descartar cambios" restaura los valores guardados sin guardar nada.
// 5. Racha / rango / XP salen de user_stats (datos reales), y cuando faltan
//    datos base se muestra el estado "Completa tu perfil" en vez de inventar
//    métricas.

const updatePerfil = vi.fn().mockResolvedValue({});
const upload = vi.fn();
const remove = vi.fn().mockResolvedValue({ data: null, error: null });

// Perfil base: sin campos biométricos → métricas no computables.
const basePerfil = {
  nombre_completo: 'E2E Avatar',
  avatar_url:
    'https://insforge.dtesh.dev/api/storage/buckets/avatares/objects/avatars%2Fuser-1-old.jpeg',
  fecha_nacimiento: null as string | null,
  genero: null as string | null,
  peso_actual: null as number | null,
  altura: null as number | null,
  objetivo: null as string | null,
  nivel: null as string | null,
  dias_entrenamiento_semana: null as number | null,
};

const mockAuth = {
  user: { id: 'user-1', email: 'e2e@davefit.local' },
  perfil: { ...basePerfil },
  accessToken: 'tok-test',
  loading: false,
  isAdmin: false,
  updatePerfil,
};

// Stats reales de `user_stats`: 65 XP en nivel 1 → 65/100 XP, 35 restantes.
const statsFixture = {
  id: 'stats-1',
  user_id: 'user-1',
  xp_total: 65,
  nivel: 1,
  dias_racha: 4,
  ultimo_entreno: null,
  racha_bonus: 0,
  total_workouts: 8,
  longest_streak: 6,
  weekly_score: 30,
  monthly_score: 120,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

// `user_stats` se mockea a nivel de módulo: el setup global ya mockea
// InsForge, pero acá necesitamos controlar los valores de XP/racha.
vi.mock('../../lib/stats', () => ({
  getUserStats: vi.fn(),
}));

// El cropper no tiene sentido en jsdom: se mockea simulando la selección
// completa del área (onCropComplete se dispara como con el componente real).
vi.mock('react-easy-crop', async () => {
  const ReactActual = await import('react');
  const MockCropper = (props: {
    onCropComplete?: (area: unknown, pixels: unknown) => void;
  }) => {
    ReactActual.useEffect(() => {
      props.onCropComplete?.({}, { x: 0, y: 0, width: 10, height: 10 });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return ReactActual.createElement('div', { 'data-testid': 'cropper' });
  };
  return { default: MockCropper };
});

// El canvas de jsdom no existe: el pipeline de recorte devuelve un Blob listo.
vi.mock('../../lib/cropImage', () => ({
  default: vi.fn(async () => new Blob(['fake-jpeg'], { type: 'image/jpeg' })),
}));

function makeJpegFile(name = 'foto.jpg'): File {
  // Bytes mínimos con firma JPEG (FF D8 FF) para pasar validateFile.
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  return new File([bytes], name, { type: 'image/jpeg' });
}

async function esperarFormulario() {
  // La página arranca en skeleton (stats async): esperar un campo real.
  return screen.findByLabelText(/nombre completo/i);
}

async function subirAvatar() {
  // La página arranca en skeleton (stats async): esperar el input real.
  const input = await waitFor(() => {
    const el = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (!el) throw new Error('input de archivo todavía no renderizado');
    return el;
  });
  fireEvent.change(input, { target: { files: [makeJpegFile()] } });

  // Se abre el modal de recorte → Confirmar.
  const confirmar = await screen.findByRole('button', { name: /confirmar/i });

  // El Cropper (mock) reporta el área en un efecto post-montaje: hay que
  // dejar que ese estado interno se asiente antes de confirmar (si no, el
  // guard de processAndUploadCrop ve croppedAreaPixels = null).
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
  fireEvent.click(confirmar);
}

describe('ProfilePage — subida de avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.perfil = { ...basePerfil };
    vi.mocked(getUserStats).mockResolvedValue(statsFixture as any);
    upload.mockResolvedValue({
      data: {
        bucket: 'avatares',
        key: 'avatars/user-1-123.jpeg',
        size: 100,
        mimeType: 'image/jpeg',
        url: 'https://insforge.dtesh.dev/api/storage/buckets/avatares/objects/avatars%2Fuser-1-123.jpeg',
      },
      error: null,
    });
    (insforge.storage.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      upload,
      remove,
    }));
  });

  it('guarda una URL relativa y borra el avatar anterior', async () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await subirAvatar();

    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    // El path subido pertenece al usuario de la sesión (posible limpieza luego).
    const [uploadedPath] = upload.mock.calls[0];
    expect(uploadedPath).toMatch(/^avatars\/user-1-\d+\.jpeg$/);

    await waitFor(() => expect(updatePerfil).toHaveBeenCalledTimes(1));
    const [saved] = updatePerfil.mock.calls[0];
    expect(saved.avatar_url).toMatch(
      /^\/api\/storage\/buckets\/avatares\/objects\/avatars%2Fuser-1-\d+\.jpeg$/,
    );

    // Limpieza del avatar anterior (best-effort, después del update).
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    expect(remove).toHaveBeenCalledWith('avatars/user-1-old.jpeg');
  });
});

describe('ProfilePage — datos reales y edición', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.perfil = { ...basePerfil };
    vi.mocked(getUserStats).mockResolvedValue(statsFixture as any);
  });

  it('muestra racha, rango, meta y XP reales de user_stats/perfil', async () => {
    mockAuth.perfil = {
      ...basePerfil,
      objetivo: 'perder_peso',
      nivel: 'intermedio',
    };

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await esperarFormulario();

    // Racha real (4 días) y rango derivado del nivel real de user_stats.
    expect(screen.getByText('4 días')).toBeInTheDocument();
    expect(screen.getByText(/Aspirante · Nivel 1/)).toBeInTheDocument();
    // Meta real desde perfiles.objetivo (label del dominio, no del mock).
    // getByText sólo matchea nodos de texto directos: el label "Meta:" vive
    // en el span y el valor en un <strong> anidado.
    expect(screen.getByText(/^Meta:$/).textContent).toContain('Bajar grasa');
    // XP real: nivel 1 exige 100 XP → 65/100 y 35 restantes para LVL 2.
    expect(screen.getByText(/65 \/ 100 XP/)).toBeInTheDocument();
    expect(screen.getByText('35 XP')).toBeInTheDocument();
    expect(screen.getByText(/de LVL 2: Escudero!/)).toBeInTheDocument();
  });

  it('envía nombre y frecuencia semanal (pills) al guardar', async () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    const nombre = await esperarFormulario();
    fireEvent.change(nombre, { target: { value: 'Nuevo Nombre E2E' } });

    // Frecuencia semanal: pills 1d–7d (el diseño), no un input numérico.
    fireEvent.click(screen.getByRole('button', { name: '4d' }));

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios biométricos/i }));

    await waitFor(() => expect(updatePerfil).toHaveBeenCalledTimes(1));
    const [payload] = updatePerfil.mock.calls[0];
    expect(payload.nombre_completo).toBe('Nuevo Nombre E2E');
    expect(payload.dias_entrenamiento_semana).toBe(4);
  });

  it('descarta los cambios sin guardar al pulsar "Descartar cambios"', async () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    const nombre = await esperarFormulario();
    fireEvent.change(nombre, { target: { value: 'Cambio Temporal' } });
    expect(nombre).toHaveValue('Cambio Temporal');

    fireEvent.click(screen.getByRole('button', { name: /descartar cambios/i }));

    await waitFor(() => expect(nombre).toHaveValue('E2E Avatar'));
    expect(updatePerfil).not.toHaveBeenCalled();
  });

  it('muestra "Completa tu perfil" cuando faltan datos para las métricas', async () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await esperarFormulario();

    // Sin peso/altura/nacimiento/género no se inventan valores metabólicos.
    expect(
      screen.getByText(/completa peso, estatura, nacimiento y género/i),
    ).toBeInTheDocument();
  });
});
