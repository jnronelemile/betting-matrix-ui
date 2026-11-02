/**
 * WEB-003 — Personal ticket drafts only. This module never calls TITANIUM risk,
 * calibration or probability engines, and never creates an official Ticket_ID.
 */
export const PERSONAL_TICKETS_STORAGE_KEY = 'titanium_personal_tickets_v1';
export const PERSONAL_TICKETS_SCHEMA_VERSION = 1;
export const PERSONAL_DRAFT_STATUS = 'PERSONAL_DRAFT';

const EMPTY_STORE = () => ({ version: PERSONAL_TICKETS_SCHEMA_VERSION, tickets: {}, updatedAt: null });
const nonEmpty = value => typeof value === 'string' && value.trim().length > 0;
const validMetric = value => typeof value === 'number' && Number.isFinite(value);
const asText = (value, max = 240) => nonEmpty(value) ? value.trim().slice(0, max) : '';

/**
 * Normalise et extrait une sélection source TITANIUM pour la composition d'un ticket personnel.
 * Si run_id/session_id ou source_matrix sont absents de la sélection, mais disponibles
 * dans le contexte de session réel (fallbackSession), ils sont explicitement transmis
 * sans jamais inventer d'identifiants synthétiques.
 *
 * @param {Object} selection - La sélection issue de CHOIX_FINAUX
 * @param {Object|null} fallbackSession - Métadonnées réelles de session (runId, sessionId, sourceMatrix)
 * @returns {Object} La sélection normalisée pour le brouillon personnel
 */
export function selectionFromTitanium(selection, fallbackSession = null) {
  if (!selection || typeof selection !== 'object') throw new Error('Sélection source invalide.');
  if (!nonEmpty(selection.Bet_ID) || !nonEmpty(selection.Match_ID)) {
    throw new Error('Bet_ID et Match_ID source obligatoires pour composer un brouillon.');
  }

  // Résolution de la session source réelle : priorité à la sélection, repli sur fallbackSession réel
  const fallbackRun = fallbackSession?.runId || fallbackSession?.run_id || fallbackSession?.sessionId || fallbackSession?.session_id;
  const validFallbackRun = nonEmpty(fallbackRun) && fallbackRun !== 'UNKNOWN_SESSION' ? fallbackRun : null;
  const rawRun = selection.run_id || selection.session_id || validFallbackRun;
  const runId = asText(rawRun, 180);
  if (!runId) throw new Error('Session source absente : sélection refusée.');

  const market = asText(selection.Marche || selection.market, 240);
  if (!market) throw new Error('Marché source absent : sélection refusée.');

  // Preserve raw numeric facts verbatim; never convert missing metrics to 0.
  const selectedFields = [
    'Bet_ID', 'Match_ID', 'Match', 'home', 'away', 'League', 'Marche', 'market', 'line', 'Line',
    'Type', 'family_name', 'family_code', 'Prob', 'Cote_Ref', 'Score_EV',
    'Tier', 'Alpha', 'Super_Signal', 'Profile', 'Streak_Status', 'Streak_Reason',
    'Date', 'Heure', 'kickoff_utc', 'run_id', 'session_id', 'source_matrix',
    'model_version', 'engine_version', 'schema_version', 'source_version',
    'confidence_category', 'confidence_badge'
  ];
  const leg = {};
  selectedFields.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(selection, field)) {
      const value = selection[field];
      leg[field] = Array.isArray(value) ? [...value] : value;
    }
  });

  // Canonical origin key is resolved only from a real source value.
  leg.origin_run_id = runId;
  const fallbackMatrix = fallbackSession?.sourceMatrix || fallbackSession?.source_matrix;
  const rawMatrix = selection.source_matrix || fallbackMatrix || null;
  leg.origin_source_matrix = asText(rawMatrix, 400) || null;
  return leg;
}

export function assertConsistentLegs(legs) {
  if (!Array.isArray(legs) || legs.length === 0) throw new Error('Le ticket ne contient aucune sélection.');
  const seen = new Set();
  const origin = legs[0].origin_run_id;
  const matrix = legs[0].origin_source_matrix;
  if (!nonEmpty(origin)) throw new Error('Provenance de session manquante.');
  for (const leg of legs) {
    if (!nonEmpty(leg.Bet_ID) || !nonEmpty(leg.Match_ID) || !nonEmpty(leg.Marche || leg.market)) {
      throw new Error('Identifiant ou marché source invalide.');
    }
    if (seen.has(leg.Bet_ID)) throw new Error('Bet_ID dupliqué dans le ticket.');
    seen.add(leg.Bet_ID);
    if (leg.origin_run_id !== origin || leg.origin_source_matrix !== matrix) {
      throw new Error('Mélange de sessions ou de matrices source interdit pour ce prototype.');
    }
    if (Object.prototype.hasOwnProperty.call(leg, 'Prob') &&
        leg.Prob != null && leg.Prob !== 'NOT_AVAILABLE' &&
        (!validMetric(leg.Prob) || leg.Prob < 0 || leg.Prob > 1)) {
      throw new Error('Probabilité source hors domaine : sélection refusée.');
    }
  }
  return true;
}

export function addPersonalLeg(legs, selection, fallbackSession = null) {
  const leg = selectionFromTitanium(selection, fallbackSession);
  const next = [...legs, leg];
  assertConsistentLegs(next);
  return next;
}

export function removePersonalLeg(legs, betId) {
  return legs.filter(leg => leg.Bet_ID !== betId);
}

export function movePersonalLeg(legs, index, direction) {
  const destination = index + direction;
  if (index < 0 || index >= legs.length || destination < 0 || destination >= legs.length) return legs;
  const next = [...legs];
  [next[index], next[destination]] = [next[destination], next[index]];
  return next;
}

export function createPersonalTicket({ id, name, legs, createdAt = null }, clock = () => new Date().toISOString()) {
  if (!nonEmpty(id) || !id.startsWith('PERSONAL_')) throw new Error('Identifiant de brouillon invalide.');
  const cleanName = asText(name, 80);
  if (!cleanName) throw new Error('Le nom du ticket est obligatoire.');
  assertConsistentLegs(legs);
  const now = clock();
  return {
    personal_id: id,
    name: cleanName,
    status: PERSONAL_DRAFT_STATUS,
    createdAt: createdAt || now,
    updatedAt: now,
    origin_run_id: legs[0].origin_run_id,
    origin_source_matrix: legs[0].origin_source_matrix,
    legs: legs.map(leg => ({ ...leg, ...(Array.isArray(leg.Profile) ? { Profile: [...leg.Profile] } : {}) }))
  };
}

export function generatePersonalId(cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider || typeof cryptoProvider.randomUUID !== 'function') {
    throw new Error('Génération sécurisée d’identifiant local indisponible.');
  }
  return `PERSONAL_${cryptoProvider.randomUUID()}`;
}

export function parsePersonalStore(raw) {
  if (raw == null) return EMPTY_STORE();
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.version !== PERSONAL_TICKETS_SCHEMA_VERSION ||
      !parsed.tickets || Array.isArray(parsed.tickets) || typeof parsed.tickets !== 'object') {
    throw new Error('Version ou format de stockage incompatible (aucune écriture autorisée).');
  }
  for (const [id, ticket] of Object.entries(parsed.tickets)) {
    if (!id.startsWith('PERSONAL_') || ticket?.personal_id !== id ||
        ticket.status !== PERSONAL_DRAFT_STATUS || !nonEmpty(ticket.name)) {
      throw new Error(`Ticket personnel corrompu : ${id}`);
    }
    assertConsistentLegs(ticket.legs);
  }
  return parsed;
}

export function loadPersonalTickets(storage) {
  try {
    if (!storage || typeof storage.getItem !== 'function') throw new Error('Stockage local indisponible.');
    return { ok: true, store: parsePersonalStore(storage.getItem(PERSONAL_TICKETS_STORAGE_KEY)), error: null };
  } catch (error) {
    return { ok: false, store: EMPTY_STORE(), error: error.message };
  }
}

/** Persist *before* returning next state; rejected writes never report success. */
export function persistPersonalTickets(storage, store, ticket = null, removeId = null) {
  try {
    if (!storage || typeof storage.setItem !== 'function' || typeof storage.getItem !== 'function') {
      throw new Error('Stockage local indisponible.');
    }
    const currentDisk = parsePersonalStore(storage.getItem(PERSONAL_TICKETS_STORAGE_KEY));
    if (JSON.stringify(currentDisk) !== JSON.stringify(store)) {
      throw new Error('Conflit multi-onglets : le stockage a changé, rechargez la liste.');
    }
    const tickets = { ...store.tickets };
    if (removeId) {
      if (!Object.prototype.hasOwnProperty.call(tickets, removeId)) throw new Error('Brouillon introuvable.');
      delete tickets[removeId];
    }
    if (ticket) {
      if (ticket.status !== PERSONAL_DRAFT_STATUS || ticket.personal_id === undefined) throw new Error('Brouillon invalide.');
      assertConsistentLegs(ticket.legs);
      tickets[ticket.personal_id] = ticket;
    }
    const next = { version: PERSONAL_TICKETS_SCHEMA_VERSION, tickets, updatedAt: new Date().toISOString() };
    storage.setItem(PERSONAL_TICKETS_STORAGE_KEY, JSON.stringify(next));
    return { ok: true, store: next, error: null };
  } catch (error) {
    return { ok: false, store, error: error.message };
  }
}

export function formatPersonalTicketShare(ticket) {
  assertConsistentLegs(ticket?.legs);
  const count = ticket.legs.length;
  const countLabel = `⚽ ${count} ${count > 1 ? 'SÉLECTIONS' : 'SÉLECTION'}`;
  const separator = '━━━━━━━━━━━━━━━━━━━━';
  const header = `🎟️ TITANIUM | ${ticket.name || 'Ticket personnel'}\n${separator}\n${countLabel}`;
  const blocks = ticket.legs.map((leg, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    let matchTitle = '';
    if (nonEmpty(leg.Match)) {
      matchTitle = leg.Match.replace(/\s+vs\s+/i, ' \u2013 ').trim();
    } else if (nonEmpty(leg.home) && nonEmpty(leg.away)) {
      matchTitle = `${leg.home.trim()} \u2013 ${leg.away.trim()}`;
    } else {
      matchTitle = 'Match inconnu';
    }
    const market = asText(leg.Marche || leg.market, 240) || 'Sélection';
    const p = validMetric(leg.Prob) ? `${(leg.Prob * 100).toFixed(1)} %` : 'N/D';
    const cote = validMetric(leg.Cote_Ref) ? leg.Cote_Ref.toFixed(2) : 'N/D';
    return `${num}. ${matchTitle}\n▸ ${market}\n📊 Prob. ${p} • Cote réf. ${cote}`;
  });
  const footer = 'ℹ️ Ticket personnel · Non approuvé par TITANIUM';
  return [header, '', blocks.join('\n\n'), '', footer].join('\n');
}
