'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Users,
  Shield,
  UserPlus,
  Pencil,
  PauseCircle,
  PowerOff,
  Power,
  KeyRound,
  Trash2,
  Loader2,
  LogOut,
  CheckCircle,
  XCircle,
  X,
  Mail,
  Lock,
  User,
  Menu as MenuIcon,
  Eye,
  EyeOff,
  Calendar, UtensilsCrossed, BarChart3, FileText, CalendarDays, Star, Database, Activity,
} from 'lucide-react';
import { createAuthBrowserClient } from '@/lib/supabase';
import type { StaffProfile } from '@/lib/supabase';

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

/* ─── Animation variants ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

/* ─── Status badge ─── */
function StaffStatusBadge({ status }: { status: StaffProfile['status'] }) {
  const config = {
    ACTIVE: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    INACTIVE: { bg: 'bg-gray-500/15', border: 'border-gray-500/30', text: 'text-gray-400' },
    SUSPENDED: { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.border} ${c.text}`}>
      {status}
    </span>
  );
}

function RoleBadge({ role }: { role: StaffProfile['role'] }) {
  if (role === 'OWNER') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 border border-amber-500/30 text-amber-400">
        <Crown className="w-3 h-3" /> OWNER
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 border border-blue-500/30 text-blue-400">
      <Shield className="w-3 h-3" /> MANAGER
    </span>
  );
}

/* ═══════════════════════════════════════ */
/*  MAIN PAGE                             */
/* ═══════════════════════════════════════ */
export default function OwnerStaffPage() {
  const router = useRouter();
  const supabase = createAuthBrowserClient();

  /* ── State ── */
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* Modals */
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);

  const [editModal, setEditModal] = useState<StaffProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [resetModal, setResetModal] = useState<StaffProfile | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  /* ── Auth check + fetch ── */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/staff-login'); return; }
      fetchStaff();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff');
      const data = await res.json();
      if (data.success) setStaff(data.staff || []);
      else setError(data.message || 'Failed to load staff.');
    } catch {
      setError('Failed to load staff.');
    }
    setLoading(false);
  }, []);

  /* ── Helpers ── */
  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };
  const showError = (msg: string) => { setError(msg); };

  /* ── Stats ── */
  const stats = {
    total: staff.length,
    active: staff.filter((s) => s.status === 'ACTIVE').length,
    inactive: staff.filter((s) => s.status === 'INACTIVE').length,
    suspended: staff.filter((s) => s.status === 'SUSPENDED').length,
  };

  /* ── Filtered staff ── */
  const filteredStaff = filterTab === 'ALL' ? staff : staff.filter((s) => s.status === filterTab);

  /* ── Create Manager ── */
  const handleCreate = async () => {
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password.trim()) return;
    setAddLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`Manager "${addForm.name}" created successfully!`);
        setShowAddModal(false);
        setAddForm({ name: '', email: '', password: '' });
        fetchStaff();
      } else {
        showError(data.message || 'Failed to create manager.');
      }
    } catch {
      showError('Failed to create manager.');
    }
    setAddLoading(false);
  };

  /* ── Update Name ── */
  const handleUpdateName = async () => {
    if (!editModal || !editName.trim()) return;
    setEditLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editModal.id, action: 'update_name', name: editName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('Name updated.');
        setEditModal(null);
        fetchStaff();
      } else {
        showError(data.message || 'Failed to update name.');
      }
    } catch {
      showError('Failed to update name.');
    }
    setEditLoading(false);
  };

  /* ── Status action (suspend/deactivate/activate) ── */
  const handleStatusAction = async (member: StaffProfile, action: 'suspend' | 'deactivate' | 'activate') => {
    const labels = { suspend: 'Suspend', deactivate: 'Deactivate', activate: 'Activate' };
    if (!confirm(`${labels[action]} "${member.name}"?`)) return;
    setActionLoading(`${member.id}-${action}`);
    setError('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, action }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`${member.name} ${action}d.`);
        fetchStaff();
      } else {
        showError(data.message || `Failed to ${action}.`);
      }
    } catch {
      showError(`Failed to ${action}.`);
    }
    setActionLoading(null);
  };

  /* ── Reset Password ── */
  const handleResetPassword = async () => {
    if (!resetModal || !resetPassword.trim()) return;
    setResetLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resetModal.id, action: 'reset_password', newPassword: resetPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`Password reset for ${resetModal.name}.`);
        setResetModal(null);
        setResetPassword('');
      } else {
        showError(data.message || 'Failed to reset password.');
      }
    } catch {
      showError('Failed to reset password.');
    }
    setResetLoading(false);
  };

  /* ── Delete (soft) ── */
  const handleDelete = async (member: StaffProfile) => {
    if (!confirm(`Delete (deactivate) "${member.name}"? This action cannot be easily undone.`)) return;
    setActionLoading(`${member.id}-delete`);
    setError('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`${member.name} deleted (deactivated).`);
        fetchStaff();
      } else {
        showError(data.message || 'Failed to delete.');
      }
    } catch {
      showError('Failed to delete.');
    }
    setActionLoading(null);
  };

  /* ── Logout ── */
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
                    link.href === '/owner/staff'
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
                      link.href === '/owner/staff'
                        ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)]'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-champagne)]'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10"
                >
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
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gradient-gold font-[family-name:var(--font-playfair)] mb-2">
                Staff Management
              </h1>
              <p className="text-[var(--color-text-secondary)]">Manage team members, roles, and access</p>
            </div>
            <button
              onClick={() => { setShowAddModal(true); setAddForm({ name: '', email: '', password: '' }); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider
                         bg-gradient-to-r from-[var(--color-gold-dark)] via-[var(--color-gold)] to-[var(--color-gold-light)] text-[var(--color-dark)]
                         hover:shadow-[0_0_30px_rgba(198,169,98,0.4)] transition-all duration-300"
            >
              <UserPlus className="w-4 h-4" />
              Add Manager
            </button>
          </motion.div>

          {/* Feedback */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div key="err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
                <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
              </motion.div>
            )}
            {success && (
              <motion.div key="suc" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="mb-6 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 text-sm">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats Bar */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Total Staff', value: stats.total, color: 'text-[var(--color-gold)]', bgClass: 'border-[var(--color-gold)]/20' },
              { label: 'Active', value: stats.active, color: 'text-emerald-400', bgClass: 'border-emerald-500/20' },
              { label: 'Inactive', value: stats.inactive, color: 'text-gray-400', bgClass: 'border-gray-500/20' },
              { label: 'Suspended', value: stats.suspended, color: 'text-red-400', bgClass: 'border-red-500/20' },
            ].map((stat) => (
              <div key={stat.label} className={`rounded-xl bg-[var(--color-dark-card)] border ${stat.bgClass} p-4 text-center`}>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Filter Tabs */}
          <motion.div variants={itemVariants} className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {(['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  filterTab === tab
                    ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/25'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-champagne)] hover:bg-white/5 border border-transparent'
                }`}
              >
                {tab === 'ALL' ? `All (${stats.total})` : `${tab.charAt(0) + tab.slice(1).toLowerCase()} (${stats[tab.toLowerCase() as keyof typeof stats]})`}
              </button>
            ))}
          </motion.div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[var(--color-gold)] animate-spin" />
            </div>
          )}

          {/* Empty */}
          {!loading && filteredStaff.length === 0 && (
            <motion.div variants={itemVariants} className="text-center py-20">
              <Users className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
              <p className="text-[var(--color-text-secondary)] text-lg">No staff members found</p>
            </motion.div>
          )}

          {/* Staff List */}
          {!loading && filteredStaff.length > 0 && (
            <motion.div variants={containerVariants} className="space-y-3">
              {filteredStaff.map((member) => {
                const isOwner = member.role === 'OWNER';

                return (
                  <motion.div
                    key={member.id}
                    variants={itemVariants}
                    className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-dark-card)] p-5
                               hover:border-[var(--color-gold)]/20 transition-colors duration-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                        isOwner
                          ? 'bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-dark)]'
                          : 'bg-[var(--color-warm-gray)] border border-[var(--glass-border)]'
                      }`}>
                        <span className={`text-sm font-bold ${isOwner ? 'text-[var(--color-dark)]' : 'text-[var(--color-text-secondary)]'}`}>
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Info Grid */}
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 items-center">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{member.name}</p>
                          <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{member.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <RoleBadge role={member.role} />
                          <StaffStatusBadge status={member.status} />
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          <span>Last login: </span>
                          <span className="text-[var(--color-text-secondary)]">
                            {member.last_login
                              ? new Date(member.last_login).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : 'Never'}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          Created: {new Date(member.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>

                      {/* Actions (only for managers) */}
                      {!isOwner && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {/* Edit Name */}
                          <button
                            onClick={() => { setEditModal(member); setEditName(member.name); }}
                            className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 transition-all duration-200"
                            title="Edit name"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Suspend */}
                          {member.status !== 'SUSPENDED' && (
                            <button
                              onClick={() => handleStatusAction(member, 'suspend')}
                              disabled={actionLoading === `${member.id}-suspend`}
                              className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-orange-400 hover:bg-orange-500/10 transition-all duration-200 disabled:opacity-50"
                              title="Suspend"
                            >
                              {actionLoading === `${member.id}-suspend` ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Deactivate */}
                          {member.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleStatusAction(member, 'deactivate')}
                              disabled={actionLoading === `${member.id}-deactivate`}
                              className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-gray-400 hover:bg-gray-500/10 transition-all duration-200 disabled:opacity-50"
                              title="Deactivate"
                            >
                              {actionLoading === `${member.id}-deactivate` ? <Loader2 className="w-4 h-4 animate-spin" /> : <PowerOff className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Activate */}
                          {member.status !== 'ACTIVE' && (
                            <button
                              onClick={() => handleStatusAction(member, 'activate')}
                              disabled={actionLoading === `${member.id}-activate`}
                              className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200 disabled:opacity-50"
                              title="Activate"
                            >
                              {actionLoading === `${member.id}-activate` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Reset Password */}
                          <button
                            onClick={() => { setResetModal(member); setResetPassword(''); }}
                            className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-amber-400 hover:bg-amber-500/10 transition-all duration-200"
                            title="Reset password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(member)}
                            disabled={actionLoading === `${member.id}-delete`}
                            className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50"
                            title="Delete (soft)"
                          >
                            {actionLoading === `${member.id}-delete` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* ════════════════════════════════════════ */}
      {/*  MODALS                                 */}
      {/* ════════════════════════════════════════ */}

      {/* ── Add Manager Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-[var(--color-dark-card)] border border-[var(--glass-border)] shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[var(--color-champagne)] font-[family-name:var(--font-playfair)]">
                  Add Manager
                </h2>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-champagne)] hover:bg-white/5">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-2 font-medium">Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                    <input
                      type="text"
                      value={addForm.name}
                      onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                      placeholder="Manager name"
                      className="w-full pl-11 pr-4 py-3 rounded-lg bg-[var(--color-dark)] border border-[var(--glass-border)]
                                 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-sm
                                 focus:outline-none focus:border-[var(--color-gold)]/40 transition-all duration-300"
                    />
                  </div>
                </div>
                {/* Email */}
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-2 font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                    <input
                      type="email"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      placeholder="manager@bohocafe.in"
                      className="w-full pl-11 pr-4 py-3 rounded-lg bg-[var(--color-dark)] border border-[var(--glass-border)]
                                 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-sm
                                 focus:outline-none focus:border-[var(--color-gold)]/40 transition-all duration-300"
                    />
                  </div>
                </div>
                {/* Password */}
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-2 font-medium">Temporary Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      placeholder="Temporary password"
                      className="w-full pl-11 pr-12 py-3 rounded-lg bg-[var(--color-dark)] border border-[var(--glass-border)]
                                 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-sm
                                 focus:outline-none focus:border-[var(--color-gold)]/40 transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-gold)] transition-colors"
                    >
                      {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={addLoading || !addForm.name.trim() || !addForm.email.trim() || !addForm.password.trim()}
                  className="w-full py-3 rounded-lg text-sm font-semibold uppercase tracking-wider
                             bg-gradient-to-r from-[var(--color-gold-dark)] via-[var(--color-gold)] to-[var(--color-gold-light)] text-[var(--color-dark)]
                             hover:shadow-[0_0_30px_rgba(198,169,98,0.4)] disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {addLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create Manager'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit Name Modal ── */}
      <AnimatePresence>
        {editModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setEditModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-[var(--color-dark-card)] border border-[var(--glass-border)] shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-[var(--color-champagne)] font-[family-name:var(--font-playfair)]">Edit Name</h2>
                <button onClick={() => setEditModal(null)} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-champagne)]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">Updating name for: {editModal.email}</p>
              <div className="relative mb-4">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateName(); }}
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-[var(--color-dark)] border border-[var(--glass-border)]
                             text-[var(--color-text-primary)] text-sm
                             focus:outline-none focus:border-[var(--color-gold)]/40 transition-all duration-300"
                />
              </div>
              <button
                onClick={handleUpdateName}
                disabled={editLoading || !editName.trim()}
                className="w-full py-3 rounded-lg text-sm font-semibold uppercase tracking-wider
                           bg-gradient-to-r from-[var(--color-gold-dark)] via-[var(--color-gold)] to-[var(--color-gold-light)] text-[var(--color-dark)]
                           hover:shadow-[0_0_30px_rgba(198,169,98,0.4)] disabled:opacity-50
                           transition-all duration-300 flex items-center justify-center gap-2"
              >
                {editLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reset Password Modal ── */}
      <AnimatePresence>
        {resetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setResetModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-[var(--color-dark-card)] border border-[var(--glass-border)] shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-[var(--color-champagne)] font-[family-name:var(--font-playfair)]">Reset Password</h2>
                <button onClick={() => setResetModal(null)} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-champagne)]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">Resetting password for: {resetModal.name} ({resetModal.email})</p>
              <div className="relative mb-4">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleResetPassword(); }}
                  placeholder="New password"
                  className="w-full pl-11 pr-12 py-3 rounded-lg bg-[var(--color-dark)] border border-[var(--glass-border)]
                             text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-sm
                             focus:outline-none focus:border-[var(--color-gold)]/40 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-gold)] transition-colors"
                >
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleResetPassword}
                disabled={resetLoading || !resetPassword.trim()}
                className="w-full py-3 rounded-lg text-sm font-semibold uppercase tracking-wider
                           bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-[var(--color-dark)]
                           hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] disabled:opacity-50
                           transition-all duration-300 flex items-center justify-center gap-2"
              >
                {resetLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting…</> : 'Reset Password'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
