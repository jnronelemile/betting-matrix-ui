import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Brain, Target, LineChart, Scale, Flame, Activity, Zap, TrendingUp } from 'lucide-react';

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
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-3 duration-500">

      {/* 1. Justice Intelligence & Net Justice Tension (Primary Analytical Focus) */}
      <Card title="Justice Intelligence & Tension Nette" titleIcon={<Scale size={16} />}>
        <div className="flex flex-col gap-5 mt-1">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
            Mesure des distorsions mathématiques entre points réels au classement et métriques attendues (xPoints, xPosition).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Net Tension */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-inner">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Net Justice Tension</span>
              <span className={`font-mono text-3xl font-bold ${netTension > 5 || netTension < -5 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {netTension > 0 ? '+' : ''}{netTension.toFixed(2)}
              </span>
              <span className="text-[8px] text-slate-400 mt-1">Écart relatif d'injustice perçue</span>
            </div>

            {/* Home Z-Score */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-inner">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">{homeTeam} Z-Score</span>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-2xl font-bold ${homeZ != null && homeZ > 1 ? 'text-rose-600 dark:text-rose-400' : homeZ != null && homeZ < -1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {homeZ != null ? homeZ.toFixed(2) : 'N/A'}
                </span>
                <Badge variant={getJusticeVariant(homeJustice.status || home.justice_status)} className="text-[8px] px-1.5 py-0">
                  {homeJustice.status || home.justice_status || 'UNKNOWN'}
                </Badge>
              </div>
              <span className="text-[8px] text-slate-400 mt-1">Déviation standard performance</span>
            </div>

            {/* Away Z-Score */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-inner">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">{awayTeam} Z-Score</span>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-2xl font-bold ${awayZ != null && awayZ > 1 ? 'text-rose-600 dark:text-rose-400' : awayZ != null && awayZ < -1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {awayZ != null ? awayZ.toFixed(2) : 'N/A'}
                </span>
                <Badge variant={getJusticeVariant(awayJustice.status || away.justice_status)} className="text-[8px] px-1.5 py-0">
                  {awayJustice.status || away.justice_status || 'UNKNOWN'}
                </Badge>
              </div>
              <span className="text-[8px] text-slate-400 mt-1">Déviation standard performance</span>
            </div>
          </div>

          {/* Performance Delta Comparison Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 p-2">
            <table className="w-full text-xs font-mono text-center">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[9px] text-slate-400 uppercase tracking-widest">
                  <th className="py-2 px-3 text-left">Équipe</th>
                  <th className="py-2 px-3">Pos. Réelle</th>
                  <th className="py-2 px-3">Pos. Attendue</th>
                  <th className="py-2 px-3">Écart Pos.</th>
                  <th className="py-2 px-3">Pts Réels</th>
                  <th className="py-2 px-3">Pts Attendus (xPts)</th>
                  <th className="py-2 px-3">Écart Pts</th>
                  <th className="py-2 px-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                <tr className="hover:bg-white dark:hover:bg-slate-900 transition-colors">
                  <td className="py-2.5 px-3 font-sans font-bold text-left text-blue-600 dark:text-blue-400">{homeTeam}</td>
                  <td className="py-2.5 px-3 font-bold">#{homePerf.actual_position || homePerf.actual_league_position || '-'}</td>
                  <td className="py-2.5 px-3">#{homePerf.expected_position || homePerf.expected_league_position || '-'}</td>
                  <td className={`py-2.5 px-3 font-bold ${homePerf.position_diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : homePerf.position_diff < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                    {homePerf.position_diff != null ? `${homePerf.position_diff > 0 ? '+' : ''}${homePerf.position_diff}` : '-'}
                  </td>
                  <td className="py-2.5 px-3 font-bold">{homePerf.actual_points ?? '-'}</td>
                  <td className="py-2.5 px-3">{homePerf.expected_points != null ? homePerf.expected_points.toFixed(1) : '-'}</td>
                  <td className={`py-2.5 px-3 font-bold ${homePerf.points_diff > 0 ? 'text-rose-600 dark:text-rose-400' : homePerf.points_diff < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                    {homePerf.points_diff != null ? `${homePerf.points_diff > 0 ? '+' : ''}${homePerf.points_diff.toFixed(1)}` : '-'}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant={getJusticeVariant(homeJustice.status || home.justice_status)} className="text-[8px] px-1.5 py-0">
                      {homeJustice.status || home.justice_status || 'NOMINAL'}
                    </Badge>
                  </td>
                </tr>
                <tr className="hover:bg-white dark:hover:bg-slate-900 transition-colors">
                  <td className="py-2.5 px-3 font-sans font-bold text-left text-rose-600 dark:text-rose-400">{awayTeam}</td>
                  <td className="py-2.5 px-3 font-bold">#{awayPerf.actual_position || awayPerf.actual_league_position || '-'}</td>
                  <td className="py-2.5 px-3">#{awayPerf.expected_position || awayPerf.expected_league_position || '-'}</td>
                  <td className={`py-2.5 px-3 font-bold ${awayPerf.position_diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : awayPerf.position_diff < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                    {awayPerf.position_diff != null ? `${awayPerf.position_diff > 0 ? '+' : ''}${awayPerf.position_diff}` : '-'}
                  </td>
                  <td className="py-2.5 px-3 font-bold">{awayPerf.actual_points ?? '-'}</td>
                  <td className="py-2.5 px-3">{awayPerf.expected_points != null ? awayPerf.expected_points.toFixed(1) : '-'}</td>
                  <td className={`py-2.5 px-3 font-bold ${awayPerf.points_diff > 0 ? 'text-rose-600 dark:text-rose-400' : awayPerf.points_diff < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                    {awayPerf.points_diff != null ? `${awayPerf.points_diff > 0 ? '+' : ''}${awayPerf.points_diff.toFixed(1)}` : '-'}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant={getJusticeVariant(awayJustice.status || away.justice_status)} className="text-[8px] px-1.5 py-0">
                      {awayJustice.status || away.justice_status || 'NOMINAL'}
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* 2. Situational & Motivational Profiles */}
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

    </div>
  );
}
