'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, TrendingUp, Users, Clock, BarChart3,
  LogOut, Crown, Loader2, PieChart, Star, Eye,
  UserCheck, UserX, ArrowUpRight, ArrowDownRight,
  Menu as MenuIcon, X, UtensilsCrossed, Shield, FileText,
  CalendarDays, Database, Activity, Mail, XCircle,
} from 'lucide-react';
import { createAuthBrowserClient } from '@/lib/supabase';
import { ExportDropdown, exportToCSV, exportToExcel, exportToPDF } from '@/lib/export';

const NAV_LINKS = [
  { href: '/owner', label: 'Reservations', icon: Calendar },
  { href: '/owner/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/owner/customers', label: 'Customers', icon: Users },
  { href: '/owner/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/owner/staff', label: 'Staff', icon: Shield },
  { href: '/owner/audit', label: 'Audit Logs', icon: FileText },
  { href: '/owner/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/owner/newsletter', label: 'Newsletter', icon: Mail },
  { href: '/owner/reviews', label: 'Reviews', icon: Star },
  { href: '/owner/backups', label: 'Backups', icon: Database },
  { href: '/owner/system', label: 'System', icon: Activity },
];

interface AnalyticsData {
  counts: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    no_show: number;
    arrived: number;
    completed: number;
  };
  reservationsPerDay: { date: string; count: number }[];
  peakHours: { hour: string; count: number }[];
  popularTables: { table: number; count: number }[];
  popularOccasions: { occasion: string; count: number }[];
  waitlistCount: number;
  vipCount: number;
}

export default function OwnerAnalyticsPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    (async () => {
      const supabase = createAuthBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/staff-login'); return; }
      setAuthed(true);
    })();
  }, [router]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/analytics?from=${fromDate}&to=${toDate}`);
      if (res.status === 401) { router.push('/staff-login'); return; }
      const data = await res.json();
      if (data.success) setAnalytics(data.analytics);
      else setError(data.message || 'Failed to load analytics data.');
    } catch { setError('Failed to load analytics. Please try again.'); }
    finally { setLoading(false); }
  }, [fromDate, toDate, router]);

  useEffect(() => {
    if (authed) fetchAnalytics();
  }, [authed, fetchAnalytics]);

  const handleLogout = async () => {
    const supabase = createAuthBrowserClient();
    await supabase.auth.signOut();
    router.push('/staff-login');
  };

  // Quick preset ranges
  const setRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setFromDate(from.toISOString().split('T')[0]);
    setToDate(to.toISOString().split('T')[0]);
  };

  // SVG bar chart helper
  const BarChart = ({ data, labelKey, valueKey, color = '#C6A962', height = 200 }: {
    data: Record<string, unknown>[];
    labelKey: string;
    valueKey: string;
    color?: string;
    height?: number;
  }) => {
    if (!data.length) return <p className="text-xs text-[#6B5F4F] text-center py-8">No data available</p>;
    const maxVal = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);
    const barWidth = Math.max(Math.min(60, (600 / data.length) - 8), 16);
    const chartWidth = data.length * (barWidth + 8) + 40;

    return (
      <div className="overflow-x-auto">
        <svg width={Math.max(chartWidth, 300)} height={height + 60} className="mx-auto">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
            const y = height - pct * height + 20;
            return (
              <g key={pct}>
                <line x1="30" y1={y} x2={chartWidth} y2={y} stroke="rgba(198,169,98,0.08)" strokeDasharray="4" />
                <text x="25" y={y + 4} fill="#6B5F4F" fontSize="10" textAnchor="end">
                  {Math.round(maxVal * pct)}
                </text>
              </g>
            );
          })}
          {/* Bars */}
          {data.map((d, i) => {
            const val = Number(d[valueKey]) || 0;
            const barHeight = (val / maxVal) * height;
            const x = 40 + i * (barWidth + 8);
            const label = String(d[labelKey]);
            const shortLabel = label.length > 6 ? label.slice(-5) : label;
            return (
              <g key={i}>
                <rect x={x} y={height - barHeight + 20} width={barWidth} height={barHeight}
                  rx="4" fill={color} opacity="0.7"
                >
                  <title>{`${label}: ${val}`}</title>
                </rect>
                <text x={x + barWidth / 2} y={height + 36} fill="#6B5F4F" fontSize="9" textAnchor="middle">
                  {shortLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Donut chart for status distribution
  const DonutChart = ({ counts }: { counts: AnalyticsData['counts'] }) => {
    const segments = [
      { label: 'Completed', value: counts.completed, color: '#10B981' },
      { label: 'Confirmed', value: counts.confirmed, color: '#22C55E' },
      { label: 'Pending', value: counts.pending, color: '#F59E0B' },
      { label: 'Arrived', value: counts.arrived, color: '#06B6D4' },
      { label: 'Cancelled', value: counts.cancelled, color: '#6B7280' },
      { label: 'No-Show', value: counts.no_show, color: '#F97316' },
    ].filter(s => s.value > 0);

    const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <svg width="180" height="180" viewBox="0 0 180 180" className="shrink-0">
          {segments.map((seg, i) => {
            const pct = seg.value / total;
            const dashLen = pct * circumference;
            const dashOffset = -offset * circumference;
            offset += pct;
            return (
              <circle key={i} cx="90" cy="90" r={radius}
                fill="none" stroke={seg.color} strokeWidth="18"
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 90 90)"
              >
                <title>{`${seg.label}: ${seg.value}`}</title>
              </circle>
            );
          })}
          <text x="90" y="85" fill="#F5F0E8" fontSize="24" fontWeight="bold" textAnchor="middle">{total}</text>
          <text x="90" y="105" fill="#6B5F4F" fontSize="11" textAnchor="middle">total</text>
        </svg>
        <div className="space-y-2">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-[#A09888]">{seg.label}</span>
              <span className="text-[#F5F0E8] font-medium ml-auto">{seg.value}</span>
              <span className="text-[#6B5F4F]">({Math.round((seg.value / total) * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C6A962] animate-spin" />
      </div>
    );
  }

  const c = analytics?.counts;
  const confirmedPct = c ? Math.round(((c.completed + c.confirmed + c.arrived) / Math.max(c.total, 1)) * 100) : 0;
  const noShowPct = c ? Math.round((c.no_show / Math.max(c.total, 1)) * 100) : 0;
  const cancelPct = c ? Math.round((c.cancelled / Math.max(c.total, 1)) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-[rgba(198,169,98,0.12)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C6A962] to-[#A88B3E] flex items-center justify-center">
              <Crown className="w-4 h-4 text-[#0A0A0A]" />
            </div>
            <span className="text-lg font-semibold font-[family-name:var(--font-playfair)] text-[#C6A962] hidden sm:block">Owner Panel</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <a key={link.href} href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                  link.href === '/owner/analytics' ? 'bg-[#C6A962]/15 text-[#C6A962]' : 'text-[#A09888] hover:text-[#F5F0E8] hover:bg-white/5'
                }`}
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="hidden sm:flex items-center gap-2 text-sm text-[#A09888] hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" /> Logout
            </button>
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 rounded-lg text-[#A09888] hover:text-[#F5F0E8] hover:bg-white/5"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-[rgba(198,169,98,0.12)] overflow-hidden"
            >
              <div className="px-4 py-3 space-y-1">
                {NAV_LINKS.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      link.href === '/owner/analytics'
                        ? 'bg-[#C6A962]/15 text-[#C6A962]'
                        : 'text-[#A09888] hover:text-[#F5F0E8]'
                    }`}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </a>
                ))}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold font-[family-name:var(--font-playfair)] text-gradient-gold mb-1">Analytics</h1>
            <p className="text-[#A09888] text-sm">Performance insights and trends</p>
          </div>
          {analytics && (
            <ExportDropdown
              onExportCSV={() => {
                const rows = [
                  { metric: 'Total Reservations', value: analytics.counts.total },
                  { metric: 'Confirmed', value: analytics.counts.confirmed },
                  { metric: 'Completed', value: analytics.counts.completed },
                  { metric: 'Pending', value: analytics.counts.pending },
                  { metric: 'Cancelled', value: analytics.counts.cancelled },
                  { metric: 'No-Show', value: analytics.counts.no_show },
                  { metric: 'Arrived', value: analytics.counts.arrived },
                  { metric: 'VIP Customers', value: analytics.vipCount },
                  { metric: 'Waitlist', value: analytics.waitlistCount },
                ];
                exportToCSV(rows, `analytics-${fromDate}-to-${toDate}`);
              }}
              onExportExcel={() => {
                const rows = [
                  { metric: 'Total Reservations', value: analytics.counts.total },
                  { metric: 'Confirmed', value: analytics.counts.confirmed },
                  { metric: 'Completed', value: analytics.counts.completed },
                  { metric: 'Pending', value: analytics.counts.pending },
                  { metric: 'Cancelled', value: analytics.counts.cancelled },
                  { metric: 'No-Show', value: analytics.counts.no_show },
                  { metric: 'Arrived', value: analytics.counts.arrived },
                  { metric: 'VIP Customers', value: analytics.vipCount },
                  { metric: 'Waitlist', value: analytics.waitlistCount },
                ];
                exportToExcel(rows, `analytics-${fromDate}-to-${toDate}`, 'Analytics');
              }}
              onExportPDF={() => {
                const rows = [
                  { metric: 'Total Reservations', value: analytics.counts.total },
                  { metric: 'Confirmed', value: analytics.counts.confirmed },
                  { metric: 'Completed', value: analytics.counts.completed },
                  { metric: 'Pending', value: analytics.counts.pending },
                  { metric: 'Cancelled', value: analytics.counts.cancelled },
                  { metric: 'No-Show', value: analytics.counts.no_show },
                  { metric: 'Arrived', value: analytics.counts.arrived },
                  { metric: 'VIP Customers', value: analytics.vipCount },
                  { metric: 'Waitlist', value: analytics.waitlistCount },
                ];
                exportToPDF(
                  rows,
                  [{ header: 'Metric', dataKey: 'metric' }, { header: 'Value', dataKey: 'value' }],
                  `Analytics Report (${fromDate} to ${toDate})`,
                  `analytics-${fromDate}-to-${toDate}`
                );
              }}
            />
          )}
        </motion.div>

        {/* Date range picker */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 bg-[#1A1A1A] rounded-lg border border-[rgba(198,169,98,0.12)] px-3 py-2">
            <Calendar className="w-4 h-4 text-[#C6A962]" />
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="bg-transparent text-[#F5F0E8] text-sm focus:outline-none" />
            <span className="text-[#6B5F4F] text-sm">→</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="bg-transparent text-[#F5F0E8] text-sm focus:outline-none" />
          </div>
          {[7, 14, 30, 90].map(days => (
            <button key={days} onClick={() => setRange(days)}
              className="px-3 py-2 rounded-lg text-xs bg-[#1A1A1A] border border-[rgba(198,169,98,0.08)] text-[#A09888] hover:border-[rgba(198,169,98,0.2)] hover:text-[#F5F0E8] transition-colors"
            >
              {days}d
            </button>
          ))}
        </div>

        {/* Error Banner */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div key="analytics-err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2"
            >
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-red-400 text-sm">{error}</span>
              <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#C6A962] animate-spin" />
          </div>
        ) : !analytics ? (
          <div className="text-center py-20 text-[#6B5F4F]">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No analytics data</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <motion.div
              initial="hidden" animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
              className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 mb-8"
            >
              {[
                { label: 'Total Reservations', value: c?.total || 0, icon: TrendingUp, color: '#C6A962' },
                { label: 'Confirmed Rate', value: `${confirmedPct}%`, icon: UserCheck, color: '#22C55E', sub: confirmedPct >= 70 ? 'positive' : 'negative' },
                { label: 'No-Show Rate', value: `${noShowPct}%`, icon: UserX, color: '#F97316', sub: noShowPct <= 10 ? 'positive' : 'negative' },
                { label: 'Cancel Rate', value: `${cancelPct}%`, icon: Eye, color: '#6B7280' },
                { label: 'VIP Customers', value: analytics.vipCount, icon: Star, color: '#F59E0B' },
                { label: 'Waitlist', value: analytics.waitlistCount, icon: Users, color: '#06B6D4' },
              ].map((kpi, i) => (
                <motion.div
                  key={i}
                  variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                  className="bg-[rgba(26,26,26,0.6)] backdrop-blur-xl border border-[rgba(198,169,98,0.1)] rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                    {kpi.sub === 'positive' && <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />}
                    {kpi.sub === 'negative' && <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                  <p className="text-2xl font-bold text-[#F5F0E8]">{kpi.value}</p>
                  <p className="text-xs text-[#6B5F4F] mt-0.5">{kpi.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Status distribution */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-[rgba(26,26,26,0.6)] backdrop-blur-xl border border-[rgba(198,169,98,0.1)] rounded-xl p-6"
              >
                <h3 className="text-sm font-semibold text-[#F5F0E8] mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#C6A962]" /> Status Distribution
                </h3>
                <DonutChart counts={analytics.counts} />
              </motion.div>

              {/* Reservations per day */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-[rgba(26,26,26,0.6)] backdrop-blur-xl border border-[rgba(198,169,98,0.1)] rounded-xl p-6"
              >
                <h3 className="text-sm font-semibold text-[#F5F0E8] mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#C6A962]" /> Reservations by Day
                </h3>
                <BarChart
                  data={analytics.reservationsPerDay}
                  labelKey="date"
                  valueKey="count"
                  color="#C6A962"
                />
              </motion.div>
            </div>

            {/* Second row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Peak hours */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="bg-[rgba(26,26,26,0.6)] backdrop-blur-xl border border-[rgba(198,169,98,0.1)] rounded-xl p-6"
              >
                <h3 className="text-sm font-semibold text-[#F5F0E8] mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#C6A962]" /> Peak Hours
                </h3>
                <BarChart
                  data={analytics.peakHours.slice(0, 12)}
                  labelKey="hour"
                  valueKey="count"
                  color="#22C55E"
                />
              </motion.div>

              {/* Popular tables + occasions */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="bg-[rgba(26,26,26,0.6)] backdrop-blur-xl border border-[rgba(198,169,98,0.1)] rounded-xl p-6"
              >
                <h3 className="text-sm font-semibold text-[#F5F0E8] mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#C6A962]" /> Popular Tables & Occasions
                </h3>

                {/* Tables */}
                <div className="mb-5">
                  <p className="text-xs text-[#6B5F4F] uppercase tracking-wider mb-2">Top Tables</p>
                  <div className="flex flex-wrap gap-2">
                    {analytics.popularTables.length === 0 ? (
                      <span className="text-xs text-[#6B5F4F]">No data yet</span>
                    ) : (
                      analytics.popularTables.slice(0, 5).map((t, i) => {
                        const maxCount = analytics.popularTables[0]?.count || 1;
                        const pct = Math.round((t.count / maxCount) * 100);
                        return (
                          <div key={i} className="relative overflow-hidden px-3 py-2 rounded-lg border border-[rgba(198,169,98,0.1)] bg-[#0A0A0A] min-w-[100px]">
                            <div className="absolute inset-0 bg-[#C6A962]/10" style={{ width: `${pct}%` }} />
                            <div className="relative flex items-center justify-between gap-3">
                              <span className="text-xs font-medium text-[#F5F0E8]">T{t.table}</span>
                              <span className="text-xs text-[#C6A962] font-bold">{t.count}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Occasions */}
                <div>
                  <p className="text-xs text-[#6B5F4F] uppercase tracking-wider mb-2">Top Occasions</p>
                  <div className="space-y-2">
                    {analytics.popularOccasions.length === 0 ? (
                      <span className="text-xs text-[#6B5F4F]">No data yet</span>
                    ) : (
                      analytics.popularOccasions.slice(0, 5).map((o, i) => {
                        const maxCount = analytics.popularOccasions[0]?.count || 1;
                        const pct = Math.round((o.count / maxCount) * 100);
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs text-[#A09888] w-28 truncate">{o.occasion}</span>
                            <div className="flex-1 h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-[#A88B3E] to-[#C6A962]" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-[#C6A962] font-medium w-8 text-right">{o.count}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Summary cards */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <div className="bg-[rgba(26,26,26,0.6)] backdrop-blur-xl border border-[rgba(198,169,98,0.1)] rounded-xl p-5">
                <h4 className="text-xs text-[#6B5F4F] uppercase tracking-wider mb-3">Reservation Breakdown</h4>
                <div className="space-y-2">
                  {[
                    { label: 'Pending', val: c?.pending, color: 'text-amber-400' },
                    { label: 'Confirmed', val: c?.confirmed, color: 'text-green-400' },
                    { label: 'Arrived', val: c?.arrived, color: 'text-cyan-400' },
                    { label: 'Completed', val: c?.completed, color: 'text-emerald-400' },
                    { label: 'Cancelled', val: c?.cancelled, color: 'text-gray-400' },
                    { label: 'No-Show', val: c?.no_show, color: 'text-orange-400' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-[#A09888]">{item.label}</span>
                      <span className={`font-medium ${item.color}`}>{item.val || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[rgba(26,26,26,0.6)] backdrop-blur-xl border border-[rgba(198,169,98,0.1)] rounded-xl p-5">
                <h4 className="text-xs text-[#6B5F4F] uppercase tracking-wider mb-3">Performance Metrics</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#A09888]">Fulfillment Rate</span>
                      <span className="text-green-400 font-medium">{confirmedPct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#0A0A0A] rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${confirmedPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#A09888]">No-Show Rate</span>
                      <span className="text-orange-400 font-medium">{noShowPct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#0A0A0A] rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${noShowPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#A09888]">Cancellation Rate</span>
                      <span className="text-gray-400 font-medium">{cancelPct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#0A0A0A] rounded-full overflow-hidden">
                      <div className="h-full bg-gray-500 rounded-full" style={{ width: `${cancelPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[rgba(26,26,26,0.6)] backdrop-blur-xl border border-[rgba(198,169,98,0.1)] rounded-xl p-5">
                <h4 className="text-xs text-[#6B5F4F] uppercase tracking-wider mb-3">Highlights</h4>
                <div className="space-y-3">
                  {analytics.peakHours[0] && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#C6A962]/10 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-[#C6A962]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#A09888]">Busiest Hour</p>
                        <p className="text-sm text-[#F5F0E8] font-medium">{analytics.peakHours[0].hour}</p>
                      </div>
                    </div>
                  )}
                  {analytics.popularTables[0] && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs text-[#A09888]">Most Popular Table</p>
                        <p className="text-sm text-[#F5F0E8] font-medium">Table {analytics.popularTables[0].table} ({analytics.popularTables[0].count} bookings)</p>
                      </div>
                    </div>
                  )}
                  {analytics.popularOccasions[0] && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Star className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs text-[#A09888]">Top Occasion</p>
                        <p className="text-sm text-[#F5F0E8] font-medium">{analytics.popularOccasions[0].occasion}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-xs text-[#A09888]">Avg / Day</p>
                      <p className="text-sm text-[#F5F0E8] font-medium">
                        {analytics.reservationsPerDay.length > 0
                          ? (c?.total ? (c.total / analytics.reservationsPerDay.length).toFixed(1) : '0')
                          : '0'
                        } reservations
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
