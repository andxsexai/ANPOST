import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope, Unbounded } from "next/font/google";
import { LiquidMetalBackdrop } from "@/components/liquid-metal";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const display = Unbounded({
  variable: "--font-display-var",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500"],
});

const sans = Manrope({
  variable: "--font-sans-var",
  subsets: ["latin", "cyrillic"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const base = siteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: "ANPOST — OSINT posting without borders",
  description:
    "Агрегатор открытых источников и студия постинга: 10 мировых лент, 6 человеческих ниш, разбор ролика по ссылке.",
  applicationName: "ANPOST",
  appleWebApp: {
    capable: true,
    title: "ANPOST",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: base,
    siteName: "ANPOST",
    title: "ANPOST",
    description: "OSINT-лента и студия постинга по публичным ссылкам.",
  },
};

export const viewport: Viewport = {
  themeColor: "#e879f9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className={`${sans.className} relative flex min-h-full flex-col`}>
        <LiquidMetalBackdrop />
        {children}
      </body>
    </html>
  );
}
