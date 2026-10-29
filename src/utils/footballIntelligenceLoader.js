/**
 * TITANIUM Football Intelligence Loader & Semantic Adapter (WEB-FI-001)
 *
 * Loads, validates, caches, and indexes Football Intelligence descriptive artifacts
 * (profiles FE-002, FE-003, FE-009) strictly on demand without modifying source data
 * or computing probabilities, betting edges, or risk decisions.
 */

import { isValidDateComponents } from './titaniumLoader.js';

/**
 * Canonical registry of leagues covered by the Football Intelligence semantic contract v1.0.0.
 * Never match by substring to avoid cross-league collisions (e.g., Serie A vs Brazilian Serie A / Serie B).
 */
export const FI_LEAGUE_REGISTRY = Object.freeze([
  {
    leagueId: 47,
    canonicalName: 'Premier League',
    webLeagueKeys: ['PL', 'PREMIERLEAGUE', 'ENGPR'],
    expectedParticipants: 20,
    allowedProfiles: ['FE-002', 'FE-003'],
    allowedScopes: {
      'FE-002': 'pilot_premier_league_intra',
      'FE-003': 'operational_premier_league'
    },
    allowedFileBasenames: [
      'football_intelligence_pl.json',
      'football_intelligence_premier_league.json'
    ]
  },
  {
    leagueId: 87,
    canonicalName: 'La Liga',
    webLeagueKeys: ['LALIGA', 'ESPLL'],
    expectedParticipants: 20,
    allowedProfiles: ['FE-009'],
    allowedScopes: {
      'FE-009': 'laliga_descriptive_pilot'
    },
    allowedFileBasenames: [
      'football_intelligence_laliga.json',
      'football_intelligence_la_liga.json'
    ]
  },
  {
    leagueId: 55,
    canonicalName: 'Serie A',
    webLeagueKeys: ['SERIEA', 'ITASA'],
    expectedParticipants: 20,
    allowedProfiles: ['FE-009'],
    allowedScopes: {
      'FE-009': 'serie_a_descriptive_pilot'
    },
    allowedFileBasenames: [
      'football_intelligence_serie_a.json'
    ]
  },
  {
    leagueId: 54,
    canonicalName: 'Bundesliga',
    webLeagueKeys: ['BUNDESLIGA', 'GERBL'],
    expectedParticipants: 18,
    allowedProfiles: ['FE-009'],
    allowedScopes: {
      'FE-009': 'bundesliga_descriptive_pilot'
    },
    allowedFileBasenames: [
      'football_intelligence_bundesliga.json'
    ]
  },
  {
    leagueId: 53,
    canonicalName: 'Ligue 1',
    webLeagueKeys: ['LIGUE1', 'FRAL1'],
    expectedParticipants: 18,
    allowedProfiles: ['FE-009'],
    allowedScopes: {
      'FE-009': 'ligue_1_descriptive_pilot'
    },
    allowedFileBasenames: [
      'football_intelligence_ligue_1.json',
      'football_intelligence_ligue1.json'
    ]
  },
  {
    leagueId: 61,
    canonicalName: 'Liga Portugal',
    webLeagueKeys: ['LIGAPORTUGAL', 'PRIMEIRALIGA', 'PORLP'],
    expectedParticipants: 18,
    allowedProfiles: ['FE-009'],
    allowedScopes: {
      'FE-009': 'liga_portugal_descriptive_pilot'
    },
    allowedFileBasenames: [
      'football_intelligence_liga_portugal.json'
    ]
  },
  {
    leagueId: 57,
    canonicalName: 'Eredivisie',
    webLeagueKeys: ['EREDIVISIE', 'NEDED'],
    expectedParticipants: 18,
    allowedProfiles: ['FE-009'],
    allowedScopes: {
      'FE-009': 'eredivisie_descriptive_pilot'
    },
    allowedFileBasenames: [
      'football_intelligence_eredivisie.json'
    ]
  }
]);

// Session-level in-memory cache keyed by artifact URL
const artifactCache = new Map();

export function clearFootballIntelligenceCache() {
  artifactCache.clear();
}

export function getFootballIntelligenceCacheSize() {
  return artifactCache.size;
}

export function normalizeWebLeagueKey(leagueName) {
  if (!leagueName || typeof leagueName !== 'string') return '';
  return leagueName.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Resolves the explicit Football Intelligence league configuration by league_id or Web league key.
 */
export function resolveFiLeagueConfig(leagueInput) {
  if (Number.isInteger(leagueInput)) {
    return FI_LEAGUE_REGISTRY.find(l => l.leagueId === leagueInput) || null;
  }
  if (typeof leagueInput === 'string' && leagueInput.trim()) {
    const cleanKey = normalizeWebLeagueKey(leagueInput);
    if (!cleanKey) return null;
    return FI_LEAGUE_REGISTRY.find(l => l.webLeagueKeys.includes(cleanKey)) || null;
  }
  return null;
}

/**
 * Validates an ISO calendar date string YYYY-MM-DD.
 */
export function isValidIsoDateString(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  return isValidDateComponents(year, month, day, 0, 0, 0);
}

/**
 * Normalizes a season identifier (e.g. "2026-2027" or "2026/27") into canonical "YYYY-YYYY".
 * Returns null if malformed or non-consecutive.
 */
export function normalizeSeasonKey(seasonInput) {
  if (typeof seasonInput !== 'string') return null;
  const trimmed = seasonInput.trim();
  const fullMatch = trimmed.match(/^(\d{4})-(\d{4})$/);
  if (fullMatch) {
    const y1 = parseInt(fullMatch[1], 10);
    const y2 = parseInt(fullMatch[2], 10);
    return y2 === y1 + 1 ? `${y1}-${y2}` : null;
  }
  const slashMatch = trimmed.match(/^(\d{4})\/(\d{2}|\d{4})$/);
  if (slashMatch) {
    const y1 = parseInt(slashMatch[1], 10);
    const y2Raw = slashMatch[2];
    const y2 = y2Raw.length === 2 ? Math.floor(y1 / 100) * 100 + parseInt(y2Raw, 10) : parseInt(y2Raw, 10);
    return y2 === y1 + 1 ? `${y1}-${y2}` : null;
  }
  return null;
}

function isPlainObject(obj) {
  return Boolean(obj) && typeof obj === 'object' && !Array.isArray(obj);
}

/**
 * Recognizes the exact Football Intelligence output envelope profile (FE-002, FE-003, FE-009)
 * strictly from _metadata_ and root keys without heuristic conversion.
 */
export function recognizeFiEnvelopeProfile(payload) {
  if (!isPlainObject(payload)) {
    return { valid: false, profile: null, reason: 'Payload must be a JSON object' };
  }

  const meta = payload._metadata_;
  if (!isPlainObject(meta)) {
    return { valid: false, profile: null, reason: 'Missing or invalid _metadata_ object' };
  }

  if (!Number.isInteger(meta.league_id)) {
    return { valid: false, profile: null, reason: 'Missing or non-integer _metadata_.league_id' };
  }

  const leagueConfig = resolveFiLeagueConfig(meta.league_id);
  if (!leagueConfig) {
    return {
      valid: false,
      profile: null,
      reason: `Unsupported _metadata_.league_id: ${meta.league_id}`
    };
  }

  if (typeof meta.league_name !== 'string' || !meta.league_name.trim()) {
    return { valid: false, profile: null, reason: 'Missing or invalid _metadata_.league_name' };
  }

  if (meta.decision_effect !== 'NONE') {
    return {
      valid: false,
      profile: null,
      reason: `Invalid _metadata_.decision_effect "${meta.decision_effect}" (expected "NONE")`
    };
  }

  if (typeof meta.temporal_certification !== 'string' || !meta.temporal_certification.trim()) {
    return { valid: false, profile: null, reason: 'Missing _metadata_.temporal_certification' };
  }

  if (!Array.isArray(meta.components_evaluated) || meta.components_evaluated.length === 0) {
    return { valid: false, profile: null, reason: 'Missing or empty _metadata_.components_evaluated' };
  }

  const params = meta.parameters;
  if (
    !isPlainObject(params) ||
    !Number.isFinite(params.k_factor) ||
    !Number.isFinite(params.home_advantage) ||
    !Number.isFinite(params.season_regression_lambda) ||
    !Number.isFinite(params.initial_rating)
  ) {
    return { valid: false, profile: null, reason: 'Missing or invalid _metadata_.parameters' };
  }

  const taskId = meta.task_id;
  if (!leagueConfig.allowedProfiles.includes(taskId)) {
    return {
      valid: false,
      profile: null,
      reason: `Profile task_id "${taskId}" is not authorized for league_id ${meta.league_id} (${leagueConfig.canonicalName})`
    };
  }

  const expectedScope = leagueConfig.allowedScopes[taskId];
  if (meta.scope !== expectedScope) {
    return {
      valid: false,
      profile: null,
      reason: `Profile scope mismatch for ${taskId}: got "${meta.scope}", expected "${expectedScope}"`
    };
  }

  if (taskId === 'FE-002') {
    if (meta.method_version !== '0.2.0') {
      return {
        valid: false,
        profile: null,
        reason: `FE-002 requires method_version "0.2.0", got "${meta.method_version}"`
      };
    }
    if (
      !Array.isArray(payload.matches) ||
      !Array.isArray(payload.current_season_active_standings) ||
      !Array.isArray(payload.all_time_tracked_standings)
    ) {
      return {
        valid: false,
        profile: null,
        reason: 'FE-002 envelope requires matches, current_season_active_standings, and all_time_tracked_standings arrays'
      };
    }
    if (
      payload.historical_matches !== undefined ||
      payload.target_matches !== undefined ||
      payload.target_fixtures !== undefined
    ) {
      return {
        valid: false,
        profile: null,
        reason: 'FE-002 envelope must not mix FE-003 or FE-009 root match arrays'
      };
    }
    return { valid: true, profile: 'FE-002', leagueConfig, reason: null };
  }

  if (taskId === 'FE-003') {
    if (meta.method_version !== '0.3.0') {
      return {
        valid: false,
        profile: null,
        reason: `FE-003 requires method_version "0.3.0", got "${meta.method_version}"`
      };
    }
    if (
      !Array.isArray(payload.target_fixtures) ||
      !Array.isArray(payload.current_season_active_standings) ||
      !Array.isArray(payload.all_time_tracked_standings)
    ) {
      return {
        valid: false,
        profile: null,
        reason: 'FE-003 envelope requires target_fixtures, current_season_active_standings, and all_time_tracked_standings arrays'
      };
    }
    if (
      payload.matches !== undefined ||
      payload.historical_matches !== undefined ||
      payload.target_matches !== undefined
    ) {
      return {
        valid: false,
        profile: null,
        reason: 'FE-003 envelope must not mix FE-002 or FE-009 root match arrays'
      };
    }
    return { valid: true, profile: 'FE-003', leagueConfig, reason: null };
  }

  if (taskId === 'FE-009') {
    if (meta.method_version !== undefined) {
      return {
        valid: false,
        profile: null,
        reason: 'FE-009 autonomous pilot envelope must not emit method_version'
      };
    }
    if (!Array.isArray(payload.historical_matches) || !Array.isArray(payload.target_matches)) {
      return {
        valid: false,
        profile: null,
        reason: 'FE-009 envelope requires historical_matches and target_matches arrays'
      };
    }
    if (
      payload.matches !== undefined ||
      payload.target_fixtures !== undefined ||
      payload.current_season_active_standings !== undefined ||
      payload.all_time_tracked_standings !== undefined
    ) {
      return {
        valid: false,
        profile: null,
        reason: 'FE-009 envelope must not contain PL root standings or matches/target_fixtures arrays'
      };
    }
    return { valid: true, profile: 'FE-009', leagueConfig, reason: null };
  }

  return { valid: false, profile: null, reason: `Unsupported task_id "${taskId}"` };
}

/**
 * Validates a single match record (either historical or target) against the semantic contract.
 */
export function validateFiMatchRecord(record, mode = 'target') {
  if (!isPlainObject(record)) {
    return { valid: false, reason: 'Match entry is not an object' };
  }
  if (typeof record.match_id !== 'string' || !record.match_id.trim()) {
    return { valid: false, reason: 'Missing or invalid match_id' };
  }
  if (!isValidIsoDateString(record.date)) {
    return { valid: false, reason: `Invalid date "${record.date}" on match ${record.match_id}` };
  }
  const normalizedSeason = normalizeSeasonKey(record.season_key);
  if (!normalizedSeason || normalizedSeason !== record.season_key) {
    return { valid: false, reason: `Invalid season_key "${record.season_key}" on match ${record.match_id}` };
  }
  if (typeof record.home_team !== 'string' || !record.home_team.trim() || typeof record.away_team !== 'string' || !record.away_team.trim()) {
    return { valid: false, reason: `Missing home_team or away_team on match ${record.match_id}` };
  }
  if (record.home_team === record.away_team) {
    return { valid: false, reason: `Identical home_team and away_team on match ${record.match_id}` };
  }
  if (record.decision_effect !== 'NONE') {
    return { valid: false, reason: `Invalid decision_effect on match ${record.match_id}` };
  }

  if (mode === 'target') {
    if (record.score_home !== null || record.score_away !== null) {
      return { valid: false, reason: `Target match ${record.match_id} must have null score_home and score_away` };
    }
  } else {
    if (!Number.isInteger(record.score_home) || record.score_home < 0 || !Number.isInteger(record.score_away) || record.score_away < 0) {
      return { valid: false, reason: `Historical match ${record.match_id} must have integer score_home and score_away` };
    }
  }

  const meanStatus = record.active_league_mean_status;
  if (meanStatus !== 'ESTABLISHED_FULL_PARTICIPANTS' && meanStatus !== 'PARTIAL_SEASON_PARTICIPANTS_COVERAGE') {
    return { valid: false, reason: `Invalid active_league_mean_status "${meanStatus}" on match ${record.match_id}` };
  }
  if (meanStatus === 'PARTIAL_SEASON_PARTICIPANTS_COVERAGE' && record.active_league_mean !== null) {
    return { valid: false, reason: `active_league_mean must be null when coverage is partial on match ${record.match_id}` };
  }
  if (meanStatus === 'ESTABLISHED_FULL_PARTICIPANTS' && !Number.isFinite(record.active_league_mean)) {
    return { valid: false, reason: `active_league_mean must be finite when ESTABLISHED_FULL_PARTICIPANTS on match ${record.match_id}` };
  }

  // Validate team_strength
  const ts = record.team_strength;
  if (!isPlainObject(ts)) {
    return { valid: false, reason: `Missing team_strength on match ${record.match_id}` };
  }
  if (!Number.isFinite(ts.diff_home_minus_away)) {
    return { valid: false, reason: `Invalid diff_home_minus_away on match ${record.match_id}` };
  }
  if (
    !Number.isFinite(ts.expected_score_home) ||
    ts.expected_score_home < 0 ||
    ts.expected_score_home > 1 ||
    !Number.isFinite(ts.expected_score_away) ||
    ts.expected_score_away < 0 ||
    ts.expected_score_away > 1
  ) {
    return { valid: false, reason: `Invalid expected_score_home/away on match ${record.match_id}` };
  }

  for (const side of ['home', 'away']) {
    const sObj = ts[side];
    if (!isPlainObject(sObj)) {
      return { valid: false, reason: `Missing team_strength.${side} on match ${record.match_id}` };
    }
    if (!Number.isFinite(sObj.rating_pre_match)) {
      return { valid: false, reason: `Invalid team_strength.${side}.rating_pre_match on match ${record.match_id}` };
    }
    if (sObj.rank_in_league !== null && (!Number.isInteger(sObj.rank_in_league) || sObj.rank_in_league < 1)) {
      return { valid: false, reason: `Invalid team_strength.${side}.rank_in_league on match ${record.match_id}` };
    }
    if (!Number.isInteger(sObj.matches_observed_season) || sObj.matches_observed_season < 0) {
      return { valid: false, reason: `Invalid team_strength.${side}.matches_observed_season on match ${record.match_id}` };
    }
    if (!Number.isInteger(sObj.matches_observed_total) || sObj.matches_observed_total < 0) {
      return { valid: false, reason: `Invalid team_strength.${side}.matches_observed_total on match ${record.match_id}` };
    }
    if (typeof sObj.is_new_entrant !== 'boolean' || typeof sObj.is_returning_after_absence !== 'boolean') {
      return { valid: false, reason: `Invalid entrant/return boolean flags on match ${record.match_id}` };
    }
  }

  // Validate opponent_quality
  const oq = record.opponent_quality;
  if (!isPlainObject(oq)) {
    return { valid: false, reason: `Missing opponent_quality on match ${record.match_id}` };
  }
  for (const side of ['home', 'away']) {
    const qObj = oq[side];
    if (!isPlainObject(qObj)) {
      return { valid: false, reason: `Missing opponent_quality.${side} on match ${record.match_id}` };
    }
    const nObs = qObj.n_opponents_observed;
    const nCtx = qObj.n_contextualized_gaps_observed;
    if (!Number.isInteger(nObs) || nObs < 0 || nObs > 5) {
      return { valid: false, reason: `Invalid opponent_quality.${side}.n_opponents_observed on match ${record.match_id}` };
    }
    if (!Number.isInteger(nCtx) || nCtx < 0 || nCtx > nObs) {
      return { valid: false, reason: `Invalid opponent_quality.${side}.n_contextualized_gaps_observed on match ${record.match_id}` };
    }
    if (!Array.isArray(qObj.flags)) {
      return { valid: false, reason: `Missing opponent_quality.${side}.flags array on match ${record.match_id}` };
    }
    for (const metricKey of [
      'opp_strength_l5_avg',
      'schedule_difficulty_vs_active_mean',
      'schedule_difficulty_vs_nominal_anchor',
      'opp_strength_l5_contextualized_gap_avg'
    ]) {
      const val = qObj[metricKey];
      if (val !== null && !Number.isFinite(val)) {
        return { valid: false, reason: `Invalid opponent_quality.${side}.${metricKey} on match ${record.match_id}` };
      }
      if (nObs === 0 && val !== null) {
        return { valid: false, reason: `${metricKey} must be null when n_opponents_observed is 0 on match ${record.match_id}` };
      }
    }
  }

  // Validate rivalry_intelligence
  const ri = record.rivalry_intelligence;
  if (!isPlainObject(ri)) {
    return { valid: false, reason: `Missing rivalry_intelligence on match ${record.match_id}` };
  }
  if (!['NOT_EVALUATED', 'RECORDED_IN_PILOT_REGISTRY', 'NOT_RECORDED_IN_PILOT_REGISTRY'].includes(ri.status)) {
    return { valid: false, reason: `Invalid rivalry_intelligence.status "${ri.status}" on match ${record.match_id}` };
  }
  if (ri.decision_effect !== 'NONE') {
    return { valid: false, reason: `Invalid rivalry_intelligence.decision_effect on match ${record.match_id}` };
  }

  return { valid: true, reason: null };
}

/**
 * Validates and indexes a full Football Intelligence JSON payload.
 */
export function validateAndIndexFiEnvelope(payload, expectedLeagueInput = null) {
  const profileCheck = recognizeFiEnvelopeProfile(payload);
  if (!profileCheck.valid) {
    return {
      valid: false,
      profile: null,
      reason: profileCheck.reason
    };
  }

  const { profile, leagueConfig } = profileCheck;
  const meta = payload._metadata_;

  if (expectedLeagueInput !== null && expectedLeagueInput !== undefined) {
    const requestedLeague = resolveFiLeagueConfig(expectedLeagueInput);
    if (!requestedLeague || requestedLeague.leagueId !== leagueConfig.leagueId) {
      return {
        valid: false,
        profile,
        reason: `League mismatch: artifact league_id is ${leagueConfig.leagueId} (${leagueConfig.canonicalName}), requested ${expectedLeagueInput}`
      };
    }
  }

  const cutoff = meta.cutoff || meta.target_cutoff || null;
  if (cutoff !== null && !isValidIsoDateString(cutoff)) {
    return {
      valid: false,
      profile,
      reason: `Invalid cutoff date "${cutoff}" in _metadata_`
    };
  }

  const rawHistorical = profile === 'FE-009'
    ? (payload.historical_matches || [])
    : profile === 'FE-002'
      ? (payload.matches || [])
      : [];

  // Deterministic chronological ordering of historical matches with stable tie-breaking
  const sortedHistorical = [...rawHistorical].sort((a, b) => {
    const dateCmp = (a.date || '').localeCompare(b.date || '');
    if (dateCmp !== 0) return dateCmp;
    return (a.match_id || '').localeCompare(b.match_id || '');
  });

  const rawTargets = profile === 'FE-009'
    ? (payload.target_matches || [])
    : profile === 'FE-003'
      ? (payload.target_fixtures || [])
      : [];

  const historicalIds = new Set();
  const seasonsSet = new Set();
  const teamsSet = new Set();
  const teamSeasonEntryState = new Map();

  for (let i = 0; i < sortedHistorical.length; i++) {
    const m = sortedHistorical[i];
    const check = validateFiMatchRecord(m, 'historical');
    if (!check.valid) {
      return { valid: false, profile, reason: check.reason };
    }
    if (historicalIds.has(m.match_id)) {
      return { valid: false, profile, reason: `Duplicate historical match_id "${m.match_id}"` };
    }
    if (cutoff && m.date >= cutoff) {
      return {
        valid: false,
        profile,
        reason: `Historical match ${m.match_id} date (${m.date}) is not strictly before cutoff (${cutoff})`
      };
    }
    historicalIds.add(m.match_id);
    seasonsSet.add(m.season_key);
    teamsSet.add(m.home_team);
    teamsSet.add(m.away_team);

    const homeSeasonKey = `${m.season_key}::${m.home_team}`;
    if (!teamSeasonEntryState.has(homeSeasonKey)) {
      teamSeasonEntryState.set(homeSeasonKey, {
        seasonKey: m.season_key,
        teamName: m.home_team,
        firstMatchId: m.match_id,
        firstMatchDate: m.date,
        isNewEntrant: Boolean(m.team_strength.home.is_new_entrant),
        isReturningAfterAbsence: Boolean(m.team_strength.home.is_returning_after_absence),
        initialRatingPreMatch: m.team_strength.home.rating_pre_match
      });
    }
    const awaySeasonKey = `${m.season_key}::${m.away_team}`;
    if (!teamSeasonEntryState.has(awaySeasonKey)) {
      teamSeasonEntryState.set(awaySeasonKey, {
        seasonKey: m.season_key,
        teamName: m.away_team,
        firstMatchId: m.match_id,
        firstMatchDate: m.date,
        isNewEntrant: Boolean(m.team_strength.away.is_new_entrant),
        isReturningAfterAbsence: Boolean(m.team_strength.away.is_returning_after_absence),
        initialRatingPreMatch: m.team_strength.away.rating_pre_match
      });
    }
  }

  const targetByKey = new Map();
  const targetSeasons = new Set();

  for (let i = 0; i < rawTargets.length; i++) {
    const t = rawTargets[i];
    const check = validateFiMatchRecord(t, 'target');
    if (!check.valid) {
      return { valid: false, profile, reason: check.reason };
    }
    const compositeKey = `${leagueConfig.leagueId}::${t.match_id}`;
    if (targetByKey.has(compositeKey)) {
      return { valid: false, profile, reason: `Duplicate target match_id "${t.match_id}" in league ${leagueConfig.leagueId}` };
    }
    if (cutoff && t.date < cutoff) {
      return {
        valid: false,
        profile,
        reason: `Target match ${t.match_id} date (${t.date}) precedes cutoff (${cutoff})`
      };
    }
    targetByKey.set(compositeKey, t);
    targetSeasons.add(t.season_key);
  }

  if (targetSeasons.size > 1) {
    return {
      valid: false,
      profile,
      reason: `Target batch spans multiple seasons (${Array.from(targetSeasons).join(', ')})`
    };
  }

  const targetSeasonKey = targetSeasons.size === 1 ? Array.from(targetSeasons)[0] : null;

  return {
    valid: true,
    profile,
    leagueId: leagueConfig.leagueId,
    leagueName: meta.league_name,
    canonicalLeagueName: leagueConfig.canonicalName,
    expectedParticipants: leagueConfig.expectedParticipants,
    cutoff,
    rivalryStatus: meta.rivalry_status || (meta.rivalry_registry_summary ? 'PARTIAL_REGISTRY_EVALUATED' : 'NOT_EVALUATED'),
    targetSeasonKey,
    historicalMatches: sortedHistorical,
    targetMatches: rawTargets,
    targetByKey,
    historicalSeasons: Array.from(seasonsSet).sort((a, b) => a.localeCompare(b)),
    historicalTeams: Array.from(teamsSet).sort((a, b) => a.localeCompare(b)),
    teamSeasonEntryState,
    reason: null
  };
}

/**
 * Strictly associates a Web prediction match object with a validated Football Intelligence target match.
 * Enforces exact league identity, exact match_id lookup (no fuzzy matching), date equality, and season consistency.
 */
export function associatePredictionWithFiTarget(webMatch, validatedFi) {
  if (!webMatch || ! isPlainObject(webMatch)) {
    return { matched: false, status: 'INVALID_MATCH', reason: 'Missing Web match object' };
  }
  if (!validatedFi || !validatedFi.valid) {
    return {
      matched: false,
      status: 'INVALID_FI_ENVELOPE',
      reason: validatedFi?.reason || 'Football Intelligence dataset is unavailable or invalid'
    };
  }

  const webLeague = webMatch.League || webMatch.league || '';
  const leagueConfig = resolveFiLeagueConfig(webLeague);
  if (!leagueConfig) {
    return {
      matched: false,
      status: 'LEAGUE_UNSUPPORTED',
      reason: `Football Intelligence is not available for league "${webLeague || 'Unknown'}"`
    };
  }

  if (leagueConfig.leagueId !== validatedFi.leagueId) {
    return {
      matched: false,
      status: 'LEAGUE_MISMATCH',
      reason: `Web match league "${webLeague}" (id=${leagueConfig.leagueId}) does not match artifact league_id ${validatedFi.leagueId}`
    };
  }

  const webMatchId = typeof webMatch.Match_ID === 'string' ? webMatch.Match_ID.trim() : '';
  if (!webMatchId) {
    return {
      matched: false,
      status: 'MISSING_MATCH_ID',
      reason: 'Web prediction match is missing a canonical Match_ID'
    };
  }

  const compositeKey = `${validatedFi.leagueId}::${webMatchId}`;
  const target = validatedFi.targetByKey.get(compositeKey) || null;
  if (!target) {
    return {
      matched: false,
      status: 'TARGET_NOT_FOUND',
      reason: `No target fixture matching Match_ID "${webMatchId}" in ${validatedFi.canonicalLeagueName}`
    };
  }

  // Validate exact date equality
  const webDate = webMatch.Match_Date || webMatch.date || '';
  if (!webDate || webDate !== target.date) {
    return {
      matched: false,
      status: 'DATE_MISMATCH',
      reason: `Date mismatch for ${webMatchId}: Web prediction date "${webDate}" vs FI target date "${target.date}"`
    };
  }

  // Validate season consistency
  const normalizedTargetSeason = normalizeSeasonKey(target.season_key);
  if (!normalizedTargetSeason) {
    return {
      matched: false,
      status: 'SEASON_MISMATCH',
      reason: `Invalid target season_key "${target.season_key}"`
    };
  }

  const [startYearStr, endYearStr] = normalizedTargetSeason.split('-');
  const matchYear = parseInt(target.date.slice(0, 4), 10);
  if (matchYear !== parseInt(startYearStr, 10) && matchYear !== parseInt(endYearStr, 10)) {
    return {
      matched: false,
      status: 'SEASON_MISMATCH',
      reason: `Target date "${target.date}" falls outside target season "${target.season_key}"`
    };
  }

  const explicitWebSeason = webMatch.season_key || webMatch.season || null;
  if (explicitWebSeason) {
    const normalizedWebSeason = normalizeSeasonKey(String(explicitWebSeason));
    if (!normalizedWebSeason || normalizedWebSeason !== normalizedTargetSeason) {
      return {
        matched: false,
        status: 'SEASON_MISMATCH',
        reason: `Web match season "${explicitWebSeason}" does not match FI target season "${target.season_key}"`
      };
    }
  }

  const homeSeasonEntry = validatedFi.teamSeasonEntryState.get(`${target.season_key}::${target.home_team}`) || null;
  const awaySeasonEntry = validatedFi.teamSeasonEntryState.get(`${target.season_key}::${target.away_team}`) || null;

  return {
    matched: true,
    status: 'MATCHED',
    reason: null,
    target,
    leagueId: validatedFi.leagueId,
    leagueName: validatedFi.leagueName,
    canonicalLeagueName: validatedFi.canonicalLeagueName,
    expectedParticipants: validatedFi.expectedParticipants,
    cutoff: validatedFi.cutoff,
    profile: validatedFi.profile,
    homeSeasonEntry,
    awaySeasonEntry
  };
}

/**
 * Resolves the authorized Football Intelligence artifact URL for a given league from the manifest.
 */
export async function resolveFiArtifactUrl(leagueInput, options = {}) {
  const leagueConfig = resolveFiLeagueConfig(leagueInput);
  if (!leagueConfig) return null;

  let manifest = options.manifestOverride || null;
  if (!manifest) {
    try {
      const virtualMod = await import('virtual:titanium-manifest');
      manifest = virtualMod.default;
    } catch (e) {
      manifest = {
        footballIntelligence: [
          '/data/titanium_v2/football_intelligence/multileague/football_intelligence_serie_a.json'
        ]
      };
    }
  }

  const fiFiles = Array.isArray(manifest?.footballIntelligence) ? manifest.footballIntelligence : [];
  const matchingPaths = fiFiles.filter(filePath => {
    if (typeof filePath !== 'string') return false;
    const parts = filePath.split('/');
    const base = parts[parts.length - 1];
    return leagueConfig.allowedFileBasenames.includes(base);
  });

  if (matchingPaths.length !== 1) {
    return null;
  }

  return matchingPaths[0];
}

/**
 * Loads, validates, and caches the Football Intelligence dataset for a league on demand.
 */
export async function loadLeagueFootballIntelligence(leagueInput, options = {}) {
  const leagueConfig = resolveFiLeagueConfig(leagueInput);
  if (!leagueConfig) {
    return {
      available: false,
      status: 'LEAGUE_UNSUPPORTED',
      reason: 'Football Intelligence is not configured for this competition.',
      data: null
    };
  }

  const artifactUrl = await resolveFiArtifactUrl(leagueConfig.leagueId, options);
  if (!artifactUrl) {
    return {
      available: false,
      status: 'ARTIFACT_NOT_AVAILABLE',
      reason: `No Football Intelligence dataset is currently published for ${leagueConfig.canonicalName}.`,
      data: null
    };
  }

  if (!options.bypassCache && artifactCache.has(artifactUrl)) {
    return artifactCache.get(artifactUrl);
  }

  const fetchFn = options.fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetchFn) {
    return {
      available: false,
      status: 'FETCH_UNAVAILABLE',
      reason: 'Network fetch interface is unavailable.',
      data: null
    };
  }

  const loadPromise = (async () => {
    try {
      const res = await fetchFn(artifactUrl);
      if (!res.ok) {
        return {
          available: false,
          status: 'HTTP_ERROR',
          reason: `Football Intelligence dataset could not be loaded (HTTP ${res.status}).`,
          data: null
        };
      }

      const contentType = res.headers?.get ? (res.headers.get('content-type') || '') : '';
      if (contentType && contentType.includes('text/html')) {
        return {
          available: false,
          status: 'INVALID_CONTENT_TYPE',
          reason: 'Unexpected HTML response when requesting Football Intelligence dataset.',
          data: null
        };
      }

      let rawJson;
      try {
        rawJson = await res.json();
      } catch (parseErr) {
        return {
          available: false,
          status: 'JSON_PARSE_ERROR',
          reason: 'Football Intelligence dataset could not be parsed as valid JSON.',
          data: null
        };
      }

      const validated = validateAndIndexFiEnvelope(rawJson, leagueConfig.leagueId);
      if (!validated.valid) {
        return {
          available: false,
          status: 'ENVELOPE_REJECTED',
          reason: `Football Intelligence dataset failed validation: ${validated.reason}`,
          data: null
        };
      }

      return {
        available: true,
        status: 'READY',
        reason: null,
        data: validated
      };
    } catch (err) {
      return {
        available: false,
        status: 'NETWORK_ERROR',
        reason: `Network error while loading Football Intelligence dataset: ${err.message}`,
        data: null
      };
    }
  })();

  if (!options.bypassCache) {
    artifactCache.set(artifactUrl, loadPromise);
  }

  const result = await loadPromise;
  if (!result.available && !options.bypassCache) {
    // Do not permanently poison cache on transient network errors, but keep deterministic rejections cached if desired
    if (result.status === 'NETWORK_ERROR') {
      artifactCache.delete(artifactUrl);
    }
  }
  return result;
}

/**
 * High-level helper for MatchDashboard: loads league FI on demand and associates the current match.
 */
export async function loadFootballIntelligenceForMatch(webMatch, options = {}) {
  if (!webMatch) {
    return {
      available: false,
      matched: false,
      status: 'NO_MATCH',
      reason: 'No match selected.',
      association: null,
      dataset: null
    };
  }

  const leagueResult = await loadLeagueFootballIntelligence(webMatch.League || webMatch.league, options);
  if (!leagueResult.available || !leagueResult.data) {
    return {
      available: false,
      matched: false,
      status: leagueResult.status,
      reason: leagueResult.reason,
      association: null,
      dataset: null
    };
  }

  const association = associatePredictionWithFiTarget(webMatch, leagueResult.data);
  if (!association.matched) {
    return {
      available: true,
      matched: false,
      status: association.status,
      reason: association.reason,
      association: null,
      dataset: leagueResult.data
    };
  }

  return {
    available: true,
    matched: true,
    status: 'MATCHED',
    reason: null,
    association,
    dataset: leagueResult.data
  };
}

/**
 * Formats a pre-match Elo rating or league average (2 decimal places, never substituting 1500 for null).
 */
export function formatEloRating(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Indisponible';
  }
  return value.toFixed(2);
}

/**
 * Formats a signed Elo rating difference or schedule gap (2 decimal places with explicit sign).
 */
export function formatSignedEloDelta(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Indisponible';
  }
  if (value > 0) return `+${value.toFixed(2)}`;
  if (value < 0) return value.toFixed(2);
  return '0.00';
}

/**
 * Formats a normalized Elo outcome expectation on the [0, 1] scale (6 decimal places, never as a % win probability).
 */
export function formatNormalizedExpectation(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Indisponible';
  }
  return value.toFixed(6);
}

/**
 * Translates internal Opponent Quality coverage flags into user-facing French explanations.
 * Never exposes raw snake_case producer flags.
 */
export function translateOqFlags(flags) {
  if (!Array.isArray(flags) || flags.length === 0) return [];
  const messages = [];
  for (const flag of flags) {
    if (flag === 'INSUFFICIENT_L5_HISTORY') {
      messages.push('Historique enregistré restreint (moins de 5 adversaires de championnat observés)');
    } else if (flag === 'NO_CONTEXTUALIZED_GAP_L5') {
      messages.push('Référence historique indisponible (moyenne active non établie aux dates des rencontres précédentes)');
    } else if (flag === 'PARTIAL_CONTEXTUALIZED_GAP_L5') {
      messages.push('Couverture partielle de la référence historique sur les adversaires récents');
    } else {
      messages.push("Avis de couverture partielle sur l'historique récent des adversaires");
    }
  }
  return messages;
}

/**
 * Maps rivalry_intelligence to canonical semantic states with French presentation
 * without exposing internal registry filenames or IDs.
 */
export function resolveRivalryPresentation(rivalryIntelligence) {
  if (!isPlainObject(rivalryIntelligence)) {
    return {
      state: 'NOT_EVALUATED',
      isDocumentedRivalry: false,
      badgeLabel: null,
      categoryLabel: null,
      rivalryName: null,
      geographicScope: null,
      establishedSince: null,
      statusTitle: 'Rivalités non évaluées',
      explanation: "L'intelligence des rivalités n'a pas été évaluée pour ce jeu de données."
    };
  }

  const { status, is_rivalry, category, rivalry_name, geographic_scope, established_since } = rivalryIntelligence;

  if (status === 'RECORDED_IN_PILOT_REGISTRY' && is_rivalry === true) {
    const categoryLabel = category === 'LOCAL_DERBY'
      ? 'Derby documenté'
      : category === 'HISTORIC_RIVALRY'
        ? 'Rivalité historique'
        : 'Rivalité documentée';

    return {
      state: 'DOCUMENTED',
      isDocumentedRivalry: true,
      badgeLabel: 'Rivalité documentée',
      categoryLabel,
      rivalryName: typeof rivalry_name === 'string' && rivalry_name.trim() ? rivalry_name.trim() : categoryLabel,
      geographicScope: typeof geographic_scope === 'string' && geographic_scope.trim() ? geographic_scope.trim() : null,
      establishedSince: Number.isInteger(established_since) ? established_since : null,
      statusTitle: typeof rivalry_name === 'string' && rivalry_name.trim() ? rivalry_name.trim() : categoryLabel,
      explanation: "Enregistré dans le registre documentaire partiel des rivalités pour ce championnat. Les catégories représentent une classification qualitative et non une échelle d'intensité numérique."
    };
  }

  if (status === 'NOT_RECORDED_IN_PILOT_REGISTRY') {
    return {
      state: 'NOT_RECORDED',
      isDocumentedRivalry: false,
      badgeLabel: null,
      categoryLabel: null,
      rivalryName: null,
      geographicScope: null,
      establishedSince: null,
      statusTitle: 'Paire non répertoriée dans le registre partiel des rivalités',
      explanation: "Cette rencontre n'est pas répertoriée dans le registre documentaire partiel pour ce championnat. L'absence de ce registre partiel ne certifie en aucun cas l'absence de rivalité locale ou historique."
    };
  }

  return {
    state: 'NOT_EVALUATED',
    isDocumentedRivalry: false,
    badgeLabel: null,
    categoryLabel: null,
    rivalryName: null,
    geographicScope: null,
    establishedSince: null,
    statusTitle: 'Rivalités non évaluées',
    explanation: "L'intelligence des rivalités n'a pas été évaluée pour ce jeu de données."
  };
}

/**
 * Maps internal diagnostic and validation statuses to concise, user-friendly
 * French explanations suitable for the UI, without exposing internal IDs,
 * paths, hashes, or technical maintenance flags.
 */
export function getUserFriendlyFiMessage(fiState) {
  if (!fiState) return "Aucune donnée Football Intelligence n'est disponible.";
  if (fiState.available && fiState.matched) return null;
  const status = fiState.status;
  if (status === 'LEAGUE_UNSUPPORTED') {
    return "La couverture Football Intelligence n'est pas disponible pour ce championnat.";
  }
  if (status === 'NO_DATASET_FOR_LEAGUE' || status === 'ARTIFACT_NOT_AVAILABLE') {
    return "Aucun jeu de données Football Intelligence vérifié n'est disponible pour ce championnat.";
  }
  if (status === 'TARGET_NOT_FOUND') {
    return "Cette rencontre n'est pas incluse dans la couverture analytique d'avant-match de ce championnat.";
  }
  if (status === 'DATE_MISMATCH' || status === 'SEASON_MISMATCH') {
    return "Les paramètres de calendrier de la rencontre ne correspondent pas au jeu de données vérifié.";
  }
  if (status === 'MISSING_MATCH_ID') {
    return "Identifiant de match manquant dans l'enregistrement de prédiction.";
  }
  if (status === 'INVALID_ENVELOPE' || status === 'ENVELOPE_REJECTED') {
    return "Le jeu de données analytiques n'a pas passé les contrôles de vérification.";
  }
  if (
    status === 'HTTP_ERROR' ||
    status === 'NETWORK_ERROR' ||
    status === 'FETCH_UNAVAILABLE' ||
    status === 'JSON_PARSE_ERROR' ||
    status === 'INVALID_CONTENT_TYPE' ||
    status === 'ERROR'
  ) {
    return "Les données Football Intelligence n'ont pas pu être chargées momentanément.";
  }
  return "Aucun jeu de données Football Intelligence vérifié n'est disponible pour cette rencontre.";
}

/**
 * Classifies a match-level Football Intelligence state into 'ready', 'unavailable', or 'error'.
 */
export function classifyFiState(fiState) {
  if (!fiState) return 'unavailable';
  if (fiState.available && fiState.matched) return 'ready';
  const errorStatuses = [
    'HTTP_ERROR',
    'NETWORK_ERROR',
    'FETCH_UNAVAILABLE',
    'JSON_PARSE_ERROR',
    'INVALID_CONTENT_TYPE',
    'ENVELOPE_REJECTED',
    'INVALID_ENVELOPE',
    'ERROR'
  ];
  if (errorStatuses.includes(fiState.status)) {
    return 'error';
  }
  return 'unavailable';
}

/**
 * Builds a read-only summary presentation object for Phase B distributed integrations
 * (header Elo strip, Series & Form Opponent Quality block, Narrative & Justice Rivalry card)
 * without recalculating any metric.
 */
export function buildFiMatchSummary(fiState) {
  if (!fiState || !fiState.available || !fiState.matched || !fiState.association?.target) {
    return null;
  }
  const { association } = fiState;
  const { target, expectedParticipants, leagueName, canonicalLeagueName } = association;
  const ts = target.team_strength || {};
  const oq = target.opponent_quality || {};
  const isFullCoverage = target.active_league_mean_status === 'ESTABLISHED_FULL_PARTICIPANTS';

  const homeNObs = Number.isInteger(oq.home?.n_opponents_observed) ? oq.home.n_opponents_observed : 0;
  const homeNCtx = Number.isInteger(oq.home?.n_contextualized_gaps_observed) ? oq.home.n_contextualized_gaps_observed : 0;
  const awayNObs = Number.isInteger(oq.away?.n_opponents_observed) ? oq.away.n_opponents_observed : 0;
  const awayNCtx = Number.isInteger(oq.away?.n_contextualized_gaps_observed) ? oq.away.n_contextualized_gaps_observed : 0;

  return {
    leagueName: leagueName || canonicalLeagueName,
    canonicalLeagueName,
    homeTeam: target.home_team,
    awayTeam: target.away_team,
    expectedParticipants,
    isFullCoverage,
    activeLeagueMean: isFullCoverage && Number.isFinite(target.active_league_mean) ? target.active_league_mean : null,
    home: {
      rating: Number.isFinite(ts.home?.rating_pre_match) ? ts.home.rating_pre_match : null,
      rank: isFullCoverage && Number.isInteger(ts.home?.rank_in_league) ? ts.home.rank_in_league : null,
      oq: {
        avgL5: homeNObs > 0 && Number.isFinite(oq.home?.opp_strength_l5_avg) ? oq.home.opp_strength_l5_avg : null,
        gapVsActive: homeNObs > 0 && isFullCoverage && Number.isFinite(oq.home?.schedule_difficulty_vs_active_mean)
          ? oq.home.schedule_difficulty_vs_active_mean
          : null,
        nObs: homeNObs,
        nCtx: homeNCtx,
        notes: translateOqFlags(oq.home?.flags)
      }
    },
    away: {
      rating: Number.isFinite(ts.away?.rating_pre_match) ? ts.away.rating_pre_match : null,
      rank: isFullCoverage && Number.isInteger(ts.away?.rank_in_league) ? ts.away.rank_in_league : null,
      oq: {
        avgL5: awayNObs > 0 && Number.isFinite(oq.away?.opp_strength_l5_avg) ? oq.away.opp_strength_l5_avg : null,
        gapVsActive: awayNObs > 0 && isFullCoverage && Number.isFinite(oq.away?.schedule_difficulty_vs_active_mean)
          ? oq.away.schedule_difficulty_vs_active_mean
          : null,
        nObs: awayNObs,
        nCtx: awayNCtx,
        notes: translateOqFlags(oq.away?.flags)
      }
    },
    rivalry: resolveRivalryPresentation(target.rivalry_intelligence)
  };
}

/**
 * Extracts chronological pre-match Elo observations for a given team from historical_matches.
 * Never interpolates across missing dates/seasons and never fabricates post-match Elo ratings.
 */
export function extractTeamHistoricalSeries(validatedFi, teamName, seasonFilter = 'ALL') {
  if (!validatedFi || !Array.isArray(validatedFi.historicalMatches) || !teamName) {
    return [];
  }

  const points = [];
  for (const m of validatedFi.historicalMatches) {
    if (seasonFilter !== 'ALL' && m.season_key !== seasonFilter) continue;
    const isHome = m.home_team === teamName;
    const isAway = m.away_team === teamName;
    if (!isHome && !isAway) continue;

    const sideObj = isHome ? m.team_strength.home : m.team_strength.away;
    const oppObj = isHome ? m.team_strength.away : m.team_strength.home;
    const opponentName = isHome ? m.away_team : m.home_team;
    const teamGoals = isHome ? m.score_home : m.score_away;
    const opponentGoals = isHome ? m.score_away : m.score_home;
    const isFullCoverage = m.active_league_mean_status === 'ESTABLISHED_FULL_PARTICIPANTS';

    let outcomeLabel = 'D';
    if (teamGoals > opponentGoals) outcomeLabel = 'W';
    else if (teamGoals < opponentGoals) outcomeLabel = 'L';

    points.push({
      matchId: m.match_id,
      date: m.date,
      seasonKey: m.season_key,
      isHome,
      venueLabel: isHome ? 'Domicile' : 'Extérieur',
      teamName,
      opponentName,
      ratingPreMatch: sideObj.rating_pre_match,
      opponentRatingPreMatch: oppObj.rating_pre_match,
      rankInLeague: isFullCoverage && Number.isInteger(sideObj.rank_in_league) ? sideObj.rank_in_league : null,
      activeLeagueMean: isFullCoverage && Number.isFinite(m.active_league_mean) ? m.active_league_mean : null,
      matchesObservedSeason: sideObj.matches_observed_season,
      matchesObservedTotal: sideObj.matches_observed_total,
      isNewEntrant: Boolean(sideObj.is_new_entrant),
      isReturningAfterAbsence: Boolean(sideObj.is_returning_after_absence),
      scoreHome: m.score_home,
      scoreAway: m.score_away,
      teamGoals,
      opponentGoals,
      scoreDisplay: `${m.score_home} – ${m.score_away}`,
      outcomeLabel,
      rivalry: resolveRivalryPresentation(m.rivalry_intelligence)
    });
  }

  return points;
}

/**
 * Filters historical_matches for the Historical Match Explorer.
 */
export function filterHistoricalMatches(validatedFi, options = {}) {
  if (!validatedFi || !Array.isArray(validatedFi.historicalMatches)) {
    return [];
  }

  const {
    teamMode = 'BOTH_MATCH_TEAMS', // 'BOTH_MATCH_TEAMS' | 'HOME_TEAM' | 'AWAY_TEAM' | 'H2H' | 'CUSTOM_TEAM' | 'ALL_LEAGUE'
    homeTeam = '',
    awayTeam = '',
    customTeam = '',
    seasonFilter = 'ALL',
    onlyDocumentedRivalries = false
  } = options;

  const filtered = [];
  for (const m of validatedFi.historicalMatches) {
    if (seasonFilter !== 'ALL' && m.season_key !== seasonFilter) continue;

    if (teamMode === 'BOTH_MATCH_TEAMS' && homeTeam && awayTeam) {
      if (
        m.home_team !== homeTeam &&
        m.away_team !== homeTeam &&
        m.home_team !== awayTeam &&
        m.away_team !== awayTeam
      ) {
        continue;
      }
    } else if (teamMode === 'HOME_TEAM' && homeTeam) {
      if (m.home_team !== homeTeam && m.away_team !== homeTeam) continue;
    } else if (teamMode === 'AWAY_TEAM' && awayTeam) {
      if (m.home_team !== awayTeam && m.away_team !== awayTeam) continue;
    } else if (teamMode === 'H2H' && homeTeam && awayTeam) {
      const isDirect =
        (m.home_team === homeTeam && m.away_team === awayTeam) ||
        (m.home_team === awayTeam && m.away_team === homeTeam);
      if (!isDirect) continue;
    } else if (teamMode === 'CUSTOM_TEAM' && customTeam) {
      if (m.home_team !== customTeam && m.away_team !== customTeam) continue;
    }

    const rivalry = resolveRivalryPresentation(m.rivalry_intelligence);
    if (onlyDocumentedRivalries && !rivalry.isDocumentedRivalry) continue;

    const isFullCoverage = m.active_league_mean_status === 'ESTABLISHED_FULL_PARTICIPANTS';

    filtered.push({
      matchId: m.match_id,
      date: m.date,
      seasonKey: m.season_key,
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      scoreHome: m.score_home,
      scoreAway: m.score_away,
      scoreDisplay: `${m.score_home} – ${m.score_away}`,
      homeRatingPreMatch: m.team_strength.home.rating_pre_match,
      awayRatingPreMatch: m.team_strength.away.rating_pre_match,
      homeRank: isFullCoverage && Number.isInteger(m.team_strength.home.rank_in_league) ? m.team_strength.home.rank_in_league : null,
      awayRank: isFullCoverage && Number.isInteger(m.team_strength.away.rank_in_league) ? m.team_strength.away.rank_in_league : null,
      diffHomeMinusAway: m.team_strength.diff_home_minus_away,
      activeLeagueMean: isFullCoverage && Number.isFinite(m.active_league_mean) ? m.active_league_mean : null,
      isFullCoverage,
      homeNewEntrant: Boolean(m.team_strength.home.is_new_entrant),
      awayNewEntrant: Boolean(m.team_strength.away.is_new_entrant),
      homeReturning: Boolean(m.team_strength.home.is_returning_after_absence),
      awayReturning: Boolean(m.team_strength.away.is_returning_after_absence),
      rivalry
    });
  }

  return filtered;
}
