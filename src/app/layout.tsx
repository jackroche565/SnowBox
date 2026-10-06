import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Sans } from "next/font/google";
import { AppStateProvider } from "@/components/AppState";
import { BottomNav } from "@/components/Nav";
import Statsig from "@/components/Statsig";
import "./globals.css";

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

// Variable width: condensed Archivo is the display face for names and snow figures.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Share previews need full addresses; on Vercel this is the production domain.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Snowbox",
  description: "Snow forecasts for ski areas across the US and Canada.",
  applicationName: "Snowbox",
  openGraph: {
    title: "Snowbox",
    description: "Snow forecasts for ski areas across the US and Canada.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

// "cover" lets the phone tab bar sit behind the home indicator, padded by the safe-area inset.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#f3f5f8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${instrument.variable} ${archivo.variable} h-full antialiased`}>
      {/* Bottom padding keeps content clear of the phone tab bar. */}
      <body className="flex min-h-full flex-col pb-[calc(3.75rem+env(safe-area-inset-bottom))] sm:pb-0">
        <Statsig>
          <AppStateProvider>
            {children}
            <BottomNav />
          </AppStateProvider>
        </Statsig>
      </body>
    </html>
  );
}
