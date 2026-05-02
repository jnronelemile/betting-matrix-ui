import React from 'react';
import { Card } from '../ui/Card';
import { Calculator, Sigma, Building, Activity } from 'lucide-react';

export default function TabCalibration({ match }) {
  const diag = match.Calibration_Diagnostics || {};
  const tactical = match.Risk_Management_Context?.Tactical_Red_Flags || {};
  const narrative = match.Risk_Management_Context?.Situational_Narrative || {};

  if (!match.Calibration_Diagnostics) {
    return <div className="text-slate-500 text-sm italic">Aucune donnée de calibration disponible.</div>;
  }
  
  // Format paired multipliers for clarity
  const renderPairedMulti = (label, homeVal, awayVal) => {
    if (homeVal === undefined || awayVal === undefined) return null;
    const colorHome = Math.abs(homeVal - 1.0) < 0.01 ? 'text-slate-500' : (homeVal > 1 ? 'text-emerald-400' : 'text-rose-400');
    const colorAway = Math.abs(awayVal - 1.0) < 0.01 ? 'text-slate-500' : (awayVal > 1 ? 'text-emerald-400' : 'text-rose-400');
    
    return (
      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-inner mb-2">
        <div className="w-1/3 bg-slate-950 p-2.5 flex items-center justify-center border-r border-slate-800">
           <span className="text-[10px] uppercase tracking-widest text-slate-400 text-center font-bold leading-tight">{label}</span>
        </div>
        <div className="w-1/3 p-2.5 flex flex-col items-center border-r border-slate-800/50">
           <span className="text-[8px] text-slate-600 uppercase mb-1">Domicile</span>
           <span className={`font-mono text-sm font-bold ${colorHome}`}>{homeVal.toFixed(4)}</span>
        </div>
        <div className="w-1/3 p-2.5 flex flex-col items-center">
           <span className="text-[8px] text-slate-600 uppercase mb-1">Extérieur</span>
           <span className={`font-mono text-sm font-bold ${colorAway}`}>{awayVal.toFixed(4)}</span>
        </div>
      </div>
    );
  };

  const renderSingleMulti = (label, val) => {
    if (val === undefined) return null;
    const color = Math.abs(val - 1.0) < 0.01 ? 'text-slate-500' : (val > 1 ? 'text-emerald-400' : 'text-rose-400');
    return (
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-2.5 rounded-lg shadow-inner mb-2">
        <span className="text-[10px] uppercase tracking-widest text-slate-400">{label}</span>
        <span className={`font-mono text-xs font-bold ${color}`}>{val.toFixed(4)}</span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Colonne 1: Vue Globale */}
      <div className="flex flex-col gap-6">
        <Card title="Diagnostics Moteur (V8.2)" titleIcon={<Calculator size={16} />}>
          <div className="flex flex-col gap-5 mt-1">
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-center shadow-inner">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 block">Indice de Confiance (Algorithm Confidence)</span>
              <div className="flex items-center justify-center gap-4">
                <span className={`text-4xl font-mono font-bold tracking-tight ${diag.confidence_index >= 0.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {(diag.confidence_index * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-4 w-full bg-slate-800/50 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${diag.confidence_index >= 0.5 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`} 
                  style={{ width: `${Math.min(100, diag.confidence_index * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center shadow-inner flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50"></div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Lambda Home</span>
                <span className="text-xl font-mono text-blue-400 font-bold">{diag.lambda_home?.toFixed(4)}</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center shadow-inner flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/50"></div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Lambda Away</span>
                <span className="text-xl font-mono text-rose-400 font-bold">{diag.lambda_away?.toFixed(4)}</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center shadow-inner">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Rho Dynamic (Corrélation)</span>
                <span className="text-[9px] text-slate-600 mt-0.5">Ajustement structurel des buts</span>
              </div>
              <span className={`font-mono text-lg font-bold ${diag.rho_dynamic < 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {diag.rho_dynamic?.toFixed(4)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Colonne 2: Multiplicateurs */}
      <div className="flex flex-col gap-6">
        <Card title="Matrice des Multiplicateurs (H2H)" titleIcon={<Sigma size={16} />}>
          <div className="mt-1">
            {renderPairedMulti('TRG (Qualité)', diag.trg_multiplier_home, diag.trg_multiplier_away)}
            {renderPairedMulti('Pressing', diag.press_mult_home, diag.press_mult_away)}
            {renderPairedMulti('Conversion', diag.conv_mult_home, diag.conv_mult_away)}
            {renderPairedMulti('Coups Francs', diag.sp_mult_home, diag.sp_mult_away)}
            {renderPairedMulti('Trajectoire', diag.trajectory_home, diag.trajectory_away)}
          </div>
        </Card>
      </div>

      {/* Colonne 3: Facteurs & Aide Décision */}
      <div className="flex flex-col gap-6">
        <Card title="Facteurs Structurels" titleIcon={<Building size={16} />} className="border-indigo-500/30">
          <div className="flex flex-col gap-4 mt-1">
            {renderSingleMulti('Forteresse Domicile', diag.home_fortress_multiplier)}
            {renderSingleMulti('Bouclier Défensif', diag.defensive_shield)}
            {renderSingleMulti('Biais d\'Efficacité', diag.efficiency_bias_correction)}
          </div>
        </Card>

        <Card title="Variables Croisées (Aide Décision)" titleIcon={<Activity size={16} />}>
          <div className="flex flex-col gap-4 mt-1">
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-inner">
              <span className="text-[10px] uppercase tracking-widest text-slate-400">Indice d'Ouverture</span>
              <span className="font-mono text-sm font-bold text-slate-200">{tactical.match_openness_index?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-inner">
              <span className="text-[10px] uppercase tracking-widest text-slate-400">Gap de Classement</span>
              <span className={`font-mono text-sm font-bold ${tactical.rank_gap_status === 'ELEVATED' ? 'text-amber-400' : 'text-slate-200'}`}>
                 {tactical.rank_gap_status || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-inner">
              <span className="text-[10px] uppercase tracking-widest text-slate-400">Position Delta H/A</span>
              <span className="font-mono text-xs font-bold text-slate-400">
                {narrative.Home_Team?.performance_analysis?.position_diff > 0 ? '+' : ''}{narrative.Home_Team?.performance_analysis?.position_diff || 0} / {narrative.Away_Team?.performance_analysis?.position_diff > 0 ? '+' : ''}{narrative.Away_Team?.performance_analysis?.position_diff || 0}
              </span>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
}
