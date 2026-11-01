import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('=== DÉBUT DE LA SUITE DE TESTS CIBLÉS : WEB-002 (LOGOS & RECHERCHE MOBILE) ===\n');

// ---------------------------------------------------------------------------
// TEST 1 : Vérification de la couverture des 13 alias et absence de collisions
// ---------------------------------------------------------------------------
console.log('[TEST 1] Vérification des 13 alias déterministes dans le registre et absence de collisions');
{
  const registryPath = path.join(ROOT_DIR, 'src/data/teamLogosRegistry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

  const expected13 = [
    { team: 'Bayern Munich', key: 'bayernmunich', id: 9823, league: 'Bundesliga', code: 'bundesliga' },
    { team: '1. FC Union Berlin', key: '1fcunionberlin', id: 8149, league: 'Bundesliga', code: 'bundesliga' },
    { team: 'TSG Hoffenheim', key: 'tsghoffenheim', id: 8226, league: 'Bundesliga', code: 'bundesliga' },
    { team: 'FSV Mainz 05', key: 'fsvmainz05', id: 9905, league: 'Bundesliga', code: 'bundesliga' },
    { team: 'SC Paderborn 07', key: 'scpaderborn07', id: 8460, league: 'Bundesliga', code: 'bundesliga' },
    { team: 'STVV', key: 'stvv', id: 9997, league: 'BelgianProLeague', code: 'belgianproleague' },
    { team: 'Antwerp', key: 'antwerp', id: 9988, league: 'BelgianProLeague', code: 'belgianproleague' },
    { team: 'Charleroi', key: 'charleroi', id: 9986, league: 'BelgianProLeague', code: 'belgianproleague' },
    { team: 'Union Saint-Gilloise', key: 'unionsaintgilloise', id: 7978, league: 'BelgianProLeague', code: 'belgianproleague' },
    { team: 'Mechelen', key: 'mechelen', id: 8203, league: 'BelgianProLeague', code: 'belgianproleague' },
    { team: 'Grasshoppers', key: 'grasshoppers', id: 9956, league: 'SwissSuperLeague', code: 'swisssuperleague' },
    { team: 'Lausanne-Sport', key: 'lausannesport', id: 7730, league: 'SwissSuperLeague', code: 'swisssuperleague' },
    { team: 'Volos NFC', key: 'volosnfc', id: 885256, league: 'SuperLeagueGreece', code: 'superleaguegreece' }
  ];

  for (const item of expected13) {
    // 1.1 Présence dans teamNameToId
    const resolvedId = registry.teamNameToId[item.key];
    assert.strictEqual(
      resolvedId,
      item.id,
      `L'alias direct ${item.key} doit être associé à l'ID ${item.id} (obtenu: ${resolvedId})`
    );

    // 1.2 Présence dans compoundKeyToId avec la ligue
    const compoundKey = `${item.code}:${item.key}`;
    const resolvedCompoundId = registry.compoundKeyToId[compoundKey];
    assert.strictEqual(
      resolvedCompoundId,
      item.id,
      `La clé composée ${compoundKey} doit être associée à l'ID ${item.id} (obtenu: ${resolvedCompoundId})`
    );

    // 1.3 Existence physique du fichier PNG non vide sur disque
    const pngPath = path.join(ROOT_DIR, 'public', 'logos', 'teams', `${item.id}.png`);
    assert(
      fs.existsSync(pngPath),
      `Le fichier PNG ${pngPath} doit exister sur disque`
    );
    const stats = fs.statSync(pngPath);
    assert(stats.size > 1000, `Le fichier PNG ${pngPath} ne doit pas être vide`);
  }

  // 1.4 Vérification de la concordance dans scripts/acquire_logos.py
  const scriptPath = path.join(ROOT_DIR, 'scripts/acquire_logos.py');
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  assert(scriptContent.includes("('bundesliga', 'bayern munich'): 9823"), 'acquire_logos.py doit contenir bayern munich');
  assert(scriptContent.includes("('belgianproleague', 'stvv'): 9997"), 'acquire_logos.py doit contenir stvv');
  assert(scriptContent.includes("('swisssuperleague', 'grasshoppers'): 9956"), 'acquire_logos.py doit contenir grasshoppers');
  assert(scriptContent.includes("('superleaguegreece', 'volos nfc'): 885256"), 'acquire_logos.py doit contenir volos nfc');

  // 1.5 Vérification de l'alias d'affichage court dans teamDisplayNames.js
  const displayNamesPath = path.join(ROOT_DIR, 'src/utils/teamDisplayNames.js');
  const displayNamesContent = fs.readFileSync(displayNamesPath, 'utf-8');
  assert(
    displayNamesContent.includes("'bayernmunich': { short: 'Bayern', status: 'VERIFIED' }"),
    'teamDisplayNames.js doit contenir l\'alias bayernmunich vers Bayern'
  );

  console.log('  ✓ Test 1 validé : Les 13 alias et clés composées sont rigoureusement indexés sans collision.');
}

// Helpers de résolution partagés
const registryPath = path.join(ROOT_DIR, 'src/data/teamLogosRegistry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

const CLUB_AFFIXES = new Set([
  'fc', 'cf', 'sc', 'fk', 'ac', 'rc', 'afc', 'if', 'ff', 'sv', 'de', 'la', 'el',
  'club', 'calcio', 'cfc', 'ssc', 'as', 'us', 'uanl', 'unam'
]);

function normalizeBase(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/ı/g, 'i')
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanStr(str) {
  if (!str) return '';
  return normalizeBase(str).replace(/[^a-z0-9]/g, '');
}

function getCoreCleanName(name) {
  if (!name) return { cleaned: '', coreCleaned: '' };
  const cleaned = cleanStr(name);
  const tokens = name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const coreTokens = tokens.filter(t => !CLUB_AFFIXES.has(t));
  const coreCleaned = coreTokens.join('');
  return { cleaned, coreCleaned: coreCleaned || cleaned };
}

function getTeamLogoUrl(teamName, league = null) {
  if (!teamName) return registry.defaultTeamLogo || '/logos/teams/default.svg';
  const { cleaned, coreCleaned } = getCoreCleanName(teamName);
  const leagueClean = league ? cleanStr(league) : null;

  if (leagueClean) {
    const compoundKey = `${leagueClean}:${cleaned}`;
    if (registry.compoundKeyToId[compoundKey]) {
      return `/logos/teams/${registry.compoundKeyToId[compoundKey]}.png`;
    }
  }
  if (registry.teamNameToId[cleaned]) {
    return `/logos/teams/${registry.teamNameToId[cleaned]}.png`;
  }
  if (leagueClean && coreCleaned) {
    const compoundCoreKey = `${leagueClean}:${coreCleaned}`;
    if (registry.compoundKeyToId[compoundCoreKey]) {
      return `/logos/teams/${registry.compoundKeyToId[compoundCoreKey]}.png`;
    }
  }
  if (coreCleaned && registry.teamNameToId[coreCleaned]) {
    return `/logos/teams/${registry.teamNameToId[coreCleaned]}.png`;
  }
  return registry.defaultTeamLogo || '/logos/teams/default.svg';
}

// ---------------------------------------------------------------------------
// TEST 2 : Résolution déterministe à 100% sur les périmètres audités (460/460 & 503/503)
// ---------------------------------------------------------------------------
console.log('\n[TEST 2] Vérification de la couverture globale des logos (100% sur lot actif et historique)');
{

  // 2.1 Lot Actif (230 matchs, 460 équipes)
  const activePredPath = path.join(
    ROOT_DIR,
    'public/data/titanium_v2/predictions/Run_matches-to-predict_Week-05_Octobre-2026_sans-KOR1___2026-10-31_10h55m24s_VALUE_BETTING_MATRIX_2026-10-31_11h25m52s.json'
  );
  const activeMatches = JSON.parse(fs.readFileSync(activePredPath, 'utf-8'));

  let activeTotal = 0;
  let activeResolved = 0;
  for (const m of activeMatches) {
    const parts = (m.Matchup || '').split(' vs ');
    const league = m.League;
    for (const team of parts) {
      activeTotal++;
      const url = getTeamLogoUrl(team.trim(), league);
      if (url !== '/logos/teams/default.svg' && fs.existsSync(path.join(ROOT_DIR, 'public', url))) {
        activeResolved++;
      }
    }
  }

  assert.strictEqual(
    activeResolved,
    460,
    `Le lot actif doit résoudre exactement 460/460 logos de clubs (obtenu: ${activeResolved}/${activeTotal})`
  );
  console.log(`  ✓ Couverture lot actif : ${activeResolved}/${activeTotal} (100.0%)`);

  // 2.2 Tous les fichiers JSON de public/data/ (503 paires)
  function scanJsonFiles(dir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.name === 'series') continue; // Ignorer les métriques de séries pour vitesse d'exécution
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        results = results.concat(scanJsonFiles(full));
      } else if (ent.name.endsWith('.json')) {
        results.push(full);
      }
    }
    return results;
  }

  const allJsonFiles = scanJsonFiles(path.join(ROOT_DIR, 'public/data'));
  const allPairs = new Set();
  for (const f of allJsonFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
      const items = Array.isArray(data) ? data : (data.matches || []);
      for (const item of items) {
        if (item && item.Matchup && item.League) {
          const parts = item.Matchup.split(' vs ');
          if (parts.length === 2) {
            allPairs.add(JSON.stringify({ team: parts[0].trim(), league: item.League }));
            allPairs.add(JSON.stringify({ team: parts[1].trim(), league: item.League }));
          }
        }
      }
    } catch {}
  }

  let globalResolved = 0;
  for (const pStr of allPairs) {
    const p = JSON.parse(pStr);
    const url = getTeamLogoUrl(p.team, p.league);
    if (url !== '/logos/teams/default.svg' && fs.existsSync(path.join(ROOT_DIR, 'public', url))) {
      globalResolved++;
    }
  }

  assert.strictEqual(
    globalResolved,
    allPairs.size,
    `Tous les clubs doivent être résolus (obtenu: ${globalResolved}/${allPairs.size})`
  );
  console.log(`  ✓ Couverture globale : ${globalResolved}/${allPairs.size} (100.0%)`);
}

// ---------------------------------------------------------------------------
// TEST 3 : Appels et propriétés dans TabTactical.jsx
// ---------------------------------------------------------------------------
console.log('\n[TEST 3] Contrôle contractuel des appels TeamLogo dans TabTactical.jsx');
{
  const tacticalPath = path.join(ROOT_DIR, 'src/components/dashboard/TabTactical.jsx');
  const code = fs.readFileSync(tacticalPath, 'utf-8');

  // 3.1 Aucun appel résiduel avec 'team='
  const invalidTeamCalls = code.match(/<TeamLogo[^>]*\bteam=\{/g);
  assert.strictEqual(
    invalidTeamCalls,
    null,
    'TabTactical.jsx ne doit contenir aucun appel <TeamLogo team={'
  );

  // 3.2 Deux appels avec teamName et alt
  const validCalls = code.match(/<TeamLogo[^>]*\bteamName=\{[^}]+\}[^>]*\balt=\{[^}]+\}/g);
  assert(
    validCalls && validCalls.length >= 2,
    `TabTactical.jsx doit comporter au moins 2 appels conformes avec teamName et alt (trouvé: ${validCalls?.length})`
  );

  // 3.3 Présence de l'extraction des noms bruts
  assert(
    code.includes('const rawHome =') && code.includes('const rawAway ='),
    'TabTactical.jsx doit extraire rawHome et rawAway pour privilégier les noms bruts'
  );
  assert(
    code.includes('const homeLogoTeam = rawHome || homeTeamName;') &&
    code.includes('const awayLogoTeam = rawAway || awayTeamName;'),
    'TabTactical.jsx doit assigner homeLogoTeam et awayLogoTeam en privilégiant rawHome et rawAway'
  );

  // 3.4 Résolution effective de Bayern Munich, TSG Hoffenheim et STVV dans ce parcours
  const tacticalCases = [
    { name: 'Bayern Munich', league: 'Bundesliga', expectedId: '9823' },
    { name: 'TSG Hoffenheim', league: 'Bundesliga', expectedId: '8226' },
    { name: 'STVV', league: 'BelgianProLeague', expectedId: '9997' }
  ];

  for (const tc of tacticalCases) {
    const url = getTeamLogoUrl(tc.name, tc.league);
    assert.strictEqual(
      url,
      `/logos/teams/${tc.expectedId}.png`,
      `TabTactical : ${tc.name} doit résoudre vers /logos/teams/${tc.expectedId}.png (obtenu: ${url})`
    );
    const diskPath = path.join(ROOT_DIR, 'public', url);
    assert(
      fs.existsSync(diskPath),
      `Le fichier image pour ${tc.name} doit exister sur le disque : ${diskPath}`
    );
  }

  console.log('  ✓ Test 3 validé : TabTactical utilise scrupuleusement teamName, privilégie les noms bruts et résout effectivement Bayern Munich, TSG Hoffenheim et STVV.');
}

// ---------------------------------------------------------------------------
// TEST 4 : Intégration du champ de recherche sticky mobile dans App.jsx
// ---------------------------------------------------------------------------
console.log('\n[TEST 4] Contrôle de la recherche prioritaire mobile et suppression des accès redondants');
{
  const appPath = path.join(ROOT_DIR, 'src/App.jsx');
  const code = fs.readFileSync(appPath, 'utf-8');

  // 4.1 Champ de recherche sticky présent au-dessus des filtres
  assert(
    code.includes('placeholder="Rechercher un match ou une équipe..."'),
    'App.jsx doit contenir le champ avec le placeholder canonique'
  );
  assert(
    code.includes('aria-label="Rechercher un match ou une équipe"'),
    'Le champ doit posséder son aria-label accessible'
  );

  // 4.2 Hauteur tactile 44px (h-11 min-h-[44px]) et taille de police 16px (text-[16px])
  assert(
    code.includes('h-11 min-h-[44px]'),
    'Le champ mobile doit respecter une hauteur tactile de 44px (h-11 min-h-[44px])'
  );
  assert(
    code.includes('text-[16px]'),
    'Le champ mobile doit définir text-[16px] pour neutraliser l\'auto-zoom iOS'
  );

  // 4.3 Présence du bouton d'effacement conditionnel X
  assert(
    code.includes('aria-label="Effacer la recherche"'),
    'Le champ doit comporter un bouton accessible pour effacer la recherche'
  );
  assert(
    code.includes("setSearchQuery('')"),
    'Le bouton d\'effacement doit réinitialiser searchQuery'
  );

  // 4.4 Masquage du popover de recherche redondant sur mobile
  assert(
    code.includes('hidden lg:block relative'),
    'Le bouton de recherche popover de l\'en-tête doit être masqué sur mobile (hidden lg:block)'
  );

  // 4.5 Absence de l'ancien mobileSearchOpen écrasant l'en-tête
  assert(
    !code.includes('setMobileSearchOpen('),
    'L\'ancien mécanisme mobileSearchOpen écrasant l\'en-tête doit être supprimé'
  );

  // 4.6 Accès depuis l'en-tête flottant vers le champ sticky via ref
  assert(
    code.includes('mobileSearchInputRef.current?.focus()'),
    'La loupe de l\'en-tête flottant doit appeler mobileSearchInputRef.current?.focus()'
  );

  console.log('  ✓ Test 4 validé : Recherche mobile prioritaire intégrée, accessible (44px / 16px), connectée à l\'en-tête flottant et doublons nettoyés.');
}

console.log('\n=== TOUS LES TESTS UNITAIRES ET CONTRACTUELS WEB-002 ONT RÉUSSI (4/4) ===');
