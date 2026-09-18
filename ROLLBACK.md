# 🔄 PageEnsemble — Guide de Rollback

## Stratégies disponibles (3 niveaux)

---

## ⚡ Niveau 1 — Rollback Vercel (< 2 minutes)

Le plus rapide. Aucun code requis.

### Via le dashboard Vercel
1. Va sur [vercel.com/dashboard](https://vercel.com/dashboard)
2. Sélectionne le projet **PageEnsemble**
3. Onglet **Deployments**
4. Clique sur un déploiement stable (vert)
5. Menu **⋯** → **Promote to Production**

### Via la CLI Vercel
```bash
# Lister les déploiements
vercel ls --prod

# Promouvoir un déploiement précédent
vercel promote <deployment-url>
```

---

## 🔁 Niveau 2 — Rollback Git + GitHub Actions (< 5 minutes)

Déclenche le workflow `rollback` manuellement.

### Via GitHub Actions
1. Va sur GitHub → **Actions** → **CI / CD — PageEnsemble**
2. Clique **Run workflow**
3. Sélectionne la branche `main`
4. Clique **Run workflow**

Le workflow rollback automatiquement vers la release précédente taggée.

### Via Git en local
```bash
# Voir les releases disponibles
git tag --list "release/*" | sort -r

# Créer une branche de hotfix depuis la version stable
git checkout release/20240101-abc1234
git checkout -b hotfix/rollback-to-20240101

# Pusher → déclenche un nouveau déploiement
git push origin hotfix/rollback-to-20240101
```

---

## 🛠️ Niveau 3 — Rollback base de données Supabase

À utiliser si le rollback frontend ne suffit pas
(ex: migration DB cassante).

### Restaurer depuis un backup Supabase
1. Dashboard Supabase → **Database** → **Backups**
2. Choisir un point de restauration (max 7 jours en gratuit)
3. Cliquer **Restore**

### Annuler une migration SQL
```sql
-- Voir les migrations appliquées
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC;

-- Annuler une contrainte ajoutée par erreur
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_prix_check;

-- Annuler une colonne ajoutée par erreur
ALTER TABLE reservations DROP COLUMN IF EXISTS nouvelle_colonne;
```

### Annuler une politique RLS
```sql
-- Lister les policies actives
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- Supprimer une policy cassante
DROP POLICY IF EXISTS "nom_de_la_policy" ON nom_table;
```

---

## 🚨 Checklist d'urgence (production cassée)

```
□ 1. Identifier la cause dans Sentry (dashboard.sentry.io)
□ 2. Rollback Vercel immédiat (Niveau 1) — < 2 min
□ 3. Ouvrir une issue GitHub avec le lien Sentry
□ 4. Si DB cassée → Rollback Supabase (Niveau 3)
□ 5. Préparer le fix sur une branche `hotfix/xxx`
□ 6. Tester localement
□ 7. PR → main → CI passe → déploiement automatique
□ 8. Vérifier Sentry que les erreurs ont disparu
□ 9. Fermer l'issue
```

---

## 📊 Monitoring — Sentry

| URL | Description |
|-----|-------------|
| `https://sentry.io/organizations/VOTRE_ORG/issues/` | Erreurs en cours |
| `https://sentry.io/organizations/VOTRE_ORG/performance/` | Performances |
| `https://sentry.io/organizations/VOTRE_ORG/releases/` | Historique des releases |

### Alertes configurées recommandées
Dans Sentry → **Alerts** → **Create Alert** :

1. **Taux d'erreur** — alerter si > 5% des sessions ont une erreur
2. **Nouvelle erreur** — alerter à chaque première occurrence d'une erreur
3. **Dégradation perf** — alerter si LCP > 4s sur 10% des sessions

---

## 🔑 Secrets GitHub requis

À configurer dans **Settings → Secrets and variables → Actions** :

| Secret | Description |
|--------|-------------|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé anonyme Supabase |
| `VITE_N8N_WEBHOOK_SECRET` | Secret webhook n8n |
| `VITE_SENTRY_DSN` | DSN public Sentry (côté client) |
| `SENTRY_AUTH_TOKEN` | Token Sentry pour uploader source maps |
| `SENTRY_ORG` | Slug organisation Sentry |
| `SENTRY_PROJECT` | Nom projet Sentry |
| `VERCEL_TOKEN` | Token API Vercel |
| `VERCEL_ORG_ID` | ID organisation Vercel |
| `VERCEL_PROJECT_ID` | ID projet Vercel |

```bash
# Récupérer les IDs Vercel
npx vercel link
cat .vercel/project.json
```
