import type { MetadataRoute } from "next";

/** PWA instalável (SPEC §7/§10) — /field funcional 100% offline. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CrewPocket",
    short_name: "CrewPocket",
    description: "Field service management for small contractors.",
    start_url: "/field",
    display: "standalone",
    background_color: "#0b0f17",
    theme_color: "#0b0f17",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
