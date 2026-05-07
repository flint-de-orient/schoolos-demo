import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const years = await db.academicYear.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { startDate: 'desc' },
  });

  // Enrich with counts
  const enriched = await Promise.all(
    years.map(async (y) => {
      const [gradeCount, studentCount] = await Promise.all([
        db.grade.count({ where: { tenantId: session.user.tenantId, academicYearId: y.id } }),
        db.student.count({
          where: {
            tenantId: session.user.tenantId,
            isActive: true,
            deletedAt: null,
            grade: { academicYearId: y.id },
          },
        }),
      ]);
      return { ...y, gradeCount, studentCount };
    })
  );

  return ok(enriched);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { label, startDate, endDate, isCurrent } = body;

  if (!label || !startDate || !endDate) {
    return err('label, startDate and endDate are required');
  }

  const existing = await db.academicYear.findUnique({
    where: { tenantId_label: { tenantId: session.user.tenantId, label } },
  });
  if (existing) return err(`Academic year "${label}" already exists`, 409);

  const year = await db.$transaction(async (tx) => {
    if (isCurrent) {
      await tx.academicYear.updateMany({
        where: { tenantId: session.user.tenantId },
        data: { isCurrent: false },
      });
    }
    return tx.academicYear.create({
      data: {
        tenantId: session.user.tenantId,
        label,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: isCurrent ?? false,
      },
    });
  });

  return ok(year, 201);
}
