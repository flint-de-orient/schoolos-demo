import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';
import { autoAssignFeePlan } from '@/lib/fee-auto-assign';

/**
 * POST /api/fee/sync-accounts
 * Finds every active student in the current academic year who has no
 * FeeAccount and re-runs autoAssignFeePlan for them.
 * Safe to call multiple times — autoAssignFeePlan is a no-op if an
 * assignment already exists.
 */
export async function POST() {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;

  const currentYear = await db.academicYear.findFirst({
    where: { tenantId, isCurrent: true },
    select: { id: true },
  });
  if (!currentYear) return ok({ synced: 0, skipped: 0, message: 'No current academic year found' });

  // Students in the current year who have no fee account
  const orphans = await db.student.findMany({
    where: {
      tenantId,
      isActive: true,
      deletedAt: null,
      grade: { academicYearId: currentYear.id },
      feeAccount: null,
    },
    select: { id: true, gradeId: true, grade: { select: { academicYearId: true } } },
  });

  let synced = 0;
  let skipped = 0;

  for (const student of orphans) {
    if (!student.gradeId || !student.grade?.academicYearId) { skipped++; continue; }
    try {
      const result = await autoAssignFeePlan(
        tenantId,
        student.id,
        student.gradeId,
        student.grade.academicYearId,
        session.user.id,
      );
      if (result) synced++; else skipped++;
    } catch (e) {
      console.error('[sync-accounts] failed for student', student.id, e);
      skipped++;
    }
  }

  return ok({ synced, skipped, total: orphans.length });
}
