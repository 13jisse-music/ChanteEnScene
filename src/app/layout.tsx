import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import PublicNav from "@/components/PublicNav";
import BokehBackground from "@/components/BokehBackground";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import InstallPrompt from "@/components/InstallPrompt";
import SplashScreen from "@/components/SplashScreen";
import ChatbotWidget from "@/components/ChatbotWidget";
import PublicFooter from "@/components/PublicFooter";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import MetaPixel from "@/components/MetaPixel";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.chantenscene.fr"),
  title: {
    default: "ChanteEnScène — Concours de chant",
    template: "%s | ChanteEnScène",
  },
  description:
    "Libérez votre voix, faites vibrer le public sur scène. Concours de chant live avec musiciens, votes du public et jury professionnel.",
  keywords: ["concours", "chant", "musique", "live", "Aubagne", "ChanteEnScène"],
  authors: [{ name: "Jean-Christophe Martinez" }],
  creator: "Jean-Christophe Martinez",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "ChanteEnScène",
    title: "ChanteEnScène — Concours de chant",
    description: "Concours de chant live avec musiciens, votes du public et jury professionnel. Aubagne.",
    images: [{ url: "/images/affiche-chantenscene-2026.png", width: 1024, height: 1536, alt: "ChanteEnScène — Concours de chant Aubagne 2026" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChanteEnScène — Concours de chant",
    description: "Concours de chant live avec musiciens, votes du public et jury professionnel.",
    images: ["/images/affiche-chantenscene-2026.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ChanteEnScene",
  },
};

const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "ChanteEnScène — Concours de chant Aubagne 2026",
  "startDate": "2026-07-16",
  "endDate": "2026-07-16",
  "location": {
    "@type": "Place",
    "name": "Cours Foch, Aubagne",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Aubagne",
      "addressRegion": "Bouches-du-Rhône",
      "addressCountry": "FR",
    },
  },
  "description": "Concours de chant live avec musiciens, jury professionnel et votes du public. Ouvert à tous, toute la France.",
  "image": "https://www.chantenscene.fr/images/affiche-chantenscene-2026.png",
  "organizer": {
    "@type": "Organization",
    "name": "ChanteEnScène",
    "url": "https://www.chantenscene.fr",
  },
  "performer": {
    "@type": "PerformingGroup",
    "name": "Candidats ChanteEnScène 2026",
  },
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "offers": {
    "@type": "Offer",
    "price": "25",
    "priceCurrency": "EUR",
    "url": "https://www.chantenscene.fr/aubagne-2026/inscription",
    "availability": "https://schema.org/InStock",
    "name": "Inscription candidat",
  },
  "inLanguage": "fr",
  "url": "https://www.chantenscene.fr",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <meta name="theme-color" content="#e91e8c" />
        <meta name="google-site-verification" content="37_MpQxOvWvqTDw-dHmRA7DNSBGLRJUnqFB2naXa8Z4" />
        <link rel="apple-touch-icon" href="/images/pwa-icon-192.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${montserrat.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <GoogleAnalytics />
        <MetaPixel />
        <ServiceWorkerRegistrar />
        <SplashScreen />
        <InstallPrompt />
        <BokehBackground />
        <PublicNav />
        {children}
        <PublicFooter />
        <ChatbotWidget />
      </body>
    </html>
  );
}
