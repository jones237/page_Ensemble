# 🚀 PageEnsemble - Guide de Setup Complet

## Étape 1️⃣ : Créer le Projet Supabase

### 1.1 Créer le projet
1. Va sur [https://app.supabase.com](https://app.supabase.com)
2. Clique sur **"New Project"**
3. Remplis les champs :
   - **Name** : `PageEnsemble`
   - **Database Password** : Génère un mot de passe fort (copie-le, tu en auras besoin)
   - **Region** : `eu-west-1` (Europe) ou `ap-southeast-1` (Afrique)
4. Clique **"Create new project"**
5. **Attends 5-10 minutes** que le projet s'initialise

### 1.2 Récupérer les credentials
Une fois que le projet est créé :
1. Va dans **Settings → API** (à gauche)
2. Copie :
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`

---

## Étape 2️⃣ : Créer les Tables dans Supabase

### 2.1 Exécuter le script SQL
1. Dans ton projet Supabase, va dans **SQL Editor** (à gauche)
2. Clique sur **"New Query"**
3. Copie tout le contenu du fichier `pageensemble_schema.sql` fourni
4. Colle-le dans l'éditeur
5. Clique sur **"Run"** ▶️
6. **Attends** que toutes les tables se créent (tu verras une notification ✅)

### 2.2 Vérifier les tables
- Va dans **Table Editor** (à gauche)
- Tu devrais voir ces tables :
  - `profiles`
  - `groups`
  - `books`
  - `reservations`
  - `reservation_history`
  - `notifications`
  - `messages`
  - `reviews`

---

## Étape 3️⃣ : Configurer l'Authentification Supabase

### 3.1 Activer Email/Password Auth
1. Va dans **Authentication → Providers** (à gauche)
2. Clique sur **"Email"**
3. Assure-toi que **"Enable Sign up"** est activé ✅
4. Clique **"Save"**

### 3.2 Configurer les redirections (optionnel mais recommandé)
1. Va dans **Authentication → URL Configuration**
2. Ajoute tes URLs :
   - **Site URL** : `http://localhost:5173` (dev) + ta URL de prod (ex: `https://pageensemble.com`)
   - **Redirect URLs** : 
     ```
     http://localhost:5173/
     http://localhost:5173/auth/callback
     https://pageensemble.com/
     https://pageensemble.com/auth/callback
     ```

### 3.3 Vérifier l'Email (Optionnel)
Si tu veux que les utilisateurs confirment leur email :
1. Va dans **Authentication → Email Templates**
2. Configure les templates (optionnel)

---

## Étape 4️⃣ : Créer le Projet React

### 4.1 Initialiser le projet
```bash
npm create vite@latest pageensemble -- --template react
cd pageensemble
npm install
```

### 4.2 Installer les dépendances
```bash
npm install @supabase/supabase-js react-router-dom @tanstack/react-query zustand lucide-react
npm install -D tailwindcss postcss autoprefixer
npm install class-variance-authority clsx tailwind-merge # Pour shadcn/ui
```

### 4.3 Configurer Tailwind CSS
```bash
npx tailwindcss init -p
```

Édite `tailwind.config.js` :
```javascript
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

Édite `src/index.css` :
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4.4 Créer la structure des dossiers
```bash
mkdir -p src/{pages,components,hooks,lib,types,context}
mkdir -p src/pages/{auth,dashboard,books,admin}
```

### 4.5 Copier les fichiers fournis
Copie les fichiers suivants dans tes dossiers correspondants :
- `supabaseClient.ts` → `src/lib/supabaseClient.ts`
- `useAuth.ts` → `src/hooks/useAuth.ts`
- `types.ts` → `src/types/index.ts`
- `SignUpPage.tsx` → `src/pages/auth/SignUpPage.tsx`
- `SignInPage.tsx` → `src/pages/auth/SignInPage.tsx`
- `ProtectedRoute.tsx` → `src/components/ProtectedRoute.tsx`
- `.env.example` → `.env.local` (après avoir rempli les credentials)

---

## Étape 5️⃣ : Configurer les Variables d'Environnement

### 5.1 Créer `.env.local`
```bash
cp .env.example .env.local
```

### 5.2 Remplir les variables
Ouvre `.env.local` et remplis :
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_STORAGE_BUCKET=books_images
```

---

## Étape 6️⃣ : Créer l'App Principal et le Routing

### 6.1 Créer `src/main.tsx`
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

### 6.2 Créer `src/App.tsx`
```tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import SignUpPage from './pages/auth/SignUpPage'
import SignInPage from './pages/auth/SignInPage'

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Auth Routes */}
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/signin" element={<SignInPage />} />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <h1>🏠 Accueil - En construction</h1>
            </ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}
```

---

## Étape 7️⃣ : Lancer l'Application

### 7.1 Démarrer le serveur de développement
```bash
npm run dev
```

### 7.2 Tester
1. Va sur `http://localhost:5173`
2. Tu devrais être redirigé vers `/signin`
3. Clique sur "S'inscrire" et crée un compte
4. Après la connexion, tu arriveras sur la page d'accueil

---

## ✅ Checklist de Vérification

- [ ] Projet Supabase créé et initialisé
- [ ] Tables SQL créées avec succès
- [ ] Credentials Supabase copiés dans `.env.local`
- [ ] Projet React créé
- [ ] Dépendances installées
- [ ] Tailwind CSS configuré
- [ ] Fichiers copiés dans les bons dossiers
- [ ] Variables d'environnement remplies
- [ ] App lancée sans erreurs
- [ ] Inscription fonctionnelle
- [ ] Connexion fonctionnelle

---

## 🐛 Troubleshooting

### Erreur : "Missing environment variables"
**Solution** : Assure-toi que `.env.local` existe et contient les bonnes clés

### Erreur : "Invalid API key"
**Solution** : Copie à nouveau la clé depuis Supabase Settings → API

### Erreur : "table doesn't exist"
**Solution** : Re-exécute le script SQL dans SQL Editor

### Erreur : "CORS error"
**Solution** : Va dans Supabase Settings → CORS et ajoute ta URL locale

### Auth ne fonctionne pas
**Solution** :
1. Vérifie que Email Auth est activé (Settings → Providers)
2. Vérifier l'URL de redirection (Settings → URL Configuration)
3. Regarde la console du navigateur pour les erreurs détaillées

---

## 🚀 Prochaines Étapes

Une fois que l'authentification fonctionne :
1. **Créer les pages** : Catalogue de livres, Dashboard, Admin
2. **Implémenter les APIs** : React Query pour les requêtes
3. **Ajouter les composants** : BookCard, ReservationForm, etc.
4. **Notifications** : Configurer n8n pour les alertes
5. **Déploiement** : Vercel ou Netlify

---

## 📚 Ressources Utiles

- [Docs Supabase](https://supabase.com/docs)
- [Docs React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

Bonne chance ! 🎯
