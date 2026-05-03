'use client';

import { useState, useMemo } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import ChatBot from '@/components/shared/ChatBot';
import { toast } from 'sonner';
import {
  Home, CalendarCheck, BookOpen, ClipboardList, CreditCard,
  Heart, Bell, CheckCircle2, Clock,
  AlertCircle, Star, Award, MessageSquare, IndianRupee,
  Phone, Bus, MapPin, GraduationCap, Check, ChevronDown,
  Calendar, Activity, ShieldCheck, Download,
  ShoppingBag, Plus, Minus, X, Trash2, Package,
  Smartphone, Building2, Wallet, QrCode,
  ShieldAlert,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import studentsData from '@/data/students.json';
import feeData from '@/data/fee.json';
import homeworkData from '@/data/homework.json';
import healthData from '@/data/health.json';
import shopData from '@/data/shop-inventory.json';
import AIBadge from '@/components/shared/AIBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

type PortalTab = 'home' | 'attendance' | 'academics' | 'homework' | 'fee' | 'health' | 'notices' | 'shop';
type PayMethod = 'upi' | 'card' | 'netbanking' | 'wallet';

type CartItem = {
  id: string; name: string; emoji: string; price: number;
  qty: number; size?: string; category: string;
};

type Order = {
  id: string; date: string; items: CartItem[];
  total: number; status: 'Delivered' | 'Processing' | 'Pending';
  paymentMethod: string; receiptNo: string;
};

type PaymentCtx = {
  amount: number;
  description: string;
  onSuccess: (method: string, refNo: string) => void;
};

// ─── Static data ──────────────────────────────────────────────────────────────

const CHILDREN_IDS = ['STU001', 'STU002'];

const ANNOUNCEMENTS = [
  { id: 1, date: '2026-04-10', title: 'Annual Sports Day — 20 April', body: 'Annual Sports Day will be held on 20th April 2026. All parents are invited. Reporting time for students: 7:30 AM.', type: 'event', pinned: true },
  { id: 2, date: '2026-04-09', title: 'Pre-Board Examination Schedule', body: 'Pre-Board examinations for Class X and XII begin from 25th April 2026. Hall tickets issued from 15th April.', type: 'exam', pinned: true },
  { id: 3, date: '2026-04-08', title: 'Parent-Teacher Meeting — 18 April', body: 'PTM scheduled for 18th April 2026, 10 AM – 1 PM. Please book your slot with the class teacher.', type: 'meeting', pinned: false },
  { id: 4, date: '2026-04-07', title: 'Library Books Due Return', body: 'All library books issued before 1st April must be returned by 15th April 2026 to avoid late fees.', type: 'notice', pinned: false },
  { id: 5, date: '2026-04-06', title: 'School Fee Due — Term 2', body: 'Term 2 fee payment deadline is 30th April 2026. Online payment available via school portal.', type: 'fee', pinned: false },
];

const EVENTS = [
  { date: '2026-04-18', label: 'Parent-Teacher Meeting',  type: 'meeting' },
  { date: '2026-04-20', label: 'Annual Sports Day',        type: 'event' },
  { date: '2026-04-25', label: 'Pre-Board Exams Begin',   type: 'exam' },
  { date: '2026-05-02', label: 'Science Fair',             type: 'event' },
  { date: '2026-05-20', label: 'Summer Vacation Begins',  type: 'holiday' },
];

const MONTHLY_ATTENDANCE = [
  { month: 'Nov', pct: 92 }, { month: 'Dec', pct: 88 },
  { month: 'Jan', pct: 95 }, { month: 'Feb', pct: 87 },
  { month: 'Mar', pct: 90 }, { month: 'Apr', pct: 85 },
];

const INITIAL_ORDERS: Order[] = [
  { id: 'ORD001', date: '2026-03-12', items: [{ id:'SHP001',name:'School Shirt (White)',emoji:'👕',price:450,qty:2,size:'M',category:'Uniform' }], total: 900, status: 'Delivered', paymentMethod: 'UPI', receiptNo: 'RCP2026-S101' },
  { id: 'ORD002', date: '2026-03-01', items: [{ id:'SHP007',name:'Notebook Set (5 pcs)',emoji:'📓',price:150,qty:3,category:'Books & Stationery' }], total: 450, status: 'Delivered', paymentMethod: 'Wallet', receiptNo: 'RCP2026-S102' },
];

const TYPE_CFG: Record<string, { bg: string; text: string; border: string }> = {
  event:   { bg: 'bg-teal/10',   text: 'text-teal',   border: 'border-teal/20' },
  exam:    { bg: 'bg-coral/10',  text: 'text-coral',  border: 'border-coral/20' },
  meeting: { bg: 'bg-purple/10', text: 'text-purple', border: 'border-purple/20' },
  notice:  { bg: 'bg-navy/10',   text: 'text-navy',   border: 'border-navy/20' },
  fee:     { bg: 'bg-amber/10',  text: 'text-amber',  border: 'border-amber/20' },
  holiday: { bg: 'bg-green/10',  text: 'text-green',  border: 'border-green/20' },
};

const SHOP_CATS = ['All', ...shopData.categories];
const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra', 'Bank of Baroda', 'Punjab National Bank'];

const fmtAmt  = (n: number) => '₹' + n.toLocaleString('en-IN');
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const today   = '2026-04-10';

// ─── Payment Modal ────────────────────────────────────────────────────────────

function PaymentModal({ ctx, walletBalance, onClose }: {
  ctx: PaymentCtx;
  walletBalance: number;
  onClose: () => void;
}) {
  const [method, setMethod]     = useState<PayMethod>('upi');
  const [upiId, setUpiId]       = useState('');
  const [bank, setBank]         = useState(BANKS[0]);
  const [cardNo, setCardNo]     = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry]     = useState('');
  const [cvv, setCvv]           = useState('');
  const [step, setStep]         = useState<'form' | 'processing' | 'success'>('form');
  const [refNo, setRefNo]       = useState('');

  const fmtCard = (v: string) => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const fmtExp  = (v: string) => { const d = v.replace(/\D/g,'').slice(0,4); return d.length > 2 ? `${d.slice(0,2)}/${d.slice(2)}` : d; };

  const canPay = () => {
    if (method === 'upi')        return upiId.includes('@');
    if (method === 'card')       return cardNo.replace(/\s/g,'').length === 16 && cardName && expiry.length === 5 && cvv.length === 3;
    if (method === 'netbanking') return !!bank;
    if (method === 'wallet')     return walletBalance >= ctx.amount;
    return false;
  };

  const pay = () => {
    if (!canPay()) return;
    setStep('processing');
    const ref = `REF${Date.now().toString().slice(-8)}`;
    setRefNo(ref);
    setTimeout(() => {
      setStep('success');
      ctx.onSuccess(
        method === 'upi' ? 'UPI' : method === 'card' ? 'Card' : method === 'netbanking' ? 'Net Banking' : 'Wallet',
        ref
      );
    }, 1800);
  };

  const METHODS: { id: PayMethod; label: string; icon: React.ElementType; note: string }[] = [
    { id: 'upi',        label: 'UPI',         icon: Smartphone,  note: 'GPay, PhonePe, Paytm' },
    { id: 'card',       label: 'Card',         icon: CreditCard,  note: 'Debit / Credit' },
    { id: 'netbanking', label: 'Net Banking',  icon: Building2,   note: 'All major banks' },
    { id: 'wallet',     label: 'School Wallet',icon: Wallet,      note: fmtAmt(walletBalance) + ' available' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:w-auto sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-navy px-5 pt-5 pb-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-sora font-bold text-lg">
              {step === 'success' ? 'Payment Successful!' : 'Complete Payment'}
            </h2>
            <button onClick={onClose} className="text-ice/60 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          {step !== 'success' && (
            <div className="bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-ice/70 text-xs">{ctx.description}</p>
                <p className="font-sora font-bold text-gold text-2xl">{fmtAmt(ctx.amount)}</p>
              </div>
              <IndianRupee className="w-8 h-8 text-gold/60" />
            </div>
          )}
        </div>

        {/* Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 border-4 border-navy/20 border-t-navy rounded-full animate-spin mb-4" />
            <p className="font-sora font-semibold text-navy">Processing payment…</p>
            <p className="text-sm text-gray-500 mt-1">Please do not close this window</p>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <p className="font-sora font-bold text-navy text-xl mb-1">Payment Confirmed</p>
            <p className="text-3xl font-sora font-bold text-green-600 mb-3">{fmtAmt(ctx.amount)}</p>
            <div className="bg-gray-50 rounded-xl p-4 w-full text-left space-y-2 mb-4">
              {[
                { l: 'Reference No', v: refNo },
                { l: 'Payment Method', v: method === 'upi' ? 'UPI' : method === 'card' ? 'Card' : method === 'netbanking' ? 'Net Banking' : 'School Wallet' },
                { l: 'Date & Time', v: new Date().toLocaleString('en-IN', { day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) },
              ].map(r => (
                <div key={r.l} className="flex justify-between text-sm">
                  <span className="text-gray-500">{r.l}</span>
                  <span className="font-semibold text-gray-800">{r.v}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => toast.success('Receipt downloaded')}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50">
                <Download className="w-4 h-4 inline mr-1.5" />Receipt
              </button>
              <button onClick={onClose} className="flex-1 py-2.5 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navyMid">
                Done
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        {step === 'form' && (
          <div className="p-5 space-y-4">
            {/* Method selector */}
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map(m => {
                const Icon = m.icon;
                const insufficient = m.id === 'wallet' && walletBalance < ctx.amount;
                return (
                  <button key={m.id} onClick={() => !insufficient && setMethod(m.id)} disabled={insufficient}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                      method === m.id ? 'border-navy bg-navy/5' : insufficient ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${method === m.id ? 'bg-navy' : 'bg-gray-100'}`}>
                      <Icon className={`w-4 h-4 ${method === m.id ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold leading-tight ${method === m.id ? 'text-navy' : 'text-gray-700'}`}>{m.label}</p>
                      <p className="text-[10px] text-gray-400 truncate">{insufficient ? 'Insufficient balance' : m.note}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* UPI */}
            {method === 'upi' && (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <div className="w-32 h-32 border-2 border-navy/20 rounded-xl flex flex-col items-center justify-center bg-gray-50">
                    <QrCode className="w-16 h-16 text-navy/30" />
                    <p className="text-[10px] text-gray-400 mt-1">Scan to pay</p>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 bg-white px-2">or enter UPI ID</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                </div>
                <input placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 mt-2" />
              </div>
            )}

            {/* Card */}
            {method === 'card' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Card Number</label>
                  <input placeholder="1234 5678 9012 3456" value={cardNo} onChange={e => setCardNo(fmtCard(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy/20" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Cardholder Name</label>
                  <input placeholder="As printed on card" value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Expiry</label>
                    <input placeholder="MM/YY" value={expiry} onChange={e => setExpiry(fmtExp(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy/20" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">CVV</label>
                    <input placeholder="•••" type="password" maxLength={3} value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g,''))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy/20" />
                  </div>
                </div>
              </div>
            )}

            {/* Net Banking */}
            {method === 'netbanking' && (
              <div className="grid grid-cols-1 gap-2">
                {BANKS.map(b => (
                  <button key={b} onClick={() => setBank(b)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${bank === b ? 'border-navy bg-navy/5' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${bank === b ? 'bg-navy' : 'bg-gray-100'}`}>
                      <Building2 className={`w-3.5 h-3.5 ${bank === b ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <span className={`text-sm font-semibold ${bank === b ? 'text-navy' : 'text-gray-600'}`}>{b}</span>
                    {bank === b && <Check className="w-4 h-4 text-navy ml-auto" />}
                  </button>
                ))}
              </div>
            )}

            {/* Wallet */}
            {method === 'wallet' && (
              <div className="bg-navy/5 border border-navy/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Available Balance</span>
                  <span className="font-sora font-bold text-navy text-lg">{fmtAmt(walletBalance)}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">This Payment</span>
                  <span className="font-semibold text-coral">{fmtAmt(ctx.amount)}</span>
                </div>
                <div className="h-px bg-gray-200 mb-3" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">After Payment</span>
                  <span className="font-sora font-bold text-green-600">{fmtAmt(walletBalance - ctx.amount)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-400 justify-center pt-1">
              <ShieldAlert className="w-3.5 h-3.5 text-green-500" />
              <span>256-bit SSL encrypted · Secured by Razorpay</span>
            </div>

            <button onClick={pay} disabled={!canPay()}
              className={`w-full py-3.5 text-base font-sora font-semibold rounded-xl transition-all ${
                canPay() ? 'bg-navy text-white hover:bg-navyMid active:scale-[0.98]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}>
              Pay {fmtAmt(ctx.amount)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shop Tab ─────────────────────────────────────────────────────────────────

function ShopTab({ cart, onAddToCart, onUpdateQty, onRemove, onCheckout, orders }: {
  cart: CartItem[];
  onAddToCart: (item: CartItem) => void;
  onUpdateQty: (id: string, size: string | undefined, delta: number) => void;
  onRemove: (id: string, size: string | undefined) => void;
  onCheckout: () => void;
  orders: Order[];
}) {
  const [cat, setCat]       = useState('All');
  const [showCart, setShowCart]   = useState(false);
  const [sizeItem, setSizeItem]   = useState<typeof shopData.items[number] | null>(null);
  const [view, setView]     = useState<'shop' | 'orders'>('shop');

  const items = useMemo(() =>
    shopData.items.filter(i => cat === 'All' || i.category === cat), [cat]);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const getCartQty = (id: string, size?: string) =>
    cart.filter(c => c.id === id && c.size === size).reduce((s, c) => s + c.qty, 0);

  const addItem = (item: typeof shopData.items[number], size?: string) => {
    onAddToCart({ id: item.id, name: item.name, emoji: item.emoji, price: item.price, qty: 1, size, category: item.category });
    toast.success(`${item.emoji} ${item.name} added to cart`);
    setSizeItem(null);
  };

  const statusCfg = {
    Delivered:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
    Processing: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
    Pending:    { bg: 'bg-gray-100',  text: 'text-gray-600',   border: 'border-gray-200' },
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {['shop','orders'].map(v => (
            <button key={v} onClick={() => setView(v as 'shop'|'orders')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg capitalize transition-all ${view === v ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {v === 'shop' ? '🛍 Shop' : `📦 Orders${orders.length ? ` (${orders.length})` : ''}`}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCart(!showCart)} className="relative flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navyMid transition-colors">
          <ShoppingBag className="w-4 h-4" />
          Cart
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-coral rounded-full text-[10px] font-bold flex items-center justify-center">{cartCount}</span>
          )}
        </button>
      </div>

      {view === 'orders' ? (
        /* ── Order History ── */
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No orders yet</p>
            </div>
          ) : orders.map(o => {
            const s = statusCfg[o.status];
            return (
              <div key={o.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-navy text-sm">{o.id}</p>
                    <p className="text-xs text-gray-400">{new Date(o.date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })} · {o.paymentMethod}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${s.bg} ${s.text} ${s.border}`}>{o.status}</span>
                    <p className="font-sora font-bold text-navy mt-1">{fmtAmt(o.total)}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {o.items.map((it, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-gray-600">
                      <span className="text-base">{it.emoji}</span>
                      <span className="flex-1">{it.name}{it.size ? ` (${it.size})` : ''}</span>
                      <span className="text-gray-400">×{it.qty}</span>
                      <span className="font-semibold text-navy">{fmtAmt(it.price * it.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Shop view ── */
        <div className={`grid gap-4 ${showCart ? 'grid-cols-1 lg:grid-cols-[1fr_320px]' : 'grid-cols-1'}`}>
          <div className="space-y-4">
            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {SHOP_CATS.map(c => (
                <button key={c} onClick={() => setCat(c)}
                  className={`flex-shrink-0 px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                    cat === c ? 'bg-navy text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>{c}</button>
              ))}
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map(item => {
                const inCart = getCartQty(item.id);
                return (
                  <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md hover:border-gray-200 transition-all">
                    {/* Item visual */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 h-24 flex items-center justify-center text-4xl">
                      {item.emoji}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-bold text-gray-800 leading-tight mb-1 line-clamp-2">{item.name}</p>
                      <p className="text-[10px] text-gray-400 mb-2">{item.category}</p>
                      <div className="flex items-center justify-between">
                        <p className="font-sora font-bold text-navy">{fmtAmt(item.price)}</p>
                        {item.stock < 20 && <span className="text-[9px] text-coral font-bold">Low stock</span>}
                      </div>
                      <div className="mt-2">
                        {inCart > 0 && !item.sizes ? (
                          <div className="flex items-center justify-between bg-navy/5 rounded-lg p-1">
                            <button onClick={() => onUpdateQty(item.id, undefined, -1)}
                              className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-gray-100 transition-colors">
                              <Minus className="w-3 h-3 text-navy" />
                            </button>
                            <span className="text-sm font-bold text-navy">{inCart}</span>
                            <button onClick={() => onUpdateQty(item.id, undefined, 1)}
                              className="w-7 h-7 rounded-lg bg-navy flex items-center justify-center hover:bg-navyMid transition-colors">
                              <Plus className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => item.sizes ? setSizeItem(item) : addItem(item)}
                            className="w-full py-1.5 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-navyMid active:scale-95 transition-all">
                            {item.sizes ? 'Select Size' : '+ Add to Cart'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart panel */}
          {showCart && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-fit sticky top-20">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-sora font-semibold text-navy flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />Cart
                  {cartCount > 0 && <span className="text-xs bg-navy text-white rounded-full px-2 py-0.5">{cartCount}</span>}
                </h3>
                <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>

              {cart.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Your cart is empty</p>
                  <p className="text-xs mt-1">Add items from the shop</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                    {cart.map((item, i) => (
                      <div key={`${item.id}-${item.size}-${i}`} className="flex items-center gap-3 p-3">
                        <span className="text-xl flex-shrink-0">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                          {item.size && <p className="text-[10px] text-gray-400">Size: {item.size}</p>}
                          <p className="text-xs font-bold text-navy mt-0.5">{fmtAmt(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => onUpdateQty(item.id, item.size, -1)}
                            className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                            <Minus className="w-2.5 h-2.5 text-gray-600" />
                          </button>
                          <span className="text-sm font-bold text-navy w-5 text-center">{item.qty}</span>
                          <button onClick={() => onUpdateQty(item.id, item.size, 1)}
                            className="w-6 h-6 rounded-lg bg-navy flex items-center justify-center hover:bg-navyMid transition-colors">
                            <Plus className="w-2.5 h-2.5 text-white" />
                          </button>
                          <button onClick={() => onRemove(item.id, item.size)}
                            className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors ml-1">
                            <Trash2 className="w-2.5 h-2.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-gray-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Subtotal</span>
                      <span className="font-sora font-bold text-navy text-lg">{fmtAmt(cartTotal)}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 text-center">Charges billed to parent wallet / payment</p>
                    <button onClick={onCheckout}
                      className="w-full py-3 bg-navy text-white font-sora font-semibold text-sm rounded-xl hover:bg-navyMid active:scale-[0.98] transition-all">
                      Checkout · {fmtAmt(cartTotal)}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Size selector modal */}
      {sizeItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setSizeItem(null)}>
          <div className="bg-white w-full sm:w-auto sm:max-w-xs rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sora font-semibold text-navy">{sizeItem.emoji} Select Size</h3>
              <button onClick={() => setSizeItem(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-3">{sizeItem.name} — {fmtAmt(sizeItem.price)}</p>
            <div className="grid grid-cols-4 gap-2">
              {sizeItem.sizes?.map(s => (
                <button key={s} onClick={() => addItem(sizeItem, s)}
                  className="py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-navy hover:text-navy hover:bg-navy/5 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Other tab components (unchanged logic, same as before) ───────────────────

function HomeTab({ student, feeRecord, pendingHW, health, onPayFee }: {
  student: typeof studentsData[number];
  feeRecord: typeof feeData.records[number] | undefined;
  pendingHW: typeof homeworkData.assignments;
  health: typeof healthData.nurseLog;
  onPayFee: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Status strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Today', value: 'Present ✓',            color: 'bg-green-50 border-green-200 text-green-700', icon: CalendarCheck },
          { label: 'Attendance', value: `${student.attendancePercent}%`, color: student.attendancePercent >= 85 ? 'bg-teal/5 border-teal/20 text-teal' : 'bg-amber-50 border-amber-200 text-amber-700', icon: Activity },
          { label: 'Fee Status', value: feeRecord?.status === 'paid' ? 'Paid ✓' : feeRecord?.status === 'pending' ? 'Pending' : 'Overdue!', color: feeRecord?.status === 'paid' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700', icon: CreditCard },
          { label: 'Homework Due', value: `${pendingHW.length} pending`, color: 'bg-purple/5 border-purple/20 text-purple', icon: ClipboardList },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{s.label}</span>
              </div>
              <p className="font-sora font-bold text-base leading-tight">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Fee due alert */}
      {feeRecord && feeRecord.status !== 'paid' && (
        <div className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${feeRecord.status === 'overdue' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-start gap-3">
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${feeRecord.status === 'overdue' ? 'text-red-500' : 'text-amber-500'}`} />
            <div>
              <p className={`text-sm font-bold ${feeRecord.status === 'overdue' ? 'text-red-700' : 'text-amber-700'}`}>
                Fee {feeRecord.status === 'overdue' ? 'Overdue!' : 'Due'}
              </p>
              <p className={`text-xs ${feeRecord.status === 'overdue' ? 'text-red-600' : 'text-amber-600'}`}>
                ₹{feeRecord.amount.toLocaleString('en-IN')} · {feeRecord.term}
              </p>
            </div>
          </div>
          <button onClick={onPayFee} className={`flex-shrink-0 px-4 py-2 text-xs font-bold rounded-xl text-white transition-colors ${feeRecord.status === 'overdue' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
            Pay Now
          </button>
        </div>
      )}

      {/* Bus tracker */}
      <div className="bg-gradient-to-r from-teal to-teal/80 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Bus className="w-5 h-5" /></div>
            <div>
              <p className="font-sora font-bold text-sm">Bus Tracker — Live</p>
              <p className="text-white/80 text-xs mt-0.5">Route 2 · Bus KA-01-BA-4521</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
              <span className="text-white/90 text-xs font-semibold">Live</span>
            </div>
            <p className="font-bold text-sm mt-0.5">ETA: 8 min</p>
          </div>
        </div>
        <div className="mt-3 bg-white/15 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Currently at <strong>Behala Chowrasta</strong> — 2 stops away</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pending homework */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-sora font-semibold text-navy text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-purple" />Pending Homework
            </h3>
            <span className="text-[10px] font-bold bg-purple/10 text-purple px-2 py-0.5 rounded-full">{pendingHW.length}</span>
          </div>
          <div className="space-y-2.5">
            {pendingHW.slice(0,3).map(h => (
              <div key={h.id} className="flex items-start gap-2.5 p-2.5 bg-purple/5 rounded-lg">
                <BookOpen className="w-3.5 h-3.5 text-purple mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{h.subject}</p>
                  <p className="text-[11px] text-gray-500 truncate">{h.description.slice(0, 55)}…</p>
                </div>
                <span className="text-[10px] text-coral font-bold flex-shrink-0">Due {fmtDate(h.dueDate)}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Upcoming events */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="font-sora font-semibold text-navy text-sm flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-teal" />Upcoming Events
          </h3>
          <div className="space-y-2">
            {EVENTS.slice(0, 4).map(ev => {
              const cfg = TYPE_CFG[ev.type] ?? TYPE_CFG.notice;
              return (
                <div key={ev.date} className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-10 text-center rounded-lg py-1 ${cfg.bg} ${cfg.border} border`}>
                    <p className={`text-[10px] font-bold ${cfg.text}`}>{fmtDate(ev.date).split(' ')[0]}</p>
                    <p className={`text-[9px] ${cfg.text} opacity-70`}>{fmtDate(ev.date).split(' ')[1]}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700 truncate">{ev.label}</p>
                    <span className={`text-[10px] font-semibold ${cfg.text} capitalize`}>{ev.type}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {health.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <h3 className="font-sora font-semibold text-rose-700 text-sm flex items-center gap-2 mb-1">
            <Heart className="w-4 h-4" />Recent Health Record
          </h3>
          <p className="text-xs text-rose-700 font-semibold">{health[0].date} · {health[0].complaint}</p>
          <p className="text-xs text-rose-600 mt-0.5">{health[0].action}</p>
        </div>
      )}
    </div>
  );
}

function AttendanceTab({ student }: { student: typeof studentsData[number] }) {
  const pct = student.attendancePercent;
  const calDays = Array.from({ length: 30 }, (_, i) => {
    const d = i + 1; const dow = new Date(2026, 3, d).getDay();
    if (dow === 0)             return { d, type: 'sunday' };
    if ([5,6,14,15].includes(d)) return { d, type: 'holiday' };
    if (d > 10)                return { d, type: 'future' };
    return { d, type: Math.random() > 0.15 ? 'present' : 'absent' };
  });
  const typeCfg = { present:'bg-green-100 text-green-700 font-semibold', absent:'bg-red-100 text-red-600 font-semibold', holiday:'bg-amber-100 text-amber-600', sunday:'bg-gray-50 text-gray-300', future:'bg-gray-50 text-gray-300' };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[{ l:'Attendance', v:`${pct}%`, c: pct>=85?'text-green-600':'text-amber-600', n:pct>=85?'Good standing':'Below 85%' }, { l:'Days Present', v:String(Math.round(180*pct/100)), c:'text-navy', n:'Out of 180' }, { l:'Days Absent', v:String(180-Math.round(180*pct/100)), c:'text-red-600', n:'This year' }].map(s => (
          <div key={s.l} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className={`text-2xl font-sora font-bold ${s.c}`}>{s.v}</p>
            <p className="text-xs font-semibold text-gray-600 mt-0.5">{s.l}</p>
            <p className="text-[10px] text-gray-400">{s.n}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="font-sora font-semibold text-navy text-sm mb-3">Monthly Trend</h3>
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={MONTHLY_ATTENDANCE}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis domain={[70,100]} tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} contentStyle={{ borderRadius:8, fontSize:12 }} />
            <Line type="monotone" dataKey="pct" stroke="#1E2761" strokeWidth={2.5} dot={{ fill:'#1E2761', r:4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="font-sora font-semibold text-navy text-sm mb-3">April 2026</h3>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} className="text-center text-[10px] font-semibold text-gray-400">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[null,null,null].map((_,i) => <div key={`e${i}`} />)}
          {calDays.map(({ d, type }) => <div key={d} className={`aspect-square rounded-lg flex items-center justify-center text-xs ${typeCfg[type as keyof typeof typeCfg]}`}>{d}</div>)}
        </div>
        <div className="flex items-center gap-4 mt-3">
          {[['bg-green-100','Present'],['bg-red-100','Absent'],['bg-amber-100','Holiday']].map(([bg,lbl]) => (
            <div key={lbl} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded ${bg}`} /><span className="text-[11px] text-gray-500">{lbl}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AcademicsTab({ student }: { student: typeof studentsData[number] }) {
  const scores = student.academicScore as Record<string, number>;
  const avg = Math.round(Object.values(scores).reduce((a,b)=>a+b,0)/Object.values(scores).length);
  const subjectColors: Record<string,string> = { english:'#1E2761', mathematics:'#028090', science:'#534AB7', history:'#D85A30', geography:'#BA7517', bengali:'#993556' };
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-navy to-navyMid rounded-xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div><p className="text-ice/70 text-xs uppercase tracking-wide">Average Score</p><p className="font-sora font-bold text-4xl text-gold">{avg}%</p></div>
          <div className="text-right">
            <p className="text-ice/70 text-xs uppercase tracking-wide">Predicted Board</p>
            <div className="flex items-center gap-1.5 justify-end mt-1">
              <p className="font-sora font-bold text-2xl">{student.predictedBoardScore}%</p>
              <AIBadge />
            </div>
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-ice/80 text-xs leading-relaxed">{student.name.split(' ')[0]} shows strength in quantitative subjects. AI recommends additional focus on essay-based History answers for board prep.</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="font-sora font-semibold text-navy text-sm mb-4">Subject Performance</h3>
        <div className="space-y-3">
          {Object.entries(scores).map(([sub, sc]) => (
            <div key={sub}>
              <div className="flex justify-between mb-1"><span className="text-xs font-semibold text-gray-700 capitalize">{sub}</span><span className="text-xs font-bold text-navy">{sc}%</span></div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width:`${sc}%`, backgroundColor: subjectColors[sub]??'#1E2761' }} /></div>
            </div>
          ))}
        </div>
      </div>
      {student.achievements?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="font-sora font-semibold text-navy text-sm mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-gold" />Achievements</h3>
          <div className="space-y-2">
            {student.achievements.map((a:string,i:number) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 bg-gold/10 rounded-lg">
                <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" /><span className="text-xs font-semibold text-gray-700">{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HomeworkTab({ student }: { student: typeof studentsData[number] }) {
  const myHW = homeworkData.assignments.filter(h => h.class === `${student.class}-A` || h.class === student.class);
  const active = myHW.filter(h => h.status === 'active');
  const closed = myHW.filter(h => h.status === 'closed');
  const subCol: Record<string,string> = { Mathematics:'bg-teal/10 text-teal', English:'bg-navy/10 text-navy', Science:'bg-purple/10 text-purple', History:'bg-coral/10 text-coral', Chemistry:'bg-amber/10 text-amber', Bengali:'bg-pink/10 text-pink' };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[{ l:'Active',v:active.length,c:'text-purple'},{ l:'Completed',v:closed.length,c:'text-green-600'},{ l:'Submit Rate',v:'88%',c:'text-navy'}].map(s=>(
          <div key={s.l} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className={`text-2xl font-sora font-bold ${s.c}`}>{s.v}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>
      {active.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="font-sora font-semibold text-navy text-sm mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-coral"/>Pending</h3>
          <div className="space-y-3">
            {active.map(h => {
              const isUrgent = new Date(h.dueDate).getTime()-new Date(today).getTime() < 2*86400000;
              return (
                <div key={h.id} className={`border rounded-xl p-3.5 ${isUrgent?'border-coral/30 bg-coral/5':'border-gray-100'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${subCol[h.subject]??'bg-gray-100 text-gray-600'}`}>{h.subject}</span>
                        {isUrgent && <span className="text-[10px] font-bold text-coral">⚡ Urgent</span>}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{h.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0"><p className={`text-xs font-bold ${isUrgent?'text-coral':'text-amber-600'}`}>Due</p><p className="text-xs font-semibold text-gray-600">{fmtDate(h.dueDate)}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FeeTab({ student, onPay }: { student: typeof studentsData[number]; onPay: () => void }) {
  const records = feeData.records.filter(r => r.studentId === student.id);
  const current = records[0];
  return (
    <div className="space-y-4">
      {current ? (
        <div className={`rounded-xl p-5 border ${current.status==='paid'?'bg-green-50 border-green-200':current.status==='overdue'?'bg-red-50 border-red-200':'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${current.status==='paid'?'text-green-600':current.status==='overdue'?'text-red-600':'text-amber-600'}`}>{current.term}</p>
              <p className={`text-3xl font-sora font-bold ${current.status==='paid'?'text-green-700':'text-navy'}`}>₹{current.amount.toLocaleString('en-IN')}</p>
              <div className="flex items-center gap-2 mt-2">
                {current.status==='paid' ? (
                  <><CheckCircle2 className="w-4 h-4 text-green-600"/><span className="text-sm font-semibold text-green-700">Paid · {new Date(current.paidDate!).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span></>
                ) : (
                  <><AlertCircle className="w-4 h-4 text-amber-600"/><span className="text-sm font-semibold text-amber-700">Due by {new Date(current.dueDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span></>
                )}
              </div>
            </div>
            {current.status==='paid' && (
              <button onClick={() => toast.success('Receipt downloaded')} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors">
                <Download className="w-3.5 h-3.5"/>Receipt
              </button>
            )}
          </div>
          {current.status!=='paid' && (
            <button onClick={onPay} className="mt-3 w-full py-3 bg-navy text-white text-sm font-sora font-semibold rounded-xl hover:bg-navyMid transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <IndianRupee className="w-4 h-4"/>Pay Now — ₹{current.amount.toLocaleString('en-IN')}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400"><p>No fee records found.</p></div>
      )}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="font-sora font-semibold text-navy text-sm mb-3">Annual Fee Structure 2024-25</h3>
        <div className="space-y-1.5">
          {Object.entries(feeData.feeStructure).map(([cls,amt]) => (
            <div key={cls} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-600">{cls}</span><span className="text-xs font-bold text-navy">₹{Number(amt).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      </div>
      {records.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="font-sora font-semibold text-navy text-sm mb-3">Payment History</h3>
          <div className="space-y-2">
            {records.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${r.status==='paid'?'bg-green-100':'bg-amber-100'}`}>
                  {r.status==='paid'?<Check className="w-4 h-4 text-green-600"/>:<Clock className="w-4 h-4 text-amber-600"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700">{r.term}</p>
                  <p className="text-[11px] text-gray-400">{r.paymentMode??'Not paid'}{r.receiptNo?` · ${r.receiptNo}`:''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-navy">₹{r.amount.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-gray-400">{r.paidDate?new Date(r.paidDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'}):'—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HealthTab({ student }: { student: typeof studentsData[number] }) {
  const myLogs = healthData.nurseLog.filter(h => h.studentId === student.id);
  const VACS = [{ name:'BCG',done:true},{ name:'Hepatitis B',done:true},{ name:'DPT',done:true},{ name:'MMR',done:true},{ name:'Typhoid',done:false},{ name:'Annual Flu',done:false}];
  return (
    <div className="space-y-4">
      {student.medicalNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"/>
          <div><p className="font-semibold text-amber-800 text-sm">Medical Alert</p><p className="text-sm text-amber-700 mt-0.5">{student.medicalNotes}</p></div>
        </div>
      )}
      {myLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="font-sora font-semibold text-navy text-sm mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-rose-500"/>Nurse Visit Log</h3>
          <div className="space-y-3">
            {myLogs.map(log => (
              <div key={log.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">{log.complaint}</span>
                  <span className="text-[10px] text-gray-400">{fmtDate(log.date)}</span>
                </div>
                <p className="text-[11px] text-gray-500">{log.action}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {log.referredToDoctor && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Referred</span>}
                  {log.parentNotified  && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Parent Notified</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="font-sora font-semibold text-navy text-sm mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-teal"/>Vaccinations</h3>
        <div className="grid grid-cols-2 gap-2">
          {VACS.map(v => (
            <div key={v.name} className={`flex items-center gap-2 p-2.5 rounded-lg border ${v.done?'bg-green-50 border-green-200':'bg-gray-50 border-gray-200'}`}>
              {v.done?<CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0"/>:<Clock className="w-4 h-4 text-gray-400 flex-shrink-0"/>}
              <span className={`text-xs font-semibold ${v.done?'text-green-700':'text-gray-500'}`}>{v.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NoticesTab() {
  const [expanded, setExpanded] = useState<number|null>(null);
  return (
    <div className="space-y-3">
      {ANNOUNCEMENTS.map(a => {
        const cfg = TYPE_CFG[a.type]??TYPE_CFG.notice; const isOpen = expanded===a.id;
        return (
          <div key={a.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${a.pinned?'border-navy/20':'border-gray-100'}`}>
            <button className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50/50 transition-colors" onClick={()=>setExpanded(isOpen?null:a.id)}>
              {a.pinned&&<span className="flex-shrink-0 text-[10px] font-bold bg-navy text-white px-1.5 py-0.5 rounded-full mt-0.5">📌</span>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} capitalize`}>{a.type}</span>
                  <span className="text-[10px] text-gray-400">{fmtDate(a.date)}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 leading-snug">{a.title}</p>
                {!isOpen&&<p className="text-xs text-gray-400 mt-0.5 truncate">{a.body}</p>}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${isOpen?'rotate-180':''}`}/>
            </button>
            {isOpen&&(
              <div className="px-4 pb-4 border-t border-gray-50">
                <p className="text-sm text-gray-600 leading-relaxed mt-3">{a.body}</p>
                <button onClick={()=>toast.success('Acknowledged')} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-navy hover:underline">
                  <Check className="w-3.5 h-3.5"/>Mark as read
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Parent Portal ───────────────────────────────────────────────────────

export default function ParentPortalPage() {
  const [activeTab, setActiveTab]   = useState<PortalTab>('home');
  const [childId, setChildId]       = useState(CHILDREN_IDS[0]);
  const [showChildPicker, setShowChildPicker] = useState(false);
  const [walletBalance, setWalletBalance]     = useState(5000);
  const [paymentCtx, setPaymentCtx] = useState<PaymentCtx | null>(null);
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [orders, setOrders]         = useState<Order[]>(INITIAL_ORDERS);
  const [feeRecords, setFeeRecords] = useState(feeData.records);

  const child    = studentsData.find(s => s.id === childId) ?? studentsData[0];
  const children = studentsData.filter(s => CHILDREN_IDS.includes(s.id));
  // Prioritise unpaid/overdue record; fall back to the most recent paid record
  const feeRecord =
    feeRecords.find(r => r.studentId === childId && r.status !== 'paid') ??
    feeRecords.filter(r => r.studentId === childId).at(-1);
  const childHealth = healthData.nurseLog.filter(h => h.studentId === childId);
  const pendingHW = homeworkData.assignments.filter(h =>
    h.status === 'active' && (h.class === `${child.class}-A` || h.class === child.class)
  );
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // Cart operations
  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.findIndex(c => c.id === item.id && c.size === item.size);
      if (existing >= 0) return prev.map((c, i) => i === existing ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, item];
    });
  };

  const updateQty = (id: string, size: string | undefined, delta: number) => {
    setCart(prev => prev.map(c => c.id === id && c.size === size
      ? { ...c, qty: Math.max(0, c.qty + delta) }
      : c
    ).filter(c => c.qty > 0));
  };

  const removeItem = (id: string, size: string | undefined) =>
    setCart(prev => prev.filter(c => !(c.id === id && c.size === size)));

  // Open fee payment
  const openFeePayment = () => {
    if (!feeRecord || feeRecord.status === 'paid') return;
    setPaymentCtx({
      amount: feeRecord.amount,
      description: `${feeRecord.term} · ${child.name}`,
      onSuccess: (method, refNo) => {
        setFeeRecords(prev => prev.map(r => r.id !== feeRecord.id ? r : {
          ...r, status: 'paid', paymentMode: method, paidDate: today,
          receiptNo: `RCP${Date.now().toString().slice(-6)}`,
        }));
        toast.success('Fee payment successful!', { description: `Receipt generated · Ref: ${refNo}` });
        setPaymentCtx(null);
      },
    });
  };

  // Open shop checkout
  const openShopCheckout = () => {
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    setPaymentCtx({
      amount: total,
      description: `School Shop · ${cartCount} item${cartCount > 1 ? 's' : ''}`,
      onSuccess: (method, refNo) => {
        const newOrder: Order = {
          id: `ORD${Date.now().toString().slice(-4)}`,
          date: today, items: [...cart], total,
          status: 'Processing', paymentMethod: method, receiptNo: refNo,
        };
        if (method === 'Wallet') setWalletBalance(b => b - total);
        setOrders(prev => [newOrder, ...prev]);
        setCart([]);
        toast.success('Order placed successfully!', { description: `${cartCount} items · ${method}` });
        setPaymentCtx(null);
        setActiveTab('shop');
      },
    });
  };

  const TABS: { id: PortalTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'home',       label: 'Home',       icon: Home },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'academics',  label: 'Academics',  icon: GraduationCap },
    { id: 'homework',   label: 'Homework',   icon: ClipboardList, badge: pendingHW.length || undefined },
    { id: 'fee',        label: 'Fee',        icon: CreditCard, badge: feeRecord?.status !== 'paid' ? 1 : undefined },
    { id: 'health',     label: 'Health',     icon: Heart },
    { id: 'notices',    label: 'Notices',    icon: Bell, badge: 3 },
    { id: 'shop',       label: 'Shop',       icon: ShoppingBag, badge: cartCount || undefined },
  ];

  return (
    <PageWrapper>
      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-navy to-navyMid rounded-2xl p-5 mb-5 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-4 left-1/3 w-24 h-24 bg-gold/10 rounded-full blur-xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-ice/60 text-xs">Parent Portal</p>
              <p className="font-sora font-bold text-lg leading-tight">{child.parent.father.split(' ')[0]} & Family</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Wallet */}
              <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5">
                <Wallet className="w-3.5 h-3.5 text-gold" />
                <span className="text-xs font-semibold text-white">{fmtAmt(walletBalance)}</span>
              </div>
              <button className="relative w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors">
                <Bell className="w-4 h-4 text-white" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-coral rounded-full text-[9px] font-bold flex items-center justify-center text-white">3</span>
              </button>
            </div>
          </div>

          {/* Child card */}
          <button onClick={() => setShowChildPicker(!showChildPicker)}
            className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/15 rounded-xl p-3.5 transition-colors text-left">
            <div className="w-12 h-12 rounded-xl bg-gold flex items-center justify-center text-navy font-sora font-bold text-lg flex-shrink-0">
              {child.name.split(' ').map((n:string)=>n[0]).join('').slice(0,2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sora font-bold text-base leading-tight">{child.name}</p>
              <p className="text-ice/70 text-xs">{child.class}{child.section?` — Section ${child.section}`:''} · Roll {child.rollNo}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-white/20 rounded-full px-2 py-0.5">{child.house} House</span>
                <span className="text-[10px] bg-white/20 rounded-full px-2 py-0.5">Attendance: {child.attendancePercent}%</span>
                {feeRecord?.status !== 'paid' && <span className="text-[10px] bg-coral/70 rounded-full px-2 py-0.5">Fee Pending</span>}
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-ice/60 transition-transform ${showChildPicker?'rotate-180':''}`} />
          </button>

          {showChildPicker && children.length > 1 && (
            <div className="mt-2 bg-white rounded-xl overflow-hidden shadow-xl">
              {children.map(c => (
                <button key={c.id} onClick={() => { setChildId(c.id); setShowChildPicker(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${c.id===childId?'bg-navy/5':''}`}>
                  <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center text-white font-bold text-sm">
                    {c.name.split(' ').map((n:string)=>n[0]).join('').slice(0,2)}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-navy">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.class}</p>
                  </div>
                  {c.id===childId && <Check className="w-4 h-4 text-navy" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="sticky top-16 z-20 bg-gray-50 -mx-6 px-6 mb-5">
        <div className="flex items-end gap-0.5 border-b border-gray-200 overflow-x-auto scrollbar-thin pb-0">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold transition-all whitespace-nowrap border-b-2 -mb-px flex-shrink-0 ${
                  activeTab === t.id ? 'text-navy border-navy' : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.slice(0,3)}</span>
                {t.badge !== undefined && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab===t.id?'bg-navy text-white':'bg-gray-200 text-gray-600'}`}>{t.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-2xl">
        {activeTab==='home'       && <HomeTab student={child} feeRecord={feeRecord} pendingHW={pendingHW} health={childHealth} onPayFee={openFeePayment} />}
        {activeTab==='attendance' && <AttendanceTab student={child} />}
        {activeTab==='academics'  && <AcademicsTab student={child} />}
        {activeTab==='homework'   && <HomeworkTab student={child} />}
        {activeTab==='fee'        && <FeeTab student={child} onPay={openFeePayment} />}
        {activeTab==='health'     && <HealthTab student={child} />}
        {activeTab==='notices'    && <NoticesTab />}
        {activeTab==='shop'       && (
          <ShopTab
            cart={cart}
            onAddToCart={addToCart}
            onUpdateQty={updateQty}
            onRemove={removeItem}
            onCheckout={openShopCheckout}
            orders={orders}
          />
        )}
      </div>

      {/* ── Footer ── */}
      <div className="mt-8 max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-navy">Need help?</p>
            <p className="text-xs text-gray-400">Contact Sundarban Academy</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => toast.success('Calling school office…')}
              className="flex items-center gap-1.5 px-3 py-2 border border-navy text-navy text-xs font-semibold rounded-lg hover:bg-navy/5 transition-colors">
              <Phone className="w-3.5 h-3.5" />Call
            </button>
            <button onClick={() => toast.success('Message sent to class teacher')}
              className="flex items-center gap-1.5 px-3 py-2 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-navyMid transition-colors">
              <MessageSquare className="w-3.5 h-3.5" />Message Teacher
            </button>
          </div>
        </div>
      </div>

      {/* ── Payment Modal ── */}
      {paymentCtx && (
        <PaymentModal ctx={paymentCtx} walletBalance={walletBalance} onClose={() => setPaymentCtx(null)} />
      )}

      {/* ── Parent AI Chatbot ── */}
      <ChatBot mode="parent" parentChildIds={CHILDREN_IDS} />
    </PageWrapper>
  );
}
