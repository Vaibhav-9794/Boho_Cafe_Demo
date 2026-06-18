"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="loading-screen"
        >
          <div className="loading-logo flex flex-col items-center">
            {/* Logo Circle */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-20 h-20 rounded-full border-2 border-[var(--color-gold)] flex items-center justify-center mb-6"
            >
              <span className="text-[var(--color-gold)] font-[family-name:var(--font-playfair)] font-bold text-3xl">
                B
              </span>
            </motion.div>

            {/* Brand Name */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl font-bold text-gradient-gold mb-1"
            >
              Boho Cafe & Lounge
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="text-[var(--color-text-muted)] text-sm tracking-[0.3em] uppercase font-[family-name:var(--font-cormorant)]"
            >
              Kanpur
            </motion.p>
          </div>

          {/* Shimmer Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.4 }}
            className="loading-shimmer"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
