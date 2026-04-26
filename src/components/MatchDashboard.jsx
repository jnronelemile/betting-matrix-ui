import React, { useState } from 'react';
import { Badge } from './ui/Badge';
import { BarChart3, Brain, Crosshair } from 'lucide-react';

import TabCoreMarket from './dashboard/TabCoreMarket';
import TabNarrative from './dashboard/TabNarrative';
import TabTactical from './dashboard/TabTactical';

export function MatchDashboard({ match }) {
  const [activeTab, setActiveTab] = useState('core');

  if (!match) return null;

  const TABS = [
    { id: 'core', label: 'Core Market & Risk', icon: <BarChart3 size={14} /> },
    { id: 'narrative', label: 'Narrative & Psych', icon: <Brain size={14} /> },
    { id: 'tactical', label: 'Tactical & Props', icon: <Crosshair size={14} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-3xl font-serif tracking-tight font-medium text-slate-100">{match.Matchup}</h2>
        <div className="flex gap-2 mt-2">
          {match.Data_Integrity?.map((flag, idx) => (
            <Badge key={idx} variant={flag === 'COMPLETE' ? 'success' : 'warning'}>{flag}</Badge>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-800/50 overflow-x-auto custom-scrollbar pb-px">
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
        {activeTab === 'narrative' && <TabNarrative match={match} />}
        {activeTab === 'tactical' && <TabTactical match={match} />}
      </div>
    </div>
  );
}
