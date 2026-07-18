import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "CrowdCart — pool MON for a shared buy",
  description:
    "Friends deposit toward a target. Organizer withdraws if funded; contributors refund if not.",
  applicationName: "CrowdCart",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="hum">
      <body className={`${jakarta.variable} ${jetbrains.variable} antialiased`}>
        <Providers>
          <div className="site-shell">
            <SiteHeader />
            <main>{children}</main>
            <footer className="site-footer">
              CrowdCart · Monad Testnet · pool together, settle once
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
