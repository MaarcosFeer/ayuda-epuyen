import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Red Solidaria Epuyén",
  description: "Coordinación de ayuda comunitaria de emergencia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}