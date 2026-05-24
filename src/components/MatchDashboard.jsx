import React, { useState, useEffect, useRef } from 'react';
import { Badge } from './ui/Badge';
import { 
  BarChart3, 
  Brain, 
  Crosshair, 
  Calculator, 
  Activity, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  Target, 
  ChevronLeft, 
  TrendingUp, 
  Trophy, 
  Fingerprint 
} from 'lucide-react';

import TabCoreMarket from './dashboard/TabCoreMarket';
import TabNarrative from './dashboard/TabNarrative';
import TabTactical from './dashboard/TabTactical';
import TabCalibration from './dashboard/TabCalibration';
import TabRiskContext from './dashboard/TabRiskContext';
import TabSeries from './dashboard/TabSeries';
import TabDeepDive from './dashboard/TabDeepDive';

export function MatchDashboard({ match, onClose }) {
  const [activeTab, setActiveTab] = useState('tactical');
  const [slideDirection, setSlideDirection] = useState('right'); // 'left' or 'right'
  const [isScrolled, setIsScrolled] = useState(false);
  const [serieStats, setSerieStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
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
    { id: 'deepdive', label: 'Analytical Deep-Dive', icon: <Fingerprint size={14} /> },
    { id: 'core', label: 'Core Market', icon: <BarChart3 size={14} /> },
    { id: 'series', label: 'Series Stats', icon: <TrendingUp size={14} /> },
    { id: 'risk', label: 'Risk Context', icon: <Activity size={14} /> },
    { id: 'narrative', label: 'Narrative & Psych', icon: <Brain size={14} /> },
    { id: 'calibration', label: 'Maths & Calibration', icon: <Calculator size={14} /> },
  ];

  useEffect(() => {
    async function fetchSerieStats() {
      if (!match) return;
      setSerieStats(null);
      setLoadingStats(true);
      try {
        const indexRes = await fetch('/data/SERIE_STATS/index.json');
        if (!indexRes.ok) throw new Error('Failed to fetch index');
        const files = await indexRes.json();
        
        const normalizeForFile = (str) => str.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");

        const matchupParts = match.Matchup.split(' vs ');
        if (matchupParts.length < 2) return;

        const homeNorm = normalizeForFile(matchupParts[0]);
        const awayNorm = normalizeForFile(matchupParts[1]);
        const leagueNorm = normalizeForFile(match.League || '');

        let bestFile = null;
        let maxScore = 0;
        
        files.forEach(f => {
          const fileNameOnly = f.split('/').pop().toLowerCase();
          const folderName = f.includes('/') ? f.split('/')[0].toLowerCase() : '';
          
          let score = 0;
          
          // League match
          const isPL = leagueNorm.includes('premier') || leagueNorm === 'pl' || folderName.includes('premier');
          const isSA = leagueNorm.includes('seriea') || leagueNorm.includes('italy') || folderName.includes('seriea');
          const isLL = leagueNorm.includes('liga') || leagueNorm.includes('spain') || folderName.includes('laliga');
          
          if (isPL && folderName.includes('premier')) score += 15;
          else if (isSA && folderName.includes('seriea')) score += 15;
          else if (isLL && (folderName.includes('laliga') || folderName.includes('liga'))) score += 15;
          else if (leagueNorm && (folderName.includes(leagueNorm) || leagueNorm.includes(folderName))) score += 10;
          
          // Check home team
          const hPart = fileNameOnly.split('_')[2]?.toLowerCase() || '';
          const aPart = fileNameOnly.split('_')[3]?.toLowerCase() || '';

          if (fileNameOnly.includes(homeNorm) || (hPart && (homeNorm.includes(hPart) || hPart.includes(homeNorm)))) {
            score += 10;
          } else if (homeNorm.length > 3 && fileNameOnly.includes(homeNorm.substring(0, 4))) {
            score += 5;
          }
          
          // Check away team
          if (fileNameOnly.includes(awayNorm) || (aPart && (awayNorm.includes(aPart) || aPart.includes(awayNorm)))) {
            score += 10;
          } else if (awayNorm.length > 3 && fileNameOnly.includes(awayNorm.substring(0, 4))) {
            score += 5;
          }
          
          if (score > maxScore) {
            maxScore = score;
            bestFile = f;
          }
        });

        // Threshold: Must match at least league + some team part, OR both teams
        if (bestFile && (maxScore >= 15)) {
          const res = await fetch(`/data/SERIE_STATS/${bestFile}`);
          if (res.ok) {
            const stats = await res.json();
            // Basic validation
            if (stats && stats.streaks && stats.goal_distribution) {
              setSerieStats(stats);
            }
          }
        }
      } catch (e) {
        console.error("Error fetching serie stats:", e);
      } finally {
        setLoadingStats(false);
      }
    }

    fetchSerieStats();
  }, [match]);

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

  return (
    <div 
      className="flex flex-col gap-4 relative transition-colors duration-300"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Unified Sticky Header Section */}
      <div className="sticky top-0 z-30 -mx-4 px-4 lg:-mx-8 lg:px-8 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-sm">
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
              <h2 className="text-xl sm:text-2xl lg:text-4xl font-serif tracking-tight font-bold text-slate-900 dark:text-white uppercase">
                {match.Matchup}
              </h2>
            </div>
            
            <div className="flex flex-wrap gap-2 items-center">
              {match.isFinalPick && (
                <Badge variant="success" className="text-[9px] flex items-center gap-1.5 px-3 py-1 uppercase tracking-widest bg-emerald-600 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse">
                  <Trophy size={12} /> MASTER PICK
                </Badge>
              )}

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

              {isKillSwitch && (
                <Badge variant="danger" className="text-[9px] flex items-center gap-1 px-2 py-0.5 uppercase tracking-widest bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50">
                  <AlertTriangle size={10} /> KILL-SWITCH ACTIVE
                </Badge>
              )}
            </div>
          </div>
          
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

        {/* Persistent Tab Navigation */}
        <div className="pb-3 pt-1 border-t border-slate-100 dark:border-slate-900/50">
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-1" ref={mobileTabsContainerRef}>
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
                    flex items-center gap-2 px-5 py-2.5 rounded-full font-black uppercase tracking-wider whitespace-nowrap transition-all text-[10px]
                    ${activeTab === tab.id 
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-xl scale-[1.05]' 
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}
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
      <div className="min-h-[600px] mt-4 overflow-hidden relative">
        <div 
          key={activeTab}
          className={`w-full ${slideDirection === 'right' ? 'animate-slide-right' : 'animate-slide-left'}`}
        >
          {activeTab === 'series' && <TabSeries stats={serieStats} match={match} loading={loadingStats} />}
          {activeTab === 'core' && <TabCoreMarket match={match} />}
          {activeTab === 'risk' && <TabRiskContext match={match} />}
          {activeTab === 'narrative' && <TabNarrative match={match} />}
          {activeTab === 'tactical' && <TabTactical match={match} />}
          {activeTab === 'deepdive' && <TabDeepDive match={match} />}
          {activeTab === 'calibration' && <TabCalibration match={match} />}
        </div>
      </div>
    </div>
  );
}
