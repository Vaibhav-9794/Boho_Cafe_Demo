"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote, Star, ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { testimonials } from "@/data/testimonials";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export default function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Responsive visible count
  useEffect(() => {
    const updateVisibleCount = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setVisibleCount(3);
      } else if (width >= 768) {
        setVisibleCount(2);
      } else {
        setVisibleCount(1);
      }
    };

    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);
    return () => window.removeEventListener("resize", updateVisibleCount);
  }, []);

  const maxIndex = Math.max(0, testimonials.length - visibleCount);

  // Clamp currentIndex when visibleCount changes
  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  const goToNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const goToPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  const goToIndex = useCallback(
    (index: number) => {
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
    },
    [currentIndex]
  );

  // Auto-advance every 5 seconds, pause on hover
  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(goToNext, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused, goToNext]);

  const visibleTestimonials = testimonials.slice(
    currentIndex,
    currentIndex + visibleCount
  );

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
    }),
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating
            ? "fill-[var(--color-gold)] text-[var(--color-gold)]"
            : "fill-none text-[var(--color-warm-gray-light)]"
        }`}
      />
    ));
  };

  const totalDots = maxIndex + 1;

  return (
    <section
      id="testimonials"
      className="relative py-[var(--section-padding)] overflow-hidden"
    >
      {/* Subtle background decorative quote marks */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <Quote className="absolute -top-8 -left-8 w-64 h-64 text-[var(--color-gold)] opacity-[0.03] rotate-180" />
        <Quote className="absolute -bottom-8 -right-8 w-80 h-80 text-[var(--color-gold)] opacity-[0.03]" />
      </div>

      {/* Subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(198,169,98,0.04),transparent_70%)] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        <SectionHeading subtitle="What People Say" title="Guest Testimonials" />

        {/* Carousel Container */}
        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Navigation Arrows */}
          <button
            onClick={goToPrev}
            aria-label="Previous testimonial"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-5 z-20 glass rounded-full w-10 h-10 sm:w-12 sm:h-12 hidden sm:flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] hover:border-[var(--color-gold)] transition-all duration-300 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={goToNext}
            aria-label="Next testimonial"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-5 z-20 glass rounded-full w-10 h-10 sm:w-12 sm:h-12 hidden sm:flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] hover:border-[var(--color-gold)] transition-all duration-300 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Cards */}
          <div className="overflow-hidden px-6 sm:px-10 lg:px-14">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className={`grid gap-6 ${
                  visibleCount === 1
                    ? "grid-cols-1"
                    : visibleCount === 2
                    ? "grid-cols-2"
                    : "grid-cols-3"
                }`}
              >
                {visibleTestimonials.map((testimonial) => (
                  <motion.div
                    key={testimonial.id}
                    variants={fadeInUp}
                    className="glass rounded-xl p-8 relative group"
                  >
                    {/* Quote Icon - top right */}
                    <Quote className="absolute top-6 right-6 w-10 h-10 text-[var(--color-gold)] opacity-30" />

                    {/* Star Rating */}
                    <div className="flex items-center gap-1 mb-5">
                      {renderStars(testimonial.rating)}
                    </div>

                    {/* Review Text */}
                    <p className="italic text-[var(--color-text-primary)] leading-relaxed text-sm md:text-base mb-8 line-clamp-5">
                      &ldquo;{testimonial.review}&rdquo;
                    </p>

                    {/* Bottom Section: Avatar, Name, Role, Date */}
                    <div className="flex items-center gap-4 mt-auto pt-5 border-t border-[var(--glass-border)]">
                      {/* Avatar with initials */}
                      <div className="bg-[var(--color-gold)] text-[var(--color-dark)] w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                        {testimonial.avatar}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-[family-name:var(--font-playfair)] font-semibold text-[var(--color-text-primary)] text-base truncate">
                          {testimonial.name}
                        </h4>
                        <p className="text-[var(--color-text-secondary)] text-xs">
                          {testimonial.role}
                        </p>
                        <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
                          {testimonial.date}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Dot Indicators */}
        <div className="flex items-center justify-center gap-2 mt-10">
          {Array.from({ length: totalDots }, (_, i) => (
            <button
              key={i}
              onClick={() => goToIndex(i)}
              aria-label={`Go to testimonial group ${i + 1}`}
              className={`rounded-full transition-all duration-300 cursor-pointer ${
                i === currentIndex
                  ? "w-8 h-3 bg-[var(--color-gold)]"
                  : "w-3 h-3 bg-transparent border-2 border-[var(--color-gold)] hover:bg-[var(--color-gold)]/30"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
