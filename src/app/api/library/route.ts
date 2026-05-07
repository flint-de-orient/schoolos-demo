import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('q') ?? '';
  const genre = searchParams.get('genre') ?? '';

  const books = await db.book.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { author: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(genre && { genre }),
    },
    include: {
      issues: {
        where: { status: 'ISSUED' },
        include: {
          student: { select: { id: true, name: true, admissionNo: true } },
        },
      },
    },
    orderBy: { title: 'asc' },
  });

  const stats = {
    totalBooks: await db.book.count({ where: { tenantId: session.user.tenantId } }),
    totalIssued: await db.bookIssue.count({
      where: { book: { tenantId: session.user.tenantId }, status: 'ISSUED' },
    }),
    overdueCount: await db.bookIssue.count({
      where: {
        book: { tenantId: session.user.tenantId },
        status: 'OVERDUE',
      },
    }),
  };

  const genres = await db.book.findMany({
    where: { tenantId: session.user.tenantId, genre: { not: null } },
    select: { genre: true },
    distinct: ['genre'],
  });

  return ok({ books, stats, genres: genres.map((g) => g.genre).filter(Boolean) });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { title, author, isbn, genre, publisher, copies } = body;

  if (!title || !author) return err('title and author are required');

  const book = await db.book.create({
    data: {
      tenantId: session.user.tenantId,
      title,
      author,
      isbn,
      genre,
      publisher,
      copies: copies ?? 1,
      available: copies ?? 1,
    },
  });

  return ok(book, 201);
}
