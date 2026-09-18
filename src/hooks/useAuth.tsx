// src/hooks/useAuth.ts
import { useEffect, useState, useContext, createContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { identifyUser, clearUser } from '../lib/monitoring';
import { logger } from '../lib/logger';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, nom_complet: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  error: string | null;
  /** Erreur survenue lors du dernier chargement du profil (distincte des
   * erreurs de login/signup) — permet à l'UI de savoir que `profile` est
   * `null` à cause d'un échec réseau, pas parce que l'utilisateur n'a
   * simplement pas de profil. */
  profileError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Récupérer la session au chargement
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        logger.error('Auth init error:', err);
        setError(err instanceof Error ? err.message : 'Erreur d\'authentification');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listener pour les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  // Récupérer le profil utilisateur
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
      setProfileError(null);
    } catch (err) {
      logger.error('Profile fetch error:', err);
      // Important : ne pas écraser un profil déjà chargé avec `null` sur un
      // échec passager (ex: coupure réseau pendant un refreshProfile) — on
      // garde l'ancien profil affiché et on signale juste l'erreur.
      setProfileError(err instanceof Error ? err.message : 'Impossible de charger le profil');
    }
  };

  // Rafraîchir le profil (après une modification par ex.)
  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  // INSCRIPTION
  const signUp = async (email: string, password: string, nom_complet: string) => {
    setError(null);
    try {
      // 1. Créer l'utilisateur via Auth en passant nom_complet dans les metadata
      //    → le trigger handle_new_user créera le profil automatiquement
      const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nom_complet },
        },
      });

      if (signUpError) throw signUpError;
      if (!newUser) throw new Error('Erreur lors de la création de l\'utilisateur');

      // Le trigger handle_new_user (security definer) crée le profil
      // automatiquement côté base de données — aucun insert nécessaire ici.

      sessionStorage.setItem('onboarding_needed', '1');
      setUser(newUser);
      setError(null);
    } catch (err) {
      let message = err instanceof Error ? err.message : 'Erreur lors de l\'inscription';
      // Message plus clair pour les erreurs courantes
      if (message.includes('User already registered')) {
        message = 'Cet email est déjà utilisé. Veuillez vous connecter.';
      } else if (message.includes('Password should be')) {
        message = 'Le mot de passe doit contenir au moins 6 caractères.';
      } else if (message.includes('Unable to validate email')) {
        message = 'Adresse email invalide.';
      }
      setError(message);
      throw err;
    }
  };

  // CONNEXION
  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (user) identifyUser(user.id, user.email ?? undefined);
      setUser(user);
    } catch (err) {
      let message = err instanceof Error ? err.message : 'Erreur lors de la connexion';
      if (message.includes('Invalid login credentials')) {
        message = 'Email ou mot de passe incorrect.';
      } else if (message.includes('Email not confirmed')) {
        message = 'Email non confirmé. Contactez l\'administrateur.';
      }
      setError(message);
      throw err;
    }
  };

  // DÉCONNEXION
  const signOut = async () => {
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      clearUser();
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la déconnexion';
      setError(message);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, signUp, signIn, signOut, refreshProfile, error, profileError }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook pour utiliser le contexte d'authentification
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }
  return context;
};
