import React from 'react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Badge } from '../ui/Badge';
import { Activity, Percent, AlertCircle, TrendingUp } from 'lucide-react';

export default function TabCoreMarket({ match }) {
  const probs = match.True_Probabilities || {};
  const odds = match.True_Odds || {};
  const risk = match.Risk_Management_Context || {};
  const narrative = risk.Situational_Narrative || {};
  const psychology = risk.Team_Psychology || {};
  const tactical = risk.Tactical_Red_Flags || {};
  const props = match.Prop_Bets || {};

  const getMomentumVariant = (momentum) => {
    if (momentum === 'HOT' || momentum === 'FIRE') return 'success';
    if (momentum === 'COLD' || momentum === 'ICE') return 'danger';
    return 'default';
  };

  const propBetsToDisplay = Object.entries(props)
    .filter(([key, value]) => typeof value === 'number' && value > 0.70 && !key.includes('PROP_MATCH_OVER_MEDIAN'))
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Widget A: Probabilities & Odds */}
      <Card title="Prix Réels du Marché" titleIcon={<Percent size={16} />}>
        <div className="flex flex-col gap-6">
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase text-slate-500 font-bold tracking-widest border-b border-slate-800 pb-1 mb-2">Vainqueur du Match (1X2)</h4>
            <ProgressBar label="Domicile (1)" value={probs.PROB_1 || 0} colorClass="bg-blue-500" />
            <ProgressBar label="Nul (X)" value={probs.PROB_X || 0} colorClass="bg-slate-500" />
            <ProgressBar label="Extérieur (2)" value={probs.PROB_2 || 0} colorClass="bg-rose-500" />
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-800/50">
            <h4 className="text-[10px] uppercase text-slate-500 font-bold tracking-widest border-b border-slate-800 pb-1 mb-2">Buts (Plus/Moins 2.5)</h4>
            <ProgressBar label="Plus de 2.5" value={probs.PROB_O25 || 0} colorClass="bg-emerald-500" />
            <ProgressBar label="Moins de 2.5" value={probs.PROB_U25 || 0} colorClass="bg-amber-500" />
          </div>

          <div className="mt-2 rounded-lg border border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900/80 text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2 font-semibold">Marché</th>
                  <th className="px-3 py-2 font-semibold text-right">Cote Réelle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 bg-slate-900/30 text-xs">
                <tr className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-3 py-2.5 text-slate-300 font-medium">Domicile (1)</td>
                  <td className="px-3 py-2.5 font-mono font-medium text-right text-slate-200">{odds.ODDS_1?.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-3 py-2.5 text-slate-300 font-medium">Nul (X)</td>
                  <td className="px-3 py-2.5 font-mono font-medium text-right text-slate-200">{odds.ODDS_X?.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-3 py-2.5 text-slate-300 font-medium">Extérieur (2)</td>
                  <td className="px-3 py-2.5 font-mono font-medium text-right text-slate-200">{odds.ODDS_2?.toFixed(2)}</td>
                </tr>
                <tr className="bg-slate-950/40">
                  <td className="px-3 py-2.5 text-slate-400 font-medium">Plus de 2.5</td>
                  <td className="px-3 py-2.5 font-mono font-medium text-right text-emerald-400">{odds.ODDS_O25?.toFixed(2)}</td>
                </tr>
                <tr className="bg-slate-950/40 hover:bg-slate-800/30 transition-colors">
                  <td className="px-3 py-2.5 text-slate-400 font-medium">Moins de 2.5</td>
                  <td className="px-3 py-2.5 font-mono font-medium text-right text-amber-400">{odds.ODDS_U25?.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Widget B: Risk Context */}
      <Card title="Contexte de Risque Critique" titleIcon={<Activity size={16} />}>
        <div className="flex flex-col gap-6 mt-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center shadow-inner">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mb-1.5">Tension de Justice</span>
              <span className={`font-mono text-2xl font-bold ${psychology.net_justice_tension > 5 || psychology.net_justice_tension < -5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {psychology.net_justice_tension > 0 ? '+' : ''}{psychology.net_justice_tension?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center shadow-inner">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mb-1.5">Indice d'Ouverture</span>
              <span className="font-mono text-2xl font-bold text-slate-200">
                {tactical.match_openness_index?.toFixed(2) || 'N/A'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] uppercase text-slate-500 font-bold tracking-widest px-1">Chaleur du Momentum</h4>
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded-lg">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Domicile</span>
              <Badge variant={getMomentumVariant(narrative.Home_Team?.momentum)}>
                {narrative.Home_Team?.momentum || 'INCONNU'}
              </Badge>
            </div>
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded-lg">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Extérieur</span>
              <Badge variant={getMomentumVariant(narrative.Away_Team?.momentum)}>
                {narrative.Away_Team?.momentum || 'INCONNU'}
              </Badge>
            </div>
          </div>
          
          {tactical.IS_FALSE_FAVORITE && (
            <div className="mt-1 bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl flex gap-3 items-start shadow-sm">
              <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={18} />
              <p className="text-[11px] text-rose-300/90 leading-relaxed uppercase tracking-wider font-medium">
                <strong className="block font-bold text-xs text-rose-400 mb-1 tracking-widest">FAUX FAVORI DÉTECTÉ</strong>
                Les cotes du marché sont désalignées avec les probabilités algorithmiques réelles. Procédez avec extrême prudence.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Widget C: Super Signals */}
      <Card title="Signaux Forts (>70%)" titleIcon={<TrendingUp size={16} />}>
        <div className="flex flex-col gap-5 mt-1">
          {props.SUPER_SIGNAL_O15 && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex gap-3 items-center shadow-sm">
              <AlertCircle className="text-emerald-400 shrink-0" size={20} />
              <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">Super Signal O1.5 : Active</span>
            </div>
          )}
          
          <div className="space-y-4">
            {propBetsToDisplay.length > 0 ? (
              propBetsToDisplay.map(([key, value]) => {
                const label = key.replace('PROP_', '').replace(/_/g, ' ');
                return (
                  <div key={key} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 shadow-inner">
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">{label}</span>
                      <Badge variant="success" className="font-mono bg-emerald-500/10 text-emerald-400">
                        {(value * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <ProgressBar value={value} max={1} colorClass="bg-emerald-400" displayValue=" " />
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 px-4 text-slate-500/70 text-xs font-medium uppercase tracking-widest border border-dashed border-slate-800 rounded-xl">
                Aucun signal prop à haute confiance détecté.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
