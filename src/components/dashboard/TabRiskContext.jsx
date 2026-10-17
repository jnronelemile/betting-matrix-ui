import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ShieldCheck, ShieldAlert, AlertTriangle, AlertCircle, Ban, Lock, Activity, Info, ChevronDown, ChevronUp } from 'lucide-react';

export default function TabRiskContext({ match }) {
  const [showCoverageNotes, setShowCoverageNotes] = useState(false);

  const risk = match.Risk_Management_Context || {};
  const operational = risk.Operational_Restrictions || {};
  const investment = risk.Investment_Signals || {};
  const blockedMarkets = operational.blocked_markets || [];
  const probs = match.True_Probabilities || {};
  const isKillSwitchActive = investment.IS_KILL_SWITCH_ACTIVE ||
    ((probs.PROB_1 === 0 || probs.PROB_1 == null) && (probs.PROB_O25 === 0 || probs.PROB_O25 == null));

  const coverageNotice = match.Market_Coverage_Notice && typeof match.Market_Coverage_Notice === 'object'
    ? match.Market_Coverage_Notice
    : null;
  const coverageEntries = coverageNotice?.markets && typeof coverageNotice.markets === 'object'
    ? Object.entries(coverageNotice.markets).filter(([, v]) => v && typeof v === 'object')
    : [];

  const getOperationalStatusStyle = (status) => {
    if (status === 'ACTIONABLE_PRODUCTION') {
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    }
    if (status === 'INFORMATIONAL_ONLY') {
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';
    }
    return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
  };

  const getBookmakerCoverageStyle = (coverage) => {
    if (coverage === 'PRESUMED_AVAILABLE') {
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30';
    }
    if (coverage === 'LIMITED_OR_UNKNOWN') {
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';
    }
    if (coverage === 'SPECIALIST_ONLY') {
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30';
    }
    return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-3 duration-500">

      {/* Column 1: Operational Governance & Safeguards */}
      <div className="flex flex-col gap-6">

        {/* Primary Safeguards: Kill-Switch & Governance */}
        <Card title="Garde-fous & Gouvernance Risque" titleIcon={<Lock size={16} />}>
          <div className="flex flex-col gap-4 mt-1">

            {/* Kill-Switch Banner */}
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
                      : 'Conditions de calcul et d’exposition nominales.'}
                  </span>
                </div>
              </div>
              <Badge variant={isKillSwitchActive ? 'danger' : 'success'} className="text-[9px]">
                {isKillSwitchActive ? 'VETO ACTIF' : 'NOMINAL'}
              </Badge>
            </div>

            {/* Profile Applied */}
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Profil de Risque Appliqué</span>
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                {operational.profile_applied ? 'GOUVERNANCE_ACTIVE' : 'STANDARD'}
              </span>
            </div>

            {/* Source Data Integrity */}
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle size={14} /> Intégrité des Données Source
              </span>
              <Badge variant={match.Data_Integrity?.[0] === 'COMPLETE' ? 'success' : 'warning'} className="text-[10px]">
                {match.Data_Integrity?.[0] || 'INCONNU'}
              </Badge>
            </div>

          </div>
        </Card>

        {/* Blocked Markets Section */}
        <Card title="Marchés Bloqués (Veto Risque)" titleIcon={<Ban size={16} />}>
          <div className="flex flex-col gap-4 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                Restrictions Spécifiques par Marché
              </span>
              <Badge variant={blockedMarkets.length > 0 ? 'danger' : 'default'} className="text-[9px]">
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
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
                <ShieldCheck size={20} className="shrink-0 text-slate-400" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider">Aucun marché spécifique bloqué</span>
                  <span className="text-[9px] text-slate-400">Aucun marché individuel spécifiquement bloqué par la liste de restriction.</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Distinct Statistical Market Coverage Notice Reminder (Non-Veto) */}
        <Card title="Market Coverage Notice (Marchés Statistiques)" titleIcon={<Info size={16} />}>
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                Disponibilité Bookmaker &amp; Statut Opérationnel
              </span>
              {coverageNotice?.notice_version && (
                <Badge variant="info" className="text-[8px] font-mono">
                  v{coverageNotice.notice_version}
                </Badge>
              )}
            </div>

            <p className="text-[9px] text-slate-500 dark:text-slate-400 italic leading-relaxed">
              Information de couverture relative aux marchés statistiques (distincte des vetos de risque <code className="font-mono">blocked_markets</code> ci-dessus).
            </p>

            {coverageEntries.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {coverageEntries.map(([mKey, mVal]) => (
                    <div
                      key={mKey}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col gap-1.5 min-w-0"
                    >
                      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/70 dark:border-slate-800/70">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
                          {mKey}
                        </span>
                        <span className="text-[8px] font-mono text-slate-400">
                          {mVal.calculated === true ? 'CALCULATED' : mVal.calculated === false ? 'NOT_CALCULATED' : 'UNSPECIFIED'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 min-w-0">
                        <span className="text-[8px] uppercase font-bold text-slate-400 shrink-0">Status</span>
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border truncate ${getOperationalStatusStyle(mVal.operational_status)}`}>
                          {mVal.operational_status || 'UNSPECIFIED'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 min-w-0">
                        <span className="text-[8px] uppercase font-bold text-slate-400 shrink-0">Coverage</span>
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border truncate ${getBookmakerCoverageStyle(mVal.bookmaker_coverage)}`}>
                          {mVal.bookmaker_coverage || 'UNSPECIFIED'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowCoverageNotes(prev => !prev)}
                    aria-expanded={showCoverageNotes}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                  >
                    <span>{showCoverageNotes ? 'Masquer Disclaimer & Notes' : 'Voir Disclaimer & Notes de couverture'}</span>
                    {showCoverageNotes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {showCoverageNotes && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-[9px]">
                      {coverageNotice.disclaimer && (
                        <p className="font-mono text-slate-600 dark:text-slate-300 leading-relaxed">
                          <strong className="uppercase font-sans font-black text-slate-800 dark:text-slate-200 mr-1">Disclaimer :</strong>
                          {coverageNotice.disclaimer}
                        </p>
                      )}
                      {coverageEntries.filter(([, mVal]) => mVal.notes).map(([mKey, mVal]) => (
                        <div key={`note-${mKey}`} className="pt-1.5 border-t border-slate-200/70 dark:border-slate-800/70">
                          <span className="font-mono font-bold uppercase text-slate-700 dark:text-slate-300 mr-1.5">{mKey}:</span>
                          <span className="text-slate-600 dark:text-slate-400 break-words">{mVal.notes}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] text-slate-400 italic">
                Aucune notice de couverture statistique (Market_Coverage_Notice) fournie pour ce match.
              </div>
            )}
          </div>
        </Card>

      </div>

      {/* Column 2: Investment Signals Matrix */}
      <div className="flex flex-col gap-6">
        <Card title="Investment Signals (Régime de Risque)" titleIcon={<Activity size={16} />}>
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
