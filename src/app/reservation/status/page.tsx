"use client";

import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CheckCircle,
  XCircle,
  Search,
  ArrowLeft,
  Phone,
  MessageCircle,
  Loader2,
  Calendar,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface ReservationStatus {
  id: string;
  customerName: string;
  date: string;
  time: string;
  guestCount: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  createdAt: string;
}

const statusConfig = {
  PENDING: {
    icon: Clock,
    label: "Awaiting Confirmation",
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/30",
    message:
      "Your reservation is being reviewed by our team. You will receive an email once confirmed.",
  },
  CONFIRMED: {
    icon: CheckCircle,
    label: "Table Confirmed!",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/30",
    message:
      "Great news! Your table is confirmed. We look forward to welcoming you at Boho Cafe & Lounge!",
  },
  REJECTED: {
    icon: XCircle,
    label: "Not Available",
    color: "text-red-400",
    bg: "bg-red-400/10 border-red-400/30",
    message:
      "We apologize, but we are unable to accommodate this reservation. Please contact us directly for alternatives.",
  },
};

function StatusPageContent() {
  const searchParams = useSearchParams();

  const [reservationId, setReservationId] = useState(
    searchParams.get("id") || ""
  );
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [reservation, setReservation] = useState<ReservationStatus | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);

  // Auto-check if URL has both params
  useEffect(() => {
    if (searchParams.get("id") && searchParams.get("email")) {
      handleCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheck = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!reservationId.trim() || !email.trim()) return;

    setLoading(true);
    setError("");
    setReservation(null);

    try {
      const res = await fetch(
        `/api/reservation/status?id=${encodeURIComponent(reservationId.trim())}&email=${encodeURIComponent(email.trim())}`
      );
      const data = await res.json();

      if (res.ok && data.success) {
        setReservation(data.reservation);
      } else {
        setError(
          data.message || "No reservation found with the provided details."
        );
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setChecked(true);
    }
  };

  const config = reservation ? statusConfig[reservation.status] : null;
  const StatusIcon = config?.icon || Clock;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-xl"
      >
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#A09888] hover:text-[#C6A962] transition-colors mb-8 text-sm"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        {/* Header Card */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 border-2 border-[#C6A962] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-[#C6A962] font-bold text-xl">B</span>
          </div>
          <h1
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{
              fontFamily: "var(--font-playfair, 'Playfair Display', serif)",
              background: "linear-gradient(135deg, #A8893D, #C6A962, #D4B978)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Track Your Reservation
          </h1>
          <p className="text-[#A09888] text-sm">
            Enter your reservation details to check the current status
          </p>
        </div>

        {/* Search Form */}
        <div
          className="rounded-xl p-6 md:p-8 mb-6"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)",
          }}
        >
          <form onSubmit={handleCheck} className="space-y-4">
            <div>
              <label className="block text-[#A09888] text-xs uppercase tracking-widest mb-2">
                Reservation ID
              </label>
              <input
                type="text"
                value={reservationId}
                onChange={(e) => setReservationId(e.target.value)}
                placeholder="Enter your reservation ID"
                className="w-full bg-[#1E1E1E] border border-[rgba(255,255,255,0.06)] text-[#F5F0E8] rounded-lg px-4 py-3 focus:border-[#C6A962] focus:outline-none transition placeholder:text-[#6B5F4F] text-sm font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[#A09888] text-xs uppercase tracking-widest mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter the email used for booking"
                className="w-full bg-[#1E1E1E] border border-[rgba(255,255,255,0.06)] text-[#F5F0E8] rounded-lg px-4 py-3 focus:border-[#C6A962] focus:outline-none transition placeholder:text-[#6B5F4F] text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all duration-300 disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(to right, #A8893D, #C6A962, #D4B978)",
                color: "#0A0A0A",
              }}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Search size={18} />
              )}
              {loading ? "Checking..." : "Check Status"}
            </button>
          </form>
        </div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {/* Error */}
          {error && checked && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl p-6 text-center border border-red-500/20 bg-red-500/5"
            >
              <XCircle className="mx-auto mb-3 text-red-400" size={40} />
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Success — Reservation Found */}
          {reservation && config && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Status Badge */}
              <div
                className={`rounded-xl p-6 text-center border ${config.bg}`}
              >
                <StatusIcon
                  className={`mx-auto mb-3 ${config.color}`}
                  size={52}
                  strokeWidth={1.5}
                />
                <h2
                  className={`text-xl font-bold ${config.color} mb-2`}
                  style={{
                    fontFamily:
                      "var(--font-playfair, 'Playfair Display', serif)",
                  }}
                >
                  {config.label}
                </h2>
                <p className="text-[#A09888] text-sm leading-relaxed max-w-md mx-auto">
                  {config.message}
                </p>
              </div>

              {/* Reservation Details */}
              <div
                className="rounded-xl p-6"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <h3 className="text-[#C6A962] text-xs uppercase tracking-widest mb-4">
                  Reservation Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Users size={16} className="text-[#6B5F4F]" />
                    <div>
                      <p className="text-[#6B5F4F] text-xs">Guest</p>
                      <p className="text-[#F5F0E8] text-sm">
                        {reservation.customerName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users size={16} className="text-[#6B5F4F]" />
                    <div>
                      <p className="text-[#6B5F4F] text-xs">Party Size</p>
                      <p className="text-[#F5F0E8] text-sm">
                        {reservation.guestCount} guests
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-[#6B5F4F]" />
                    <div>
                      <p className="text-[#6B5F4F] text-xs">Date</p>
                      <p className="text-[#F5F0E8] text-sm">
                        {reservation.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-[#6B5F4F]" />
                    <div>
                      <p className="text-[#6B5F4F] text-xs">Time</p>
                      <p className="text-[#F5F0E8] text-sm">
                        {reservation.time}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div
                className="rounded-xl p-5 flex flex-col sm:flex-row items-center justify-center gap-4"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <a
                  href="tel:+918400678200"
                  className="inline-flex items-center gap-2 text-[#A09888] hover:text-[#C6A962] transition-colors text-sm"
                >
                  <Phone size={16} />
                  +91 84006 78200
                </a>
                <span className="hidden sm:inline text-[#6B5F4F]">|</span>
                <a
                  href="https://wa.me/918400678200"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#A09888] hover:text-emerald-400 transition-colors text-sm"
                >
                  <MessageCircle size={16} />
                  WhatsApp Us
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function ReservationStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <Loader2 className="animate-spin text-[#C6A962]" size={40} />
        </div>
      }
    >
      <StatusPageContent />
    </Suspense>
  );
}
