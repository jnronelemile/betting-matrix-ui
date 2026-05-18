import React, { useState, useEffect, useRef } from 'react';
import { Badge } from './ui/Badge';
import { BarChart3, Brain, Crosshair } from 'lucide-react';

import TabCoreMarket from './dashboard/TabCoreMarket';
import TabNarrative from './dashboard/TabNarrative';
import TabTactical from './dashboard/TabTactical';
import TabCalibration from './dashboard/TabCalibration';
import TabRiskContext from './dashboard/TabRiskContext';
import { Calculator, Activity, AlertTriangle, ShieldCheck, Zap, Target, ChevronLeft } from 'lucide-react';

export function MatchDashboard({ match, onClose }) {
  const [activeTab, setActiveTab] = useState('tactical');
  const [slideDirection, setSlideDirection] = useState('right'); // 'left' or 'right'
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef(null);
  const tabsContainerRef = useRef(null);
  const mobileTabsContainerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  
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
    // 1. Logic for Desktop (Liquid pill and centering)
    if (tabsContainerRef.current) {
      const activeTabElement = tabsContainerRef.current.querySelector(`[data-tab-id="${activeTab}"]`);
      if (activeTabElement) {
        setIndicatorStyle({
          left: activeTabElement.offsetLeft,
          width: activeTabElement.offsetWidth,
          opacity: 1
        });

        const container = tabsContainerRef.current.parentElement;
        if (container) {
          const scrollLeft = activeTabElement.offsetLeft - (container.offsetWidth / 2) + (activeTabElement.offsetWidth / 2);
          container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
      }
    }

    // 2. Logic for Mobile (Only centering)
    if (mobileTabsContainerRef.current) {
      const activeTabElement = mobileTabsContainerRef.current.querySelector(`[data-tab-id="${activeTab}"]`);
      if (activeTabElement) {
        const container = mobileTabsContainerRef.current;
        const scrollLeft = activeTabElement.offsetLeft - (container.offsetWidth / 2) + (activeTabElement.offsetWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [activeTab]);

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
      {/* Unified Sticky Header Section */}
      <div className="sticky top-[-1px] lg:top-[-33px] z-30 -mx-4 px-4 lg:-mx-8 lg:px-8 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-sm">
        {/* Main Header (Title & Badges) */}
        <div ref={headerRef} className="pt-4 pb-3 lg:pb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
            <div className="flex items-center gap-2">
              {onClose && (
                <button 
                  onClick={onClose}
                  className="lg:hidden p-1.5 -ml-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                  title="Back"
                >
                  <ChevronLeft size={24} />
                </button>
              )}
              <h2 className="text-xl sm:text-2xl lg:text-4xl font-serif tracking-tight font-bold text-slate-900 dark:text-white">
                {match.Matchup}
              </h2>
            </div>
            
            <div className="flex flex-wrap gap-2 items-center">
              {match.Calibration_Diagnostics?.confidence_index !== undefined && (
                <Badge variant={match.Calibration_Diagnostics.confidence_index >= 0.5 ? 'success' : 'warning'} className="text-[9px] font-mono tracking-widest px-2 py-0.5">
                  CONFIDENCE: {(match.Calibration_Diagnostics.confidence_index * 100).toFixed(0)}%
                </Badge>
              )}

              {investSignals.IS_ULTRA_SAFE && (
                <Badge variant="success" className="text-[9px] flex items-center gap-1 px-2 py-0.5 uppercase tracking-widest border-emerald-500/50">
                  <ShieldCheck size={10} /> ULTRA SAFE
                </Badge>
              )}

              {investSignals.IS_SAFE_GOALS && (
                <Badge variant="info" className="text-[9px] flex items-center gap-1 px-2 py-0.5 uppercase tracking-widest border-sky-500/50">
                  <Target size={10} /> SAFE GOALS
                </Badge>
              )}

              {match.Risk_Management_Context?.Tactical_Red_Flags?.IS_FALSE_FAVORITE && (
                <Badge variant="danger" className="text-[9px] flex items-center gap-1 px-2 py-0.5 uppercase tracking-widest border-rose-500/50">
                  <AlertTriangle size={10} /> FALSE FAVORITE
                </Badge>
              )}

              {isKillSwitch && (
                <Badge variant="danger" className="text-[9px] flex items-center gap-1 px-2 py-0.5 uppercase tracking-widest bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50">
                  <AlertTriangle size={10} /> KILL-SWITCH ACTIVE
                </Badge>
              )}            </div>
          </div>
          
          {/* Subtle details line - hidden on very small mobile if scrolled? Or just compact */}
          <div className={`flex flex-wrap gap-2 mt-2 transition-all duration-300 ${isScrolled ? 'h-0 opacity-0 overflow-hidden' : 'h-auto opacity-100'}`}>
            {match.Data_Integrity?.map((flag, idx) => {
              if (flag === 'COMPLETE') return null;
              return <Badge key={idx} variant="info" className="text-[8px] opacity-70 px-1.5">{flag}</Badge>;
            })}
            {match.hours && (
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                ⚡ {match.hours}
              </span>
            )}
          </div>
        </div>

        {/* Persistent Tab Navigation (Integrated into same sticky block) */}
        <div className="pb-3 pt-1 border-t border-slate-100 dark:border-slate-900/50">
          {/* Mobile Tab Select */}
          <div className="block md:hidden">
            <div 
              ref={mobileTabsContainerRef}
              className="flex gap-1 overflow-x-auto no-scrollbar py-1"
            >
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  data-tab-id={tab.id}
                  onClick={() => {
                    const newIdx = TABS.findIndex(t => t.id === tab.id);
                    const currentIdx = TABS.findIndex(t => t.id === activeTab);
                    setSlideDirection(newIdx > currentIdx ? 'right' : 'left');
                    setActiveTab(tab.id);
                  }}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full font-bold uppercase tracking-wider whitespace-nowrap transition-all text-[10px]
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
          <div className="hidden md:flex gap-2 overflow-x-auto no-scrollbar py-1">
            <div 
              ref={tabsContainerRef}
              className="flex relative bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-inner"
            >
              {/* Sliding Indicator */}
              <div 
                className="absolute h-[calc(100%-8px)] top-1 bg-white dark:bg-slate-800 rounded-full shadow-sm ring-1 ring-slate-200 dark:ring-slate-700/50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{ 
                  left: `${indicatorStyle.left}px`, 
                  width: `${indicatorStyle.width}px`,
                  opacity: indicatorStyle.opacity
                }}
              />
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  data-tab-id={tab.id}
                  onClick={() => {
                    const newIdx = TABS.findIndex(t => t.id === tab.id);
                    const currentIdx = TABS.findIndex(t => t.id === activeTab);
                    setSlideDirection(newIdx > currentIdx ? 'right' : 'left');
                    setActiveTab(tab.id);
                  }}
                  className={`
                    relative z-10 flex items-center gap-2 px-6 py-2 rounded-full font-bold uppercase tracking-widest text-[10px] transition-colors duration-500
                    ${activeTab === tab.id 
                      ? 'text-emerald-600 dark:text-emerald-400' 
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
