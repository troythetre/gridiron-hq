import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gridiron HQ - Fantasy Football Command Center",
  description:
    "Fantasy football rankings, start/sit advice, waiver pickups, injury updates, and roster tools for the leagues you already play in.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
