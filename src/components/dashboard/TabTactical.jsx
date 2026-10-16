import React from 'react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Crosshair, Target, Flag, Layers, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function TabTactical({ match }) {
  const risk = match.Risk_Management_Context || {};
  const tactical = risk.Tactical_Red_Flags || {};
  const anchors = risk.League_Anchors || {};
  const props = match.Prop_Bets || {};
  
  const propBetsKeys = Object.keys(props).filter(k => k.startsWith('PROP_HOME_MORE_'));
  const anchorKeys = [
    { key: 'shots', anchorKey: 'median_shots', label: 'Shots', prop: 'PROB_OVER_MEDIAN_SHOTS', lambda: 'LAMBDA_SHOTS_MATCH' },
    { key: 'sot', anchorKey: 'median_sot', label: 'Shots on Target', prop: 'PROB_OVER_MEDIAN_SOT', lambda: 'LAMBDA_SOT_MATCH' },
    { key: 'corners', anchorKey: 'median_corners', label: 'Corners', prop: 'PROB_OVER_MEDIAN_CORNERS', lambda: 'LAMBDA_CORNERS_MATCH' },
    { key: 'throws', anchorKey: 'mean_throws', label: 'Throws', prop: 'PROB_OVER_MEDIAN_THROWS', lambda: 'LAMBDA_THROWS_MATCH' },
  ];

  const hasFotmobRatings = tactical.fotmob_rating_home !== undefined && 
                           tactical.fotmob_rating_away !== undefined && 
                           !tactical.MISSING_FOTMOB_DATA;

  const getPropColor = (val) => {
    if (val >= 0.70) return 'bg-emerald-500';
    if (val >= 0.50) return 'bg-amber-500';
    return 'bg-slate-600';
  };

  const getPropTextColor = (val) => {
    if (val >= 0.70) return 'text-emerald-600 dark:text-emerald-400';
    if (val >= 0.50) return 'text-amber-600 dark:text-amber-400';
    return 'text-slate-500 dark:text-slate-400';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* League Anchors */}
      <div className="lg:col-span-1">
        <Card title="Match vs League Averages" titleIcon={<Layers size={16} />}>
          <div className="space-y-4 mt-2">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-200 dark:border-slate-800 flex justify-between">
              <span>Metric</span>
              <div className="flex gap-5">
                <span>Ref Avg</span>
                <span>Match Lambda</span>
                <span>Prob &gt; Ref</span>
              </div>
            </div>
            
            {anchorKeys.map(({ key, anchorKey, label, prop, lambda }) => {
              const median = anchors[anchorKey] !== undefined ? anchors[anchorKey] : anchors[`median_${key}`];
              const prob = props[prop];
              const lambdaVal = props[lambda];
              if (median === undefined || prob === undefined) return null;
              
              return (
                <div key={key} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{label}</span>
                  <div className="flex items-center gap-5">
                    <span className="font-mono text-xs text-slate-400 dark:text-slate-500 w-12 text-right">{median.toFixed(2)}</span>
                    <span className={`font-mono text-sm w-16 text-right font-bold ${lambdaVal > median ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
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
        <Card title="Tactical Ratings & Gaps" titleIcon={<Crosshair size={16} />}>
          <div className="space-y-6">
            {hasFotmobRatings ? (
              <div>
                <div className="flex justify-between items-end mb-3">
                  <span className="text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-widest">FotMob Ratings</span>
                  <span className="font-mono text-sm text-slate-400">Gap: {tactical.team_rating_gap?.toFixed(2) || 0}</span>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden shadow-sm">
                    <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-2">Home</div>
                    <div className="font-mono text-2xl text-blue-600 dark:text-blue-400">{tactical.fotmob_rating_home?.toFixed(2)}</div>
                    {tactical.home_wastefulness_score > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/50 flex flex-col items-center">
                        <span className="text-[8px] text-rose-500 dark:text-rose-400 uppercase font-bold tracking-tighter">Wastefulness</span>
                        <span className="text-xs font-mono text-rose-600 dark:text-rose-500 font-bold">{tactical.home_wastefulness_score?.toFixed(3)}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-slate-400 dark:text-slate-600 font-mono text-sm font-bold">VS</div>
                  <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden shadow-sm">
                    <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-2">Away</div>
                    <div className="font-mono text-2xl text-rose-600 dark:text-rose-400">{tactical.fotmob_rating_away?.toFixed(2)}</div>
                    {tactical.away_wastefulness_score > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/50 flex flex-col items-center">
                        <span className="text-[8px] text-rose-500 dark:text-rose-400 uppercase font-bold tracking-tighter">Wastefulness</span>
                        <span className="text-xs font-mono text-rose-600 dark:text-rose-500 font-bold">{tactical.away_wastefulness_score?.toFixed(3)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs italic flex flex-col items-center gap-1">
                <Flag size={16} className="opacity-40 mb-1" />
                <span>Ratings FotMob non disponibles pour ce match</span>
              </div>
            )}

            {/* False Favorite Alert */}
            {tactical.IS_FALSE_FAVORITE && (
              <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl flex items-center justify-between shadow-sm animate-pulse">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="text-rose-600 dark:text-rose-400 shrink-0" size={18} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest leading-none">FALSE FAVORITE ALERT</span>
                    <span className="text-[9px] text-rose-500/80">Favori algorithmique vulnérable</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                  {tactical.false_favorite_score?.toFixed(3)}
                </span>
              </div>
            )}

            {!tactical.IS_FALSE_FAVORITE && tactical.false_favorite_score > 0 && (
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-inner flex justify-between items-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">False Favorite Score</span>
                <span className="font-mono text-sm font-bold text-slate-400 dark:text-slate-500">
                  {tactical.false_favorite_score?.toFixed(3)}
                </span>
              </div>
            )}

            {/* Match Openness Index */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Match Openness Index</span>
                <span className="text-[9px] text-slate-400">Degré d'ouverture offensive du match</span>
              </div>
              <span className="font-mono text-2xl font-bold text-slate-800 dark:text-slate-200">
                {tactical.match_openness_index?.toFixed(2) || 'N/A'}
              </span>
            </div>
            
            {tactical.MISSING_FOTMOB_DATA && hasFotmobRatings && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs uppercase tracking-wider">
                <Flag size={14} /> Partial FotMob Data
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Full Props Grid */}
      <div className="lg:col-span-1">
        <Card title="Proposition Market" titleIcon={<Target size={16} />}>
          <div className="flex flex-col gap-4 mt-2">
            {propBetsKeys.length > 0 ? propBetsKeys.map(key => {
              const val = props[key];
              const label = key.replace('PROP_HOME_MORE_', '').replace(/_/g, ' ');
              
              return (
                <div key={key} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">Home &gt; Away : {label}</span>
                    <span className={`font-mono text-sm font-bold ${getPropTextColor(val)}`}>
                      {(val * 100).toFixed(1)}%
                    </span>
                  </div>
                  <ProgressBar value={val} max={1} colorClass={getPropColor(val)} displayValue=" " />
                </div>
              );
            }) : (
              <div className="p-6 text-center text-slate-400 text-xs italic">
                Aucun marché de proposition disponible pour ce match.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
