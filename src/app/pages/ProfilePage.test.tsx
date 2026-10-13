import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import ProfilePage from './ProfilePage';

// Reglas que cubre este test (bug "subo el avatar y no se ve"):
// 1. La URL que se guarda en perfiles.avatar_url debe ser RELATIVA
//    same-origin (/api/storage/...): la absoluta del backend (hoy
//    insforge.dtesh.dev) la bloquea la CSP (img-src 'self') y ata la DB a
//    un origen externo.
// 2. El avatar anterior del bucket se borra tras el reemplazo (best-effort):
//    antes quedaba público para siempre.

const updatePerfil = vi.fn().mockResolvedValue({});
const upload = vi.fn();
const remove = vi.fn().mockResolvedValue({ data: null, error: null });

const mockAuth = {
  user: { id: 'user-1', email: 'e2e@davefit.local' },
  perfil: {
    nombre_completo: 'E2E Avatar',
    avatar_url:
      'https://insforge.dtesh.dev/api/storage/buckets/avatares/objects/avatars%2Fuser-1-old.jpeg',
  },
  accessToken: 'tok-test',
  loading: false,
  isAdmin: false,
  updatePerfil,
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuth,
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
