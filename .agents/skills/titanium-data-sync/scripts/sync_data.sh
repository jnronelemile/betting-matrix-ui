#!/usr/bin/env bash
set -euo pipefail

# Racine du dépôt git
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

DATA_DIR="public/data/titanium_v2"
PRED_DIR="$DATA_DIR/predictions"

echo "=== TITANIUM V2 DATA SYNC ==="

# 1. Vérifier l'existence du dossier de données
if [ ! -d "$DATA_DIR" ]; then
  echo "Erreur : Le dossier $DATA_DIR n'existe pas." >&2
  exit 1
fi

# 2. Nettoyage des anciennes matrices de prédictions si plusieurs fichiers sont présents
if [ -d "$PRED_DIR" ]; then
  shopt -s nullglob
  PRED_FILES=($(ls -t "$PRED_DIR"/*.json 2>/dev/null || true))
  shopt -u nullglob

  if [ "${#PRED_FILES[@]}" -gt 1 ]; then
    ACTIVE_PRED="${PRED_FILES[0]}"
    echo "Fichier de prédiction actif identifié : $(basename "$ACTIVE_PRED")"
    echo "Nettoyage des anciens fichiers de prédiction obsolètes..."
    for OLD_FILE in "${PRED_FILES[@]:1}"; do
      echo "  - Suppression : $(basename "$OLD_FILE")"
      rm -f "$OLD_FILE"
    done
  fi
fi

# 3. Contrôle des modifications Git dans public/data/titanium_v2/
CHANGES_COUNT=$(git status --porcelain "$DATA_DIR" | wc -l)
if [ "$CHANGES_COUNT" -eq 0 ]; then
  echo "Aucune modification détectée dans $DATA_DIR. Rien à synchroniser."
  exit 0
fi

echo "Modifications détectées dans $DATA_DIR ($CHANGES_COUNT entrées modifiées ou non suivies)."

# 4. Validation obligatoire (build Vite)
echo "Exécution de la validation obligatoire (npm run build)..."
npm run build

# 5. Indexation Git ciblée sur public/data/titanium_v2/
echo "Indexation des données dans Git..."
git add "$DATA_DIR"

# Vérifier si des modifications sont indexées
if git diff --cached --quiet -- "$DATA_DIR"; then
  echo "Aucune modification indexée dans $DATA_DIR après vérification."
  exit 0
fi

# 6. Détection de l'étiquette pour le message de commit
TAG=""
if [ -d "$PRED_DIR" ]; then
  LATEST_PRED=$(ls -t "$PRED_DIR"/*.json 2>/dev/null | head -n 1 || true)
  if [ -n "$LATEST_PRED" ]; then
    TAG=$(basename "$LATEST_PRED" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -n 1 || true)
    if [ -z "$TAG" ]; then
      TAG=$(basename "$LATEST_PRED" | grep -oE 'Week-[^._]+' | head -n 1 || true)
    fi
  fi
fi

if [ -z "$TAG" ]; then
  TAG="$(date +%Y-%m-%d)"
fi

COMMIT_MSG="chore(data): sync operational titanium_v2 datasets ($TAG)"
echo "Création du commit : $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

# 7. Push sur la branche distante courante
CURRENT_BRANCH="$(git branch --show-current)"
if [ -z "$CURRENT_BRANCH" ]; then
  CURRENT_BRANCH="main"
fi

echo "Publication vers origin/$CURRENT_BRANCH..."
git push origin "$CURRENT_BRANCH"

COMMIT_HASH="$(git rev-parse --short HEAD)"
echo "=== SYNCHRONISATION TERMINÉE AVEC SUCCÈS ==="
echo "Commit : $COMMIT_HASH sur origin/$CURRENT_BRANCH"
