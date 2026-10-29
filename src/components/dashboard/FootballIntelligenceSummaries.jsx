import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Compass, Shield, Flame, ArrowUpRight, Info } from 'lucide-react';
import { formatEloRating, formatSignedEloDelta } from '../../utils/footballIntelligenceLoader';

/**
 * Compact Pre-Match Elo Summary Strip displayed immediately below the sticky header in MatchDashboard.
 * Strictly read-only presentation of rating_pre_match and rank_in_league.
 */
export function FiEloSummaryStrip({ status, summary, homeLabel, awayLabel, onOpenDetails }) {
  if (status === 'unavailable' || status === 'error') {
    return null;
  }

  if (status === 'loading') {
    return (
      <div
        data-testid="fi-elo-strip-loading"
        aria-label="Chargement du résumé Football Intelligence"
        aria-busy="true"
        className="w-full rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 px-3.5 py-2.5 animate-pulse flex items-center justify-between gap-3"
      >
        <div className="h-3.5 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-3.5 w-52 bg-slate-200 dark:bg-slate-800 rounded hidden sm:block" />
        <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    );
  }

  if (status !== 'ready' || !summary) {
    return null;
  }

  const { home, away, expectedParticipants, isFullCoverage, leagueName, canonicalLeagueName } = summary;
  if (!Number.isFinite(home?.rating) || !Number.isFinite(away?.rating)) {
    return null;
  }

  const displayLeague = leagueName || canonicalLeagueName;

  const formatRankBadge = (rank) => {
    if (!isFullCoverage || rank === null) {
      return 'Couverture saisonnière incomplète';
    }
    return `Rang Elo #${rank}/${expectedParticipants}`;
  };

  return (
    <div
      data-testid="fi-elo-summary-strip"
      className="w-full rounded-xl border border-indigo-200/70 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 px-3 sm:px-4 py-2.5 flex flex-col gap-2 transition-colors"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 min-w-0">
        {/* Left: Section label + visible league context on both mobile and desktop */}
        <div className="flex items-center justify-between lg:justify-start gap-2 shrink-0 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <Compass size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
              Indice Elo avant-match
            </span>
            {displayLeague && (
              <span
                data-testid="fi-elo-strip-league"
                className="text-[10px] font-mono font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/50"
              >
                {displayLeague}
              </span>
            )}
          </div>

          <button
            type="button"
            data-no-swipe="true"
            onClick={onOpenDetails}
            className="lg:hidden inline-flex items-center gap-1 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 min-h-[44px] px-2 -my-1.5 rounded-lg transition-colors shrink-0"
          >
            <span>Détails Football Intelligence</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        {/* Center: Home & Away Pre-Match Elo + Rank */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3 flex-1 min-w-0">
          {/* Home Team Elo */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-white/80 dark:bg-slate-900/70 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800/70 min-w-0">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={homeLabel}>
              {homeLabel}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                {formatEloRating(home.rating)}
              </span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                title={
                  isFullCoverage && home.rank !== null
                    ? `Rang Elo #${home.rank} sur ${expectedParticipants} en ${displayLeague}`
                    : 'Couverture saisonnière incomplète'
                }
              >
                {formatRankBadge(home.rank)}
              </span>
            </div>
          </div>

          {/* Away Team Elo */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-white/80 dark:bg-slate-900/70 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800/70 min-w-0">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={awayLabel}>
              {awayLabel}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                {formatEloRating(away.rating)}
              </span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                title={
                  isFullCoverage && away.rank !== null
                    ? `Rang Elo #${away.rank} sur ${expectedParticipants} en ${displayLeague}`
                    : 'Couverture saisonnière incomplète'
                }
              >
                {formatRankBadge(away.rank)}
              </span>
            </div>
          </div>
        </div>

        {/* Right (Desktop): Link to full Football Intelligence tab */}
        <button
          type="button"
          data-no-swipe="true"
          onClick={onOpenDetails}
          className="hidden lg:inline-flex items-center gap-1 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 transition-colors shrink-0"
        >
          <span>Détails Football Intelligence</span>
          <ArrowUpRight size={13} />
        </button>
      </div>

      {/* Concise semantic notice */}
      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 leading-tight">
        <Info size={11} className="text-indigo-500 shrink-0" />
        <span>Indice de force descriptif — ce n&apos;est ni une probabilité de victoire ni une cote.</span>
      </div>
    </div>
  );
}

/**
 * Compact Opponent Quality (L5) summary block for the Series & Form tab wrapper.
 * Strictly separated from W/D/L results, goal series, and statistical streaks.
 */
export function FiOpponentQualitySummary({ status, summary, homeLabel, awayLabel, onOpenDetails }) {
  if (status === 'loading') {
    return (
      <Card className="border-slate-200 dark:border-slate-800 animate-pulse">
        <div data-testid="fi-oq-summary-loading" aria-busy="true">
          <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
          <div className="h-3 w-80 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      </Card>
    );
  }

  if (status === 'unavailable' || status === 'error' || !summary) {
    return (
      <Card className="border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40">
        <div
          data-testid="fi-oq-summary-unavailable"
          className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400"
        >
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-slate-400 shrink-0" />
            <span>
              {status === 'error'
                ? 'Données Football Intelligence momentanément indisponibles.'
                : 'Opponent Quality non disponible pour cette rencontre.'}
            </span>
          </div>
        </div>
      </Card>
    );
  }

  const { home, away, isFullCoverage } = summary;

  const renderSideOq = (label, sideData, accentClass) => {
    const oq = sideData?.oq || { avgL5: null, gapVsActive: null, nObs: 0, nCtx: 0, notes: [] };
    const isZeroCoverage = oq.nObs === 0;

    return (
      <div className="p-3 rounded-xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{label}</span>
          <Badge
            variant={oq.nObs === 5 ? 'info' : 'warning'}
            className="text-[10px] font-mono px-2 py-0.5 shrink-0"
          >
            Couverture L5 : {oq.nObs}/5
          </Badge>
        </div>

        {isZeroCoverage ? (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[11px] font-medium text-amber-800 dark:text-amber-300">
            Historique récent insuffisant
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">
                Niveau Elo moyen des derniers adversaires (L5)
              </div>
              <div className={`text-sm font-mono font-black mt-0.5 ${accentClass}`}>
                {formatEloRating(oq.avgL5)} <span className="text-[10px] font-normal text-slate-400">Elo</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">
                Écart vs moyenne active actuelle du championnat
              </div>
              <div className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {isFullCoverage && oq.gapVsActive !== null ? (
                  <>
                    {formatSignedEloDelta(oq.gapVsActive)}{' '}
                    <span className="text-[10px] font-normal text-slate-400">Elo</span>
                  </>
                ) : (
                  <span className="text-xs font-sans font-medium text-amber-600 dark:text-amber-400">
                    Couverture saisonnière incomplète
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {oq.notes?.length > 0 && (
          <div className="flex flex-col gap-1">
            {oq.notes.map((note, idx) => (
              <div key={idx} className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                • {note}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-indigo-200/70 dark:border-indigo-900/50 bg-white dark:bg-slate-900 shadow-2xs">
      <div data-testid="fi-oq-summary">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/70 dark:border-slate-800/70">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0 mt-0.5">
              <Shield size={15} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Niveau Elo moyen des derniers adversaires (Opponent Quality L5)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                Difficulté du calendrier passé — distincte de la forme V/N/D, des séries et des streaks.
              </p>
            </div>
          </div>

          <button
            type="button"
            data-no-swipe="true"
            onClick={onOpenDetails}
            className="inline-flex items-center gap-1 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors self-start sm:self-center shrink-0"
          >
            <span>Analyse détaillée</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {renderSideOq(homeLabel, home, 'text-indigo-600 dark:text-indigo-400')}
          {renderSideOq(awayLabel, away, 'text-emerald-600 dark:text-emerald-400')}
        </div>
      </div>
    </Card>
  );
}

/**
 * Conditional Documented Rivalry card for the Narrative & Justice tab wrapper.
 * Rendered ONLY when rivalry_intelligence.status === 'RECORDED_IN_PILOT_REGISTRY' (isDocumentedRivalry === true).
 */
export function FiDocumentedRivalryCard({ rivalry, onOpenDetails }) {
  if (!rivalry || !rivalry.isDocumentedRivalry) {
    return null;
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/15">
      <div
        data-testid="fi-documented-rivalry-card"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
            <Flame size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="warning" className="text-[10px] font-mono px-2 py-0.5">
                {rivalry.badgeLabel}
              </Badge>
              {rivalry.categoryLabel && (
                <Badge variant="default" className="text-[10px] font-mono px-2 py-0.5">
                  {rivalry.categoryLabel}
                </Badge>
              )}
              {rivalry.establishedSince && (
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Documentée depuis {rivalry.establishedSince}
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
              {rivalry.rivalryName}
            </h4>

            {rivalry.geographicScope && (
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Périmètre géographique / historique :{' '}
                <span className="font-semibold">{rivalry.geographicScope}</span>
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Registre partiel de rivalités — catégorie qualitative, pas une échelle d&apos;intensité.
            </p>
          </div>
        </div>

        <button
          type="button"
          data-no-swipe="true"
          onClick={onOpenDetails}
          className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg hover:bg-amber-500/10 transition-colors self-start sm:self-center shrink-0"
        >
          <span>Voir dans Football Intelligence</span>
          <ArrowUpRight size={13} />
        </button>
      </div>
    </Card>
  );
}
