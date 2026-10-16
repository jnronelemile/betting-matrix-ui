# Instructions Antigravity / Gemini — betting-matrix-ui

> [!IMPORTANT]
> Les directives canoniques de développement, d'architecture et de sécurité pour ce dépôt sont centralisées dans **[AGENTS.md](file:///home/neldrox/IT/betting-matrix-ui/AGENTS.md)**.
>
> Tout agent IA intervenant sur ce projet doit se conformer strictement aux règles définies dans `AGENTS.md`.

## Synthèse opérationnelle
- **Rôle** : Modernisation de l'application React SPA existante (Vite / Tailwind / Lucide), sans créer d'interface parallèle.
- **Données** : Restitution pure des sorties du moteur TITANIUM. Sanctuarisation absolue de `public/data/` (notamment `public/data/titanium_v2/`). Aucun recalcul de probabilités, d'edges ou de risque côté frontend.
- **Terminologie** : Conservation stricte des libellés et signaux originaux en anglais.
- **Validation** : Vérification systématique par `npm run build` avant de valider une tâche.
- **Gouvernance Git** : Aucune suppression de fichier, aucun commit et aucun push sans accord explicite préalable.
