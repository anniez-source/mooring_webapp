import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, IBM_Plex_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import OnboardingModal from "./components/OnboardingModal";
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

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex",
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
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable} ${ibmPlexSans.variable}`}>
        <body className="font-inter antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}