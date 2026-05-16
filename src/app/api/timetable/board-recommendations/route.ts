import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';
import { BOARD_SEED } from '@/lib/board-syllabus-seed';

// Map Prisma Board enum to the string keys used in seed data
const BOARD_MAP: Record<string, string> = {
  WBBSE: 'WBBSE',
  CBSE:  'CBSE',
  CISCE: 'CISCE',
  OTHER: 'CBSE', // fallback to CBSE for OTHER boards
};

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const gradeLevel = searchParams.get('gradeLevel') ?? 'Secondary';

  // Get the tenant's board
  const tenant = await db.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { board: true },
  });

  const boardKey = BOARD_MAP[tenant?.board ?? 'CBSE'] ?? 'CBSE';

  // Auto-seed if this board+gradeLevel combo has no records yet
  const existingCount = await db.boardSyllabusRecommendation.count({
    where: { board: boardKey, gradeLevel },
  });

  if (existingCount === 0) {
    const toSeed = BOARD_SEED.filter(r => r.board === boardKey && r.gradeLevel === gradeLevel);
    if (toSeed.length > 0) {
      await db.boardSyllabusRecommendation.createMany({
        data: toSeed.map(r => ({
          board:       r.board,
          gradeLevel:  r.gradeLevel,
          subjectName: r.subjectName,
          theoryPPW:   r.theoryPPW,
          labPPW:      r.labPPW,
          notes:       r.notes ?? null,
        })),
        skipDuplicates: true,
      });
    }
  }

  const recommendations = await db.boardSyllabusRecommendation.findMany({
    where: { board: boardKey, gradeLevel },
    orderBy: { subjectName: 'asc' },
  });

  return ok({ board: boardKey, gradeLevel, recommendations });
}
