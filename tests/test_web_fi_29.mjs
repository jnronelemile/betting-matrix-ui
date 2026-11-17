import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FI_LEAGUE_REGISTRY, normalizeWebLeagueKey, resolveFiLeagueConfig, validateAndIndexFiEnvelope, associatePredictionWithFiTarget, resolveFiArtifactUrl, loadFootballIntelligenceForMatch, clearFootballIntelligenceCache } from '../src/utils/footballIntelligenceLoader.js';

// Synthetic FE-009 based on the historical Serie A target fixture, not a real GRE1/Saudi artifact.
const base = JSON.parse(fs.readFileSync(new URL('./fixtures/web_fi_001/synthetic_fe009.json', import.meta.url)));
const ids = [47,53,54,55,57,61,87,101,102,103,104,105,201,202,203,204,205,206,207,209,211,230,301,302,303,304,306,307,308];
assert.deepEqual(FI_LEAGUE_REGISTRY.map(x => x.leagueId).sort((a,b)=>a-b), ids);
const aliases = FI_LEAGUE_REGISTRY.flatMap(x => x.webLeagueKeys.map(normalizeWebLeagueKey));
assert.equal(new Set(aliases).size, aliases.length);
for (const [id, name, aliases, scope, count, file] of [
  [207, 'Super League Greece', ['SUPERLEAGUEGREECE','GRE1'], 'gre1_regular_descriptive', 14, 'football_intelligence_gre1.json'],
  [306, 'Saudi Pro League', ['SAUDIPROLEAGUE'], 'tier4_306_descriptive', 18, 'football_intelligence_saudi_pro_league.json']
]) {
  const data = structuredClone(base);
  Object.assign(data._metadata_, {league_id:id, league_name:name, task_id:'FE-009', scope});
  for (const alias of aliases) assert.equal(resolveFiLeagueConfig(alias).leagueId, id);
  assert.equal(resolveFiLeagueConfig(id).expectedParticipants, count);
  const validated = validateAndIndexFiEnvelope(data, name);
  assert.equal(validated.valid, true, validated.reason);
  assert.equal(validated.expectedParticipants, count);
  assert.equal(validated.isStandingsComplete, false);
  const t = data.target_matches[0];
  const match = {League:name, Match_ID:t.match_id, Match_Date:t.date, season:'2026-2027'};
  assert.equal(associatePredictionWithFiTarget(match, validated).matched, true);
  assert.equal(associatePredictionWithFiTarget({...match, League: id === 207 ? 'Saudi Pro League' : 'GRE1'}, validated).matched, false);
  assert.equal(associatePredictionWithFiTarget({...match, Match_Date:'2026-11-01'}, validated).status, 'DATE_MISMATCH');
  assert.equal(associatePredictionWithFiTarget({...match, season:'2025-2026'}, validated).status, 'SEASON_MISMATCH');
  assert.equal(associatePredictionWithFiTarget({...match, Match_ID:'unknown'}, validated).status, 'TARGET_NOT_FOUND');
  for (const [key,value] of [['scope','wrong'],['task_id','FE-003'],['league_id',999]]) { const bad=structuredClone(data); bad._metadata_[key]=value; assert.equal(validateAndIndexFiEnvelope(bad,name).valid,false); }
  const future=structuredClone(data); future.target_matches[0].season_key='2027-2028';
  const futureResult=validateAndIndexFiEnvelope(future,name);
  assert.equal(futureResult.valid,true,futureResult.reason); assert.equal(futureResult.expectedParticipants,null); assert.equal(futureResult.isStandingsComplete,false);
  const url='/data/titanium_v2/football_intelligence/multileague/'+file;
  assert.equal(await resolveFiArtifactUrl(name,{manifestOverride:{footballIntelligence:[url]}}),url);
  assert.equal(await resolveFiArtifactUrl(name,{manifestOverride:{footballIntelligence:[]}}),null);
  assert.equal(await resolveFiArtifactUrl(name,{manifestOverride:{footballIntelligence:[url,'/duplicate/'+file]}}),null);
  clearFootballIntelligenceCache();
  const result=await loadFootballIntelligenceForMatch(match,{manifestOverride:{footballIntelligence:[url]},fetchFn:async()=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>data})});
  assert.equal(result.matched,true,result.reason);
}
console.log('29 league identities and synthetic GRE1/Saudi contracts passed');
