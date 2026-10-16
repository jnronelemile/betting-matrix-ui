import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ShieldCheck, ShieldAlert, AlertTriangle, AlertCircle, Ban, Lock, Activity } from 'lucide-react';

export default function TabRiskContext({ match }) {
  const risk = match.Risk_Management_Context || {};
  const operational = risk.Operational_Restrictions || {};
  const investment = risk.Investment_Signals || {};
  const blockedMarkets = operational.blocked_markets || [];
  const probs = match.True_Probabilities || {};
  const isKillSwitchActive = investment.IS_KILL_SWITCH_ACTIVE || 
    ((probs.PROB_1 === 0 || probs.PROB_1 == null) && (probs.PROB_O25 === 0 || probs.PROB_O25 == null));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Column 1: Operational Restrictions & Blocked Markets */}
      <div className="flex flex-col gap-6">
        <Card title="Operational Restrictions (Gouvernance Risque)" titleIcon={<Lock size={16} />}>
          <div className="flex flex-col gap-5 mt-1">
            
            {/* Blocked Markets Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Ban size={14} className="text-rose-500" /> Marchés Bloqués (Veto Risque)
                </span>
                <Badge variant={blockedMarkets.length > 0 ? 'danger' : 'success'} className="text-[9px]">
                  {blockedMarkets.length} {blockedMarkets.length > 1 ? 'marchés' : 'marché'}
                </Badge>
              </div>

              {blockedMarkets.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    {blockedMarkets.map((marketKey) => (
                      <div 
                        key={marketKey} 
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 shadow-sm"
                      >
                        <Ban size={12} className="text-rose-500" />
                        <span className="text-xs font-mono font-bold tracking-tight">{marketKey}</span>
                        <span className="text-[8px] font-black uppercase tracking-wider text-rose-500/80">INTERDIT</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-500 italic mt-1 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <strong className="text-rose-600 dark:text-rose-400 not-italic uppercase font-black mr-1">Règle de risque :</strong>
                    Ces marchés sont formellement exclus de toute sélection ou prise de position par la couche de risque du moteur TITANIUM.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck size={20} className="shrink-0 text-emerald-500" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider">Aucune restriction de marché</span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400">Tous les marchés de base restent autorisés par la gestion de risque.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Applied */}
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Profil de Risque Appliqué</span>
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                {operational.profile_applied ? 'GOUVERNANCE_ACTIVE' : 'STANDARD'}
              </span>
            </div>
          </div>
        </Card>

        {/* Safeguards & Integrity */}
        <Card title="Garde-fous & Intégrité" titleIcon={<ShieldAlert size={16} />}>
          <div className="flex flex-col gap-4 mt-1">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle size={14} /> Intégrité des Données Source
              </span>
              <Badge variant={match.Data_Integrity?.[0] === 'COMPLETE' ? 'success' : 'warning'} className="text-[10px]">
                {match.Data_Integrity?.[0] || 'INCONNU'}
              </Badge>
            </div>

            {/* Kill Switch Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${isKillSwitchActive ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-center gap-3">
                {isKillSwitchActive ? (
                  <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0" size={20} />
                ) : (
                  <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
                )}
                <div className="flex flex-col">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isKillSwitchActive ? 'text-rose-700 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {isKillSwitchActive ? 'Kill-Switch Sécurité Déclenché' : 'Kill-Switch Désactivé'}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {isKillSwitchActive 
                      ? 'Marchés principaux neutralisés côté modèle (probabilités ramenées à 0).' 
                      : 'Les conditions nominales de calcul et d’exposition sont respectées.'}
                  </span>
                </div>
              </div>
              <Badge variant={isKillSwitchActive ? 'danger' : 'success'} className="text-[9px]">
                {isKillSwitchActive ? 'VETO ACTIF' : 'NOMINAL'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Column 2: Investment Signals Matrix */}
      <div className="flex flex-col gap-6">
        <Card title="Investment Signals" titleIcon={<Activity size={16} />}>
          <div className="flex flex-col gap-4 mt-1">
            <p className="text-[10px] text-slate-400 italic">
              Signaux qualifiant le régime de risque et la régularité du match. Ne constituent pas en eux-mêmes des ordres de prise de position sans ticket aval validé.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.entries(investment).map(([key, value]) => (
                <div 
                  key={key} 
                  className={`flex justify-between items-center p-3 rounded-xl border ${
                    value 
                      ? 'bg-emerald-500/10 border-emerald-500/30 shadow-sm' 
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 opacity-60'
                  }`}
                >
                  <span className={`text-[9px] uppercase font-bold tracking-tight ${value ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                    {key.replace('IS_', '').replace(/_/g, ' ')}
                  </span>
                  {value ? (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"></div>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
