export default {
  poweredByHeader: false,
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
