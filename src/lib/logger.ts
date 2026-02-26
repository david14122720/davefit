/**
 * Logger centralizado para DaveFit.
 * Solo muestra logs en modo desarrollo. Los errores se loguean siempre.
 */
const isDev = import.meta.env.DEV;

export const logger = {
    log: (...args: unknown[]) => isDev && console.log('[DaveFit]', ...args),
    warn: (...args: unknown[]) => isDev && console.warn('[DaveFit]', ...args),
    error: (...args: unknown[]) => console.error('[DaveFit]', ...args),
    info: (...args: unknown[]) => isDev && console.info('[DaveFit]', ...args),
};
