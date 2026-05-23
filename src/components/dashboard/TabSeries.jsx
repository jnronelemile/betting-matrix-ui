import React from 'react';
import { TrendingUp, Users, ShieldAlert, Goal, Clock, Zap, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/Badge';

export default function TabSeries({ stats, match, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-mono uppercase tracking-widest">Searching Series Data...</p>
      </div>
    );
  }

  if (!stats || !stats.streaks || !stats.goal_distribution) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <TrendingUp size={48} className="mb-4 opacity-20" />
        <p className="text-sm font-mono uppercase tracking-widest">Incomplete Series Data</p>
      </div>
    );
  }

  const { streaks, goal_distribution, metadata } = stats;
  const homeTeam = match.shortHome || match.Matchup?.split(' vs ')[0] || 'Home';
  const awayTeam = match.shortAway || match.Matchup?.split(' vs ')[1] || 'Away';

  const timeSlots = ["0-15'", "15-30'", "30-45'", "45-60'", "60-75'", "75-90'"];

  // Priority detection: Slot where Home Scored + Away Conceded is max
  const homeScoredArr = goal_distribution.home_scored || [0,0,0,0,0,0];
  const awayConcededArr = goal_distribution.away_conceded || [0,0,0,0,0,0];
  const awayScoredArr = goal_distribution.away_scored || [0,0,0,0,0,0];
  const homeConcededArr = goal_distribution.home_conceded || [0,0,0,0,0,0];

  const homeAttackScore = homeScoredArr.map((val, i) => val + (awayConcededArr[i] || 0));
  const maxHomeAttackIdx = homeAttackScore.indexOf(Math.max(...homeAttackScore));

  const awayAttackScore = awayScoredArr.map((val, i) => val + (homeConcededArr[i] || 0));
  const maxAwayAttackIdx = awayAttackScore.indexOf(Math.max(...awayAttackScore));

  // Dynamic max for scaling
  const allGoalValues = [...homeScoredArr, ...homeConcededArr, ...awayScoredArr, ...awayConcededArr];
  const maxGoalVal = Math.max(...allGoalValues, 5);

  const formatStreak = (streakStr) => {
    if (!streakStr) return null;
    const parts = streakStr.split(':');
    if (parts.length < 2) return <span className="text-sm font-medium">{streakStr}</span>;
    
    const label = parts[0].trim();
    const value = parts[1].trim();
    
    // Check if label contains team name in parentheses
    const teamMatch = label.match(/\(([^)]+)\)/);
    const cleanLabel = label.replace(/\([^)]+\)/, '').trim();
    const teamPrefix = teamMatch ? teamMatch[1] : null;

    // Detect icon based on label
    let icon = <TrendingUp size={10} />;
    if (cleanLabel.toLowerCase().includes('corner')) icon = <Zap size={10} className="text-blue-500" />;
    if (cleanLabel.toLowerCase().includes('card')) icon = <ShieldAlert size={10} className="text-amber-500" />;
    if (cleanLabel.toLowerCase().includes('goal') || cleanLabel.toLowerCase().includes('score')) icon = <Goal size={10} className="text-emerald-500" />;

    return (
      <div className="flex flex-col gap-1 w-full">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
               {teamPrefix && (
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">[{teamPrefix}]</span>
              )}
              {icon}
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide leading-tight">{cleanLabel}</span>
          </div>
          <div className="flex flex-col items-end shrink-0">
             <span className="text-[10px] sm:text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 shadow-sm">
                {value}
             </span>
          </div>
        </div>
      </div>
    );
  };

  const renderGoalBarGroup = (scoredArr, fullConcededArr, maxIdx, label) => {
    if (!scoredArr || !Array.isArray(scoredArr)) return null;
    
    return (
      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-center mb-2">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">{label}</span>
        </div>
        <div className="flex items-end gap-2 h-32 relative">
          {scoredArr.map((val, localIdx) => {
            const globalIdx = label === "1st Half" ? localIdx : localIdx + 3;
            const con = fullConcededArr && fullConcededArr[globalIdx] !== undefined ? fullConcededArr[globalIdx] : 0;
            const isPriority = globalIdx === maxIdx && maxIdx !== -1;
            
            return (
              <div key={globalIdx} className="flex-1 flex flex-col justify-end gap-1 h-full group relative">
                <div className="flex justify-center gap-1 mb-1">
                  <span className={`text-[7px] font-bold ${val > 0 ? 'text-emerald-500' : 'text-slate-300'}`}>{val}</span>
                  <span className="text-[7px] text-slate-300">/</span>
                  <span className={`text-[7px] font-bold ${con > 0 ? 'text-rose-500' : 'text-slate-300'}`}>{con}</span>
                </div>
                
                <div className="flex items-end gap-0.5 h-full max-h-[80%]">
                  <div 
                    className={`flex-1 bg-emerald-500/40 rounded-t-sm transition-all group-hover:bg-emerald-500/70 ${isPriority ? 'ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-slate-900 bg-emerald-500/60' : ''}`} 
                    style={{ height: `${Math.max((val / maxGoalVal) * 100, 5)}%` }}
                  />
                  <div 
                    className={`flex-1 bg-rose-500/40 rounded-t-sm transition-all group-hover:bg-rose-500/70 ${isPriority ? 'ring-2 ring-rose-500 ring-offset-1 dark:ring-offset-slate-900 bg-rose-500/60' : ''}`} 
                    style={{ height: `${Math.max((con / maxGoalVal) * 100, 5)}%` }}
                  />
                </div>
                
                <span className={`text-[8px] font-mono text-center mt-2 ${isPriority ? 'text-emerald-500 font-bold underline decoration-emerald-500/30 underline-offset-4' : 'text-slate-400'}`}>
                  {timeSlots[globalIdx] || '--'}
                </span>

                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[8px] px-2 py-1 rounded shadow-xl z-20 whitespace-nowrap pointer-events-none border border-slate-700">
                  <span className="text-emerald-400">S:{val}</span> <span className="mx-1 opacity-30">|</span> <span className="text-rose-400">C:{con}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Team Streaks (Home & Away) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Home Streaks */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Team Trends</span>
                <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter text-sm leading-tight truncate max-w-[150px]">{homeTeam}</h3>
              </div>
            </div>
            <Badge variant="success" className="font-mono text-[9px] px-2 py-0.5">HOME</Badge>
          </div>
          <div className="flex flex-col gap-3">
            {streaks.team_streaks.home.map((streak, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 hover:border-emerald-500/30 transition-all group">
                {formatStreak(streak)}
              </div>
            ))}
          </div>
        </div>

        {/* Away Streaks */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Team Trends</span>
                <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter text-sm leading-tight truncate max-w-[150px]">{awayTeam}</h3>
              </div>
            </div>
            <Badge variant="info" className="font-mono text-[9px] px-2 py-0.5">AWAY</Badge>
          </div>
          <div className="flex flex-col gap-3">
            {streaks.team_streaks.away.map((streak, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 hover:border-blue-500/30 transition-all group">
                {formatStreak(streak)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. H2H Streaks */}
      <div className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-white">
          <Users size={100} />
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
            <Users size={18} className="text-indigo-400" />
          </div>
          <h3 className="font-black text-white uppercase tracking-tighter text-sm leading-none">Head-to-Head History</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {streaks.h2h_streaks.map((streak, idx) => (
            <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10 hover:border-indigo-500/50 transition-all group backdrop-blur-sm">
              {formatStreak(streak)}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Goal Distribution Comparison */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <Goal size={18} className="text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter text-sm leading-none">Goal Distribution Comparison</h3>
          </div>
          <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-50 dark:bg-slate-950/50 p-2 sm:p-0 rounded-xl sm:bg-transparent self-start sm:self-auto">
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500/60 shadow-inner"></div> SCORED</div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500/60 shadow-inner"></div> CONCEDED</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Home Scored vs Away Conceded */}
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Offensive Pressure</span>
                <span className="text-sm font-black text-slate-900 dark:text-slate-100">{homeTeam} vs {awayTeam} Def</span>
              </div>
              <div className="bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-emerald-500/20 shadow-sm animate-pulse">
                <Zap size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">Priority: {timeSlots[maxHomeAttackIdx]}</span>
              </div>
            </div>

            <div className="flex items-end gap-0 px-2">
              {renderGoalBarGroup(homeScoredArr.slice(0, 3), awayConcededArr, maxHomeAttackIdx, "1st Half")}
              
              <div className="flex flex-col items-center justify-end h-32 px-4 pb-8">
                <div className="w-px h-full bg-slate-200 dark:bg-slate-800 border-l border-dashed border-slate-300 dark:border-slate-700 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 px-2 py-1 text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] transform rotate-90 whitespace-nowrap border border-slate-200 dark:border-slate-800 rounded-md shadow-sm">
                    HALF TIME
                  </div>
                </div>
              </div>

              {renderGoalBarGroup(homeScoredArr.slice(3, 6), awayConcededArr, maxHomeAttackIdx, "2nd Half")}
            </div>
          </div>

          {/* Away Scored vs Home Conceded */}
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Offensive Pressure</span>
                <span className="text-sm font-black text-slate-900 dark:text-slate-100">{awayTeam} vs {homeTeam} Def</span>
              </div>
              <div className="bg-blue-500/10 text-blue-600 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-blue-500/20 shadow-sm animate-pulse">
                <Zap size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">Priority: {timeSlots[maxAwayAttackIdx]}</span>
              </div>
            </div>

            <div className="flex items-end gap-0 px-2">
              {renderGoalBarGroup(awayScoredArr.slice(0, 3), homeConcededArr, maxAwayAttackIdx, "1st Half")}
              
              <div className="flex flex-col items-center justify-end h-32 px-4 pb-8">
                <div className="w-px h-full bg-slate-200 dark:bg-slate-800 border-l border-dashed border-slate-300 dark:border-slate-700 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 px-2 py-1 text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] transform rotate-90 whitespace-nowrap border border-slate-200 dark:border-slate-800 rounded-md shadow-sm">
                    HALF TIME
                  </div>
                </div>
              </div>

              {renderGoalBarGroup(awayScoredArr.slice(3, 6), homeConcededArr, maxAwayAttackIdx, "2nd Half")}
            </div>
          </div>
        </div>
      </div>

      {/* Metadata & Source */}
      {metadata && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Clock size={12} />
            <span>Generated: {new Date(metadata.generated_at).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={12} />
            <span>Source: {metadata.source}</span>
          </div>
        </div>
      )}

      {/* Narrative Context integration hint */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 flex items-start gap-4 shadow-inner">
        <div className="p-2 bg-amber-500/10 rounded-xl">
          <ShieldAlert size={20} className="text-amber-500" />
        </div>
        <div className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed italic font-medium">
          <strong className="uppercase tracking-widest text-[10px] block mb-1">Titanium Engine Insight:</strong> 
          These trends and streaks are dynamically processed to calibrate the "Justice Tension" and "Situational Multipliers". High streak regularity increases the reliability of generated investment signals.
        </div>
      </div>
    </div>
  );
}

