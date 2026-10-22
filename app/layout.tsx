import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["200", "300", "400"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Robin — Engineer & Product Builder",
  description:
    "Engineer and product builder working where AI meets real software.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Browser extensions (Grammarly, LanguageTool) write attributes onto
    // <html> and <body> before React hydrates. This only silences attribute
    // mismatches on these two elements, never on their children.
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
