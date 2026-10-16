import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SOD Raqam",
    short_name: "SOD Raqam",
    description: "Modern ERP for the GCC & India.",
    start_url: "/en/",
    display: "standalone",
    background_color: "#F5F3FC",
    theme_color: "#3B2A8F",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
