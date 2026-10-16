/**
 * Pure filter predicates and algebraic operators for TITANIUM V2
 * Strictly consumes TITANIUM outputs without recalculating probabilities or risk decisions.
 */

export const INITIAL_FILTERS_STATE = {
  // Family 1: Selection & Pipeline
  masterPicksOnly: false,
  inTicketsOnly: false,
  operationalCleanOnly: false,

  // Family 2: Market Coverage
  fullPropsOnly: false,
  market1X2UnblockedOnly: false,
  marketGoalsUnblockedOnly: false,

  // Family 3: Analytical Signals
  superSignalsAny: false,
  superSignalsSpecific: [], // OR group of specific Super Signals
  streakConfirmedOnly: false,
  streakWarningOnly: false,
  undervaluedTeamOnly: false,
  fireMomentumOnly: false,

  // Family 4: Risk & Integrity
  killSwitchActiveOnly: false,
  hasBlockedMarketsOnly: false,
  falseFavoriteAlertOnly: false,
};

export const SUPER_SIGNAL_KEYS = [
  { id: 'U25_STERILE_DOMINATION', label: 'Sterile Domination (U2.5)', desc: 'Possession stérile anticipée' },
  { id: 'H_MINUS_25_ANNIHILATION', label: 'Annihilation (H-2.5)', desc: 'Écart de niveau structural maximal' },
  { id: 'O15_ELITE', label: 'Over 1.5 Elite', desc: 'Signal volumétrique buts haut niveau' },
  { id: 'O_CORNERS_ELITE', label: 'Corners Elite', desc: 'Volumétrie exceptionnelle de corners' },
];

/**
 * Pure check for Kill-Switch status on a match
 */
export function isMatchKillSwitch(match) {
  if (!match) return false;
  const probs = match.True_Probabilities || {};
  const investSignals = match.Risk_Management_Context?.Investment_Signals || {};
  return Boolean(
    investSignals.IS_KILL_SWITCH_ACTIVE ||
    ((probs.PROB_1 === 0 || probs.PROB_1 == null) && (probs.PROB_O25 === 0 || probs.PROB_O25 == null))
  );
}

/**
 * Pure evaluation of a match against the analytical filters
 */
export function matchPassesAnalyticalFilters(match, filtersState) {
  if (!match || !filtersState) return true;

  // Family 1: Selection & Pipeline
  if (filtersState.masterPicksOnly && !match.isFinalPick) {
    return false;
  }
  if (filtersState.inTicketsOnly && !match.inTickets) {
    return false;
  }
  if (filtersState.operationalCleanOnly) {
    const isKs = isMatchKillSwitch(match);
    const isComplete = (match.Data_Integrity || []).includes('COMPLETE');
    if (isKs || !isComplete) return false;
  }

  // Family 2: Market Coverage
  if (filtersState.fullPropsOnly) {
    const hasShots = match.Prop_Bets?.LAMBDA_SHOTS_MATCH != null && match.Prop_Bets?.PROB_OVER_MEDIAN_SHOTS != null;
    const hasSot = match.Prop_Bets?.LAMBDA_SOT_MATCH != null && match.Prop_Bets?.PROB_OVER_MEDIAN_SOT != null;
    const hasThrows = match.Prop_Bets?.LAMBDA_THROWS_MATCH != null && match.Prop_Bets?.PROB_OVER_MEDIAN_THROWS != null;
    if (!hasShots || !hasSot || !hasThrows) return false;
  }
  if (filtersState.market1X2UnblockedOnly) {
    const bm = match.Risk_Management_Context?.Operational_Restrictions?.blocked_markets || [];
    const is1X2Blocked = bm.includes('1X2_HOME') || bm.includes('1X2_AWAY');
    const prob1 = match.True_Probabilities?.PROB_1 || 0;
    if (is1X2Blocked || prob1 <= 0) return false;
  }
  if (filtersState.marketGoalsUnblockedOnly) {
    const bm = match.Risk_Management_Context?.Operational_Restrictions?.blocked_markets || [];
    const isGoalsBlocked = bm.includes('OVER_2.5');
    const probO25 = match.True_Probabilities?.PROB_O25 || 0;
    if (isGoalsBlocked || probO25 <= 0) return false;
  }

  // Family 3: Analytical Signals
  if (filtersState.superSignalsAny) {
    const hasSuper = match.Super_Signals && Object.values(match.Super_Signals).some(v => v === true);
    if (!hasSuper) return false;
  }
  if (filtersState.superSignalsSpecific && filtersState.superSignalsSpecific.length > 0) {
    // OR inclusive intra-group
    const hasAnySpecific = filtersState.superSignalsSpecific.some(key => match.Super_Signals?.[key] === true);
    if (!hasAnySpecific) return false;
  }
  if (filtersState.streakConfirmedOnly) {
    const sc = match.Serie_Intelligence?.STREAK_CONFIRMED;
    const hasStreak = Array.isArray(sc) ? sc.length > 0 : Boolean(sc);
    if (!hasStreak) return false;
  }
  if (filtersState.streakWarningOnly) {
    const sw = match.Serie_Intelligence?.STREAK_WARNING;
    const hasWarn = Array.isArray(sw) ? sw.length > 0 : Boolean(sw);
    if (!hasWarn) return false;
  }
  if (filtersState.undervaluedTeamOnly) {
    const ji = match.Analytical_Signals?.justice_intelligence || {};
    const isUndervalued = ji.home?.status === 'UNDERVALUED' || ji.away?.status === 'UNDERVALUED';
    if (!isUndervalued) return false;
  }
  if (filtersState.fireMomentumOnly) {
    const mp = match.Analytical_Signals?.momentum_profiles || {};
    const isFire = mp.home?.momentum === 'FIRE' || mp.away?.momentum === 'FIRE';
    if (!isFire) return false;
  }

  // Family 4: Risk & Integrity
  if (filtersState.killSwitchActiveOnly) {
    if (!isMatchKillSwitch(match)) return false;
  }
  if (filtersState.hasBlockedMarketsOnly) {
    const bm = match.Risk_Management_Context?.Operational_Restrictions?.blocked_markets || [];
    if (bm.length === 0) return false;
  }
  if (filtersState.falseFavoriteAlertOnly) {
    const isFalseFav = match.Risk_Management_Context?.Tactical_Red_Flags?.IS_FALSE_FAVORITE === true;
    if (!isFalseFav) return false;
  }

  return true;
}

/**
 * Filter an array of matches by analytical filters state
 */
export function filterMatches(matches, filtersState) {
  if (!Array.isArray(matches)) return [];
  return matches.filter(m => matchPassesAnalyticalFilters(m, filtersState));
}

/**
 * Pure transition helper with mutual exclusion rules
 */
export function getNextFiltersState(currentState, toggleKey, subKey = null) {
  const next = { ...currentState };

  if (toggleKey === 'superSignalsSpecific' && subKey) {
    const list = next.superSignalsSpecific || [];
    if (list.includes(subKey)) {
      next.superSignalsSpecific = list.filter(k => k !== subKey);
    } else {
      next.superSignalsSpecific = [...list, subKey];
    }
    return next;
  }

  const willBeActive = !next[toggleKey];
  next[toggleKey] = willBeActive;

  // Mutual exclusion between Kill-Switch active and Operational Clean
  if (toggleKey === 'killSwitchActiveOnly' && willBeActive) {
    next.operationalCleanOnly = false;
  } else if (toggleKey === 'operationalCleanOnly' && willBeActive) {
    next.killSwitchActiveOnly = false;
  }

  return next;
}

/**
 * Computes What-If count: the number of matching items if action is taken
 */
export function computeWhatIfCount(baseMatches, currentState, toggleKey, subKey = null) {
  if (!Array.isArray(baseMatches)) return 0;
  const next = getNextFiltersState(currentState, toggleKey, subKey);
  return filterMatches(baseMatches, next).length;
}

/**
 * Computes the total number of active analytical filter criteria
 */
export function countActiveFilters(filtersState) {
  if (!filtersState) return 0;
  let count = 0;
  Object.entries(filtersState).forEach(([k, v]) => {
    if (k === 'superSignalsSpecific') {
      count += (Array.isArray(v) ? v.length : 0);
    } else if (v === true) {
      count += 1;
    }
  });
  return count;
}

/**
 * Returns formatted array of active filter chips for display and removal
 */
export function getActiveFilterChips(filtersState) {
  if (!filtersState) return [];
  const chips = [];

  if (filtersState.masterPicksOnly) {
    chips.push({ key: 'masterPicksOnly', label: 'Master Picks' });
  }
  if (filtersState.inTicketsOnly) {
    chips.push({ key: 'inTicketsOnly', label: 'In Tickets' });
  }
  if (filtersState.operationalCleanOnly) {
    chips.push({ key: 'operationalCleanOnly', label: 'Operational Clean' });
  }
  if (filtersState.fullPropsOnly) {
    chips.push({ key: 'fullPropsOnly', label: 'Props Complets' });
  }
  if (filtersState.market1X2UnblockedOnly) {
    chips.push({ key: 'market1X2UnblockedOnly', label: '1X2 Non Bloqué' });
  }
  if (filtersState.marketGoalsUnblockedOnly) {
    chips.push({ key: 'marketGoalsUnblockedOnly', label: 'Buts O/U 2.5 Non Bloqué' });
  }
  if (filtersState.superSignalsAny) {
    chips.push({ key: 'superSignalsAny', label: 'Super Signals (Tous)' });
  }
  (filtersState.superSignalsSpecific || []).forEach(subKey => {
    const def = SUPER_SIGNAL_KEYS.find(s => s.id === subKey);
    chips.push({
      key: 'superSignalsSpecific',
      subKey,
      label: def ? def.label : subKey
    });
  });
  if (filtersState.streakConfirmedOnly) {
    chips.push({ key: 'streakConfirmedOnly', label: 'Séries Confirmées' });
  }
  if (filtersState.streakWarningOnly) {
    chips.push({ key: 'streakWarningOnly', label: 'Alertes de Séries' });
  }
  if (filtersState.undervaluedTeamOnly) {
    chips.push({ key: 'undervaluedTeamOnly', label: 'Équipe Sous-Évaluée' });
  }
  if (filtersState.fireMomentumOnly) {
    chips.push({ key: 'fireMomentumOnly', label: 'Momentum Fire' });
  }
  if (filtersState.killSwitchActiveOnly) {
    chips.push({ key: 'killSwitchActiveOnly', label: 'Kill-Switch Actif' });
  }
  if (filtersState.hasBlockedMarketsOnly) {
    chips.push({ key: 'hasBlockedMarketsOnly', label: 'Restrictions Actives' });
  }
  if (filtersState.falseFavoriteAlertOnly) {
    chips.push({ key: 'falseFavoriteAlertOnly', label: 'Alerte Faux Favori' });
  }

  return chips;
}
