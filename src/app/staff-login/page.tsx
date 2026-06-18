'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Shield, ArrowLeft, AlertTriangle, XCircle } from 'lucide-react';

/* ─── error banner component (reads ?error=...) ─── */
function ErrorBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  if (!error) return null;

  const errorMap: Record<string, { message: string; type: 'red' | 'amber' }> = {
    suspended: {
      message: 'Your account has been suspended. Contact the owner.',
      type: 'red',
    },
    inactive: {
      message: 'Your account has been deactivated.',
      type: 'red',
    },
    unauthenticated: {
      message: 'Please log in to continue.',
      type: 'amber',
    },
    access_denied: {
      message: 'Access denied for your role.',
      type: 'amber',
    },
    no_profile: {
      message: 'No staff profile found.',
      type: 'red',
    },
  };

  const info = errorMap[error];
  if (!info) return null;

  const isRed = info.type === 'red';

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className={`w-full max-w-2xl mx-auto mb-8 px-5 py-4 rounded-lg border flex items-center gap-3 ${
        isRed
          ? 'bg-red-500/10 border-red-500/30 text-red-400'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
      }`}
    >
      {isRed ? (
        <XCircle className="w-5 h-5 shrink-0" />
      ) : (
        <AlertTriangle className="w-5 h-5 shrink-0" />
      )}
      <span className="text-sm font-medium">{info.message}</span>
    </motion.div>
  );
}

/* ─── main page ─── */
export default function StaffLoginPage() {
  const router = useRouter();

  /* animation variants */
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  };

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      {/* ── ambient glow decorations ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#C6A962]/[0.04] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#C6A962]/[0.03] blur-[140px]" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center w-full max-w-3xl"
      >
        {/* ── logo ── */}
        <motion.div variants={item} className="mb-8">
          <div className="w-20 h-20 rounded-full border-2 border-[#C6A962] flex items-center justify-center bg-[#C6A962]/10 shadow-[0_0_40px_rgba(198,169,98,0.15)]">
            <span className="text-3xl font-bold text-[#C6A962] font-[family-name:var(--font-playfair)]">
              B
            </span>
          </div>
        </motion.div>

        {/* ── heading ── */}
        <motion.h1
          variants={item}
          className="text-4xl md:text-5xl font-bold text-gradient-gold font-[family-name:var(--font-playfair)] mb-3 text-center"
        >
          Welcome Back
        </motion.h1>

        <motion.p
          variants={item}
          className="text-[#A09888] text-lg tracking-wide uppercase mb-10 text-center"
        >
          Choose Your Role
        </motion.p>

        {/* ── error banner (wrapped in Suspense) ── */}
        <Suspense fallback={null}>
          <AnimatePresence>
            <ErrorBanner />
          </AnimatePresence>
        </Suspense>

        {/* ── role cards ── */}
        <motion.div
          variants={item}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full"
        >
          {/* owner card */}
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="group relative rounded-xl p-8 flex flex-col items-center text-center cursor-pointer
                       bg-[rgba(26,26,26,0.6)] backdrop-blur-2xl border border-[rgba(198,169,98,0.15)]
                       shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-[#C6A962]/40
                       transition-colors duration-500"
            onClick={() => router.push('/owner-login')}
          >
            {/* subtle glow on hover */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#C6A962]/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C6A962] to-[#A88B3E] flex items-center justify-center shadow-[0_0_30px_rgba(198,169,98,0.25)]">
                <Crown className="w-7 h-7 text-[#0A0A0A]" />
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-[#F5F0E8] font-[family-name:var(--font-playfair)] mb-1">
                  Owner
                </h2>
                <p className="text-[#A09888] text-sm">Full administrative access</p>
              </div>

              <button
                className="mt-2 w-full py-3 px-6 rounded-lg text-sm font-semibold uppercase tracking-widest
                           bg-gradient-to-r from-[#A88B3E] via-[#C6A962] to-[#D4B96E] text-[#0A0A0A]
                           hover:shadow-[0_0_30px_rgba(198,169,98,0.4)] transition-all duration-300"
              >
                Owner Login
              </button>
            </div>
          </motion.div>

          {/* manager card */}
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="group relative rounded-xl p-8 flex flex-col items-center text-center cursor-pointer
                       bg-[rgba(26,26,26,0.6)] backdrop-blur-2xl border border-[rgba(198,169,98,0.15)]
                       shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-[#C6A962]/40
                       transition-colors duration-500"
            onClick={() => router.push('/manager-login')}
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#C6A962]/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-5">
              <div className="w-16 h-16 rounded-full border-2 border-[#C6A962] flex items-center justify-center bg-[#C6A962]/10">
                <Shield className="w-7 h-7 text-[#C6A962]" />
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-[#F5F0E8] font-[family-name:var(--font-playfair)] mb-1">
                  Manager
                </h2>
                <p className="text-[#A09888] text-sm">Operational access</p>
              </div>

              <button
                className="mt-2 w-full py-3 px-6 rounded-lg text-sm font-semibold uppercase tracking-widest
                           border border-[#C6A962] text-[#C6A962] bg-transparent
                           hover:bg-[#C6A962]/10 hover:shadow-[0_0_20px_rgba(198,169,98,0.15)]
                           transition-all duration-300"
              >
                Manager Login
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* ── back link ── */}
        <motion.div variants={item} className="mt-10">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-[#A09888] hover:text-[#C6A962] transition-colors duration-300 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Website
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
