"use client";

import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";

interface SectionHeadingProps {
  subtitle?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}

export default function SectionHeading({
  subtitle,
  title,
  description,
  align = "center",
}: SectionHeadingProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className={`mb-16 ${align === "center" ? "text-center" : "text-left"}`}
    >
      {subtitle && (
        <p className="text-[var(--color-gold)] font-[family-name:var(--font-cormorant)] text-lg md:text-xl tracking-[0.2em] uppercase mb-3">
          {subtitle}
        </p>
      )}
      <h2 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl lg:text-5xl font-bold text-gradient-gold mb-4">
        {title}
      </h2>
      <div
        className={`ornament-line mt-5 mb-6 ${
          align === "center" ? "justify-center" : "justify-start"
        }`}
      >
        <span className="w-2 h-2 rotate-45 bg-[var(--color-gold)] inline-block" />
      </div>
      {description && (
        <p className="text-[var(--color-text-secondary)] max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
          {description}
        </p>
      )}
    </motion.div>
  );
}
