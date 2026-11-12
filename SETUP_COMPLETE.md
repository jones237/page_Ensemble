# 🚀 PageEnsemble - Guide Complet d'Installation et Utilisation

## 📋 Table des Matières
1. [Setup Supabase](#setup-supabase)
2. [Setup React](#setup-react)
3. [Structure du Projet](#structure-du-projet)
4. [Lancer l'Application](#lancer-lapplication)
5. [Tester les Fonctionnalités](#tester-les-fonctionnalités)
6. [Déploiement](#déploiement)

---

## Setup Supabase

### Étape 1 : Créer le Projet

1. Va sur [app.supabase.com](https://app.supabase.com)
2. Clique **"New Project"**
3. Remplis :
   - **Name** : `PageEnsemble`
   - **Database Password** : Génère un mot de passe fort
   - **Region** : `eu-west-1` (Europe)
4. Clique **"Create new project"**
5. ⏳ **Attends 10 minutes** que le projet s'initialise

### Étape 2 : Récupérer les Credentials

Une fois créé :
1. Va dans **Settings → API**
2. Copie et conserve :
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`

### Étape 3 : Créer les Tables

1. Dans Supabase, va dans **SQL Editor**
2. Clique **"New Query"**
3. Copie tout le contenu de `pageensemble_schema.sql`
4. Colle dans l'éditeur et clique **"Run"** ▶️
5. ✅ Toutes les tables doivent être créées

### Étape 4 : Activer l'Authentification Email

1. Va dans **Authentication → Providers**
2. Clique sur **"Email"**
3. Assure-toi que **"Enable Sign up"** est coché ✅
4. Clique **"Save"**

### Étape 5 : Configurer les URLs de Redirection

1. Va dans **Authentication → URL Configuration**
2. Ajoute :
   - **Site URL** : `http://localhost:5173`
   - **Redirect URLs** :
     ```
     http://localhost:5173/
     http://localhost:5173/auth/callback
     ```
3. Clique **"Save"**

---

## Setup React

### Étape 1 : Créer le Projet Vite

```bash
npm create vite@latest pageensemble -- --template react
cd pageensemble
npm install
```

### Étape 2 : Installer les Dépendances

```bash
# Supabase & State Management
npm install @supabase/supabase-js @tanstack/react-query zustand

# UI & Routing
npm install react-router-dom lucide-react

# Styling
npm install -D tailwindcss postcss autoprefixer
npm install class-variance-authority clsx tailwind-merge
```

### Étape 3 : Initialiser Tailwind

```bash
npx tailwindcss init -p
```

**Édite `tailwind.config.js` :**
```js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Édite `src/index.css` :**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Étape 4 : Créer la Structure des Dossiers

```bash
mkdir -p src/{pages,components/ui,hooks,lib,types,context}
mkdir -p src/pages/{auth,dashboard}
```

### Étape 5 : Copier les Fichiers

Copie les fichiers fournis dans leurs dossiers correspondants :

```
src/
├── lib/
│   └── supabaseClient.ts ✅
├── hooks/
│   ├── useAuth.ts ✅
│   ├── useBooks.ts ✅
│   └── useReservations.ts ✅
├── types/
│   └── index.ts ✅
├── components/
│   ├── ui/
│   │   ├── button.tsx ✅
│   │   ├── input.tsx ✅
│   │   └── alert.tsx ✅
│   ├── Navbar.tsx ✅
│   ├── BookCard.tsx ✅
│   └── ProtectedRoute.tsx ✅
├── pages/
│   ├── auth/
│   │   ├── SignUpPage.tsx ✅
│   │   └── SignInPage.tsx ✅
│   └── dashboard/
│       ├── CatalogPage.tsx ✅
│       ├── MyReservationsPage.tsx ✅
│       └── ProprietaireDashboardPage.tsx ✅
├── App.tsx ✅
└── main.tsx
```

### Étape 6 : Configurer les Variables d'Environnement

Crée `.env.local` :
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_STORAGE_BUCKET=books_images
VITE_APP_URL=http://localhost:5173
VITE_APP_NAME=PageEnsemble
```

### Étape 7 : Créer main.tsx

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

## Structure du Projet

```
pageensemble/
├── src/
│   ├── App.tsx (routing principal)
│   ├── main.tsx
│   ├── index.css
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── SignUpPage.tsx (inscription)
│   │   │   └── SignInPage.tsx (connexion)
│   │   └── dashboard/
│   │       ├── CatalogPage.tsx (liste des livres)
│   │       ├── MyReservationsPage.tsx (mes emprunts)
│   │       └── ProprietaireDashboardPage.tsx (gestion stock)
│   ├── components/
│   │   ├── Navbar.tsx (barre de navigation)
│   │   ├── BookCard.tsx (carte de livre)
│   │   ├── ProtectedRoute.tsx (protection des routes)
│   │   └── ui/ (composants shadcn/ui)
│   ├── hooks/
│   │   ├── useAuth.ts (authentification)
│   │   ├── useBooks.ts (gestion des livres)
│   │   └── useReservations.ts (gestion des réservations)
│   ├── lib/
│   │   └── supabaseClient.ts (client Supabase)
│   └── types/
│       └── index.ts (types TypeScript)
├── .env.local (variables d'environnement)
├── .env.example
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Lancer l'Application

### Démarrer le serveur de développement

```bash
npm run dev
```

Ouvre `http://localhost:5173` dans ton navigateur.

### Build pour la production

```bash
npm run build
```

### Aperçu de la production

```bash
npm run preview
```

---

## Tester les Fonctionnalités

### 1. Inscription

- Va sur `http://localhost:5173/signup`
- Remplis le formulaire :
  - **Nom Complet** : "Jean Dupont"
  - **Email** : "jean@example.com"
  - **Mot de passe** : "password123" (min 6 caractères)
- Clique **"S'inscrire"**
- Tu devrais être redirigé vers l'accueil

### 2. Exploration du Catalogue

- Clique sur **"📚 Catalogue"**
- Tu verras une liste vide (pas de livres encore)
- Test les filtres et la recherche

### 3. Ajouter des Livres (Propriétaire)

**Option A : Via la base de données**

1. Va dans Supabase **Table Editor**
2. Clique sur **"books"**
3. Ajoute manuellement des livres

**Option B : Via un script SQL**

```sql
INSERT INTO books (titre, auteur, resume, groupe_id, proprietaire_id, categorie, condition, statut, prix_location)
SELECT
  'Les Misérables',
  'Victor Hugo',
  'Un classique incontournable de la littérature française',
  g.id,
  p.id,
  'Fiction',
  'Excellent',
  'Disponible',
  500
FROM groups g, profiles p
WHERE p.role = 'proprietaire'
LIMIT 1;
```

### 4. Réserver un Livre

- Va sur le catalogue
- Clique sur **"Réserver"** sur un livre disponible
- Redirigé vers "Mes Réservations"
- Le livre doit montrer le statut "Réservé"

### 5. Dashboard Propriétaire

- Clique sur **"📊 Stock"**
- Tu verras tes livres et tes réservations à gérer

### 6. Déconnexion

- Clique sur ton avatar en haut à droite
- Clique **"Déconnexion"**
- Redirigé vers la page de connexion

---

## Déploiement

### Option 1 : Vercel (Recommandé)

```bash
npm install -g vercel
vercel
```

Suis les instructions et configure les variables d'environnement.

### Option 2 : Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Variables d'Environnement sur Vercel/Netlify

Ajoute dans **Settings → Environment Variables** :

```
VITE_SUPABASE_URL = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJ...
```

---

## 📚 Prochaines Étapes

### Phase 1 - Améliorations Immédiates
- [ ] Ajouter des images aux livres via upload
- [ ] Créer la page de détails d'un livre
- [ ] Implémenter la système de messages
- [ ] Ajouter les avis/notes sur les livres

### Phase 2 - Notifications
- [ ] Configurer n8n pour les rappels
- [ ] Intégrer Twilio pour SMS
- [ ] Intégrer Brevo pour Email

### Phase 3 - Fonctionnalités Avancées
- [ ] Paiement en ligne (MTN Cameroon)
- [ ] App mobile (React Native)
- [ ] Système de recommandations
- [ ] Analytics et statistiques

---

## 🆘 Troubleshooting

### ❌ "Missing environment variables"
**Solution** : Assure-toi que `.env.local` existe avec les bonnes clés

### ❌ "Invalid API key"
**Solution** : Copie à nouveau depuis Supabase Settings → API

### ❌ "Table doesn't exist"
**Solution** : Re-exécute le script SQL dans Supabase

### ❌ "CORS error"
**Solution** : Va dans Supabase Settings → CORS et ajoute ta URL

### ❌ "Auth ne fonctionne pas"
**Solution** :
1. Vérifie que Email Auth est activé
2. Vérifie l'URL de redirection
3. Regarde la console du navigateur

---

## 📖 Ressources Utiles

- [Docs Supabase](https://supabase.com/docs)
- [Docs React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Query](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com/)

---

## ✅ Checklist de Vérification Final

- [ ] Projet Supabase créé et initialisé
- [ ] Tables SQL créées avec succès
- [ ] Credentials Supabase dans `.env.local`
- [ ] Projet React créé et dépendances installées
- [ ] Tailwind CSS configuré
- [ ] Tous les fichiers copiés aux bons emplacements
- [ ] Variables d'environnement remplies
- [ ] App lancée sans erreurs (`npm run dev`)
- [ ] Signup fonctionnel
- [ ] Signin fonctionnel
- [ ] Catalogue affichable
- [ ] Réservations fonctionnelles

---

**Bravo ! 🎉 Tu es maintenant prêt à utiliser PageEnsemble !**

Pour toute question, consulte le README.md ou ouvre une issue sur GitHub.
