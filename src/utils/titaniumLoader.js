/**
 * TITANIUM V2 Data Loader
 * 
 * Responsible for loading, verifying integrity, correlating, and enriching
 * TITANIUM V2 datasets from /data/titanium_v2/.
 * Strictly respects TITANIUM outputs without recalculating probabilities or risk decisions.
 */

import { getTeamDisplayName } from './teamDisplayNames.js';

// Fallback league flags mapping
export const LEAGUE_FLAGS = {
  'PL': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'PREMIERLEAGUE': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'CHAMPIONSHIP': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'LALIGA': '🇪🇸',
  'LALIGA2': '🇪🇸',
  'SERIEA': '🇮🇹',
  'SERIEB': '🇮🇹',
  'BUNDESLIGA': '🇩🇪',
  '2.BUNDESLIGA': '🇩🇪',
  '2BUNDESLIGA': '🇩🇪',
  'LIGUE1': '🇫🇷',
  'LIGUE2': '🇫🇷',
  'EREDIVISIE': '🇳🇱',
  'LIGAPORTUGAL': '🇵🇹',
  'PRIMEIRALIGA': '🇵🇹',
  'BELGIANPROLEAGUE': '🇧🇪',
  'SCOTTISHPREMIERSHIP': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'SWISSSUPERLEAGUE': '🇨🇭',
  'AUSTRIANBUNDESLIGA': '🇦🇹',
  'SUPERLIGAEN': '🇩🇰',
  'ALLSVENSKAN': '🇸🇪',
  'ELITESERIEN': '🇳🇴',
  'EKSTRAKLASA': '🇵🇱',
  'SÜPERLIG': '🇹🇷',
  'SUPERLIG': '🇹🇷',
  'RUSSIANPREMIERLEAGUE': '🇷🇺',
  'MAJORLEAGUESOCCER': '🇺🇸',
  'MLS': '🇺🇸',
  'BRAZILIANSERIEA': '🇧🇷',
  'LIGAMX': '🇲🇽',
  'SAUDIPROLEAGUE': '🇸🇦',
  'J1LEAGUE': '🇯🇵',
  'KLEAGUE1': '🇰🇷'
};

export function getLeagueFlag(leagueName) {
  if (!leagueName) return '⚽';
  const cleanKey = leagueName.toUpperCase().replace(/[^A-Z0-9\u00C0-\u017F]/gi, '');
  return LEAGUE_FLAGS[cleanKey] || '⚽';
}

export function normalizeBase(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanStr(str) {
  if (!str) return '';
  return normalizeBase(str).replace(/[^a-z0-9]/g, '');
}

// Club affixes that do not distinguish team identity when one source includes it and another omits it
export const CLUB_AFFIXES = new Set([
  'fc', 'cf', 'sc', 'fk', 'ac', 'rc', 'afc', 'if', 'ff', 'sv', 'de', 'la', 'el', 'the', 
  'club', '1', '98', '38', 'af', 'hsc', 'fco', 'uanl', 'unam', 'rcd', 'ud', 'cd', 'ca', 
  'as', 'us', 'ea', 'vfl', 'ifk', 'kv', 'sk', 'bk', 'sporting', 'royal', 'sl', 'rb', '08', 'foot'
]);

// Tokens that explicitly differentiate distinct teams/squads (reserve, age, gender)
export const TEAM_DISCRIMINATORS = new Set([
  'b', 'ii', 'iii', 'c', 'u19', 'u20', 'u21', 'u23', 'women', 'feminas', 'feminino', 'amateur', 'youth', 'reserves'
]);

// Verified TITANIUM canonical aliases
export const VERIFIED_ALIASES = {
  'chivas': 'guadalajara',
  'ob': 'odense boldklub',
  'kobenhavn': 'copenhagen',
  'fc kobenhavn': 'copenhagen',
  'fc copenhagen': 'copenhagen',
  'stvv': 'st truiden',
  'sint truidense': 'st truiden',
  'hamkam': 'hamarkameratene',
  'nycfc': 'new york city',
  'lafc': 'los angeles',
  'sporting kc': 'sporting kansas city',
  'red bull new york': 'new york red bulls',
  'san jose earthquakes': 'earthquakes',
  'dinamo moscow': 'dynamo moscow',
  'urawa reds': 'urawa red diamonds',
  'aik solna': 'aik',
  'lask linz': 'lask',
  'feyenoord rotterdam': 'feyenoord',
  'excelsior rotterdam': 'excelsior',
  'fakel voronezh': 'fakel',
  'krylya sovetov samara': 'krylya sovetov',
  'grasshoppers': 'grasshopper',
  'lausanne sport': 'lausanne',
  'istanbul basaksehir': 'basaksehir',
  'stade lavallois': 'laval',
  'stade de reims': 'reims',
  'as saint etienne': 'saint etienne',
  'saint etienne': 'saint etienne',
  'vitoria de guimaraes': 'vitoria guimaraes',
  'estoril praia': 'estoril',
  'atletico mineiro': 'atletico mg',
  'atletico pr': 'athletico pr',
  'athletico pr': 'athletico pr',
  'athletico paranaense': 'athletico pr',
  'ec vitoria': 'vitoria',
  'bucheon fc 1995': 'bucheon fc',
  'bucheon fc': 'bucheon fc',
  'deportivo la coruna': 'deportivo coruna',
  'deportivo a coruna': 'deportivo coruna',
  'real betis': 'betis',
  'halmstads': 'halmstad',
  'jeju sk': 'jeju united',
  'nancy lorraine': 'nancy',
  'akhmat grozny': 'akhmat',
  'baltika kaliningrad': 'baltika',
  // Ligue 1 verified aliases
  'lille osc': 'lille',
  'stade brestois 29': 'brest',
  'estac troyes': 'troyes',
  'angers sco': 'angers',
  'olympique de marseille': 'marseille',
  'olympique marseille': 'marseille',
  'aj auxerre': 'auxerre',
  'stade rennais': 'rennes',
  'olympique lyonnais': 'lyon',
  'ogc nice': 'nice',
  // Serie A verified aliases
  'frosinone calcio': 'frosinone',
  'ssc napoli': 'napoli',
  'inter milan': 'inter',
  'genoa cfc': 'genoa',
  'udinese calcio': 'udinese',
  'como 1907': 'como',
  'atalanta bc': 'atalanta',
  'ss lazio': 'lazio',
  'cagliari calcio': 'cagliari',
  'parma calcio 1913': 'parma'
};

export function getCanonicalTokens(name) {
  if (!name) return { raw: '', discriminators: '', core: '', coreCompact: '' };
  let base = normalizeBase(name);
  if (VERIFIED_ALIASES[base]) {
    base = VERIFIED_ALIASES[base];
  }

  const rawTokens = base.split(' ').map(t => (t === 'st' ? 'saint' : t));
  const discriminators = rawTokens.filter(t => TEAM_DISCRIMINATORS.has(t));
  const coreTokens = rawTokens.filter(t => !CLUB_AFFIXES.has(t) && !TEAM_DISCRIMINATORS.has(t));

  let coreStr = coreTokens.join(' ');
  if (VERIFIED_ALIASES[coreStr]) {
    coreStr = VERIFIED_ALIASES[coreStr];
  }

  return {
    raw: base,
    discriminators: discriminators.sort().join(' '),
    core: coreStr,
    coreCompact: coreTokens.join('')
  };
}

export function matchTeamNames(nameA, nameB) {
  if (!nameA || !nameB) return false;
  const tA = getCanonicalTokens(nameA);
  const tB = getCanonicalTokens(nameB);

  // 1. MUST have exact match on team discriminators (e.g. "B" vs "")
  if (tA.discriminators !== tB.discriminators) {
    return false;
  }

  // 2. Exact match on raw string
  if (tA.raw === tB.raw) return true;

  // 3. Exact match on core tokens
  if (tA.core && tB.core) {
    if (tA.core === tB.core) return true;
    if (tA.coreCompact === tB.coreCompact) return true;
  }

  // 4. Exact compound aliases
  if (tA.core.includes('earthquakes') && tB.core.includes('earthquakes')) return true;
  if (tA.core.includes('red') && tA.core.includes('bull') && tB.core.includes('red') && tB.core.includes('bull')) return true;

  return false;
}

export function normalizeSourceMatrix(filePath) {
  if (!filePath) return '';
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1].trim();
}

export function canonicalSessionId(id) {
  if (!id) return '';
  let s = id.trim();
  s = s.replace(/^RUN_/, '');
  s = s.replace(/\.json$/i, '');
  s = s.replace(/_VALUE_BETTING_MATRIX.*$/, '');
  const match = s.match(/^(Run_.+?___[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}h[0-9]{2}m[0-9]{2}s)/);
  if (match) {
    return match[1];
  }
  return s;
}

export function areSessionsCompatible(candidateId, sessionId, runId) {
  if (!candidateId || (!sessionId && !runId)) return false;
  const c = canonicalSessionId(candidateId);
  const s = canonicalSessionId(sessionId);
  const r = canonicalSessionId(runId);
  // STRICT EXACT EQUALITY: no prefix or startsWith shortcuts!
  if (s && c === s) return true;
  if (r && c === r) return true;
  return false;
}

/**
 * Valide les composantes d'une date sans supposer arbitrairement un fuseau horaire.
 * Rejette toute date calendaire impossible (ex: 30 février, mois 13, heure 25).
 */
export function isValidDateComponents(y, m, d, hh = 0, mm = 0, ss = 0) {
  if (y < 2000 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (hh < 0 || hh > 23) return false;
  if (mm < 0 || mm > 59) return false;
  if (ss < 0 || ss > 59) return false;

  const isLeap = (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0));
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (d < 1 || d > daysInMonth[m - 1]) return false;

  return true;
}

/**
 * Convertit des composantes validées en valeur d'échelle temporelle linéaire.
 * Utilise Date.UTC uniquement comme convertisseur mathématique universel
 * pour garantir l'ordre chronologique strict sans dépendre du fuseau local de l'utilisateur.
 */
function toNumericTimestamp(y, m, d, hh = 0, mm = 0, ss = 0) {
  const yN = parseInt(y, 10);
  const mN = parseInt(m, 10);
  const dN = parseInt(d, 10);
  const hhN = parseInt(hh, 10);
  const mmN = parseInt(mm, 10);
  const ssN = parseInt(ss, 10);

  if (!isValidDateComponents(yN, mN, dN, hhN, mmN, ssN)) {
    return 0;
  }
  return Date.UTC(yN, mN - 1, dN, hhN, mmN, ssN);
}

/**
 * Extrait l'horodatage d'une matrice ou d'un run TITANIUM sous forme de timestamp numérique.
 * Priorise l'horodatage effectif de génération de matrice (après VALUE_BETTING_MATRIX_ ou second timestamp d'un run_id),
 * avec repli sur l'horodatage de session de collecte (après ___).
 */
export function parseMatrixGenerationTimestamp(fileNameOrId) {
  if (!fileNameOrId || typeof fileNameOrId !== 'string') return 0;

  // 1. Horodatage spécifique de génération de matrice : VALUE_BETTING_MATRIX_[vX.X_]YYYY-MM-DD_HHhMMmSSs
  const matrixMatch = fileNameOrId.match(/VALUE_BETTING_MATRIX_(?:v[0-9.]+_)?([0-9]{4})-([0-9]{2})-([0-9]{2})_([0-9]{2})h([0-9]{2})m([0-9]{2})s/i);
  if (matrixMatch) {
    const [, y, m, d, hh, mm, ss] = matrixMatch;
    return toNumericTimestamp(y, m, d, hh, mm, ss);
  }

  // 2. Format run_id moteur à double horodatage : ___YYYY-MM-DD_HHhMMmSSs_YYYY-MM-DD_HHhMMmSSs
  // Le second horodatage représente l'instant de génération finale de la matrice
  const doubleTimestampMatch = fileNameOrId.match(/___[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}h[0-9]{2}m[0-9]{2}s_([0-9]{4})-([0-9]{2})-([0-9]{2})_([0-9]{2})h([0-9]{2})m([0-9]{2})s/i);
  if (doubleTimestampMatch) {
    const [, y, m, d, hh, mm, ss] = doubleTimestampMatch;
    return toNumericTimestamp(y, m, d, hh, mm, ss);
  }

  // 3. Horodatage de session : ___YYYY-MM-DD_HHhMMmSSs
  const sessionMatch = fileNameOrId.match(/___([0-9]{4})-([0-9]{2})-([0-9]{2})_([0-9]{2})h([0-9]{2})m([0-9]{2})s/i);
  if (sessionMatch) {
    const [, y, m, d, hh, mm, ss] = sessionMatch;
    return toNumericTimestamp(y, m, d, hh, mm, ss);
  }

  // 4. Horodatage complet libre : YYYY-MM-DD_HHhMMmSSs
  const timeMatch = fileNameOrId.match(/([0-9]{4})-([0-9]{2})-([0-9]{2})_([0-9]{2})h([0-9]{2})m([0-9]{2})s/i);
  if (timeMatch) {
    const [, y, m, d, hh, mm, ss] = timeMatch;
    return toNumericTimestamp(y, m, d, hh, mm, ss);
  }

  // 5. Date générique YYYY-MM-DD (minuit)
  const dateMatch = fileNameOrId.match(/([0-9]{4})-([0-9]{2})-([0-9]{2})/);
  if (dateMatch) {
    const [, y, m, d] = dateMatch;
    return toNumericTimestamp(y, m, d, 0, 0, 0);
  }

  return 0;
}

/**
 * Extrait l'horodatage initial de session de collecte (premier horodatage après ___).
 */
export function parseSessionTimestamp(fileNameOrId) {
  if (!fileNameOrId || typeof fileNameOrId !== 'string') return 0;
  const sessionMatch = fileNameOrId.match(/___([0-9]{4})-([0-9]{2})-([0-9]{2})_([0-9]{2})h([0-9]{2})m([0-9]{2})s/i);
  if (sessionMatch) {
    const [, y, m, d, hh, mm, ss] = sessionMatch;
    return toNumericTimestamp(y, m, d, hh, mm, ss);
  }
  return 0;
}

/**
 * Sélectionne de manière déterministe le fichier de prédiction actif.
 * Trie par horodatage de génération descendant, bris d'égalité par horodatage de session,
 * puis ordre lexicographique ASCII strict.
 *
 * Échoue de manière stricte (retourne null sans repli silencieux) si un fichier ou
 * une session explicitement demandé est introuvable.
 */
export function selectDeterministicPredictionFile(predictionsList, options = {}) {
  if (!Array.isArray(predictionsList) || predictionsList.length === 0) return null;

  // Tri déterministe préalable de toute la liste
  const sorted = [...predictionsList].sort((a, b) => {
    const timeA = parseMatrixGenerationTimestamp(a);
    const timeB = parseMatrixGenerationTimestamp(b);
    if (timeA !== timeB) {
      return timeB - timeA; // Descendant : le plus récent en premier
    }
    // Bris d'égalité par horodatage de session
    const sessA = parseSessionTimestamp(a);
    const sessB = parseSessionTimestamp(b);
    if (sessA !== sessB) {
      return sessB - sessA;
    }
    // Bris d'égalité déterministe par code-unit ASCII strict
    return b > a ? 1 : b < a ? -1 : 0;
  });

  // Si un fichier spécifique est explicitement demandé : aucun repli silencieux
  if (options.predictionFile) {
    return predictionsList.includes(options.predictionFile) ? options.predictionFile : null;
  }

  // Si un session_id spécifique est explicitement demandé : aucun repli silencieux
  if (options.sessionId) {
    const targetSession = canonicalSessionId(options.sessionId);
    // Sélectionne la matrice la plus récente correspondant à cette session
    const found = sorted.find(f => canonicalSessionId(f) === targetSession);
    return found || null;
  }

  return sorted[0] || null;
}

/**
 * Normalise le radical de lot (batch stem) d'un nom de fichier pour association fixtures/matrice.
 */
export function normalizeBatchStem(name) {
  if (!name || typeof name !== 'string') return '';
  let stem = name.replace(/\.json$/i, '');
  if (stem.includes('___')) {
    stem = stem.split('___')[0];
  }
  stem = stem.replace(/^run_/i, '');
  return stem.toLowerCase().replace(/[-_]+/g, '_').trim();
}

/**
 * Associe de manière déterministe le fichier matches_to_predict à la matrice de prédiction sélectionnée.
 * En cas d'incompatibilité manifeste ou d'ambiguïté, retourne null pour ne jamais injecter
 * des fixtures d'une autre semaine.
 */
export function selectMatchingFixturesFile(matchesList, predFileName) {
  if (!Array.isArray(matchesList) || matchesList.length === 0) return null;
  if (!predFileName) {
    return matchesList.length === 1 ? matchesList[0] : null;
  }

  const predBatch = normalizeBatchStem(predFileName);

  // 1. Recherche par correspondance exacte de batch stem
  const exactMatches = matchesList.filter(m => normalizeBatchStem(m) === predBatch);
  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  // 2. Recherche par inclusion mutuelle de radicaux
  const inclusiveMatches = matchesList.filter(m => {
    const mStem = normalizeBatchStem(m);
    return predBatch && mStem && (predBatch.includes(mStem) || mStem.includes(predBatch));
  });
  if (inclusiveMatches.length === 1) {
    return inclusiveMatches[0];
  }

  // 3. Si un seul fichier de fixtures existe dans le manifeste, vérifier la compatibilité minimale
  if (matchesList.length === 1) {
    const singleStem = normalizeBatchStem(matchesList[0]);
    // Vérifier les tokens discriminants (numéro de semaine)
    const predWeek = predBatch.match(/week_([0-9]+)/);
    const matchWeek = singleStem.match(/week_([0-9]+)/);
    if (predWeek && matchWeek && predWeek[1] !== matchWeek[1]) {
      // Semaines différentes incompatibles
      return null;
    }
    return matchesList[0];
  }

  // Ambiguïté ou absence de correspondance : fail-closed
  return null;
}

/**
 * Sélectionne les 3 lignes du catalogue les plus proches du lambda de l'équipe.
 * Gère de manière déterministe les cas limites aux bornes et bris d'égalité.
 */
export function getThreeClosestLines(lines, lambda) {
  if (!Array.isArray(lines) || lines.length === 0) return [];

  // Filtrer les entrées non conformes
  const validLines = lines.filter(l => l && typeof l === 'object' && Number.isFinite(l.Line));
  if (validLines.length <= 3) return validLines;

  // Si lambda n'est pas un nombre fini, retourner les 3 premières lignes valides sans sélection arbitraire
  if (!Number.isFinite(lambda)) {
    return validLines.slice(0, 3);
  }

  // Tri par distance absolue à lambda
  const sorted = [...validLines].sort((a, b) => {
    const distA = Math.abs(a.Line - lambda);
    const distB = Math.abs(b.Line - lambda);
    if (Math.abs(distA - distB) > 0.0001) {
      return distA - distB;
    }
    // Bris d'égalité déterministe : privilégier la ligne inférieure
    return a.Line - b.Line;
  });

  const top3 = sorted.slice(0, 3);
  // Réordonner les 3 lignes retenues de manière croissante pour une lecture naturelle
  return top3.sort((a, b) => a.Line - b.Line);
}

/**
 * Identifie la ligne pivot la plus proche du lambda attendu.
 * Retourne null si lambda n'est pas un nombre fini ou si lines est vide/invalide.
 */
export function getNearestLine(lines, lambda) {
  if (!Array.isArray(lines) || lines.length === 0 || !Number.isFinite(lambda)) return null;

  const validLines = lines.filter(l => l && typeof l === 'object' && Number.isFinite(l.Line));
  if (validLines.length === 0) return null;

  let nearest = validLines[0].Line;
  let minDiff = Math.abs(validLines[0].Line - lambda);

  for (let i = 1; i < validLines.length; i++) {
    const diff = Math.abs(validLines[i].Line - lambda);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = validLines[i].Line;
    }
  }
  return nearest;
}

export function validateSeriesMetadata(stats, match) {
  if (!stats || !stats.streaks || !stats.goal_distribution) {
    return { valid: false, reason: 'Incomplete streaks or goal_distribution structure' };
  }
  const meta = stats.metadata;
  if (!meta) {
    return { valid: false, reason: 'Missing metadata in series payload' };
  }

  // 1. Fixture identity check with STRICT matchTeamNames on both sides
  if (meta.fixture && match?.Matchup) {
    const partsM = (match.Matchup || '').split(' vs ');
    const partsMeta = (meta.fixture || '').split(' vs ');
    if (partsM.length < 2 || partsMeta.length < 2) {
      return { 
        valid: false, 
        reason: `Malformed fixture format: payload "${meta.fixture}" vs match "${match.Matchup}"` 
      };
    }
    const homeMatches = matchTeamNames(partsM[0], partsMeta[0]);
    const awayMatches = matchTeamNames(partsM[1], partsMeta[1]);
    if (!homeMatches || !awayMatches) {
      return { 
        valid: false, 
        reason: `Fixture mismatch: payload "${meta.fixture}" vs match "${match.Matchup}"` 
      };
    }
  }

  // 2. Date check
  const matchDate = match?.Match_Date || match?.date;
  if (meta.date && matchDate && meta.date !== matchDate) {
    return { 
      valid: false, 
      reason: `Date mismatch: payload "${meta.date}" vs match "${matchDate}"` 
    };
  }

  // 3. League / Competition check
  if (meta.competition && match?.League) {
    if (cleanStr(meta.competition) !== cleanStr(match.League)) {
      return { 
        valid: false, 
        reason: `Competition mismatch: payload "${meta.competition}" vs match "${match.League}"` 
      };
    }
  }

  return { valid: true };
}

export function resolveSeriesTopology(manifest, predSessionId) {
  const rawSeriesRuns = Array.isArray(manifest?.seriesRuns) ? manifest.seriesRuns : [];
  const explicitFlatLeagues = Array.isArray(manifest?.seriesFlatLeagues) ? manifest.seriesFlatLeagues : [];

  const runDirs = rawSeriesRuns.filter(d => /^Run_/i.test(d));
  const flatLeagueDirs = Array.from(new Set([
    ...explicitFlatLeagues,
    ...rawSeriesRuns.filter(d => !/^Run_/i.test(d))
  ]));

  const canonicalActive = canonicalSessionId(predSessionId);
  const matchingRunDirs = canonicalActive
    ? runDirs.filter(d => canonicalSessionId(d) === canonicalActive)
    : [];

  if (runDirs.length > 0 && flatLeagueDirs.length > 0) {
    return {
      mode: 'invalid',
      runFolder: null,
      flatLeagues: [],
      reason: `Topologie des séries ambiguë : dossier(s) de session (${runDirs.join(', ')}) et dossiers de ligues à plat simultanément présents dans series/.`
    };
  }

  if (runDirs.length > 0) {
    if (matchingRunDirs.length === 1) {
      return {
        mode: 'session',
        runFolder: matchingRunDirs[0],
        flatLeagues: [],
        reason: null
      };
    }
    if (matchingRunDirs.length > 1) {
      return {
        mode: 'invalid',
        runFolder: null,
        flatLeagues: [],
        reason: `Topologie des séries ambiguë : plusieurs dossiers correspondent à la session active "${canonicalActive}" (${matchingRunDirs.join(', ')}).`
      };
    }
    return {
      mode: 'invalid',
      runFolder: null,
      flatLeagues: [],
      reason: `Dossier de séries incompatible avec la session active "${canonicalActive}" (dossiers présents : ${runDirs.join(', ')}).`
    };
  }

  if (flatLeagueDirs.length > 0) {
    return {
      mode: 'flat',
      runFolder: null,
      flatLeagues: flatLeagueDirs,
      reason: null
    };
  }

  return {
    mode: 'invalid',
    runFolder: null,
    flatLeagues: [],
    reason: 'Aucun répertoire de séries détecté dans le manifeste TITANIUM V2.'
  };
}

export function getSeriesStatsUrl(match, sessionId, topology = null) {
  if (!match || !match.Matchup) return null;
  const leagueFolder = (match.League || '').toUpperCase().replace(/\s+/g, '');
  if (!leagueFolder) return null;
  const parts = match.Matchup.split(' vs ');
  if (parts.length < 2) return null;
  const homeClean = parts[0].replace(/\s+/g, '').replace(/\//g, '_');
  const awayClean = parts[1].replace(/\s+/g, '').replace(/\//g, '_');
  const date = match.Match_Date || match.date || '';
  const fileName = `serie_stats_${homeClean}_${awayClean}_${date}.json`;

  const resolvedTopology = topology || match.series_topology || null;
  if (resolvedTopology) {
    if (resolvedTopology.mode === 'invalid') {
      return null;
    }
    if (resolvedTopology.mode === 'flat') {
      return `/data/titanium_v2/series/${leagueFolder}/${fileName}`;
    }
    if (resolvedTopology.mode === 'session' && resolvedTopology.runFolder) {
      return `/data/titanium_v2/series/${resolvedTopology.runFolder}/${leagueFolder}/${fileName}`;
    }
    return null;
  }

  if (sessionId === 'FLAT' || sessionId === '') {
    return `/data/titanium_v2/series/${leagueFolder}/${fileName}`;
  }

  const rawSession = sessionId || match.session_id || match.run_id || '';
  const sId = canonicalSessionId(rawSession);
  if (!sId || !/^Run_/i.test(sId)) return null;
  return `/data/titanium_v2/series/${sId}/${leagueFolder}/${fileName}`;
}

export function getLeagueReportUrl(leagueName) {
  if (!leagueName) return null;
  const cleanLeague = leagueName.toUpperCase().replace(/\s+/g, '');
  return `/data/titanium_v2/tickets/auxiliary/LIGUES/${cleanLeague}_REPORT.json`;
}

/**
 * Loads TITANIUM V2 session datasets and performs strict, read-only correlation.
 */
export async function loadTitaniumV2Session(options = {}) {
  const fetchFn = options.fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetchFn) {
    throw new Error('No fetch implementation available for loadTitaniumV2Session');
  }

  // 1. Acquire manifest (from virtual module, options, or default detection)
  let manifest = options.manifestOverride || null;
  if (!manifest) {
    try {
      const virtualMod = await import('virtual:titanium-manifest');
      manifest = virtualMod.default;
    } catch (e) {
      // In case virtual module isn't loaded (e.g. standalone test environment)
      manifest = {
        predictions: ['Run_matches-to-predict_Week-02_Octobre-2026___2026-10-15_17h48m15s_VALUE_BETTING_MATRIX_2026-10-15_18h08m06s.json'],
        matches: ['matches_to_predict_Week-02-Octobre-2026.json'],
        seriesRuns: ['Run_matches-to-predict_Week-02_Octobre-2026___2026-10-15_17h48m15s'],
        seriesFlatLeagues: [],
        tickets: {
          assembled: '/data/titanium_v2/tickets/TICKETS_ASSEMBLES.json',
          finals: '/data/titanium_v2/tickets/auxiliary/CHOIX_FINAUX.json'
        }
      };
    }
  }

  const warnings = [];
  const missingSources = [];

  // 2. Load Predictions Matrix (Primary Source) - Deterministic selection by generation timestamp
  const predFileName = selectDeterministicPredictionFile(manifest.predictions, options);
  if (!predFileName) {
    if (options.predictionFile) {
      throw new Error(`TITANIUM V2: Explicit prediction file '${options.predictionFile}' not found in manifest.`);
    }
    if (options.sessionId) {
      throw new Error(`TITANIUM V2: Explicit session '${options.sessionId}' not found in manifest predictions.`);
    }
    throw new Error('TITANIUM V2: No predictions matrix found in manifest.');
  }

  let predictionsRaw = [];
  try {
    const predRes = await fetchFn(`/data/titanium_v2/predictions/${predFileName}`);
    if (!predRes.ok) {
      throw new Error(`Failed to load predictions matrix (${predRes.status})`);
    }
    predictionsRaw = await predRes.json();
    if (!Array.isArray(predictionsRaw)) {
      if (Array.isArray(predictionsRaw.matches)) {
        predictionsRaw = predictionsRaw.matches;
      } else {
        throw new Error('TITANIUM V2: Predictions JSON must be an array of matches');
      }
    }
  } catch (err) {
    throw new Error(`TITANIUM V2 predictions load error: ${err.message}`);
  }

  // Extract session run_id / session_id strictly from active predictions matrix
  const firstPred = predictionsRaw[0] || {};
  const predRunId = firstPred.run_id || '';
  const predSessionId = canonicalSessionId(predRunId) || canonicalSessionId(predFileName);
  const seriesTopology = resolveSeriesTopology(manifest, predSessionId);
  if (seriesTopology.mode === 'invalid' && seriesTopology.reason) {
    warnings.push(`Séries statistiques : ${seriesTopology.reason}`);
  }

  // 3. Load Matches Fixtures (matches_to_predict) with deterministic batch matching
  let fixturesByLeague = {};
  const matchesFileName = selectMatchingFixturesFile(manifest.matches, predFileName);
  if (matchesFileName) {
    try {
      const matchRes = await fetchFn(`/data/titanium_v2/matches/${matchesFileName}`);
      if (matchRes.ok) {
        fixturesByLeague = await matchRes.json();
      } else {
        missingSources.push('matches_to_predict');
        warnings.push(`Matches fixture file returned HTTP ${matchRes.status}`);
      }
    } catch (e) {
      missingSources.push('matches_to_predict');
      warnings.push(`Matches fixture file could not be loaded: ${e.message}`);
    }
  } else {
    missingSources.push('matches_to_predict');
    if (Array.isArray(manifest.matches) && manifest.matches.length > 0) {
      warnings.push('Aucun fichier matches_to_predict compatible trouvé pour ce run : métadonnées complémentaires non injectées.');
    } else {
      warnings.push('Fichier matches_to_predict absent du manifeste : métadonnées complémentaires non injectées.');
    }
  }

  // Flatten fixtures with normalized keys for deterministic matching
  const flattenedFixtures = [];
  Object.entries(fixturesByLeague).forEach(([leagueKey, list]) => {
    if (leagueKey === '_batch_metadata' || !Array.isArray(list)) return;
    list.forEach(item => {
      flattenedFixtures.push({
        ...item,
        leagueKey,
        cleanLeague: cleanStr(leagueKey),
        cleanHome: cleanStr(item.home),
        cleanAway: cleanStr(item.away)
      });
    });
  });

  // 4. Load Tickets and CHOIX_FINAUX
  let ticketsAssembled = null;
  let ticketsFinals = null;

  const assembledPath = manifest.tickets?.assembled || '/data/titanium_v2/tickets/TICKETS_ASSEMBLES.json';
  const finalsPath = manifest.tickets?.finals || '/data/titanium_v2/tickets/auxiliary/CHOIX_FINAUX.json';

  try {
    const [tRes, fRes] = await Promise.all([
      fetchFn(assembledPath).catch(err => ({ ok: false, error: err })),
      fetchFn(finalsPath).catch(err => ({ ok: false, error: err }))
    ]);

    if (tRes && tRes.ok) {
      const parsedTickets = await tRes.json();
      const ticketRun = parsedTickets.metadata?.run_id || '';
      const ticketMatrix = parsedTickets.metadata?.source_matrix || '';

      const isRunOk = areSessionsCompatible(ticketRun, predSessionId, predRunId);
      const isMatrixOk = !ticketMatrix || (normalizeSourceMatrix(ticketMatrix) === normalizeSourceMatrix(predFileName));

      if (isRunOk && isMatrixOk) {
        ticketsAssembled = parsedTickets;
      } else {
        const reasons = [];
        if (!isRunOk) reasons.push(`run_id incompatible ("${ticketRun}" vs "${predSessionId}")`);
        if (!isMatrixOk) reasons.push(`source_matrix incompatible ("${ticketMatrix}" vs "${predFileName}")`);
        warnings.push(`Tickets assemblés EXCLUS : ${reasons.join(' et ')}.`);
        ticketsAssembled = null;
      }
    } else {
      missingSources.push('TICKETS_ASSEMBLES');
      warnings.push('Tickets assemblés unavailable');
    }

    if (fRes && fRes.ok) {
      const parsedFinals = await fRes.json();
      const rawSelections = Array.isArray(parsedFinals.Selections) ? parsedFinals.Selections : [];
      const validSelections = [];
      let rejectedCount = 0;

      rawSelections.forEach(sel => {
        const isSessionOk = areSessionsCompatible(sel.session_id || sel.run_id, predSessionId, predRunId);
        const isMatrixOk = !sel.source_matrix || (normalizeSourceMatrix(sel.source_matrix) === normalizeSourceMatrix(predFileName));

        if (isSessionOk && isMatrixOk) {
          validSelections.push(sel);
        } else {
          rejectedCount++;
        }
      });

      if (rejectedCount > 0) {
        warnings.push(`Choix finaux : ${rejectedCount} sélection(s) exclue(s) pour incompatibilité de session ou de source_matrix.`);
      }

      if (validSelections.length > 0) {
        ticketsFinals = {
          ...parsedFinals,
          Selections: validSelections,
          Total_Selectionnes: validSelections.length
        };
      } else {
        if (rawSelections.length > 0) {
          warnings.push('Choix finaux EXCLUS : toutes les sélections présentaient un session_id ou source_matrix incompatible.');
        } else {
          warnings.push('Choix finaux ne contient aucune sélection.');
        }
        ticketsFinals = null;
      }
    } else {
      missingSources.push('CHOIX_FINAUX');
      warnings.push('Choix finaux unavailable');
    }
  } catch (err) {
    warnings.push(`Error loading tickets: ${err.message}`);
  }

  // Build Map for CHOIX_FINAUX lookup (ONLY from strictly validated selections)
  const finalPicksByMatchId = new Map();
  const finalPicksByMatchup = new Map();

  if (ticketsFinals?.Selections && Array.isArray(ticketsFinals.Selections)) {
    ticketsFinals.Selections.forEach(sel => {
      if (sel.Match_ID) {
        finalPicksByMatchId.set(sel.Match_ID, sel);
      }
      if (sel.Match) {
        finalPicksByMatchup.set(cleanStr(sel.Match), sel);
      }
    });
  }

  // Build Set of Match_IDs present in assembled tickets
  const ticketMatchIds = new Set();
  if (ticketsAssembled?.tickets && Array.isArray(ticketsAssembled.tickets)) {
    ticketsAssembled.tickets.forEach(ticket => {
      (ticket.match_ids || []).forEach(id => ticketMatchIds.add(id));
    });
  }

  // 5. Correlate and enrich all matches
  const enrichedMatches = predictionsRaw.map(pred => {
    const parts = (pred.Matchup || '').split(' vs ');
    const homeRaw = parts[0] || '';
    const awayRaw = parts[1] || '';
    const pLeague = cleanStr(pred.League);
    const pKickoff = pred.kickoff_utc;

    // Fixture enrichment with STRICT controlled matching of BOTH teams and Candidate UNIQUENESS
    let matchedFixture = null;
    if (pKickoff) {
      const candidates = flattenedFixtures.filter(f => f.cleanLeague === pLeague && f.kickoff_utc === pKickoff);
      const matchingCandidates = candidates.filter(c => matchTeamNames(homeRaw, c.home) && matchTeamNames(awayRaw, c.away));
      // STRICT UNIQUENESS: Associate ONLY if exactly one candidate matches without ambiguity!
      if (matchingCandidates.length === 1) {
        matchedFixture = matchingCandidates[0];
      }
    }

    // Secondary fallback by date + league + BOTH teams with STRICT UNIQUENESS
    if (!matchedFixture && pred.Match_Date) {
      const fallbackCandidates = flattenedFixtures.filter(f => 
        f.cleanLeague === pLeague &&
        f.date === pred.Match_Date &&
        matchTeamNames(homeRaw, f.home) && matchTeamNames(awayRaw, f.away)
      );
      if (fallbackCandidates.length === 1) {
        matchedFixture = fallbackCandidates[0];
      }
    }

    // Master Pick / CHOIX_FINAUX tagging (derived ONLY from validated selections)
    let finalPick = null;
    if (pred.Match_ID && finalPicksByMatchId.has(pred.Match_ID)) {
      finalPick = finalPicksByMatchId.get(pred.Match_ID);
    } else {
      const cleanMatchupKey = cleanStr(pred.Matchup);
      if (finalPicksByMatchup.has(cleanMatchupKey)) {
        finalPick = finalPicksByMatchup.get(cleanMatchupKey);
      }
    }

    return {
      ...pred,
      date: matchedFixture?.date || pred.Match_Date || 'Date Inconnue',
      hours: matchedFixture?.hours || null,
      shortHome: matchedFixture?.home || homeRaw,
      shortAway: matchedFixture?.away || awayRaw,
      displayHome: getTeamDisplayName(matchedFixture?.home || homeRaw, pred.League),
      displayAway: getTeamDisplayName(matchedFixture?.away || awayRaw, pred.League),
      round: matchedFixture?.round || null,
      kickoff_utc: matchedFixture?.kickoff_utc || pred.kickoff_utc || null,
      fotmob_match_id: matchedFixture?.fotmob_match_id || null,
      isFinalPick: !!finalPick,
      finalPick: finalPick || null,
      masterReason: finalPick?.Streak_Reason || null,
      inTickets: pred.Match_ID ? ticketMatchIds.has(pred.Match_ID) : false,
      session_id: predSessionId,
      series_topology: seriesTopology
    };
  });

  // 6. Dynamically derive leagues
  const uniqueLeagueNames = Array.from(new Set(enrichedMatches.map(m => m.League).filter(Boolean))).sort();

  const dynamicLeagues = [
    { id: 'ALL', name: 'Toutes les Ligues', code: 'ALL', flag: '🌍' },
    ...uniqueLeagueNames.map(name => ({
      id: name.toUpperCase().replace(/\s+/g, ''),
      name: name,
      code: name,
      flag: getLeagueFlag(name)
    }))
  ];

  return {
    matches: enrichedMatches,
    leagues: dynamicLeagues,
    ticketsData: {
      assembled: ticketsAssembled,
      finals: ticketsFinals,
      loading: false
    },
    sessionMetadata: {
      sessionId: predSessionId,
      runId: predRunId,
      sourceMatrix: predFileName,
      seriesTopology,
      predictionsCount: enrichedMatches.length,
      leaguesCount: uniqueLeagueNames.length,
      warnings,
      missingSources
    }
  };
}
