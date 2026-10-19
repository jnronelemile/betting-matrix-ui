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
  Scale,
  ChevronDown,
  ChevronUp,
  Target,
  Shield,
  Info
} from 'lucide-react';
import { Badge } from '../ui/Badge';

const INITIAL_VISIBLE_COUNT = 8;

export default function TabSeries({ stats, match, loading, onNavigateTab }) {
  const [distMode, setDistMode] = useState('season'); // 'season', 'venue', 'recent_form'
  const [liveScope, setLiveScope] = useState('season'); // 'season' or 'venue'
  const [gameStateScope, setGameStateScope] = useState('season'); // 'season' or 'venue'

  // Independent expansion state for home and away streaks
  const [isHomeExpanded, setIsHomeExpanded] = useState(false);
  const [isAwayExpanded, setIsAwayExpanded] = useState(false);

  // Accordion state for complementary sections
  const [isLateGameOpen, setIsLateGameOpen] = useState(false);
  const [isGameStateOpen, setIsGameStateOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-mono uppercase tracking-widest">Recherche des séries statistiques v10.0...</p>
      </div>
    );
  }

  if (!stats || !stats.streaks || !stats.goal_distribution) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <TrendingUp size={40} className="mb-3 opacity-20" />
        <p className="text-xs font-mono uppercase tracking-widest">Séries statistiques non disponibles pour ce match</p>
      </div>
    );
  }

  const { streaks, goal_distribution, metadata, fatigue_profile, live_indices, game_state_distribution } = stats;
  const homeTeam = match?.displayHome || match?.shortHome || match?.Matchup?.split(' vs ')[0] || 'Home';
  const awayTeam = match?.displayAway || match?.shortAway || match?.Matchup?.split(' vs ')[1] || 'Away';

  const timeSlots = ["0-15'", "15-30'", "30-45'", "45-60'", "60-75'", "75-90'"];

  // Goal distribution source resolution
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

  const homeStreaks = streaks.team_streaks?.home || [];
  const awayStreaks = streaks.team_streaks?.away || [];
  const h2hStreaks = streaks.h2h_streaks || [];

  const displayedHomeStreaks = isHomeExpanded ? homeStreaks : homeStreaks.slice(0, INITIAL_VISIBLE_COUNT);
  const displayedAwayStreaks = isAwayExpanded ? awayStreaks : awayStreaks.slice(0, INITIAL_VISIBLE_COUNT);

  // Helper to parse streak string cleanly without losing labels or values
  const parseStreak = (streakStr) => {
    if (!streakStr) return { label: '', value: '', teamPrefix: null, icon: null };
    const colonIdx = streakStr.indexOf(':');
    if (colonIdx === -1) {
      return { label: streakStr, value: '', teamPrefix: null, icon: <TrendingUp size={12} /> };
    }

    const rawLabel = streakStr.slice(0, colonIdx).trim();
    const value = streakStr.slice(colonIdx + 1).trim();

    const teamMatch = rawLabel.match(/\(([^)]+)\)/);
    const cleanLabel = rawLabel.replace(/\([^)]+\)/, '').trim();
    const teamPrefix = teamMatch ? teamMatch[1].trim() : null;

    const lower = cleanLabel.toLowerCase();
    let icon = <TrendingUp size={12} className="text-slate-400 dark:text-slate-500" />;
    if (lower.includes('corner')) icon = <Zap size={12} className="text-blue-500 shrink-0" />;
    else if (lower.includes('card') || lower.includes('foul')) icon = <ShieldAlert size={12} className="text-amber-500 shrink-0" />;
    else if (lower.includes('goal') || lower.includes('score') || lower.includes('btts') || lower.includes('clean')) icon = <Goal size={12} className="text-emerald-500 shrink-0" />;
    else if (lower.includes('sot') || lower.includes('shot') || lower.includes('first')) icon = <Target size={12} className="text-indigo-500 shrink-0" />;
    else if (lower.includes('save') || lower.includes('keeper')) icon = <Shield size={12} className="text-teal-500 shrink-0" />;

    return { label: cleanLabel, value, teamPrefix, icon };
  };

  const renderStreakRow = (streakStr, idx, isHomeSide) => {
    const { label, value, teamPrefix, icon } = parseStreak(streakStr);
    const isHome = teamPrefix && (homeTeam.toLowerCase().includes(teamPrefix.toLowerCase()) || teamPrefix.toLowerCase().includes(homeTeam.toLowerCase()));
    const isAway = teamPrefix && (awayTeam.toLowerCase().includes(teamPrefix.toLowerCase()) || teamPrefix.toLowerCase().includes(awayTeam.toLowerCase()));

    return (
      <div
        key={idx}
        className="flex items-center justify-between gap-2.5 py-1.5 px-2.5 rounded-lg border border-transparent hover:border-slate-200/80 dark:hover:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group min-h-[30px]"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="shrink-0">{icon}</span>
          {teamPrefix && (
            <span
              className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border shrink-0 ${
                isHome
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                  : isAway
                    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
              }`}
            >
              {teamPrefix}
            </span>
          )}
          <span
            title={label}
            className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-tight leading-snug break-words"
          >
            {label}
          </span>
        </div>
        <div className="shrink-0 flex items-center">
          <span
            className={`text-xs font-mono font-bold px-2 py-0.5 rounded border shadow-2xs ${
              isHomeSide
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/25'
                : 'text-blue-700 dark:text-blue-300 bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/25'
            }`}
          >
            {value || '--'}
          </span>
        </div>
      </div>
    );
  };

  const renderGoalBarGroup = (scoredArr, fullConcededArr, maxIdx, label) => {
    if (!scoredArr || !Array.isArray(scoredArr)) return null;

    return (
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-center mb-1.5">
          <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex items-end gap-1.5 h-20 relative">
          {scoredArr.map((val, localIdx) => {
            const globalIdx = label === "1st Half" ? localIdx : localIdx + 3;
            const con = fullConcededArr && fullConcededArr[globalIdx] !== undefined ? fullConcededArr[globalIdx] : 0;
            const isPriority = globalIdx === maxIdx && maxIdx !== -1;

            return (
              <div key={globalIdx} className="flex-1 flex flex-col justify-end gap-0.5 h-full group relative">
                <div className="flex justify-center items-center gap-0.5 mb-0.5 leading-none">
                  <span className={`text-[8px] font-mono font-bold ${val > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-700'}`}>{val}</span>
                  <span className="text-[7px] text-slate-300 dark:text-slate-600">/</span>
                  <span className={`text-[8px] font-mono font-bold ${con > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-300 dark:text-slate-700'}`}>{con}</span>
                </div>

                <div className="flex items-end gap-0.5 h-full max-h-[75%]">
                  <div
                    className={`flex-1 bg-emerald-500/40 rounded-t-xs transition-all group-hover:bg-emerald-500/70 ${isPriority ? 'ring-1 ring-emerald-500 bg-emerald-500/60' : ''}`}
                    style={{ height: `${Math.max((val / maxGoalVal) * 100, 6)}%` }}
                  />
                  <div
                    className={`flex-1 bg-rose-500/40 rounded-t-xs transition-all group-hover:bg-rose-500/70 ${isPriority ? 'ring-1 ring-rose-500 bg-rose-500/60' : ''}`}
                    style={{ height: `${Math.max((con / maxGoalVal) * 100, 6)}%` }}
                  />
                </div>

                <span className={`text-[8px] font-mono text-center mt-1 leading-none ${isPriority ? 'text-emerald-600 dark:text-emerald-400 font-bold underline underline-offset-2' : 'text-slate-400 dark:text-slate-500'}`}>
                  {timeSlots[globalIdx] || '--'}
                </span>

                <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[8px] font-mono px-2 py-0.5 rounded shadow-lg z-20 whitespace-nowrap pointer-events-none border border-slate-700">
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
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">

      {/* 1. Team Trends (Home & Away Dual-Column Terminal) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Home Streaks */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <div>
            <div className="flex items-center justify-between mb-3 pl-1.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none mb-0.5">Team Trends</span>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-sm truncate" title={homeTeam}>
                    {homeTeam}
                  </h3>
                </div>
              </div>
              <Badge variant="success" className="font-mono text-[9px] px-2 py-0.5 shadow-2xs">
                HOME • {homeStreaks.length}
              </Badge>
            </div>

            <div className="flex flex-col gap-0.5 divide-y divide-slate-100 dark:divide-slate-800/60 pl-1">
              {displayedHomeStreaks.length > 0 ? (
                displayedHomeStreaks.map((streak, idx) => renderStreakRow(streak, idx, true))
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs italic">Aucune série notable domicile</div>
              )}
            </div>
          </div>

          {homeStreaks.length > INITIAL_VISIBLE_COUNT && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsHomeExpanded(!isHomeExpanded)}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500"
                aria-expanded={isHomeExpanded}
              >
                {isHomeExpanded ? (
                  <>
                    <span>Réduire aux {INITIAL_VISIBLE_COUNT} premières séries</span>
                    <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    <span>Afficher les {homeStreaks.length - INITIAL_VISIBLE_COUNT} autres séries (+{homeStreaks.length - INITIAL_VISIBLE_COUNT})</span>
                    <ChevronDown size={14} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Away Streaks */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <div>
            <div className="flex items-center justify-between mb-3 pl-1.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <CheckCircle2 size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none mb-0.5">Team Trends</span>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-sm truncate" title={awayTeam}>
                    {awayTeam}
                  </h3>
                </div>
              </div>
              <Badge variant="info" className="font-mono text-[9px] px-2 py-0.5 shadow-2xs">
                AWAY • {awayStreaks.length}
              </Badge>
            </div>

            <div className="flex flex-col gap-0.5 divide-y divide-slate-100 dark:divide-slate-800/60 pl-1">
              {displayedAwayStreaks.length > 0 ? (
                displayedAwayStreaks.map((streak, idx) => renderStreakRow(streak, idx, false))
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs italic">Aucune série notable extérieur</div>
              )}
            </div>
          </div>

          {awayStreaks.length > INITIAL_VISIBLE_COUNT && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsAwayExpanded(!isAwayExpanded)}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold font-mono text-blue-600 dark:text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 border border-blue-500/20 flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-expanded={isAwayExpanded}
              >
                {isAwayExpanded ? (
                  <>
                    <span>Réduire aux {INITIAL_VISIBLE_COUNT} premières séries</span>
                    <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    <span>Afficher les {awayStreaks.length - INITIAL_VISIBLE_COUNT} autres séries (+{awayStreaks.length - INITIAL_VISIBLE_COUNT})</span>
                    <ChevronDown size={14} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Head-to-Head History (Dense Grid / Dual-Theme Compatible) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Users size={16} />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-xs sm:text-sm">
              Head-to-Head History
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {h2hStreaks.length} confrontation{h2hStreaks.length > 1 ? 's' : ''} directe{h2hStreaks.length > 1 ? 's' : ''}
          </span>
        </div>

        {h2hStreaks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {h2hStreaks.map((streak, idx) => {
              const { label, value, icon } = parseStreak(streak);
              return (
                <div
                  key={idx}
                  className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2 hover:border-indigo-500/30 transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-slate-400 dark:text-slate-500 shrink-0">{icon}</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 break-words leading-tight" title={label}>
                      {label}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 dark:bg-indigo-500/15 px-1.5 py-0.5 rounded border border-indigo-500/20 shrink-0">
                    {value || '--'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-4 text-center text-slate-400 text-xs italic">
            Aucune confrontation directe récente enregistrée
          </div>
        )}
      </div>

      {/* 3. Goal Distribution Comparison */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <Goal size={16} />
            </div>
            <div className="flex flex-col">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-xs sm:text-sm leading-none">
                Goal Distribution Comparison
              </h3>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">
                Scope : {distMode.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-between sm:justify-end">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/70 dark:border-slate-700/60">
              {hasSeason && (
                <button
                  type="button"
                  onClick={() => setDistMode('season')}
                  className={`px-2.5 py-1 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider transition-all ${
                    distMode === 'season'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Season
                </button>
              )}
              {hasVenue && (
                <button
                  type="button"
                  onClick={() => setDistMode('venue')}
                  className={`px-2.5 py-1 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider transition-all ${
                    distMode === 'venue'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Venue
                </button>
              )}
              {hasRecentForm && (
                <button
                  type="button"
                  onClick={() => setDistMode('recent_form')}
                  className={`px-2.5 py-1 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider transition-all ${
                    distMode === 'recent_form'
                      ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Recent Form
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-xs bg-emerald-500/70"></div> SCORED
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-xs bg-rose-500/70"></div> CONCEDED
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Home Scored vs Away Conceded */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between py-1.5 px-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800/60">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={`${homeTeam} vs ${awayTeam} Def`}>
                {homeTeam} vs {awayTeam} Def
              </span>
              <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border border-emerald-500/20 shrink-0">
                <Zap size={11} />
                <span>Priority: {timeSlots[maxHomeAttackIdx]}</span>
              </div>
            </div>

            <div className="flex items-end gap-1 px-1">
              {renderGoalBarGroup(homeScoredArr.slice(0, 3), awayConcededArr, maxHomeAttackIdx, "1st Half")}

              <div className="w-px h-20 border-l border-dashed border-slate-300 dark:border-slate-700 relative mx-1 flex flex-col justify-end items-center pb-0.5">
                <span className="text-[7px] font-mono font-bold text-slate-400 uppercase">HT</span>
              </div>

              {renderGoalBarGroup(homeScoredArr.slice(3, 6), awayConcededArr, maxHomeAttackIdx, "2nd Half")}
            </div>
          </div>

          {/* Away Scored vs Home Conceded */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between py-1.5 px-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800/60">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={`${awayTeam} vs ${homeTeam} Def`}>
                {awayTeam} vs {homeTeam} Def
              </span>
              <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border border-blue-500/20 shrink-0">
                <Zap size={11} />
                <span>Priority: {timeSlots[maxAwayAttackIdx]}</span>
              </div>
            </div>

            <div className="flex items-end gap-1 px-1">
              {renderGoalBarGroup(awayScoredArr.slice(0, 3), homeConcededArr, maxAwayAttackIdx, "1st Half")}

              <div className="w-px h-20 border-l border-dashed border-slate-300 dark:border-slate-700 relative mx-1 flex flex-col justify-end items-center pb-0.5">
                <span className="text-[7px] font-mono font-bold text-slate-400 uppercase">HT</span>
              </div>

              {renderGoalBarGroup(awayScoredArr.slice(3, 6), homeConcededArr, maxAwayAttackIdx, "2nd Half")}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Physical Fatigue & Rest Profiles (v10.0) */}
      {fatigue_profile && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <BatteryCharging size={16} />
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-xs sm:text-sm">
                  Physical Fatigue & Recovery Profile (v10.0)
                </h3>
                <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">
                  Jours de repos et charge physique pré-match
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Home Fatigue */}
            {fatigue_profile.home && (
              <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate">
                    {homeTeam}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                      {fatigue_profile.home.days_rest}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">jours de repos</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={fatigue_profile.home.index_score > 0.5 ? 'warning' : 'success'} className="text-[9px] uppercase tracking-wider font-mono">
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
              <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider truncate">
                    {awayTeam}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                      {fatigue_profile.away.days_rest}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">jours de repos</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={fatigue_profile.away.index_score > 0.5 ? 'warning' : 'success'} className="text-[9px] uppercase tracking-wider font-mono">
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

      {/* 5. Historical Late-Game Indices (75' - Pre-match Analysis Accordion) */}
      {live_indices && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setIsLateGameOpen(!isLateGameOpen)}
            aria-expanded={isLateGameOpen}
            className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                <Clock size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-xs sm:text-sm">
                    Historical Late-Game Indices (75' - Pre-match Analysis)
                  </h3>
                  <span className="text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    Pré-match • Non Live
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 italic mt-0.5 truncate">
                  Information analytique historique conditionnelle — aucun événement en direct.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div
                className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/70 dark:border-slate-700/60"
                onClick={e => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setLiveScope('season')}
                  className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider transition-all ${
                    liveScope === 'season'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  Season
                </button>
                <button
                  type="button"
                  onClick={() => setLiveScope('venue')}
                  className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider transition-all ${
                    liveScope === 'venue'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  Venue
                </button>
              </div>
              <div className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                {isLateGameOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
          </button>

          {isLateGameOpen && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
              {/* Scope toggle on mobile */}
              <div className="flex sm:hidden items-center justify-between mb-3 pt-3">
                <span className="text-[9px] font-mono uppercase text-slate-400">Périmètre :</span>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setLiveScope('season')}
                    className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${liveScope === 'season' ? 'bg-white dark:bg-slate-900 text-indigo-600' : 'text-slate-500'}`}
                  >
                    Season
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiveScope('venue')}
                    className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${liveScope === 'venue' ? 'bg-white dark:bg-slate-900 text-indigo-600' : 'text-slate-500'}`}
                  >
                    Venue
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 sm:pt-4">
                {/* Home Team Indices */}
                <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-2">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{homeTeam}</span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                      <span className="text-[8px] text-slate-400 uppercase">Clutch (75')</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {live_indices.home?.[liveScope]?.clutch?.index != null
                          ? `${(live_indices.home[liveScope].clutch.index * 100).toFixed(0)}%`
                          : 'N/A'}
                      </span>
                      <span className="text-[8px] text-slate-400 mt-0.5">
                        {live_indices.home?.[liveScope]?.clutch?.success_matches || 0}/{live_indices.home?.[liveScope]?.clutch?.opportunities_at_75m || 0} succès
                      </span>
                    </div>
                    <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                      <span className="text-[8px] text-slate-400 uppercase">Collapse (75')</span>
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        {live_indices.home?.[liveScope]?.collapse?.index != null
                          ? `${(live_indices.home[liveScope].collapse.index * 100).toFixed(0)}%`
                          : 'N/A'}
                      </span>
                      <span className="text-[8px] text-slate-400 mt-0.5">
                        {live_indices.home?.[liveScope]?.collapse?.failed_matches || 0}/{live_indices.home?.[liveScope]?.collapse?.opportunities_leading_by_one_at_75m || 0} échecs
                      </span>
                    </div>
                  </div>
                </div>

                {/* Away Team Indices */}
                <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-2">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">{awayTeam}</span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                      <span className="text-[8px] text-slate-400 uppercase">Clutch (75')</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {live_indices.away?.[liveScope]?.clutch?.index != null
                          ? `${(live_indices.away[liveScope].clutch.index * 100).toFixed(0)}%`
                          : 'N/A'}
                      </span>
                      <span className="text-[8px] text-slate-400 mt-0.5">
                        {live_indices.away?.[liveScope]?.clutch?.success_matches || 0}/{live_indices.away?.[liveScope]?.clutch?.opportunities_at_75m || 0} succès
                      </span>
                    </div>
                    <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                      <span className="text-[8px] text-slate-400 uppercase">Collapse (75')</span>
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        {live_indices.away?.[liveScope]?.collapse?.index != null
                          ? `${(live_indices.away[liveScope].collapse.index * 100).toFixed(0)}%`
                          : 'N/A'}
                      </span>
                      <span className="text-[8px] text-slate-400 mt-0.5">
                        {live_indices.away?.[liveScope]?.collapse?.failed_matches || 0}/{live_indices.away?.[liveScope]?.collapse?.opportunities_leading_by_one_at_75m || 0} échecs
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Game-State Dynamics Accordion */}
      {game_state_distribution && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setIsGameStateOpen(!isGameStateOpen)}
            aria-expanded={isGameStateOpen}
            className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <Scale size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-xs sm:text-sm">
                  Game-State Dynamics (Dynamique par État du Score)
                </h3>
                <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider mt-0.5 truncate">
                  Répartition des buts (Menant, Nul, Mené)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div
                className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/70 dark:border-slate-700/60"
                onClick={e => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setGameStateScope('season')}
                  className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider transition-all ${
                    gameStateScope === 'season'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  Season
                </button>
                <button
                  type="button"
                  onClick={() => setGameStateScope('venue')}
                  className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider transition-all ${
                    gameStateScope === 'venue'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  Venue
                </button>
              </div>
              <div className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                {isGameStateOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
          </button>

          {isGameStateOpen && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
              {/* Scope toggle on mobile */}
              <div className="flex sm:hidden items-center justify-between mb-3 pt-3">
                <span className="text-[9px] font-mono uppercase text-slate-400">Périmètre :</span>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setGameStateScope('season')}
                    className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${gameStateScope === 'season' ? 'bg-white dark:bg-slate-900 text-amber-600' : 'text-slate-500'}`}
                  >
                    Season
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameStateScope('venue')}
                    className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${gameStateScope === 'venue' ? 'bg-white dark:bg-slate-900 text-amber-600' : 'text-slate-500'}`}
                  >
                    Venue
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 sm:pt-4">
                {/* Home Game State */}
                {game_state_distribution.home?.[gameStateScope] && (
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-2">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{homeTeam}</span>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                      <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase">En Avance</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {game_state_distribution.home[gameStateScope].scored?.winning || 0}M / {game_state_distribution.home[gameStateScope].conceded?.winning || 0}E
                        </span>
                      </div>
                      <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase">Score Nul</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                          {game_state_distribution.home[gameStateScope].scored?.tied || 0}M / {game_state_distribution.home[gameStateScope].conceded?.tied || 0}E
                        </span>
                      </div>
                      <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase">En Retard</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                          {game_state_distribution.home[gameStateScope].scored?.losing || 0}M / {game_state_distribution.home[gameStateScope].conceded?.losing || 0}E
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Away Game State */}
                {game_state_distribution.away?.[gameStateScope] && (
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-2">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">{awayTeam}</span>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                      <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase">En Avance</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {game_state_distribution.away[gameStateScope].scored?.winning || 0}M / {game_state_distribution.away[gameStateScope].conceded?.winning || 0}E
                        </span>
                      </div>
                      <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase">Score Nul</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                          {game_state_distribution.away[gameStateScope].scored?.tied || 0}M / {game_state_distribution.away[gameStateScope].conceded?.tied || 0}E
                        </span>
                      </div>
                      <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase">En Retard</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                          {game_state_distribution.away[gameStateScope].scored?.losing || 0}M / {game_state_distribution.away[gameStateScope].conceded?.losing || 0}E
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. Metadata & Source Footer */}
      {metadata && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="shrink-0" />
            <span>Généré : {new Date(metadata.generated_at).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield size={11} className="shrink-0" />
            <span>Source : {metadata.source || 'TITANIUM v10.0 Series'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
