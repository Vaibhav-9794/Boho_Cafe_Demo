'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Search,
  Calendar,
  Clock,
  Users,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  LogOut,
  X,
  Menu as MenuIcon,
  ChevronDown,
  Eye,
  UserCheck,
  UserX,
  Armchair,
  CalendarOff,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { createAuthBrowserClient } from '@/lib/supabase';
import type { Reservation, BlockedDate } from '@/lib/supabase';
import { TABLES } from '@/data/restaurant';

/* ─── Nav Links (Manager: restricted) ─── */
const NAV_LINKS = [
  { label: 'Reservations', href: '/manager' },
  { label: 'Customers', href: '/manager/customers' },
];

/* ─── Status Configs ─── */
const STATUS_TABS = ['ALL', 'HELD', 'PENDING', 'CONFIRMED', 'ARRIVED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'NO_SHOW'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function getStatusColor(status: string) {
  const map: Record<string, { bg: string; border: string; text: string }> = {
    HELD: { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-400' },
    PENDING: { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400' },
    CONFIRMED: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    ARRIVED: { bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-400' },
    COMPLETED: { bg: 'bg-green-500/15', border: 'border-green-500/30', text: 'text-green-400' },
    REJECTED: { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400' },
    CANCELLED: { bg: 'bg-gray-500/15', border: 'border-gray-500/30', text: 'text-gray-400' },
    NO_SHOW: { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400' },
  };
  return map[status] || map.PENDING;
}

/* ─── Animation variants ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

/* ═══════════════════════════════════════ */
/*  MAIN PAGE                             */
/* ═══════════════════════════════════════ */
export default function ManagerDashboardPage() {
  const router = useRouter();
  const supabase = createAuthBrowserClient();

  /* ── State ── */
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<StatusTab>('ALL');
  const [search, setSearch] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* Timeline */
  const [timelineDate, setTimelineDate] = useState(new Date().toISOString().split('T')[0]);
  const [timelineReservations, setTimelineReservations] = useState<Reservation[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  /* Table assignment modal */
  const [tableModal, setTableModal] = useState<{ reservation: Reservation; action: 'approve' | 'assign_table' } | null>(null);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  /* Blocked dates */
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');
  const [blockingDate, setBlockingDate] = useState(false);

  /* Expanded reservation */
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ── Auth check ── */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/staff-login'); return; }
      fetchReservations();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Fetch reservations ── */
  const fetchReservations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/reservations?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReservations(data.reservations || []);
        setCounts(data.counts || {});
      } else {
        setError(data.message || 'Failed to load reservations.');
      }
    } catch {
      setError('Failed to load reservations.');
    }
    setLoading(false);
  }, [statusFilter, search]);

  /* ── Debounced fetch ── */
  useEffect(() => {
    const t = setTimeout(() => fetchReservations(), 400);
    return () => clearTimeout(t);
  }, [statusFilter, search, fetchReservations]);

  /* ── Timeline fetch ── */
  const fetchTimeline = async () => {
    setTimelineLoading(true);
    try {
      const res = await fetch(`/api/admin/reservations?view=timeline&date=${timelineDate}`);
      const data = await res.json();
      if (data.success) setTimelineReservations(data.reservations || []);
    } catch { /* ignore */ }
    setTimelineLoading(false);
  };

  useEffect(() => {
    if (showTimeline) fetchTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineDate, showTimeline]);

  /* ── Blocked dates ── */
  const fetchBlockedDates = async () => {
    setBlockedLoading(true);
    try {
      const res = await fetch('/api/admin/blocked-dates');
      const data = await res.json();
      if (data.success) setBlockedDates(data.blockedDates || []);
    } catch { /* ignore */ }
    setBlockedLoading(false);
  };

  useEffect(() => {
    if (showBlocked) fetchBlockedDates();
  }, [showBlocked]);

  const handleBlockDate = async () => {
    if (!newBlockDate) return;
    setBlockingDate(true);
    try {
      const res = await fetch('/api/admin/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newBlockDate, reason: newBlockReason }),
      });
      const data = await res.json();
      if (data.success) {
        setNewBlockDate('');
        setNewBlockReason('');
        fetchBlockedDates();
        showSuccessMsg('Date blocked.');
      }
    } catch { /* ignore */ }
    setBlockingDate(false);
  };

  const handleUnblockDate = async (id: string) => {
    try {
      const res = await fetch('/api/admin/blocked-dates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBlockedDates();
        showSuccessMsg('Date unblocked.');
      }
    } catch { /* ignore */ }
  };

  /* ── Reservation actions ── */
  const handleAction = async (reservationId: string, action: string, extra?: Record<string, unknown>) => {
    setActionLoading(`${reservationId}-${action}`);
    setError('');
    try {
      const res = await fetch('/api/admin/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reservationId, action, ...extra }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccessMsg(`Reservation ${action.replace('_', ' ')}d.`);
        fetchReservations();
        if (showTimeline) fetchTimeline();
      } else {
        setError(data.message || `Failed to ${action}.`);
      }
    } catch {
      setError(`Failed to ${action}.`);
    }
    setActionLoading(null);
  };

  const handleApproveWithTable = () => {
    if (!tableModal || !selectedTable) return;
    handleAction(tableModal.reservation.id, tableModal.action, { tableNumber: selectedTable });
    setTableModal(null);
    setSelectedTable(null);
  };

  /* ── Helpers ── */
  const showSuccessMsg = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

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
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border-2 border-[var(--color-gold)] flex items-center justify-center bg-[var(--color-gold)]/10">
                <Shield className="w-4 h-4 text-[var(--color-gold)]" />
              </div>
              <span className="text-lg font-semibold text-[var(--color-champagne)] font-[family-name:var(--font-playfair)] hidden sm:block">
                Manager Panel
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    link.href === '/manager'
                      ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/25'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-champagne)] hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleLogout} className="hidden sm:flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-red-400 transition-colors duration-300">
                <LogOut className="w-4 h-4" /> Logout
              </button>
              <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-champagne)] hover:bg-white/5">
                {mobileNav ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {mobileNav && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden border-t border-[var(--glass-border)] overflow-hidden">
              <div className="px-4 py-3 space-y-1">
                {NAV_LINKS.map((link) => (
                  <button key={link.href} onClick={() => { router.push(link.href); setMobileNav(false); }}
                    className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${link.href === '/manager' ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-champagne)]'}`}>
                    {link.label}
                  </button>
                ))}
                <button onClick={handleLogout} className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10">Logout</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gradient-gold font-[family-name:var(--font-playfair)] mb-2">Reservations</h1>
              <p className="text-[var(--color-text-secondary)]">Manage bookings, tables, and schedule</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowTimeline(!showTimeline); setShowBlocked(false); }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${showTimeline ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/25' : 'bg-[var(--color-dark-card)] border border-[var(--glass-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-champagne)]'}`}>
                <Calendar className="w-4 h-4" /> Timeline
              </button>
              <button onClick={() => { setShowBlocked(!showBlocked); setShowTimeline(false); }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${showBlocked ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'bg-[var(--color-dark-card)] border border-[var(--glass-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-champagne)]'}`}>
                <CalendarOff className="w-4 h-4" /> Blocked Dates
              </button>
            </div>
          </motion.div>

          {/* Feedback */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div key="err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400 shrink-0" /><span className="text-red-400 text-sm">{error}</span>
                <button onClick={() => setError('')} className="ml-auto text-red-400"><X className="w-4 h-4" /></button>
              </motion.div>
            )}
            {success && (
              <motion.div key="suc" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="mb-6 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /><span className="text-emerald-400 text-sm">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ Timeline Panel ═══ */}
          <AnimatePresence>
            {showTimeline && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-8">
                <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-dark-card)] p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-5 h-5 text-[var(--color-gold)]" />
                    <h2 className="text-lg font-semibold text-[var(--color-champagne)] font-[family-name:var(--font-playfair)]">Timeline View</h2>
                    <input type="date" value={timelineDate} onChange={(e) => setTimelineDate(e.target.value)}
                      className="ml-auto px-3 py-2 rounded-lg bg-[var(--color-dark)] border border-[var(--glass-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-gold)]/40 [color-scheme:dark]" />
                  </div>
                  {timelineLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-[var(--color-gold)] animate-spin" /></div>
                  ) : timelineReservations.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No reservations for this date.</p>
                  ) : (
                    <div className="space-y-2">
                      {timelineReservations.map((r) => {
                        const sc = getStatusColor(r.status);
                        return (
                          <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-dark)] border border-[var(--glass-border)]">
                            <div className="text-xs text-[var(--color-text-secondary)] w-28 shrink-0">
                              {r.start_time || r.time} → {r.end_time || ''}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[var(--color-text-primary)] truncate">{r.customer_name}</p>
                              <p className="text-xs text-[var(--color-text-muted)]">{r.guest_count} guests · Table {r.table_number || '—'}{r.table_number ? ` · Cap: ${TABLES.find(t => t.number === r.table_number)?.capacity || '?'}` : ''}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${sc.bg} ${sc.border} ${sc.text}`}>{r.status}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ Blocked Dates Panel ═══ */}
          <AnimatePresence>
            {showBlocked && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-8">
                <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-dark-card)] p-5">
                  <h2 className="text-lg font-semibold text-[var(--color-champagne)] font-[family-name:var(--font-playfair)] flex items-center gap-2 mb-4">
                    <CalendarOff className="w-5 h-5 text-red-400" /> Blocked Dates
                  </h2>
                  {/* Add Form */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <input type="date" value={newBlockDate} onChange={(e) => setNewBlockDate(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-[var(--color-dark)] border border-[var(--glass-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-gold)]/40 [color-scheme:dark]" />
                    <input type="text" value={newBlockReason} onChange={(e) => setNewBlockReason(e.target.value)} placeholder="Reason (optional)"
                      className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-dark)] border border-[var(--glass-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-sm focus:outline-none focus:border-[var(--color-gold)]/40" />
                    <button onClick={handleBlockDate} disabled={blockingDate || !newBlockDate}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 disabled:opacity-50 transition-all">
                      {blockingDate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Block
                    </button>
                  </div>
                  {blockedLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-[var(--color-gold)] animate-spin" /></div>
                  ) : blockedDates.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)] text-center py-4">No blocked dates.</p>
                  ) : (
                    <div className="space-y-2">
                      {blockedDates.map((bd) => (
                        <div key={bd.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-dark)] border border-[var(--glass-border)]">
                          <Calendar className="w-4 h-4 text-red-400 shrink-0" />
                          <span className="text-sm text-[var(--color-text-primary)]">{bd.date}</span>
                          {bd.reason && <span className="text-xs text-[var(--color-text-muted)] flex-1 truncate">— {bd.reason}</span>}
                          <button onClick={() => handleUnblockDate(bd.id)} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status Count Cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 mb-6">
            {STATUS_TABS.map((tab) => {
              const count = tab === 'ALL' ? (counts.total || 0) : (counts[tab.toLowerCase()] || 0);
              const sc = tab === 'ALL' ? { bg: 'bg-[var(--color-gold)]/10', border: 'border-[var(--color-gold)]/20', text: 'text-[var(--color-gold)]' } : getStatusColor(tab);
              const isActive = statusFilter === tab;
              return (
                <button key={tab} onClick={() => setStatusFilter(tab)}
                  className={`rounded-lg p-2.5 text-center border transition-all duration-300 ${isActive ? `${sc.bg} ${sc.border} ring-1 ring-offset-0 ring-offset-transparent` : `bg-[var(--color-dark-card)] border-[var(--glass-border)] hover:${sc.bg}`}`}
                  style={isActive ? { ['--tw-ring-color' as string]: sc.text } : undefined}>
                  <p className={`text-lg font-bold ${isActive ? sc.text : 'text-[var(--color-text-secondary)]'}`}>{count}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">{tab === 'NO_SHOW' ? 'No Show' : tab.charAt(0) + tab.slice(1).toLowerCase()}</p>
                </button>
              );
            })}
          </motion.div>

          {/* Search Bar */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or phone…"
                className="w-full pl-11 pr-4 py-3 rounded-lg bg-[var(--color-dark-card)] border border-[var(--glass-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-sm focus:outline-none focus:border-[var(--color-gold)]/40 focus:shadow-[0_0_0_3px_rgba(198,169,98,0.08)] transition-all duration-300" />
            </div>
          </motion.div>

          {/* Loading */}
          {loading && <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[var(--color-gold)] animate-spin" /></div>}

          {/* Empty */}
          {!loading && reservations.length === 0 && (
            <motion.div variants={itemVariants} className="text-center py-20">
              <Calendar className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
              <p className="text-[var(--color-text-secondary)] text-lg">No reservations found</p>
            </motion.div>
          )}

          {/* Reservations List */}
          {!loading && reservations.length > 0 && (
            <motion.div variants={containerVariants} className="space-y-3">
              {reservations.map((r) => {
                const sc = getStatusColor(r.status);
                const isExpanded = expandedId === r.id;

                return (
                  <motion.div key={r.id} variants={itemVariants} layout
                    className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-dark-card)] overflow-hidden hover:border-[var(--color-gold)]/20 transition-colors duration-300">
                    {/* Main Row */}
                    <button onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors">
                      {/* Status dot */}
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${sc.text.replace('text-', 'bg-')}`} />
                      {/* Info */}
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-center">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{r.customer_name}</p>
                          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mt-0.5">
                            <Calendar className="w-3 h-3 shrink-0" />{r.date}
                            <Clock className="w-3 h-3 shrink-0 ml-1" />{r.start_time || r.time}
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                          <Users className="w-3 h-3 shrink-0" />{r.guest_count} guests
                          {r.table_number && (() => {
                            const cap = TABLES.find(t => t.number === r.table_number)?.capacity || 0;
                            const ratio = cap > 0 ? r.guest_count / cap : 0;
                            const warn = r.guest_count > cap ? '🔴' : ratio > 0.8 ? '🟡' : '🟢';
                            return <><Armchair className="w-3 h-3 shrink-0 ml-1" />Table {r.table_number} <span className="text-[10px]">· Cap: {cap} {warn}</span></>;
                          })()}
                        </div>
                        <div className="hidden lg:block">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${sc.bg} ${sc.border} ${sc.text}`}>{r.status}</span>
                        </div>
                        <div className="hidden lg:block text-xs text-[var(--color-text-muted)]">
                          {r.booking_type === 'FULL_CAFE' ? '🏠 Full Cafe' : r.booking_type === 'EVENT' ? '🎉 Event' : '🪑 Table'}
                        </div>
                      </div>
                      <Eye className={`w-4 h-4 shrink-0 ${isExpanded ? 'text-[var(--color-gold)]' : 'text-[var(--color-text-muted)]'}`} />
                    </button>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="px-5 pb-5 pt-2 border-t border-[var(--glass-border)]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]"><Phone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />{r.phone}</div>
                                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]"><Mail className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />{r.email}</div>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="text-[var(--color-text-muted)]">Time: <span className="text-[var(--color-text-secondary)]">{r.start_time || r.time} → {r.end_time || '—'}</span></div>
                                <div className="text-[var(--color-text-muted)]">Occasion: <span className="text-[var(--color-text-secondary)]">{r.occasion || '—'}</span></div>
                              </div>
                              <div className="space-y-2 text-sm">
                                {r.special_requests && <div className="text-[var(--color-text-muted)]">Requests: <span className="text-[var(--color-text-secondary)]">{r.special_requests}</span></div>}
                                <div className="text-[var(--color-text-muted)]">Created: <span className="text-[var(--color-text-secondary)]">{new Date(r.created_at).toLocaleString('en-IN')}</span></div>
                              </div>
                            </div>
                            {/* Mobile status + type */}
                            <div className="sm:hidden flex items-center gap-2 mb-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${sc.bg} ${sc.border} ${sc.text}`}>{r.status}</span>
                              <span className="text-xs text-[var(--color-text-muted)]">{r.booking_type === 'FULL_CAFE' ? '🏠 Full Cafe' : r.booking_type === 'EVENT' ? '🎉 Event' : '🪑 Table'}</span>
                            </div>
                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2">
                              {(r.status === 'PENDING' || r.status === 'HELD') && (
                                <>
                                  <button onClick={() => { setTableModal({ reservation: r, action: 'approve' }); setSelectedTable(null); }}
                                    disabled={actionLoading === `${r.id}-approve`}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50 transition-all">
                                    {actionLoading === `${r.id}-approve` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Approve
                                  </button>
                                  <button onClick={() => handleAction(r.id, 'reject')}
                                    disabled={actionLoading === `${r.id}-reject`}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 disabled:opacity-50 transition-all">
                                    {actionLoading === `${r.id}-reject` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Reject
                                  </button>
                                </>
                              )}
                              {r.status === 'CONFIRMED' && (
                                <>
                                  <button onClick={() => handleAction(r.id, 'mark_arrived')}
                                    disabled={actionLoading === `${r.id}-mark_arrived`}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 disabled:opacity-50 transition-all">
                                    {actionLoading === `${r.id}-mark_arrived` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />} Mark Arrived
                                  </button>
                                  <button onClick={() => handleAction(r.id, 'mark_noshow')}
                                    disabled={actionLoading === `${r.id}-mark_noshow`}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/25 disabled:opacity-50 transition-all">
                                    {actionLoading === `${r.id}-mark_noshow` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />} No-Show
                                  </button>
                                </>
                              )}
                              {r.status === 'ARRIVED' && (
                                <button onClick={() => handleAction(r.id, 'mark_completed')}
                                  disabled={actionLoading === `${r.id}-mark_completed`}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 disabled:opacity-50 transition-all">
                                  {actionLoading === `${r.id}-mark_completed` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Mark Completed
                                </button>
                              )}
                              {!['COMPLETED', 'REJECTED', 'CANCELLED', 'NO_SHOW'].includes(r.status) && (
                                <>
                                  <button onClick={() => { setTableModal({ reservation: r, action: 'assign_table' }); setSelectedTable(r.table_number); }}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--color-warm-gray)] text-[var(--color-text-secondary)] border border-[var(--glass-border)] hover:text-[var(--color-gold)] transition-all">
                                    <Armchair className="w-3.5 h-3.5" /> {r.table_number ? 'Change Table' : 'Assign Table'}
                                  </button>
                                  <button onClick={() => handleAction(r.id, 'cancel')}
                                    disabled={actionLoading === `${r.id}-cancel`}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-500/15 text-gray-400 border border-gray-500/30 hover:bg-gray-500/25 disabled:opacity-50 transition-all">
                                    {actionLoading === `${r.id}-cancel` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Cancel
                                  </button>
                                </>
                              )}
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

          {/* Count */}
          {!loading && reservations.length > 0 && (
            <motion.p variants={itemVariants} className="text-center text-sm text-[var(--color-text-muted)] mt-6">
              Showing {reservations.length} reservation{reservations.length !== 1 ? 's' : ''}
            </motion.p>
          )}
        </motion.div>
      </main>

      {/* ═══ Table Assignment Modal ═══ */}
      <AnimatePresence>
        {tableModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setTableModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-[var(--color-dark-card)] border border-[var(--glass-border)] shadow-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-[var(--color-champagne)] font-[family-name:var(--font-playfair)]">
                  {tableModal.action === 'approve' ? 'Approve & Assign Table' : 'Assign Table'}
                </h2>
                <button onClick={() => setTableModal(null)} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-champagne)]"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-1">For: {tableModal.reservation.customer_name}</p>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">{tableModal.reservation.guest_count} guests · {tableModal.reservation.date}</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {TABLES.map((t) => (
                  <button key={t.number} onClick={() => setSelectedTable(t.number)}
                    className={`p-3 rounded-lg text-sm text-center border transition-all duration-200 ${
                      selectedTable === t.number
                        ? 'bg-[var(--color-gold)]/15 border-[var(--color-gold)]/40 text-[var(--color-gold)]'
                        : t.capacity < tableModal.reservation.guest_count
                          ? 'bg-[var(--color-dark)] border-[var(--glass-border)] text-[var(--color-text-muted)] opacity-50'
                          : 'bg-[var(--color-dark)] border-[var(--glass-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-gold)]/25'
                    }`}>
                    <p className="font-semibold">Table {t.number}</p>
                    <p className="text-xs opacity-75">{t.capacity} seats</p>
                  </button>
                ))}
              </div>
              <button onClick={handleApproveWithTable} disabled={!selectedTable || !!actionLoading}
                className="w-full py-3 rounded-lg text-sm font-semibold uppercase tracking-wider bg-gradient-to-r from-[var(--color-gold-dark)] via-[var(--color-gold)] to-[var(--color-gold-light)] text-[var(--color-dark)] hover:shadow-[0_0_30px_rgba(198,169,98,0.4)] disabled:opacity-50 transition-all duration-300 flex items-center justify-center gap-2">
                {actionLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : tableModal.action === 'approve' ? 'Approve' : 'Assign Table'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
