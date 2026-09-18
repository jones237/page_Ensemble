// src/components/QueryState.tsx
import { ReactNode } from 'react';
import { Loader2, WifiOff, ServerCrash, RefreshCw } from 'lucide-react';
import { isNetworkError } from '../hooks/useOnlineStatus';

interface QueryStateProps {
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  /** Rendu quand isLoading=false, error=null mais qu'il n'y a aucune donnée. */
  empty?: ReactNode;
  /** true quand la donnée est chargée mais vide (ex: tableau de longueur 0). */
  isEmpty?: boolean;
  children: ReactNode;
  /** Hauteur du conteneur de loading/erreur — ajuster selon le contexte (page pleine vs section). */
  minHeight?: string;
}

/**
 * Enveloppe standard pour tout affichage basé sur une requête react-query :
 * gère loading / erreur réseau / erreur serveur / vide / contenu de façon
 * cohérente sur toute l'app, avec un vrai bouton "Réessayer" branché sur
 * `refetch`. Objectif : qu'une coupure réseau ne soit plus jamais confondue
 * avec "il n'y a rien à afficher".
 */
export function QueryState({
  isLoading,
  error,
  onRetry,
  empty,
  isEmpty = false,
  children,
  minHeight = 'py-20',
}: QueryStateProps) {
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 ${minHeight}`}>
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-500">Chargement…</p>
      </div>
    );
  }

  if (error) {
    const network = isNetworkError(error);
    return (
      <div className={`flex flex-col items-center justify-center text-center gap-3 ${minHeight} px-4`}>
        {network ? (
          <WifiOff className="h-10 w-10 text-gray-400" />
        ) : (
          <ServerCrash className="h-10 w-10 text-red-400" />
        )}
        <div>
          <p className="font-medium text-gray-900">
            {network ? 'Pas de connexion internet' : 'Une erreur est survenue'}
          </p>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            {network
              ? "Vérifie ta connexion et réessaie."
              : "Le serveur n'a pas pu répondre. Réessaie dans un instant."}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
        )}
      </div>
    );
  }

  if (isEmpty && empty) {
    return <>{empty}</>;
  }

  return <>{children}</>;
}
