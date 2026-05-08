import React, { useState, useEffect, useRef } from 'react';
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
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the main header is NOT intersecting, we are "scrolled"
        setIsScrolled(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' } // -64px to account for the top sticky header
    );

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => {
      if (headerRef.current) {
        observer.unobserve(headerRef.current);
      }
    };
  }, [match]); // Re-run when match changes

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

  // Use short names if available, otherwise cleanup the matchup string
  const displayMatchupShort = match.shortHome && match.shortAway 
    ? `${match.shortHome} vs ${match.shortAway}`
    : match.Matchup.split(' vs ').map(s => s.length > 12 ? s.substring(0, 10) + '..' : s).join(' vs ');

  return (
    <div className="flex flex-col gap-4 relative">
      {/* Main Header (Used for intersection tracking) */}
      <div ref={headerRef} className="border-b border-slate-800 pb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif tracking-tight font-bold text-white drop-shadow-md">
            {match.Matchup}
          </h2>
          
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

      {/* Persistent Matchup & Tab Header (Sticky) */}
      <div className="sticky top-[63px] z-30 flex flex-col bg-slate-950/95 backdrop-blur-md shadow-xl -mx-4 px-4 lg:-mx-8 lg:px-8 border-b border-emerald-500/10 transition-all duration-300">
        {/* Matchup Name (Visible only on scroll) */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isScrolled ? 'max-h-20 py-2 opacity-100 border-b border-slate-800/30' : 'max-h-0 py-0 opacity-0 border-b-0'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-1 h-4 bg-blue-500 rounded-full shrink-0"></div>
              <span className="text-xs sm:text-sm font-bold text-blue-400 truncate tracking-wide">
                {displayMatchupShort}
              </span>
            </div>
            {match.hours && (
              <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                {match.hours}
              </span>
            )}
          </div>
        </div>

        {/* Mobile Tab Select */}
        <div className="block md:hidden pb-3 pt-2">
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              style={{ fontSize: '13px' }}
              className="w-full bg-slate-900 border border-emerald-500/30 rounded-lg py-3 px-4 font-bold uppercase tracking-[0.1em] text-emerald-400 focus:outline-none appearance-none cursor-pointer shadow-inner"
            >
              {TABS.map(tab => (
                <option key={tab.id} value={tab.id} className="bg-slate-900 text-slate-100">
                  {tab.label}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500/70 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <div className="hidden md:flex gap-1 md:gap-4 overflow-x-auto custom-scrollbar pb-px pt-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ fontSize: '13px' }}
              className={`
                flex items-center gap-2 px-4 py-3 font-bold uppercase tracking-widest whitespace-nowrap transition-all border-b-2
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
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px] mt-4">
        {activeTab === 'core' && <TabCoreMarket match={match} />}
        {activeTab === 'risk' && <TabRiskContext match={match} />}
        {activeTab === 'narrative' && <TabNarrative match={match} />}
        {activeTab === 'tactical' && <TabTactical match={match} />}
        {activeTab === 'calibration' && <TabCalibration match={match} />}
      </div>
    </div>
  );
}
