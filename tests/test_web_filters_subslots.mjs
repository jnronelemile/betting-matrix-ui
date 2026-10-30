import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TIME_SLOTS,
  SUB_TIME_SLOTS,
  TIME_SLOT_HIERARCHY,
  getKickoffHour,
  getLegTimeSlot,
  getLegSubTimeSlot,
  matchesTimeSlot
} from '../src/utils/ticketFilters.js';
import { selectDeterministicPredictionFile } from '../src/utils/titaniumLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('=== DÉBUT DE LA SUITE DE TESTS CIBLÉS WEB-FILTERS-001 (SOUS-CRÉNEAUX HORAIRES) ===\n');

// ---------------------------------------------------------------------------
// TEST 1 : Partition mathématique stricte et hiérarchie dans ticketFilters.js
// ---------------------------------------------------------------------------
console.log('[TEST 1] Partition mathématique stricte et hiérarchie horaire');
{
  // 1.1 Registre des 7 sous-créneaux
  const subKeys = Object.keys(SUB_TIME_SLOTS);
  assert.strictEqual(subKeys.length, 7, 'Il doit y avoir exactement 7 sous-créneaux');
  const expectedSubKeys = [
    'NUIT',
    'MATIN_TOT',
    'FIN_MATINEE',
    'DEBUT_APRES_MIDI',
    'FIN_APRES_MIDI',
    'DEBUT_SOIREE',
    'FIN_SOIREE'
  ];
  assert.deepStrictEqual(subKeys, expectedSubKeys, 'Les identifiants des 7 sous-créneaux doivent respecter la nomenclature canonique');

  // 1.2 Hiérarchie bidirectionnelle
  assert.deepStrictEqual(TIME_SLOT_HIERARCHY.NUIT, ['NUIT']);
  assert.deepStrictEqual(TIME_SLOT_HIERARCHY.MATIN, ['MATIN_TOT', 'FIN_MATINEE']);
  assert.deepStrictEqual(TIME_SLOT_HIERARCHY.APRES_MIDI, ['DEBUT_APRES_MIDI', 'FIN_APRES_MIDI']);
  assert.deepStrictEqual(TIME_SLOT_HIERARCHY.SOIR, ['DEBUT_SOIREE', 'FIN_SOIREE']);

  // 1.3 Couverture continue et sans chevauchement des 24 heures (0 à 23h)
  for (let h = 0; h < 24; h++) {
    const mockItem = { hours: `${String(h).padStart(2, '0')}:30` };
    const macro = getLegTimeSlot(mockItem);
    const sub = getLegSubTimeSlot(mockItem);

    assert(macro !== null, `L'heure ${h}h doit être associée à un macro-créneau`);
    assert(sub !== null, `L'heure ${h}h doit être associée à un sous-créneau`);
    assert(
      TIME_SLOT_HIERARCHY[macro].includes(sub),
      `Le sous-créneau ${sub} pour ${h}h doit être un enfant de ${macro}`
    );
    assert(
      matchesTimeSlot(sub, macro),
      `matchesTimeSlot(${sub}, ${macro}) doit être vrai (compatibilité ascendante)`
    );
    assert(
      matchesTimeSlot(sub, sub),
      `matchesTimeSlot(${sub}, ${sub}) doit être vrai (correspondance exacte)`
    );
  }

  // 1.4 Bornes limites exactes
  assert.strictEqual(getLegSubTimeSlot({ hours: '00:00' }), 'NUIT');
  assert.strictEqual(getLegSubTimeSlot({ hours: '04:59' }), 'NUIT');
  assert.strictEqual(getLegSubTimeSlot({ hours: '05:00' }), 'MATIN_TOT');
  assert.strictEqual(getLegSubTimeSlot({ hours: '08:59' }), 'MATIN_TOT');
  assert.strictEqual(getLegSubTimeSlot({ hours: '09:00' }), 'FIN_MATINEE');
  assert.strictEqual(getLegSubTimeSlot({ hours: '11:59' }), 'FIN_MATINEE');
  assert.strictEqual(getLegSubTimeSlot({ hours: '12:00' }), 'DEBUT_APRES_MIDI');
  assert.strictEqual(getLegSubTimeSlot({ hours: '14:59' }), 'DEBUT_APRES_MIDI');
  assert.strictEqual(getLegSubTimeSlot({ hours: '15:00' }), 'FIN_APRES_MIDI');
  assert.strictEqual(getLegSubTimeSlot({ hours: '17:59' }), 'FIN_APRES_MIDI');
  assert.strictEqual(getLegSubTimeSlot({ hours: '18:00' }), 'DEBUT_SOIREE');
  assert.strictEqual(getLegSubTimeSlot({ hours: '20:59' }), 'DEBUT_SOIREE');
  assert.strictEqual(getLegSubTimeSlot({ hours: '21:00' }), 'FIN_SOIREE');
  assert.strictEqual(getLegSubTimeSlot({ hours: '23:59' }), 'FIN_SOIREE');

  // 1.5 Gestion des cas inconnus, invalides et TBD
  assert.strictEqual(getLegSubTimeSlot({ hours: 'TBD' }), null);
  assert.strictEqual(getLegSubTimeSlot({ Heure: 'TBD' }), null);
  assert.strictEqual(getLegSubTimeSlot({ hours: '' }), null);
  assert.strictEqual(getLegSubTimeSlot(null), null);
  assert.strictEqual(getLegSubTimeSlot({}), null);

  assert.strictEqual(matchesTimeSlot(null, 'ALL'), true);
  assert.strictEqual(matchesTimeSlot(null, 'MATIN'), false);
  assert.strictEqual(matchesTimeSlot(null, 'MATIN_TOT'), false);

  console.log('  ✓ Test 1 validé : Les 7 sous-créneaux partitionnent strictement [0, 24[ et s\'imbriquent sans faille.');
}

// ---------------------------------------------------------------------------
// TEST 2 : Validation mathématique sur le jeu de données réel TITANIUM
// ---------------------------------------------------------------------------
console.log('\n[TEST 2] Validation mathématique et cohérence des décomptes sur données réelles');
{
  const predDir = path.join(ROOT_DIR, 'public/data/titanium_v2/predictions');
  const availableFiles = fs.readdirSync(predDir).filter(f => f.endsWith('.json'));
  const activeFileName = selectDeterministicPredictionFile(availableFiles);
  assert(activeFileName, 'Un fichier de prédictions actif doit être sélectionné');
  const dataPath = path.join(predDir, activeFileName);
  const matrixRaw = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  assert(Array.isArray(matrixRaw) && matrixRaw.length > 0, 'Le payload doit contenir un tableau de matchs');

  const macroCounts = { ALL: matrixRaw.length, MATIN: 0, APRES_MIDI: 0, SOIR: 0, NUIT: 0 };
  const subCounts = {
    NUIT: 0,
    MATIN_TOT: 0,
    FIN_MATINEE: 0,
    DEBUT_APRES_MIDI: 0,
    FIN_APRES_MIDI: 0,
    DEBUT_SOIREE: 0,
    FIN_SOIREE: 0
  };
  let unknownCount = 0;

  for (const match of matrixRaw) {
    const macro = getLegTimeSlot(match);
    const sub = getLegSubTimeSlot(match);

    if (macro) macroCounts[macro]++;
    if (sub) subCounts[sub]++;
    if (!macro && !sub) unknownCount++;
  }

  // Vérification de la somme exacte : Somme(enfants) === Parent
  assert.strictEqual(
    macroCounts.MATIN,
    subCounts.MATIN_TOT + subCounts.FIN_MATINEE,
    'La somme Matin tôt + Fin de matinée doit être strictement égale à Matin'
  );
  assert.strictEqual(
    macroCounts.APRES_MIDI,
    subCounts.DEBUT_APRES_MIDI + subCounts.FIN_APRES_MIDI,
    'La somme Début d\'après-midi + Fin d\'après-midi doit être strictement égale à Après-midi'
  );
  assert.strictEqual(
    macroCounts.SOIR,
    subCounts.DEBUT_SOIREE + subCounts.FIN_SOIREE,
    'La somme Début de soirée + Fin de soirée doit être strictement égale à Soir'
  );
  assert.strictEqual(
    macroCounts.NUIT,
    subCounts.NUIT,
    'Nuit doit être identique entre macro et sous-créneau'
  );

  const totalClassified = macroCounts.MATIN + macroCounts.APRES_MIDI + macroCounts.SOIR + macroCounts.NUIT;
  assert.strictEqual(
    totalClassified + unknownCount,
    matrixRaw.length,
    'Tous les matchs doivent être soit classifiés, soit recensés comme heure inconnue'
  );

  console.log(`  ✓ Test 2 validé sur ${matrixRaw.length} matchs réels (${activeFileName}) :`);
  console.log(`      Matin (${macroCounts.MATIN}) = 05h-09h (${subCounts.MATIN_TOT}) + 09h-12h (${subCounts.FIN_MATINEE})`);
  console.log(`      Après-midi (${macroCounts.APRES_MIDI}) = 12h-15h (${subCounts.DEBUT_APRES_MIDI}) + 15h-18h (${subCounts.FIN_APRES_MIDI})`);
  console.log(`      Soir (${macroCounts.SOIR}) = 18h-21h (${subCounts.DEBUT_SOIREE}) + 21h-00h (${subCounts.FIN_SOIREE})`);
  console.log(`      Nuit (${macroCounts.NUIT}) = 00h-05h (${subCounts.NUIT})`);
  if (unknownCount > 0) {
    console.log(`      Matchs avec horaire non déterminé (TBD) : ${unknownCount}`);
  }
}

// ---------------------------------------------------------------------------
// TEST 3 : Combinaison des filtres LIVE estimé et sous-créneaux horaires
// ---------------------------------------------------------------------------
console.log('\n[TEST 3] Combinaison du filtre LIVE estimé et des sous-créneaux horaires');
{
  const mockMatches = [
    { id: 1, hours: '13:00', isLiveMock: true },
    { id: 2, hours: '14:30', isLiveMock: false },
    { id: 3, hours: '16:00', isLiveMock: true },
    { id: 4, hours: '19:15', isLiveMock: false },
    { id: 5, hours: '20:45', isLiveMock: true },
    { id: 6, hours: 'TBD', isLiveMock: false }
  ];

  // Test 3.1 Filtre macro seul
  const apresMidiAll = mockMatches.filter(m => matchesTimeSlot(getLegSubTimeSlot(m), 'APRES_MIDI'));
  assert.strictEqual(apresMidiAll.length, 3, 'Après-midi doit inclure les matchs de 13:00, 14:30 et 16:00');

  // Test 3.2 Filtre sous-créneau 12h-15h
  const debutApresMidi = mockMatches.filter(m => matchesTimeSlot(getLegSubTimeSlot(m), 'DEBUT_APRES_MIDI'));
  assert.strictEqual(debutApresMidi.length, 2, 'Début d\'après-midi doit inclure 13:00 et 14:30');

  // Test 3.3 Filtre combiné LIVE + Début d'après-midi
  const liveDebutApresMidi = mockMatches.filter(m => m.isLiveMock && matchesTimeSlot(getLegSubTimeSlot(m), 'DEBUT_APRES_MIDI'));
  assert.strictEqual(liveDebutApresMidi.length, 1, 'Seul le match 1 est LIVE ET à 13:00');
  assert.strictEqual(liveDebutApresMidi[0].id, 1);

  // Test 3.4 Filtre combiné LIVE + Soir (18h-21h)
  const liveDebutSoiree = mockMatches.filter(m => m.isLiveMock && matchesTimeSlot(getLegSubTimeSlot(m), 'DEBUT_SOIREE'));
  assert.strictEqual(liveDebutSoiree.length, 1, 'Seul le match 5 est LIVE ET à 20:45');
  assert.strictEqual(liveDebutSoiree[0].id, 5);

  console.log('  ✓ Test 3 validé : Le cumul LIVE estimé + sous-créneaux fonctionne de manière univoque.');
}

// ---------------------------------------------------------------------------
// TEST 4 : Intégration et contrats d'interface dans MatchList.jsx
// ---------------------------------------------------------------------------
console.log('\n[TEST 4] Intégration dans MatchList.jsx : État, réinitialisation et rendu');
{
  const matchListPath = path.join(ROOT_DIR, 'src/components/MatchList.jsx');
  const matchListCode = fs.readFileSync(matchListPath, 'utf-8');

  // 4.1 Imports des contrats canoniques
  assert(
    matchListCode.includes('SUB_TIME_SLOTS') &&
    matchListCode.includes('TIME_SLOT_HIERARCHY') &&
    matchListCode.includes('getLegSubTimeSlot') &&
    matchListCode.includes('matchesTimeSlot'),
    'MatchList.jsx doit importer SUB_TIME_SLOTS, TIME_SLOT_HIERARCHY, getLegSubTimeSlot et matchesTimeSlot'
  );

  // 4.2 Déclaration de l'état selectedSubTimeSlot
  assert(
    matchListCode.includes("const [selectedSubTimeSlot, setSelectedSubTimeSlot] = useState('ALL');"),
    'MatchList.jsx doit déclarer selectedSubTimeSlot initialisé à ALL'
  );

  // 4.3 Réinitialisation automatique lors d'un changement de macro-créneau
  assert(
    matchListCode.includes("const handleSelectMacroSlot = (slotId) => {") &&
    matchListCode.includes("setSelectedSubTimeSlot('ALL');"),
    'handleSelectMacroSlot doit réinitialiser selectedSubTimeSlot à ALL pour éviter les incohérences'
  );

  // 4.4 Bouton "Avancé" et panneau popover compact (Correction UX WEB-FILTERS-001)
  assert(
    matchListCode.includes("const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);"),
    'MatchList.jsx doit déclarer isAdvancedOpen initialisé à false'
  );
  assert(
    matchListCode.includes('aria-haspopup="dialog"') &&
    matchListCode.includes('aria-label="Filtres horaires avancés"'),
    'Le bouton Avancé doit comporter les attributs aria-haspopup="dialog" et aria-label'
  );
  assert(
    matchListCode.includes('data-testid="sub-time-slots-popover"') &&
    matchListCode.includes('role="dialog"') &&
    !matchListCode.includes('aria-modal'),
    'Le panneau non modal doit comporter data-testid="sub-time-slots-popover", role="dialog" et PAS aria-modal'
  );

  // 4.4b Bouton Avancé icône seule + ordre chronologique explicite côté rendu
  assert(
    !/<span>Avancé<\/span>/.test(matchListCode) &&
    matchListCode.includes('<SlidersHorizontal') &&
    matchListCode.includes('aria-label={'),
    'Le bouton Avancé doit être icône seule avec nom accessible'
  );
  assert(
    matchListCode.includes("TIME_FILTER_DISPLAY_ORDER = ['ALL', 'NUIT', 'MATIN', 'APRES_MIDI', 'SOIR']"),
    "L'ordre d'affichage explicite ALL, NUIT, MATIN, APRES_MIDI, SOIR doit être défini dans MatchList"
  );
  assert(
    !matchListCode.includes('scrollIntoView'),
    'Aucun scrollIntoView (risque de saut vertical) ; recentrage via scrollTo horizontal'
  );

  // 4.5 Fermeture par clic extérieur et touche Escape
  assert(
    matchListCode.includes("e.key === 'Escape'") &&
    matchListCode.includes("setIsAdvancedOpen(false);"),
    'Le popover doit se fermer sur appui de la touche Escape'
  );
  assert(
    matchListCode.includes("document.addEventListener('mousedown', handleClickOutside)") ||
    matchListCode.includes("document.addEventListener('touchstart', handleClickOutside)"),
    'Le popover doit écouter les clics extérieurs pour se refermer sans effacer le filtre'
  );

  // 4.6 Synchronisation du macro parent lors de la sélection d'un sous-créneau
  assert(
    matchListCode.includes("const handleSelectSubSlot = (subId) => {") &&
    matchListCode.includes("SUB_TIME_SLOTS[subId]?.legacySlot"),
    'handleSelectSubSlot doit synchroniser selectedTimeSlot avec le macro-créneau parent'
  );

  // 4.7 Option de réinitialisation complète des filtres horaires
  assert(
    matchListCode.includes("setSelectedSubTimeSlot('ALL');") &&
    matchListCode.includes("setSelectedTimeSlot('ALL');"),
    'Le panneau doit proposer une réinitialisation ramenant à ALL sans impacter showLiveOnly'
  );

  // 4.8 Filtrage effectif dans visibleMatches
  assert(
    matchListCode.includes("matchesTimeSlot(getLegSubTimeSlot(m), activeTimeFilter)"),
    'visibleMatches doit utiliser matchesTimeSlot avec getLegSubTimeSlot'
  );

  // 4.9 Accessibilité et détection de sélection des sous-créneaux
  assert(
    matchListCode.includes("aria-pressed={isSelected}"),
    'Les 7 sous-créneaux doivent définir aria-pressed'
  );

  // 4.10 Défilement horizontal à la molette verticale avec respect strict des limites et passive: false
  assert(
    matchListCode.includes("addEventListener('wheel', handleWheel, { passive: false })"),
    'L\'écouteur wheel doit être enregistré avec passive: false pour autoriser preventDefault'
  );
  assert(
    matchListCode.includes("Math.abs(e.deltaX) >= Math.abs(e.deltaY)") &&
    matchListCode.includes("el.scrollLeft < maxScrollLeft - 1") &&
    matchListCode.includes("el.scrollLeft > 1"),
    'Le gestionnaire wheel doit préserver le trackpad horizontal et relâcher le scroll vertical aux limites'
  );

  console.log('  ✓ Test 4 validé : Structure, synchronisation d\'état et règles de rendu validées.');
}

console.log('\n=== TOUS LES TESTS WEB-FILTERS-001 ONT RÉUSSI AVEC SUCCÈS (4/4) ===');
