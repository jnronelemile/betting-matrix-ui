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

## Guide d'Intégration Données (Titanium V8.5)

### 1. Sources de données (Points d'entrée)
- **`CHOIX_FINAUX.json`** : Liste plate des meilleurs choix individuels (paris simples).
- **`TICKETS_ASSEMBLES.json`** : Structure complète des combinés (thématiques ou journaliers).
- **`LIGUES/[NOM_LIGUE]_REPORT.json`** : Base de données complète par ligue (Deep-dive & Vetos).

### 2. Règles d'affichage UI

#### Section A : "Choix de la Session" (Simple Bets)
- **Status Statistique** (`Streak_Status`) : 
    - `STREAK_CONFIRMED` ➔ Badge Vert (`🟢 Confirmé`) + Tooltip `Streak_Reason`.
    - `STREAK_NEUTRAL` ➔ Badge Jaune (`🟡 Neutre`).
- **Indicateur Live** : Si `Live_Betting_Recommendation` existe, afficher une alerte avec `Signal`, `Argument` et jauge de confiance (`Force`).

#### Section B : "Combinés & Sélections Multiples"
- **En-tête** : Afficher `metrics.cote_totale`, `metrics.badge_correlation` (🟢 Anti-Variance, 🔴 High, 🟡 Mixte) et `metrics.fiabilite_moyenne`.
- **Legs** : Itérer sur `legs` (Match, Marché, Cote, Statut).

#### Section C : "Deep-Dive / Analyse de Match"
- **Visualisation des Veto** : Si `Streak_Status == "STREAK_WARNING"`, afficher en grisé avec libellé `"VETO"` et `Streak_Reason`.
- **Confirmation Tactique** : Afficher `Score_Exact_Confirmation` pour expliquer la validation/rejet du modèle.

---

## Roadmap UI (V8.5+)
- [x] Migration Titanium v8.5.
- [x] Navigation Swipe & Animations.
- [x] Exploitation 100% des données JSON (Team Goals, Justice Z-Scores).
- [x] Onglet "Series Stats" (H2H & Team Streaks).
- [ ] Graphiques d'évolution des lambdas (Poisson distribution charts).

