import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Houseplant Hospital",
    short_name: "HH",
    description: "Internal operations app for Hilda's Houseplant Hospital",
    start_url: "/app",
    display: "standalone",
    background_color: "#002c36",
    theme_color: "#002c36",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
