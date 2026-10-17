/**
 * TITANIUM V2 — Deterministic Human Ticket Identifier & Quantitative Formatting Helper (WEB-001-A)
 *
 * Responsabilités :
 * 1. Attribuer des identifiants humains lisibles, déterministes et uniques au sein d'une session
 *    (ex. SINGLE-001, MICRO-001, CORE3-001, CORE4-001, STANDARD-001, EXTENDED-001)
 *    AVANT l'application de tout filtre, recherche, tri ou pagination UI.
 * 2. Préserver intégralement les `ticket_id` canoniques du moteur TITANIUM et la liste source
 *    (aucun ticket supprimé, fusionné, écrasé ou réordonné silencieusement).
 * 3. Maintenir une table de correspondance bidirectionnelle (`byHumanId` <-> `byTicketId`)
 *    avec détection explicite des collisions ou identifiants canoniques absents/dupliqués.
 * 4. Gérer de manière résiliente toute famille de produit inconnue sans coder en dur les effectifs.
 * 5. Formater les métriques quantitatives (probabilités, cotes, horaires UTC) sans jamais
 *    convertir une valeur indisponible ("NOT_AVAILABLE", null, undefined) en 0 ni recalculer
 *    de probabilités ou de gains côté client.
 *
 * Note sur la stabilité des identifiants :
 * - Stabilité intra-session : Garantie à 100 % au sein d'un même export `TICKETS_ASSEMBLES.json`,
 *   indépendamment des filtres, recherches, tris ou paliers d'affichage progressif.
 * - Portée inter-sessions : L'identifiant humain (`human_id`) est séquentiel par rapport à l'ordre
 *   canonique d'émission du run actif. Si la composition d'une session change lors d'un nouvel export
 *   du pipeline TITANIUM, la numérotation reflète le nouvel export tandis que `ticket_id` demeure
 *   l'identifiant cryptographique permanent du ticket.
 */

export const PRODUCT_FAMILY_METADATA = {
  SINGLE_1: {
    code: 'SINGLE_1',
    prefix: 'SINGLE',
    label: 'Single (1)',
    shortLabel: 'Single',
    description: 'Sélection simple (1 jambe)',
    badgeClass: 'bg-emerald-600 text-white border-emerald-500',
    softBadgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    humanIdBadgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    cardBorderClass: 'border-emerald-500/30 dark:border-emerald-500/30 hover:border-emerald-500/50',
    cardGlowClass: 'shadow-[0_2px_12px_rgba(16,185,129,0.06)] dark:shadow-[0_2px_14px_rgba(16,185,129,0.10)]',
    accentTextClass: 'text-emerald-600 dark:text-emerald-400',
    accentBgClass: 'bg-emerald-500/10',
    accentBorderClass: 'border-emerald-500/20',
    isKnown: true,
    isSingle: true
  },
  MICRO_2: {
    code: 'MICRO_2',
    prefix: 'MICRO',
    label: 'Micro (2)',
    shortLabel: 'Micro (2)',
    description: 'Combiné 2 jambes',
    badgeClass: 'bg-sky-600 text-white border-sky-500',
    softBadgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    humanIdBadgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
    cardBorderClass: 'border-sky-500/30 dark:border-sky-500/30 hover:border-sky-500/50',
    cardGlowClass: 'shadow-[0_2px_12px_rgba(14,165,233,0.06)] dark:shadow-[0_2px_14px_rgba(14,165,233,0.10)]',
    accentTextClass: 'text-sky-600 dark:text-sky-400',
    accentBgClass: 'bg-sky-500/10',
    accentBorderClass: 'border-sky-500/20',
    isKnown: true,
    isSingle: false
  },
  CORE_3: {
    code: 'CORE_3',
    prefix: 'CORE3',
    label: 'Core (3)',
    shortLabel: 'Core (3)',
    description: 'Combiné 3 jambes',
    badgeClass: 'bg-indigo-600 text-white border-indigo-500',
    softBadgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    humanIdBadgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    cardBorderClass: 'border-indigo-500/30 dark:border-indigo-500/30 hover:border-indigo-500/50',
    cardGlowClass: 'shadow-[0_2px_12px_rgba(99,102,241,0.06)] dark:shadow-[0_2px_14px_rgba(99,102,241,0.10)]',
    accentTextClass: 'text-indigo-600 dark:text-indigo-400',
    accentBgClass: 'bg-indigo-500/10',
    accentBorderClass: 'border-indigo-500/20',
    isKnown: true,
    isSingle: false
  },
  CORE_4: {
    code: 'CORE_4',
    prefix: 'CORE4',
    label: 'Core (4)',
    shortLabel: 'Core (4)',
    description: 'Combiné 4 jambes',
    badgeClass: 'bg-purple-600 text-white border-purple-500',
    softBadgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    humanIdBadgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
    cardBorderClass: 'border-purple-500/30 dark:border-purple-500/30 hover:border-purple-500/50',
    cardGlowClass: 'shadow-[0_2px_12px_rgba(168,85,247,0.06)] dark:shadow-[0_2px_14px_rgba(168,85,247,0.10)]',
    accentTextClass: 'text-purple-600 dark:text-purple-400',
    accentBgClass: 'bg-purple-500/10',
    accentBorderClass: 'border-purple-500/20',
    isKnown: true,
    isSingle: false
  },
  STANDARD_5_8: {
    code: 'STANDARD_5_8',
    prefix: 'STANDARD',
    label: 'Standard (5-8)',
    shortLabel: 'Standard (5-8)',
    description: 'Combiné 5 à 8 jambes',
    badgeClass: 'bg-amber-600 text-white border-amber-500',
    softBadgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    humanIdBadgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    cardBorderClass: 'border-amber-500/30 dark:border-amber-500/30 hover:border-amber-500/50',
    cardGlowClass: 'shadow-[0_2px_12px_rgba(245,158,11,0.06)] dark:shadow-[0_2px_14px_rgba(245,158,11,0.10)]',
    accentTextClass: 'text-amber-600 dark:text-amber-400',
    accentBgClass: 'bg-amber-500/10',
    accentBorderClass: 'border-amber-500/20',
    isKnown: true,
    isSingle: false
  },
  EXTENDED_9_PLUS: {
    code: 'EXTENDED_9_PLUS',
    prefix: 'EXTENDED',
    label: 'Extended (9+)',
    shortLabel: 'Extended (9+)',
    description: 'Combiné 9+ jambes',
    badgeClass: 'bg-pink-600 text-white border-pink-500',
    softBadgeClass: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
    humanIdBadgeClass: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30',
    cardBorderClass: 'border-pink-500/30 dark:border-pink-500/30 hover:border-pink-500/50',
    cardGlowClass: 'shadow-[0_2px_12px_rgba(236,72,153,0.06)] dark:shadow-[0_2px_14px_rgba(236,72,153,0.10)]',
    accentTextClass: 'text-pink-600 dark:text-pink-400',
    accentBgClass: 'bg-pink-500/10',
    accentBorderClass: 'border-pink-500/20',
    isKnown: true,
    isSingle: false
  },
  // Compatibilité descendante formats historiques V1 éventuels
  A: {
    code: 'A',
    prefix: 'CATA',
    label: 'Catégorie A',
    shortLabel: 'Cat. A',
    description: 'Sélection Catégorie A',
    badgeClass: 'bg-emerald-600 text-white border-emerald-500',
    softBadgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    humanIdBadgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    cardBorderClass: 'border-emerald-500/30 dark:border-emerald-500/30 hover:border-emerald-500/50',
    cardGlowClass: 'shadow-[0_2px_12px_rgba(16,185,129,0.06)] dark:shadow-[0_2px_14px_rgba(16,185,129,0.10)]',
    isKnown: true,
    isSingle: false
  },
  B: {
    code: 'B',
    prefix: 'CATB',
    label: 'Catégorie B',
    shortLabel: 'Cat. B',
    description: 'Sélection Catégorie B',
    badgeClass: 'bg-sky-600 text-white border-sky-500',
    softBadgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    humanIdBadgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
    cardBorderClass: 'border-sky-500/30 dark:border-sky-500/30 hover:border-sky-500/50',
    cardGlowClass: 'shadow-[0_2px_12px_rgba(14,165,233,0.06)] dark:shadow-[0_2px_14px_rgba(14,165,233,0.10)]',
    isKnown: true,
    isSingle: false
  },
  C: {
    code: 'C',
    prefix: 'CATC',
    label: 'Catégorie C',
    shortLabel: 'Cat. C',
    description: 'Sélection Catégorie C',
    badgeClass: 'bg-purple-600 text-white border-purple-500',
    softBadgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    humanIdBadgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
    cardBorderClass: 'border-purple-500/30 dark:border-purple-500/30 hover:border-purple-500/50',
    cardGlowClass: 'shadow-[0_2px_12px_rgba(168,85,247,0.06)] dark:shadow-[0_2px_14px_rgba(168,85,247,0.10)]',
    isKnown: true,
    isSingle: false
  },
  D: {
    code: 'D',
    prefix: 'CATD',
    label: 'Catégorie D',
    shortLabel: 'Cat. D',
    description: 'Sélection Catégorie D',
    badgeClass: 'bg-amber-600 text-white border-amber-500',
    softBadgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    humanIdBadgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    cardBorderClass: 'border-amber-500/30 dark:border-amber-500/30 hover:border-amber-500/50',
    cardGlowClass: 'shadow-[0_2px_12px_rgba(245,158,11,0.06)] dark:shadow-[0_2px_14px_rgba(245,158,11,0.10)]',
    isKnown: true,
    isSingle: false
  },
  E: {
    code: 'E',
    prefix: 'CATE',
    label: 'Catégorie E',
    shortLabel: 'Cat. E',
    description: 'Sélection Catégorie E',
    badgeClass: 'bg-pink-600 text-white border-pink-500',
    softBadgeClass: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
    humanIdBadgeClass: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30',
    cardBorderClass: 'border-pink-500/30 dark:border-pink-500/30 hover:border-pink-500/50',
    cardGlowClass: 'shadow-[0_2px_12px_rgba(236,72,153,0.06)] dark:shadow-[0_2px_14px_rgba(236,72,153,0.10)]',
    isKnown: true,
    isSingle: false
  }
};

const RESERVED_KNOWN_PREFIXES = new Set(
  Object.values(PRODUCT_FAMILY_METADATA).map(m => m.prefix)
);

/**
 * Nettoie un code de famille inconnu pour produire un préfixe d'identifiant humain sûr et déterministe,
 * sans entrer en collision silencieuse avec les préfixes réservés des familles canoniques.
 *
 * @param {string} rawCode
 * @returns {string}
 */
export function sanitizeUnknownFamilyPrefix(rawCode) {
  if (rawCode === null || rawCode === undefined) return 'UNKNOWN';
  const str = String(rawCode).trim().toUpperCase();
  if (!str) return 'UNKNOWN';

  const cleaned = str.replace(/[^A-Z0-9]+/g, '').slice(0, 12);
  if (!cleaned) return 'UNKNOWN';

  // Si un code inconnu produit exactement le même préfixe qu'une famille canonique connue
  // (ex: product_code="SINGLE" au lieu de "SINGLE_1"), on le préfixe explicitement par "FAM"
  // pour préserver la séparation sémantique tout en partageant un compteur déterministe propre.
  if (RESERVED_KNOWN_PREFIXES.has(cleaned)) {
    return `FAM${cleaned}`;
  }
  return cleaned;
}

/**
 * Résout les métadonnées complètes d'affichage et de préfixe pour un `product_code` donné.
 *
 * @param {string|null|undefined} productCode
 * @returns {Object}
 */
export function getTicketFamilyMeta(productCode) {
  if (productCode && Object.prototype.hasOwnProperty.call(PRODUCT_FAMILY_METADATA, productCode)) {
    return PRODUCT_FAMILY_METADATA[productCode];
  }

  const rawLabel = (productCode !== null && productCode !== undefined && String(productCode).trim() !== '')
    ? String(productCode).trim()
    : 'UNKNOWN';
  const prefix = sanitizeUnknownFamilyPrefix(productCode);

  return {
    code: rawLabel,
    prefix,
    label: rawLabel === 'UNKNOWN' ? 'Famille non spécifiée' : rawLabel.replace(/_/g, ' '),
    shortLabel: rawLabel === 'UNKNOWN' ? 'Inconnu' : rawLabel,
    description: `Famille de ticket (${rawLabel})`,
    badgeClass: 'bg-slate-700 text-white border-slate-600',
    softBadgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
    humanIdBadgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
    cardBorderClass: 'border-slate-300 dark:border-slate-700 hover:border-slate-400',
    cardGlowClass: 'shadow-sm',
    accentTextClass: 'text-slate-600 dark:text-slate-400',
    accentBgClass: 'bg-slate-500/10',
    accentBorderClass: 'border-slate-500/20',
    isKnown: false,
    isSingle: false
  };
}

/**
 * Formate le numéro séquentiel d'un identifiant humain (3 chiffres minimum avec zéro-padding).
 *
 * @param {string} prefix
 * @param {number} sequenceNumber
 * @returns {string}
 */
export function formatHumanTicketId(prefix, sequenceNumber) {
  const safePrefix = prefix || 'UNKNOWN';
  const seqStr = String(sequenceNumber).padStart(3, '0');
  return `${safePrefix}-${seqStr}`;
}

/**
 * Attribue de manière pure, déterministe et non destructive les identifiants humains
 * à l'ensemble des tickets d'une session TITANIUM.
 *
 * Garanties :
 * - Ordre basé strictement sur l'ordre du tableau source (`0 .. rawTickets.length - 1`).
 * - Aucun ticket supprimé, fusionné ou modifié en place (`tickets.length === rawTickets.length`).
 * - Conservation intacte de `ticket.ticket_id`.
 * - Détection des `ticket_id` manquants ou dupliqués sans écrasement silencieux dans `byTicketId`.
 *
 * @param {Array<Object>} rawTickets
 * @returns {{
 *   tickets: Array<Object>,
 *   byHumanId: Map<string, string>,
 *   byTicketId: Map<string, string>,
 *   familyCounts: Object<string, number>,
 *   anomalies: Array<Object>
 * }}
 */
export function assignHumanTicketIds(rawTickets = []) {
  if (!Array.isArray(rawTickets)) {
    return {
      tickets: [],
      byHumanId: new Map(),
      byTicketId: new Map(),
      familyCounts: {},
      anomalies: [{ type: 'INVALID_INPUT', message: 'rawTickets is not an array' }]
    };
  }

  const counters = {};
  const byHumanId = new Map();
  const byTicketId = new Map();
  const familyCounts = {};
  const anomalies = [];

  const enrichedTickets = rawTickets.map((ticket, index) => {
    const safeTicket = ticket && typeof ticket === 'object' ? ticket : {};
    const rawProductCode = safeTicket.product_code ?? safeTicket.categorie ?? null;
    const familyMeta = getTicketFamilyMeta(rawProductCode);
    const prefix = familyMeta.prefix;

    // Incrément séquentiel déterministe par préfixe de famille
    counters[prefix] = (counters[prefix] || 0) + 1;
    let seq = counters[prefix];
    let humanId = formatHumanTicketId(prefix, seq);

    // Garde-fou défensif anti-collision sur byHumanId
    while (byHumanId.has(humanId)) {
      anomalies.push({
        type: 'HUMAN_ID_COLLISION_AVOIDED',
        index,
        attemptedHumanId: humanId
      });
      counters[prefix] += 1;
      seq = counters[prefix];
      humanId = formatHumanTicketId(prefix, seq);
    }

    const productKey = rawProductCode || 'UNKNOWN';
    familyCounts[productKey] = (familyCounts[productKey] || 0) + 1;

    // Vérification de l'identifiant canonique `ticket_id`
    const rawCanonicalId = safeTicket.ticket_id;
    const hasValidCanonicalId = typeof rawCanonicalId === 'string' && rawCanonicalId.trim().length > 0;
    const canonicalLookupId = hasValidCanonicalId
      ? rawCanonicalId.trim()
      : `__MISSING_TICKET_ID_IDX_${index}__`;

    if (!hasValidCanonicalId) {
      anomalies.push({
        type: 'MISSING_CANONICAL_TICKET_ID',
        index,
        humanId,
        fallbackLookupId: canonicalLookupId
      });
    }

    byHumanId.set(humanId, canonicalLookupId);

    // Ne jamais écraser silencieusement une entrée existante dans `byTicketId`
    if (byTicketId.has(canonicalLookupId)) {
      const existingHumanId = byTicketId.get(canonicalLookupId);
      anomalies.push({
        type: 'DUPLICATE_CANONICAL_TICKET_ID',
        index,
        ticketId: canonicalLookupId,
        firstHumanId: existingHumanId,
        duplicateHumanId: humanId
      });
    } else {
      byTicketId.set(canonicalLookupId, humanId);
    }

    const legCount = isValidNumericMetric(safeTicket.metrics?.leg_count)
      ? safeTicket.metrics.leg_count
      : (Array.isArray(safeTicket.legs) ? safeTicket.legs.length : 0);

    return {
      ...safeTicket,
      // Conservation explicite de ticket_id tel que fourni par la source
      ticket_id: safeTicket.ticket_id,
      human_id: humanId,
      family_prefix: prefix,
      family_sequence: seq,
      canonical_index: index,
      family_meta: familyMeta,
      is_single_ticket: familyMeta.isSingle || legCount === 1
    };
  });

  return {
    tickets: enrichedTickets,
    byHumanId,
    byTicketId,
    familyCounts,
    anomalies
  };
}

/**
 * Vérifie si une valeur est un nombre fini valide pour une métrique quantitative.
 * - Rejette "NOT_AVAILABLE", null, undefined, NaN, Infinity, chaînes et booléens.
 * - Conserve strictement `0` comme valeur numérique valide.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isValidNumericMetric(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Formate une probabilité (exprimée sur [0, 1] par le moteur TITANIUM) sans jamais
 * transformer une valeur indisponible en 0 ni produire `NaN%`.
 *
 * @param {*} value Valeur brute (ex. 0.883, 0, "NOT_AVAILABLE", null)
 * @param {number} [decimals=1] Nombre de décimales d'affichage
 * @returns {{ available: boolean, display: string, shortDisplay: string, numericPercent: number|null, raw: * }}
 */
export function formatProbabilityMetric(value, decimals = 1) {
  if (!isValidNumericMetric(value)) {
    return {
      available: false,
      display: 'Non disponible',
      shortDisplay: 'N/D',
      numericPercent: null,
      raw: value
    };
  }
  const pct = value * 100;
  const formatted = `${pct.toFixed(decimals)}%`;
  return {
    available: true,
    display: formatted,
    shortDisplay: formatted,
    numericPercent: pct,
    raw: value
  };
}

/**
 * Formate une cote de référence (ex. `reference_odds_floor_product` ou `Cote_Ref`)
 * sans jamais produire de cote fictive.
 *
 * @param {*} value Valeur brute (ex. 1.6303, 1.19, null)
 * @param {number} [decimals=2] Nombre de décimales d'affichage
 * @returns {{ available: boolean, display: string, numericDisplay: string, raw: * }}
 */
export function formatOddsMetric(value, decimals = 2) {
  if (!isValidNumericMetric(value)) {
    return {
      available: false,
      display: 'N/D',
      numericDisplay: 'N/D',
      raw: value
    };
  }
  const fixed = value.toFixed(decimals);
  return {
    available: true,
    display: `@${fixed}`,
    numericDisplay: fixed,
    raw: value
  };
}

/**
 * Formate un score EV (`Score_EV` du moteur TITANIUM) sans jamais le présenter comme un ROI %.
 *
 * @param {*} value
 * @param {number} [decimals=3]
 * @returns {{ available: boolean, display: string, raw: * }}
 */
export function formatScoreEvMetric(value, decimals = 3) {
  if (!isValidNumericMetric(value)) {
    return {
      available: false,
      display: 'N/D',
      raw: value
    };
  }
  return {
    available: true,
    display: value.toFixed(decimals),
    raw: value
  };
}

/**
 * Formate un objet Date en jour et mois en français avec initiale majuscule (ex. "Dim. 18 oct.").
 *
 * @param {Date} dateObj
 * @returns {string}
 */
export function formatFrenchDayMonth(dateObj) {
  if (!dateObj || Number.isNaN(dateObj.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).formatToParts(dateObj);
    let weekday = '', day = '', month = '';
    for (const p of parts) {
      if (p.type === 'weekday') weekday = p.value;
      if (p.type === 'day') day = p.value;
      if (p.type === 'month') month = p.value;
    }
    const capW = weekday ? (weekday.charAt(0).toUpperCase() + weekday.slice(1)) : '';
    return `${capW} ${day} ${month}`.trim();
  } catch (_) {
    return dateObj.toLocaleDateString('fr-FR');
  }
}

/**
 * Formate l'heure locale en français (format 24h, ex. "15:00").
 *
 * @param {Date} dateObj
 * @returns {string}
 */
export function formatFrenchTime(dateObj) {
  if (!dateObj || Number.isNaN(dateObj.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(dateObj);
    let h = '', m = '';
    for (const p of parts) {
      if (p.type === 'hour') h = p.value;
      if (p.type === 'minute') m = p.value;
    }
    return `${h}:${m}`;
  } catch (_) {
    return dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
}

/**
 * Formate de façon lisible, déterministe et respectueuse des fuseaux la date et l'heure d'un match :
 * 1. Priorise `kickoff_utc` lorsqu'il est valide et le convertit dans le fuseau horaire local
 *    du navigateur en français (ex. "Dim. 18 oct. · 15:00 (heure locale)").
 * 2. Préserve l'horodatage UTC original dans `utcDisplay` et `title` pour consultation technique.
 * 3. En cas de date seule (`Date` ou `Match_Date`), évite tout décalage accidentel de journée
 *    via un parsing calendrier sécurisé (midi local) et affiche uniquement la date en français
 *    sans jamais fabriquer d'heure artificielle.
 *
 * @param {Object} item Jambe de ticket, sélection finale ou objet avec kickoff_utc / Date / Heure
 * @returns {{
 *   display: string,
 *   formattedLocal: string,
 *   hasTime: boolean,
 *   timezone: string|null,
 *   rawKickoffUtc: string|null,
 *   rawDate: string|null,
 *   utcDisplay: string,
 *   title: string
 * }}
 */
export function formatKickoffExplicit(item) {
  if (!item || typeof item !== 'object') {
    return {
      display: 'Date non disponible',
      formattedLocal: 'Date non disponible',
      hasTime: false,
      timezone: null,
      rawKickoffUtc: null,
      rawDate: null,
      utcDisplay: 'Date non disponible',
      title: 'Date non disponible'
    };
  }

  const rawKickoffUtc = typeof item.kickoff_utc === 'string' && item.kickoff_utc.trim()
    ? item.kickoff_utc.trim()
    : null;
  const rawDate = (typeof item.Date === 'string' && item.Date.trim())
    || (typeof item.Match_Date === 'string' && item.Match_Date.trim())
    || (typeof item.date === 'string' && item.date.trim())
    || null;
  const rawHour = typeof item.Heure === 'string' && item.Heure.trim() && item.Heure.trim().toUpperCase() !== 'TBD'
    ? item.Heure.trim()
    : null;

  // 1. Priorité absolue à `kickoff_utc` valide
  if (rawKickoffUtc && /T\d{2}:\d{2}/.test(rawKickoffUtc)) {
    const parsed = new Date(rawKickoffUtc);
    if (!Number.isNaN(parsed.getTime())) {
      const frenchDate = formatFrenchDayMonth(parsed);
      const frenchTime = formatFrenchTime(parsed);

      const uYear = parsed.getUTCFullYear();
      const uMonth = String(parsed.getUTCMonth() + 1).padStart(2, '0');
      const uDay = String(parsed.getUTCDate()).padStart(2, '0');
      const uHours = String(parsed.getUTCHours()).padStart(2, '0');
      const uMinutes = String(parsed.getUTCMinutes()).padStart(2, '0');
      const utcDisplay = `${uYear}-${uMonth}-${uDay} • ${uHours}:${uMinutes} UTC`;

      return {
        display: `${frenchDate} · ${frenchTime} (heure locale)`,
        formattedLocal: `${frenchDate} · ${frenchTime}`,
        hasTime: true,
        timezone: 'LOCAL',
        rawKickoffUtc,
        rawDate: `${uYear}-${uMonth}-${uDay}`,
        utcDisplay,
        title: `Heure locale du navigateur • Horodatage original : ${utcDisplay}`
      };
    }
  }

  // 2. Fallbacks sans `kickoff_utc` : parsing calendrier sécurisé pour neutraliser tout décalage de fuseau
  if (rawDate) {
    let frenchDate = rawDate;
    const dateMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const y = Number(dateMatch[1]);
      const m = Number(dateMatch[2]);
      const d = Number(dateMatch[3]);
      // Midi local neutralise tout décalage horaire ou saut de frontière de fuseau
      const safeNoonDate = new Date(y, m - 1, d, 12, 0, 0);
      frenchDate = formatFrenchDayMonth(safeNoonDate) || rawDate;
    }

    if (rawHour) {
      return {
        display: `${frenchDate} · ${rawHour} (heure locale)`,
        formattedLocal: `${frenchDate} · ${rawHour}`,
        hasTime: true,
        timezone: 'LOCAL',
        rawKickoffUtc: null,
        rawDate,
        utcDisplay: `${rawDate} • ${rawHour}`,
        title: `Heure déclarée • Date : ${rawDate}`
      };
    }

    // Date seule sans fabriquer d'heure artificielle
    return {
      display: frenchDate,
      formattedLocal: frenchDate,
      hasTime: false,
      timezone: null,
      rawKickoffUtc: null,
      rawDate,
      utcDisplay: rawDate,
      title: `Date : ${rawDate} (Heure non spécifiée)`
    };
  }

  return {
    display: 'Date non disponible',
    formattedLocal: 'Date non disponible',
    hasTime: false,
    timezone: null,
    rawKickoffUtc: null,
    rawDate: null,
    utcDisplay: 'Date non disponible',
    title: 'Date non disponible'
  };
}

/**
 * Formate un horodatage ISO UTC brut (ex. `earliest_kickoff_utc`, `latest_kickoff_utc`)
 * en préservant explicitement le fuseau `UTC` d'origine pour les consultations techniques.
 *
 * @param {string|null|undefined} isoString
 * @returns {string}
 */
export function formatIsoTimestampUtc(isoString) {
  if (!isoString || typeof isoString !== 'string') return 'Non disponible';
  const parsed = new Date(isoString.trim());
  if (Number.isNaN(parsed.getTime())) return isoString.trim();
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const hours = String(parsed.getUTCHours()).padStart(2, '0');
  const minutes = String(parsed.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} • ${hours}:${minutes} UTC`;
}
