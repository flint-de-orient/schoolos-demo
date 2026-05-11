import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const year = new Date().getFullYear();

  // Find the most recently created admission number for this tenant
  const latest = await db.student.findFirst({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: 'desc' },
    select: { admissionNo: true },
  });

  if (!latest) {
    return ok({ admissionNo: `STU${year}-001` });
  }

  // Try to extract a trailing numeric part (e.g. "STU2025-042" → prefix="STU2025-", num=42)
  const match = latest.admissionNo.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const num = parseInt(match[2], 10);
    const padLen = match[2].length;
    const next = String(num + 1).padStart(padLen, '0');
    return ok({ admissionNo: `${prefix}${next}` });
  }

  // Fallback: count all students and append sequence
  const count = await db.student.count({ where: { tenantId: session.user.tenantId } });
  return ok({ admissionNo: `STU${year}-${String(count + 1).padStart(3, '0')}` });
}
