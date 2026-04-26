import React from 'react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Badge } from '../ui/Badge';
import { Crosshair, Target, Flag, Layers } from 'lucide-react';

export default function TabTactical({ match }) {
  const risk = match.Risk_Management_Context || {};
  const tactical = risk.Tactical_Red_Flags || {};
  const anchors = risk.League_Anchors || {};
  const props = match.Prop_Bets || {};

  const propBetsKeys = Object.keys(props).filter(k => k.startsWith('PROP_') && !k.includes('OVER_MEDIAN'));
  const anchorKeys = [
    { key: 'shots', label: 'Tirs', prop: 'PROP_MATCH_OVER_MEDIAN_SHOTS' },
    { key: 'sot', label: 'Tirs Cadrés', prop: 'PROP_MATCH_OVER_MEDIAN_SOT' },
    { key: 'corners', label: 'Corners', prop: 'PROP_MATCH_OVER_MEDIAN_CORNERS' },
    { key: 'tackles', label: 'Tacles', prop: 'PROP_MATCH_OVER_MEDIAN_TACKLES' },
    { key: 'fouls', label: 'Fautes', prop: 'PROP_MATCH_OVER_MEDIAN_FOULS' },
    { key: 'yellow_cards', label: 'Cartons Jaunes', prop: 'PROP_MATCH_OVER_MEDIAN_YELLOWS' },
  ];

  const getPropColor = (val) => {
    if (val >= 0.70) return 'bg-emerald-500';
    if (val >= 0.50) return 'bg-amber-500';
    return 'bg-slate-600';
  };

  const getPropTextColor = (val) => {
    if (val >= 0.70) return 'text-emerald-400';
    if (val >= 0.50) return 'text-amber-400';
    return 'text-slate-400';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Tactical Matchup */}
      <div className="lg:col-span-1">
        <Card title="Notes Tactiques & Écarts" titleIcon={<Crosshair size={16} />}>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Notes FotMob</span>
                <span className="font-mono text-xs text-slate-400">Écart : {tactical.team_rating_gap?.toFixed(2) || 0}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Domicile</div>
                  <div className="font-mono text-xl text-blue-400">{tactical.fotmob_rating_home?.toFixed(2) || 'N/A'}</div>
                </div>
                <div className="text-slate-600 font-mono text-xs">VS</div>
                <div className="flex-1 bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Extérieur</div>
                  <div className="font-mono text-xl text-rose-400">{tactical.fotmob_rating_away?.toFixed(2) || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-2">Écart de Gaspillage (Wastefulness)</div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col items-center text-center">
                <span className="text-[10px] text-slate-400 mb-1">Différence de sous-performance xG</span>
                <span className={`font-mono text-lg font-bold ${tactical.wastefulness_gap > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {tactical.wastefulness_gap > 0 ? '+' : ''}{tactical.wastefulness_gap?.toFixed(3) || 0}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-3">Signaux de Domination H2H</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex flex-col items-center text-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Fautes</span>
                  <span className={`text-xs font-bold uppercase tracking-wider ${props.SIGNAL_H2H_FOUL_DOMINANCE === 'NONE' ? 'text-slate-500' : 'text-amber-400'}`}>
                    {props.SIGNAL_H2H_FOUL_DOMINANCE?.replace(/_/g, ' ') || 'AUCUN'}
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex flex-col items-center text-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Tacles</span>
                  <span className={`text-xs font-bold uppercase tracking-wider ${props.SIGNAL_H2H_TACKLE_DOMINANCE === 'NONE' ? 'text-slate-500' : 'text-amber-400'}`}>
                    {props.SIGNAL_H2H_TACKLE_DOMINANCE?.replace(/_/g, ' ') || 'AUCUN'}
                  </span>
                </div>
              </div>
            </div>
            
            {tactical.MISSING_FOTMOB_DATA && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex items-center gap-2 text-amber-400 text-xs uppercase tracking-wider mt-2">
                <Flag size={14} /> Données FotMob partielles
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* League Anchors */}
      <div className="lg:col-span-1">
        <Card title="Match vs Moyennes Ligue" titleIcon={<Layers size={16} />}>
          <div className="space-y-3">
            <div className="text-[9px] text-slate-500 uppercase tracking-widest pb-1 border-b border-slate-800 flex justify-between">
              <span>Métrique</span>
              <div className="flex gap-4">
                <span>Médiane Ligue</span>
                <span>Prob &gt; Médiane</span>
              </div>
            </div>
            
            {anchorKeys.map(({ key, label, prop }) => {
              const median = anchors[`median_${key}`];
              const prob = props[prop];
              if (median === undefined || prob === undefined) return null;
              
              return (
                <div key={key} className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">{label}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-slate-500 w-12 text-right">{median.toFixed(2)}</span>
                    <div className="w-14 text-right">
                      <span className={`font-mono text-xs font-bold ${getPropTextColor(prob)}`}>
                        {(prob * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Full Props Grid */}
      <div className="lg:col-span-1">
        <Card title="Marché des Propositions" titleIcon={<Target size={16} />}>
          <div className="flex flex-col gap-3">
            {propBetsKeys.map(key => {
              const val = props[key];
              const label = key.replace('PROP_HOME_MORE_', '').replace(/_/g, ' ');
              
              return (
                <div key={key} className="bg-slate-950 p-3 rounded-xl border border-slate-800 shadow-inner">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Dom &gt; Ext : {label}</span>
                    <span className={`font-mono text-xs font-bold ${getPropTextColor(val)}`}>
                      {(val * 100).toFixed(1)}%
                    </span>
                  </div>
                  <ProgressBar value={val} max={1} colorClass={getPropColor(val)} displayValue=" " />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
