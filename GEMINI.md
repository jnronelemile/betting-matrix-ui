# Betting Matrix UI - Project Instructions

Ce projet est l'interface utilisateur (Dashboard) du moteur d'inférence **Titanium V8.5**. Il permet de visualiser les probabilités, les signaux (Super Signals, True Favorites) et les analyses détaillées des matchs.

## Stack Technique
- **Framework** : React 18+ (Vite)
- **Styling** : Tailwind CSS + Custom CSS Animations
- **Icônes** : Lucide React
- **Gestion des données** : Fetching dynamique de fichiers JSON depuis `/public/data/`.

## Principes de Développement UI
1. **Fidélité au Moteur** : L'interface doit refléter précisément les données produites par `engine_v85.py`. Ne jamais arrondir ou modifier les probabilités côté client sans justification statistique.
2. **Visualisation de la Confiance** : Utiliser les codes couleurs et les icônes pour différencier les types de signaux (Ultra Safe, Safe Goals, etc.).
3. **Navigation Mobile-First** :
    - Navigation entre les onglets par balayage horizontal (Swipe).
    - Transitions directionnelles animées pour un meilleur feedback utilisateur.
4. **Performance de Filtrage** : Les filtres utilisent désormais les indicateurs natifs `Investment_Signals` du moteur v8.5.

## Flux de Données
- Le Dashboard charge `/data/index.json` pour connaître les fichiers de ligues disponibles (Backtests v8.5).
- Les détails d'un match sont récupérés via les fichiers dans `/data/matchups/`.
- **Mapping des équipes** : Toujours utiliser `team_mapping.json` pour normaliser les noms d'équipes.
- **Handicaps** : Utiliser `Standard_Handicaps` (v8.5) au lieu des anciens formats asiatiques.
---
## Roadmap UI (V8.5+)
- [x] Migration Titanium v8.5.
- [x] Navigation Swipe & Animations.
- [x] Exploitation 100% des données JSON (Team Goals, Justice Z-Scores).
- [ ] Graphiques d'évolution des lambdas (Poisson distribution charts).

