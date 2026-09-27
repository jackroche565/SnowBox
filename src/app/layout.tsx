import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { AppStateProvider } from "@/components/AppState";
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
  title: "Snowline",
  description: "Snowfall and forecasts for ski resorts, starting in the Northeast.",
  applicationName: "Snowline",
  openGraph: {
    title: "Snowline",
    description: "Snowfall and forecasts for ski resorts, starting in the Northeast.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  );
}
