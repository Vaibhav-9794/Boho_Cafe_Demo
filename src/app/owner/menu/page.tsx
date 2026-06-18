'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search,
  LogOut, Crown, Loader2, X, Leaf, Flame, Star, ImageIcon,
  ChevronDown, Menu as MenuIcon, UtensilsCrossed, BarChart3,
  Shield, FileText, CalendarDays, Database, Activity,
  Calendar, Users, Mail, Archive, RotateCcw,
} from 'lucide-react';
import { createAuthBrowserClient } from '@/lib/supabase';
import type { MenuItem } from '@/lib/supabase';

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

const CATEGORIES = [
  'All', 'Starters', 'Main Course', 'Breads', 'Rice & Biryani',
  'Beverages', 'Desserts', 'Specials', 'Sides', 'Salads',
];

interface MenuFormData {
  name: string;
  category: string;
  price: number;
  description: string;
  is_veg: boolean;
  is_popular: boolean;
  is_available: boolean;
  image_url: string;
}

const emptyForm: MenuFormData = {
  name: '', category: 'Starters', price: 0, description: '',
  is_veg: false, is_popular: false, is_available: true, image_url: '',
};

export default function OwnerMenuPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MenuFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

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

  const fetchMenu = useCallback(async () => {
    try {
      const url = showArchived ? '/api/admin/menu?showArchived=true' : '/api/admin/menu';
      const res = await fetch(url);
      if (res.status === 401) { router.push('/staff-login'); return; }
      const data = await res.json();
      if (data.success) setItems(data.items || []);
    } catch { showToast('Failed to fetch menu', 'error'); }
    finally { setLoading(false); }
  }, [router, showToast, showArchived]);

  useEffect(() => {
    if (authed) { setLoading(true); fetchMenu(); }
  }, [authed, fetchMenu]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.category || form.price <= 0) {
      showToast('Name, category, and price are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingId;
      const body = isEdit ? { id: editingId, ...form } : form;
      const res = await fetch('/api/admin/menu', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 401) { router.push('/staff-login'); return; }
      const data = await res.json();
      if (data.success) {
        showToast(isEdit ? 'Item updated' : 'Item created');
        setShowModal(false);
        setEditingId(null);
        setForm(emptyForm);
        fetchMenu();
      } else {
        showToast(data.message || 'Save failed', 'error');
      }
    } catch { showToast('Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this menu item?')) return;
    setDeleting(id);
    try {
      const res = await fetch('/api/admin/menu', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.status === 401) { router.push('/staff-login'); return; }
      const data = await res.json();
      if (data.success) { showToast('Item deleted'); fetchMenu(); }
      else showToast(data.message || 'Delete failed', 'error');
    } catch { showToast('Delete failed', 'error'); }
    finally { setDeleting(null); }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch('/api/admin/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'restore' }),
      });
      if (res.status === 401) { router.push('/staff-login'); return; }
      const data = await res.json();
      if (data.success) { showToast('Item restored'); fetchMenu(); }
      else showToast(data.message || 'Restore failed', 'error');
    } catch { showToast('Restore failed', 'error'); }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const res = await fetch('/api/admin/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, is_available: !item.is_available }),
      });
      if (res.status === 401) { router.push('/staff-login'); return; }
      const data = await res.json();
      if (data.success) fetchMenu();
    } catch { showToast('Toggle failed', 'error'); }
  };

  const openEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description,
      is_veg: item.is_veg,
      is_popular: item.is_popular,
      is_available: item.is_available,
      image_url: item.image_url,
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleLogout = async () => {
    const supabase = createAuthBrowserClient();
    await supabase.auth.signOut();
    router.push('/staff-login');
  };

  // Filter items
  const filtered = items.filter(item => {
    if (activeCategory !== 'All' && item.category !== activeCategory) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return item.name.toLowerCase().includes(s) || item.description.toLowerCase().includes(s);
    }
    return true;
  });

  // Group by category
  const grouped = filtered.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

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
            <span className="text-lg font-semibold font-[family-name:var(--font-playfair)] text-[#C6A962] hidden sm:block">Owner Panel</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <a key={link.href} href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                  link.href === '/owner/menu' ? 'bg-[#C6A962]/15 text-[#C6A962]' : 'text-[#A09888] hover:text-[#F5F0E8] hover:bg-white/5'
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
                      link.href === '/owner/menu'
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold font-[family-name:var(--font-playfair)] text-gradient-gold mb-1">Menu Management</h1>
            <p className="text-[#A09888] text-sm">{items.length} items total</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#A88B3E] via-[#C6A962] to-[#D4B96E] text-[#0A0A0A] hover:shadow-[0_0_25px_rgba(198,169,98,0.3)] transition-all"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A09888]" />
            <input type="text" placeholder="Search menu items..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1A1A1A] border border-[rgba(198,169,98,0.12)] text-[#F5F0E8] text-sm placeholder:text-[#6B5F4F] focus:outline-none focus:border-[#C6A962]/40"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  activeCategory === cat
                    ? 'bg-[#C6A962]/15 text-[#C6A962] border-[#C6A962]/30'
                    : 'bg-[#1A1A1A] text-[#A09888] border-[rgba(198,169,98,0.08)] hover:border-[rgba(198,169,98,0.2)]'
                }`}
              >{cat}</button>
            ))}
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                showArchived
                  ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                  : 'bg-[#1A1A1A] text-[#6B5F4F] border-[rgba(198,169,98,0.08)] hover:border-[rgba(198,169,98,0.2)]'
              }`}
            >
              <Archive className="w-3 h-3" />
              Archived Items
            </button>
          </div>
        </div>

        {/* Menu items */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#C6A962] animate-spin" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-20 text-[#6B5F4F]">
            <Flame className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No menu items found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([category, categoryItems]) => (
              <motion.div key={category} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-lg font-semibold font-[family-name:var(--font-playfair)] text-[#C6A962] mb-4 flex items-center gap-2">
                  <ChevronDown className="w-4 h-4" />
                  {category}
                  <span className="text-xs text-[#6B5F4F] font-normal">({categoryItems.length})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {categoryItems.map(item => (
                    <div key={item.id}
                      className={`group bg-[rgba(26,26,26,0.6)] backdrop-blur-xl border rounded-xl p-5 transition-all ${
                        item.is_available
                          ? 'border-[rgba(198,169,98,0.1)] hover:border-[rgba(198,169,98,0.25)]'
                          : 'border-red-500/15 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Image or placeholder */}
                        {item.image_url ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-[#0A0A0A]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-[#0A0A0A] border border-[rgba(198,169,98,0.08)] flex items-center justify-center shrink-0">
                            <ImageIcon className="w-6 h-6 text-[#6B5F4F]" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[#F5F0E8] font-semibold text-sm truncate">{item.name}</h3>
                            {item.is_veg ? (
                              <Leaf className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            ) : (
                              <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            )}
                            {item.is_popular && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                          </div>
                          <p className="text-xs text-[#6B5F4F] line-clamp-2 mb-2">{item.description || 'No description'}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[#C6A962] font-bold text-sm">₹{item.price}</span>
                              {(item as MenuItem & { is_archived?: boolean }).is_archived && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                  <Archive className="w-2.5 h-2.5" /> Archived
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {(item as MenuItem & { is_archived?: boolean }).is_archived ? (
                                <button onClick={() => handleRestore(item.id)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-medium"
                                >
                                  <RotateCcw className="w-3 h-3" /> Restore
                                </button>
                              ) : (
                                <>
                                  <button onClick={() => handleToggleAvailability(item)} title={item.is_available ? 'Mark unavailable' : 'Mark available'}
                                    className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
                                  >
                                    {item.is_available ? (
                                      <ToggleRight className="w-5 h-5 text-green-400" />
                                    ) : (
                                      <ToggleLeft className="w-5 h-5 text-[#6B5F4F]" />
                                    )}
                                  </button>
                                  <button onClick={() => openEdit(item)}
                                    className="p-1.5 rounded-md hover:bg-white/5 text-[#A09888] hover:text-[#C6A962] transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
                                    className="p-1.5 rounded-md hover:bg-red-500/10 text-[#A09888] hover:text-red-400 transition-colors disabled:opacity-50"
                                  >
                                    {deleting === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1A1A] border border-[rgba(198,169,98,0.2)] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold font-[family-name:var(--font-playfair)] text-[#F5F0E8]">
                  {editingId ? 'Edit Item' : 'Add New Item'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-1 text-[#A09888] hover:text-[#F5F0E8]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs text-[#A09888] mb-1.5">Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#0A0A0A] border border-[rgba(198,169,98,0.12)] text-[#F5F0E8] text-sm placeholder:text-[#6B5F4F] focus:outline-none focus:border-[#C6A962]/40"
                    placeholder="Item name"
                  />
                </div>

                {/* Category + Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#A09888] mb-1.5">Category *</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-[#0A0A0A] border border-[rgba(198,169,98,0.12)] text-[#F5F0E8] text-sm focus:outline-none focus:border-[#C6A962]/40"
                    >
                      {CATEGORIES.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#A09888] mb-1.5">Price (₹) *</label>
                    <input type="number" min="0" step="1" value={form.price || ''} onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-lg bg-[#0A0A0A] border border-[rgba(198,169,98,0.12)] text-[#F5F0E8] text-sm placeholder:text-[#6B5F4F] focus:outline-none focus:border-[#C6A962]/40"
                      placeholder="299"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs text-[#A09888] mb-1.5">Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#0A0A0A] border border-[rgba(198,169,98,0.12)] text-[#F5F0E8] text-sm placeholder:text-[#6B5F4F] focus:outline-none focus:border-[#C6A962]/40 resize-none"
                    placeholder="Describe the item..."
                  />
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-xs text-[#A09888] mb-1.5">Image URL</label>
                  <input type="url" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#0A0A0A] border border-[rgba(198,169,98,0.12)] text-[#F5F0E8] text-sm placeholder:text-[#6B5F4F] focus:outline-none focus:border-[#C6A962]/40"
                    placeholder="https://..."
                  />
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-3 gap-3">
                  <button type="button" onClick={() => setForm({ ...form, is_veg: !form.is_veg })}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                      form.is_veg
                        ? 'bg-green-500/15 text-green-400 border-green-500/25'
                        : 'bg-[#0A0A0A] text-[#6B5F4F] border-[rgba(198,169,98,0.08)]'
                    }`}
                  >
                    <Leaf className="w-3.5 h-3.5" /> Veg
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, is_popular: !form.is_popular })}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                      form.is_popular
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                        : 'bg-[#0A0A0A] text-[#6B5F4F] border-[rgba(198,169,98,0.08)]'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" /> Popular
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, is_available: !form.is_available })}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                      form.is_available
                        ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25'
                        : 'bg-[#0A0A0A] text-[#6B5F4F] border-[rgba(198,169,98,0.08)]'
                    }`}
                  >
                    {form.is_available ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />} Available
                  </button>
                </div>
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm text-[#A09888] border border-[rgba(198,169,98,0.1)] hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#A88B3E] via-[#C6A962] to-[#D4B96E] text-[#0A0A0A] hover:shadow-[0_0_25px_rgba(198,169,98,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOAST ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl border backdrop-blur-xl text-sm font-medium ${
              toast.type === 'success' ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-red-500/15 text-red-400 border-red-500/25'
            }`}
          >{toast.message}</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
