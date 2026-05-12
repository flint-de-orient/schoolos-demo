/**
 * Period redistribution algorithm.
 *
 * Given a list of curriculum subjects with their current periodsPerWeek and
 * the total available slots in the school week, this module computes the
 * minimum set of changes needed to make the curriculum fit perfectly.
 *
 * Surplus (curriculum < slots): adds periods to compulsory core/language subjects,
 *   up to per-category caps.  Remaining surplus is returned as unresolved (free slots).
 *
 * Deficit (curriculum > slots): trims periods from the lowest-priority subjects
 *   first, respecting per-category minimums.  Remaining deficit (impossible to
 *   resolve without violating minimums) is returned as unresolved.
 */

export type SubjectForRedist = {
  id: string;
  name: string;
  category: string;       // CORE | LANGUAGE | ELECTIVE | PRACTICAL | SPORTS | ARTS | TECHNOLOGY | VALUE_EDUCATION | REMEDIAL
  isCompulsory: boolean;
  isOptional: boolean;
  schedulingSlot: string; // REGULAR | ACTIVITY | DOUBLE_PERIOD | AFTER_SCHOOL | WEEKEND
  periodsPerWeek: number;
};

export type RedistChange = {
  subjectId: string;
  name: string;
  from: number;
  to: number;
};

export type RedistResult = {
  changes: RedistChange[];
  newPeriods: Record<string, number>; // subjectId → updated periodsPerWeek
  unresolved: number;                 // >0 = surplus slots left; <0 = deficit remaining
};

// ── Per-category caps ─────────────────────────────────────────────────────────

/** Maximum periods/week the algorithm will ever assign for surplus filling. */
const SURPLUS_CAP: Record<string, number> = {
  LANGUAGE: 8,
  CORE: 7,
  PRACTICAL: 4,
};

/** Categories eligible to receive extra periods when there is a surplus. */
const SURPLUS_ELIGIBLE_CATS = ['LANGUAGE', 'CORE', 'PRACTICAL'];

/** Minimum periods/week the algorithm will ever trim to. */
const DEFICIT_MIN: Record<string, number> = {
  LANGUAGE: 3,
  CORE: 2,
  PRACTICAL: 1,
  ELECTIVE: 1,
  SPORTS: 1,
  ARTS: 1,
  TECHNOLOGY: 1,
  VALUE_EDUCATION: 1,
  REMEDIAL: 1,
};

/**
 * Category trim priority (index 0 = trimmed first).
 * Optional subjects are handled separately before this list.
 */
const TRIM_CAT_ORDER = [
  'SPORTS',
  'ARTS',
  'TECHNOLOGY',
  'VALUE_EDUCATION',
  'REMEDIAL',
  'ELECTIVE',
  'PRACTICAL',
  'CORE',
  'LANGUAGE',
];

// ── Main function ─────────────────────────────────────────────────────────────

export function redistribute(
  subjects: SubjectForRedist[],
  totalSlots: number,
): RedistResult {
  // AFTER_SCHOOL subjects are outside the main timetable grid — exclude them
  const inGrid = subjects.filter(s => s.schedulingSlot !== 'AFTER_SCHOOL');

  // Working copy of periods (mutable)
  const ppw: Record<string, number> = {};
  for (const s of inGrid) ppw[s.id] = s.periodsPerWeek;

  const totalAssigned = inGrid.reduce((sum, s) => sum + s.periodsPerWeek, 0);
  const gap = totalSlots - totalAssigned; // positive = surplus, negative = deficit

  if (gap === 0) {
    return { changes: [], newPeriods: ppw, unresolved: 0 };
  }

  if (gap > 0) {
    return handleSurplus(inGrid, ppw, gap);
  } else {
    return handleDeficit(inGrid, ppw, -gap);
  }
}

// ── Surplus handler ───────────────────────────────────────────────────────────

function handleSurplus(
  subjects: SubjectForRedist[],
  ppw: Record<string, number>,
  surplus: number,
): RedistResult {
  const original: Record<string, number> = { ...ppw };

  // Only compulsory subjects in eligible categories can receive extra periods
  const eligible = subjects
    .filter(s => s.isCompulsory && SURPLUS_ELIGIBLE_CATS.includes(s.category))
    .sort((a, b) =>
      SURPLUS_ELIGIBLE_CATS.indexOf(a.category) - SURPLUS_ELIGIBLE_CATS.indexOf(b.category)
    );

  let remaining = surplus;
  let changed = true;

  // Round-robin: give 1 period at a time so no single subject hogs all surplus
  while (remaining > 0 && changed) {
    changed = false;
    for (const s of eligible) {
      if (remaining <= 0) break;
      const cap = SURPLUS_CAP[s.category] ?? 7;
      if (ppw[s.id] < cap) {
        ppw[s.id]++;
        remaining--;
        changed = true;
      }
    }
  }

  return buildResult(subjects, original, ppw, remaining);
}

// ── Deficit handler ───────────────────────────────────────────────────────────

function handleDeficit(
  subjects: SubjectForRedist[],
  ppw: Record<string, number>,
  deficit: number,
): RedistResult {
  const original: Record<string, number> = { ...ppw };

  // Sort: optional subjects trimmed first, then by category trim order
  const trimList = [...subjects].sort((a, b) => {
    if (a.isOptional && !b.isOptional) return -1;
    if (!a.isOptional && b.isOptional) return 1;
    const ai = TRIM_CAT_ORDER.indexOf(a.category);
    const bi = TRIM_CAT_ORDER.indexOf(b.category);
    // Unknown categories treated as lowest priority (trimmed first)
    const aN = ai === -1 ? -1 : ai;
    const bN = bi === -1 ? -1 : bi;
    return aN - bN;
  });

  let remaining = deficit;
  let changed = true;

  // Round-robin: trim 1 period at a time — avoids zeroing a single subject
  while (remaining > 0 && changed) {
    changed = false;
    for (const s of trimList) {
      if (remaining <= 0) break;
      const min = DEFICIT_MIN[s.category] ?? 1;
      if (ppw[s.id] > min) {
        ppw[s.id]--;
        remaining--;
        changed = true;
      }
    }
  }

  // remaining > 0 means deficit could not be fully resolved without violating minimums
  return buildResult(subjects, original, ppw, -remaining);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildResult(
  subjects: SubjectForRedist[],
  original: Record<string, number>,
  updated: Record<string, number>,
  unresolved: number,
): RedistResult {
  const changes: RedistChange[] = [];
  for (const s of subjects) {
    if (updated[s.id] !== original[s.id]) {
      changes.push({ subjectId: s.id, name: s.name, from: original[s.id], to: updated[s.id] });
    }
  }
  return { changes, newPeriods: { ...updated }, unresolved };
}
