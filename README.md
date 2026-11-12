# 📚 PageEnsemble - Plateforme de Location de Livres Communautaire

Une **application web moderne** pour gérer et louer des livres de particulier à particulier au sein d'une communauté (groupe d'étude, église, etc.).

---

## ✨ Fonctionnalités Principales

### 📖 Catalogue de Livres
- Liste des livres disponibles avec **photo, titre, auteur, résumé**
- Filtrage par **catégorie, condition, disponibilité**
- Recherche par titre ou auteur
- Affichage du **propriétaire** et de l'**historique**

### 🔐 Réservation & Location
- Système de **réservation facile** (date limite auto +14 jours)
- Gestion des **cautions** (2000 FCFA par défaut)
- Prix de location **configurable** (ex: 500 FCFA par semaine)
- Statuts : Disponible → Réservé → Actif → Retourné

### 👥 Gestion des Utilisateurs
- **Inscription** et **connexion** sécurisées
- Rôles : Administrateur, Propriétaire, Membre
- Profils avec **avatar, bio, contact**
- Gestion des **groupes privés** (Église, Club de lecture, etc.)

### 📊 Dashboard Propriétaire
- Vue d'ensemble du **stock** (100 livres max)
- Gestion des **réservations actives**
- Validation des **retours** et **cautions**
- Historique des emprunts

### 🔔 Notifications
- Rappels automatiques de retour
- Confirmation de réservation
- Disponibilité d'un livre
- Messages entre propriétaire et emprunteur

---

## 🏗️ Stack Technique

| Couche | Technologie |
|--------|------------|
| **Frontend** | React 18 + Vite + TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State Management** | React Query + Zustand |
| **Routing** | React Router v6 |
| **Backend** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (Email/Password) |
| **Storage** | Supabase Storage (images) |
| **Real-time** | Supabase Realtime |
| **Notifications** | n8n + Twilio/Brevo |
| **Deployment** | Vercel / Netlify |

---

## 📁 Structure du Projet

```
pageensemble/
├── src/
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── SignUpPage.tsx
│   │   │   └── SignInPage.tsx
│   │   ├── dashboard/
│   │   │   ├── CatalogPage.tsx        (À faire)
│   │   │   ├── MyReservationsPage.tsx (À faire)
│   │   │   └── ProfilePage.tsx        (À faire)
│   │   └── admin/
│   │       ├── StockManagementPage.tsx     (À faire)
│   │       └── ReservationsPage.tsx        (À faire)
│   ├── components/
│   │   ├── ProtectedRoute.tsx
│   │   ├── BookCard.tsx              (À faire)
│   │   ├── ReservationForm.tsx        (À faire)
│   │   └── Navbar.tsx                 (À faire)
│   ├── hooks/
│   │   ├── useAuth.ts                 ✅ Fait
│   │   ├── useBooks.ts                (À faire)
│   │   └── useReservations.ts         (À faire)
│   ├── lib/
│   │   └── supabaseClient.ts          ✅ Fait
│   ├── types/
│   │   └── index.ts                   ✅ Fait
│   └── App.tsx                        (À faire)
├── .env.local                          (À remplir)
├── .env.example                        ✅ Fait
├── package.json                        ✅ Fait
├── tailwind.config.js                  (À faire)
├── tsconfig.json                       (À faire)
├── vite.config.ts                      (À faire)
├── pageensemble_schema.sql             ✅ Fait
├── SETUP_GUIDE.md                      ✅ Fait (Guide d'installation)
└── README.md                           📍 (Ce fichier)
```

---

## 🚀 Installation Rapide

### Prérequis
- Node.js 16+ 
- npm ou pnpm
- Compte Supabase (gratuit)

### 1. Clone ou télécharge le projet
```bash
git clone https://github.com/ton-user/pageensemble.git
cd pageensemble
```

### 2. Crée le projet Supabase
Vois le guide détaillé : **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**

### 3. Installe les dépendances
```bash
npm install
```

### 4. Configure les variables d'environnement
```bash
cp .env.example .env.local
# Remplis VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
```

### 5. Démarre l'app
```bash
npm run dev
```

Ouvre `http://localhost:5173` dans ton navigateur ! 🎉

---

## 📚 Architecture Détaillée

### Base de Données (Supabase)

```
┌─────────────────────────────────────────┐
│         UTILISATEURS & PROFILS          │
├─────────────────────────────────────────┤
│ profiles (id, nom, phone, role, groupe) │
│ groups (id, nom, admin_id)              │
└─────────────────────────────────────────┘
           ↓                    ↓
┌──────────────────────────────────────────┐
│             CATALOGUE LIVRES              │
├──────────────────────────────────────────┤
│ books (id, titre, auteur, statut,...)    │
│ reviews (id, book_id, rating, contenu)   │
└──────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────┐
│          RÉSERVATIONS/LOCATIONS          │
├──────────────────────────────────────────┤
│ reservations (id, book_id, emprunteur)   │
│ reservation_history (audit trail)        │
└──────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────┐
│       COMMUNICATIONS                      │
├──────────────────────────────────────────┤
│ notifications (user_id, message, type)   │
│ messages (sender_id, recipient_id)       │
└──────────────────────────────────────────┘
```

### Row Level Security (RLS)
- ✅ Chacun ne voit que **ses données**
- ✅ Propriétaire peut modifier **ses livres**
- ✅ Membres peuvent créer **des réservations**
- ✅ Automatisation via **triggers SQL**

---

## 🔑 Fonctionnalités Clés Implémentées

### ✅ Phase 1 - MVP Complet
- [x] Authentification (Signup/Signin)
- [x] Protection des routes
- [x] Schema Supabase complet
- [x] Types TypeScript
- [x] Hooks d'authentification
- [ ] Catalogue de livres (En cours)
- [ ] Système de réservation
- [ ] Dashboard propriétaire

### 🚧 Phase 2 - Fonctionnalités Avancées
- [ ] Notifications SMS/Email (n8n)
- [ ] Messages entre utilisateurs
- [ ] Avis et notation
- [ ] Historique des emprunts
- [ ] Rappels automatiques

### 📱 Phase 3 - Extensions
- [ ] App mobile (React Native)
- [ ] Paiement en ligne (MTN Cameroon)
- [ ] Analytics & Dashboard
- [ ] Recommandations AI

---

## 🔐 Sécurité

- **Row Level Security** : Chaque utilisateur ne voit que ses données
- **JWT Authentication** : Tokens sécurisés via Supabase Auth
- **Password Hashing** : Supabase gère le hash automatique
- **HTTPS Only** : Chiffrement en transit
- **CORS Configuré** : Restriction des origines
- **SQL Injection Prevention** : Requêtes paramétrées automatiquement

---

## 🌐 Déploiement

### Vercel (Recommandé)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm install -g netlify-cli
netlify deploy
```

### Variables d'Environnement en Production
Ajoute sur Vercel/Netlify :
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## 📞 Support & Contributions

- **Issues** : Signale les bugs via GitHub Issues
- **Discussions** : Questions et idées sur Discussions
- **Pull Requests** : Les contributions sont bienvenues !

---

## 📄 License

MIT - Libre d'utilisation pour projets personnels et commerciaux

---

## 🎯 Roadmap

**Q3 2024**
- ✅ Setup Supabase
- ✅ Auth system
- ⏳ Catalogue & Réservations

**Q4 2024**
- [ ] Notifications
- [ ] Paiement
- [ ] Mobile app

**2025**
- [ ] AI Recommendations
- [ ] Analytics
- [ ] Multi-groupes

---

## 🤝 Besoin d'Aide ?

Lis le **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** pour l'installation complète.

Contacte-moi sur les issues GitHub ou via email.

---

**Créé avec ❤️ pour les communautés**
