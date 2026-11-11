import type { NextConfig } from "next";

// Site statik dosyalara derlenir (GitHub Pages). Veri, derleme anında data/props.db dosyasından okunur.
// GitHub Pages'te site /futbolprops altında yayınlandığı için iş akışı BASE_PATH verir; yerelde boştur.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.BASE_PATH || undefined,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
