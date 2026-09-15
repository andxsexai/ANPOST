import type { Metadata } from "next";
import { Geist_Mono, Manrope, Unbounded } from "next/font/google";
import { LiquidMetalBackdrop } from "@/components/liquid-metal";
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

export const metadata: Metadata = {
  title: "ANPOST — OSINT posting without borders",
  description:
    "Агрегатор открытых источников и студия постинга: 10 мировых лент, 6 человеческих ниш, разбор ролика по ссылке.",
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
