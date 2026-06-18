"use client";

import { motion } from "framer-motion";
import { Utensils, Palette, Heart } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import {
  fadeInUp,
  fadeInLeft,
  fadeInRight,
  staggerContainer,
  scaleIn,
} from "@/lib/animations";

const features = [
  {
    icon: Utensils,
    title: "Artisanal Cuisine",
    description:
      "Every dish is a masterpiece, crafted with locally sourced ingredients and global inspiration by our award-winning chefs.",
  },
  {
    icon: Palette,
    title: "Stunning Ambience",
    description:
      "Bohemian-inspired interiors adorned with macramé, warm lighting, and curated décor that ignites every sense.",
  },
  {
    icon: Heart,
    title: "Memorable Moments",
    description:
      "From intimate dinners to vibrant celebrations, every visit is designed to become a cherished memory.",
  },
];

const stats = [
  { target: 15000, suffix: "+", label: "Happy Customers" },
  { target: 85, suffix: "+", label: "Signature Dishes" },
  { target: 500, suffix: "+", label: "Events Hosted" },
];

export default function AboutSection() {
  return (
    <section
      id="about"
      className="relative bg-[var(--color-dark)] py-[var(--section-padding)] overflow-hidden"
    >
      {/* Subtle Radial Gradient Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(198, 169, 98, 0.03) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(198, 169, 98, 0.02) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <SectionHeading subtitle="Our Story" title="The Boho Experience" />

        {/* Split Layout: Story + Image */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Story Text */}
          <motion.div
            variants={fadeInLeft}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <div className="space-y-6">
              <div className="ornament-line justify-start mb-4">
                <span className="w-1.5 h-1.5 rotate-45 bg-[var(--color-gold)] inline-block" />
              </div>
              <h3 className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl font-semibold text-[var(--color-champagne)]">
                A Sanctuary of Flavor &amp; Style
              </h3>
              <p className="text-[var(--color-text-secondary)] text-base md:text-lg leading-relaxed">
                Nestled on the 3rd floor of Swaroop Nagar, Boho Cafe &amp;
                Lounge was born from a passion to bring world-class dining to
                the heart of Kanpur. Our bohemian-inspired space is more than
                just a cafe — it&apos;s a sanctuary where artisanal flavors,
                handcrafted cocktails, and stunning aesthetics come together to
                create moments worth savoring.
              </p>
              <p className="text-[var(--color-text-secondary)] text-base md:text-lg leading-relaxed">
                Every detail, from our macramé wall hangings to our curated
                playlist, is designed to transport you to a world of warmth and
                wonder.
              </p>

              {/* Decorative Gold Line */}
              <div className="pt-4">
                <div className="h-px w-24 bg-gradient-to-r from-[var(--color-gold)] to-transparent" />
              </div>
            </div>
          </motion.div>

          {/* Right - Image */}
          <motion.div
            variants={fadeInRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="relative"
          >
            {/* Decorative Frame */}
            <div className="absolute -top-4 -right-4 w-full h-full border border-[var(--color-gold)]/20 rounded-lg z-0" />
            <div className="relative z-10 overflow-hidden rounded-lg">
              <img
                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80"
                alt="Boho Cafe & Lounge interior with warm bohemian decor"
                className="w-full h-[400px] md:h-[500px] object-cover"
                loading="lazy"
              />
              {/* Image Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-dark)] via-transparent to-transparent opacity-40" />
            </div>

            {/* Floating Accent Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="absolute -bottom-6 -left-6 z-20 glass rounded-lg p-4 sm:p-5"
            >
              <p className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl font-bold text-gradient-gold">
                Est. 2020
              </p>
              <p className="text-[var(--color-text-muted)] text-xs tracking-[0.15em] uppercase mt-1">
                Kanpur, India
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Feature Cards: Why Customers Love Boho */}
        <div className="mt-28">
          <motion.h3
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center font-[family-name:var(--font-playfair)] text-2xl md:text-3xl font-semibold text-[var(--color-champagne)] mb-12"
          >
            Why Customers Love Boho
          </motion.h3>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={scaleIn}
                className="glass rounded-xl p-6 sm:p-8 text-center group hover:border-[var(--color-gold)]/30 transition-all duration-500"
              >
                {/* Icon */}
                <div className="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-gold)]/10 group-hover:bg-[var(--color-gold)]/20 transition-colors duration-500">
                  <feature.icon className="w-6 h-6 text-[var(--color-gold)]" />
                </div>

                {/* Title */}
                <h4 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[var(--color-champagne)] mb-3">
                  {feature.title}
                </h4>

                {/* Description */}
                <p className="text-[var(--color-text-secondary)] text-sm md:text-base leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Statistics Row */}
        <div className="mt-24">
          <div className="glass rounded-2xl py-10 sm:py-14 px-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
              {stats.map((stat) => (
                <AnimatedCounter
                  key={stat.label}
                  target={stat.target}
                  suffix={stat.suffix}
                  label={stat.label}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section Divider */}
      <div className="section-divider mt-[var(--section-padding)]" />
    </section>
  );
}
