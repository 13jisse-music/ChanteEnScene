import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
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
  title: "ChanteEnScène — Concours de chant",
  description:
    "Libérez votre voix, faites vibrer le public sur scène. Concours de chant live avec musiciens, votes du public et jury professionnel.",
  keywords: ["concours", "chant", "musique", "live", "Aubagne", "ChanteEnScène"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${inter.variable} ${montserrat.variable} font-sans antialiased bg-[#0d0b1a] text-white`}
      >
        {children}
      </body>
    </html>
  );
}
