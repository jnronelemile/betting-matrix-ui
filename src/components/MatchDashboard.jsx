import React, { useState } from 'react';
import { Badge } from './ui/Badge';
import { BarChart3, Brain, Crosshair } from 'lucide-react';

import TabCoreMarket from './dashboard/TabCoreMarket';
import TabNarrative from './dashboard/TabNarrative';
import TabTactical from './dashboard/TabTactical';
import TabCalibration from './dashboard/TabCalibration';
import TabRiskContext from './dashboard/TabRiskContext';
import { Calculator, Activity, AlertTriangle } from 'lucide-react';

export function MatchDashboard({ match }) {
  const [activeTab, setActiveTab] = useState('core');

  if (!match) return null;

  const TABS = [
    { id: 'core', label: 'Core Market', icon: <BarChart3 size={14} /> },
    { id: 'risk', label: 'Risk Context', icon: <Activity size={14} /> },
    { id: 'narrative', label: 'Narrative & Psych', icon: <Brain size={14} /> },
    { id: 'tactical', label: 'Tactical & Props', icon: <Crosshair size={14} /> },
    { id: 'calibration', label: 'Maths & Calibration', icon: <Calculator size={14} /> },
  ];

  const probs = match.True_Probabilities || {};
  const isKillSwitch = (probs.PROB_1 === 0 || probs.PROB_1 == null) && (probs.PROB_O25 === 0 || probs.PROB_O25 == null);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 mt-2">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif tracking-tight font-medium text-slate-100">{match.Matchup}</h2>
          
          <div className="flex flex-wrap gap-2 items-center mt-1 lg:mt-0">
            {match.Calibration_Diagnostics?.confidence_index !== undefined && (
              <Badge variant={match.Calibration_Diagnostics.confidence_index >= 0.5 ? 'success' : 'warning'} className="text-[10px] font-mono tracking-widest px-2 py-1">
                CONFIANCE: {(match.Calibration_Diagnostics.confidence_index * 100).toFixed(1)}%
              </Badge>
            )}

            {match.Risk_Management_Context?.Tactical_Red_Flags?.IS_FALSE_FAVORITE && (
              <Badge variant="danger" className="text-[10px] flex items-center gap-1.5 px-2 py-1 uppercase tracking-widest shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                <AlertTriangle size={12} /> Faux Favori Détecté
              </Badge>
            )}

            {isKillSwitch && (
              <Badge variant="danger" className="text-[10px] flex items-center gap-1.5 px-2 py-1 uppercase tracking-widest shadow-[0_0_10px_rgba(244,63,94,0.3)] bg-rose-500/20 text-rose-400 border-rose-500/50">
                <AlertTriangle size={12} /> KILL-SWITCH ACTIVÉ
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {match.Data_Integrity?.map((flag, idx) => {
            if (flag === 'COMPLETE') {
              return <span key={idx} className="px-1.5 py-0.5 text-[8px] bg-slate-800/40 text-slate-500 border border-slate-700/50 rounded-sm uppercase tracking-widest">{flag}</span>;
            }
            return <Badge key={idx} variant="info" className="text-[9px] opacity-80">{flag}</Badge>;
          })}
        </div>
      </div>

      {/* Mobile Tab Select */}
      <div className="block md:hidden border-b border-slate-800/50 pb-3 mt-4 relative">
        <select
            value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-xs font-bold uppercase tracking-widest text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer shadow-sm"
        >
          {TABS.map(tab => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none mt-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>

      {/* Desktop Tab Navigation */}
      <div className="hidden md:flex gap-1 md:gap-2 border-b border-slate-800/50 overflow-x-auto custom-scrollbar pb-px -mx-4 px-4 lg:mx-0 lg:px-0 mt-4 lg:mt-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all border-b-2
              ${activeTab === tab.id 
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/50 rounded-t-lg' 
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'}
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'core' && <TabCoreMarket match={match} />}
        {activeTab === 'risk' && <TabRiskContext match={match} />}
        {activeTab === 'narrative' && <TabNarrative match={match} />}
        {activeTab === 'tactical' && <TabTactical match={match} />}
        {activeTab === 'calibration' && <TabCalibration match={match} />}
      </div>
    </div>
  );
}
