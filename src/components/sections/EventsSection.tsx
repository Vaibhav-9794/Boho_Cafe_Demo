"use client";

import { motion } from "framer-motion";
import { CheckCircle, ArrowRight } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { events } from "@/data/events";
import { staggerContainer, fadeInUp } from "@/lib/animations";

export default function EventsSection() {
  return (
    <section
      id="events"
      className="relative py-[var(--section-padding)] bg-[var(--color-dark)]"
    >
      {/* Subtle ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--color-gold)] rounded-full opacity-[0.02] blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          subtitle="Celebrate With Us"
          title="Events & Celebrations"
          description="From intimate birthday dinners to grand corporate gatherings, Boho is your perfect venue"
        />

        {/* Events Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mt-12"
        >
          {events.map((event) => {
            const IconComponent = event.icon;

            return (
              <motion.div
                key={event.id}
                variants={fadeInUp}
                className="group relative overflow-hidden rounded-xl min-h-[500px] cursor-pointer"
              >
                {/* Background Image */}
                <img
                  src={event.image}
                  alt={event.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-dark)] via-[rgba(10,10,10,0.7)] to-[rgba(10,10,10,0.3)] transition-all duration-500 group-hover:via-[rgba(10,10,10,0.8)] group-hover:to-[rgba(10,10,10,0.5)]" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                  {/* Icon */}
                  <div className="mb-4">
                    <div className="w-14 h-14 rounded-lg bg-[rgba(198,169,98,0.1)] border border-[rgba(198,169,98,0.2)] flex items-center justify-center backdrop-blur-sm">
                      <IconComponent
                        size={28}
                        className="text-[var(--color-gold)]"
                      />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl font-bold text-white mb-3">
                    {event.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[var(--color-champagne)] text-sm md:text-base leading-relaxed mb-5 opacity-90 line-clamp-3">
                    {event.description}
                  </p>

                  {/* Features List */}
                  <ul className="space-y-2 mb-6">
                    {event.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2.5">
                        <CheckCircle
                          size={16}
                          className="text-[var(--color-gold)] flex-shrink-0"
                        />
                        <span className="text-[var(--color-text-primary)] text-sm">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Enquire Button */}
                  <div>
                    <a
                      href="#reservation"
                      className="btn-ghost px-5 py-2.5 text-xs inline-flex items-center gap-2 group/btn"
                    >
                      Enquire Now
                      <ArrowRight
                        size={14}
                        className="transition-transform duration-300 group-hover/btn:translate-x-1"
                      />
                    </a>
                  </div>
                </div>

                {/* Hover border glow */}
                <div className="absolute inset-0 rounded-xl border border-transparent transition-all duration-500 group-hover:border-[rgba(198,169,98,0.25)] pointer-events-none" />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-16 md:mt-20 text-center"
        >
          <div className="glass-strong rounded-xl px-8 py-10 md:py-12 max-w-3xl mx-auto">
            <p className="font-[family-name:var(--font-cormorant)] text-xl md:text-2xl text-[var(--color-champagne)] italic mb-6 leading-relaxed">
              Have something special in mind? Let us craft a bespoke experience
              for you.
            </p>
            <a href="#contact" className="btn-gold inline-flex items-center gap-2">
              <span className="flex items-center gap-2">
                Contact Us
                <ArrowRight size={16} />
              </span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
