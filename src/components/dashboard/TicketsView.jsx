import React, { useState, useMemo, useEffect } from 'react';
import { getTeamInfo } from '../../utils';
import { getTeamDisplayName } from '../../utils/teamDisplayNames';
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
  Hash
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

const TicketLeg = ({ leg, legIndex, onNavigate }) => {
  const [expanded, setExpanded] = useState(false);
  const leagueCode = leg.League || 'ALL';
  const { displayHome, displayAway } = resolveLegMatchDisplay(leg.Match, leg.League);
  const probMeta = formatProbabilityMetric(leg.Prob, 1);
  const oddsMeta = formatOddsMetric(leg.Cote_Ref, 2);
  const evMeta = formatScoreEvMetric(leg.Score_EV, 3);
  const kickoffMeta = formatKickoffExplicit(leg);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col hover:border-emerald-500/40 transition-all shadow-sm overflow-hidden">
      <div className="p-3 sm:p-3.5 flex flex-col gap-2.5">
        {/* Row 1: Leg index, Matchup & Direct Navigation CTA */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5">
              #{legIndex + 1}
            </span>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug break-words">
                  {displayHome} <span className="text-slate-400 font-normal">vs</span> {displayAway}
                </span>
                {leg.Alpha && (
                  <span className="text-[11px] px-1.5 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold rounded shrink-0">
                    ALPHA
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="font-semibold text-slate-600 dark:text-slate-300">{leg.League || 'Ligue N/D'}</span>
                <span aria-hidden="true">•</span>
                <span className="font-mono" title={kickoffMeta.title || undefined}>{kickoffMeta.display}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(leg.Match_ID || leg.Match, leagueCode);
            }}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-colors shadow-sm"
            title={`Ouvrir l'analyse du match ${displayHome} vs ${displayAway}`}
          >
            <span>Voir Match</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        {/* Row 2: Market, Model Probability & Reference Odds */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] uppercase font-semibold text-slate-400 dark:text-slate-500 shrink-0">
              Marché :
            </span>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 break-words">
              {leg.Marche || 'Non spécifié'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Prob.</span>
              <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400">
                {probMeta.display}
              </span>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Cote Réf.</span>
              <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {oddsMeta.display}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

const TicketCard = ({ ticket, auditMode, onNavigateToMatch }) => {
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
    <div className={`flex flex-col bg-white dark:bg-slate-900/90 rounded-2xl overflow-hidden border ${familyMeta.cardBorderClass} ${familyMeta.cardGlowClass} transition-all relative`}>
      {auditMode && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md p-4 overflow-y-auto">
          <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap break-all">
            {JSON.stringify(ticket, null, 2)}
          </pre>
        </div>
      )}

      {/* 1. Primary Card Header */}
      <div className="p-3.5 sm:p-4.5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            {/* Human ID + Family Badge + Leg Count */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs sm:text-sm font-black tracking-tight border shadow-xs shrink-0 ${familyMeta.humanIdBadgeClass}`}>
                <Hash size={13} />
                {ticket.human_id}
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border shadow-xs shrink-0 ${familyMeta.badgeClass}`}>
                {familyMeta.label}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Box size={12} className="text-emerald-500" />
                {legCount} {legCount > 1 ? 'jambes' : 'jambe'}
              </span>
            </div>

            {/* Scope & Canonical ID preview */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                <Globe size={12} className="text-purple-500 shrink-0" />
                <span>Portée : {scopeType} ({scopeValue})</span>
              </span>
              {ticket.ticket_id && (
                <span className="font-mono text-slate-400 dark:text-slate-500 break-all" title={`ID canonique : ${ticket.ticket_id}`}>
                  ID : {ticket.ticket_id}
                </span>
              )}
            </div>
          </div>

          {/* Reference Floor Odds Product */}
          <div className="flex flex-col items-end shrink-0 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
              Cote Réf. Plancher
            </span>
            <span className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              {oddsMeta.display}
            </span>
          </div>
        </div>

        {/* 2. Compact Probabilities Section (2 compact blocks + discreet joint probability row) */}
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                Prob. Moy. Jambes
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white mt-0.5">
                {meanProbMeta.display}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                Prob. Min. Jambe
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white mt-0.5">
                {minProbMeta.display}
              </span>
            </div>
          </div>

          {/* Discreet Joint Probability Row */}
          <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/60 text-[11px]">
            <span className="font-medium text-slate-500 dark:text-slate-400">
              Prob. Jointe Ticket
            </span>
            <span
              className={`font-mono ${
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
      <div className="p-3 sm:p-4 bg-slate-50/60 dark:bg-slate-950/50 flex flex-col gap-2.5 flex-1">
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

export default function TicketsView({ assembled, finals, loading, onNavigateToMatch, initialView = 'summary' }) {
  const [activeView, setActiveView] = useState(initialView);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState('ALL');
  const [filterLeague, setFilterLeague] = useState('ALL');
  const [filterMarket, setFilterMarket] = useState('ALL');
  const [filterFamily, setFilterFamily] = useState('ALL');
  const [sortBy, setSortBy] = useState('prob');
  const [auditMode, setAuditMode] = useState(false);

  const [filterProduct, setFilterProduct] = useState('ALL');
  const [stratSortBy, setStratSortBy] = useState('mean_prob');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_TICKETS);
  const [expandedTicket, setExpandedTicket] = useState(null);
  const toggleExpanded = (idx) => setExpandedTicket(prev => prev === idx ? null : idx);

  // Reset progressive visible slice when ticket filters, search or sort change
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_TICKETS);
  }, [filterProduct, stratSortBy, searchQuery]);

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

  const singlesCount = useMemo(() => {
    return ticketsList.filter(t => t.product_code === 'SINGLE_1' || t.is_single_ticket).length;
  }, [ticketsList]);

  const combosCount = useMemo(() => {
    return Math.max(0, ticketsList.length - singlesCount);
  }, [ticketsList, singlesCount]);

  // Dynamic list of product families present in the dataset (preserving known + unknown families)
  const availableProducts = useMemo(() => {
    const codes = Array.from(new Set(ticketsList.map(t => t.product_code).filter(Boolean)));
    return codes.map(code => ({
      code,
      meta: getTicketFamilyMeta(code),
      count: ticketAttributionBundle.familyCounts[code] || 0
    }));
  }, [ticketsList, ticketAttributionBundle]);

  // 3. Global Filtering & Sorting on the FULL source (never mutating human_id)
  const filteredStrategies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return ticketsList.filter(t => {
      const matchesProduct = filterProduct === 'ALL' || t.product_code === filterProduct || t.categorie === filterProduct;
      if (!matchesProduct) return false;
      if (!q) return true;

      const humanIdMatch = (t.human_id || '').toLowerCase().includes(q);
      const canonicalIdMatch = (t.ticket_id || '').toLowerCase().includes(q);
      const nameMatch = (t.nom || '').toLowerCase().includes(q);
      const productMatch = (t.product_code || '').toLowerCase().includes(q) || (t.family_meta?.label || '').toLowerCase().includes(q);
      const scopeMatch = (t.scope_value || '').toLowerCase().includes(q) || (t.scope_type || '').toLowerCase().includes(q);
      const legMatch = Array.isArray(t.legs) && t.legs.some(l => {
        const { displayHome, displayAway } = resolveLegMatchDisplay(l.Match, l.League);
        return (
          (l.Match || '').toLowerCase().includes(q) ||
          displayHome.toLowerCase().includes(q) ||
          displayAway.toLowerCase().includes(q) ||
          (l.Match_ID || '').toLowerCase().includes(q) ||
          (l.League || '').toLowerCase().includes(q) ||
          (l.Marche || '').toLowerCase().includes(q)
        );
      });

      return humanIdMatch || canonicalIdMatch || nameMatch || productMatch || scopeMatch || legMatch;
    }).sort((a, b) => {
      if (stratSortBy === 'canonical') {
        return a.canonical_index - b.canonical_index;
      }
      if (stratSortBy === 'mean_prob' || stratSortBy === 'prob') {
        const pA = isValidNumericMetric(a.metrics?.mean_leg_model_probability) ? a.metrics.mean_leg_model_probability : -Infinity;
        const pB = isValidNumericMetric(b.metrics?.mean_leg_model_probability) ? b.metrics.mean_leg_model_probability : -Infinity;
        if (pB !== pA) return pB - pA;
        return a.canonical_index - b.canonical_index;
      }
      if (stratSortBy === 'min_prob') {
        const pA = isValidNumericMetric(a.metrics?.min_leg_model_probability) ? a.metrics.min_leg_model_probability : -Infinity;
        const pB = isValidNumericMetric(b.metrics?.min_leg_model_probability) ? b.metrics.min_leg_model_probability : -Infinity;
        if (pB !== pA) return pB - pA;
        return a.canonical_index - b.canonical_index;
      }
      if (stratSortBy === 'odds') {
        const oA = isValidNumericMetric(a.metrics?.reference_odds_floor_product) ? a.metrics.reference_odds_floor_product : -Infinity;
        const oB = isValidNumericMetric(b.metrics?.reference_odds_floor_product) ? b.metrics.reference_odds_floor_product : -Infinity;
        if (oB !== oA) return oB - oA;
        return a.canonical_index - b.canonical_index;
      }
      if (stratSortBy === 'legs') {
        const lA = isValidNumericMetric(a.metrics?.leg_count) ? a.metrics.leg_count : (a.legs?.length || 0);
        const lB = isValidNumericMetric(b.metrics?.leg_count) ? b.metrics.leg_count : (b.legs?.length || 0);
        if (lB !== lA) return lB - lA;
        return a.canonical_index - b.canonical_index;
      }
      return a.canonical_index - b.canonical_index;
    });
  }, [ticketsList, filterProduct, stratSortBy, searchQuery]);

  // 4. Progressive Slicing for Mobile/Desktop DOM performance
  const visibleStrategies = useMemo(() => {
    return filteredStrategies.slice(0, visibleCount);
  }, [filteredStrategies, visibleCount]);

  const remainingTicketsCount = Math.max(0, filteredStrategies.length - visibleStrategies.length);

  // Selections (CHOIX_FINAUX) aggregations & filters
  const uniqueLeagues = useMemo(() => {
    if (!finals?.Selections) return [];
    return Array.from(new Set(finals.Selections.map(s => s.League).filter(Boolean))).sort();
  }, [finals]);

  const uniqueFamilies = useMemo(() => {
    if (!finals?.Selections) return [];
    const names = finals.Selections.map(s => s.family_name || s.Type).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [finals]);

  const totalSelections = finals?.Selections?.length || 0;

  // Descriptive mean of model probabilities across valid CHOIX_FINAUX selections (never turning absent values into 0)
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

  const filteredPicks = useMemo(() => {
    if (!finals?.Selections) return [];
    const q = searchQuery.trim().toLowerCase();

    return finals.Selections.filter(p => {
      if (!p) return false;
      const familyRef = p.family_name || p.Type || '';
      const { displayHome, displayAway } = resolveLegMatchDisplay(p.Match, p.League);
      const matchSearch = !q ||
        (p.Match || '').toLowerCase().includes(q) ||
        displayHome.toLowerCase().includes(q) ||
        displayAway.toLowerCase().includes(q) ||
        (p.Match_ID || '').toLowerCase().includes(q) ||
        (p.League || '').toLowerCase().includes(q) ||
        (p.Marche || '').toLowerCase().includes(q) ||
        (p.Streak_Reason || '').toLowerCase().includes(q) ||
        familyRef.toLowerCase().includes(q) ||
        (p.Profile && p.Profile.some(prof => prof.toLowerCase().includes(q)));

      const matchesTier = filterTier === 'ALL' || p.Tier === parseInt(filterTier, 10);
      const matchesLeague = filterLeague === 'ALL' || p.League === filterLeague;
      const matchesFamily = filterFamily === 'ALL' || familyRef === filterFamily;
      let matchesMarket = true;
      if (filterMarket !== 'ALL') {
        const m = p.Marche || '';
        if (filterMarket === 'Over Goals') matchesMarket = m.includes('Over');
        else if (filterMarket === 'Under Goals') matchesMarket = m.includes('Under');
        else if (filterMarket === 'BTTS') matchesMarket = m.includes('BTTS');
        else matchesMarket = !m.includes('Over') && !m.includes('Under') && !m.includes('BTTS');
      }
      return matchSearch && matchesTier && matchesLeague && matchesFamily && matchesMarket;
    }).sort((a, b) => {
      if (sortBy === 'prob') {
        const pA = isValidNumericMetric(a.Prob) ? a.Prob : -Infinity;
        const pB = isValidNumericMetric(b.Prob) ? b.Prob : -Infinity;
        return pB - pA;
      }
      if (sortBy === 'odds') {
        const oA = isValidNumericMetric(a.Cote_Ref) ? a.Cote_Ref : -Infinity;
        const oB = isValidNumericMetric(b.Cote_Ref) ? b.Cote_Ref : -Infinity;
        return oB - oA;
      }
      if (sortBy === 'ev') {
        const eA = isValidNumericMetric(a.Score_EV) ? a.Score_EV : -Infinity;
        const eB = isValidNumericMetric(b.Score_EV) ? b.Score_EV : -Infinity;
        return eB - eA;
      }
      return 0;
    });
  }, [finals, searchQuery, filterTier, filterLeague, filterMarket, filterFamily, sortBy]);

  // Descriptive mean of Score_EV across filtered selections (never turning empty/absent into 0)
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
      <div className="sticky top-0 z-20 -mx-3 px-3 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0 py-2.5 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md border-b lg:border-none border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-hidden">
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
                  onClick={() => setActiveView('strategies')}
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

          {/* Alpha / Elite Tier 1 Picks */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Zap size={18} className="text-amber-500 fill-amber-500" /> Sélections Tier 1 (CHOIX_FINAUX)
              </h3>
              <button
                type="button"
                onClick={() => setActiveView('picks')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Voir les {totalSelections} choix →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {finals?.Selections && finals.Selections.some(s => s.Tier === 1) ? (
                finals.Selections.filter(s => s.Tier === 1).slice(0, 3).map((sel, idx) => {
                  const { homeRaw, awayRaw, displayHome, displayAway } = resolveLegMatchDisplay(sel.Match, sel.League);
                  const homeInfo = getTeamInfo(homeRaw);
                  const awayInfo = getTeamInfo(awayRaw);
                  const probMeta = formatProbabilityMetric(sel.Prob, 1);
                  const oddsMeta = formatOddsMetric(sel.Cote_Ref, 2);
                  const kickoffMeta = formatKickoffExplicit(sel);

                  return (
                    <div key={sel.Bet_ID || idx} className="bg-white dark:bg-slate-900/80 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <Badge variant="success" className="bg-emerald-600 text-white text-xs px-2.5 py-0.5 font-bold">
                          TIER 1
                        </Badge>
                        <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          Prob. {probMeta.display}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate text-right">{displayHome}</span>
                          <div className="w-6 h-6 shrink-0 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-0.5 border border-slate-200 dark:border-slate-700">
                            <img src={homeInfo.logoPath} alt={displayHome} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/default.png'; }} />
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">vs</span>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-start">
                          <div className="w-6 h-6 shrink-0 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-0.5 border border-slate-200 dark:border-slate-700">
                            <img src={awayInfo.logoPath} alt={displayAway} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/default.png'; }} />
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate text-left">{displayAway}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {sel.League} • <span className="font-mono">{kickoffMeta.display}</span>
                      </p>

                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 truncate pr-2">
                          {sel.Marche}
                        </span>
                        <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                          {oddsMeta.display}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigateToMatch(sel.Match_ID || sel.Match, sel.League || 'ALL')}
                        className="mt-auto w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span>Voir Match</span>
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-8 px-4 text-center text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  Aucune sélection Tier 1 dans cette session ({totalSelections} sélections totales disponibles dans l&apos;onglet Choix Finaux).
                </div>
              )}
            </div>
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
                Sorties brutes de <span className="font-mono">TICKETS_ASSEMBLES.json</span> • Numérotation humaine déterministe par session.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
              <span>Affichés : <strong className="font-mono text-emerald-600 dark:text-emerald-400">{visibleStrategies.length}</strong> / <strong className="font-mono">{filteredStrategies.length}</strong></span>
              {filteredStrategies.length !== ticketsList.length && (
                <span className="text-slate-400 font-mono">(Total : {ticketsList.length})</span>
              )}
            </div>
          </div>

          {/* Search, Product Filter & Sort Controls */}
          <div className="flex flex-col gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher par ID humain (ex: SINGLE-001, MICRO-001), ID canonique, équipe, ligue, marché..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                <Filter size={14} className="text-slate-400 shrink-0" />
                <label htmlFor="ticket-product-filter" className="text-xs font-semibold text-slate-500 shrink-0">
                  Famille :
                </label>
                <select
                  id="ticket-product-filter"
                  value={filterProduct}
                  onChange={e => setFilterProduct(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none w-full"
                >
                  <option value="ALL">Toutes les familles ({ticketsList.length})</option>
                  {availableProducts.map(({ code, meta, count }) => (
                    <option key={code} value={code}>
                      {meta.label} — {meta.prefix} ({count})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                <TrendingUp size={14} className="text-slate-400 shrink-0" />
                <label htmlFor="ticket-sort-select" className="text-xs font-semibold text-slate-500 shrink-0">
                  Tri :
                </label>
                <select
                  id="ticket-sort-select"
                  value={stratSortBy}
                  onChange={e => setStratSortBy(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none w-full"
                >
                  <option value="mean_prob">Prob. Moy. Jambes (Décroissant)</option>
                  <option value="min_prob">Prob. Min. Jambe (Décroissant)</option>
                  <option value="odds">Cote Réf. Plancher (Décroissant)</option>
                  <option value="legs">Nombre de Jambes (Décroissant)</option>
                  <option value="canonical">Ordre Canonique Moteur (ID)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tickets Grid */}
          {visibleStrategies.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {visibleStrategies.map((ticket) => (
                <TicketCard
                  key={ticket.human_id || ticket.ticket_id}
                  ticket={ticket}
                  auditMode={auditMode}
                  onNavigateToMatch={onNavigateToMatch}
                />
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-500">
              Aucun ticket ne correspond aux critères de recherche ou de filtre sélectionnés.
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

          <div className="flex flex-col gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher une équipe, ligue, marché, profil..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-slate-50 dark:bg-slate-950 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                <select value={filterTier} onChange={e => setFilterTier(e.target.value)} className="bg-transparent text-xs font-bold w-full focus:outline-none">
                  <option value="ALL">Tous les Tiers</option>
                  <option value="1">Tier 1</option>
                  <option value="2">Tier 2</option>
                  <option value="5">Tier 5</option>
                </select>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                <select value={filterLeague} onChange={e => setFilterLeague(e.target.value)} className="bg-transparent text-xs font-bold w-full focus:outline-none">
                  <option value="ALL">Toutes les Ligues</option>
                  {uniqueLeagues.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                <select value={filterFamily} onChange={e => setFilterFamily(e.target.value)} className="bg-transparent text-xs font-bold w-full focus:outline-none">
                  <option value="ALL">Toutes les Familles</option>
                  {uniqueFamilies.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-transparent text-xs font-bold w-full focus:outline-none">
                  <option value="prob">Tri : Prob. Modèle</option>
                  <option value="odds">Tri : Cote Réf.</option>
                  <option value="ev">Tri : Score_EV</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {filteredPicks.map((sel, idx) => {
              const isExpanded = expandedTicket === idx;
              const { homeRaw, awayRaw, displayHome, displayAway } = resolveLegMatchDisplay(sel.Match, sel.League);
              const homeInfo = getTeamInfo(homeRaw);
              const awayInfo = getTeamInfo(awayRaw);
              const probMeta = formatProbabilityMetric(sel.Prob, 1);
              const oddsMeta = formatOddsMetric(sel.Cote_Ref, 2);
              const evMeta = formatScoreEvMetric(sel.Score_EV, 3);
              const baseEvMeta = formatScoreEvMetric(sel.Score_EV_Original, 3);
              const kickoffMeta = formatKickoffExplicit(sel);

              return (
                <div key={sel.Bet_ID || idx} className="flex flex-col bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all hover:border-emerald-500/40">
                  {auditMode && (
                    <div className="absolute inset-0 z-50 bg-slate-900/95 p-4 overflow-y-auto">
                      <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap break-all">
                        {JSON.stringify(sel, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Always Visible Primary Info */}
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
                            <img src={homeInfo.logoPath} alt={displayHome} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/default.png'; }} />
                          </div>
                          <span className="text-sm font-bold text-slate-900 dark:text-white break-words">{displayHome}</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          vs
                        </span>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-1 shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                            <img src={awayInfo.logoPath} alt={displayAway} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/default.png'; }} />
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
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono" title={kickoffMeta.title || undefined}>
                          {sel.League} • {kickoffMeta.display}
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

                      {sel.Live_Betting_Recommendation?.[0] && (
                        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 p-3 rounded-xl flex items-start gap-2">
                          <Clock size={14} className="text-rose-500 shrink-0 mt-0.5" />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                              Live Recommendation {isValidNumericMetric(sel.Live_Betting_Recommendation[0].Force) ? `(${(sel.Live_Betting_Recommendation[0].Force * 100).toFixed(0)}% FORCE)` : ''}
                            </span>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                              {sel.Live_Betting_Recommendation[0].Signal} — {sel.Live_Betting_Recommendation[0].Argument}
                            </span>
                          </div>
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
            })}
          </div>
        </div>
      )}

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
    </div>
  );
}
