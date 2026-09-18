# 🚀 PageEnsemble - Guide de Déploiement Complet

## Table des Matières
1. [Pré-déploiement](#pré-déploiement)
2. [Déploiement sur Vercel](#déploiement-sur-vercel)
3. [Déploiement sur Netlify](#déploiement-sur-netlify)
4. [Configuration Supabase Production](#configuration-supabase-production)
5. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pré-Déploiement

### Checklist de Vérification

- [ ] Tous les tests locaux passent
- [ ] Variables d'environnement configurées
- [ ] Code git committé et pushé
- [ ] README.md à jour
- [ ] Pas d'erreurs dans la console
- [ ] Performance testée (`npm run build`)
- [ ] Images optimisées
- [ ] CORS configuré sur Supabase

### Build Local

```bash
npm run build
npm run preview
```

Ouvre `http://localhost:4173` et teste toutes les fonctionnalités.

---

## Déploiement sur Vercel (Recommandé)

### Étape 1 : Préparer le Git

```bash
# Assure-toi que tout est commité
git add .
git commit -m "Final version before deploy"
git push origin main
```

### Étape 2 : Créer un compte Vercel

1. Va sur [vercel.com](https://vercel.com)
2. Clique **"Sign Up"**
3. Choisis **"Continue with GitHub"**
4. Autorise Vercel à accéder à tes repositories

### Étape 3 : Importer le Projet

1. Va sur [vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique **"Add New..."** → **"Project"**
3. Sélectionne ton repository `pageensemble`
4. Clique **"Import"**

### Étape 4 : Configurer les Paramètres

Vercel devrait détecter automatiquement que c'est un projet Vite React.

**Si nécessaire, configure manuellement :**

- **Framework Preset** : Vite
- **Build Command** : `npm run build`
- **Output Directory** : `dist`
- **Install Command** : `npm install`

### Étape 5 : Ajouter les Variables d'Environnement

1. Va dans **Settings → Environment Variables**
2. Ajoute les variables :

```
VITE_SUPABASE_URL = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJ...
VITE_SUPABASE_STORAGE_BUCKET = books_images
VITE_APP_URL = https://pageensemble.vercel.app
```

3. Clique **"Save"**

### Étape 6 : Déployer

1. Clique **"Deploy"**
2. ⏳ Attends 2-3 minutes
3. Tu verras un message "Congratulations! Your site is live"
4. Clique sur le lien pour visiter le site

### Étape 7 : Configurer le Custom Domain (Optionnel)

1. Va dans **Settings → Domains**
2. Ajoute ton domaine (ex: `pageensemble.com`)
3. Suis les instructions pour configurer le DNS

---

## Déploiement sur Netlify

### Étape 1 : Préparer le Git

```bash
git push origin main
```

### Étape 2 : Créer un compte Netlify

1. Va sur [netlify.com](https://netlify.com)
2. Clique **"Sign up"**
3. Choisis **"GitHub"**

### Étape 3 : Connecter le Repository

1. Clique **"New site from Git"**
2. Sélectionne **"GitHub"**
3. Autorise Netlify
4. Trouve et sélectionne `pageensemble`

### Étape 4 : Configurer le Build

```
Build Command: npm run build
Publish Directory: dist
```

### Étape 5 : Ajouter les Variables d'Environnement

1. Va dans **Site Settings → Build & Deploy → Environment**
2. Clique **"Edit variables"**
3. Ajoute :

```
VITE_SUPABASE_URL = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJ...
VITE_SUPABASE_STORAGE_BUCKET = books_images
VITE_APP_URL = https://pageensemble.netlify.app
```

### Étape 6 : Déployer

```bash
npm install -g netlify-cli
netlify deploy --prod
```

Ou via l'interface :
1. Clique **"Deploy site"**
2. ⏳ Attends le déploiement
3. Reçois une URL en direct

---

## Configuration Supabase Production

### Sécuriser les Row Level Security (RLS)

Assure-toi que **TOUTES** les tables ont RLS activé :

1. Va dans **Table Editor**
2. Pour chaque table, clique sur **⚙️ → RLS**
3. Assure-toi que RLS est **"ON"**

### Configurer les Authentifications Alternatives

Pour plus de flexibilité, tu peux ajouter :

1. **OAuth (Google, GitHub)** - Va dans **Authentication → Providers**
2. **Magic Link Email** - Pour connexion sans mot de passe
3. **Phone SMS** - Via Twilio

### Configurer les URLs Autorisées

1. Va dans **Authentication → URL Configuration**
2. Ajoute tes domaines en production :

```
Site URL: https://pageensemble.com
Redirect URLs:
  https://pageensemble.com
  https://pageensemble.com/auth/callback
  https://www.pageensemble.com
```

### Backup Automatique

Supabase propose des backups automatiques :

1. Va dans **Database → Backups**
2. Configure la fréquence de sauvegarde
3. Télécharge les backups régulièrement

---

## Monitoring & Maintenance

### Monitoring des Erreurs

#### Sentry (Optionnel - Erreur Tracking)

```bash
npm install @sentry/react
```

Crée `.env` :
```
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

Ajoute dans `main.tsx` :
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: "production",
});
```

### Monitoring des Performances

#### Google Analytics

```bash
npm install react-ga4
```

Dans `App.tsx` :
```typescript
import ReactGA from "react-ga4";

ReactGA.initialize("G-XXXXXXXXXX");
ReactGA.send({ hitType: "pageview", page: window.location.pathname });
```

### Vérifier les Logs

#### Vercel
1. Va dans **Deployments** → Clique sur un déploiement → **"Functions"**
2. Consulte les logs en temps réel

#### Netlify
1. Va dans **Deploys** → Clique sur un déploiement
2. Vois les logs de build

#### Supabase
1. Va dans **Logs Explorer**
2. Filtre par type d'erreur
3. Analyse les requêtes lentes

---

## Checklist de Production

### Avant le Lancement

- [ ] Tous les tests passent
- [ ] Performance > 80 (Lighthouse)
- [ ] Pas de console errors/warnings
- [ ] SSL/HTTPS activé
- [ ] CDN configuré
- [ ] Backups Supabase en place
- [ ] Rate limiting configuré (Supabase)
- [ ] CORS corrects

### Après le Lancement

- [ ] Monitorer les erreurs (Sentry)
- [ ] Vérifier l'utilisation de la base de données
- [ ] Analyser le trafic (Analytics)
- [ ] Vérifier la vitesse de chargement
- [ ] Mettre à jour les dépendances mensuellement
- [ ] Revue de sécurité trimestrielle

---

## Problèmes Courants en Production

### ❌ "Build échoue sur Vercel"

**Solution :**
```bash
# Vérifie que le build fonctionne localement
npm run build

# Clique sur "View Build Logs" dans Vercel
# Cherche l'erreur spécifique
```

### ❌ "Envs non trouvées en production"

**Solution :**
- Va dans **Settings → Environment Variables**
- Supprime et re-ajoute les variables
- Redéploie le site

### ❌ "CORS error en production"

**Solution :**
Va dans Supabase :
1. **Settings → API**
2. Scroll jusqu'à **CORS Configuration**
3. Ajoute ta URL :
   ```
   https://pageensemble.vercel.app
   ```

### ❌ "Images ne chargent pas"

**Solution :**
- Va dans Supabase Storage → Bucket **books_images**
- Vérifie que la policy est **Public**
- Teste l'URL : `https://your-project.supabase.co/storage/v1/object/public/books_images/...`

---

## Stratégie de Mise à Jour

### Déployer une Nouvelle Version

```bash
# 1. Teste localement
npm run dev

# 2. Build
npm run build
npm run preview

# 3. Commit et push
git add .
git commit -m "Feature: description"
git push origin main

# 4. Vercel/Netlify déploie automatiquement
```

### Rollback en Cas de Problème

#### Vercel
1. Va dans **Deployments**
2. Clique sur un ancien déploiement stable
3. Clique **"Promote to Production"**

#### Netlify
1. Va dans **Deploys**
2. Cherche un déploiement stable
3. Clique **"Publish deploy"**

---

## Performance Optimization

### Réduire la Taille du Bundle

```bash
npm run build

# Analyse la taille
npm install -g vite-plugin-visualizer
```

### Lazy Loading des Routes

```typescript
import { lazy, Suspense } from 'react';

const CatalogPage = lazy(() => import('./pages/dashboard/CatalogPage'));

// Dans Routes
<Suspense fallback={<Loader />}>
  <Route path="/catalog" element={<CatalogPage />} />
</Suspense>
```

### Cache des Requêtes API

Déjà configuré avec React Query :
```typescript
staleTime: 1000 * 60 * 5, // 5 minutes
gcTime: 1000 * 60 * 10,   // 10 minutes
```

---

## Support & Aide

- **Vercel Docs** : https://vercel.com/docs
- **Netlify Docs** : https://docs.netlify.com
- **Supabase Docs** : https://supabase.com/docs
- **React Docs** : https://react.dev

---

**🎉 Félicitations ! PageEnsemble est maintenant en production !**

Monitore régulièrement les performances et les erreurs pour assurer une excellente expérience utilisateur.
