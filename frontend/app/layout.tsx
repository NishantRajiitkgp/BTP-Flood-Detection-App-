import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FloodMap — 3-class flood prediction",
  description: "Predict flood vs permanent water on Sentinel-1 SAR imagery",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://rsms.me/"
        />
        <link
          rel="stylesheet"
          href="https://rsms.me/inter/inter.css"
        />
      </head>
      <body className="bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
