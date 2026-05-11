import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { Board } from '@prisma/client';

interface GradeInput {
  name: string;
  displayOrder: number;
  sections: string[]; // e.g. ['A', 'B']
  isExamClass?: boolean;
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { academicYearId, grades } = await req.json() as {
    academicYearId: string;
    grades: GradeInput[];
  };

  if (!academicYearId || !Array.isArray(grades) || grades.length === 0) {
    return err('academicYearId and at least one grade are required');
  }

  const year = await db.academicYear.findFirst({
    where: { id: academicYearId, tenantId: session.user.tenantId },
  });
  if (!year) return err('Academic year not found', 404);

  const tenant = await db.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { board: true },
  });

  for (const g of grades) {
    const grade = await db.grade.create({
      data: {
        tenantId: session.user.tenantId,
        academicYearId,
        name: g.name,
        displayOrder: g.displayOrder,
        board: (tenant?.board ?? 'CBSE') as Board,
        isExamClass: g.isExamClass ?? false,
      },
    });

    for (const sectionName of g.sections) {
      await db.section.create({
        data: {
          tenantId: session.user.tenantId,
          academicYearId,
          gradeId: grade.id,
          name: sectionName,
        },
      });
    }
  }

  return ok({ created: grades.length });
}
