import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useFavorites } from '../../context/FavoritesContext';
import { getTeamInfo } from '../../utils';
import { getTeamDisplayName } from '../../utils/teamDisplayNames';
import { TeamLogo, LeagueLogo, getLeagueDisplayName } from '../../utils/teamLogos';
import {
  assignHumanTicketIds,
  getTicketFamilyMeta,
  isValidNumericMetric,
  formatProbabilityMetric,
  formatOddsMetric,
  formatScoreEvMetric,
  formatKickoffExplicit,
  formatIsoTimestampUtc
} from '../../utils/ticketIdentifier';
import {
  INITIAL_TICKET_FILTERS,
  INITIAL_PICKS_FILTERS,
  PRODUCT_FAMILIES,
  TIME_SLOTS,
  filterTickets,
  filterFinalPicks,
  getSynthesisHighlights,
  computeTicketWhatIfCounts,
  computePickWhatIfCounts,
  LEAGUE_GROUPS,
  getLeagueGroupId,
  formatDateDisplay,
  getMarketFamilyMeta,
  getScopeTypeLabel
} from '../../utils/ticketFilters';
import { TicketFilterDrawer } from '../filters/TicketFilterDrawer';
import { getLeagueFlag } from '../../utils/titaniumLoader';
import { isMatchLive } from '../MatchList';
import { Badge } from '../ui/Badge';
import {
  Trophy,
  Zap,
  TrendingUp,
  ShieldCheck,
  Flame,
  PieChart,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Search,
  Filter,
  BarChart3,
  Activity,
  Layers,
  Globe,
  Database,
  Code,
  Box,
  Fingerprint,
  Hash,
  RotateCcw,
  Sliders,
  Sparkles,
  X,
  Target,
  AlertCircle,
  Radio,
  Bookmark
} from 'lucide-react';

const INITIAL_VISIBLE_TICKETS = 30;
const VISIBLE_TICKETS_STEP = 30;
const INITIAL_VISIBLE_LEGS = 3;

function resolveLegMatchDisplay(matchStr, leagueContext) {
  if (!matchStr || typeof matchStr !== 'string') {
    return {
      homeRaw: 'Home',
      awayRaw: 'Away',
      displayHome: 'Home',
      displayAway: 'Away',
      displayMatchup: 'Match inconnu'
    };
  }
  const parts = matchStr.split(' vs ');
  const homeRaw = (parts[0] || 'Home').trim();
  const awayRaw = (parts[1] || 'Away').trim();
  const displayHome = getTeamDisplayName(homeRaw, leagueContext) || homeRaw;
  const displayAway = getTeamDisplayName(awayRaw, leagueContext) || awayRaw;
  return {
    homeRaw,
    awayRaw,
    displayHome,
    displayAway,
    displayMatchup: `${displayHome} vs ${displayAway}`
  };
}

/**
 * Détection déterministe de la fenêtre de match LIVE estimé pour une jambe.
 * Réutilise fidèlement isMatchLive de MatchList.jsx [0 à 115 minutes, priorité kickoff_utc].
 */
export const isLegLive = (leg, currentNowMs) => {
  if (!leg) return false;
  const matchObj = leg.Heure && !leg.hours && !leg.Hours
    ? { ...leg, hours: leg.Heure }
    : leg;
  return isMatchLive(matchObj, currentNowMs);
};

/**
 * Détection LIVE estimé pour un ticket entier :
 * - Single : son unique match satisfait isMatchLive.
 * - Combiné : au moins une jambe satisfait isMatchLive.
 * Évalue chaque ticket de façon unique (sans double comptage).
 */
export const isTicketLive = (ticket, currentNowMs) => {
  if (!ticket || !Array.isArray(ticket.legs) || ticket.legs.length === 0) return false;
  return ticket.legs.some(leg => isLegLive(leg, currentNowMs));
};

const TicketLeg = ({ leg, legIndex, onNavigate, nowMs }) => {
  const [expanded, setExpanded] = useState(false);
  const leagueCode = leg.League || 'ALL';
  const { homeRaw, awayRaw, displayHome, displayAway } = resolveLegMatchDisplay(leg.Match, leg.League);
  const probMeta = formatProbabilityMetric(leg.Prob, 1);
  const oddsMeta = formatOddsMetric(leg.Cote_Ref, 2);
  const evMeta = formatScoreEvMetric(leg.Score_EV, 3);
  const kickoffMeta = formatKickoffExplicit(leg);
  const marketMeta = getMarketFamilyMeta(leg.family_name || leg.Type || leg.Marche);
  const isLegCurrentlyLive = isLegLive(leg, nowMs);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300/80 dark:border-slate-800 flex flex-col hover:border-slate-400 dark:hover:border-slate-700 transition-all shadow-xs overflow-hidden">
      <div className="p-3 sm:p-3.5 flex flex-col gap-2.5">
        {/* Row 1: Leg index badge, Matchup & Direct Navigation CTA */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-mono font-black tracking-wider uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5 shadow-2xs">
              JAMBE {legIndex + 1}
            </span>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <TeamLogo teamName={homeRaw} league={leg.League} size="xs" alt={displayHome} />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {displayHome}
                </span>
                <span className="text-slate-400 font-normal text-xs">vs</span>
                <TeamLogo teamName={awayRaw} league={leg.League} size="xs" alt={displayAway} />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {displayAway}
                </span>
                {leg.Alpha && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold rounded shrink-0">
                    ALPHA
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1">
                  <LeagueLogo league={leg.League} size="xs" />
                  <span>{getLeagueDisplayName(leg.League) || 'Ligue N/D'}</span>
                </span>
                <span aria-hidden="true">•</span>
                <span className="font-mono text-slate-600 dark:text-slate-400" title={kickoffMeta.title || undefined}>{kickoffMeta.display}</span>
                {isLegCurrentlyLive && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono shrink-0"
                    title="Match dans la fenêtre conventionnelle [0 à 115 min après coup d'envoi]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE estimé
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(leg.Match_ID || leg.Match, leagueCode);
            }}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-colors shadow-sm ml-auto"
            title={`Ouvrir l'analyse du match ${displayHome} vs ${displayAway}`}
          >
            <span>Voir Match</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        {/* Row 2: Distinct Market Zone, Model Probability, Reference Odds & Details toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {/* Distinct Market Box with lightly tinted background and highlighted label */}
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border min-w-0 ${marketMeta.containerClass}`}>
            <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-2xs shrink-0 ${marketMeta.badgeClass}`}>
              {marketMeta.label}
            </span>
            <span className={`text-xs font-black truncate ${marketMeta.labelClass}`}>
              {leg.Marche || 'Non spécifié'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Prob.</span>
              <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                {probMeta.display}
              </span>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Cote Réf.</span>
              <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                {oddsMeta.display}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-expanded={expanded}
              title={expanded ? 'Masquer les détails de la jambe' : 'Afficher les détails de la jambe'}
            >
              <span>Détails</span>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Secondary Leg Info */}
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {leg.confidence_category && (
              <Badge className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] px-2 py-0.5 rounded-md font-bold uppercase">
                {leg.confidence_badge ? `${leg.confidence_badge} ` : ''}{leg.confidence_category}
              </Badge>
            )}
            {leg.Tier != null && (
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] px-2 py-0.5 rounded-md font-bold">
                Tier {leg.Tier}
              </Badge>
            )}
            {(leg.family_name || leg.Type) && (
              <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-[11px] px-2 py-0.5 rounded-md font-bold uppercase">
                {leg.family_name || leg.Type}
              </Badge>
            )}
            {leg.Streak_Status && (
              <Badge className="bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] px-2 py-0.5 rounded-md font-mono font-semibold">
                {leg.Streak_Status}
              </Badge>
            )}
            {evMeta.available && (
              <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-[11px] px-2 py-0.5 rounded-md font-mono font-bold">
                Score_EV: {evMeta.display}
              </Badge>
            )}
          </div>

          {leg.Streak_Reason && (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
              {leg.Streak_Reason}
            </p>
          )}

          {leg.Live_Betting_Recommendation?.[0] && (
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-2.5 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={12} className="fill-rose-500" /> Live Signal
                </span>
                {isValidNumericMetric(leg.Live_Betting_Recommendation[0].Force) && (
                  <span className="text-[11px] font-bold font-mono text-rose-600 dark:text-rose-400">
                    {(leg.Live_Betting_Recommendation[0].Force * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {leg.Live_Betting_Recommendation[0].Signal}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {leg.Live_Betting_Recommendation[0].Argument}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1">
            {leg.Match_ID && <span>Match_ID: {leg.Match_ID}</span>}
            {leg.Bet_ID && <span>Bet_ID: {leg.Bet_ID}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Bouton d'enregistrement d'un ticket favori (WEB-FAVORITES-001 - Phase 4)
 * Surface tactile réelle >= 44x44 px, accessibilité clavier, stopPropagation
 */
function TicketBookmarkButton({
  ticket,
  isFavorite = false,
  onToggleFavorite,
  className = ''
}) {
  const ticketId = ticket?.ticket_id;
  const isInvalid = !ticketId || typeof ticketId !== 'string' || !ticketId.trim();

  if (isInvalid) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        aria-label="Enregistrement indisponible : identifiant technique ticket_id manquant"
        title="Enregistrement indisponible : identifiant technique ticket_id manquant"
        className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600 shrink-0 ${className}`}
      >
        <Bookmark size={18} />
      </button>
    );
  }

  const label = isFavorite
    ? `Retirer le ticket ${ticket.human_id || ticketId} des favoris`
    : `Enregistrer le ticket ${ticket.human_id || ticketId} dans les favoris`;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (onToggleFavorite) onToggleFavorite(ticket);
      }}
      data-no-swipe="true"
      aria-pressed={isFavorite}
      aria-label={label}
      title={label}
      className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
        isFavorite
          ? 'bg-amber-500/15 border border-amber-500/40 text-amber-500 shadow-xs hover:bg-amber-500/25'
          : 'bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
      } ${className}`}
    >
      <Bookmark
        size={18}
        className={isFavorite ? 'fill-amber-400 text-amber-500' : 'transition-colors'}
      />
    </button>
  );
}

const TicketCard = ({
  ticket,
  auditMode,
  onNavigateToMatch,
  nowMs,
  isFavorite = false,
  onToggleFavorite
}) => {
  const [showAllLegs, setShowAllLegs] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);

  const familyMeta = ticket.family_meta || getTicketFamilyMeta(ticket.product_code);
  const legs = Array.isArray(ticket.legs) ? ticket.legs : [];
  const legCount = isValidNumericMetric(ticket.metrics?.leg_count)
    ? ticket.metrics.leg_count
    : legs.length;

  const rawOdds = ticket.metrics?.reference_odds_floor_product ?? ticket.metrics?.cote_totale;
  const oddsMeta = formatOddsMetric(rawOdds, 2);

  const rawMeanProb = ticket.metrics?.mean_leg_model_probability != null
    ? ticket.metrics.mean_leg_model_probability
    : (isValidNumericMetric(ticket.metrics?.fiabilite_moyenne) ? ticket.metrics.fiabilite_moyenne / 100 : null);
  const meanProbMeta = formatProbabilityMetric(rawMeanProb, 1);

  const rawMinProb = ticket.metrics?.min_leg_model_probability != null
    ? ticket.metrics.min_leg_model_probability
    : (legCount === 1 && isValidNumericMetric(rawMeanProb) ? rawMeanProb : null);
  const minProbMeta = formatProbabilityMetric(rawMinProb, 1);

  const jointProbMeta = formatProbabilityMetric(ticket.metrics?.joint_ticket_probability, 1);

  const hasExtraLegs = legs.length > INITIAL_VISIBLE_LEGS;
  const displayedLegs = showAllLegs ? legs : legs.slice(0, INITIAL_VISIBLE_LEGS);
  const hiddenLegsCount = Math.max(0, legs.length - INITIAL_VISIBLE_LEGS);

  const scopeType = ticket.scope_type || 'FULL_POOL';
  const scopeValue = ticket.scope_value || 'ALL';

  return (
    <div className={`flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border ${familyMeta.cardBorderClass} ${familyMeta.cardGlowClass} shadow-sm hover:shadow-md transition-all relative`}>
      {auditMode && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md p-4 overflow-y-auto">
          <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap break-all">
            {JSON.stringify(ticket, null, 2)}
          </pre>
        </div>
      )}

      {/* 1. Primary Card Header (Contraste renforcé et agencement compact en 2 lignes — WEB-001-D C) */}
      <div className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/90 dark:border-slate-800/90 p-3 sm:p-3.5 flex flex-col gap-2.5">
        {/* Ligne 1 : Identité, badges contextuels, périmètre et cote plancher compacte */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-mono text-xs sm:text-sm font-black tracking-tight border shadow-xs shrink-0 ${familyMeta.humanIdBadgeClass}`}>
              <Hash size={12} className="sm:w-[13px] sm:h-[13px]" />
              {ticket.human_id}
            </span>
            <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold border shadow-xs shrink-0 ${familyMeta.badgeClass}`}>
              {familyMeta.label}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
              <Box size={11} className="text-emerald-500" />
              {legCount} {legCount > 1 ? 'jambes' : 'jambe'}
            </span>
            {isTicketLive(ticket, nowMs) && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono shadow-2xs shrink-0"
                title="Au moins une jambe de ce ticket est estimée en direct (fenêtre conventionnelle 0 à 115 min)"
              >
                <Radio size={11} className="text-emerald-500 animate-pulse" />
                <span>LIVE estimé</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 shrink-0">
              <Globe size={11} className="text-purple-500 shrink-0" />
              <span>{getScopeTypeLabel(scopeType)}</span>
            </span>
          </div>

          {/* Reference Floor Odds Product Compact & Bookmark */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 shrink-0 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 px-2 sm:px-2.5 py-1 rounded-xl" title="Cote Référence Plancher">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight hidden sm:inline">
                Cote Réf.
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                {oddsMeta.display}
              </span>
            </div>
            {onToggleFavorite && (
              <TicketBookmarkButton
                ticket={ticket}
                isFavorite={isFavorite}
                onToggleFavorite={onToggleFavorite}
              />
            )}
          </div>
        </div>

        {/* Ligne 2 : Bandeau compact de 3 métriques (grid-cols-2 sm:grid-cols-3) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
          <div className="bg-white/80 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800 flex items-center justify-between min-w-0">
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate mr-1">
              Prob. Moy. Jambes
            </span>
            <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white shrink-0">
              {meanProbMeta.display}
            </span>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800 flex items-center justify-between min-w-0">
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate mr-1">
              Prob. Min. Jambe
            </span>
            <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white shrink-0">
              {minProbMeta.display}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white/80 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800 flex items-center justify-between min-w-0">
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate mr-1">
              Prob. Jointe Ticket
            </span>
            <span
              className={`text-xs sm:text-sm font-mono shrink-0 ${
                jointProbMeta.available
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
              title={
                jointProbMeta.available
                  ? 'Probabilité jointe calculée par le moteur TITANIUM'
                  : 'Probabilité jointe non disponible dans la sortie du moteur (joint_ticket_probability = NOT_AVAILABLE)'
              }
            >
              {jointProbMeta.display}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Ticket Legs List */}
      <div className="p-3 sm:p-4 bg-slate-100/70 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-2.5 flex-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Composition du ticket ({legs.length} {legs.length > 1 ? 'jambes' : 'jambe'})
          </span>
          {hasExtraLegs && (
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {showAllLegs ? `Toutes affichées (${legs.length})` : `Aperçu 3 sur ${legs.length}`}
            </span>
          )}
        </div>

        {displayedLegs.map((leg, lidx) => (
          <TicketLeg
            key={leg.Bet_ID || `${ticket.ticket_id}-leg-${lidx}`}
            leg={leg}
            legIndex={lidx}
            onNavigate={onNavigateToMatch}
            nowMs={nowMs}
          />
        ))}

        {hasExtraLegs && (
          <button
            type="button"
            onClick={() => setShowAllLegs(!showAllLegs)}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/40 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            {showAllLegs ? (
              <>
                <span>Replier l&apos;aperçu (afficher 3 jambes)</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>Afficher les {legs.length} jambes (+{hiddenLegsCount} {hiddenLegsCount > 1 ? 'autres' : 'autre'})</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>

      {/* 4. Collapsible Secondary Technical Metadata */}
      <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setShowTechDetails(!showTechDetails)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          aria-expanded={showTechDetails}
        >
          <span>Détails techniques du ticket</span>
          {showTechDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showTechDetails && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex flex-col bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
              <span className="text-[11px] font-semibold text-slate-400">ID Humain / Canonique</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{ticket.human_id}</span>
              <span className="font-mono text-[11px] text-slate-500 break-all">{ticket.ticket_id || 'Non spécifié'}</span>
            </div>
            <div className="flex flex-col bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
              <span className="text-[11px] font-semibold text-slate-400">Produit & Stratégie</span>
              <span className="font-mono font-semibold">{ticket.product_code || 'N/D'} • {ticket.strategy_code || 'N/D'}</span>
              <span className="text-[11px] text-slate-500">{familyMeta.description}</span>
            </div>
            <div className="flex flex-col bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
              <span className="text-[11px] font-semibold text-slate-400">Fenêtre d&apos;exécution</span>
              <span className="font-mono">{ticket.metrics?.execution_window_code || 'Non spécifiée'}</span>
              {isValidNumericMetric(ticket.metrics?.kickoff_span_minutes) && (
                <span className="text-[11px] text-slate-500">Amplitude : {ticket.metrics.kickoff_span_minutes} min</span>
              )}
            </div>
            <div className="flex flex-col bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
              <span className="text-[11px] font-semibold text-slate-400">Plage des coups d&apos;envoi (UTC)</span>
              <span className="font-mono text-[11px]">Début : {formatIsoTimestampUtc(ticket.metrics?.earliest_kickoff_utc)}</span>
              <span className="font-mono text-[11px]">Fin : {formatIsoTimestampUtc(ticket.metrics?.latest_kickoff_utc)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CompactStickyToolbar = ({
  tabBarHeight,
  isStickyVisible,
  countDisplay,
  quickPills,
  searchQuery,
  onSearchChange,
  isSearchOpen,
  setIsSearchOpen,
  searchInputRef,
  activeCriteriaCount,
  onOpenDrawer
}) => {
  return (
    <div
      style={{ top: `${tabBarHeight}px` }}
      className={`
        sticky z-[15] hidden lg:block w-full pointer-events-none transition-all duration-200 ease-in-out
        ${isStickyVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
      aria-hidden={!isStickyVisible}
    >
      <div className="absolute top-2 left-0 right-0 pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800/90 shadow-lg dark:shadow-[0_12px_28px_rgba(0,0,0,0.75),0_4px_10px_rgba(0,0,0,0.5)] rounded-2xl p-2.5 flex items-center justify-between gap-3">
        {/* Quick Pills Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
          {quickPills.map(pill => (
            <button
              key={pill.id}
              type="button"
              onClick={pill.onClick}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all shrink-0 select-none ${
                pill.active
                  ? pill.isFavorite
                    ? 'bg-amber-500 border-amber-500 text-slate-950 font-black shadow-xs'
                    : pill.isLive
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                      : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                  : pill.isFavorite
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:border-amber-500/50'
                    : pill.isLive
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              {pill.isLive && <Radio size={11} className={pill.active ? 'text-white animate-pulse' : 'text-emerald-500'} />}
              {pill.isFavorite && <Bookmark size={11} className={pill.active ? 'fill-slate-950 text-slate-950' : 'fill-amber-400 text-amber-500'} />}
              <span>{pill.label}</span>
            </button>
          ))}
        </div>

        {/* Right Controls: Real Count Badge, Search Button/Input, Filters Drawer Button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Compact Count Badge */}
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 shrink-0">
            <span>Affichés :</span>
            <strong className="font-mono text-emerald-600 dark:text-emerald-400">{countDisplay.visible}</strong>
            <span className="text-slate-400 font-mono">/</span>
            <strong className="font-mono">{countDisplay.filtered}</strong>
            {countDisplay.total && countDisplay.filtered !== countDisplay.total && (
              <span className="text-slate-400 font-mono text-[10px]">({countDisplay.total})</span>
            )}
          </div>

          {/* Expandable Compact Search */}
          <div className="relative flex items-center shrink-0">
            {isSearchOpen ? (
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  className="w-36 xl:w-48 py-1 pl-7 pr-6 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    title="Effacer la recherche"
                  >
                    <X size={12} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    title="Fermer la recherche"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  searchQuery?.trim()
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title={searchQuery?.trim() ? `Recherche active : "${searchQuery}"` : "Rechercher..."}
              >
                <Search size={13} />
                {searchQuery?.trim() && (
                  <span className="max-w-[80px] truncate font-mono text-[11px]">
                    {searchQuery}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* "Filtres" Drawer Button with Active Badge */}
          <button
            type="button"
            onClick={onOpenDrawer}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${
              activeCriteriaCount > 0
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Ouvrir le panneau de filtres avancés"
          >
            <Sliders size={13} />
            <span>Filtres</span>
            {activeCriteriaCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-emerald-700 font-mono text-[10px] font-black flex items-center justify-center">
                {activeCriteriaCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function TicketsView({ assembled, finals, loading, onNavigateToMatch, initialView = 'summary' }) {
  const [activeView, setActiveView] = useState(initialView);
  const [auditMode, setAuditMode] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { isTicketFavorite, toggleTicketFavorite, store } = useFavorites();

  const originSession = useMemo(() => ({
    sessionId: assembled?.metadata?.run_id || 'UNKNOWN_SESSION',
    runId: assembled?.metadata?.run_id || '',
    sourceMatrix: assembled?.metadata?.source_matrix || ''
  }), [assembled]);

  const handleToggleTicketFavorite = useCallback((ticket) => {
    if (!ticket || !ticket.ticket_id) return;
    toggleTicketFavorite(ticket, originSession);
  }, [toggleTicketFavorite, originSession]);

  // Isolated filter states for Tickets Assemblés and Choix Finaux
  const [ticketFilters, setTicketFilters] = useState(() => ({
    ...INITIAL_TICKET_FILTERS,
    liveEstimatedOnly: false
  }));
  const [picksFilters, setPicksFilters] = useState(INITIAL_PICKS_FILTERS);

  // Live estimation ticker state (convention isMatchLive 0-115 min, auto-refresh 60s)
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Progressive load state for tickets
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_TICKETS);
  const [expandedTicket, setExpandedTicket] = useState(null);
  const toggleExpanded = (idx) => setExpandedTicket(prev => prev === idx ? null : idx);

  // Reset progressive visible slice when ticket filters change
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_TICKETS);
  }, [ticketFilters]);

  // Persistent Compact Filter Bar State & Measurement (WEB-001-C)
  const tabBarRef = useRef(null);
  const [tabBarHeight, setTabBarHeight] = useState(52);
  const strategiesSentinelRef = useRef(null);
  const picksSentinelRef = useRef(null);
  const compactSearchInputRef = useRef(null);
  const [isStickyBarVisible, setIsStickyBarVisible] = useState(false);
  const [isCompactSearchOpen, setIsCompactSearchOpen] = useState(false);

  // Auto-focus compact search input when toggled open
  useEffect(() => {
    if (isCompactSearchOpen && compactSearchInputRef.current) {
      compactSearchInputRef.current.focus();
    }
  }, [isCompactSearchOpen]);

  // Dynamically track navigation tab bar height across window resizes
  useEffect(() => {
    if (!tabBarRef.current) return;
    const updateHeight = () => {
      if (tabBarRef.current) {
        setTabBarHeight(tabBarRef.current.offsetHeight);
      }
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(tabBarRef.current);
    window.addEventListener('resize', updateHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  const isV2Tickets = !!(assembled && Array.isArray(assembled.tickets));

  // 1. Source extraction (before human ID attribution)
  const rawTicketsList = useMemo(() => {
    if (!assembled) return [];
    if (isV2Tickets) {
      return assembled.tickets;
    }
    const list = [];
    Object.entries(assembled).forEach(([key, t]) => {
      if (t.variantes && Array.isArray(t.variantes)) {
        t.variantes.forEach((variant, vIdx) => {
          list.push({
            ticket_id: `${key}_v${vIdx}`,
            product_code: t.categorie || 'A',
            strategy_code: key,
            scope_type: 'FULL_POOL',
            scope_value: 'ALL',
            nom: `${t.nom} #${vIdx + 1}`,
            legs: variant.legs,
            metrics: {
              leg_count: variant.legs?.length || 0,
              mean_leg_model_probability: isValidNumericMetric(variant.metrics?.fiabilite_moyenne)
                ? variant.metrics.fiabilite_moyenne / 100
                : null,
              reference_odds_floor_product: isValidNumericMetric(variant.metrics?.cote_totale)
                ? variant.metrics.cote_totale
                : null,
              joint_ticket_probability: isValidNumericMetric(variant.metrics?.prob_implicite)
                ? variant.metrics.prob_implicite
                : 'NOT_AVAILABLE',
              ...variant.metrics
            }
          });
        });
      } else {
        list.push({
          ticket_id: key,
          product_code: t.categorie || 'A',
          strategy_code: key,
          scope_type: 'FULL_POOL',
          scope_value: 'ALL',
          nom: t.nom || key,
          legs: t.legs || [],
          metrics: {
            leg_count: t.legs?.length || 0,
            mean_leg_model_probability: isValidNumericMetric(t.metrics?.fiabilite_moyenne)
              ? t.metrics.fiabilite_moyenne / 100
              : null,
            reference_odds_floor_product: isValidNumericMetric(t.metrics?.cote_totale)
              ? t.metrics.cote_totale
              : null,
            joint_ticket_probability: isValidNumericMetric(t.metrics?.prob_implicite)
              ? t.metrics.prob_implicite
              : 'NOT_AVAILABLE',
            ...t.metrics
          }
        });
      }
    });
    return list;
  }, [assembled, isV2Tickets]);

  // 2. Deterministic Human ID Attribution BEFORE any filtering, sorting or pagination
  const ticketAttributionBundle = useMemo(() => {
    return assignHumanTicketIds(rawTicketsList);
  }, [rawTicketsList]);

  const ticketsList = ticketAttributionBundle.tickets;

  // Set of favorite ticket IDs and count of favorite tickets in this session (WEB-FAVORITES-001 - Phase 4)
  const favoriteTicketIds = useMemo(() => new Set(Object.keys(store?.tickets || {})), [store?.tickets]);

  const favoriteTicketsCount = useMemo(() => {
    return ticketsList.filter(t => Boolean(store?.tickets?.[t.ticket_id])).length;
  }, [ticketsList, store?.tickets]);

  const effectiveTicketFilters = useMemo(() => ({
    ...ticketFilters,
    favoriteTicketIds
  }), [ticketFilters, favoriteTicketIds]);

  const singlesCount = useMemo(() => {
    return ticketsList.filter(t => t.product_code === 'SINGLE_1' || t.is_single_ticket).length;
  }, [ticketsList]);

  const combosCount = useMemo(() => {
    return Math.max(0, ticketsList.length - singlesCount);
  }, [ticketsList, singlesCount]);

  // Dynamic list of product families present in the dataset
  const availableProducts = useMemo(() => {
    const codes = Array.from(new Set(ticketsList.map(t => t.product_code).filter(Boolean)));
    return codes.map(code => ({
      code,
      meta: getTicketFamilyMeta(code),
      count: ticketAttributionBundle.familyCounts[code] || 0
    }));
  }, [ticketsList, ticketAttributionBundle]);

  // Dynamic what-if counts per product family synchronized with active filters
  const productWhatIfCounts = useMemo(() => {
    return computeTicketWhatIfCounts(ticketsList, effectiveTicketFilters, 'productCode', [
      'ALL',
      'MICRO_2',
      'CORE_3',
      'CORE_4',
      'STANDARD_5_8',
      'EXTENDED_9_PLUS'
    ]);
  }, [ticketsList, effectiveTicketFilters]);

  // Available unique leagues across the dataset
  const availableLeagues = useMemo(() => {
    const leagues = new Set();
    ticketsList.forEach(t => {
      (t.legs || []).forEach(l => {
        if (l.League) leagues.add(l.League);
      });
    });
    (finals?.Selections || []).forEach(s => {
      if (s.League) leagues.add(s.League);
    });
    return Array.from(leagues).sort();
  }, [ticketsList, finals]);

  // Available unique market families in ticket legs
  const availableMarketFamilies = useMemo(() => {
    const fams = new Set();
    ticketsList.forEach(t => {
      (t.legs || []).forEach(l => {
        const f = l.family_name || l.Type;
        if (f) fams.add(f);
      });
    });
    return Array.from(fams).sort();
  }, [ticketsList]);

  // Available unique dates
  const availableDates = useMemo(() => {
    const dates = new Set();
    ticketsList.forEach(t => {
      (t.legs || []).forEach(l => {
        const d = l.Date || (l.kickoff_utc ? l.kickoff_utc.slice(0, 10) : null);
        if (d) dates.add(d);
      });
    });
    (finals?.Selections || []).forEach(s => {
      const d = s.Date || s.Match_Date || (s.kickoff_utc ? s.kickoff_utc.slice(0, 10) : null);
      if (d) dates.add(d);
    });
    return Array.from(dates).sort();
  }, [ticketsList, finals]);

  // Available unique types in Choix Finaux
  const availablePicksTypes = useMemo(() => {
    if (!finals?.Selections) return [];
    return Array.from(new Set(finals.Selections.map(s => s.family_name || s.Type).filter(Boolean))).sort();
  }, [finals]);

  // Available unique profiles in Choix Finaux
  const availablePicksProfiles = useMemo(() => {
    if (!finals?.Selections) return [];
    const profs = new Set();
    finals.Selections.forEach(s => {
      if (Array.isArray(s.Profile)) {
        s.Profile.forEach(p => profs.add(p));
      } else if (s.Profile) {
        profs.add(s.Profile);
      }
    });
    return Array.from(profs).sort();
  }, [finals]);

  // 3. Global Filtering & Sorting on the FULL source (never mutating human_id)
  const filteredStrategies = useMemo(() => {
    const base = filterTickets(ticketsList, effectiveTicketFilters);
    if (!ticketFilters.liveEstimatedOnly) return base;
    return base.filter(t => isTicketLive(t, nowMs));
  }, [ticketsList, effectiveTicketFilters, ticketFilters.liveEstimatedOnly, nowMs]);

  // 4. Progressive Slicing for Mobile/Desktop DOM performance
  const visibleStrategies = useMemo(() => {
    return filteredStrategies.slice(0, visibleCount);
  }, [filteredStrategies, visibleCount]);

  const remainingTicketsCount = Math.max(0, filteredStrategies.length - visibleStrategies.length);

  // Dynamic what-if count for LIVE estimé filter under currently active criteria
  const liveTicketsCount = useMemo(() => {
    const filtersWithoutLive = { ...effectiveTicketFilters, liveEstimatedOnly: false };
    const candidates = filterTickets(ticketsList, filtersWithoutLive);
    return candidates.filter(t => isTicketLive(t, nowMs)).length;
  }, [ticketsList, effectiveTicketFilters, nowMs]);

  // 5. Choix Finaux filtering & sorting
  const totalSelections = finals?.Selections?.length || 0;

  const filteredPicks = useMemo(() => {
    return filterFinalPicks(finals?.Selections || [], picksFilters);
  }, [finals, picksFilters]);

  // Dynamic Tier counts and pills for Choix Finaux (D-1)
  const picksTierCounts = useMemo(() => {
    const counts = {};
    (finals?.Selections || []).forEach(p => {
      const t = p.Tier != null ? String(p.Tier) : null;
      if (t) counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [finals]);

  const picksTierPills = useMemo(() => {
    const tiers = Object.keys(picksTierCounts)
      .map(t => parseInt(t, 10))
      .filter(t => !isNaN(t) && (picksTierCounts[String(t)] || 0) > 0)
      .sort((a, b) => a - b);
    return tiers.map(t => ({
      id: `T${t}`,
      tierKey: String(t),
      label: `Tier ${t} (${picksTierCounts[String(t)] || 0})`,
      active: picksFilters.tier === String(t)
    }));
  }, [picksTierCounts, picksFilters.tier]);

  // Dynamic what-if counts for time slots (WEB-001-D B)
  const ticketTimeSlotCounts = useMemo(() => {
    const pool = ticketFilters.liveEstimatedOnly ? ticketsList.filter(t => isTicketLive(t, nowMs)) : ticketsList;
    return computeTicketWhatIfCounts(pool, effectiveTicketFilters, 'timeSlot', ['ALL', 'MATIN', 'APRES_MIDI', 'SOIR', 'NUIT']);
  }, [ticketsList, effectiveTicketFilters, ticketFilters.liveEstimatedOnly, nowMs]);

  const picksTimeSlotCounts = useMemo(() => {
    return computePickWhatIfCounts(finals?.Selections || [], picksFilters, 'timeSlot', ['ALL', 'MATIN', 'APRES_MIDI', 'SOIR', 'NUIT']);
  }, [finals, picksFilters]);

  const ticketTimeSlotPills = useMemo(() => {
    return Object.values(TIME_SLOTS).map(slot => ({
      id: `SLOT_${slot.id}`,
      slotKey: slot.id,
      label: `${slot.label} (${ticketTimeSlotCounts?.[slot.id] ?? 0})`,
      active: ticketFilters.timeSlot === slot.id
    }));
  }, [ticketTimeSlotCounts, ticketFilters.timeSlot]);

  const picksTimeSlotPills = useMemo(() => {
    return Object.values(TIME_SLOTS).map(slot => ({
      id: `SLOT_${slot.id}`,
      slotKey: slot.id,
      label: `${slot.label} (${picksTimeSlotCounts?.[slot.id] ?? 0})`,
      active: picksFilters.timeSlot === slot.id
    }));
  }, [picksTimeSlotCounts, picksFilters.timeSlot]);

  // 6. Synthesis Highlights (Top 5 Singles, Top 5 Combos by min prob, Top 5 Choix Finaux)
  const highlights = useMemo(() => {
    return getSynthesisHighlights(ticketsList, finals?.Selections || [], 5);
  }, [ticketsList, finals]);

  // Active filter counters
  const ticketActiveCriteriaCount = useMemo(() => {
    let count = 0;
    if (ticketFilters.favoritesOnly) count++;
    if (ticketFilters.structure !== 'ALL') count++;
    if (ticketFilters.productCode && ticketFilters.productCode !== 'ALL') count++;
    if (ticketFilters.scopeType !== 'ALL') count++;
    if (ticketFilters.leagueGroup !== 'ALL') count++;
    if (ticketFilters.selectedLeagues?.length > 0) count++;
    if (ticketFilters.selectedMarketFamilies?.length > 0) count++;
    if (ticketFilters.selectedDate !== 'ALL') count++;
    if (ticketFilters.timeSlot && ticketFilters.timeSlot !== 'ALL') count++;
    if (ticketFilters.minProbThreshold > 0) count++;
    if (ticketFilters.legMatchMode && ticketFilters.legMatchMode !== 'ANY') count++;
    if (ticketFilters.liveEstimatedOnly) count++;
    if (ticketFilters.searchQuery?.trim()) count++;
    return count;
  }, [ticketFilters]);

  const picksActiveCriteriaCount = useMemo(() => {
    let count = 0;
    if (picksFilters.tier !== 'ALL') count++;
    if (picksFilters.leagueGroup !== 'ALL') count++;
    if (picksFilters.selectedLeagues?.length > 0) count++;
    if (picksFilters.selectedType !== 'ALL') count++;
    if (picksFilters.selectedProfile !== 'ALL') count++;
    if (picksFilters.streakStatus !== 'ALL') count++;
    if (picksFilters.alphaOnly) count++;
    if (picksFilters.superSignalOnly) count++;
    if (picksFilters.liveOnly) count++;
    if (picksFilters.selectedDate !== 'ALL') count++;
    if (picksFilters.timeSlot && picksFilters.timeSlot !== 'ALL') count++;
    if (picksFilters.searchQuery?.trim()) count++;
    return count;
  }, [picksFilters]);

  const onResetTicketFilters = () => setTicketFilters({ ...INITIAL_TICKET_FILTERS, liveEstimatedOnly: false, favoritesOnly: false });
  const onResetPicksFilters = () => setPicksFilters(INITIAL_PICKS_FILTERS);

  // Sentinel observation and scroll synchronization for persistent compact bar (WEB-001-C)
  useEffect(() => {
    setIsStickyBarVisible(false);
    setIsCompactSearchOpen(false);

    if (activeView === 'summary') return;

    const getSentinel = () => (activeView === 'strategies' ? strategiesSentinelRef.current : picksSentinelRef.current);
    const sentinel = getSentinel();
    if (!sentinel) return;

    const getScrollParent = (node) => {
      if (!node) return null;
      let parent = node.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          return parent;
        }
        parent = parent.parentElement;
      }
      return window;
    };

    const scrollParent = getScrollParent(sentinel);

    const checkVisibility = () => {
      const s = getSentinel();
      if (!s) return;
      const sentinelRect = s.getBoundingClientRect();
      const tabBottom = tabBarRef.current ? tabBarRef.current.getBoundingClientRect().bottom : 52;
      setIsStickyBarVisible(sentinelRect.bottom <= tabBottom + 10);
    };

    const root = scrollParent === window ? null : scrollParent;
    const observer = new IntersectionObserver(
      () => {
        checkVisibility();
      },
      {
        root,
        threshold: [0, 1]
      }
    );

    observer.observe(sentinel);

    const target = scrollParent || window;
    const onScroll = () => checkVisibility();
    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    checkVisibility();

    return () => {
      observer.disconnect();
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [activeView, tabBarHeight, ticketActiveCriteriaCount, picksActiveCriteriaCount]);

  // Descriptive mean of model probabilities across valid CHOIX_FINAUX selections
  const avgProbDisplay = useMemo(() => {
    if (!finals?.Selections || finals.Selections.length === 0) return 'N/D';
    const valid = finals.Selections.filter(s => isValidNumericMetric(s?.Prob));
    if (valid.length === 0) return 'N/D';
    const sum = valid.reduce((acc, s) => acc + s.Prob, 0);
    return `${((sum / valid.length) * 100).toFixed(1)}%`;
  }, [finals]);

  // Descriptive mean of reference odds across valid CHOIX_FINAUX selections
  const avgOddsDisplay = useMemo(() => {
    if (!finals?.Selections || finals.Selections.length === 0) return 'N/D';
    const valid = finals.Selections.filter(s => isValidNumericMetric(s?.Cote_Ref));
    if (valid.length === 0) return 'N/D';
    const sum = valid.reduce((acc, s) => acc + s.Cote_Ref, 0);
    return `@${(sum / valid.length).toFixed(2)}`;
  }, [finals]);

  const profileStats = useMemo(() => {
    const stats = {};
    finals?.Selections?.forEach(s => {
      s.Profile?.forEach(p => { stats[p] = (stats[p] || 0) + 1; });
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [finals]);

  // Descriptive mean of Score_EV across filtered selections
  const filteredAvgScoreEvDisplay = useMemo(() => {
    const valid = filteredPicks.filter(s => isValidNumericMetric(s?.Score_EV));
    if (valid.length === 0) return 'N/D';
    const sum = valid.reduce((acc, s) => acc + s.Score_EV, 0);
    return (sum / valid.length).toFixed(3);
  }, [filteredPicks]);

  const getTierColor = (tier) => {
    if (tier === 1) return 'bg-emerald-600 text-white';
    if (tier === 2) return 'bg-blue-600 text-white';
    return 'bg-slate-600 text-white';
  };

  const getProfileColor = (p) => {
    const colors = {
      FORCE_DOMINANTE_AWAY: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      FORCE_DOMINANTE_HOME: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      BUTS_GARANTIS: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      FAUX_FAVORI: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      MATCH_DE_PEUR: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      SURVALUATION_MARCHE: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      MATCH_FERME: 'bg-slate-500/10 text-slate-600 border-slate-500/20'
    };
    return colors[p] || 'bg-slate-100 text-slate-500 border-slate-200';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-mono uppercase tracking-widest">Chargement des sélections TITANIUM...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-28">
      {/* 1. INTERNAL NAVIGATION MENU */}
      <div
        ref={tabBarRef}
        className="sticky top-0 z-20 -mx-3 px-3 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0 py-2.5 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/90 lg:border-none lg:dark:border-b lg:dark:border-slate-800/90 dark:shadow-[0_4px_20px_rgba(0,0,0,0.65)] flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar max-w-full">
          {[
            { id: 'summary', label: 'Synthèse', shortLabel: 'Synthèse', icon: <BarChart3 size={14} /> },
            { id: 'strategies', label: `Tickets (${ticketsList.length})`, shortLabel: `Tickets (${ticketsList.length})`, icon: <PieChart size={14} /> },
            { id: 'picks', label: `Choix Finaux (${totalSelections})`, shortLabel: `Choix (${totalSelections})`, icon: <Layers size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all shrink-0
                ${activeView === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}
              `}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setAuditMode(!auditMode)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 ${
            auditMode
              ? 'bg-amber-500 text-white border-amber-600'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
          }`}
          title="Afficher le JSON brut des cartes"
        >
          <Code size={13} />
          <span className="hidden sm:inline">Audit : {auditMode ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* VIEW 1: SUMMARY / SYNTHÈSE */}
      {activeView === 'summary' && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-300">
          {/* Hero KPI Card */}
          <div className="relative rounded-3xl p-5 sm:p-6 lg:p-10 overflow-hidden bg-slate-900 dark:bg-black border border-white/10 shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-white pointer-events-none">
              <Trophy size={150} />
            </div>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Trophy size={20} className="text-emerald-400" />
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Master Hub</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-5xl font-serif font-black text-white tracking-tight leading-none">
                  Titanium <span className="text-emerald-400">Master</span>
                </h2>
                <p className="text-slate-300 max-w-md text-xs sm:text-sm leading-relaxed font-medium">
                  {finals?.Methode || 'Sorties quantitatives TITANIUM V2'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase">Choix Finaux</span>
                  <span className="text-2xl font-black text-white font-mono">{totalSelections}</span>
                  <span className="text-[11px] text-slate-400">Sélections retenues</span>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-blue-400 uppercase">Prob. Moy. (Choix)</span>
                  <span className="text-2xl font-black text-white font-mono">{avgProbDisplay}</span>
                  <span className="text-[11px] text-slate-400">Moyenne descriptive</span>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-amber-400 uppercase">Cote Réf. Moy.</span>
                  <span className="text-2xl font-black text-white font-mono">{avgOddsDisplay}</span>
                  <span className="text-[11px] text-slate-400">Sur {totalSelections} choix</span>
                </div>

                <div
                  className="col-span-full bg-emerald-500/15 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between gap-3 group cursor-pointer hover:bg-emerald-500/25 transition-all"
                  onClick={() => {
                    setActiveView('strategies');
                    setTicketFilters(INITIAL_TICKET_FILTERS);
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
                      <span className="text-sm font-extrabold text-white uppercase tracking-wide">
                        {ticketsList.length} Tickets Assemblés
                      </span>
                    </div>
                    <span className="text-xs text-emerald-200 font-mono">
                      ({singlesCount} Singles • {combosCount} Combinés)
                    </span>
                  </div>
                  <ArrowUpRight size={18} className="text-emerald-400 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>

                {profileStats.length > 0 && (
                  <div className="col-span-full bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase">Profils des Choix Finaux</span>
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                        <Database size={12} /> CHOIX_FINAUX
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profileStats.map(([p, count]) => (
                        <div key={p} className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase flex items-center gap-1.5 ${getProfileColor(p)}`}>
                          <span>{p.replace(/_/g, ' ')}</span>
                          <span className="bg-white/20 px-1.5 rounded font-mono">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Top 5 Singles à haute probabilité modèle */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <div className="flex items-center gap-2">
                    <Target size={18} className="text-emerald-500 shrink-0" />
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Singles à probabilité modèle élevée
                    </h3>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                    {highlights.topSingles.length} affichés
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Classés par probabilité modèle décroissante de l&apos;unique jambe • Réf. catalogue : {singlesCount} sélections simples.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveView('strategies');
                  setTicketFilters(prev => ({ ...prev, structure: 'SINGLES' }));
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/30 transition-all gap-1.5 shrink-0 shadow-2xs"
              >
                <span>Explorer les {singlesCount} singles</span>
                <ArrowUpRight size={14} className="shrink-0" />
              </button>
            </div>

            {highlights.topSingles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {highlights.topSingles.map((ticket) => {
                  const leg = ticket.legs?.[0] || {};
                  const { homeRaw, awayRaw, displayHome, displayAway } = resolveLegMatchDisplay(leg.Match, leg.League);
                  const homeInfo = getTeamInfo(homeRaw, [], leg.League);
                  const awayInfo = getTeamInfo(awayRaw, [], leg.League);
                  const probMeta = formatProbabilityMetric(leg.Prob, 1);
                  const oddsMeta = formatOddsMetric(leg.Cote_Ref, 2);
                  const kickoffMeta = formatKickoffExplicit(leg);
                  const familyMeta = ticket.family_meta || getTicketFamilyMeta(ticket.product_code);

                  return (
                    <div
                      key={ticket.human_id || ticket.ticket_id}
                      className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3 transition-all hover:border-emerald-500/40"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-mono text-xs font-black border ${familyMeta.humanIdBadgeClass}`}>
                            <Hash size={12} />
                            {ticket.human_id}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            Single
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            Prob. {probMeta.display}
                          </div>
                          <TicketBookmarkButton
                            ticket={ticket}
                            isFavorite={isTicketFavorite(ticket.ticket_id)}
                            onToggleFavorite={handleToggleTicketFavorite}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate text-right">{displayHome}</span>
                          <div className="w-6 h-6 shrink-0 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-0.5 border border-slate-200 dark:border-slate-700">
                            <TeamLogo teamName={homeRaw} league={leg.League} size="sm" alt={displayHome} className="w-full h-full object-contain" />
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">vs</span>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-start">
                          <div className="w-6 h-6 shrink-0 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-0.5 border border-slate-200 dark:border-slate-700">
                            <TeamLogo teamName={awayRaw} league={leg.League} size="sm" alt={displayAway} className="w-full h-full object-contain" />
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate text-left">{displayAway}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold inline-flex items-center gap-1">
                          <LeagueLogo league={leg.League} size="xs" />
                          <span>{getLeagueDisplayName(leg.League)}</span>
                        </span>
                        <span className="font-mono text-[11px]">{kickoffMeta.display}</span>
                      </div>

                      {(() => {
                        const marketMeta = getMarketFamilyMeta(leg.family_name || leg.Type || leg.Marche);
                        return (
                          <div className={`flex items-center justify-between p-2 rounded-xl border ${marketMeta.containerClass}`}>
                            <div className="flex items-center gap-1.5 min-w-0 pr-2">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-2xs shrink-0 ${marketMeta.badgeClass}`}>
                                {marketMeta.label}
                              </span>
                              <span className={`text-xs font-black truncate ${marketMeta.labelClass}`}>
                                {leg.Marche || 'Marché'}
                              </span>
                            </div>
                            <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-700 shrink-0">
                              {oddsMeta.display}
                            </span>
                          </div>
                        );
                      })()}

                      <button
                        type="button"
                        onClick={() => onNavigateToMatch(leg.Match_ID || leg.Match, leg.League || 'ALL')}
                        className="mt-auto w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span>Voir Match</span>
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 px-4 text-center text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                Aucune sélection simple dans cette session.
              </div>
            )}
          </div>

          {/* Section 2: Top 5 Combinés à jambes fortes */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-sky-500 shrink-0" />
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Combinés à jambes fortes
                    </h3>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                    {highlights.topCombos.length} affichés
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Classés par <strong>probabilité minimale d&apos;une jambe</strong> (jambe la plus délicate) décroissante • {combosCount} combinés totaux.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveView('strategies');
                  setTicketFilters(prev => ({ ...prev, structure: 'COMBOS' }));
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/20 hover:border-sky-500/30 transition-all gap-1.5 shrink-0 shadow-2xs"
              >
                <span>Explorer les {combosCount} combinés</span>
                <ArrowUpRight size={14} className="shrink-0" />
              </button>
            </div>

            {/* Informative notice on joint probability vs min leg probability */}
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5">
              <AlertCircle size={16} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <p className="text-xs text-sky-800 dark:text-sky-300 leading-relaxed font-medium">
                <strong>Précision quantitative :</strong> Ce classement ordonne les combinés selon la solidité de leur maillon le plus faible (<span className="font-mono">Prob. Min. Jambe</span>). La probabilité jointe d&apos;un combiné n&apos;est pas déduite arbitrairement côté client et reste <span className="font-mono">Non disponible</span> conformément à la sortie du moteur.
              </p>
            </div>

            {highlights.topCombos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {highlights.topCombos.map((ticket) => {
                  const familyMeta = ticket.family_meta || getTicketFamilyMeta(ticket.product_code);
                  const legs = ticket.legs || [];
                  const minProbMeta = formatProbabilityMetric(ticket.metrics?.min_leg_model_probability, 1);
                  const meanProbMeta = formatProbabilityMetric(ticket.metrics?.mean_leg_model_probability, 1);
                  const oddsMeta = formatOddsMetric(ticket.metrics?.reference_odds_floor_product, 2);

                  return (
                    <div
                      key={ticket.human_id || ticket.ticket_id}
                      className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3 transition-all hover:border-sky-500/40"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-mono text-xs font-black border ${familyMeta.humanIdBadgeClass}`}>
                            <Hash size={12} />
                            {ticket.human_id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${familyMeta.badgeClass}`}>
                            {familyMeta.label}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {legs.length} jambes
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {oddsMeta.display}
                          </span>
                          <TicketBookmarkButton
                            ticket={ticket}
                            isFavorite={isTicketFavorite(ticket.ticket_id)}
                            onToggleFavorite={handleToggleTicketFavorite}
                          />
                        </div>
                      </div>

                      {/* Primary Metric: Min leg probability highlighted */}
                      <div className="bg-sky-500/10 border border-sky-500/25 p-2.5 rounded-xl flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 uppercase">
                            Prob. Min. Jambe
                          </span>
                          <span className="text-lg font-black font-mono text-sky-900 dark:text-sky-100">
                            {minProbMeta.display}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Prob. Moy. Jambes
                          </span>
                          <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                            {meanProbMeta.display}
                          </span>
                        </div>
                      </div>

                      {/* Preview of legs */}
                      <div className="flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Jambes du combiné ({legs.length})
                        </span>
                        {legs.slice(0, 3).map((l, lidx) => {
                          const legProb = formatProbabilityMetric(l.Prob, 1);
                          return (
                            <div key={lidx} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-200/50 dark:border-slate-800/60 last:border-0">
                              <span className="truncate pr-2 font-medium text-slate-800 dark:text-slate-200">
                                {getLeagueFlag(l.League)} {l.Match}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                {legProb.display}
                              </span>
                            </div>
                          );
                        })}
                        {legs.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-mono text-center pt-0.5">
                            +{legs.length - 3} autre{legs.length - 3 > 1 ? 's' : ''} jambe{legs.length - 3 > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveView('strategies');
                          setTicketFilters(prev => ({ ...prev, structure: 'COMBOS', searchQuery: ticket.human_id }));
                        }}
                        className="mt-auto w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-sky-600 dark:hover:bg-sky-400 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span>Voir ce ticket</span>
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 px-4 text-center text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                Aucun combiné assemblé dans cette session ({singlesCount} sélections simples disponibles).
              </div>
            )}
          </div>

          {/* Section 3: Top 5 Choix Finaux les plus probables */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <div className="flex items-center gap-2">
                    <Zap size={18} className="text-amber-500 fill-amber-500 shrink-0" />
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Choix Finaux les plus probables (CHOIX_FINAUX)
                    </h3>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                    {highlights.topPicks.length} affichés
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Sélections retenues ordonnées par probabilité modèle • Tiers réels restitués ({totalSelections} choix au total).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('picks')}
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:border-amber-500/30 transition-all gap-1.5 shrink-0 shadow-2xs"
              >
                <span>Voir les {totalSelections} choix</span>
                <ArrowUpRight size={14} className="shrink-0" />
              </button>
            </div>

            {highlights.topPicks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {highlights.topPicks.map((sel, idx) => {
                  const { homeRaw, awayRaw, displayHome, displayAway } = resolveLegMatchDisplay(sel.Match, sel.League);
                  const homeInfo = getTeamInfo(homeRaw, [], sel.League);
                  const awayInfo = getTeamInfo(awayRaw, [], sel.League);
                  const probMeta = formatProbabilityMetric(sel.Prob, 1);
                  const oddsMeta = formatOddsMetric(sel.Cote_Ref, 2);
                  const evMeta = formatScoreEvMetric(sel.Score_EV, 3);
                  const kickoffMeta = formatKickoffExplicit(sel);

                  return (
                    <div
                      key={sel.Bet_ID || idx}
                      className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3 transition-all hover:border-emerald-500/40"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <Badge className={`${getTierColor(sel.Tier)} text-[11px] px-2.5 py-0.5 font-bold rounded-md`}>
                            Tier {sel.Tier}
                          </Badge>
                          {sel.Streak_Status === 'STREAK_CONFIRMED' && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Série OK
                            </span>
                          )}
                          {sel.Alpha && (
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white">
                              ALPHA
                            </span>
                          )}
                        </div>
                        <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          Prob. {probMeta.display}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate text-right">{displayHome}</span>
                          <div className="w-6 h-6 shrink-0 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-0.5 border border-slate-200 dark:border-slate-700">
                            <TeamLogo teamName={homeRaw} league={sel.League} size="sm" alt={displayHome} className="w-full h-full object-contain" />
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">vs</span>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-start">
                          <div className="w-6 h-6 shrink-0 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-0.5 border border-slate-200 dark:border-slate-700">
                            <TeamLogo teamName={awayRaw} league={sel.League} size="sm" alt={displayAway} className="w-full h-full object-contain" />
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate text-left">{displayAway}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold inline-flex items-center gap-1">
                          <LeagueLogo league={sel.League} size="xs" />
                          <span>{getLeagueDisplayName(sel.League)}</span>
                        </span>
                        <span className="font-mono text-[11px]">{kickoffMeta.display}</span>
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
                            {sel.Marche}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            {sel.family_name || sel.Type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {oddsMeta.display}
                          </span>
                          {evMeta.available && (
                            <span className="text-[11px] font-bold font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20" title={`Score_EV : ${evMeta.display}`}>
                              EV: {evMeta.display}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigateToMatch(sel.Match_ID || sel.Match, sel.League || 'ALL')}
                        className="mt-auto w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span>Voir Match</span>
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 px-4 text-center text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                Aucune sélection finale dans cette session.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: ASSEMBLED TICKETS CATALOG */}
      {activeView === 'strategies' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
          <div className="px-1 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Catalogue des Tickets Assemblés
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5">
                Sorties brutes de <span className="font-mono">TICKETS_ASSEMBLES.json</span> • Numérotation humaine déterministe.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
              <span>Affichés : <strong className="font-mono text-emerald-600 dark:text-emerald-400">{visibleStrategies.length}</strong> / <strong className="font-mono">{filteredStrategies.length}</strong></span>
              {filteredStrategies.length !== ticketsList.length && (
                <span className="text-slate-400 font-mono">(Total : {ticketsList.length})</span>
              )}
            </div>
          </div>

          {/* Search, Filter Toolbar & Active Chips */}
          <div className="flex flex-col gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Row 1: Search + Advanced Filters Drawer Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Rechercher par ID humain (SINGLE-001, MICRO-001...), match, équipe, ligue..."
                  value={ticketFilters.searchQuery}
                  onChange={e => setTicketFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-8 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                {ticketFilters.searchQuery && (
                  <button
                    type="button"
                    onClick={() => setTicketFilters(prev => ({ ...prev, searchQuery: '' }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${
                  ticketActiveCriteriaCount > 0
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Sliders size={14} />
                <span>Filtres</span>
                {ticketActiveCriteriaCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-white text-emerald-700 font-mono text-[11px] font-black flex items-center justify-center">
                    {ticketActiveCriteriaCount}
                  </span>
                )}
              </button>
            </div>

            {/* Row 2: Quick Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {[
                { id: 'ALL', label: `Tous (${ticketsList.length})`, active: ticketFilters.structure === 'ALL' && ticketFilters.productCode === 'ALL' && ticketFilters.leagueGroup === 'ALL' && ticketFilters.selectedMarketFamilies.length === 0 && !ticketFilters.liveEstimatedOnly && !ticketFilters.favoritesOnly },
                { id: 'FAVORITES', label: `★ Favoris (${favoriteTicketsCount})`, isFavorite: true, active: Boolean(ticketFilters.favoritesOnly) },
                { id: 'LIVE_ESTIMATED', label: `LIVE estimé (${liveTicketsCount})`, isLive: true, active: Boolean(ticketFilters.liveEstimatedOnly) },
                { id: 'SINGLES', label: `Singles (${singlesCount})`, active: ticketFilters.structure === 'SINGLES' && ticketFilters.productCode === 'ALL' && !ticketFilters.favoritesOnly },
                { id: 'COMBOS', label: `Combinés (${combosCount})`, active: ticketFilters.structure === 'COMBOS' && ticketFilters.productCode === 'ALL' && !ticketFilters.favoritesOnly },
                { id: 'MICRO_2', label: `Micro (${productWhatIfCounts?.['MICRO_2'] ?? 36})`, active: ticketFilters.productCode === 'MICRO_2' },
                { id: 'CORE_3', label: `Core 3 (${productWhatIfCounts?.['CORE_3'] ?? 30})`, active: ticketFilters.productCode === 'CORE_3' },
                { id: 'CORE_4', label: `Core 4 (${productWhatIfCounts?.['CORE_4'] ?? 23})`, active: ticketFilters.productCode === 'CORE_4' },
                { id: 'STANDARD_5_8', label: `Standard (${productWhatIfCounts?.['STANDARD_5_8'] ?? 18})`, active: ticketFilters.productCode === 'STANDARD_5_8' },
                { id: 'EXTENDED_9_PLUS', label: `Extended (${productWhatIfCounts?.['EXTENDED_9_PLUS'] ?? 2})`, active: ticketFilters.productCode === 'EXTENDED_9_PLUS' },
                { id: 'TOP7', label: 'Top 7 Europe', active: ticketFilters.leagueGroup === 'TOP_7_EUROPE' },
                { id: 'TG', label: 'Team Goals', active: ticketFilters.selectedMarketFamilies.includes('Team Goals') },
                ...ticketTimeSlotPills.map(p => ({
                  id: p.id,
                  label: p.label,
                  active: p.active,
                  isTimeSlot: true,
                  timeSlotKey: p.slotKey
                }))
              ].map(pill => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    if (pill.id === 'ALL') {
                      onResetTicketFilters();
                    } else if (pill.id === 'FAVORITES') {
                      setTicketFilters(prev => ({
                        ...prev,
                        favoritesOnly: !prev.favoritesOnly
                      }));
                    } else if (pill.id === 'LIVE_ESTIMATED') {
                      setTicketFilters(prev => ({
                        ...prev,
                        liveEstimatedOnly: !prev.liveEstimatedOnly
                      }));
                    } else if (pill.id === 'SINGLES') {
                      setTicketFilters(prev => ({
                        ...prev,
                        structure: prev.structure === 'SINGLES' ? 'ALL' : 'SINGLES',
                        productCode: 'ALL'
                      }));
                    } else if (pill.id === 'COMBOS') {
                      setTicketFilters(prev => ({
                        ...prev,
                        structure: prev.structure === 'COMBOS' ? 'ALL' : 'COMBOS',
                        productCode: 'ALL'
                      }));
                    } else if (['MICRO_2', 'CORE_3', 'CORE_4', 'STANDARD_5_8', 'EXTENDED_9_PLUS'].includes(pill.id)) {
                      setTicketFilters(prev => ({
                        ...prev,
                        productCode: prev.productCode === pill.id ? 'ALL' : pill.id,
                        structure: prev.structure === 'SINGLES' ? 'ALL' : prev.structure
                      }));
                    } else if (pill.id === 'TOP7') {
                      setTicketFilters(prev => ({ ...prev, leagueGroup: prev.leagueGroup === 'TOP_7_EUROPE' ? 'ALL' : 'TOP_7_EUROPE' }));
                    } else if (pill.id === 'TG') {
                      setTicketFilters(prev => {
                        const hasTG = prev.selectedMarketFamilies.includes('Team Goals');
                        return {
                          ...prev,
                          selectedMarketFamilies: hasTG ? prev.selectedMarketFamilies.filter(f => f !== 'Team Goals') : [...prev.selectedMarketFamilies, 'Team Goals']
                        };
                      });
                    } else if (pill.isTimeSlot) {
                      setTicketFilters(prev => ({
                        ...prev,
                        timeSlot: prev.timeSlot === pill.timeSlotKey ? 'ALL' : pill.timeSlotKey
                      }));
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 select-none ${
                    pill.active
                      ? pill.isFavorite
                        ? 'bg-amber-500 border-amber-500 text-slate-950 font-black shadow-xs'
                        : pill.isLive
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                          : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                      : pill.isFavorite
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:border-amber-500/50'
                        : pill.isLive
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {pill.isLive && <Radio size={12} className={pill.active ? 'text-white animate-pulse' : 'text-emerald-500'} />}
                  {pill.isFavorite && <Bookmark size={12} className={pill.active ? 'fill-slate-950 text-slate-950' : 'fill-amber-400 text-amber-500'} />}
                  <span>{pill.label}</span>
                </button>
              ))}
            </div>

            {/* Row 3: Active Filter Chips */}
            {ticketActiveCriteriaCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mr-1">
                  Actifs :
                </span>
                {ticketFilters.favoritesOnly && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    <Bookmark size={12} className="fill-amber-400 text-amber-500" />
                    <span>Favoris ({favoriteTicketsCount})</span>
                    <button
                      type="button"
                      onClick={() => setTicketFilters(prev => ({ ...prev, favoritesOnly: false }))}
                      className="hover:text-rose-500 ml-0.5"
                      aria-label="Désactiver le filtre Favoris"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {ticketFilters.liveEstimatedOnly && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    <Radio size={12} className="animate-pulse text-emerald-500" />
                    <span>LIVE estimé</span>
                    <button
                      type="button"
                      onClick={() => setTicketFilters(prev => ({ ...prev, liveEstimatedOnly: false }))}
                      className="hover:text-rose-500 ml-0.5"
                      aria-label="Désactiver le filtre LIVE estimé"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {ticketFilters.timeSlot && ticketFilters.timeSlot !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                    Horaire : {TIME_SLOTS[ticketFilters.timeSlot]?.label || ticketFilters.timeSlot}
                    <button type="button" onClick={() => setTicketFilters(prev => ({ ...prev, timeSlot: 'ALL' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {ticketFilters.structure !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    Structure: {ticketFilters.structure}
                    <button type="button" onClick={() => setTicketFilters(prev => ({ ...prev, structure: 'ALL' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {ticketFilters.productCode !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                    Famille: {PRODUCT_FAMILIES.find(f => f.code === ticketFilters.productCode)?.label || ticketFilters.productCode}
                    <button type="button" onClick={() => setTicketFilters(prev => ({ ...prev, productCode: 'ALL' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {ticketFilters.scopeType !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20" title={`Valeur canonique : ${ticketFilters.scopeType}`}>
                    Périmètre: {getScopeTypeLabel(ticketFilters.scopeType)}
                    <button type="button" onClick={() => setTicketFilters(prev => ({ ...prev, scopeType: 'ALL' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {ticketFilters.leagueGroup !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    Groupe: {LEAGUE_GROUPS[ticketFilters.leagueGroup]?.label || ticketFilters.leagueGroup}
                    <button type="button" onClick={() => setTicketFilters(prev => ({ ...prev, leagueGroup: 'ALL' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {ticketFilters.selectedLeagues?.map(l => (
                  <span key={l} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {l}
                    <button type="button" onClick={() => setTicketFilters(prev => ({ ...prev, selectedLeagues: prev.selectedLeagues.filter(x => x !== l) }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                ))}
                {ticketFilters.selectedMarketFamilies?.map(f => (
                  <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                    {f}
                    <button type="button" onClick={() => setTicketFilters(prev => ({ ...prev, selectedMarketFamilies: prev.selectedMarketFamilies.filter(x => x !== f) }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                ))}
                {ticketFilters.selectedDate !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                    Date: {formatDateDisplay(ticketFilters.selectedDate)}
                    <button type="button" onClick={() => setTicketFilters(prev => ({ ...prev, selectedDate: 'ALL' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {ticketFilters.minProbThreshold > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    Prob. Min ≥ {(ticketFilters.minProbThreshold * 100).toFixed(0)}%
                    <button type="button" onClick={() => setTicketFilters(prev => ({ ...prev, minProbThreshold: 0 }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {ticketFilters.legMatchMode === 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20" title="Mode de correspondance stricte : toutes les jambes doivent satisfaire le critère">
                    Mode ALL (Toutes jambes)
                    <button type="button" onClick={() => setTicketFilters(prev => ({ ...prev, legMatchMode: 'ANY' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {ticketFilters.legMatchMode === 'AT_LEAST_2' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    Correspondance : ≥ 2 jambes
                    <button type="button" onClick={() => setTicketFilters(prev => ({ ...prev, legMatchMode: 'ANY' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {ticketFilters.legMatchMode === 'AT_LEAST_3' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    Correspondance : ≥ 3 jambes
                    <button type="button" onClick={() => setTicketFilters(prev => ({ ...prev, legMatchMode: 'ANY' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {ticketFilters.legMatchMode === 'CUSTOM' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                    Correspondance : ≥ {ticketFilters.minLegsMatching || 1} jambes
                    <button type="button" onClick={() => setTicketFilters(prev => ({ ...prev, legMatchMode: 'ANY' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={onResetTicketFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline ml-auto"
                >
                  <RotateCcw size={12} />
                  <span>Tout réinitialiser</span>
                </button>
              </div>
            )}

            {/* Row 4: Sort Selector */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <TrendingUp size={14} className="text-slate-400 shrink-0" />
              <label htmlFor="ticket-sort-select" className="text-xs font-semibold text-slate-500 shrink-0">
                Tri :
              </label>
              <select
                id="ticket-sort-select"
                value={ticketFilters.sortBy}
                onChange={e => setTicketFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 [color-scheme:light] dark:[color-scheme:dark] border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer w-full"
              >
                <option value="mean_prob" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">Prob. Moy. Jambes (Décroissant)</option>
                <option value="min_prob" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">Prob. Min. Jambe (Décroissant)</option>
                <option value="odds" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">Cote Réf. Plancher (Décroissant)</option>
                <option value="legs" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">Nombre de Jambes (Décroissant)</option>
                <option value="canonical" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">Ordre Canonique Moteur (ID)</option>
              </select>
            </div>
          </div>

          {/* Sentinel for persistent compact bar */}
          <div ref={strategiesSentinelRef} className="h-px w-full pointer-events-none -mt-3 mb-0 opacity-0" aria-hidden="true" />

          {/* Persistent Compact Sticky Filter Bar (PC / lg:) */}
          <CompactStickyToolbar
            tabBarHeight={tabBarHeight}
            isStickyVisible={isStickyBarVisible}
            countDisplay={{
              visible: visibleStrategies.length,
              filtered: filteredStrategies.length,
              total: ticketsList.length
            }}
            quickPills={[
              {
                id: 'ALL',
                label: `Tous (${ticketsList.length})`,
                active: ticketFilters.structure === 'ALL' && ticketFilters.productCode === 'ALL' && ticketFilters.leagueGroup === 'ALL' && ticketFilters.selectedMarketFamilies.length === 0 && !ticketFilters.liveEstimatedOnly && !ticketFilters.favoritesOnly,
                onClick: onResetTicketFilters
              },
              {
                id: 'FAVORITES',
                label: `★ Favoris (${favoriteTicketsCount})`,
                isFavorite: true,
                active: Boolean(ticketFilters.favoritesOnly),
                onClick: () => setTicketFilters(prev => ({
                  ...prev,
                  favoritesOnly: !prev.favoritesOnly
                }))
              },
              {
                id: 'LIVE_ESTIMATED',
                label: `LIVE estimé (${liveTicketsCount})`,
                isLive: true,
                active: Boolean(ticketFilters.liveEstimatedOnly),
                onClick: () => setTicketFilters(prev => ({
                  ...prev,
                  liveEstimatedOnly: !prev.liveEstimatedOnly
                }))
              },
              {
                id: 'SINGLES',
                label: `Singles (${singlesCount})`,
                active: ticketFilters.structure === 'SINGLES' && ticketFilters.productCode === 'ALL',
                onClick: () => setTicketFilters(prev => ({
                  ...prev,
                  structure: prev.structure === 'SINGLES' ? 'ALL' : 'SINGLES',
                  productCode: 'ALL'
                }))
              },
              {
                id: 'COMBOS',
                label: `Combinés (${combosCount})`,
                active: ticketFilters.structure === 'COMBOS' && ticketFilters.productCode === 'ALL',
                onClick: () => setTicketFilters(prev => ({
                  ...prev,
                  structure: prev.structure === 'COMBOS' ? 'ALL' : 'COMBOS',
                  productCode: 'ALL'
                }))
              },
              {
                id: 'MICRO_2',
                label: `Micro (${productWhatIfCounts?.['MICRO_2'] ?? 36})`,
                active: ticketFilters.productCode === 'MICRO_2',
                onClick: () => setTicketFilters(prev => ({
                  ...prev,
                  productCode: prev.productCode === 'MICRO_2' ? 'ALL' : 'MICRO_2',
                  structure: prev.structure === 'SINGLES' ? 'ALL' : prev.structure
                }))
              },
              {
                id: 'CORE_3',
                label: `Core 3 (${productWhatIfCounts?.['CORE_3'] ?? 30})`,
                active: ticketFilters.productCode === 'CORE_3',
                onClick: () => setTicketFilters(prev => ({
                  ...prev,
                  productCode: prev.productCode === 'CORE_3' ? 'ALL' : 'CORE_3',
                  structure: prev.structure === 'SINGLES' ? 'ALL' : prev.structure
                }))
              },
              {
                id: 'CORE_4',
                label: `Core 4 (${productWhatIfCounts?.['CORE_4'] ?? 23})`,
                active: ticketFilters.productCode === 'CORE_4',
                onClick: () => setTicketFilters(prev => ({
                  ...prev,
                  productCode: prev.productCode === 'CORE_4' ? 'ALL' : 'CORE_4',
                  structure: prev.structure === 'SINGLES' ? 'ALL' : prev.structure
                }))
              },
              {
                id: 'STANDARD_5_8',
                label: `Standard (${productWhatIfCounts?.['STANDARD_5_8'] ?? 18})`,
                active: ticketFilters.productCode === 'STANDARD_5_8',
                onClick: () => setTicketFilters(prev => ({
                  ...prev,
                  productCode: prev.productCode === 'STANDARD_5_8' ? 'ALL' : 'STANDARD_5_8',
                  structure: prev.structure === 'SINGLES' ? 'ALL' : prev.structure
                }))
              },
              {
                id: 'EXTENDED_9_PLUS',
                label: `Extended (${productWhatIfCounts?.['EXTENDED_9_PLUS'] ?? 2})`,
                active: ticketFilters.productCode === 'EXTENDED_9_PLUS',
                onClick: () => setTicketFilters(prev => ({
                  ...prev,
                  productCode: prev.productCode === 'EXTENDED_9_PLUS' ? 'ALL' : 'EXTENDED_9_PLUS',
                  structure: prev.structure === 'SINGLES' ? 'ALL' : prev.structure
                }))
              },
              {
                id: 'TOP7',
                label: 'Top 7 Europe',
                active: ticketFilters.leagueGroup === 'TOP_7_EUROPE',
                onClick: () => setTicketFilters(prev => ({
                  ...prev,
                  leagueGroup: prev.leagueGroup === 'TOP_7_EUROPE' ? 'ALL' : 'TOP_7_EUROPE'
                }))
              },
              {
                id: 'TG',
                label: 'Team Goals',
                active: ticketFilters.selectedMarketFamilies.includes('Team Goals'),
                onClick: () => setTicketFilters(prev => {
                  const hasTG = prev.selectedMarketFamilies.includes('Team Goals');
                  return {
                    ...prev,
                    selectedMarketFamilies: hasTG
                      ? prev.selectedMarketFamilies.filter(f => f !== 'Team Goals')
                      : [...prev.selectedMarketFamilies, 'Team Goals']
                  };
                })
              },
              ...ticketTimeSlotPills.map(p => ({
                id: p.id,
                label: p.label,
                active: p.active,
                onClick: () => setTicketFilters(prev => ({
                  ...prev,
                  timeSlot: prev.timeSlot === p.slotKey ? 'ALL' : p.slotKey
                }))
              }))
            ]}
            searchQuery={ticketFilters.searchQuery}
            onSearchChange={q => setTicketFilters(prev => ({ ...prev, searchQuery: q }))}
            isSearchOpen={isCompactSearchOpen}
            setIsSearchOpen={setIsCompactSearchOpen}
            searchInputRef={compactSearchInputRef}
            activeCriteriaCount={ticketActiveCriteriaCount}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />

          {/* Tickets Grid */}
          {visibleStrategies.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
              {visibleStrategies.map((ticket) => (
                <TicketCard
                  key={ticket.human_id || ticket.ticket_id}
                  ticket={ticket}
                  auditMode={auditMode}
                  onNavigateToMatch={onNavigateToMatch}
                  nowMs={nowMs}
                  isFavorite={isTicketFavorite(ticket.ticket_id)}
                  onToggleFavorite={handleToggleTicketFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-500 flex flex-col items-center justify-center gap-2">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {ticketFilters.favoritesOnly
                  ? 'Aucun ticket favori dans cette session.'
                  : 'Aucun ticket ne correspond aux critères de recherche ou de filtre sélectionnés.'}
              </p>
              {ticketFilters.favoritesOnly && (
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                  {favoriteTicketsCount === 0
                    ? 'Vous n\'avez pas encore enregistré de tickets favoris pour cette session. Cliquez sur le signet dans une carte de ticket pour l\'enregistrer.'
                    : 'Des tickets favoris existent dans la session, mais aucun ne correspond aux autres critères actifs (recherche, ligue, famille de marché).'}
                </p>
              )}
              {ticketFilters.liveEstimatedOnly && (
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                  Aucun ticket n&apos;a de match dans la fenêtre conventionnelle LIVE estimé [0 à 115 minutes après coup d&apos;envoi] pour cette sélection.
                </p>
              )}
              <button
                type="button"
                onClick={onResetTicketFilters}
                className="mt-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors shadow-sm"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}

          {/* Progressive Load Footer */}
          {filteredStrategies.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Affichage de <strong className="font-mono text-slate-900 dark:text-white">{visibleStrategies.length}</strong> sur <strong className="font-mono text-slate-900 dark:text-white">{filteredStrategies.length}</strong> tickets correspondants (Total session : <strong className="font-mono">{ticketsList.length}</strong>).
              </span>

              {remainingTicketsCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setVisibleCount(prev => prev + VISIBLE_TICKETS_STEP)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
                  >
                    Afficher +{Math.min(VISIBLE_TICKETS_STEP, remainingTicketsCount)} tickets ({remainingTicketsCount} restants)
                  </button>
                  {remainingTicketsCount > VISIBLE_TICKETS_STEP && (
                    <button
                      type="button"
                      onClick={() => setVisibleCount(filteredStrategies.length)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700"
                    >
                      Tout afficher ({filteredStrategies.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: FINAL SELECTIONS (CHOIX_FINAUX) */}
      {activeView === 'picks' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
          <div className="px-1 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Sélections Finales (CHOIX_FINAUX)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {filteredPicks.length} sur {totalSelections} sélections affichées
              </p>
            </div>
            <div
              className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2"
              title="Moyenne descriptive du Score_EV fourni par le moteur sur les sélections filtrées (ne constitue pas un ROI réalisé)"
            >
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Score_EV Moy. (Filtre) :</span>
              <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                {filteredAvgScoreEvDisplay}
              </span>
            </div>
          </div>

          {/* Search, Filter Toolbar & Active Chips */}
          <div className="flex flex-col gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Row 1: Search + Advanced Filters Drawer Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Rechercher une équipe, ligue, marché, profil contextuel..."
                  value={picksFilters.searchQuery}
                  onChange={e => setPicksFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-8 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                {picksFilters.searchQuery && (
                  <button
                    type="button"
                    onClick={() => setPicksFilters(prev => ({ ...prev, searchQuery: '' }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${
                  picksActiveCriteriaCount > 0
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Sliders size={14} />
                <span>Filtres</span>
                {picksActiveCriteriaCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-white text-emerald-700 font-mono text-[11px] font-black flex items-center justify-center">
                    {picksActiveCriteriaCount}
                  </span>
                )}
              </button>
            </div>

            {/* Row 2: Quick Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {[
                { id: 'ALL', label: `Tous (${totalSelections})`, active: picksFilters.tier === 'ALL' && !picksFilters.liveOnly && picksFilters.streakStatus === 'ALL' && picksFilters.timeSlot === 'ALL' },
                ...picksTierPills,
                { id: 'LIVE', label: 'Live Eligible', active: picksFilters.liveOnly },
                { id: 'STREAK', label: 'Séries confirmées', active: picksFilters.streakStatus === 'STREAK_CONFIRMED' },
                ...picksTimeSlotPills
              ].map(pill => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    if (pill.id === 'ALL') {
                      onResetPicksFilters();
                    } else if (pill.tierKey) {
                      setPicksFilters(prev => ({ ...prev, tier: prev.tier === pill.tierKey ? 'ALL' : pill.tierKey }));
                    } else if (pill.id === 'LIVE') {
                      setPicksFilters(prev => ({ ...prev, liveOnly: !prev.liveOnly }));
                    } else if (pill.id === 'STREAK') {
                      setPicksFilters(prev => ({ ...prev, streakStatus: prev.streakStatus === 'STREAK_CONFIRMED' ? 'ALL' : 'STREAK_CONFIRMED' }));
                    } else if (pill.slotKey) {
                      setPicksFilters(prev => ({ ...prev, timeSlot: prev.timeSlot === pill.slotKey ? 'ALL' : pill.slotKey }));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 select-none ${
                    pill.active
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Row 3: Active Filter Chips */}
            {picksActiveCriteriaCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mr-1">
                  Actifs :
                </span>
                {picksFilters.timeSlot && picksFilters.timeSlot !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                    Horaire : {TIME_SLOTS[picksFilters.timeSlot]?.label || picksFilters.timeSlot}
                    <button type="button" onClick={() => setPicksFilters(prev => ({ ...prev, timeSlot: 'ALL' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {picksFilters.tier !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    Tier {picksFilters.tier}
                    <button type="button" onClick={() => setPicksFilters(prev => ({ ...prev, tier: 'ALL' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {picksFilters.leagueGroup !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    Groupe: {LEAGUE_GROUPS[picksFilters.leagueGroup]?.label || picksFilters.leagueGroup}
                    <button type="button" onClick={() => setPicksFilters(prev => ({ ...prev, leagueGroup: 'ALL' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {picksFilters.selectedLeagues?.map(l => (
                  <span key={l} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {l}
                    <button type="button" onClick={() => setPicksFilters(prev => ({ ...prev, selectedLeagues: prev.selectedLeagues.filter(x => x !== l) }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                ))}
                {picksFilters.selectedType !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                    Type: {picksFilters.selectedType}
                    <button type="button" onClick={() => setPicksFilters(prev => ({ ...prev, selectedType: 'ALL' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {picksFilters.selectedProfile !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    Profil: {picksFilters.selectedProfile}
                    <button type="button" onClick={() => setPicksFilters(prev => ({ ...prev, selectedProfile: 'ALL' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {picksFilters.streakStatus !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    {picksFilters.streakStatus}
                    <button type="button" onClick={() => setPicksFilters(prev => ({ ...prev, streakStatus: 'ALL' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {picksFilters.liveOnly && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    Live Eligible
                    <button type="button" onClick={() => setPicksFilters(prev => ({ ...prev, liveOnly: false }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {picksFilters.alphaOnly && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    Alpha
                    <button type="button" onClick={() => setPicksFilters(prev => ({ ...prev, alphaOnly: false }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}
                {picksFilters.selectedDate !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                    Date: {formatDateDisplay(picksFilters.selectedDate)}
                    <button type="button" onClick={() => setPicksFilters(prev => ({ ...prev, selectedDate: 'ALL' }))} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={onResetPicksFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline ml-auto"
                >
                  <RotateCcw size={12} />
                  <span>Tout réinitialiser</span>
                </button>
              </div>
            )}

            {/* Row 4: Sort Selector */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <TrendingUp size={14} className="text-slate-400 shrink-0" />
              <label htmlFor="pick-sort-select" className="text-xs font-semibold text-slate-500 shrink-0">
                Tri :
              </label>
              <select
                id="pick-sort-select"
                value={picksFilters.sortBy}
                onChange={e => setPicksFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 [color-scheme:light] dark:[color-scheme:dark] border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer w-full"
              >
                <option value="prob" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">Probabilité Modèle (Décroissant)</option>
                <option value="odds" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">Cote de Référence (Décroissante)</option>
                <option value="ev" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">Score_EV (Décroissant)</option>
              </select>
            </div>
          </div>

          {/* Sentinel for persistent compact bar */}
          <div ref={picksSentinelRef} className="h-px w-full pointer-events-none -mt-3 mb-0 opacity-0" aria-hidden="true" />

          {/* Persistent Compact Sticky Filter Bar (PC / lg:) */}
          <CompactStickyToolbar
            tabBarHeight={tabBarHeight}
            isStickyVisible={isStickyBarVisible}
            countDisplay={{
              visible: filteredPicks.length,
              filtered: filteredPicks.length,
              total: totalSelections
            }}
            quickPills={[
              {
                id: 'ALL',
                label: `Tous (${totalSelections})`,
                active: picksFilters.tier === 'ALL' && !picksFilters.liveOnly && picksFilters.streakStatus === 'ALL',
                onClick: onResetPicksFilters
              },
              ...picksTierPills.map(p => ({
                id: p.id,
                label: p.label,
                active: p.active,
                onClick: () => setPicksFilters(prev => ({
                  ...prev,
                  tier: prev.tier === p.tierKey ? 'ALL' : p.tierKey
                }))
              })),
              {
                id: 'LIVE',
                label: 'Live Eligible',
                active: picksFilters.liveOnly,
                onClick: () => setPicksFilters(prev => ({ ...prev, liveOnly: !prev.liveOnly }))
              },
              {
                id: 'STREAK',
                label: 'Séries confirmées',
                active: picksFilters.streakStatus === 'STREAK_CONFIRMED',
                onClick: () => setPicksFilters(prev => ({
                  ...prev,
                  streakStatus: prev.streakStatus === 'STREAK_CONFIRMED' ? 'ALL' : 'STREAK_CONFIRMED'
                }))
              },
              ...picksTimeSlotPills.map(p => ({
                id: p.id,
                label: p.label,
                active: p.active,
                onClick: () => setPicksFilters(prev => ({
                  ...prev,
                  timeSlot: prev.timeSlot === p.slotKey ? 'ALL' : p.slotKey
                }))
              }))
            ]}
            searchQuery={picksFilters.searchQuery}
            onSearchChange={q => setPicksFilters(prev => ({ ...prev, searchQuery: q }))}
            isSearchOpen={isCompactSearchOpen}
            setIsSearchOpen={setIsCompactSearchOpen}
            searchInputRef={compactSearchInputRef}
            activeCriteriaCount={picksActiveCriteriaCount}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />

          {/* Picks List */}
          <div className="flex flex-col gap-3.5 sm:gap-4">
            {filteredPicks.length > 0 ? (
              filteredPicks.map((sel, idx) => {
                const isExpanded = expandedTicket === idx;
                const { homeRaw, awayRaw, displayHome, displayAway } = resolveLegMatchDisplay(sel.Match, sel.League);
                const homeInfo = getTeamInfo(homeRaw, [], sel.League);
                const awayInfo = getTeamInfo(awayRaw, [], sel.League);
                const probMeta = formatProbabilityMetric(sel.Prob, 1);
                const oddsMeta = formatOddsMetric(sel.Cote_Ref, 2);
                const evMeta = formatScoreEvMetric(sel.Score_EV, 3);
                const baseEvMeta = formatScoreEvMetric(sel.Score_EV_Original, 3);
                const kickoffMeta = formatKickoffExplicit(sel);

                return (
                  <div key={sel.Bet_ID || idx} className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md relative overflow-hidden transition-all hover:border-emerald-500/40">
                    {auditMode && (
                      <div className="absolute inset-0 z-50 bg-slate-900/95 p-4 overflow-y-auto">
                        <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap break-all">
                          {JSON.stringify(sel, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Primary Info */}
                    <div
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      onClick={() => toggleExpanded(idx)}
                    >
                      <div className="flex flex-col gap-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge className={`${getTierColor(sel.Tier)} text-[11px] px-2 py-0.5 rounded-md font-bold`}>
                            Tier {sel.Tier}
                          </Badge>
                          {sel.Streak_Status && (
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                              sel.Streak_Status === 'STREAK_CONFIRMED'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                            }`}>
                              {sel.Streak_Status}
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 uppercase">
                            {sel.family_name || sel.Type}
                          </span>
                          {sel.Alpha && (
                            <span className="text-[11px] px-2 py-0.5 bg-amber-500 text-white font-bold rounded-md">
                              ALPHA
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-1 shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                              <TeamLogo teamName={homeRaw} league={sel.League} size="md" alt={displayHome} className="w-full h-full object-contain" />
                            </div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white break-words">{displayHome}</span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            vs
                          </span>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-1 shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                              <TeamLogo teamName={awayRaw} league={sel.League} size="md" alt={displayAway} className="w-full h-full object-contain" />
                            </div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white break-words">{displayAway}</span>
                          </div>
                        </div>
                      </div>

                      {/* Core Market Info */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col min-w-0 pr-3 border-r border-slate-200 dark:border-slate-800">
                          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 break-words">
                            {sel.Marche}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono inline-flex items-center gap-1" title={kickoffMeta.title || undefined}>
                            <LeagueLogo league={sel.League} size="xs" />
                            <span>{getLeagueDisplayName(sel.League)} • {kickoffMeta.display}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                              Prob. {probMeta.display}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                              {oddsMeta.display}
                            </span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                            <ChevronDown size={16} className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Secondary Info */}
                    {isExpanded && (
                      <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 flex flex-col gap-3">
                        {sel.Profile?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {sel.Profile.map(p => (
                              <span key={p} className={`text-[11px] font-mono px-2 py-0.5 rounded border ${getProfileColor(p)}`}>
                                {p.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                            <span className="text-[11px] text-slate-500 font-mono uppercase mb-0.5">Score_EV</span>
                            <span className="text-xs sm:text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                              {evMeta.display}
                            </span>
                            {baseEvMeta.available && (
                              <span className="text-[11px] text-slate-400 font-mono">
                                Initial : {baseEvMeta.display}
                              </span>
                            )}
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                            <span className="text-[11px] text-slate-500 font-mono uppercase mb-0.5">Famille</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase text-center">
                              {sel.family_name || sel.Type}
                            </span>
                          </div>
                          {sel.Super_Signal && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/50 flex flex-col items-center justify-center col-span-2">
                              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono uppercase flex items-center gap-1 mb-0.5">
                                <Zap size={12} /> SUPER SIGNAL
                              </span>
                              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">ACTIVE</span>
                            </div>
                          )}
                        </div>

                        {sel.Streak_Reason && (
                          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                              <TrendingUp size={13} /> Justification de série
                            </h4>
                            <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">{sel.Streak_Reason}</p>
                          </div>
                        )}

                        {sel.Score_Exact_Confirmation && (
                          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-xl flex items-center gap-2">
                            <Fingerprint size={14} className="text-emerald-500 shrink-0" />
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                              Score_Exact_Confirmation : {sel.Score_Exact_Confirmation}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <span className="text-[11px] font-mono text-slate-400">
                            {sel.Match_ID ? `Match_ID : ${sel.Match_ID}` : ''} {sel.Bet_ID ? `• Bet_ID : ${sel.Bet_ID}` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToMatch(sel.Match_ID || sel.Match, sel.League || 'ALL');
                            }}
                            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-colors flex items-center gap-1.5 shadow-sm ml-auto"
                          >
                            <span>Voir Match</span>
                            <ArrowUpRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-500 flex flex-col items-center justify-center gap-2">
                <p>Aucune sélection ne correspond aux critères de recherche ou de filtre sélectionnés.</p>
                <button
                  type="button"
                  onClick={onResetPicksFilters}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER NOTICE */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 shadow-inner mt-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Flame size={24} className="text-emerald-500" />
        </div>
        <div className="flex flex-col gap-1 text-center sm:text-left">
          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Restitution Quantitative TITANIUM V2
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Les probabilités des jambes, cotes de référence plancher et statuts de séries sont restitués sans recalcul ni simulation de mise côté client.
          </p>
        </div>
      </div>

      {/* ADVANCED FILTER DRAWER (SLIDE-OVER) */}
      <TicketFilterDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        tab={activeView === 'picks' ? 'picks' : 'strategies'}
        tickets={ticketsList}
        picks={finals?.Selections || []}
        ticketFilters={ticketFilters}
        setTicketFilters={setTicketFilters}
        picksFilters={picksFilters}
        setPicksFilters={setPicksFilters}
        onResetTicketFilters={onResetTicketFilters}
        onResetPicksFilters={onResetPicksFilters}
        totalTicketsCount={ticketsList.length}
        filteredTicketsCount={filteredStrategies.length}
        totalPicksCount={totalSelections}
        filteredPicksCount={filteredPicks.length}
        availableLeagues={availableLeagues}
        availableMarketFamilies={availableMarketFamilies}
        availablePicksProfiles={availablePicksProfiles}
        availablePicksTypes={availablePicksTypes}
        availableDates={availableDates}
        isTicketLive={isTicketLive}
      />
    </div>
  );
}
