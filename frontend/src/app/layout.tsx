import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "SCW-LUCHA",
  description: "Plataforma profesional de Lucha Libre. Eventos, Boletos, Merch y Academia.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

import AuthProvider from "@/components/AuthProvider";
import ToastProvider from "@/components/ToastProvider";

import GoogleProvider from "@/components/GoogleProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans antialiased bg-black text-white`}>
        <GoogleProvider>
          <AuthProvider>
            {children}
            <ToastProvider />
          </AuthProvider>
        </GoogleProvider>
      </body>
    </html>
  );
}
