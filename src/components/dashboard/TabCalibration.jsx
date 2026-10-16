import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Calculator, Sigma, Building, Activity, ShieldCheck, Database, Clock, FileText } from 'lucide-react';

export default function TabCalibration({ match }) {
  const diag = match.Calibration_Diagnostics || {};
  const integrityFlags = diag.integrity_flags || [];

  if (!match.Calibration_Diagnostics) {
    return <div className="text-slate-500 text-sm italic">Aucune donnée de calibration disponible pour ce match.</div>;
  }

  // Format paired multipliers for clarity
  const renderPairedMulti = (label, homeVal, awayVal) => {
    if (homeVal === undefined || awayVal === undefined) return null;
    const colorHome = Math.abs(homeVal - 1.0) < 0.01 ? 'text-slate-500' : (homeVal > 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400');
    const colorAway = Math.abs(awayVal - 1.0) < 0.01 ? 'text-slate-500' : (awayVal > 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400');

    return (
      <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-inner mb-2">
        <div className="w-1/3 bg-slate-100 dark:bg-slate-950 p-2.5 flex items-center justify-center border-r border-slate-200 dark:border-slate-800">
           <span className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 text-center font-bold leading-tight">{label}</span>
        </div>
        <div className="w-1/3 p-2.5 flex flex-col items-center border-r border-slate-200 dark:border-slate-800/50">
           <span className="text-[8px] text-slate-400 dark:text-slate-600 uppercase mb-1">Home</span>
           <span className={`font-mono text-sm font-bold ${colorHome}`}>{homeVal.toFixed(4)}</span>
        </div>
        <div className="w-1/3 p-2.5 flex flex-col items-center">
           <span className="text-[8px] text-slate-400 dark:text-slate-600 uppercase mb-1">Away</span>
           <span className={`font-mono text-sm font-bold ${colorAway}`}>{awayVal.toFixed(4)}</span>
        </div>
      </div>
    );
  };

  const renderSingleMulti = (label, val) => {
    if (val === undefined) return null;
    const color = Math.abs(val - 1.0) < 0.01 ? 'text-slate-500' : (val > 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400');
    return (
      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg shadow-inner mb-2">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">{label}</span>
        <span className={`font-mono text-xs font-bold ${color}`}>{val.toFixed(4)}</span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Column 1: Global View & Intensities */}
      <div className="flex flex-col gap-6">
        <Card title="Engine Diagnostics" titleIcon={<Calculator size={16} />}>
          <div className="flex flex-col gap-5 mt-1">
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-inner">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 block font-bold">Algorithm Confidence Index</span>
              <div className="flex items-center justify-center gap-4">
                <span className={`text-4xl font-mono font-bold tracking-tight ${diag.confidence_index >= 0.5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {(diag.confidence_index * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-4 w-full bg-slate-200 dark:bg-slate-800/50 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ${diag.confidence_index >= 0.5 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}
                  style={{ width: `${Math.min(100, diag.confidence_index * 100)}%` }}
                ></div>
              </div>
              <span className="text-[8px] text-slate-400 italic mt-2 block">
                * Indice de confiance interne algorithmique propre au moteur TITANIUM. Ne constitue ni un taux de réussite prédictif ni une probabilité de gain.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-inner flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50"></div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block font-bold">Home Lambda</span>
                <span className="text-xl font-mono text-blue-600 dark:text-blue-400 font-bold">{diag.lambda_home?.toFixed(4)}</span>
                <div className="mt-1 pt-1 border-t border-slate-200 dark:border-slate-800/50 flex flex-col">
                  <span className="text-[8px] text-slate-400 dark:text-slate-600 uppercase">Raw Composite</span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{diag.composite_home?.toFixed(4)}</span>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-inner flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/50"></div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block font-bold">Away Lambda</span>
                <span className="text-xl font-mono text-rose-600 dark:text-rose-400 font-bold">{diag.lambda_away?.toFixed(4)}</span>
                <div className="mt-1 pt-1 border-t border-slate-200 dark:border-slate-800/50 flex flex-col">
                  <span className="text-[8px] text-slate-400 dark:text-slate-600 uppercase">Raw Composite</span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{diag.composite_away?.toFixed(4)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-inner">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">Dynamic Rho (Correlation)</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-600 mt-0.5">Structural goals adjustment</span>
              </div>
              <span className={`font-mono text-lg font-bold ${diag.rho_dynamic < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {diag.rho_dynamic?.toFixed(4)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Column 2: Multipliers */}
      <div className="flex flex-col gap-6">
        <Card title="Multipliers Matrix (H2H)" titleIcon={<Sigma size={16} />}>
          <div className="mt-1">
            {renderPairedMulti('TRG (Quality)', diag.trg_multiplier_home, diag.trg_multiplier_away)}
            {renderPairedMulti('Pressing', diag.press_mult_home, diag.press_mult_away)}
            {renderPairedMulti('Conversion', diag.conv_mult_home, diag.conv_mult_away)}
            {renderPairedMulti('Free Kicks', diag.sp_mult_home, diag.sp_mult_away)}
            {renderPairedMulti('Trajectory', diag.trajectory_home, diag.trajectory_away)}
          </div>
        </Card>

        <Card title="Structural Factors" titleIcon={<Building size={16} />} className="border-indigo-500/30">
          <div className="flex flex-col gap-1 mt-1">
            {renderSingleMulti('Home Fortress', diag.home_fortress_multiplier)}
            {renderSingleMulti('Defensive Shield', diag.defensive_shield)}
            {renderSingleMulti('Efficiency Bias Correction', diag.efficiency_bias_correction)}
          </div>
        </Card>
      </div>

      {/* Column 3: Integrity Flags & Session Traceability */}
      <div className="flex flex-col gap-6">
        {/* Integrity Flags */}
        <Card title="Integrity & Default Flags" titleIcon={<Activity size={16} />}>
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Drapeaux d'Intégrité Modèle</span>
              <Badge variant={integrityFlags.length > 0 ? 'warning' : 'success'} className="text-[9px]">
                {integrityFlags.length} {integrityFlags.length > 1 ? 'drapeaux' : 'drapeau'}
              </Badge>
            </div>

            {integrityFlags.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 custom-scrollbar">
                {integrityFlags.map((flag, idx) => (
                  <div key={idx} className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-[8px] font-mono text-slate-600 dark:text-slate-400 break-all">
                    {flag}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-center text-xs text-emerald-600 dark:text-emerald-400">
                Aucun ajustement ou donnée par défaut lors de l'inférence.
              </div>
            )}

            <p className="text-[8px] text-slate-400 italic">
              Ces drapeaux signalent les imputations ou valeurs par défaut appliquées lors de l'inférence. Ne constitue pas une validation statistique globale du match.
            </p>
          </div>
        </Card>

        {/* Operational Session Traceability */}
        <Card title="Session Traceability" titleIcon={<Database size={16} />}>
          <div className="flex flex-col gap-2.5 mt-1 text-xs font-mono">
            {match.session_id && (
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold">Session ID</span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[160px]" title={match.session_id}>
                  {match.session_id}
                </span>
              </div>
            )}
            {match.input_snapshot_id && (
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold">Input Snapshot</span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[160px]" title={match.input_snapshot_id}>
                  {match.input_snapshot_id.substring(0, 16)}...
                </span>
              </div>
            )}
            {match.feature_event_cutoff && (
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold">Event Cutoff</span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300">{match.feature_event_cutoff}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1">
              <span className="text-[9px] text-slate-500 uppercase font-bold">Live Eligible</span>
              <div className="flex items-center gap-1.5">
                <Badge variant={match.live_eligible ? 'success' : 'default'} className="text-[8px]">
                  {match.live_eligible ? 'ÉLIGIBLE' : 'NON ÉLIGIBLE'}
                </Badge>
                {match.live_eligibility_reason && (
                  <span className="text-[8px] text-slate-400 font-sans">({match.live_eligibility_reason})</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
}
