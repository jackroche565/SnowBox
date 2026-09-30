import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { AppStateProvider } from "@/components/AppState";
import { BottomNav } from "@/components/Nav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
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
  themeColor: "#101826",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable} h-full antialiased`}>
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
