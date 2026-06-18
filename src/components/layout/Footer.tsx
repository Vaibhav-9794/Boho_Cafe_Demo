"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import {
  MapPin,
  Phone,
  Mail,
  ArrowUp,
  Send,
  Loader2,
} from "lucide-react";
import { InstagramIcon, FacebookIcon, YoutubeIcon } from "@/components/ui/SocialIcons";

const quickLinks = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "#about" },
  { label: "Our Menu", href: "#menu" },
  { label: "Gallery", href: "#gallery" },
  { label: "Events", href: "#events" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
  { label: "Book a Table", href: "#reservation" },
  { label: "Staff Login", href: "/staff-login" },
];

const socialLinks = [
  { icon: InstagramIcon, href: "https://instagram.com/bohocafekanpur", label: "Instagram" },
  { icon: FacebookIcon, href: "https://facebook.com/bohocafekanpur", label: "Facebook" },
  { icon: YoutubeIcon, href: "https://youtube.com/@bohocafekanpur", label: "YouTube" },
];

export default function Footer() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subError, setSubError] = useState("");
  const [currentYear, setCurrentYear] = useState("");

  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setSubError("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSubscribed(true);
        setEmail("");
        setTimeout(() => setSubscribed(false), 5000);
      } else {
        setSubError(data.message || "Failed to subscribe. Please try again.");
      }
    } catch {
      setSubError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNavClick = (href: string) => {
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      router.push(href);
    }
  };

  return (
    <footer className="relative bg-[var(--color-dark)] border-t border-[var(--glass-border)]">
      {/* Decorative Top Gradient */}
      <div className="section-divider" />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <motion.div variants={fadeInUp} className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full border-2 border-[var(--color-gold)] flex items-center justify-center">
                <span className="text-[var(--color-gold)] font-[family-name:var(--font-playfair)] font-bold text-lg">
                  B
                </span>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-[var(--color-champagne)]">
                  Boho Cafe
                </h3>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-gold)] font-[family-name:var(--font-cormorant)]">
                  & Lounge
                </p>
              </div>
            </div>
            <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-6">
              Where flavors meet ambience. Kanpur&apos;s premier bohemian dining
              destination, crafting unforgettable experiences since 2020.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full glass flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] hover:border-[var(--color-gold)] transition-all duration-300"
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div variants={fadeInUp}>
            <h4 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-[var(--color-champagne)] mb-6">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(link.href);
                    }}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] transition-colors duration-300 text-sm inline-flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-3 h-px bg-[var(--color-gold)] transition-all duration-300" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact Info */}
          <motion.div variants={fadeInUp}>
            <h4 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-[var(--color-champagne)] mb-6">
              Visit Us
            </h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin
                  size={16}
                  className="text-[var(--color-gold)] mt-1 shrink-0"
                />
                <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  3rd Floor, 7/150 A-2, Opp. Concord Apartment, Khalasi Line,
                  Swaroop Nagar, Kanpur
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-[var(--color-gold)] shrink-0" />
                <a
                  href="tel:+918400678200"
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] text-sm transition-colors"
                >
                  +91 84006 78200
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-[var(--color-gold)] shrink-0" />
                <a
                  href="mailto:hs142636@gmail.com"
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] text-sm transition-colors"
                >
                  hs142636@gmail.com
                </a>
              </div>
            </div>
          </motion.div>

          {/* Newsletter */}
          <motion.div variants={fadeInUp}>
            <h4 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-[var(--color-champagne)] mb-6">
              Newsletter
            </h4>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4">
              Subscribe for exclusive offers, new menu launches, and upcoming
              events.
            </p>
            <form onSubmit={handleSubscribe} className="relative">
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[var(--color-warm-gray)] border border-[var(--color-warm-gray-light)] text-[var(--color-text-primary)] rounded-lg px-4 py-3 pr-12 text-sm focus:border-[var(--color-gold)] focus:outline-none transition-colors placeholder:text-[var(--color-text-muted)]"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md bg-[var(--color-gold)] text-[var(--color-dark)] flex items-center justify-center hover:bg-[var(--color-gold-light)] transition-colors disabled:opacity-50"
                aria-label="Subscribe"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </form>
            {subscribed && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[var(--color-gold)] text-xs mt-2"
              >
                ✓ Thank you for subscribing!
              </motion.p>
            )}
            {subError && (
              <p className="text-red-400 text-xs mt-2">{subError}</p>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom Bar */}
      <div className="border-t border-[var(--color-warm-gray)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[var(--color-text-muted)] text-xs text-center sm:text-left">
            © {currentYear} Boho Cafe & Lounge, Kanpur. All rights
            reserved.
          </p>
          <p className="text-[var(--color-text-muted)] text-xs">
            Crafted with{" "}
            <span className="text-[var(--color-gold)]">♥</span> for extraordinary
            experiences
          </p>
        </div>
      </div>

      {/* Back to Top */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-24 right-6 w-12 h-12 rounded-full glass flex items-center justify-center text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-[var(--color-dark)] transition-all duration-300 z-30"
        aria-label="Back to top"
      >
        <ArrowUp size={20} />
      </button>
    </footer>
  );
}
