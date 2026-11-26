import type { NextConfig } from "next";

// Defaults are enough for this app. The Gemini key is read on the server only.
// allowedDevOrigins only affects `npm run dev`: it lets the browser reach dev
// scripts when the page is opened via 127.0.0.1 or the machine's network address.
const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "172.29.0.1", "172.29.0.*"],
};

export default nextConfig;
