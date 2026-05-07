import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const date = searchParams.get('date');

  const logs = await db.nurseLog.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(date && { date: new Date(date) }),
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          admissionNo: true,
          section: { include: { grade: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const stats = {
    visitsToday: await db.nurseLog.count({
      where: {
        tenantId: session.user.tenantId,
        date: { gte: today, lt: tomorrow },
      },
    }),
    referredToday: await db.nurseLog.count({
      where: {
        tenantId: session.user.tenantId,
        date: { gte: today, lt: tomorrow },
        referredToDoctor: true,
      },
    }),
    vaccinationsDue: await db.vaccinationDrive.count({
      where: {
        tenantId: session.user.tenantId,
        date: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  };

  return ok({ logs, stats });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { studentId, complaint, actionTaken, referredToDoctor, parentNotified, notes, time } = body;

  if (!studentId || !complaint) return err('studentId and complaint are required');

  const log = await db.nurseLog.create({
    data: {
      tenantId: session.user.tenantId,
      studentId,
      date: new Date(),
      time: time ?? new Date().toTimeString().slice(0, 5),
      complaint,
      actionTaken,
      referredToDoctor: referredToDoctor ?? false,
      parentNotified: parentNotified ?? false,
      notes,
    },
    include: {
      student: { select: { id: true, name: true, admissionNo: true } },
    },
  });

  return ok(log, 201);
}
