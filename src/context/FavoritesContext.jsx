/**
 * TITANIUM WEB — Favorites Context & State Management (WEB-FAVORITES-001)
 *
 * Responsabilités :
 * 1. Initialiser l'état réactif React depuis le stockage persistant `localStorage`.
 * 2. Maintenir un miroir mémoire infaillible même en cas de panne ou saturation de `localStorage`.
 * 3. Fournir l'API CRUD complète pour les matchs, les tickets et les groupes personnalisés.
 * 4. Dériver de manière pure et mémorisée les compteurs globaux et par groupe.
 * 5. Synchroniser en temps réel les mutations entre onglets du même navigateur
 *    sans jamais écraser silencieusement des modifications en mémoire non sauvegardées.
 * 6. Exposer les fonctions d'exportation et d'importation sécurisées.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FAVORITES_STORAGE_KEY,
  createInitialStore,
  loadFavoritesFromStorage,
  saveFavoritesToStorage,
  getCanonicalMatchKey,
  generateGroupId,
  isDuplicateGroupName,
  generateUniqueGroupName,
  buildMatchFavorite,
  buildTicketFavorite,
  exportFavoritesToJson,
  validateImportPayload,
  mergeFavoritesStores,
  sanitizeString,
  getSafeStorage
} from '../utils/favoritesStorage.js';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children, storage = null }) {
  const [store, setStore] = useState(() => createInitialStore());
  const [isInitialized, setIsInitialized] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [persistenceWarning, setPersistenceWarning] = useState(false);
  const [persistenceError, setPersistenceError] = useState(null);
  const [corruptedBackupKey, setCorruptedBackupKey] = useState(null);
  const [hasMultiTabConflict, setHasMultiTabConflict] = useState(false);

  // Ref de synchronisation pour éviter d'écraser des données en mémoire non sauvegardées
  const isUnsavedInMemoryRef = useRef(false);
  const storeRef = useRef(store);
  storeRef.current = store;

  /**
   * Persistance sécurisée : applique la mutation en mémoire (synchronisée via ref)
   * et tente la sauvegarde sur disque.
   * Si la sauvegarde échoue, l'état mémoire est préservé et le drapeau d'alerte activé.
   */
  const persistState = useCallback((nextStore) => {
    storeRef.current = nextStore;
    setStore(nextStore);

    const result = saveFavoritesToStorage(nextStore, storage);
    if (!result.success) {
      isUnsavedInMemoryRef.current = true;
      setPersistenceWarning(true);
      setPersistenceError(result.error);
    } else {
      isUnsavedInMemoryRef.current = false;
      setPersistenceWarning(false);
      setPersistenceError(null);
    }
    return result;
  }, [storage]);

  // Initialisation au montage du Provider
  useEffect(() => {
    const initResult = loadFavoritesFromStorage(storage);
    setStorageAvailable(initResult.storageAvailable);

    if (initResult.corrupted) {
      setCorruptedBackupKey(initResult.backupKey);
      setPersistenceWarning(true);
      setPersistenceError(new Error('Données locales corrompues détectées. Une sauvegarde brute a été sécurisée.'));
    }

    if (initResult.unsupportedVersion) {
      setPersistenceWarning(true);
      setPersistenceError(initResult.error);
    }

    storeRef.current = initResult.store;
    setStore(initResult.store);
    setIsInitialized(true);
  }, [storage]);

  // Écouteur de synchronisation multi-onglets natif
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageEvent = (e) => {
      if (e.key !== FAVORITES_STORAGE_KEY) return;

      // Protection stricte : si l'onglet actuel a des modifications non enregistrées sur disque
      // (par ex. à cause d'un quota plein), on ne les écrase jamais silencieusement !
      if (isUnsavedInMemoryRef.current) {
        setHasMultiTabConflict(true);
        return;
      }

      if (e.newValue) {
        try {
          const incoming = JSON.parse(e.newValue);
          if (incoming && incoming.version === storeRef.current.version) {
            storeRef.current = incoming;
            setStore(incoming);
          }
        } catch (_) {
          // Ignorer les corruptions transmises par un autre onglet
        }
      } else {
        // La clé a été supprimée ailleurs
        const fresh = createInitialStore();
        storeRef.current = fresh;
        setStore(fresh);
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, []);

  // ---------------------------------------------------------------------------
  // GESTION DES MATCHS FAVORIS
  // ---------------------------------------------------------------------------

  const isMatchFavorite = useCallback((matchOrKey) => {
    if (!matchOrKey) return false;
    const currentMatches = storeRef.current.matches;
    const key = typeof matchOrKey === 'string' ? matchOrKey : getCanonicalMatchKey(matchOrKey);
    if (!key) return false;

    // Recherche directe par clé canonique
    if (currentMatches[key]) return true;

    // Recherche de repli par Match_ID si un objet match a été fourni
    if (typeof matchOrKey === 'object' && matchOrKey.Match_ID) {
      const targetId = matchOrKey.Match_ID.trim();
      return Object.values(currentMatches).some(m => m.matchId === targetId);
    }

    return false;
  }, []);

  const getMatchFavorite = useCallback((matchOrKey) => {
    if (!matchOrKey) return null;
    const currentMatches = storeRef.current.matches;
    const key = typeof matchOrKey === 'string' ? matchOrKey : getCanonicalMatchKey(matchOrKey);
    if (!key) return null;

    if (currentMatches[key]) return currentMatches[key];

    if (typeof matchOrKey === 'object' && matchOrKey.Match_ID) {
      const targetId = matchOrKey.Match_ID.trim();
      return Object.values(currentMatches).find(m => m.matchId === targetId) || null;
    }

    return null;
  }, []);

  const addMatchFavorite = useCallback((match, initialGroupIds = [], originSession = null) => {
    // Tolérance d'appel : permet de passer directement originSession en 2e argument si ce n'est pas un tableau
    let actualGroupIds = initialGroupIds;
    let actualOriginSession = originSession;
    if (initialGroupIds && !Array.isArray(initialGroupIds) && typeof initialGroupIds === 'object') {
      actualOriginSession = initialGroupIds;
      actualGroupIds = [];
    }

    const favoriteObj = buildMatchFavorite(match, actualOriginSession, actualGroupIds);
    if (!favoriteObj) return { success: false, error: 'Match invalide ou impossible à identifier' };

    const currentStore = storeRef.current;
    const nextMatches = {
      ...currentStore.matches,
      [favoriteObj.id]: favoriteObj
    };

    const nextStore = {
      ...currentStore,
      matches: nextMatches,
      updatedAt: new Date().toISOString()
    };

    persistState(nextStore);
    return { success: true, match: favoriteObj };
  }, [persistState]);

  const removeMatchFavorite = useCallback((matchOrKey) => {
    if (!matchOrKey) return { success: false };
    const currentStore = storeRef.current;

    // 1. Clé directe si chaîne
    let targetKey = typeof matchOrKey === 'string' ? matchOrKey.trim() : null;

    // 2. Clé directe portée par l'objet favori (.id ou .canonicalKey)
    if (!targetKey && typeof matchOrKey === 'object') {
      if (matchOrKey.id && currentStore.matches[matchOrKey.id]) {
        targetKey = matchOrKey.id;
      } else if (matchOrKey.canonicalKey && currentStore.matches[matchOrKey.canonicalKey]) {
        targetKey = matchOrKey.canonicalKey;
      }
    }

    // 3. Fallback sur Match_ID ou matchId
    if ((!targetKey || !currentStore.matches[targetKey]) && typeof matchOrKey === 'object') {
      const rawId = matchOrKey.Match_ID || matchOrKey.matchId;
      if (rawId && typeof rawId === 'string' && rawId.trim()) {
        const cleanId = rawId.trim();
        const found = Object.values(currentStore.matches).find(m => m.matchId === cleanId || m.id === cleanId);
        if (found) targetKey = found.id;
      }
    }

    // 4. Fallback sur getCanonicalMatchKey
    if (!targetKey || !currentStore.matches[targetKey]) {
      const canonical = typeof matchOrKey === 'string' ? matchOrKey : getCanonicalMatchKey(matchOrKey);
      if (canonical && currentStore.matches[canonical]) {
        targetKey = canonical;
      }
    }

    if (!targetKey || !currentStore.matches[targetKey]) {
      return { success: false, notFound: true };
    }

    const nextMatches = { ...currentStore.matches };
    delete nextMatches[targetKey];

    const nextStore = {
      ...currentStore,
      matches: nextMatches,
      updatedAt: new Date().toISOString()
    };

    persistState(nextStore);
    return { success: true };
  }, [persistState]);

  const toggleMatchFavorite = useCallback((match, initialGroupIds = [], originSession = null) => {
    if (isMatchFavorite(match)) {
      return removeMatchFavorite(match);
    }
    let actualGroupIds = initialGroupIds;
    let actualOriginSession = originSession;
    if (initialGroupIds && !Array.isArray(initialGroupIds) && typeof initialGroupIds === 'object') {
      actualOriginSession = initialGroupIds;
      actualGroupIds = [];
    }
    return addMatchFavorite(match, actualGroupIds, actualOriginSession);
  }, [isMatchFavorite, removeMatchFavorite, addMatchFavorite]);

  const setMatchGroups = useCallback((matchOrKey, groupIds = []) => {
    const currentStore = storeRef.current;
    const favorite = getMatchFavorite(matchOrKey);
    if (!favorite) return { success: false, error: 'Match favori introuvable' };

    const validGroupIds = new Set(Object.keys(currentStore.groups));
    const filteredGroupIds = Array.from(new Set(
      (Array.isArray(groupIds) ? groupIds : []).filter(gid => validGroupIds.has(gid))
    ));

    const updatedMatch = {
      ...favorite,
      groupIds: filteredGroupIds,
      updatedAt: new Date().toISOString()
    };

    const nextStore = {
      ...currentStore,
      matches: {
        ...currentStore.matches,
        [favorite.id]: updatedMatch
      },
      updatedAt: new Date().toISOString()
    };

    persistState(nextStore);
    return { success: true, match: updatedMatch };
  }, [getMatchFavorite, persistState]);

  const addMatchToGroup = useCallback((matchOrKey, groupId) => {
    const currentStore = storeRef.current;
    if (!groupId || !currentStore.groups[groupId]) {
      return { success: false, error: 'Groupe cible inexistant' };
    }

    const favorite = getMatchFavorite(matchOrKey);
    if (!favorite) {
      return { success: false, error: 'Match favori introuvable' };
    }

    if (favorite.groupIds && favorite.groupIds.includes(groupId)) {
      return { success: true, match: favorite }; // Déjà présent
    }

    const nextGroupIds = [...(favorite.groupIds || []), groupId];
    return setMatchGroups(favorite.id, nextGroupIds);
  }, [getMatchFavorite, setMatchGroups]);

  const removeMatchFromGroup = useCallback((matchOrKey, groupId) => {
    const favorite = getMatchFavorite(matchOrKey);
    if (!favorite) return { success: false, error: 'Match favori introuvable' };

    const nextGroupIds = (favorite.groupIds || []).filter(id => id !== groupId);
    // Si nextGroupIds est vide, le match bascule automatiquement dans « À classer » sans être supprimé
    return setMatchGroups(favorite.id, nextGroupIds);
  }, [getMatchFavorite, setMatchGroups]);

  // ---------------------------------------------------------------------------
  // GESTION DES GROUPES PERSONNALISÉS
  // ---------------------------------------------------------------------------

  const createGroup = useCallback((rawName) => {
    const currentStore = storeRef.current;
    const cleanName = sanitizeString(rawName, 80);
    if (!cleanName) {
      return { success: false, error: 'Le nom du groupe ne peut pas être vide' };
    }

    if (isDuplicateGroupName(currentStore.groups, cleanName)) {
      return { success: false, error: `Un groupe nommé "${cleanName}" existe déjà`, isDuplicate: true };
    }

    const newGroupId = generateGroupId();
    const now = new Date().toISOString();
    const newGroup = {
      id: newGroupId,
      name: cleanName,
      createdAt: now,
      updatedAt: now
    };

    const nextStore = {
      ...currentStore,
      groups: {
        ...currentStore.groups,
        [newGroupId]: newGroup
      },
      updatedAt: now
    };

    persistState(nextStore);
    return { success: true, group: newGroup };
  }, [persistState]);

  const renameGroup = useCallback((groupId, rawNewName) => {
    const currentStore = storeRef.current;
    if (!groupId || !currentStore.groups[groupId]) {
      return { success: false, error: 'Groupe introuvable' };
    }

    const cleanName = sanitizeString(rawNewName, 80);
    if (!cleanName) {
      return { success: false, error: 'Le nom du groupe ne peut pas être vide' };
    }

    if (isDuplicateGroupName(currentStore.groups, cleanName, groupId)) {
      return { success: false, error: `Un autre groupe nommé "${cleanName}" existe déjà`, isDuplicate: true };
    }

    const updatedGroup = {
      ...currentStore.groups[groupId],
      name: cleanName,
      updatedAt: new Date().toISOString()
    };

    const nextStore = {
      ...currentStore,
      groups: {
        ...currentStore.groups,
        [groupId]: updatedGroup
      },
      updatedAt: new Date().toISOString()
    };

    persistState(nextStore);
    return { success: true, group: updatedGroup };
  }, [persistState]);

  const deleteGroup = useCallback((groupId) => {
    const currentStore = storeRef.current;
    if (!groupId || !currentStore.groups[groupId]) {
      return { success: false, error: 'Groupe introuvable' };
    }

    const nextGroups = { ...currentStore.groups };
    delete nextGroups[groupId];

    // Règle canonique : La suppression d'un groupe ne supprime AUCUN match !
    // Les matchs concernés voient simplement le groupId retiré.
    // Ceux qui n'ont plus aucun groupe reviennent automatiquement sous « À classer ».
    const nextMatches = {};
    Object.entries(currentStore.matches).forEach(([mId, m]) => {
      if (m.groupIds && m.groupIds.includes(groupId)) {
        nextMatches[mId] = {
          ...m,
          groupIds: m.groupIds.filter(id => id !== groupId),
          updatedAt: new Date().toISOString()
        };
      } else {
        nextMatches[mId] = m;
      }
    });

    const nextStore = {
      ...currentStore,
      groups: nextGroups,
      matches: nextMatches,
      updatedAt: new Date().toISOString()
    };

    persistState(nextStore);
    return { success: true };
  }, [persistState]);

  const getGroup = useCallback((groupId) => {
    return storeRef.current.groups[groupId] || null;
  }, []);

  // ---------------------------------------------------------------------------
  // GESTION DES TICKETS FAVORIS
  // ---------------------------------------------------------------------------

  const isTicketFavorite = useCallback((ticketId) => {
    if (!ticketId || typeof ticketId !== 'string') return false;
    return Boolean(storeRef.current.tickets[ticketId.trim()]);
  }, []);

  const getTicketFavorite = useCallback((ticketId) => {
    if (!ticketId || typeof ticketId !== 'string') return null;
    return storeRef.current.tickets[ticketId.trim()] || null;
  }, []);

  const addTicketFavorite = useCallback((ticket, originSession = null) => {
    const favoriteTicket = buildTicketFavorite(ticket, originSession);
    if (!favoriteTicket) {
      return { success: false, error: 'Ticket invalide ou ticket_id canonique manquant' };
    }

    const currentStore = storeRef.current;
    const nextTickets = {
      ...currentStore.tickets,
      [favoriteTicket.ticketId]: favoriteTicket
    };

    const nextStore = {
      ...currentStore,
      tickets: nextTickets,
      updatedAt: new Date().toISOString()
    };

    persistState(nextStore);
    return { success: true, ticket: favoriteTicket };
  }, [persistState]);

  const removeTicketFavorite = useCallback((ticketOrId) => {
    if (!ticketOrId) return { success: false };
    const ticketId = typeof ticketOrId === 'string'
      ? ticketOrId.trim()
      : (ticketOrId.ticketId || ticketOrId.id || ticketOrId.ticket_id);
    if (!ticketId || typeof ticketId !== 'string') return { success: false };
    const cleanId = ticketId.trim();
    const currentStore = storeRef.current;

    if (!currentStore.tickets[cleanId]) {
      return { success: false, notFound: true };
    }

    const nextTickets = { ...currentStore.tickets };
    delete nextTickets[cleanId];

    const nextStore = {
      ...currentStore,
      tickets: nextTickets,
      updatedAt: new Date().toISOString()
    };

    persistState(nextStore);
    return { success: true };
  }, [persistState]);

  const toggleTicketFavorite = useCallback((ticket, originSession = null) => {
    if (!ticket) return { success: false };
    const ticketId = typeof ticket === 'string' ? ticket : ticket.ticket_id;
    if (isTicketFavorite(ticketId)) {
      return removeTicketFavorite(ticketId);
    }
    return addTicketFavorite(ticket, originSession);
  }, [isTicketFavorite, removeTicketFavorite, addTicketFavorite]);

  // ---------------------------------------------------------------------------
  // COMPTEURS ET LISTES DÉRIVÉES MÉMOÏSÉES
  // ---------------------------------------------------------------------------

  const matchesList = useMemo(() => {
    return Object.values(store.matches).sort((a, b) => {
      // Tri par date décroissante puis championnat
      const dA = a.date || '';
      const dB = b.date || '';
      if (dB !== dA) return dB.localeCompare(dA);
      return (a.league || '').localeCompare(b.league || '');
    });
  }, [store.matches]);

  const ticketsList = useMemo(() => {
    return Object.values(store.tickets).sort((a, b) => {
      return (b.savedAt || '').localeCompare(a.savedAt || '');
    });
  }, [store.tickets]);

  const groupsList = useMemo(() => {
    return Object.values(store.groups).sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  }, [store.groups]);

  const totalMatchesCount = useMemo(() => {
    return Object.keys(store.matches).length;
  }, [store.matches]);

  const unclassifiedMatchesCount = useMemo(() => {
    return Object.values(store.matches).filter(m => !m.groupIds || m.groupIds.length === 0).length;
  }, [store.matches]);

  const groupCounts = useMemo(() => {
    const counts = {};
    Object.keys(store.groups).forEach(gid => {
      counts[gid] = 0;
    });
    Object.values(store.matches).forEach(m => {
      if (Array.isArray(m.groupIds)) {
        m.groupIds.forEach(gid => {
          if (counts[gid] !== undefined) {
            counts[gid]++;
          }
        });
      }
    });
    return counts;
  }, [store.groups, store.matches]);

  const totalTicketsCount = useMemo(() => {
    return Object.keys(store.tickets).length;
  }, [store.tickets]);

  const totalFavoritesCount = useMemo(() => {
    return totalMatchesCount + totalTicketsCount;
  }, [totalMatchesCount, totalTicketsCount]);

  // ---------------------------------------------------------------------------
  // EXPORT, IMPORT ET RÉCUPÉRATION
  // ---------------------------------------------------------------------------

  const exportFavoritesJson = useCallback(() => {
    return exportFavoritesToJson(store);
  }, [store]);

  const downloadFavoritesBackup = useCallback((customFilename = null) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;

    try {
      const jsonStr = exportFavoritesJson();
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = customFilename || `titanium_favorites_backup_${dateStr}.json`;

      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      console.error('Erreur lors du téléchargement de la sauvegarde:', err);
      return false;
    }
  }, [exportFavoritesJson]);

  const importFavoritesJson = useCallback((jsonStr, mode = 'merge') => {
    const validation = validateImportPayload(jsonStr);
    if (!validation.valid || !validation.store) {
      return { success: false, errors: validation.errors };
    }

    let nextStore = null;
    if (mode === 'replace') {
      nextStore = validation.store;
    } else {
      nextStore = mergeFavoritesStores(store, validation.store);
    }

    const persistResult = persistState(nextStore);
    if (persistResult && !persistResult.success) {
      return {
        success: false,
        mode,
        errors: [
          persistResult.quotaExceeded
            ? 'Échec de persistance : espace de stockage local saturé (QuotaExceededError). Les données restent disponibles en mémoire pour la session actuelle mais ne sont pas enregistrées durablement.'
            : 'Échec de persistance : impossible d\'enregistrer les favoris sur le stockage local. Les données restent disponibles en mémoire pour la session actuelle mais ne sont pas enregistrées durablement.'
        ],
        summary: null
      };
    }

    return {
      success: true,
      mode,
      summary: {
        groupsCount: Object.keys(nextStore.groups).length,
        matchesCount: Object.keys(nextStore.matches).length,
        ticketsCount: Object.keys(nextStore.tickets).length
      },
      errors: []
    };
  }, [store, persistState]);

  const dismissPersistenceWarning = useCallback(() => {
    setPersistenceWarning(false);
    setPersistenceError(null);
  }, []);

  const clearCorruptedBackup = useCallback(() => {
    if (corruptedBackupKey && storageAvailable) {
      const safeStorage = getSafeStorage(storage);
      if (safeStorage) {
        try {
          safeStorage.removeItem(corruptedBackupKey);
        } catch (_) {}
      }
      setCorruptedBackupKey(null);
    }
  }, [corruptedBackupKey, storageAvailable, storage]);

  const resetCorruptedStorage = useCallback(() => {
    const fresh = createInitialStore();
    persistState(fresh);
    clearCorruptedBackup();
    dismissPersistenceWarning();
  }, [persistState, clearCorruptedBackup, dismissPersistenceWarning]);

  const contextValue = useMemo(() => ({
    // État
    store,
    isInitialized,
    storageAvailable,
    persistenceWarning,
    persistenceError,
    corruptedBackupKey,
    hasMultiTabConflict,

    // Compteurs et listes dérivées
    totalMatchesCount,
    unclassifiedMatchesCount,
    groupCounts,
    totalTicketsCount,
    totalFavoritesCount,
    matchesList,
    ticketsList,
    groupsList,

    // API Matchs
    isMatchFavorite,
    getMatchFavorite,
    addMatchFavorite,
    removeMatchFavorite,
    toggleMatchFavorite,
    setMatchGroups,
    addMatchToGroup,
    removeMatchFromGroup,

    // API Groupes
    createGroup,
    renameGroup,
    deleteGroup,
    getGroup,

    // API Tickets
    isTicketFavorite,
    getTicketFavorite,
    addTicketFavorite,
    removeTicketFavorite,
    toggleTicketFavorite,

    // Export / Import / Maintenance
    exportFavoritesJson,
    downloadFavoritesBackup,
    importFavoritesJson,
    dismissPersistenceWarning,
    clearCorruptedBackup,
    resetCorruptedStorage
  }), [
    store,
    isInitialized,
    storageAvailable,
    persistenceWarning,
    persistenceError,
    corruptedBackupKey,
    hasMultiTabConflict,
    totalMatchesCount,
    unclassifiedMatchesCount,
    groupCounts,
    totalTicketsCount,
    totalFavoritesCount,
    matchesList,
    ticketsList,
    groupsList,
    isMatchFavorite,
    getMatchFavorite,
    addMatchFavorite,
    removeMatchFavorite,
    toggleMatchFavorite,
    setMatchGroups,
    addMatchToGroup,
    removeMatchFromGroup,
    createGroup,
    renameGroup,
    deleteGroup,
    getGroup,
    isTicketFavorite,
    getTicketFavorite,
    addTicketFavorite,
    removeTicketFavorite,
    toggleTicketFavorite,
    exportFavoritesJson,
    downloadFavoritesBackup,
    importFavoritesJson,
    dismissPersistenceWarning,
    clearCorruptedBackup,
    resetCorruptedStorage
  ]);

  return (
    <FavoritesContext.Provider value={contextValue}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites doit être utilisé à l\'intérieur d\'un <FavoritesProvider>');
  }
  return context;
}
