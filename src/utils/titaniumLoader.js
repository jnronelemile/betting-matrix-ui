/**
 * TITANIUM V2 Data Loader
 * 
 * Responsible for loading, verifying integrity, correlating, and enriching
 * TITANIUM V2 datasets from /data/titanium_v2/.
 * Strictly respects TITANIUM outputs without recalculating probabilities or risk decisions.
 */

// Fallback league flags mapping
export const LEAGUE_FLAGS = {
  'PL': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'PREMIERLEAGUE': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'CHAMPIONSHIP': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'LALIGA': '🇪🇸',
  'LALIGA2': '🇪🇸',
  'SERIEA': '🇮🇹',
  'BUNDESLIGA': '🇩🇪',
  '2.BUNDESLIGA': '🇩🇪',
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
  'baltika kaliningrad': 'baltika'
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
  const match = s.match(/^(Run_[^_]+___[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}h[0-9]{2}m[0-9]{2}s)/);
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

export function getSeriesStatsUrl(match, sessionId) {
  if (!match || !match.Matchup) return null;
  const sId = sessionId || match.session_id || (match.run_id ? match.run_id.replace(/^RUN_/, '').split('_2026-')[0] : '');
  const leagueFolder = (match.League || '').toUpperCase().replace(/\s+/g, '');
  const parts = match.Matchup.split(' vs ');
  if (parts.length < 2) return null;
  const homeClean = parts[0].replace(/\s+/g, '').replace(/\//g, '_');
  const awayClean = parts[1].replace(/\s+/g, '').replace(/\//g, '_');
  const date = match.Match_Date || match.date || '';
  return `/data/titanium_v2/series/${sId}/${leagueFolder}/serie_stats_${homeClean}_${awayClean}_${date}.json`;
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
        tickets: {
          assembled: '/data/titanium_v2/tickets/TICKETS_ASSEMBLES.json',
          finals: '/data/titanium_v2/tickets/auxiliary/CHOIX_FINAUX.json'
        }
      };
    }
  }

  const warnings = [];
  const missingSources = [];

  // 2. Load Predictions Matrix (Primary Source)
  const predFileName = manifest.predictions?.[0];
  if (!predFileName) {
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

  // Extract session run_id / session_id from predictions
  const firstPred = predictionsRaw[0] || {};
  const predRunId = firstPred.run_id || '';
  const predSessionId = manifest.seriesRuns?.[0] || 
    (predRunId ? predRunId.replace(/^RUN_/, '').split('_2026-')[0] : '');

  // 3. Load Matches Fixtures (matches_to_predict)
  let fixturesByLeague = {};
  const matchesFileName = manifest.matches?.[0];
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
      round: matchedFixture?.round || null,
      fotmob_match_id: matchedFixture?.fotmob_match_id || null,
      isFinalPick: !!finalPick,
      finalPick: finalPick || null,
      masterReason: finalPick?.Streak_Reason || null,
      session_id: predSessionId
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
      predictionsCount: enrichedMatches.length,
      leaguesCount: uniqueLeagueNames.length,
      warnings,
      missingSources
    }
  };
}
