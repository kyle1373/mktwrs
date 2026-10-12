export default {
  poweredByHeader: false,
  output: "standalone",
  // All 11,864 source assets verified in R2; preserve existing public URLs.
  async redirects() {
    const origin = process.env.MKTWRS_MEDIA_ORIGIN || "https://media.mktwrs.com";
    return [{
      source: "/assets/:path*",
      destination: `${origin.replace(/\/$/, "")}/assets/:path*`,
      permanent: false,
    }];
  },
  experimental: {
    // Railway restored a corrupted persistent Turbopack build cache.
    turbopackFileSystemCacheForBuild: false,
  },
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/data/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};
