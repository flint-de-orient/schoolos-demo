import { Decimal } from '@prisma/client/runtime/library';

type ConTemplate = {
  type: string;        // 'PERCENTAGE' | 'FLAT'
  value: Decimal;
  maxAmount: Decimal | null;
};

type InstRow = {
  feeAccountId: string;
  planItemId: string | null;
  termLabel: string;
  amount: Decimal;
  dueDate: Date;
  paidAmount: Decimal;
  status: 'PENDING';
  lateFee: Decimal;
};

/** Compute total discount for a set of concession templates against a gross amount. */
export function computeDiscount(grossTotal: Decimal, templates: ConTemplate[]): Decimal {
  if (templates.length === 0 || grossTotal.isZero()) return new Decimal(0);

  let totalDiscount = new Decimal(0);
  for (const ct of templates) {
    let discount: Decimal;
    if (ct.type === 'PERCENTAGE') {
      discount = grossTotal.mul(ct.value).div(100).toDecimalPlaces(2);
      if (ct.maxAmount && discount.gt(ct.maxAmount)) {
        discount = new Decimal(ct.maxAmount).toDecimalPlaces(2);
      }
    } else {
      // FLAT
      discount = new Decimal(ct.value).toDecimalPlaces(2);
    }
    totalDiscount = totalDiscount.add(discount);
  }
  // Never discount more than the full amount
  return totalDiscount.gt(grossTotal) ? grossTotal.toDecimalPlaces(2) : totalDiscount;
}

/**
 * Scale installment amounts proportionally so they sum to (grossTotal - discount).
 * Rounding leftover cents are added to the last installment.
 */
export function applyDiscountToInstallments(
  installments: InstRow[],
  grossTotal: Decimal,
  discount: Decimal,
): InstRow[] {
  if (installments.length === 0 || grossTotal.isZero() || discount.isZero()) {
    return installments;
  }

  const netTotal = grossTotal.sub(discount);
  const scaleFactor = netTotal.div(grossTotal);

  let runningSum = new Decimal(0);
  const scaled: InstRow[] = installments.map((inst, i) => {
    const isLast = i === installments.length - 1;
    let amt: Decimal;
    if (isLast) {
      // Assign remainder to avoid floating-point drift
      amt = netTotal.sub(runningSum).toDecimalPlaces(2);
    } else {
      amt = inst.amount.mul(scaleFactor).toDecimalPlaces(2);
      runningSum = runningSum.add(amt);
    }
    return { ...inst, amount: amt };
  });

  return scaled;
}
