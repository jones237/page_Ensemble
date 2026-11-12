// src/pages/auth/ForgotPasswordPage.tsx
import { getSiteUrl } from '../../lib/siteUrl';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { errorMessage } from '../../lib/errors';
import { Loader2, AlertCircle, Mail, ChevronLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${getSiteUrl()}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-5 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mot de passe oublié</h1>
        <p className="text-gray-600 mb-6 text-sm">
          Entrez votre email, nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>

        {sent ? (
          <div role="status" aria-live="polite" className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
            <Mail className="h-5 w-5 mb-2" />
            Si un compte existe avec l'adresse <strong>{email}</strong>, un email vient d'être envoyé.
            Vérifiez aussi vos spams. Le lien est valable 1 heure ; l'email peut mettre quelques minutes à arriver.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                autoComplete="email"
                autoFocus
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Envoyer le lien'}
            </Button>
          </form>
        )}

        <Link
          to="/signin"
          className="mt-6 flex items-center gap-1 min-h-[44px] text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
