import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Brain, Target, LineChart, Scale, Flame, Activity, Zap } from 'lucide-react';

export default function TabNarrative({ match }) {
  const risk = match.Risk_Management_Context || {};
  const narrative = risk.Situational_Narrative || {};
  const psychology = risk.Team_Psychology || {};
  const analytical = match.Analytical_Signals || {};
  const justiceIntel = analytical.justice_intelligence || {};
  const momentumProfiles = analytical.momentum_profiles || {};

  const home = narrative.Home_Team || {};
  const away = narrative.Away_Team || {};

  const homeJustice = justiceIntel.home || {};
  const awayJustice = justiceIntel.away || {};

  const homePerf = homeJustice.position_diff !== undefined ? homeJustice : (home.performance_analysis || {});
  const awayPerf = awayJustice.position_diff !== undefined ? awayJustice : (away.performance_analysis || {});

  const homeMomentum = momentumProfiles.home || {};
  const awayMomentum = momentumProfiles.away || {};

  const homeTeam = match.shortHome || match.Matchup?.split(' vs ')[0] || 'Home';
  const awayTeam = match.shortAway || match.Matchup?.split(' vs ')[1] || 'Away';

  const getJusticeVariant = (status) => {
    if (status === 'LUCKY') return 'warning';
    if (status === 'UNDERVALUED') return 'success';
    return 'info';
  };

  const getMomentumVariant = (momentum) => {
    if (momentum === 'HOT' || momentum === 'FIRE') return 'success';
    if (momentum === 'COLD' || momentum === 'ICE') return 'danger';
    return 'default';
  };

  const getObjectiveColor = (obj) => {
    if (obj?.includes('TITLE')) return 'text-amber-600 dark:text-amber-400';
    if (obj?.includes('EUROPE')) return 'text-blue-600 dark:text-blue-400';
    if (obj?.includes('SURVIVAL')) return 'text-rose-600 dark:text-rose-400';
    return 'text-slate-500 dark:text-slate-400';
  };

  const netTension = psychology.net_justice_tension != null ? psychology.net_justice_tension : 0;
  const homeZ = homeJustice.z_score ?? psychology.home_justice_z_score;
  const awayZ = awayJustice.z_score ?? psychology.away_justice_z_score;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Column 1: Situational Profiles & Momentum */}
      <div className="flex flex-col gap-6">
        <Card title="Situational & Motivational Profiles" titleIcon={<Brain size={16} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
            {/* Home Team */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-5 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <h4 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">{homeTeam}</h4>
              
              <div className="space-y-3.5">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Classement</div>
                  <div className="flex items-baseline gap-2">
                    <div className="font-mono text-xl text-slate-800 dark:text-slate-200">
                      #{homePerf.actual_position || homePerf.actual_league_position || '?'} <span className="text-[10px] text-slate-500 font-sans tracking-widest uppercase">Général</span>
                    </div>
                    {home.rank_home && (
                      <div className="font-mono text-sm text-slate-500 dark:text-slate-400">
                        #{home.rank_home} <span className="text-[10px] font-sans tracking-widest uppercase">Dom.</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Objectif</div>
                  <div className={`text-xs font-bold uppercase tracking-wider ${getObjectiveColor(home.objective)}`}>
                    {home.objective?.replace(/_/g, ' ') || 'STANDARD'}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Momentum & Forme Récente</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={getMomentumVariant(homeMomentum.momentum || home.momentum)}>
                      {homeMomentum.momentum || home.momentum || 'NEUTRAL'}
                    </Badge>
                    {homeMomentum.momentum_score !== undefined && (
                      <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
                        Score: {homeMomentum.momentum_score.toFixed(3)}
                      </span>
                    )}
                    {homeMomentum.form_last_5_pts !== undefined && (
                      <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {homeMomentum.form_last_5_pts}/15 pts
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Indice de Motivation</div>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 dark:bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min((psychology.motivation_home || 0) * 100, 100)}%` }}></div>
                    </div>
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{(psychology.motivation_home || 0).toFixed(3)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Away Team */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-5 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-1 h-full bg-rose-500"></div>
              <h4 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3 text-right">{awayTeam}</h4>
              
              <div className="space-y-3.5 text-right">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Classement</div>
                  <div className="flex items-baseline justify-end gap-2">
                    {away.rank_away && (
                      <div className="font-mono text-sm text-slate-500 dark:text-slate-400">
                        #{away.rank_away} <span className="text-[10px] font-sans tracking-widest uppercase">Ext.</span>
                      </div>
                    )}
                    <div className="font-mono text-xl text-slate-800 dark:text-slate-200">
                      #{awayPerf.actual_position || awayPerf.actual_league_position || '?'} <span className="text-[10px] text-slate-500 font-sans tracking-widest uppercase">Général</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Objectif</div>
                  <div className={`text-xs font-bold uppercase tracking-wider ${getObjectiveColor(away.objective)}`}>
                    {away.objective?.replace(/_/g, ' ') || 'STANDARD'}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Momentum & Forme Récente</div>
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    {awayMomentum.form_last_5_pts !== undefined && (
                      <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {awayMomentum.form_last_5_pts}/15 pts
                      </span>
                    )}
                    {awayMomentum.momentum_score !== undefined && (
                      <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
                        Score: {awayMomentum.momentum_score.toFixed(3)}
                      </span>
                    )}
                    <Badge variant={getMomentumVariant(awayMomentum.momentum || away.momentum)}>
                      {awayMomentum.momentum || away.momentum || 'NEUTRAL'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Indice de Motivation</div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{(psychology.motivation_away || 0).toFixed(3)}</span>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden rotate-180">
                      <div className="bg-emerald-500 dark:bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min((psychology.motivation_away || 0) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Justice Tension & Z-Scores Overview */}
        <Card title="Justice Intelligence & Tension Nette" titleIcon={<Scale size={16} />}>
          <div className="flex flex-col gap-4 mt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-inner">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Net Justice Tension</span>
                <span className={`font-mono text-2xl font-bold ${netTension > 5 || netTension < -5 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {netTension > 0 ? '+' : ''}{netTension.toFixed(2)}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-inner">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 font-bold">{homeTeam} Z-Score</span>
                <div className="flex items-center gap-1.5">
                  <span className={`font-mono text-xl font-bold ${homeZ != null && homeZ > 1 ? 'text-rose-600 dark:text-rose-400' : homeZ != null && homeZ < -1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {homeZ != null ? homeZ.toFixed(2) : 'N/A'}
                  </span>
                  <Badge variant={getJusticeVariant(homeJustice.status || home.justice_status)} className="text-[7px] px-1 py-0">
                    {homeJustice.status || home.justice_status || 'UNKNOWN'}
                  </Badge>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-inner">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 font-bold">{awayTeam} Z-Score</span>
                <div className="flex items-center gap-1.5">
                  <span className={`font-mono text-xl font-bold ${awayZ != null && awayZ > 1 ? 'text-rose-600 dark:text-rose-400' : awayZ != null && awayZ < -1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {awayZ != null ? awayZ.toFixed(2) : 'N/A'}
                  </span>
                  <Badge variant={getJusticeVariant(awayJustice.status || away.justice_status)} className="text-[7px] px-1 py-0">
                    {awayJustice.status || away.justice_status || 'UNKNOWN'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <p className="text-[9px] text-slate-400 italic bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              Un Z-Score élevé (&gt; +1.0) indique une équipe en surperformance statistique par rapport à ses métriques attendues (LUCKY). Un Z-Score négatif (&lt; -1.0) signale une équipe sous-évaluée (UNDERVALUED).
            </p>
          </div>
        </Card>
      </div>

      {/* Column 2: Consolidated Performance Delta */}
      <div className="flex flex-col gap-6">
        <Card title="Performance Delta (Expected vs Actual)" titleIcon={<LineChart size={16} />}>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-sm mt-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100/80 dark:bg-slate-900/80 text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Métrique</th>
                  <th className="px-4 py-3 font-semibold text-center border-l border-slate-200 dark:border-slate-800">{homeTeam}</th>
                  <th className="px-4 py-3 font-semibold text-center border-l border-slate-200 dark:border-slate-800">{awayTeam}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50 text-xs font-mono">
                <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-sans uppercase tracking-wider text-[10px] font-bold">Position Diff (xPos)</td>
                  <td className={`px-4 py-3 text-center border-l border-slate-200 dark:border-slate-800 ${homePerf.position_diff > 0 ? 'text-rose-600 dark:text-rose-400' : homePerf.position_diff < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                    {homePerf.position_diff > 0 ? '+' : ''}{homePerf.position_diff || 0}
                  </td>
                  <td className={`px-4 py-3 text-center border-l border-slate-200 dark:border-slate-800 ${awayPerf.position_diff > 0 ? 'text-rose-600 dark:text-rose-400' : awayPerf.position_diff < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                    {awayPerf.position_diff > 0 ? '+' : ''}{awayPerf.position_diff || 0}
                  </td>
                </tr>
                <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-sans uppercase tracking-wider text-[10px] font-bold">Points Diff (xPts)</td>
                  <td className={`px-4 py-3 text-center border-l border-slate-200 dark:border-slate-800 ${homePerf.points_diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : homePerf.points_diff < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                    {homePerf.points_diff > 0 ? '+' : ''}{homePerf.points_diff?.toFixed(2) || 0}
                  </td>
                  <td className={`px-4 py-3 text-center border-l border-slate-200 dark:border-slate-800 ${awayPerf.points_diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : awayPerf.points_diff < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                    {awayPerf.points_diff > 0 ? '+' : ''}{awayPerf.points_diff?.toFixed(2) || 0}
                  </td>
                </tr>
                <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-sans uppercase tracking-wider text-[10px] font-bold">Goals Scored Diff (xG)</td>
                  <td className={`px-4 py-3 text-center border-l border-slate-200 dark:border-slate-800 ${homePerf.goals_for_diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : homePerf.goals_for_diff < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                    {homePerf.goals_for_diff > 0 ? '+' : ''}{homePerf.goals_for_diff?.toFixed(2) || 0}
                  </td>
                  <td className={`px-4 py-3 text-center border-l border-slate-200 dark:border-slate-800 ${awayPerf.goals_for_diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : awayPerf.goals_for_diff < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                    {awayPerf.goals_for_diff > 0 ? '+' : ''}{awayPerf.goals_for_diff?.toFixed(2) || 0}
                  </td>
                </tr>
                <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-sans uppercase tracking-wider text-[10px] font-bold">Goals Conceded Diff (xGA)</td>
                  <td className={`px-4 py-3 text-center border-l border-slate-200 dark:border-slate-800 ${homePerf.goals_against_diff < 0 ? 'text-emerald-600 dark:text-emerald-400' : homePerf.goals_against_diff > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                    {homePerf.goals_against_diff > 0 ? '+' : ''}{homePerf.goals_against_diff?.toFixed(2) || 0}
                  </td>
                  <td className={`px-4 py-3 text-center border-l border-slate-200 dark:border-slate-800 ${awayPerf.goals_against_diff < 0 ? 'text-emerald-600 dark:text-emerald-400' : awayPerf.goals_against_diff > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                    {awayPerf.goals_against_diff > 0 ? '+' : ''}{awayPerf.goals_against_diff?.toFixed(2) || 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-[10px] text-slate-500 uppercase tracking-widest flex gap-2 items-start bg-slate-100/50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <Scale size={14} className="shrink-0 text-slate-400" />
            <p>Ces deltas quantifient la justice situationnelle : un delta positif en xPts/xG indique une surperformance offensive/comptable. Un delta négatif signale un rendement sous-évalué.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
