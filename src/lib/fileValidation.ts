const MAGIC_BYTES: Record<string, Uint8Array[]> = {
  'image/jpeg': [
    new Uint8Array([0xFF, 0xD8, 0xFF]),
  ],
  'image/png': [
    new Uint8Array([0x89, 0x50, 0x4E, 0x47]),
  ],
  'image/webp': [
    new Uint8Array([0x52, 0x49, 0x46, 0x46]),
  ],
  'image/gif': [
    new Uint8Array([0x47, 0x49, 0x46, 0x38]),
  ],
  'video/mp4': [
    new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]),
    new Uint8Array([0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70]),
  ],
  'video/webm': [
    new Uint8Array([0x1A, 0x45, 0xDF, 0xA3]),
  ],
  'video/ogg': [
    new Uint8Array([0x4F, 0x67, 0x67, 0x53]),
  ],
};

const MIME_WHITELIST: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
};

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogg',
};

function readMagicBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      resolve(new Uint8Array(arrayBuffer.slice(0, 12)));
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}

function bytesMatch(data: Uint8Array, signature: Uint8Array): boolean {
  if (data.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (data[i] !== signature[i]) return false;
  }
  return true;
}

function getAcceptCategory(accept?: string): string {
  if (!accept || accept === '*/*') return '*';
  const category = accept.split('/')[0];
  if (category === 'image' || category === 'video') return category;
  return '*';
}

export async function validateFile(
  file: File,
  accept?: string,
  maxSizeMB: number = 10
): Promise<{ valid: boolean; error?: string; safeName?: string; safeType?: string }> {
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `El archivo excede el límite de ${maxSizeMB}MB` };
  }

  if (file.size === 0) {
    return { valid: false, error: 'El archivo está vacío' };
  }

  const category = getAcceptCategory(accept);
  if (category === '*') {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const safeName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    return { valid: true, safeName, safeType: file.type || 'application/octet-stream' };
  }

  const allowedMimes = MIME_WHITELIST[category];
  if (!allowedMimes) {
    return { valid: false, error: `Tipo de archivo no soportado: ${category}` };
  }

  if (!allowedMimes.includes(file.type)) {
    return { valid: false, error: `Tipo de archivo no permitido: ${file.type}. Usa: ${allowedMimes.join(', ')}` };
  }

  try {
    const magicBytes = await readMagicBytes(file);
    const matchedType = allowedMimes.find((mime) => {
      const signatures = MAGIC_BYTES[mime];
      if (!signatures) return false;
      return signatures.some((sig) => bytesMatch(magicBytes, sig));
    });

    if (!matchedType) {
      return { valid: false, error: `El contenido del archivo no coincide con su tipo declarado (${file.type})` };
    }

    const ext = EXTENSION_MAP[matchedType] || 'bin';
    const safeName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    return { valid: true, safeName, safeType: matchedType };
  } catch {
    return { valid: false, error: 'Error al validar el contenido del archivo' };
  }
}
