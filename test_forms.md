Para probar si los formularios funcionan:

1. Abre la consola del navegador (F12)
2. Ve a /login o /register
3. Intenta hacer clic en el botón "Iniciar Sesión" o "Crear Cuenta"
4. Mira si aparece algún error en la consola

Errores comunes a buscar:
- "Cannot read property..."
- "supabase is not defined"
- "fetch failed"
- Cualquier error en rojo

También puedes probar:
1. Escribir email y contraseña
2. Hacer clic en el botón
3. Ver si el estado cambia a "loading" o "Entrando..."

Si el botón no responde en absoluto, puede ser:
- Un problema con los event listeners
- CSS que está bloqueando los clicks
- JavaScript que no se cargó
