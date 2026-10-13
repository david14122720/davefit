import { describe, it, expect } from 'vitest';
import { resolveClientIp } from './suggestions';

// `resolveClientIp` protege el rate-limit de /api/suggestions: `sender_ip` se
// guarda en la DB y decide el cupo de 1/min. Antes se aceptaba el PRIMER valor
// de X-Forwarded-For sin validar → un cliente podía mandar texto arbitrario
// (basura en la columna) o falsificar la IP para saltarse el límite.

describe('resolveClientIp', () => {
  it('ignora X-Forwarded-For inválido y cae a "unknown"', () => {
    expect(resolveClientIp('no-es-una-ip', undefined)).toBe('unknown');
    expect(resolveClientIp('<script>alert(1)</script>', undefined)).toBe('unknown');
    expect(resolveClientIp('', undefined)).toBe('unknown');
    expect(resolveClientIp(null, undefined)).toBe('unknown');
  });

  it('rechaza entradas desmesuradas (no persiste texto arbitrario)', () => {
    expect(resolveClientIp(`2001:db8::1${'0'.repeat(300)}`, undefined)).toBe('unknown');
  });

  it('prefiere la dirección real del socket cuando es pública', () => {
    // Conexión directa: el peer no se puede falsificar → manda sobre la cabecera.
    expect(resolveClientIp('10.9.9.9', '203.0.113.9')).toBe('203.0.113.9');
  });

  it('detrás de un proxy local usa la última IP válida de la cabecera', () => {
    expect(resolveClientIp('203.0.113.7, 198.51.100.4', '127.0.0.1')).toBe('198.51.100.4');
    expect(resolveClientIp('203.0.113.7', '::1')).toBe('203.0.113.7');
    expect(resolveClientIp('203.0.113.7, 192.168.1.50', '127.0.0.1')).toBe('192.168.1.50');
  });

  it('saltea entradas inválidas y devuelve la última IP válida', () => {
    expect(resolveClientIp('203.0.113.7, no-es-ip', '::1')).toBe('203.0.113.7');
    expect(resolveClientIp('no-es-ip, 198.51.100.4', '127.0.0.1')).toBe('198.51.100.4');
  });

  it('acepta IPv6 válido', () => {
    expect(resolveClientIp('2001:db8::1', '127.0.0.1')).toBe('2001:db8::1');
  });

  it('no cae en la trampa de una IP privada delante de una pública', () => {
    // La cabecera la controla el cliente: el último hop es el único confiable
    // cuando el peer es el proxy local.
    expect(resolveClientIp('192.168.1.77, 203.0.113.7', '127.0.0.1')).toBe('203.0.113.7');
  });
});
