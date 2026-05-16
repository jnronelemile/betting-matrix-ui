# Betting Matrix UI - Project Instructions

Ce projet est l'interface utilisateur (Dashboard) du moteur d'inférence **Titanium V8.2**. Il permet de visualiser les probabilités, les signaux (Super Signals, True Favorites) et les analyses détaillées des matchs.

## Stack Technique
- **Framework** : React 18+ (Vite)
- **Styling** : Tailwind CSS (Configuration dans `tailwind.config.js`)
- **Icônes** : Lucide React
- **Gestion des données** : Fetching dynamique de fichiers JSON depuis `/public/data/`.

## Principes de Développement UI
1. **Fidélité au Moteur** : L'interface doit refléter précisément les données produites par `engine_v82.py`. Ne jamais arrondir ou modifier les probabilités côté client sans justification statistique.
2. **Visualisation de la Confiance** : Utiliser les codes couleurs et les icônes (Shield, Zap, Target) pour différencier les types de signaux.
3. **Performance de Filtrage** : Les filtres (Ligues, Signaux, Recherche) s'appliquent sur les données chargées en mémoire. Veiller à ce que `App.jsx` reste fluide même avec un grand nombre de matchs.
4. **Design "Dark Mode"** : L'esthétique actuelle est sombre et axée sur la lisibilité des données techniques ("Terminal-like"). Conserver cette cohérence visuelle lors de l'ajout de composants.

## Flux de Données
- Le Dashboard charge `/data/index.json` pour connaître les fichiers de ligues disponibles.
- Les détails d'un match sont récupérés via les fichiers dans `/data/matchups/`.
- **Mapping des équipes** : Toujours utiliser `team_mapping.json` pour normaliser les noms d'équipes et assurer la correspondance avec le calendrier des matchs.
- **Validation** : Toujours vérifier la structure de `selectedMatch` avant de rendre les composants dans `MatchDashboard`.

## Roadmap UI (V8.3)
- Amélioration de la vue mobile (Fix scrolling et overflow).
- Sidebar responsive avec masquage automatique lors de la consultation d'un match.
- Graphiques d'évolution des lambdas (Poisson distribution charts).

## UI Navigation Rules

- Le menu des matchs doit rester visible par défaut.
- Le menu des matchs peut être masqué uniquement manuellement.
- Le menu des ligues doit disparaître automatiquement lorsqu’un match est sélectionné.
- Après sélection d’un match, le dashboard correspondant doit s’afficher immédiatement.
