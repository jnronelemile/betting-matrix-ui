import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Activity, AlertCircle, LineChart, Scale } from 'lucide-react';

export default function TabRiskContext({ match }) {
  const risk = match.Risk_Management_Context || {};
  const narrative = risk.Situational_Narrative || {};
  const psychology = risk.Team_Psychology || {};
  const tactical = risk.Tactical_Red_Flags || {};
  const investment = risk.Investment_Signals || {};
  
  const homePerf = narrative.Home_Team?.performance_analysis || {};
  const awayPerf = narrative.Away_Team?.performance_analysis || {};

  const getMomentumVariant = (momentum) => {
    if (momentum === 'HOT' || momentum === 'FIRE') return 'success';
    if (momentum === 'COLD' || momentum === 'ICE') return 'danger';
    return 'default';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Column 1: Context Metrics */}
      <div className="flex flex-col gap-6">
        <Card title="Risk Metrics" titleIcon={<Activity size={16} />}>
          <div className="flex flex-col gap-6 mt-1">
             <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
               <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5"><AlertCircle size={14}/> Data Integrity</span>
               <Badge variant={match.Data_Integrity?.[0] === 'COMPLETE' ? 'success' : 'warning'} className="text-[10px]">
                 {match.Data_Integrity?.[0] || 'UNKNOWN'}
               </Badge>
             </div>
             
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-inner">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest mb-1.5">Justice Tension</span>
                <span className={`font-mono text-3xl font-bold ${psychology.net_justice_tension > 5 || psychology.net_justice_tension < -5 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {psychology.net_justice_tension > 0 ? '+' : ''}{psychology.net_justice_tension?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-inner">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest mb-1.5">Openness Index</span>
                <span className="font-mono text-3xl font-bold text-slate-800 dark:text-slate-200">
                  {tactical.match_openness_index?.toFixed(2) || 'N/A'}
                </span>
              </div>
            </div>

            {/* Investment Signals Grid */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase text-slate-500 dark:text-slate-500 font-bold tracking-widest px-1">Investment Signals (v8.5)</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(investment).map(([key, value]) => (
                  <div key={key} className={`flex justify-between items-center p-2 rounded border ${value ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60 shadow-sm'}`}>
                    <span className={`text-[8px] uppercase font-bold tracking-tighter ${value ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                      {key.replace('IS_', '').replace(/_/g, ' ')}
                    </span>
                    {value ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] uppercase text-slate-500 font-bold tracking-widest px-1">Heat & Justice Status</h4>
              <div className="flex flex-col gap-3">
                {/* Home */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg flex flex-col gap-3 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Home</span>
                      <span className="text-[9px] text-slate-500 font-mono font-bold">{narrative.Home_Team?.objective?.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getMomentumVariant(narrative.Home_Team?.momentum)}>
                        {narrative.Home_Team?.momentum || 'UNKNOWN'}
                      </Badge>
                      <Badge variant={narrative.Home_Team?.justice_status === 'LUCKY' ? 'warning' : narrative.Home_Team?.justice_status === 'UNDERVALUED' ? 'success' : 'info'}>
                        {narrative.Home_Team?.justice_status || 'UNKNOWN'}
                      </Badge>
                      {psychology.home_justice_z_score !== undefined && (
                        <div className={`px-1.5 py-0.5 rounded border font-mono text-[9px] font-bold ${psychology.home_justice_z_score > 1 ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400' : psychology.home_justice_z_score < -1 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500'}`}>
                          Z:{psychology.home_justice_z_score?.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/50 pt-2">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Motivation Index</span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{psychology.motivation_home?.toFixed(3)}</span>
                  </div>
                </div>

                {/* Away */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg flex flex-col gap-3 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Away</span>
                      <span className="text-[9px] text-slate-500 font-mono font-bold">{narrative.Away_Team?.objective?.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getMomentumVariant(narrative.Away_Team?.momentum)}>
                        {narrative.Away_Team?.momentum || 'UNKNOWN'}
                      </Badge>
                      <Badge variant={narrative.Away_Team?.justice_status === 'LUCKY' ? 'warning' : narrative.Away_Team?.justice_status === 'UNDERVALUED' ? 'success' : 'info'}>
                        {narrative.Away_Team?.justice_status || 'UNKNOWN'}
                      </Badge>
                      {psychology.away_justice_z_score !== undefined && (
                        <div className={`px-1.5 py-0.5 rounded border font-mono text-[9px] font-bold ${psychology.away_justice_z_score > 1 ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400' : psychology.away_justice_z_score < -1 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500'}`}>
                          Z:{psychology.away_justice_z_score?.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/50 pt-2">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Motivation Index</span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{psychology.motivation_away?.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {match.Alternative_Domination_Score && (
          <Card title="Alternative Break" titleIcon={<AlertCircle size={16} />} className="border-amber-500/30">
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex flex-col gap-3 shadow-sm mt-1">
              <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 p-3 rounded-lg border border-amber-500/20">
                <span className="text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider font-bold">Advantage ({match.Alternative_Domination_Score.dominant_side})</span>
                <div className="flex items-center gap-3">
                  <span className="font-serif font-bold text-amber-600 dark:text-amber-400 text-2xl">{match.Alternative_Domination_Score.score}</span>
                  <Badge variant="warning" className="font-mono text-[11px]">@{match.Alternative_Domination_Score.odds?.toFixed(2)}</Badge>
                </div>
              </div>
              <p className="text-[10px] text-amber-700 dark:text-amber-300/80 font-mono tracking-tight leading-relaxed px-1">
                Alert trigger: {match.Alternative_Domination_Score.trigger}
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Column 2: Performance Delta */}
      <div className="flex flex-col gap-6">
        <Card title="Justification: Performance Delta (Expected vs Actual)" titleIcon={<LineChart size={16} />}>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 mt-1 shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100/80 dark:bg-slate-900/80 text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Metric</th>
                  <th className="px-4 py-3 font-semibold text-center border-l border-slate-200 dark:border-slate-800">Home</th>
                  <th className="px-4 py-3 font-semibold text-center border-l border-slate-200 dark:border-slate-800">Away</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50 text-xs font-mono">
                <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-sans uppercase tracking-wider text-[10px] font-bold">Position Difference</td>
                  <td className={`px-4 py-3 text-center border-l border-slate-200 dark:border-slate-800 ${homePerf.position_diff > 0 ? 'text-rose-600 dark:text-rose-400' : homePerf.position_diff < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                    {homePerf.position_diff > 0 ? '+' : ''}{homePerf.position_diff || 0}
                  </td>
                  <td className={`px-4 py-3 text-center border-l border-slate-200 dark:border-slate-800 ${awayPerf.position_diff > 0 ? 'text-rose-600 dark:text-rose-400' : awayPerf.position_diff < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                    {awayPerf.position_diff > 0 ? '+' : ''}{awayPerf.position_diff || 0}
                  </td>
                </tr>
                <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-sans uppercase tracking-wider text-[10px] font-bold">Points Difference (xPts)</td>
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
          <div className="mt-4 text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-widest flex gap-2 items-start bg-slate-100/50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <Scale size={14} className="shrink-0 text-slate-400 dark:text-slate-400" />
            <p>These deltas quantify Justice Tension. If high, the team outperforms its true algorithmic strength (LUCKY).</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
