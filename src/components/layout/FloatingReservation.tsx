"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarHeart } from "lucide-react";

export default function FloatingReservation() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 600);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    const el = document.getElementById("reservation");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClick}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[var(--color-gold)] text-[var(--color-dark)] flex items-center justify-center shadow-lg animate-pulse-gold cursor-pointer"
          aria-label="Book a table"
        >
          <CalendarHeart size={24} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
