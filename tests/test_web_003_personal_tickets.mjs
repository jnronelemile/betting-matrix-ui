import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  PERSONAL_TICKETS_STORAGE_KEY,
  PERSONAL_TICKETS_SCHEMA_VERSION,
  PERSONAL_DRAFT_STATUS,
  selectionFromTitanium,
  assertConsistentLegs,
  addPersonalLeg,
  removePersonalLeg,
  movePersonalLeg,
  createPersonalTicket,
  generatePersonalId,
  loadPersonalTickets,
  parsePersonalStore,
  persistPersonalTickets,
  formatPersonalTicketShare
} from '../src/utils/personalTicketsStorage.js';

const pick = (id = 'BET_A', overrides = {}) => ({
  Bet_ID: id,
  Match_ID: `MATCH_${id}`,
  Match: 'Club A vs Club B',
  Marche: 'Plus de 2.5 buts',
  League: 'PL',
  Prob: 0.737195,
  Cote_Ref: 1.3587,
  Score_EV: 0,
  Tier: 2,
  run_id: 'RUN_TEST_01',
  source_matrix: 'matrix_01.json',
  kickoff_utc: '2026-11-03T14:00:00Z',
  model_version: 'V9',
  ...overrides
});

const storeMock = () => {
  const values = new Map();
  return {
    getItem: k => (values.has(k) ? values.get(k) : null),
    setItem: (k, v) => {
      values.set(k, String(v));
    },
    removeItem: k => {
      values.delete(k);
    },
    values
  };
};

const localId = 'PERSONAL_11111111-1111-4111-8111-111111111111';

test('[TEST 1] Source selection preserved byte-for-byte for quantitative fields & zero preserved', () => {
  const source = pick();
  const before = structuredClone(source);
  const leg = selectionFromTitanium(source);
  assert.deepEqual(source, before);
  assert.equal(leg.Prob, source.Prob);
  assert.equal(leg.Cote_Ref, source.Cote_Ref);
  assert.equal(leg.Score_EV, 0); // Exact zero preserved
  assert.equal(leg.Bet_ID, source.Bet_ID);
  assert.equal(leg.Match_ID, source.Match_ID);
  assert.equal(leg.model_version, 'V9');
  assert.equal(leg.origin_run_id, source.run_id);
  assert.equal(leg.origin_source_matrix, source.source_matrix);
});

test('[TEST 2] Duplicates, absent IDs and invalid probabilities fail closed', () => {
  const once = addPersonalLeg([], pick());
  assert.throws(() => addPersonalLeg(once, pick()), /dupliqué/);
  assert.throws(() => addPersonalLeg([], pick('x', { Bet_ID: '' })), /Bet_ID/);
  assert.throws(() => addPersonalLeg([], pick('x', { Match_ID: null })), /Match_ID/);
  assert.throws(() => addPersonalLeg([], pick('x', { run_id: '', session_id: '' })), /Session source/);
  assert.throws(() => addPersonalLeg([], pick('x', { Prob: 1.4 })), /Probabilité/);
  assert.throws(() => addPersonalLeg([], pick('x', { Prob: -0.1 })), /Probabilité/);
  assert.throws(() => addPersonalLeg([], pick('x', { Marche: '' })), /Marché source/);
});

test('[TEST 3] Explicit fallback session provenance transmission without inventing synthetic IDs', () => {
  // Case A: Selection lacks run_id and session_id, but real session metadata is provided
  const itemWithoutSession = pick('BET_NO_SESSION', { run_id: undefined, session_id: undefined, source_matrix: undefined });
  const realSessionContext = {
    runId: 'Run_Week-05_2026_Real',
    sessionId: 'Run_Week-05_2026_Real',
    sourceMatrix: 'matrix_week05_real.json'
  };

  const resolvedLeg = selectionFromTitanium(itemWithoutSession, realSessionContext);
  assert.equal(resolvedLeg.origin_run_id, 'Run_Week-05_2026_Real');
  assert.equal(resolvedLeg.origin_source_matrix, 'matrix_week05_real.json');

  // Case B: Session context is dummy/UNKNOWN_SESSION and selection lacks session => must fail closed
  const dummySessionContext = { runId: '', sessionId: 'UNKNOWN_SESSION', sourceMatrix: '' };
  assert.throws(
    () => selectionFromTitanium(itemWithoutSession, dummySessionContext),
    /Session source absente/
  );

  // Case C: Null fallback session and missing selection session => must fail closed
  assert.throws(
    () => selectionFromTitanium(itemWithoutSession, null),
    /Session source absente/
  );
});

test('[TEST 4] Mixed sources rejected, reordering and removal are deterministic', () => {
  const initial = addPersonalLeg([], pick());
  assert.throws(() => addPersonalLeg(initial, pick('BET_B', { run_id: 'RUN_02' })), /Mélange/);
  assert.throws(() => addPersonalLeg(initial, pick('BET_B', { source_matrix: 'matrix_02.json' })), /Mélange/);

  const second = addPersonalLeg(initial, pick('BET_B'));
  assert.deepEqual(movePersonalLeg(second, 0, 1).map(x => x.Bet_ID), ['BET_B', 'BET_A']);
  assert.deepEqual(movePersonalLeg(second, 1, -1).map(x => x.Bet_ID), ['BET_B', 'BET_A']);
  // Out of bounds movements return same array without error
  assert.deepEqual(movePersonalLeg(second, 0, -1), second);
  assert.deepEqual(movePersonalLeg(second, 1, 1), second);

  assert.deepEqual(removePersonalLeg(second, 'BET_A').map(x => x.Bet_ID), ['BET_B']);
  assert.equal(second[0].Prob, 0.737195);
});

test('[TEST 5] Saved ticket remains personal; saved, loaded, renamed, deleted independently without touching favorites', () => {
  const s = storeMock();
  const officialFavoritesSentinel = '{"official_favorites":true,"count":42}';
  s.setItem('titanium_favorites_v1', officialFavoritesSentinel);

  const initial = loadPersonalTickets(s);
  assert.equal(initial.ok, true);

  const legs = [selectionFromTitanium(pick()), selectionFromTitanium(pick('BET_B'))];
  const ticket = createPersonalTicket(
    { id: localId, name: 'Ticket test', legs },
    () => '2026-11-02T11:00:00Z'
  );

  assert.equal(ticket.status, PERSONAL_DRAFT_STATUS);
  assert.equal(ticket.personal_id, localId);
  assert.equal(ticket.legs.length, 2);

  const stored = persistPersonalTickets(s, initial.store, ticket);
  assert.equal(stored.ok, true);
  // Favorites storage must remain strictly unchanged
  assert.equal(s.getItem('titanium_favorites_v1'), officialFavoritesSentinel);
  assert.equal(loadPersonalTickets(s).store.tickets[localId].legs[0].Prob, 0.737195);

  const renamed = createPersonalTicket(
    { ...ticket, name: 'Renommé', id: localId },
    () => '2026-11-02T12:00:00Z'
  );
  const changed = persistPersonalTickets(s, stored.store, renamed);
  assert.equal(changed.store.tickets[localId].name, 'Renommé');
  assert.equal(changed.store.tickets[localId].createdAt, '2026-11-02T11:00:00Z');

  const deleted = persistPersonalTickets(s, changed.store, null, localId);
  assert.equal(deleted.ok, true);
  assert.equal(Object.keys(loadPersonalTickets(s).store.tickets).length, 0);
  assert.equal(s.getItem('titanium_favorites_v1'), officialFavoritesSentinel);
});

test('[TEST 6] Storage errors or quota exceeded never report success or corrupt state', () => {
  const s = storeMock();
  const legs = [selectionFromTitanium(pick())];
  const ticket = createPersonalTicket({ id: localId, name: 'Test', legs });
  const blocked = {
    ...s,
    setItem() {
      throw new Error('QuotaExceededError: storage is full');
    }
  };

  const result = persistPersonalTickets(blocked, loadPersonalTickets(s).store, ticket);
  assert.equal(result.ok, false);
  assert.match(result.error, /QuotaExceededError/);
  assert.equal(s.getItem(PERSONAL_TICKETS_STORAGE_KEY), null);
  assert.equal(loadPersonalTickets(null).ok, false);
});

test('[TEST 7] Unknown schema versions and non-personal Ticket_IDs are rejected without implicit reset', () => {
  assert.throws(() => parsePersonalStore(JSON.stringify({ version: 99, tickets: {} })), /Version/);

  const s = storeMock();
  s.setItem(PERSONAL_TICKETS_STORAGE_KEY, '{invalid json');
  assert.equal(loadPersonalTickets(s).ok, false);
  assert.equal(s.getItem(PERSONAL_TICKETS_STORAGE_KEY), '{invalid json');

  // Official TITANIUM Ticket_IDs (e.g. TKTV1_...) are forbidden for personal tickets
  assert.throws(
    () => createPersonalTicket({ id: 'TKTV1_CORE_ABC', name: 'Test', legs: [selectionFromTitanium(pick())] }),
    /Identifiant/
  );
  assert.equal(generatePersonalId({ randomUUID: () => 'abc-123' }), 'PERSONAL_abc-123');
});

test('[TEST 8] Sharing text is descriptive with strict analytical disclaimers (no combined prob, no odds product)', () => {
  const ticket = createPersonalTicket({ id: localId, name: 'Ma sélection', legs: [selectionFromTitanium(pick())] });
  const share = formatPersonalTicketShare(ticket);
  assert.match(share, /NON APPROUVÉ/);
  assert.match(share, /Probabilité combinée : non calculée/);
  assert.match(share, /réf\. modèle/);
  assert.doesNotMatch(share, /\bROI\s*:/);
  assert.doesNotMatch(share, /\bCote combinée\s*:/);
});

test('[TEST 9] Multi-tab conflict fails closed without dirty overwriting', () => {
  const s = storeMock();
  const initial = loadPersonalTickets(s).store;
  const ticket = createPersonalTicket({ id: localId, name: 'Un', legs: [selectionFromTitanium(pick())] });
  const anotherTab = persistPersonalTickets(s, initial, ticket);
  assert.equal(anotherTab.ok, true);

  const staleWrite = persistPersonalTickets(
    s,
    initial,
    createPersonalTicket({
      id: 'PERSONAL_other',
      name: 'Deux',
      legs: [selectionFromTitanium(pick('BET_B'))]
    })
  );
  assert.equal(staleWrite.ok, false);
  assert.match(staleWrite.error, /Conflit multi-onglets/);
  assert.equal(Object.keys(loadPersonalTickets(s).store.tickets).length, 1);
});

test('[TEST 10] Real operational CHOIX_FINAUX.json contract verification (25/25 selections compliant)', () => {
  const finalsPath = path.resolve(process.cwd(), 'public/data/titanium_v2/tickets/auxiliary/CHOIX_FINAUX.json');
  assert.equal(fs.existsSync(finalsPath), true, 'CHOIX_FINAUX.json doit exister dans public/data/titanium_v2/tickets/auxiliary/');

  const raw = fs.readFileSync(finalsPath, 'utf-8');
  const parsed = JSON.parse(raw);
  assert.equal(Array.isArray(parsed.Selections), true);
  assert.equal(parsed.Selections.length, 25);

  let legs = [];
  parsed.Selections.forEach(sel => {
    assert.equal(typeof sel.Bet_ID, 'string', 'Bet_ID doit être présent');
    assert.equal(typeof sel.Match_ID, 'string', 'Match_ID doit être présent');
    assert.equal(typeof sel.Marche, 'string', 'Marche doit être présent');
    assert.equal(typeof sel.Prob, 'number', 'Prob doit être un nombre');
    assert.equal(typeof sel.Cote_Ref, 'number', 'Cote_Ref doit être un nombre');
    assert.equal(typeof sel.run_id, 'string', 'run_id doit être présent sur chaque sélection');

    // Normalisation pour ticket personnel
    const leg = selectionFromTitanium(sel);
    assert.equal(leg.Bet_ID, sel.Bet_ID);
    assert.equal(leg.Match_ID, sel.Match_ID);
    assert.equal(leg.Prob, sel.Prob);
    assert.equal(leg.Cote_Ref, sel.Cote_Ref);
    assert.equal(leg.origin_run_id, sel.run_id);
    assert.equal(leg.origin_source_matrix, sel.source_matrix);
  });

  // Verify creating a composite ticket of first 3 real selections
  legs = [
    selectionFromTitanium(parsed.Selections[0]),
    selectionFromTitanium(parsed.Selections[1]),
    selectionFromTitanium(parsed.Selections[2])
  ];
  assertConsistentLegs(legs);
  const realTicket = createPersonalTicket({
    id: 'PERSONAL_real_test_01',
    name: 'Ticket Opérationnel V2',
    legs
  });
  assert.equal(realTicket.legs.length, 3);
  assert.equal(realTicket.status, PERSONAL_DRAFT_STATUS);
});
