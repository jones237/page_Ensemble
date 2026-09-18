// src/lib/monitoring.ts
// ── Sentry monitoring — erreurs, performance, sessions ───────────────────────
import * as Sentry from '@sentry/react';

const DSN      = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV      = import.meta.env.MODE;            // 'development' | 'production'
const RELEASE  = import.meta.env.VITE_APP_VERSION as string | undefined;

/**
 * Initialiser Sentry.
 * À appeler une seule fois dans main.tsx, avant <App />.
 * En dev, Sentry est désactivé sauf si VITE_SENTRY_DSN est défini.
 */
export function initMonitoring() {
  if (!DSN) {
    console.info('[Monitoring] VITE_SENTRY_DSN non défini — Sentry désactivé');
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    release: RELEASE ?? 'unknown',

    // Capture 100% des erreurs, 10% des transactions (perf) en prod
    tracesSampleRate:       ENV === 'production' ? 0.1 : 1.0,
    // Sessions: 100% en prod pour mesurer crash-free rate
    replaysSessionSampleRate: 0.05,   // 5% des sessions enregistrées
    replaysOnErrorSampleRate: 1.0,    // 100% des sessions avec erreur

    // Intégrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText:   true,   // masquer les textes (RGPD)
        blockAllMedia: false,
      }),
    ],

    // Ignorer les erreurs non actionnables
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed',
      'Non-Error promise rejection captured',
      'Network request failed',
      'Load failed',
      'Failed to fetch',
    ],

    // Filtrer les évènements avant envoi
    beforeSend(event) {
      // Ne pas envoyer les erreurs locales
      if (ENV === 'development') return null;
      return event;
    },
  });
}

/**
 * Identifier l'utilisateur connecté dans Sentry.
 * À appeler après login.
 */
export function identifyUser(userId: string, email?: string) {
  Sentry.setUser({ id: userId, email });
}

/**
 * Effacer l'identité après logout.
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Logger une erreur manuellement (ex: erreur métier non fatale).
 */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>
) {
  if (context) Sentry.setContext('extra', context);
  if (error instanceof Error) {
    Sentry.captureException(error);
  } else {
    Sentry.captureMessage(String(error), 'error');
  }
}

/**
 * Logger un évènement métier (ex: réservation créée, livre ajouté).
 */
export function captureEvent(name: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    category: 'app',
    message:  name,
    data,
    level:    'info',
  });
}

/**
 * Mesurer la performance d'une opération async.
 * Usage: const finish = startSpan('catalog.load'); await loadBooks(); finish();
 */
export function startSpan(name: string): () => void {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    Sentry.addBreadcrumb({
      category: 'performance',
      message:  `${name} took ${duration.toFixed(0)}ms`,
      level:    duration > 3000 ? 'warning' : 'info',
    });
  };
}

// Re-export Sentry ErrorBoundary pour usage direct
export { Sentry };
