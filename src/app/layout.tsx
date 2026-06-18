import type { Metadata } from "next";
import { Playfair_Display, Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://bohocafe.in"
  ),
  title: "Boho Cafe & Lounge | Premium Dining in Kanpur",
  description:
    "Experience luxury bohemian dining at Boho Cafe & Lounge, Kanpur. Where flavors meet ambience — savour Continental, Asian & cafe cuisine in a stunning aesthetic setting. Book your table today.",
  keywords: [
    "Boho Cafe",
    "Boho Lounge Kanpur",
    "best cafe in Kanpur",
    "premium restaurant Kanpur",
    "fine dining Kanpur",
    "rooftop cafe Kanpur",
    "Swaroop Nagar cafe",
    "continental food Kanpur",
    "party venue Kanpur",
    "cafe near me Kanpur",
    "restaurant Swaroop Nagar",
    "boho cafe menu",
  ],
  authors: [{ name: "Boho Cafe & Lounge" }],
  creator: "Boho Cafe & Lounge",
  publisher: "Boho Cafe & Lounge",
  openGraph: {
    title: "Boho Cafe & Lounge | Where Flavors Meet Ambience",
    description:
      "Kanpur's most aesthetic cafe & lounge. Continental, Asian & fusion cuisine in a luxury bohemian setting. Book your table now.",
    type: "website",
    locale: "en_IN",
    siteName: "Boho Cafe & Lounge",
    url: "/",
    images: [
      {
        url: "/hero-bg.png",
        width: 1200,
        height: 630,
        alt: "Boho Cafe & Lounge — Premium Dining in Kanpur",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Boho Cafe & Lounge | Premium Dining in Kanpur",
    description:
      "Experience luxury bohemian dining at Boho Cafe & Lounge, Kanpur. Where flavors meet ambience.",
    images: ["/hero-bg.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  category: "restaurant",
};

const restaurantSchema = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "Boho Cafe & Lounge",
  description:
    "Kanpur's most aesthetic cafe & lounge offering Continental, Asian & fusion cuisine in a luxury bohemian setting.",
  url: "https://bohocafe.in",
  telephone: "+918400678200",
  email: "hs142636@gmail.com",
  address: {
    "@type": "PostalAddress",
    streetAddress:
      "3rd Floor, 7/150 A-2, Opp. Concord Apartment, Khalasi Line",
    addressLocality: "Swaroop Nagar, Kanpur",
    addressRegion: "Uttar Pradesh",
    postalCode: "208002",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 26.4499,
    longitude: 80.3319,
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    opens: "12:00",
    closes: "23:59",
  },
  servesCuisine: ["Continental", "Asian", "Cafe", "Italian", "Chinese"],
  priceRange: "₹₹",
  acceptsReservations: "True",
  menu: "https://bohocafe.in/#menu",
  hasMenu: {
    "@type": "Menu",
    url: "https://bohocafe.in/#menu",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.2",
    bestRating: "5",
    ratingCount: "512",
  },
  image: "https://bohocafe.in/hero-bg.png",
  sameAs: [
    "https://instagram.com/bohocafekanpur",
    "https://facebook.com/bohocafekanpur",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${playfair.variable} ${inter.variable} ${cormorant.variable} antialiased`}
    >
      <head>
        <meta name="theme-color" content="#0A0A0A" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="canonical" href="https://bohocafe.in" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(restaurantSchema),
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-[var(--color-dark)] text-[var(--color-text-primary)] font-[family-name:var(--font-inter)]">
        {children}
      </body>
    </html>
  );
}
