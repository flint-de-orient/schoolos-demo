import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') ?? undefined;

  const issues = await db.bookIssue.findMany({
    where: {
      book: { tenantId: session.user.tenantId },
      ...(status && { status: status as 'ISSUED' | 'RETURNED' | 'OVERDUE' }),
    },
    include: {
      book: { select: { id: true, title: true, author: true } },
      student: { select: { id: true, name: true, admissionNo: true } },
    },
    orderBy: { issuedAt: 'desc' },
  });

  // Auto-mark overdue
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueIds = issues
    .filter((i) => i.status === 'ISSUED' && new Date(i.dueDate) < today)
    .map((i) => i.id);

  if (overdueIds.length > 0) {
    await db.bookIssue.updateMany({
      where: { id: { in: overdueIds } },
      data: { status: 'OVERDUE' },
    });
    overdueIds.forEach((id) => {
      const issue = issues.find((i) => i.id === id);
      if (issue) issue.status = 'OVERDUE';
    });
  }

  return ok(issues);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { bookId, studentId, dueDate } = body;

  if (!bookId || !studentId || !dueDate) {
    return err('bookId, studentId and dueDate are required');
  }

  const book = await db.book.findFirst({
    where: { id: bookId, tenantId: session.user.tenantId },
  });
  if (!book) return err('Book not found', 404);
  if (book.available <= 0) return err('No copies available');

  const issue = await db.$transaction(async (tx) => {
    const i = await tx.bookIssue.create({
      data: {
        bookId,
        studentId,
        dueDate: new Date(dueDate),
        status: 'ISSUED',
      },
      include: {
        book: { select: { id: true, title: true, author: true } },
        student: { select: { id: true, name: true } },
      },
    });
    await tx.book.update({ where: { id: bookId }, data: { available: { decrement: 1 } } });
    return i;
  });

  return ok(issue, 201);
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { issueId, action } = body;

  if (!issueId || action !== 'return') return err('issueId and action=return required');

  const issue = await db.bookIssue.findFirst({
    where: { id: issueId, book: { tenantId: session.user.tenantId } },
  });
  if (!issue) return err('Issue not found', 404);
  if (issue.returnedAt) return err('Already returned');

  await db.$transaction(async (tx) => {
    await tx.bookIssue.update({
      where: { id: issueId },
      data: { returnedAt: new Date(), status: 'RETURNED' },
    });
    await tx.book.update({
      where: { id: issue.bookId },
      data: { available: { increment: 1 } },
    });
  });

  return ok({ success: true });
}
