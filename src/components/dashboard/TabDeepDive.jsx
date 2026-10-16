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
  AlertTriangle 
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export default function TabDeepDive({ match, leagueReport: propsLeagueReport }) {
  const leagueReport = propsLeagueReport || match?.leagueReport || [];
  const rejectedBets = leagueReport.filter(r => r.Streak_Status === 'STREAK_WARNING');
  const validatedBets = leagueReport.filter(r => r.Streak_Status === 'STREAK_CONFIRMED');
  const neutralBets = leagueReport.filter(r => r.Streak_Status === 'STREAK_NEUTRAL');
  const masterReason = match.masterReason || null;

  const serieIntel = match.Serie_Intelligence || {};
  const analytical = match.Analytical_Signals || {};
  const seriesAlignment = analytical.series_alignment || {};
  const lateGame = analytical.historical_late_game_scenarios || {};

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
  const lateGameScenarios = lateGame.scenarios || [];
  const lateGameMetrics = lateGame.metrics || {};

  const hasAnyData = match.isFinalPick || 
                     confirmedStreaks.length > 0 || 
                     warningStreaks.length > 0 || 
                     liveSignals.length > 0 || 
                     lateGame.data_available || 
                     leagueReport.length > 0;

  const homeTeam = match.shortHome || match.Matchup?.split(' vs ')[0] || 'Home';
  const awayTeam = match.shortAway || match.Matchup?.split(' vs ')[1] || 'Away';

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* 1. MASTER SELECTION HERO */}
      {match.isFinalPick && (
        <div className="relative rounded-[1.5rem] p-6 lg:p-8 overflow-hidden bg-emerald-600 dark:bg-emerald-900 border border-emerald-400/30 shadow-2xl">
          <div className="absolute top-0 right-0 p-6 opacity-10 text-white pointer-events-none">
            <Trophy size={100} />
          </div>
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
               <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md border border-white/20">
                 <Trophy size={18} className="text-white" />
               </div>
               <span className="text-[10px] font-black text-emerald-50 uppercase tracking-[0.3em]">Master Selection</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xl lg:text-2xl font-serif font-black text-white uppercase tracking-tight leading-tight">Master Selection Insight</h3>
              <p className="text-emerald-50 max-w-3xl text-xs lg:text-sm leading-relaxed font-medium italic bg-black/20 p-4 rounded-2xl border border-white/10 shadow-inner">
                {masterReason || "Titanium Engine High-Reliability situational pick."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-100 uppercase tracking-widest bg-emerald-700/40 px-3 py-1.5 rounded-full border border-emerald-400/20">
                <ShieldCheck size={12} /> Selected / Final Pick
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-100 uppercase tracking-widest bg-emerald-700/40 px-3 py-1.5 rounded-full border border-emerald-400/20">
                <Zap size={12} /> Elite Synergy
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Header Information */}
      <div className="bg-slate-900 dark:bg-black rounded-[1.5rem] p-6 border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 text-white pointer-events-none">
          <Fingerprint size={80} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-2">
             <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
               <Fingerprint size={16} className="text-blue-400" />
             </div>
             <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Analytical Deep-Dive</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-serif font-black text-white tracking-tight leading-tight mb-1">
            Titanium <span className="text-blue-400">Black Box</span>
          </h2>
          <p className="text-slate-400 max-w-xl text-[10px] leading-relaxed font-medium italic">
            Signaux experts de séries, scénarios in-play pré-match et audit des vetos algorithmiques.
          </p>
        </div>
      </div>

      {/* 3. In-Play Historical & Late-Game Scenarios (Pré-match) */}
      {(liveSignals.length > 0 || lateGame.data_available) && (
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Clock size={16} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Late-Game & In-Play Historical Scenarios (Pre-match Analysis)
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
            {/* Live Signals & Qualitative Scenarios */}
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

            {/* Clutch & Collapse Metrics */}
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

      {/* 4. Native Matrix Serie Intelligence (Confirmed Streaks vs Warning Conflicts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Validated & Confirmed Streaks */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
               <CheckCircle2 size={14} /> Confirmed Streaks (Engine Alignment)
            </div>
            <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px]">
              {confirmedStreaks.length + validatedBets.length + neutralBets.length}
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

            {/* Auxiliary League Report Validated / Neutral items */}
            {[...validatedBets, ...neutralBets].map((bet, idx) => (
              <div key={`rep-${idx}`} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                 <div className="flex items-start justify-between mb-2 gap-3">
                   <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                         <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${bet.Streak_Status === 'STREAK_CONFIRMED' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                           {bet.Streak_Status === 'STREAK_CONFIRMED' ? 'CONFIRMED' : 'NEUTRAL'}
                         </span>
                         <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter truncate">{bet.Type}</span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase truncate">{bet.Marche}</h4>
                   </div>
                   <div className="flex items-center gap-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/20 shrink-0">
                      <span className="text-[7px] font-black text-emerald-600 dark:text-emerald-400">ODDS</span>
                      <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">@{bet.Cote_Ref}</span>
                   </div>
                 </div>

                 <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 italic mb-2 p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-emerald-500 not-italic font-black uppercase mr-1.5 text-[8px]">Reason:</span>
                    {bet.Streak_Reason}
                 </p>

                 {bet.Score_Exact_Confirmation && (
                   <div className="flex items-center gap-2 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                      <Zap size={12} className="text-emerald-500" />
                      <span className="text-[9px] font-black text-slate-700 dark:text-slate-200 truncate">{bet.Score_Exact_Confirmation}</span>
                   </div>
                 )}
              </div>
            ))}

            {confirmedStreaks.length === 0 && validatedBets.length === 0 && neutralBets.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                <CheckCircle2 size={24} className="mb-2 opacity-20 text-slate-400" />
                <p className="text-[9px] uppercase font-bold tracking-widest text-center">Aucune confirmation de série active</p>
              </div>
            )}
          </div>
        </div>

        {/* Warning Conflicts & Security Vetos */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-[9px] font-black text-rose-500 uppercase tracking-widest">
               <Ban size={14} /> Streak Warnings & Security Vetos
            </div>
            <Badge variant="danger" className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[9px]">
              {warningStreaks.length + rejectedBets.length}
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

            {/* Auxiliary League Report Rejected items */}
            {rejectedBets.map((bet, idx) => (
              <div key={`rej-${idx}`} className="bg-slate-50/50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/50 grayscale opacity-80 group hover:opacity-100 transition-all">
                 <div className="flex items-center justify-between mb-2 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Ban size={10} className="text-rose-500 shrink-0" />
                      <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase truncate">{bet.Marche}</h4>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 font-mono shrink-0">@{bet.Cote_Ref}</span>
                 </div>
                 
                 <div className="p-2 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-medium text-slate-500 italic leading-relaxed">
                       {bet.Streak_Reason}
                    </p>
                 </div>
              </div>
            ))}

            {warningStreaks.length === 0 && rejectedBets.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                 <ShieldCheck size={28} className="mb-2 opacity-20 text-emerald-500" />
                 <p className="text-[9px] uppercase font-bold tracking-widest text-center">Aucun conflit de série détecté (Sécurité OK)</p>
              </div>
            )}
          </div>
        </div>
      </div>

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
