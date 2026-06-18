"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { InstagramIcon, FacebookIcon, YoutubeIcon } from "@/components/ui/SocialIcons";
import SectionHeading from "@/components/ui/SectionHeading";
import { fadeInLeft, fadeInRight, fadeInUp, staggerContainer } from "@/lib/animations";

interface ContactCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}

function ContactCard({ icon, label, value, href }: ContactCardProps) {
  const content = (
    <div className="glass rounded-lg flex items-start gap-4 p-5 group transition-all duration-300 hover:border-[rgba(198,169,98,0.3)]">
      <div className="shrink-0 mt-0.5 text-[var(--color-gold)]">{icon}</div>
      <div className="min-w-0">
        <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-[var(--color-text-primary)] text-sm md:text-base leading-relaxed break-words">
          {value}
        </p>
      </div>
    </div>
  );

  if (href) {
    // tel: and mailto: links should open natively, not in new tab
    const isNativeLink =
      href.startsWith("tel:") || href.startsWith("mailto:");

    return (
      <a
        href={href}
        {...(!isNativeLink && {
          target: "_blank",
          rel: "noopener noreferrer",
        })}
        className="block"
      >
        {content}
      </a>
    );
  }

  return content;
}

const socialLinks = [
  {
    icon: <InstagramIcon className="w-5 h-5" />,
    href: "https://instagram.com/bohocafekanpur",
    label: "Instagram",
  },
  {
    icon: <FacebookIcon className="w-5 h-5" />,
    href: "https://facebook.com/bohocafekanpur",
    label: "Facebook",
  },
  {
    icon: <YoutubeIcon className="w-5 h-5" />,
    href: "https://youtube.com/@bohocafekanpur",
    label: "Youtube",
  },
];

export default function ContactSection() {
  const mapUrl =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL ||
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3571.1483017931355!2d80.31153597520878!3d26.483169476905946!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x399c3926c0261ea1%3A0xfa41b9daf3e4cb9c!2sBoho%20Cafe%20%26%20Lounge!5e0!3m2!1sen!2sin!4v1781623987402!5m2!1sen!2sin";

  return (
    <section
      id="contact"
      className="relative py-[var(--section-padding)] overflow-hidden"
    >
      {/* Subtle background glow */}
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(198,169,98,0.04),transparent_70%)] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        <SectionHeading subtitle="Find Us" title="Location & Contact" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Left Column - Contact Information */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="space-y-4"
          >
            <motion.div variants={fadeInLeft}>
              <ContactCard
                icon={<MapPin className="w-5 h-5" />}
                label="Address"
                value="3rd Floor, 7/150 A-2, Opp. Concord Apartment, Khalasi Line, Swaroop Nagar, Kanpur, UP 208002"
                href="https://www.google.com/maps/place/Boho+Cafe+%26+Lounge/@26.4831695,80.3141109,17z/data=!3m1!4b1!4m6!3m5!1s0x399c3926c0261ea1:0xfa41b9daf3e4cb9c!8m2!3d26.4831695!4d80.3141109"
              />
            </motion.div>

            <motion.div variants={fadeInLeft}>
              <ContactCard
                icon={<Phone className="w-5 h-5" />}
                label="Phone"
                value="+91 84006 78200"
                href="tel:+918400678200"
              />
            </motion.div>

            <motion.div variants={fadeInLeft}>
              <ContactCard
                icon={<Mail className="w-5 h-5" />}
                label="Email"
                value="hs142636@gmail.com"
                href="mailto:hs142636@gmail.com"
              />
            </motion.div>

            <motion.div variants={fadeInLeft}>
              <ContactCard
                icon={<Clock className="w-5 h-5" />}
                label="Hours"
                value="Mon – Sun: 12:00 PM – 12:00 AM"
              />
            </motion.div>

            {/* Social Media Links */}
            <motion.div
              variants={fadeInLeft}
              className="flex items-center gap-3 pt-4"
            >
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="glass rounded-full w-11 h-11 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] hover:border-[rgba(198,169,98,0.4)] transition-all duration-300"
                >
                  {social.icon}
                </a>
              ))}
            </motion.div>

            {/* WhatsApp Button */}
            <motion.div variants={fadeInLeft} className="pt-2">
              <a
                href="https://wa.me/918400678200?text=Hi%20Boho%20Cafe!%20I%27d%20like%20to%20know%20more%20about%20your%20services."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-lg bg-[#25D366] text-white font-semibold text-sm md:text-base tracking-wide hover:bg-[#20bd5a] transition-all duration-300 hover:shadow-[0_0_30px_rgba(37,211,102,0.3)] hover:-translate-y-0.5"
              >
                <MessageCircle className="w-5 h-5" />
                Chat on WhatsApp
              </a>
            </motion.div>
          </motion.div>

          {/* Right Column - Google Map */}
          <motion.div
            variants={fadeInRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="flex flex-col gap-4"
          >
            {/* Map Container */}
            <div className="rounded-xl border border-[var(--color-gold)]/20 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <iframe
                src={mapUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Boho Cafe & Lounge Location"
                className="aspect-video lg:aspect-[4/3] w-full"
              />
            </div>

            {/* Get Directions Link */}
            <motion.a
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              href="https://www.google.com/maps/place/Boho+Cafe+%26+Lounge/@26.4831695,80.3141109,17z/data=!3m1!4b1!4m6!3m5!1s0x399c3926c0261ea1:0xfa41b9daf3e4cb9c!8m2!3d26.4831695!4d80.3141109"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2 py-3 px-6 rounded-lg glass text-[var(--color-gold)] font-semibold text-sm tracking-wider uppercase hover:border-[rgba(198,169,98,0.4)] transition-all duration-300 hover:-translate-y-0.5"
            >
              <MapPin className="w-4 h-4" />
              Get Directions
              <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </motion.a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
