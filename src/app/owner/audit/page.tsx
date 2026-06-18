'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  FileText,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Shield,
  Loader2,
  LogOut,
  ChevronDown,
  XCircle,
  X,
  Menu as MenuIcon,
  RefreshCw,
  Users, UtensilsCrossed, BarChart3, CalendarDays, Mail, Star, Database, Activity,
} from 'lucide-react';
import { createAuthBrowserClient } from '@/lib/supabase';
import type { AuditLog } from '@/lib/supabase';
import { ExportDropdown, exportToCSV, exportToExcel, exportToPDF } from '@/lib/export';

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

/* ─── Action types for dropdown ─── */
const ACTION_TYPES = [
  '',
  'MANAGER_CREATED',
  'MANAGER_SUSPENDED',
  'MANAGER_DEACTIVATED',
  'MANAGER_ACTIVATED',
  'MANAGER_NAME_UPDATED',
  'MANAGER_PASSWORD_RESET',
  'MANAGER_DELETED',
  'RESERVATION_APPROVED',
  'RESERVATION_REJECTED',
  'RESERVATION_CANCELLED',
  'RESERVATION_ARRIVED',
  'RESERVATION_COMPLETED',
  'RESERVATION_NO_SHOW',
  'CUSTOMER_NOTE_ADDED',
  'CUSTOMER_NOTE_DELETED',
  'MENU_UPDATED',
  'MENU_ITEM_CREATED',
  'MENU_ITEM_DELETED',
  'BLOCKED_DATE_ADDED',
  'BLOCKED_DATE_REMOVED',
];

/* ─── Action badge colors ─── */
function getActionColor(action: string): { bg: string; border: string; text: string } {
  if (action.includes('CREATED') || action.includes('ACTIVATED') || action.includes('APPROVED') || action.includes('COMPLETED')) {
    return { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400' };
  }
  if (action.includes('SUSPENDED') || action.includes('REJECTED') || action.includes('NO_SHOW') || action.includes('DELETED') || action.includes('DEACTIVATED') || action.includes('CANCELLED')) {
    return { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400' };
  }
  if (action.includes('PASSWORD') || action.includes('ARRIVED')) {
    return { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400' };
  }
  if (action.includes('MENU') || action.includes('BLOCKED') || action.includes('NOTE')) {
    return { bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-400' };
  }
  if (action.includes('NAME')) {
    return { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-400' };
  }
  return { bg: 'bg-gray-500/15', border: 'border-gray-500/30', text: 'text-gray-400' };
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
export default function OwnerAuditPage() {
  const router = useRouter();
  const supabase = createAuthBrowserClient();

  /* ── State ── */
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [limit, setLimit] = useState(50);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [error, setError] = useState('');

  /* ── Auth check ── */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/staff-login'); return; }
      fetchLogs(50, false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Fetch logs ── */
  const fetchLogs = useCallback(async (fetchLimit: number, append: boolean) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);
      if (actorFilter.trim()) params.set('actor', actorFilter.trim());
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      params.set('limit', String(fetchLimit));

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        const newLogs = data.logs || [];
        if (append) {
          setLogs(newLogs);
        } else {
          setLogs(newLogs);
        }
        setHasMore(newLogs.length >= fetchLimit);
      } else {
        setError(data.message || 'Failed to load audit logs.');
      }
    } catch {
      setError('Failed to load audit logs.');
    }
    setLoading(false);
    setLoadingMore(false);
  }, [actionFilter, actorFilter, dateFrom, dateTo]);

  /* ── Auto-load on filter change ── */
  useEffect(() => {
    const t = setTimeout(() => {
      setLimit(50);
      fetchLogs(50, false);
    }, 500);
    return () => clearTimeout(t);
  }, [actionFilter, actorFilter, dateFrom, dateTo, fetchLogs]);

  /* ── Load more ── */
  const handleLoadMore = () => {
    const newLimit = limit + 50;
    setLimit(newLimit);
    fetchLogs(newLimit, true);
  };

  /* ── Logout ── */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/staff-login');
  };

  /* ── Export helpers ── */
  const EXPORT_COLUMNS = [
    { header: 'Actor Email', dataKey: 'actor_email' },
    { header: 'Actor Role', dataKey: 'actor_role' },
    { header: 'Action', dataKey: 'action' },
    { header: 'Details', dataKey: 'details' },
    { header: 'Target ID', dataKey: 'target_id' },
    { header: 'Created At', dataKey: 'created_at' },
  ];

  const getExportData = () =>
    logs.map((log) => ({
      actor_email: log.actor_email,
      actor_role: log.actor_role,
      action: log.action,
      details: log.details,
      target_id: log.target_id || '',
      created_at: new Date(log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    }));

  const handleExportCSV = () => exportToCSV(getExportData(), 'boho-audit-logs');
  const handleExportExcel = () => exportToExcel(getExportData(), 'boho-audit-logs', 'Audit Logs');
  const handleExportPDF = () =>
    exportToPDF(getExportData(), EXPORT_COLUMNS, 'Audit Logs', 'boho-audit-logs');

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
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-dark)] flex items-center justify-center">
                <Crown className="w-4 h-4 text-[var(--color-dark)]" />
              </div>
              <span className="text-lg font-semibold text-[var(--color-champagne)] font-[family-name:var(--font-playfair)] hidden sm:block">
                Owner Panel
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    link.href === '/owner/audit'
                      ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/25'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-champagne)] hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-red-400 transition-colors duration-300"
              >
                <LogOut className="w-4 h-4" /> Logout
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
                      link.href === '/owner/audit'
                        ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)]'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-champagne)]'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
                <button onClick={handleLogout} className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10">
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gradient-gold font-[family-name:var(--font-playfair)] mb-2">
              Audit Logs
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Track all administrative actions and changes
            </p>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
                <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filter Bar */}
          <motion.div
            variants={itemVariants}
            className="mb-6 rounded-xl border border-[var(--glass-border)] bg-[var(--color-dark-card)] p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
                <Filter className="w-4 h-4 text-[var(--color-gold)]" />
                Filters
              </div>
              {logs.length > 0 && (
                <ExportDropdown
                  onExportCSV={handleExportCSV}
                  onExportExcel={handleExportExcel}
                  onExportPDF={handleExportPDF}
                />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Action Type */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 font-medium">Action Type</label>
                <div className="relative">
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="w-full appearance-none px-3 py-2.5 rounded-lg bg-[var(--color-dark)] border border-[var(--glass-border)]
                               text-[var(--color-text-primary)] text-sm pr-10
                               focus:outline-none focus:border-[var(--color-gold)]/40 transition-all duration-300 cursor-pointer"
                  >
                    <option value="">All Actions</option>
                    {ACTION_TYPES.filter(Boolean).map((at) => (
                      <option key={at} value={at}>{at.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
                </div>
              </div>

              {/* Actor email */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 font-medium">Actor Email</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    value={actorFilter}
                    onChange={(e) => setActorFilter(e.target.value)}
                    placeholder="Search by email…"
                    className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-[var(--color-dark)] border border-[var(--glass-border)]
                               text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-sm
                               focus:outline-none focus:border-[var(--color-gold)]/40 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 font-medium">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-dark)] border border-[var(--glass-border)]
                             text-[var(--color-text-primary)] text-sm
                             focus:outline-none focus:border-[var(--color-gold)]/40 transition-all duration-300
                             [color-scheme:dark]"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 font-medium">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-dark)] border border-[var(--glass-border)]
                             text-[var(--color-text-primary)] text-sm
                             focus:outline-none focus:border-[var(--color-gold)]/40 transition-all duration-300
                             [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {(actionFilter || actorFilter || dateFrom || dateTo) && (
              <button
                onClick={() => { setActionFilter(''); setActorFilter(''); setDateFrom(''); setDateTo(''); }}
                className="mt-3 text-xs text-[var(--color-gold)] hover:text-[var(--color-gold-light)] transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Clear all filters
              </button>
            )}
          </motion.div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[var(--color-gold)] animate-spin" />
            </div>
          )}

          {/* Empty */}
          {!loading && logs.length === 0 && (
            <motion.div variants={itemVariants} className="text-center py-20">
              <FileText className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
              <p className="text-[var(--color-text-secondary)] text-lg">No audit logs found</p>
              <p className="text-[var(--color-text-muted)] text-sm mt-1">Try adjusting your filters</p>
            </motion.div>
          )}

          {/* Logs List */}
          {!loading && logs.length > 0 && (
            <motion.div variants={containerVariants} className="space-y-2">
              {logs.map((log) => {
                const color = getActionColor(log.action);
                return (
                  <motion.div
                    key={log.id}
                    variants={itemVariants}
                    className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-dark-card)] p-4
                               hover:border-[var(--color-gold)]/15 transition-colors duration-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Timestamp */}
                      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] shrink-0 sm:w-40">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {new Date(log.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          {new Date(log.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Actor */}
                      <div className="flex items-center gap-2 text-xs shrink-0 sm:w-48 min-w-0">
                        <User className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                        <span className="text-[var(--color-text-secondary)] truncate">{log.actor_email}</span>
                        {/* Role badge */}
                        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          log.actor_role === 'OWNER'
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                        }`}>
                          {log.actor_role === 'OWNER' ? <Crown className="w-2.5 h-2.5" /> : <Shield className="w-2.5 h-2.5" />}
                          {log.actor_role}
                        </span>
                      </div>

                      {/* Action badge */}
                      <div className="shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${color.bg} ${color.border} ${color.text}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--color-text-secondary)] truncate" title={log.details}>
                          {log.details}
                        </p>
                      </div>

                      {/* Target ID */}
                      {log.target_id && (
                        <div className="shrink-0 text-xs text-[var(--color-text-muted)]" title={`Target: ${log.target_id}`}>
                          <span className="hidden lg:inline">ID: </span>
                          <span className="font-mono">{log.target_id.substring(0, 8)}…</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Load More */}
          {!loading && hasMore && (
            <motion.div variants={itemVariants} className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium
                           bg-[var(--color-dark-card)] border border-[var(--glass-border)] text-[var(--color-text-secondary)]
                           hover:text-[var(--color-gold)] hover:border-[var(--color-gold)]/25
                           disabled:opacity-50 transition-all duration-300"
              >
                {loadingMore ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                ) : (
                  'Load More'
                )}
              </button>
            </motion.div>
          )}

          {/* Count */}
          {!loading && logs.length > 0 && (
            <motion.p variants={itemVariants} className="text-center text-sm text-[var(--color-text-muted)] mt-4">
              Showing {logs.length} log{logs.length !== 1 ? 's' : ''}
            </motion.p>
          )}
        </motion.div>
      </main>
    </div>
  );
}
