import React, { useState, useEffect, useRef } from 'react';
import { Badge } from './ui/Badge';
import { BarChart3, Brain, Crosshair } from 'lucide-react';

import TabCoreMarket from './dashboard/TabCoreMarket';
import TabNarrative from './dashboard/TabNarrative';
import TabTactical from './dashboard/TabTactical';
import TabCalibration from './dashboard/TabCalibration';
import TabRiskContext from './dashboard/TabRiskContext';
import { Calculator, Activity, AlertTriangle, ShieldCheck, Zap, Target } from 'lucide-react';

export function MatchDashboard({ match }) {
  const [activeTab, setActiveTab] = useState('tactical');
  const [slideDirection, setSlideDirection] = useState('right'); // 'left' or 'right'
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef(null);
  
  // Touch refs for swipe
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);

  const TABS = [
    { id: 'tactical', label: 'Tactical & Props', icon: <Crosshair size={14} /> },
    { id: 'core', label: 'Core Market', icon: <BarChart3 size={14} /> },
    { id: 'risk', label: 'Risk Context', icon: <Activity size={14} /> },
    { id: 'narrative', label: 'Narrative & Psych', icon: <Brain size={14} /> },
    { id: 'calibration', label: 'Maths & Calibration', icon: <Calculator size={14} /> },
  ];

  // Swipe logic for mobile
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    const deltaX = touchStartX.current - touchEndX.current;
    const deltaY = touchStartY.current - touchEndY.current;
    const minDistance = 50;

    // Only swipe if horizontal movement is greater than vertical movement
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minDistance) {
      const currentIndex = TABS.findIndex(tab => tab.id === activeTab);
      if (deltaX > 0 && currentIndex < TABS.length - 1) {
        // Swipe Left -> Next
        setSlideDirection('right');
        setActiveTab(TABS[currentIndex + 1].id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (deltaX < 0 && currentIndex > 0) {
        // Swipe Right -> Previous
        setSlideDirection('left');
        setActiveTab(TABS[currentIndex - 1].id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolled(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' }
    );

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => {
      if (headerRef.current) {
        observer.unobserve(headerRef.current);
      }
    };
  }, [match]);

  if (!match) return null;

  const probs = match.True_Probabilities || {};
  const investSignals = match.Risk_Management_Context?.Investment_Signals || {};
  const isKillSwitch = investSignals.IS_KILL_SWITCH_ACTIVE || ((probs.PROB_1 === 0 || probs.PROB_1 == null) && (probs.PROB_O25 === 0 || probs.PROB_O25 == null));

  const displayMatchupShort = match.shortHome && match.shortAway 
    ? `${match.shortHome} vs ${match.shortAway}`
    : match.Matchup.split(' vs ').map(s => s.length > 12 ? s.substring(0, 10) + '..' : s).join(' vs ');

  return (
    <div 
      className="flex flex-col gap-4 relative transition-colors duration-300"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Main Header */}
      <div ref={headerRef} className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif tracking-tight font-bold text-slate-900 dark:text-white drop-shadow-sm">
            {match.Matchup}
          </h2>
          
          <div className="flex flex-wrap gap-2 items-center mt-1 lg:mt-0">
            {match.Calibration_Diagnostics?.confidence_index !== undefined && (
              <Badge variant={match.Calibration_Diagnostics.confidence_index >= 0.5 ? 'success' : 'warning'} className="text-[10px] font-mono tracking-widest px-2 py-1">
                CONFIANCE: {(match.Calibration_Diagnostics.confidence_index * 100).toFixed(1)}%
              </Badge>
            )}

            {investSignals.IS_ULTRA_SAFE && (
              <Badge variant="success" className="text-[10px] flex items-center gap-1.5 px-2 py-1 uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.3)] border-emerald-500/50">
                <ShieldCheck size={12} /> ULTRA SAFE
              </Badge>
            )}

            {investSignals.IS_SAFE_GOALS && (
              <Badge variant="info" className="text-[10px] flex items-center gap-1.5 px-2 py-1 uppercase tracking-widest border-sky-500/50">
                <Target size={12} /> SAFE GOALS
              </Badge>
            )}

            {match.Risk_Management_Context?.Tactical_Red_Flags?.IS_FALSE_FAVORITE && (
              <Badge variant="danger" className="text-[10px] flex items-center gap-1.5 px-2 py-1 uppercase tracking-widest shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                <AlertTriangle size={12} /> Faux Favori Détecté
              </Badge>
            )}

            {isKillSwitch && (
              <Badge variant="danger" className="text-[10px] flex items-center gap-1.5 px-2 py-1 uppercase tracking-widest shadow-[0_0_10px_rgba(244,63,94,0.3)] bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50">
                <AlertTriangle size={12} /> KILL-SWITCH ACTIVÉ
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {match.Data_Integrity?.map((flag, idx) => {
            if (flag === 'COMPLETE') {
              return <span key={idx} className="px-1.5 py-0.5 text-[8px] bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/50 rounded-sm uppercase tracking-widest">{flag}</span>;
            }
            return <Badge key={idx} variant="info" className="text-[9px] opacity-80">{flag}</Badge>;
          })}
          {match.Calibration_Diagnostics?.CONTRADICTION_CORNERS_FOULS && (
            <Badge variant="warning" className="text-[9px] flex items-center gap-1 px-1.5 py-0.5 uppercase tracking-tighter">
              <Zap size={10} /> CONTRADICTION CORNERS/FOULS
            </Badge>
          )}
        </div>
      </div>

      {/* Persistent Matchup & Tab Header (Sticky) */}
      <div className="sticky top-[63px] z-30 flex flex-col bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md shadow-xl -mx-4 px-4 lg:-mx-8 lg:px-8 border-b border-emerald-500/10 transition-all duration-300">
        {/* Matchup Name (Visible only on scroll) */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isScrolled ? 'max-h-20 py-2 opacity-100 border-b border-slate-200 dark:border-slate-800/30' : 'max-h-0 py-0 opacity-0 border-b-0'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-1 h-4 bg-rose-500 rounded-full shrink-0"></div>
              <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 truncate tracking-wide">
                {displayMatchupShort}
              </span>
            </div>
            {match.hours && (
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0">
                {match.hours}
              </span>
            )}
          </div>
        </div>

        {/* Mobile Tab Select */}
        <div className="block md:hidden pb-3 pt-2">
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 px-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  const newIdx = TABS.findIndex(t => t.id === tab.id);
                  const currentIdx = TABS.findIndex(t => t.id === activeTab);
                  setSlideDirection(newIdx > currentIdx ? 'right' : 'left');
                  setActiveTab(tab.id);
                }}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-full font-bold uppercase tracking-wider whitespace-nowrap transition-all text-[11px]
                  ${activeTab === tab.id 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <div className="hidden md:flex gap-2 overflow-x-auto no-scrollbar pb-3 pt-2">
          <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-inner">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  const newIdx = TABS.findIndex(t => t.id === tab.id);
                  const currentIdx = TABS.findIndex(t => t.id === activeTab);
                  setSlideDirection(newIdx > currentIdx ? 'right' : 'left');
                  setActiveTab(tab.id);
                }}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-full font-bold uppercase tracking-widest text-[11px] transition-all duration-300
                  ${activeTab === tab.id 
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700/50 scale-[1.02]' 
                    : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content with Animation */}
      <div className="min-h-[500px] mt-4 overflow-hidden relative">
        <div 
          key={activeTab}
          className={`w-full ${slideDirection === 'right' ? 'animate-slide-right' : 'animate-slide-left'}`}
        >
          {activeTab === 'core' && <TabCoreMarket match={match} />}
          {activeTab === 'risk' && <TabRiskContext match={match} />}
          {activeTab === 'narrative' && <TabNarrative match={match} />}
          {activeTab === 'tactical' && <TabTactical match={match} />}
          {activeTab === 'calibration' && <TabCalibration match={match} />}
        </div>
      </div>
    </div>
  );
}
