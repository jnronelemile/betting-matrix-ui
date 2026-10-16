import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  ShieldAlert, 
  Goal, 
  Clock, 
  Zap, 
  CheckCircle2, 
  BatteryCharging, 
  Activity, 
  Scale 
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export default function TabSeries({ stats, match, loading }) {
  const [distMode, setDistMode] = useState('season'); // 'season', 'venue', 'recent_form'
  const [liveScope, setLiveScope] = useState('season'); // 'season' or 'venue'
  const [gameStateScope, setGameStateScope] = useState('season'); // 'season' or 'venue'

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-mono uppercase tracking-widest">Recherche des séries statistiques v10.0...</p>
      </div>
    );
  }

  if (!stats || !stats.streaks || !stats.goal_distribution) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <TrendingUp size={48} className="mb-4 opacity-20" />
        <p className="text-sm font-mono uppercase tracking-widest">Séries statistiques non disponibles pour ce match</p>
      </div>
    );
  }

  const { streaks, goal_distribution, metadata, fatigue_profile, live_indices, game_state_distribution } = stats;
  const homeTeam = match.shortHome || match.Matchup?.split(' vs ')[0] || 'Home';
  const awayTeam = match.shortAway || match.Matchup?.split(' vs ')[1] || 'Away';

  const timeSlots = ["0-15'", "15-30'", "30-45'", "45-60'", "60-75'", "75-90'"];

  // Priority detection: Slot where Home Scored + Away Conceded is max
  const rawDist = goal_distribution || {};
  const hasSeason = !!rawDist.season;
  const hasVenue = !!rawDist.venue;
  const hasRecentForm = !!(rawDist.recent_form && Array.isArray(rawDist.recent_form.home_scored));

  let dist = {};
  if (distMode === 'recent_form' && hasRecentForm) {
    dist = rawDist.recent_form;
  } else if (distMode === 'venue' && hasVenue) {
    dist = rawDist.venue;
  } else if (rawDist.season) {
    dist = rawDist.season;
  } else {
    dist = rawDist;
  }

  const homeScoredArr = dist.home_scored || [0,0,0,0,0,0];
  const awayConcededArr = dist.away_conceded || [0,0,0,0,0,0];
  const awayScoredArr = dist.away_scored || [0,0,0,0,0,0];
  const homeConcededArr = dist.home_conceded || [0,0,0,0,0,0];

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
    let icon = <TrendingUp size={12} className="text-slate-400" />;
    if (cleanLabel.toLowerCase().includes('corner')) icon = <Zap size={12} className="text-blue-500" />;
    if (cleanLabel.toLowerCase().includes('card')) icon = <ShieldAlert size={12} className="text-amber-500" />;
    if (cleanLabel.toLowerCase().includes('goal') || cleanLabel.toLowerCase().includes('score')) icon = <Goal size={12} className="text-emerald-500" />;

    // Team matching for coloring
    const isHome = teamPrefix && (homeTeam.toLowerCase().includes(teamPrefix.toLowerCase()) || teamPrefix.toLowerCase().includes(homeTeam.toLowerCase()));
    const isAway = teamPrefix && (awayTeam.toLowerCase().includes(teamPrefix.toLowerCase()) || teamPrefix.toLowerCase().includes(awayTeam.toLowerCase()));

    return (
      <div className="flex flex-col gap-1 w-full">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              {teamPrefix && (
                <span className={`
                  text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shadow-sm
                  ${isHome 
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                    : isAway 
                      ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                      : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}
                `}>
                  {teamPrefix}
                </span>
              )}
              <div className="p-1 bg-slate-100 dark:bg-slate-900 rounded-md border border-slate-200/50 dark:border-slate-800/50">
                {icon}
              </div>
            </div>
            <span className="text-[11px] sm:text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide leading-tight">{cleanLabel}</span>
          </div>
          <div className="flex flex-col items-end shrink-0">
             <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 shadow-sm group-hover:scale-105 transition-transform">
               <span className="text-[11px] sm:text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {value}
               </span>
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             </div>
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
      
      {/* 1. Physical Fatigue & Rest Profiles (v10.0) */}
      {fatigue_profile && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <BatteryCharging size={18} />
            </div>
            <div className="flex flex-col">
              <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-sm">
                Physical Fatigue & Recovery Profile (v10.0)
              </h3>
              <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">
                Charge physique et jours de récupération pré-match
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Home Fatigue */}
            {fatigue_profile.home && (
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{homeTeam}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">{fatigue_profile.home.days_rest}</span>
                    <span className="text-[10px] text-slate-500 uppercase">jours de repos</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={fatigue_profile.home.index_score > 0.5 ? 'warning' : 'success'} className="text-[9px] uppercase tracking-wider">
                    {fatigue_profile.home.label || 'Reposé'}
                  </Badge>
                  <span className="text-[9px] font-mono text-slate-400">
                    Indice: {(fatigue_profile.home.index_score || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Away Fatigue */}
            {fatigue_profile.away && (
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">{awayTeam}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">{fatigue_profile.away.days_rest}</span>
                    <span className="text-[10px] text-slate-500 uppercase">jours de repos</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={fatigue_profile.away.index_score > 0.5 ? 'warning' : 'success'} className="text-[9px] uppercase tracking-wider">
                    {fatigue_profile.away.label || 'Reposé'}
                  </Badge>
                  <span className="text-[9px] font-mono text-slate-400">
                    Indice: {(fatigue_profile.away.index_score || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Team Streaks (Home & Away) */}
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
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.2em] mb-0.5">Team Trends</span>
                <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter text-base sm:text-lg leading-none">{homeTeam}</h3>
              </div>
            </div>
            <Badge variant="success" className="font-mono text-[10px] px-3 py-1 shadow-sm border-emerald-500/30">HOME</Badge>
          </div>
          <div className="flex flex-col gap-3">
            {streaks.team_streaks?.home?.length > 0 ? streaks.team_streaks.home.map((streak, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 hover:border-emerald-500/30 transition-all group">
                {formatStreak(streak)}
              </div>
            )) : (
              <div className="p-6 text-center text-slate-400 text-xs italic">Aucune série notable domicile</div>
            )}
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
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-0.5">Team Trends</span>
                <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter text-base sm:text-lg leading-none">{awayTeam}</h3>
              </div>
            </div>
            <Badge variant="info" className="font-mono text-[10px] px-3 py-1 shadow-sm border-blue-500/30">AWAY</Badge>
          </div>
          <div className="flex flex-col gap-3">
            {streaks.team_streaks?.away?.length > 0 ? streaks.team_streaks.away.map((streak, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 hover:border-blue-500/30 transition-all group">
                {formatStreak(streak)}
              </div>
            )) : (
              <div className="p-6 text-center text-slate-400 text-xs italic">Aucune série notable extérieur</div>
            )}
          </div>
        </div>
      </div>

      {/* 3. H2H Streaks */}
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
          {streaks.h2h_streaks?.length > 0 ? streaks.h2h_streaks.map((streak, idx) => (
            <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10 hover:border-indigo-500/50 transition-all group backdrop-blur-sm">
              {formatStreak(streak)}
            </div>
          )) : (
            <div className="col-span-full p-6 text-center text-slate-400 text-xs italic">
              Aucune confrontation directe récente enregistrée
            </div>
          )}
        </div>
      </div>

      {/* 4. Goal Distribution Comparison with Recent Form selector */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <Goal size={18} className="text-rose-600 dark:text-rose-400" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter text-sm leading-none">Goal Distribution Comparison</h3>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Scope: {distMode.toUpperCase()}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
              {hasSeason && (
                <button
                  onClick={() => setDistMode('season')}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    distMode === 'season'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Season
                </button>
              )}
              {hasVenue && (
                <button
                  onClick={() => setDistMode('venue')}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    distMode === 'venue'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Venue
                </button>
              )}
              {hasRecentForm && (
                <button
                  onClick={() => setDistMode('recent_form')}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    distMode === 'recent_form'
                      ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Recent Form
                </button>
              )}
            </div>
            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-50 dark:bg-slate-950/50 p-2 sm:p-0 rounded-xl sm:bg-transparent self-start sm:self-auto">
               <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500/60 shadow-inner"></div> SCORED</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500/60 shadow-inner"></div> CONCEDED</div>
            </div>
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

      {/* 5. Historical Late-Game Profiles (Indices à 75' - Pré-match) */}
      {live_indices && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Clock size={18} />
              </div>
              <div className="flex flex-col">
                <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-sm">
                  Historical Late-Game Indices (75' - Pre-match Analysis)
                </h3>
                <span className="text-[9px] text-slate-400 italic">
                  Information analytique historique pré-match — pas un événement live en cours.
                </span>
              </div>
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
              <button
                onClick={() => setLiveScope('season')}
                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                  liveScope === 'season'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Season Scope
              </button>
              <button
                onClick={() => setLiveScope('venue')}
                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                  liveScope === 'venue'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Venue Scope
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Home Team Indices */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{homeTeam}</span>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                  <span className="text-[8px] text-slate-400 uppercase">Clutch (75')</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {live_indices.home?.[liveScope]?.clutch?.index != null 
                      ? `${(live_indices.home[liveScope].clutch.index * 100).toFixed(0)}%` 
                      : 'N/A'}
                  </span>
                  <span className="text-[8px] text-slate-400 mt-1">
                    {live_indices.home?.[liveScope]?.clutch?.success_matches || 0}/{live_indices.home?.[liveScope]?.clutch?.opportunities_at_75m || 0} succès
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                  <span className="text-[8px] text-slate-400 uppercase">Collapse (75')</span>
                  <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                    {live_indices.home?.[liveScope]?.collapse?.index != null 
                      ? `${(live_indices.home[liveScope].collapse.index * 100).toFixed(0)}%` 
                      : 'N/A'}
                  </span>
                  <span className="text-[8px] text-slate-400 mt-1">
                    {live_indices.home?.[liveScope]?.collapse?.failed_matches || 0}/{live_indices.home?.[liveScope]?.collapse?.opportunities_leading_by_one_at_75m || 0} échecs
                  </span>
                </div>
              </div>
            </div>

            {/* Away Team Indices */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">{awayTeam}</span>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                  <span className="text-[8px] text-slate-400 uppercase">Clutch (75')</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {live_indices.away?.[liveScope]?.clutch?.index != null 
                      ? `${(live_indices.away[liveScope].clutch.index * 100).toFixed(0)}%` 
                      : 'N/A'}
                  </span>
                  <span className="text-[8px] text-slate-400 mt-1">
                    {live_indices.away?.[liveScope]?.clutch?.success_matches || 0}/{live_indices.away?.[liveScope]?.clutch?.opportunities_at_75m || 0} succès
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                  <span className="text-[8px] text-slate-400 uppercase">Collapse (75')</span>
                  <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                    {live_indices.away?.[liveScope]?.collapse?.index != null 
                      ? `${(live_indices.away[liveScope].collapse.index * 100).toFixed(0)}%` 
                      : 'N/A'}
                  </span>
                  <span className="text-[8px] text-slate-400 mt-1">
                    {live_indices.away?.[liveScope]?.collapse?.failed_matches || 0}/{live_indices.away?.[liveScope]?.collapse?.opportunities_leading_by_one_at_75m || 0} échecs
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Game-State Dynamics (Scored vs Conceded when Winning / Tied / Losing) */}
      {game_state_distribution && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-600 dark:text-amber-400">
                <Scale size={18} />
              </div>
              <div className="flex flex-col">
                <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-sm">
                  Game-State Dynamics (Dynamique par État du Score)
                </h3>
                <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">
                  Répartition des buts selon l'état du match (Menant, Score Nul, Mené)
                </span>
              </div>
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
              <button
                onClick={() => setGameStateScope('season')}
                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                  gameStateScope === 'season'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Season
              </button>
              <button
                onClick={() => setGameStateScope('venue')}
                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                  gameStateScope === 'venue'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Venue
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Home Game State */}
            {game_state_distribution.home?.[gameStateScope] && (
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{homeTeam}</span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                    <span className="text-[8px] text-slate-400 uppercase">En Avance</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {game_state_distribution.home[gameStateScope].scored?.winning || 0}M / {game_state_distribution.home[gameStateScope].conceded?.winning || 0}E
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                    <span className="text-[8px] text-slate-400 uppercase">Score Nul</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 mt-1">
                      {game_state_distribution.home[gameStateScope].scored?.tied || 0}M / {game_state_distribution.home[gameStateScope].conceded?.tied || 0}E
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                    <span className="text-[8px] text-slate-400 uppercase">En Retard</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 mt-1">
                      {game_state_distribution.home[gameStateScope].scored?.losing || 0}M / {game_state_distribution.home[gameStateScope].conceded?.losing || 0}E
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Away Game State */}
            {game_state_distribution.away?.[gameStateScope] && (
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">{awayTeam}</span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                    <span className="text-[8px] text-slate-400 uppercase">En Avance</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {game_state_distribution.away[gameStateScope].scored?.winning || 0}M / {game_state_distribution.away[gameStateScope].conceded?.winning || 0}E
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                    <span className="text-[8px] text-slate-400 uppercase">Score Nul</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 mt-1">
                      {game_state_distribution.away[gameStateScope].scored?.tied || 0}M / {game_state_distribution.away[gameStateScope].conceded?.tied || 0}E
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                    <span className="text-[8px] text-slate-400 uppercase">En Retard</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 mt-1">
                      {game_state_distribution.away[gameStateScope].scored?.losing || 0}M / {game_state_distribution.away[gameStateScope].conceded?.losing || 0}E
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadata & Source */}
      {metadata && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Clock size={12} />
            <span>Généré : {new Date(metadata.generated_at).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={12} />
            <span>Source : {metadata.source || 'TITANIUM v10.0 Series'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
