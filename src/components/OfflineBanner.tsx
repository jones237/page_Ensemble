// src/components/OfflineBanner.tsx
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * Bannière fixe affichée tant que le navigateur se signale hors-ligne.
 * Contrairement à un toast (qui disparaît après quelques secondes), elle
 * reste visible tant que le problème persiste — l'utilisateur sait tout
 * de suite pourquoi les actions échouent, sans avoir à deviner.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      className="fixed top-0 left-0 right-0 z-[200] bg-gray-900 text-white text-sm font-medium py-2 px-4 flex items-center justify-center gap-2 shadow-md"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Vous êtes hors ligne — certaines actions ne fonctionneront pas tant que la connexion n'est pas rétablie.</span>
    </div>
  );
}
