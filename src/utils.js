import teamMapping from '../team_mapping.json'

// Normalize string for better matching
const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

export const getTeamInfo = (teamName, allMatchups = []) => {
    if (!teamName) return { shortName: 'Unknown', logoPath: null };

    // First, map to a standard name if possible using teamMapping
    const mappedName = teamMapping[teamName] || teamName;
    const mappedNormalized = normalize(mappedName);
    const originalNormalized = normalize(teamName);

    // Attempt to find a short name in matchups
    let shortName = mappedName;

    if (allMatchups && allMatchups.length > 0) {
        const foundMatchup = allMatchups.find(mu => {
            const muHome = normalize(mu.home);
            const muAway = normalize(mu.away);
            return (muHome === mappedNormalized || muHome === originalNormalized || mappedNormalized.includes(muHome) || muHome.includes(mappedNormalized)) ||
                   (muAway === mappedNormalized || muAway === originalNormalized || mappedNormalized.includes(muAway) || muAway.includes(mappedNormalized));
        });

        if (foundMatchup) {
            const muHome = normalize(foundMatchup.home);
            const muAway = normalize(foundMatchup.away);

            if (muHome === mappedNormalized || muHome === originalNormalized || mappedNormalized.includes(muHome) || muHome.includes(mappedNormalized)) {
                shortName = foundMatchup.home;
            } else if (muAway === mappedNormalized || muAway === originalNormalized || mappedNormalized.includes(muAway) || muAway.includes(mappedNormalized)) {
                shortName = foundMatchup.away;
            }
        }
    }

    // Construct logo filename based on short name
    // Matches logic from the Python script: replace non-alphanumeric with _, lower case
    const filename = shortName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_') + '.webp';
    const logoPath = `/logos/${filename}`;

    return {
        shortName,
        logoPath
    };
};
