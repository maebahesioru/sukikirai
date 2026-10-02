import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ツイッタラー世論調査",
    short_name: "ツイッタラー世論調査",
    description: "Xユーザーの好き嫌い・8項目評価をみんなで書き込める匿名サイト",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f16",
    theme_color: "#0b0f16",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
