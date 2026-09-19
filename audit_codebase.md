# 🔍 Rapport d'Audit Complet — Outil de Secrétaire Administratif et Financier v1.0.3

> **Date d'audit :** 19 septembre 2026  
> **Stack :** Electron 28 + React 19 + TypeScript + Vite 6 + sql.js + TailwindCSS 3  
> **Architecture :** Application desktop Electron avec process principal (Node.js/SQLite) et renderer (React)

---

## 📊 Vue d'ensemble

| Catégorie | Note | Statut |
|-----------|------|--------|
| Architecture générale | 7/10 | ✅ Solide |
| Sécurité | 3/10 | 🔴 Critique |
| Qualité du code | 6/10 | 🟡 Correct |
| Performance | 5/10 | 🟡 Améliorable |
| Maintenabilité | 6/10 | 🟡 Correct |
| Tests | 0/10 | 🔴 Absent |
| TypeScript | 6/10 | 🟡 Partiel |
| Documentation | 4/10 | 🟡 Insuffisante |

---

## 🏗️ Architecture

### Structure des fichiers

```
/
├── App.tsx                     # Routeur principal + état global
├── index.tsx / index.css       # Point d'entrée
├── types.ts                    # Types centralisés (bon)
├── components/
│   ├── icons/Icons.tsx          # Icônes SVG (1 seul fichier)
│   ├── layout/Header.tsx
│   ├── layout/Sidebar.tsx
│   └── ui/                     # Composants réutilisables
├── pages/                      # 14 pages
├── services/
│   ├── electronDB.ts           # Couche DB (abstraction IPC)
│   ├── authService.ts          # Auth (wrapper IPC)
│   ├── autoBackup.ts           # Backup auto
│   ├── cloudBackupService.ts   # Backup cloud
│   ├── exportService.ts        # Export PDF/Excel/Word (33 Ko)
│   └── db.ts                   # ⚠️ Fichier MORT (Dexie legacy)
├── utils/
│   ├── formatter.ts
│   └── chartCapture.ts
└── electron/
    ├── main.cjs                # Process principal
    ├── preload.cjs             # Bridge contextBridge
    ├── crypto.cjs              # Chiffrement
    └── database/
        ├── database.cjs        # DatabaseManager (sql.js)
        └── schema.sql          # Schéma SQLite
```

### Points forts architecturaux
- ✅ Bonne séparation Electron main/renderer avec `contextBridge` et `contextIsolation: true`
- ✅ Types centralisés dans `types.ts`
- ✅ Couche d'abstraction `electronDB.ts` qui émulérait une API Dexie-compatible
- ✅ SQLite via `sql.js` (persistance fiable en fichier binaire)
- ✅ Schéma SQL versionné dans `schema.sql`
- ✅ Flux d'authentification bien géré dans `App.tsx` (chargement → onboarding → login → app)

---

## 🔴 SÉCURITÉ — Problèmes Critiques

### 1. Clé maître hardcodée en clair (CRITIQUE)

**Fichier :** [`crypto.cjs`](file:///c:/gemcli/outil-de-secrétaire-administratif-et-financier-v1.0.3/outil-de-secrétaire-administratif-et-financier/electron/crypto.cjs#L5)

```js
// ❌ PROBLÈME MAJEUR
const ADMIN_MASTER_KEY = 'GestionFinanciere2024SecureAdminKey!@#$%';
```

Cette clé hardcodée dans le code source est **le secret qui chiffre TOUS les mots de passe utilisateurs**. Quiconque décompile l'application ou accède au dépôt Git peut déchiffrer n'importe quel mot de passe utilisateur. Il s'agit d'une **vulnérabilité de sécurité critique**.

**Solution recommandée :** Utiliser un vrai KDF (Key Derivation Function) comme `scrypt` ou `bcrypt` pour stocker les mots de passe sous forme de hash non réversible. La récupération de mot de passe via admin devrait regénérer un nouveau mot de passe, pas déchiffrer l'ancien.

---

### 2. Le mot de passe peut être déchiffré (CRITIQUE)

**Fichier :** [`crypto.cjs`](file:///c:/gemcli/outil-de-secrétaire-administratif-et-financier-v1.0.3/outil-de-secrétaire-administratif-et-financier/electron/crypto.cjs#L39) — `decryptPassword()`

L'architecture actuelle permet de **retrouver le mot de passe en clair** via `auth:adminDecrypt`. Un stockage sécurisé moderne ne permet pas de déchiffrer le mot de passe — on compare seulement un hash. La fonction `decryptPassword` ne devrait pas exister.

---

### 3. La clé admin est vérifiée par comparaison de hash de la même clé (Faille logique)

**Fichier :** [`crypto.cjs`](file:///c:/gemcli/outil-de-secrétaire-administratif-et-financier-v1.0.3/outil-de-secrétaire-administratif-et-financier/electron/crypto.cjs#L76-L79)

```js
function verifyAdminKey(providedKey) {
  const expectedHash = crypto.createHash('sha256').update(ADMIN_MASTER_KEY).digest('hex');
  const providedHash = crypto.createHash('sha256').update(providedKey).digest('hex');
  return expectedHash === providedHash;
}
```

La clé admin est vérifiée contre un hash de la **même clé constante hardcodée**. Cela n'apporte aucune sécurité supplémentaire.

---

### 4. `.env.local` dans la racine (Risque de fuite)

Le fichier `.env.local` est présent à la racine mais n'est pas dans le `.gitignore` (`.gitignore` ignore uniquement `*.local`, ce qui devrait couvrir ce cas). À vérifier que ce fichier ne contient pas de secrets qui ne doivent pas être committés.

---

### 5. `unsafe-eval` dans la Content Security Policy

**Fichier :** [`index.html`](file:///c:/gemcli/outil-de-secrétaire-administratif-et-financier-v1.0.3/outil-de-secrétaire-administratif-et-financier/index.html#L7)

```html
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```

`unsafe-eval` et `unsafe-inline` affaiblissent la CSP. `unsafe-eval` est généralement requis par sql.js, mais `unsafe-inline` devrait être évité avec une nonce ou hash si possible.

---

### 6. `openDevTools()` activé en mode développement

**Fichier :** [`main.cjs`](file:///c:/gemcli/outil-de-secrétaire-administratif-et-financier-v1.0.3/outil-de-secrétaire-administratif-et-financier/electron/main.cjs#L29)

```js
mainWindow.webContents.openDevTools();
```

Les DevTools sont ouverts automatiquement en développement, ce qui est normal. Mais la condition `!app.isPackaged` garantit que cela ne s'active pas en production — c'est correct.

---

## 🟡 QUALITÉ DU CODE — Problèmes Notables

### 7. Fichier `db.ts` mort (code zombie)

**Fichier :** [`services/db.ts`](file:///c:/gemcli/outil-de-secrétaire-administratif-et-financier-v1.0.3/outil-de-secrétaire-administratif-et-financier/services/db.ts)

Ce fichier contient l'ancienne implémentation **Dexie** (IndexedDB) qui n'est plus utilisée depuis la migration vers Electron/sql.js. Il définit un `AppDB` avec Dexie mais aucun composant ne l'importe. Il consomme inutilement `dexie` dans les dépendances.

**Action :** Supprimer `db.ts` et retirer `dexie` des dépendances dans `package.json`.

---

### 8. Commentaire vestige dans `electronDB.ts`

**Fichier :** [`services/electronDB.ts`](file:///c:/gemcli/outil-de-secrétaire-administratif-et-financier-v1.0.3/outil-de-secrétaire-administratif-et-financier/services/electronDB.ts#L18)

```ts
// ... existing interfaces ...
```

Ce commentaire placeholder a été laissé dans la déclaration globale de `window.electron` — signe d'une édition manuelle désordonnée.

---

### 9. `any` utilisé dans plusieurs endroits

```ts
// Dashboard.tsx
const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
const [expensePieData, setExpensePieData] = useState<any[]>([]);

// Reports.tsx  
const [reportData, setReportData] = useState<any[] | null>(null);
const [chartData, setChartData] = useState<any[]>([]);
```

Ces types `any` effacent la sécurité TypeScript sur les données des graphiques. Des interfaces dédiées devraient être définies.

---

### 10. Doublon commentaire dans `preload.cjs`

**Fichier :** [`electron/preload.cjs`](file:///c:/gemcli/outil-de-secrétaire-administratif-et-financier-v1.0.3/outil-de-secrétaire-administratif-et-financier/electron/preload.cjs#L94-L95)

```js
// AUTO-BACKUP
// AUTO-BACKUP
```

Commentaire dupliqué — vestige d'une édition.

---

### 11. Pas de gestion d'erreur de validation côté IPC

Dans `main.cjs`, les handlers IPC ne valident pas les données reçues :

```js
// ❌ Aucune validation
ipcMain.handle('expenses:add', (_, expense) => db.addExpense(expense));
```

Si le renderer envoie des données malformées ou incomplètes, elles seront insérées telles quelles en base. Une validation des schémas (zod ou validation manuelle) côté `main.cjs` serait recommandée.

---

### 12. `bulkAdd` non-atomique dans `electronDB.ts`

```ts
async bulkAdd(items: Omit<T, 'id'>[]): Promise<void> {
    for (const item of items) {
      await this.addItem(item); // ← appel IPC séquentiel
    }
}
```

`bulkAdd` effectue N appels IPC séquentiels au lieu d'une seule opération en lot. La `transaction()` de `electronDB.ts` est aussi un no-op côté renderer :

```ts
transaction: async (_mode, tables, callback) => {
    await callback(); // Pas de vrai rollback possible
}
```

---

### 13. `save()` appelé après chaque opération CRUD

**Fichier :** [`database.cjs`](file:///c:/gemcli/outil-de-secrétaire-administratif-et-financier-v1.0.3/outil-de-secrétaire-administratif-et-financier/electron/database/database.cjs#L40-L42)

```js
save() {
  const data = this.db.export();
  fs.writeFileSync(this.dbPath, buffer); // ← sync, après chaque opération
}
```

`save()` est appelé **synchroniquement** (`writeFileSync`) après **chaque** `add`, `update`, `delete`. Avec sql.js en mémoire, l'export de toute la DB + écriture disque à chaque opération peut devenir un goulot d'étranglement sur des volumes de données importants. Un write-debounce ou write-through intelligent serait plus efficace.

---

### 14. Appel `alert()` dans `App.tsx`

**Fichier :** [`App.tsx`](file:///c:/gemcli/outil-de-secrétaire-administratif-et-financier-v1.0.3/outil-de-secrétaire-administratif-et-financier/App.tsx#L50)

```tsx
alert(message); // ← modal natif bloquant
```

L'utilisation de `alert()` natif pour notifier une alerte cloud est une pratique médiocre (bloque le thread UI, aspect visuel non maîtrisable). Le composant `NotificationCenter.tsx` existe déjà — il devrait être utilisé à la place.

---

### 15. `exportService.ts` monolithique (33 Ko)

**Fichier :** [`services/exportService.ts`](file:///c:/gemcli/outil-de-secrétaire-administratif-et-financier-v1.0.3/outil-de-secrétaire-administratif-et-financier/services/exportService.ts) — 935 lignes

Ce fichier gère les exports PDF, Excel et Word pour toutes les entités. Il devrait être découpé en modules séparés (`pdfExport.ts`, `excelExport.ts`, `wordExport.ts`) pour être maintenable.

---

### 16. `backup` dans `autoBackup.ts` ignore les nouvelles tables

**Fichier :** [`services/autoBackup.ts`](file:///c:/gemcli/outil-de-secrétaire-administratif-et-financier-v1.0.3/outil-de-secrétaire-administratif-et-financier/services/autoBackup.ts#L41-L48)

```ts
const [expenses, invoices, vouchers, recettes, documents, organizationConfig] = await Promise.all([...]);
```

Le backup automatique n'inclut **pas** les `salaries`, `contacts`, `budgets`, et `annualBudgets`. Ces données ne seraient donc pas restaurées avec ce backup.

---

## 🟡 PERFORMANCE

### 17. Recherche globale non-debounced

**Fichier :** [`components/ui/GlobalSearch.tsx`](file:///c:/gemcli/outil-de-secrétaire-administratif-et-financier-v1.0.3/outil-de-secrétaire-administratif-et-financier/components/ui/GlobalSearch.tsx)

La recherche se déclenche à chaque frappe (`useEffect` sur `query`). Bien qu'elle requière 2 caractères minimum, il n'y a pas de debounce. Cela peut générer de nombreux appels IPC parallèles pendant la frappe.

---

### 18. `Reports.tsx` et `Dashboard.tsx` chargent toutes les données sans pagination

```ts
const allExpenses = await db.expenses.toArray(); // charge TOUT
const allInvoices = await db.invoices.toArray(); // charge TOUT
```

Tous les enregistrements sont chargés en mémoire pour les rapports. Sur des années d'utilisation avec des milliers d'entrées, cela peut devenir problématique.

---

## 📦 DÉPENDANCES

### 19. `dexie` inutilisée

`dexie` est toujours listée dans les `dependencies` de `package.json` mais n'est plus utilisée depuis la migration Electron. Elle alourdit le bundle inutilement.

---

### 20. `sql.js` dans les `dependencies` de production vs dans devDependencies

`sql.js` (`^1.13.0`) est dans les `dependencies`, ce qui est correct pour Electron, mais attention : avec Vite, il pourrait être bundlé dans le renderer si mal configuré. Vérifier que seul le process `main` Electron l'utilise.

---

### 21. Versions de dépendances à surveiller

| Dépendance | Version | Statut |
|---|---|---|
| `electron` | `^28.3.3` | ⚠️ Electron 28 est en fin de support (LTS = v36 en 2026) |
| `xlsx` | `^0.18.5` | ⚠️ Version ancienne (SheetJS). La v0.20+ est community edition |
| `docx` | `^8.5.0` | ✅ OK |
| `react` | `^19.2.0` | ✅ Récent |
| `vite` | `^6.2.0` | ✅ Récent |

---

## 🏗️ MAINTENABILITÉ

### 22. `tsconfig.json` — vérifier la rigueur

Les fichiers `.cjs` (Electron) sont écrits en JavaScript CommonJS sans types TypeScript. Pas de problème en soi, mais il n'y a aucune vérification de type sur le code Electron. Une migration vers `.ts` compilé en CJS ou l'ajout de JSDoc serait un plus.

---

### 23. Absence totale de tests

Aucun framework de test n'est configuré (pas de Jest, Vitest, Playwright, etc.). L'application n'a aucune couverture de test. Pour une application financière, c'est un risque opérationnel important.

**Priorité :** Tests unitaires sur `formatter.ts`, `database.cjs` (méthodes CRUD), et tests d'intégration E2E avec Playwright Electron.

---

### 24. Deux composants `AutocompleteInput` quasi-identiques

Les fichiers [`AutocompleteInput.tsx`](file:///c:/gemcli/outil-de-secrétaire-administratif-et-financier-v1.0.3/outil-de-secrétaire-administratif-et-financier/components/ui/AutocompleteInput.tsx) et [`GenericAutocomplete.tsx`](file:///c:/gemcli/outil-de-secrétaire-administratif-et-financier-v1.0.3/outil-de-secrétaire-administratif-et-financier/components/ui/GenericAutocomplete.tsx) semblent remplir des rôles similaires. Il faudrait les fusionner ou clarifier leurs rôles distincts.

---

### 25. `electron-builder.yml` — pas de signature de code

Aucune configuration `signingHashAlgorithms` ou certificat pour signer l'installateur Windows. L'application sera bloquée par SmartScreen sur les machines fraîches.

---

## 🟢 POINTS POSITIFS

- ✅ **Bonne isolation Electron** : `contextIsolation: true`, `nodeIntegration: false`, usage de `contextBridge`
- ✅ **SQL paramétré** : toutes les requêtes SQL utilisent des paramètres `?` — pas d'injection SQL possible
- ✅ **Types centralisés** dans `types.ts` — bonne organisation
- ✅ **Backup auto** toutes les 72h et backup cloud sur dossier réseau/cloud-drive
- ✅ **Reset factory** avec re-confirmation mot de passe
- ✅ **Restauration de backup** correctement transactionnelle côté `database.cjs`
- ✅ **Schéma SQL** avec index sur les colonnes fréquemment filtrées (date, invoiceNumber)
- ✅ **QueryBuilder** maison avec `where/filter/orderBy/reverse` pour compatibilité Dexie
- ✅ **Panel Admin** accessible par raccourci clavier caché (Ctrl+Shift+Alt+A)
- ✅ **Port Vite** fixé à 3000 pour cohérence avec Electron dev mode

---

## 📋 Plan d'actions prioritaires

### 🔴 Urgentes (Sécurité)

1. **Remplacer la cryptographie par du hashing** (`bcrypt`/`argon2`) — ne plus stocker un mot de passe déchiffrable
2. **Supprimer `decryptPassword` et `adminDecrypt`** — remplacer par une logique de reset sans récupération en clair
3. **Externaliser la clé admin** hors du code source (variable d'environnement au build ou stockage séparé)

### 🟡 Importantes (Qualité/Fiabilité)

4. **Compléter `autoBackup.ts`** pour inclure `salaries`, `contacts`, `budgets`, `annualBudgets`
5. **Supprimer `services/db.ts`** et retirer `dexie` des dépendances
6. **Remplacer `alert()`** par `NotificationCenter` dans `App.tsx`
7. **Ajouter un debounce** (300ms) sur `GlobalSearch`
8. **Découper `exportService.ts`** en 3 modules par format

### 🟢 Améliorations (Dette technique)

9. **Typer les données de graphiques** (interfaces dédiées au lieu de `any[]`)
10. **Write-debounce** sur `DatabaseManager.save()` pour éviter l'écriture disque à chaque opération
11. **Mettre à jour Electron** vers v36 (LTS actuel)
12. **Configurer Vitest** pour des tests unitaires sur les services critiques
13. **Signer l'installateur** pour éviter le blocage SmartScreen
14. **Fusionner** `AutocompleteInput` et `GenericAutocomplete`
