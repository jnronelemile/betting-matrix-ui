/**
 * TITANIUM V2 — Pure Ticket & Pick Filter Predicates (WEB-001-B)
 *
 * Responsabilités :
 * 1. Algèbre de filtrage pure et déterministe pour TICKETS_ASSEMBLES et CHOIX_FINAUX.
 * 2. Prédicat unifié sur les dimensions relatives aux jambes (Ligue, Groupe de ligues, Marché, Date)
 *    avec support rigoureux des modes `ANY` (au moins une même jambe valide l'ensemble) et
 *    `ALL` (toutes les jambes valident l'ensemble).
 * 3. Registre explicite des groupes de ligues avec fallback sécurisé AUTRES_LIGUES.
 * 4. Extraction pure des faits saillants de la Synthèse (Top 5 Singles, Top 5 Combinés, Top 5 Choix).
 * 5. Calcul prospectif des compteurs (what-if counts) sur la totalité de la source.
 *
 * Zéro recalcul client de probabilités, cotes, edges ou décisions de risque.
 */

import { isValidNumericMetric } from './ticketIdentifier.js';
import { getTeamDisplayName } from './teamDisplayNames.js';

/**
 * Correspondance éditoriale des périmètres d'assemblage (scope_type)
 * pour l'exploration UI, tout en préservant les identifiants canoniques originaux.
 */
export const SCOPE_TYPE_LABELS = {
  ALL: 'Tous les périmètres',
  FULL_POOL: 'Pool général',
  LEAGUE_SCOPED: 'Par ligue',
  COMPOUND_SCOPE: 'Ligue + date'
};

/**
 * Résout le libellé éditorial d'un périmètre d'assemblage.
 *
 * @param {string|null|undefined} scopeType
 * @returns {string}
 */
export function getScopeTypeLabel(scopeType) {
  if (!scopeType) return 'Non spécifié';
  return SCOPE_TYPE_LABELS[scopeType] || scopeType;
}

/**
 * Registre canonique des familles de combinés issues du moteur TITANIUM (WEB-001-B).
 */
export const PRODUCT_FAMILIES = [
  { id: 'MICRO_2', code: 'MICRO_2', label: 'Micro', legsCount: 2, legsLabel: '2 jambes' },
  { id: 'CORE_3', code: 'CORE_3', label: 'Core 3', legsCount: 3, legsLabel: '3 jambes' },
  { id: 'CORE_4', code: 'CORE_4', label: 'Core 4', legsCount: 4, legsLabel: '4 jambes' },
  { id: 'STANDARD_5_8', code: 'STANDARD_5_8', label: 'Standard', legsCount: '5-8', legsLabel: '5-8 jambes' },
  { id: 'EXTENDED_9_PLUS', code: 'EXTENDED_9_PLUS', label: 'Extended', legsCount: '9+', legsLabel: '9+ jambes' }
];

/**
 * Registre éditorial des groupes de ligues pour l'exploration UI.
 * Catégorisation purement géographique / d'organisation sportive ;
 * ne confère aucun avantage statistique ni preuve d'edge économique.
 */
export const LEAGUE_GROUPS = {
  TOP_7_EUROPE: {
    id: 'TOP_7_EUROPE',
    label: 'Top 7 Européen',
    description: '7 championnats européens majeurs',
    leagues: [
      'PremierLeague',
      'LaLiga',
      'SerieA',
      'Bundesliga',
      'Ligue1',
      'Eredivisie',
      'LigaPortugal'
    ],
    aliases: ['PRIMEIRALIGA', 'PL', 'PREMIERLEAGUE', 'LALIGA', 'SERIEA', 'BUNDESLIGA', 'LIGUE1', 'EREDIVISIE', 'LIGAPORTUGAL']
  },
  SECOND_TIERS_EUROPE: {
    id: 'SECOND_TIERS_EUROPE',
    label: 'Ligues Secondaires Europe',
    description: 'Divisions secondaires des championnats majeurs',
    leagues: [
      '2.Bundesliga',
      'LaLiga2',
      'Ligue2',
      'SerieB',
      'Championship'
    ],
    aliases: ['2BUNDESLIGA', '2.BUNDESLIGA', 'LALIGA2', 'LIGUE2', 'SERIEB', 'CHAMPIONSHIP']
  },
  OTHER_EUROPE: {
    id: 'OTHER_EUROPE',
    label: 'Autres Ligues Europe',
    description: 'Championnats nationaux européens de premier rang',
    leagues: [
      'Eliteserien',
      'Superligaen',
      'Allsvenskan',
      'AustrianBundesliga',
      'ScottishPremiership',
      'SüperLig',
      'RussianPremierLeague',
      'BelgianProLeague',
      'Ekstraklasa',
      'SwissSuperLeague'
    ],
    aliases: [
      'ELITESERIEN',
      'SUPERLIGAEN',
      'ALLSVENSKAN',
      'AUSTRIANBUNDESLIGA',
      'SCOTTISHPREMIERSHIP',
      'SÜPERLIG',
      'SUPERLIG',
      'RUSSIANPREMIERLEAGUE',
      'BELGIANPROLEAGUE',
      'BEL1',
      'EKSTRAKLASA',
      'POL1',
      'SWISSSUPERLEAGUE',
      'SUI1'
    ]
  },
  AMERICAS: {
    id: 'AMERICAS',
    label: 'Amériques',
    description: 'Championnats nord et sud-américains',
    leagues: [
      'MajorLeagueSoccer',
      'BrazilianSerieA',
      'LigaMX'
    ],
    aliases: ['MAJORLEAGUESOCCER', 'MLS', 'BRAZILIANSERIEA', 'LIGAMX']
  },
  ASIA: {
    id: 'ASIA',
    label: 'Asie',
    description: 'Championnats asiatiques majeurs',
    leagues: [
      'J1League',
      'KLeague1',
      'SaudiProLeague'
    ],
    aliases: ['J1LEAGUE', 'KLEAGUE1', 'SAUDIPROLEAGUE', 'SAUDI']
  }
};

/**
 * Registre canonique des 4 créneaux horaires intra-journaliers (WEB-001-D).
 *
 * - Matin : 05:00–11:59 (5h - 12h)
 * - Après-midi : 12:00–17:59 (12h - 18h)
 * - Soir : 18:00–23:59 (18h - 24h)
 * - Nuit : 00:00–04:59 (0h - 5h)
 */
export const TIME_SLOTS = {
  MATIN: { id: 'MATIN', label: 'Matin', period: '05:00–11:59', hoursRange: '05:00–11:59', rangeLabel: '5h – 12h', minHour: 5, maxHour: 12, description: 'Matchs débutant entre 05:00 et 11:59' },
  APRES_MIDI: { id: 'APRES_MIDI', label: 'Après-midi', period: '12:00–17:59', hoursRange: '12:00–17:59', rangeLabel: '12h – 18h', minHour: 12, maxHour: 18, description: 'Matchs débutant entre 12:00 et 17:59' },
  SOIR: { id: 'SOIR', label: 'Soir', period: '18:00–23:59', hoursRange: '18:00–23:59', rangeLabel: '18h – 24h', minHour: 18, maxHour: 24, description: 'Matchs débutant entre 18:00 et 23:59' },
  NUIT: { id: 'NUIT', label: 'Nuit', period: '00:00–04:59', hoursRange: '00:00–04:59', rangeLabel: '0h – 5h', minHour: 0, maxHour: 5, description: 'Matchs débutant entre 00:00 et 04:59' }
};

/**
 * Extrait l'heure d'un match (0-23) de façon déterministe et cohérente avec l'affichage :
 * 1. Priorité absolue à kickoff_utc, converti dans le fuseau horaire d'affichage (ou navigateur).
 * 2. Repli sécurisé sur Heure / hours / Hours locale (sans conversion arbitraire de fuseau).
 *
 * @param {Object} item Jambe de ticket, sélection finale ou match
 * @param {string} [timeZone] Fuseau explicite optionnel (ex. 'Europe/Paris', 'UTC')
 * @returns {number|null} Heure entière 0-23 ou null
 */
export function getKickoffHour(item, timeZone = null) {
  if (!item || typeof item !== 'object') return null;

  // 1. Priorité absolue à kickoff_utc valide
  if (typeof item.kickoff_utc === 'string' && item.kickoff_utc.trim()) {
    const d = new Date(item.kickoff_utc.trim());
    if (!isNaN(d.getTime())) {
      if (timeZone) {
        try {
          const formatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone });
          const parts = formatter.format(d);
          const h = parseInt(parts, 10);
          if (!isNaN(h)) return h;
        } catch (_) {
          return d.getHours();
        }
      }
      return d.getHours();
    }
  }

  // 2. Repli déterministe sur Heure / hours / Hours locale
  const rawHour = (typeof item.Heure === 'string' && item.Heure.trim() && item.Heure.trim().toUpperCase() !== 'TBD' && item.Heure.trim())
    || (typeof item.hours === 'string' && item.hours.trim() && item.hours.trim())
    || (typeof item.Hours === 'string' && item.Hours.trim() && item.Hours.trim())
    || null;

  if (rawHour && rawHour.includes(':')) {
    const [hStr] = rawHour.split(':');
    const h = parseInt(hStr, 10);
    if (!isNaN(h) && h >= 0 && h <= 23) {
      return h;
    }
  }

  return null;
}

/**
 * Détermine le créneau horaire (MATIN, APRES_MIDI, SOIR, NUIT) d'une jambe ou d'un match.
 *
 * @param {Object} item
 * @param {string} [timeZone]
 * @returns {'MATIN'|'APRES_MIDI'|'SOIR'|'NUIT'|null}
 */
export function getLegTimeSlot(item, timeZone = null) {
  const hour = getKickoffHour(item, timeZone);
  if (hour === null) return null;
  if (hour >= 5 && hour < 12) return 'MATIN';
  if (hour >= 12 && hour < 18) return 'APRES_MIDI';
  if (hour >= 18 && hour < 24) return 'SOIR';
  if (hour >= 0 && hour < 5) return 'NUIT';
  return null;
}

/**
 * Normalise un nom ou code de ligue pour comparaison robuste.
 *
 * @param {string} leagueStr
 * @returns {string}
 */
export function normalizeLeagueCode(leagueStr) {
  if (!leagueStr || typeof leagueStr !== 'string') return '';
  return leagueStr.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Détermine le groupe d'une ligue donnée avec fallback AUTRES_LIGUES.
 *
 * @param {string} leagueName
 * @returns {string} Identifiant de groupe (ex: 'TOP_7_EUROPE', 'AUTRES_LIGUES')
 */
export function getLeagueGroupId(leagueName) {
  if (!leagueName) return 'AUTRES_LIGUES';
  const clean = normalizeLeagueCode(leagueName);

  for (const group of Object.values(LEAGUE_GROUPS)) {
    if (group.leagues.includes(leagueName)) return group.id;
    if (group.aliases && group.aliases.includes(clean)) return group.id;
  }
  return 'AUTRES_LIGUES';
}

/**
 * Extrait la date d'une jambe de manière robuste (Date locale du match ou début UTC).
 *
 * @param {Object} leg
 * @returns {string} Format YYYY-MM-DD ou ''
 */
export function getLegDate(leg) {
  if (!leg || typeof leg !== 'object') return '';
  if (typeof leg.Date === 'string' && leg.Date.trim()) return leg.Date.trim();
  if (typeof leg.Match_Date === 'string' && leg.Match_Date.trim()) return leg.Match_Date.trim();
  if (typeof leg.date === 'string' && leg.date.trim()) return leg.date.trim();
  if (typeof leg.kickoff_utc === 'string' && leg.kickoff_utc.length >= 10) {
    return leg.kickoff_utc.slice(0, 10);
  }
  return '';
}

/**
 * Formate une date ISO (YYYY-MM-DD) en format français compact et robuste (ex: "Sam. 17 oct.").
 * Ne convertit jamais en UTC pour éviter tout décalage de journée sur les fuseaux horaires.
 *
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDateDisplay(isoDate) {
  if (!isoDate || isoDate === 'ALL') return 'Toutes les dates';
  const match = String(isoDate).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(isoDate);

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);

  // Heure locale fixée à midi (12:00:00) pour immuniser contre les fuseaux et DST
  const d = new Date(year, month, day, 12, 0, 0);

  try {
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
    const parts = formatter.formatToParts(d);
    let weekday = '';
    let dayNum = '';
    let monthStr = '';
    parts.forEach(p => {
      if (p.type === 'weekday') weekday = p.value;
      if (p.type === 'day') dayNum = p.value;
      if (p.type === 'month') monthStr = p.value;
    });
    const capW = weekday ? weekday.charAt(0).toUpperCase() + weekday.slice(1) : '';
    return `${capW} ${dayNum} ${monthStr}`.trim();
  } catch {
    return `${day}/${month + 1}/${year}`;
  }
}


/**
 * Prédicat unifié sur une jambe individuelle pour les dimensions relatives aux jambes :
 * ligue, groupe de ligues, famille de marché et date.
 *
 * @param {Object} leg
 * @param {Object} criteria
 * @returns {boolean}
 */
export function legMatchesUnifiedCriteria(leg, {
  leagueGroup = 'ALL',
  selectedLeagues = [],
  selectedMarketFamilies = [],
  selectedDate = 'ALL',
  selectedTimeSlot = 'ALL',
  timeSlot = 'ALL',
  displayTimeZone = null
} = {}) {
  if (!leg || typeof leg !== 'object') return false;

  // 1. Groupe de ligues
  if (leagueGroup && leagueGroup !== 'ALL') {
    const groupId = getLeagueGroupId(leg.League);
    if (groupId !== leagueGroup) return false;
  }

  // 2. Sélection spécifique de ligue(s)
  if (Array.isArray(selectedLeagues) && selectedLeagues.length > 0 && !selectedLeagues.includes('ALL')) {
    if (!selectedLeagues.includes(leg.League)) return false;
  }

  // 3. Famille de marché
  if (Array.isArray(selectedMarketFamilies) && selectedMarketFamilies.length > 0 && !selectedMarketFamilies.includes('ALL')) {
    const fam = leg.family_name || leg.Type || '';
    if (!selectedMarketFamilies.includes(fam)) return false;
  }

  // 4. Date du match
  if (selectedDate && selectedDate !== 'ALL') {
    const d = getLegDate(leg);
    if (d !== selectedDate) return false;
  }

  // 5. Créneau horaire (Matin, Après-midi, Soir, Nuit)
  const slotTarget = (selectedTimeSlot && selectedTimeSlot !== 'ALL')
    ? selectedTimeSlot
    : ((timeSlot && timeSlot !== 'ALL') ? timeSlot : 'ALL');

  if (slotTarget !== 'ALL') {
    const slot = getLegTimeSlot(leg, displayTimeZone);
    if (slot !== slotTarget) return false;
  }

  return true;
}

/**
 * Vérifie si des critères relatifs aux jambes sont actuellement actifs.
 *
 * @param {Object} criteria
 * @returns {boolean}
 */
export function hasActiveLegCriteria({
  leagueGroup = 'ALL',
  selectedLeagues = [],
  selectedMarketFamilies = [],
  selectedDate = 'ALL',
  selectedTimeSlot = 'ALL',
  timeSlot = 'ALL'
} = {}) {
  const hasGroup = Boolean(leagueGroup && leagueGroup !== 'ALL');
  const hasLeagues = Boolean(Array.isArray(selectedLeagues) && selectedLeagues.length > 0 && !selectedLeagues.includes('ALL'));
  const hasFamilies = Boolean(Array.isArray(selectedMarketFamilies) && selectedMarketFamilies.length > 0 && !selectedMarketFamilies.includes('ALL'));
  const hasDate = Boolean(selectedDate && selectedDate !== 'ALL');
  const hasSlot = Boolean((selectedTimeSlot && selectedTimeSlot !== 'ALL') || (timeSlot && timeSlot !== 'ALL'));
  return hasGroup || hasLeagues || hasFamilies || hasDate || hasSlot;
}

/**
 * Résout le seuil effectif N de jambes correspondantes requises.
 * Borne strictement entre 1 et 12 (taille maximale observée sur la session).
 *
 * @param {Object} criteria
 * @returns {number} Seuil entier N >= 1
 */
export function resolveMinLegsThreshold(criteria = {}) {
  const mode = criteria.legMatchMode || 'ANY';
  if (mode === 'AT_LEAST_2') return 2;
  if (mode === 'AT_LEAST_3') return 3;
  if (mode === 'CUSTOM' || mode === 'AT_LEAST_N') {
    const raw = criteria.minLegsMatching;
    const num = (typeof raw === 'number' && !isNaN(raw)) ? Math.floor(raw) : parseInt(raw, 10);
    return (!isNaN(num) && num >= 1) ? Math.min(12, num) : 1;
  }
  if (typeof criteria.minLegsMatching === 'number' && criteria.minLegsMatching > 1) {
    return Math.min(12, Math.floor(criteria.minLegsMatching));
  }
  return 1;
}

/**
 * Compte le nombre de jambes d'un ticket qui satisfont l'ensemble des critères actifs.
 *
 * @param {Object} ticket
 * @param {Object} criteria
 * @returns {number}
 */
export function countMatchingLegs(ticket, criteria) {
  const legs = Array.isArray(ticket?.legs) ? ticket.legs : [];
  if (legs.length === 0) return 0;
  return legs.filter(l => legMatchesUnifiedCriteria(l, criteria)).length;
}

/**
 * Évalue l'ensemble des jambes d'un ticket selon les critères actifs et le mode de correspondance :
 * - Mode ANY (ou AT_LEAST_1) : au moins 1 jambe matching (matchingLegCount >= 1).
 * - Mode AT_LEAST_2 : au moins 2 jambes matching (matchingLegCount >= 2).
 * - Mode AT_LEAST_3 : au moins 3 jambes matching (matchingLegCount >= 3).
 * - Mode CUSTOM (ou AT_LEAST_N) : au moins N jambes matching (matchingLegCount >= N).
 * - Mode ALL : toutes les jambes matching (matchingLegCount === totalLegCount, avec au moins 1 jambe).
 *
 * Un ticket ayant moins de N jambes au total est exclu.
 * Lorsqu'aucun critère relatif aux jambes n'est actif, le mode est neutralisé (retourne true).
 *
 * @param {Object} ticket
 * @param {Object} criteria
 * @returns {boolean}
 */
export function ticketMatchesLegCriteria(ticket, criteria) {
  if (!hasActiveLegCriteria(criteria)) return true;

  const legs = Array.isArray(ticket?.legs) ? ticket.legs : [];
  const totalLegCount = legs.length;
  if (totalLegCount === 0) return false;

  const matchingLegCount = countMatchingLegs(ticket, criteria);
  const mode = criteria.legMatchMode || 'ANY';

  // Mode ALL : matchingLegCount === totalLegCount, avec au moins une jambe
  if (mode === 'ALL') {
    return totalLegCount >= 1 && matchingLegCount === totalLegCount;
  }

  // Modes à seuil N
  const n = resolveMinLegsThreshold(criteria);

  // Un ticket ayant moins de N jambes au total est exclu
  if (totalLegCount < n) return false;

  // Règle canonique : matchingLegCount >= N
  return matchingLegCount >= n;
}

/**
 * État de filtres par défaut pour les tickets assemblés.
 */
export const INITIAL_TICKET_FILTERS = {
  searchQuery: '',
  structure: 'ALL', // 'ALL' | 'SINGLES' | 'COMBOS'
  productCode: 'ALL',
  scopeType: 'ALL',
  leagueGroup: 'ALL',
  selectedLeagues: [], // Tableau de noms de ligues ou [] pour toutes
  selectedMarketFamilies: [], // Tableau de familles ou [] pour toutes
  selectedDate: 'ALL',
  timeSlot: 'ALL', // 'ALL' | 'MATIN' | 'APRES_MIDI' | 'SOIR' | 'NUIT'
  legMatchMode: 'ANY', // 'ANY' | 'AT_LEAST_2' | 'AT_LEAST_3' | 'CUSTOM' | 'ALL'
  minLegsMatching: 1, // Seuil configurable N (entier 1..12)
  minProbThreshold: 0, // Seuil min de min_leg_model_probability (0 = désactivé)
  minLegs: 1,
  maxLegs: 12,
  sortBy: 'mean_prob' // 'mean_prob' | 'min_prob' | 'odds' | 'legs' | 'canonical'
};

/**
 * Prédicat complet pour un ticket assemblé.
 *
 * @param {Object} ticket
 * @param {Object} filters
 * @returns {boolean}
 */
export function ticketPassesFilters(ticket, filters = INITIAL_TICKET_FILTERS) {
  if (!ticket || typeof ticket !== 'object') return false;

  // 1. Structure : Singles vs Combinés
  const legCount = isValidNumericMetric(ticket.metrics?.leg_count)
    ? ticket.metrics.leg_count
    : (ticket.legs?.length || 0);

  if (filters.structure === 'SINGLES') {
    if (ticket.product_code !== 'SINGLE_1' && legCount !== 1) return false;
  } else if (filters.structure === 'COMBOS') {
    if (ticket.product_code === 'SINGLE_1' || legCount <= 1) return false;
  }

  // 2. Famille de produit (product_code)
  if (filters.productCode && filters.productCode !== 'ALL') {
    if (ticket.product_code !== filters.productCode && ticket.categorie !== filters.productCode) {
      return false;
    }
  }

  // 3. Portée du ticket (scope_type)
  if (filters.scopeType && filters.scopeType !== 'ALL') {
    if (ticket.scope_type !== filters.scopeType) return false;
  }

  // 4. Nombre de jambes (plage min / max)
  if (isValidNumericMetric(filters.minLegs) && legCount < filters.minLegs) return false;
  if (isValidNumericMetric(filters.maxLegs) && legCount > filters.maxLegs) return false;

  // 5. Seuil de probabilité minimale d'une jambe
  if (isValidNumericMetric(filters.minProbThreshold) && filters.minProbThreshold > 0) {
    const rawMin = ticket.metrics?.min_leg_model_probability ?? ticket.metrics?.mean_leg_model_probability;
    if (!isValidNumericMetric(rawMin) || rawMin < filters.minProbThreshold) {
      return false;
    }
  }

  // 6. Prédicat unifié sur les dimensions relatives aux jambes (ANY / AT_LEAST_N / ALL sur la même jambe)
  const legCriteriaMatch = ticketMatchesLegCriteria(ticket, {
    leagueGroup: filters.leagueGroup,
    selectedLeagues: filters.selectedLeagues,
    selectedMarketFamilies: filters.selectedMarketFamilies,
    selectedDate: filters.selectedDate,
    selectedTimeSlot: filters.timeSlot || filters.selectedTimeSlot,
    timeSlot: filters.timeSlot,
    displayTimeZone: filters.displayTimeZone,
    legMatchMode: filters.legMatchMode,
    minLegsMatching: filters.minLegsMatching
  });
  if (!legCriteriaMatch) return false;

  // 7. Recherche textuelle globale
  const q = (filters.searchQuery || '').trim().toLowerCase();
  if (q) {
    const humanMatch = (ticket.human_id || '').toLowerCase().includes(q);
    const idMatch = (ticket.ticket_id || '').toLowerCase().includes(q);
    const nomMatch = (ticket.nom || '').toLowerCase().includes(q);
    const prodMatch = (ticket.product_code || '').toLowerCase().includes(q)
      || (ticket.family_meta?.label || '').toLowerCase().includes(q);
    const scopeMatch = (ticket.scope_value || '').toLowerCase().includes(q)
      || (ticket.scope_type || '').toLowerCase().includes(q);

    const legs = Array.isArray(ticket.legs) ? ticket.legs : [];
    const legsMatch = legs.some(l => {
      const matchRaw = (l.Match || '').toLowerCase();
      const leagueRaw = (l.League || '').toLowerCase();
      const marcheRaw = (l.Marche || '').toLowerCase();
      const mId = (l.Match_ID || '').toLowerCase();
      const fam = (l.family_name || l.Type || '').toLowerCase();

      // Résolution des noms d'équipe affichés
      const parts = (l.Match || '').split(' vs ');
      const homeRaw = (parts[0] || '').trim();
      const awayRaw = (parts[1] || '').trim();
      const dHome = getTeamDisplayName(homeRaw, l.League).toLowerCase();
      const dAway = getTeamDisplayName(awayRaw, l.League).toLowerCase();

      return matchRaw.includes(q)
        || leagueRaw.includes(q)
        || marcheRaw.includes(q)
        || mId.includes(q)
        || fam.includes(q)
        || dHome.includes(q)
        || dAway.includes(q);
    });

    if (!humanMatch && !idMatch && !nomMatch && !prodMatch && !scopeMatch && !legsMatch) {
      return false;
    }
  }

  return true;
}

/**
 * Filtre et trie la liste complète des tickets assemblés.
 *
 * @param {Array<Object>} tickets
 * @param {Object} filters
 * @returns {Array<Object>}
 */
export function filterTickets(tickets = [], filters = INITIAL_TICKET_FILTERS) {
  if (!Array.isArray(tickets)) return [];

  return tickets.filter(t => ticketPassesFilters(t, filters)).sort((a, b) => {
    if (filters.sortBy === 'canonical') {
      return (a.canonical_index ?? 0) - (b.canonical_index ?? 0);
    }
    if (filters.sortBy === 'min_prob') {
      const pA = isValidNumericMetric(a.metrics?.min_leg_model_probability) ? a.metrics.min_leg_model_probability : -Infinity;
      const pB = isValidNumericMetric(b.metrics?.min_leg_model_probability) ? b.metrics.min_leg_model_probability : -Infinity;
      if (pB !== pA) return pB - pA;
      return (a.canonical_index ?? 0) - (b.canonical_index ?? 0);
    }
    if (filters.sortBy === 'odds') {
      const oA = isValidNumericMetric(a.metrics?.reference_odds_floor_product) ? a.metrics.reference_odds_floor_product : -Infinity;
      const oB = isValidNumericMetric(b.metrics?.reference_odds_floor_product) ? b.metrics.reference_odds_floor_product : -Infinity;
      if (oB !== oA) return oB - oA;
      return (a.canonical_index ?? 0) - (b.canonical_index ?? 0);
    }
    if (filters.sortBy === 'legs') {
      const lA = isValidNumericMetric(a.metrics?.leg_count) ? a.metrics.leg_count : (a.legs?.length || 0);
      const lB = isValidNumericMetric(b.metrics?.leg_count) ? b.metrics.leg_count : (b.legs?.length || 0);
      if (lB !== lA) return lB - lA;
      return (a.canonical_index ?? 0) - (b.canonical_index ?? 0);
    }
    // Défaut : mean_prob
    const pA = isValidNumericMetric(a.metrics?.mean_leg_model_probability) ? a.metrics.mean_leg_model_probability : -Infinity;
    const pB = isValidNumericMetric(b.metrics?.mean_leg_model_probability) ? b.metrics.mean_leg_model_probability : -Infinity;
    if (pB !== pA) return pB - pA;
    return (a.canonical_index ?? 0) - (b.canonical_index ?? 0);
  });
}

/**
 * État de filtres par défaut pour les Choix Finaux (CHOIX_FINAUX).
 */
export const INITIAL_PICKS_FILTERS = {
  searchQuery: '',
  tier: 'ALL', // 'ALL' | '1' | '2' | '3'
  leagueGroup: 'ALL',
  selectedLeagues: [],
  selectedType: 'ALL', // 'ALL' | 'TEAM_GOALS' | 'PROP_BET'
  selectedProfile: 'ALL',
  streakStatus: 'ALL', // 'ALL' | 'STREAK_CONFIRMED' | 'STREAK_NEUTRAL'
  alphaOnly: false,
  superSignalOnly: false,
  liveOnly: false,
  selectedDate: 'ALL',
  timeSlot: 'ALL', // 'ALL' | 'MATIN' | 'APRES_MIDI' | 'SOIR' | 'NUIT'
  sortBy: 'prob' // 'prob' | 'odds' | 'ev'
};

/**
 * Prédicat pour une sélection de Choix Finaux.
 *
 * @param {Object} pick
 * @param {Object} filters
 * @returns {boolean}
 */
export function pickPassesFilters(pick, filters = INITIAL_PICKS_FILTERS) {
  if (!pick || typeof pick !== 'object') return false;

  // 1. Tier
  if (filters.tier && filters.tier !== 'ALL') {
    const targetTier = parseInt(filters.tier, 10);
    if (pick.Tier !== targetTier) return false;
  }

  // 2. Groupe de ligues
  if (filters.leagueGroup && filters.leagueGroup !== 'ALL') {
    const groupId = getLeagueGroupId(pick.League);
    if (groupId !== filters.leagueGroup) return false;
  }

  // 3. Ligues spécifiques
  if (Array.isArray(filters.selectedLeagues) && filters.selectedLeagues.length > 0 && !filters.selectedLeagues.includes('ALL')) {
    if (!filters.selectedLeagues.includes(pick.League)) return false;
  }

  // 4. Type / Famille
  if (filters.selectedType && filters.selectedType !== 'ALL') {
    const t = pick.family_name || pick.Type || '';
    if (t !== filters.selectedType) return false;
  }

  // 5. Profil
  if (filters.selectedProfile && filters.selectedProfile !== 'ALL') {
    const profiles = Array.isArray(pick.Profile) ? pick.Profile : (pick.Profile ? [pick.Profile] : []);
    if (!profiles.includes(filters.selectedProfile)) return false;
  }

  // 6. Statut de série
  if (filters.streakStatus && filters.streakStatus !== 'ALL') {
    if (pick.Streak_Status !== filters.streakStatus) return false;
  }

  // 7. Alpha
  if (filters.alphaOnly && !pick.Alpha) return false;

  // 8. Super Signal
  if (filters.superSignalOnly && !pick.Super_Signal) return false;

  // 9. Live Eligible
  if (filters.liveOnly && pick.live_eligible !== true) return false;

  // 10. Date
  if (filters.selectedDate && filters.selectedDate !== 'ALL') {
    const d = getLegDate(pick);
    if (d !== filters.selectedDate) return false;
  }

  // 11. Créneau horaire (Matin, Après-midi, Soir, Nuit)
  const targetSlot = filters.timeSlot || filters.selectedTimeSlot;
  if (targetSlot && targetSlot !== 'ALL') {
    const slot = getLegTimeSlot(pick, filters.displayTimeZone);
    if (slot !== targetSlot) return false;
  }

  // 12. Recherche textuelle
  const q = (filters.searchQuery || '').trim().toLowerCase();
  if (q) {
    const matchRaw = (pick.Match || '').toLowerCase();
    const mId = (pick.Match_ID || '').toLowerCase();
    const bId = (pick.Bet_ID || '').toLowerCase();
    const leagueRaw = (pick.League || '').toLowerCase();
    const marcheRaw = (pick.Marche || '').toLowerCase();
    const reasonRaw = (pick.Streak_Reason || '').toLowerCase();
    const typeRaw = (pick.family_name || pick.Type || '').toLowerCase();

    const parts = (pick.Match || '').split(' vs ');
    const homeRaw = (parts[0] || '').trim();
    const awayRaw = (parts[1] || '').trim();
    const dHome = getTeamDisplayName(homeRaw, pick.League).toLowerCase();
    const dAway = getTeamDisplayName(awayRaw, pick.League).toLowerCase();

    const profs = (Array.isArray(pick.Profile) ? pick.Profile : []).map(p => String(p).toLowerCase());
    const profMatch = profs.some(p => p.includes(q));

    const matches = matchRaw.includes(q)
      || mId.includes(q)
      || bId.includes(q)
      || leagueRaw.includes(q)
      || marcheRaw.includes(q)
      || reasonRaw.includes(q)
      || typeRaw.includes(q)
      || dHome.includes(q)
      || dAway.includes(q)
      || profMatch;

    if (!matches) return false;
  }

  return true;
}

/**
 * Filtre et trie la liste des Choix Finaux.
 *
 * @param {Array<Object>} picks
 * @param {Object} filters
 * @returns {Array<Object>}
 */
export function filterFinalPicks(picks = [], filters = INITIAL_PICKS_FILTERS) {
  if (!Array.isArray(picks)) return [];

  return picks.filter(p => pickPassesFilters(p, filters)).sort((a, b) => {
    if (filters.sortBy === 'odds') {
      const oA = isValidNumericMetric(a.Cote_Ref) ? a.Cote_Ref : -Infinity;
      const oB = isValidNumericMetric(b.Cote_Ref) ? b.Cote_Ref : -Infinity;
      return oB - oA;
    }
    if (filters.sortBy === 'ev') {
      const eA = isValidNumericMetric(a.Score_EV) ? a.Score_EV : -Infinity;
      const eB = isValidNumericMetric(b.Score_EV) ? b.Score_EV : -Infinity;
      return eB - eA;
    }
    // Défaut : prob
    const pA = isValidNumericMetric(a.Prob) ? a.Prob : -Infinity;
    const pB = isValidNumericMetric(b.Prob) ? b.Prob : -Infinity;
    return pB - pA;
  });
}

/**
 * Extrait les faits saillants de la nouvelle Synthèse (accueil intelligent) :
 * 1. Top 5 Singles classés par probabilité modèle décroissante.
 * 2. Top 5 Combinés classés par probabilité minimale de jambe (min_leg_model_probability) décroissante.
 * 3. Top 5 Choix Finaux classés par probabilité modèle (Prob) décroissante.
 *
 * Les identifiants humains des tickets restent STRICTEMENT ceux attribués dans l'ordre canonique.
 *
 * @param {Array<Object>} tickets Tickets avec human_id déjà attribué
 * @param {Array<Object>} picks Choix Finaux bruts
 * @param {number} [limit=5]
 * @returns {{
 *   topSingles: Array<Object>,
 *   topCombos: Array<Object>,
 *   topPicks: Array<Object>
 * }}
 */
export function getSynthesisHighlights(tickets = [], picks = [], limit = 5) {
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const safePicks = Array.isArray(picks) ? picks : [];

  // 1. Singles : uniquement leg_count === 1 ou product_code === 'SINGLE_1'
  const singles = safeTickets.filter(t => {
    const legCount = isValidNumericMetric(t.metrics?.leg_count)
      ? t.metrics.leg_count
      : (t.legs?.length || 0);
    return t.product_code === 'SINGLE_1' || legCount === 1;
  });

  const topSingles = singles.slice().sort((a, b) => {
    const pA = isValidNumericMetric(a.metrics?.mean_leg_model_probability) ? a.metrics.mean_leg_model_probability : -Infinity;
    const pB = isValidNumericMetric(b.metrics?.mean_leg_model_probability) ? b.metrics.mean_leg_model_probability : -Infinity;
    if (pB !== pA) return pB - pA;
    return (a.canonical_index ?? 0) - (b.canonical_index ?? 0);
  }).slice(0, limit);

  // 2. Combinés : uniquement leg_count >= 2
  const combos = safeTickets.filter(t => {
    const legCount = isValidNumericMetric(t.metrics?.leg_count)
      ? t.metrics.leg_count
      : (t.legs?.length || 0);
    return t.product_code !== 'SINGLE_1' && legCount >= 2;
  });

  const topCombos = combos.slice().sort((a, b) => {
    const pA = isValidNumericMetric(a.metrics?.min_leg_model_probability) ? a.metrics.min_leg_model_probability : -Infinity;
    const pB = isValidNumericMetric(b.metrics?.min_leg_model_probability) ? b.metrics.min_leg_model_probability : -Infinity;
    if (pB !== pA) return pB - pA;
    return (a.canonical_index ?? 0) - (b.canonical_index ?? 0);
  }).slice(0, limit);

  // 3. Choix Finaux : triés par Prob décroissante
  const topPicks = safePicks.slice().sort((a, b) => {
    const pA = isValidNumericMetric(a.Prob) ? a.Prob : -Infinity;
    const pB = isValidNumericMetric(b.Prob) ? b.Prob : -Infinity;
    return pB - pA;
  }).slice(0, limit);

  return {
    topSingles,
    topCombos,
    topPicks
  };
}

/**
 * Calcule les compteurs dynamiques prospectifs pour un ensemble d'options
 * en évaluant l'effectif qui résulterait de l'activation de chaque option (what-if count).
 *
 * Pour les champs scalaires (structure, leagueGroup, selectedDate, etc.) : teste [dimensionKey]: val.
 * Pour les champs tableaux (selectedLeagues, selectedMarketFamilies) : teste [val] ou [] si 'ALL'.
 *
 * @param {Array<Object>} tickets
 * @param {Object} currentFilters
 * @param {string} dimensionKey
 * @param {Array<string|number>} values
 * @returns {Object<string|number, number>}
 */
export function computeTicketWhatIfCounts(tickets = [], currentFilters = {}, dimensionKey, values = []) {
  if (!Array.isArray(tickets) || !dimensionKey || !Array.isArray(values)) return {};
  const counts = {};
  const isArrayField = Array.isArray(currentFilters[dimensionKey]);

  values.forEach(val => {
    let testVal;
    if (isArrayField) {
      testVal = (val === 'ALL' || val === null || val === undefined) ? [] : (Array.isArray(val) ? val : [val]);
    } else {
      testVal = val;
    }
    const testFilters = { ...currentFilters, [dimensionKey]: testVal };
    counts[val] = tickets.filter(t => ticketPassesFilters(t, testFilters)).length;
  });
  return counts;
}

/**
 * Calcule les compteurs dynamiques prospectifs pour les Choix Finaux (CHOIX_FINAUX).
 *
 * @param {Array<Object>} picks
 * @param {Object} currentFilters
 * @param {string} dimensionKey
 * @param {Array<string|number>} values
 * @returns {Object<string|number, number>}
 */
export function computePickWhatIfCounts(picks = [], currentFilters = {}, dimensionKey, values = []) {
  if (!Array.isArray(picks) || !dimensionKey || !Array.isArray(values)) return {};
  const counts = {};
  const isArrayField = Array.isArray(currentFilters[dimensionKey]);

  values.forEach(val => {
    let testVal;
    if (isArrayField) {
      testVal = (val === 'ALL' || val === null || val === undefined) ? [] : (Array.isArray(val) ? val : [val]);
    } else {
      testVal = val;
    }
    const testFilters = { ...currentFilters, [dimensionKey]: testVal };
    counts[val] = picks.filter(p => pickPassesFilters(p, testFilters)).length;
  });
  return counts;
}

/**
 * Palette catégorielle stable et contrastée pour les 6 familles de marché
 * réellement observées dans les jambes de tickets TITANIUM (WEB-001-B).
 *
 * Distincte des couleurs de familles de tickets (emerald, sky, indigo, purple, amber, rose)
 * et des Tiers / niveaux de risque.
 *
 * @param {string} rawFamilyName
 * @returns {{ key: string, label: string, containerClass: string, badgeClass: string, labelClass: string }}
 */
export function getMarketFamilyMeta(rawFamilyName) {
  const norm = String(rawFamilyName || '').trim();
  const lower = norm.toLowerCase();

  // 1. Team Goals (ex. Over 1.5 Molde) -> Palette Teal
  if (lower.includes('team goal') || lower === 'team_goals') {
    return {
      key: 'TEAM_GOALS',
      label: 'Team Goals',
      containerClass: 'bg-teal-500/10 dark:bg-teal-500/15 border-teal-500/30 dark:border-teal-500/40 text-teal-900 dark:text-teal-100',
      badgeClass: 'bg-teal-500/20 text-teal-800 dark:text-teal-200 border-teal-500/30',
      labelClass: 'text-teal-950 dark:text-teal-50'
    };
  }

  // 2. Classique Buts (ex. Over 1.5 Goals) -> Palette Cyan
  if (lower.includes('classique but') || lower === 'classique_buts') {
    return {
      key: 'CLASSIQUE_BUTS',
      label: 'Classique Buts',
      containerClass: 'bg-cyan-500/10 dark:bg-cyan-500/15 border-cyan-500/30 dark:border-cyan-500/40 text-cyan-900 dark:text-cyan-100',
      badgeClass: 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 border-cyan-500/30',
      labelClass: 'text-cyan-950 dark:text-cyan-50'
    };
  }

  // 3. Prop Totaux (ex. Over 10.5 CORNERS, Over 27.5 SHOTS) -> Palette Violet
  if (lower.includes('prop totaux') || lower === 'prop_totaux') {
    return {
      key: 'PROP_TOTAUX',
      label: 'Prop Totaux',
      containerClass: 'bg-violet-500/10 dark:bg-violet-500/15 border-violet-500/30 dark:border-violet-500/40 text-violet-900 dark:text-violet-100',
      badgeClass: 'bg-violet-500/20 text-violet-800 dark:text-violet-200 border-violet-500/30',
      labelClass: 'text-violet-950 dark:text-violet-50'
    };
  }

  // 4. Prop H2H (ex. Home + de CORNERS) -> Palette Fuchsia
  if (lower.includes('prop h2h') || lower === 'prop_h2h') {
    return {
      key: 'PROP_H2H',
      label: 'Prop H2H',
      containerClass: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/15 border-fuchsia-500/30 dark:border-fuchsia-500/40 text-fuchsia-900 dark:text-fuchsia-100',
      badgeClass: 'bg-fuchsia-500/20 text-fuchsia-800 dark:text-fuchsia-200 border-fuchsia-500/30',
      labelClass: 'text-fuchsia-950 dark:text-fuchsia-50'
    };
  }

  // 5. Classique 1X2 (ex. Victoire Away (2)) -> Palette Stone
  if (lower.includes('1x2') || lower.includes('classique 1x2')) {
    return {
      key: 'CLASSIQUE_1X2',
      label: 'Classique 1X2',
      containerClass: 'bg-stone-500/10 dark:bg-stone-500/15 border-stone-500/30 dark:border-stone-500/40 text-stone-900 dark:text-stone-100',
      badgeClass: 'bg-stone-500/20 text-stone-800 dark:text-stone-200 border-stone-500/30',
      labelClass: 'text-stone-950 dark:text-stone-50'
    };
  }

  // 6. Contrarien (ex. Victoire Home (Rebond Justice)) -> Palette Orange
  if (lower.includes('contrarien')) {
    return {
      key: 'CONTRARIEN',
      label: 'Contrarien',
      containerClass: 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500/30 dark:border-orange-500/40 text-orange-900 dark:text-orange-100',
      badgeClass: 'bg-orange-500/20 text-orange-800 dark:text-orange-200 border-orange-500/30',
      labelClass: 'text-orange-950 dark:text-orange-50'
    };
  }

  // Fallback universel (neutre ardoise)
  return {
    key: 'AUTRE',
    label: norm || 'Marché',
    containerClass: 'bg-slate-500/10 dark:bg-slate-500/15 border-slate-500/30 dark:border-slate-500/40 text-slate-900 dark:text-slate-100',
    badgeClass: 'bg-slate-500/20 text-slate-800 dark:text-slate-200 border-slate-500/30',
    labelClass: 'text-slate-950 dark:text-slate-50'
  };
}

