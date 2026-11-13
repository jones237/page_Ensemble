# Journal des travaux — PageEnsemble

Un travail n'est coché ✅ que s'il a été **vérifié**. La colonne « Preuve » dit comment.
Dernière mise à jour : 2026-10-24.

## Règles pour toute IA ou personne qui touche au projet

1. **Lire ce fichier en entier avant de commencer**, puis ajouter vos travaux dans la section 9 (jamais en réécrivant les sections des autres).
2. **Ne cocher ✅ que ce que vous avez vérifié**, et écrire *comment* (commande lancée, résultat obtenu). Sinon : 🟡 ou ⚠️.
3. **Base de données : ne jamais rejouer `schema.sql` sur la base en ligne.** Toute modification passe par une nouvelle migration numérotée (`006_…`), idempotente, testée sur une copie, et notée ici.
4. **Avant d'écrire sur Supabase : sauvegarder, puis vérifier 93 livres, 2 profils, trigger `on_auth_user_created`** (voir §6). Rien en production sans accord explicite du propriétaire.
5. **Ne mélangez pas** les bugs bloquants et les idées d'amélioration : mettez-les dans des listes séparées (§7 et §8).
6. Ne jamais écrire de secret (clé de service, jeton n8n) dans le dépôt ni dans ce journal.
7. Si vous trouvez que ce journal est faux ou périmé, corrigez-le et dites-le dans la section 9.

Légende : ✅ réussi et vérifié · 🟡 écrit et testé en local, **pas encore appliqué** sur Supabase · ⚠️ non vérifié · ❌ abandonné

## 1. Code et projet

| Date | Travail | État | Preuve |
|---|---|---|---|
| 10-22 | Comparaison des versions v3 et v2 | ✅ | Lecture des deux archives |
| 10-22 | Fusion en un seul projet, toutes les pages responsives | ✅ | Revue de code ; pas de test sur appareil réel |
| 10-22 | Suppression de `PWAPrompt.tsx` (import `virtual:pwa-register` qui cassait le build) | ✅ | Script d'audit des imports |
| 10-22 | `monitoring.ts` sans Sentry (mêmes exports) | ✅ | Audit des imports + vérification de syntaxe TypeScript |
| 10-22 | `PDFReader` : worker local, ajustement à la largeur, garde sur l'UUID | ⚠️ | Nom du fichier worker `.mjs` non vérifié ; `react-pdf@11` demande React 19 (repli : `react-pdf@9.2.1`) |
| 10-22 | Prêt gratuit par défaut : `formatPrix` (0 → « Gratuit »), `formatCaution` (0 → « Sans caution ») | ✅ | Vérification de syntaxe + différence tsc avec stubs |
| 10-22 | Import en lot de livres (`/books/import`, 50 lignes max) | ⚠️ | Non exécuté dans un navigateur |
| 10-22 | Plusieurs groupes : `GroupSwitcher`, `useMyGroups`, `useSwitchGroup`, badge « Groupe actif » | ⚠️ | Syntaxe vérifiée ; non exécuté sans `npm ci` (registre npm inaccessible depuis ici) |
| 10-24 | Page d'accueil : statistiques via la RPC `public_home_stats` (compteurs seulement), visible aussi hors connexion | 🟡 | Fonction testée sur PG16 (retourne les bons compteurs, appelable par `anon`) ; front : syntaxe OK sur 70 fichiers, 116 erreurs tsc identiques à avant (bruit des stubs) ; dépend de la migration 005 |
| 10-24 | Passage à React 19 (`react`, `react-dom`, `@types/react*` en ^19) ; recherche statique : aucun `JSX.Element`, `useRef()` sans argument, `defaultProps` ni `ReactDOM.render` dans `src/` | ⚠️ | Non compilé (npm inaccessible). `package-lock.json` supprimé volontairement |
| 10-24 | Script `database/maintenance/relink_profile.sql` (déplace livres, groupe, réservations… d'un ancien profil vers un nouveau compte) | 🟡 | Testé sur PG16 : livre, groupe, membre déplacés vers le nouveau profil, ancien profil supprimé. Pas encore lancé en ligne |
| 10-24 | Messages d'erreur lisibles : `lib/errors.ts` (`errorMessage`) gère les erreurs Supabase (objets simples, pas des `Error`), retire le préfixe `LIMIT_REACHED:` / `SELF_RESERVE:`, traduit réseau / droits / doublon / session expirée. Branché sur 6 pages (réservation, ajout/modif de livre, suppression de groupe, profil, onboarding) | 🟡 | Avant : une erreur Supabase affichait le texte générique. Syntaxe OK (71 fichiers), tsc : 116 erreurs de stubs, identiques à avant. Non testé au navigateur |
| 10-24 | Tests SQL rejouables : `database/tests/run_tests.sh` (schema + migrations 002→009, puis test003, test004, smoke, chacun sur base neuve) | ✅ | Lancé sur PG16 : toutes les erreurs affichées sont des refus attendus |
| 10-24 | Migration `006_schedule_deadlines.sql` : `pg_cron` toutes les 30 min (rappels, retards, annulation à 48 h) et rapport hebdo | 🟡 | Rejouée sur PG16 sans pg_cron : se désactive proprement (notice). Pas testée avec pg_cron réel |
| 10-24 | Migration `007_join_code_throttle.sql` : 10 mauvais codes de groupe par heure et par utilisateur, puis « Trop de tentatives » ; le code accepte minuscules et espaces. Front : `useJoinGroupByCode` lève « Code invalide » quand la RPC renvoie zéro ligne | ✅ côté SQL / 🟡 côté front | `database/tests/test007.sql` sur PG16 : 11e essai bloqué, autre utilisateur accepté avec `'  code1234 '`. Front : syntaxe seulement. **Ne pas appliquer 007 sans déployer ce front** |
| 10-24 | Page `/notifications` (filtre Toutes / Non lues, « Tout marquer lu », « Voir plus ancien » par 30) + lien « Voir toutes les notifications » dans la cloche ; icônes et destinations de 22 types de notification dans `lib/notificationMeta.ts` (11 types envoyés par la base n'avaient ni icône ni destination) | 🟡 | Syntaxe OK (73 fichiers). tsc avec stubs : +2 erreurs de même nature que les 116 existantes (`children` non reconnu par les stubs). Non testé au navigateur |
| 10-30 | **Base en ligne** : fonction `public_home_stats` créée (migration `public_home_stats_for_home_page`) et les 86 livres à 200 FCFA passés à 0 | ✅ | Fonction appelée en ligne : 93 livres, 1 groupe, 2 membres. Après la mise à jour : 0 livre payant sur 93. Anciens prix sauvegardés dans `private.books_prix_backup_20261030` (non accessible à l'API) |
| 10-30 | Page d'accueil des anciens modèles (v2/v3) restaurée : même texte et même mise en page, seules les données passent par `public_home_stats` (un visiteur non connecté voit enfin les chiffres) | 🟡 | Syntaxe OK ; non testée au navigateur. Ancienne version v13 gardée dans la sauvegarde de l'IA, pas dans le dépôt |
| 10-30 | **Compte de Jonathan rattaché** (compte `edenjonathan10@gmail.com`, id `bc90d19c-…`) : 93 livres, groupe « Le Makarios 110 », appartenance au groupe, rôle administrateur et solde 501 déplacés depuis l'ancien profil `f78719e6-…`, qui est supprimé | ✅ | Relu en ligne après l'opération : livres 93 → nouveau compte, `groups.admin_id` → nouveau compte, `group_members` à jour. Sauvegardes avant opération : `private.bk_20261030_profiles/books/groups/group_members` (inaccessibles à l'API). Reste : Eunice Elmie (profil sans compte de connexion, 0 livre) |
| 10-30 | Comparaison front ↔ base en ligne : 17 RPC avec leurs paramètres, vues `profiles_public`/`groups_public`, tables lues par le front : tout correspond | ✅ | Lecture du catalogue (`pg_proc`, `pg_views`) comparée au code de `src/` |
| 10-24 | `.npmrc` (`legacy-peer-deps=true`) et `engines.node >= 22.13` | ⚠️ | Non testé : `npm` inaccessible dans l'environnement de l'IA. Rend l'installation tolérante au conflit `react-pdf@11` (React 19) / React 18, et impose un Node compatible avec pdfjs-dist 6 |
| 10-22 | `vercel.json` (CSP pour couvertures et worker), `.env.example` générique, secret n8n retiré du CI | ✅ | Relecture |

## 2. Base de données (migrations du dépôt)

| Fichier | Contenu | État | Preuve |
|---|---|---|---|
| `schema.sql` | Schéma de base, 13 tables | ✅ | Joué sur PostgreSQL 16. Les fonctions `check_reservation_deadlines` et `check_max_active_reservations` ont été remplacées par les versions de la base en ligne, plus complètes |
| `002` | Bibliothèque numérique, `book_access`, paiements durcis | 🟡 | PG16 local ; essai sur la vraie base annulé (voir §4) |
| `003` | `create_reservation`, vues publiques, garde-fou réservations, prêt gratuit | 🟡 | PG16 local, test003 : 6 erreurs, toutes attendues |
| `004` | Multi-groupes (`group_members`), `join_group_by_code` corrigé | 🟡 | PG16 local, test004 : erreurs uniquement attendues |
| `005` | Rattrapage de la base en ligne + durcissement SECURITY DEFINER | 🟡 | PG16 local : applique sans erreur, test de fumée OK (3 refus attendus) |

## 3. Ce qui est déjà sur Supabase (projet `kbdrxgnxejnjefoswgju`, relevé le 10-23, lecture seule)

Vos mises à jour que j'ai constatées :
- 5 migrations appliquées : `01_schema_initial`, `02_rls_policies`, `03_business_functions`, `04_storage_buckets`, `05_check_deadlines_function`.
- Buckets de stockage : `books_images` (public), `books_pdf` (privé), avec leurs politiques.
- Vue `digital_books` et colonnes `type`, `fichier_url`, `prix_lecture`, `source` sur `books`.
- Fonction `check_reservation_deadlines` plus riche que celle du dépôt (rappels J+3, escalade admin J+7, annulation après 48 h).
- Contrôle anti-auto-réservation (`SELF_RESERVE`) dans `check_max_active_reservations`.
- Trigger d'inscription `on_auth_user_created` en place.
- Données : 1 groupe « Le Makarios 110 », 2 profils, 93 livres, aucune réservation ni paiement.

Écarts avec le dépôt, constatés mais **pas encore corrigés** :
- Aucune RPC métier (`create_reservation`, `respond_to_reservation`, `join_group_by_code`…).
- Pas de verrou sur `profiles.role`, `solde`, `groupe_id` : un membre peut s'attribuer le rôle administrateur.
- `profiles` lisible par tous (téléphone, solde) ; `groups` lisible par tous, `code_acces` compris.
- `res_insert_own` permet de créer une réservation directement, avec n'importe quel statut.
- 7 fonctions SECURITY DEFINER appelables par un visiteur anonyme ; 4 vues SECURITY DEFINER ; 8 fonctions sans `search_path`.
- `auth.users` contient **0 compte** : les 2 profils et les 93 livres n'ont aucun login associé.

## 3bis. État réel de la base au 2026-10-30 (relevé en lecture seule) — **remplace le §3 là où ils diffèrent**

Une autre intervention (pas cette IA) a appliqué 9 migrations en ligne les 10-23 et 10-24 : `security_hardening_pageensemble`, `server_side_guards_reservations_payments_groups`, `fix_reservations_guard_null_amounts`, `hardening_round2_policies_indexes_integrity`, `hardening_round2_storage_policies`, `align_01_multigroup_core`, `align_02_business_functions`, `align_03_policies_views_guards`, `redteam_hardening_urls_limits_throttles_codes`.

Constaté : `group_members`, `create_reservation`, `switch_active_group`, toutes les RPC métier, verrou `profiles`, gardes réservations et paiements, limiteurs d'insertion (`throttle_inserts`), code de groupe fort, `search_path` fixé partout, aucun droit `anon` sur les tables. Il reste 2 vues SECURITY DEFINER (`groups_public`, `profiles_public`, voulues) et 17 RPC exécutables par les utilisateurs connectés (voulues). La vue `digital_books` n'existe plus. **`public_home_stats` n'existe pas en ligne.** 86 livres ont encore `prix_location` > 0. `auth.users` : toujours 0 compte.

Conséquence : les migrations `002` à `005` du dépôt sont **redondantes et risquent d'écraser les versions durcies en ligne : ne pas les lancer**. Le front v13 appelle `public_home_stats` (absente) : la page d'accueil échouera tant que cette fonction n'existe pas en ligne.

## 4. Travail SECURITY DEFINER (migration 005)

Corrigé dans le fichier `005`, **pas encore appliqué en ligne** :
- `search_path = public` fixé sur toutes les fonctions du schéma `public`.
- `EXECUTE` retiré à `anon` et `public` partout ; `authenticated` ne garde que les 19 fonctions appelées par l'application. Les fonctions de trigger et de cron ne sont plus appelables par API.
- `reservations_stats` et `digital_books` passent en `security_invoker` (elles respectent la RLS).
- `groups_public` et `profiles_public` restent SECURITY DEFINER **volontairement** : elles exposent un sous-ensemble de colonnes sûr (sans `code_acces`, téléphone ni solde) que la RLS de la table ne permettrait pas. Le linter les signalera encore ; c'est accepté.
- Verrou `trg_profiles_lock_fields` et notification de paiement ajoutés.
- `anon` ne lit plus aucune table, sauf `groups_public`.
- Les 86 livres à 500 FCFA passent à 0 (décision du 10-24).

Essai sur la vraie base (transaction annulée) : **demandé deux fois, annulé deux fois avant exécution**. Aucune écriture n'a eu lieu.

## 5. Décisions du propriétaire

- Prêt gratuit par défaut, caution optionnelle.
- Tout le monde est membre ; propriétaire automatique au premier livre.
- Plusieurs groupes par utilisateur.
- Tout garder, rien à masquer.
- 10-24 : appliquer les étapes 0 à 3 en production après essai local ; mettre les livres existants à 0 FCFA ; vérifier `auth.users` ; traiter les SECURITY DEFINER.

## 6. Reste à faire

1. Valider l'essai sur la vraie base, puis appliquer 002 → 005 une par une.
2. Contrôles après chaque étape : 93 livres, 2 profils, trigger `on_auth_user_created` présent.
3. Rattacher livres et groupe au nouveau compte de Jonathan après sa réinscription (`auth.users` est vide).
4. Déployer le front v8 **après** la base.
5. Questions ouvertes : modèle de paiement (confirmation manuelle ou vraie API), statistiques de la page d'accueil à 0 pour un anonyme, avenir de la bibliothèque numérique non vérifiée.

## 7. Plan de projet — bugs et blocages (à traiter dans cet ordre)

| # | Tâche | Qui | État |
|---|---|---|---|
| B1 | **Installer et compiler pour la première fois** : `npm ci` puis `npm run build` (jamais exécuté, le registre npm est inaccessible à l'IA qui a écrit le code). Corriger toute erreur TypeScript réelle | Toute IA/personne avec accès internet | ⏳ à faire |
| B2 | Valider puis appliquer 002 → 005 sur Supabase, une par une, avec les contrôles du §6 | Propriétaire + IA | ⏳ essai annulé 2 fois |
| B3 | ✅ FAIT le 10-30 (voir §1). Ancien texte : Compte de Jonathan : `auth.users` est vide (revérifié le 10-24). Les livres sont **déjà** au profil « Jonathan Eden », qui est sans login. Dès qu'il s'inscrit, lancer `database/maintenance/relink_profile.sql` (remplacer `EMAIL_DE_JONATHAN`). **Attention : la base contient 93 livres, pas 98 — 5 livres manquent peut-être, à vérifier avec le propriétaire** | Propriétaire (inscription) puis IA | 🟡 script testé sur PG16, en attente de l'inscription |
| B4 | Test de bout en bout avec 2 comptes réels : inscription, rejoindre un groupe par code, ajouter un livre, réserver, accepter, retourner, confirmer | Propriétaire | ⏳ après B2/B3 |
| B5 | Passage à **React 19** (demandé le 10-24) pour `react-pdf@11`. `package-lock.json` supprimé : il ne correspondait plus ; le premier `npm install` le régénère (à committer). `lucide-react@0.263` déclare React ≤ 18 : toléré par `.npmrc`. Vérifier le nom du worker (`pdf.worker.min.mjs`) et le lecteur PDF au navigateur | Qui lance B1 | ⚠️ non compilé |
| B6 | Webhook n8n sans authentification (`src/lib/notifications.ts`) : tout visiteur qui connaît l'URL peut déclencher des SMS/e-mails. Ajouter un secret côté n8n, ou appeler n8n depuis une Edge Function Supabase | À décider | ⏳ |
| B7 | Réglages de l'authentification Supabase : URL du site et URL de redirection pour la confirmation e-mail | Propriétaire (tableau de bord) | ⏳ non vérifié |

## 8. Plan de projet — améliorations (après les bloquants)

| # | Idée | Priorité |
|---|---|---|
| A1 | Index sur les clés étrangères signalées par l'outil de performance (18) et `(select auth.uid())` dans les politiques RLS (34) | Basse, utile à partir de quelques milliers de lignes |
| A2 | ~~`pg_cron`~~ migration `006` écrite : à appliquer et à vérifier (`select * from cron.job`) | Moyenne |
| A3 | Code mort : `PaymentModal`, `usePayments` ; bibliothèque numérique non vérifiée (`book_access` jamais alimentée) | À décider : garder ou retirer |
| A4 | Modèle de paiement : confirmation manuelle ou vraie API (MTN / Orange) | Décision du propriétaire |
| A5 | Tests automatisés (Vitest pour les hooks, un test SQL rejouable pour les RPC) | Moyenne |
| A6 | Résultats de recherche Gutendex : peu de PDF disponibles, attentes à gérer dans l'interface | Basse |

## 9. Mises à jour des autres IA et collaborateurs (à remplir)

Format : une ligne par travail, la plus récente en haut.

| Date | Auteur (IA / personne) | Travail | État (✅ / 🟡 / ⚠️ / ❌) | Preuve (commande, résultat) | Fichiers touchés |
|---|---|---|---|---|---|
| | | | | | |

### 2026-11-09 — Diagnostic page blanche (IA: Claude)
- `index.html` : message « Chargement… » dans `#root` + capteur d'erreurs (error / unhandledrejection) qui affiche l'erreur à l'écran si l'app plante avant le 1er rendu React. Cause réelle de « je ne vois pas ma page d'accueil » : NON confirmée (hypothèses : déploiement Vercel non refait / Node < 22.13 vs `engines` / incompat React 19 non compilée). Audit statique : aucune API React 19 retirée utilisée.

### 2026-11-09 — Cause de la page blanche TROUVÉE (IA: Claude)
- Erreur console : « Manque les variables d'environnement Supabase » (`src/lib/supabaseClient.ts:5`). Il manquait `.env.local` (local) et sûrement les variables Vercel. Ajout de `.env.example` (URL du projet `kbdrxgnxejnjefoswgju` ; la clé anon n'a pas pu être lue par l'outil, à copier depuis le dashboard). Jamais de `service_role` côté front.

### 2026-11-11 — Parcours mot de passe corrigé (IA: Claude)
- `ResetPasswordPage` réécrite : (1) lien expiré/invalide (`#error=…otp_expired`) ou aucune session après 6 s → message + lien « Redemander » au lieu d'un spinner infini ; (2) règles identiques à l'inscription (`resetPasswordSchema` : 8 car., majuscule, chiffre) au lieu de 6 ; (3) fonctionne aussi connecté (Profil → « Changer mon mot de passe » pointe maintenant vers `/reset-password`, sans email, donc indépendant de la config Redirect URLs) ; (4) après un lien email : déconnexion puis /signin.
- `lib/errors.ts` : messages FR pour erreurs Auth (identifiants, email non confirmé, déjà inscrit, rate limit email, mot de passe identique/faible, lien expiré). Utilisé par SignIn, SignUp, Forgot, Reset.
- Syntaxe : 74 fichiers, 0 erreur. Non testé en navigateur.
- Eunice Elmie (profil `08c207ab-…`, tél. +237651460012, aucun email enregistré) : compte de connexion NON créé, il manque son email → ensuite `database/maintenance/relink_profile.sql`.

### 2026-11-12 — Bouton sans couleur (IA: Claude)
- `components/ui/button.tsx` n'avait aucune couleur de fond : « Envoyer le lien » et « Mettre à jour le mot de passe » étaient invisibles (texte noir sur fond clair). Ajout de bg-blue-600/text-white/hover, et `className` par défaut '' (évitait le mot « undefined » dans la classe).
- Rappel : « Changer mon mot de passe » est dans Profil > Paramètres (connecté uniquement).

### 2026-11-12 — Revue de design appliquée à tout le projet (IA: Claude) → v20
Source : critique /design-critique (lecture du code, pas de rendu navigateur). Rien n'a été compilé ni testé visuellement : à contrôler après `npm run build`.
- **Utilisabilité** : « Parcourir » retiré de la barre ; emojis de la barre remplacés par des icônes (BookOpen/Globe/Bookmark/Settings) ; `ProtectedRoute` redirige vers /signin avec un message (« Connectez-vous pour accéder à cette page ») et la connexion ramène à la page demandée (chemins relatifs seulement) ; squelettes de cartes sur le catalogue (`QueryState` accepte `skeleton`) ; page « Mot de passe oublié » : autofocus, autocomplete, message de délai.
  - DÉCISION NON PRISE : catalogue public. La base n'autorise pas les visiteurs (anon sans droit de lecture) ; on garde la connexion obligatoire avec message explicite.
- **Hiérarchie** : 39 `min-h-screen` → `min-h-[calc(100vh-4rem)]` (la barre du haut fait 4rem) ; 5 textes de 10-11 px → `text-xs`.
- **Accessibilité** : 67 `text-gray-400` → `text-gray-500` ; placeholders à 4,5:1 ; focus visible aussi sur liens/role=switch ; cibles tactiles 44 px (CSS `pointer: coarse` sur les petits boutons) ; `aria-label` sur 6 boutons icône (fermer lecteur/modales, effacer recherche, retirer photo, menu mobile avec `aria-expanded`) ; interrupteur notifications `role="switch"` + `aria-checked` ; `prefers-reduced-motion` respecté. CORRECTION : toutes les images avaient déjà un `alt` (le comptage « 9 sans alt » de la critique était faux, balises sur plusieurs lignes).
- **Cohérence** : indigo → bleu (34 usages) ; violet → bleu sauf rôle administrateur (conservé) ; fonds d'authentification et Onboarding unifiés en gris ; arrondi des boutons bleus unifié là où c'était sûr (1 seul changement : les autres `rounded-full` sont des pastilles/cercles volontaires).
  - NON FAIT : remplacer tous les boutons écrits à la main par le composant `Button` (refactor large, risque de régression sans test) ; réduction du rouge (110 usages) à relire écran par écran.

### 2026-11-12 — Catalogue public (décision du propriétaire) → v21 (IA: Claude)
- Base : migration `public_catalog_for_visitors` appliquée en ligne (fichier `database/migrations/009_public_catalog.sql`). Testée avec le rôle `anon` : 93 livres, plafond 48/appel, `%` littéral échappé, lecture directe de `books` toujours refusée.
- Front : `/catalog` = `CatalogEntry` (visiteur → `PublicCatalogPage` : recherche, catégorie, « Voir plus », bandeau « Rejoindre / Se connecter » ; membre → `CatalogPage` complet inchangé). Clic sur un livre = page détail protégée → connexion avec message puis retour sur le livre.
- Limites : détail d'un livre, réservation et groupes restent réservés aux connectés. Pas d'image de livre exposée sauf l'URL `image_url` (déjà publique si stockée en bucket public : à vérifier). Non testé en navigateur.

### 2026-11-12 — Correctifs de sécurité réappliqués sur v21, catalogue public borné, lien de mot de passe (IA: Claude)
**Base en ligne — ✅ vérifié (transactions annulées pour les mesures)**
- `public_catalog` : mesuré avec 100 000 livres simulés, un appel anonyme coûtait 200–500 ms (recherche 1 lettre : total 100 001). Après 3 migrations (`public_catalog_limits`, `…_not_materialized`, `…_index_friendly`) : 1–21 ms. Bornes : recherche ≥ 3 car., total ≤ 1000, décalage ≤ 1000, page ≤ 48 ; index `pg_trgm`. JSON identique (11 clés), 93 livres réels : mêmes résultats, `%` littéral, lecture directe de `books` toujours refusée à `anon`. Fichier : `database/migrations/010_public_catalog_limits.sql`.
- Limite connue : aucune limitation par IP possible en SQL → à faire en amont si le catalogue grandit.
- Compte `edenjonathan10@gmail.com` (lecture de dates uniquement) : e-mail confirmé, mot de passe défini, non bloqué ; lien de récupération consommé à 01:18 UTC, 1 session ouverte.

**Cause du lien de réinitialisation qui ouvre `localhost` (capture : `ERR_CONNECTION_REFUSED`) — ✅ trouvée**
- `ForgotPasswordPage` utilisait `window.location.origin` : demandé depuis le serveur local, le lien pointe vers `localhost:5173`, et cette adresse est autorisée dans Redirect URLs. Correctif : `src/lib/siteUrl.ts` (`VITE_SITE_URL`, voir `.env.example`) ; `useAuth` renvoie un lien de récupération arrivé ailleurs vers `/reset-password`. Réglage Supabase à faire : retirer `http://localhost:5173/**` du projet de production.

**Correctifs de sécurité reportés de la v18 sécurisée (absents de v21) — ✅ compilés, 🟡 non testés au navigateur**
`safeUrl.ts` + `MyReservationsPage` + `PDFReader` (liens https), `useGroups` (code de groupe généré par le serveur), `useDigitalBooks` (`onConflict`), `errors.ts` (inscription), `vercel.json` (CSP sans `unsafe-inline`/`unsafe-eval`), `index.html` + `public/assets/boot-diagnostic.v1.js` (script inline déplacé), `n8n_workflow_pageensemble.json` (authentification + garde-fous), `SECURITY_CHECKLIST.md`.
- Contrôle : `npm install` + `tsc --noEmit` → 0 erreur ; `npm run build` ✓ ; `dist/index.html` sans script inline ; aucun `eval` dans le bundle. `package-lock.json` généré : à committer.
- ⚠️ À tester sur une prévisualisation Vercel : connexion, catalogue public, lecture d'un PDF (CSP stricte), lien « mot de passe oublié ».

### 2026-11-13 — Outil temporaire : changer le mot de passe d'un membre sans email (IA: Claude)
Demandé par le propriétaire en attendant de régler l'envoi d'emails (SMTP/localhost). Objectif atteint sans ouvrir de faille :
- **Fonction Edge `admin-reset-password`** (déployée en ligne) : exige un jeton de session valide (`verify_jwt=true`), revérifie dans la base, avec la clé `service_role` (jamais envoyée au navigateur), que l'appelant a `role = 'administrateur'`. Cherche le compte cible par email, règle son mot de passe (8 car., 1 majuscule, 1 chiffre), journalise qui/quand/pour qui dans `admin_password_resets` (table RLS : lecture par l'admin concerné seulement, écriture via service_role uniquement).
- **Front** : `pages/admin/SettingsPage.tsx`, nouveau bloc ambre « Changer le mot de passe d'un membre (temporaire) », visible seulement si `profile.role === 'administrateur'` (contrôle serveur redondant, donc sans risque même si ce contrôle front était contourné).
- Un membre normal ne peut pas appeler cette fonction avec succès : son rôle n'est pas administrateur, la fonction répond 403 avant toute modification.
- À RETIRER dès que l'email fonctionne : supprimer le bloc ambre de `SettingsPage.tsx`, et éventuellement désactiver/supprimer la fonction Edge `admin-reset-password` dans Supabase (Edge Functions).
