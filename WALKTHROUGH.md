# Walkthrough - Nouvelles Fonctionnalités CRM & Finance

J'ai implémenté l'ensemble des fonctionnalités demandées pour transformer l'application en un outil complet de gestion administrative.

## 1. CRM Lite (Gestion des Tiers)
Gérez vos clients, fournisseurs et employés en un seul endroit.
- **Ajout de Contact** : Créez des fiches pour simplifier la saisie (nom, adresse, téléphone, email).
- **Auto-complétion** : Dans les factures, bons de caisse et salaires, commencez à taper un nom pour voir apparaître vos contacts enregistrés.
- **Historique** : Voir la liste des contacts (l'historique détaillé des transactions par contact sera disponible dans les rapports via le filtre par tiers).

## 2. Gestion Budgétaire
Définissez et suivez vos limites de dépenses mensuelles.
- **Configuration** : Allez dans la page "Budgets" pour définir des plafonds par catégorie (ex: "Transport" -> 50,000 F).
- **Suivi en temps réel** : Sur le Table de Bord et la page Budgets, des jauges de couleur vous indiquent la consommation du budget (Vert = OK, Jaune = Attention, Rouge = Dépassé).

## 3. Rapports & Analyses Avancés
La page "Rapports" a été refondue.
- **Filtres de date** : Choisissez une période précise (dates personnalisées).
- **Nouveaux Rapports** :
    - **Grand Livre** : Exportez un journal complet de toutes les opérations (Débit/Crédit) pour votre comptable.
    - **Détail Revenus/Dépenses** : Listes filtrables et exportables.
- **Graphiques** : Visualisez l'évolution de votre solde sur la période sélectionnée.

## 4. Centre de Sauvegarde (Backup)
Sécurisez vos données depuis la page "Paramètres".
- **Sauvegarde Manuelle** : Cliquez sur "Créer une sauvegarde" pour télécharger un fichier `.json` contenant toutes vos données.
- **Restauration** : Utilisez "Restaurer une sauvegarde" pour recharger vos données (utile en cas de changement d'ordinateur ou de problème).

## 5. Notifications & Rappels
Restez alerté des points critiques.
- Une **icône de cloche** 🔔 dans l'en-tête affiche le nombre d'alertes.
- **Alertes automatiques** :
    - Factures en retard de paiement.
    - Dépassement de budget mensuel.

## Comment tester ?
1. **CRM** : Créez un contact "Entreprise Test". Allez créer une facture et tapez "Entr...", sélectionnez le contact.
2. **Budgets** : Créez un budget "Alimentation" de 10,000 F. Ajoutez une dépense "Alimentation" de 12,000 F.
3. **Notifications** : Vérifiez la cloche en haut à droite. Vous devriez voir une alerte de dépassement de budget.
4. **Rapports** : Allez dans Rapports, choisissez "Grand Livre" et exportez en PDF.
5. **Sauvegarde** : Allez dans Paramètres, faites une sauvegarde, puis essayez de restaurer.

Tout est prêt pour utilisation !
