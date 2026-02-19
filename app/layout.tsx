import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Daily Brief Newspaper",
  description: "A premium daily brief reader for News and Tech automation output."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
