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
import { isMatchLive } from './matchSchedule.js';

/**
 * Correspondance éditoriale des périmètres d'assemblage (scope_type)
 * pour l'exploration UI, tout en préservant les identifiants canoniques originaux.
 * Découvre l'intégralité des 5 types de périmètres produits par le moteur TITANIUM (WEB-FILTERS-001).
 */
export const SCOPE_TYPE_LABELS = {
  ALL: 'Tous les périmètres',
  FULL_POOL: 'Pool général',
  LEAGUE_SCOPED: 'Par ligue',
  COMPOUND_SCOPE: 'Ligue + date',
  TIME_WINDOW: 'Par date',
  MARKET_SCOPED: 'Par marché spécialisé'
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
 * Registre canonique des 4 créneaux horaires intra-journaliers historiques (WEB-001-D).
 * Maintenu pour stricte compatibilité ascendante avec les filtres existants.
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
 * Registre des 7 sous-créneaux horaires intra-journaliers (WEB-FILTERS-001).
 * Partition mathématique stricte de [00:00, 24:00[ sans aucun chevauchement ni trou :
 * Nuit apparaît obligatoirement AVANT Matin (ordre chronologique de la journée).
 */
export const SUB_TIME_SLOTS = {
  NUIT: { id: 'NUIT', label: 'Nuit', period: '00:00–04:59', hoursRange: '00:00–04:59', rangeLabel: '0h – 5h', minHour: 0, maxHour: 5, legacySlot: 'NUIT', description: 'Matchs débutant entre 00:00 et 04:59' },
  MATIN_TOT: { id: 'MATIN_TOT', label: 'Matin tôt', period: '05:00–08:59', hoursRange: '05:00–08:59', rangeLabel: '5h – 9h', minHour: 5, maxHour: 9, legacySlot: 'MATIN', description: 'Matchs débutant entre 05:00 et 08:59' },
  FIN_MATINEE: { id: 'FIN_MATINEE', label: 'Fin de matinée', period: '09:00–11:59', hoursRange: '09:00–11:59', rangeLabel: '9h – 12h', minHour: 9, maxHour: 12, legacySlot: 'MATIN', description: 'Matchs débutant entre 09:00 et 11:59' },
  DEBUT_APRES_MIDI: { id: 'DEBUT_APRES_MIDI', label: 'Début d\'après-midi', period: '12:00–14:59', hoursRange: '12:00–14:59', rangeLabel: '12h – 15h', minHour: 12, maxHour: 15, legacySlot: 'APRES_MIDI', description: 'Matchs débutant entre 12:00 et 14:59' },
  FIN_APRES_MIDI: { id: 'FIN_APRES_MIDI', label: 'Fin d\'après-midi', period: '15:00–17:59', hoursRange: '15:00–17:59', rangeLabel: '15h – 18h', minHour: 15, maxHour: 18, legacySlot: 'APRES_MIDI', description: 'Matchs débutant entre 15:00 et 17:59' },
  DEBUT_SOIREE: { id: 'DEBUT_SOIREE', label: 'Début de soirée', period: '18:00–20:59', hoursRange: '18:00–20:59', rangeLabel: '18h – 21h', minHour: 18, maxHour: 21, legacySlot: 'SOIR', description: 'Matchs débutant entre 18:00 et 20:59' },
  FIN_SOIREE: { id: 'FIN_SOIREE', label: 'Fin de soirée', period: '21:00–23:59', hoursRange: '21:00–23:59', rangeLabel: '21h – 24h', minHour: 21, maxHour: 24, legacySlot: 'SOIR', description: 'Matchs débutant entre 21:00 et 23:59' }
};

/**
 * Hiérarchie et correspondance bidirectionnelle entre créneaux macro et sous-créneaux (WEB-FILTERS-001).
 */
export const TIME_SLOT_HIERARCHY = {
  NUIT: ['NUIT'],
  MATIN: ['MATIN_TOT', 'FIN_MATINEE'],
  APRES_MIDI: ['DEBUT_APRES_MIDI', 'FIN_APRES_MIDI'],
  SOIR: ['DEBUT_SOIREE', 'FIN_SOIREE']
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
 * Détermine le créneau horaire historique (MATIN, APRES_MIDI, SOIR, NUIT) d'une jambe ou d'un match.
 * Maintenu pour stricte rétrocompatibilité avec les composants de la session.
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
 * Détermine le sous-créneau horaire précis (7 plages) d'une jambe ou d'un match (WEB-FILTERS-001).
 *
 * - NUIT : 00:00–04:59 (0h - 5h)
 * - MATIN_TOT : 05:00–08:59 (5h - 9h)
 * - FIN_MATINEE : 09:00–11:59 (9h - 12h)
 * - DEBUT_APRES_MIDI : 12:00–14:59 (12h - 15h)
 * - FIN_APRES_MIDI : 15:00–17:59 (15h - 18h)
 * - DEBUT_SOIREE : 18:00–20:59 (18h - 21h)
 * - FIN_SOIREE : 21:00–23:59 (21h - 24h)
 *
 * @param {Object} item
 * @param {string} [timeZone]
 * @returns {'NUIT'|'MATIN_TOT'|'FIN_MATINEE'|'DEBUT_APRES_MIDI'|'FIN_APRES_MIDI'|'DEBUT_SOIREE'|'FIN_SOIREE'|null}
 */
export function getLegSubTimeSlot(item, timeZone = null) {
  const hour = getKickoffHour(item, timeZone);
  if (hour === null) return null;
  if (hour >= 0 && hour < 5) return 'NUIT';
  if (hour >= 5 && hour < 9) return 'MATIN_TOT';
  if (hour >= 9 && hour < 12) return 'FIN_MATINEE';
  if (hour >= 12 && hour < 15) return 'DEBUT_APRES_MIDI';
  if (hour >= 15 && hour < 18) return 'FIN_APRES_MIDI';
  if (hour >= 18 && hour < 21) return 'DEBUT_SOIREE';
  if (hour >= 21 && hour < 24) return 'FIN_SOIREE';
  return null;
}

/**
 * Vérifie si un créneau horaire de jambe satisfait une cible (macro ou sous-créneau).
 *
 * @param {string|null} itemSlot Clé issue de getLegTimeSlot ou getLegSubTimeSlot
 * @param {string} targetSlot 'ALL' ou clé de créneau / sous-créneau
 * @returns {boolean}
 */
export function matchesTimeSlot(itemSlot, targetSlot) {
  if (!targetSlot || targetSlot === 'ALL') return true;
  if (!itemSlot) return false;
  if (itemSlot === targetSlot) return true;
  // Compatibilité ascendante : un macro-créneau (ex: MATIN) valide ses sous-créneaux (MATIN_TOT, FIN_MATINEE)
  const subSlots = TIME_SLOT_HIERARCHY[targetSlot];
  return Array.isArray(subSlots) && subSlots.includes(itemSlot);
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
 * Registre géographique canonique des 28 ligues TITANIUM V2 (WEB-FILTERS-001).
 * Organisation hiérarchique en 3 niveaux : Région / Continent -> Pays (code ISO + nom FR) -> Championnats.
 * Garantit l'absence d'invention de ligue et le respect strict des identifiants canoniques.
 */
export const GEOGRAPHIC_LEAGUE_HIERARCHY = {
  EUROPE: {
    id: 'EUROPE',
    label: 'Europe',
    flag: '🇪🇺',
    countries: {
      ENG: { code: 'ENG', label: 'Angleterre', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', leagues: ['PremierLeague', 'Championship'] },
      ESP: { code: 'ESP', label: 'Espagne', flag: '🇪🇸', leagues: ['LaLiga', 'LaLiga2'] },
      ITA: { code: 'ITA', label: 'Italie', flag: '🇮🇹', leagues: ['SerieA', 'SerieB'] },
      GER: { code: 'GER', label: 'Allemagne', flag: '🇩🇪', leagues: ['Bundesliga', '2.Bundesliga'] },
      FRA: { code: 'FRA', label: 'France', flag: '🇫🇷', leagues: ['Ligue1', 'Ligue2'] },
      NED: { code: 'NED', label: 'Pays-Bas', flag: '🇳🇱', leagues: ['Eredivisie'] },
      POR: { code: 'POR', label: 'Portugal', flag: '🇵🇹', leagues: ['LigaPortugal'] },
      BEL: { code: 'BEL', label: 'Belgique', flag: '🇧🇪', leagues: ['BelgianProLeague'] },
      AUT: { code: 'AUT', label: 'Autriche', flag: '🇦🇹', leagues: ['AustrianBundesliga'] },
      SUI: { code: 'SUI', label: 'Suisse', flag: '🇨🇭', leagues: ['SwissSuperLeague'] },
      POL: { code: 'POL', label: 'Pologne', flag: '🇵🇱', leagues: ['Ekstraklasa'] },
      DEN: { code: 'DEN', label: 'Danemark', flag: '🇩🇰', leagues: ['Superligaen'] },
      NOR: { code: 'NOR', label: 'Norvège', flag: '🇳🇴', leagues: ['Eliteserien'] },
      SWE: { code: 'SWE', label: 'Suède', flag: '🇸🇪', leagues: ['Allsvenskan'] },
      SCO: { code: 'SCO', label: 'Écosse', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', leagues: ['ScottishPremiership'] },
      TUR: { code: 'TUR', label: 'Turquie', flag: '🇹🇷', leagues: ['SüperLig'] },
      RUS: { code: 'RUS', label: 'Russie', flag: '🇷🇺', leagues: ['RussianPremierLeague'] }
    }
  },
  AMERICAS: {
    id: 'AMERICAS',
    label: 'Amériques',
    flag: '🌎',
    countries: {
      USA: { code: 'USA', label: 'États-Unis / Canada', flag: '🇺🇸', leagues: ['MajorLeagueSoccer'] },
      BRA: { code: 'BRA', label: 'Brésil', flag: '🇧🇷', leagues: ['BrazilianSerieA'] },
      MEX: { code: 'MEX', label: 'Mexique', flag: '🇲🇽', leagues: ['LigaMX'] }
    }
  },
  ASIA: {
    id: 'ASIA',
    label: 'Asie & Moyen-Orient',
    flag: '🌏',
    countries: {
      JPN: { code: 'JPN', label: 'Japon', flag: '🇯🇵', leagues: ['J1League'] },
      KOR: { code: 'KOR', label: 'Corée du Sud', flag: '🇰🇷', leagues: ['KLeague1'] },
      KSA: { code: 'KSA', label: 'Arabie Saoudite', flag: '🇸🇦', leagues: ['SaudiProLeague'] }
    }
  }
};

/**
 * Résout les métadonnées géographiques (Pays, Région, Drapeau) d'une ligue donnée.
 *
 * @param {string} leagueName
 * @returns {{ code: string, label: string, flag: string, regionId: string }|null}
 */
export function getLeagueCountryMeta(leagueName) {
  if (!leagueName) return null;
  const clean = normalizeLeagueCode(leagueName);
  for (const [regionId, region] of Object.entries(GEOGRAPHIC_LEAGUE_HIERARCHY)) {
    for (const [countryCode, country] of Object.entries(region.countries)) {
      if (country.leagues.some(l => l === leagueName || normalizeLeagueCode(l) === clean)) {
        return {
          code: countryCode,
          label: country.label,
          flag: country.flag,
          regionId
        };
      }
    }
  }
  return {
    code: 'OTHER',
    label: 'Autre / Non classé',
    flag: '⚽',
    regionId: 'OTHER'
  };
}

/**
 * Retourne la liste des ligues canoniques associées à une région.
 *
 * @param {string} regionId 'EUROPE' | 'AMERICAS' | 'ASIA'
 * @returns {Array<string>}
 */
export function getLeaguesForRegion(regionId) {
  const reg = GEOGRAPHIC_LEAGUE_HIERARCHY[regionId];
  if (!reg || !reg.countries) return [];
  const list = [];
  Object.values(reg.countries).forEach(c => {
    if (Array.isArray(c.leagues)) list.push(...c.leagues);
  });
  return list;
}

/**
 * Retourne la liste des ligues canoniques associées à un pays.
 *
 * @param {string} countryCode Code pays ISO (ex: 'ENG', 'ESP', 'USA')
 * @returns {Array<string>}
 */
export function getLeaguesForCountry(countryCode) {
  if (!countryCode) return [];
  for (const region of Object.values(GEOGRAPHIC_LEAGUE_HIERARCHY)) {
    if (region.countries && region.countries[countryCode]) {
      return region.countries[countryCode].leagues || [];
    }
  }
  return [];
}

/**
 * Détecte si une ligue n'appartient à aucune des 28 compétitions canoniques répertoriées.
 * Permet de faire émerger dynamiquement une section conditionnelle 'Autres / Non classé'
 * si et seulement si un run futur présente une ligue imprévue (WEB-FILTERS-001).
 *
 * @param {string} leagueName
 * @returns {boolean}
 */
export function isUnclassifiedLeague(leagueName) {
  if (!leagueName) return false;
  return getLeagueCountryMeta(leagueName)?.regionId === 'OTHER';
}

/**
 * Registre canonique des sous-marchés statistiques et disciplines de cotes modélisées (WEB-FILTERS-001).
 * Préserve l'association stricte avec la famille parente pour éliminer tout risque de correspondance croisée.
 */
export const MARKET_SUBDISCIPLINES = {
  // 1. Prop Totaux (PTOT / PROP_BET)
  CORNERS_TOTALS: { id: 'CORNERS_TOTALS', familyId: 'PROP_TOTAUX', label: 'Corners Totaux', discipline: 'CORNERS' },
  SHOTS_TOTALS: { id: 'SHOTS_TOTALS', familyId: 'PROP_TOTAUX', label: 'Tirs Totaux', discipline: 'SHOTS' },
  SOT_TOTALS: { id: 'SOT_TOTALS', familyId: 'PROP_TOTAUX', label: 'Tirs Cadrés Totaux', discipline: 'SOT' },
  THROWS_TOTALS: { id: 'THROWS_TOTALS', familyId: 'PROP_TOTAUX', label: 'Touches Totales', discipline: 'THROWS' },

  // 2. Prop H2H (PH2H / H2H_PROP)
  CORNERS_H2H: { id: 'CORNERS_H2H', familyId: 'PROP_H2H', label: 'Corners H2H', discipline: 'CORNERS' },
  SOT_H2H: { id: 'SOT_H2H', familyId: 'PROP_H2H', label: 'Tirs Cadrés H2H', discipline: 'SOT' },
  SHOTS_H2H: { id: 'SHOTS_H2H', familyId: 'PROP_H2H', label: 'Tirs H2H', discipline: 'SHOTS' },
  THROWS_H2H: { id: 'THROWS_H2H', familyId: 'PROP_H2H', label: 'Touches H2H', discipline: 'THROWS' },

  // 3. Classique Buts (CB / CLASSIQUE_BUTS)
  OVER_15_GOALS: { id: 'OVER_15_GOALS', familyId: 'CLASSIQUE_BUTS', label: 'Over 1.5 Buts', discipline: 'GOALS' },
  OVER_25_GOALS: { id: 'OVER_25_GOALS', familyId: 'CLASSIQUE_BUTS', label: 'Over 2.5 Buts', discipline: 'GOALS' },
  BTTS: { id: 'BTTS', familyId: 'CLASSIQUE_BUTS', label: 'Les 2 Marquent (BTTS)', discipline: 'BTTS' },
  UNDER_35_GOALS: { id: 'UNDER_35_GOALS', familyId: 'CLASSIQUE_BUTS', label: 'Under 3.5 Buts', discipline: 'GOALS' },
  UNDER_25_GOALS: { id: 'UNDER_25_GOALS', familyId: 'CLASSIQUE_BUTS', label: 'Under 2.5 Buts', discipline: 'GOALS' },

  // 4. Team Goals (TG / TEAM_GOALS)
  OVER_05_TEAM: { id: 'OVER_05_TEAM', familyId: 'TEAM_GOALS', label: 'Over 0.5 Équipe', discipline: 'TEAM_GOALS' },
  OVER_15_TEAM: { id: 'OVER_15_TEAM', familyId: 'TEAM_GOALS', label: 'Over 1.5 Équipe', discipline: 'TEAM_GOALS' },

  // 5. Classique 1X2 (C1X2 / CLASSIQUE_1X2)
  HOME_1: { id: 'HOME_1', familyId: 'CLASSIQUE_1X2', label: 'Victoire Domicile (1)', discipline: '1X2' },
  AWAY_2: { id: 'AWAY_2', familyId: 'CLASSIQUE_1X2', label: 'Victoire Extérieur (2)', discipline: '1X2' },

  // 6. Contrarien (CONTR / CONTRARIEN)
  REBOND_JUSTICE: { id: 'REBOND_JUSTICE', familyId: 'CONTRARIEN', label: 'Rebond Justice (1)', discipline: 'CONTRARIEN' },

  // Fallback universel sécurisé pour valeur inconnue
  AUTRE: { id: 'AUTRE', familyId: 'AUTRE', label: 'Autre Marché', discipline: 'AUTRE' }
};

/**
 * Classifie déterministement une jambe de ticket ou sélection finale
 * dans une famille et un sous-marché / discipline statistique précis.
 *
 * @param {Object} leg
 * @returns {{ familyId: string, subMarketId: string, discipline: string, label: string }}
 */
export function classifyMarketLeg(leg) {
  if (!leg || typeof leg !== 'object') {
    return { familyId: 'AUTRE', subMarketId: 'AUTRE', discipline: 'AUTRE', label: 'Inconnu' };
  }

  const marche = String(leg.Marche || '').trim();
  const fam = String(leg.family_name || leg.Type || '').trim();
  const famCode = String(leg.family_code || '').trim().toUpperCase();
  const upperMarche = marche.toUpperCase();

  const isCorner = upperMarche.includes('CORNER');
  const isShot = upperMarche.includes('SHOT');
  const isSot = upperMarche.includes('SOT');
  const isThrow = upperMarche.includes('THROW') || upperMarche.includes('TOUCHE');

  // 1. Prop Totaux (PTOT / PROP_BET)
  if (fam === 'Prop Totaux' || fam === 'PROP_BET' || famCode === 'PTOT' || fam === 'PROP_TOTAUX') {
    if (isCorner) return { familyId: 'PROP_TOTAUX', subMarketId: 'CORNERS_TOTALS', discipline: 'CORNERS', label: 'Corners Totaux' };
    if (isShot) return { familyId: 'PROP_TOTAUX', subMarketId: 'SHOTS_TOTALS', discipline: 'SHOTS', label: 'Tirs Totaux' };
    if (isSot) return { familyId: 'PROP_TOTAUX', subMarketId: 'SOT_TOTALS', discipline: 'SOT', label: 'Tirs Cadrés Totaux' };
    if (isThrow) return { familyId: 'PROP_TOTAUX', subMarketId: 'THROWS_TOTALS', discipline: 'THROWS', label: 'Touches Totales' };
    return { familyId: 'PROP_TOTAUX', subMarketId: 'AUTRE_PROP_TOTAUX', discipline: 'AUTRE', label: marche || 'Prop Totaux' };
  }

  // 2. Prop H2H (PH2H / H2H_PROP)
  if (fam === 'Prop H2H' || fam === 'H2H_PROP' || famCode === 'PH2H' || fam === 'PROP_H2H') {
    if (isCorner) return { familyId: 'PROP_H2H', subMarketId: 'CORNERS_H2H', discipline: 'CORNERS', label: 'Corners H2H' };
    if (isSot) return { familyId: 'PROP_H2H', subMarketId: 'SOT_H2H', discipline: 'SOT', label: 'Tirs Cadrés H2H' };
    if (isShot) return { familyId: 'PROP_H2H', subMarketId: 'SHOTS_H2H', discipline: 'SHOTS', label: 'Tirs H2H' };
    if (isThrow) return { familyId: 'PROP_H2H', subMarketId: 'THROWS_H2H', discipline: 'THROWS', label: 'Touches H2H' };
    return { familyId: 'PROP_H2H', subMarketId: 'AUTRE_PROP_H2H', discipline: 'AUTRE', label: marche || 'Prop H2H' };
  }

  // 3. Classique Buts (CB / CLASSIQUE_BUTS)
  if (fam === 'Classique Buts' || fam === 'CLASSIQUE_BUTS' || famCode === 'CB' || fam === 'CLASSIQUE_BUTS_RECOVERED') {
    if (upperMarche.includes('BTTS') || upperMarche.includes('BOTH TEAMS')) return { familyId: 'CLASSIQUE_BUTS', subMarketId: 'BTTS', discipline: 'BTTS', label: 'Les 2 Marquent (BTTS)' };
    if (upperMarche.includes('OVER 1.5')) return { familyId: 'CLASSIQUE_BUTS', subMarketId: 'OVER_15_GOALS', discipline: 'GOALS', label: 'Over 1.5 Buts' };
    if (upperMarche.includes('OVER 2.5')) return { familyId: 'CLASSIQUE_BUTS', subMarketId: 'OVER_25_GOALS', discipline: 'GOALS', label: 'Over 2.5 Buts' };
    if (upperMarche.includes('UNDER 2.5')) return { familyId: 'CLASSIQUE_BUTS', subMarketId: 'UNDER_25_GOALS', discipline: 'GOALS', label: 'Under 2.5 Buts' };
    if (upperMarche.includes('UNDER 3.5')) return { familyId: 'CLASSIQUE_BUTS', subMarketId: 'UNDER_35_GOALS', discipline: 'GOALS', label: 'Under 3.5 Buts' };
    return { familyId: 'CLASSIQUE_BUTS', subMarketId: 'AUTRE_BUTS', discipline: 'GOALS', label: marche || 'Classique Buts' };
  }

  // 4. Team Goals (TG / TEAM_GOALS)
  if (fam === 'Team Goals' || fam === 'TEAM_GOALS' || famCode === 'TG') {
    if (upperMarche.includes('OVER 0.5')) return { familyId: 'TEAM_GOALS', subMarketId: 'OVER_05_TEAM', discipline: 'TEAM_GOALS', label: 'Over 0.5 Équipe' };
    if (upperMarche.includes('OVER 1.5')) return { familyId: 'TEAM_GOALS', subMarketId: 'OVER_15_TEAM', discipline: 'TEAM_GOALS', label: 'Over 1.5 Équipe' };
    return { familyId: 'TEAM_GOALS', subMarketId: 'AUTRE_TEAM_GOALS', discipline: 'TEAM_GOALS', label: marche || 'Team Goals' };
  }

  // 5. Classique 1X2 (C1X2 / CLASSIQUE_1X2)
  if (fam === 'Classique 1X2' || fam === 'CLASSIQUE_1X2' || famCode === 'C1X2' || fam === '1X2') {
    if (upperMarche.includes('(1)') || upperMarche.includes('HOME')) return { familyId: 'CLASSIQUE_1X2', subMarketId: 'HOME_1', discipline: '1X2', label: 'Victoire Domicile (1)' };
    if (upperMarche.includes('(2)') || upperMarche.includes('AWAY')) return { familyId: 'CLASSIQUE_1X2', subMarketId: 'AWAY_2', discipline: '1X2', label: 'Victoire Extérieur (2)' };
    return { familyId: 'CLASSIQUE_1X2', subMarketId: 'AUTRE_1X2', discipline: '1X2', label: marche || '1X2' };
  }

  // 6. Contrarien (CONTR / CONTRARIEN)
  if (fam === 'Contrarien' || fam === 'CONTRARIEN' || famCode === 'CONTR') {
    return { familyId: 'CONTRARIEN', subMarketId: 'REBOND_JUSTICE', discipline: 'CONTRARIEN', label: 'Rebond Justice (1)' };
  }

  // Fallback universel pour valeur inconnue
  return { familyId: 'AUTRE', subMarketId: 'AUTRE', discipline: 'AUTRE', label: marche || 'Marché Spécial' };
}

/**
 * Transition exclusive : sélection d'un groupe de ligues.
 * Réinitialise obligatoirement les ligues individuelles pour éviter toute exclusion invisible.
 *
 * @param {Object} filters
 * @param {string} groupId
 * @returns {Object}
 */
export function transitionSelectLeagueGroup(filters = {}, groupId) {
  const next = {
    ...filters,
    leagueGroup: groupId,
    selectedLeagues: []
  };
  return sanitizeLegFilters(next);
}

/**
 * Transition exclusive : sélection ou désélection de ligues spécifiques.
 * Si au moins une ligue est sélectionnée, le groupe de ligues est neutralisé à 'ALL'.
 *
 * @param {Object} filters
 * @param {Array<string>|string} nextLeagues
 * @returns {Object}
 */
export function transitionSetSelectedLeagues(filters = {}, nextLeagues) {
  const safeLeagues = Array.isArray(nextLeagues) ? nextLeagues : (nextLeagues ? [nextLeagues] : []);
  const next = {
    ...filters,
    selectedLeagues: safeLeagues,
    leagueGroup: safeLeagues.length > 0 ? 'ALL' : filters.leagueGroup
  };
  return sanitizeLegFilters(next);
}

/**
 * Résout la transition d'état d'un filtre pour le calcul prospectif (Toggle What-If)
 * ou l'action utilisateur réelle.
 *
 * Pour les champs tableaux (selectedLeagues, selectedMarketFamilies, selectedSubMarkets) :
 * - Si val === 'ALL' : vide le tableau (action 'Effacer').
 * - Si semantic === 'toggle' : ajoute val si absent, le retire si déjà présent.
 * - Si semantic === 'override' : remplace le tableau par [val].
 * - Applique les règles de transition exclusive entre leagueGroup et selectedLeagues.
 *
 * @param {Object} currentFilters
 * @param {string} dimensionKey
 * @param {any} val
 * @param {'toggle'|'override'} [semantic='toggle']
 * @returns {Object}
 */
export function resolveFilterTransition(currentFilters = {}, dimensionKey, val, semantic = 'toggle') {
  const isArrayField = Array.isArray(currentFilters[dimensionKey]);
  const nextFilters = { ...currentFilters };

  if (isArrayField) {
    if (val === 'ALL' || val === null || val === undefined) {
      nextFilters[dimensionKey] = [];
    } else if (semantic === 'override') {
      nextFilters[dimensionKey] = Array.isArray(val) ? val : [val];
    } else {
      // Mode toggle prospectif
      const currentList = Array.isArray(currentFilters[dimensionKey]) ? currentFilters[dimensionKey] : [];
      const isAlreadySelected = currentList.includes(val);
      nextFilters[dimensionKey] = isAlreadySelected
        ? currentList.filter(item => item !== val)
        : [...currentList, val];
    }

    // Règle de transition exclusive : Si on manipule `selectedLeagues` et qu'au moins une ligue est active,
    // le filtre de groupe `leagueGroup` est obligatoirement neutralisé à 'ALL' pour éviter toute exclusion invisible.
    if (dimensionKey === 'selectedLeagues' && nextFilters.selectedLeagues.length > 0) {
      nextFilters.leagueGroup = 'ALL';
    }
  } else {
    // Champ scalaire
    nextFilters[dimensionKey] = val;

    // Règle de transition exclusive inverse : Si on sélectionne un groupe de ligues spécifique,
    // la sélection unitaire de ligues est réinitialisée à [] pour éviter les conflits d'intersection.
    if (dimensionKey === 'leagueGroup' && val !== 'ALL') {
      nextFilters.selectedLeagues = [];
    }
  }

  return sanitizeLegFilters(nextFilters);
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
  selectedSubMarkets = [],
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
    const cleanLegLeague = normalizeLeagueCode(leg.League);
    const matchesLeague = selectedLeagues.some(l => l === leg.League || normalizeLeagueCode(l) === cleanLegLeague);
    if (!matchesLeague) return false;
  }

  // 3. Famille de marché
  if (Array.isArray(selectedMarketFamilies) && selectedMarketFamilies.length > 0 && !selectedMarketFamilies.includes('ALL')) {
    const fam = leg.family_name || leg.Type || '';
    const famType = leg.Type || '';
    const classification = classifyMarketLeg(leg);
    const matchesFamily = selectedMarketFamilies.includes(fam)
      || selectedMarketFamilies.includes(famType)
      || (classification && selectedMarketFamilies.includes(classification.familyId));
    if (!matchesFamily) return false;
  }

  // 3.bis Sous-marché précis ou discipline statistique (CORNERS_TOTALS, SHOTS_TOTALS, SOT_TOTALS, BTTS...) (WEB-FILTERS-001)
  if (Array.isArray(selectedSubMarkets) && selectedSubMarkets.length > 0 && !selectedSubMarkets.includes('ALL')) {
    const classification = classifyMarketLeg(leg);
    const matchesSubMarket = selectedSubMarkets.includes(classification.subMarketId);
    const matchesDiscipline = selectedSubMarkets.includes(classification.discipline);
    if (!matchesSubMarket && !matchesDiscipline) return false;
  }

  // 4. Date du match
  if (selectedDate && selectedDate !== 'ALL') {
    const d = getLegDate(leg);
    if (d !== selectedDate) return false;
  }

  // 5. Créneau horaire (Matin, Après-midi, Soir, Nuit ou 7 sous-créneaux chronologiques) (WEB-FILTERS-001)
  const slotTarget = (selectedTimeSlot && selectedTimeSlot !== 'ALL')
    ? selectedTimeSlot
    : ((timeSlot && timeSlot !== 'ALL') ? timeSlot : 'ALL');

  if (slotTarget !== 'ALL') {
    if (slotTarget in TIME_SLOTS) {
      const slot = getLegTimeSlot(leg, displayTimeZone);
      if (slot !== slotTarget) return false;
    } else {
      const subSlot = getLegSubTimeSlot(leg, displayTimeZone);
      if (subSlot !== slotTarget) return false;
    }
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
  selectedSubMarkets = [],
  selectedDate = 'ALL',
  selectedTimeSlot = 'ALL',
  timeSlot = 'ALL'
} = {}) {
  const hasGroup = Boolean(leagueGroup && leagueGroup !== 'ALL');
  const hasLeagues = Boolean(Array.isArray(selectedLeagues) && selectedLeagues.length > 0 && !selectedLeagues.includes('ALL'));
  const hasFamilies = Boolean(Array.isArray(selectedMarketFamilies) && selectedMarketFamilies.length > 0 && !selectedMarketFamilies.includes('ALL'));
  const hasSubMarkets = Boolean(Array.isArray(selectedSubMarkets) && selectedSubMarkets.length > 0 && !selectedSubMarkets.includes('ALL'));
  const hasDate = Boolean(selectedDate && selectedDate !== 'ALL');
  const hasSlot = Boolean((selectedTimeSlot && selectedTimeSlot !== 'ALL') || (timeSlot && timeSlot !== 'ALL'));
  return hasGroup || hasLeagues || hasFamilies || hasSubMarkets || hasDate || hasSlot;
}

/**
 * Assure la cohérence de legMatchMode : si aucun critère relatif aux jambes n'est actif,
 * neutralise et réinitialise legMatchMode à 'ANY' et minLegsMatching à 1.
 * Évite qu'un ancien seuil (ex: AT_LEAST_2) ne se réactive silencieusement
 * lors de l'ajout ultérieur d'une ligue ou d'un autre critère (WEB-FILTERS-001).
 *
 * @param {Object} filters
 * @returns {Object}
 */
export function sanitizeLegFilters(filters = {}) {
  if (!filters || typeof filters !== 'object') return filters;
  if (!hasActiveLegCriteria(filters)) {
    if (filters.legMatchMode !== 'ANY' || (filters.minLegsMatching && filters.minLegsMatching !== 1)) {
      return {
        ...filters,
        legMatchMode: 'ANY',
        minLegsMatching: 1
      };
    }
  }
  return filters;
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
  selectedSubMarkets: [], // Tableau de sous-marchés précis (WEB-FILTERS-001)
  selectedDate: 'ALL',
  timeSlot: 'ALL', // 'ALL' | 'MATIN' | 'APRES_MIDI' | 'SOIR' | 'NUIT' ou sous-créneaux
  legMatchMode: 'ANY', // 'ANY' | 'AT_LEAST_2' | 'AT_LEAST_3' | 'CUSTOM' | 'ALL'
  minLegsMatching: 1, // Seuil configurable N (entier 1..12)
  minProbThreshold: 0, // Seuil min de min_leg_model_probability (0 = désactivé)
  minLegs: 1,
  maxLegs: 12,
  sortBy: 'mean_prob', // 'mean_prob' | 'min_prob' | 'odds' | 'legs' | 'canonical'
  favoritesOnly: false,
  favoriteTicketIds: null,
  liveEstimatedOnly: false // Harmonisation filtre live estimé
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

  // 0. Filtre Favoris uniquement (WEB-FAVORITES-001 - Phase 4)
  if (filters.favoritesOnly) {
    const favIds = filters.favoriteTicketIds;
    if (favIds instanceof Set) {
      if (!favIds.has(ticket.ticket_id)) return false;
    } else if (typeof filters.isTicketFavorite === 'function') {
      if (!filters.isTicketFavorite(ticket.ticket_id)) return false;
    } else if (Array.isArray(favIds)) {
      if (!favIds.includes(ticket.ticket_id)) return false;
    } else if (favIds && typeof favIds === 'object') {
      if (!favIds[ticket.ticket_id]) return false;
    } else {
      return false;
    }
  }

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
    selectedSubMarkets: filters.selectedSubMarkets,
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
  selectedSubMarkets: [], // Support homogène sous-marchés (WEB-FILTERS-001)
  selectedProfile: 'ALL',
  streakStatus: 'ALL', // 'ALL' | 'STREAK_CONFIRMED' | 'STREAK_NEUTRAL'
  alphaOnly: false,
  superSignalOnly: false,
  liveOnly: false,
  liveEstimatedOnly: false, // Nouveau : fenêtre conventionnelle [0, 115m] (WEB-FILTERS-001)
  selectedDate: 'ALL',
  timeSlot: 'ALL', // 'ALL' | 'MATIN' | 'APRES_MIDI' | 'SOIR' | 'NUIT' ou sous-créneaux
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
    const cleanPickLeague = normalizeLeagueCode(pick.League);
    const matchesLeague = filters.selectedLeagues.some(l => l === pick.League || normalizeLeagueCode(l) === cleanPickLeague);
    if (!matchesLeague) return false;
  }

  // 3.bis Sous-marché précis ou discipline (CORNERS_TOTALS, SHOTS_TOTALS, etc.)
  if (Array.isArray(filters.selectedSubMarkets) && filters.selectedSubMarkets.length > 0 && !filters.selectedSubMarkets.includes('ALL')) {
    const classification = classifyMarketLeg(pick);
    const matchesSubMarket = filters.selectedSubMarkets.includes(classification.subMarketId);
    const matchesDiscipline = filters.selectedSubMarkets.includes(classification.discipline);
    if (!matchesSubMarket && !matchesDiscipline) return false;
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

  // 9. Live Eligible (indicateur fourni par le moteur TITANIUM)
  if (filters.liveOnly && pick.live_eligible !== true) return false;

  // 9.bis LIVE estimé (fenêtre conventionnelle [0 à 115 min après coup d'envoi] — WEB-FILTERS-001)
  if (filters.liveEstimatedOnly) {
    const nowMs = typeof filters.currentNowMs === 'number' ? filters.currentNowMs : Date.now();
    if (!isMatchLive(pick, nowMs)) return false;
  }

  // 10. Date
  if (filters.selectedDate && filters.selectedDate !== 'ALL') {
    const d = getLegDate(pick);
    if (d !== filters.selectedDate) return false;
  }

  // 11. Créneau horaire (Matin, Après-midi, Soir, Nuit ou 7 sous-créneaux chronologiques) (WEB-FILTERS-001)
  const targetSlot = filters.timeSlot || filters.selectedTimeSlot;
  if (targetSlot && targetSlot !== 'ALL') {
    if (targetSlot in TIME_SLOTS) {
      const slot = getLegTimeSlot(pick, filters.displayTimeZone);
      if (slot !== targetSlot) return false;
    } else {
      const subSlot = getLegSubTimeSlot(pick, filters.displayTimeZone);
      if (subSlot !== targetSlot) return false;
    }
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
 * en évaluant l'effectif qui résulterait de l'activation / bascule de chaque option (Toggle What-If - WEB-FILTERS-001).
 *
 * - Pour les champs scalaires (structure, leagueGroup, selectedDate, etc.) : teste l'affectation [dimensionKey]: val.
 * - Pour les champs tableaux (selectedLeagues, selectedMarketFamilies, selectedSubMarkets) :
 *   applique par défaut la sémantique de bascule (toggle) :
 *   - Si val est absent du tableau actuel : simule l'ajout [...current, val].
 *   - Si val est déjà présent : simule le retrait current.filter(x => x !== val).
 *   - Si val === 'ALL' : simule la réinitialisation à [].
 *   - Applique les transitions exclusives bidirectionnelles entre leagueGroup et selectedLeagues.
 *
 * @param {Array<Object>} tickets
 * @param {Object} currentFilters
 * @param {string} dimensionKey
 * @param {Array<string|number>} values
 * @param {{ semantic?: 'toggle'|'override' }} [options]
 * @returns {Object<string|number, number>}
 */
export function computeTicketWhatIfCounts(tickets = [], currentFilters = {}, dimensionKey, values = [], options = {}) {
  if (!Array.isArray(tickets) || !dimensionKey || !Array.isArray(values)) return {};
  const counts = {};
  const semantic = options.semantic || 'toggle';

  values.forEach(val => {
    const testFilters = resolveFilterTransition(currentFilters, dimensionKey, val, semantic);
    counts[val] = tickets.filter(t => ticketPassesFilters(t, testFilters)).length;
  });
  return counts;
}

/**
 * Calcule les compteurs dynamiques prospectifs pour les Choix Finaux (Toggle What-If - WEB-FILTERS-001).
 *
 * @param {Array<Object>} picks
 * @param {Object} currentFilters
 * @param {string} dimensionKey
 * @param {Array<string|number>} values
 * @param {{ semantic?: 'toggle'|'override' }} [options]
 * @returns {Object<string|number, number>}
 */
export function computePickWhatIfCounts(picks = [], currentFilters = {}, dimensionKey, values = [], options = {}) {
  if (!Array.isArray(picks) || !dimensionKey || !Array.isArray(values)) return {};
  const counts = {};
  const semantic = options.semantic || 'toggle';

  values.forEach(val => {
    const testFilters = resolveFilterTransition(currentFilters, dimensionKey, val, semantic);
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

