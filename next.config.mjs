/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.oma.by", pathname: "/upload/**" },
    ],
  },
};

export default nextConfig;
