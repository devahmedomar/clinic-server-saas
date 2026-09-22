export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Subscription state machine (SRS section 6.3).
 * Effective status is recomputed from stored state + dates so a clinic
 * is locked as soon as its free trial / paid period expires, with a grace
 * window between. Stored `subscriptionStatus` remains the source of truth
 * for trial vs active vs cancelled; grace/lock are derived.
 */
export function effectiveStatus(clinic, now = new Date()) {
  const stored = clinic.subscriptionStatus;
  if (stored === 'cancelled') return 'cancelled';
  if (stored === 'locked') return 'locked';

  if (stored === 'trial') {
    if (now < clinic.trialEndsAt) return 'trial';
    const graceEnd = clinic.graceEndsAt || addDays(clinic.trialEndsAt, envGrace());
    return now < graceEnd ? 'gracePeriod' : 'locked';
  }

  if (stored === 'active') {
    if (!clinic.nextDueDate) return 'gracePeriod';
    if (now < clinic.nextDueDate) return 'active';
    const graceEnd = clinic.graceEndsAt || addDays(clinic.nextDueDate, envGrace());
    return now < graceEnd ? 'gracePeriod' : 'locked';
  }

  return stored;
}

function envGrace() {
  return Number(process.env.GRACE_DAYS || 5);
}

export const ALLOWED_WRITE_STATUSES = ['trial', 'active'];
export const ALLOWED_READ_STATUSES = ['trial', 'active', 'gracePeriod'];