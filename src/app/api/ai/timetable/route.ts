import { NextRequest } from 'next/server';
import { requireSession, ok, err } from '@/lib/api-auth';
import { generateTimetableWithAI } from '@/lib/ai/timetable-engine';
import { db } from '@/lib/db';
import { AIJobStatus, AIJobType } from '@prisma/client';

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { academicYearId, label } = body;

  if (!academicYearId) return err('academicYearId is required');

  const ttLabel = label ?? `AI Timetable ${new Date().toLocaleDateString('en-IN')}`;

  // Verify academic year belongs to tenant
  const ay = await db.academicYear.findFirst({
    where: { id: academicYearId, tenantId: session.user.tenantId },
  });
  if (!ay) return err('Academic year not found', 404);

  // Create AI job record
  const job = await db.aIJob.create({
    data: {
      tenantId: session.user.tenantId,
      type: AIJobType.TIMETABLE_GENERATE,
      status: AIJobStatus.RUNNING,
      startedAt: new Date(),
      inputJson: { academicYearId, label: ttLabel },
    },
  });

  try {
    const result = await generateTimetableWithAI(
      session.user.tenantId,
      academicYearId,
      ttLabel
    );

    await db.aIJob.update({
      where: { id: job.id },
      data: {
        status: result.success ? AIJobStatus.DONE : AIJobStatus.FAILED,
        completedAt: new Date(),
        outputJson: result as unknown as import('@prisma/client').Prisma.JsonObject,
        promptTokens: result.tokensUsed ?? 0,
        errorMsg: result.error,
      },
    });

    if (!result.success) return err(result.error ?? 'Generation failed', 500);

    return ok({
      jobId: job.id,
      timetableId: result.timetableId,
      qualityScore: result.qualityScore,
      conflictsFound: result.conflictsFound,
      totalEntries: result.entries?.length ?? 0,
      tokensUsed: result.tokensUsed,
      label: ttLabel,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    await db.aIJob.update({
      where: { id: job.id },
      data: { status: AIJobStatus.FAILED, completedAt: new Date(), errorMsg: msg },
    });
    return err(`Timetable generation failed: ${msg}`, 500);
  }
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const jobId = searchParams.get('jobId');

  if (jobId) {
    const job = await db.aIJob.findFirst({
      where: { id: jobId, tenantId: session.user.tenantId },
    });
    if (!job) return err('Job not found', 404);
    return ok(job);
  }

  // List recent generation jobs
  const jobs = await db.aIJob.findMany({
    where: {
      tenantId: session.user.tenantId,
      type: AIJobType.TIMETABLE_GENERATE,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return ok({ data: jobs });
}
