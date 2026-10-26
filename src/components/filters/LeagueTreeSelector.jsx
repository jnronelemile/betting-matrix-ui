import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Check,
  Minus,
  Globe,
  RotateCcw
} from 'lucide-react';
import {
  GEOGRAPHIC_LEAGUE_HIERARCHY,
  isUnclassifiedLeague
} from '../../utils/ticketFilters.js';
import { getLeagueFlag } from '../../utils/titaniumLoader.js';
import { getLeagueDisplayName } from '../../utils/teamLogos.jsx';

/**
 * Sélecteur géographique compact par onglets régionaux (WEB-FILTERS-001 - Patch UX).
 *
 * Améliorations UX :
 * - Régions sous forme d'onglets horizontaux compacts (Europe, Amériques, Asie, Autres).
 * - Pays à ligue unique (18/23) : sélection directe en 1 seul clic (zéro dépliage requis).
 * - Pays multi-ligues (5/23) : sélection groupée rapide ou un seul dépliage compact.
 * - Bandeau de sélection active toujours visible avec badges `retrait → X`.
 * - Recherche textuelle facultative avec vue unifiée automatique.
 * - Respect des cibles tactiles mobiles (≥ 44px sur les boutons isolés).
 *
 * @param {Object} props
 * @param {Array<string>} props.selectedLeagues Ligues actuellement sélectionnées
 * @param {(nextLeagues: Array<string>) => void} props.onSetSelectedLeagues Gestionnaire de mutation
 * @param {Array<string>} [props.availableLeagues] Ligues effectivement présentes dans le pool candidat
 * @param {Object<string, number>} [props.leagueWhatIfCounts] Compteurs prospectifs par ligue
 * @param {Object<string, number>} [props.countryWhatIfCounts] Compteurs prospectifs par pays
 * @param {boolean} [props.isTickets] Contexte tickets assemblés (true) ou choix finaux (false)
 */
export function LeagueTreeSelector({
  selectedLeagues = [],
  onSetSelectedLeagues,
  availableLeagues = [],
  leagueWhatIfCounts = {},
  countryWhatIfCounts = {},
  isTickets = true
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRegionTab, setActiveRegionTab] = useState('EUROPE');
  const [expandedCountries, setExpandedCountries] = useState(() => new Set());

  // Détection des ligues disponibles non classées (catégorie conditionnelle)
  const unclassifiedAvailableLeagues = useMemo(() => {
    return (availableLeagues || []).filter(l => isUnclassifiedLeague(l));
  }, [availableLeagues]);

  // Construction de la structure hiérarchique filtrée par les ligues réellement disponibles
  const hierarchyData = useMemo(() => {
    const availableSet = new Set(availableLeagues);
    const regions = [];

    // 1. Régions canoniques répertoriées (Europe, Amériques, Asie)
    for (const [regionId, region] of Object.entries(GEOGRAPHIC_LEAGUE_HIERARCHY)) {
      const countriesList = [];

      for (const [countryCode, country] of Object.entries(region.countries)) {
        const countryLeagues = (country.leagues || []).filter(l => availableSet.has(l));
        if (countryLeagues.length > 0) {
          countriesList.push({
            code: countryCode,
            label: country.label,
            flag: country.flag,
            leagues: countryLeagues,
            singleLeague: countryLeagues.length === 1 ? countryLeagues[0] : null
          });
        }
      }

      if (countriesList.length > 0) {
        regions.push({
          id: regionId,
          label: region.label,
          shortLabel: regionId === 'EUROPE' ? 'Europe' : regionId === 'AMERICAS' ? 'Amériques' : regionId === 'ASIA' ? 'Asie' : region.label,
          flag: region.flag,
          countries: countriesList,
          totalLeagues: countriesList.reduce((acc, c) => acc + c.leagues.length, 0)
        });
      }
    }

    // 2. Catégorie conditionnelle "Non classées" : affichée UNIQUEMENT si une ligue inconnue est observée
    if (unclassifiedAvailableLeagues.length > 0) {
      regions.push({
        id: 'UNCLASSIFIED',
        label: 'Autres / Non classées',
        shortLabel: 'Autres',
        flag: '⚽',
        countries: [
          {
            code: 'OTHER',
            label: 'Ligues non classées',
            flag: '⚽',
            leagues: unclassifiedAvailableLeagues,
            singleLeague: unclassifiedAvailableLeagues.length === 1 ? unclassifiedAvailableLeagues[0] : null
          }
        ],
        totalLeagues: unclassifiedAvailableLeagues.length
      });
    }

    return regions;
  }, [availableLeagues, unclassifiedAvailableLeagues]);

  // Synchronisation de l'onglet actif si la région actuelle n'a plus de ligues disponibles
  React.useEffect(() => {
    if (hierarchyData.length > 0 && !hierarchyData.some(r => r.id === activeRegionTab)) {
      setActiveRegionTab(hierarchyData[0].id);
    }
  }, [hierarchyData, activeRegionTab]);

  // Filtrage selon la recherche textuelle optionnelle
  const isSearching = searchQuery.trim().length > 0;
  const filteredHierarchy = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return hierarchyData;

    const result = [];
    for (const region of hierarchyData) {
      const matchingCountries = [];
      for (const country of region.countries) {
        const countryMatch = country.label.toLowerCase().includes(q) || country.code.toLowerCase().includes(q);
        const matchingLeagues = country.leagues.filter(l => {
          const displayName = getLeagueDisplayName(l).toLowerCase();
          return l.toLowerCase().includes(q) || displayName.includes(q);
        });

        if (countryMatch || matchingLeagues.length > 0) {
          matchingCountries.push({
            ...country,
            leagues: countryMatch ? country.leagues : matchingLeagues,
            singleLeague: (countryMatch ? country.leagues : matchingLeagues).length === 1
              ? (countryMatch ? country.leagues : matchingLeagues)[0]
              : null
          });
        }
      }

      if (matchingCountries.length > 0) {
        result.push({
          ...region,
          countries: matchingCountries,
          totalLeagues: matchingCountries.reduce((acc, c) => acc + c.leagues.length, 0)
        });
      }
    }
    return result;
  }, [hierarchyData, searchQuery]);

  const toggleCountry = useCallback((countryCode) => {
    setExpandedCountries(prev => {
      const next = new Set(prev);
      if (next.has(countryCode)) {
        next.delete(countryCode);
      } else {
        next.add(countryCode);
      }
      return next;
    });
  }, []);

  // Action unitaire : bascule d'une seule ligue
  const handleToggleSingleLeague = useCallback((league) => {
    if (typeof onSetSelectedLeagues !== 'function') return;
    const isSelected = selectedLeagues.includes(league);
    const next = isSelected
      ? selectedLeagues.filter(l => l !== league)
      : [...selectedLeagues, league];
    onSetSelectedLeagues(next);
  }, [selectedLeagues, onSetSelectedLeagues]);

  // Action pays : sélection ou désélection groupée de toutes les ligues d'un pays
  const handleToggleAllCountryLeagues = useCallback((countryLeagues) => {
    if (typeof onSetSelectedLeagues !== 'function' || !Array.isArray(countryLeagues)) return;
    const allSelected = countryLeagues.length > 0 && countryLeagues.every(l => selectedLeagues.includes(l));
    let next;
    if (allSelected) {
      next = selectedLeagues.filter(l => !countryLeagues.includes(l));
    } else {
      next = Array.from(new Set([...selectedLeagues, ...countryLeagues]));
    }
    onSetSelectedLeagues(next);
  }, [selectedLeagues, onSetSelectedLeagues]);

  // Suppression unitaire depuis le bandeau de badges actifs
  const handleRemoveSingleLeague = useCallback((league) => {
    if (typeof onSetSelectedLeagues !== 'function') return;
    onSetSelectedLeagues(selectedLeagues.filter(l => l !== league));
  }, [selectedLeagues, onSetSelectedLeagues]);

  // Réinitialisation complète
  const handleReset = useCallback(() => {
    if (typeof onSetSelectedLeagues !== 'function') return;
    onSetSelectedLeagues([]);
  }, [onSetSelectedLeagues]);

  const selectedCount = selectedLeagues.length;

  // Région active pour l'affichage en mode onglets (hors recherche)
  const currentRegion = useMemo(() => {
    return hierarchyData.find(r => r.id === activeRegionTab) || hierarchyData[0] || null;
  }, [hierarchyData, activeRegionTab]);

  return (
    <div className="space-y-2.5">
      {/* 1. En-tête compact avec compteur et bouton Tout effacer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Globe size={13} className="text-emerald-500 shrink-0" />
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
            Sélection Géographique
          </span>
          <span
            className="inline-flex items-center px-1.5 py-0.2 rounded-md font-mono font-bold text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0"
            title={`${selectedCount} ligue(s) sélectionnée(s)`}
          >
            {selectedCount}×
          </span>
        </div>

        {selectedCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline shrink-0 min-h-[36px] px-2"
          >
            <RotateCcw size={11} />
            <span>Tout effacer</span>
          </button>
        )}
      </div>

      {/* 2. Bandeau compact des ligues actives */}
      {selectedCount > 0 ? (
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            <span>Ligues actives ({selectedCount})</span>
            <span className="text-[9px] font-normal normal-case">Cliquez pour retirer</span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
            {selectedLeagues.map(league => {
              const count = leagueWhatIfCounts?.[league] ?? 0;
              return (
                <span
                  key={league}
                  className="inline-flex items-center gap-1 pl-2 pr-0.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 shadow-2xs group"
                >
                  <span className="text-xs shrink-0">{getLeagueFlag(league)}</span>
                  <span className="truncate max-w-[120px]">{getLeagueDisplayName(league)}</span>
                  <span
                    className="text-[9px] font-mono font-medium opacity-85 shrink-0 text-emerald-800 dark:text-emerald-200"
                    title={`Ligue active. Résultat après retrait : ${count}`}
                  >
                    retrait → {count}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSingleLeague(league)}
                    className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-md hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 transition-colors ml-0.5"
                    title={`Retirer ${getLeagueDisplayName(league)}`}
                    aria-label={`Retirer ${league}`}
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* 3. Champ de recherche textuelle facultatif */}
      <div className="relative">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher pays ou ligue (ex: Premier, Espagne, MLS)..."
          className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
            title="Effacer la recherche"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* 4. Onglets des régions (affichés hors recherche active) */}
      {!isSearching && hierarchyData.length > 1 && (
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl overflow-x-auto custom-scrollbar">
          {hierarchyData.map(region => {
            const isActive = activeRegionTab === region.id;
            const selectedInRegion = region.countries.reduce((acc, c) => {
              return acc + c.leagues.filter(l => selectedLeagues.includes(l)).length;
            }, 0);

            return (
              <button
                key={region.id}
                type="button"
                onClick={() => setActiveRegionTab(region.id)}
                className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-2xs border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-700/40'
                }`}
              >
                <span>{region.flag}</span>
                <span className="truncate">{region.shortLabel}</span>
                <span className="text-[10px] font-mono opacity-70">({region.totalLeagues})</span>
                {selectedInRegion > 0 && (
                  <span className="px-1 py-0.2 rounded font-mono text-[9px] font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    {selectedInRegion}×
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 5. Liste directe des Pays / Ligues */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto p-1 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200/80 dark:border-slate-800/80 custom-scrollbar">
        {isSearching ? (
          /* Vue Recherche Unifiée */
          filteredHierarchy.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p className="font-semibold">Aucun résultat</p>
              <p className="text-[11px]">« {searchQuery} » ne correspond à aucun pays ni ligue disponible.</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
              >
                Effacer la recherche
              </button>
            </div>
          ) : (
            filteredHierarchy.map(region => (
              <div key={region.id} className="space-y-1.5 pb-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 pt-1 flex items-center gap-1">
                  <span>{region.flag}</span>
                  <span>{region.label}</span>
                </div>
                {region.countries.map(country => (
                  <CountryRow
                    key={country.code}
                    country={country}
                    selectedLeagues={selectedLeagues}
                    expandedCountries={expandedCountries}
                    toggleCountry={toggleCountry}
                    handleToggleSingleLeague={handleToggleSingleLeague}
                    handleToggleAllCountryLeagues={handleToggleAllCountryLeagues}
                    leagueWhatIfCounts={leagueWhatIfCounts}
                    countryWhatIfCounts={countryWhatIfCounts}
                    isSearching={true}
                  />
                ))}
              </div>
            ))
          )
        ) : (
          /* Vue Onglet Régional Actif */
          currentRegion?.countries.map(country => (
            <CountryRow
              key={country.code}
              country={country}
              selectedLeagues={selectedLeagues}
              expandedCountries={expandedCountries}
              toggleCountry={toggleCountry}
              handleToggleSingleLeague={handleToggleSingleLeague}
              handleToggleAllCountryLeagues={handleToggleAllCountryLeagues}
              leagueWhatIfCounts={leagueWhatIfCounts}
              countryWhatIfCounts={countryWhatIfCounts}
              isSearching={false}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Composant de ligne Pays :
 * - Si ligue unique (singleLeague) : sélection directe en 1 seul clic.
 * - Si multi-ligues : sélecteur groupé + accordéon 1 niveau pour les championnats individuels.
 */
function CountryRow({
  country,
  selectedLeagues,
  expandedCountries,
  toggleCountry,
  handleToggleSingleLeague,
  handleToggleAllCountryLeagues,
  leagueWhatIfCounts,
  countryWhatIfCounts,
  isSearching
}) {
  const leagues = country.leagues;
  const isSingle = Boolean(country.singleLeague);
  const singleLeagueId = country.singleLeague;

  // CAS 1 : Pays à ligue unique -> Clic direct en 1 interaction
  if (isSingle && singleLeagueId) {
    const isSelected = selectedLeagues.includes(singleLeagueId);
    const count = leagueWhatIfCounts?.[singleLeagueId] ?? 0;
    const leagueDisplayName = getLeagueDisplayName(singleLeagueId);

    return (
      <button
        type="button"
        onClick={() => handleToggleSingleLeague(singleLeagueId)}
        className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-between gap-1.5 text-left min-h-[40px] ${
          isSelected
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold'
            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
        title={
          isSelected
            ? `${leagueDisplayName} active. Retrait : ${count}`
            : `${leagueDisplayName} inactive. Sélection : ${count}`
        }
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm shrink-0">{country.flag}</span>
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="font-bold truncate">{country.label}</span>
            <span className={`text-[11px] truncate opacity-85 ${isSelected ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
              • {leagueDisplayName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[10px] font-mono font-medium ${isSelected ? 'text-white/95' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {isSelected ? `retrait → ${count}` : `(${count})`}
          </span>
          {isSelected && <Check size={13} strokeWidth={3} className="shrink-0 text-white" />}
        </div>
      </button>
    );
  }

  // CAS 2 : Pays multi-ligues (Angleterre, Espagne, Italie, Allemagne, France...)
  const selectedInCountry = leagues.filter(l => selectedLeagues.includes(l)).length;
  const allSelected = leagues.length > 0 && selectedInCountry === leagues.length;
  const isPartial = selectedInCountry > 0 && !allSelected;
  const isExpanded = isSearching || expandedCountries.has(country.code);
  const countryWhatIf = countryWhatIfCounts?.[country.code];

  return (
    <div className="rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex items-center justify-between gap-1 p-1 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {/* Checkbox sélection groupée de toutes les ligues */}
          <button
            type="button"
            onClick={() => handleToggleAllCountryLeagues(leagues)}
            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800/60 transition-colors shrink-0"
            title={
              allSelected
                ? `Désélectionner tout (${country.label})`
                : `Sélectionner tout (${country.label})`
            }
            aria-label={`Bascule toutes les ligues de ${country.label}`}
          >
            <span
              className={`w-4.5 h-4.5 rounded flex items-center justify-center border transition-all ${
                allSelected
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                  : isPartial
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              {allSelected && <Check size={12} strokeWidth={3} />}
              {isPartial && <Minus size={11} strokeWidth={3} />}
            </span>
          </button>

          {/* Drapeau & Nom du Pays (clic déplie/replie) */}
          <button
            type="button"
            onClick={() => toggleCountry(country.code)}
            className="flex items-center gap-1.5 text-left min-w-0 flex-1 group py-1.5 min-h-[36px]"
          >
            <span className="text-sm shrink-0">{country.flag}</span>
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
              {country.label}
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
              ({selectedInCountry}/{leagues.length})
            </span>
          </button>
        </div>

        {/* Compteur What-If et Chevron */}
        <div className="flex items-center gap-0.5 shrink-0">
          {typeof countryWhatIf === 'number' && (
            <button
              type="button"
              onClick={() => handleToggleAllCountryLeagues(leagues)}
              className={`text-[10px] font-mono font-semibold px-1.5 py-1 min-h-[32px] flex items-center rounded transition-colors ${
                allSelected
                  ? 'text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20'
                  : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
              title={
                allSelected
                  ? `Toutes les ligues actives. Retrait : ${countryWhatIf}`
                  : `Sélection de tout ${country.label} : ${countryWhatIf}`
              }
            >
              {allSelected ? `retrait → ${countryWhatIf}` : `(${countryWhatIf})`}
            </button>
          )}

          <button
            type="button"
            onClick={() => toggleCountry(country.code)}
            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 transition-colors"
            title={isExpanded ? 'Replier les ligues' : 'Déplier les ligues'}
            aria-label={isExpanded ? `Replier ${country.label}` : `Déplier ${country.label}`}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* Championnats individuels (dépliés) */}
      {isExpanded && (
        <div className="p-1.5 pt-0 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1.5">
            {leagues.map(league => {
              const isSelected = selectedLeagues.includes(league);
              const count = leagueWhatIfCounts?.[league] ?? 0;

              return (
                <button
                  key={league}
                  type="button"
                  onClick={() => handleToggleSingleLeague(league)}
                  className={`px-2 py-1.5 min-h-[36px] rounded-lg text-xs font-medium border transition-all flex items-center justify-between gap-1 text-left ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="shrink-0">{getLeagueFlag(league)}</span>
                    <span className="truncate">{getLeagueDisplayName(league)}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`text-[9px] font-mono ${isSelected ? 'text-white/95 font-medium' : 'text-slate-400'}`}
                    >
                      {isSelected ? `retrait → ${count}` : `(${count})`}
                    </span>
                    {isSelected && <Check size={11} strokeWidth={3} className="shrink-0 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default LeagueTreeSelector;
