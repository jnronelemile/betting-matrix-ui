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

  const propBetsKeys = Object.keys(props).filter(k => k.startsWith('PROP_HOME_MORE_'));
  const anchorKeys = [
    { key: 'shots', label: 'Tirs', prop: 'PROB_OVER_MEDIAN_SHOTS', lambda: 'LAMBDA_SHOTS_MATCH' },
    { key: 'sot', label: 'Tirs Cadrés', prop: 'PROB_OVER_MEDIAN_SOT', lambda: 'LAMBDA_SOT_MATCH' },
    { key: 'corners', label: 'Corners', prop: 'PROB_OVER_MEDIAN_CORNERS', lambda: 'LAMBDA_CORNERS_MATCH' },
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* League Anchors */}
      <div className="lg:col-span-1">
        <Card title="Match vs Moyennes Ligue" titleIcon={<Layers size={16} />}>
          <div className="space-y-4 mt-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-800 flex justify-between">
              <span>Métrique</span>
              <div className="flex gap-5">
                <span>Médiane</span>
                <span>Lambda Match</span>
                <span>Prob &gt; Méd</span>
              </div>
            </div>
            
            {anchorKeys.map(({ key, label, prop, lambda }) => {
              const median = anchors[`median_${key}`];
              const prob = props[prop];
              const lambdaVal = props[lambda];
              if (median === undefined || prob === undefined) return null;
              
              return (
                <div key={key} className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{label}</span>
                  <div className="flex items-center gap-5">
                    <span className="font-mono text-xs text-slate-500 w-12 text-right">{median.toFixed(2)}</span>
                    <span className={`font-mono text-sm w-16 text-right font-bold ${lambdaVal > median ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {lambdaVal?.toFixed(2)}
                    </span>
                    <div className="w-14 text-right">
                      <span className={`font-mono text-sm font-bold ${getPropTextColor(prob)}`}>
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

      {/* Tactical Matchup */}
      <div className="lg:col-span-1">
        <Card title="Notes Tactiques & Écarts" titleIcon={<Crosshair size={16} />}>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-3">
                <span className="text-xs uppercase text-slate-500 font-bold tracking-widest">Notes FotMob</span>
                <span className="font-mono text-sm text-slate-400">Écart : {tactical.team_rating_gap?.toFixed(2) || 0}</span>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-2">Domicile</div>
                  <div className="font-mono text-2xl text-blue-400">{tactical.fotmob_rating_home?.toFixed(2) || 'N/A'}</div>
                </div>
                <div className="text-slate-600 font-mono text-sm font-bold">VS</div>
                <div className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-2">Extérieur</div>
                  <div className="font-mono text-2xl text-rose-400">{tactical.fotmob_rating_away?.toFixed(2) || 'N/A'}</div>
                </div>
              </div>
            </div>

            {match.Standard_Handicaps && (
              <div className="pt-2 border-t border-slate-800">
                <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-3 flex items-center justify-between">
                  Handicaps Standard
                  <Badge variant="info">Fav: {match.Standard_Handicaps.favorite}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(match.Standard_Handicaps).filter(([k]) => k.startsWith('H_')).map(([k, v]) => (
                    <div key={k} className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex flex-col items-center text-center shadow-inner">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{k.replace('_', ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-300">{(v.prob * 100).toFixed(1)}%</span>
                        <span className="font-mono text-xs text-emerald-400">@{v.odds?.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {tactical.MISSING_FOTMOB_DATA && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex items-center gap-2 text-amber-400 text-xs uppercase tracking-wider mt-2">
                <Flag size={14} /> Données FotMob partielles
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Full Props Grid */}
      <div className="lg:col-span-1">
        <Card title="Marché des Propositions" titleIcon={<Target size={16} />}>
          <div className="flex flex-col gap-4 mt-2">
            {propBetsKeys.map(key => {
              const val = props[key];
              const label = key.replace('PROP_HOME_MORE_', '').replace(/_/g, ' ');
              
              return (
                <div key={key} className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Dom &gt; Ext : {label}</span>
                    <span className={`font-mono text-sm font-bold ${getPropTextColor(val)}`}>
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
