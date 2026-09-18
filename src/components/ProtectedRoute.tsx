// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isNetworkError } from '../hooks/useOnlineStatus';
import { Loader2, WifiOff, RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'administrateur' | 'proprietaire' | 'membre';
}

export const ProtectedRoute = ({
  children,
  requiredRole,
}: ProtectedRouteProps) => {
  const { user, profile, loading, profileError, refreshProfile } = useAuth();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const location = useLocation();

  // Rediriger vers onboarding si premier login (hors page onboarding)
  const needsOnboarding =
    sessionStorage.getItem('onboarding_needed') === '1' &&
    !localStorage.getItem('onboarding_done') &&
    location.pathname !== '/onboarding';

  if (user && needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Utilisateur connecté mais profil pas chargé à cause d'une erreur réseau
  // ou serveur — sans ce garde-fou, chaque page recevrait un `profile` null
  // et afficherait silencieusement des états vides trompeurs partout
  // (« pas de groupe », « aucune réservation »...).
  if (!profile && profileError) {
    const network = isNetworkError(profileError);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          {network
            ? <WifiOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            : <Loader2 className="h-12 w-12 text-red-400 mx-auto mb-4" />}
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {network ? 'Pas de connexion internet' : 'Impossible de charger votre profil'}
          </h1>
          <p className="text-gray-600 mb-6 max-w-sm">
            {network
              ? 'Vérifie ta connexion internet et réessaie.'
              : "Le serveur n'a pas pu répondre. Réessaie dans un instant."}
          </p>
          <button
            onClick={() => refreshProfile()}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" /> Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Role check — un administrateur a toujours accès, quel que soit le rôle requis.
  const hasAccess = !requiredRole || profile?.role === requiredRole || profile?.role === 'administrateur';
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
            Accès refusé
          </h1>
          <p className="text-gray-600 mb-6">
            Vous n'avez pas les permissions pour accéder à cette page.
          </p>
          <a
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
