import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Libre_Franklin } from "next/font/google";
import "./globals.css";

const libreFranklin = Libre_Franklin({
  variable: "--font-libre-franklin",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

/** Hilda brand headings — "DM Serif" (Google Fonts: DM Serif Display). */
const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Houseplant Hospital",
  description: "Internal operations app for Hilda's Houseplant Hospital",
  applicationName: "Houseplant Hospital",
};

export const viewport: Viewport = {
  themeColor: "#002c36",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${libreFranklin.variable} ${dmSerif.variable} h-full antialiased`}
    >
      <body className="flex h-full min-h-full flex-col bg-hilda-bg text-hilda-text font-sans">{children}</body>
    </html>
  );
}
