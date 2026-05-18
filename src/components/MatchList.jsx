import React, { useState } from 'react';
import { Badge } from './ui/Badge';
import { ChevronRight, AlertTriangle, ChevronDown, Calendar, Maximize2, Minimize2, Clock, Radio } from 'lucide-react';

export function MatchList({ matches, selectedMatch, onSelectMatch }) {
  const [collapsedDates, setCollapsedDates] = useState({});
  const [sortByTime, setSortByTime] = useState(true);
  const [showLiveOnly, setShowLiveOnly] = useState(false);

  const formatTimeAMPM = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; 
    return `${h}:${minutes} ${ampm}`;
  };

  const isMatchLive = (dateStr, hoursStr) => {
    if (!dateStr || !hoursStr || dateStr === 'Date Inconnue') return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    const [h, m] = hoursStr.split(':').map(Number);
    
    const matchTimeLocal = new Date(year, month - 1, day, h, m);
    const now = new Date();
    const diffMinutes = (now - matchTimeLocal) / (1000 * 60);
    return diffMinutes >= 0 && diffMinutes <= 120;
  };

  const visibleMatches = showLiveOnly 
    ? matches.filter(match => isMatchLive(match.date, match.hours))
    : matches;

  const groupedMatches = visibleMatches.reduce((acc, match) => {
    const d = match.date || 'Date Inconnue';
    if (!acc[d]) acc[d] = [];
    acc[d].push(match);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedMatches).sort((a, b) => {
    if (a === 'Date Inconnue') return 1;
    if (b === 'Date Inconnue') return -1;
    return a.localeCompare(b);
  });

  const toggleDate = (date) => {
    setCollapsedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  const expandAll = () => setCollapsedDates({});
  const collapseAll = () => {
    const allCollapsed = {};
    sortedDates.forEach(date => { allCollapsed[date] = true; });
    setCollapsedDates(allCollapsed);
  };

  const formatDate = (dateStr) => {
    if (dateStr === 'Unknown Date') return dateStr;
    const date = new Date(`${dateStr}T12:00:00`);
    
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    let formatted = date.toLocaleDateString('en-GB', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  return (
    <div className="flex flex-col gap-4 pb-20 lg:pb-4 transition-colors duration-300">
      {matches.length === 0 && (
        <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-sm">
          No matches found for this filter.
        </div>
      )}

      {sortedDates.length > 0 && (
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Calendar</span>
          <div className="flex items-center gap-3">
            {sortedDates.length > 1 && (
              <>
                <button 
                  onClick={expandAll} 
                  className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  title="Expand All"
                >
                  <Maximize2 size={12} /> <span className="hidden xl:inline">Expand All</span>
                </button>
                <div className="w-px h-3 bg-slate-200 dark:bg-slate-800"></div>
                <button 
                  onClick={collapseAll} 
                  className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                  title="Collapse All"
                >
                  <Minimize2 size={12} /> <span className="hidden xl:inline">Collapse All</span>
                </button>
                <div className="w-px h-3 bg-slate-200 dark:bg-slate-800"></div>
              </>
            )}
            <button 
              onClick={() => setSortByTime(!sortByTime)} 
              className={`flex items-center p-1 rounded transition-colors ${sortByTime ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-blue-600 dark:hover:text-blue-400'}`}
              title="Sort by time"
            >
              <Clock size={14} />
            </button>
            <button 
              onClick={() => setShowLiveOnly(!showLiveOnly)} 
              className={`flex items-center p-1 rounded transition-colors ${showLiveOnly ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'}`}
              title="Show live matches only"
            >
              <Radio size={14} className={showLiveOnly ? "animate-pulse" : ""} />
            </button>
          </div>
        </div>
      )}

      {sortByTime ? (
        <div className="flex-col gap-2 overflow-hidden flex">
          {[...visibleMatches].sort((a, b) => {
            const timeA = a.hours || '99:99';
            const timeB = b.hours || '99:99';
            if (timeA !== timeB) return timeA.localeCompare(timeB);
            return a.Matchup.localeCompare(b.Matchup);
          }).map((match, idx) => {
            const isSelected = selectedMatch && selectedMatch.Matchup === match.Matchup;
            const isFalseFav = match.Risk_Management_Context?.Tactical_Red_Flags?.IS_FALSE_FAVORITE;
            const tension = match.Risk_Management_Context?.Team_Psychology?.net_justice_tension || 0;
            const probs = match.True_Probabilities || {};
            const isKillSwitch = match.Risk_Management_Context?.Investment_Signals?.IS_KILL_SWITCH_ACTIVE || ((probs.PROB_1 === 0 || probs.PROB_1 == null) && (probs.PROB_O25 === 0 || probs.PROB_O25 == null));
            const investSignals = match.Risk_Management_Context?.Investment_Signals || {};
            
            return (
              <div 
                key={idx}
                onClick={() => onSelectMatch(match)}
                className={`p-2.5 rounded-lg cursor-pointer transition-all border ${
                  isSelected 
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-md ring-1 ring-slate-200 dark:ring-slate-500' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-serif tracking-wide font-medium text-slate-900 dark:text-slate-100 text-sm">
                        {match.shortAway ? `${match.shortHome} vs ${match.shortAway}` : match.Matchup}
                      </h4>
                      {match.date && match.date !== 'Date Inconnue' && (
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-slate-800 px-1 rounded bg-slate-50 dark:bg-slate-950">
                          {formatDate(match.date).substring(0, 3)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {isKillSwitch && (
                        <Badge variant="danger" className="flex items-center gap-1 bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                          <AlertTriangle size={10} /> KILL-SWITCH
                        </Badge>
                      )}
                      {investSignals.IS_ULTRA_SAFE && (
                        <Badge variant="success" className="text-[9px] px-1.5 py-0 shadow-[0_0_8px_rgba(16,185,129,0.2)]">ULTRA SAFE</Badge>
                      )}
                      {investSignals.IS_SAFE_GOALS && (
                        <Badge variant="info" className="text-[9px] px-1.5 py-0">SAFE GOALS</Badge>
                      )}
                      {isFalseFav && !isKillSwitch && (
                        <Badge variant="danger" className="flex items-center gap-1">
                          <AlertTriangle size={10} /> False Fav
                        </Badge>
                      )}
                      {tension > 5 && (
                        <Badge variant="warning">High Tension</Badge>
                      )}
                      {(!isFalseFav && tension <= 5) && (
                        <Badge variant="info">Standard</Badge>
                      )}
                      {match.hours && (
                        <div className="flex items-center gap-1 ml-1 bg-slate-100 dark:bg-slate-950/50 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                          {isMatchLive(match.date, match.hours) && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]" title="Match en cours"></div>
                          )}
                          <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                            {formatTimeAMPM(match.hours)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`text-slate-400 dark:text-slate-500 transition-transform ${isSelected ? 'translate-x-1 text-slate-900 dark:text-slate-300' : ''}`} size={18} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        sortedDates.map((date) => {
          const isCollapsed = collapsedDates[date];
          const isToday = date === '2026-04-26';

          return (
            <div key={date} className="flex flex-col gap-3">
              <button 
                onClick={() => toggleDate(date)}
                className={`sticky top-0 z-10 w-full flex items-center justify-between backdrop-blur-md border py-2 px-3 rounded-lg shadow-sm transition-all group focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-700 ${
                  isToday 
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500/20 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/50' 
                    : 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-500/20 hover:bg-indigo-100/80 dark:hover:bg-indigo-950/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1 rounded-md ${isToday ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'}`}>
                    <Calendar size={12} />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-300'}`}>
                    {formatDate(date)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${isToday ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500/30 text-emerald-600 dark:text-emerald-500' : 'bg-indigo-100 dark:bg-indigo-950 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'}`}>
                    {groupedMatches[date].length} MATCH{groupedMatches[date].length > 1 ? 'S' : ''}
                  </div>
                  <ChevronDown size={14} className={`${isToday ? 'text-emerald-500' : 'text-indigo-500'} transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                </div>
              </button>
              
              <div className={`flex-col gap-2 overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0 hidden' : 'max-h-[5000px] opacity-100 flex'}`}>
                {groupedMatches[date].map((match, idx) => {
                  const isSelected = selectedMatch && selectedMatch.Matchup === match.Matchup;
                  const isFalseFav = match.Risk_Management_Context?.Tactical_Red_Flags?.IS_FALSE_FAVORITE;
                  const tension = match.Risk_Management_Context?.Team_Psychology?.net_justice_tension || 0;
                  const probs = match.True_Probabilities || {};
                  const isKillSwitch = match.Risk_Management_Context?.Investment_Signals?.IS_KILL_SWITCH_ACTIVE || ((probs.PROB_1 === 0 || probs.PROB_1 == null) && (probs.PROB_O25 === 0 || probs.PROB_O25 == null));
                  const investSignals = match.Risk_Management_Context?.Investment_Signals || {};
                  
                  return (
                    <div 
                      key={idx}
                      onClick={() => onSelectMatch(match)}
                      className={`p-2.5 rounded-lg cursor-pointer transition-all border ${
                        isSelected 
                          ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-md ring-1 ring-slate-200 dark:ring-slate-500' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col gap-1">
                          <h4 className="font-serif tracking-wide font-medium text-slate-900 dark:text-slate-100 text-sm">
                            {match.shortAway ? `${match.shortHome} vs ${match.shortAway}` : match.Matchup}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {isKillSwitch && (
                              <Badge variant="danger" className="flex items-center gap-1 bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                                <AlertTriangle size={10} /> KILL-SWITCH
                              </Badge>
                            )}
                            {investSignals.IS_ULTRA_SAFE && (
                              <Badge variant="success" className="text-[9px] px-1.5 py-0 shadow-[0_0_8px_rgba(16,185,129,0.2)]">ULTRA SAFE</Badge>
                            )}
                            {investSignals.IS_SAFE_GOALS && (
                              <Badge variant="info" className="text-[9px] px-1.5 py-0">SAFE GOALS</Badge>
                            )}
                            {isFalseFav && !isKillSwitch && (
                              <Badge variant="danger" className="flex items-center gap-1">
                                <AlertTriangle size={10} /> False Fav
                              </Badge>
                            )}
                            {tension > 5 && (
                              <Badge variant="warning">High Tension</Badge>
                            )}
                            {(!isFalseFav && tension <= 5) && (
                              <Badge variant="info">Standard</Badge>
                            )}
                            {match.hours && (
                              <div className="flex items-center gap-1 ml-1 bg-slate-100 dark:bg-slate-950/50 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                                {isMatchLive(match.date, match.hours) && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]" title="Match en cours"></div>
                                )}
                                <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                                  {formatTimeAMPM(match.hours)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <ChevronRight className={`text-slate-400 dark:text-slate-500 transition-transform ${isSelected ? 'translate-x-1 text-slate-900 dark:text-slate-300' : ''}`} size={18} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
