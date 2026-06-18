"use client";

import { useState, useEffect, useMemo, FormEvent, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Loader2,
  Copy,
  ExternalLink,
  Users,
  Home,
  PartyPopper,
  Check,
  X,
  AlertCircle,
  Timer,
  Bell,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { fadeInLeft, fadeInRight } from "@/lib/animations";

interface TableAvailability {
  number: number;
  capacity: number;
  label: string;
  available: boolean;
  pending?: boolean;
  held?: boolean;
  reason?: string;
}

const TIME_SLOTS = [
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
  "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM",
];

const BOOKING_TYPES = [
  { value: "TABLE", label: "Table Booking", icon: <Users size={18} />, desc: "Reserve a specific table" },
  { value: "FULL_CAFE", label: "Full Cafe", icon: <Home size={18} />, desc: "Reserve the entire cafe" },
  { value: "EVENT", label: "Event Booking", icon: <PartyPopper size={18} />, desc: "Private event or party" },
];

const EVENT_TYPES = ["Birthday", "Anniversary", "Corporate Event", "Kitty Party", "Private Gathering"];
const occasions = ["Casual Dining", "Birthday", "Anniversary", "Date Night", "Business Meeting", "Other"];

interface FormState {
  name: string; email: string; phone: string; date: string;
  startTime: string; endTime: string; guests: number;
  occasion: string; specialRequests: string; bookingType: string;
  tableNumber: number | null; _gotcha: string;
  // Event fields
  eventType: string; expectedGuests: number; decorationRequired: boolean;
  cakeRequired: boolean; budget: string; eventNotes: string;
}

const initialForm: FormState = {
  name: "", email: "", phone: "", date: "", startTime: "", endTime: "",
  guests: 2, occasion: "", specialRequests: "", bookingType: "TABLE",
  tableNumber: null, _gotcha: "",
  eventType: "", expectedGuests: 20, decorationRequired: false,
  cakeRequired: false, budget: "", eventNotes: "",
};

export default function ReservationSection() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reservationId, setReservationId] = useState("");
  const [copied, setCopied] = useState(false);

  // Availability state
  const [tables, setTables] = useState<TableAvailability[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [isFullCafeBlocked, setIsFullCafeBlocked] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [dateBlocked, setDateBlocked] = useState<string | null>(null);

  // Hold system
  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdTimer, setHoldTimer] = useState(0);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Waitlist
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const isNameValid = form.name.trim().length > 0;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const isPhoneValid = form.phone.trim().length > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : name === "guests" || name === "expectedGuests" ? parseInt(value) || 1 : value,
      ...(name === "bookingType" ? { tableNumber: null } : {}),
    }));
  };

  // Cleanup hold on unmount
  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    };
  }, []);

  // Release hold when table is deselected or booking type changes
  useEffect(() => {
    if (holdId && !form.tableNumber) {
      releaseHold();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tableNumber]);

  // Clear table selection when guest count exceeds table capacity
  useEffect(() => {
    if (form.tableNumber && tables.length > 0) {
      const selectedTable = tables.find(t => t.number === form.tableNumber);
      if (selectedTable && selectedTable.capacity < form.guests) {
        releaseHold();
        setForm(p => ({ ...p, tableNumber: null }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.guests]);

  const createHold = async (tableNumber: number) => {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const res = await fetch("/api/reservation/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          tableNumber,
          sessionId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHoldId(data.holdId);
        setHoldTimer(600); // 10 minutes in seconds

        // Start countdown
        holdIntervalRef.current = setInterval(() => {
          setHoldTimer((prev) => {
            if (prev <= 1) {
              // Hold expired
              if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
              setHoldId(null);
              setForm((p) => ({ ...p, tableNumber: null }));
              checkAvailability();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch { /* */ }
  };

  const releaseHold = async () => {
    if (!holdId) return;
    try {
      await fetch("/api/reservation/hold", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdId }),
      });
    } catch { /* */ }
    setHoldId(null);
    setHoldTimer(0);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
  };

  const formatHoldTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Fetch availability when date + start + end time are selected
  const checkAvailability = useCallback(async () => {
    if (!form.date || !form.startTime || !form.endTime) return;

    setLoadingAvailability(true);
    setAvailabilityChecked(false);
    setDateBlocked(null);
    try {
      const params = new URLSearchParams({
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
      });
      const res = await fetch(`/api/reservation/availability?${params}`);
      const data = await res.json();
      if (data.success) {
        if (data.blocked) {
          setDateBlocked(data.blockReason || "Date is blocked");
          setTables([]);
          setIsFullCafeBlocked(true);
        } else {
          setTables(data.tables);
          setIsFullCafeBlocked(data.isFullCafeBlocked);
        }
        setAvailabilityChecked(true);
      }
    } catch { /* */ } finally {
      setLoadingAvailability(false);
    }
  }, [form.date, form.startTime, form.endTime]);

  useEffect(() => {
    if (form.date && form.startTime && form.endTime) {
      const timer = setTimeout(checkAvailability, 300);
      return () => clearTimeout(timer);
    }
  }, [form.date, form.startTime, form.endTime, checkAvailability]);

  const handleSelectTable = async (tableNum: number) => {
    // Release existing hold if any
    if (holdId) await releaseHold();
    setForm((p) => ({ ...p, tableNumber: tableNum }));
    // Create new hold
    if (form.date && form.startTime && form.endTime) {
      await createHold(tableNum);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    setError("");
    if (!isNameValid || !isEmailValid || !isPhoneValid) return;
    if (form._gotcha) return;
    if (form.bookingType === "TABLE" && !form.tableNumber) {
      setError("Please select a table from the availability panel.");
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name, email: form.email, phone: form.phone,
        date: form.date, startTime: form.startTime, endTime: form.endTime,
        guests: form.guests, occasion: form.occasion,
        specialRequests: form.specialRequests,
        bookingType: form.bookingType,
        tableNumber: form.tableNumber,
        isFullCafe: form.bookingType === "FULL_CAFE",
      };

      // Add hold ID to convert hold to reservation
      if (holdId) body.holdId = holdId;

      // Add event details
      if (form.bookingType === "EVENT") {
        body.eventType = form.eventType;
        body.eventDetails = {
          eventType: form.eventType,
          expectedGuests: form.expectedGuests,
          decorationRequired: form.decorationRequired,
          cakeRequired: form.cakeRequired,
          budget: form.budget,
          eventNotes: form.eventNotes,
        };
      }

      const res = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReservationId(data.reservationId || "");
        setSubmitted(true);
        // Clear hold since it's now a real reservation
        setHoldId(null);
        setHoldTimer(0);
        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      } else {
        setError(data.message || "Something went wrong.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!form.name || !form.email || !form.phone) {
      setError("Please fill in your name, email, and phone to join the waitlist.");
      return;
    }
    setWaitlistLoading(true);
    try {
      const res = await fetch("/api/reservation/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone,
          date: form.date, startTime: form.startTime, endTime: form.endTime,
        }),
      });
      const data = await res.json();
      if (data.success) setWaitlistSubmitted(true);
      else setError(data.message || "Failed to join waitlist.");
    } catch { setError("Network error."); } finally { setWaitlistLoading(false); }
  };

  const resetForm = () => {
    if (holdId) releaseHold();
    setForm(initialForm);
    setSubmitted(false); setAttempted(false); setError(""); setReservationId("");
    setCopied(false); setTables([]); setAvailabilityChecked(false); setDateBlocked(null);
    setShowWaitlist(false); setWaitlistSubmitted(false);
  };

  const copyId = () => { navigator.clipboard.writeText(reservationId); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const inputCls = "w-full bg-[var(--color-warm-gray)] border border-[var(--color-warm-gray-light)] text-[var(--color-text-primary)] rounded-lg px-4 py-3 focus:border-[var(--color-gold)] focus:outline-none transition placeholder:text-[var(--color-text-muted)] text-sm";
  const labelCls = "block text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mb-1.5 font-[family-name:var(--font-inter)]";
  const invalidCls = "!border-red-500";

  const maxTableCapacity = tables.length > 0 ? Math.max(...tables.map(t => t.capacity)) : 12;
  const isLargeGroup = form.guests > maxTableCapacity;
  const suitableTables = tables.filter((t) => t.capacity >= form.guests);
  const tooSmallTables = tables.filter((t) => t.capacity < form.guests && t.available);
  const availableTables = suitableTables.filter((t) => t.available);
  const unavailableTables = suitableTables.filter((t) => !t.available);
  const allUnavailable = availabilityChecked && form.bookingType === "TABLE" && availableTables.length === 0 && !dateBlocked && !isLargeGroup;

  // Multi-table recommendation for large groups
  const multiTableRecommendation = useMemo(() => {
    if (!isLargeGroup || !availabilityChecked) return null;
    const allAvailable = tables.filter(t => t.available).sort((a, b) => b.capacity - a.capacity);
    const combo: TableAvailability[] = [];
    let remaining = form.guests;
    for (const table of allAvailable) {
      if (remaining <= 0) break;
      combo.push(table);
      remaining -= table.capacity;
    }
    if (remaining <= 0) {
      return { tables: combo, totalCapacity: combo.reduce((s, t) => s + t.capacity, 0) };
    }
    return null;
  }, [isLargeGroup, availabilityChecked, tables, form.guests]);

  return (
    <section id="reservation" className="relative py-[var(--section-padding)] bg-[var(--color-dark)] overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 25% 25%, var(--color-gold) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading subtitle="Reserve Your Experience" title="Book a Table" />

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start mt-12">
          {/* Left: Availability Panel */}
          <motion.div variants={fadeInLeft} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}>
            {/* Booking Type Selector */}
            <div className="mb-6">
              <p className={labelCls}>Booking Type</p>
              <div className="grid grid-cols-3 gap-2">
                {BOOKING_TYPES.map((bt) => (
                  <button key={bt.value} type="button"
                    onClick={() => setForm((p) => ({ ...p, bookingType: bt.value, tableNumber: null }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all duration-300 ${
                      form.bookingType === bt.value
                        ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                        : "border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)]/30"
                    }`}>
                    {bt.icon}
                    <span className="text-xs font-medium">{bt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Availability Display */}
            <div className="glass-strong rounded-xl p-6 min-h-[300px]">
              <h3 className="font-[family-name:var(--font-playfair)] text-lg text-[var(--color-text-primary)] mb-1">
                {form.bookingType === "FULL_CAFE" ? "Cafe Availability" : "Table Availability"}
              </h3>
              <p className="text-[var(--color-text-muted)] text-xs mb-4">
                Select date & time to check availability
              </p>

              {/* Hold Timer */}
              {holdId && holdTimer > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4 animate-pulse">
                  <Timer size={16} className="text-blue-400" />
                  <span className="text-blue-400 text-sm font-medium">Table held for {formatHoldTimer(holdTimer)}</span>
                </div>
              )}

              {!form.date || !form.startTime || !form.endTime ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="text-[var(--color-text-muted)] mb-3" size={36} />
                  <p className="text-[var(--color-text-muted)] text-sm">
                    Choose a date, start time & end time to see available tables
                  </p>
                </div>
              ) : loadingAvailability ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-[var(--color-gold)]" size={32} />
                </div>
              ) : dateBlocked ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <AlertCircle className="text-red-400 mb-3" size={40} />
                  <p className="text-red-400 font-medium mb-1">🚫 Date Blocked</p>
                  <p className="text-[var(--color-text-muted)] text-sm">{dateBlocked}</p>
                  <p className="text-[var(--color-text-muted)] text-xs mt-2">Bookings are not available on this date.</p>
                </div>
              ) : isFullCafeBlocked && form.bookingType !== "TABLE" ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <AlertCircle className="text-red-400 mb-3" size={40} />
                  <p className="text-red-400 font-medium mb-1">Cafe Unavailable</p>
                  <p className="text-[var(--color-text-muted)] text-sm">The entire cafe is reserved during the selected time.</p>
                </div>
              ) : form.bookingType === "FULL_CAFE" ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  {unavailableTables.length > 0 ? (<>
                    <AlertCircle className="text-amber-400 mb-3" size={40} />
                    <p className="text-amber-400 font-medium mb-1">Tables Already Reserved</p>
                    <p className="text-[var(--color-text-muted)] text-sm">{unavailableTables.length} table(s) have existing reservations. Full cafe not available.</p>
                  </>) : (<>
                    <Check className="text-emerald-400 mb-3" size={40} />
                    <p className="text-emerald-400 font-medium mb-1">Full Cafe Available!</p>
                    <p className="text-[var(--color-text-muted)] text-sm">All 10 tables are available for this time slot.</p>
                  </>)}
                </div>
              ) : isLargeGroup && form.bookingType === "TABLE" && availabilityChecked ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                  <AlertCircle className="text-amber-400" size={40} />
                  <div>
                    <p className="text-amber-400 font-medium mb-1">⚠ Single table unavailable for {form.guests} guests</p>
                    <p className="text-[var(--color-text-muted)] text-sm">Our largest table seats {maxTableCapacity} guests.</p>
                  </div>
                  {multiTableRecommendation && (
                    <div className="w-full p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 text-left">
                      <p className="text-blue-400 text-xs uppercase tracking-widest mb-3 font-semibold">💡 Multi-Table Recommendation</p>
                      <div className="space-y-2 mb-3">
                        {multiTableRecommendation.tables.map((t) => (
                          <div key={t.number} className="flex items-center gap-2 text-sm">
                            <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">{t.number}</div>
                            <span className="text-[var(--color-text-secondary)]">Table {t.number}</span>
                            <span className="text-[var(--color-text-muted)] text-xs ml-auto">{t.capacity} seats</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-blue-500/10">
                        <span className="text-[var(--color-text-muted)] text-xs">Total Capacity</span>
                        <span className="text-blue-400 font-semibold text-sm">{multiTableRecommendation.totalCapacity} seats</span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setForm(p => ({...p, bookingType: "FULL_CAFE"}))}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 text-[var(--color-gold)] text-sm hover:bg-[var(--color-gold)]/15 transition">
                      <Home size={14} /> Full Cafe Booking
                    </button>
                    <button type="button" onClick={() => setForm(p => ({...p, bookingType: "EVENT"}))}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm hover:bg-amber-500/15 transition">
                      <PartyPopper size={14} /> Event Booking
                    </button>
                  </div>
                </div>
              ) : availabilityChecked ? (
                <div className="space-y-3">
                  {availableTables.length > 0 && (
                    <div>
                      <p className="text-emerald-400 text-xs uppercase tracking-widest mb-2 font-semibold">✓ Suitable Tables ({availableTables.length})</p>
                      <div className="grid grid-cols-2 gap-2">
                        {availableTables.map((t) => (
                          <button key={t.number} type="button" onClick={() => handleSelectTable(t.number)}
                            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all text-sm ${
                              form.tableNumber === t.number
                                ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-[var(--color-gold)]"
                                : "border-emerald-500/20 bg-emerald-500/5 text-[var(--color-text-secondary)] hover:border-emerald-500/40"
                            }`}>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                              form.tableNumber === t.number ? "bg-[var(--color-gold)] text-[var(--color-dark)]" : "bg-emerald-500/20 text-emerald-400"
                            }`}>{t.number}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs">Table {t.number}</p>
                              <p className="text-[var(--color-text-muted)] text-[10px]">Capacity: {t.capacity} Guests</p>
                            </div>
                            {form.tableNumber === t.number ? (
                              <Check size={14} className="text-[var(--color-gold)]" />
                            ) : (
                              <span className="text-emerald-400 text-[9px] font-medium uppercase">Available</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {unavailableTables.length > 0 && (
                    <div>
                      <p className="text-red-400 text-xs uppercase tracking-widest mb-2 font-semibold mt-4">✗ Unavailable ({unavailableTables.length})</p>
                      <div className="grid grid-cols-2 gap-2">
                        {unavailableTables.map((t) => (
                          <div key={t.number} className="flex items-center gap-3 p-3 rounded-lg border border-red-500/15 bg-red-500/5 opacity-50 text-sm">
                            <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center text-sm font-bold text-red-400">{t.number}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs text-[var(--color-text-muted)]">Table {t.number}</p>
                              <p className="text-[var(--color-text-muted)] text-[10px]">Capacity: {t.capacity} Guests</p>
                              <p className="text-red-400/70 text-[10px]">{t.held ? "Held" : t.reason || "Reserved"}</p>
                            </div>
                            <X size={14} className="text-red-400/50" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {tooSmallTables.length > 0 && (
                    <p className="text-[var(--color-text-muted)] text-[10px] text-center mt-2 italic">
                      {tooSmallTables.length} smaller table{tooSmallTables.length > 1 ? "s" : ""} hidden (below {form.guests}-guest requirement)
                    </p>
                  )}

                  {/* Waitlist Option */}
                  {allUnavailable && !showWaitlist && !waitlistSubmitted && (
                    <div className="mt-4 text-center">
                      <p className="text-amber-400 text-sm mb-2">All tables are booked for this time.</p>
                      <button type="button" onClick={() => setShowWaitlist(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm hover:bg-amber-500/15 transition">
                        <Bell size={16} /> Join Waitlist
                      </button>
                    </div>
                  )}

                  {waitlistSubmitted && (
                    <div className="mt-4 text-center p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <Check className="mx-auto mb-2 text-emerald-400" size={28} />
                      <p className="text-emerald-400 font-medium text-sm">Added to Waitlist!</p>
                      <p className="text-[var(--color-text-muted)] text-xs mt-1">We&apos;ll notify you when a table opens up.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </motion.div>

          {/* Right: Form */}
          <motion.div variants={fadeInRight} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}>
            <div className="glass-strong rounded-xl p-6 md:p-8 relative overflow-hidden">
              {/* Success Overlay */}
              <AnimatePresence>
                {submitted && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[rgba(26,26,26,0.95)] backdrop-blur-md rounded-xl p-8 text-center overflow-y-auto">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }}>
                      <Clock className="text-amber-400 mx-auto mb-6" size={72} strokeWidth={1.5} />
                    </motion.div>
                    <h3 className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl font-bold text-gradient-gold mb-3">Request Submitted!</h3>
                    <p className="text-[var(--color-text-secondary)] max-w-sm mb-6 leading-relaxed text-sm">
                      Thank you, {form.name}! Your reservation request is <span className="text-amber-400 font-semibold">awaiting confirmation</span>.
                    </p>
                    {reservationId && (
                      <div className="w-full max-w-sm mb-6">
                        <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-widest mb-2">Reservation ID</p>
                        <div className="flex items-center gap-2 bg-[var(--color-warm-gray)] border border-[var(--glass-border)] rounded-lg px-4 py-3">
                          <code className="text-[var(--color-gold)] text-sm flex-1 truncate font-mono">{reservationId}</code>
                          <button onClick={copyId} className="text-[var(--color-text-muted)] hover:text-[var(--color-gold)] transition-colors"><Copy size={16} /></button>
                        </div>
                        {copied && <p className="text-green-400 text-xs mt-1">Copied!</p>}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                      <a href={`/reservation/status${reservationId ? `?id=${reservationId}&email=${encodeURIComponent(form.email)}` : ""}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-[var(--color-gold-dark)] via-[var(--color-gold)] to-[var(--color-gold-light)] text-[var(--color-dark)] font-semibold text-sm">
                        <ExternalLink size={16} /> Track Status
                      </a>
                      <button onClick={resetForm} className="flex-1 btn-ghost px-5 py-3 text-sm">Book Another</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Waitlist Form Overlay */}
              <AnimatePresence>
                {showWaitlist && !waitlistSubmitted && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[rgba(26,26,26,0.95)] backdrop-blur-md rounded-xl p-8">
                    <Bell className="text-amber-400 mb-4" size={48} />
                    <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--color-text-primary)] mb-2">Join Waitlist</h3>
                    <p className="text-[var(--color-text-muted)] text-sm mb-6 text-center">We&apos;ll notify you when a table opens up for {form.date} ({form.startTime} → {form.endTime})</p>
                    <div className="w-full max-w-sm space-y-3">
                      <input name="name" value={form.name} onChange={handleChange} placeholder="Your name" className={inputCls} />
                      <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="your@email.com" className={inputCls} />
                      <input name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" className={inputCls} />
                      {error && <p className="text-red-400 text-sm">{error}</p>}
                      <button onClick={handleJoinWaitlist} disabled={waitlistLoading}
                        className="w-full py-3 rounded-lg font-semibold text-sm bg-gradient-to-r from-amber-500 to-amber-400 text-[#0A0A0A] disabled:opacity-50 flex items-center justify-center gap-2">
                        {waitlistLoading ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />} Join Waitlist
                      </button>
                      <button onClick={() => setShowWaitlist(false)} className="w-full py-2 text-[var(--color-text-muted)] text-sm hover:text-[var(--color-text-primary)]">Back to Form</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Date + Start + End Time */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="res-date" className={labelCls}>Date</label>
                    <input id="res-date" type="date" name="date" value={form.date} onChange={handleChange} min={today} required className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="res-start" className={labelCls}>Start Time</label>
                    <select id="res-start" name="startTime" value={form.startTime} onChange={handleChange} required className={inputCls}>
                      <option value="">Start</option>
                      {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="res-end" className={labelCls}>End Time</label>
                    <select id="res-end" name="endTime" value={form.endTime} onChange={handleChange} required className={inputCls}>
                      <option value="">End</option>
                      {TIME_SLOTS.filter((t) => {
                        if (!form.startTime) return true;
                        return TIME_SLOTS.indexOf(t) > TIME_SLOTS.indexOf(form.startTime);
                      }).map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Name + Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="res-name" className={labelCls}>Full Name</label>
                    <input id="res-name" name="name" value={form.name} onChange={handleChange} placeholder="Your name" required className={`${inputCls} ${attempted && !isNameValid ? invalidCls : ""}`} />
                  </div>
                  <div>
                    <label htmlFor="res-phone" className={labelCls}>Phone</label>
                    <input id="res-phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" required className={`${inputCls} ${attempted && !isPhoneValid ? invalidCls : ""}`} />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="res-email" className={labelCls}>Email</label>
                  <input id="res-email" type="email" name="email" value={form.email} onChange={handleChange} placeholder="your@email.com" required className={`${inputCls} ${attempted && !isEmailValid ? invalidCls : ""}`} />
                </div>

                {/* Guests + Occasion */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="res-guests" className={labelCls}>Guests</label>
                    <select id="res-guests" name="guests" value={form.guests} onChange={handleChange} className={inputCls}>
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n} {n === 1 ? "Guest" : "Guests"}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="res-occasion" className={labelCls}>Occasion</label>
                    <select id="res-occasion" name="occasion" value={form.occasion} onChange={handleChange} className={inputCls}>
                      <option value="">Select</option>
                      {occasions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                {/* Event-specific fields */}
                <AnimatePresence>
                  {form.bookingType === "EVENT" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                      <div className="p-4 rounded-lg border border-[var(--color-gold)]/20 bg-[var(--color-gold)]/5 space-y-3">
                        <p className="text-[var(--color-gold)] text-xs uppercase tracking-widest font-semibold flex items-center gap-1"><PartyPopper size={14} /> Event Details</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Event Type</label>
                            <select name="eventType" value={form.eventType} onChange={handleChange} className={inputCls}>
                              <option value="">Select Type</option>
                              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Expected Guests</label>
                            <input type="number" name="expectedGuests" value={form.expectedGuests} onChange={handleChange} min={1} max={200} className={inputCls} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] transition hover:border-[var(--color-gold)]/30">
                            <input type="checkbox" name="decorationRequired" checked={form.decorationRequired} onChange={handleChange} className="accent-[#C6A962] w-4 h-4" />
                            <span className="text-[var(--color-text-secondary)] text-sm">🎨 Decoration</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] transition hover:border-[var(--color-gold)]/30">
                            <input type="checkbox" name="cakeRequired" checked={form.cakeRequired} onChange={handleChange} className="accent-[#C6A962] w-4 h-4" />
                            <span className="text-[var(--color-text-secondary)] text-sm">🎂 Cake</span>
                          </label>
                        </div>
                        <div>
                          <label className={labelCls}>Budget (₹)</label>
                          <input name="budget" value={form.budget} onChange={handleChange} placeholder="e.g. 15000" className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Event Notes</label>
                          <textarea name="eventNotes" value={form.eventNotes} onChange={handleChange} rows={2} placeholder="Theme, preferences, special arrangements..." className={`${inputCls} resize-none`} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Selected Table Display */}
                {form.bookingType === "TABLE" && form.tableNumber && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-gold)] text-[var(--color-dark)] flex items-center justify-center text-xs font-bold">{form.tableNumber}</div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[var(--color-gold)] text-sm font-medium block">Table {form.tableNumber} selected</span>
                      <span className="text-[var(--color-text-muted)] text-[10px]">Capacity: {tables.find(t => t.number === form.tableNumber)?.capacity || "?"} Guests · Booking for: {form.guests}</span>
                    </div>
                    {holdTimer > 0 && <span className="text-blue-400 text-xs ml-1 flex items-center gap-1"><Timer size={12} />{formatHoldTimer(holdTimer)}</span>}
                    <button type="button" onClick={() => { releaseHold(); setForm((p) => ({ ...p, tableNumber: null })); }} className="ml-auto text-[var(--color-text-muted)] hover:text-red-400"><X size={16} /></button>
                  </div>
                )}

                {form.bookingType === "FULL_CAFE" && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5">
                    <Home size={18} className="text-[var(--color-gold)]" />
                    <span className="text-[var(--color-gold)] text-sm font-medium">Full Cafe Reservation</span>
                  </div>
                )}

                {/* Special Requests */}
                <div>
                  <label htmlFor="res-requests" className={labelCls}>Special Requests</label>
                  <textarea id="res-requests" name="specialRequests" value={form.specialRequests} onChange={handleChange} rows={2} placeholder="Any special requirements..." className={`${inputCls} resize-none`} />
                </div>

                {/* Honeypot */}
                <input type="text" name="_gotcha" value={form._gotcha} onChange={handleChange} className="hidden" tabIndex={-1} autoComplete="off" />

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button type="submit"
                  disabled={isSubmitting || (form.bookingType === "FULL_CAFE" && isFullCafeBlocked) || !!dateBlocked}
                  className="w-full py-3.5 rounded-lg font-semibold text-sm tracking-wide transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--color-gold-dark)] via-[var(--color-gold)] to-[var(--color-gold-light)] text-[var(--color-dark)] hover:shadow-lg hover:shadow-[var(--color-gold)]/20">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
                  {isSubmitting ? "Submitting..." : "Request Reservation"}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
