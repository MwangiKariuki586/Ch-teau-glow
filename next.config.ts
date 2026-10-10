import type { NextConfig } from "next";

// anchor-pki auto-cert is only active when ACME_ALLOW_IDENTIFIERS is configured.
// Without it the proxy misconfigures and crashes the dev server, so we guard it.
let withAutoCert = (config: NextConfig) => config;
if (process.env.ACME_ALLOW_IDENTIFIERS) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const autoCert = require("anchor-pki/auto-cert/integrations/next").default;
  withAutoCert = autoCert({ enabledEnv: "development" });
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.88.19"],
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.istockphoto.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.istockphoto.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "imgs.search.brave.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "browz.ae",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default withAutoCert(nextConfig);
