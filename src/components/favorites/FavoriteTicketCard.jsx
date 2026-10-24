import React, { useState } from 'react';
import { Bookmark, Hash, Box, ArrowUpRight, ChevronDown, ChevronUp, Clock, Calendar, Database, ShieldCheck } from 'lucide-react';
import { getTicketFamilyMeta, formatProbabilityMetric, formatOddsMetric } from '../../utils/ticketIdentifier';
import { getMarketFamilyMeta } from '../../utils/ticketFilters';
import { LeagueLogo, getLeagueDisplayName } from '../../utils/teamLogos';
import { findExactMatch } from '../../utils/favoritesStorage';

/**
 * Carte de restitution d'un ticket favori (WEB-FAVORITES-001 - Phase 5)
 *
 * Principes :
 * 1. Restitution pure des sorties enregistrées (snapshot immuable).
 * 2. Distinction explicite entre session actuelle et ticket archivé / hors session.
 * 3. Surface interactive >= 44x44 px pour le bouton de retrait.
 * 4. Navigation sécurisée vers le dashboard d'un match si présent dans la session.
 * 5. Zéro recalcul client des probabilités, cotes ou probabilités jointes.
 */
export function FavoriteTicketCard({
  favoriteTicket,
  isCurrentSession = false,
  currentMatches = [],
  onNavigateToMatch,
  onRemove
}) {
  const [showAllLegs, setShowAllLegs] = useState(false);

  if (!favoriteTicket) return null;

  const {
    ticketId,
    humanIdAtSave,
    savedAt,
    originSession = {},
    snapshot = {}
  } = favoriteTicket;

  const productCode = snapshot.product_code || 'SINGLE_1';
  const familyMeta = getTicketFamilyMeta(productCode);
  const legs = Array.isArray(snapshot.legs) ? snapshot.legs : [];
  const metrics = snapshot.metrics || {};

  const oddsMeta = formatOddsMetric(metrics.reference_odds_floor_product, 2);
  const meanProbMeta = formatProbabilityMetric(metrics.mean_leg_model_probability, 1);
  const minProbMeta = formatProbabilityMetric(metrics.min_leg_model_probability, 1);
  const jointProbMeta = formatProbabilityMetric(metrics.joint_ticket_probability, 1);

  const displayedLegs = showAllLegs ? legs : legs.slice(0, 3);
  const hiddenLegsCount = Math.max(0, legs.length - 3);

  // Formatage de la date de sauvegarde
  const formattedSavedDate = savedAt ? new Date(savedAt).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : 'Date inconnue';

  return (
    <div
      data-testid="favorite-ticket-card"
      className={`flex flex-col rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${familyMeta.cardBorderClass} ${familyMeta.cardGlowClass}`}>
      {/* 1. Header du Ticket */}
      <div className="bg-slate-50/90 dark:bg-slate-950/70 p-3 sm:p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            {humanIdAtSave && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-mono text-xs sm:text-sm font-black tracking-tight border shadow-xs shrink-0 ${familyMeta.humanIdBadgeClass}`}>
                <Hash size={12} />
                {humanIdAtSave}
              </span>
            )}
            <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold border shadow-xs shrink-0 ${familyMeta.badgeClass}`}>
              {familyMeta.label}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
              <Box size={11} className="text-emerald-500" />
              {legs.length} {legs.length > 1 ? 'jambes' : 'jambe'}
            </span>

            {/* Badge Session active vs Historique */}
            {isCurrentSession ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
                Session active
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0"
                title="Ticket enregistré lors d'une session antérieure"
              >
                Historique
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Cote Plancher */}
            <div className="flex items-center gap-1.5 shrink-0 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 px-2 sm:px-2.5 py-1 rounded-xl" title="Cote Référence Plancher">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight hidden sm:inline">
                Cote Réf.
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                {oddsMeta.display}
              </span>
            </div>

            {/* Bouton Signet de retrait (>= 44x44 px) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(ticketId);
              }}
              data-no-swipe="true"
              aria-label={`Retirer le ticket ${humanIdAtSave || ticketId} des favoris`}
              aria-pressed="true"
              title="Retirer ce ticket des favoris"
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-500 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 shrink-0"
            >
              <Bookmark size={18} className="fill-amber-400 text-amber-500" />
            </button>
          </div>
        </div>

        {/* Identifiant technique complet */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-0.5 truncate">
          <span className="truncate mr-2">ID : {ticketId}</span>
          <span className="shrink-0 text-[10px] text-slate-400">Sauvegardé le {formattedSavedDate}</span>
        </div>

        {/* Métriques quantitatives clés (Zéro recalcul client) */}
        <div className="grid grid-cols-3 gap-1.5 text-xs pt-1">
          <div className="bg-white/80 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800 flex items-center justify-between min-w-0">
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate mr-1">
              Prob. Moy.
            </span>
            <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white shrink-0">
              {meanProbMeta.display}
            </span>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800 flex items-center justify-between min-w-0">
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate mr-1">
              Prob. Min.
            </span>
            <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white shrink-0">
              {minProbMeta.display}
            </span>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800 flex items-center justify-between min-w-0">
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate mr-1">
              Prob. Jointe
            </span>
            <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white shrink-0">
              {jointProbMeta.display}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Composition des Jambes du Ticket */}
      <div className="p-3 sm:p-4 flex flex-col gap-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
          Composition des jambes ({legs.length})
        </div>

        <div className="flex flex-col gap-2">
          {displayedLegs.map((leg, lidx) => {
            const marketMeta = getMarketFamilyMeta(leg.Marche || leg.Type || leg.family_name);
            const legProbMeta = formatProbabilityMetric(leg.Prob, 1);
            const legOddsMeta = formatOddsMetric(leg.Cote_Ref, 2);

            // Recherche exacte si le match de cette jambe existe dans la session active
            const matchedMatchInSession = findExactMatch(currentMatches, leg.Match_ID || leg.Match, leg.League);

            return (
              <div
                key={leg.Bet_ID || `${ticketId}-leg-${lidx}`}
                className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <LeagueLogo league={leg.League} size="xs" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {leg.Match}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 font-mono text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">P: <strong className="text-slate-800 dark:text-slate-200">{legProbMeta.display}</strong></span>
                    <span className="text-slate-400">·</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{legOddsMeta.display}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-bold ${marketMeta.containerClass}`}>
                    <span className={`text-[9px] uppercase px-1 rounded ${marketMeta.badgeClass}`}>
                      {marketMeta.label}
                    </span>
                    <span className="truncate max-w-[160px] sm:max-w-[220px]">
                      {leg.Marche || 'Marché'}
                    </span>
                  </div>

                  {/* Navigation vers le match s'il existe dans la session */}
                  {matchedMatchInSession ? (
                    <button
                      type="button"
                      onClick={() => onNavigateToMatch(matchedMatchInSession)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-2xs shrink-0"
                    >
                      <span>Voir match</span>
                      <ArrowUpRight size={12} />
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 shrink-0">
                      Hors session
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hiddenLegsCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAllLegs(!showAllLegs)}
            className="w-full py-1.5 mt-1 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100/60 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center justify-center gap-1"
          >
            {showAllLegs ? (
              <>
                <span>Réduire les jambes</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>Afficher {hiddenLegsCount} jambe{hiddenLegsCount > 1 ? 's' : ''} supplémentaire{hiddenLegsCount > 1 ? 's' : ''}</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        )}

        {/* 3. Provenance & Métadonnées d'origine */}
        {originSession.sessionId && (
          <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500">
            <span className="truncate max-w-[200px]">Session : {originSession.sessionId}</span>
            {originSession.sourceMatrix && (
              <span className="truncate max-w-[200px]">Source : {originSession.sourceMatrix}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
