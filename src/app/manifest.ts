import type { MetadataRoute } from "next";

// Next's native manifest route (App Router convention) — served at /manifest.webmanifest.
// Colours mirror src/app/globals.css: theme_color matches Nav.tsx's bg-ink navbar, background_color
// matches the page's cream background (the splash-screen colour shown before first paint).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Umoja Voices",
    short_name: "Umoja Voices",
    description: "Choir management app for Umoja Voices",
    start_url: "/",
    display: "standalone",
    background_color: "#f2ede3",
    theme_color: "#211005",
    icons: [
      {
        src: "/logo-icon.png",
        sizes: "345x230",
        type: "image/png",
      },
    ],
  };
}
