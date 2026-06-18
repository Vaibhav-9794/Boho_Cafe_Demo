'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Calendar, Users, Shield, LogOut, Loader2, X, Menu as MenuIcon, UtensilsCrossed, BarChart3, FileText, CalendarDays, Mail, Star, Database, Activity, ExternalLink } from 'lucide-react';
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

export default function ReviewsPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [rating, setRating] = useState(4.8);
  const [reviewCount, setReviewCount] = useState(127);
  const [editing, setEditing] = useState(false);
  const supabase = createAuthBrowserClient();

  useEffect(() => { supabase.auth.getUser().then(({ data }: { data: { user: unknown } }) => { if (!data.user) router.push('/staff-login'); else setAuthed(true); }); }, [router, supabase.auth]);

  useEffect(() => {
    const saved = localStorage.getItem('boho-reviews');
    if (saved) { const d = JSON.parse(saved); setRating(d.rating || 4.8); setReviewCount(d.count || 127); }
  }, []);

  const saveReviewData = () => {
    localStorage.setItem('boho-reviews', JSON.stringify({ rating, count: reviewCount }));
    setEditing(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/staff-login'); };

  if (!authed) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#C6A962] animate-spin" /></div>;

  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(rating) ? '★' : '☆');

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8]">
      <nav className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-[rgba(198,169,98,0.12)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C6A962] to-[#A88B3E] flex items-center justify-center"><Crown className="w-4 h-4 text-[#0A0A0A]" /></div>
            <span className="hidden sm:block text-lg font-semibold font-[family-name:var(--font-playfair)] text-[#C6A962]">Owner Panel</span>
          </div>
          <div className="hidden md:flex items-center gap-1 overflow-x-auto">
            {NAV_LINKS.slice(0, 9).map(link => (<a key={link.href} href={link.href} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${link.href === '/owner/reviews' ? 'bg-[#C6A962]/15 text-[#C6A962]' : 'text-[#A09888] hover:text-[#F5F0E8] hover:bg-white/5'}`}>{link.label}</a>))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="hidden sm:flex items-center gap-2 text-sm text-[#A09888] hover:text-red-400"><LogOut className="w-4 h-4" /> Logout</button>
            <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden p-2 text-[#A09888]">{mobileNav ? <X size={20} /> : <MenuIcon size={20} />}</button>
          </div>
        </div>
      </nav>
      <AnimatePresence>{mobileNav && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-[#111] border-b border-[#2A2A2A] overflow-hidden"><div className="p-4 grid grid-cols-2 gap-2">{NAV_LINKS.map(link => { const Icon = link.icon; return (<a key={link.href} href={link.href} onClick={() => setMobileNav(false)} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${link.href === '/owner/reviews' ? 'bg-[#C6A962]/15 text-[#C6A962]' : 'text-[#A09888] hover:bg-white/5'}`}><Icon size={16} />{link.label}</a>); })}<button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400 col-span-2"><LogOut size={16} /> Logout</button></div></motion.div>)}</AnimatePresence>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold font-[family-name:var(--font-playfair)] text-gradient-gold mb-1">Google Reviews</h1>
          <p className="text-[#A09888] text-sm">Track and manage your restaurant reviews</p>
        </motion.div>

        {/* Rating Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 sm:p-8 mb-6 text-center">
          <div className="text-6xl font-bold text-[#C6A962] mb-2">{rating.toFixed(1)}</div>
          <div className="text-3xl mb-2">{stars.map((s, i) => <span key={i} className="text-yellow-400">{s}</span>)}</div>
          <p className="text-[#A09888] text-sm">{reviewCount} reviews on Google</p>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="mt-4 px-4 py-2 rounded-lg bg-[#C6A962]/10 text-[#C6A962] border border-[#C6A962]/20 text-sm hover:bg-[#C6A962]/20">Update Manually</button>
          ) : (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <input type="number" step="0.1" min="1" max="5" value={rating} onChange={e => setRating(parseFloat(e.target.value) || 0)} className="w-24 px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-[#F5F0E8] text-sm text-center" />
              <input type="number" min="0" value={reviewCount} onChange={e => setReviewCount(parseInt(e.target.value) || 0)} className="w-24 px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-[#F5F0E8] text-sm text-center" placeholder="Count" />
              <button onClick={saveReviewData} className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#A8893D] to-[#C6A962] text-[#0A0A0A] text-sm font-medium">Save</button>
            </div>
          )}
        </motion.div>

        {/* Integration Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#F5F0E8] mb-3 flex items-center gap-2"><ExternalLink size={18} className="text-[#C6A962]" /> Google Business Integration</h3>
          <p className="text-[#A09888] text-sm mb-4">Connect your Google Business Profile to automatically display live reviews, respond to customers, and track your reputation in real-time.</p>
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
            <h4 className="text-sm font-medium text-[#C6A962] mb-2">Coming in Phase 2:</h4>
            <ul className="text-xs text-[#6B5F4F] space-y-1">
              <li>• Google Places API integration for live reviews</li>
              <li>• Automatic review aggregation and sentiment analysis</li>
              <li>• Review response management directly from dashboard</li>
              <li>• Review notification alerts for new reviews</li>
              <li>• Review analytics and trend tracking</li>
            </ul>
          </div>
        </motion.div>

        {/* Placeholder Reviews */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[#F5F0E8] mb-4">Latest Reviews</h3>
          <div className="text-center py-8">
            <Star className="w-10 h-10 text-[#6B5F4F] mx-auto mb-3" />
            <p className="text-[#6B5F4F] text-sm">Connect Google Business Profile to see live reviews here</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
