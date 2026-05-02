import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Brain, Target, LineChart, Scale } from 'lucide-react';

export default function TabNarrative({ match }) {
  const risk = match.Risk_Management_Context || {};
  const narrative = risk.Situational_Narrative || {};
  const psychology = risk.Team_Psychology || {};

  const home = narrative.Home_Team || {};
  const away = narrative.Away_Team || {};

  const homePerf = home.performance_analysis || {};
  const awayPerf = away.performance_analysis || {};

  const getJusticeVariant = (status) => {
    if (status === 'LUCKY') return 'warning';
    if (status === 'UNDERVALUED') return 'success';
    return 'info';
  };

  const getObjectiveColor = (obj) => {
    if (obj?.includes('TITLE')) return 'text-amber-400';
    if (obj?.includes('EUROPE')) return 'text-blue-400';
    if (obj?.includes('SURVIVAL')) return 'text-rose-400';
    return 'text-slate-400';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Team Profiles */}
      <Card title="Profils Situationnels" titleIcon={<Brain size={16} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Home Team */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <h4 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4">Équipe à Domicile</h4>
            
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Classement Actuel</div>
                <div className="flex items-baseline gap-2">
                  <div className="font-mono text-xl text-slate-200">#{homePerf.actual_league_position || '?'} <span className="text-[10px] text-slate-500 font-sans tracking-widest uppercase">Général</span></div>
                  <div className="font-mono text-sm text-slate-400">#{home.rank_home || '?'} <span className="text-[10px] font-sans tracking-widest uppercase">Dom.</span></div>
                </div>
              </div>
              
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Objectif</div>
                <div className={`text-xs font-bold uppercase tracking-wider ${getObjectiveColor(home.objective)}`}>
                  {home.objective?.replace(/_/g, ' ') || 'INCONNU'}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Statut de Justice</div>
                <Badge variant={getJusticeVariant(home.justice_status)}>{home.justice_status || 'INCONNU'}</Badge>
              </div>

              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Indice de Motivation</div>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min((psychology.motivation_home || 0) * 100, 100)}%` }}></div>
                  </div>
                  <span className="font-mono text-xs text-slate-300">{(psychology.motivation_home || 0).toFixed(3)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Away Team */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-rose-500"></div>
            <h4 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4 text-right">Équipe à l'Extérieur</h4>
            
            <div className="space-y-4 text-right">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Classement Actuel</div>
                <div className="flex items-baseline justify-end gap-2">
                  <div className="font-mono text-sm text-slate-400">#{away.rank_away || '?'} <span className="text-[10px] font-sans tracking-widest uppercase">Ext.</span></div>
                  <div className="font-mono text-xl text-slate-200">#{awayPerf.actual_league_position || '?'} <span className="text-[10px] text-slate-500 font-sans tracking-widest uppercase">Général</span></div>
                </div>
              </div>
              
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Objectif</div>
                <div className={`text-xs font-bold uppercase tracking-wider ${getObjectiveColor(away.objective)}`}>
                  {away.objective?.replace(/_/g, ' ') || 'INCONNU'}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Statut de Justice</div>
                <Badge variant={getJusticeVariant(away.justice_status)}>{away.justice_status || 'INCONNU'}</Badge>
              </div>

              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Indice de Motivation</div>
                <div className="flex items-center justify-end gap-2">
                  <span className="font-mono text-xs text-slate-300">{(psychology.motivation_away || 0).toFixed(3)}</span>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden rotate-180">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min((psychology.motivation_away || 0) * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Performance Delta */}
      <Card title="Delta de Performance (Attendu vs Réel)" titleIcon={<LineChart size={16} />}>
        <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-800 bg-slate-950 pb-1">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-900/80 text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Métrique</th>
                <th className="px-4 py-3 font-semibold text-center border-l border-slate-800">Domicile</th>
                <th className="px-4 py-3 font-semibold text-center border-l border-slate-800">Extérieur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs font-mono">
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 text-slate-300 font-sans uppercase tracking-wider text-[10px] font-bold">Différence de Position</td>
                <td className={`px-4 py-3 text-center border-l border-slate-800 ${homePerf.position_diff > 0 ? 'text-rose-400' : homePerf.position_diff < 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {homePerf.position_diff > 0 ? '+' : ''}{homePerf.position_diff || 0}
                </td>
                <td className={`px-4 py-3 text-center border-l border-slate-800 ${awayPerf.position_diff > 0 ? 'text-rose-400' : awayPerf.position_diff < 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {awayPerf.position_diff > 0 ? '+' : ''}{awayPerf.position_diff || 0}
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 text-slate-300 font-sans uppercase tracking-wider text-[10px] font-bold">Différence de Points (xPts)</td>
                <td className={`px-4 py-3 text-center border-l border-slate-800 ${homePerf.points_diff > 0 ? 'text-emerald-400' : homePerf.points_diff < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {homePerf.points_diff > 0 ? '+' : ''}{homePerf.points_diff?.toFixed(2) || 0}
                </td>
                <td className={`px-4 py-3 text-center border-l border-slate-800 ${awayPerf.points_diff > 0 ? 'text-emerald-400' : awayPerf.points_diff < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {awayPerf.points_diff > 0 ? '+' : ''}{awayPerf.points_diff?.toFixed(2) || 0}
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 text-slate-300 font-sans uppercase tracking-wider text-[10px] font-bold">Diff. Buts Marqués (xG)</td>
                <td className={`px-4 py-3 text-center border-l border-slate-800 ${homePerf.goals_for_diff > 0 ? 'text-emerald-400' : homePerf.goals_for_diff < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {homePerf.goals_for_diff > 0 ? '+' : ''}{homePerf.goals_for_diff?.toFixed(2) || 0}
                </td>
                <td className={`px-4 py-3 text-center border-l border-slate-800 ${awayPerf.goals_for_diff > 0 ? 'text-emerald-400' : awayPerf.goals_for_diff < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {awayPerf.goals_for_diff > 0 ? '+' : ''}{awayPerf.goals_for_diff?.toFixed(2) || 0}
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 text-slate-300 font-sans uppercase tracking-wider text-[10px] font-bold">Diff. Buts Encaissés (xGA)</td>
                <td className={`px-4 py-3 text-center border-l border-slate-800 ${homePerf.goals_against_diff < 0 ? 'text-emerald-400' : homePerf.goals_against_diff > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {homePerf.goals_against_diff > 0 ? '+' : ''}{homePerf.goals_against_diff?.toFixed(2) || 0}
                </td>
                <td className={`px-4 py-3 text-center border-l border-slate-800 ${awayPerf.goals_against_diff < 0 ? 'text-emerald-400' : awayPerf.goals_against_diff > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {awayPerf.goals_against_diff > 0 ? '+' : ''}{awayPerf.goals_against_diff?.toFixed(2) || 0}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-[10px] text-slate-500 uppercase tracking-widest flex gap-2 items-start bg-slate-900/50 p-3 rounded-lg border border-slate-800">
          <Scale size={14} className="shrink-0 text-slate-400" />
          <p>Un delta positif en Points ou Buts Marqués signifie que l'équipe a sur-performé ses métriques attendues (chanceux/forme clinique). Un delta négatif signifie qu'elle a sous-performé (malchanceux/sous-évalué).</p>
        </div>
      </Card>
    </div>
  );
}
