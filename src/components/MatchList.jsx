import React, { useState } from 'react';
import { Badge } from './ui/Badge';
import { ChevronRight, AlertTriangle, ChevronDown, Calendar, Maximize2, Minimize2 } from 'lucide-react';

export function MatchList({ matches, selectedMatch, onSelectMatch }) {
  const [collapsedDates, setCollapsedDates] = useState({});

  const groupedMatches = matches.reduce((acc, match) => {
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
    if (dateStr === 'Date Inconnue') return dateStr;
    const date = new Date(`${dateStr}T12:00:00`);
    
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    let formatted = date.toLocaleDateString('fr-FR', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  return (
    <div className="flex flex-col gap-4">
      {matches.length === 0 && (
        <div className="text-center py-10 text-slate-500 text-sm">
          Aucun match trouvé pour ce filtre.
        </div>
      )}

      {sortedDates.length > 0 && (
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Calendrier</span>
          {sortedDates.length > 1 && (
            <div className="flex items-center gap-3">
              <button 
                onClick={expandAll} 
                className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 hover:text-emerald-400 transition-colors"
              >
                <Maximize2 size={12} /> Déplier Tout
              </button>
              <div className="w-px h-3 bg-slate-800"></div>
              <button 
                onClick={collapseAll} 
                className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 hover:text-amber-400 transition-colors"
              >
                <Minimize2 size={12} /> Replier Tout
              </button>
            </div>
          )}
        </div>
      )}

      {sortedDates.map((date) => {
        const isCollapsed = collapsedDates[date];
        const isToday = date === '2026-04-26';

        return (
          <div key={date} className="flex flex-col gap-3">
            <button 
              onClick={() => toggleDate(date)}
              className={`sticky top-0 z-10 w-full flex items-center justify-between backdrop-blur-md border py-2 px-3 rounded-lg shadow-sm transition-all group focus:outline-none focus:ring-1 focus:ring-slate-700 ${
                isToday 
                  ? 'bg-emerald-950/30 border-emerald-500/20 hover:bg-emerald-950/50' 
                  : 'bg-indigo-950/30 border-indigo-500/20 hover:bg-indigo-950/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1 rounded-md ${isToday ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                  <Calendar size={12} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-emerald-400' : 'text-indigo-300'}`}>
                  {formatDate(date)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${isToday ? 'bg-emerald-950 border-emerald-500/30 text-emerald-500' : 'bg-indigo-950 border-indigo-500/30 text-indigo-400'}`}>
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
                
                return (
                  <div 
                    key={idx}
                    onClick={() => onSelectMatch(match)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${
                      isSelected 
                        ? 'bg-slate-800 border-slate-600 shadow-md ring-1 ring-slate-500' 
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-1.5">
                        <h4 className="font-serif tracking-wide font-medium text-slate-100 text-base">{match.Matchup}</h4>
                        <div className="flex items-center gap-2">
                          {isFalseFav && (
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
                        </div>
                      </div>
                      <ChevronRight className={`text-slate-500 transition-transform ${isSelected ? 'translate-x-1 text-slate-300' : ''}`} size={18} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
