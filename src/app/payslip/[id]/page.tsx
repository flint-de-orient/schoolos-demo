'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

// ── Indian number-to-words ─────────────────────────────────────────────────────

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertHundreds(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n] + ' ';
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '') + ' ';
  return ONES[Math.floor(n / 100)] + ' Hundred ' + convertHundreds(n % 100);
}

function numberToWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';
  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);
  let result = '';
  let n = rupees;
  if (n >= 10000000) { result += convertHundreds(Math.floor(n / 10000000)) + 'Crore '; n %= 10000000; }
  if (n >= 100000)   { result += convertHundreds(Math.floor(n / 100000))   + 'Lakh ';  n %= 100000; }
  if (n >= 1000)     { result += convertHundreds(Math.floor(n / 1000))     + 'Thousand '; n %= 1000; }
  if (n > 0)         { result += convertHundreds(n); }
  result = result.trim() + ' Rupees';
  if (paise > 0) result += ' and ' + convertHundreds(paise).trim() + ' Paise';
  return result + ' Only';
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface SalaryComponent { label: string; percent?: number; flat?: number; amount: number }
interface PayslipData {
  payroll: {
    id: string; month: number; year: number;
    basic: number; allowances: number; netPay: number;
    pfDeduction: number; tdsDeduction: number; otherDeductions: number;
    status: string; paidAt: string | null;
    staffId: string | null; teacherId: string | null;
  };
  employee: {
    id: string; employeeCode: string; name: string; designation: string | null;
    department: string | null; email: string | null; phone: string | null;
    joiningDate: string | null;
  } | null;
  employeeType: string;
  components: {
    basic: number;
    hra: SalaryComponent; da: SalaryComponent; ta: SalaryComponent;
    medical: SalaryComponent; special: SalaryComponent;
    pf: SalaryComponent; professionalTax: SalaryComponent; tds: SalaryComponent;
  };
  tenant: {
    name: string; shortName: string; address: string | null; phone: string | null;
    email: string | null; headName: string; headTitle: string; city: string; state: string;
  } | null;
}

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtINR(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PayslipPage() {
  const params = useParams<{ id: string }>();
  const [data, setData]     = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/hr/payroll/${params.id}/payslip`)
      .then(r => r.json())
      .then(j => {
        const d = j.data ?? j;
        if (d.error) { setFetchError(d.error); return; }
        setData(d);
      })
      .catch(() => setFetchError('Failed to load payslip'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading payslip…</p>
      </div>
    </div>
  );

  if (fetchError || !data?.employee) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <p className="text-red-500 font-semibold">{fetchError ?? 'Payslip not found'}</p>
        <button onClick={() => window.close()} className="mt-4 text-sm text-blue-600 underline">Close</button>
      </div>
    </div>
  );

  const { payroll, employee, employeeType, components, tenant } = data;
  const monthName = MONTH_NAMES[payroll.month - 1] ?? '—';

  const earnings = [
    { label: 'Basic Salary', note: '', amount: components.basic },
    ...(components.hra.amount  > 0 ? [{ label: 'House Rent Allowance',  note: `${components.hra.percent}% of Basic`, amount: components.hra.amount }] : []),
    ...(components.da.amount   > 0 ? [{ label: 'Dearness Allowance',    note: `${components.da.percent}% of Basic`,  amount: components.da.amount  }] : []),
    ...(components.ta.amount   > 0 ? [{ label: 'Transport Allowance',   note: 'Fixed',                               amount: components.ta.amount  }] : []),
    ...(components.medical.amount > 0 ? [{ label: 'Medical Allowance',  note: 'Fixed',                               amount: components.medical.amount }] : []),
    ...(components.special.amount > 0 ? [{ label: 'Special Allowance',  note: `${components.special.percent}% of Basic`, amount: components.special.amount }] : []),
  ];

  const deductions = [
    ...(components.pf.amount > 0 ? [{ label: 'Provident Fund (EPF)', note: `${components.pf.percent}% of Basic`, amount: components.pf.amount }] : []),
    ...(components.professionalTax.amount > 0 ? [{ label: 'Professional Tax', note: 'Fixed', amount: components.professionalTax.amount }] : []),
    ...(components.tds.amount > 0 ? [{ label: 'Income Tax (TDS)', note: 'As applicable', amount: components.tds.amount }] : []),
  ];

  const grossEarnings   = earnings.reduce((s, e) => s + e.amount, 0);
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const netPay          = Math.round(Number(payroll.netPay));

  const schoolName    = tenant?.name ?? 'Sundarban Academy';
  const schoolAddress = tenant?.address ?? 'Kolkata, West Bengal — 700001';
  const headName      = tenant?.headName ?? 'Principal';
  const headTitle     = tenant?.headTitle ?? 'Principal';

  const payslipNo = `SAK/${payroll.year}/${String(payroll.month).padStart(2,'0')}/${employee.employeeCode}`;
  const genDate   = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <>
      {/* ── Toolbar (hidden on print) ─────────────────────────────────────────── */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div>
          <p className="font-semibold text-gray-800 text-sm">{employee.name} — {monthName} {payroll.year}</p>
          <p className="text-xs text-gray-400">{payslipNo}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="bg-[#1E2761] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#2E3E8C] transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Save PDF
          </button>
          <button
            onClick={() => window.close()}
            className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* ── A4 Payslip ────────────────────────────────────────────────────────── */}
      <div className="bg-gray-100 min-h-screen py-8 print:bg-white print:p-0 print:min-h-0">
        <div
          id="payslip"
          className="w-[210mm] mx-auto bg-white print:w-full print:shadow-none shadow-xl"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {/* ── Letterhead ── */}
          <div className="bg-[#1E2761] text-white px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/15 rounded-xl flex items-center justify-center border border-white/20 flex-shrink-0">
                <span className="font-bold text-xl" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {tenant?.shortName?.slice(0,2).toUpperCase() ?? 'SA'}
                </span>
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {schoolName}
                </h1>
                <p className="text-xs text-blue-200 mt-0.5">{schoolAddress}</p>
                {tenant?.phone && <p className="text-xs text-blue-200">{tenant.phone}{tenant.email ? ` · ${tenant.email}` : ''}</p>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-blue-200 uppercase tracking-widest">Salary Slip</div>
              <div className="text-2xl font-bold mt-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
                {monthName} {payroll.year}
              </div>
              <div className="text-[10px] text-blue-200 mt-1">Pay Date: 28 {monthName} {payroll.year}</div>
            </div>
          </div>

          {/* ── Payslip No. + Status bar ── */}
          <div className="bg-[#F5C542] px-8 py-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#1E2761] uppercase tracking-wide">
              Payslip No.: {payslipNo}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wide px-3 py-0.5 rounded-full ${
              payroll.status === 'PAID' ? 'bg-green-700 text-white' : 'bg-amber-700 text-white'
            }`}>
              {payroll.status}
            </span>
          </div>

          {/* ── Employee Details ── */}
          <div className="px-8 py-5 border-b border-gray-200">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Employee Information</h2>
            <div className="grid grid-cols-3 gap-x-6 gap-y-2.5">
              {[
                ['Employee Name',    employee.name],
                ['Employee Code',    employee.employeeCode],
                ['Designation',      employee.designation ?? '—'],
                ['Department',       employee.department ?? '—'],
                ['Employment Type',  employeeType],
                ['Date of Joining',  fmtDate(employee.joiningDate)],
                ['PAN No.',          'XXXXX' + (employee.employeeCode ?? '').slice(-4) + 'X'],
                ['PF (UAN)',         '10023' + (employee.employeeCode ?? '').slice(-7)],
                ['Bank A/C',         'XXXX XXXX ' + (employee.employeeCode ?? '0000').slice(-4)],
                ['IFSC Code',        'SBIN0000999'],
                ['Working Days',     '26'],
                ['Days Paid',        payroll.status === 'PAID' ? '26' : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</div>
                  <div className="text-xs font-semibold text-gray-800 mt-0.5">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Earnings & Deductions ── */}
          <div className="px-8 py-5 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-6">
              {/* Earnings */}
              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 pb-1.5 border-b-2 border-[#1E2761]">
                  Earnings
                </h2>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[9px] text-gray-400 uppercase tracking-wide">
                      <th className="text-left pb-1.5 font-semibold">Component</th>
                      <th className="text-left pb-1.5 font-semibold">Basis</th>
                      <th className="text-right pb-1.5 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.map(row => (
                      <tr key={row.label} className="border-t border-gray-100">
                        <td className="py-1.5 text-gray-700">{row.label}</td>
                        <td className="py-1.5 text-gray-400 text-[10px]">{row.note}</td>
                        <td className="py-1.5 text-right font-semibold text-gray-800">{fmtINR(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#1E2761] bg-[#E8EFFE]">
                      <td colSpan={2} className="py-2 pl-1 text-xs font-bold text-[#1E2761]">Gross Earnings (A)</td>
                      <td className="py-2 text-right font-bold text-[#1E2761]">{fmtINR(grossEarnings)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Deductions */}
              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 pb-1.5 border-b-2 border-[#D85A30]">
                  Deductions
                </h2>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[9px] text-gray-400 uppercase tracking-wide">
                      <th className="text-left pb-1.5 font-semibold">Component</th>
                      <th className="text-left pb-1.5 font-semibold">Basis</th>
                      <th className="text-right pb-1.5 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deductions.length > 0 ? deductions.map(row => (
                      <tr key={row.label} className="border-t border-gray-100">
                        <td className="py-1.5 text-gray-700">{row.label}</td>
                        <td className="py-1.5 text-gray-400 text-[10px]">{row.note}</td>
                        <td className="py-1.5 text-right font-semibold text-gray-800">{fmtINR(row.amount)}</td>
                      </tr>
                    )) : (
                      <tr className="border-t border-gray-100">
                        <td colSpan={3} className="py-2 text-gray-400 text-center italic text-[10px]">No deductions</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#D85A30] bg-red-50">
                      <td colSpan={2} className="py-2 pl-1 text-xs font-bold text-[#D85A30]">Total Deductions (B)</td>
                      <td className="py-2 text-right font-bold text-[#D85A30]">{fmtINR(totalDeductions)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* ── Net Pay ── */}
          <div className="px-8 py-5 bg-[#1E2761] text-white flex items-center justify-between">
            <div>
              <div className="text-[10px] text-blue-200 uppercase tracking-widest">Net Pay (A − B)</div>
              <div className="text-3xl font-bold mt-1" style={{ fontFamily: 'Sora, sans-serif' }}>
                {fmtINR(netPay)}
              </div>
              <div className="text-[11px] text-[#F5C542] mt-1 font-medium italic">
                {numberToWords(netPay)}
              </div>
            </div>
            <div className="text-right text-xs text-blue-200 space-y-1">
              {payroll.paidAt && (
                <div>Paid On: <span className="text-white font-semibold">{fmtDate(payroll.paidAt)}</span></div>
              )}
              <div>Gross: <span className="text-white font-semibold">{fmtINR(grossEarnings)}</span></div>
              <div>Deductions: <span className="text-white font-semibold">{fmtINR(totalDeductions)}</span></div>
            </div>
          </div>

          {/* ── Signature Row ── */}
          <div className="px-8 py-6 grid grid-cols-3 gap-4 border-t border-gray-200">
            <div className="text-center">
              <div className="h-12" />
              <div className="border-t border-gray-400 pt-2">
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Employee Signature</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{employee.name}</p>
              </div>
            </div>
            <div className="text-center flex flex-col items-center justify-end">
              <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center mb-2">
                <span className="text-[9px] text-gray-300 text-center leading-tight">School<br/>Seal</span>
              </div>
            </div>
            <div className="text-center">
              <div className="h-12" />
              <div className="border-t border-gray-400 pt-2">
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Authorised Signatory</p>
                <p className="text-[10px] text-gray-700 font-semibold mt-0.5">{headName}</p>
                <p className="text-[10px] text-gray-400">{headTitle}, {schoolName}</p>
              </div>
            </div>
          </div>

          {/* ── Footer disclaimer ── */}
          <div className="px-8 pb-5 border-t border-gray-100">
            <div className="bg-gray-50 rounded-lg px-4 py-3 mt-3">
              <p className="text-[9px] text-gray-500 text-center leading-relaxed">
                This is a <strong>computer-generated salary slip</strong> and is legally valid without a physical signature as per the Payment of Wages Act, 1936 and the relevant state Shops &amp; Establishments Act.
                PF contributions are remitted to EPFO under the Employees&apos; Provident Funds &amp; Miscellaneous Provisions Act, 1952.
                For disputes or queries, contact the HR Department within 30 days of issuance.
              </p>
              <p className="text-[9px] text-gray-400 text-center mt-1.5">
                Generated on {genDate} · Payslip Ref: {payslipNo} · {schoolName}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          html, body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          #payslip {
            width: 100% !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  );
}
