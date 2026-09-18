import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { signInSchema, formatZodErrors } from '../../lib/validations';
import { checkRateLimit, resetRateLimit, loginRateKey } from '../../lib/rateLimiter';
import { Loader2, AlertCircle } from 'lucide-react';

export default function SignInPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [lockMsg, setLockMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLockMsg('');

    // Validation Zod
    const parsed = signInSchema.safeParse(form);
    if (!parsed.success) { setErrors(formatZodErrors(parsed.error)); return; }

    // Rate limiting
    const rk = loginRateKey(form.email);
    const rl = checkRateLimit(rk);
    if (!rl.allowed) {
      setLockMsg(`Trop de tentatives. Réessayez dans ${Math.ceil((rl.waitSeconds ?? 900) / 60)} min.`);
      return;
    }

    setLoading(true);
    try {
      await signIn(form.email, form.password);
      resetRateLimit(rk);
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      setErrors({ global: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">📚 PageEnsemble</h1>
          <p className="text-gray-500 text-sm mt-1">Connexion à votre compte</p>
        </div>

        {(errors.global || lockMsg) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {lockMsg || errors.global}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="vous@exemple.com" autoComplete="email" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="••••••••" autoComplete="current-password" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <div className="text-right">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">Mot de passe oublié ?</Link>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Connexion...</> : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Pas de compte ? <Link to="/signup" className="text-blue-600 hover:underline font-medium">S'inscrire</Link>
        </p>
      </div>
    </div>
  );
}
