# Directives pour Agents IA — betting-matrix-ui

Ce document constitue la **source canonique unique** des règles et directives de développement pour toute intervention d'agent IA dans ce dépôt.

---

## 1. Rôle & Nature du Projet
- **Application** : Dashboard SPA pour la visualisation et l'analyse des sorties du moteur d'inférence **TITANIUM**.
- **Stack** : React 18+ (Vite), Tailwind CSS, Lucide React.
- **Principe directeur** : **Moderniser l'application React existante, sans jamais créer une seconde interface** ni introduire de framework ou d'architecture parallèle.

---

## 2. Restitution des Données & Fidélité au Moteur
- **Consommation pure (Pas de simulation)** : L'interface restitue fidèlement les sorties TITANIUM. Elle ne doit en aucun cas recalculer les probabilités, les edges, les z-scores, ni les décisions de risque côté client.
- **Provenance & Signification** : Conserver l'intégrité, la provenance et la signification exacte de chaque métrique. Ne pas arrondir arbitrairement ou masquer des données brutes nécessaires à l'analyse.
- **Terminologie originale (Anglais)** : Respecter scrupuleusement les noms originaux des signaux, filtres et indicateurs techniques en anglais (ex : `TRUE FAVS`, `SUPER SIGNALS`, `HIGH CONF`, `JUSTICE TENSION`, `STREAK_CONFIRMED`, `STREAK_WARNING`, `Score_Exact_Confirmation`).

---

## 3. Périmètre & Sanctuarisation des Données
- **Zone sanctuarisée (Lecture seule absolue)** :
  - Le répertoire `public/data/` et en particulier `public/data/titanium_v2/` (ainsi que les jeux de données JSON d'historique) sont strictement en lecture seule.
  - **Interdiction formelle** de modifier, renommer, écraser ou supprimer un quelconque fichier de données JSON.
- **Zone applicative modifiable** :
  - Fichiers sources sous `src/` (composants, styles), `index.html`, `tailwind.config.js`, `package.json`.
- **Comportement du plugin `data-indexer` (Vite)** :
  - Le fichier `vite.config.js` inclut un plugin `data-indexer` qui réécrit automatiquement `public/data/index.json` et `public/data/matchups/index.json` au démarrage du serveur de développement et lors de `npm run build`.
  - **Précautions obligatoires** : Toujours vérifier les effets de ce plugin avant et après tout build pour s'assurer qu'aucune source de données critique n'est perturbée.

---

## 4. Principes de Développement UI
- **Modifications ciblées & simples** : Privilégier des interventions incrémentales, lisibles et modulaires, sans refonte disproportionnée.
- **Responsive & Mobile-First** : Préserver la navigation par onglets, les transitions fluides, les interactions tactiles (swipe) et la prise en charge du bouton retour mobile.
- **Thème Sombre / Clair** : Maintenir le système de double thème persistant (`dark` sur la racine HTML, synchronisé avec le `localStorage`).

---

## 5. Validation, Tests & Régressions
- Le projet ne disposant pas actuellement de suite de tests unitaires (Jest/Vitest), la commande de validation minimale obligatoire est :
  ```bash
  npm run build
  ```
- **Vérification systématique** : Avant de clore toute tâche, exécuter `npm run build` et vérifier l'absence d'erreurs de compilation, de syntaxe JSX, de dépendances manquantes ou de régressions dans la console.

---

## 6. Garde-fous & Sécurité
- **Aucune suppression sans autorisation** : Ne jamais supprimer de fichier existant (code, asset, configuration ou donnée) sans une validation explicite de l'utilisateur.
- **Aucun commit ni push sans autorisation** : L'agent ne doit jamais lancer de `git commit` ni de `git push` de manière autonome.
- **Préservation de l'index Git** : Ne pas modifier l'indexation historique de `dist/` ou `node_modules/` sans accord exprès.
