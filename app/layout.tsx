import type { Metadata } from "next";
import "./globals.css";

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export const metadata: Metadata = {
  title: "Jelajah TTS — Belajar sambil bermain",
  description: "Petualangan teka-teki silang untuk penjelajah kecil. Bahasa Indonesia (Pengetahuan Umum), Matematika, dan Bahasa Inggris (Pengetahuan Umum) dengan level dan progres tersimpan.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
