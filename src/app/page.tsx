"use client";

import dynamic from "next/dynamic";
import LoadingScreen from "@/components/layout/LoadingScreen";
import Navbar from "@/components/layout/Navbar";
import FloatingReservation from "@/components/layout/FloatingReservation";
import Footer from "@/components/layout/Footer";

// Dynamically import sections for code splitting
const HeroSection = dynamic(() => import("@/components/sections/HeroSection"), { ssr: false });
const AboutSection = dynamic(() => import("@/components/sections/AboutSection"), { ssr: false });
const MenuSection = dynamic(() => import("@/components/sections/MenuSection"), { ssr: false });
const GallerySection = dynamic(() => import("@/components/sections/GallerySection"), { ssr: false });
const ReservationSection = dynamic(() => import("@/components/sections/ReservationSection"), { ssr: false });
const EventsSection = dynamic(() => import("@/components/sections/EventsSection"), { ssr: false });
const TestimonialsSection = dynamic(() => import("@/components/sections/TestimonialsSection"), { ssr: false });
const ContactSection = dynamic(() => import("@/components/sections/ContactSection"), { ssr: false });

export default function Home() {
  return (
    <>
      <LoadingScreen />
      <Navbar />
      <main className="overflow-x-hidden">
        <HeroSection />
        <AboutSection />
        <MenuSection />
        <GallerySection />
        <EventsSection />
        <ReservationSection />
        <TestimonialsSection />
        <ContactSection />
      </main>
      <Footer />
      <FloatingReservation />
    </>
  );
}
