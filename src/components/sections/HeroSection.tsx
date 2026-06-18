"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { staggerContainer, fadeInUp, fadeInDown } from "@/lib/animations";

const bokehParticles = [
  { size: 180, top: "10%", left: "15%", opacity: 0.08, delay: 0, duration: 6 },
  { size: 120, top: "25%", right: "10%", opacity: 0.06, delay: 1.5, duration: 7 },
  { size: 250, bottom: "20%", left: "60%", opacity: 0.05, delay: 0.8, duration: 8 },
  { size: 90, top: "50%", left: "5%", opacity: 0.07, delay: 2, duration: 5.5 },
  { size: 160, top: "60%", right: "20%", opacity: 0.04, delay: 3, duration: 9 },
  { size: 200, bottom: "10%", left: "25%", opacity: 0.06, delay: 1, duration: 7.5 },
  { size: 100, top: "15%", right: "35%", opacity: 0.05, delay: 2.5, duration: 6.5 },
];

export default function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);

  return (
    <section
      id="home"
      ref={heroRef}
      className="relative h-screen w-full overflow-hidden"
    >
      {/* ── Video Background ── */}
      {!videoFailed ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onError={() => setVideoFailed(true)}
          className="absolute inset-0 z-0 h-full w-full object-cover"
          poster="/hero-bg.png"
        >
          <source src="/video/hero-video.mp4" type="video/mp4" />
        </video>
      ) : (
        /* ── Fallback Static Image ── */
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url('/hero-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}

      {/* ── Premium Gradient Overlay ── */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.40) 45%, rgba(0,0,0,0.40) 55%, rgba(0,0,0,0.80) 100%)",
        }}
      />

      {/* ── Bokeh / Particle Overlay ── */}
      <div className="absolute inset-0 z-[3] pointer-events-none overflow-hidden">
        {bokehParticles.map((particle, index) => (
          <motion.div
            key={index}
            className="absolute rounded-full"
            style={{
              width: particle.size,
              height: particle.size,
              top: particle.top,
              left: particle.left,
              right: particle.right,
              bottom: particle.bottom,
              background: `radial-gradient(circle, rgba(198, 169, 98, ${particle.opacity}) 0%, rgba(198, 169, 98, 0) 70%)`,
            }}
            animate={{
              y: [0, -20, 0],
              x: [0, 10, 0],
              scale: [1, 1.15, 1],
              opacity: [particle.opacity, particle.opacity * 1.5, particle.opacity],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* ── Hero Content ── */}
      <motion.div
        className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center"
        style={{ y: textY, opacity: overlayOpacity }}
      >
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="max-w-4xl"
        >
          {/* Decorative Accent Line */}
          <motion.div variants={fadeInDown} className="mb-8">
            <div className="ornament-line">
              <span className="w-2 h-2 rotate-45 bg-[var(--color-gold)] inline-block" />
            </div>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            variants={fadeInUp}
            className="mb-4 text-[var(--color-gold)] font-[family-name:var(--font-cormorant)] text-lg md:text-xl tracking-[0.3em] uppercase"
          >
            Kanpur&apos;s Finest Destination
          </motion.p>

          {/* Main Headline */}
          <motion.h1
            variants={fadeInUp}
            className="font-[family-name:var(--font-playfair)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.1] mb-6 text-gradient-gold"
          >
            Where Flavors
            <br />
            Meet Ambience
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={fadeInUp}
            className="mx-auto max-w-2xl text-[var(--color-text-secondary)] text-base sm:text-lg md:text-xl leading-relaxed mb-10 font-[family-name:var(--font-cormorant)]"
          >
            Experience Kanpur&apos;s Most Stylish Cafe &amp; Lounge
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
          >
            <a href="#reservation" className="btn-gold">
              <span>Book a Table</span>
            </a>
            <a href="#menu" className="btn-ghost">
              Explore Menu
            </a>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ── Scroll Down Indicator ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-[var(--color-text-muted)] text-xs tracking-[0.25em] uppercase font-[family-name:var(--font-cormorant)]">
          Scroll to explore
        </span>
        <div className="animate-scroll">
          <ChevronDown className="w-6 h-6 text-[var(--color-gold)]" />
        </div>
      </motion.div>
    </section>
  );
}
