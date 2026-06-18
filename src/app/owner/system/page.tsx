'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Calendar, Users, Shield, LogOut, Loader2, X, Menu as MenuIcon, UtensilsCrossed, BarChart3, FileText, CalendarDays, Mail, Star, Database, Activity, RefreshCw, CheckCircle, XCircle, AlertTriangle, Server, Hash, Wifi } from 'lucide-react';
import { createAuthBrowserClient } from '@/lib/supabase';

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

interface ServiceStatus { name: string; status: 'healthy' | 'warning' | 'error'; message: string; }
interface TableCount { name: string; count: number; }

const SERVICE_ICONS: Record<string, typeof Server> = { database: Database, email: Mail, whatsapp: Wifi, auth: Shield, environment: Server };
const SERVICE_LABELS: Record<string, string> = { database: 'Database', email: 'Email (Resend)', whatsapp: 'WhatsApp', auth: 'Authentication', environment: 'Environment' };
const TABLE_LABELS: Record<string, string> = { reservations: 'Reservations', menu_items: 'Menu Items', staff_profiles: 'Staff', waitlist: 'Waitlist', customer_notes: 'Customer Notes', audit_logs: 'Audit Logs', blocked_dates: 'Blocked Dates', newsletter_subscribers: 'Newsletter' };

export default function SystemPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [tables, setTables] = useState<TableCount[]>([]);
  const [timestamp, setTimestamp] = useState('');
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabase = createAuthBrowserClient();

  useEffect(() => { supabase.auth.getUser().then(({ data }: { data: { user: unknown } }) => { if (!data.user) router.push('/staff-login'); else setAuthed(true); }); }, [router, supabase.auth]);
  useEffect(() => { setLastBackup(localStorage.getItem('boho-last-backup')); }, []);

  const fetchHealth = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await fetch('/api/admin/health');
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
        setTables(data.tables || []);
        setTimestamp(data.timestamp || '');
      }
    } catch { /* ignore */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (authed) {
      fetchHealth();
      intervalRef.current = setInterval(() => fetchHealth(true), 30000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [authed, fetchHealth]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/staff-login'); };

  const statusColors = (s: string) => {
    if (s === 'healthy') return { dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' };
    if (s === 'warning') return { dot: 'bg-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' };
    return { dot: 'bg-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' };
  };

  const overall = services.every(s => s.status === 'healthy') ? 'healthy' : services.some(s => s.status === 'error') ? 'error' : 'warning';

  if (!authed) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#C6A962] animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8]">
      <nav className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-[rgba(198,169,98,0.12)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C6A962] to-[#A88B3E] flex items-center justify-center"><Crown className="w-4 h-4 text-[#0A0A0A]" /></div>
            <span className="hidden sm:block text-lg font-semibold font-[family-name:var(--font-playfair)] text-[#C6A962]">Owner Panel</span>
          </div>
          <div className="hidden md:flex items-center gap-1 overflow-x-auto">
            {NAV_LINKS.map(link => (<a key={link.href} href={link.href} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${link.href === '/owner/system' ? 'bg-[#C6A962]/15 text-[#C6A962]' : 'text-[#A09888] hover:text-[#F5F0E8] hover:bg-white/5'}`}>{link.label}</a>))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="hidden sm:flex items-center gap-2 text-sm text-[#A09888] hover:text-red-400"><LogOut className="w-4 h-4" /> Logout</button>
            <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden p-2 text-[#A09888]">{mobileNav ? <X size={20} /> : <MenuIcon size={20} />}</button>
          </div>
        </div>
      </nav>
      <AnimatePresence>{mobileNav && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-[#111] border-b border-[#2A2A2A] overflow-hidden"><div className="p-4 grid grid-cols-2 gap-2">{NAV_LINKS.map(link => { const Icon = link.icon; return (<a key={link.href} href={link.href} onClick={() => setMobileNav(false)} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${link.href === '/owner/system' ? 'bg-[#C6A962]/15 text-[#C6A962]' : 'text-[#A09888] hover:bg-white/5'}`}><Icon size={16} />{link.label}</a>); })}<button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400 col-span-2"><LogOut size={16} /> Logout</button></div></motion.div>)}</AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold font-[family-name:var(--font-playfair)] text-gradient-gold mb-1">System Health</h1>
            <p className="text-[#A09888] text-sm">Monitor services and database status</p>
          </div>
          <button onClick={() => fetchHealth()} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[#1A1A1A] border border-[#2A2A2A] text-[#A09888] hover:text-[#F5F0E8] transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </motion.div>

        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#C6A962] animate-spin" /></div> : (
          <>
            {/* Overall Status */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className={`rounded-xl border p-5 mb-6 flex items-center gap-4 ${overall === 'healthy' ? 'bg-emerald-500/5 border-emerald-500/20' : overall === 'warning' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${overall === 'healthy' ? 'bg-emerald-500/15' : overall === 'warning' ? 'bg-amber-500/15' : 'bg-red-500/15'}`}>
                {overall === 'healthy' && <CheckCircle className="w-6 h-6 text-emerald-400" />}
                {overall === 'warning' && <AlertTriangle className="w-6 h-6 text-amber-400" />}
                {overall === 'error' && <XCircle className="w-6 h-6 text-red-400" />}
              </div>
              <div>
                <p className={`text-lg font-semibold ${overall === 'healthy' ? 'text-emerald-400' : overall === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>
                  {overall === 'healthy' ? 'All Systems Operational' : overall === 'warning' ? 'Some Warnings' : 'Issues Detected'}
                </p>
                <p className="text-xs text-[#6B5F4F]">
                  Last checked: {timestamp ? new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                  {refreshing && ' • Refreshing…'}
                </p>
              </div>
            </motion.div>

            {/* Services */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
              <h2 className="text-lg font-semibold text-[#F5F0E8] mb-3">Services</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {services.map(service => {
                  const c = statusColors(service.status);
                  const Icon = SERVICE_ICONS[service.name] || Server;
                  return (
                    <div key={service.name} className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2"><Icon className={`w-4 h-4 ${c.text}`} /><span className="text-sm font-medium text-[#F5F0E8]">{SERVICE_LABELS[service.name] || service.name}</span></div>
                        <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${c.dot} animate-pulse`} /><span className={`text-xs font-medium uppercase ${c.text}`}>{service.status}</span></div>
                      </div>
                      <p className="text-xs text-[#6B5F4F]">{service.message}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Table Counts */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-6">
              <h2 className="text-lg font-semibold text-[#F5F0E8] mb-3">Database Records</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {tables.map(table => (
                  <div key={table.name} className="rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] p-4 text-center hover:border-[#C6A962]/20 transition-colors">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Hash className="w-3.5 h-3.5 text-[#6B5F4F]" />
                      <span className={`text-2xl font-bold ${table.count === -1 ? 'text-red-400' : 'text-[#C6A962]'}`}>{table.count === -1 ? '?' : table.count.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-[#6B5F4F] uppercase tracking-wider">{TABLE_LABELS[table.name] || table.name}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Environment Info */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] p-4">
                <div className="flex items-center gap-2 mb-2"><Server className="w-4 h-4 text-[#C6A962]" /><span className="text-sm font-medium">Framework</span></div>
                <p className="text-sm text-[#A09888]">Next.js (App Router)</p>
                <p className="text-xs text-[#6B5F4F]">React 19 • TypeScript • Tailwind v4</p>
              </div>
              <div className="rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] p-4">
                <div className="flex items-center gap-2 mb-2"><Database className="w-4 h-4 text-[#C6A962]" /><span className="text-sm font-medium">Database</span></div>
                <p className="text-sm text-[#A09888]">Supabase (PostgreSQL)</p>
                <p className="text-xs text-[#6B5F4F]">With Row-Level Security</p>
              </div>
              <div className="rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] p-4">
                <div className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-[#C6A962]" /><span className="text-sm font-medium">Last Backup</span></div>
                <p className="text-sm text-[#A09888]">{lastBackup || 'No backups recorded'}</p>
              </div>
            </motion.div>

            <p className="text-center text-xs text-[#6B5F4F]"><RefreshCw className="w-3 h-3 inline mr-1" />Auto-refreshes every 30 seconds</p>
          </>
        )}
      </div>
    </div>
  );
}
