import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { EventsProvider } from "@/lib/EventsContext";
import { ToastProvider } from "@/lib/ToastContext";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VenYOU — Find Your Perfect Venue",
  description:
    "AI-powered venue recommendations for every occasion. Enter your event details and let VenYOU find the perfect venue near you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} antialiased`}>
        <ToastProvider>
          <EventsProvider>{children}</EventsProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
