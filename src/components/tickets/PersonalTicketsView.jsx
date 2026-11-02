import React, { useEffect, useState } from 'react';
import {
  addPersonalLeg,
  createPersonalTicket,
  formatPersonalTicketShare,
  generatePersonalId,
  loadPersonalTickets,
  movePersonalLeg,
  persistPersonalTickets,
  removePersonalLeg,
  PERSONAL_TICKETS_STORAGE_KEY
} from '../../utils/personalTicketsStorage.js';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Share2,
  FileText,
  Bookmark,
  AlertTriangle,
  FolderOpen,
  Check,
  Copy
} from 'lucide-react';

const getStorage = () => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch (_) {
    return null;
  }
};

const cloneLegs = legs =>
  legs.map(leg => ({
    ...leg,
    ...(Array.isArray(leg.Profile) ? { Profile: [...leg.Profile] } : {})
  }));

/** Hook contrôleur local pour la gestion des brouillons personnels (aucun appel réseau ni recalcul). */
export function usePersonalTickets() {
  const [initial] = useState(() => loadPersonalTickets(getStorage()));
  const [store, setStore] = useState(initial.store);
  const [readOnly, setReadOnly] = useState(!initial.ok);
  const [name, setName] = useState('Mon ticket');
  const [legs, setLegs] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [openedRevision, setOpenedRevision] = useState(null);
  const [message, setMessage] = useState(initial.ok ? '' : `Stockage indisponible : ${initial.error}`);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = event => {
      if (event.key !== PERSONAL_TICKETS_STORAGE_KEY) return;
      const result = loadPersonalTickets(getStorage());
      if (result.ok) {
        setStore(result.store);
        setReadOnly(false);
      } else {
        setReadOnly(true);
        setMessage(`Conflit de stockage : ${result.error}`);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addSelection = (selection, fallbackSession = null) => {
    try {
      const next = addPersonalLeg(legs, selection, fallbackSession);
      setLegs(next);
      setMessage(`${selection.Marche || selection.market} ajouté au brouillon.`);
      return { ok: true };
    } catch (error) {
      setMessage(error.message);
      return { ok: false, error: error.message };
    }
  };

  const reset = () => {
    setName('Mon ticket');
    setLegs([]);
    setEditingId(null);
    setOpenedRevision(null);
    setMessage('Nouveau brouillon prêt.');
  };

  const open = id => {
    const ticket = store.tickets[id];
    if (!ticket) {
      setMessage('Ticket introuvable.');
      return;
    }
    setName(ticket.name);
    setLegs(cloneLegs(ticket.legs));
    setEditingId(ticket.personal_id);
    setOpenedRevision(ticket.updatedAt);
    setMessage('Brouillon chargé pour modification.');
  };

  const save = () => {
    if (readOnly) {
      setMessage('Sauvegarde désactivée : stockage incompatible ou indisponible.');
      return;
    }
    try {
      if (editingId && store.tickets[editingId]?.updatedAt !== openedRevision) {
        throw new Error('Brouillon modifié ou supprimé dans un autre onglet. Rechargez-le avant de sauvegarder.');
      }
      const ticket = createPersonalTicket({
        id: editingId || generatePersonalId(),
        name,
        legs,
        createdAt: editingId ? store.tickets[editingId].createdAt : null
      });
      const result = persistPersonalTickets(getStorage(), store, ticket);
      if (!result.ok) throw new Error(result.error);
      setStore(result.store);
      setEditingId(ticket.personal_id);
      setOpenedRevision(ticket.updatedAt);
      setMessage('Brouillon enregistré localement.');
    } catch (error) {
      setMessage(`Sauvegarde impossible : ${error.message}`);
    }
  };

  const removeSaved = id => {
    if (readOnly) {
      setMessage('Suppression désactivée : stockage indisponible.');
      return;
    }
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (!window.confirm('Supprimer définitivement ce brouillon personnel ?')) return;
    }
    const result = persistPersonalTickets(getStorage(), store, null, id);
    if (!result.ok) {
      setMessage(`Suppression impossible : ${result.error}`);
      return;
    }
    setStore(result.store);
    if (editingId === id) {
      setEditingId(null);
      setOpenedRevision(null);
      setLegs([]);
      setName('Mon ticket');
    }
    setMessage('Brouillon supprimé.');
  };

  const share = async ticket => {
    try {
      const text = formatPersonalTicketShare(ticket);
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: 'Ticket personnel TITANIUM Web', text });
          setMessage('Partage effectué.');
          return;
        } catch (error) {
          if (error.name === 'AbortError') return;
        }
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setMessage('Fiche du ticket copiée dans le presse-papiers.');
      } else {
        setMessage('Copie automatique indisponible : utilisez le texte de partage affiché ci-dessous.');
      }
    } catch (error) {
      setMessage(`Partage indisponible : ${error.message}`);
    }
  };

  return {
    store,
    readOnly,
    name,
    setName,
    legs,
    setLegs,
    editingId,
    message,
    setMessage,
    addSelection,
    reset,
    open,
    save,
    removeSaved,
    share,
    removeLeg: betId => setLegs(prev => removePersonalLeg(prev, betId)),
    moveLeg: (idx, d) => setLegs(prev => movePersonalLeg(prev, idx, d))
  };
}

const formatPercent = x => (typeof x === 'number' && Number.isFinite(x) ? `${(x * 100).toFixed(1)} %` : 'N/D');
const formatReferenceOdds = x => (typeof x === 'number' && Number.isFinite(x) ? x.toFixed(2) : 'N/D');

export function PersonalTicketsView({ model }) {
  const [showShareText, setShowShareText] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const list = Object.values(model.store.tickets).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  let shareText = '';
  if (model.legs.length > 0) {
    try {
      shareText = formatPersonalTicketShare({ name: model.name, legs: model.legs });
    } catch (_) {
      shareText = '';
    }
  }

  const handleCopyText = async () => {
    if (!shareText) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 2500);
      }
    } catch (_) {}
  };

  return (
    <div className="flex flex-col gap-6" aria-label="Constructeur de tickets personnels">
      {/* Panneau principal : Éditeur / Composition */}
      <div className="rounded-2xl p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Bookmark size={18} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Mes tickets personnels
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Brouillons manuels · Aucune approbation de risque TITANIUM
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={model.reset}
            className="min-h-11 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span>Nouveau ticket</span>
          </button>
        </div>

        {model.message && (
          <div
            role="status"
            className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span>{model.message}</span>
          </div>
        )}

        {model.readOnly && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs sm:text-sm font-medium text-rose-700 dark:text-rose-400 flex items-center gap-2"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span>Stockage en lecture seule : aucune sauvegarde ni suppression possible.</span>
          </div>
        )}

        {/* Nom du ticket */}
        <div className="mb-4">
          <label
            htmlFor="personal-ticket-name"
            className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-600 dark:text-slate-300"
          >
            Nom du ticket
          </label>
          <input
            id="personal-ticket-name"
            type="text"
            maxLength={80}
            value={model.name}
            onChange={event => model.setName(event.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Ex : Mon ticket Bundesliga Over"
          />
        </div>

        {/* En-tête Composition */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
              Composition
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {model.legs.length}
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
            PERSONAL_DRAFT
          </span>
        </div>

        {/* Liste des sélections */}
        {model.legs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/30">
            <p className="font-medium">Ce brouillon ne contient encore aucune sélection.</p>
            <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">
              Ouvrez l'onglet « Choix Finaux » et cliquez sur « Ajouter au ticket » pour composer votre sélection.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {model.legs.map((leg, idx) => (
              <div
                key={leg.Bet_ID}
                className="rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white break-words">
                      {leg.Match || leg.Match_ID}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                    {leg.Marche || leg.market} · <span className="text-slate-500 dark:text-slate-400">{leg.League || 'Ligue N/D'}</span>
                  </p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    P modèle : <span className="font-semibold">{formatPercent(leg.Prob)}</span> · Cote réf. : <span className="font-semibold">{formatReferenceOdds(leg.Cote_Ref)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => model.moveLeg(idx, -1)}
                    aria-label="Déplacer vers le haut"
                    title="Déplacer vers le haut"
                    className="min-h-11 min-w-11 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 flex items-center justify-center transition-colors"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === model.legs.length - 1}
                    onClick={() => model.moveLeg(idx, 1)}
                    aria-label="Déplacer vers le bas"
                    title="Déplacer vers le bas"
                    className="min-h-11 min-w-11 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 flex items-center justify-center transition-colors"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => model.removeLeg(leg.Bet_ID)}
                    aria-label="Retirer cette sélection"
                    className="min-h-11 px-3 rounded-lg border border-rose-300 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Retirer</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Avertissement analytique strict */}
        <p className="text-xs mt-4 text-slate-500 dark:text-slate-400 leading-relaxed">
          Probabilité combinée et dépendances : non évaluées. Cotes affichées = références modèle, pas cotes bookmaker.
        </p>

        {/* Boutons d'actions principales */}
        <div className="flex flex-wrap gap-2.5 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={model.save}
            disabled={model.readOnly || model.legs.length === 0}
            className="min-h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm disabled:opacity-40 flex items-center gap-2 transition-colors shadow-sm"
          >
            <Check size={16} />
            <span>{model.editingId ? 'Enregistrer les modifications' : 'Sauvegarder le ticket'}</span>
          </button>
          <button
            type="button"
            onClick={() => model.share({ name: model.name, legs: model.legs })}
            disabled={model.legs.length === 0}
            className="min-h-11 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs sm:text-sm disabled:opacity-40 flex items-center gap-2 transition-colors"
          >
            <Share2 size={16} />
            <span>Partager</span>
          </button>
          <button
            type="button"
            onClick={() => setShowShareText(value => !value)}
            disabled={model.legs.length === 0}
            className="min-h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm disabled:opacity-40 flex items-center gap-2 transition-colors"
          >
            <FileText size={16} />
            <span>{showShareText ? 'Masquer le texte' : 'Texte du ticket'}</span>
          </button>
        </div>

        {/* Zone de texte de partage dépliable */}
        {showShareText && shareText && (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Fiche textuelle du brouillon
              </span>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                {copiedNotification ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedNotification ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
            <textarea
              readOnly
              aria-label="Fiche du ticket à copier"
              value={shareText}
              rows={8}
              className="w-full p-2.5 bg-transparent font-mono text-xs text-slate-800 dark:text-slate-200 border-none focus:outline-none resize-y"
              onFocus={e => e.target.select()}
            />
          </div>
        )}
      </div>

      {/* Panneau secondaire : Liste des tickets sauvegardés */}
      <div className="rounded-2xl p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-slate-500" />
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
              Tickets enregistrés
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {list.length}
          </span>
        </div>

        {list.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
            Aucun ticket personnel enregistré sur cet appareil.
          </p>
        ) : (
          <div className="space-y-2.5">
            {list.map(ticket => (
              <div
                key={ticket.personal_id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 bg-slate-50/60 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white break-words">
                    {ticket.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {ticket.legs.length} sélection(s) · <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{ticket.status}</span> · Mis à jour : {new Date(ticket.updatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => model.open(ticket.personal_id)}
                    className="min-h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    Ouvrir / renommer
                  </button>
                  <button
                    type="button"
                    onClick={() => model.share(ticket)}
                    className="min-h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    <Share2 size={13} />
                    <span>Partager</span>
                  </button>
                  <button
                    type="button"
                    disabled={model.readOnly}
                    onClick={() => model.removeSaved(ticket.personal_id)}
                    className="min-h-11 px-3 rounded-lg border border-rose-300 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
