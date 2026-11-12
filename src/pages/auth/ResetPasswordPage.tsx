// src/pages/auth/ResetPasswordPage.tsx
// Deux usages :
//  - lien reçu par email (« mot de passe oublié ») : session "recovery" créée par Supabase ;
//  - utilisateur déjà connecté (Profil > Changer mon mot de passe) : formulaire direct.
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { resetPasswordSchema, formatZodErrors } from '../../lib/validations';
import { errorMessage } from '../../lib/errors';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

// Supabase renvoie les liens invalides/expirés sous la forme #error=access_denied&error_code=otp_expired
function linkError(): string | null {
  const raw = (window.location.hash + '&' + window.location.search).replace(/#/g, '&');
  const params = new URLSearchParams(raw);
  if (params.get('error') || params.get('error_code')) {
    return params.get('error_code') === 'otp_expired'
      ? 'Ce lien a expiré. Redemandez un email de réinitialisation.'
      : (params.get('error_description')?.replace(/\+/g, ' ') ?? 'Lien invalide.');
  }
  return null;
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [urlError] = useState<string | null>(() => linkError());
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (urlError) return;
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { setRecovery(true); setReady(true); }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    // Aucun lien valide ni session au bout de 6 s : on arrête d'attendre.
    const t = setTimeout(() => setTimedOut(true), 6000);
    return () => { listener.subscription.unsubscribe(); clearTimeout(t); };
  }, [urlError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = resetPasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) { setErrors(formatZodErrors(parsed.error)); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      if (recovery) {
        // Après un « mot de passe oublié » : on se déconnecte et on repart de la connexion.
        await supabase.auth.signOut();
        setTimeout(() => navigate('/signin'), 2500);
      } else {
        setTimeout(() => navigate('/profile'), 2000);
      }
    } catch (err) {
      setErrors({ global: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const invalid = urlError || (!ready && timedOut);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-5 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Nouveau mot de passe</h1>

        {done ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 flex items-start gap-2">
            <CheckCircle className="h-5 w-5 shrink-0" />
            Mot de passe mis à jour ! Redirection...
          </div>
        ) : invalid ? (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {urlError ?? 'Lien invalide ou expiré. Redemandez un email de réinitialisation.'}
              </AlertDescription>
            </Alert>
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Redemander un lien
            </Link>
          </div>
        ) : !ready ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Vérification du lien de réinitialisation...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.global && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.global}</AlertDescription>
              </Alert>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password" required disabled={loading} />
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
              <p className="text-xs text-gray-500 mt-1">8 caractères minimum, une majuscule, un chiffre.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer</label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password" required disabled={loading} />
              {errors.confirm && <p className="text-xs text-red-600 mt-1">{errors.confirm}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mettre à jour le mot de passe'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
