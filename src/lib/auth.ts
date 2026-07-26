// ============================================================
// Seguridad centralizada para autenticación
// Sanitización, rate-limit, fortaleza de contraseña,
// normalización de errores.
// ============================================================

// ------------------------------------------------------------------
// Sanitización de entrada
// ------------------------------------------------------------------

const XSS_PATTERN = /<[^>]*>/g;
const SCRIPT_PATTERN = /javascript:/gi;
const DANGEROUS_PROTOCOLS = /^data:|^vbscript:|^javascript:/i;

/**
 * Sanitiza un string para prevenir XSS en campos de texto libre.
 * Elimina etiquetas HTML, protocolos peligrosos y normaliza espacios.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(XSS_PATTERN, '')
    .replace(SCRIPT_PATTERN, '')
    .replace(DANGEROUS_PROTOCOLS, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Normaliza un email: minúsculas, sin espacios, sin caracteres extraños.
 * Previene duplicados por capitalización (Ejemplo@Mail.com === ejemplo@mail.com).
 */
export function normalizeEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
    .replace(/[^\w@.+\-]/g, ''); // solo caracteres válidos en email
}

/**
 * Sanitiza un nombre completo: elimina HTML, limita longitud,
 * solo caracteres imprimibles.
 */
export function sanitizeName(name: string): string {
  return sanitizeText(name)
    .slice(0, 100)
    .replace(/[^\p{L}\p{M}'\s\-.]/gu, ''); // letras unícode, guiones, puntos
}

// ------------------------------------------------------------------
// Fortaleza de contraseña
// ------------------------------------------------------------------

export interface PasswordStrength {
  score: number;      // 0-4: 0=muy débil, 4=muy fuerte
  label: string;      // "Muy débil" | "Débil" | "Aceptable" | "Fuerte" | "Muy fuerte"
  color: string;      // tailwind color class
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    minScore: boolean;
  };
}

const SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;
const UPPER_RE = /[A-Z]/;
const LOWER_RE = /[a-z]/;
const NUMBER_RE = /[0-9]/;

/**
 * Evalúa la fortaleza de una contraseña.
 * Puntúa 0-4 basado en longitud y variedad de caracteres.
 */
export function evaluatePassword(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    hasUpper: UPPER_RE.test(password),
    hasLower: LOWER_RE.test(password),
    hasNumber: NUMBER_RE.test(password),
    hasSpecial: SPECIAL_CHARS.test(password),
    minScore: false, // se calcula abajo
  };

  // Puntaje base: variedad de tipos
  let score = 0;
  if (checks.hasLower) score += 1;
  if (checks.hasUpper) score += 1;
  if (checks.hasNumber) score += 1;
  if (checks.hasSpecial) score += 1;

  // Bonus por longitud extendida
  if (password.length >= 12) score += 1;
  else if (password.length >= 10) score += 0.5;

  // Penalización si es muy corta
  if (password.length < 8) score = Math.min(score, 1);

  // Normalizar a entero 0-4
  const finalScore = Math.min(4, Math.round(score));
  checks.minScore = finalScore >= 3;

  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'];
  const colors = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-lime-500', 'text-green-500'];

  return {
    score: finalScore,
    label: labels[finalScore],
    color: colors[finalScore],
    checks,
  };
}

/**
 * Schema de validación de contraseña con requisitos completos.
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  message: {
    minLength: 'Mínimo 8 caracteres',
    maxLength: 'Máximo 128 caracteres',
    upper: 'Debe contener al menos una mayúscula',
    lower: 'Debe contener al menos una minúscula',
    number: 'Debe contener al menos un número',
    special: 'Debe contener al menos un caracter especial (!@#$%^&*)',
    strong: 'Elige una contraseña más segura',
  },
} as const;

// ------------------------------------------------------------------
// Rate-limiting client-side (defensa contra fuerza bruta en cliente)
// ------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  windowStart: number;
  blockedUntil: number | null;
}

const STORAGE_KEY = 'auth_rate_limit';
const WINDOW_MS = 10 * 60 * 1000;     // 10 minutos
const MAX_ATTEMPTS = 5;                // máx intentos
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutos bloqueado

function getRateLimitStore(): Record<string, RateLimitEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveRateLimitStore(store: Record<string, RateLimitEntry>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage lleno o deshabilitado — el rate-limit falla silenciosamente
  }
}

/**
 * Verifica si una dirección de email ha excedido el límite de intentos.
 *
 * @returns `null` si puede continuar, o un mensaje de error si está bloqueado.
 */
export function checkRateLimit(email: string): string | null {
  const key = normalizeEmail(email);
  const store = getRateLimitStore();
  const now = Date.now();
  const entry = store[key];

  if (!entry) return null;

  // ¿Sigue bloqueado?
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const remainingMin = Math.ceil((entry.blockedUntil - now) / 60000);
    return `Demasiados intentos. Intenta de nuevo en ${remainingMin} minuto${remainingMin !== 1 ? 's' : ''}.`;
  }

  // Resetear si la ventana expiró
  if (now - entry.windowStart > WINDOW_MS) {
    delete store[key];
    saveRateLimitStore(store);
    return null;
  }

  return null;
}

/**
 * Registra un intento fallido de inicio de sesión.
 * Si excede MAX_ATTEMPTS, bloquea la cuenta por BLOCK_DURATION_MS.
 */
export function recordFailedAttempt(email: string): void {
  const key = normalizeEmail(email);
  const store = getRateLimitStore();
  const now = Date.now();
  const existing = store[key];

  if (existing && now - existing.windowStart > WINDOW_MS) {
    // Ventana expirada, reiniciar
    store[key] = { count: 1, windowStart: now, blockedUntil: null };
  } else if (existing) {
    existing.count += 1;
    if (existing.count >= MAX_ATTEMPTS) {
      existing.blockedUntil = now + BLOCK_DURATION_MS;
      existing.count = 0;
    }
  } else {
    store[key] = { count: 1, windowStart: now, blockedUntil: null };
  }

  saveRateLimitStore(store);
}

/**
 * Limpia el rate-limit tras un login exitoso.
 */
export function clearRateLimit(email: string): void {
  const key = normalizeEmail(email);
  const store = getRateLimitStore();
  delete store[key];
  saveRateLimitStore(store);
}

// ------------------------------------------------------------------
// Normalización de errores de autenticación (NO revelar detalles)
// ------------------------------------------------------------------

/**
 * Normaliza errores de auth para no filtrar información sensible.
 * NUNCA revela si el usuario existe o no — siempre mensaje genérico.
 */
export function sanitizeAuthError(error: any): string {
  if (!error) return 'Error desconocido';

  const message = (typeof error === 'string' ? error : error?.message || error?.error_description || '').toLowerCase();

  // Mapear a mensajes genéricos — nunca diferenciar "usuario no existe" vs "password incorrecta"
  if (message.includes('invalid login') ||
      message.includes('invalid credentials') ||
      message.includes('wrong password') ||
      message.includes('user not found') ||
      message.includes('invalid email') ||
      message.includes('bad request')) {
    return 'Correo o contraseña incorrectos';
  }

  if (message.includes('email not confirmed') ||
      message.includes('email_not_confirmed')) {
    return 'Debes confirmar tu correo antes de iniciar sesión';
  }

  if (message.includes('too many requests') ||
      message.includes('rate limit') ||
      message.includes('blocked')) {
    return 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.';
  }

  if (message.includes('user already exists') ||
      message.includes('already registered')) {
    return 'Este correo ya está registrado. ¿Quieres iniciar sesión?';
  }

  // Capturar errores de red
  if (message.includes('network') ||
      message.includes('fetch') ||
      message.includes('failed to') ||
      message.includes('timeout') ||
      message.includes('econnrefused')) {
    return 'Error de conexión. Verifica tu internet e intenta de nuevo.';
  }

  // Fallback genérico — nunca pasar el mensaje original
  console.warn('[Auth] Error no categorizado:', message);
  return 'Error al procesar la solicitud. Intenta de nuevo.';
}

// ------------------------------------------------------------------
// CSRF Token
// ------------------------------------------------------------------

const CSRF_KEY = 'auth_csrf_token';
const CSRF_LENGTH = 32;

/**
 * Genera un token CSRF para el formulario de login.
 * Lo guarda en sessionStorage y lo devuelve.
 */
export function getCsrfToken(): string {
  try {
    let token = sessionStorage.getItem(CSRF_KEY);
    if (!token || token.length < CSRF_LENGTH) {
      const array = new Uint8Array(CSRF_LENGTH);
      crypto.getRandomValues(array);
      token = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
      sessionStorage.setItem(CSRF_KEY, token);
    }
    return token;
  } catch {
    return '';
  }
}

/**
 * Verifica que el token CSRF coincida y lo invalida (one-time use).
 */
export function verifyCsrfToken(token: string): boolean {
  try {
    const stored = sessionStorage.getItem(CSRF_KEY);
    if (!stored || stored.length < CSRF_LENGTH) return false;
    const valid = stored === token;
    sessionStorage.removeItem(CSRF_KEY); // one-time
    return valid;
  } catch {
    return false;
  }
}
