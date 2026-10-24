import React, { useState, useMemo } from 'react';
import {
  Star,
  Bookmark,
  ArrowLeft,
  Download,
  Upload,
  Folder,
  Plus,
  SlidersHorizontal,
  Check,
  AlertCircle,
  Database,
  Layers,
  Clock,
  Calendar,
  Sparkles,
  Trophy,
  Filter
} from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext.jsx';
import { FavoriteMatchCard } from './FavoriteMatchCard.jsx';
import { FavoriteTicketCard } from './FavoriteTicketCard.jsx';
import { GroupManagerModal } from './GroupManagerModal.jsx';
import { findExactMatch } from '../../utils/favoritesStorage.js';

/**
 * Détermine si un ticket favori appartient à la session TITANIUM active.
 */
function isTicketInSession(favoriteTicket, sessionMetadata, currentTickets) {
  if (!favoriteTicket) return false;
  const currentSessionId = sessionMetadata?.sessionId;
  if (currentSessionId && favoriteTicket.originSession?.sessionId === currentSessionId) {
    return true;
  }
  const ticketId = favoriteTicket.ticketId;
  if (currentTickets) {
    if (Array.isArray(currentTickets.assembled) && currentTickets.assembled.some(t => (t.ticket_id || t.id) === ticketId)) {
      return true;
    }
    if (Array.isArray(currentTickets.finals) && currentTickets.finals.some(t => (t.ticket_id || t.id) === ticketId)) {
      return true;
    }
  }
  return false;
}

/**
 * Espace personnel « Mes favoris » (WEB-FAVORITES-001 - Phase 5)
 *
 * Principes architecturaux :
 * 1. Vue de premier niveau autonome, indépendante du Master Hub et de la matrice.
 * 2. Navigation à double volet : « Matchs » et « Tickets ».
 * 3. Gestion et filtrage par groupes personnalisés + collection « À classer ».
 * 4. Filtrage temporel des tickets : Tous / Session active / Historique.
 * 5. Restitution pure sans recalcul des métriques TITANIUM.
 * 6. Exportation JSON native et restauration.
 * 7. Accessibilité clavier, attributs ARIA et touch targets >= 44x44 px.
 */
export function FavoritesView({
  currentMatches = [],
  currentTickets = null,
  sessionMetadata = null,
  onNavigateToMatch,
  onNavigateToMatrix,
  onNavigateToHub
}) {
  const {
    store,
    totalMatchesCount,
    unclassifiedMatchesCount,
    groupCounts,
    totalTicketsCount,
    totalFavoritesCount,
    matchesList,
    ticketsList,
    groupsList,
    removeMatchFavorite,
    removeTicketFavorite,
    downloadFavoritesBackup,
    importFavoritesJson,
    persistenceWarning,
    persistenceError,
    dismissPersistenceWarning
  } = useFavorites();

  // Navigation interne par onglets
  const [activeTab, setActiveTab] = useState('matches'); // 'matches' | 'tickets'

  // Filtre de groupes pour les matchs
  const [selectedGroupId, setSelectedGroupId] = useState('ALL'); // 'ALL' | 'UNCLASSIFIED' | <groupId>

  // Filtre d'historique pour les tickets
  const [ticketsFilter, setTicketsFilter] = useState('ALL'); // 'ALL' | 'ACTIVE_SESSION' | 'HISTORICAL'

  // Modal de gestion des groupes
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [modalMatch, setModalMatch] = useState(null);

  // État de notification d'exportation/importation
  const [actionFeedback, setActionFeedback] = useState(null);

  // Décompte des tickets actifs vs historiques
  const activeTicketsCount = useMemo(() => {
    return ticketsList.filter(t => isTicketInSession(t, sessionMetadata, currentTickets)).length;
  }, [ticketsList, sessionMetadata, currentTickets]);

  const historicalTicketsCount = useMemo(() => {
    return Math.max(0, totalTicketsCount - activeTicketsCount);
  }, [totalTicketsCount, activeTicketsCount]);

  // Filtrage des matchs selon le groupe sélectionné
  const filteredMatches = useMemo(() => {
    if (selectedGroupId === 'ALL') {
      return matchesList;
    }
    if (selectedGroupId === 'UNCLASSIFIED') {
      return matchesList.filter(m => !m.groupIds || m.groupIds.length === 0);
    }
    return matchesList.filter(m => Array.isArray(m.groupIds) && m.groupIds.includes(selectedGroupId));
  }, [matchesList, selectedGroupId]);

  // Filtrage des tickets selon le filtre de statut
  const filteredTickets = useMemo(() => {
    if (ticketsFilter === 'ALL') return ticketsList;
    return ticketsList.filter(t => {
      const inSession = isTicketInSession(t, sessionMetadata, currentTickets);
      return ticketsFilter === 'ACTIVE_SESSION' ? inSession : !inSession;
    });
  }, [ticketsList, ticketsFilter, sessionMetadata, currentTickets]);

  // Export JSON
  const handleExport = () => {
    const success = downloadFavoritesBackup();
    if (success) {
      setActionFeedback({ type: 'success', message: 'Sauvegarde exportée avec succès.' });
      setTimeout(() => setActionFeedback(null), 3500);
    } else {
      setActionFeedback({ type: 'error', message: 'Échec du téléchargement de la sauvegarde.' });
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Import JSON
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (typeof content !== 'string') return;
        const res = importFavoritesJson(content, 'merge');
        if (res.success) {
          setActionFeedback({
            type: 'success',
            message: `Import réussi : ${res.summary.matchesCount} matchs, ${res.summary.ticketsCount} tickets, ${res.summary.groupsCount} groupes.`
          });
        } else {
          setActionFeedback({
            type: 'error',
            message: `Erreur d'import : ${res.errors?.[0] || 'Format JSON invalide'}`
          });
        }
      } catch (err) {
        setActionFeedback({ type: 'error', message: `Erreur de lecture du fichier : ${err.message}` });
      } finally {
        setTimeout(() => setActionFeedback(null), 4000);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Ouverture du modal de classification pour un match
  const handleOpenClassify = (favoriteMatch, currentMatch) => {
    setModalMatch(currentMatch || favoriteMatch);
    setIsGroupModalOpen(true);
  };

  // Ouverture du modal de gestion générale des groupes
  const handleOpenGroupManager = () => {
    setModalMatch(null);
    setIsGroupModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-100/90 dark:bg-slate-950 transition-colors duration-300">
      {/* Alerte de persistance si problème localStorage */}
      {persistenceWarning && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>
              {persistenceError?.message ||
                "Avertissement de stockage local : l'espace est restreint ou en mémoire temporaire."}
            </span>
          </div>
          <button
            type="button"
            onClick={dismissPersistenceWarning}
            className="text-[11px] font-bold underline hover:opacity-80 ml-2"
          >
            Ignorer
          </button>
        </div>
      )}

      {/* Notification d'action (export / import) */}
      {actionFeedback && (
        <div
          className={`px-4 py-2 text-xs font-medium flex items-center justify-between border-b transition-all ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{actionFeedback.message}</span>
          </div>
        </div>
      )}

      {/* Barre d'en-tête de l'espace favoris */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur-sm px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onNavigateToMatrix && (
            <button
              type="button"
              onClick={onNavigateToMatrix}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="Retourner à la matrice des matchs"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Matrice</span>
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <Star size={20} className="text-amber-500 fill-amber-500" />
                <span>Mes favoris</span>
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                {totalFavoritesCount} {totalFavoritesCount > 1 ? 'enregistrements' : 'enregistrement'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tracking-tight hidden sm:block">
              Espace personnel persistant • Groupes personnalisés & tickets Master Hub
            </p>
          </div>
        </div>

        {/* Actions d'exportation et d'importation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            title="Exporter tous vos favoris et groupes au format JSON"
            aria-label="Sauvegarder les favoris au format JSON"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Sauvegarder</span>
            <span className="text-[10px] font-mono uppercase text-slate-400">JSON</span>
          </button>

          <label
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm cursor-pointer focus-within:ring-2 focus-within:ring-emerald-500"
            title="Importer une sauvegarde JSON précédente"
            aria-label="Importer une sauvegarde JSON"
          >
            <Upload size={15} />
            <span className="hidden sm:inline">Importer</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {/* Onglets principaux : Matchs vs Tickets */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-8 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700/60" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'matches'}
            onClick={() => setActiveTab('matches')}
            className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'matches'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Star
              size={15}
              className={activeTab === 'matches' ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}
            />
            <span>Matchs</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                activeTab === 'matches'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {totalMatchesCount}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tickets'}
            onClick={() => setActiveTab('tickets')}
            className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'tickets'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Bookmark
              size={15}
              className={activeTab === 'tickets' ? 'text-emerald-500 fill-emerald-500' : 'text-slate-400'}
            />
            <span>Tickets</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                activeTab === 'tickets'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {totalTicketsCount}
            </span>
          </button>
        </div>

        {/* Bouton Master Hub rapide si l'utilisateur est sur l'onglet tickets */}
        {activeTab === 'tickets' && onNavigateToHub && (
          <button
            type="button"
            onClick={onNavigateToHub}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          >
            <Trophy size={15} />
            <span className="hidden sm:inline">Ouvrir Master Hub</span>
          </button>
        )}
      </div>

      {/* Corps principal défilable */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
        {/* ========================================================================= */}
        {/* ONGLET 1 : MATCHS FAVORIS                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'matches' && (
          <div className="space-y-5">
            {/* Barre de filtrage par groupes */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 snap-x">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold shrink-0 mr-1 flex items-center gap-1">
                  <Filter size={12} />
                  <span>Groupes :</span>
                </span>

                {/* Filtre « Tous » */}
                <button
                  type="button"
                  onClick={() => setSelectedGroupId('ALL')}
                  className={`min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 snap-start border ${
                    selectedGroupId === 'ALL'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span>Tous</span>
                  <span className="text-[10px] font-mono opacity-80">({totalMatchesCount})</span>
                </button>

                {/* Filtre virtuel « À classer » */}
                <button
                  type="button"
                  onClick={() => setSelectedGroupId('UNCLASSIFIED')}
                  className={`min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 snap-start border ${
                    selectedGroupId === 'UNCLASSIFIED'
                      ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                      : unclassifiedMatchesCount > 0
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                        : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <Folder size={13} className="text-amber-500" />
                  <span>À classer</span>
                  <span className="text-[10px] font-mono">({unclassifiedMatchesCount})</span>
                </button>

                {/* Groupes personnalisés utilisateur */}
                {groupsList.map(group => {
                  const count = groupCounts[group.id] || 0;
                  const isSelected = selectedGroupId === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 snap-start border ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <Folder size={13} className={isSelected ? 'text-white' : 'text-emerald-500'} />
                      <span className="max-w-[140px] truncate">{group.name}</span>
                      <span className="text-[10px] font-mono opacity-80">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Bouton de gestion générale des groupes */}
              <button
                type="button"
                onClick={handleOpenGroupManager}
                className="min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors shrink-0"
              >
                <SlidersHorizontal size={14} />
                <span>Gérer les groupes</span>
              </button>
            </div>

            {/* Liste des cartes de match ou état vide */}
            {filteredMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-3.5">
                {filteredMatches.map(favoriteMatch => {
                  // Recherche de la correspondance exacte dans la session en cours
                  const currentMatch = findExactMatch(
                    currentMatches,
                    favoriteMatch,
                    favoriteMatch.league,
                    favoriteMatch.date
                  );

                  return (
                    <FavoriteMatchCard
                      key={favoriteMatch.id}
                      favoriteMatch={favoriteMatch}
                      currentMatch={currentMatch}
                      groups={store.groups}
                      onOpenMatch={(fav, curr) => {
                        if (onNavigateToMatch && (curr || fav)) {
                          onNavigateToMatch(curr || fav);
                        }
                      }}
                      onClassify={(fav, curr) => handleOpenClassify(fav, curr)}
                      onRemove={(favIdOrObj) => removeMatchFavorite(favIdOrObj)}
                      onSelectGroup={(groupId) => setSelectedGroupId(groupId)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center max-w-xl mx-auto my-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-4">
                  <Star size={28} />
                </div>

                {totalMatchesCount === 0 ? (
                  <>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Aucun match dans vos favoris
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-mono mb-6 max-w-md mx-auto">
                      Enregistrez les rencontres qui vous intéressent en cliquant sur l’étoile ★
                      disponible sur les cartes de la matrice ou dans l’en-tête du tableau de bord.
                    </p>
                    {onNavigateToMatrix && (
                      <button
                        type="button"
                        onClick={onNavigateToMatrix}
                        className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all"
                      >
                        <Sparkles size={16} />
                        <span>Explorer la matrice des matchs</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Aucun match dans ce groupe
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-mono mb-6 max-w-md mx-auto">
                      Le groupe sélectionné ne contient aucun match favori pour le moment.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedGroupId('ALL')}
                        className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      >
                        <span>Afficher tous les matchs ({totalMatchesCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenGroupManager}
                        className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      >
                        <SlidersHorizontal size={14} />
                        <span>Gérer les groupes</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 2 : TICKETS FAVORIS                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'tickets' && (
          <div className="space-y-5">
            {/* Barre de filtrage par statut temporel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 snap-x">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold shrink-0 mr-1 flex items-center gap-1">
                  <Clock size={12} />
                  <span>Statut :</span>
                </span>

                <button
                  type="button"
                  onClick={() => setTicketsFilter('ALL')}
                  className={`min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 snap-start border ${
                    ticketsFilter === 'ALL'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span>Tous</span>
                  <span className="text-[10px] font-mono opacity-80">({totalTicketsCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTicketsFilter('ACTIVE_SESSION')}
                  className={`min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 snap-start border ${
                    ticketsFilter === 'ACTIVE_SESSION'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : activeTicketsCount > 0
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <Sparkles size={13} className="text-emerald-500" />
                  <span>Session active</span>
                  <span className="text-[10px] font-mono">({activeTicketsCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTicketsFilter('HISTORICAL')}
                  className={`min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 snap-start border ${
                    ticketsFilter === 'HISTORICAL'
                      ? 'bg-slate-700 text-white border-slate-600 shadow-sm'
                      : historicalTicketsCount > 0
                        ? 'bg-slate-200/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <Database size={13} className="text-slate-400" />
                  <span>Historique</span>
                  <span className="text-[10px] font-mono">({historicalTicketsCount})</span>
                </button>
              </div>

              {onNavigateToHub && (
                <button
                  type="button"
                  onClick={onNavigateToHub}
                  className="min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors shrink-0"
                >
                  <Trophy size={14} />
                  <span>Accéder au Master Hub</span>
                </button>
              )}
            </div>

            {/* Grille des tickets favoris ou état vide */}
            {filteredTickets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-3.5">
                {filteredTickets.map(favoriteTicket => {
                  const isCurrent = isTicketInSession(favoriteTicket, sessionMetadata, currentTickets);
                  return (
                    <FavoriteTicketCard
                      key={favoriteTicket.ticketId}
                      favoriteTicket={favoriteTicket}
                      isCurrentSession={isCurrent}
                      currentMatches={currentMatches}
                      onNavigateToMatch={(targetMatch) => {
                        if (onNavigateToMatch) {
                          onNavigateToMatch(targetMatch);
                        }
                      }}
                      onRemove={(ticketIdOrObj) => removeTicketFavorite(ticketIdOrObj)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center max-w-xl mx-auto my-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                  <Bookmark size={28} />
                </div>

                {totalTicketsCount === 0 ? (
                  <>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Aucun ticket dans vos favoris
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-mono mb-6 max-w-md mx-auto">
                      Enregistrez vos combinaisons et sélections TITANIUM en cliquant sur l’icône
                      de signet dans le Master Hub pour conserver leur composition et leurs métriques.
                    </p>
                    {onNavigateToHub && (
                      <button
                        type="button"
                        onClick={onNavigateToHub}
                        className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all"
                      >
                        <Trophy size={16} />
                        <span>Explorer le Master Hub</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Aucun ticket dans cette catégorie
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-mono mb-6 max-w-md mx-auto">
                      Aucun ticket ne correspond au filtre actif.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTicketsFilter('ALL')}
                      className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    >
                      <span>Afficher tous les tickets ({totalTicketsCount})</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Boîte de dialogue de gestion des groupes */}
      <GroupManagerModal
        isOpen={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false);
          setModalMatch(null);
        }}
        match={modalMatch}
      />
    </div>
  );
}
export default FavoritesView;
