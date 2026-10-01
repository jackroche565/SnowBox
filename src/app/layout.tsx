import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Sans } from "next/font/google";
import { AppStateProvider } from "@/components/AppState";
import { BottomNav } from "@/components/Nav";
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

export const metadata: Metadata = {
  title: "Snowbox",
  description: "Snow forecasts for Northeast ski resorts.",
  applicationName: "Snowbox",
  openGraph: {
    title: "Snowbox",
    description: "Snow forecasts for Northeast ski resorts.",
    type: "website",
  },
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
        <AppStateProvider>
          {children}
          <BottomNav />
        </AppStateProvider>
      </body>
    </html>
  );
}
