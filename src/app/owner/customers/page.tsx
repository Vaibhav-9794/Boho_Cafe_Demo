'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Users,
  Crown,
  Star,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  StickyNote,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  LogOut,
  Menu as MenuIcon,
  X,
  UtensilsCrossed, BarChart3, Shield, FileText, CalendarDays, Database, Activity,
} from 'lucide-react';
import { createAuthBrowserClient } from '@/lib/supabase';
import type { CustomerNote } from '@/lib/supabase';
import { ExportDropdown, exportToCSV, exportToExcel, exportToPDF } from '@/lib/export';

/* ─── Types ─── */
interface CustomerProfile {
  name: string;
  phone: string;
  email: string;
  total_reservations: number;
  completed_visits: number;
  no_shows: number;
  last_visit: string | null;
  status: 'VIP' | 'NO_SHOW_RISK' | 'REGULAR';
}

/* ─── Nav Links ─── */
const NAV_LINKS = [
  { label: 'Reservations', href: '/owner', icon: Calendar },
  { label: 'Menu', href: '/owner/menu', icon: UtensilsCrossed },
  { label: 'Customers', href: '/owner/customers', icon: Users },
  { label: 'Analytics', href: '/owner/analytics', icon: BarChart3 },
  { label: 'Staff', href: '/owner/staff', icon: Shield },
  { label: 'Audit Logs', href: '/owner/audit', icon: FileText },
  { label: 'Calendar', href: '/owner/calendar', icon: CalendarDays },
  { label: 'Newsletter', href: '/owner/newsletter', icon: Mail },
  { label: 'Reviews', href: '/owner/reviews', icon: Star },
  { label: 'Backups', href: '/owner/backups', icon: Database },
  { label: 'System', href: '/owner/system', icon: Activity },
];

/* ─── Animation variants ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: CustomerProfile['status'] }) {
  const config = {
    VIP: { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', icon: <Star className="w-3 h-3" /> },
    NO_SHOW_RISK: { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400', icon: <AlertTriangle className="w-3 h-3" /> },
    REGULAR: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: <CheckCircle className="w-3 h-3" /> },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.border} ${c.text}`}>
      {c.icon}
      {status === 'NO_SHOW_RISK' ? 'No-Show Risk' : status === 'VIP' ? 'VIP' : 'Regular'}
    </span>
  );
}

/* ════════════════════════════════════════════ */
/*  MAIN PAGE                                  */
/* ════════════════════════════════════════════ */
export default function OwnerCustomersPage() {
  const router = useRouter();
  const supabase = createAuthBrowserClient();

  /* ── State ── */
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [search, setSearch] = useState('');
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [togglingVip, setTogglingVip] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* ── Auth check ── */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/staff-login'); return; }
      fetchCustomers('');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Fetch customers ── */
  const fetchCustomers = useCallback(async (q: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('search', q.trim());
      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
      } else {
        setError(data.message || 'Failed to load customers.');
      }
    } catch {
      setError('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Debounced search ── */
  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(search), 400);
    return () => clearTimeout(t);
  }, [search, fetchCustomers]);

  /* ── Fetch notes for a customer ── */
  const fetchNotes = async (email: string) => {
    setNotesLoading(true);
    setNotes([]);
    try {
      const res = await fetch(`/api/admin/customer-notes?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.success) setNotes(data.notes || []);
    } catch { /* ignore */ }
    setNotesLoading(false);
  };

  /* ── Toggle expand ── */
  const toggleExpand = (email: string) => {
    if (expandedEmail === email) {
      setExpandedEmail(null);
      setNotes([]);
      setNewNote('');
    } else {
      setExpandedEmail(email);
      fetchNotes(email);
      setNewNote('');
    }
  };

  /* ── Add note ── */
  const handleAddNote = async (customerEmail: string) => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/customer-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerEmail, note: newNote.trim(), isVipFlag: false }),
      });
      const data = await res.json();
      if (data.success) {
        setNewNote('');
        setSuccess('Note added successfully.');
        fetchNotes(customerEmail);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to add note.');
      }
    } catch {
      setError('Failed to add note.');
    }
    setAddingNote(false);
  };

  /* ── Delete note ── */
  const handleDeleteNote = async (noteId: string, customerEmail: string) => {
    if (!confirm('Delete this note permanently?')) return;
    setDeletingNoteId(noteId);
    try {
      const res = await fetch('/api/admin/customer-notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Note deleted.');
        fetchNotes(customerEmail);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to delete note.');
      }
    } catch {
      setError('Failed to delete note.');
    }
    setDeletingNoteId(null);
  };

  /* ── Toggle VIP ── */
  const handleToggleVip = async (customerEmail: string, isCurrentlyVip: boolean) => {
    setTogglingVip(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/customer-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail,
          note: isCurrentlyVip ? 'Removed VIP status' : 'Marked as VIP customer',
          isVipFlag: !isCurrentlyVip,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(isCurrentlyVip ? 'VIP status removed.' : 'Customer marked as VIP!');
        fetchNotes(customerEmail);
        fetchCustomers(search);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to toggle VIP.');
      }
    } catch {
      setError('Failed to toggle VIP.');
    }
    setTogglingVip(false);
  };

  /* ── Logout ── */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/staff-login');
  };

  /* ════════════════════════════ */
  /*  RENDER                     */
  /* ════════════════════════════ */
  return (
    <div className="min-h-screen bg-[var(--color-dark)]">
      {/* ── Top Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-[var(--glass-border)] bg-[rgba(10,10,10,0.85)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Title */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-dark)] flex items-center justify-center">
                <Crown className="w-4 h-4 text-[var(--color-dark)]" />
              </div>
              <span className="text-lg font-semibold text-[var(--color-champagne)] font-[family-name:var(--font-playfair)] hidden sm:block">
                Owner Panel
              </span>
            </div>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    link.href === '/owner/customers'
                      ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/25'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-champagne)] hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-red-400 transition-colors duration-300"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
              <button
                onClick={() => setMobileNav(!mobileNav)}
                className="md:hidden p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-champagne)] hover:bg-white/5"
              >
                {mobileNav ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileNav && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-[var(--glass-border)] overflow-hidden"
            >
              <div className="px-4 py-3 space-y-1">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => { router.push(link.href); setMobileNav(false); }}
                    className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      link.href === '/owner/customers'
                        ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)]'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-champagne)]'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Main Content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gradient-gold font-[family-name:var(--font-playfair)] mb-2">
              Customer CRM
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Manage customers, notes, and VIP status
            </p>
          </motion.div>

          {/* Feedback Messages */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
                <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
            {success && (
              <motion.div
                key="suc"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-6 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 text-sm">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Bar + Export */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or phone…"
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-[var(--color-dark-card)] border border-[var(--glass-border)]
                             text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-sm
                             focus:outline-none focus:border-[var(--color-gold)]/40 focus:shadow-[0_0_0_3px_rgba(198,169,98,0.08)]
                             transition-all duration-300"
                />
              </div>
              <ExportDropdown
                onExportCSV={() => exportToCSV(customers.map(c => ({
                  Name: c.name, Phone: c.phone, Email: c.email,
                  'Total Reservations': c.total_reservations, 'Completed Visits': c.completed_visits,
                  'No Shows': c.no_shows, 'Last Visit': c.last_visit || '—', Status: c.status,
                })), 'customers')}
                onExportExcel={() => exportToExcel(customers.map(c => ({
                  Name: c.name, Phone: c.phone, Email: c.email,
                  'Total Reservations': c.total_reservations, 'Completed Visits': c.completed_visits,
                  'No Shows': c.no_shows, 'Last Visit': c.last_visit || '—', Status: c.status,
                })), 'customers', 'Customers')}
                onExportPDF={() => exportToPDF(customers.map(c => ({
                  Name: c.name, Phone: c.phone, Email: c.email,
                  'Total Reservations': c.total_reservations, 'Completed Visits': c.completed_visits,
                  'No Shows': c.no_shows, Status: c.status,
                })), [
                  { header: 'Name', dataKey: 'Name' }, { header: 'Phone', dataKey: 'Phone' },
                  { header: 'Email', dataKey: 'Email' }, { header: 'Reservations', dataKey: 'Total Reservations' },
                  { header: 'Visits', dataKey: 'Completed Visits' }, { header: 'No Shows', dataKey: 'No Shows' },
                  { header: 'Status', dataKey: 'Status' },
                ], 'Customer CRM', 'customers')}
              />
            </div>
          </motion.div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[var(--color-gold)] animate-spin" />
            </div>
          )}

          {/* Empty State */}
          {!loading && customers.length === 0 && (
            <motion.div variants={itemVariants} className="text-center py-20">
              <Users className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
              <p className="text-[var(--color-text-secondary)] text-lg">No customers found</p>
              <p className="text-[var(--color-text-muted)] text-sm mt-1">Try adjusting your search</p>
            </motion.div>
          )}

          {/* Customer List */}
          {!loading && customers.length > 0 && (
            <motion.div variants={containerVariants} className="space-y-3">
              {customers.map((customer) => {
                const isExpanded = expandedEmail === customer.email;
                const isVip = customer.status === 'VIP';

                return (
                  <motion.div
                    key={customer.email}
                    variants={itemVariants}
                    layout
                    className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-dark-card)] overflow-hidden
                               hover:border-[var(--color-gold)]/20 transition-colors duration-300"
                  >
                    {/* Customer Row */}
                    <button
                      onClick={() => toggleExpand(customer.email)}
                      className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isVip
                          ? 'bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-dark)]'
                          : 'bg-[var(--color-warm-gray)] border border-[var(--glass-border)]'
                      }`}>
                        <span className={`text-sm font-bold ${isVip ? 'text-[var(--color-dark)]' : 'text-[var(--color-text-secondary)]'}`}>
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 items-center">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{customer.name}</p>
                          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mt-0.5">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                          <Phone className="w-3 h-3 shrink-0" />
                          {customer.phone}
                        </div>
                        <div className="hidden lg:flex items-center gap-3 text-xs">
                          <span className="text-[var(--color-text-secondary)]">
                            <strong className="text-[var(--color-text-primary)]">{customer.total_reservations}</strong> Total
                          </span>
                          <span className="text-emerald-400">
                            <strong>{customer.completed_visits}</strong> Visits
                          </span>
                          <span className="text-red-400">
                            <strong>{customer.no_shows}</strong> No-shows
                          </span>
                        </div>
                        <div className="hidden lg:flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                          <Calendar className="w-3 h-3 shrink-0" />
                          {customer.last_visit || 'Never'}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={customer.status} />
                        </div>
                      </div>

                      {/* Chevron */}
                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-[var(--color-gold)]" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)]" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Section */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-2 border-t border-[var(--glass-border)]">
                            {/* Mobile stats */}
                            <div className="sm:hidden grid grid-cols-3 gap-3 mb-4">
                              <div className="rounded-lg bg-[var(--color-warm-gray)]/50 p-2.5 text-center">
                                <p className="text-lg font-bold text-[var(--color-text-primary)]">{customer.total_reservations}</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Total</p>
                              </div>
                              <div className="rounded-lg bg-emerald-500/10 p-2.5 text-center">
                                <p className="text-lg font-bold text-emerald-400">{customer.completed_visits}</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Visits</p>
                              </div>
                              <div className="rounded-lg bg-red-500/10 p-2.5 text-center">
                                <p className="text-lg font-bold text-red-400">{customer.no_shows}</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">No-shows</p>
                              </div>
                            </div>

                            {/* VIP Toggle */}
                            <div className="flex items-center gap-3 mb-5">
                              <button
                                onClick={() => handleToggleVip(customer.email, isVip)}
                                disabled={togglingVip}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                  isVip
                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                                    : 'bg-[var(--color-warm-gray)] text-[var(--color-text-secondary)] border border-[var(--glass-border)] hover:border-amber-500/30 hover:text-amber-400'
                                } disabled:opacity-50`}
                              >
                                {togglingVip ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Star className="w-4 h-4" />
                                )}
                                {isVip ? 'Remove VIP' : 'Mark as VIP'}
                              </button>
                            </div>

                            {/* Notes Section */}
                            <div>
                              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
                                <StickyNote className="w-4 h-4 text-[var(--color-gold)]" />
                                Notes
                              </h3>

                              {notesLoading ? (
                                <div className="flex items-center justify-center py-6">
                                  <Loader2 className="w-5 h-5 text-[var(--color-gold)] animate-spin" />
                                </div>
                              ) : notes.length === 0 ? (
                                <p className="text-sm text-[var(--color-text-muted)] py-3">No notes yet.</p>
                              ) : (
                                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-1">
                                  {notes.map((note) => (
                                    <div
                                      key={note.id}
                                      className={`relative group rounded-lg p-3 text-sm border ${
                                        note.is_vip_flag
                                          ? 'bg-amber-500/5 border-amber-500/20'
                                          : 'bg-[var(--color-warm-gray)]/30 border-[var(--glass-border)]'
                                      }`}
                                    >
                                      <p className="text-[var(--color-text-primary)] pr-8">{note.note}</p>
                                      <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--color-text-muted)]">
                                        <span>{note.staff_name}</span>
                                        <span>·</span>
                                        <span className={`${note.staff_role === 'OWNER' ? 'text-amber-400' : 'text-blue-400'}`}>
                                          {note.staff_role}
                                        </span>
                                        <span>·</span>
                                        <span>{new Date(note.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        {note.is_vip_flag && (
                                          <>
                                            <span>·</span>
                                            <span className="text-amber-400 flex items-center gap-1">
                                              <Star className="w-3 h-3" /> VIP
                                            </span>
                                          </>
                                        )}
                                      </div>
                                      {/* Delete button (Owner only) */}
                                      <button
                                        onClick={() => handleDeleteNote(note.id, customer.email)}
                                        disabled={deletingNoteId === note.id}
                                        className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-[var(--color-text-muted)]
                                                   hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100
                                                   transition-all duration-200 disabled:opacity-50"
                                      >
                                        {deletingNoteId === note.id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add Note Form */}
                              <div className="flex gap-2 mt-3">
                                <input
                                  type="text"
                                  value={newNote}
                                  onChange={(e) => setNewNote(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(customer.email); }}
                                  placeholder="Add a note…"
                                  className="flex-1 px-3 py-2.5 rounded-lg bg-[var(--color-dark)] border border-[var(--glass-border)]
                                             text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-sm
                                             focus:outline-none focus:border-[var(--color-gold)]/40 transition-all duration-300"
                                />
                                <button
                                  onClick={() => handleAddNote(customer.email)}
                                  disabled={addingNote || !newNote.trim()}
                                  className="px-4 py-2.5 rounded-lg bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/25
                                             hover:bg-[var(--color-gold)]/25 disabled:opacity-40 transition-all duration-300 text-sm font-medium
                                             flex items-center gap-1.5"
                                >
                                  {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                  Add
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Customer Count */}
          {!loading && customers.length > 0 && (
            <motion.p variants={itemVariants} className="text-center text-sm text-[var(--color-text-muted)] mt-6">
              Showing {customers.length} customer{customers.length !== 1 ? 's' : ''}
            </motion.p>
          )}
        </motion.div>
      </main>
    </div>
  );
}
