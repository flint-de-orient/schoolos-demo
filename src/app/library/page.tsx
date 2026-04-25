'use client';

import { useState, useMemo } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import AIBadge from '@/components/shared/AIBadge';
import { toast } from 'sonner';
import {
  BookOpen, BookMarked, AlertCircle, Plus, Search,
  RotateCcw, X, Calendar, User, CheckCircle2,
  AlertTriangle, Library, Bell, Download, BarChart3,
  BookX, Filter, ChevronRight, Hash, Layers
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import libraryData from '@/data/library.json';
import studentsData from '@/data/students.json';

// ─── Types ───────────────────────────────────────────────────────────────────

type IssuedEntry = { studentId: string; dueDate: string };

type Book = {
  id: string; title: string; author: string; genre: string;
  isbn: string; copies: number; available: number;
  issuedTo: IssuedEntry[];
};

type Transaction = {
  id: string; bookId: string; bookTitle: string;
  studentId: string; studentName: string; studentClass: string;
  issueDate: string; dueDate: string;
  returned: boolean; returnDate?: string;
};

type Tab = 'catalogue' | 'transactions' | 'overdue' | 'reports';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TODAY = '2026-04-10';
const isOverdue = (dueDate: string, returned: boolean) =>
  !returned && new Date(dueDate) < new Date(TODAY);

const genreColors: Record<string, string> = {
  'Textbook': '#1E2761', 'Fiction': '#028090', 'Bengali Literature': '#F5C542',
  'Biography': '#534AB7', 'History': '#D85A30', 'Science': '#3B6D11',
  'Inspirational': '#993556',
};

const CHART_COLORS = Object.values(genreColors);

// ─── Issue Modal ─────────────────────────────────────────────────────────────

function IssueModal({
  books, preselectedBookId, onClose, onIssue,
}: {
  books: Book[];
  preselectedBookId?: string;
  onClose: () => void;
  onIssue: (bookId: string, studentId: string, dueDate: string) => void;
}) {
  const availableBooks = books.filter(b => b.available > 0);
  const [bookId, setBookId] = useState(preselectedBookId ?? '');
  const [studentId, setStudentId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // students who don't already have this book
  const selectedBook = books.find(b => b.id === bookId);
  const alreadyIssuedStudents = selectedBook?.issuedTo.map(i => i.studentId) ?? [];
  const eligibleStudents = studentsData.filter(s => !alreadyIssuedStudents.includes(s.id));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!bookId) e.book = 'Select a book';
    if (!studentId) e.student = 'Select a student';
    if (!dueDate) e.dueDate = 'Set a due date';
    else if (new Date(dueDate) <= new Date(TODAY)) e.dueDate = 'Due date must be in the future';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-sora font-bold text-navy text-lg">Issue Book</h2>
            <p className="text-xs text-gray-400 mt-0.5">Issue a book to a student</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Book */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Book <span className="text-coral">*</span></label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select value={bookId} onChange={e => { setBookId(e.target.value); setStudentId(''); }}
                className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.book ? 'border-coral' : 'border-gray-200'}`}>
                <option value="">Select a book...</option>
                {availableBooks.map(b => (
                  <option key={b.id} value={b.id}>{b.title} ({b.available} available)</option>
                ))}
              </select>
            </div>
            {errors.book && <p className="text-xs text-coral mt-1">{errors.book}</p>}
          </div>

          {/* Student */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Student <span className="text-coral">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select value={studentId} onChange={e => setStudentId(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.student ? 'border-coral' : 'border-gray-200'}`}>
                <option value="">Select a student...</option>
                {eligibleStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name} — {s.class}</option>
                ))}
              </select>
            </div>
            {errors.student && <p className="text-xs text-coral mt-1">{errors.student}</p>}
          </div>

          {/* Due Date */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Due Date <span className="text-coral">*</span></label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                min={TODAY}
                className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.dueDate ? 'border-coral' : 'border-gray-200'}`} />
            </div>
            {errors.dueDate && <p className="text-xs text-coral mt-1">{errors.dueDate}</p>}
          </div>

          {/* Preview */}
          {bookId && studentId && (
            <div className="bg-iceLight border border-ice rounded-xl p-3 text-xs text-gray-600 space-y-1">
              <div><span className="text-gray-400">Book:</span> <strong>{books.find(b => b.id === bookId)?.title}</strong></div>
              <div><span className="text-gray-400">Student:</span> <strong>{studentsData.find(s => s.id === studentId)?.name}</strong></div>
            </div>
          )}
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => { if (validate()) onIssue(bookId, studentId, dueDate); }}
            className="flex-1 py-2.5 text-sm font-semibold bg-navy text-white rounded-xl hover:bg-navyMid transition-colors"
          >
            Issue Book
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Book Modal ───────────────────────────────────────────────────────────

function AddBookModal({ onClose, onAdd }: { onClose: () => void; onAdd: (b: Book) => void }) {
  const genres = ['Textbook', 'Fiction', 'Bengali Literature', 'Biography', 'History', 'Science', 'Inspirational', 'Reference', 'Other'];
  const [form, setForm] = useState({ title: '', author: '', genre: '', isbn: '', copies: '1' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Required';
    if (!form.author.trim()) e.author = 'Required';
    if (!form.genre) e.genre = 'Required';
    if (!form.copies || Number(form.copies) < 1) e.copies = 'At least 1 copy';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = () => {
    if (!validate()) return;
    onAdd({
      id: `LIB${Date.now()}`,
      title: form.title.trim(),
      author: form.author.trim(),
      genre: form.genre,
      isbn: form.isbn.trim() || 'N/A',
      copies: Number(form.copies),
      available: Number(form.copies),
      issuedTo: [],
    });
    toast.success(`"${form.title}" added to catalogue`);
    onClose();
  };

  const F = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{label}</label>
      {children}
      {error && <p className="text-xs text-coral mt-1">{error}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-sora font-bold text-navy text-lg">Add New Book</h2>
            <p className="text-xs text-gray-400 mt-0.5">Add a book to the library catalogue</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <F label="Title *" error={errors.title}>
            <input type="text" placeholder="Book title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.title ? 'border-coral' : 'border-gray-200'}`} />
          </F>
          <F label="Author *" error={errors.author}>
            <input type="text" placeholder="Author name" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.author ? 'border-coral' : 'border-gray-200'}`} />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Genre *" error={errors.genre}>
              <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.genre ? 'border-coral' : 'border-gray-200'}`}>
                <option value="">Select...</option>
                {genres.map(g => <option key={g}>{g}</option>)}
              </select>
            </F>
            <F label="No. of Copies *" error={errors.copies}>
              <input type="number" min="1" value={form.copies} onChange={e => setForm(f => ({ ...f, copies: e.target.value }))}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.copies ? 'border-coral' : 'border-gray-200'}`} />
            </F>
          </div>
          <F label="ISBN (optional)">
            <input type="text" placeholder="e.g. 978-81-7253-789-0" value={form.isbn} onChange={e => setForm(f => ({ ...f, isbn: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
          </F>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={handleAdd} className="flex-1 py-2.5 text-sm font-semibold bg-gold text-navy rounded-xl hover:bg-gold/90 transition-colors">Add to Catalogue</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('catalogue');
  const [books, setBooks] = useState<Book[]>(libraryData.books as Book[]);
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    libraryData.books.flatMap(b =>
      b.issuedTo.map(i => {
        const student = studentsData.find(s => s.id === i.studentId);
        return {
          id: `TXN-${b.id}-${i.studentId}`,
          bookId: b.id,
          bookTitle: b.title,
          studentId: i.studentId,
          studentName: student?.name ?? 'Unknown',
          studentClass: student?.class ?? '',
          issueDate: '2026-03-20',
          dueDate: i.dueDate,
          returned: false,
        };
      })
    )
  );

  // Catalogue filters
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('All');
  const [availFilter, setAvailFilter] = useState<'all' | 'available' | 'all-issued'>('all');

  // Transaction filters
  const [txSearch, setTxSearch] = useState('');
  const [txFilter, setTxFilter] = useState<'active' | 'returned' | 'all'>('active');

  // Modals
  const [issueModal, setIssueModal] = useState<{ open: boolean; bookId?: string }>({ open: false });
  const [addBookModal, setAddBookModal] = useState(false);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());

  // ── Derived ──
  const genres = useMemo(() => ['All', ...new Set(books.map(b => b.genre))].sort(), [books]);
  const totalIssued = useMemo(() => transactions.filter(t => !t.returned).length, [transactions]);
  const overdueList = useMemo(() => transactions.filter(t => isOverdue(t.dueDate, t.returned)), [transactions]);
  const totalAvailable = useMemo(() => books.reduce((s, b) => s + b.available, 0), [books]);

  const filteredBooks = useMemo(() => books.filter(b => {
    const ms = b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase()) ||
      b.isbn.includes(search);
    const mg = genreFilter === 'All' || b.genre === genreFilter;
    const ma = availFilter === 'all' || (availFilter === 'available' ? b.available > 0 : b.available === 0);
    return ms && mg && ma;
  }), [books, search, genreFilter, availFilter]);

  const filteredTx = useMemo(() => transactions.filter(t => {
    const ms = t.bookTitle.toLowerCase().includes(txSearch.toLowerCase()) ||
      t.studentName.toLowerCase().includes(txSearch.toLowerCase());
    const mf = txFilter === 'all' || (txFilter === 'active' ? !t.returned : t.returned);
    return ms && mf;
  }).sort((a, b) => {
    if (!a.returned && b.returned) return -1;
    if (a.returned && !b.returned) return 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  }), [transactions, txSearch, txFilter]);

  // ── Actions ──
  const handleIssue = (bookId: string, studentId: string, dueDate: string) => {
    const student = studentsData.find(s => s.id === studentId)!;
    const book = books.find(b => b.id === bookId)!;

    setBooks(prev => prev.map(b => b.id === bookId ? {
      ...b,
      available: b.available - 1,
      issuedTo: [...b.issuedTo, { studentId, dueDate }],
    } : b));

    const txId = `TXN-${bookId}-${studentId}-${Date.now()}`;
    setTransactions(prev => [...prev, {
      id: txId, bookId, bookTitle: book.title,
      studentId, studentName: student.name, studentClass: student.class,
      issueDate: TODAY, dueDate, returned: false,
    }]);

    toast.success(`"${book.title}" issued to ${student.name}`, { description: `Due: ${dueDate}` });
    setIssueModal({ open: false });
  };

  const handleReturn = (txId: string) => {
    const tx = transactions.find(t => t.id === txId)!;
    setBooks(prev => prev.map(b => b.id === tx.bookId ? {
      ...b,
      available: b.available + 1,
      issuedTo: b.issuedTo.filter(i => i.studentId !== tx.studentId),
    } : b));
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, returned: true, returnDate: TODAY } : t));
    toast.success(`"${tx.bookTitle}" returned by ${tx.studentName}`);
  };

  const handleRemind = (tx: Transaction) => {
    setRemindedIds(prev => new Set([...prev, tx.id]));
    toast.success(`Reminder sent to ${tx.studentName}'s parent`, { description: `Book: ${tx.bookTitle}` });
  };

  // ── Report data ──
  const genreData = useMemo(() => {
    const counts: Record<string, number> = {};
    books.forEach(b => { counts[b.genre] = (counts[b.genre] || 0) + b.copies; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [books]);

  const mostBorrowed = useMemo(() =>
    [...books].sort((a, b) => (b.copies - b.available) - (a.copies - a.available)).slice(0, 8)
      .map(b => ({ name: b.title.length > 20 ? b.title.slice(0, 20) + '…' : b.title, borrowed: b.copies - b.available }))
  , [books]);

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'catalogue',    label: 'Catalogue',      icon: Library,    badge: books.length },
    { id: 'transactions', label: 'Issue & Return',  icon: BookMarked, badge: totalIssued },
    { id: 'overdue',      label: 'Overdue',         icon: AlertCircle, badge: overdueList.length },
    { id: 'reports',      label: 'Reports & AI',    icon: BarChart3 },
  ];

  return (
    <PageWrapper>
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Books', value: books.reduce((s, b) => s + b.copies, 0).toLocaleString('en-IN'), color: 'text-navy', bg: 'bg-navy/10', icon: BookOpen },
          { label: 'Available Now', value: totalAvailable, color: 'text-green', bg: 'bg-green/10', icon: CheckCircle2 },
          { label: 'Currently Issued', value: totalIssued, color: 'text-teal', bg: 'bg-teal/10', icon: BookMarked },
          { label: 'Overdue Returns', value: overdueList.length, color: overdueList.length > 0 ? 'text-coral' : 'text-green', bg: overdueList.length > 0 ? 'bg-coral/10' : 'bg-green/10', icon: overdueList.length > 0 ? AlertCircle : CheckCircle2 },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <div className={`text-2xl font-sora font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs container */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center justify-between border-b border-gray-100 pr-4">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold font-dm-sans whitespace-nowrap transition-all border-b-2 ${
                    activeTab === tab.id ? 'border-navy text-navy bg-navy/3' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      tab.id === 'overdue' && (tab.badge ?? 0) > 0
                        ? 'bg-coral/15 text-coral'
                        : 'bg-gray-100 text-gray-600'
                    }`}>{tab.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Global actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIssueModal({ open: true })}
              className="flex items-center gap-1.5 bg-navy text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-navyMid transition-colors"
            >
              <BookMarked className="w-3.5 h-3.5" /> Issue
            </button>
            <button
              onClick={() => setAddBookModal(true)}
              className="flex items-center gap-1.5 bg-gold text-navy text-xs font-semibold px-3 py-2 rounded-xl hover:bg-gold/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Book
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">

          {/* ── Catalogue ── */}
          {activeTab === 'catalogue' && (
            <div>
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search by title, author, or ISBN..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex gap-1">
                    {(['all', 'available', 'all-issued'] as const).map(f => (
                      <button key={f} onClick={() => setAvailFilter(f)}
                        className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${availFilter === f ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                        {f === 'all' ? 'All' : f === 'available' ? 'Available' : 'All Issued'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Genre pills */}
              <div className="flex gap-1.5 flex-wrap mb-4">
                {genres.map(g => (
                  <button key={g} onClick={() => setGenreFilter(g)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${genreFilter === g ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {g}
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-400 mb-3">{filteredBooks.length} books</p>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Book', 'Author', 'Genre', 'ISBN', 'Copies', 'Available', 'Status', ''].map(h => (
                        <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12 text-sm text-gray-400">No books match your search</td></tr>
                    ) : filteredBooks.map((b, i) => (
                      <tr key={b.id} className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: `${genreColors[b.genre] ?? '#1E2761'}20` }}>
                              <BookOpen className="w-4 h-4" style={{ color: genreColors[b.genre] ?? '#1E2761' }} />
                            </div>
                            <span className="font-semibold text-sm text-gray-800 max-w-[180px] line-clamp-1">{b.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[120px] truncate">{b.author}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: `${genreColors[b.genre] ?? '#1E2761'}15`, color: genreColors[b.genre] ?? '#1E2761' }}>
                            {b.genre}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{b.isbn}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-medium">{b.copies}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${b.available > 0 ? 'text-green' : 'text-coral'}`}>{b.available}</span>
                          <span className="text-xs text-gray-400"> / {b.copies}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.available > 0 ? 'bg-green/10 text-green' : 'bg-coral/10 text-coral'}`}>
                            {b.available > 0 ? 'Available' : 'All Issued'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {b.available > 0 && (
                            <button
                              onClick={() => setIssueModal({ open: true, bookId: b.id })}
                              className="text-xs text-teal hover:text-teal/70 font-semibold flex items-center gap-0.5 transition-colors"
                            >
                              Issue <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Issue & Return ── */}
          {activeTab === 'transactions' && (
            <div>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search by book title or student name..."
                    value={txSearch} onChange={e => setTxSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
                </div>
                <div className="flex gap-1">
                  {(['active', 'returned', 'all'] as const).map(f => (
                    <button key={f} onClick={() => setTxFilter(f)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border capitalize transition-colors ${txFilter === f ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Book', 'Student', 'Class', 'Issued On', 'Due Date', 'Status', 'Action'].map(h => (
                        <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTx.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-sm text-gray-400">No records found</td></tr>
                    ) : filteredTx.map((tx, i) => {
                      const overdue = isOverdue(tx.dueDate, tx.returned);
                      return (
                        <tr key={tx.id} className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/30' : ''} ${overdue ? 'bg-coral/3' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${overdue ? 'bg-coral/10' : 'bg-navy/8'}`}>
                                <BookOpen className={`w-3.5 h-3.5 ${overdue ? 'text-coral' : 'text-navy'}`} />
                              </div>
                              <span className="font-semibold text-sm text-gray-800 max-w-[160px] line-clamp-1">{tx.bookTitle}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-700">{tx.studentName}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{tx.studentClass}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{tx.issueDate}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${overdue ? 'text-coral' : 'text-gray-600'}`}>{tx.dueDate}</span>
                          </td>
                          <td className="px-4 py-3">
                            {tx.returned ? (
                              <span className="text-xs font-semibold bg-green/10 text-green px-2 py-0.5 rounded-full">
                                Returned {tx.returnDate}
                              </span>
                            ) : overdue ? (
                              <span className="text-xs font-semibold bg-coral/10 text-coral px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                                <AlertCircle className="w-3 h-3" /> Overdue
                              </span>
                            ) : (
                              <span className="text-xs font-semibold bg-teal/10 text-teal px-2 py-0.5 rounded-full">Active</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {!tx.returned && (
                              <button
                                onClick={() => handleReturn(tx.id)}
                                className="flex items-center gap-1 text-xs text-navyMid hover:text-navy font-semibold transition-colors border border-gray-200 hover:border-navy px-2.5 py-1.5 rounded-lg"
                              >
                                <RotateCcw className="w-3 h-3" /> Return
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary footer */}
              <div className="flex items-center justify-between mt-3 px-1">
                <span className="text-xs text-gray-400">{filteredTx.length} records</span>
                <button
                  onClick={() => toast.success('Transaction history exported')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-navyMid hover:text-navy transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>
            </div>
          )}

          {/* ── Overdue ── */}
          {activeTab === 'overdue' && (
            <div>
              {overdueList.length === 0 ? (
                <div className="text-center py-16 bg-green/5 border border-green/20 rounded-2xl">
                  <CheckCircle2 className="w-12 h-12 text-green mx-auto mb-3" />
                  <p className="font-sora font-semibold text-green text-lg">All Clear!</p>
                  <p className="text-sm text-gray-400 mt-1">No overdue returns at the moment</p>
                </div>
              ) : (
                <div>
                  {/* Alert banner */}
                  <div className="bg-coral/8 border border-coral/20 rounded-xl p-4 flex items-start gap-3 mb-5">
                    <AlertTriangle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-coral">{overdueList.length} books are overdue</p>
                      <p className="text-xs text-gray-600 mt-0.5">Send reminders to parents via WhatsApp to get them returned promptly.</p>
                    </div>
                    <button
                      onClick={() => {
                        overdueList.forEach(tx => setRemindedIds(prev => new Set([...prev, tx.id])));
                        toast.success(`Reminders sent to ${overdueList.length} parents`, { description: 'Via WhatsApp' });
                      }}
                      className="ml-auto flex-shrink-0 flex items-center gap-1.5 bg-coral text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-coral/80 transition-colors"
                    >
                      <Bell className="w-3.5 h-3.5" /> Remind All
                    </button>
                  </div>

                  {/* Overdue cards */}
                  <div className="space-y-3">
                    {overdueList.map(tx => {
                      const daysOverdue = Math.floor((new Date(TODAY).getTime() - new Date(tx.dueDate).getTime()) / 86400000);
                      const reminded = remindedIds.has(tx.id);
                      return (
                        <div key={tx.id} className="bg-white border border-coral/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                          {/* Book + student */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center flex-shrink-0">
                              <BookX className="w-5 h-5 text-coral" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-gray-800 truncate">{tx.bookTitle}</p>
                              <p className="text-xs text-gray-500">{tx.studentName} · {tx.studentClass}</p>
                            </div>
                          </div>

                          {/* Days overdue badge */}
                          <div className="text-center px-4 py-2 bg-coral/10 rounded-xl flex-shrink-0">
                            <div className="text-lg font-sora font-bold text-coral">{daysOverdue}</div>
                            <div className="text-[10px] text-coral/70 font-semibold">days overdue</div>
                          </div>

                          {/* Due date */}
                          <div className="text-center flex-shrink-0">
                            <div className="text-xs text-gray-400">Was due on</div>
                            <div className="text-sm font-semibold text-gray-700">{tx.dueDate}</div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleRemind(tx)}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
                                reminded
                                  ? 'bg-green/10 text-green border-green/20 cursor-default'
                                  : 'bg-white text-coral border-coral/30 hover:bg-coral/5'
                              }`}
                            >
                              {reminded ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                              {reminded ? 'Reminded' : 'Remind'}
                            </button>
                            <button
                              onClick={() => handleReturn(tx.id)}
                              className="flex items-center gap-1.5 text-xs font-semibold bg-navy text-white px-3 py-2 rounded-xl hover:bg-navyMid transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Mark Returned
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Reports & AI ── */}
          {activeTab === 'reports' && (
            <div className="space-y-5">
              {/* AI Recommendation */}
              <div className="bg-gradient-to-br from-teal/5 to-iceLight border border-teal/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-teal" />
                  <h3 className="font-sora font-semibold text-navy text-sm">AI Procurement Recommendation</h3>
                  <AIBadge />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { book: 'Feluda Samagra Vol 2', reason: 'Vol 1 is the most borrowed book. High demand for continuation.', priority: 'High' },
                    { book: 'ICSE English Literature Guide', reason: 'No ICSE English guide in stock. Class X & XII have board exams.', priority: 'High' },
                    { book: 'Bengali Grammar & Composition', reason: 'Bengali is a common weak subject. No reference grammar available.', priority: 'Medium' },
                  ].map(rec => (
                    <div key={rec.book} className="bg-white rounded-xl border border-teal/15 p-3">
                      <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit mb-2 ${rec.priority === 'High' ? 'bg-coral/10 text-coral' : 'bg-amber/10 text-amber'}`}>
                        {rec.priority} Priority
                      </div>
                      <p className="text-sm font-semibold text-gray-800 mb-1">{rec.book}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{rec.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Genre distribution */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <h3 className="font-sora font-semibold text-navy text-sm mb-4">Books by Genre</h3>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={genreData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                          {genreData.map((entry, i) => (
                            <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontFamily: 'DM Sans', fontSize: 11, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {genreData.map((g, i) => (
                        <div key={g.name} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-gray-600 truncate">{g.name}</span>
                          <span className="ml-auto font-semibold text-gray-700">{g.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Most borrowed */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <h3 className="font-sora font-semibold text-navy text-sm mb-4">Most Borrowed Books</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={mostBorrowed} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontFamily: 'DM Sans' }} width={90} />
                      <Tooltip contentStyle={{ fontFamily: 'DM Sans', fontSize: 11, borderRadius: 8 }} />
                      <Bar dataKey="borrowed" fill="#1E2761" radius={[0, 4, 4, 0]} name="Copies Issued" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Unique Titles', value: books.length, icon: BookOpen, color: 'text-navy' },
                  { label: 'Total Copies', value: books.reduce((s, b) => s + b.copies, 0), icon: Layers, color: 'text-teal' },
                  { label: 'Utilisation Rate', value: `${Math.round((totalIssued / books.reduce((s, b) => s + b.copies, 0)) * 100)}%`, icon: Hash, color: 'text-purple' },
                  { label: 'Active Borrowers', value: new Set(transactions.filter(t => !t.returned).map(t => t.studentId)).size, icon: User, color: 'text-green' },
                ].map(stat => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="bg-gradient-to-br from-navy to-navyMid rounded-xl p-4 text-white">
                      <Icon className={`w-4 h-4 mb-2 ${stat.color}`} />
                      <div className="text-2xl font-sora font-bold">{stat.value}</div>
                      <div className="text-xs text-ice/70 mt-0.5">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {issueModal.open && (
        <IssueModal
          books={books}
          preselectedBookId={issueModal.bookId}
          onClose={() => setIssueModal({ open: false })}
          onIssue={handleIssue}
        />
      )}
      {addBookModal && (
        <AddBookModal
          onClose={() => setAddBookModal(false)}
          onAdd={book => setBooks(prev => [book, ...prev])}
        />
      )}
    </PageWrapper>
  );
}
