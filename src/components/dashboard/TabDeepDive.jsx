import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Ban,
  Zap,
  Info,
  ShieldCheck,
  Fingerprint,
  Trophy,
  Activity,
  Clock,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export default function TabDeepDive({ match, leagueReport: propsLeagueReport, onNavigateTab }) {
  const leagueReport = propsLeagueReport || match?.leagueReport || [];
  const rejectedBets = leagueReport.filter(r => r.Streak_Status === 'STREAK_WARNING');
  const validatedBets = leagueReport.filter(r => r.Streak_Status === 'STREAK_CONFIRMED');
  const neutralBets = leagueReport.filter(r => r.Streak_Status === 'STREAK_NEUTRAL');
  const masterReason = match.masterReason || null;

  const serieIntel = match.Serie_Intelligence || {};
  const analytical = match.Analytical_Signals || {};
  const seriesAlignment = analytical.series_alignment || {};
  const lateGame = analytical.historical_late_game_scenarios || {};
  const risk = match.Risk_Management_Context || {};
  const investSignals = risk.Investment_Signals || {};
  const operational = risk.Operational_Restrictions || {};
  const blockedMarkets = operational.blocked_markets || [];
  const probs = match.True_Probabilities || {};

  const isKillSwitchActive = investSignals.IS_KILL_SWITCH_ACTIVE ||
    ((probs.PROB_1 === 0 || probs.PROB_1 == null) && (probs.PROB_O25 === 0 || probs.PROB_O25 == null));

  // Confirmed and warning streaks from native matrix outputs
  const confirmedStreaks = Array.from(new Set([
    ...(serieIntel.STREAK_CONFIRMED || []),
    ...(seriesAlignment.confirmed_streaks || [])
  ]));

  const warningStreaks = Array.from(new Set([
    ...(serieIntel.STREAK_WARNING || []),
    ...(seriesAlignment.warning_streaks || [])
  ]));

  const liveSignals = serieIntel.LIVE_SIGNALS || [];
  const lateGameMetrics = lateGame.metrics || {};

  const homeTeam = match.shortHome || match.Matchup?.split(' vs ')[0] || 'Home';
  const awayTeam = match.shortAway || match.Matchup?.split(' vs ')[1] || 'Away';

  const hasAnyData = match.isFinalPick ||
                     confirmedStreaks.length > 0 ||
                     warningStreaks.length > 0 ||
                     liveSignals.length > 0 ||
                     lateGame.data_available ||
                     leagueReport.length > 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-3 duration-500">

      {/* 1. Operational Vigilance Banner if Kill-Switch or Blocked Markets (Always prioritized before any pick presentation) */}
      {(isKillSwitchActive || blockedMarkets.length > 0) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0" size={18} />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                Restrictions opérationnelles du Risk Manager
              </span>
              <span className="text-[9px] text-slate-600 dark:text-slate-400">
                {isKillSwitchActive && 'Kill-Switch actif sur cette rencontre (neutralisation prioritaire). '}
                {blockedMarkets.length > 0 && `Marchés exclus par la gestion de risque : ${blockedMarkets.join(', ')}.`}
              </span>
            </div>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('risk')}
              className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30 transition-colors flex items-center gap-1 shrink-0"
            >
              Consulter Risk Context <ArrowRight size={10} />
            </button>
          )}
        </div>
      )}

      {/* 2. MASTER SELECTION HERO (if isFinalPick) */}
      {match.isFinalPick && (
        <div className="relative rounded-[1.5rem] p-6 lg:p-8 overflow-hidden bg-emerald-600 dark:bg-emerald-900 border border-emerald-400/30 shadow-2xl">
          <div className="absolute top-0 right-0 p-6 opacity-10 text-white pointer-events-none">
            <Trophy size={100} />
          </div>
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md border border-white/20">
                  <Trophy size={18} className="text-white" />
                </div>
                <span className="text-[10px] font-black text-emerald-50 uppercase tracking-[0.3em]">Master Selection</span>
              </div>
              {isKillSwitchActive && (
                <div className="flex items-center gap-1.5 text-[9px] font-black text-rose-200 uppercase tracking-widest bg-rose-950/70 px-3 py-1 rounded-full border border-rose-400/50">
                  <AlertTriangle size={12} className="text-rose-400" /> Veto Risk Manager Actif
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xl lg:text-2xl font-serif font-black text-white uppercase tracking-tight leading-tight">Master Selection Insight</h3>
              <p className="text-emerald-50 max-w-3xl text-xs lg:text-sm leading-relaxed font-medium italic bg-black/20 p-4 rounded-2xl border border-white/10 shadow-inner">
                {masterReason || "Titanium Engine High-Reliability situational pick."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-100 uppercase tracking-widest bg-emerald-700/40 px-3 py-1.5 rounded-full border border-emerald-400/20">
                  <ShieldCheck size={12} /> Selected / Final Pick
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-100 uppercase tracking-widest bg-emerald-700/40 px-3 py-1.5 rounded-full border border-emerald-400/20">
                  <Zap size={12} /> Elite Synergy
                </div>
              </div>
              <span className="text-[8px] text-emerald-100/70 italic">
                * Sélection analytique finale issue de la session — distincte des signaux de séries et soumise aux autorisations du Risk Manager.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Analytical Summary Header */}
      <div className="bg-slate-900 dark:bg-black rounded-[1.5rem] p-6 border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 text-white pointer-events-none">
          <Fingerprint size={80} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-2">
             <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
               <Fingerprint size={16} className="text-blue-400" />
             </div>
             <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Signals & Bet Review</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-serif font-black text-white tracking-tight leading-tight mb-2">
            Titanium <span className="text-blue-400">Analytical Audit</span>
          </h2>
          <div className="flex flex-wrap gap-2 pt-1 text-[9px] font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 border border-white/10">
              Alignements de séries : <strong>{confirmedStreaks.length}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 border border-white/10">
              Avertissements de séries : <strong>{warningStreaks.length}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 border border-white/10">
              Sélections auxiliaires : <strong>{leagueReport.length}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 border border-white/10">
              Scénarios fin de match : <strong>{lateGame.data_available ? 'DISPONIBLES' : 'AUCUN'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Native Matrix Serie Intelligence (Confirmed Streaks vs Warning Conflicts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Confirmed Streaks (Engine Alignment) */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
               <CheckCircle2 size={14} /> Confirmed Streaks (Engine Alignment)
            </div>
            <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px]">
              {confirmedStreaks.length}
            </Badge>
          </div>

          <div className="flex flex-col gap-3">
            {confirmedStreaks.map((streak, idx) => (
              <div key={`matrix-${idx}`} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-500/20 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      {streak.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">
                      TITANIUM V2 STREAK_CONFIRMED
                    </span>
                  </div>
                </div>
                <Badge variant="success" className="text-[8px] uppercase">CONFIRMED</Badge>
              </div>
            ))}

            {confirmedStreaks.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                <CheckCircle2 size={24} className="mb-2 opacity-20 text-slate-400" />
                <p className="text-[9px] uppercase font-bold tracking-widest text-center">Aucune confirmation de série active</p>
              </div>
            )}
          </div>
        </div>

        {/* Warning Conflicts (Historical Trend Warnings) */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-widest">
               <Ban size={14} /> Streak Warnings (Conflits Historiques)
            </div>
            <Badge variant="danger" className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[9px]">
              {warningStreaks.length}
            </Badge>
          </div>

          <div className="flex flex-col gap-3">
            {warningStreaks.map((warning, idx) => (
              <div key={`warn-${idx}`} className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <AlertTriangle size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                      {warning.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[9px] text-rose-600/80 dark:text-rose-400/80 font-bold uppercase tracking-widest">
                      TITANIUM V2 STREAK_WARNING
                    </span>
                  </div>
                </div>
                <Badge variant="danger" className="text-[8px] uppercase">WARNING</Badge>
              </div>
            ))}

            {warningStreaks.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                 <ShieldCheck size={28} className="mb-2 opacity-20 text-slate-400" />
                 <p className="text-[9px] uppercase font-bold tracking-widest text-center">Aucun avertissement de série détecté sur ce match</p>
              </div>
            )}

            <p className="text-[8px] text-slate-400 italic px-1">
              * Les avertissements de série traduisent une rupture ou un conflit statistique dans les tendances d'équipes. Ils ne constituent pas un veto opérationnel du Risk Manager.
            </p>
          </div>
        </div>

      </div>

      {/* 5. Auxiliary Bet Selection Review (League Report) - STRICTLY SEGREGATED */}
      {leagueReport.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Bet Selection Review (Catalogue Auxiliaire)
              </h3>
              <p className="text-[9px] text-slate-400 italic">
                Audit détaillé des sélections de marché avec contrôle de série et confirmation score exact.
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="success" className="text-[8px]">
                {validatedBets.length} CONFIRMED
              </Badge>
              <Badge variant="default" className="text-[8px]">
                {neutralBets.length} NEUTRAL
              </Badge>
              <Badge variant="danger" className="text-[8px]">
                {rejectedBets.length} WARNING
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Validated Bets */}
            {validatedBets.map((bet, idx) => (
              <div key={`val-${idx}`} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-emerald-500/30 shadow-sm flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-start justify-between mb-1.5 gap-2">
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-white uppercase tracking-wider">
                      CONFIRMED
                    </span>
                    <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      @{bet.Cote_Ref}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">{bet.Marche}</h4>
                  <span className="text-[8px] text-slate-400 uppercase font-mono">{bet.Type}</span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 italic leading-relaxed">
                    <span className="text-emerald-600 dark:text-emerald-400 not-italic font-bold mr-1">Raison:</span>
                    {bet.Streak_Reason}
                  </p>
                  {bet.Score_Exact_Confirmation && (
                    <div className="flex items-center gap-1.5 text-[8px] text-slate-700 dark:text-slate-300 font-bold bg-emerald-500/5 p-1.5 rounded-lg border border-emerald-500/10">
                      <Zap size={10} className="text-emerald-500 shrink-0" />
                      <span className="truncate">{bet.Score_Exact_Confirmation}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Neutral Bets - SEGREGATED CLEANLY */}
            {neutralBets.map((bet, idx) => (
              <div key={`neu-${idx}`} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-start justify-between mb-1.5 gap-2">
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      STREAK_NEUTRAL
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-400">
                      @{bet.Cote_Ref}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">{bet.Marche}</h4>
                  <span className="text-[8px] text-slate-400 uppercase font-mono">{bet.Type}</span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 italic leading-relaxed">
                    <span className="text-slate-500 not-italic font-bold mr-1">Raison:</span>
                    {bet.Streak_Reason}
                  </p>
                  {bet.Score_Exact_Confirmation && (
                    <div className="flex items-center gap-1.5 text-[8px] text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <HelpCircle size={10} className="text-slate-400 shrink-0" />
                      <span className="truncate">{bet.Score_Exact_Confirmation}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Warned Bets */}
            {rejectedBets.map((bet, idx) => (
              <div key={`rej-${idx}`} className="bg-slate-50/60 dark:bg-slate-950/60 p-4 rounded-2xl border border-rose-500/20 shadow-sm flex flex-col justify-between gap-2 opacity-85">
                <div>
                  <div className="flex items-start justify-between mb-1.5 gap-2">
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                      STREAK_WARNING
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-400">
                      @{bet.Cote_Ref}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{bet.Marche}</h4>
                  <span className="text-[8px] text-slate-400 uppercase font-mono">{bet.Type}</span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60">
                  <p className="text-[9px] text-rose-600/80 dark:text-rose-400/80 italic leading-relaxed">
                    <span className="text-rose-600 dark:text-rose-400 not-italic font-bold mr-1">Raison:</span>
                    {bet.Streak_Reason}
                  </p>
                </div>
              </div>
            ))}

          </div>
        </div>
      )}

      {/* 6. Late-Game & Historical Scenarios (Pre-match Analysis) */}
      {(liveSignals.length > 0 || lateGame.data_available) && (
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Clock size={16} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Late-Game & Historical Scenarios (Pre-match Analysis)
                </h3>
                <span className="text-[9px] text-slate-400 italic">
                  Information analytique pré-calculée en amont du match — ne constitue pas une observation temps réel.
                </span>
              </div>
            </div>
            {lateGame.data_available && (
              <Badge variant="info" className="text-[8px] font-mono self-start sm:self-auto">DATA AVAILABLE</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Signals & Anticipated Scenarios */}
            <div className="flex flex-col gap-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Signaux In-Play Anticipés</span>
              {liveSignals.length > 0 ? (
                liveSignals.map((signal, idx) => (
                  <div key={idx} className="bg-indigo-500/10 border border-indigo-500/30 p-3.5 rounded-xl flex items-center gap-3">
                    <Zap className="text-indigo-600 dark:text-indigo-400 shrink-0" size={18} />
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                        {signal.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[9px] text-indigo-600/80 dark:text-indigo-400/80 italic">
                        Scénario de forte intensité détecté dans les profils historiques de fin de match.
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs italic">
                  Aucun signal in-play spécifique anticipé.
                </div>
              )}
            </div>

            {/* Clutch & Collapse Metrics (Dès 75') */}
            <div className="flex flex-col gap-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Profils de Fin de Match (Dès 75')</span>
              <div className="grid grid-cols-2 gap-3">
                {/* Home Metrics */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{homeTeam}</span>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[9px] text-slate-500 uppercase">Clutch 75':</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {lateGameMetrics.home_clutch_index != null ? `${(lateGameMetrics.home_clutch_index * 100).toFixed(0)}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[9px] text-slate-500 uppercase">Collapse 75':</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {lateGameMetrics.home_collapse_index != null ? `${(lateGameMetrics.home_collapse_index * 100).toFixed(0)}%` : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Away Metrics */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">{awayTeam}</span>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[9px] text-slate-500 uppercase">Clutch 75':</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {lateGameMetrics.away_clutch_index != null ? `${(lateGameMetrics.away_clutch_index * 100).toFixed(0)}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[9px] text-slate-500 uppercase">Collapse 75':</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {lateGameMetrics.away_collapse_index != null ? `${(lateGameMetrics.away_collapse_index * 100).toFixed(0)}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!hasAnyData && (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-[1.5rem] border border-dashed border-slate-200 dark:border-slate-800">
          <Info size={32} className="mb-3 opacity-20" />
          <p className="text-xs font-mono uppercase tracking-widest text-center">
            Aucun signal expert spécifique détecté pour cette rencontre.
          </p>
        </div>
      )}

    </div>
  );
}
