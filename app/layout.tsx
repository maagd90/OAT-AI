import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Travel Planner — Plan Your Perfect Trip",
  description: "Free AI-powered travel planning. Just describe your trip in natural language and get a complete itinerary with hotels, attractions, weather, and cost estimates.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>{children}</body>
    </html>
  );
}
