import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FI_LEAGUE_REGISTRY, resolveFiLeagueConfig, normalizeSeasonKey, validateAndIndexFiEnvelope, associatePredictionWithFiTarget, loadFootballIntelligenceForMatch, resolveFiArtifactUrl, clearFootballIntelligenceCache } from '../src/utils/footballIntelligenceLoader.js';
import { selectDeterministicPredictionFile } from '../src/utils/titaniumLoader.js';

const base = 'public/data/titanium_v2';
const predictionsDir = path.join(base, 'predictions');
const predictions = JSON.parse(fs.readFileSync(path.join(predictionsDir, selectDeterministicPredictionFile(fs.readdirSync(predictionsDir))), 'utf8'));
const entries = [
  ['LaLiga2', 104, 'laliga_2', 'laliga_2_descriptive_pilot', 22],
  ['BrazilianSerieA', 303, 'brazilian_serie_a', 'tier4_303_descriptive', 20],
  ['LigaMX', 230, 'liga_mx', 'recurrent_230_descriptive', 18],
];
const paths = entries.map(([, , slug]) => `/data/titanium_v2/football_intelligence/multileague/football_intelligence_${slug}.json`);
const manifestOverride = { footballIntelligence: paths };
assert.equal(FI_LEAGUE_REGISTRY.length, 10);
for (const [key, id] of [['PremierLeague',47],['LaLiga',87],['SerieA',55],['Bundesliga',54],['Ligue1',53],['LigaPortugal',61],['Eredivisie',57]]) assert.equal(resolveFiLeagueConfig(key).leagueId, id);
assert.equal(resolveFiLeagueConfig('SerieB'), null);
assert.equal(normalizeSeasonKey('2026'), '2026');
assert.equal(normalizeSeasonKey('2026-2028'), null);
let total = 0;
for (const [key, id, slug, scope, count] of entries) {
  const url = paths.find(p => p.endsWith(`football_intelligence_${slug}.json`));
  const raw = JSON.parse(fs.readFileSync(`public${url}`, 'utf8'));
  assert.equal(raw._metadata_.league_id, id);
  assert.equal(raw._metadata_.task_id, 'FE-009');
  assert.equal(raw._metadata_.scope, scope);
  assert.equal(resolveFiLeagueConfig(key).expectedParticipants, count);
  const validated = validateAndIndexFiEnvelope(raw, key);
  assert.equal(validated.valid, true, validated.reason);
  assert.equal(await resolveFiArtifactUrl(key, {manifestOverride}), url);
  assert.equal(await resolveFiArtifactUrl(key, {manifestOverride: {footballIntelligence: []}}), null);
  assert.equal(await resolveFiArtifactUrl(key, {manifestOverride: {footballIntelligence: [url, '/other/'+path.basename(url)]}}), null);
  const bad = structuredClone(raw); bad._metadata_.scope = 'wrong';
  assert.equal(validateAndIndexFiEnvelope(bad, key).valid, false);
  const matches = predictions.filter(p => p.League === key);
  for (const match of matches) {
    const association = associatePredictionWithFiTarget(match, validated);
    assert.equal(association.matched, true, `${key}: ${association.reason}`);
    assert.equal(associatePredictionWithFiTarget({...match, Match_Date: '2020-01-01'}, validated).status, 'DATE_MISMATCH');
    assert.equal(associatePredictionWithFiTarget({...match, Match_ID: 'missing'}, validated).status, 'TARGET_NOT_FOUND');
    if (key === 'BrazilianSerieA') {
      assert.equal(associatePredictionWithFiTarget({...match, season: '2026'}, validated).matched, true);
      assert.equal(associatePredictionWithFiTarget({...match, season: '2025'}, validated).status, 'SEASON_MISMATCH');
    }
    clearFootballIntelligenceCache();
    const result = await loadFootballIntelligenceForMatch(match, {manifestOverride, fetchFn: async () => ({ok: true, headers: {get: () => 'application/json'}, json: async () => raw})});
    assert.equal(result.matched, true, `${key}: ${result.reason}`);
    total++;
  }
  console.log(`${key}: ${matches.length} matches associated; ${raw._metadata_.cutoff}`);
}
assert.ok(total > 0);
console.log(`${total} current-session matches associated`);
