import type { MetadataRoute } from "next";

// Ícones reais e configuração Serwist completa entram na Fase 6 (PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CrewPocket",
    short_name: "CrewPocket",
    description: "Field service management for small contractors.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b0f17",
    theme_color: "#0b0f17",
    icons: [],
  };
}
