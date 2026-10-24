import React, { useState } from 'react';
import { Star, Folder, ArrowUpRight, Calendar, Clock, Radio, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { TeamLogo, LeagueLogo, getLeagueDisplayName } from '../../utils/teamLogos';
import { isMatchLive } from '../MatchList';

/**
 * Carte compacte de suivi d'un match favori (WEB-FAVORITES-001 - Watchlist Style)
 *
 * Principes ergonomiques :
 * 1. Hauteur compacte optimisée (140 à 160 px max) au lieu de 367 px.
 * 2. Ligne 1 : Ligue, date/heure, statut de session et actions discrètes (Classer, Retrait >= 44x44px).
 * 3. Ligne 2 : Confrontation Home vs Away proéminente avec logos et action « Voir match ».
 * 4. Ligne 3 : Badges de groupes discrets et alertes critiques (Kill Switch, Super Signal).
 * 5. Conservation intégrale du snapshot TITANIUM dans le stockage (zéro perte de métrique).
 * 6. Consultation optionnelle dépliable des détails pour les matchs historiques hors session.
 */
export function FavoriteMatchCard({
  favoriteMatch,
  currentMatch = null,
  groups = {},
  onOpenMatch,
  onClassify,
  onRemove,
  onSelectGroup
}) {
  if (!favoriteMatch) return null;

  const [showSnapshotDetails, setShowSnapshotDetails] = useState(false);

  const {
    id,
    displayHome,
    displayAway,
    homeRaw,
    awayRaw,
    league,
    date,
    hours,
    kickoff_utc,
    groupIds = [],
    snapshot = {},
    savedAt,
    originSession = {}
  } = favoriteMatch;

  const isLive = currentMatch ? isMatchLive(currentMatch) : false;
  const isAvailableInSession = Boolean(currentMatch);

  // Groupes d'appartenance
  const assignedGroups = (groupIds || [])
    .map(gId => groups[gId])
    .filter(Boolean);

  const formatProb = (val) => {
    if (val === null || val === undefined || isNaN(val)) return null;
    return `${(Number(val) * 100).toFixed(0)}%`;
  };

  return (
    <div
      data-testid="favorite-match-card"
      className={`flex flex-col rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
      isAvailableInSession
        ? 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
        : 'border-slate-200/80 dark:border-slate-800/80 opacity-95'
    }`}>
      {/* 1. Ligne Supérieure : Compétition, Actions & Métadonnées Temporelles / Statut */}
      <div className="bg-slate-50/80 dark:bg-slate-950/60 px-3 py-1.5 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1">
        {/* Rangée 1.1 : Compétition (gauche) & Commandes (droite) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <LeagueLogo league={league} size="xs" className="shrink-0" />
            <span
              className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate"
              title={getLeagueDisplayName(league)}
            >
              {getLeagueDisplayName(league)}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Bouton Classer (zone tactile 44x44px) */}
            <button
              type="button"
              onClick={() => onClassify(favoriteMatch, currentMatch)}
              className="relative w-8 h-8 min-w-[32px] min-h-[32px] sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors before:absolute before:inset-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-11 before:h-11 before:content-['']"
              title="Modifier les groupes d'appartenance de ce match"
              aria-label={`Modifier les groupes du match ${displayHome} vs ${displayAway}`}
            >
              <Folder size={15} />
            </button>

            {/* Bouton Étoile de Retrait (zone tactile 44x44px) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(favoriteMatch.id || favoriteMatch);
              }}
              data-no-swipe="true"
              aria-label={`Retirer ${displayHome} vs ${displayAway} des favoris`}
              aria-pressed="true"
              title="Retirer ce match des favoris"
              className="relative w-8 h-8 min-w-[32px] min-h-[32px] sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-amber-500 hover:bg-amber-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 before:absolute before:inset-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-11 before:h-11 before:content-['']"
            >
              <Star size={16} className="fill-amber-400 text-amber-500" />
            </button>
          </div>
        </div>

        {/* Rangée 1.2 : Date/Heure groupées logiquement (gauche) & Statuts séparés visuellement (droite) */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px] font-mono">
          {/* Date et Heure regroupées logiquement */}
          {(date || hours) ? (
            <div className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 shrink-0">
              {date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={11} className="opacity-70 shrink-0" />
                  <span>{date}</span>
                </span>
              )}
              {date && hours && <span className="text-slate-300 dark:text-slate-600">·</span>}
              {hours && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} className="opacity-70 shrink-0" />
                  <span>{hours}</span>
                </span>
              )}
            </div>
          ) : (
            <div />
          )}

          {/* Statuts visuellement séparés : LIVE estimé ET/OU Provenance session */}
          <div className="inline-flex items-center gap-1.5 shrink-0 ml-auto">
            {isLive && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0"
                title="Match estimé en cours (LIVE estimé)"
              >
                <Radio size={9} className="animate-pulse text-emerald-500 shrink-0" />
                <span>LIVE estimé</span>
              </span>
            )}
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold border shrink-0 ${
                isAvailableInSession
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
              title={isAvailableInSession ? "Match présent dans la session active" : "Match hors session (données historiques)"}
            >
              {isAvailableInSession ? 'Session active' : 'Hors session'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Ligne Centrale : Confrontation Proéminente & Action Voir match */}
      <div className="px-3 py-1.5 sm:py-2 flex items-center justify-between gap-2.5">
        {/* Confrontation avec Logos */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Home Team */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-0.5 border border-slate-200/80 dark:border-slate-700">
              <TeamLogo teamName={homeRaw} league={league} size="xs" alt={displayHome} className="w-full h-full object-contain" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              {displayHome}
            </span>
          </div>

          <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400 shrink-0">vs</span>

          {/* Away Team */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-0.5 border border-slate-200/80 dark:border-slate-700">
              <TeamLogo teamName={awayRaw} league={league} size="xs" alt={displayAway} className="w-full h-full object-contain" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              {displayAway}
            </span>
          </div>
        </div>

        {/* Action Voir match / Détails */}
        <div className="shrink-0">
          {isAvailableInSession ? (
            <button
              type="button"
              onClick={() => onOpenMatch(favoriteMatch, currentMatch)}
              className="min-h-[44px] px-3 inline-flex items-center gap-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-2xs"
              aria-label={`Consulter le tableau de bord du match ${displayHome} vs ${displayAway}`}
            >
              <span>Voir match</span>
              <ArrowUpRight size={13} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowSnapshotDetails(!showSnapshotDetails)}
              className="min-h-[44px] px-2.5 inline-flex items-center gap-1 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Afficher les probabilités enregistrées dans le snapshot"
              aria-expanded={showSnapshotDetails}
            >
              <span>Détails</span>
              {showSnapshotDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* 3. Ligne Inférieure : Groupes d'appartenance & Signaux Critiques */}
      <div className="px-3 pb-2 pt-0.5 flex flex-wrap items-center justify-between gap-1.5 text-xs">
        {/* Badges Groupes */}
        <div className="flex flex-wrap items-center gap-1 min-w-0">
          {assignedGroups.length === 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
              <Folder size={10} /> À classer
            </span>
          ) : (
            assignedGroups.map(grp => (
              <button
                key={grp.id}
                type="button"
                onClick={() => onSelectGroup && onSelectGroup(grp.id)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                title={`Filtrer sur "${grp.name}"`}
              >
                <Folder size={10} className="text-amber-500" />
                <span className="truncate max-w-[120px]">{grp.name}</span>
              </button>
            ))
          )}
        </div>

        {/* Signaux Critiques (Kill Switch, Super Signal) */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {snapshot.isKillSwitch && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
              <AlertTriangle size={10} className="text-rose-500" /> KILL SWITCH
            </span>
          )}
          {Array.isArray(snapshot.superSignals) && snapshot.superSignals.length > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25">
              SUPER
            </span>
          )}
          {snapshot.prob1 != null && (
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
              1: {formatProb(snapshot.prob1)}
            </span>
          )}
        </div>
      </div>

      {/* 4. Tiroir dépliable optionnel pour les matchs hors session (Détails snapshot) */}
      {showSnapshotDetails && !isAvailableInSession && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="grid grid-cols-4 gap-1.5 text-center pt-1.5">
            <div className="bg-white dark:bg-slate-800/80 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-[9px] font-bold text-slate-400">1</div>
              <div className="text-xs font-black font-mono text-slate-900 dark:text-white">{formatProb(snapshot.prob1) || 'N/D'}</div>
            </div>
            <div className="bg-white dark:bg-slate-800/80 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-[9px] font-bold text-slate-400">X</div>
              <div className="text-xs font-black font-mono text-slate-900 dark:text-white">{formatProb(snapshot.probX) || 'N/D'}</div>
            </div>
            <div className="bg-white dark:bg-slate-800/80 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-[9px] font-bold text-slate-400">2</div>
              <div className="text-xs font-black font-mono text-slate-900 dark:text-white">{formatProb(snapshot.prob2) || 'N/D'}</div>
            </div>
            <div className="bg-white dark:bg-slate-800/80 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-[9px] font-bold text-slate-400">O2.5</div>
              <div className="text-xs font-black font-mono text-slate-900 dark:text-white">{formatProb(snapshot.probO25) || 'N/D'}</div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-mono text-right pt-1">
            Sauvegardé le {savedAt ? new Date(savedAt).toLocaleDateString('fr-FR') : 'N/D'}
          </div>
        </div>
      )}
    </div>
  );
}
