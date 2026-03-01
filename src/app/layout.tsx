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
    images: [{ url: "/images/affiche.png", width: 1200, height: 630, alt: "ChanteEnScène" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChanteEnScène — Concours de chant",
    description: "Concours de chant live avec musiciens, votes du public et jury professionnel.",
    images: ["/images/affiche.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ChanteEnScene",
  },
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
        <link rel="apple-touch-icon" href="/images/pwa-icon-192.png" />
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
