# ✅ Plan d'implémentation — Audit Codebase

## 🔴 Sécurité (Critique)

- [x] **SEC-1** — `crypto.cjs` : Remplacer AES-256-GCM réversible par scrypt (hash one-way) + migration transparente des anciens mots de passe
- [x] **SEC-2** — `database.cjs` : Mettre à jour `setPasswordData()` pour stocker hash+salt au lieu de encrypted+iv+authTag
- [x] **SEC-3** — `main.cjs` : Générer une clé admin aléatoire au premier démarrage (stockée hashée), supprimer `auth:adminDecrypt`, mettre à jour `auth:verifyPassword` avec migration automatique
- [x] **SEC-4** — `AdminPanel.tsx` : Supprimer la section "déchiffrer et afficher le mot de passe", conserver uniquement la réinitialisation

## 🟡 Fiabilité (Important)

- [x] **REL-1** — `autoBackup.ts` : Ajouter les tables manquantes (`salaries`, `contacts`, `budgets`, `annualBudgets`)
- [x] **REL-2** — `services/db.ts` : Supprimer ce fichier mort (ancienne implémentation Dexie)
- [x] **REL-3** — `package.json` : Retirer la dépendance `dexie` inutilisée
- [x] **REL-4** — `App.tsx` : Remplacer `alert()` natif par une notification toast inline
- [x] **REL-5** — `GlobalSearch.tsx` : Ajouter un debounce (300ms) sur les requêtes IPC

## 🟢 Dette technique

- [x] **DT-1** — `preload.cjs` : Supprimer le commentaire dupliqué (`// AUTO-BACKUP` × 2)
- [x] **DT-2** — `Dashboard.tsx` / `Reports.tsx` : Typer les données de graphiques avec des interfaces dédiées (supprimer `any[]`)
- [x] **DT-3** — `database.cjs` : Ajouter un write-debounce (200ms) sur `save()` pour les opérations CRUD (sauf auth)
