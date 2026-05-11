import { sendWhatsAppTemplate } from '@/lib/whatsapp';
import { db } from '@/lib/db';

async function getTenantInfo(tenantId: string) {
  return db.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, phone: true },
  });
}

// Template 1: student_absent_alert
export async function notifyAbsent(
  tenantId: string,
  parentPhone: string,
  parentName: string,
  studentName: string,
  className: string,
  date: string
) {
  const tenant = await getTenantInfo(tenantId);
  if (!tenant) return;

  await sendWhatsAppTemplate(tenantId, parentPhone, 'student_absent_alert', [
    parentName,
    studentName,
    className,
    date,
    tenant.name,
    tenant.phone ?? 'the school office',
  ]);
}

// Template 2: fee_payment_reminder
export async function notifyFeeOverdue(
  tenantId: string,
  parentPhone: string,
  parentName: string,
  amount: number,
  studentName: string,
  term: string,
  dueDate: string,
  receiptRef: string
) {
  const tenant = await getTenantInfo(tenantId);
  if (!tenant) return;

  await sendWhatsAppTemplate(
    tenantId,
    parentPhone,
    'fee_payment_reminder',
    [
      tenant.name,
      parentName,
      amount.toLocaleString('en-IN'),
      studentName,
      term,
      dueDate,
      tenant.phone ?? 'the school office',
    ],
    receiptRef // dynamic URL suffix → /pay/{receiptRef}
  );
}

// Template 3: admission_stage_update
export async function notifyAdmissionStage(
  tenantId: string,
  parentPhone: string,
  parentName: string,
  studentName: string,
  className: string,
  stage: string
) {
  const tenant = await getTenantInfo(tenantId);
  if (!tenant) return;

  await sendWhatsAppTemplate(tenantId, parentPhone, 'admission_stage_update', [
    tenant.name,
    parentName,
    studentName,
    className,
    stage,
    tenant.name,
    tenant.phone ?? 'the school office',
  ]);
}

// Template 4: exam_timetable_notification
export async function notifyExamTimetable(
  tenantId: string,
  parentPhone: string,
  parentName: string,
  studentName: string,
  className: string,
  firstSubject: string,
  firstDate: string,
  firstTime: string
) {
  const tenant = await getTenantInfo(tenantId);
  if (!tenant) return;

  await sendWhatsAppTemplate(tenantId, parentPhone, 'exam_timetable_notification', [
    tenant.name,
    parentName,
    studentName,
    className,
    firstSubject,
    firstDate,
    firstTime,
    tenant.phone ?? 'the school office',
  ]);
}

// Template 5: fee_payment_confirmation
export async function notifyFeeConfirmed(
  tenantId: string,
  parentPhone: string,
  parentName: string,
  amount: number,
  studentName: string,
  paidDate: string,
  receiptNo: string
) {
  const tenant = await getTenantInfo(tenantId);
  if (!tenant) return;

  await sendWhatsAppTemplate(
    tenantId,
    parentPhone,
    'fee_payment_confirmation',
    [
      tenant.name,
      parentName,
      amount.toLocaleString('en-IN'),
      studentName,
      paidDate,
      receiptNo,
      tenant.name,
    ],
    receiptNo // dynamic URL suffix → /receipts/{receiptNo}
  );
}
