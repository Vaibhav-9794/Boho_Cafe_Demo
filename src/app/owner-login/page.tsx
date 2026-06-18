'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { createAuthBrowserClient } from '@/lib/supabase';

export default function OwnerLoginPage() {
  const router = useRouter();
  const supabase = createAuthBrowserClient();

  /* form state */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  /* feedback state */
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* ── login handler ── */
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Authentication failed. Please try again.');
        setLoading(false);
        return;
      }

      /* check staff profile */
      const { data: profile, error: profileError } = await supabase
        .from('staff_profiles')
        .select('role, status')
        .eq('user_id', data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        router.push('/staff-login?error=no_profile');
        return;
      }

      if (profile.role !== 'OWNER') {
        await supabase.auth.signOut();
        setError('Access denied. This login is for owners only.');
        setLoading(false);
        return;
      }

      if (profile.status === 'SUSPENDED') {
        await supabase.auth.signOut();
        router.push('/staff-login?error=suspended');
        return;
      }

      if (profile.status === 'INACTIVE') {
        await supabase.auth.signOut();
        router.push('/staff-login?error=inactive');
        return;
      }

      /* update last_login */
      await supabase
        .from('staff_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('user_id', data.user.id);

      /* redirect to dashboard — refresh ensures cookies are picked up */
      router.refresh();
      await new Promise(r => setTimeout(r, 200));
      router.push('/owner');
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  /* ── forgot password handler ── */
  async function handleForgotPassword() {
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }

    setForgotLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/owner-login`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess('Password reset email sent! Check your inbox.');
      }
    } catch {
      setError('Failed to send reset email.');
    } finally {
      setForgotLoading(false);
    }
  }

  /* animation variants */
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.15 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  };

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-15%] right-[-5%] w-[450px] h-[450px] rounded-full bg-[#C6A962]/[0.04] blur-[120px]" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[400px] h-[400px] rounded-full bg-[#C6A962]/[0.03] blur-[100px]" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-md"
      >
        {/* ── glassmorphism card ── */}
        <motion.div
          variants={item}
          className="rounded-2xl p-8 md:p-10
                     bg-[rgba(26,26,26,0.6)] backdrop-blur-2xl border border-[rgba(198,169,98,0.15)]
                     shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
        >
          {/* icon */}
          <motion.div variants={item} className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C6A962] to-[#A88B3E] flex items-center justify-center shadow-[0_0_40px_rgba(198,169,98,0.2)]">
              <Crown className="w-7 h-7 text-[#0A0A0A]" />
            </div>
          </motion.div>

          {/* title */}
          <motion.h1
            variants={item}
            className="text-3xl font-bold text-center text-gradient-gold font-[family-name:var(--font-playfair)] mb-1"
          >
            Owner Login
          </motion.h1>

          <motion.p variants={item} className="text-center text-[#A09888] text-sm mb-8">
            Sign in with your owner credentials
          </motion.p>

          {/* ── feedback messages ── */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-6 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 text-sm">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── form ── */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* email */}
            <motion.div variants={item}>
              <label className="block text-xs uppercase tracking-widest text-[#A09888] mb-2 font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6358]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@bohocafe.in"
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-[#151515] border border-[rgba(198,169,98,0.12)]
                             text-[#F5F0E8] placeholder:text-[#6B6358] text-sm
                             focus:outline-none focus:border-[#C6A962]/40 focus:shadow-[0_0_0_3px_rgba(198,169,98,0.08)]
                             transition-all duration-300"
                />
              </div>
            </motion.div>

            {/* password */}
            <motion.div variants={item}>
              <label className="block text-xs uppercase tracking-widest text-[#A09888] mb-2 font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6358]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-12 py-3 rounded-lg bg-[#151515] border border-[rgba(198,169,98,0.12)]
                             text-[#F5F0E8] placeholder:text-[#6B6358] text-sm
                             focus:outline-none focus:border-[#C6A962]/40 focus:shadow-[0_0_0_3px_rgba(198,169,98,0.08)]
                             transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6358] hover:text-[#C6A962] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>

            {/* submit */}
            <motion.div variants={item}>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-lg text-sm font-semibold uppercase tracking-widest
                           bg-gradient-to-r from-[#A88B3E] via-[#C6A962] to-[#D4B96E] text-[#0A0A0A]
                           hover:shadow-[0_0_30px_rgba(198,169,98,0.4)] disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing In…
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </motion.div>
          </form>

          {/* ── forgot password ── */}
          <motion.div variants={item} className="mt-5 text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={forgotLoading}
              className="text-[#C6A962]/80 hover:text-[#C6A962] text-sm transition-colors duration-300 disabled:opacity-50"
            >
              {forgotLoading ? 'Sending…' : 'Forgot Password?'}
            </button>
          </motion.div>
        </motion.div>

        {/* ── back link ── */}
        <motion.div variants={item} className="mt-8 flex justify-center">
          <button
            onClick={() => router.push('/staff-login')}
            className="flex items-center gap-2 text-[#A09888] hover:text-[#C6A962] transition-colors duration-300 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Role Selection
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
