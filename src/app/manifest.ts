import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "먹(MEOK)",
    short_name: "먹",
    description: "가족·지인과 함께 챙기는 영양제 습관 형성 앱",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#111111",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
