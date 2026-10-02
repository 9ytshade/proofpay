import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import "./globals.css";

const display = localFont({
  src: "../fonts/Newsreader.woff2",
  variable: "--font-display",
  display: "swap",
});

const mono = localFont({
  src: [
    {
      path: "../fonts/DMMono-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/DMMono-Medium.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = { title: "ProofPay - proof, then payment.", description: "Public work escrow, adjudicated by GenLayer." };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <AppHeader />
        <div className="flex-1">{children}</div>
        <AppFooter />
      </body>
    </html>
  );
}
