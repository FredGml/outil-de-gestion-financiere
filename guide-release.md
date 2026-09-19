Je vais d'abord vérifier l'état actuel du repo, puis créer le workflow GitHub Actions.

Read URL: https://github.com/FredGml/outil-de-gestion-financiere
Viewed content.md:1-80
Read URL: https://api.github.com/repos/FredGml/outil-de-gestion-financiere
Viewed content.md:1-7

J'ai toutes les infos. Le repo existe bien, branche par défaut `main`, et il y a quelques commits (pour la release v1.0.1). Je vais créer le workflow GitHub Actions et te donner les commandes exactes.

Created release.yml

Maintenant un script PowerShell pour simplifier les futures releases :

Created release.ps1

Maintenant **ouvre ton terminal PowerShell** dans le projet et exécute ces commandes dans l'ordre :

---

### Étape 1 — Ajouter les nouveaux fichiers et faire le commit initial

```powershell
cd "c:\gemcli\outil-de-secrétaire-administratif-et-financier-v1.0.3\outil-de-secrétaire-administratif-et-financier"

# Ajouter le workflow et le script de release qui viennent d'être créés
git add -A

# Commit initial du code source (s'il n'a pas encore été fait)
git commit -m "feat: code source initial v1.0.3 + CI/CD GitHub Actions

- Application Electron + React + TypeScript + SQLite (sql.js)
- Auth sécurisée avec hash scrypt (migration auto depuis AES-GCM)
- Clé admin générée aléatoirement au premier démarrage
- Backup complet (expenses, invoices, vouchers, salaires, contacts, budgets)
- GitHub Actions : build et release automatiques sur push de tag
- Script release.ps1 pour publier facilement de nouvelles versions"
```

### Étape 2 — Connecter au repo GitHub et pousser

```powershell
# Renommer la branche locale en 'main' (correspond au défaut GitHub)
git branch -M main

# Ajouter le remote
git remote add origin https://github.com/FredGml/outil-de-gestion-financiere.git

# Push en force (le remote a seulement un commit de release binaire,
# on veut remplacer par le vrai code source)
git push -u origin main --force
```

### Étape 3 — Créer la release v1.0.3

```powershell
# Créer et pousser le tag v1.0.3 → déclenche GitHub Actions automatiquement
git tag -a "v1.0.3" -m "Version 1.0.3 - Sécurité + refactoring"
git push origin v1.0.3
```

---

### Pour les futures versions — Ultra simple

```powershell
# Bump patch : 1.0.3 → 1.0.4
.\release.ps1

# Bump minor : 1.0.3 → 1.1.0
.\release.ps1 -Minor

# Version précise
.\release.ps1 -Version 2.0.0
```

> **Comment ça marche :** Le push d'un tag `v*.*.*` déclenche automatiquement le workflow [`.github/workflows/release.yml`](file:///c:/gemcli/outil-de-secrétaire-administratif-et-financier-v1.0.3/outil-de-secrétaire-administratif-et-financier/.github/workflows/release.yml) → GitHub Actions lance un runner Windows, installe les deps, build l'installer `.exe` avec electron-builder, et le publie automatiquement dans les releases GitHub.