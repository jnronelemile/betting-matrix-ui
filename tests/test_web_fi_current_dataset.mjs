import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FI_LEAGUE_REGISTRY, resolveFiLeagueConfig, normalizeSeasonKey, validateAndIndexFiEnvelope, associatePredictionWithFiTarget, loadFootballIntelligenceForMatch, resolveFiArtifactUrl, clearFootballIntelligenceCache } from '../src/utils/footballIntelligenceLoader.js';
import { selectDeterministicPredictionFile } from '../src/utils/titaniumLoader.js';

const base = 'public/data/titanium_v2';
const predictionsDir = path.join(base, 'predictions');
const predictions = JSON.parse(fs.readFileSync(path.join(predictionsDir, selectDeterministicPredictionFile(fs.readdirSync(predictionsDir))), 'utf8'));
const paths = fs.readdirSync(path.join(base, 'football_intelligence', 'multileague')).filter(f => f.endsWith('.json')).map(f => `/data/titanium_v2/football_intelligence/multileague/${f}`);
const manifestOverride = { footballIntelligence: paths };
assert.equal(FI_LEAGUE_REGISTRY.length, 29);
const aliases = FI_LEAGUE_REGISTRY.flatMap(config => config.webLeagueKeys);
assert.equal(new Set(aliases).size, aliases.length);
// Verified against the published 8445eaa artifact metadata and participant counts.
const expectedContracts = new Map([
  [
    "SUPERLIGAEN",
    [
      211,
      "FE-009",
      "recurrent_211_descriptive",
      12
    ]
  ],
  [
    "KLEAGUE1",
    [
      307,
      "FE-009",
      "tier4_307_descriptive",
      12
    ]
  ],
  [
    "BELGIANPROLEAGUE",
    [
      204,
      "FE-009",
      "bel1_regular_descriptive",
      18
    ]
  ],
  [
    "EKSTRAKLASA",
    [
      209,
      "FE-009",
      "pol1_descriptive_pilot",
      18
    ]
  ],
  [
    "J1LEAGUE",
    [
      308,
      "FE-009",
      "recurrent_308_descriptive",
      20
    ]
  ],
  [
    "SERIEB",
    [
      103,
      "FE-009",
      "serie_b_descriptive_pilot",
      20
    ]
  ],
  [
    "CHAMPIONSHIP",
    [
      101,
      "FE-009",
      "championship_descriptive_pilot",
      24
    ]
  ],
  [
    "RUSSIANPREMIERLEAGUE",
    [
      203,
      "FE-009",
      "rus1_descriptive_pilot",
      16
    ]
  ],
  [
    "SCOTTISHPREMIERSHIP",
    [
      201,
      "FE-009",
      "recurrent_201_descriptive",
      12
    ]
  ],
  [
    "SPERLIG",
    [
      202,
      "FE-009",
      "tur1_descriptive_pilot",
      18
    ]
  ],
  [
    "MAJORLEAGUESOCCER",
    [
      304,
      "FE-009",
      "recurrent_304_descriptive",
      30
    ]
  ],
  [
    "LIGUE2",
    [
      105,
      "FE-009",
      "ligue_2_descriptive_pilot",
      18
    ]
  ],
  [
    "ELITESERIEN",
    [
      301,
      "FE-009",
      "recurrent_301_descriptive",
      16
    ]
  ],
  [
    "ALLSVENSKAN",
    [
      302,
      "FE-009",
      "recurrent_302_descriptive",
      16
    ]
  ],
  [
    "SWISSSUPERLEAGUE",
    [
      205,
      "FE-009",
      "sui1_regular_descriptive",
      12
    ]
  ],
  [
    "2BUNDESLIGA",
    [
      102,
      "FE-009",
      "bundesliga_2_descriptive_pilot",
      18
    ]
  ],
  [
    "AUSTRIANBUNDESLIGA",
    [
      206,
      "FE-009",
      "aut1_regular_descriptive",
      12
    ]
  ],
  [
    "LALIGA2",
    [
      104,
      "FE-009",
      "laliga_2_descriptive_pilot",
      22
    ]
  ],
  [
    "BRAZILIANSERIEA",
    [
      303,
      "FE-009",
      "tier4_303_descriptive",
      20
    ]
  ],
  [
    "LIGAMX",
    [
      230,
      "FE-009",
      "recurrent_230_descriptive",
      18
    ]
  ],
  [
    "PL",
    [
      47,
      "FE-003",
      "operational_premier_league",
      20
    ]
  ],
  [
    "LALIGA",
    [
      87,
      "FE-009",
      "laliga_descriptive_pilot",
      20
    ]
  ],
  [
    "SERIEA",
    [
      55,
      "FE-009",
      "serie_a_descriptive_pilot",
      20
    ]
  ],
  [
    "BUNDESLIGA",
    [
      54,
      "FE-009",
      "bundesliga_descriptive_pilot",
      18
    ]
  ],
  [
    "LIGUE1",
    [
      53,
      "FE-009",
      "ligue_1_descriptive_pilot",
      18
    ]
  ],
  [
    "LIGAPORTUGAL",
    [
      61,
      "FE-009",
      "liga_portugal_descriptive_pilot",
      18
    ]
  ],
  [
    "EREDIVISIE",
    [
      57,
      "FE-009",
      "eredivisie_descriptive_pilot",
      18
    ]
  ]
]);
const entries = [...new Set(predictions.map(p => p.League))].map(key => {
  const config = resolveFiLeagueConfig(key);
  assert.ok(config, key);
  const url = paths.find(p => config.allowedFileBasenames.includes(path.basename(p)));
  assert.ok(url, key);
  const expected = expectedContracts.get(config.webLeagueKeys[0]);
  assert.ok(expected, key);
  return [key, ...expected, url];
});
assert.equal(entries.length, 27);
assert.equal(normalizeSeasonKey('2026'), '2026');
assert.equal(normalizeSeasonKey('2026-2028'), null);
let total = 0;
for (const [key, id, profile, scope, count, url] of entries) {
  const raw = JSON.parse(fs.readFileSync(`public${url}`, 'utf8'));
  assert.equal(raw._metadata_.league_id, id);
  assert.equal(raw._metadata_.task_id, profile);
  assert.equal(resolveFiLeagueConfig(key).leagueId, id);
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
    const otherLeague = entries.find(([other]) => other !== key)[0];
    assert.equal(associatePredictionWithFiTarget({ ...match, League: otherLeague }, validated).matched, false);
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
assert.equal(total, predictions.length);
assert.equal(total, 241);
console.log(`${total} current-session matches associated`);
