import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

/**
 * Mini-badge coloré en exposant pour afficher le volume de matchs.
 * Style bulle de notification arrondie, contrastée, lisible, supportant 3 chiffres (ex: 203).
 */
function CountBadge({ count, isSelected = false }) {
  if (count == null || count === undefined) return null;
  return (
    <span
      className={`
        absolute -top-1.5 -right-1.5 min-w-[19px] h-4 px-1 rounded-full
        text-[9px] font-mono font-bold leading-none flex items-center justify-center
        shadow-sm ring-2 ring-white dark:ring-slate-900 pointer-events-none transition-colors
        ${isSelected
          ? 'bg-emerald-500 text-white'
          : 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900'}
      `}
    >
      {count}
    </span>
  );
}

/**
 * Calendar Popover compact pour la sélection temporelle du batch.
 * Remplace la rangée permanente encombrante par un déclencheur compact et un popover en grille.
 */
export function BatchDateBar({
  availableDates = [],
  selectedDate = 'ALL',
  onSelectDate,
  dateCounts = {},
  totalMatchesCount = 0,
  isMobile = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const formatDatePill = (dateStr) => {
    if (!dateStr || dateStr === 'Date Inconnue') {
      return { dayShort: '???', dayNum: '', month: '' };
    }
    const d = new Date(`${dateStr}T12:00:00`);
    const dayShort = d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
    const dayNum = d.toLocaleDateString('fr-FR', { day: 'numeric' });
    const month = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
    return { dayShort, dayNum, month };
  };

  const getTriggerLabel = () => {
    if (selectedDate === 'ALL') {
      return 'ALL DATES';
    }
    const { dayShort, dayNum, month } = formatDatePill(selectedDate);
    return `${dayShort} ${dayNum} ${month}`;
  };

  const getTriggerCount = () => {
    if (selectedDate === 'ALL') {
      return totalMatchesCount;
    }
    return dateCounts[selectedDate] || 0;
  };

  const handleSelect = (date) => {
    onSelectDate(date);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block shrink-0 ${isOpen ? 'z-50' : ''}`}>
      {/* Trigger Button with Exponent Counter Badge */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`
          relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border text-[10px] font-bold transition-all shadow-sm select-none
          ${selectedDate !== 'ALL'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/50'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}
        `}
        title="Ouvrir le calendrier du batch"
        aria-expanded={isOpen}
      >
        <Calendar
          size={13}
          className={selectedDate !== 'ALL' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}
        />
        <span className="font-bold tracking-tight uppercase">{getTriggerLabel()}</span>
        <ChevronDown
          size={12}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
        <CountBadge count={getTriggerCount()} isSelected={selectedDate !== 'ALL'} />
      </button>

      {/* Floating Calendar Popover */}
      {isOpen && (
        <div
          className={`
            ${isMobile
              ? 'fixed left-3 right-3 top-[68px] max-w-[340px] mx-auto z-50'
              : 'absolute top-full mt-2.5 left-0 z-50 w-72 sm:w-80'}
            bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl
            border border-slate-200 dark:border-slate-800 shadow-2xl p-3.5
            animate-in fade-in duration-150
          `}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 px-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
              <Calendar size={12} />
              <span>Calendrier du Batch</span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              {availableDates.length} journées
            </span>
          </div>

          <div className="pt-2.5 space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-0.5">
            {/* Primary Action: ALL DATES Card with Exponent Badge */}
            <div className="p-1">
              <button
                type="button"
                onClick={() => handleSelect('ALL')}
                className={`
                  relative w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left select-none
                  ${selectedDate === 'ALL'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/80 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500'
                    : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-200'}
                `}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-6">
                  <div
                    className={`
                      w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-all
                      ${selectedDate === 'ALL'
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}
                    `}
                  >
                    {selectedDate === 'ALL' && <Check size={11} strokeWidth={3} />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold leading-tight truncate">Toutes les dates</span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono tracking-tight">Vue globale du batch</span>
                  </div>
                </div>
                <CountBadge count={totalMatchesCount} isSelected={selectedDate === 'ALL'} />
              </button>
            </div>

            {/* Grid of Dates (2 Columns) with Exponent Badges */}
            <div className="grid grid-cols-2 gap-3 p-1">
              {availableDates.map((date) => {
                const isSelected = selectedDate === date;
                const { dayShort, dayNum, month } = formatDatePill(date);
                const count = dateCounts[date] || 0;

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => handleSelect(date)}
                    className={`
                      relative flex flex-col p-2.5 rounded-xl border transition-all text-left select-none
                      ${isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/80 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-200'}
                    `}
                  >
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 leading-tight">
                      {dayShort}
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 leading-snug">
                      {dayNum} {month}
                    </span>
                    <CountBadge count={count} isSelected={isSelected} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BatchDateBar;
