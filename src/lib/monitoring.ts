// src/lib/monitoring.ts
// ── Monitoring léger, SANS dépendance externe ────────────────────────────────
// L'ancienne version importait '@sentry/react', absent de package.json :
// `tsc && vite build` échouait donc sur Vercel/CI (TS2307).
//
// Cette version garde la même API (captureError, captureEvent, identifyUser…)
// pour ne rien casser. Pour activer Sentry plus tard :
//   1. npm i @sentry/react        (met à jour package.json ET package-lock.json)
//   2. brancher Sentry.init(...) dans initMonitoring() et les appels dans les
//      fonctions ci-dessous (voir la doc Sentry), puis définir VITE_SENTRY_DSN.
import { logger } from './logger';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initMonitoring() {
  if (!DSN) return;
  logger.warn('[Monitoring] DSN défini mais @sentry/react non installé — monitoring désactivé');
}

export function identifyUser(_userId: string, _email?: string) { /* no-op */ }
export function clearUser() { /* no-op */ }

export function captureError(error: unknown, context?: Record<string, unknown>) {
  logger.error('[captureError]', error, context ?? '');
}

export function captureEvent(name: string, data?: Record<string, unknown>) {
  logger.log('[event]', name, data ?? '');
}

export function startSpan(name: string): () => void {
  const start = performance.now();
  return () => logger.log(`[span] ${name} ${(performance.now() - start).toFixed(0)}ms`);
}
