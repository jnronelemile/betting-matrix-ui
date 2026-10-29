import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  Compass,
  Shield,
  TrendingUp,
  Scale,
  History,
  Award,
  Info,
  AlertTriangle,
  Calendar,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen
} from 'lucide-react';
import {
  formatEloRating,
  formatSignedEloDelta,
  formatNormalizedExpectation,
  translateOqFlags,
  resolveRivalryPresentation,
  extractTeamHistoricalSeries,
  filterHistoricalMatches,
  getUserFriendlyFiMessage
} from '../../utils/footballIntelligenceLoader';

const INITIAL_EXPLORER_LIMIT = 20;

/**
 * Graphique SVG pur restituant les ratings Elo d'avant-match enregistrés dans historical_matches.
 * Interrompt les segments lors des transitions intersaisons ou des retours après absence
 * pour ne jamais tracer d'interpolations artificielles.
 */
function HistoricalEloChart({
  primaryTeam,
  secondaryTeam,
  primarySeries,
  secondarySeries,
  activeLeagueMean,
  pinnedPointKey,
  inspectedPointKey,
  onSelectPoint,
  onHoverPoint,
  onMouseLeaveChart
}) {
  const width = 760;
  const height = 250;
  const padLeft = 52;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 36;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const chartData = useMemo(() => {
    const allDatesSet = new Set();
    primarySeries.forEach(p => allDatesSet.add(p.date));
    secondarySeries.forEach(p => allDatesSet.add(p.date));
    const sortedDates = Array.from(allDatesSet).sort();

    if (sortedDates.length === 0) {
      return null;
    }

    const dateIndexMap = new Map();
    sortedDates.forEach((d, idx) => dateIndexMap.set(d, idx));

    // Mappage des dates aux saisons pour identifier les transitions intersaisons
    const dateSeasonMap = new Map();
    primarySeries.forEach(p => dateSeasonMap.set(p.date, p.seasonKey));
    secondarySeries.forEach(p => dateSeasonMap.set(p.date, p.seasonKey));

    const seasonTransitions = [];
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const s1 = dateSeasonMap.get(sortedDates[i]);
      const s2 = dateSeasonMap.get(sortedDates[i + 1]);
      if (s1 && s2 && s1 !== s2) {
        const x1 = padLeft + (i / (sortedDates.length - 1)) * plotW;
        const x2 = padLeft + ((i + 1) / (sortedDates.length - 1)) * plotW;
        seasonTransitions.push({
          x: (x1 + x2) / 2,
          fromSeason: s1,
          toSeason: s2
        });
      }
    }

    const allRatings = [1500];
    if (Number.isFinite(activeLeagueMean)) allRatings.push(activeLeagueMean);
    primarySeries.forEach(p => {
      if (Number.isFinite(p.ratingPreMatch)) allRatings.push(p.ratingPreMatch);
    });
    secondarySeries.forEach(p => {
      if (Number.isFinite(p.ratingPreMatch)) allRatings.push(p.ratingPreMatch);
    });

    const minRaw = Math.min(...allRatings);
    const maxRaw = Math.max(...allRatings);
    const minElo = Math.floor((minRaw - 20) / 25) * 25;
    const maxElo = Math.ceil((maxRaw + 20) / 25) * 25;
    const eloRange = Math.max(50, maxElo - minElo);

    const getX = (dateStr) => {
      if (sortedDates.length === 1) return padLeft + plotW / 2;
      const idx = dateIndexMap.get(dateStr) ?? 0;
      return padLeft + (idx / (sortedDates.length - 1)) * plotW;
    };

    const getY = (rating) => {
      const ratio = (rating - minElo) / eloRange;
      return padTop + plotH - ratio * plotH;
    };

    // Regroupement par saison pour ne jamais interpoler au travers d'interruptions
    const buildSegmentsAndNodes = (series, seriesId) => {
      const segments = [];
      const nodes = [];
      let currentSeason = null;
      let currentSegment = [];

      series.forEach((pt, idx) => {
        const x = getX(pt.date);
        const y = getY(pt.ratingPreMatch);
        const key = `${seriesId}::${pt.date}::${idx}`;
        const node = { ...pt, x, y, key, seriesId };
        nodes.push(node);

        if (pt.seasonKey !== currentSeason || pt.isReturningAfterAbsence) {
          if (currentSegment.length > 1) {
            segments.push(currentSegment);
          }
          currentSegment = [node];
          currentSeason = pt.seasonKey;
        } else {
          currentSegment.push(node);
        }
      });

      if (currentSegment.length > 1) {
        segments.push(currentSegment);
      }

      return { segments, nodes };
    };

    const primaryBuilt = buildSegmentsAndNodes(primarySeries, 'primary');
    const secondaryBuilt = buildSegmentsAndNodes(secondarySeries, 'secondary');

    const yTicks = [];
    const step = eloRange <= 150 ? 25 : 50;
    for (let v = minElo; v <= maxElo; v += step) {
      yTicks.push({ value: v, y: getY(v) });
    }

    return {
      sortedDates,
      minElo,
      maxElo,
      getY,
      yTicks,
      seasonTransitions,
      primarySegments: primaryBuilt.segments,
      primaryNodes: primaryBuilt.nodes,
      secondarySegments: secondaryBuilt.segments,
      secondaryNodes: secondaryBuilt.nodes
    };
  }, [primarySeries, secondarySeries, activeLeagueMean, plotW, plotH]);

  if (!chartData) {
    return (
      <div className="p-8 text-center text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        Aucune observation historique de rating Elo d&apos;avant-match ne correspond au club et à la saison sélectionnés.
      </div>
    );
  }

  const baseline1500Y = chartData.getY(1500);
  const activeMeanY = Number.isFinite(activeLeagueMean) ? chartData.getY(activeLeagueMean) : null;
  const firstDate = chartData.sortedDates[0];
  const midDate = chartData.sortedDates[Math.floor(chartData.sortedDates.length / 2)];
  const lastDate = chartData.sortedDates[chartData.sortedDates.length - 1];

  return (
    <div className="w-full overflow-x-auto" data-no-swipe="true">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[540px] h-auto select-none"
        role="img"
        aria-label="Graphique de l'évolution historique des ratings Elo d'avant-match"
        onMouseLeave={onMouseLeaveChart}
      >
        {/* Lignes de repère horizontales et étiquettes de l'axe Y */}
        {chartData.yTicks.map(t => (
          <g key={t.value}>
            <line
              x1={padLeft}
              y1={t.y}
              x2={width - padRight}
              y2={t.y}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800/80"
              strokeWidth="1"
            />
            <text
              x={padLeft - 8}
              y={t.y + 3}
              textAnchor="end"
              className="fill-slate-400 dark:fill-slate-500 font-mono text-[10px]"
            >
              {t.value}
            </text>
          </g>
        ))}

        {/* Lignes de transition intersaisons */}
        {chartData.seasonTransitions.map(tr => (
          <g key={`${tr.fromSeason}-${tr.toSeason}`}>
            <line
              x1={tr.x}
              y1={padTop}
              x2={tr.x}
              y2={padTop + plotH}
              stroke="currentColor"
              className="text-slate-300 dark:text-slate-700"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <text
              x={tr.x}
              y={padTop + 10}
              textAnchor="middle"
              className="fill-slate-400 dark:fill-slate-500 font-mono text-[8px]"
            >
              Intersaison
            </text>
          </g>
        ))}

        {/* Ligne de référence nominale 1500 Elo */}
        {baseline1500Y >= padTop && baseline1500Y <= padTop + plotH && (
          <g>
            <line
              x1={padLeft}
              y1={baseline1500Y}
              x2={width - padRight}
              y2={baseline1500Y}
              stroke="currentColor"
              className="text-slate-400 dark:text-slate-600"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <text
              x={width - padRight - 4}
              y={baseline1500Y - 4}
              textAnchor="end"
              className="fill-slate-400 dark:fill-slate-500 font-mono text-[9px]"
            >
              Référence 1500 Elo
            </text>
          </g>
        )}

        {/* Moyenne Elo active du championnat */}
        {activeMeanY !== null && activeMeanY >= padTop && activeMeanY <= padTop + plotH && (
          <g>
            <line
              x1={padLeft}
              y1={activeMeanY}
              x2={width - padRight}
              y2={activeMeanY}
              stroke="currentColor"
              className="text-indigo-400/70 dark:text-indigo-500/60"
              strokeDasharray="2 3"
              strokeWidth="1"
            />
            <text
              x={padLeft + 6}
              y={activeMeanY - 4}
              textAnchor="start"
              className="fill-indigo-500 dark:fill-indigo-400 font-mono text-[9px]"
            >
              Moyenne active ({activeLeagueMean.toFixed(2)})
            </text>
          </g>
        )}

        {/* Segments équipe secondaire (Extérieur) */}
        {chartData.secondarySegments.map((seg, idx) => (
          <polyline
            key={`sec-seg-${idx}`}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={seg.map(n => `${n.x.toFixed(1)},${n.y.toFixed(1)}`).join(' ')}
            opacity="0.85"
          />
        ))}

        {/* Segments équipe principale (Domicile ou club sélectionné) */}
        {chartData.primarySegments.map((seg, idx) => (
          <polyline
            key={`pri-seg-${idx}`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={seg.map(n => `${n.x.toFixed(1)},${n.y.toFixed(1)}`).join(' ')}
          />
        ))}

        {/* Points d'observation équipe secondaire */}
        {chartData.secondaryNodes.map(node => {
          const isInspected = inspectedPointKey === node.key;
          const isPinned = pinnedPointKey === node.key;
          const isSpecial = node.isNewEntrant || node.isReturningAfterAbsence || node.rivalry.isDocumentedRivalry;
          return (
            <circle
              key={node.key}
              cx={node.x}
              cy={node.y}
              r={isPinned ? 6.5 : isInspected ? 5.2 : isSpecial ? 4 : 2.8}
              className="cursor-pointer transition-all"
              fill={isPinned ? '#ffffff' : isInspected ? '#fff1f2' : node.rivalry.isDocumentedRivalry ? '#f59e0b' : '#f43f5e'}
              stroke={isPinned ? '#e11d48' : '#f43f5e'}
              strokeWidth={isPinned ? 2.5 : isInspected ? 2 : 1.2}
              onClick={() => onSelectPoint(node)}
              onMouseEnter={() => onHoverPoint(node)}
            >
              <title>
                {`${node.date} (${node.seasonKey}) · ${node.teamName} vs ${node.opponentName} (${node.scoreDisplay}) · Rating Elo avant-match : ${node.ratingPreMatch.toFixed(2)}${isPinned ? ' [ÉPINGLÉ]' : ''}`}
              </title>
            </circle>
          );
        })}

        {/* Points d'observation équipe principale */}
        {chartData.primaryNodes.map(node => {
          const isInspected = inspectedPointKey === node.key;
          const isPinned = pinnedPointKey === node.key;
          const isSpecial = node.isNewEntrant || node.isReturningAfterAbsence || node.rivalry.isDocumentedRivalry;
          return (
            <circle
              key={node.key}
              cx={node.x}
              cy={node.y}
              r={isPinned ? 6.5 : isInspected ? 5.2 : isSpecial ? 4 : 2.8}
              className="cursor-pointer transition-all"
              fill={isPinned ? '#ffffff' : isInspected ? '#eff6ff' : node.rivalry.isDocumentedRivalry ? '#f59e0b' : '#3b82f6'}
              stroke={isPinned ? '#2563eb' : '#3b82f6'}
              strokeWidth={isPinned ? 2.5 : isInspected ? 2 : 1.2}
              onClick={() => onSelectPoint(node)}
              onMouseEnter={() => onHoverPoint(node)}
            >
              <title>
                {`${node.date} (${node.seasonKey}) · ${node.teamName} vs ${node.opponentName} (${node.scoreDisplay}) · Rating Elo avant-match : ${node.ratingPreMatch.toFixed(2)}${isPinned ? ' [ÉPINGLÉ]' : ''}`}
              </title>
            </circle>
          );
        })}

        {/* Étiquettes de l'axe X (dates) */}
        <text x={padLeft} y={height - 10} textAnchor="start" className="fill-slate-400 dark:fill-slate-500 font-mono text-[10px]">
          {firstDate}
        </text>
        {chartData.sortedDates.length > 2 && (
          <text x={padLeft + plotW / 2} y={height - 10} textAnchor="middle" className="fill-slate-400 dark:fill-slate-500 font-mono text-[10px]">
            {midDate}
          </text>
        )}
        {chartData.sortedDates.length > 1 && (
          <text x={width - padRight} y={height - 10} textAnchor="end" className="fill-slate-400 dark:fill-slate-500 font-mono text-[10px]">
            {lastDate}
          </text>
        )}
      </svg>
    </div>
  );
}

export default function TabFootballIntelligence({ match, fiState, loading }) {
  const [chartTeamMode, setChartTeamMode] = useState('BOTH'); // 'BOTH' | 'HOME' | 'AWAY' | 'CUSTOM'
  const [chartCustomTeam, setChartCustomTeam] = useState('');
  const [chartSeason, setChartSeason] = useState('ALL');
  const [pinnedChartPoint, setPinnedChartPoint] = useState(null);
  const [hoveredChartPoint, setHoveredChartPoint] = useState(null);

  const [explorerTeamMode, setExplorerTeamMode] = useState('BOTH_MATCH_TEAMS'); // 'BOTH_MATCH_TEAMS' | 'H2H' | 'HOME_TEAM' | 'AWAY_TEAM' | 'CUSTOM_TEAM' | 'ALL_LEAGUE'
  const [explorerCustomTeam, setExplorerCustomTeam] = useState('');
  const [explorerSeason, setExplorerSeason] = useState('ALL');
  const [onlyRivalries, setOnlyRivalries] = useState(false);
  const [sortOrder, setSortOrder] = useState('DESC'); // 'DESC' | 'ASC'
  const [visibleRowsCount, setVisibleRowsCount] = useState(INITIAL_EXPLORER_LIMIT);
  const [showDefinitions, setShowDefinitions] = useState(false);

  const association = fiState?.association || null;
  const dataset = fiState?.dataset || null;
  const target = association?.target || null;

  const targetHomeTeam = target?.home_team || '';
  const targetAwayTeam = target?.away_team || '';

  // Réinitialiser les filtres locaux lors d'un changement de match
  useEffect(() => {
    setChartTeamMode('BOTH');
    setChartCustomTeam('');
    setChartSeason('ALL');
    setPinnedChartPoint(null);
    setHoveredChartPoint(null);
    setExplorerTeamMode('BOTH_MATCH_TEAMS');
    setExplorerCustomTeam('');
    setExplorerSeason('ALL');
    setOnlyRivalries(false);
    setVisibleRowsCount(INITIAL_EXPLORER_LIMIT);
  }, [targetHomeTeam, targetAwayTeam, target?.date]);

  useEffect(() => {
    setPinnedChartPoint(null);
    setHoveredChartPoint(null);
  }, [chartSeason, chartTeamMode, chartCustomTeam]);

  const primaryChartTeam = useMemo(() => {
    if (!target) return '';
    if (chartTeamMode === 'AWAY') return target.away_team;
    if (chartTeamMode === 'CUSTOM' && chartCustomTeam) return chartCustomTeam;
    return target.home_team;
  }, [target, chartTeamMode, chartCustomTeam]);

  const secondaryChartTeam = useMemo(() => {
    if (!target || chartTeamMode !== 'BOTH') return '';
    return target.away_team;
  }, [target, chartTeamMode]);

  const primarySeries = useMemo(() => {
    if (!dataset || !primaryChartTeam) return [];
    return extractTeamHistoricalSeries(dataset, primaryChartTeam, chartSeason);
  }, [dataset, primaryChartTeam, chartSeason]);

  const secondarySeries = useMemo(() => {
    if (!dataset || !secondaryChartTeam) return [];
    return extractTeamHistoricalSeries(dataset, secondaryChartTeam, chartSeason);
  }, [dataset, secondaryChartTeam, chartSeason]);

  const inspectedPoint = useMemo(() => {
    if (pinnedChartPoint) return pinnedChartPoint;
    if (hoveredChartPoint) return hoveredChartPoint;
    if (primarySeries.length > 0) {
      const last = primarySeries[primarySeries.length - 1];
      return { ...last, key: `primary::${last.date}::${primarySeries.length - 1}`, seriesId: 'primary' };
    }
    if (secondarySeries.length > 0) {
      const last = secondarySeries[secondarySeries.length - 1];
      return { ...last, key: `secondary::${last.date}::${secondarySeries.length - 1}`, seriesId: 'secondary' };
    }
    return null;
  }, [pinnedChartPoint, hoveredChartPoint, primarySeries, secondarySeries]);

  const handleSelectPoint = (node) => {
    setPinnedChartPoint(prev => (prev?.key === node.key ? null : node));
  };

  const handleHoverPoint = (node) => {
    if (!pinnedChartPoint) {
      setHoveredChartPoint(node);
    }
  };

  const handleMouseLeaveChart = () => {
    if (!pinnedChartPoint) {
      setHoveredChartPoint(null);
    }
  };

  const filteredHistoryRows = useMemo(() => {
    if (!dataset || !target) return [];
    return filterHistoricalMatches(dataset, {
      teamMode: explorerTeamMode,
      homeTeam: target.home_team,
      awayTeam: target.away_team,
      customTeam: explorerCustomTeam,
      seasonFilter: explorerSeason,
      onlyDocumentedRivalries: onlyRivalries
    });
  }, [dataset, target, explorerTeamMode, explorerCustomTeam, explorerSeason, onlyRivalries]);

  const sortedHistoryRows = useMemo(() => {
    const list = [...filteredHistoryRows];
    return list.sort((a, b) => {
      const dateCmp = sortOrder === 'DESC' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      const idA = a.matchId || `${a.homeTeam}_${a.awayTeam}`;
      const idB = b.matchId || `${b.homeTeam}_${b.awayTeam}`;
      return sortOrder === 'DESC' ? idB.localeCompare(idA) : idA.localeCompare(idB);
    });
  }, [filteredHistoryRows, sortOrder]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-mono uppercase tracking-widest">Chargement du profil Football Intelligence...</p>
      </div>
    );
  }

  if (!fiState || !fiState.available || !fiState.matched || !target) {
    const isUnsupportedLeague = fiState?.status === 'LEAGUE_UNSUPPORTED' || fiState?.status === 'ARTIFACT_NOT_AVAILABLE';
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <Compass size={38} className="mb-3 text-slate-400 dark:text-slate-500 opacity-50" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
          {isUnsupportedLeague ? 'Football Intelligence non disponible pour ce championnat' : 'Football Intelligence indisponible pour cette rencontre'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
          {getUserFriendlyFiMessage(fiState)}
        </p>
      </div>
    );
  }

  const ts = target.team_strength;
  const oq = target.opponent_quality;
  const isFullLeagueCoverage = target.active_league_mean_status === 'ESTABLISHED_FULL_PARTICIPANTS';
  const activeLeagueAvgDisplay = isFullLeagueCoverage && Number.isFinite(target.active_league_mean)
    ? `${formatEloRating(target.active_league_mean)} Elo`
    : 'Indisponible (couverture partielle des participants)';

  const homeRankDisplay = isFullLeagueCoverage && Number.isInteger(ts.home.rank_in_league)
    ? `#${ts.home.rank_in_league} sur ${association.expectedParticipants}`
    : 'Indisponible (couverture partielle des participants)';

  const awayRankDisplay = isFullLeagueCoverage && Number.isInteger(ts.away.rank_in_league)
    ? `#${ts.away.rank_in_league} sur ${association.expectedParticipants}`
    : 'Indisponible (couverture partielle des participants)';

  const homeOqFlags = translateOqFlags(oq.home.flags);
  const awayOqFlags = translateOqFlags(oq.away.flags);
  const rivalryInfo = resolveRivalryPresentation(target.rivalry_intelligence);

  const homeSeasonEntry = association.homeSeasonEntry;
  const awaySeasonEntry = association.awaySeasonEntry;

  const displayedExplorerRows = filteredHistoryRows.slice(0, visibleRowsCount);

  const renderTeamStrengthPanel = (sideLabel, teamName, sideStrength, seasonEntry, accentClass, borderAccentClass, rankDisplay) => {
    // Restituer strictement les indicateurs de l'observation cible
    const showMatchNewEntrant = Boolean(sideStrength.is_new_entrant);
    const showMatchReturning = Boolean(sideStrength.is_returning_after_absence);

    // Contexte historique de début de saison affiché uniquement si la cible n'est PAS la rencontre d'ouverture
    const showHistoricalSeasonNewEntrant = !showMatchNewEntrant && Boolean(seasonEntry?.isNewEntrant) && target.season_key !== dataset.historicalSeasons[0];
    const showHistoricalSeasonReturning = !showMatchReturning && Boolean(seasonEntry?.isReturningAfterAbsence);

    return (
      <div className={`bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 relative overflow-hidden shadow-2xs`}>
        <div className={`absolute top-0 left-0 w-1 h-full ${borderAccentClass}`} />
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
              {sideLabel}
            </span>
            <h4 className={`text-sm sm:text-base font-bold ${accentClass} tracking-tight`}>
              {teamName}
            </h4>
          </div>
          <Badge variant="default" className="font-mono text-[10px] px-2.5 py-0.5">
            Rang Elo : {rankDisplay}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold block">
              Rating Elo d&apos;avant-match (Pre-match Elo)
            </span>
            <span className="font-mono text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">
              {formatEloRating(sideStrength.rating_pre_match)}
              <span className="text-[10px] font-normal text-slate-400 ml-1">Elo</span>
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold block">
              Historique cette saison
            </span>
            <span className="font-mono text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {sideStrength.matches_observed_season}
              <span className="text-[10px] font-normal text-slate-400 ml-1">matchs</span>
            </span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 block">
              Précédant cette rencontre ({target.season_key})
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold block">
              Historique observé en championnat
            </span>
            <span className="font-mono text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {sideStrength.matches_observed_total}
              <span className="text-[10px] font-normal text-slate-400 ml-1">matchs</span>
            </span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 block">
              Cumul dans le jeu de données rejoué
            </span>
          </div>
        </div>

        {(showMatchNewEntrant || showMatchReturning || showHistoricalSeasonNewEntrant || showHistoricalSeasonReturning) && (
          <div className="mt-3 flex flex-col gap-1.5">
            {showMatchNewEntrant && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs">
                <Sparkles size={14} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Première apparition dans ce jeu de données : </span>
                  <span>Première apparition enregistrée pour ce club dans le jeu de données multi-saisons disponible.</span>
                </div>
              </div>
            )}
            {showMatchReturning && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs">
                <History size={14} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Retour après absence dans l&apos;historique observé : </span>
                  <span>Club réintégrant les observations de ce jeu de données après une absence sur les saisons antérieures.</span>
                </div>
              </div>
            )}
            {showHistoricalSeasonNewEntrant && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px]">
                <Info size={13} className="shrink-0 mt-0.5" />
                <span>
                  <strong>Contexte historique (Saison {target.season_key}) :</strong> Première apparition dans les saisons enregistrées survenue le {seasonEntry.firstMatchDate}.
                </span>
              </div>
            )}
            {showHistoricalSeasonReturning && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px]">
                <Info size={13} className="shrink-0 mt-0.5" />
                <span>
                  <strong>Contexte historique (Saison {target.season_key}) :</strong> Retour après absence dans l&apos;historique observé survenu le {seasonEntry.firstMatchDate}.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderOpponentQualityPanel = (sideLabel, teamName, sideOq, translatedFlags, accentClass) => {
    const nObs = sideOq.n_opponents_observed;
    const nCtx = sideOq.n_contextualized_gaps_observed;
    const isPartialL5 = nObs < 5;
    const isPartialCtx = nCtx < nObs;

    return (
      <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                {sideLabel}
              </span>
              <h4 className={`text-sm sm:text-base font-bold ${accentClass}`}>
                {teamName}
              </h4>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={isPartialL5 ? 'warning' : 'info'} className="font-mono text-[9px] px-2 py-0.5">
                Couverture L5 : {nObs}/5
              </Badge>
              <Badge variant={isPartialCtx || nObs === 0 ? 'warning' : 'default'} className="font-mono text-[9px] px-2 py-0.5">
                Couverture contextualisée : {nCtx}/{nObs}
              </Badge>
            </div>
          </div>

          {nObs === 0 ? (
            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-mono">
              Historique enregistré restreint (0/5 adversaires observés). Moyennes Elo des adversaires et écarts de calendrier indisponibles.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Métrique principale 1 : Rating Elo moyen des adversaires L5 */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold block">
                  Rating Elo moyen des adversaires · 5 derniers (L5)
                </span>
                <span className="font-mono text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {formatEloRating(sideOq.opp_strength_l5_avg)}
                  {sideOq.opp_strength_l5_avg !== null && (
                    <span className="text-[10px] font-normal text-slate-400 ml-1">Elo</span>
                  )}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">
                  Moyenne des ratings Elo d&apos;avant-match des {nObs} dernier{nObs > 1 ? 's' : ''} adversaire{nObs > 1 ? 's' : ''}
                </span>
              </div>

              {/* Métrique principale 2 : Écart vs moyenne active du championnat */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold block">
                  Écart vs moyenne active du championnat
                </span>
                <span className="font-mono text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {formatSignedEloDelta(sideOq.schedule_difficulty_vs_active_mean)}
                  {sideOq.schedule_difficulty_vs_active_mean !== null && (
                    <span className="text-[10px] font-normal text-slate-400 ml-1">Elo</span>
                  )}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">
                  Écart vs moyenne active actuelle ({isFullLeagueCoverage && Number.isFinite(target.active_league_mean) ? target.active_league_mean.toFixed(2) : 'non établie'})
                </span>
              </div>

              {/* Métrique avancée 3 : Écart vs référence fixe 1500 Elo */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    Écart vs référence fixe 1500 Elo
                  </span>
                  <span className="text-[8px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Réf. Nominale
                  </span>
                </div>
                <span className="font-mono text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {formatSignedEloDelta(sideOq.schedule_difficulty_vs_nominal_anchor)}
                  {sideOq.schedule_difficulty_vs_nominal_anchor !== null && (
                    <span className="text-[10px] font-normal text-slate-400 ml-1">Elo</span>
                  )}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">
                  Comparé à l&apos;ancrage fixe de 1500,00 (et non à la moyenne observée)
                </span>
              </div>

              {/* Métrique avancée 4 : Écart moyen contextualisé aux dates des matchs */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    Écart contextualisé aux dates des matchs
                  </span>
                  <span className="text-[8px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {nCtx}/{nObs} Dates
                  </span>
                </div>
                <span className="font-mono text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {formatSignedEloDelta(sideOq.opp_strength_l5_contextualized_gap_avg)}
                  {sideOq.opp_strength_l5_contextualized_gap_avg !== null && (
                    <span className="text-[10px] font-normal text-slate-400 ml-1">Elo</span>
                  )}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">
                  Moyenne des écarts vs moyenne active à la date respective de chaque match
                </span>
              </div>
            </div>
          )}
        </div>

        {translatedFlags.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800/70">
            {translatedFlags.map((msg, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertTriangle size={12} className="shrink-0" />
                <span>{msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Bandeau d'analyse et de contexte descriptif */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info" className="text-[9px] font-mono px-2.5 py-0.5">
              Analyse descriptive
            </Badge>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              {association.leagueName} · Saison {target.season_key}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
              <Calendar size={12} /> Date de la rencontre : {target.date}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Base historique : {dataset.historicalMatches.length.toLocaleString('fr-FR')} matchs ({dataset.historicalSeasons.join(' – ')})
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Reconstruction chronologique intra-championnat des ratings Elo et contexte du calendrier adverse pour <strong>{target.home_team}</strong> vs <strong>{target.away_team}</strong>. Couche descriptive pure — ne modifie ni les probabilités des modèles, ni les edges de valeur, ni les décisions de risque.
          </p>
        </div>

        <button
          type="button"
          data-no-swipe="true"
          onClick={() => setShowDefinitions(prev => !prev)}
          className="self-start md:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors shrink-0"
        >
          <BookOpen size={13} />
          <span>{showDefinitions ? 'Masquer le guide' : 'Guide des métriques'}</span>
          {showDefinitions ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Panneau pédagogique d'explication des métriques */}
      {showDefinitions && (
        <div className="bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-300">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-1">
              Rating Elo d&apos;avant-match & Rang Elo (Pre-match Elo & League Elo Rank)
            </h4>
            <p className="leading-relaxed text-slate-500 dark:text-slate-400">
              Évaluation intra-championnat actualisée de façon strictement chronologique à partir des scores officiels en saison régulière précédant cette rencontre. Le <strong>Rang Elo en championnat (League Elo Rank)</strong> ordonne les clubs actifs établis selon leur rating Elo d&apos;avant-match — à ne jamais confondre avec le classement officiel par points.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-1">
              Qualité des adversaires vs Forme récente (Opponent Quality vs Recent Form)
            </h4>
            <p className="leading-relaxed text-slate-500 dark:text-slate-400">
              La métrique <strong>Opponent Quality</strong> mesure les ratings Elo d&apos;avant-match jusqu&apos;aux 5 derniers adversaires observés en championnat. Une valeur positive indique des adversaires d&apos;un niveau supérieur à la moyenne de référence ; elle mesure la difficulté du calendrier passé, jamais les résultats V/N/D ou les xG de l&apos;équipe elle-même.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-1">
              Espérance normalisée du résultat Elo & Rivalités (Normalized Elo Expectation & Rivalries)
            </h4>
            <p className="leading-relaxed text-slate-500 dark:text-slate-400">
              Dans l&apos;échelle des résultats observés en football selon le modèle Elo, une défaite vaut <strong>0</strong>, un match nul <strong>0,5</strong> et une victoire <strong>1</strong>. L&apos;<strong>espérance normalisée du résultat Elo (Normalized Elo Outcome Expectation)</strong> est une valeur théorique continue (de 0 à 1) représentant le score moyen attendu, et non une probabilité de victoire ou de match nul 1X2. Les <strong>rivalités documentées</strong> reflètent les paires répertoriées dans le registre documentaire partiel ; l&apos;absence de ce registre ne certifie jamais l&apos;absence de rivalité.
            </p>
          </div>
        </div>
      )}

      {/* 1. Forces en présence & Comparatif Elo */}
      <Card title="Forces en présence d'avant-match & Contexte Elo du championnat (Pre-match Elo)" titleIcon={<Shield size={16} />}>
        <div className="flex flex-col gap-5">
          {/* Barre récapitulative : Écart Elo & Moyenne active */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                Écart de rating Elo (Domicile − Extérieur)
              </span>
              <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {formatSignedEloDelta(ts.diff_home_minus_away)}
                <span className="text-xs font-normal text-slate-400 ml-1">Elo</span>
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Différence brute de rating d&apos;avant-match (hors avantage du terrain)
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                Moyenne Elo active du championnat
              </span>
              <span className="font-mono text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {activeLeagueAvgDisplay}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                {isFullLeagueCoverage
                  ? `Établie sur l'ensemble des ${association.expectedParticipants} clubs actifs de ${association.leagueName}`
                  : 'Moyenne masquée tant que tous les clubs de la saison ne sont pas établis'}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                Comparatif des rangs Elo en championnat
              </span>
              <div className="flex items-center gap-3 font-mono text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200">
                <span className="text-blue-600 dark:text-blue-400">
                  {isFullLeagueCoverage && Number.isInteger(ts.home.rank_in_league) ? `#${ts.home.rank_in_league}` : '—'}
                </span>
                <span className="text-xs text-slate-400">vs</span>
                <span className="text-rose-600 dark:text-rose-400">
                  {isFullLeagueCoverage && Number.isInteger(ts.away.rank_in_league) ? `#${ts.away.rank_in_league}` : '—'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Classement par rating Elo d&apos;avant-match (distinct du tableau des points)
              </span>
            </div>
          </div>

          {/* Cartes côte-à-côte Domicile et Extérieur */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {renderTeamStrengthPanel(
              'Club à domicile',
              target.home_team,
              ts.home,
              homeSeasonEntry,
              'text-blue-600 dark:text-blue-400',
              'bg-blue-500',
              homeRankDisplay
            )}
            {renderTeamStrengthPanel(
              'Club à l\'extérieur',
              target.away_team,
              ts.away,
              awaySeasonEntry,
              'text-rose-600 dark:text-rose-400',
              'bg-rose-500',
              awayRankDisplay
            )}
          </div>

          {/* Vue avancée : Espérance normalisée du résultat Elo */}
          <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Scale size={15} className="text-indigo-500" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-200">
                  Espérance normalisée du résultat Elo (Normalized Elo Outcome Expectation)
                </h4>
              </div>
              <Badge variant="default" className="font-mono text-[9px]">
                Métrique avancée · Valeur théorique continue [0, 1]
              </Badge>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Dans l&apos;échelle des résultats observés en football selon le modèle Elo, une défaite vaut <strong>0</strong>, un match nul <strong>0,5</strong> et une victoire <strong>1</strong>. L&apos;espérance normalisée du résultat est une <strong>valeur théorique continue</strong> comprise entre 0 et 1 (score moyen espéré par rencontre) déduite des ratings Elo d&apos;avant-match et de l&apos;avantage théorique du terrain standard. Elle ne représente <strong>en aucun cas</strong> une probabilité de victoire ou de match nul 1X2, des buts attendus (xG) ou un edge de valeur.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                    {target.home_team} (Domicile)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Espérance Elo normalisée (0–1)
                  </span>
                </div>
                <span className="font-mono text-xl font-bold text-slate-900 dark:text-white">
                  {formatNormalizedExpectation(ts.expected_score_home)}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                    {target.away_team} (Extérieur)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Espérance Elo normalisée (0–1)
                  </span>
                </div>
                <span className="font-mono text-xl font-bold text-slate-900 dark:text-white">
                  {formatNormalizedExpectation(ts.expected_score_away)}
                </span>
              </div>
            </div>

            {Number.isFinite(ts.expected_score_home) && Number.isFinite(ts.expected_score_away) && (
              <div className="mt-3">
                <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                  <div
                    className="bg-blue-500 h-full transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, ts.expected_score_home * 100)).toFixed(2)}%` }}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, ts.expected_score_away * 100)).toFixed(2)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                  <span>0,00 (Défaite = 0)</span>
                  <span>0,50 (Nul = 0,5)</span>
                  <span>1,00 (Victoire = 1)</span>
                </div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 text-center font-sans">
                  Échelle des résultats observés : Défaite = 0 · Nul = 0,5 · Victoire = 1. L&apos;espérance est une valeur théorique continue (score moyen attendu) et non une probabilité de résultat.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 2. Qualité des adversaires · Difficulté du calendrier récent (Opponent Quality L5) */}
      <Card title="Qualité des adversaires · Difficulté du calendrier récent (Opponent Quality L5)" titleIcon={<TrendingUp size={16} />}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ratings Elo d&apos;avant-match jusqu&apos;aux 5 derniers adversaires observés en championnat précédant cette rencontre. Mesure la difficulté du calendrier passé — <strong>ne reflète pas</strong> la forme, les résultats V/N/D ou les xG de l&apos;équipe.
            </p>
            <span className="text-[10px] font-mono text-slate-400 shrink-0">
              Écart positif = adversaires récents mieux classés
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {renderOpponentQualityPanel(
              'Club à domicile · Adversaires récents',
              target.home_team,
              oq.home,
              homeOqFlags,
              'text-blue-600 dark:text-blue-400'
            )}
            {renderOpponentQualityPanel(
              'Club à l\'extérieur · Adversaires récents',
              target.away_team,
              oq.away,
              awayOqFlags,
              'text-rose-600 dark:text-rose-400'
            )}
          </div>
        </div>
      </Card>

      {/* 3. Contexte des derbys et rivalités */}
      <Card title="Contexte des derbys et rivalités (Derby & Rivalry Context)" titleIcon={<Award size={16} />}>
        {rivalryInfo.isDocumentedRivalry ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warning" className="text-[10px] font-mono px-2.5 py-0.5">
                  {rivalryInfo.badgeLabel}
                </Badge>
                <Badge variant="default" className="text-[10px] font-mono px-2.5 py-0.5">
                  {rivalryInfo.categoryLabel}
                </Badge>
              </div>
              {rivalryInfo.establishedSince !== null && (
                <span className="text-xs font-mono font-semibold text-amber-700 dark:text-amber-300">
                  Documenté depuis {rivalryInfo.establishedSince}
                </span>
              )}
            </div>

            <div>
              <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {rivalryInfo.rivalryName}
              </h4>
              {rivalryInfo.geographicScope && (
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                  Périmètre géographique / historique : <span className="font-mono">{rivalryInfo.geographicScope}</span>
                </p>
              )}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {rivalryInfo.explanation}
            </p>
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start gap-3">
            <Info size={16} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                {rivalryInfo.statusTitle}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {rivalryInfo.explanation}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* 4. Évolution historique des ratings Elo */}
      <Card title="Évolution historique des ratings Elo (Historical Elo Development)" titleIcon={<History size={16} />}>
        <div className="flex flex-col gap-4" data-no-swipe="true">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-slate-800/70">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reconstitution des <strong>ratings Elo d&apos;avant-match</strong> enregistrés sur les {dataset.historicalMatches.length.toLocaleString('fr-FR')} matchs rejoués de {association.leagueName} précédant cette journée. Aucun rating post-match ni interpolation quotidienne n&apos;est inventé.
            </p>

            {/* Sélecteur de saison */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setChartSeason('ALL');
                  setPinnedChartPoint(null);
                  setHoveredChartPoint(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-colors ${
                  chartSeason === 'ALL'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Toutes saisons ({dataset.historicalSeasons.length})
              </button>
              {dataset.historicalSeasons.map(sec => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => {
                    setChartSeason(sec);
                    setPinnedChartPoint(null);
                    setHoveredChartPoint(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors ${
                    chartSeason === sec
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>

          {/* Contrôles de filtre par club pour le graphique */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setChartTeamMode('BOTH');
                  setPinnedChartPoint(null);
                  setHoveredChartPoint(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  chartTeamMode === 'BOTH'
                    ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/40'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                Les deux clubs du match
              </button>
              <button
                type="button"
                onClick={() => {
                  setChartTeamMode('HOME');
                  setPinnedChartPoint(null);
                  setHoveredChartPoint(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  chartTeamMode === 'HOME'
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                {target.home_team}
              </button>
              <button
                type="button"
                onClick={() => {
                  setChartTeamMode('AWAY');
                  setPinnedChartPoint(null);
                  setHoveredChartPoint(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  chartTeamMode === 'AWAY'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                {target.away_team}
              </button>

              <select
                aria-label="Sélectionner un club de ce championnat pour le graphique d'évolution Elo"
                value={chartTeamMode === 'CUSTOM' ? chartCustomTeam : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setChartTeamMode('CUSTOM');
                    setChartCustomTeam(val);
                    setPinnedChartPoint(null);
                    setHoveredChartPoint(null);
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Consulter un autre club de {association.leagueName}...</option>
                {dataset.historicalTeams.map(club => (
                  <option key={club} value={club}>
                    {club}
                  </option>
                ))}
              </select>
            </div>

            {/* Légende */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              {primaryChartTeam && (
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  {primaryChartTeam} ({primarySeries.length} obs.)
                </span>
              )}
              {secondaryChartTeam && (
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  {secondaryChartTeam} ({secondarySeries.length} obs.)
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Rivalité documentée
              </span>
            </div>
          </div>

          {/* Graphique SVG des trajectoires */}
          <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4">
            <HistoricalEloChart
              primaryTeam={primaryChartTeam}
              secondaryTeam={secondaryChartTeam}
              primarySeries={primarySeries}
              secondarySeries={secondarySeries}
              activeLeagueMean={isFullLeagueCoverage ? target.active_league_mean : null}
              pinnedPointKey={pinnedChartPoint?.key || null}
              inspectedPointKey={inspectedPoint?.key || null}
              onSelectPoint={handleSelectPoint}
              onHoverPoint={handleHoverPoint}
              onMouseLeaveChart={handleMouseLeaveChart}
            />
          </div>

          {/* Boîte de détails du point inspecté */}
          {inspectedPoint && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {inspectedPoint.date}
                  </span>
                  <Badge variant="default" className="font-mono text-[9px]">
                    Saison {inspectedPoint.seasonKey}
                  </Badge>
                  <Badge variant="default" className="font-mono text-[9px]">
                    {inspectedPoint.venueLabel}
                  </Badge>
                  {inspectedPoint.rivalry?.isDocumentedRivalry && (
                    <Badge variant="warning" className="font-mono text-[9px]">
                      {inspectedPoint.rivalry.rivalryName} ({inspectedPoint.rivalry.categoryLabel})
                    </Badge>
                  )}
                  {inspectedPoint.isNewEntrant && (
                    <Badge variant="warning" className="font-mono text-[9px]">
                      Première apparition dans ce jeu de données
                    </Badge>
                  )}
                  {inspectedPoint.isReturningAfterAbsence && (
                    <Badge variant="info" className="font-mono text-[9px]">
                      Retour après absence dans l&apos;historique observé
                    </Badge>
                  )}
                  {pinnedChartPoint?.key === inspectedPoint.key && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      Observation épinglée
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPinnedChartPoint(null);
                        }}
                        className="ml-1 hover:text-red-600 dark:hover:text-red-400 font-bold"
                        title="Désépingler l'observation"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>

                <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold mt-0.5">
                  <span>{inspectedPoint.teamName}</span>
                  <span className="text-slate-400 mx-1.5">vs</span>
                  <span>{inspectedPoint.opponentName}</span>
                  <span className="ml-2 font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Score historique : {inspectedPoint.scoreDisplay}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 font-mono text-xs shrink-0">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Rating Elo d&apos;avant-match</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {formatEloRating(inspectedPoint.ratingPreMatch)} Elo
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Rating Elo adverse avant-match</span>
                  <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                    {formatEloRating(inspectedPoint.opponentRatingPreMatch)} Elo
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Rang Elo en championnat</span>
                  <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                    {inspectedPoint.rankInLeague !== null ? `#${inspectedPoint.rankInLeague}` : 'Couverture partielle'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 5. Explorateur des confrontations historiques */}
      <Card title="Explorateur des confrontations historiques (Historical Match Explorer)" titleIcon={<SlidersHorizontal size={16} />}>
        <div className="flex flex-col gap-4" data-no-swipe="true">
          {/* Barre de filtres de l'explorateur */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setExplorerTeamMode('BOTH_MATCH_TEAMS');
                  setVisibleRowsCount(INITIAL_EXPLORER_LIMIT);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  explorerTeamMode === 'BOTH_MATCH_TEAMS'
                    ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/40'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                Les deux clubs du match
              </button>
              <button
                type="button"
                onClick={() => {
                  setExplorerTeamMode('H2H');
                  setVisibleRowsCount(INITIAL_EXPLORER_LIMIT);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  explorerTeamMode === 'H2H'
                    ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/40'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                Face-à-face direct (H2H)
              </button>
              <button
                type="button"
                onClick={() => {
                  setExplorerTeamMode('HOME_TEAM');
                  setVisibleRowsCount(INITIAL_EXPLORER_LIMIT);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  explorerTeamMode === 'HOME_TEAM'
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                {target.home_team}
              </button>
              <button
                type="button"
                onClick={() => {
                  setExplorerTeamMode('AWAY_TEAM');
                  setVisibleRowsCount(INITIAL_EXPLORER_LIMIT);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  explorerTeamMode === 'AWAY_TEAM'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                {target.away_team}
              </button>
              <button
                type="button"
                onClick={() => {
                  setExplorerTeamMode('ALL_LEAGUE');
                  setVisibleRowsCount(INITIAL_EXPLORER_LIMIT);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  explorerTeamMode === 'ALL_LEAGUE'
                    ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/40'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                Tous les matchs de {association.leagueName}
              </button>

              <select
                aria-label="Filtrer l'explorateur historique par club"
                value={explorerTeamMode === 'CUSTOM_TEAM' ? explorerCustomTeam : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setExplorerTeamMode('CUSTOM_TEAM');
                    setExplorerCustomTeam(val);
                    setVisibleRowsCount(INITIAL_EXPLORER_LIMIT);
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
              >
                <option value="">Filtrer par club ({dataset.historicalTeams.length})...</option>
                {dataset.historicalTeams.map(club => (
                  <option key={club} value={club}>
                    {club}
                  </option>
                ))}
              </select>
            </div>

            {/* Contrôles Saison, Rivalité et Tri */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filtrer l'explorateur historique par saison"
                value={explorerSeason}
                onChange={(e) => {
                  setExplorerSeason(e.target.value);
                  setVisibleRowsCount(INITIAL_EXPLORER_LIMIT);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
              >
                <option value="ALL">Toutes saisons ({dataset.historicalSeasons.join(', ')})</option>
                {dataset.historicalSeasons.map(sec => (
                  <option key={sec} value={sec}>
                    Saison {sec}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setOnlyRivalries(prev => !prev);
                  setVisibleRowsCount(INITIAL_EXPLORER_LIMIT);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  onlyRivalries
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                Rivalités documentées uniquement
              </button>

              <button
                type="button"
                onClick={() => setSortOrder(prev => (prev === 'DESC' ? 'ASC' : 'DESC'))}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {sortOrder === 'DESC' ? 'Plus récents d\'abord ↓' : 'Plus anciens d\'abord ↑'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>
              Affichage de {displayedExplorerRows.length} sur {filteredHistoryRows.length} matchs historiques enregistrés
            </span>
            <span>Tous les ratings Elo affichés sont strictement d&apos;avant-match</span>
          </div>

          {/* Tableau des confrontations historiques */}
          {displayedExplorerRows.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              Aucun match historique ne correspond aux critères de filtre sélectionnés.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-100/70 dark:bg-slate-900/70">
                    <th className="py-2.5 px-3">Date / Saison</th>
                    <th className="py-2.5 px-3">Club à domicile (Elo avant-match)</th>
                    <th className="py-2.5 px-3 text-center">Score</th>
                    <th className="py-2.5 px-3">Club à l&apos;extérieur (Elo avant-match)</th>
                    <th className="py-2.5 px-3 text-right">Écart Elo</th>
                    <th className="py-2.5 px-3 text-right">Moyenne ligue</th>
                    <th className="py-2.5 px-3">Contexte & Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {displayedExplorerRows.map((row, idx) => {
                    const isTargetHomeInvolved = row.homeTeam === target.home_team || row.awayTeam === target.home_team;
                    const isTargetAwayInvolved = row.homeTeam === target.away_team || row.awayTeam === target.away_team;
                    return (
                      <tr
                        key={`${row.date}-${row.homeTeam}-${row.awayTeam}-${idx}`}
                        className="hover:bg-white dark:hover:bg-slate-900/80 transition-colors"
                      >
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-700 dark:text-slate-300">{row.date}</div>
                          <div className="text-[10px] text-slate-400">{row.seasonKey}</div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className={`font-sans font-bold ${row.homeTeam === target.home_team ? 'text-blue-600 dark:text-blue-400' : row.homeTeam === target.away_team ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {row.homeTeam}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {formatEloRating(row.homeRatingPreMatch)} Elo
                            {row.homeRank !== null ? ` · #${row.homeRank}` : ''}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                            {row.scoreDisplay}
                          </span>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className={`font-sans font-bold ${row.awayTeam === target.away_team ? 'text-rose-600 dark:text-rose-400' : row.awayTeam === target.home_team ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {row.awayTeam}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {formatEloRating(row.awayRatingPreMatch)} Elo
                            {row.awayRank !== null ? ` · #${row.awayRank}` : ''}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-semibold text-slate-700 dark:text-slate-300">
                          {formatSignedEloDelta(row.diffHomeMinusAway)}
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap text-slate-500 dark:text-slate-400">
                          {row.activeLeagueMean !== null ? formatEloRating(row.activeLeagueMean) : 'Partielle'}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap items-center gap-1">
                            {row.rivalry.isDocumentedRivalry && (
                              <Badge variant="warning" className="text-[8px] px-1.5 py-0">
                                {row.rivalry.rivalryName} ({row.rivalry.categoryLabel})
                              </Badge>
                            )}
                            {(row.homeNewEntrant || row.awayNewEntrant) && (
                              <Badge variant="default" className="text-[8px] px-1.5 py-0">
                                Première apparition dans ce jeu de données
                              </Badge>
                            )}
                            {(row.homeReturning || row.awayReturning) && (
                              <Badge variant="info" className="text-[8px] px-1.5 py-0">
                                Retour après absence dans l&apos;historique observé
                              </Badge>
                            )}
                            {!row.rivalry.isDocumentedRivalry &&
                              !row.homeNewEntrant &&
                              !row.awayNewEntrant &&
                              !row.homeReturning &&
                              !row.awayReturning && (
                                <span className="text-[10px] text-slate-400">
                                  {isTargetHomeInvolved && isTargetAwayInvolved ? 'Face-à-face direct' : 'Match régulier de championnat'}
                                </span>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {visibleRowsCount < filteredHistoryRows.length && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setVisibleRowsCount(prev => prev + 25)}
                className="px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Afficher plus de matchs historiques ({filteredHistoryRows.length - visibleRowsCount} restants)
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
