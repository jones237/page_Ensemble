// src/lib/rateLimiter.ts
// ─── Rate limiting côté client (protection brute force) ─────────────────────
// Note : le vrai rate limiting doit aussi être configuré côté Supabase
// (Authentication → Rate Limits dans le dashboard)

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

const WINDOW_MS   = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;              // 5 tentatives max
const LOCK_MS     = 15 * 60 * 1000; // blocage 15 min

const store = new Map<string, AttemptRecord>();

/** Nettoyer les entrées expirées */
function cleanup() {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now - record.firstAttempt > WINDOW_MS * 2) {
      store.delete(key);
    }
  }
}

/**
 * Vérifie si une action est autorisée pour une clé donnée.
 * @returns { allowed: boolean, waitSeconds?: number }
 */
export function checkRateLimit(key: string): {
  allowed: boolean;
  waitSeconds?: number;
  attemptsLeft?: number;
} {
  cleanup();
  const now = Date.now();
  const record = store.get(key);

  // Compte bloqué ?
  if (record?.lockedUntil && now < record.lockedUntil) {
    const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  // Première tentative ou fenêtre expirée
  if (!record || now - record.firstAttempt > WINDOW_MS) {
    store.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, attemptsLeft: MAX_ATTEMPTS - 1 };
  }

  // Incrémenter
  record.count += 1;

  if (record.count > MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCK_MS;
    store.set(key, record);
    return { allowed: false, waitSeconds: Math.ceil(LOCK_MS / 1000) };
  }

  store.set(key, record);
  return { allowed: true, attemptsLeft: MAX_ATTEMPTS - record.count };
}

/** Réinitialiser le compteur après succès */
export function resetRateLimit(key: string) {
  store.delete(key);
}

/** Construire la clé de rate limiting pour le login */
export function loginRateKey(email: string): string {
  return `login:${email.toLowerCase().trim()}`;
}
