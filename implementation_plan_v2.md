# Plan d'Implémentation - Version 2.0 (Extensions)

Ce plan détaille les étapes pour intégrer les nouvelles fonctionnalités validées par l'utilisateur.

## 1. Gestion des Tiers (CRM Lite)
Centraliser les contacts pour éviter la ressaisie et suivre l'historique.

- [ ] **Backend**
    - [ ] Ajouter table `contacts` (id, name, type [Client, Fournisseur, Employé], phone, email, address).
    - [ ] Mettre à jour `electron/database/schema.sql` et `database.cjs`.
    - [ ] Exposer via `electronDB.ts`.
- [ ] **Frontend - Page Contacts**
    - [ ] Créer `pages/Contacts.tsx` (Liste, Ajout, Modification, Suppression).
    - [ ] Ajouter lien dans la Sidebar.
- [ ] **Integration & Auto-complétion**
    - [ ] Créer composant `ui/AutocompleteInput.tsx`.
    - [ ] Intégrer dans `Invoices` (Client), `Vouchers` (Bénéficiaire), `Salaries` (Employé).
    - [ ] Vue "Historique" : Sur la fiche contact, voir les transactions liées.

## 2. Gestion Budgétaire
Suivre les dépenses par rapport à un budget défini.

- [ ] **Backend**
    - [ ] Ajouter table `budgets` (category, monthlyLimit).
- [ ] **Frontend**
    - [ ] Page pour définir les budgets par catégorie (`pages/Budgets.tsx` ou modal dans Settings).
    - [ ] Calcul des % de consommation.
    - [ ] **Dashboard** : Ajouter des jauges (progress bars) pour les top catégories.

## 4. Rapports & Analyses Avancés
Améliorer la visibilité financière.

- [ ] **Filtres de Date**
    - [ ] Ajouter sélecteur de date (Début - Fin) sur la page `Reports`.
    - [ ] Recalculer les graphiques/tableaux selon la plage.
- [ ] **Évolution Trésorerie**
    - [ ] Ajouter graphique linéaire "Solde au cours du temps" sur `Reports`.
- [ ] **Export Grand Livre**
    - [ ] Bouton pour exporter Excel avec colonnes : Date, Type (Recette/Dépense), Tiers, Catégorie, Débit, Crédit.

## 5. Gestion des Sauvegardes (Backup Center)
Sécuriser les données.

- [ ] **Interface**
    - [ ] Dans `Settings`, ajouter section "Sauvegarde & Restauration".
    - [ ] Bouton "Créer une sauvegarde maintenant" (déjà existant en auto, mais manuel ici).
    - [ ] Bouton "Restaurer une sauvegarde" : Ouvrir dialog fichier `.db` et remplacer le fichier actuel (nécessite redémarrage app ou reload DB).

## 6. Notifications & Rappels
Alerter l'utilisateur.

- [ ] **Logique d'alerte**
    - [ ] Identifier factures "En attente" dont `dueDate` est passée ou proche.
    - [ ] Identifier documents proches expiration (si applicable).
- [ ] **UI**
    - [ ] Ajouter icône "Cloche" dans le Header.
    - [ ] Afficher badge rouge si alertes.
    - [ ] Dropdown listant les alertes.

---

**Ordre d'exécution suggéré :**
1. CRM (Fondation des données)
2. Budget (Valeur immédiate Dashboard)
3. Rapports (Amélioration visibilité)
4. Sauvegardes (Sécurité)
5. Notifications (UX)
