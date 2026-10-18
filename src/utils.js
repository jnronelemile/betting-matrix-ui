import { getTeamLogoUrl } from './utils/teamLogos';
import { getTeamDisplayName } from './utils/teamDisplayNames';

/**
 * Helper rétro-compatible pour l'obtention des informations d'un club (nom court + logo).
 * Délègue désormais à la bibliothèque déterministe TITANIUM WEB.
 */
export const getTeamInfo = (teamName, allMatchups = [], league = null) => {
    if (!teamName) {
        return {
            shortName: 'Unknown',
            logoPath: '/logos/teams/default.svg'
        };
    }

    const shortName = getTeamDisplayName(teamName);
    const logoPath = getTeamLogoUrl(teamName, league);

    return {
        shortName,
        logoPath
    };
};
