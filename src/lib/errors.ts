// src/lib/errors.ts
// Transforme n'importe quelle erreur (Error, erreur PostgREST, texte…) en message lisible.
// Les erreurs Supabase sont souvent des objets simples { message, code } et non des `Error` :
// `err instanceof Error ? err.message : '…'` les remplaçait donc par le message générique.

const KNOWN: [RegExp, string][] = [
  [/invalid login credentials/i, 'Email ou mot de passe incorrect.'],
  [/email not confirmed/i, "Email non confirmé. Contactez l'administrateur."],
  [/user already registered|already been registered/i, 'Impossible de créer ce compte. Si vous en avez déjà un, connectez-vous ou réinitialisez votre mot de passe.'],
  [/rate limit|too many requests|over_email_send_rate_limit/i, "Trop de demandes. Patientez quelques minutes avant de réessayer."],
  [/only request this after (\d+) seconds/i, 'Patientez une minute avant de redemander un email.'],
  [/new password should be different/i, "Le nouveau mot de passe doit être différent de l'ancien."],
  [/password should be at least|weak.password/i, 'Mot de passe trop faible (8 caractères, une majuscule, un chiffre).'],
  [/auth session missing|session.*missing|otp.*expired|link.*expired|invalid.*token/i, 'Lien expiré ou invalide. Redemandez un email de réinitialisation.'],
  [/failed to fetch|networkerror|load failed/i, 'Connexion impossible. Vérifiez votre accès internet puis réessayez.'],
  [/row-level security|permission denied|violates row-level/i, 'Action non autorisée.'],
  [/duplicate key|already exists|unique constraint/i, 'Cette action a déjà été effectuée.'],
  [/jwt expired|invalid jwt|not authenticated|non authentifié/i, 'Votre session a expiré. Reconnectez-vous.'],
];

export function errorMessage(err: unknown, fallback = 'Une erreur est survenue'): string {
  let raw = '';
  if (typeof err === 'string') raw = err;
  else if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string') raw = m;
  }
  raw = raw.trim();
  if (!raw) return fallback;

  for (const [re, msg] of KNOWN) if (re.test(raw)) return msg;

  // Les triggers SQL renvoient « CODE: message » (ex. LIMIT_REACHED: Vous avez déjà 2 livre(s)…)
  raw = raw.replace(/^[A-Z][A-Z_]{2,}:\s*/, '');
  return raw;
}
