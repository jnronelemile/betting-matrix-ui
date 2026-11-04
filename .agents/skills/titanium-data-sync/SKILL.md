---
name: titanium-data-sync
description: >-
  Synchronise, valide, commite et pousse automatiquement les nouveaux jeux de données opérationnels du moteur TITANIUM dans public/data/titanium_v2/. À activer dès que l'utilisateur demande de mettre à jour les données titanium_v2, supprimer les anciens fichiers obsolètes, vérifier le build et publier sur Git en une seule commande.
---

# Titanium Data Sync

Ce skill automatise l'ensemble de la procédure de synchronisation des sorties de données générées par le moteur d'inférence **TITANIUM** dans l'application SPA React.

## Contexte & Objectif

Lorsqu'une nouvelle session de calcul TITANIUM produit de nouveaux fichiers JSON dans `public/data/titanium_v2/` :
1. De nouveaux fichiers (prédictions, tickets, séries, diagnostics) sont déposés ou mis à jour.
2. Les anciennes matrices de prédictions obsolètes doivent être nettoyées pour garantir qu'une seule session active ne soit servie.
3. Le build Vite (`npm run build`) doit être validé pour s'assurer que le plugin `titanium-manifest` et l'UI restent intègres.
4. Les données doivent être indexées dans Git (`git add public/data/titanium_v2/`), commitées (`chore(data): sync operational titanium_v2 datasets (<tag>)`), puis poussées vers `origin/<branche>`.

---

## Garde-fous & Sécurité

- **Ciblage strict** : Seul le répertoire `public/data/titanium_v2/` est indexé et commité par cette procédure. Les fichiers de configuration (`node_modules/`, `dist/`, code applicatif non validé) ne sont jamais mélangés au commit de synchronisation de données.
- **Validation bloquante** : Tout échec lors de `npm run build` interrompt immédiatement la procédure : aucun commit ni push n'est effectué si le build échoue.

---

## Exécution rapide

### Option 1 : Via le script automatisé du skill
Exécuter le script d'automatisation :

```bash
bash .agents/skills/titanium-data-sync/scripts/sync_data.sh
```

Ou via le script npm si configuré :

```bash
npm run sync:data
```

### Option 2 : Procédure pas à pas exécutée par l'agent

Si le script n'est pas utilisé directement, l'agent applique la séquence suivante :

1. **Nettoyage des anciennes prédictions** :
   Dans `public/data/titanium_v2/predictions/`, repérer le fichier `.json` le plus récent. Si d'anciens fichiers `.json` coexistent, supprimer les anciens :
   ```bash
   # Conserver uniquement le fichier le plus récent
   ls -t public/data/titanium_v2/predictions/*.json
   ```

2. **Validation obligatoire du build** :
   ```bash
   npm run build
   ```
   *Vérifier que la commande retourne le code 0.*

3. **Indexation ciblée des données** :
   ```bash
   git add public/data/titanium_v2/
   ```

4. **Création du commit** :
   Extraire la date ou le tag du fichier de prédiction actif (ex: `2026-11-04` ou `Week-02-A-Novembre-2026`) :
   ```bash
   git commit -m "chore(data): sync operational titanium_v2 datasets (<TAG>)"
   ```

5. **Publication** :
   ```bash
   git push origin $(git branch --show-current)
   ```
