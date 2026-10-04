import type { Metadata } from "next";
import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/500.css";
import "@fontsource/hind-siliguri/600.css";
import "@fontsource/hind-siliguri/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "আব্দুল জব্বার চ্যারিটি ফাউন্ডেশন",
    template: "%s | আব্দুল জব্বার চ্যারিটি ফাউন্ডেশন",
  },
  description: "মানবতার সেবায়, সবার সহযোগিতায়—আব্দুল জব্বার চ্যারিটি ফাউন্ডেশন।",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
