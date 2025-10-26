import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Montserrat, IBM_Plex_Sans, Playfair_Display, Barlow, Work_Sans, Outfit, Space_Grotesk, Rubik, Source_Sans_Pro, Nunito_Sans, DM_Sans, Poppins, Manrope, Lexend, Raleway, Ubuntu, Roboto, Lato } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Mooring - Connection Infrastructure for Builders",
  description: "AI-powered search infrastructure that helps innovation communities solve the quadratic coordination problem. Find the right collaborators, not just more connections.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable} ${montserrat.variable} ${ibmPlexSans.variable} ${playfairDisplay.variable} ${barlow.variable}`}>
      <body className="font-inter antialiased">
        {children}
      </body>
    </html>
  );
}