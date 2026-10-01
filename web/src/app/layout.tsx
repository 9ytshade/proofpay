import type { Metadata } from "next";
import { DM_Mono, Newsreader } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

const display = Newsreader({ variable: "--font-display", subsets: ["latin"] });
const mono = DM_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = { title: "ProofPay - proof, then payment.", description: "Public work escrow, adjudicated by GenLayer." };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" className={`${display.variable} ${mono.variable} h-full`}><body className="min-h-full"><AppHeader />{children}</body></html>;
}
