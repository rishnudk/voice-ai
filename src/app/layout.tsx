import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Audio Word Cloud",
  description:
    "Record or upload audio, transcribe it with AI, and visualise the key concepts as an interactive word cloud.",
  other: {
    "x-brief-ref": "TFG-WD-8823",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="x-brief-ref" content="TFG-WD-8823" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
