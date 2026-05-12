import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const policies = await db.leavePolicy.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { leaveType: 'asc' },
    include: { cascadeTo: { select: { id: true, leaveType: true, label: true } } },
  });

  return ok({ policies });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const {
    leaveType, label, color, daysAllowed, isCarryOver, maxCarryOver,
    isPaid, isEncashable, requiresApproval, maxConsecutiveDays,
    minServiceDays, description, roleTypes,
    exceededPolicy, cascadeToId, requiresDocument, advanceMaxDays,
  } = body;

  if (!leaveType?.trim()) return err('leaveType is required');
  if (daysAllowed === undefined || daysAllowed < 0) return err('daysAllowed must be >= 0');

  const existing = await db.leavePolicy.findUnique({
    where: { tenantId_leaveType: { tenantId: session.user.tenantId, leaveType: leaveType.trim().toUpperCase() } },
    select: { id: true },
  });
  if (existing) return err(`Leave type "${leaveType}" already exists`, 409);

  const policy = await db.leavePolicy.create({
    data: {
      tenantId: session.user.tenantId,
      leaveType: leaveType.trim().toUpperCase(),
      label: label?.trim() || leaveType.trim(),
      color: color || '#1E2761',
      daysAllowed: Number(daysAllowed),
      isCarryOver: !!isCarryOver,
      maxCarryOver: isCarryOver && maxCarryOver ? Number(maxCarryOver) : null,
      isPaid: isPaid !== false,
      isEncashable: !!isEncashable,
      requiresApproval: requiresApproval !== false,
      maxConsecutiveDays: maxConsecutiveDays ? Number(maxConsecutiveDays) : null,
      minServiceDays: minServiceDays ? Number(minServiceDays) : null,
      description: description?.trim() || null,
      roleTypes: Array.isArray(roleTypes) ? roleTypes : ['ALL'],
      exceededPolicy: exceededPolicy ?? 'RESTRICT',
      cascadeToId: exceededPolicy === 'CASCADE' && cascadeToId ? cascadeToId : null,
      requiresDocument: exceededPolicy === 'APPROVAL_REQUIRED' ? !!requiresDocument : false,
      advanceMaxDays: exceededPolicy === 'ADVANCE' && advanceMaxDays ? Number(advanceMaxDays) : null,
    },
  });

  return ok(policy, 201);
}
