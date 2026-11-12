# Sécurité PageEnsemble — réglages à vérifier dans Supabase (non lisibles depuis le code)

| Réglage | Où | Valeur recommandée | Pourquoi |
|---|---|---|---|
| Confirmation d'email | Authentication → Providers → Email | **Activée** | Sans elle, n'importe qui crée un compte avec l'email d'un autre. |
| Longueur minimale du mot de passe | Providers → Email | **10** + minuscule/majuscule/chiffre | Défaut = 6. Les règles du formulaire (8) sont contournables via l'API. |
| Mots de passe compromis | Providers → Email (plan Pro) | **Activée** | Refuse les mots de passe des fuites connues. |
| Limites de débit | Rate Limits | Vérifier connexions, inscriptions, rafraîchissements, emails | La limite du navigateur (`rateLimiter.ts`) est contournable. |
| SMTP personnalisé | Settings → Auth → SMTP | **Configuré** | Le SMTP intégré est limité à quelques emails/heure. |
| CAPTCHA | Attack Protection | Turnstile ou hCaptcha | Bloque les inscriptions automatisées. |
| MFA (TOTP) | Multi-Factor | Activé, **obligatoire pour l'administrateur** | Un compte admin volé = accès à tous les soldes. |
| Changement de mot de passe sécurisé | Providers → Email | Exiger une reconnexion récente | Une session volée ne peut plus changer le mot de passe. |
| Expiration des sessions | Sessions (plan Pro) | Inactivité 7 j, durée max 30 j | Aujourd'hui une session ne s'éteint jamais. |
| Connexions anonymes | Providers | Désactivées | Non utilisées. |

## URL Configuration (vérifiée le 2026-11-12 sur capture d'écran)
- **Site URL** = `https://page-ensemble-o36n-gules.vercel.app` : correct.
- **Redirect URLs** : `https://page-ensemble-o36n-gules.vercel.app/**` correct. **`http://localhost:5173/**` à retirer du projet de production** :
  tant qu'elle y est, un « mot de passe oublié » demandé depuis votre PC en développement envoie un lien vers `localhost`, qui ne s'ouvre pas sur un téléphone
  (symptôme observé : `ERR_CONNECTION_REFUSED`). Retirée, Supabase renvoie vers la Site URL.
  Pour développer en local avec les e-mails, utilisez un second projet Supabase, ou définissez `VITE_SITE_URL` (voir `.env.example`).
- Connecté, **Profil → Paramètres → Changer mon mot de passe** ne passe par aucun e-mail.
- Dépannage sans code : Authentication → Users → ⋯ sur l'utilisateur → **Send password recovery** (le lien utilise la Site URL).

## Catalogue public (`public_catalog`, appelable sans compte)
Le coût par appel est borné (recherche >= 3 caractères, total plafonné à 1000, page <= 48, index de trigrammes) : 1 à 21 ms mesurés avec 100 000 livres.
**Limite connue** : SQL ne peut pas limiter le nombre d'appels par adresse IP. Une personne peut toujours parcourir le catalogue (données publiques par décision du propriétaire).
Si le catalogue grandit, ajoutez une limitation en amont (Cloudflare / Edge Function avec limite par IP).
Le nom du groupe (`groupe_nom`) est visible des visiteurs : à retirer si les groupes doivent rester privés.

## Webhook n8n (avant de l'activer)
1. Créez une credential « Header Auth » (`X-Webhook-Secret`, valeur longue aléatoire) et associez-la au nœud Webhook.
2. **N'appelez jamais ce webhook depuis le navigateur** : tout `VITE_*` est public. Déclenchez-le depuis la base (webhook Supabase) ou une Edge Function.
3. Renseignez le vrai numéro Twilio (placeholder dans le workflow) et surveillez la consommation.

## Surveillance
`monitoring.ts` ne fait rien (Sentry non installé) et `logger` est muet en production : une attaque ne laisserait aucune trace côté application.
Activez Sentry et consultez Supabase → Logs (Auth, API) pour repérer les échecs de connexion en rafale.
