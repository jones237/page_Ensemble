// src/lib/siteUrl.ts
// Adresse publique du site, utilisée dans les liens envoyés par email (mot de passe oublié).
// Sans VITE_SITE_URL, on retombe sur l'adresse de la page courante. En local, définissez
// VITE_SITE_URL=https://votre-site.vercel.app dans .env.local : le lien du mail ouvrira
// alors le vrai site (et fonctionnera aussi sur téléphone), pas http://localhost:5173.
export function getSiteUrl(): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim().replace(/\/+$/, '');
  if (configured && /^https?:\/\//i.test(configured)) return configured;
  return window.location.origin;
}
