'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Calendar, Users, Shield, LogOut, Loader2, X, Menu as MenuIcon, UtensilsCrossed, BarChart3, FileText, CalendarDays, Mail, Star, Database, Activity, Download, CheckSquare, Square } from 'lucide-react';
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

const TABLES = [
  { key: 'reservations', label: 'Reservations' },
  { key: 'menu_items', label: 'Menu Items' },
  { key: 'staff_profiles', label: 'Staff Profiles' },
  { key: 'waitlist', label: 'Waitlist' },
  { key: 'customer_notes', label: 'Customer Notes' },
  { key: 'audit_logs', label: 'Audit Logs' },
  { key: 'blocked_dates', label: 'Blocked Dates' },
  { key: 'newsletter_subscribers', label: 'Newsletter Subscribers' },
];

export default function BackupsPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [selected, setSelected] = useState<string[]>(['reservations', 'menu_items']);
  const [format, setFormat] = useState<'csv' | 'json'>('json');
  const [generating, setGenerating] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const supabase = createAuthBrowserClient();

  useEffect(() => { supabase.auth.getUser().then(({ data }: { data: { user: unknown } }) => { if (!data.user) router.push('/staff-login'); else setAuthed(true); }); }, [router, supabase.auth]);
  useEffect(() => { setLastBackup(localStorage.getItem('boho-last-backup')); }, []);

  const toggleTable = (key: string) => setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  const selectAll = () => setSelected(TABLES.map(t => t.key));
  const deselectAll = () => setSelected([]);

  const handleBackup = async () => {
    if (selected.length === 0) return;
    setGenerating(true);
    try {
      const params = new URLSearchParams({ tables: selected.join(','), format });
      const res = await fetch(`/api/admin/backup?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `boho-backup-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'csv'}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        const now = new Date().toLocaleString('en-IN');
        localStorage.setItem('boho-last-backup', now);
        setLastBackup(now);
        setToast({ message: 'Backup downloaded', type: 'success' }); setTimeout(() => setToast(null), 3000);
      } else { setToast({ message: 'Backup failed', type: 'error' }); setTimeout(() => setToast(null), 3000); }
    } catch { setToast({ message: 'Backup error', type: 'error' }); setTimeout(() => setToast(null), 3000); }
    setGenerating(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/staff-login'); };

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
            {NAV_LINKS.slice(0, 10).map(link => (<a key={link.href} href={link.href} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${link.href === '/owner/backups' ? 'bg-[#C6A962]/15 text-[#C6A962]' : 'text-[#A09888] hover:text-[#F5F0E8] hover:bg-white/5'}`}>{link.label}</a>))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="hidden sm:flex items-center gap-2 text-sm text-[#A09888] hover:text-red-400"><LogOut className="w-4 h-4" /> Logout</button>
            <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden p-2 text-[#A09888]">{mobileNav ? <X size={20} /> : <MenuIcon size={20} />}</button>
          </div>
        </div>
      </nav>
      <AnimatePresence>{mobileNav && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-[#111] border-b border-[#2A2A2A] overflow-hidden"><div className="p-4 grid grid-cols-2 gap-2">{NAV_LINKS.map(link => { const Icon = link.icon; return (<a key={link.href} href={link.href} onClick={() => setMobileNav(false)} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${link.href === '/owner/backups' ? 'bg-[#C6A962]/15 text-[#C6A962]' : 'text-[#A09888] hover:bg-white/5'}`}><Icon size={16} />{link.label}</a>); })}<button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400 col-span-2"><LogOut size={16} /> Logout</button></div></motion.div>)}</AnimatePresence>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold font-[family-name:var(--font-playfair)] text-gradient-gold mb-1">Data Backups</h1>
          <p className="text-[#A09888] text-sm">Download backups of your restaurant data</p>
          {lastBackup && <p className="text-xs text-[#6B5F4F] mt-1">Last backup: {lastBackup}</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#F5F0E8]">Select Tables</h3>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-[#C6A962] hover:underline">Select All</button>
              <span className="text-[#2A2A2A]">|</span>
              <button onClick={deselectAll} className="text-xs text-[#A09888] hover:underline">Deselect All</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TABLES.map(t => (
              <button key={t.key} onClick={() => toggleTable(t.key)} className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-sm text-left ${selected.includes(t.key) ? 'bg-[#C6A962]/10 border-[#C6A962]/30 text-[#C6A962]' : 'bg-[#0A0A0A] border-[#2A2A2A] text-[#A09888] hover:border-[#C6A962]/20'}`}>
                {selected.includes(t.key) ? <CheckSquare size={16} /> : <Square size={16} />}
                {t.label}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#F5F0E8] mb-4">Format</h3>
          <div className="flex gap-3">
            {(['json', 'csv'] as const).map(f => (
              <button key={f} onClick={() => setFormat(f)} className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${format === f ? 'bg-[#C6A962]/10 border-[#C6A962]/30 text-[#C6A962]' : 'bg-[#0A0A0A] border-[#2A2A2A] text-[#A09888]'}`}>{f.toUpperCase()}</button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <button onClick={handleBackup} disabled={generating || selected.length === 0} className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-[#A8893D] to-[#C6A962] text-[#0A0A0A] font-semibold text-sm disabled:opacity-40 hover:shadow-lg hover:shadow-[#C6A962]/20 transition-all">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Download className="w-4 h-4" /> Generate Backup ({selected.length} tables, {format.toUpperCase()})</>}
          </button>
        </motion.div>
      </div>
      <AnimatePresence>{toast && (<motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className={`fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl border backdrop-blur-xl text-sm font-medium ${toast.type === 'success' ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-red-500/15 text-red-400 border-red-500/25'}`}>{toast.message}</motion.div>)}</AnimatePresence>
    </div>
  );
}
