/**
 * TITANIUM WEB — Utilitaires canoniques d'horodatage et de planification de match.
 *
 * Règles et principes directeurs :
 * 1. Priorité absolue au timestamp canonique `kickoff_utc` converti dans le fuseau local du navigateur.
 * 2. Repli déterministe sur `date` + `hours` / `Heure` en l'absence de `kickoff_utc`.
 * 3. Ne jamais inventer une heure, convertir deux fois un timestamp ou mélanger dates UTC et heures locales.
 * 4. Détection déterministe de la fenêtre conventionnelle LIVE estimé [0 à 115 min après coup d'envoi].
 */

export const ESTIMATED_LIVE_WINDOW_MINUTES = 115;

/**
 * Convertit une chaîne horaire "HH:MM" (ou "HH:MM:SS") au format 12h AM/PM.
 * Exemples : "18:30" -> "6:30 PM", "12:00" -> "12:00 PM", "00:15" -> "12:15 AM".
 */
export function formatTimeAMPM(timeStr) {
  if (!timeStr) return '';
  const parts = String(timeStr).trim().split(':');
  if (parts.length < 2) return '';
  let h = parseInt(parts[0], 10);
  const m = parts[1].slice(0, 2);
  if (isNaN(h)) return '';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${m} ${ampm}`;
}

/**
 * Capitalise la première lettre d'une chaîne.
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Parse sécurisé d'une date locale "YYYY-MM-DD" à midi (12:00:00)
 * pour neutraliser les décalages de date aux fuseaux négatifs (ex: UTC-4).
 */
function parseLocalDateNoon(dateStr) {
  if (!dateStr || dateStr === 'Date Inconnue' || dateStr === 'Unknown Date') return null;
  const datePart = String(dateStr).split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  const d = new Date(year, month - 1, day, 12, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Résout de façon déterministe l'heure affichée pour un match :
 * 1. Priorité absolue à kickoff_utc converti dans le fuseau d'affichage local (format 12h AM/PM).
 * 2. Repli sécurisé sur match.hours ou match.Heure.
 */
export function getMatchDisplayTime(match) {
  if (!match) return '';
  if (match.kickoff_utc) {
    const d = new Date(match.kickoff_utc);
    if (!isNaN(d.getTime())) {
      try {
        return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
      } catch (_) {
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    }
  }
  if (match.hours) return formatTimeAMPM(match.hours);
  if (match.Heure) return formatTimeAMPM(match.Heure);
  return '';
}

/**
 * Résout de façon déterministe la date d'un match au format français :
 * - format='long' : "Vendredi 16 octobre"
 * - format='short' : "Ven. 16 oct."
 */
export function getMatchDisplayDate(match, { format = 'long' } = {}) {
  if (!match) return '';

  if (match.kickoff_utc) {
    const d = new Date(match.kickoff_utc);
    if (!isNaN(d.getTime())) {
      try {
        const options = format === 'short'
          ? { weekday: 'short', day: 'numeric', month: 'short' }
          : { weekday: 'long', day: 'numeric', month: 'long' };
        return capitalize(d.toLocaleDateString('fr-FR', options));
      } catch (_) {}
    }
  }

  const rawDate = match.date || match.Date || match.Match_Date;
  const fallbackDate = parseLocalDateNoon(rawDate);
  if (fallbackDate) {
    try {
      const options = format === 'short'
        ? { weekday: 'short', day: 'numeric', month: 'short' }
        : { weekday: 'long', day: 'numeric', month: 'long' };
      return capitalize(fallbackDate.toLocaleDateString('fr-FR', options));
    } catch (_) {}
  }

  return '';
}

/**
 * Détection déterministe de la fenêtre de match LIVE estimé [0 à 115 minutes après coup d'envoi].
 * Privilégie kickoff_utc avec comparaison UTC pure.
 * Repli sur date et hours locales en l'absence de kickoff_utc.
 */
export function isMatchLive(match, nowMs = Date.now()) {
  if (!match) return false;

  // 1. Priorité absolue au timestamp canonique kickoff_utc (comparaison UTC pure)
  if (match.kickoff_utc) {
    const kickoffMs = new Date(match.kickoff_utc).getTime();
    if (!isNaN(kickoffMs)) {
      const diffMinutes = (nowMs - kickoffMs) / 60000;
      return diffMinutes >= 0 && diffMinutes <= ESTIMATED_LIVE_WINDOW_MINUTES;
    }
  }

  // 2. Fallback déterministe sur date et hours locales
  const dateVal = match.date || match.Date;
  const hoursVal = match.hours || match.Hours || match.Heure;
  if (dateVal && hoursVal && dateVal !== 'Date Inconnue' && dateVal !== 'Unknown Date') {
    const datePart = String(dateVal).split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const [h, m] = String(hoursVal).split(':').map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(h) && !isNaN(m)) {
      const matchTimeLocal = new Date(year, month - 1, day, h, m).getTime();
      const diffMinutes = (nowMs - matchTimeLocal) / 60000;
      return diffMinutes >= 0 && diffMinutes <= ESTIMATED_LIVE_WINDOW_MINUTES;
    }
  }

  return false;
}

/**
 * Extrait toutes les informations de planification d'un match de façon centralisée et cohérente.
 */
export function getMatchScheduleDetails(match, nowMs = Date.now()) {
  if (!match) {
    return {
      dateLong: '',
      shortDate: '',
      time: '',
      isLive: false,
      hasSchedule: false,
      fullSchedule: 'Horaire à confirmer'
    };
  }

  const dateLong = getMatchDisplayDate(match, { format: 'long' });
  const shortDate = getMatchDisplayDate(match, { format: 'short' });
  const time = getMatchDisplayTime(match);
  const live = isMatchLive(match, nowMs);
  const hasSchedule = Boolean(dateLong || time);

  let fullSchedule = 'Horaire à confirmer';
  if (dateLong && time) {
    fullSchedule = `${dateLong} • ${time}`;
  } else if (dateLong) {
    fullSchedule = dateLong;
  } else if (time) {
    fullSchedule = time;
  }

  return {
    dateLong: dateLong || (time ? '' : 'Date à confirmer'),
    shortDate: shortDate || '',
    time: time || '',
    isLive: live,
    hasSchedule,
    fullSchedule
  };
}
