import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RestoBoost",
  description: "Restaurant booking platform with dynamic discounts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        {children}
      </body>
    </html>
  );
}
