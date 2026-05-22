# Betting Matrix UI - Project Instructions

Ce projet est l'interface utilisateur (Dashboard) du moteur d'inférence **Titanium V8.5**. Il permet de visualiser les probabilités, les signaux (Super Signals, True Favorites) et les analyses détaillées des matchs.

## Stack Technique
- **Framework** : React 18+ (Vite)
- **Styling** : Tailwind CSS + Custom CSS Animations
- **Icônes** : Lucide React
- **Gestion des données** : Fetching dynamique de fichiers JSON depuis `/public/data/`.

## Principes de Développement UI
1. **Fidélité au Moteur** : L'interface doit refléter précisément les données produites par `engine_v85.py`. Ne jamais arrondir ou modifier les probabilités côté client sans justification statistique.
2. **Terminologie Standard (Anglais)** : Pour garantir une traçabilité parfaite avec le moteur, tous les labels de signaux, indicateurs techniques et noms de filtres doivent rester en **Anglais original** (ex: TRUE FAVS, HIGH CONF, JUSTICE TENSION).
3. **Système de Thèmes** : L'interface supporte nativement un mode **Sombre** et un mode **Clair Élégant** via une classe racine `dark` et un état persistant.
4. **Visualisation de la Confiance** : Utiliser les codes couleurs et les icônes pour différencier les types de signaux (Ultra Safe, Safe Goals, etc.).
5. **Navigation Mobile-First** :
    - Navigation entre les onglets par balayage horizontal (Swipe) et menu auto-centré.
    - Transitions directionnelles fluides (300ms).
    - Support du bouton de retour système du téléphone.

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
- [x] Onglet "Series Stats" (H2H & Team Streaks).
- [ ] Graphiques d'évolution des lambdas (Poisson distribution charts).

