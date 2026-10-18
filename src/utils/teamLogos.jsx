import React, { useState, useEffect } from 'react';
import logosRegistry from '../data/teamLogosRegistry.json';
import { getTeamDisplayName, cleanStr } from './teamDisplayNames.js';

// Mots-clés / affixes standards de clubs retirés lors du fallback flou
const CLUB_AFFIXES = new Set([
  'fc', 'cf', 'sc', 'fk', 'ac', 'rc', 'afc', 'if', 'ff', 'sv', 'de', 'la', 'el',
  'club', 'calcio', 'cfc', 'ssc', 'as', 'us', 'uanl', 'unam'
]);

/**
 * Nettoie et extrait le coeur alphanumérique d'un nom de club en retirant les affixes standards.
 */
function getCoreCleanName(name) {
  if (!name) return '';
  const cleaned = cleanStr(name);
  const tokens = name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const coreTokens = tokens.filter(t => !CLUB_AFFIXES.has(t));
  const coreCleaned = coreTokens.join('');
  return { cleaned, coreCleaned: coreCleaned || cleaned };
}

/**
 * Résout déterministement l'URL du logo d'un club.
 *
 * Hiérarchie de résolution :
 * 1. Par `teamId` direct (si fourni et validé dans le registre).
 * 2. Par clé composée `(league:cleaned_name)` pour une isolation de contexte stricte.
 * 3. Par clé directe `cleaned_name`.
 * 4. Par clé composée avec suppression des affixes `(league:core_cleaned)`.
 * 5. Par nom coeur `core_cleaned`.
 * 6. Fallback vers le blason SVG neutre par défaut (/logos/teams/default.svg).
 *
 * @param {string|null} teamName - Nom brut ou normalisé du club
 * @param {string|null} league - Nom de la ligue ou code (optionnel pour affiner)
 * @param {number|string|null} teamId - Identifiant FotMob direct (optionnel)
 * @returns {string} Chemin local du logo
 */
export function getTeamLogoUrl(teamName, league = null, teamId = null) {
  if (teamId && logosRegistry.teamsById && logosRegistry.teamsById[String(teamId)]) {
    return logosRegistry.teamsById[String(teamId)].logo;
  }

  if (!teamName) {
    return logosRegistry.defaultTeamLogo || '/logos/teams/default.svg';
  }

  const { cleaned, coreCleaned } = getCoreCleanName(teamName);
  const leagueClean = league ? cleanStr(league) : null;

  // 1. Clé composée avec league (isolation stricte par championnat)
  if (leagueClean) {
    const compoundKey = `${leagueClean}:${cleaned}`;
    if (logosRegistry.compoundKeyToId[compoundKey]) {
      const id = logosRegistry.compoundKeyToId[compoundKey];
      return `/logos/teams/${id}.png`;
    }
  }

  // 2. Nom direct nettoyé
  if (logosRegistry.teamNameToId[cleaned]) {
    const id = logosRegistry.teamNameToId[cleaned];
    return `/logos/teams/${id}.png`;
  }

  // 3. Clé composée avec coeur sans affixes
  if (leagueClean && coreCleaned) {
    const compoundCoreKey = `${leagueClean}:${coreCleaned}`;
    if (logosRegistry.compoundKeyToId[compoundCoreKey]) {
      const id = logosRegistry.compoundKeyToId[compoundCoreKey];
      return `/logos/teams/${id}.png`;
    }
  }

  // 4. Coeur sans affixes
  if (coreCleaned && logosRegistry.teamNameToId[coreCleaned]) {
    const id = logosRegistry.teamNameToId[coreCleaned];
    return `/logos/teams/${id}.png`;
  }

  // 5. Fallback sécurisé sans requête réseau externe
  return logosRegistry.defaultTeamLogo || '/logos/teams/default.svg';
}

/**
 * Registre canonique des libellés d'affichage des compétitions (WEB-001).
 * Découple les noms d'affichage élégants des clés techniques brutes TITANIUM.
 */
export const LEAGUE_DISPLAY_NAMES = {
  // Top 7 Europe
  'PremierLeague': 'Premier League',
  'Premier League': 'Premier League',
  'PL': 'Premier League',
  'LaLiga': 'LaLiga',
  'LIGA': 'LaLiga',
  'SerieA': 'Serie A',
  'Serie A': 'Serie A',
  'SERIEA': 'Serie A',
  'Bundesliga': 'Bundesliga',
  'BUND': 'Bundesliga',
  'Ligue1': 'Ligue 1',
  'Ligue 1': 'Ligue 1',
  'LIG1': 'Ligue 1',
  'Eredivisie': 'Eredivisie',
  'ERE': 'Eredivisie',
  'LigaPortugal': 'Liga Portugal',
  'Liga Portugal': 'Liga Portugal',
  'PRIMEIRA': 'Liga Portugal',
  'POR1': 'Liga Portugal',

  // Second Tiers Europe
  '2.Bundesliga': '2. Bundesliga',
  '2. Bundesliga': '2. Bundesliga',
  '2Bundesliga': '2. Bundesliga',
  'BUND2': '2. Bundesliga',
  'LaLiga2': 'LaLiga 2',
  'LaLiga 2': 'LaLiga 2',
  'LIGA2': 'LaLiga 2',
  'Ligue2': 'Ligue 2',
  'Ligue 2': 'Ligue 2',
  'LIG2': 'Ligue 2',
  'SerieB': 'Serie B',
  'Serie B': 'Serie B',
  'SERIEB': 'Serie B',
  'Championship': 'Championship',
  'CHAMP': 'Championship',

  // Other Europe
  'Eliteserien': 'Eliteserien',
  'NOR1': 'Eliteserien',
  'Superligaen': 'Superligaen',
  'DEN1': 'Superligaen',
  'Allsvenskan': 'Allsvenskan',
  'SWE1': 'Allsvenskan',
  'AustrianBundesliga': 'Austrian Bundesliga',
  'AUT1': 'Austrian Bundesliga',
  'ScottishPremiership': 'Scottish Premiership',
  'SCO1': 'Scottish Premiership',
  'SüperLig': 'Süper Lig',
  'Süper Lig': 'Süper Lig',
  'SperLig': 'Süper Lig',
  'SuperLig': 'Süper Lig',
  'TUR1': 'Süper Lig',
  'RussianPremierLeague': 'Russian Premier League',
  'RUS1': 'Russian Premier League',
  'BelgianProLeague': 'Belgian Pro League',
  'BEL1': 'Belgian Pro League',
  'SwissSuperLeague': 'Swiss Super League',
  'SUI1': 'Swiss Super League',
  'SuperLeagueGreece': 'Super League Greece',
  'GRE1': 'Super League Greece',
  'Ekstraklasa': 'Ekstraklasa',
  'POL1': 'Ekstraklasa',

  // Americas
  'MajorLeagueSoccer': 'Major League Soccer',
  'MLS': 'Major League Soccer',
  'BrazilianSerieA': 'Brazilian Serie A',
  'BRA1': 'Brazilian Serie A',
  'LigaMX': 'Liga MX',
  'MEX1': 'Liga MX',

  // Asia & Middle East
  'J1League': 'J1 League',
  'JAP1': 'J1 League',
  'KLeague1': 'K League 1',
  'KOR1': 'K League 1',
  'SaudiProLeague': 'Saudi Pro League',
  'SAUDI': 'Saudi Pro League',

  // Métadonnées d'exploration
  'ALL': 'Toutes les Ligues',
  'TICKETS': 'Master Selections'
};

/**
 * Retourne le libellé d'affichage humain et formaté d'un championnat.
 *
 * @param {string|null} leagueKey - Clé ou code technique TITANIUM
 * @returns {string} Nom canonique lisible
 */
export function getLeagueDisplayName(leagueKey) {
  if (!leagueKey) return '';
  if (LEAGUE_DISPLAY_NAMES[leagueKey]) return LEAGUE_DISPLAY_NAMES[leagueKey];
  const clean = cleanStr(leagueKey);
  for (const [k, v] of Object.entries(LEAGUE_DISPLAY_NAMES)) {
    if (cleanStr(k) === clean) return v;
  }
  if (logosRegistry?.leagues?.[leagueKey]?.name) return logosRegistry.leagues[leagueKey].name;
  if (logosRegistry?.leagues?.[clean]?.name) return logosRegistry.leagues[clean].name;
  return leagueKey;
}

/**
 * Résout déterministement l'URL du logo d'une compétition.
 *
 * @param {string} leagueKey - Nom ou code de la ligue (ex: "PremierLeague", "PL", "47")
 * @param {boolean} isDark - Préférer la variante dark si disponible
 * @returns {string} Chemin local du logo
 */
export function getLeagueLogoUrl(leagueKey, isDark = false) {
  if (!leagueKey) {
    return logosRegistry.defaultLeagueLogo || '/logos/leagues/default.svg';
  }

  const clean = cleanStr(leagueKey);
  const leagueData = logosRegistry.leagues[leagueKey] ||
                     logosRegistry.leagues[clean] ||
                     logosRegistry.leagues[leagueKey.toUpperCase()];

  if (leagueData) {
    return (isDark && leagueData.logoDark) ? leagueData.logoDark : leagueData.logo;
  }

  return logosRegistry.defaultLeagueLogo || '/logos/leagues/default.svg';
}

/**
 * Retourne un objet complet résolu pour une équipe (nom d'affichage + logo).
 */
export function getTeamInfo(teamName, league = null, teamId = null) {
  const shortName = getTeamDisplayName(teamName);
  const logoUrl = getTeamLogoUrl(teamName, league, teamId);
  return {
    displayName: shortName,
    rawName: teamName || 'Unknown',
    logoUrl
  };
}

const SIZE_CLASSES = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5 sm:w-6 sm:h-6',
  lg: 'w-7 h-7 sm:w-8 sm:h-8',
  xl: 'w-10 h-10 sm:w-12 sm:h-12'
};

/**
 * Composant React performant & accessible pour l'affichage de l'écusson d'un club.
 */
export function TeamLogo({
  teamName,
  league = null,
  teamId = null,
  size = 'sm',
  className = '',
  alt = ''
}) {
  const targetUrl = getTeamLogoUrl(teamName, league, teamId);
  const [src, setSrc] = useState(targetUrl);

  useEffect(() => {
    setSrc(targetUrl);
  }, [targetUrl]);

  const sizeClass = SIZE_CLASSES[size] || size;
  const fallbackUrl = logosRegistry.defaultTeamLogo || '/logos/teams/default.svg';

  const handleError = () => {
    if (src !== fallbackUrl) {
      setSrc(fallbackUrl);
    }
  };

  return (
    <img
      src={src}
      alt={alt || teamName || 'Club Logo'}
      loading="lazy"
      decoding="async"
      onError={handleError}
      className={`object-contain shrink-0 select-none ${sizeClass} ${className}`}
    />
  );
}

/**
 * Composant React pour l'affichage du logo d'une compétition.
 * Gère automatiquement et sans désynchronisation le thème clair / sombre :
 * - Si isDark est explicitement passé (booléen), respecte la valeur.
 * - Sinon, affiche simultanément la variante light (dark:hidden) et dark (hidden dark:inline-block).
 */
export function LeagueLogo({
  league,
  isDark = undefined,
  size = 'sm',
  className = '',
  alt = ''
}) {
  const sizeClass = SIZE_CLASSES[size] || size;
  const fallbackUrl = logosRegistry.defaultLeagueLogo || '/logos/leagues/default.svg';

  const lightUrl = getLeagueLogoUrl(league, false);
  const darkUrl = getLeagueLogoUrl(league, true);

  // 1. Si isDark est explicitement spécifié
  if (typeof isDark === 'boolean') {
    const targetUrl = isDark ? darkUrl : lightUrl;
    return (
      <img
        src={targetUrl}
        alt={alt || league || 'League Logo'}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          if (e.currentTarget.src !== fallbackUrl) {
            e.currentTarget.src = fallbackUrl;
          }
        }}
        className={`object-contain shrink-0 select-none ${sizeClass} ${className}`}
      />
    );
  }

  // 2. Mode automatique bi-thème via classes CSS Tailwind
  if (darkUrl && darkUrl !== lightUrl) {
    return (
      <span className={`inline-flex items-center justify-center shrink-0 ${sizeClass} ${className}`}>
        <img
          src={lightUrl}
          alt={alt || league || 'League Logo'}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            if (e.currentTarget.src !== fallbackUrl) {
              e.currentTarget.src = fallbackUrl;
            }
          }}
          className="w-full h-full object-contain select-none dark:hidden"
        />
        <img
          src={darkUrl}
          alt={alt || league || 'League Logo'}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            if (e.currentTarget.src !== fallbackUrl) {
              e.currentTarget.src = fallbackUrl;
            }
          }}
          className="w-full h-full object-contain select-none hidden dark:block"
        />
      </span>
    );
  }

  // 3. Cas standard (logo unique identique clair/sombre)
  return (
    <img
      src={lightUrl}
      alt={alt || league || 'League Logo'}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        if (e.currentTarget.src !== fallbackUrl) {
          e.currentTarget.src = fallbackUrl;
        }
      }}
      className={`object-contain shrink-0 select-none ${sizeClass} ${className}`}
    />
  );
}
