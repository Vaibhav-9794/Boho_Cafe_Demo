"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { navVariants } from "@/lib/animations";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Menu", href: "#menu" },
  { label: "Gallery", href: "#gallery" },
  { label: "Events", href: "#events" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // Determine active section
      const sections = navLinks.map((link) => link.href.slice(1));
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 150) {
            setActiveSection(sections[i]);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <motion.nav
        variants={navVariants}
        initial="hidden"
        animate="visible"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "glass-strong py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("#home");
            }}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-full border-2 border-[var(--color-gold)] flex items-center justify-center group-hover:bg-[var(--color-gold)] transition-colors duration-300">
              <span className="text-[var(--color-gold)] group-hover:text-[var(--color-dark)] font-[family-name:var(--font-playfair)] font-bold text-lg transition-colors duration-300">
                B
              </span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-[var(--color-champagne)] leading-tight">
                Boho Cafe
              </h1>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-gold)] font-[family-name:var(--font-cormorant)]">
                & Lounge
              </p>
            </div>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className={`px-4 py-2 text-sm tracking-wider uppercase transition-all duration-300 relative
                  ${
                    activeSection === link.href.slice(1)
                      ? "text-[var(--color-gold)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-champagne)]"
                  }`}
              >
                {link.label}
                {activeSection === link.href.slice(1) && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--color-gold)]"
                    transition={{ duration: 0.3 }}
                  />
                )}
              </a>
            ))}
          </div>

          {/* CTA + Mobile Toggle */}
          <div className="flex items-center gap-4">
            <a
              href="#reservation"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("#reservation");
              }}
              className="hidden md:inline-flex btn-gold text-xs py-2.5 px-5"
            >
              <span>Book a Table</span>
            </a>
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="lg:hidden text-[var(--color-champagne)] hover:text-[var(--color-gold)] transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setIsMobileOpen(false)}
            />
            <div className="absolute right-0 top-0 h-full w-72 bg-[var(--color-dark)] border-l border-[var(--glass-border)] flex flex-col pt-24 px-6">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.href);
                  }}
                  className={`py-3 text-lg tracking-wider uppercase border-b border-[var(--color-warm-gray)] transition-colors
                    ${
                      activeSection === link.href.slice(1)
                        ? "text-[var(--color-gold)]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-champagne)]"
                    }`}
                >
                  {link.label}
                </motion.a>
              ))}
              <a
                href="#reservation"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick("#reservation");
                }}
                className="btn-gold mt-8 text-center text-sm"
              >
                <span>Book a Table</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
