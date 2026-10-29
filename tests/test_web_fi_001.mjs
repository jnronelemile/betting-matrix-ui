import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FI_LEAGUE_REGISTRY,
  resolveFiLeagueConfig,
  recognizeFiEnvelopeProfile,
  validateFiMatchRecord,
  validateAndIndexFiEnvelope,
  associatePredictionWithFiTarget,
  loadFootballIntelligenceForMatch,
  clearFootballIntelligenceCache,
  getFootballIntelligenceCacheSize,
  formatEloRating,
  formatSignedEloDelta,
  formatNormalizedExpectation,
  translateOqFlags,
  resolveRivalryPresentation,
  extractTeamHistoricalSeries,
  filterHistoricalMatches,
  getUserFriendlyFiMessage,
  classifyFiState,
  buildFiMatchSummary
} from '../src/utils/footballIntelligenceLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('=== STARTING TARGETED TEST SUITE: WEB-FI-001 (PHASES A & B) ===\n');

const serieAFiPath = path.join(
  ROOT_DIR,
  'public/data/titanium_v2/football_intelligence/multileague/football_intelligence_serie_a.json'
);
const predictionsPath = path.join(
  ROOT_DIR,
  'public/data/titanium_v2/predictions/Run_matches-to-predict_Week-05_AB_Octobre-2026___2026-10-27_19h35m54s_VALUE_BETTING_MATRIX_2026-10-27_19h45m38s.json'
);

const serieAFiRaw = JSON.parse(fs.readFileSync(serieAFiPath, 'utf8'));
const predictionsRaw = JSON.parse(fs.readFileSync(predictionsPath, 'utf8'));

// -----------------------------------------------------------------------------
// TEST 1: Explicit League Identification & Isolation (SerieA vs SerieB / BrazilianSerieA)
// -----------------------------------------------------------------------------
console.log('[TEST 1] Explicit League Identification & Cross-League Isolation');
{
  assert.equal(FI_LEAGUE_REGISTRY.length, 7, 'Registry must define the 7 canonical FI leagues');

  const serieAConfig = resolveFiLeagueConfig('SerieA');
  assert.ok(serieAConfig, 'SerieA must resolve');
  assert.equal(serieAConfig.leagueId, 55);
  assert.equal(serieAConfig.canonicalName, 'Serie A');
  assert.equal(serieAConfig.expectedParticipants, 20);

  // Strict rejection of similar-sounding leagues (no substring heuristics)
  assert.equal(resolveFiLeagueConfig('SerieB'), null, 'SerieB must never match SerieA');
  assert.equal(resolveFiLeagueConfig('BrazilianSerieA'), null, 'BrazilianSerieA must never match SerieA');
  assert.equal(resolveFiLeagueConfig('2.Bundesliga'), null, '2.Bundesliga must never match Bundesliga');
  assert.equal(resolveFiLeagueConfig('Ligue2'), null, 'Ligue2 must never match Ligue1');
  assert.equal(resolveFiLeagueConfig('LaLiga2'), null, 'LaLiga2 must never match LaLiga');
  assert.equal(resolveFiLeagueConfig('Allsvenskan'), null, 'Allsvenskan must be unsupported');

  console.log('  ✓ Test 1 passed: League identification is strict with zero cross-league collisions.\n');
}

// -----------------------------------------------------------------------------
// TEST 2: Profile Recognition (FE-002, FE-003, FE-009) & Envelope Rejection
// -----------------------------------------------------------------------------
console.log('[TEST 2] Profile Recognition (FE-002, FE-003, FE-009) & Heuristic-Free Rejection');
{
  // 2.a: Real FE-009 Serie A envelope
  const fe009Check = recognizeFiEnvelopeProfile(serieAFiRaw);
  assert.equal(fe009Check.valid, true);
  assert.equal(fe009Check.profile, 'FE-009');
  assert.equal(fe009Check.leagueConfig.leagueId, 55);

  // 2.b: Valid FE-002 (PL Historical) synthetic envelope
  const sampleMatchHist = structuredClone(serieAFiRaw.historical_matches[0]);
  const fe002Envelope = {
    _metadata_: {
      task_id: 'FE-002',
      scope: 'pilot_premier_league_intra',
      method_version: '0.2.0',
      league_id: 47,
      league_name: 'Premier League',
      decision_effect: 'NONE',
      temporal_certification: 'CHRONOLOGICAL_RECONSTRUCTION_ONLY',
      components_evaluated: ['team_strength_elo_baseline', 'opponent_quality_l5_contextualized', 'derby_and_rivalry_intelligence'],
      parameters: { k_factor: 20, home_advantage: 35, season_regression_lambda: 0.85, initial_rating: 1500 }
    },
    matches: [sampleMatchHist],
    current_season_active_standings: [],
    all_time_tracked_standings: []
  };
  const fe002Validated = validateAndIndexFiEnvelope(fe002Envelope, 'PL');
  assert.equal(fe002Validated.valid, true);
  assert.equal(fe002Validated.profile, 'FE-002');
  assert.equal(fe002Validated.historicalMatches.length, 1);
  assert.equal(fe002Validated.targetMatches.length, 0);

  // 2.c: Valid FE-003 (PL Operational Targets - Semantic Contract Section 8 Chelsea vs Tottenham)
  const chelseaTotTarget = {
    match_id: '20261024_CHELSEA_TOTTENHAMHOTSPUR',
    date: '2026-10-24',
    season_key: '2026-2027',
    home_team: 'Chelsea',
    away_team: 'Tottenham Hotspur',
    score_home: null,
    score_away: null,
    active_league_mean: 1536.84,
    active_league_mean_status: 'ESTABLISHED_FULL_PARTICIPANTS',
    decision_effect: 'NONE',
    team_strength: {
      home: {
        rating_pre_match: 1549.96,
        rank_in_league: 7,
        matches_observed_season: 7,
        matches_observed_total: 121,
        matches_observed: 121,
        is_new_entrant: false,
        is_returning_after_absence: false
      },
      away: {
        rating_pre_match: 1452.25,
        rank_in_league: 20,
        matches_observed_season: 7,
        matches_observed_total: 121,
        matches_observed: 121,
        is_new_entrant: false,
        is_returning_after_absence: false
      },
      diff_home_minus_away: 97.71,
      expected_score_home: 0.682208,
      expected_score_away: 0.317792
    },
    opponent_quality: {
      home: {
        opp_strength_l5_avg: 1561.12,
        schedule_difficulty_vs_active_mean: 24.28,
        schedule_difficulty_vs_nominal_anchor: 61.12,
        opp_strength_l5_contextualized_gap_avg: 24.28,
        n_opponents_observed: 5,
        n_contextualized_gaps_observed: 5,
        flags: []
      },
      away: {
        opp_strength_l5_avg: 1525.31,
        schedule_difficulty_vs_active_mean: -11.53,
        schedule_difficulty_vs_nominal_anchor: 25.31,
        opp_strength_l5_contextualized_gap_avg: -11.54,
        n_opponents_observed: 5,
        n_contextualized_gaps_observed: 5,
        flags: []
      }
    },
    rivalry_intelligence: {
      status: 'RECORDED_IN_PILOT_REGISTRY',
      is_rivalry: true,
      rivalry_id: 'PL_LONDON_DERBY_CFC_TOT',
      rivalry_name: 'Chelsea–Tottenham London Derby',
      category: 'LOCAL_DERBY',
      geographic_scope: 'London',
      established_since: 1967,
      provenance_count: 2,
      source: 'rivalry_registry_pl.json',
      static_tags: ['DERBY'],
      decision_effect: 'NONE'
    }
  };

  const fe003Envelope = {
    _metadata_: {
      task_id: 'FE-003',
      scope: 'operational_premier_league',
      method_version: '0.3.0',
      league_id: 47,
      league_name: 'Premier League',
      target_cutoff: '2026-10-23',
      decision_effect: 'NONE',
      temporal_certification: 'PRE_MATCH_OPERATIONAL_EVALUATION',
      components_evaluated: ['team_strength_elo_baseline', 'opponent_quality_l5_contextualized', 'derby_and_rivalry_intelligence'],
      parameters: { k_factor: 20, home_advantage: 35, season_regression_lambda: 0.85, initial_rating: 1500 }
    },
    target_fixtures: [chelseaTotTarget],
    current_season_active_standings: [],
    all_time_tracked_standings: []
  };

  const fe003Validated = validateAndIndexFiEnvelope(fe003Envelope, 47);
  assert.equal(fe003Validated.valid, true);
  assert.equal(fe003Validated.profile, 'FE-003');
  assert.equal(fe003Validated.cutoff, '2026-10-23');
  assert.equal(fe003Validated.targetMatches.length, 1);

  // 2.d: Reject heuristic key mixing (e.g. FE-003 using target_matches instead of target_fixtures)
  const badFe003 = structuredClone(fe003Envelope);
  badFe003.target_matches = badFe003.target_fixtures;
  delete badFe003.target_fixtures;
  assert.equal(recognizeFiEnvelopeProfile(badFe003).valid, false, 'Must reject FE-003 with target_matches instead of target_fixtures');

  // 2.e: Reject FE-009 with method_version or PL standings arrays
  const badFe009Version = {
    ...serieAFiRaw,
    _metadata_: { ...serieAFiRaw._metadata_, method_version: '0.3.0' }
  };
  assert.equal(recognizeFiEnvelopeProfile(badFe009Version).valid, false, 'Must reject FE-009 emitting method_version');

  const badFe009MatchesKey = {
    _metadata_: serieAFiRaw._metadata_,
    matches: serieAFiRaw.historical_matches,
    target_matches: serieAFiRaw.target_matches
  };
  assert.equal(recognizeFiEnvelopeProfile(badFe009MatchesKey).valid, false, 'Must reject FE-009 using matches instead of historical_matches');

  // 2.f: Reject unknown task_id or non-NONE decision_effect
  const badTask = {
    ...serieAFiRaw,
    _metadata_: { ...serieAFiRaw._metadata_, task_id: 'FE-999' }
  };
  assert.equal(recognizeFiEnvelopeProfile(badTask).valid, false, 'Must reject unknown task_id');

  const badDecisionEffect = {
    ...serieAFiRaw,
    _metadata_: { ...serieAFiRaw._metadata_, decision_effect: 'ACTIVE_SIZING' }
  };
  assert.equal(recognizeFiEnvelopeProfile(badDecisionEffect).valid, false, 'Must reject decision_effect !== NONE');

  console.log('  ✓ Test 2 passed: FE-002, FE-003, and FE-009 profiles recognized; invalid envelopes rejected.\n');
}

// -----------------------------------------------------------------------------
// TEST 3: Real Serie A Validation, 10/10 Target Associations & Numerical Fidelity
// -----------------------------------------------------------------------------
console.log('[TEST 3] Real Serie A Dataset Validation, 10/10 Target Associations & Numerical Fidelity');
{
  const validatedSerieA = validateAndIndexFiEnvelope(serieAFiRaw, 'SerieA');
  assert.equal(validatedSerieA.valid, true, 'Real Serie A FI JSON must validate cleanly');
  assert.equal(validatedSerieA.profile, 'FE-009');
  assert.equal(validatedSerieA.leagueId, 55);
  assert.equal(validatedSerieA.cutoff, '2026-10-27');
  assert.equal(validatedSerieA.historicalMatches.length, 1220, 'Must index all 1,220 historical Serie A matches');
  assert.equal(validatedSerieA.targetMatches.length, 10, 'Must index all 10 Serie A target matches');
  assert.deepEqual(
    validatedSerieA.historicalSeasons,
    ['2023-2024', '2024-2025', '2025-2026', '2026-2027'],
    'Must cover all 4 historical seasons'
  );
  assert.equal(validatedSerieA.historicalTeams.length, 25, 'Must index all 25 unique historical Serie A clubs');

  const serieAPredictions = predictionsRaw.filter(p => p.League === 'SerieA');
  assert.equal(serieAPredictions.length, 10, 'Predictions matrix must contain 10 SerieA matches');

  for (const pred of serieAPredictions) {
    const assoc = associatePredictionWithFiTarget(pred, validatedSerieA);
    assert.equal(assoc.matched, true, `Target ${pred.Match_ID} must associate cleanly`);
    assert.equal(assoc.target.match_id, pred.Match_ID);
    assert.equal(assoc.target.date, pred.Match_Date);
    assert.equal(assoc.target.season_key, '2026-2027');
    assert.equal(assoc.target.active_league_mean, 1536.31);
    assert.equal(assoc.target.active_league_mean_status, 'ESTABLISHED_FULL_PARTICIPANTS');
  }

  // Spot-check exact numerical fidelity on specific Serie A targets
  // 1) Sassuolo vs SS Lazio (20261027_SASSUOLO_SSLAZIO)
  const sassuoloLazio = validatedSerieA.targetByKey.get('55::20261027_SASSUOLO_SSLAZIO');
  assert.equal(sassuoloLazio.team_strength.home.rating_pre_match, 1489.05);
  assert.equal(sassuoloLazio.team_strength.home.rank_in_league, 13);
  assert.equal(sassuoloLazio.team_strength.home.matches_observed_season, 8);
  assert.equal(sassuoloLazio.team_strength.home.matches_observed_total, 84);
  assert.equal(sassuoloLazio.team_strength.away.rating_pre_match, 1603.64);
  assert.equal(sassuoloLazio.team_strength.away.rank_in_league, 7);
  assert.equal(sassuoloLazio.team_strength.away.matches_observed_season, 8);
  assert.equal(sassuoloLazio.team_strength.away.matches_observed_total, 122);
  assert.equal(sassuoloLazio.team_strength.diff_home_minus_away, -114.59);
  assert.equal(sassuoloLazio.team_strength.expected_score_home, 0.387417);
  assert.equal(sassuoloLazio.team_strength.expected_score_away, 0.612583);
  assert.equal(sassuoloLazio.opponent_quality.home.opp_strength_l5_avg, 1563.63);
  assert.equal(sassuoloLazio.opponent_quality.home.schedule_difficulty_vs_active_mean, 27.32);
  assert.equal(sassuoloLazio.opponent_quality.home.schedule_difficulty_vs_nominal_anchor, 63.63);
  assert.equal(sassuoloLazio.opponent_quality.home.opp_strength_l5_contextualized_gap_avg, 27.32);
  assert.equal(sassuoloLazio.opponent_quality.home.n_opponents_observed, 5);
  assert.equal(sassuoloLazio.opponent_quality.home.n_contextualized_gaps_observed, 5);

  // 2) AS Roma vs Cagliari Calcio (20261027_ASROMA_CAGLIARICALCIO) - note contextualized gap 32.8 vs active mean gap 32.79
  const romaCagliari = validatedSerieA.targetByKey.get('55::20261027_ASROMA_CAGLIARICALCIO');
  assert.equal(romaCagliari.team_strength.home.rating_pre_match, 1643.96);
  assert.equal(romaCagliari.team_strength.home.rank_in_league, 2);
  assert.equal(romaCagliari.team_strength.away.rating_pre_match, 1490.47);
  assert.equal(romaCagliari.team_strength.away.rank_in_league, 12);
  assert.equal(romaCagliari.team_strength.diff_home_minus_away, 153.49);
  assert.equal(romaCagliari.opponent_quality.home.schedule_difficulty_vs_active_mean, 32.79);
  assert.equal(romaCagliari.opponent_quality.home.opp_strength_l5_contextualized_gap_avg, 32.8);

  // 3) Venezia FC vs Inter Milan (20261028_VENEZIAFC_INTERMILAN) - Venezia returned after absence on 2026-08-23, false on Oct 28 target
  const veneziaPred = serieAPredictions.find(p => p.Match_ID === '20261028_VENEZIAFC_INTERMILAN');
  const veneziaAssoc = associatePredictionWithFiTarget(veneziaPred, validatedSerieA);
  assert.equal(veneziaAssoc.target.team_strength.away.rank_in_league, 1);
  assert.equal(veneziaAssoc.target.team_strength.away.rating_pre_match, 1714.15);
  assert.equal(veneziaAssoc.target.team_strength.home.rank_in_league, 18);
  assert.equal(veneziaAssoc.target.team_strength.home.rating_pre_match, 1452.84);
  assert.equal(veneziaAssoc.target.team_strength.home.matches_observed_season, 8);
  assert.equal(veneziaAssoc.target.team_strength.home.matches_observed_total, 46);
  assert.equal(veneziaAssoc.target.team_strength.home.is_returning_after_absence, false, 'October 28 target fixture itself must have is_returning_after_absence = false');
  assert.equal(veneziaAssoc.target.team_strength.home.is_new_entrant, false);
  assert.equal(veneziaAssoc.homeSeasonEntry?.isReturningAfterAbsence, true, 'Venezia FC 2026-2027 season entry records return after absence');
  assert.equal(veneziaAssoc.homeSeasonEntry?.firstMatchDate, '2026-08-23');
  assert.equal(veneziaAssoc.homeSeasonEntry?.firstMatchId, '20260823_VENEZIAFC_USLECCE');

  console.log('  ✓ Test 3 passed: 10/10 Serie A targets matched with exact numerical fidelity.\n');
}

// -----------------------------------------------------------------------------
// TEST 4: Historical Coverage Across 4 Seasons, Rivalries & Entrant/Return States
// -----------------------------------------------------------------------------
console.log('[TEST 4] Historical Elo Series, Match Explorer & Rivalry/Coverage Semantics');
{
  const validatedSerieA = validateAndIndexFiEnvelope(serieAFiRaw, 'SerieA');

  // Check Inter Milan trajectory across all 4 seasons
  const interAllSeasons = extractTeamHistoricalSeries(validatedSerieA, 'Inter Milan', 'ALL');
  assert.equal(interAllSeasons.length, 122, 'Inter Milan must have 122 historical pre-match points (38*3 + 8)');
  const inter2627 = extractTeamHistoricalSeries(validatedSerieA, 'Inter Milan', '2026-2027');
  assert.equal(inter2627.length, 8, 'Inter Milan must have 8 recorded matches in 2026-2027 prior to Round 9');

  // Check Venezia FC trajectory (present in 2024-2025 and 2026-2027, absent in 2023-2024 and 2025-2026)
  const veneziaAll = extractTeamHistoricalSeries(validatedSerieA, 'Venezia FC', 'ALL');
  assert.equal(veneziaAll.length, 46, 'Venezia FC must have exactly 46 recorded matches (38 in 24-25 + 8 in 26-27)');
  assert.equal(veneziaAll[0].isNewEntrant, true, 'Venezia first appearance in 2024-2025 has isNewEntrant=true');
  assert.equal(veneziaAll[0].ratingPreMatch, 1500.0);
  const veneziaReturnMatch = veneziaAll.find(p => p.seasonKey === '2026-2027');
  assert.equal(veneziaReturnMatch.isReturningAfterAbsence, true, 'Venezia 2026-2027 opener has isReturningAfterAbsence=true');
  assert.equal(veneziaReturnMatch.ratingPreMatch, 1500.0);
  assert.equal(veneziaReturnMatch.matchId, '20260823_VENEZIAFC_USLECCE');
  assert.equal(veneziaReturnMatch.date, '2026-08-23');

  // Verify real observation of PARTIAL_SEASON_PARTICIPANTS_COVERAGE
  const veneziaOpenerRaw = validatedSerieA.historicalMatches.find(m => m.match_id === '20260823_VENEZIAFC_USLECCE');
  assert.ok(veneziaOpenerRaw, '20260823_VENEZIAFC_USLECCE must exist in historicalMatches');
  assert.equal(veneziaOpenerRaw.active_league_mean_status, 'PARTIAL_SEASON_PARTICIPANTS_COVERAGE');
  assert.equal(veneziaOpenerRaw.active_league_mean, null);
  assert.equal(veneziaOpenerRaw.team_strength.home.rank_in_league, null);
  assert.equal(veneziaOpenerRaw.team_strength.away.rank_in_league, null);

  const empoliVeronaRaw = validatedSerieA.historicalMatches.find(m => m.match_id === '20230819_EMPOLIFC_HELLASVERONA');
  assert.ok(empoliVeronaRaw, '20230819_EMPOLIFC_HELLASVERONA must exist in historicalMatches');
  assert.equal(empoliVeronaRaw.active_league_mean_status, 'PARTIAL_SEASON_PARTICIPANTS_COVERAGE');
  assert.equal(empoliVeronaRaw.active_league_mean, null);
  assert.equal(empoliVeronaRaw.team_strength.home.rank_in_league, null);
  assert.equal(empoliVeronaRaw.team_strength.away.rank_in_league, null);

  // Verify that filterHistoricalMatches preserves PARTIAL_SEASON_PARTICIPANTS_COVERAGE semantics
  const explorerRows = filterHistoricalMatches(validatedSerieA, { teamMode: 'ALL_LEAGUE', seasonFilter: 'ALL' });
  const venOpenerExplorer = explorerRows.find(r => r.matchId === '20260823_VENEZIAFC_USLECCE');
  assert.ok(venOpenerExplorer);
  assert.equal(venOpenerExplorer.isFullCoverage, false);
  assert.equal(venOpenerExplorer.activeLeagueMean, null);
  assert.equal(venOpenerExplorer.homeRank, null);
  assert.equal(venOpenerExplorer.awayRank, null);

  // Verify deterministic chronological sorting of historicalMatches
  for (let i = 0; i < validatedSerieA.historicalMatches.length - 1; i++) {
    const cur = validatedSerieA.historicalMatches[i];
    const nxt = validatedSerieA.historicalMatches[i + 1];
    const dCmp = cur.date.localeCompare(nxt.date);
    assert.ok(dCmp <= 0, `Date ordering must be non-decreasing: ${cur.date} <= ${nxt.date}`);
    if (dCmp === 0) {
      assert.ok((cur.match_id || '').localeCompare(nxt.match_id || '') <= 0, 'Same-day matches must be tie-broken deterministically by match_id');
    }
  }

  // Check documented rivalries in historical explorer
  const allRivalries = filterHistoricalMatches(validatedSerieA, {
    teamMode: 'ALL_LEAGUE',
    seasonFilter: 'ALL',
    onlyDocumentedRivalries: true
  });
  assert.equal(allRivalries.length, 24, 'Serie A history must contain 24 documented rivalry matches');
  const rivalryNames = new Set(allRivalries.map(r => r.rivalry.rivalryName));
  assert.deepEqual(
    Array.from(rivalryNames).sort(),
    ['Derby d\'Italia', 'Derby della Capitale', 'Derby della Madonnina', 'Derby della Mole']
  );

  // Verify semantic presentation of all 3 rivalry states
  const notRecordedPres = resolveRivalryPresentation(serieAFiRaw.target_matches[0].rivalry_intelligence);
  assert.equal(notRecordedPres.isDocumentedRivalry, false);
  assert.equal(notRecordedPres.statusTitle, 'Paire non répertoriée dans le registre partiel des rivalités');
  assert.ok(!notRecordedPres.statusTitle.toLowerCase().includes('no rivalry'), 'Must never claim "no rivalry"');
  assert.ok(!notRecordedPres.statusTitle.toLowerCase().includes('aucune rivalité'), 'Must never claim "aucune rivalité"');

  const notEvaluatedPres = resolveRivalryPresentation({ status: 'NOT_EVALUATED', is_rivalry: null, category: null, decision_effect: 'NONE' });
  assert.equal(notEvaluatedPres.state, 'NOT_EVALUATED');
  assert.equal(notEvaluatedPres.statusTitle, 'Rivalités non évaluées');

  // Verify translation of OQ flags without exposing raw flag strings
  const translated = translateOqFlags(['INSUFFICIENT_L5_HISTORY', 'NO_CONTEXTUALIZED_GAP_L5', 'PARTIAL_CONTEXTUALIZED_GAP_L5']);
  assert.equal(translated.length, 3);
  for (const msg of translated) {
    assert.ok(!msg.includes('_'), `Translated message "${msg}" must not expose raw snake_case flags`);
  }

  console.log('  ✓ Test 4 passed: 4-season historical series, 24 rivalries, and coverage states verified.\n');
}

// -----------------------------------------------------------------------------
// TEST 5: Missing Data, Mismatch Rejection & On-Demand Single-Fetch Caching
// -----------------------------------------------------------------------------
console.log('[TEST 5] Missing-Data Behavior, Fail-Closed Mismatches & On-Demand Caching');
{
  const validatedSerieA = validateAndIndexFiEnvelope(serieAFiRaw, 'SerieA');
  const sampleSerieAPred = predictionsRaw.find(p => p.League === 'SerieA');

  // 5.a: Date mismatch rejected
  const wrongDatePred = { ...sampleSerieAPred, Match_Date: '2026-10-30' };
  const dateMismatch = associatePredictionWithFiTarget(wrongDatePred, validatedSerieA);
  assert.equal(dateMismatch.matched, false);
  assert.equal(dateMismatch.status, 'DATE_MISMATCH');

  // 5.b: Season mismatch rejected
  const wrongSeasonPred = { ...sampleSerieAPred, season_key: '2025-2026' };
  const seasonMismatch = associatePredictionWithFiTarget(wrongSeasonPred, validatedSerieA);
  assert.equal(seasonMismatch.matched, false);
  assert.equal(seasonMismatch.status, 'SEASON_MISMATCH');

  // 5.c: Missing Match_ID rejected (no fuzzy team-name fallback)
  const missingIdPred = { ...sampleSerieAPred, Match_ID: '' };
  const missingIdRes = associatePredictionWithFiTarget(missingIdPred, validatedSerieA);
  assert.equal(missingIdRes.matched, false);
  assert.equal(missingIdRes.status, 'MISSING_MATCH_ID');

  // 5.d: Duplicate target match_id in envelope rejected
  const dupTargetEnvelope = {
    ...serieAFiRaw,
    target_matches: [serieAFiRaw.target_matches[0], serieAFiRaw.target_matches[0]]
  };
  assert.equal(validateAndIndexFiEnvelope(dupTargetEnvelope, 'SerieA').valid, false, 'Duplicate target match_id must be rejected');

  // 5.e: On-demand loader & single-fetch cache across all 10 Serie A matches + non-Serie A matches
  clearFootballIntelligenceCache();
  assert.equal(getFootballIntelligenceCacheSize(), 0);

  let fetchCallCount = 0;
  const mockFetch = async (url) => {
    fetchCallCount++;
    assert.equal(url, '/data/titanium_v2/football_intelligence/multileague/football_intelligence_serie_a.json');
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => serieAFiRaw
    };
  };

  const manifestOverride = {
    footballIntelligence: ['/data/titanium_v2/football_intelligence/multileague/football_intelligence_serie_a.json']
  };

  // Non-Serie A match (e.g. SerieB or Allsvenskan) must not trigger any fetch
  const serieBMatch = predictionsRaw.find(p => p.League === 'SerieB');
  const serieBRes = await loadFootballIntelligenceForMatch(serieBMatch, { fetchFn: mockFetch, manifestOverride });
  assert.equal(serieBRes.available, false);
  assert.equal(serieBRes.status, 'LEAGUE_UNSUPPORTED');
  assert.equal(fetchCallCount, 0, 'Unsupported league must make 0 network requests');

  // Load all 10 Serie A matches sequentially/concurrently -> must fetch JSON only once
  const serieAPreds = predictionsRaw.filter(p => p.League === 'SerieA');
  for (const pred of serieAPreds) {
    const res = await loadFootballIntelligenceForMatch(pred, { fetchFn: mockFetch, manifestOverride });
    assert.equal(res.available, true);
    assert.equal(res.matched, true);
    assert.equal(res.association.target.match_id, pred.Match_ID);
  }
  assert.equal(fetchCallCount, 1, 'All 10 Serie A matches must share a single cached fetch');
  assert.equal(getFootballIntelligenceCacheSize(), 1);

  console.log('  ✓ Test 5 passed: Mismatches fail-closed and 10 Serie A matches use a single cached load.\n');
}

// -----------------------------------------------------------------------------
// TEST 6: UI Component Integration & Semantic Guardrails Inspection
// -----------------------------------------------------------------------------
console.log('[TEST 6] UI Component Integration & Semantic Guardrails');
{
  const dashboardCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/MatchDashboard.jsx'), 'utf8');
  const tabFiCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/dashboard/TabFootballIntelligence.jsx'), 'utf8');

  // Verify 8th tab in MatchDashboard.jsx
  assert.ok(dashboardCode.includes("id: 'intelligence'"), 'MatchDashboard must define the intelligence tab');
  assert.ok(dashboardCode.includes("label: 'Football Intelligence'"), 'MatchDashboard must label the tab Football Intelligence');
  assert.ok(dashboardCode.includes('<TabFootballIntelligence'), 'MatchDashboard must render TabFootballIntelligence');

  // Verify required French and bilingual analytical sections in TabFootballIntelligence.jsx
  const normalizedTabFiCode = tabFiCode.replace(/&apos;/g, "'");
  const requiredPhrases = [
    "Rating Elo d'avant-match",
    'Rang Elo',
    'Écart de rating Elo',
    'Moyenne Elo active du championnat',
    'Historique cette saison',
    'Historique observé en championnat',
    'Normalized Elo Outcome Expectation',
    'Rating Elo moyen des adversaires',
    'Écart vs moyenne active du championnat',
    'Écart vs référence fixe 1500 Elo',
    'Écart contextualisé aux dates des matchs',
    'Couverture L5 :',
    'Couverture contextualisée :',
    'Historical Elo Development',
    'Historical Match Explorer',
    'Première apparition dans ce jeu de données',
    "Retour après absence dans l'historique observé",
    'data-no-swipe="true"'
  ];

  for (const phrase of requiredPhrases) {
    assert.ok(normalizedTabFiCode.includes(phrase), `TabFootballIntelligence.jsx must include "${phrase}"`);
  }

  // Ensure formatting helpers preserve null semantics without substituting 1500
  assert.equal(formatEloRating(null), 'Indisponible');
  assert.equal(formatEloRating(1500), '1500.00');
  assert.equal(formatSignedEloDelta(null), 'Indisponible');
  assert.equal(formatSignedEloDelta(27.32), '+27.32');
  assert.equal(formatSignedEloDelta(-13.56), '-13.56');
  assert.equal(formatNormalizedExpectation(null), 'Indisponible');
  assert.equal(formatNormalizedExpectation(0.387417), '0.387417');

  // Verify UI sanitization: technical cutoff and raw diagnostics must not leak into rendered JSX
  assert.ok(!tabFiCode.includes('Historical Cutoff:'), 'TabFootballIntelligence must never display Historical Cutoff');
  assert.ok(!tabFiCode.includes('prior to the cutoff'), 'TabFootballIntelligence must never mention prior to the cutoff');
  assert.ok(!tabFiCode.includes('{fiState?.reason'), 'TabFootballIntelligence must not render raw fiState.reason');

  // Verify getUserFriendlyFiMessage returns clean, non-technical explanations
  const statusesToTest = [
    'LEAGUE_UNSUPPORTED',
    'NO_DATASET_FOR_LEAGUE',
    'ARTIFACT_NOT_AVAILABLE',
    'TARGET_NOT_FOUND',
    'DATE_MISMATCH',
    'SEASON_MISMATCH',
    'MISSING_MATCH_ID',
    'INVALID_ENVELOPE',
    'ENVELOPE_REJECTED',
    'HTTP_ERROR',
    'NETWORK_ERROR',
    'FETCH_UNAVAILABLE',
    'JSON_PARSE_ERROR',
    'INVALID_CONTENT_TYPE',
    'ERROR',
    'UNKNOWN'
  ];
  for (const st of statusesToTest) {
    const msg = getUserFriendlyFiMessage({ status: st });
    assert.ok(typeof msg === 'string' && msg.length > 0, `Message for status ${st} must be non-empty`);
    assert.ok(!msg.includes('_'), `User message for ${st} must not contain snake_case identifiers`);
    assert.ok(!msg.toLowerCase().includes('cutoff'), `User message for ${st} must not mention technical cutoff`);
  }

  console.log('  ✓ Test 6 passed: MatchDashboard and TabFootballIntelligence satisfy all UI & semantic guardrails.\n');
}

// -----------------------------------------------------------------------------
// TEST 7: Phase B Summary Builder & Exact Metric Restitution Across All 10 Serie A Targets
// -----------------------------------------------------------------------------
console.log('[TEST 7] Phase B Summary Builder & Exact Metric Restitution (10/10 Serie A Targets)');
{
  const validatedSerieA = validateAndIndexFiEnvelope(serieAFiRaw, 'SerieA');
  const serieAPredictions = predictionsRaw.filter(p => p.League === 'SerieA');
  assert.equal(serieAPredictions.length, 10);

  for (const pred of serieAPredictions) {
    const association = associatePredictionWithFiTarget(pred, validatedSerieA);
    const fiState = {
      available: true,
      matched: true,
      status: 'MATCHED',
      reason: null,
      association,
      dataset: validatedSerieA
    };

    assert.equal(classifyFiState(fiState), 'ready');
    const summary = buildFiMatchSummary(fiState);
    assert.ok(summary, `buildFiMatchSummary must return a valid summary for ${pred.Match_ID}`);

    const rawTarget = association.target;
    assert.equal(summary.homeTeam, rawTarget.home_team);
    assert.equal(summary.awayTeam, rawTarget.away_team);
    assert.equal(summary.expectedParticipants, 20);
    assert.equal(summary.isFullCoverage, true);
    assert.equal(summary.activeLeagueMean, 1536.31);
    assert.equal(summary.canonicalLeagueName, 'Serie A');

    // Exact pre-match Elo & rank restitution (zero recalculation)
    assert.equal(summary.home.rating, rawTarget.team_strength.home.rating_pre_match);
    assert.equal(summary.away.rating, rawTarget.team_strength.away.rating_pre_match);
    assert.equal(summary.home.rank, rawTarget.team_strength.home.rank_in_league);
    assert.equal(summary.away.rank, rawTarget.team_strength.away.rank_in_league);

    // Exact Opponent Quality L5 restitution
    assert.equal(summary.home.oq.avgL5, rawTarget.opponent_quality.home.opp_strength_l5_avg);
    assert.equal(summary.away.oq.avgL5, rawTarget.opponent_quality.away.opp_strength_l5_avg);
    assert.equal(summary.home.oq.gapVsActive, rawTarget.opponent_quality.home.schedule_difficulty_vs_active_mean);
    assert.equal(summary.away.oq.gapVsActive, rawTarget.opponent_quality.away.schedule_difficulty_vs_active_mean);
    assert.equal(summary.home.oq.nObs, 5);
    assert.equal(summary.away.oq.nObs, 5);
    assert.equal(summary.home.oq.nCtx, 5);
    assert.equal(summary.away.oq.nCtx, 5);

    // All 10 current Serie A targets are NOT_RECORDED_IN_PILOT_REGISTRY -> must not trigger rivalry card
    assert.equal(summary.rivalry.isDocumentedRivalry, false);
    assert.equal(summary.rivalry.state, 'NOT_RECORDED');
  }

  console.log('  ✓ Test 7 passed: buildFiMatchSummary restitutes all 10 Serie A targets with zero drift.\n');
}

// -----------------------------------------------------------------------------
// TEST 8: Partial Season Coverage, Zero L5 Coverage (0/5) & Partial L5 Coverage (nObs < 5)
// -----------------------------------------------------------------------------
console.log('[TEST 8] Partial Season Coverage, Zero L5 Coverage (0/5) & Partial L5 Coverage');
{
  const validatedSerieA = validateAndIndexFiEnvelope(serieAFiRaw, 'SerieA');

  // 8.a: Clone real historical partial-coverage match (20260823_VENEZIAFC_USLECCE) into a synthetic target state
  const veneziaOpener = structuredClone(
    validatedSerieA.historicalMatches.find(m => m.match_id === '20260823_VENEZIAFC_USLECCE')
  );
  veneziaOpener.score_home = null;
  veneziaOpener.score_away = null;
  assert.equal(validateFiMatchRecord(veneziaOpener, 'target').valid, true);

  const partialFiState = {
    available: true,
    matched: true,
    status: 'MATCHED',
    reason: null,
    association: {
      matched: true,
      status: 'MATCHED',
      target: veneziaOpener,
      leagueId: 55,
      leagueName: 'Serie A',
      canonicalLeagueName: 'Serie A',
      expectedParticipants: 20
    },
    dataset: validatedSerieA
  };

  const partialSummary = buildFiMatchSummary(partialFiState);
  assert.equal(partialSummary.isFullCoverage, false, 'Must detect PARTIAL_SEASON_PARTICIPANTS_COVERAGE');
  assert.equal(partialSummary.activeLeagueMean, null, 'activeLeagueMean must be null when coverage is partial');
  assert.equal(partialSummary.home.rank, null, 'Home rank must be null when coverage is partial');
  assert.equal(partialSummary.away.rank, null, 'Away rank must be null when coverage is partial');
  assert.equal(partialSummary.home.oq.gapVsActive, null, 'gapVsActive must be null when coverage is partial');
  assert.equal(partialSummary.away.oq.gapVsActive, null, 'gapVsActive must be null when coverage is partial');
  assert.equal(partialSummary.home.rating, 1500.0);

  // 8.b: Zero L5 coverage (n_opponents_observed = 0)
  const zeroOqTarget = structuredClone(serieAFiRaw.target_matches[0]);
  zeroOqTarget.opponent_quality.home = {
    opp_strength_l5_avg: null,
    schedule_difficulty_vs_active_mean: null,
    schedule_difficulty_vs_nominal_anchor: null,
    opp_strength_l5_contextualized_gap_avg: null,
    n_opponents_observed: 0,
    n_contextualized_gaps_observed: 0,
    flags: ['INSUFFICIENT_L5_HISTORY', 'NO_CONTEXTUALIZED_GAP_L5']
  };
  assert.equal(validateFiMatchRecord(zeroOqTarget, 'target').valid, true);

  const zeroOqSummary = buildFiMatchSummary({
    available: true,
    matched: true,
    status: 'MATCHED',
    association: {
      matched: true,
      target: zeroOqTarget,
      expectedParticipants: 20,
      leagueName: 'Serie A',
      canonicalLeagueName: 'Serie A'
    }
  });
  assert.equal(zeroOqSummary.home.oq.nObs, 0);
  assert.equal(zeroOqSummary.home.oq.avgL5, null, 'avgL5 must be null when nObs is 0');
  assert.equal(zeroOqSummary.home.oq.gapVsActive, null, 'gapVsActive must be null when nObs is 0');
  assert.equal(zeroOqSummary.home.oq.notes.length, 2);

  // 8.c: Partial L5 coverage (n_opponents_observed = 2 < 5 with flags)
  const shortOqTarget = structuredClone(serieAFiRaw.target_matches[0]);
  shortOqTarget.opponent_quality.home.n_opponents_observed = 2;
  shortOqTarget.opponent_quality.home.n_contextualized_gaps_observed = 1;
  shortOqTarget.opponent_quality.home.flags = ['INSUFFICIENT_L5_HISTORY', 'PARTIAL_CONTEXTUALIZED_GAP_L5'];
  assert.equal(validateFiMatchRecord(shortOqTarget, 'target').valid, true);

  const shortOqSummary = buildFiMatchSummary({
    available: true,
    matched: true,
    status: 'MATCHED',
    association: {
      matched: true,
      target: shortOqTarget,
      expectedParticipants: 20,
      leagueName: 'Serie A',
      canonicalLeagueName: 'Serie A'
    }
  });
  assert.equal(shortOqSummary.home.oq.nObs, 2);
  assert.equal(shortOqSummary.home.oq.nCtx, 1);
  assert.equal(shortOqSummary.home.oq.notes.length, 2);
  for (const note of shortOqSummary.home.oq.notes) {
    assert.ok(!note.includes('_'), `Translated note "${note}" must not contain raw snake_case flags`);
  }

  console.log('  ✓ Test 8 passed: Partial season coverage, 0/5 L5 coverage, and partial L5 coverage verified.\n');
}

// -----------------------------------------------------------------------------
// TEST 9: Documented Rivalry Card Semantics & Absence of False Negative Claims
// -----------------------------------------------------------------------------
console.log('[TEST 9] Documented Rivalry Presentation & Contract Guardrails');
{
  const validatedSerieA = validateAndIndexFiEnvelope(serieAFiRaw, 'SerieA');

  // 9.a: Real historical documented derby (Derby della Madonnina: LOCAL_DERBY -> "Derby documenté")
  const madonninaMatch = validatedSerieA.historicalMatches.find(
    m => m.rivalry_intelligence?.rivalry_name === 'Derby della Madonnina'
  );
  assert.ok(madonninaMatch, 'Derby della Madonnina must exist in historical matches');
  const madonninaPres = resolveRivalryPresentation(madonninaMatch.rivalry_intelligence);
  assert.equal(madonninaPres.isDocumentedRivalry, true);
  assert.equal(madonninaPres.badgeLabel, 'Rivalité documentée');
  assert.equal(madonninaPres.categoryLabel, 'Derby documenté', 'LOCAL_DERBY must be presented as "Derby documenté"');
  assert.equal(madonninaPres.rivalryName, 'Derby della Madonnina');
  assert.equal(madonninaPres.geographicScope, madonninaMatch.rivalry_intelligence.geographic_scope);
  assert.equal(madonninaPres.establishedSince, madonninaMatch.rivalry_intelligence.established_since);

  // 9.b: Real historical documented rivalry (Derby d'Italia: HISTORIC_RIVALRY -> "Rivalité historique")
  const italiaMatch = validatedSerieA.historicalMatches.find(
    m => m.rivalry_intelligence?.rivalry_name === "Derby d'Italia"
  );
  assert.ok(italiaMatch, "Derby d'Italia must exist in historical matches");
  const italiaPres = resolveRivalryPresentation(italiaMatch.rivalry_intelligence);
  assert.equal(italiaPres.isDocumentedRivalry, true);
  assert.equal(italiaPres.categoryLabel, 'Rivalité historique');
  assert.equal(italiaPres.geographicScope, italiaMatch.rivalry_intelligence.geographic_scope);
  assert.equal(italiaPres.establishedSince, italiaMatch.rivalry_intelligence.established_since);

  // 9.c: Non-recorded and non-evaluated states must have isDocumentedRivalry = false
  const notRecPres = resolveRivalryPresentation({
    status: 'NOT_RECORDED_IN_PILOT_REGISTRY',
    is_rivalry: false,
    category: null,
    decision_effect: 'NONE'
  });
  assert.equal(notRecPres.isDocumentedRivalry, false);
  assert.equal(notRecPres.badgeLabel, null);

  const notEvalPres = resolveRivalryPresentation({
    status: 'NOT_EVALUATED',
    is_rivalry: null,
    category: null,
    decision_effect: 'NONE'
  });
  assert.equal(notEvalPres.isDocumentedRivalry, false);
  assert.equal(notEvalPres.badgeLabel, null);

  console.log('  ✓ Test 9 passed: Documented rivalries and non-documented states strictly follow contract semantics.\n');
}

// -----------------------------------------------------------------------------
// TEST 10: Concurrent Request Deduplication, Failure Classification & Cache Recovery
// -----------------------------------------------------------------------------
console.log('[TEST 10] Concurrent Request Deduplication, Failure Classification & Cache Recovery');
{
  clearFootballIntelligenceCache();
  let networkCount = 0;

  const mockConcurrentFetch = async () => {
    networkCount++;
    await new Promise(r => setTimeout(r, 15));
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => serieAFiRaw
    };
  };

  const manifestOverride = {
    footballIntelligence: ['/data/titanium_v2/football_intelligence/multileague/football_intelligence_serie_a.json']
  };

  const serieAPreds = predictionsRaw.filter(p => p.League === 'SerieA');
  const serieBMatch = predictionsRaw.find(p => p.League === 'SerieB');

  // Fire all 10 Serie A matches + 1 Serie B match concurrently via Promise.all
  const results = await Promise.all([
    ...serieAPreds.map(m => loadFootballIntelligenceForMatch(m, { fetchFn: mockConcurrentFetch, manifestOverride })),
    loadFootballIntelligenceForMatch(serieBMatch, { fetchFn: mockConcurrentFetch, manifestOverride })
  ]);

  assert.equal(networkCount, 1, 'Concurrent loads across 10 Serie A + 1 Serie B matches must trigger exactly 1 fetch');
  for (let i = 0; i < 10; i++) {
    assert.equal(results[i].matched, true);
    assert.equal(results[i].association.target.match_id, serieAPreds[i].Match_ID);
  }
  assert.equal(results[10].available, false);
  assert.equal(results[10].status, 'LEAGUE_UNSUPPORTED');

  // Verify HTTP 500 error handling & classification
  clearFootballIntelligenceCache();
  const mockHttp500 = async () => ({
    ok: false,
    status: 500,
    headers: { get: () => 'application/json' }
  });
  const errRes = await loadFootballIntelligenceForMatch(serieAPreds[0], { fetchFn: mockHttp500, manifestOverride });
  assert.equal(errRes.available, false);
  assert.equal(errRes.status, 'HTTP_ERROR');
  assert.equal(classifyFiState(errRes), 'error');
  assert.ok(!getUserFriendlyFiMessage(errRes).includes('_'));

  // Verify transient NETWORK_ERROR is evicted from cache so subsequent retry succeeds
  clearFootballIntelligenceCache();
  let attempt = 0;
  const mockFlakyFetch = async () => {
    attempt++;
    if (attempt === 1) {
      throw new Error('Simulated transient socket hang up');
    }
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => serieAFiRaw
    };
  };

  const firstAttempt = await loadFootballIntelligenceForMatch(serieAPreds[0], { fetchFn: mockFlakyFetch, manifestOverride });
  assert.equal(firstAttempt.status, 'NETWORK_ERROR');
  assert.equal(classifyFiState(firstAttempt), 'error');
  assert.equal(getFootballIntelligenceCacheSize(), 0, 'Transient NETWORK_ERROR must be evicted from cache');

  const secondAttempt = await loadFootballIntelligenceForMatch(serieAPreds[0], { fetchFn: mockFlakyFetch, manifestOverride });
  assert.equal(secondAttempt.matched, true, 'Retry after transient network error must succeed');
  assert.equal(getFootballIntelligenceCacheSize(), 1);

  console.log('  ✓ Test 10 passed: Concurrent cache sharing, error classification, and transient retry verified.\n');
}

// -----------------------------------------------------------------------------
// TEST 11: Phase B Structural & Semantic Guardrails on Source Files
// -----------------------------------------------------------------------------
console.log('[TEST 11] Phase B Structural & Semantic Guardrails on Source Files');
{
  const dashboardCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/MatchDashboard.jsx'), 'utf8');
  const summariesCode = fs.readFileSync(
    path.join(ROOT_DIR, 'src/components/dashboard/FootballIntelligenceSummaries.jsx'),
    'utf8'
  );
  const normalizedSummariesCode = summariesCode.replace(/&apos;/g, "'");
  const appCode = fs.readFileSync(path.join(ROOT_DIR, 'src/App.jsx'), 'utf8');
  const tabSeriesCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/dashboard/TabSeries.jsx'), 'utf8');
  const tabNarrativeCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/dashboard/TabNarrative.jsx'), 'utf8');

  // 11.a: MatchDashboard.jsx must use derived fiLoading and eager match-scoped loading
  assert.ok(!dashboardCode.includes('loadingFi'), 'MatchDashboard.jsx must not use legacy loadingFi state');
  assert.ok(!dashboardCode.includes('isFiRequested'), 'MatchDashboard.jsx must not gate FI fetch onintelligence tab');
  assert.ok(dashboardCode.includes('<FiEloSummaryStrip'), 'MatchDashboard.jsx must render FiEloSummaryStrip');
  assert.ok(dashboardCode.includes('<FiOpponentQualitySummary'), 'MatchDashboard.jsx must render FiOpponentQualitySummary');
  assert.ok(dashboardCode.includes('<FiDocumentedRivalryCard'), 'MatchDashboard.jsx must render FiDocumentedRivalryCard');

  // 11.b: FootballIntelligenceSummaries.jsx must satisfy all §16 semantic contract requirements
  const requiredSummaryPhrases = [
    'Indice Elo avant-match',
    'data-testid="fi-elo-strip-league"',
    'Couverture saisonnière incomplète',
    'Historique récent insuffisant',
    'Niveau Elo moyen des derniers adversaires (Opponent Quality L5)',
    'Écart vs moyenne active actuelle du championnat',
    'Couverture L5 :',
    'Registre partiel de rivalités',
    "Indice de force descriptif — ce n'est ni une probabilité de victoire ni une cote.",
    'Difficulté du calendrier passé — distincte de la forme V/N/D, des séries et des streaks.',
    'if (!rivalry || !rivalry.isDocumentedRivalry)',
    'data-no-swipe="true"'
  ];
  for (const phrase of requiredSummaryPhrases) {
    assert.ok(
      normalizedSummariesCode.includes(phrase),
      `FootballIntelligenceSummaries.jsx must include "${phrase}"`
    );
  }

  // 11.c: Forbid positive conflation labels and maintenance metadata leaks in FootballIntelligenceSummaries.jsx
  const forbiddenSummaryPatterns = [
    'Probabilité Elo',
    'Cote Elo',
    'Forme Elo',
    'provenance_count',
    'rivalry_id',
    '.source',
    'cutoff',
    '_metadata_'
  ];
  for (const forbidden of forbiddenSummaryPatterns) {
    assert.ok(
      !normalizedSummariesCode.includes(forbidden),
      `FootballIntelligenceSummaries.jsx must never contain "${forbidden}"`
    );
  }

  // 11.d: App.jsx, TabSeries.jsx, and TabNarrative.jsx must remain untouched by Football Intelligence imports
  assert.ok(!appCode.includes('footballIntelligenceLoader'), 'App.jsx must not import footballIntelligenceLoader');
  assert.ok(!tabSeriesCode.includes('footballIntelligenceLoader'), 'TabSeries.jsx must not import footballIntelligenceLoader');
  assert.ok(!tabNarrativeCode.includes('footballIntelligenceLoader'), 'TabNarrative.jsx must not import footballIntelligenceLoader');

  console.log('  ✓ Test 11 passed: All Phase B structural and semantic guardrails verified.\n');
}

console.log('=== ALL WEB-FI-001 PHASE A & PHASE B TESTS PASSED SUCCESSFULLY (11/11) ===');
