import type { MetadataRoute } from "next";

const ICONS: NonNullable<MetadataRoute.Manifest["icons"]> = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

/**
 * PWA instalável (SPEC §7/§10) — Android/desktop com prompt nativo, iOS via
 * "Add to Home Screen". Atalhos aparecem no long-press do ícone (Android).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "CrewPocket",
    short_name: "CrewPocket",
    description:
      "Field service management for contractors — estimates, jobs, time tracking and invoices.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#0b0f17",
    theme_color: "#0b0f17",
    lang: "en",
    dir: "ltr",
    categories: ["business", "productivity", "utilities"],
    icons: ICONS,
    shortcuts: [
      {
        name: "Clock in",
        short_name: "Field",
        url: "/field",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "New job",
        short_name: "Job",
        url: "/jobs?new=1",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "New estimate",
        short_name: "Estimate",
        url: "/estimates?new=1",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
