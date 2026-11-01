import type { NextConfig } from "next";

// cacheComponents desligado de propósito: quase todas as telas dependem da
// sessão do usuário (cookies) e devem renderizar a cada requisição. A wiki é
// gerada no build via generateStaticParams.
const nextConfig: NextConfig = {
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  outputFileTracingIncludes: { "/wiki/**": ["./content/wiki/**/*"] },
};

export default nextConfig;
