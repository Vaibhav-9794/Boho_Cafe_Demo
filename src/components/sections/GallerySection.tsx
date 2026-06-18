"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { staggerContainer, fadeInUp, scaleIn } from "@/lib/animations";

// --------------- Gallery Data ---------------

interface GalleryItem {
  id: number;
  src: string;
  alt: string;
  category: "Food" | "Interior" | "Events";
}

const galleryCategories = ["All", "Food", "Interior", "Events"] as const;
type GalleryCategory = (typeof galleryCategories)[number];

const galleryItems: GalleryItem[] = [
  // Food
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
    alt: "Pizza",
    category: "Food",
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
    alt: "Salad",
    category: "Food",
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80",
    alt: "Pancakes",
    category: "Food",
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80",
    alt: "Bowl",
    category: "Food",
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&q=80",
    alt: "Plating",
    category: "Food",
  },
  // Interior
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80",
    alt: "Dining",
    category: "Interior",
  },
  {
    id: 7,
    src: "https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=600&q=80",
    alt: "Lounge",
    category: "Interior",
  },
  {
    id: 8,
    src: "https://images.unsplash.com/photo-1525610553991-2bede1a236e2?w=600&q=80",
    alt: "Bar",
    category: "Interior",
  },
  {
    id: 9,
    src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80",
    alt: "Ambience",
    category: "Interior",
  },
  // Events
  {
    id: 10,
    src: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80",
    alt: "Party",
    category: "Events",
  },
  {
    id: 11,
    src: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80",
    alt: "Celebration",
    category: "Events",
  },
  {
    id: 12,
    src: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&q=80",
    alt: "Event",
    category: "Events",
  },
];

// Aspect ratio classes cycled for visual variety
const aspectClasses = ["aspect-[3/4]", "aspect-square", "aspect-[4/3]"];

// --------------- Component ---------------

export default function GallerySection() {
  const [activeCategory, setActiveCategory] = useState<GalleryCategory>("All");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filteredItems = useMemo(() => {
    if (activeCategory === "All") return galleryItems;
    return galleryItems.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const goToPrev = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return prev === 0 ? filteredItems.length - 1 : prev - 1;
    });
  }, [filteredItems.length]);

  const goToNext = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return prev === filteredItems.length - 1 ? 0 : prev + 1;
    });
  }, [filteredItems.length]);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxIndex, closeLightbox, goToPrev, goToNext]);

  return (
    <section
      id="gallery"
      className="relative py-[var(--section-padding)] bg-[var(--color-dark)]"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <SectionHeading subtitle="Visual Journey" title="Our Gallery" />

        {/* Category Filter Tabs */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="flex gap-3 justify-center flex-wrap">
            {galleryCategories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  setLightboxIndex(null);
                }}
                className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  activeCategory === category
                    ? "bg-gradient-to-r from-[var(--color-gold-dark)] via-[var(--color-gold)] to-[var(--color-gold-light)] text-[var(--color-dark)] shadow-lg shadow-[var(--color-gold)]/20"
                    : "bg-[var(--glass-bg)] backdrop-blur-sm border border-[var(--glass-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] hover:border-[var(--color-gold)]/30"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Masonry Gallery Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="masonry-grid"
          >
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                variants={fadeInUp}
                layout
                className="group cursor-pointer overflow-hidden rounded-lg relative"
                onClick={() => openLightbox(index)}
              >
                <div
                  className={`${aspectClasses[index % aspectClasses.length]} overflow-hidden rounded-lg border-2 border-transparent group-hover:border-[var(--color-gold)]/60 transition-all duration-500`}
                >
                  <img
                    src={item.src}
                    alt={item.alt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end justify-start p-4">
                    <span className="font-[family-name:var(--font-cormorant)] text-[var(--color-champagne)] text-lg tracking-wider uppercase">
                      {item.alt}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ========== Lightbox Modal ========== */}
      <AnimatePresence>
        {lightboxIndex !== null && filteredItems[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

            {/* Content */}
            <div
              className="relative z-10 flex items-center justify-center w-full h-full px-4 py-16"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeLightbox}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors duration-300 z-20"
                aria-label="Close lightbox"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Previous Arrow */}
              <button
                onClick={goToPrev}
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-[var(--color-gold)]/20 flex items-center justify-center text-white hover:text-[var(--color-gold)] transition-all duration-300 z-20"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Image */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={filteredItems[lightboxIndex].id}
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  className="max-w-4xl max-h-[80vh] w-full flex items-center justify-center"
                >
                  <img
                    src={filteredItems[lightboxIndex].src.replace(
                      "w=600",
                      "w=1200"
                    )}
                    alt={filteredItems[lightboxIndex].alt}
                    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Next Arrow */}
              <button
                onClick={goToNext}
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-[var(--color-gold)]/20 flex items-center justify-center text-white hover:text-[var(--color-gold)] transition-all duration-300 z-20"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Image Counter */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
                <span className="text-[var(--color-text-secondary)] font-[family-name:var(--font-cormorant)] text-lg tracking-widest">
                  {lightboxIndex + 1}{" "}
                  <span className="text-[var(--color-gold)]">/</span>{" "}
                  {filteredItems.length}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
