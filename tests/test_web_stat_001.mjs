import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isValidDateComponents,
  parseMatrixGenerationTimestamp,
  parseSessionTimestamp,
  selectDeterministicPredictionFile,
  normalizeBatchStem,
  selectMatchingFixturesFile,
  getThreeClosestLines,
  getNearestLine,
  canonicalSessionId
} from '../src/utils/titaniumLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== DÉBUT DE LA SUITE DE TESTS CIBLÉS WEB-STAT-001 ===\n');

// -----------------------------------------------------------------------------
// TEST 1 : Refus explicite des sessions et matrices introuvables (BLOCKER-01)
// -----------------------------------------------------------------------------
console.log('[TEST 1] Refus explicite sans repli silencieux');
const samplePredictions = [
  'Run_matches-to-predict_Week-04_Octobre-2026___2026-10-23_23h25m25s_VALUE_BETTING_MATRIX_2026-10-24_00h00m15s.json',
  'Run_matches-to-predict_Week-04_Octobre-2026___2026-10-26_22h37m28s_VALUE_BETTING_MATRIX_2026-10-26_23h07m42s.json'
];

// 1.a : Fichier demandé inexistant -> doit retourner null
const notFoundFile = selectDeterministicPredictionFile(samplePredictions, {
  predictionFile: 'Run_nonexistent_matrix.json'
});
assert.equal(notFoundFile, null, 'Doit retourner null quand predictionFile est inexistant');

// 1.b : Session demandée inexistante -> doit retourner null
const notFoundSession = selectDeterministicPredictionFile(samplePredictions, {
  sessionId: 'Run_nonexistent_session___2026-01-01_00h00m00s'
});
assert.equal(notFoundSession, null, 'Doit retourner null quand sessionId est introuvable');

// 1.c : Fichier demandé existant -> doit retourner exactement ce fichier
const foundFile = selectDeterministicPredictionFile(samplePredictions, {
  predictionFile: samplePredictions[0]
});
assert.equal(foundFile, samplePredictions[0], 'Doit retourner exactement le fichier demandé');

// 1.d : Session demandée existante -> doit retourner la matrice de cette session
const foundSession = selectDeterministicPredictionFile(samplePredictions, {
  sessionId: 'Run_matches-to-predict_Week-04_Octobre-2026___2026-10-23_23h25m25s'
});
assert.equal(foundSession, samplePredictions[0], 'Doit retourner la matrice correspondant à la session 23 oct.');

// 1.e : Aucune option -> doit retourner la plus récente (26 oct.)
const defaultLatest = selectDeterministicPredictionFile(samplePredictions);
assert.equal(defaultLatest, samplePredictions[1], 'Doit retourner la matrice la plus récente par défaut');
console.log('  ✓ Test 1 validé avec succès (aucun repli silencieux).\n');

// -----------------------------------------------------------------------------
// TEST 2 : Validation calendaire et robustesse des timestamps (MAJOR-02)
// -----------------------------------------------------------------------------
console.log('[TEST 2] Validation calendaire et extraction temporelle');

// 2.a : Composantes calendaires valides et invalides
assert.equal(isValidDateComponents(2026, 10, 26, 23, 7, 42), true);
assert.equal(isValidDateComponents(2026, 2, 28, 12, 0, 0), true);
assert.equal(isValidDateComponents(2024, 2, 29, 12, 0, 0), true); // 2024 est bissextile
assert.equal(isValidDateComponents(2026, 2, 29, 12, 0, 0), false); // 2026 non bissextile
assert.equal(isValidDateComponents(2026, 2, 30, 12, 0, 0), false); // 30 février impossible
assert.equal(isValidDateComponents(2026, 13, 1, 0, 0, 0), false); // Mois 13 impossible
assert.equal(isValidDateComponents(2026, 10, 32, 0, 0, 0), false); // Jour 32 impossible
assert.equal(isValidDateComponents(2026, 10, 26, 25, 0, 0), false); // Heure 25 impossible
assert.equal(isValidDateComponents(2026, 10, 26, 23, 60, 0), false); // Minute 60 impossible

// 2.b : Rejet des chaînes avec dates invalides
assert.equal(parseMatrixGenerationTimestamp('VALUE_BETTING_MATRIX_2026-02-30_12h00m00s'), 0);
assert.equal(parseMatrixGenerationTimestamp('VALUE_BETTING_MATRIX_2026-13-01_10h00m00s'), 0);
assert.equal(parseMatrixGenerationTimestamp('VALUE_BETTING_MATRIX_2026-10-26_25h00m00s'), 0);

// 2.c : Matrice TITANIUM V2 standard
const tV2 = parseMatrixGenerationTimestamp('Run_matches-to-predict_Week-04_Octobre-2026___2026-10-26_22h37m28s_VALUE_BETTING_MATRIX_2026-10-26_23h07m42s.json');
assert.equal(tV2, Date.UTC(2026, 9, 26, 23, 7, 42));

// 2.d : Matrice historique versionnée (ex: _v8.5_)
const tHist = parseMatrixGenerationTimestamp('BACKTEST-LIGA_VALUE_BETTING_MATRIX_v8.5_2026-05-21_13h39m17s.json');
assert.equal(tHist, Date.UTC(2026, 4, 21, 13, 39, 17), 'Doit conserver l’heure/minute/seconde des matrices versionnées');

// 2.e : Format run_id moteur à double timestamp
const tRunId = parseMatrixGenerationTimestamp('RUN_Run_matches-to-predict_Week-04_Octobre-2026___2026-10-26_22h37m28s_2026-10-26_23h07m42s');
assert.equal(tRunId, Date.UTC(2026, 9, 26, 23, 7, 42), 'Doit extraire le 2nd timestamp (génération de matrice) du run_id');

// 2.f : Session timestamp
const tSess = parseSessionTimestamp('Run_matches-to-predict_Week-04_Octobre-2026___2026-10-26_22h37m28s_VALUE_BETTING_MATRIX_2026-10-26_23h07m42s.json');
assert.equal(tSess, Date.UTC(2026, 9, 26, 22, 37, 28));

console.log('  ✓ Test 2 validé avec succès (validation calendaire stricte & formats historiques supportés).\n');

// -----------------------------------------------------------------------------
// TEST 3 : Correspondance déterministe matrice / fixtures (MAJOR-01)
// -----------------------------------------------------------------------------
console.log('[TEST 3] Correspondance déterministe matrice / matches_to_predict');

// 3.a : Normalisation du batch stem
const stemPred = normalizeBatchStem('Run_matches-to-predict_Week-04_Octobre-2026___2026-10-26_22h37m28s_VALUE_BETTING_MATRIX_2026-10-26_23h07m42s.json');
const stemMatch = normalizeBatchStem('matches_to_predict_Week-04-Octobre-2026.json');
assert.equal(stemPred, 'matches_to_predict_week_04_octobre_2026');
assert.equal(stemMatch, 'matches_to_predict_week_04_octobre_2026');
assert.equal(stemPred, stemMatch);

// 3.b : Sélection exacte parmi plusieurs fixtures
const multiMatches = [
  'matches_to_predict_Week-02-Octobre-2026.json',
  'matches_to_predict_Week-04-Octobre-2026.json'
];
const matchedFixtures = selectMatchingFixturesFile(multiMatches, 'Run_matches-to-predict_Week-04_Octobre-2026___2026-10-26_22h37m28s_VALUE_BETTING_MATRIX_2026-10-26_23h07m42s.json');
assert.equal(matchedFixtures, 'matches_to_predict_Week-04-Octobre-2026.json');

// 3.c : Rejet (fail-closed) si un seul fichier fixtures appartient à une autre semaine
const incompatibleSingle = ['matches_to_predict_Week-02-Octobre-2026.json'];
const rejectedFixtures = selectMatchingFixturesFile(incompatibleSingle, 'Run_matches-to-predict_Week-04_Octobre-2026___2026-10-26_22h37m28s_VALUE_BETTING_MATRIX_2026-10-26_23h07m42s.json');
assert.equal(rejectedFixtures, null, 'Ne doit pas associer Week-02 à une matrice Week-04');

console.log('  ✓ Test 3 validé avec succès (isolation des fixtures par batch stem).\n');

// -----------------------------------------------------------------------------
// TEST 4 : Sélection des 3 lignes pivots et protection lambda / probabilités (MAJOR-04)
// -----------------------------------------------------------------------------
console.log('[TEST 4] Sélection des 3 lignes pivots et gestion des probabilités');

const cornersCatalogue = [
  { Line: 2.5, Probability_Over: 0.912, Probability_Under: 0.088 },
  { Line: 3.5, Probability_Over: 0.785, Probability_Under: 0.215 },
  { Line: 4.5, Probability_Over: 0.584, Probability_Under: 0.416 },
  { Line: 5.5, Probability_Over: 0.372, Probability_Under: 0.628 },
  { Line: 6.5, Probability_Over: 0.198, Probability_Under: 0.802 },
  { Line: 7.5, Probability_Over: 0.089, Probability_Under: 0.911 }
];

// 4.a : λ = 5.2 -> Pivot = 5.5, 3 lignes retenues : 3.5, 4.5, 5.5 ou 4.5, 5.5, 6.5
const p52 = getNearestLine(cornersCatalogue, 5.2);
assert.equal(p52, 5.5, 'Pivot pour lambda 5.2 doit être 5.5');
const lines52 = getThreeClosestLines(cornersCatalogue, 5.2);
assert.equal(lines52.length, 3);
assert.deepEqual(lines52.map(l => l.Line), [4.5, 5.5, 6.5]);

// 4.b : Borne inférieure (λ = 1.0) -> Pivot = 2.5, lignes = 2.5, 3.5, 4.5
const pLow = getNearestLine(cornersCatalogue, 1.0);
assert.equal(pLow, 2.5);
const linesLow = getThreeClosestLines(cornersCatalogue, 1.0);
assert.deepEqual(linesLow.map(l => l.Line), [2.5, 3.5, 4.5]);

// 4.c : Borne supérieure (λ = 10.0) -> Pivot = 7.5, lignes = 5.5, 6.5, 7.5
const pHigh = getNearestLine(cornersCatalogue, 10.0);
assert.equal(pHigh, 7.5);
const linesHigh = getThreeClosestLines(cornersCatalogue, 10.0);
assert.deepEqual(linesHigh.map(l => l.Line), [5.5, 6.5, 7.5]);

// 4.d : Catalogue Touches (10 lignes)
const throwsCatalogue = [
  { Line: 15.5, Probability_Over: 0.88, Probability_Under: 0.12 },
  { Line: 16.5, Probability_Over: 0.82, Probability_Under: 0.18 },
  { Line: 17.5, Probability_Over: 0.74, Probability_Under: 0.26 },
  { Line: 18.5, Probability_Over: 0.65, Probability_Under: 0.35 },
  { Line: 19.5, Probability_Over: 0.55, Probability_Under: 0.45 },
  { Line: 20.5, Probability_Over: 0.45, Probability_Under: 0.55 },
  { Line: 21.5, Probability_Over: 0.35, Probability_Under: 0.65 },
  { Line: 22.5, Probability_Over: 0.26, Probability_Under: 0.74 },
  { Line: 23.5, Probability_Over: 0.18, Probability_Under: 0.82 },
  { Line: 24.5, Probability_Over: 0.12, Probability_Under: 0.88 }
];
const pThrows = getNearestLine(throwsCatalogue, 20.4);
assert.equal(pThrows, 20.5, 'Pivot pour lambda 20.4 doit être 20.5');
const linesThrows = getThreeClosestLines(throwsCatalogue, 20.4);
assert.deepEqual(linesThrows.map(l => l.Line), [19.5, 20.5, 21.5]);

// 4.e : Protection contre les faux pivots quand lambda est null / undefined / NaN
assert.equal(getNearestLine(cornersCatalogue, null), null, 'getNearestLine avec lambda=null doit retourner null');
assert.equal(getNearestLine(cornersCatalogue, undefined), null, 'getNearestLine avec lambda=undefined doit retourner null');
assert.equal(getNearestLine(cornersCatalogue, NaN), null, 'getNearestLine avec lambda=NaN doit retourner null');

// 4.f : Quand lambda est null, getThreeClosestLines retourne les 3 premières lignes sans crash
const linesNullLambda = getThreeClosestLines(cornersCatalogue, null);
assert.equal(linesNullLambda.length, 3);
assert.deepEqual(linesNullLambda.map(l => l.Line), [2.5, 3.5, 4.5]);

// 4.g : Robustesse face aux entrées malformées dans le catalogue
const malformedCatalogue = [
  null,
  { Line: undefined },
  { Line: 3.5, Probability_Over: null, Probability_Under: 0.5 },
  { Line: 4.5, Probability_Over: 0.0, Probability_Under: 1.0 }, // Vraie probabilité 0.0
  { Line: 5.5, Probability_Over: 0.3, Probability_Under: 0.7 }
];
const pMalformed = getNearestLine(malformedCatalogue, 4.4);
assert.equal(pMalformed, 4.5, 'Doit ignorer les entrées nulles et identifier 4.5');
const linesMalformed = getThreeClosestLines(malformedCatalogue, 4.4);
assert.equal(linesMalformed.length, 3);
assert.deepEqual(linesMalformed.map(l => l.Line), [3.5, 4.5, 5.5]);

// 4.h : Préservation de la vraie probabilité 0.0 vs valeur manquante (null)
const zeroLine = linesMalformed.find(l => l.Line === 4.5);
const nullProbLine = linesMalformed.find(l => l.Line === 3.5);
const formatProb = (p) => Number.isFinite(p) ? `${(p * 100).toFixed(1)}%` : '-';
assert.equal(formatProb(zeroLine.Probability_Over), '0.0%', 'Une vraie probabilité 0.0 doit afficher 0.0%');
assert.equal(formatProb(nullProbLine.Probability_Over), '-', 'Une probabilité null doit afficher "-"');

console.log('  ✓ Test 4 validé avec succès (aucun faux pivot, zéro préservé, 3 lignes exactes).\n');

// -----------------------------------------------------------------------------
// TEST 5 : Vérification d'intégrité sur les données réelles du dépôt
// -----------------------------------------------------------------------------
console.log('[TEST 5] Contrôle sur les 249 matchs de la session active du 26 oct.');
const matrixPath = path.join(rootDir, 'public/data/titanium_v2/predictions/Run_matches-to-predict_Week-04_Octobre-2026___2026-10-26_22h37m28s_VALUE_BETTING_MATRIX_2026-10-26_23h07m42s.json');
const matrixRaw = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

assert.equal(matrixRaw.length, 249, 'La matrice du 26 oct. doit contenir 249 matchs');

let matchesWithTeamStatMarkets = 0;
let matchesWithThrows = 0;
let calculatedFamiliesCount = 0;

for (const match of matrixRaw) {
  if (match.Team_Stat_Markets) {
    matchesWithTeamStatMarkets++;
    assert.equal(match.Team_Stat_Markets.Status, 'CALCULATED');
    assert.equal(match.Team_Stat_Markets.Catalogue_Version, '1.1');
    const fams = match.Team_Stat_Markets.Families || [];
    for (const fam of fams) {
      if (fam.Market_Type === 'TEAM_THROWS' || fam.Family === 'TEAM_THROWS') {
        matchesWithThrows++;
      }
      if (fam.Status === 'CALCULATED') {
        calculatedFamiliesCount++;
        // Tester Home et Away
        assert.ok(fam.Home && Array.isArray(fam.Home.Lines));
        assert.ok(fam.Away && Array.isArray(fam.Away.Lines));
        // Tester getThreeClosestLines et getNearestLine sur chaque match réel
        const hNearest = getNearestLine(fam.Home.Lines, fam.Home.Lambda);
        const aNearest = getNearestLine(fam.Away.Lines, fam.Away.Lambda);
        assert.ok(Number.isFinite(hNearest));
        assert.ok(Number.isFinite(aNearest));
        const h3 = getThreeClosestLines(fam.Home.Lines, fam.Home.Lambda);
        const a3 = getThreeClosestLines(fam.Away.Lines, fam.Away.Lambda);
        assert.equal(h3.length, 3);
        assert.equal(a3.length, 3);
      }
    }
  }
}

assert.equal(matchesWithTeamStatMarkets, 249, 'Les 249 matchs ont Team_Stat_Markets V1.1');
assert.equal(matchesWithThrows, 249, 'Les 249 matchs ont la famille TEAM_THROWS');
console.log(`  ✓ Test 5 validé sur ${matchesWithTeamStatMarkets} matchs et ${calculatedFamiliesCount} familles de marché réelles.\n`);

console.log('=== TOUS LES TESTS UNITAIRES ET D’INTÉGRITÉ ONT RÉUSSI (5/5) ===');
