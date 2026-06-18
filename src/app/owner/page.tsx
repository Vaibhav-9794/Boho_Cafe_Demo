'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, RefreshCw, Calendar, Clock, Users, Filter,
  CheckCircle, XCircle, AlertTriangle, Eye, LogOut,
  ChevronLeft, ChevronRight, Ban, MapPin, Phone, Mail,
  PartyPopper, Utensils, LayoutList, LayoutGrid, ShieldBan,
  Loader2, Crown, Menu, X, UtensilsCrossed, BarChart3, Shield,
  FileText, CalendarDays, Star, Database, Activity, Download,
  ClipboardList, UserCheck, Armchair,
} from 'lucide-react';
import { createAuthBrowserClient } from '@/lib/supabase';
import type { Reservation, BlockedDate } from '@/lib/supabase';
import { TABLES, TIME_SLOTS, RESTAURANT_CONFIG } from '@/data/restaurant';
import { ExportDropdown, exportToCSV, exportToExcel, exportToPDF } from '@/lib/export';

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

const STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'ARRIVED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'NO_SHOW'] as const;

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  HELD: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  PENDING: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  CONFIRMED: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
  ARRIVED: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  COMPLETED: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  REJECTED: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  CANCELLED: { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/30' },
  NO_SHOW: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
};

const TIMELINE_COLORS = [
  '#C6A962', '#22C55E', '#3B82F6', '#A855F7', '#EC4899',
  '#F97316', '#14B8A6', '#EF4444', '#6366F1', '#84CC16',
];

export default function OwnerReservationsPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [timelineDate, setTimelineDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [timelineData, setTimelineData] = useState<Reservation[]>([]);
  const [blockedDate, setBlockedDate] = useState<BlockedDate | null>(null);
  const [tableModal, setTableModal] = useState<{ reservation: Reservation; action: string } | null>(null);
  const [occupiedTables, setOccupiedTables] = useState<number[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setInterval>>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [quickStats, setQuickStats] = useState<{
    todayReservations: number; pendingApprovals: number;
    tablesOccupied: number; vipCount: number; waitlistCount: number;
  } | null>(null);

  // Auth check
  useEffect(() => {
    (async () => {
      const supabase = createAuthBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/staff-login'); return; }
      setAuthed(true);
    })();
  }, [router]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch list view
  const fetchReservations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeStatus !== 'ALL') params.set('status', activeStatus);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admin/reservations?${params}`);
      if (res.status === 401) { router.push('/staff-login'); return; }
      const data = await res.json();
      if (data.success) {
        setReservations(data.reservations || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch { showToast('Failed to fetch reservations', 'error'); }
    finally { setLoading(false); }
  }, [activeStatus, search, router, showToast]);

  // Fetch timeline view
  const fetchTimeline = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/reservations?view=timeline&date=${timelineDate}`);
      if (res.status === 401) { router.push('/staff-login'); return; }
      const data = await res.json();
      if (data.success) {
        setTimelineData(data.reservations || []);
        setBlockedDate(data.blockedDate || null);
      }
    } catch { showToast('Failed to fetch timeline', 'error'); }
  }, [timelineDate, router, showToast]);

  // Main data fetch
  useEffect(() => {
    if (!authed) return;
    if (viewMode === 'list') { setLoading(true); fetchReservations(); }
    else { fetchTimeline(); }
  }, [authed, viewMode, fetchReservations, fetchTimeline]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!authed) return;
    refreshTimer.current = setInterval(() => {
      if (viewMode === 'list') fetchReservations();
      else fetchTimeline();
    }, 30000);
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current); };
  }, [authed, viewMode, fetchReservations, fetchTimeline]);

  // Debounced search
  useEffect(() => {
    if (!authed) return;
    const t = setTimeout(() => { if (viewMode === 'list') fetchReservations(); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Actions
  const handleAction = async (id: string, action: string, tableNumber?: number) => {
    setActionLoading(id);
    try {
      const body: Record<string, unknown> = { id, action };
      if (tableNumber) body.tableNumber = tableNumber;
      const res = await fetch('/api/admin/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 401) { router.push('/staff-login'); return; }
      const data = await res.json();
      if (data.success) {
        showToast(`Reservation ${action.replace('_', ' ')} successfully`);
        setTableModal(null);
        fetchReservations();
        if (viewMode === 'timeline') fetchTimeline();
      } else {
        showToast(data.message || 'Action failed', 'error');
      }
    } catch { showToast('Action failed', 'error'); }
    finally { setActionLoading(null); }
  };

  const openTableModal = (reservation: Reservation, action: string) => {
    const occupied = reservations
      .filter(r => r.date === reservation.date && r.table_number && ['CONFIRMED', 'ARRIVED'].includes(r.status))
      .map(r => r.table_number!);
    setOccupiedTables(occupied);
    setTableModal({ reservation, action });
  };

  // Block date via modal
  const handleBlockDate = async () => {
    if (!blockReason.trim()) return;
    const res = await fetch('/api/admin/blocked-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: timelineDate, reason: blockReason.trim() }),
    });
    if (res.ok) { showToast('Date blocked'); setBlockModalOpen(false); setBlockReason(''); fetchTimeline(); }
  };

  // Fetch quick stats
  const fetchQuickStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard-stats');
      if (res.ok) { const data = await res.json(); setQuickStats(data); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (authed) fetchQuickStats(); }, [authed, fetchQuickStats]);

  // Export helpers
  const getExportData = () => reservations.map(r => ({
    'Customer Name': r.customer_name, 'Phone': r.phone, 'Email': r.email,
    'Date': r.date, 'Time': r.start_time || r.time, 'End Time': r.end_time || '',
    'Guests': r.guest_count, 'Table': r.table_number || '—', 'Status': r.status,
    'Booking Type': r.booking_type || 'TABLE', 'Occasion': r.occasion || '',
  }));

  const handleUnblockDate = async () => {
    if (!blockedDate) return;
    const res = await fetch('/api/admin/blocked-dates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: blockedDate.id }),
    });
    if (res.ok) { showToast('Date unblocked'); fetchTimeline(); }
  };

  const handleLogout = async () => {
    const supabase = createAuthBrowserClient();
    await supabase.auth.signOut();
    router.push('/staff-login');
  };

  // Date navigation for timeline
  const shiftDate = (days: number) => {
    const d = new Date(timelineDate);
    d.setDate(d.getDate() + days);
    setTimelineDate(d.toISOString().split('T')[0]);
  };

  // Timeline helper: compute column span for a reservation
  const getTimelinePosition = (r: Reservation) => {
    const startTime = r.start_time || r.time;
    const endTime = r.end_time || startTime;
    const parseHour = (t: string) => {
      const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!m) return 12;
      let h = parseInt(m[1]);
      if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
      if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
      return h;
    };
    const start = Math.max(parseHour(startTime) - 12, 0);
    const end = Math.min(parseHour(endTime) - 12, 11);
    return { start, span: Math.max(end - start, 1) };
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C6A962] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-[rgba(198,169,98,0.12)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C6A962] to-[#A88B3E] flex items-center justify-center">
              <Crown className="w-4 h-4 text-[#0A0A0A]" />
            </div>
            <span className="hidden sm:block text-lg font-semibold font-[family-name:var(--font-playfair)] text-[#C6A962]">Owner Panel</span>
          </div>
          <div className="hidden md:flex items-center gap-1 overflow-x-auto">
            {NAV_LINKS.slice(0, 6).map(link => (
              <a
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
                  link.href === '/owner'
                    ? 'bg-[#C6A962]/15 text-[#C6A962]'
                    : 'text-[#A09888] hover:text-[#F5F0E8] hover:bg-white/5'
                }`}
              >
                {link.label}
              </a>
            ))}
            <button onClick={() => setMobileNavOpen(true)} className="px-3 py-1.5 rounded-lg text-sm text-[#A09888] hover:text-[#F5F0E8] hover:bg-white/5">More ▾</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="hidden sm:flex items-center gap-2 text-sm text-[#A09888] hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" /> Logout
            </button>
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="md:hidden p-2 text-[#A09888] hover:text-[#F5F0E8]">
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Nav Drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#111] border-b border-[#2A2A2A] overflow-hidden z-40"
          >
            <div className="p-4 grid grid-cols-2 gap-2">
              {NAV_LINKS.map(link => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      link.href === '/owner'
                        ? 'bg-[#C6A962]/15 text-[#C6A962]'
                        : 'text-[#A09888] hover:text-[#F5F0E8] hover:bg-white/5'
                    }`}
                  >
                    <Icon size={16} />
                    {link.label}
                  </a>
                );
              })}
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 col-span-2">
                <LogOut size={16} /> Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold font-[family-name:var(--font-playfair)] text-gradient-gold mb-1">
            Reservations
          </h1>
          <p className="text-[#A09888] text-sm">{RESTAURANT_CONFIG.name} · {RESTAURANT_CONFIG.operatingHours.open} – {RESTAURANT_CONFIG.operatingHours.close}</p>
        </motion.div>

        {/* Quick Stats */}
        {quickStats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: "Today's Reservations", value: quickStats.todayReservations, icon: Calendar, color: 'text-[#C6A962]' },
              { label: 'Pending Approvals', value: quickStats.pendingApprovals, icon: Clock, color: 'text-amber-400' },
              { label: 'Tables Occupied', value: quickStats.tablesOccupied, icon: Armchair, color: 'text-cyan-400' },
              { label: 'VIP Customers', value: quickStats.vipCount, icon: Star, color: 'text-yellow-400' },
              { label: 'Waitlist', value: quickStats.waitlistCount, icon: ClipboardList, color: 'text-purple-400' },
              { label: 'Total Capacity', value: `${TABLES.reduce((s, t) => s + t.capacity, 0)} seats`, icon: Users, color: 'text-teal-400' },
            ].map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} className={stat.color} />
                    <span className="text-xs text-[#6B5F4F] truncate">{stat.label}</span>
                  </div>
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* View mode toggle + Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex bg-[#1A1A1A] rounded-lg border border-[rgba(198,169,98,0.12)] p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
                viewMode === 'list' ? 'bg-[#C6A962]/15 text-[#C6A962]' : 'text-[#A09888] hover:text-[#F5F0E8]'
              }`}
            >
              <LayoutList className="w-4 h-4" /> List
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
                viewMode === 'timeline' ? 'bg-[#C6A962]/15 text-[#C6A962]' : 'text-[#A09888] hover:text-[#F5F0E8]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Timeline
            </button>
          </div>

          {viewMode === 'list' && (
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A09888]" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1A1A1A] border border-[rgba(198,169,98,0.12)] text-[#F5F0E8] text-sm placeholder:text-[#6B5F4F] focus:outline-none focus:border-[#C6A962]/40"
              />
            </div>
          )}

          <button
            onClick={() => viewMode === 'list' ? fetchReservations() : fetchTimeline()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1A1A1A] border border-[rgba(198,169,98,0.12)] text-[#A09888] hover:text-[#C6A962] hover:border-[#C6A962]/30 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>

          {viewMode === 'list' && (
            <ExportDropdown
              onExportCSV={() => exportToCSV(getExportData(), `reservations-${activeStatus.toLowerCase()}`)}
              onExportExcel={() => exportToExcel(getExportData(), `reservations-${activeStatus.toLowerCase()}`, 'Reservations')}
              onExportPDF={() => exportToPDF(getExportData(), [
                { header: 'Name', dataKey: 'Customer Name' }, { header: 'Phone', dataKey: 'Phone' },
                { header: 'Date', dataKey: 'Date' }, { header: 'Time', dataKey: 'Time' },
                { header: 'Guests', dataKey: 'Guests' }, { header: 'Table', dataKey: 'Table' },
                { header: 'Status', dataKey: 'Status' }, { header: 'Type', dataKey: 'Booking Type' },
              ], `Reservations — ${activeStatus}`, `reservations-${activeStatus.toLowerCase()}`)}
            />
          )}
        </div>

        {/* ── LIST VIEW ── */}
        {viewMode === 'list' && (
          <>
            {/* Status tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {STATUSES.map(status => {
                const count = status === 'ALL' ? counts.total : counts[status.toLowerCase()];
                const isActive = activeStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => setActiveStatus(status)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      isActive
                        ? 'bg-[#C6A962]/15 text-[#C6A962] border-[#C6A962]/30'
                        : 'bg-[#1A1A1A] text-[#A09888] border-[rgba(198,169,98,0.08)] hover:border-[rgba(198,169,98,0.2)]'
                    }`}
                  >
                    {status === 'NO_SHOW' ? 'No Show' : status.charAt(0) + status.slice(1).toLowerCase()}
                    {count !== undefined && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-[#C6A962]/25' : 'bg-white/5'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Reservation cards */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-[#C6A962] animate-spin" />
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-20 text-[#6B5F4F]">
                <Filter className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No reservations found</p>
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {reservations.map(r => {
                  const sc = STATUS_COLORS[r.status] || STATUS_COLORS.PENDING;
                  const isActioning = actionLoading === r.id;
                  return (
                    <motion.div
                      key={r.id}
                      variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                      className="group bg-[rgba(26,26,26,0.6)] backdrop-blur-xl border border-[rgba(198,169,98,0.1)] rounded-xl p-5 hover:border-[rgba(198,169,98,0.25)] transition-all"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0">
                          <h3 className="text-[#F5F0E8] font-semibold truncate">{r.customer_name}</h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-[#A09888]">
                            <Phone className="w-3 h-3" /><span className="truncate">{r.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-[#A09888]">
                            <Mail className="w-3 h-3" /><span className="truncate">{r.email}</span>
                          </div>
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                          {r.status === 'NO_SHOW' ? 'No Show' : r.status}
                        </span>
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                        <div className="flex items-center gap-1.5 text-[#A09888]">
                          <Calendar className="w-3.5 h-3.5 text-[#C6A962]" />
                          {r.date}
                        </div>
                        <div className="flex items-center gap-1.5 text-[#A09888]">
                          <Clock className="w-3.5 h-3.5 text-[#C6A962]" />
                          {r.start_time || r.time}{r.end_time ? ` → ${r.end_time}` : ''}
                        </div>
                        <div className="flex items-center gap-1.5 text-[#A09888]">
                          <Users className="w-3.5 h-3.5 text-[#C6A962]" />
                          {r.guest_count} guest{r.guest_count !== 1 ? 's' : ''}
                        </div>
                        {r.table_number && (() => {
                          const tableConfig = TABLES.find(t => t.number === r.table_number);
                          const cap = tableConfig?.capacity || 0;
                          const ratio = cap > 0 ? r.guest_count / cap : 0;
                          const indicator = r.guest_count > cap
                            ? { icon: '🔴', color: 'text-red-400', label: 'Over Capacity' }
                            : ratio > 0.8
                              ? { icon: '🟡', color: 'text-amber-400', label: 'Nearly Full' }
                              : { icon: '🟢', color: 'text-emerald-400', label: 'Comfortable' };
                          return (
                            <div className="flex items-center gap-1.5 col-span-2">
                              <Armchair className="w-3.5 h-3.5 text-[#C6A962]" />
                              <span className="text-[#A09888]">Table {r.table_number}</span>
                              <span className="text-[#6B5F4F]">·</span>
                              <span className="text-[#A09888]">Cap: {cap}</span>
                              <span className={`text-[10px] font-semibold ${indicator.color}`}>{indicator.icon} {indicator.label}</span>
                            </div>
                          );
                        })()}
                        {r.occasion && r.occasion !== 'Casual Dining' && (
                          <div className="flex items-center gap-1.5 text-[#A09888] col-span-2">
                            <PartyPopper className="w-3.5 h-3.5 text-[#C6A962]" />
                            {r.occasion}
                          </div>
                        )}
                        {r.booking_type && r.booking_type !== 'TABLE' && (
                          <div className="flex items-center gap-1.5 text-amber-400 col-span-2">
                            <Utensils className="w-3.5 h-3.5" />
                            {r.booking_type === 'FULL_CAFE' ? 'Full Cafe Booking' : 'Event Booking'}
                          </div>
                        )}
                      </div>

                      {/* Event details */}
                      {r.event_details && (
                        <div className="mb-3 p-2.5 rounded-lg bg-[#0A0A0A]/50 border border-[rgba(198,169,98,0.08)] text-xs text-[#A09888]">
                          <span className="text-[#C6A962] font-medium">Event:</span>{' '}
                          {r.event_details.eventType || 'Private'} · {r.event_details.expectedGuests || r.guest_count} guests
                          {r.event_details.decorationRequired && ' · 🎨 Decor'}
                          {r.event_details.cakeRequired && ' · 🎂 Cake'}
                          {r.event_details.eventNotes && <p className="mt-1 italic">{r.event_details.eventNotes}</p>}
                        </div>
                      )}

                      {/* Special requests */}
                      {r.special_requests && (
                        <p className="text-xs text-[#6B5F4F] italic mb-3 truncate" title={r.special_requests}>
                          &quot;{r.special_requests}&quot;
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-[rgba(198,169,98,0.08)]">
                        {r.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => openTableModal(r, 'approve')}
                              disabled={isActioning}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleAction(r.id, 'reject')}
                              disabled={isActioning}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}
                        {r.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleAction(r.id, 'mark_arrived')}
                            disabled={isActioning}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/25 transition-colors disabled:opacity-50"
                          >
                            <Eye className="w-3.5 h-3.5" /> Mark Arrived
                          </button>
                        )}
                        {r.status === 'ARRIVED' && (
                          <>
                            <button
                              onClick={() => handleAction(r.id, 'mark_completed')}
                              disabled={isActioning}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Complete
                            </button>
                            <button
                              onClick={() => handleAction(r.id, 'mark_noshow')}
                              disabled={isActioning}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/15 text-orange-400 border border-orange-500/25 hover:bg-orange-500/25 transition-colors disabled:opacity-50"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" /> No-Show
                            </button>
                          </>
                        )}
                        {['PENDING', 'CONFIRMED', 'ARRIVED'].includes(r.status) && (
                          <button
                            onClick={() => handleAction(r.id, 'cancel')}
                            disabled={isActioning}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20 transition-colors disabled:opacity-50 ml-auto"
                          >
                            <Ban className="w-3.5 h-3.5" /> Cancel
                          </button>
                        )}
                        {isActioning && <Loader2 className="w-4 h-4 text-[#C6A962] animate-spin ml-2 self-center" />}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </>
        )}

        {/* ── TIMELINE VIEW ── */}
        {viewMode === 'timeline' && (
          <>
            {/* Date navigation */}
            <div className="flex items-center gap-4 mb-5">
              <button onClick={() => shiftDate(-1)} className="p-2 rounded-lg bg-[#1A1A1A] border border-[rgba(198,169,98,0.12)] text-[#A09888] hover:text-[#C6A962] transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#C6A962]" />
                <input
                  type="date"
                  value={timelineDate}
                  onChange={e => setTimelineDate(e.target.value)}
                  className="bg-transparent text-[#F5F0E8] text-sm focus:outline-none"
                />
              </div>
              <button onClick={() => shiftDate(1)} className="p-2 rounded-lg bg-[#1A1A1A] border border-[rgba(198,169,98,0.12)] text-[#A09888] hover:text-[#C6A962] transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTimelineDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-1.5 rounded-lg text-xs bg-[#C6A962]/10 text-[#C6A962] border border-[#C6A962]/20 hover:bg-[#C6A962]/20 transition-colors"
              >
                Today
              </button>
              <div className="ml-auto flex gap-2">
                {blockedDate ? (
                  <button onClick={handleUnblockDate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors">
                    <CheckCircle className="w-3.5 h-3.5" /> Unblock Date
                  </button>
                ) : (
                  <button onClick={() => setBlockModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                    <ShieldBan className="w-3.5 h-3.5" /> Block Date
                  </button>
                )}
              </div>
            </div>

            {/* Blocked date banner */}
            {blockedDate && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center gap-3"
              >
                <ShieldBan className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-red-400 text-sm font-semibold">This date is blocked</p>
                  {blockedDate.reason && <p className="text-red-400/70 text-xs">{blockedDate.reason}</p>}
                </div>
              </motion.div>
            )}

            {/* Timeline grid */}
            <div className="overflow-x-auto rounded-xl border border-[rgba(198,169,98,0.1)]">
              <div className="min-w-[900px]">
                {/* Header row */}
                <div className="grid grid-cols-[100px_repeat(12,1fr)] bg-[#1A1A1A] border-b border-[rgba(198,169,98,0.1)]">
                  <div className="p-3 text-xs text-[#6B5F4F] font-medium border-r border-[rgba(198,169,98,0.06)]">Table</div>
                  {TIME_SLOTS.map(slot => (
                    <div key={slot} className="p-3 text-xs text-[#6B5F4F] text-center border-r border-[rgba(198,169,98,0.06)] last:border-r-0">
                      {slot.replace(':00 ', '')}
                    </div>
                  ))}
                </div>

                {/* Table rows */}
                {TABLES.map((table, tableIdx) => {
                  const tableReservations = timelineData.filter(r => r.table_number === table.number);
                  return (
                    <div
                      key={table.number}
                      className="grid grid-cols-[100px_repeat(12,1fr)] border-b border-[rgba(198,169,98,0.06)] last:border-b-0 relative"
                      style={{ minHeight: '48px' }}
                    >
                      <div className="p-3 text-xs text-[#A09888] font-medium border-r border-[rgba(198,169,98,0.06)] bg-[#0F0F0F] flex items-center">
                        T{table.number} ({table.capacity})
                      </div>
                      {/* Empty cells */}
                      {TIME_SLOTS.map((_, i) => (
                        <div key={i} className="border-r border-[rgba(198,169,98,0.04)] last:border-r-0" />
                      ))}
                      {/* Reservation blocks */}
                      {tableReservations.map((r, ri) => {
                        const pos = getTimelinePosition(r);
                        const color = TIMELINE_COLORS[tableIdx % TIMELINE_COLORS.length];
                        return (
                          <div
                            key={r.id}
                            className="absolute top-1 bottom-1 rounded-md flex items-center px-2 text-[10px] font-medium truncate cursor-default z-10"
                            style={{
                              left: `calc(100px + ${(pos.start / 12) * (100 - (100 / 13))}%)`,
                              width: `calc(${(pos.span / 12) * (100 - (100 / 13))}% - 4px)`,
                              backgroundColor: `${color}20`,
                              border: `1px solid ${color}40`,
                              color: color,
                            }}
                            title={`${r.customer_name} · ${r.guest_count} guests · Table Cap: ${TABLES.find(t => t.number === table.number)?.capacity || '?'} · ${r.start_time || r.time} → ${r.end_time || ''}`}
                          >
                            {r.customer_name} ({r.guest_count}/{table.capacity})
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Unassigned reservations */}
            {(() => {
              const unassigned = timelineData.filter(r => !r.table_number);
              if (unassigned.length === 0) return null;
              return (
                <div className="mt-5">
                  <h3 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {unassigned.length} Unassigned Reservation{unassigned.length !== 1 ? 's' : ''}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {unassigned.map(r => (
                      <div key={r.id} className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                        {r.customer_name} · {r.guest_count}g · {r.start_time || r.time}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* ── TABLE ASSIGNMENT MODAL ── */}
      <AnimatePresence>
        {tableModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setTableModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1A1A] border border-[rgba(198,169,98,0.2)] rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold font-[family-name:var(--font-playfair)] text-[#F5F0E8] mb-1">Assign Table</h2>
              <p className="text-sm text-[#A09888] mb-5">
                {tableModal.reservation.customer_name} · {tableModal.reservation.guest_count} guests
              </p>
              <div className="grid grid-cols-2 gap-3">
                {TABLES.map(table => {
                  const isOccupied = occupiedTables.includes(table.number);
                  const tooSmall = table.capacity < tableModal.reservation.guest_count;
                  const disabled = isOccupied || tooSmall;
                  return (
                    <button
                      key={table.number}
                      disabled={disabled}
                      onClick={() => handleAction(tableModal.reservation.id, tableModal.action, table.number)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        disabled
                          ? 'bg-[#0A0A0A]/50 border-[rgba(198,169,98,0.05)] text-[#6B5F4F] cursor-not-allowed opacity-50'
                          : 'bg-[#0A0A0A] border-[rgba(198,169,98,0.12)] text-[#F5F0E8] hover:border-[#C6A962]/40 hover:bg-[#C6A962]/5 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Table {table.number}</span>
                        <span className={`text-xs ${disabled ? 'text-[#6B5F4F]' : 'text-[#C6A962]'}`}>{table.capacity} seats</span>
                      </div>
                      {isOccupied && <span className="text-[10px] text-red-400 mt-1 block">Occupied</span>}
                      {!isOccupied && tooSmall && <span className="text-[10px] text-amber-400 mt-1 block">Too small</span>}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setTableModal(null)}
                className="w-full mt-4 py-2.5 rounded-lg text-sm text-[#A09888] border border-[rgba(198,169,98,0.1)] hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOAST ── */}
      {/* Block Date Modal */}
      <AnimatePresence>
        {blockModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setBlockModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-semibold text-[#F5F0E8] mb-1">Block Date</h3>
              <p className="text-sm text-[#A09888] mb-4">Block <span className="text-[#C6A962]">{timelineDate}</span> from reservations</p>
              <input
                type="text"
                placeholder="Reason (e.g., Christmas Event, Private Party)"
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-[#F5F0E8] text-sm placeholder:text-[#6B5F4F] focus:outline-none focus:border-[#C6A962]/40 mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button onClick={() => setBlockModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2A2A2A] text-[#A09888] hover:bg-white/5 text-sm">Cancel</button>
                <button
                  onClick={handleBlockDate}
                  disabled={!blockReason.trim()}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 text-sm disabled:opacity-40"
                >
                  Block Date
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl border backdrop-blur-xl text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-green-500/15 text-green-400 border-green-500/25'
                : 'bg-red-500/15 text-red-400 border-red-500/25'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
