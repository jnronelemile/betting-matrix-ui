/**
 * TITANIUM WEB — Favorites Storage & Persistence Layer (WEB-FAVORITES-001)
 *
 * Responsabilités :
 * 1. Définir le schéma canonique versionné `titanium_favorites_v1`.
 * 2. Encapsuler les accès au `localStorage` avec tolérance aux pannes, détection de corruption
 *    et sauvegarde préventive des données brutes en cas d'erreur de parsing.
 * 3. Assurer l'intégrité déterministe des clés de Matchs et de Tickets entre les sessions.
 * 4. Préserver scrupuleusement les métriques numériques valides (dont le zéro `0`)
 *    sans jamais convertir les valeurs absentes ou invalides en zéro.
 * 5. Fournir les algorithmes de validation, assainissement (XSS), fusion (merge) et export JSON.
 *
 * Zéro recalcul client de probabilités, cotes, edges ou décisions de risque.
 */

import { cleanStr } from './titaniumLoader.js';
import { isValidNumericMetric } from './ticketIdentifier.js';

export const FAVORITES_STORAGE_KEY = 'titanium_favorites_v1';
export const FAVORITES_SCHEMA_VERSION = 1;
export const CORRUPTED_BACKUP_KEY_PREFIX = 'titanium_favorites_corrupted_bak_';
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 Mo maximum

/**
 * Assainit une chaîne de caractères pour prévenir toute injection de balises ou script (XSS)
 * tout en limitant la taille maximale.
 *
 * @param {*} val
 * @param {number} [maxLength=300]
 * @returns {string}
 */
export function sanitizeString(val, maxLength = 300) {
  if (val === null || val === undefined) return '';
  const str = String(val).slice(0, maxLength);
  return str
    .replace(/[<>]/g, '') // Supprime les délimiteurs de balises HTML
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Supprime les caractères de contrôle non-imprimables
    .trim();
}

/**
 * Valide et extrait une métrique quantitative sans jamais transformer une valeur absente,
 * manquante ("NOT_AVAILABLE", null, undefined) en 0.
 *
 * IMPORTANT : Le nombre 0 est une valeur mathématique valide (ex : tension nette = 0, z-score = 0, edge = 0)
 * et doit être strictement conservé comme `0`.
 *
 * @param {*} val
 * @returns {number|null}
 */
export function sanitizeNumericMetric(val) {
  if (isValidNumericMetric(val)) {
    return val;
  }
  if (typeof val === 'string' && val.trim() !== '' && val.trim() !== 'NOT_AVAILABLE') {
    const parsed = Number(val.trim());
    if (isValidNumericMetric(parsed)) {
      return parsed;
    }
  }
  return null;
}

/**
 * Calcule la clé canonique déterministe d'un match :
 * 1. Priorité 1 : `match.Match_ID` s'il est présent et non-vide.
 * 2. Repli composite déterministe : `${cleanStr(League)}__${cleanStr(Matchup)}__${date}`
 *    pour les jeux de données historiques ou les sources auxiliaires dépourvues de `Match_ID`.
 *
 * @param {Object} match
 * @returns {string|null}
 */
export function getCanonicalMatchKey(match) {
  if (!match || typeof match !== 'object') return null;

  if (typeof match.Match_ID === 'string' && match.Match_ID.trim().length > 0) {
    return match.Match_ID.trim();
  }

  const league = cleanStr(match.League || match.league || 'UNKNOWN_LEAGUE');
  const matchup = cleanStr(
    match.Matchup ||
    (match.homeRaw && match.awayRaw ? `${match.homeRaw} vs ${match.awayRaw}` : '') ||
    (match.home && match.away ? `${match.home} vs ${match.away}` : '') ||
    'UNKNOWN_MATCH'
  );
  const date = match.date || match.Match_Date || 'UNKNOWN_DATE';

  return `${league}__${matchup}__${date}`;
}

/**
 * Recherche exacte et non ambiguë d'un match dans une liste de matchs (WEB-FAVORITES-001 - Phase 5 / Stabilisation).
 * Évite toute fausse correspondance ou ouverture accidentelle basée sur un substring approximatif.
 *
 * Priorités et garanties d'unicité :
 * 1. Match_ID exact avec contrôle de multiplicité (retourne null si collision ou multiplicité > 1).
 * 2. Clé canonique composite exacte avec contrôle de multiplicité (retourne null si > 1 candidat).
 * 3. Matchup exact ET Ligue exacte (+ Date si dispo), avec désambiguïsation par kickoff_utc si nécessaire.
 * 4. Retourne null en cas d'absence (0) ou d'ambiguïté (> 1 candidat non résolu).
 *
 * @param {Array<Object>} matches Liste de matchs source
 * @param {string|Object} matchOrId Identifiant ou objet match
 * @param {string|null} [league=null] Ligue optionnelle
 * @param {string|null} [date=null] Date optionnelle
 * @returns {Object|null}
 */
export function findExactMatch(matches, matchOrId, league = null, date = null) {
  if (!Array.isArray(matches) || matches.length === 0 || !matchOrId) return null;

  const targetId = typeof matchOrId === 'object'
    ? (matchOrId.matchId || matchOrId.Match_ID || matchOrId.match_id)
    : (typeof matchOrId === 'string' ? matchOrId : null);

  const targetKey = typeof matchOrId === 'object'
    ? (matchOrId.canonicalKey || matchOrId.id)
    : (typeof matchOrId === 'string' && matchOrId.includes('__') ? matchOrId : null);

  const targetMatchup = typeof matchOrId === 'object'
    ? (matchOrId.matchup || matchOrId.Matchup || (matchOrId.home && matchOrId.away ? `${matchOrId.home} vs ${matchOrId.away}` : null) || (matchOrId.homeRaw && matchOrId.awayRaw ? `${matchOrId.homeRaw} vs ${matchOrId.awayRaw}` : null))
    : (typeof matchOrId === 'string' && matchOrId.includes(' vs ') ? matchOrId : null);

  const targetLeague = league || (typeof matchOrId === 'object' ? (matchOrId.league || matchOrId.League || matchOrId.cleanLeague) : null);
  const targetDate = date || (typeof matchOrId === 'object' ? (matchOrId.date || matchOrId.Match_Date || matchOrId.Date) : null);
  const targetKickoff = typeof matchOrId === 'object' ? (matchOrId.kickoff_utc || matchOrId.kickoff) : null;

  // 1. Recherche exacte par Match_ID, avec contrôle de multiplicité
  if (targetId && typeof targetId === 'string' && targetId.trim()) {
    const cleanTargetId = targetId.trim();
    const candidatesById = matches.filter(m => m.Match_ID && m.Match_ID.trim() === cleanTargetId);
    if (candidatesById.length === 1) {
      return candidatesById[0];
    }
    if (candidatesById.length > 1) {
      // Ambiguïté : plusieurs rencontres partagent le même Match_ID
      return null;
    }
  }

  // 2. Recherche par clé canonique composite exacte, avec contrôle de multiplicité
  if (targetKey && typeof targetKey === 'string' && targetKey.trim()) {
    const cleanTargetKey = targetKey.trim();
    if (!cleanTargetKey.includes('UNKNOWN_MATCH')) {
      const candidatesByKey = matches.filter(m => {
        const k = getCanonicalMatchKey(m);
        return k && k.trim() === cleanTargetKey;
      });
      if (candidatesByKey.length === 1) {
        return candidatesByKey[0];
      }
      if (candidatesByKey.length > 1) {
        // Ambiguïté : plusieurs rencontres partagent la même clé composite
        return null;
      }
    }
  }

  // 3. Recherche par confrontation, ligue et date (avec désambiguïsation par kickoff_utc si nécessaire)
  if (targetMatchup && targetLeague) {
    const cleanTargetMatchup = cleanStr(targetMatchup);
    const cleanTargetLeague = cleanStr(targetLeague);

    let candidates = matches.filter(m => {
      const matchLeague = cleanStr(m.League || m.league);
      if (matchLeague !== cleanTargetLeague) return false;

      const matchup = cleanStr(
        m.Matchup ||
        (m.homeRaw && m.awayRaw ? `${m.homeRaw} vs ${m.awayRaw}` : '') ||
        (m.home && m.away ? `${m.home} vs ${m.away}` : '')
      );
      if (matchup !== cleanTargetMatchup) return false;

      if (targetDate) {
        const mDate = m.date || m.Match_Date;
        if (!mDate || cleanStr(mDate) !== cleanStr(targetDate)) {
          return false;
        }
      }

      return true;
    });

    if (candidates.length === 1) {
      return candidates[0];
    }

    // 4. Utilisation de kickoff_utc lorsqu'il est disponible et nécessaire à la désambiguïsation
    if (candidates.length > 1 && targetKickoff) {
      const filteredByKickoff = candidates.filter(m => {
        if (!m.kickoff_utc) return false;
        if (cleanStr(m.kickoff_utc) === cleanStr(targetKickoff)) return true;
        const t1 = new Date(m.kickoff_utc).getTime();
        const t2 = new Date(targetKickoff).getTime();
        return !isNaN(t1) && !isNaN(t2) && t1 === t2;
      });

      if (filteredByKickoff.length === 1) {
        return filteredByKickoff[0];
      }
    }

    // 5. Retourner null si 0 ou > 1 candidats correspondent (ambiguïté)
    return null;
  }

  return null;
}

/**
 * Génère un identifiant unique et déterministe pour un nouveau groupe personnalisé.
 *
 * @returns {string}
 */
export function generateGroupId() {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  return `grp_${timestamp}_${randomSuffix}`;
}

/**
 * Vérifie si un nom de groupe existe déjà parmi les groupes existants (insensible à la casse).
 *
 * @param {Object} groups Dictionnaire des groupes
 * @param {string} candidateName Nom proposé
 * @param {string|null} [excludeGroupId=null] Identifiant du groupe à exclure (en cas de renommage)
 * @returns {boolean}
 */
export function isDuplicateGroupName(groups, candidateName, excludeGroupId = null) {
  if (!groups || typeof groups !== 'object') return false;
  const normalized = (candidateName || '').trim().toLowerCase();
  if (!normalized) return false;

  return Object.values(groups).some(g => {
    if (!g || typeof g !== 'object') return false;
    if (excludeGroupId && g.id === excludeGroupId) return false;
    return (g.name || '').trim().toLowerCase() === normalized;
  });
}

/**
 * Génère un nom de groupe unique en ajoutant un suffixe automatique `(2)`, `(3)`, etc. si nécessaire.
 *
 * @param {Object} groups
 * @param {string} baseName
 * @returns {string}
 */
export function generateUniqueGroupName(groups, baseName) {
  const trimmed = sanitizeString(baseName, 80) || 'Nouveau groupe';
  let candidate = trimmed;
  let counter = 2;

  while (isDuplicateGroupName(groups, candidate)) {
    candidate = `${trimmed} (${counter})`;
    counter++;
  }

  return candidate;
}

/**
 * Initialise un magasin de favoris vide conforme au schéma V1.
 *
 * @returns {Object}
 */
export function createInitialStore() {
  const now = new Date().toISOString();
  return {
    version: FAVORITES_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    groups: {},
    matches: {},
    tickets: {}
  };
}

/**
 * Construit un objet snapshot complet pour un match favori sans altérer les sorties TITANIUM.
 *
 * @param {Object} match Données du match source
 * @param {Object|null} [originSession=null] Métadonnées de session courante
 * @param {Array<string>} [initialGroupIds=[]] Identifiants de groupes initiaux
 * @returns {Object|null}
 */
export function buildMatchFavorite(match, originSession = null, initialGroupIds = []) {
  if (!match || typeof match !== 'object') return null;

  const key = getCanonicalMatchKey(match);
  if (!key) return null;

  const parts = (match.Matchup || '').split(' vs ');
  const homeRaw = match.homeRaw || match.shortHome || parts[0] || 'Home';
  const awayRaw = match.awayRaw || match.shortAway || parts[1] || 'Away';
  const displayHome = match.displayHome || match.home || homeRaw;
  const displayAway = match.displayAway || match.away || awayRaw;

  const probs = match.True_Probabilities || {};
  const investSignals = match.Risk_Management_Context?.Investment_Signals || {};
  const isKillSwitch = Boolean(
    investSignals.IS_KILL_SWITCH_ACTIVE ||
    ((probs.PROB_1 === 0 || probs.PROB_1 == null) && (probs.PROB_O25 === 0 || probs.PROB_O25 == null))
  );

  const activeSuperSignals = [];
  if (match.Super_Signals && typeof match.Super_Signals === 'object') {
    Object.entries(match.Super_Signals).forEach(([sigKey, val]) => {
      if (val === true) activeSuperSignals.push(sigKey);
    });
  }

  const now = new Date().toISOString();
  const validGroupIds = Array.isArray(initialGroupIds)
    ? Array.from(new Set(initialGroupIds.filter(id => typeof id === 'string' && id.trim().length > 0)))
    : [];

  return {
    id: key,
    matchId: typeof match.Match_ID === 'string' && match.Match_ID.trim() ? match.Match_ID.trim() : null,
    canonicalKey: key,
    matchup: sanitizeString(match.Matchup || `${homeRaw} vs ${awayRaw}`),
    league: sanitizeString(match.League || match.league || 'UNKNOWN_LEAGUE'),
    date: sanitizeString(match.date || match.Match_Date || 'UNKNOWN_DATE'),
    hours: match.hours ? sanitizeString(match.hours, 10) : null,
    kickoff_utc: match.kickoff_utc ? sanitizeString(match.kickoff_utc, 30) : null,
    homeRaw: sanitizeString(homeRaw, 100),
    awayRaw: sanitizeString(awayRaw, 100),
    displayHome: sanitizeString(displayHome, 100),
    displayAway: sanitizeString(displayAway, 100),
    round: match.round != null ? sanitizeString(String(match.round), 30) : null,
    groupIds: validGroupIds,
    savedAt: now,
    updatedAt: now,
    originSession: {
      sessionId: sanitizeString(originSession?.sessionId || match.session_id || 'UNKNOWN_SESSION', 120),
      runId: sanitizeString(originSession?.runId || match.run_id || '', 120),
      sourceMatrix: sanitizeString(originSession?.sourceMatrix || '', 160)
    },
    snapshot: {
      prob1: sanitizeNumericMetric(probs.PROB_1),
      probX: sanitizeNumericMetric(probs.PROB_X),
      prob2: sanitizeNumericMetric(probs.PROB_2),
      probO25: sanitizeNumericMetric(probs.PROB_O25),
      isFinalPick: Boolean(match.isFinalPick),
      isKillSwitch,
      superSignals: activeSuperSignals,
      scoreEV: sanitizeNumericMetric(match.finalPick?.Score_EV ?? match.score_ev),
      tier: sanitizeNumericMetric(match.finalPick?.Tier ?? match.tier),
      masterReason: match.masterReason ? sanitizeString(match.masterReason, 200) : null,
      confidenceIndex: sanitizeNumericMetric(match.Calibration_Diagnostics?.confidence_index)
    }
  };
}

/**
 * Construit un objet snapshot complet pour un ticket favori sans altérer les sorties TITANIUM.
 *
 * @param {Object} ticket Données du ticket source
 * @param {Object|null} [originSession=null] Métadonnées de session courante
 * @returns {Object|null}
 */
export function buildTicketFavorite(ticket, originSession = null) {
  if (!ticket || typeof ticket !== 'object') return null;

  const rawId = ticket.ticket_id;
  if (!rawId || typeof rawId !== 'string' || !rawId.trim()) {
    return null; // ticket_id canonique strict obligatoire
  }

  const ticketId = rawId.trim();
  const now = new Date().toISOString();

  // Snapshot propre et immuable des jambes
  const rawLegs = Array.isArray(ticket.legs) ? ticket.legs : [];
  const snapshotLegs = rawLegs.map(l => {
    return {
      Bet_ID: l.Bet_ID ? sanitizeString(l.Bet_ID, 80) : null,
      Match_ID: l.Match_ID ? sanitizeString(l.Match_ID, 100) : null,
      Match: sanitizeString(l.Match || 'Match inconnu'),
      League: sanitizeString(l.League || 'Ligue inconnue'),
      Marche: sanitizeString(l.Marche || l.family_name || 'Marché'),
      Type: l.Type ? sanitizeString(l.Type, 50) : null,
      Tier: sanitizeNumericMetric(l.Tier),
      Prob: sanitizeNumericMetric(l.Prob),
      Cote_Ref: sanitizeNumericMetric(l.Cote_Ref),
      Score_EV: sanitizeNumericMetric(l.Score_EV),
      Date: l.Date ? sanitizeString(l.Date, 20) : null,
      Heure: l.Heure ? sanitizeString(l.Heure, 15) : null,
      kickoff_utc: l.kickoff_utc ? sanitizeString(l.kickoff_utc, 35) : null,
      Super_Signal: Boolean(l.Super_Signal),
      Alpha: Boolean(l.Alpha),
      Streak_Status: l.Streak_Status ? sanitizeString(l.Streak_Status, 50) : null,
      Streak_Reason: l.Streak_Reason ? sanitizeString(l.Streak_Reason, 200) : null,
      family_code: l.family_code ? sanitizeString(l.family_code, 20) : null,
      family_name: l.family_name ? sanitizeString(l.family_name, 50) : null,
      confidence_category: l.confidence_category ? sanitizeString(l.confidence_category, 30) : null,
      confidence_badge: l.confidence_badge ? sanitizeString(l.confidence_badge, 10) : null
    };
  });

  const rawMetrics = ticket.metrics || {};

  return {
    ticketId,
    humanIdAtSave: ticket.human_id ? sanitizeString(ticket.human_id, 30) : null,
    savedAt: now,
    updatedAt: now,
    originSession: {
      sessionId: sanitizeString(originSession?.sessionId || ticket.run_id || 'UNKNOWN_SESSION', 120),
      runId: sanitizeString(originSession?.runId || ticket.run_id || '', 120),
      sourceMatrix: sanitizeString(originSession?.sourceMatrix || ticket.source_matrix || '', 160)
    },
    snapshot: {
      product_code: ticket.product_code ? sanitizeString(ticket.product_code, 40) : null,
      strategy_code: ticket.strategy_code ? sanitizeString(ticket.strategy_code, 40) : null,
      scope_type: ticket.scope_type ? sanitizeString(ticket.scope_type, 40) : null,
      scope_value: ticket.scope_value ? sanitizeString(ticket.scope_value, 60) : null,
      metrics: {
        leg_count: sanitizeNumericMetric(rawMetrics.leg_count ?? snapshotLegs.length),
        mean_leg_model_probability: sanitizeNumericMetric(rawMetrics.mean_leg_model_probability),
        min_leg_model_probability: sanitizeNumericMetric(rawMetrics.min_leg_model_probability),
        joint_ticket_probability: sanitizeNumericMetric(rawMetrics.joint_ticket_probability),
        reference_odds_floor_product: sanitizeNumericMetric(rawMetrics.reference_odds_floor_product),
        kickoff_span_minutes: sanitizeNumericMetric(rawMetrics.kickoff_span_minutes),
        earliest_kickoff_utc: rawMetrics.earliest_kickoff_utc ? sanitizeString(rawMetrics.earliest_kickoff_utc, 35) : null,
        latest_kickoff_utc: rawMetrics.latest_kickoff_utc ? sanitizeString(rawMetrics.latest_kickoff_utc, 35) : null
      },
      legs: snapshotLegs
    }
  };
}

/**
 * Accès sécurisé au localStorage du navigateur.
 *
 * @param {Storage} [customStorage=null]
 * @returns {Storage|null}
 */
export function getSafeStorage(customStorage = null) {
  if (customStorage && typeof customStorage.getItem === 'function') {
    return customStorage;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Test de vérification d'accès (inaccessible sous certains réglages de navigation privée)
      const testKey = '__titanium_storage_probe__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    } catch (_) {
      return null;
    }
  }
  return null;
}

/**
 * Charge et valide l'état complet des favoris depuis le stockage persistant.
 *
 * @param {Storage} [storage=null]
 * @returns {{
 *   success: boolean,
 *   store: Object,
 *   corrupted: boolean,
 *   unsupportedVersion: boolean,
 *   backupKey: string|null,
 *   error: Error|null
 * }}
 */
export function loadFavoritesFromStorage(storage = null) {
  const safeStorage = getSafeStorage(storage);
  const initial = createInitialStore();

  if (!safeStorage) {
    return {
      success: true,
      store: initial,
      corrupted: false,
      unsupportedVersion: false,
      backupKey: null,
      storageAvailable: false,
      error: null
    };
  }

  let raw = null;
  try {
    raw = safeStorage.getItem(FAVORITES_STORAGE_KEY);
  } catch (err) {
    return {
      success: false,
      store: initial,
      corrupted: false,
      unsupportedVersion: false,
      backupKey: null,
      storageAvailable: false,
      error: err
    };
  }

  if (raw === null || raw === undefined || raw.trim() === '') {
    return {
      success: true,
      store: initial,
      corrupted: false,
      unsupportedVersion: false,
      backupKey: null,
      storageAvailable: true,
      error: null
    };
  }

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (parseErr) {
    // Corruption détectée : Sauvegarde de sécurité sans écrasement destructif
    const backupKey = `${CORRUPTED_BACKUP_KEY_PREFIX}${Date.now()}`;
    try {
      safeStorage.setItem(backupKey, raw);
    } catch (_) {
      // Ignorer si la sauvegarde échoue (ex: quota saturé)
    }

    return {
      success: false,
      store: initial,
      corrupted: true,
      unsupportedVersion: false,
      backupKey,
      storageAvailable: true,
      error: parseErr
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      success: false,
      store: initial,
      corrupted: true,
      unsupportedVersion: false,
      backupKey: null,
      storageAvailable: true,
      error: new Error('Stockage corrompu : la racine JSON n\'est pas un objet')
    };
  }

  if (parsed.version !== FAVORITES_SCHEMA_VERSION) {
    return {
      success: false,
      store: initial,
      corrupted: false,
      unsupportedVersion: true,
      backupKey: null,
      storageAvailable: true,
      error: new Error(`Version de schéma non supportée : ${parsed.version} (attendu : ${FAVORITES_SCHEMA_VERSION})`)
    };
  }

  // Normalisation défensive des nœuds du store
  const normalizedStore = {
    version: FAVORITES_SCHEMA_VERSION,
    createdAt: parsed.createdAt || initial.createdAt,
    updatedAt: parsed.updatedAt || initial.updatedAt,
    groups: (parsed.groups && typeof parsed.groups === 'object' && !Array.isArray(parsed.groups)) ? parsed.groups : {},
    matches: (parsed.matches && typeof parsed.matches === 'object' && !Array.isArray(parsed.matches)) ? parsed.matches : {},
    tickets: (parsed.tickets && typeof parsed.tickets === 'object' && !Array.isArray(parsed.tickets)) ? parsed.tickets : {}
  };

  // Assainissement de la cohérence interne des groupes pour chaque match
  const validGroupIds = new Set(Object.keys(normalizedStore.groups));
  Object.values(normalizedStore.matches).forEach(m => {
    if (m && Array.isArray(m.groupIds)) {
      m.groupIds = m.groupIds.filter(gid => validGroupIds.has(gid));
    } else if (m) {
      m.groupIds = [];
    }
  });

  return {
    success: true,
    store: normalizedStore,
    corrupted: false,
    unsupportedVersion: false,
    backupKey: null,
    storageAvailable: true,
    error: null
  };
}

/**
 * Sauvegarde l'état des favoris dans le stockage local persistant avec gestion d'erreurs.
 *
 * @param {Object} store
 * @param {Storage} [storage=null]
 * @returns {{
 *   success: boolean,
 *   quotaExceeded: boolean,
 *   storageAvailable: boolean,
 *   error: Error|null
 * }}
 */
export function saveFavoritesToStorage(store, storage = null) {
  const safeStorage = getSafeStorage(storage);
  if (!safeStorage) {
    return {
      success: false,
      quotaExceeded: false,
      storageAvailable: false,
      error: new Error('Stockage local indisponible ou accès refusé')
    };
  }

  if (!store || typeof store !== 'object') {
    return {
      success: false,
      quotaExceeded: false,
      storageAvailable: true,
      error: new Error('Tentative de sauvegarde d\'un magasin de favoris invalide')
    };
  }

  try {
    const payloadToSave = {
      ...store,
      version: FAVORITES_SCHEMA_VERSION,
      updatedAt: new Date().toISOString()
    };
    safeStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(payloadToSave));
    return {
      success: true,
      quotaExceeded: false,
      storageAvailable: true,
      error: null
    };
  } catch (err) {
    const isQuota = err && (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014
    );

    return {
      success: false,
      quotaExceeded: Boolean(isQuota),
      storageAvailable: true,
      error: err
    };
  }
}

/**
 * Exporte l'intégralité du magasin des favoris dans une chaîne JSON formattée et prête au téléchargement.
 *
 * @param {Object} store
 * @returns {string}
 */
export function exportFavoritesToJson(store) {
  const safeStore = store && typeof store === 'object' ? store : createInitialStore();
  const exportPayload = {
    app: 'TITANIUM_WEB',
    format: 'TITANIUM_FAVORITES_BACKUP',
    schemaVersion: FAVORITES_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    store: {
      version: FAVORITES_SCHEMA_VERSION,
      createdAt: safeStore.createdAt || new Date().toISOString(),
      updatedAt: safeStore.updatedAt || new Date().toISOString(),
      groups: safeStore.groups || {},
      matches: safeStore.matches || {},
      tickets: safeStore.tickets || {}
    }
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Valide et normalise un contenu JSON importé.
 * Rejette strictement les fichiers trop volumineux, malformés ou de schéma incompatible.
 *
 * @param {string} jsonStr
 * @returns {{
 *   valid: boolean,
 *   errors: string[],
 *   store: Object|null
 * }}
 */
export function validateImportPayload(jsonStr) {
  if (typeof jsonStr !== 'string' || !jsonStr.trim()) {
    return { valid: false, errors: ['Contenu du fichier importé vide ou invalide'], store: null };
  }

  if (jsonStr.length > MAX_IMPORT_BYTES) {
    return { valid: false, errors: [`Fichier trop volumineux (${(jsonStr.length / 1024 / 1024).toFixed(1)} Mo, max 5 Mo)`], store: null };
  }

  let parsed = null;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    return { valid: false, errors: [`Erreur de syntaxe JSON : ${e.message}`], store: null };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, errors: ['La racine du fichier importé doit être un objet JSON valide'], store: null };
  }

  // Prise en charge des deux formats : conteneur exportPayload ou store brut
  const rawStore = parsed.store || parsed;
  const version = parsed.schemaVersion || rawStore.version;

  if (version !== FAVORITES_SCHEMA_VERSION) {
    return {
      valid: false,
      errors: [`Version de schéma incompatible (${version || 'indéfinie'}). Seule la V${FAVORITES_SCHEMA_VERSION} est supportée.`],
      store: null
    };
  }

  const rawGroups = (rawStore.groups && typeof rawStore.groups === 'object' && !Array.isArray(rawStore.groups)) ? rawStore.groups : {};
  const rawMatches = (rawStore.matches && typeof rawStore.matches === 'object' && !Array.isArray(rawStore.matches)) ? rawStore.matches : {};
  const rawTickets = (rawStore.tickets && typeof rawStore.tickets === 'object' && !Array.isArray(rawStore.tickets)) ? rawStore.tickets : {};

  // Assainissement des groupes importés
  const sanitizedGroups = {};
  Object.entries(rawGroups).forEach(([gid, g]) => {
    if (g && typeof g === 'object') {
      const cleanId = sanitizeString(g.id || gid, 60);
      const cleanName = sanitizeString(g.name || 'Groupe importé', 80);
      if (cleanId && cleanName) {
        sanitizedGroups[cleanId] = {
          id: cleanId,
          name: cleanName,
          createdAt: g.createdAt || new Date().toISOString(),
          updatedAt: g.updatedAt || new Date().toISOString()
        };
      }
    }
  });

  const validGroupIds = new Set(Object.keys(sanitizedGroups));

  // Assainissement des matchs importés
  const sanitizedMatches = {};
  Object.entries(rawMatches).forEach(([mid, m]) => {
    if (m && typeof m === 'object') {
      const cleanKey = getCanonicalMatchKey(m) || sanitizeString(m.id || mid, 120);
      if (cleanKey) {
        const cleanGroupIds = Array.isArray(m.groupIds)
          ? m.groupIds.map(id => sanitizeString(id, 60)).filter(id => validGroupIds.has(id))
          : [];

        sanitizedMatches[cleanKey] = {
          id: cleanKey,
          matchId: m.matchId ? sanitizeString(m.matchId, 100) : null,
          canonicalKey: cleanKey,
          matchup: sanitizeString(m.matchup || 'Match inconnu', 120),
          league: sanitizeString(m.league || 'Ligue inconnue', 80),
          date: sanitizeString(m.date || 'Date inconnue', 25),
          hours: m.hours ? sanitizeString(m.hours, 10) : null,
          kickoff_utc: m.kickoff_utc ? sanitizeString(m.kickoff_utc, 35) : null,
          homeRaw: sanitizeString(m.homeRaw || '', 100),
          awayRaw: sanitizeString(m.awayRaw || '', 100),
          displayHome: sanitizeString(m.displayHome || m.homeRaw || 'Home', 100),
          displayAway: sanitizeString(m.displayAway || m.awayRaw || 'Away', 100),
          round: m.round ? sanitizeString(String(m.round), 30) : null,
          groupIds: cleanGroupIds,
          savedAt: m.savedAt || new Date().toISOString(),
          updatedAt: m.updatedAt || new Date().toISOString(),
          originSession: {
            sessionId: sanitizeString(m.originSession?.sessionId || 'IMPORTED_SESSION', 120),
            runId: sanitizeString(m.originSession?.runId || '', 120),
            sourceMatrix: sanitizeString(m.originSession?.sourceMatrix || '', 160)
          },
          snapshot: {
            prob1: sanitizeNumericMetric(m.snapshot?.prob1),
            probX: sanitizeNumericMetric(m.snapshot?.probX),
            prob2: sanitizeNumericMetric(m.snapshot?.prob2),
            probO25: sanitizeNumericMetric(m.snapshot?.probO25),
            isFinalPick: Boolean(m.snapshot?.isFinalPick),
            isKillSwitch: Boolean(m.snapshot?.isKillSwitch),
            superSignals: Array.isArray(m.snapshot?.superSignals) ? m.snapshot.superSignals.map(s => sanitizeString(s, 50)) : [],
            scoreEV: sanitizeNumericMetric(m.snapshot?.scoreEV),
            tier: sanitizeNumericMetric(m.snapshot?.tier),
            masterReason: m.snapshot?.masterReason ? sanitizeString(m.snapshot.masterReason, 200) : null,
            confidenceIndex: sanitizeNumericMetric(m.snapshot?.confidenceIndex)
          }
        };
      }
    }
  });

  // Assainissement des tickets importés
  const sanitizedTickets = {};
  Object.entries(rawTickets).forEach(([tid, t]) => {
    if (t && typeof t === 'object') {
      const cleanTicketId = sanitizeString(t.ticketId || tid, 100);
      if (cleanTicketId) {
        const rawLegs = Array.isArray(t.snapshot?.legs) ? t.snapshot.legs : [];
        const cleanLegs = rawLegs.map(l => ({
          Bet_ID: l.Bet_ID ? sanitizeString(l.Bet_ID, 80) : null,
          Match_ID: l.Match_ID ? sanitizeString(l.Match_ID, 100) : null,
          Match: sanitizeString(l.Match || 'Match inconnu', 120),
          League: sanitizeString(l.League || 'Ligue inconnue', 80),
          Marche: sanitizeString(l.Marche || 'Marché', 80),
          Type: l.Type ? sanitizeString(l.Type, 50) : null,
          Tier: sanitizeNumericMetric(l.Tier),
          Prob: sanitizeNumericMetric(l.Prob),
          Cote_Ref: sanitizeNumericMetric(l.Cote_Ref),
          Score_EV: sanitizeNumericMetric(l.Score_EV),
          Date: l.Date ? sanitizeString(l.Date, 20) : null,
          Heure: l.Heure ? sanitizeString(l.Heure, 15) : null,
          kickoff_utc: l.kickoff_utc ? sanitizeString(l.kickoff_utc, 35) : null,
          Super_Signal: Boolean(l.Super_Signal),
          Alpha: Boolean(l.Alpha),
          Streak_Status: l.Streak_Status ? sanitizeString(l.Streak_Status, 50) : null,
          Streak_Reason: l.Streak_Reason ? sanitizeString(l.Streak_Reason, 200) : null,
          family_code: l.family_code ? sanitizeString(l.family_code, 20) : null,
          family_name: l.family_name ? sanitizeString(l.family_name, 50) : null,
          confidence_category: l.confidence_category ? sanitizeString(l.confidence_category, 30) : null,
          confidence_badge: l.confidence_badge ? sanitizeString(l.confidence_badge, 10) : null
        }));

        sanitizedTickets[cleanTicketId] = {
          ticketId: cleanTicketId,
          humanIdAtSave: t.humanIdAtSave ? sanitizeString(t.humanIdAtSave, 30) : null,
          savedAt: t.savedAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString(),
          originSession: {
            sessionId: sanitizeString(t.originSession?.sessionId || 'IMPORTED_SESSION', 120),
            runId: sanitizeString(t.originSession?.runId || '', 120),
            sourceMatrix: sanitizeString(t.originSession?.sourceMatrix || '', 160)
          },
          snapshot: {
            product_code: t.snapshot?.product_code ? sanitizeString(t.snapshot.product_code, 40) : null,
            strategy_code: t.snapshot?.strategy_code ? sanitizeString(t.snapshot.strategy_code, 40) : null,
            scope_type: t.snapshot?.scope_type ? sanitizeString(t.snapshot.scope_type, 40) : null,
            scope_value: t.snapshot?.scope_value ? sanitizeString(t.snapshot.scope_value, 60) : null,
            metrics: {
              leg_count: sanitizeNumericMetric(t.snapshot?.metrics?.leg_count ?? cleanLegs.length),
              mean_leg_model_probability: sanitizeNumericMetric(t.snapshot?.metrics?.mean_leg_model_probability),
              min_leg_model_probability: sanitizeNumericMetric(t.snapshot?.metrics?.min_leg_model_probability),
              joint_ticket_probability: sanitizeNumericMetric(t.snapshot?.metrics?.joint_ticket_probability),
              reference_odds_floor_product: sanitizeNumericMetric(t.snapshot?.metrics?.reference_odds_floor_product),
              kickoff_span_minutes: sanitizeNumericMetric(t.snapshot?.metrics?.kickoff_span_minutes),
              earliest_kickoff_utc: t.snapshot?.metrics?.earliest_kickoff_utc ? sanitizeString(t.snapshot.metrics.earliest_kickoff_utc, 35) : null,
              latest_kickoff_utc: t.snapshot?.metrics?.latest_kickoff_utc ? sanitizeString(t.snapshot.metrics.latest_kickoff_utc, 35) : null
            },
            legs: cleanLegs
          }
        };
      }
    }
  });

  return {
    valid: true,
    errors: [],
    store: {
      version: FAVORITES_SCHEMA_VERSION,
      createdAt: rawStore.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      groups: sanitizedGroups,
      matches: sanitizedMatches,
      tickets: sanitizedTickets
    }
  };
}

/**
 * Fusionne de manière déterministe et sans écrasement destructif deux magasins de favoris.
 * - Préserve l'existant.
 * - En cas de collision d'identifiant de groupe avec noms différents, attribue un nouvel identifiant au groupe importé et remappe ses matchs.
 * - En cas de collision de nom de groupe, applique une désambiguïsation propre `Nom (importé)`.
 * - Pour les matchs communs, réalise l'union des `groupIds`.
 *
 * @param {Object} currentStore
 * @param {Object} incomingStore
 * @returns {Object} Magasin fusionné
 */
export function mergeFavoritesStores(currentStore, incomingStore) {
  const base = currentStore && typeof currentStore === 'object' ? currentStore : createInitialStore();
  const incoming = incomingStore && typeof incomingStore === 'object' ? incomingStore : createInitialStore();

  const mergedGroups = { ...(base.groups || {}) };
  const groupIdRemap = new Map(); // incomingGroupId -> effectiveGroupId

  // 1. Fusion des groupes
  Object.values(incoming.groups || {}).forEach(incomingGroup => {
    if (!incomingGroup || !incomingGroup.id) return;

    const existingById = mergedGroups[incomingGroup.id];
    if (existingById) {
      if (existingById.name.trim().toLowerCase() === incomingGroup.name.trim().toLowerCase()) {
        // Groupe identique : réutilise l'existant
        groupIdRemap.set(incomingGroup.id, existingById.id);
      } else {
        // Même ID mais noms différents : génère un nouvel ID pour l'entrant
        const newId = generateGroupId();
        const safeName = generateUniqueGroupName(mergedGroups, `${incomingGroup.name} (importé)`);
        mergedGroups[newId] = {
          id: newId,
          name: safeName,
          createdAt: incomingGroup.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        groupIdRemap.set(incomingGroup.id, newId);
      }
    } else {
      // Nouvel ID : vérifie si le nom existe déjà
      const safeName = isDuplicateGroupName(mergedGroups, incomingGroup.name)
        ? generateUniqueGroupName(mergedGroups, incomingGroup.name)
        : incomingGroup.name;

      mergedGroups[incomingGroup.id] = {
        id: incomingGroup.id,
        name: safeName,
        createdAt: incomingGroup.createdAt || new Date().toISOString(),
        updatedAt: incomingGroup.updatedAt || new Date().toISOString()
      };
      groupIdRemap.set(incomingGroup.id, incomingGroup.id);
    }
  });

  // 2. Fusion des matchs
  const mergedMatches = { ...(base.matches || {}) };
  Object.values(incoming.matches || {}).forEach(incomingMatch => {
    if (!incomingMatch || !incomingMatch.id) return;

    // Remappage des groupes du match entrant
    const remappedGroupIds = (incomingMatch.groupIds || []).map(gid => {
      return groupIdRemap.get(gid) || gid;
    }).filter(gid => Boolean(mergedGroups[gid]));

    const existingMatch = mergedMatches[incomingMatch.id];
    if (existingMatch) {
      // Match déjà présent : union des appartenances de groupes
      const combinedGroupIds = Array.from(new Set([
        ...(existingMatch.groupIds || []),
        ...remappedGroupIds
      ]));

      mergedMatches[incomingMatch.id] = {
        ...existingMatch,
        groupIds: combinedGroupIds,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Nouveau match favori importé
      mergedMatches[incomingMatch.id] = {
        ...incomingMatch,
        groupIds: Array.from(new Set(remappedGroupIds)),
        updatedAt: new Date().toISOString()
      };
    }
  });

  // 3. Fusion des tickets
  const mergedTickets = { ...(base.tickets || {}) };
  Object.values(incoming.tickets || {}).forEach(incomingTicket => {
    if (!incomingTicket || !incomingTicket.ticketId) return;

    if (!mergedTickets[incomingTicket.ticketId]) {
      mergedTickets[incomingTicket.ticketId] = {
        ...incomingTicket,
        updatedAt: new Date().toISOString()
      };
    }
  });

  return {
    version: FAVORITES_SCHEMA_VERSION,
    createdAt: base.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    groups: mergedGroups,
    matches: mergedMatches,
    tickets: mergedTickets
  };
}
