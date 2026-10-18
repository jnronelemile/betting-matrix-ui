import React, { useState, useMemo, useEffect } from 'react';
import { Badge } from './ui/Badge';
import { ChevronRight, AlertTriangle, ChevronDown, Calendar, Maximize2, Minimize2, Trophy, Radio } from 'lucide-react';
import { TIME_SLOTS, getLegTimeSlot } from '../utils/ticketFilters';

const formatTimeAMPM = (timeStr) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${minutes} ${ampm}`;
};

/**
 * Résout de façon déterministe l'heure affichée pour une carte de match :
 * 1. Priorité absolue à kickoff_utc converti dans le fuseau d'affichage local (format 12h AM/PM).
 * 2. Repli sécurisé sur match.hours ou match.Heure.
 */
export const getMatchDisplayTime = (match) => {
  if (!match) return '';
  if (match.kickoff_utc) {
    const d = new Date(match.kickoff_utc);
    if (!isNaN(d.getTime())) {
      try {
        return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
      } catch (_) {
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    }
  }
  if (match.hours) return formatTimeAMPM(match.hours);
  if (match.Heure) return formatTimeAMPM(match.Heure);
  return '';
};

/**
 * Convention d'affichage : fenêtre conventionnelle de match LIVE estimé (0 à 115 minutes après coup d'envoi).
 * Note : Le frontend ne disposant pas du statut officiel du match en direct,
 * cette fenêtre est un indicateur visuel conventionnel ("LIVE estimé") et non une attestation d'état réel.
 */
export const ESTIMATED_LIVE_WINDOW_MINUTES = 115;

/**
 * Détection déterministe de la fenêtre de match LIVE estimé [0 à 115 minutes après coup d'envoi].
 * Privilégie kickoff_utc avec comparaison en millisecondes UTC pour immunité aux fuseaux horaires.
 * Fallback déterministe sur date et hours locales en l'absence de kickoff_utc (ambiguïté de fuseau possible).
 */
export const isMatchLive = (match, nowMs = Date.now()) => {
  if (!match) return false;

  // 1. Priorité absolue au timestamp canonique kickoff_utc (comparaison UTC pure)
  if (match.kickoff_utc) {
    const kickoffMs = new Date(match.kickoff_utc).getTime();
    if (!isNaN(kickoffMs)) {
      const diffMinutes = (nowMs - kickoffMs) / 60000;
      return diffMinutes >= 0 && diffMinutes <= ESTIMATED_LIVE_WINDOW_MINUTES;
    }
  }

  // 2. Fallback déterministe sur date et hours locales
  // Note de fuseau : date + hours sont interprétées dans le fuseau du navigateur en fallback (ambiguïté potentielle)
  const dateVal = match.date || match.Date;
  const hoursVal = match.hours || match.Hours;
  if (dateVal && hoursVal && dateVal !== 'Date Inconnue' && dateVal !== 'Unknown Date') {
    const datePart = String(dateVal).split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const [h, m] = String(hoursVal).split(':').map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(h) && !isNaN(m)) {
      const matchTimeLocal = new Date(year, month - 1, day, h, m).getTime();
      const diffMinutes = (nowMs - matchTimeLocal) / 60000;
      return diffMinutes >= 0 && diffMinutes <= ESTIMATED_LIVE_WINDOW_MINUTES;
    }
  }

  return false;
};

const formatDate = (dateStr) => {
  if (!dateStr || dateStr === 'Date Inconnue' || dateStr === 'Unknown Date') return dateStr || 'Date Inconnue';
  const date = new Date(`${dateStr}T12:00:00`);
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  let formatted = date.toLocaleDateString('fr-FR', options);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const formatDateShort = (dateStr) => {
  if (!dateStr || dateStr === 'Date Inconnue' || dateStr === 'Unknown Date') return '';
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
};

/**
 * Carte de match unitaire en 3 étages compacts (WEB-P3-C) :
 * 1. Métadonnées contextuelles (Ligue, date si multi-dates, heure de coup d'envoi & statut live)
 * 2. Équipes sur 2 lignes nettes (Domicile au-dessus, Extérieur en dessous)
 * 3. Signaux analytiques critiques (sans badge "Standard" non-informatif)
 */
function MatchCard({ match, isSelected, onSelectMatch, isMultiDate = false, currentTime }) {
  const isFalseFav = match.Risk_Management_Context?.Tactical_Red_Flags?.IS_FALSE_FAVORITE;
  const tension = match.Risk_Management_Context?.Team_Psychology?.net_justice_tension || 0;
  const probs = match.True_Probabilities || {};
  const isKillSwitch = match.Risk_Management_Context?.Investment_Signals?.IS_KILL_SWITCH_ACTIVE ||
    ((probs.PROB_1 === 0 || probs.PROB_1 == null) && (probs.PROB_O25 === 0 || probs.PROB_O25 == null));
  const investSignals = match.Risk_Management_Context?.Investment_Signals || {};

  const parts = (match.Matchup || '').split(' vs ');
  const homeDisplay = match.displayHome || match.shortHome || parts[0] || 'Domicile';
  const awayDisplay = match.displayAway || match.shortAway || parts[1] || 'Extérieur';
  const displayTime = getMatchDisplayTime(match);

  // Signaux décisionnels critiques (Standard est exclu conformément aux arbitrages validés)
  const hasSignals = match.isFinalPick || isKillSwitch || investSignals.IS_ULTRA_SAFE ||
    investSignals.IS_SAFE_GOALS || isFalseFav || tension > 5;

  return (
    <div
      onClick={() => onSelectMatch(match)}
      className={`group relative rounded-xl p-3 cursor-pointer transition-all duration-200 border ${
        isSelected
          ? 'bg-emerald-500/[0.05] dark:bg-emerald-500/[0.08] border-l-4 border-l-emerald-500 border-t border-r border-b border-emerald-500/40 dark:border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 shadow-xs'
      }`}
    >
      {/* Étage 1 : Métadonnées & Horodatage (Top Row) */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {match.League && (
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/70 dark:border-slate-700/70 truncate">
              {match.League}
            </span>
          )}
          {isMultiDate && match.date && match.date !== 'Date Inconnue' && (
            <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-tight">
              {formatDateShort(match.date)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {displayTime && (
            <div className="flex items-center gap-1 font-mono font-bold text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200/50 dark:border-blue-800/50">
              {isMatchLive(match, currentTime) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]" title={`Fenêtre de match conventionnelle (LIVE estimé [0–${ESTIMATED_LIVE_WINDOW_MINUTES} min])`} />
              )}
              <span>{displayTime}</span>
            </div>
          )}
          <ChevronRight
            size={16}
            className={`transition-transform duration-200 ${
              isSelected
                ? 'text-emerald-500 translate-x-0.5'
                : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400'
            }`}
          />
        </div>
      </div>

      {/* Étage 2 : Bloc Équipes sur 2 Lignes (Core Team Stack) */}
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" title="Domicile" />
          <span className="font-sans font-semibold text-[13px] text-slate-900 dark:text-slate-100 leading-tight truncate">
            {homeDisplay}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-transparent border border-slate-400 dark:border-slate-500 shrink-0" title="Extérieur" />
          <span className="font-sans font-medium text-[13px] text-slate-700 dark:text-slate-300 leading-tight truncate">
            {awayDisplay}
          </span>
        </div>
      </div>

      {/* Étage 3 : Signaux d'analyse décisionnels (uniquement si actifs) */}
      {hasSignals && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          {match.isFinalPick && (
            <Badge variant="success" className="bg-emerald-600 text-white border-emerald-500 shadow-xs flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5">
              <Trophy size={10} /> MASTER PICK
            </Badge>
          )}
          {isKillSwitch && (
            <Badge variant="danger" className="flex items-center gap-1 bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 font-mono text-[9px] px-1.5 py-0.5">
              <AlertTriangle size={10} /> KILL-SWITCH
            </Badge>
          )}
          {investSignals.IS_ULTRA_SAFE && (
            <Badge variant="success" className="text-[9px] px-1.5 py-0.5 font-mono">ULTRA SAFE</Badge>
          )}
          {investSignals.IS_SAFE_GOALS && (
            <Badge variant="info" className="text-[9px] px-1.5 py-0.5 font-mono">SAFE GOALS</Badge>
          )}
          {isFalseFav && !isKillSwitch && (
            <Badge variant="danger" className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 font-mono">
              <AlertTriangle size={10} /> False Fav
            </Badge>
          )}
          {tension > 5 && (
            <Badge variant="warning" className="text-[9px] px-1.5 py-0.5 font-mono">High Tension</Badge>
          )}
        </div>
      )}
    </div>
  );
}

export function MatchList({ matches, selectedMatch, onSelectMatch }) {
  const [collapsedDates, setCollapsedDates] = useState({});
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('ALL');
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Actualisation temporelle périodique toutes les 60s avec nettoyage strict du timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Décompte des matchs dans la fenêtre conventionnelle LIVE estimé [0 à 115 min après coup d'envoi]
  const liveMatchesCount = useMemo(() => {
    return matches.filter(m => isMatchLive(m, currentTime)).length;
  }, [matches, currentTime]);

  // Décompte dynamique par créneau horaire (respecte showLiveOnly pour ne pas afficher de compteurs faussés)
  const timeSlotCounts = useMemo(() => {
    const pool = showLiveOnly ? matches.filter(m => isMatchLive(m, currentTime)) : matches;
    const counts = {
      ALL: pool.length,
      MATIN: 0,
      APRES_MIDI: 0,
      SOIR: 0,
      NUIT: 0
    };
    for (const m of pool) {
      const slot = getLegTimeSlot(m);
      if (counts[slot] !== undefined) {
        counts[slot]++;
      }
    }
    return counts;
  }, [matches, showLiveOnly, currentTime]);

  // Filtrage combiné : LIVE estimé et/ou Créneau horaire
  const visibleMatches = useMemo(() => {
    let result = matches;
    if (showLiveOnly) {
      result = result.filter(m => isMatchLive(m, currentTime));
    }
    if (selectedTimeSlot !== 'ALL') {
      result = result.filter(m => getLegTimeSlot(m) === selectedTimeSlot);
    }
    return result;
  }, [matches, showLiveOnly, selectedTimeSlot, currentTime]);

  // 1. Groupement des matchs visibles par date
  const groupedMatches = useMemo(() => {
    return visibleMatches.reduce((acc, match) => {
      const d = match.date || 'Date Inconnue';
      if (!acc[d]) acc[d] = [];
      acc[d].push(match);
      return acc;
    }, {});
  }, [visibleMatches]);

  // 2. Tri chronologique strict des journées de championnat
  const sortedDates = useMemo(() => {
    return Object.keys(groupedMatches).sort((a, b) => {
      if (a === 'Date Inconnue') return 1;
      if (b === 'Date Inconnue') return -1;
      return a.localeCompare(b);
    });
  }, [groupedMatches]);

  // 3. Tri chronologique strict des rencontres par heure à l'intérieur de chaque groupe de date
  const sortedGroupedMatches = useMemo(() => {
    const sorted = {};
    const comparator = (a, b) => {
      const timeA = a.hours || '99:99';
      const timeB = b.hours || '99:99';
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      const nameA = a.displayHome || a.shortHome || a.Matchup || '';
      const nameB = b.displayHome || b.shortHome || b.Matchup || '';
      return nameA.localeCompare(nameB);
    };

    sortedDates.forEach(date => {
      sorted[date] = [...groupedMatches[date]].sort(comparator);
    });
    return sorted;
  }, [groupedMatches, sortedDates]);

  const toggleDate = (date) => {
    setCollapsedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  const expandAll = () => setCollapsedDates({});
  const collapseAll = () => {
    const allCollapsed = {};
    sortedDates.forEach(date => { allCollapsed[date] = true; });
    setCollapsedDates(allCollapsed);
  };

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <div className="flex flex-col gap-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:pb-4 transition-colors duration-300">
      {/* Barre d'actions supérieure : Filtre LIVE estimé & Contrôles Déplier/Replier */}
      <div className="flex items-center justify-between mb-0.5 px-1 gap-2">
        {/* Bouton de filtrage LIVE estimé (prioritaire, compact et immédiatement accessible) */}
        <button
          type="button"
          onClick={() => setShowLiveOnly(prev => !prev)}
          aria-pressed={showLiveOnly}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold uppercase font-mono transition-all border ${
            showLiveOnly
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
          }`}
          title={`Afficher uniquement les matchs estimés en cours (fenêtre conventionnelle 0 à ${ESTIMATED_LIVE_WINDOW_MINUTES} min après coup d'envoi UTC)`}
        >
          <Radio size={13} className={showLiveOnly ? 'animate-pulse text-rose-500' : 'text-slate-400'} />
          <span>LIVE estimé</span>
          {liveMatchesCount > 0 && (
            <span className={`px-1.5 rounded-full text-[9px] font-mono leading-none py-0.5 ${
              showLiveOnly
                ? 'bg-rose-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {liveMatchesCount}
            </span>
          )}
        </button>

        {/* Contrôles d'accordéons Déplier / Replier (affichés dès qu'au moins 2 journées existent) */}
        {sortedDates.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="Tout déplier"
            >
              <Maximize2 size={11} /> <span>Déplier</span>
            </button>
            <div className="w-px h-3 bg-slate-200 dark:bg-slate-800" />
            <button
              type="button"
              onClick={collapseAll}
              className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              title="Tout replier"
            >
              <Minimize2 size={11} /> <span>Replier</span>
            </button>
          </div>
        )}
      </div>

      {/* Rangée de filtres par créneaux horaires (Matin, Après-midi, Soir, Nuit) sous le bouton LIVE estimé */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1 scrollbar-none text-[11px]">
        <button
          type="button"
          onClick={() => setSelectedTimeSlot('ALL')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-medium transition-all shrink-0 border ${
            selectedTimeSlot === 'ALL'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <span>Tous</span>
          <span className={`px-1.5 rounded-full text-[9px] font-mono leading-none py-0.5 ${
            selectedTimeSlot === 'ALL' ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}>
            {timeSlotCounts.ALL}
          </span>
        </button>
        {Object.values(TIME_SLOTS).map(slot => {
          const count = timeSlotCounts[slot.id] || 0;
          const isSelected = selectedTimeSlot === slot.id;
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => setSelectedTimeSlot(slot.id)}
              title={`${slot.label} (${slot.hoursRange}) : ${slot.description}`}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-medium transition-all shrink-0 border ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span>{slot.label}</span>
              <span className={`px-1.5 rounded-full text-[9px] font-mono leading-none py-0.5 ${
                isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* État vide classique (aucun match pour les filtres actifs) */}
      {matches.length === 0 && (
        <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-sm">
          No matches found for this filter.
        </div>
      )}

      {/* État vide spécifique quand le filtre LIVE estimé ne trouve aucun match */}
      {matches.length > 0 && visibleMatches.length === 0 && showLiveOnly && (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="p-2 rounded-full bg-rose-500/10 text-rose-500 mb-2">
            <Radio size={20} />
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Aucun match en cours (LIVE estimé)
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            Aucune rencontre dans la fenêtre conventionnelle [0–{ESTIMATED_LIVE_WINDOW_MINUTES} min après coup d'envoi].
          </span>
          <button
            type="button"
            onClick={() => setShowLiveOnly(false)}
            className="mt-3 px-3 py-1 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
          >
            Afficher tous les matchs
          </button>
        </div>
      )}

      {/* État vide spécifique quand un créneau horaire ne trouve aucun match */}
      {matches.length > 0 && visibleMatches.length === 0 && !showLiveOnly && selectedTimeSlot !== 'ALL' && (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Aucun match sur ce créneau ({TIME_SLOTS[selectedTimeSlot]?.label || selectedTimeSlot})
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            Aucune rencontre trouvée pour la plage horaire {TIME_SLOTS[selectedTimeSlot]?.hoursRange}.
          </span>
          <button
            type="button"
            onClick={() => setSelectedTimeSlot('ALL')}
            className="mt-3 px-3 py-1 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
          >
            Afficher tous les créneaux horaires
          </button>
        </div>
      )}

      {/* Rendu des groupes de dates avec tri chronologique interne par heure */}
      {sortedDates.map((date) => {
        const isCollapsed = collapsedDates[date];
        const isToday = date === todayStr;
        const dayMatches = sortedGroupedMatches[date] || [];

        return (
          <div key={date} className="flex flex-col gap-2">
            {/* En-tête de date cliquable différencié des cartes (Correction B : accent indigo/bleu sobre) */}
            <button
              type="button"
              onClick={() => toggleDate(date)}
              className={`sticky top-0 z-10 w-full flex items-center justify-between backdrop-blur-md border py-2 px-3 rounded-lg shadow-xs transition-all group focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-600 ${
                isToday
                  ? 'bg-blue-50/95 dark:bg-blue-950/50 border-blue-300/80 dark:border-blue-800/60 hover:bg-blue-100/90 dark:hover:bg-blue-950/70'
                  : 'bg-indigo-50/90 dark:bg-slate-950/90 border-indigo-200/80 dark:border-indigo-900/50 hover:bg-indigo-100/80 dark:hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded-md ${
                  isToday
                    ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    : 'bg-indigo-500/15 dark:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400'
                }`}>
                  <Calendar size={13} />
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${
                  isToday
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-indigo-900 dark:text-indigo-200'
                }`}>
                  {formatDate(date)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-2xs ${
                  isToday
                    ? 'bg-white dark:bg-blue-950 border-blue-300/70 dark:border-blue-800/70 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300'
                }`}>
                  {dayMatches.length} MATCH{dayMatches.length > 1 ? 'S' : ''}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-indigo-400 dark:text-indigo-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                />
              </div>
            </button>

            {/* Liste des rencontres de la journée */}
            <div className={`flex flex-col gap-2 transition-all duration-200 ease-in-out ${isCollapsed ? 'hidden' : 'flex'}`}>
              {dayMatches.map((match, idx) => {
                const isSelected = selectedMatch && (
                  (selectedMatch.Match_ID && selectedMatch.Match_ID === match.Match_ID) ||
                  selectedMatch.Matchup === match.Matchup
                );

                return (
                  <MatchCard
                    key={match.Match_ID || `${date}-${idx}`}
                    match={match}
                    isSelected={isSelected}
                    onSelectMatch={onSelectMatch}
                    isMultiDate={sortedDates.length > 1}
                    currentTime={currentTime}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
