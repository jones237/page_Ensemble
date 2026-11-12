// src/hooks/useOnlineStatus.ts
import { useEffect, useState } from 'react';

/**
 * Suit l'état de connexion réseau du navigateur.
 * `navigator.onLine` n'est qu'une indication (il peut rester `true` même
 * quand la requête échoue réellement, ex: wifi connecté mais sans internet),
 * donc ce hook sert de signal rapide pour l'UI, pas de garantie absolue —
 * la vraie vérité vient toujours du résultat des requêtes (isError/error).
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

/**
 * Détecte si une erreur ressemble à un problème réseau (offline, DNS,
 * timeout, CORS bloqué) plutôt qu'à une vraie erreur applicative renvoyée
 * par le serveur (ex: 404, 403, contrainte de validation Supabase/Postgres).
 * Utile pour choisir le bon message et savoir si "Réessayer" a du sens.
 */
export function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /fetch|network|failed to fetch|NetworkError|ERR_INTERNET|timeout/i.test(message);
}
