import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Check, Trash2, Edit2, Folder, FolderPlus, AlertCircle, Info, Star } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext.jsx';
import { getLeagueDisplayName } from '../../utils/teamLogos';

/**
 * Boîte de dialogue accessible de gestion des collections et groupes personnalisés (WEB-FAVORITES-001)
 *
 * Rôles :
 * 1. Créer un groupe nommé avec validation de duplicata (insensible à la casse).
 * 2. Renommer un groupe avec validation.
 * 3. Supprimer un groupe avec confirmation explicite intégrée (sans window.confirm natif).
 * 4. Associer / dissocier le match courant d'un ou plusieurs groupes (appartenance multiple).
 * 5. Conserver le match dans « À classer » s'il n'appartient à aucun groupe.
 * 6. Accessibilité complète : Navigation clavier, Escape pour fermer, retour du focus,
 *    attributs ARIA et touch target minimal de 44x44 px sur mobile.
 * 7. Prévient toute interférence avec le swipe tactile du dashboard (`data-no-swipe="true"`).
 */
export function GroupManagerModal({ isOpen, onClose, match = null, triggerRef = null }) {
  const {
    groupsList,
    groupCounts,
    getMatchFavorite,
    isMatchFavorite,
    addMatchFavorite,
    addMatchToGroup,
    removeMatchFromGroup,
    createGroup,
    renameGroup,
    deleteGroup
  } = useFavorites();

  const [newGroupName, setNewGroupName] = useState('');
  const [createError, setCreateError] = useState(null);

  // État de renommage inline : { groupId: string, name: string, error: string|null } | null
  const [editingGroup, setEditingGroup] = useState(null);

  // État de confirmation de suppression : groupId | null
  const [deletingGroupId, setDeletingGroupId] = useState(null);

  const modalRef = useRef(null);
  const inputRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Capture de l'élément actif avant ouverture pour restitution au déchargement
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = triggerRef?.current || document.activeElement;
      // Focus initial différé sur l'input de création
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen, triggerRef]);

  // Fermeture sur la touche Échap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Empêche le défilement du corps pendant l'ouverture du modal
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Données de favori pour le match courant
  const isFav = match ? isMatchFavorite(match) : false;
  const favoriteData = match ? getMatchFavorite(match) : null;
  const currentGroupIds = favoriteData?.groupIds || [];
  const assignedGroupCount = currentGroupIds.length;

  const homeName = match?.displayHome || match?.shortHome || match?.homeRaw || 'Équipe 1';
  const awayName = match?.displayAway || match?.shortAway || match?.awayRaw || 'Équipe 2';
  const leagueName = match?.League ? getLeagueDisplayName(match.League) : null;

  // Création d'un nouveau groupe
  const handleCreateGroup = (e) => {
    e?.preventDefault();
    setCreateError(null);
    const trimmed = (newGroupName || '').trim();
    if (!trimmed) {
      setCreateError('Veuillez saisir un nom pour le groupe.');
      return;
    }

    const res = createGroup(trimmed);
    if (!res.success) {
      setCreateError(res.error || 'Impossible de créer ce groupe.');
      return;
    }

    // Si un match est en cours de consultation, l'ajouter immédiatement au nouveau groupe
    if (match && res.group?.id) {
      if (!isFav) {
        addMatchFavorite(match, [res.group.id], { sessionId: match.session_id });
      } else {
        addMatchToGroup(match, res.group.id);
      }
    }

    setNewGroupName('');
    setCreateError(null);
  };

  // Bascule d'appartenance à un groupe pour le match courant
  const handleToggleGroup = (groupId) => {
    if (!match) return;

    if (!isFav) {
      // Le match n'était pas encore favori : on l'ajoute avec ce groupe
      addMatchFavorite(match, [groupId], { sessionId: match.session_id });
      return;
    }

    if (currentGroupIds.includes(groupId)) {
      // Retrait du groupe : s'il n'y a plus aucun groupe, il reste dans « À classer »
      removeMatchFromGroup(match, groupId);
    } else {
      // Ajout au groupe
      addMatchToGroup(match, groupId);
    }
  };

  // Enregistrement du renommage
  const handleSaveRename = (groupId) => {
    if (!editingGroup || editingGroup.groupId !== groupId) return;
    const trimmed = (editingGroup.name || '').trim();
    if (!trimmed) {
      setEditingGroup(prev => ({ ...prev, error: 'Le nom ne peut pas être vide.' }));
      return;
    }

    const res = renameGroup(groupId, trimmed);
    if (!res.success) {
      setEditingGroup(prev => ({ ...prev, error: res.error || 'Erreur lors du renommage.' }));
      return;
    }

    setEditingGroup(null);
  };

  // Suppression d'un groupe
  const handleConfirmDelete = (groupId) => {
    deleteGroup(groupId);
    setDeletingGroupId(null);
  };

  return (
    <div
      role="presentation"
      data-no-swipe="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-200 animate-fadeIn"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-manager-title"
        aria-describedby="group-manager-subtitle"
        ref={modalRef}
        data-no-swipe="true"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden focus:outline-none"
      >
        {/* En-tête de la boîte de dialogue */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
              <FolderPlus size={18} />
            </div>
            <div className="min-w-0">
              <h2 id="group-manager-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                Organiser dans mes groupes
              </h2>
              <p id="group-manager-subtitle" className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Gestion des collections personnalisées
              </p>
            </div>
          </div>

          <button
            type="button"
            data-no-swipe="true"
            aria-label="Fermer la boîte de dialogue"
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 shrink-0 ml-2"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corps défilable */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {/* Fiche récapitulative du match ciblé */}
          {match && (
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate mb-0.5">
                    {leagueName || match.League || 'Match sélectionné'}
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {homeName} <span className="text-slate-400 font-normal">vs</span> {awayName}
                  </div>
                  {match.date && (
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {match.date} {match.hours ? `· ${match.hours}` : ''}
                    </div>
                  )}
                </div>

                <div className="shrink-0 pt-0.5">
                  {assignedGroupCount === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      <Folder size={11} /> À classer
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      <Check size={11} /> {assignedGroupCount} groupe{assignedGroupCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Formulaire : Créer un nouveau groupe */}
          <form onSubmit={handleCreateGroup} className="space-y-1.5">
            <label htmlFor="new-group-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Créer un nouveau groupe
            </label>
            <div className="flex items-stretch gap-2">
              <input
                id="new-group-input"
                ref={inputRef}
                type="text"
                value={newGroupName}
                onChange={(e) => {
                  setNewGroupName(e.target.value);
                  if (createError) setCreateError(null);
                }}
                placeholder="Ex : Matchs du week-end, Combos sûrs..."
                maxLength={80}
                className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all min-h-[44px]"
              />
              <button
                type="submit"
                disabled={!newGroupName.trim()}
                data-no-swipe="true"
                className="px-4 py-2.5 min-h-[44px] rounded-xl font-semibold text-sm bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 transition-all flex items-center gap-1.5 shrink-0 shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1"
              >
                <Plus size={16} />
                <span>Créer</span>
              </button>
            </div>
            {createError && (
              <p className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 mt-1 animate-fadeIn">
                <AlertCircle size={13} className="shrink-0" />
                <span>{createError}</span>
              </p>
            )}
          </form>

          {/* Liste des groupes existants */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Vos Groupes ({groupsList.length})
              </h3>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Cochez pour ajouter / retirer
              </span>
            </div>

            {groupsList.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <Folder size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Aucun groupe personnalisé pour le moment.
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Créez votre premier groupe ci-dessus pour y classer cette rencontre.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                {groupsList.map((group) => {
                  const isInGroup = currentGroupIds.includes(group.id);
                  const count = groupCounts[group.id] || 0;
                  const isEditing = editingGroup?.groupId === group.id;
                  const isDeleting = deletingGroupId === group.id;

                  // Mode suppression confirmée inline
                  if (isDeleting) {
                    return (
                      <div
                        key={group.id}
                        className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 space-y-2 animate-fadeIn"
                      >
                        <p className="text-xs font-semibold leading-relaxed">
                          Supprimer le groupe <span className="font-bold underline">"{group.name}"</span> ?
                        </p>
                        <p className="text-[11px] opacity-80 leading-normal">
                          Les matchs ne seront pas supprimés : ils resteront dans vos favoris (dans « À classer » s'ils n'ont aucun autre groupe).
                        </p>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            data-no-swipe="true"
                            onClick={() => setDeletingGroupId(null)}
                            className="px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            data-no-swipe="true"
                            onClick={() => handleConfirmDelete(group.id)}
                            className="px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition-colors shadow-xs"
                          >
                            Confirmer la suppression
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Mode édition de nom inline
                  if (isEditing) {
                    return (
                      <div
                        key={group.id}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-amber-500/40 space-y-1.5 animate-fadeIn"
                      >
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingGroup.name}
                            onChange={(e) => setEditingGroup(prev => ({ ...prev, name: e.target.value, error: null }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveRename(group.id);
                              } else if (e.key === 'Escape') {
                                setEditingGroup(null);
                              }
                            }}
                            autoFocus
                            maxLength={80}
                            className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <button
                            type="button"
                            data-no-swipe="true"
                            aria-label="Enregistrer le renommage"
                            onClick={() => handleSaveRename(group.id)}
                            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            data-no-swipe="true"
                            aria-label="Annuler le renommage"
                            onClick={() => setEditingGroup(null)}
                            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        {editingGroup.error && (
                          <p className="text-[11px] text-rose-500 font-medium px-1">
                            {editingGroup.error}
                          </p>
                        )}
                      </div>
                    );
                  }

                  // Affichage standard du groupe avec case à cocher
                  return (
                    <div
                      key={group.id}
                      className={`group flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all ${
                        isInGroup
                          ? 'bg-amber-500/10 border-amber-500/40 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Zone cliquable principale pour basculer l'appartenance */}
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isInGroup}
                        aria-label={`${isInGroup ? 'Retirer du groupe' : 'Ajouter au groupe'} ${group.name}`}
                        data-no-swipe="true"
                        onClick={() => handleToggleGroup(group.id)}
                        className="flex items-center gap-3 min-w-0 flex-1 py-1.5 px-2 -my-1 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                            isInGroup
                              ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold'
                              : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-400'
                          }`}
                        >
                          {isInGroup && <Check size={13} strokeWidth={3} />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                            <span className="truncate">{group.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            {count} match{count > 1 ? 's' : ''} enregistré{count > 1 ? 's' : ''}
                          </div>
                        </div>
                      </button>

                      {/* Actions rapides sur le groupe : Renommer & Supprimer */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          data-no-swipe="true"
                          aria-label={`Renommer le groupe ${group.name}`}
                          onClick={() => setEditingGroup({ groupId: group.id, name: group.name, error: null })}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          data-no-swipe="true"
                          aria-label={`Supprimer le groupe ${group.name}`}
                          onClick={() => setDeletingGroupId(group.id)}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Note informative de gouvernance */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Info size={14} className="shrink-0 mt-0.5 text-amber-500" />
            <span className="leading-relaxed">
              Un match peut appartenir à plusieurs groupes. Supprimer un groupe ou retirer un match ne supprime jamais le match de vos favoris (il revient dans <strong className="text-slate-700 dark:text-slate-300 font-semibold">« À classer »</strong>).
            </span>
          </div>
        </div>

        {/* Pied de dialogue */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-end shrink-0">
          <button
            type="button"
            data-no-swipe="true"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl font-bold text-sm bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white active:scale-95 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
}
export default GroupManagerModal;
