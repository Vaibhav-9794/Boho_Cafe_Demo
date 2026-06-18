'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Calendar, Users, Shield, LogOut, Loader2, X, Menu as MenuIcon, UtensilsCrossed, BarChart3, FileText, CalendarDays, Mail, Star, Database, Activity, Search, UserX } from 'lucide-react';
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

interface Subscriber { id: string; email: string; status: string; created_at: string; }

export default function NewsletterPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const supabase = createAuthBrowserClient();

  useEffect(() => { supabase.auth.getUser().then(({ data }: { data: { user: unknown } }) => { if (!data.user) router.push('/staff-login'); else setAuthed(true); }); }, [router, supabase.auth]);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (search.trim()) params.set('search', search.trim());
    try {
      const res = await fetch(`/api/admin/newsletter?${params}`);
      if (res.ok) { const data = await res.json(); setSubscribers(data.subscribers || []); setTotal(data.total || 0); }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { if (authed) fetchSubscribers(); }, [authed, fetchSubscribers]);

  const handleUnsubscribe = async (id: string) => {
    const res = await fetch('/api/admin/newsletter', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (res.ok) { setToast({ message: 'Unsubscribed', type: 'success' }); setTimeout(() => setToast(null), 3000); fetchSubscribers(); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/staff-login'); };

  const activeCount = subscribers.filter(s => s.status === 'ACTIVE').length;
  const unsubCount = subscribers.filter(s => s.status === 'UNSUBSCRIBED').length;

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
            {NAV_LINKS.slice(0, 8).map(link => (<a key={link.href} href={link.href} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${link.href === '/owner/newsletter' ? 'bg-[#C6A962]/15 text-[#C6A962]' : 'text-[#A09888] hover:text-[#F5F0E8] hover:bg-white/5'}`}>{link.label}</a>))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="hidden sm:flex items-center gap-2 text-sm text-[#A09888] hover:text-red-400"><LogOut className="w-4 h-4" /> Logout</button>
            <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden p-2 text-[#A09888]">{mobileNav ? <X size={20} /> : <MenuIcon size={20} />}</button>
          </div>
        </div>
      </nav>
      <AnimatePresence>{mobileNav && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-[#111] border-b border-[#2A2A2A] overflow-hidden"><div className="p-4 grid grid-cols-2 gap-2">{NAV_LINKS.map(link => { const Icon = link.icon; return (<a key={link.href} href={link.href} onClick={() => setMobileNav(false)} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${link.href === '/owner/newsletter' ? 'bg-[#C6A962]/15 text-[#C6A962]' : 'text-[#A09888] hover:bg-white/5'}`}><Icon size={16} />{link.label}</a>); })}<button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400 col-span-2"><LogOut size={16} /> Logout</button></div></motion.div>)}</AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold font-[family-name:var(--font-playfair)] text-gradient-gold mb-1">Newsletter Subscribers</h1>
          <p className="text-[#A09888] text-sm">Manage your email subscriber list</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[{ label: 'Total', value: total, color: 'text-[#C6A962]' }, { label: 'Active', value: activeCount, color: 'text-emerald-400' }, { label: 'Unsubscribed', value: unsubCount, color: 'text-red-400' }].map(s => (
            <div key={s.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <div className="text-xs text-[#6B5F4F] mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Search + Export */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B5F4F]" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by email..." className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F0E8] text-sm placeholder:text-[#6B5F4F] focus:outline-none focus:border-[#C6A962]/40" />
          </div>
          <ExportDropdown
            onExportCSV={() => exportToCSV(subscribers.map(s => ({ Email: s.email, Status: s.status, 'Subscribed At': new Date(s.created_at).toLocaleString('en-IN') })), 'newsletter')}
            onExportExcel={() => exportToExcel(subscribers.map(s => ({ Email: s.email, Status: s.status, 'Subscribed At': new Date(s.created_at).toLocaleString('en-IN') })), 'newsletter', 'Subscribers')}
            onExportPDF={() => exportToPDF(subscribers.map(s => ({ Email: s.email, Status: s.status, 'Subscribed At': new Date(s.created_at).toLocaleString('en-IN') })), [{ header: 'Email', dataKey: 'Email' }, { header: 'Status', dataKey: 'Status' }, { header: 'Subscribed', dataKey: 'Subscribed At' }], 'Newsletter Subscribers', 'newsletter')}
          />
        </div>

        {/* List */}
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#C6A962] animate-spin" /></div> : subscribers.length === 0 ? (
          <div className="text-center py-12"><Mail className="w-10 h-10 text-[#6B5F4F] mx-auto mb-3" /><p className="text-[#6B5F4F]">No subscribers yet</p></div>
        ) : (
          <div className="space-y-2">
            {subscribers.map(s => (
              <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
                <div>
                  <p className="text-sm text-[#F5F0E8]">{s.email}</p>
                  <p className="text-xs text-[#6B5F4F]">{new Date(s.created_at).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full border ${s.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{s.status}</span>
                  {s.status === 'ACTIVE' && (
                    <button onClick={() => handleUnsubscribe(s.id)} className="p-1.5 rounded-lg text-[#6B5F4F] hover:text-red-400 hover:bg-red-500/10" title="Unsubscribe"><UserX size={14} /></button>
                  )}
                </div>
              </motion.div>
            ))}
            {subscribers.length < total && (
              <button onClick={() => setPage(p => p + 1)} className="w-full py-3 text-sm text-[#C6A962] bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:bg-[#222]">Load More</button>
            )}
          </div>
        )}
      </div>
      <AnimatePresence>{toast && (<motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className={`fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl border backdrop-blur-xl text-sm font-medium ${toast.type === 'success' ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-red-500/15 text-red-400 border-red-500/25'}`}>{toast.message}</motion.div>)}</AnimatePresence>
    </div>
  );
}
