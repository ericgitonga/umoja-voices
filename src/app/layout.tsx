import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import { getSession } from "@/lib/get-session";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Umoja Voices",
  description: "Choir management app for Umoja Voices",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        <Nav session={session} />
        <main className="flex-1">{children}</main>
        <Footer />
        {/*
          #134: no CSP changes needed for these. Both packages inject their
          tracking <script> at runtime via document.createElement/appendChild
          (see node_modules/@vercel/analytics/dist/index.js and
          @vercel/speed-insights/dist/index.js) from a same-origin relative
          path (/_vercel/insights/script.js, /_vercel/speed-insights/script.js
          once Web Analytics/Speed Insights are enabled on the Vercel
          project) — already covered by src/proxy.ts's script-src 'self', and
          under 'strict-dynamic' the dynamically-created script inherits
          trust from this already-nonced page bundle regardless of its own
          nonce/host. Event beacons likewise go to same-origin paths, already
          covered by connect-src 'self'.
        */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
