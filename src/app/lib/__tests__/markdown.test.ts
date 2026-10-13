// ============================================================
// markdown — renderer seguro del Coach (test-first, ODD T1)
// ============================================================
//
// Reglas cubiertas (S1/S2/S3/S4 de odd/tasks/ia-coach-markdown.md):
// 1. Negritas, cursivas, saltos de línea y listas/viñetas → HTML real.
// 2. Enlaces (markdown, URL suelta, esquema javascript:) → NUNCA <a>;
//    el texto queda como texto plano.
// 3. XSS: script/iframe/img/on* purgados siempre antes de tocar el DOM.
// 4. Fragmentos incompletos (streaming): cualquier prefijo de un mensaje
//    renderiza sin romper estructura ni dejar etiquetas abiertas/peligrosas.

import { describe, it, expect } from 'vitest';
import { renderCoachMarkdown } from '../markdown';

describe('renderCoachMarkdown', () => {
  // ---- S1: formato permitido ----
  it('convierte negritas **x** en <strong>', () => {
    const html = renderCoachMarkdown('Hola **Fuerza** total');
    expect(html).toContain('<strong>Fuerza</strong>');
    expect(html).not.toContain('**');
  });

  it('convierte cursivas *x* en <em>', () => {
    const html = renderCoachMarkdown('Ritmo *suave* hoy');
    expect(html).toContain('<em>suave</em>');
  });

  it('convierte saltos de línea en <br>', () => {
    const html = renderCoachMarkdown('Línea 1\nLínea 2');
    expect(html).toMatch(/Línea 1<br\s*\/?>Línea 2/);
  });

  it('convierte viñetas "-" en listas <ul><li> reales', () => {
    const html = renderCoachMarkdown('- Press banca\n- Sentadilla');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Press banca</li>');
    expect(html).toContain('<li>Sentadilla</li>');
  });

  it('convierte listas numeradas en <ol><li>', () => {
    const html = renderCoachMarkdown('1. Uno\n2. Dos');
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>Uno</li>');
  });

  // ---- S2: enlaces neutralizados ----
  it('neutraliza enlaces markdown: sin <a>, texto plano visible', () => {
    const html = renderCoachMarkdown('Mirá [mi rutina](https://evil.example/x)');
    expect(html).not.toContain('<a');
    expect(html).not.toContain('href');
    expect(html).toContain('mi rutina');
  });

  it('neutraliza URLs sueltas (autolink GFM)', () => {
    const html = renderCoachMarkdown('Entrá a https://davefit.example/plan');
    expect(html).not.toContain('<a');
    expect(html).toContain('https://davefit.example/plan');
  });

  it('neutraliza enlaces con esquema peligroso javascript:', () => {
    const html = renderCoachMarkdown('[click](javascript:alert(1))');
    expect(html).not.toContain('<a');
    expect(html.toLowerCase()).not.toContain('javascript:');
  });

  // ---- S4: XSS ----
  it('purga <script> junto con su contenido', () => {
    const html = renderCoachMarkdown('Hola\n\n<script>alert("xss")</script>');
    expect(html.toLowerCase()).not.toContain('<script');
    expect(html).not.toContain('alert');
  });

  it('purga <img onerror> y cualquier <img>', () => {
    const html = renderCoachMarkdown('<img src=x onerror="alert(1)">');
    expect(html.toLowerCase()).not.toContain('<img');
    expect(html.toLowerCase()).not.toContain('onerror');
  });

  it('purga atributos on* en HTML crudo', () => {
    const html = renderCoachMarkdown('<b onclick="alert(1)">hola</b>');
    expect(html.toLowerCase()).not.toContain('onclick');
    expect(html).not.toContain('<b');
    expect(html).toContain('hola');
  });

  it('purga iframes', () => {
    const html = renderCoachMarkdown('<iframe src="https://evil.example"></iframe>');
    expect(html.toLowerCase()).not.toContain('<iframe');
  });

  it('purga atributos data-* inyectados en HTML crudo', () => {
    // DOMPurify permite data-* por defecto; la config debe frenarlo
    // (JD B-001: canal de atributos controlado por el modelo).
    const html = renderCoachMarkdown('<p data-a="1" data-b="x onerror=y">t</p>');
    expect(html.toLowerCase()).not.toContain('data-');
    expect(html).toContain('t');
  });

  // ---- S3: fragmentos (streaming) ----
  it('maneja fragmentos incompletos sin etiquetas abiertas ni rotas', () => {
    const html = renderCoachMarkdown('Plan: **Fuer');
    expect(html).not.toContain('<strong');
    expect(html).toContain('**Fuer'); // literal mientras está incompleto
  });

  it('cualquier prefijo de un mensaje real renderiza seguro (banco de fragmentos)', () => {
    const sample =
      '**Semana de fuerza** 😤\n\n- Lunes: Press banca\n- Miércoles: Sentadilla\n- Viernes: Peso muerto\n\nMirá [mi plan](https://evil.example) y <script>alert(1)</script>';
    for (let i = 0; i <= sample.length; i++) {
      const html = renderCoachMarkdown(sample.slice(0, i));
      expect(html.toLowerCase()).not.toContain('<script');
      expect(html).not.toContain('<a');
      expect(html.toLowerCase()).not.toContain('onerror');
    }
  });

  it('devuelve string vacío para entradas vacías', () => {
    expect(renderCoachMarkdown('')).toBe('');
    expect(renderCoachMarkdown('   ')).toBe('');
  });
});
