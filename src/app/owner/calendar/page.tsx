'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Calendar, Users, Shield, LogOut, Loader2, X, Menu as MenuIcon, UtensilsCrossed, BarChart3, FileText, CalendarDays, Mail, Star, Database, Activity, ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react';
import { createAuthBrowserClient } from '@/lib/supabase';
import type { BlockedDate } from '@/lib/supabase';

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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function toDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

export default function CalendarPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [selectedBD, setSelectedBD] = useState<BlockedDate | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const supabase = createAuthBrowserClient();

  useEffect(() => { supabase.auth.getUser().then(({ data }: { data: { user: unknown } }) => { if (!data.user) router.push('/staff-login'); else setAuthed(true); }); }, [router, supabase.auth]);

  const fetchBlocked = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blocked-dates');
      if (res.ok) { const data = await res.json(); setBlockedDates(data.blockedDates || []); }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) fetchBlocked(); }, [authed, fetchBlocked]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/staff-login'); };

  const todayStr = toDateStr(new Date());
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const getBlocked = (day: number) => blockedDates.find(bd => bd.date === toDateStr(new Date(year, month, day)));

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const openDay = (day: number) => {
    const ds = toDateStr(new Date(year, month, day));
    const bd = getBlocked(day);
    setSelectedDate(ds);
    setBlockReason(bd?.reason || '');
    setSelectedBD(bd || null);
    setShowModal(true);
  };

  const handleBlock = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/blocked-dates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: selectedDate, reason: blockReason.trim() }) });
      if (res.ok) { setToast({ message: `${selectedDate} blocked`, type: 'success' }); setTimeout(() => setToast(null), 3000); setShowModal(false); fetchBlocked(); }
    } catch { setToast({ message: 'Failed to block', type: 'error' }); setTimeout(() => setToast(null), 3000); }
    setActionLoading(false);
  };

  const handleUnblock = async (bd?: BlockedDate) => {
    const target = bd || selectedBD;
    if (!target) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/blocked-dates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: target.id }) });
      if (res.ok) { setToast({ message: `${target.date} unblocked`, type: 'success' }); setTimeout(() => setToast(null), 3000); setShowModal(false); fetchBlocked(); }
    } catch { setToast({ message: 'Failed to unblock', type: 'error' }); setTimeout(() => setToast(null), 3000); }
    setActionLoading(false);
  };

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
            {NAV_LINKS.map(link => (<a key={link.href} href={link.href} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${link.href === '/owner/calendar' ? 'bg-[#C6A962]/15 text-[#C6A962]' : 'text-[#A09888] hover:text-[#F5F0E8] hover:bg-white/5'}`}>{link.label}</a>))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="hidden sm:flex items-center gap-2 text-sm text-[#A09888] hover:text-red-400"><LogOut className="w-4 h-4" /> Logout</button>
            <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden p-2 text-[#A09888]">{mobileNav ? <X size={20} /> : <MenuIcon size={20} />}</button>
          </div>
        </div>
      </nav>
      <AnimatePresence>{mobileNav && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-[#111] border-b border-[#2A2A2A] overflow-hidden"><div className="p-4 grid grid-cols-2 gap-2">{NAV_LINKS.map(link => { const Icon = link.icon; return (<a key={link.href} href={link.href} onClick={() => setMobileNav(false)} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${link.href === '/owner/calendar' ? 'bg-[#C6A962]/15 text-[#C6A962]' : 'text-[#A09888] hover:bg-white/5'}`}><Icon size={16} />{link.label}</a>); })}<button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400 col-span-2"><LogOut size={16} /> Logout</button></div></motion.div>)}</AnimatePresence>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold font-[family-name:var(--font-playfair)] text-gradient-gold mb-1">Calendar</h1>
          <p className="text-[#A09888] text-sm">Manage blocked dates and availability</p>
        </motion.div>

        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#C6A962] animate-spin" /></div> : (
          <>
            {/* Calendar Grid */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 sm:p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <button onClick={prevMonth} className="p-2 rounded-lg text-[#A09888] hover:text-[#F5F0E8] hover:bg-white/5"><ChevronLeft size={20} /></button>
                <div className="text-center">
                  <h2 className="text-xl font-bold font-[family-name:var(--font-playfair)] text-[#F5F0E8]">{MONTHS[month]} {year}</h2>
                  <button onClick={() => { setMonth(new Date().getMonth()); setYear(new Date().getFullYear()); }} className="text-xs text-[#C6A962] hover:underline">Today</button>
                </div>
                <button onClick={nextMonth} className="p-2 rounded-lg text-[#A09888] hover:text-[#F5F0E8] hover:bg-white/5"><ChevronRight size={20} /></button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS.map(d => <div key={d} className="text-center text-xs text-[#6B5F4F] uppercase tracking-wider py-2">{d}</div>)}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                  if (day === null) return <div key={`e-${i}`} className="aspect-square" />;
                  const ds = toDateStr(new Date(year, month, day));
                  const bd = getBlocked(day);
                  const isToday = ds === todayStr;
                  const isPast = ds < todayStr;
                  return (
                    <button key={ds} onClick={() => openDay(day)} title={bd ? `Blocked: ${bd.reason || 'No reason'}` : 'Available'}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all relative
                        ${isToday ? 'ring-2 ring-[#C6A962] ring-offset-1 ring-offset-[#1A1A1A]' : ''}
                        ${bd ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30' : isPast ? 'text-[#6B5F4F] hover:bg-white/5' : 'text-[#A09888] hover:bg-emerald-500/10 hover:text-emerald-400'}`}>
                      {day}
                      {bd && <Lock className="w-2.5 h-2.5 mt-0.5 text-red-400/70" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-[#2A2A2A]">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50" /><span className="text-xs text-[#6B5F4F]">Blocked</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded border-2 border-[#C6A962]" /><span className="text-xs text-[#6B5F4F]">Today</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" /><span className="text-xs text-[#6B5F4F]">Available</span></div>
              </div>
            </motion.div>

            {/* Blocked Dates List */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-[#F5F0E8] mb-1">Blocked Dates</h3>
              <p className="text-xs text-[#6B5F4F] mb-4">{blockedDates.length} date{blockedDates.length !== 1 ? 's' : ''} blocked</p>

              {blockedDates.length === 0 ? (
                <div className="text-center py-8"><CalendarDays className="w-10 h-10 text-[#6B5F4F] mx-auto mb-3" /><p className="text-sm text-[#6B5F4F]">No blocked dates — click a date above to block it</p></div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {blockedDates.map(bd => (
                    <div key={bd.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] hover:border-red-500/20 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <Lock className="w-4 h-4 text-red-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-[#F5F0E8]">{new Date(bd.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          {bd.reason && <p className="text-xs text-[#6B5F4F] truncate">{bd.reason}</p>}
                        </div>
                      </div>
                      <button onClick={() => handleUnblock(bd)} disabled={actionLoading} className="p-1.5 rounded-lg text-[#6B5F4F] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50" title="Unblock"><Unlock size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>

      {/* Block/Unblock Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-[family-name:var(--font-playfair)] text-[#F5F0E8]">{selectedBD ? 'Unblock Date' : 'Block Date'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-[#6B5F4F] hover:text-[#F5F0E8] hover:bg-white/5"><X size={18} /></button>
              </div>

              <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A]">
                <CalendarDays className="w-5 h-5 text-[#C6A962]" />
                <span className="text-sm font-medium">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>

              {selectedBD ? (
                <>
                  {selectedBD.reason && <div className="mb-4 p-3 rounded-lg bg-red-500/5 border border-red-500/20"><p className="text-xs text-[#6B5F4F] mb-1">Reason:</p><p className="text-sm text-red-400">{selectedBD.reason}</p></div>}
                  <p className="text-sm text-[#A09888] mb-4">Unblock this date to allow reservations again.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg text-sm bg-[#0A0A0A] border border-[#2A2A2A] text-[#A09888] hover:bg-white/5">Cancel</button>
                    <button onClick={() => handleUnblock()} disabled={actionLoading} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock size={14} />} Unblock
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-xs uppercase tracking-widest text-[#A09888] mb-2 font-medium">Reason (optional)</label>
                    <input type="text" value={blockReason} onChange={e => setBlockReason(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleBlock(); }}
                      placeholder="e.g. Private event, Holiday…" className="w-full px-4 py-2.5 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-[#F5F0E8] placeholder:text-[#6B5F4F] text-sm focus:outline-none focus:border-[#C6A962]/40" />
                  </div>
                  <button onClick={handleBlock} disabled={actionLoading} className="w-full py-2.5 rounded-lg text-sm font-medium bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock size={14} />} Block Date
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{toast && (<motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className={`fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl border backdrop-blur-xl text-sm font-medium ${toast.type === 'success' ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-red-500/15 text-red-400 border-red-500/25'}`}>{toast.message}</motion.div>)}</AnimatePresence>
    </div>
  );
}
