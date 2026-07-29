import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Optional: enable with OPENNEXT_CLOUDFLARE_DEV=1 if you need getCloudflareContext() in `next dev`.
// Default off — initOpenNextCloudflareForDev() has been hanging local requests on this machine.
if (
  process.env.NODE_ENV === "development" &&
  ["1", "true", "yes"].includes(String(process.env.OPENNEXT_CLOUDFLARE_DEV ?? "").toLowerCase())
) {
  import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
}