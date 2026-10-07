import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gridiron HQ - Fantasy Football Command Center",
  description:
    "Rankings, start/sit calls, waiver pickups, injury tracking, and league management in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
